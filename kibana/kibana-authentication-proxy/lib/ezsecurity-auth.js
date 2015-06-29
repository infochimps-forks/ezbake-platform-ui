/**
 * Configure EzSecurity Authentication
 */
exports.configureEzSecurity = function(express, app, config, ezConfig, mustache, winston) {
  var path = require('path');
  var Thrift = null,
    constants = null,
    ezGroupsClient = null,
    ezGroupsTypes = null,
    securityClient = null,
    thriftUtils = null,
    _ = null;


  if(!config.enable_ezsecurity_auth) {
    winston.warn('Warning: No EzSecurity authentication presented');
    return;
  } else {
    constants = require('../constants');
    _ = require('lodash-node');
    //setup security client
    var EzSecurity = require('ezbake-security-client');
    securityClient = new EzSecurity.Client(ezConfig);

    //setup thrift
    Thrift = require('thrift');
    var ThriftUtils = require('ezbake-thrift-utils').ThriftUtils;
    thriftUtils = new ThriftUtils(ezConfig);

    //instantiate ezGroupsClient
    ezGroupsClient = require('ezbake-groups-service/EzGroups');
    ezGroupsTypes = require('ezbake-groups-service/EzGroups_types');
    winston.info('EzSecurity Authentication applied');
    app.use(express.urlencoded());
  }
  ;

  //sets filter on all app calls to validate the users rights to access the request
  app.use(function(req, res, next) {
    try {
      securityClient.validateCurrentRequest(req); //user has access to view the site
      if(req.url.indexOf(path.join(config.base_relative_path, '/appselect')) === 0 || req.url.indexOf(path.join(config.base_relative_path, '/resources')) === 0) {//if user is going to app selection let them pass
        winston.debug('going to app selection');
        next();
      } else if(!req.session.EZBAKE_APPLICATION) { //if no app set for session send user to app selection
        res.redirect(path.join(config.base_relative_path, '/appselect'));
      } else { //validate access to app
        thriftUtils.getSecurityId(ezGroupsTypes.SERVICE_NAME, function(err, ezGroupsSecurityId) {
          if(err) {
            winston.error(err);
            respondUnauthorized(req, res);
            return;
          }
          securityClient.fetchTokenForProxiedUser(req, ezGroupsSecurityId, function(err, securityToken) {//check if they have access to view app
            if(err) { //on error, validation cannot be properly performed assume invalid
              winston.error(err);
              respondUnauthorized(req, res);
              return;
            }
            validateAppPermision(req, securityToken, req.session.EZBAKE_APPLICATION, function(isValid) {
              isValid ? next() : respondUnauthorized(req, res);
            });
          });
        });
      }
    } catch (err) {
      winston.error("Authorization error: ",err.message||err);
      respondUnauthorized(req, res);
    }
  });

  app.use(path.join(config.base_relative_path, "/__es"), function(request, response, next) {
    var tamper = false;
    var indices = request.path.substring(1).split('/')[0].split(',');
    indices = indices.map(function(indice) {
      return indice.replace(new RegExp(constants.indexDateRegex), '');//remove the timestamp from the index
    });
    //if any index does not match the current app or is an allowable elasticsearch constant then set tampered flag true
    indices.forEach(function(appname) {
      if(appname !== request.session.EZBAKE_APPLICATION &&
        constants.elasticSearch.allowableIndices.indexOf(appname) == -1) {
        tamper = true;
        winston.error("request doesn't match session app: " + appname + " != " + request.session.EZBAKE_APPLICATION);
      }
    });
    tamper ? respondUnauthorized(req, res) : next();
  });

  app.use(path.join(config.base_relative_path, '/resources'), express.static(__dirname + '/../public/resources', {maxAge: config.brower_cache_maxage || 0}));

  app.get(path.join(config.base_relative_path, '/appselect'), function(req, res) {
    thriftUtils.getSecurityId(ezGroupsTypes.SERVICE_NAME, function(err, ezGroupsSecurityId) {
      winston.debug('going into ezgroups stuff');
      if(err) {
        winston.error(err);
        res.send("An error occurred while attempting to retrieve application list.");
        return;
      }
      securityClient.fetchTokenForProxiedUser(req, ezGroupsSecurityId, function(err, securityToken) {
        winston.debug('got user token');
        if(err) {
          winston.error(err);
          res.send("An error occurred while attempting to retrieve application list.");
          return;
        }
        getAppsForUser(req, securityToken, function(err, apps) {
          winston.debug('got apps for user token');
          if(err) {
            winston.error(err);
            res.send(err);
            return;
          }
          var appNames = apps.map(function(app) {
            return {value: appToIndex(app), text: app};
          });
          require('fs').readFile(__dirname + '/../public/appselect.html', 'utf8', function(err, template) {
            var rendered = mustache.render(template, {options: appNames, rootPath: path.join(config.base_relative_path, '/').toString()});
            res.send(rendered);
          });
        });
      });
    });
  });

  app.post(path.join(config.base_relative_path, '/appselect'), function(req, res) {
    var selectedApp = req.body.application;
    thriftUtils.getSecurityId(ezGroupsTypes.SERVICE_NAME, function(err, ezGroupsSecurityId) {
      if(err) {
        winston.error(err);
        respondUnauthorized(req, res);
        return;
      }
      securityClient.fetchTokenForProxiedUser(req, ezGroupsSecurityId, function(err, securityToken) {
        if(err) {
          winston.error(err);
          res.redirect(path.join(config.base_relative_path, '/appselect'));
          return;
        }
        validateAppPermision(req, securityToken, selectedApp, function(isValid) {
          if(isValid) {
            req.session.EZBAKE_APPLICATION = selectedApp;
            res.redirect(path.join(config.base_relative_path, '/'));
          } else {
            respondUnauthorized(req, res);
          }
        });
      });
    });
  });

  app.use(path.join(config.base_relative_path, '/appselect'), express.static(__dirname + '/../public', {maxAge: config.brower_cache_maxage || 0}));

  //////////////////////
  ///HELPER FUNCTIONS///
  //////////////////////

  var respondUnauthorized = function(req, res) {
    if (req.session) {
      req.session.destroy();
    }
    if(req.path.indexOf(path.join(config.base_relative_path, '__es')) === 0) {
      res.status(403).send(JSON.stringify({'error': constants.unauthorizedErrorText}));
    } else {
      res.send(constants.unauthorizedErrorText);
    }
  };

  var validateAppPermision = function(req, securityToken, app, cb) {
    getAppsForUser(req, securityToken, function(err, apps) {
      if(err) {
        winston.error(err);
        cb(false);
        return;
      }
      cb(apps.map(function(application) {
        return appToIndex(application);
      }).indexOf(app) >= 0);
    })
  };

  var getAppsForUser = function(req, securityToken, cb) {
    var sessionTimeoutTime = new Date();
    sessionTimeoutTime.setMinutes(sessionTimeoutTime.getMinutes() - config.security_cache_time);
    var username = securityToken.tokenPrincipal.principal;
    if(req.session.storedApps && req.session.storedApps.apps && req.session.storedApps.username === username &&
      req.session.storedApps.apps.length > 0 && (new Date(req.session.storedApps.time) >= sessionTimeoutTime)) {
      cb(undefined, req.session.storedApps.apps);
    } else {
      delete req.session.storedApps;
      withConnection(function(err, connection, close) {
        if(err || !connection) {
          err = err || 'Unable to establish a connection.';
          cb(err);
          if(close) close();
          return;
        }
        var client = Thrift.createClient(ezGroupsClient, connection);
        client.getUserAuditorApps(securityToken, function(auditAppErr, auditAppIds) {
          if(auditAppErr) {
            cb(auditAppErr);
            if(close) close();
            return;
          }
          client.getUserDiagnosticApps(securityToken, function(diagAppErr, diagAppIds) {
            if(diagAppErr) {
              cb(diagAppErr);
              if(close) close();
              return;
            }
            var appList = _.union(auditAppIds, diagAppIds);
            req.session.storedApps = { apps: appList, time: new Date(), username: username }
            if(close) close();
            cb(null, appList);
          });

        });
      });
    }
  };

  var appToIndex = function(app) {
    return app.toLowerCase().replace(/[^a-z0-9_]/g, '');
  };

  var withConnection = function(cb) { //cb is returned with cb(error, client, closeFunction)
    thriftUtils.getConnection(constants.EZ_GROUPS_APPLICATION_NAME, ezGroupsTypes.SERVICE_NAME, cb);
  };
};
