/**
 * Hosts the latest kibana3 and elasticsearch behind Google OAuth2 Authentication
 * with nodejs and express.
 * License: MIT
 * Copyright: Funplus Game Inc.
 * Author: Fang Li.
 * Project: https://github.com/fangli/kibana-authentication-proxy
 */

var express = require('express');
var https = require('https');
var http = require('http');
var fs = require('fs');
var path = require('path');
var mustache = require('mustache');
var winston = require('winston');
var path = require('path');
var  _ = require('lodash-node');

var EzConfiguration = require('ezbake-configuration')

var constants =  require('./constants');
var logger = require('./lib/logger');
var serviceName = "kibana3-ezbake";

/**
 *  Load EzConfiguration from the system configuration directories
 *
 *  @param dirs an optional array of directories to load
 *  @return an EzConfiguration
 */
function loadEzConfiguration(dirs) {
    var ezConfig;
    if (dirs) {
        var loaders = [
            new EzConfiguration.loaders.DirectoryConfigurationLoader(),
            new EzConfiguration.loaders.OpenShiftConfigurationLoader()
        ];
        for (idx in dirs) {
            loader = dirs[idx]
            winston.info('Loading additional EzConfiguration directory', loader);
            ld = new EzConfiguration.loaders.DirectoryConfigurationLoader(loader);
            winston.info('loader is loadable', ld.isLoadable());
            loaders.push(ld);
        }
        var newEzConfig = function() {
            EzConfiguration.EzConfiguration.apply(this, loaders);
        };
        newEzConfig.prototype = EzConfiguration.EzConfiguration.prototype;
        ezConfig = new newEzConfig();
    } else {
        ezConfig = new EzConfiguration.EzConfiguration()
    }
    return ezConfig;
}

/**
 *  Initialize an ExpressJS application given an application configuration
 *  and EzConfiguration
 *
 *  @param config an app config
 *  @param ezConfig EzConfiguration
 *  @return the initialized application
 */
function getConfiguredApp(config, ezConfig) {
    var app = express();

    app.use(express.cookieParser());
    if(config.use_redis_session){
        require('./lib/session-redis')(app, express, constants, config, ezConfig, winston);
    } else {
        app.use(express.session({ secret: config.cookie_secret }));
    }

    // Authentication
    //require('./lib/basic-auth').configureBasic(express, app, config);
    //require('./lib/google-oauth').configureOAuth(express, app, config);
    //require('./lib/cas-auth.js').configureCas(express, app, config);
    require('./lib/ezsecurity-auth.js').configureEzSecurity(express, app, config, ezConfig, mustache, winston);

    // Setup ES proxy
    if (!config.es_host) {
        config.es_host = ezConfig.getString(constants.elasticSearch.ezConfigHost);
    }
    if (!config.es_port) {
        config.es_port = ezConfig.getString(constants.elasticSearch.ezConfigPort);
    }
    require('./lib/es-proxy').configureESProxy(app, config.base_relative_path, config.es_host, config.es_port,
                                               config.es_username, config.es_password, winston);
    // Serve config.js for kibana3
    // We should use special config.js for the frontend and point the ES to __es/
    app.get(path.join(config.base_relative_path, '/config.js'), function kibana3configjs(req, res) {
        function getKibanaIndex() {
            var raw_index = config.kibana_es_index;
            var user_type = config.which_auth_type_for_kibana_index;
            var user;
            if (raw_index.indexOf('%user%') > -1) {
                if (user_type === 'google') {
                    user = req.googleOauth.id;
                } else if (user_type === 'basic') {
                    user = req.user;
                } else if (user_type === 'cas') {
                    user = req.session.cas_user_name;
                } else {
                    user = 'unknown';
                }
                return raw_index.replace(/%user%/gi, user);
            } else {
                return raw_index;
            }
        }
        res.setHeader('Content-Type', 'application/javascript');
        res.end("define(['settings'], " +
                "function (Settings) {'use strict'; return new Settings({elasticsearch: '"+path.join(config.base_relative_path, '__es')+"', default_route     : '/dashboard/file/ezlogger.json'," +
                "kibana_index: '" +
                getKibanaIndex() +
                "', default_search_index: '["+req.session.EZBAKE_APPLICATION+"-]YYYY.MM.DD', panel_names: ['histogram', 'map', 'pie', 'table', 'filtering', 'timepicker', 'text', 'hits', 'column', 'trends', 'bettermap', 'query', 'terms', 'sparklines'] }); });");
    });

    // Serve all kibana3 frontend files
    app.use(express.compress());
    app.use(path.join(config.base_relative_path, '/'), express.static(__dirname + '/kibana/src', {maxAge: config.brower_cache_maxage || 0}));

    return app;
}

/**
 *  Run the Kibana Authentication Proxy
 *
 */
function run(config, pidfile, host, port) {

    if (config.enable_ssl_port === true) {
        var options = {
            key: fs.readFileSync(config.ssl_key_file),
            cert: fs.readFileSync(config.ssl_cert_file)
        };
        server = https.createServer(options, app);
        server.listen(port, host, listenCallback);
    } else {
        server = http.createServer(app)
        server.listen(port, host, listenCallback);
    }

    function listenCallback() {
        winston.info('Server listening on ' + host + ':' + port);
        if (server instanceof https.Server) {
            winston.info('Communication protected by SSL');
        }

        if (config.effective_user || config.effective_group) {
            // Relinquish root permissions
            try {
                if (config.effective_user) {
                    process.setgid(config.effective_user);
                }
                if (config.effective_group) {
                    process.setuid(config.effective_group);
                }
                winston.info("Relinquished root privileges. Running with user: %s, group: %s",
                        process.getuid(), process.getgid());
            } catch (err) {
                winston.error("Failed to drop uid/gid", config.effective_user, config.effective_group, err);
            }
        }
    }
}

/**
 *  Master process writes logs to a logfile in the configured directory
 */
function setupLogging(config, ezConfig) {

    var baseLogDirectory = ezConfig.getString('ezbake.log.directory', path.join(__dirname, 'tmp'));
    if(!fs.existsSync(baseLogDirectory)){
      fs.mkdirSync(baseLogDirectory);
    }
    //need to separate base log directory from subdirectory as node does not have a recursive mkdir.
    var logDirectory = path.join(baseLogDirectory, config.log_subdirectory);
    if(!fs.existsSync(logDirectory)){
      fs.mkdirSync(logDirectory);
    }
    var logFile = path.join(logDirectory, config.log_file);
    winston.info('Writing logs to:', logFile);

    var winstonLogger = winston.add(winston.transports.File, { filename: logFile, level: config.log_level });
    if(config.hide_console_logs){
      winston.remove(winston.transports.Console);
    }

    // Configure the logger to handle sighub for reopening log files
    logger.reopenTransportOnSighup(winstonLogger.transports.file);
}

/**
 *  Worker process logs to parent process with the ParentProcessLogger
 */
function setupWorkerLogging() {
    winston.add(logger.ParentProcessLogger, {});
    winston.remove(winston.transports.Console);
}

/**
 * Main process
 */
if (require.main === module) {
    var config = require('./config');
    var ezConfig = loadEzConfiguration(config.additionalEzConfigurationDirs);
    var pidfile = path.join("/var/run",serviceName+".pid");

    if (process.argv.length <= 2 || (process.argv.length > 2 && process.argv[2] !== 'worker')) {
        // Set up logging
        setupLogging(config, ezConfig);

        // Write our pidfile
        fs.writeFileSync(pidfile, process.pid);

        // Fork the child
        var child = require('child_process').fork(__filename, ["worker"]);

        // Handle log messages from the worker process
        child.on('message', function(msg) {
            if (msg && msg.level && msg.msg) {
                winston.log(msg.level, msg.msg);
            }
        });

        // Kill the worker on term
        process.on('SIGTERM', function() {
            winston.info('SIGTERM: Cleaning up.');
            child.kill();
            fs.unlink(pidfile, function(err) {
                if (err) {
                    winston.error("Failed to delete pid file",pidfile);
                } else {
                    winston.info("Deleted pid file",pidfile);
                }
            });
        });
    } else {
        // worker
        setupWorkerLogging();
        var app = getConfiguredApp(config, ezConfig);
        var host = config.listen_ip;
        var port = (config.enable_ssl_port)? (config.listen_port_ssl||443) : (config.listen_port||80);
        var server = run(config, pidfile, host, port);

        // Handle cleanup
        process.on('SIGTERM', function() {
            winston.info("Stopping server");
            server.close(function() {
                winston.info("Server stopped");
            });
        });
    }
}
