/*   Copyright (C) 2013-2014 Computer Sciences Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License. */

 /*
    server.js handles setting up the server and running the web applications.
 */
module.exports = (function (configuration) {
    var msngr = require("msngr");
    var hapi = require("hapi");
    var fs = require("fs");
    var path = require("path");

    var hapiConfig = {
        cors: configuration.server.cors,
        views: {
            path: "views",
            engines: {
                ejs: require(configuration.server.viewEngine)
            },
            isCached: configuration.server.viewCaching
        },
        debug: configuration.debug
    };

    var httpServer;

    var cSsl = configuration.server.ssl;
    if (cSsl.port !== undefined && ((cSsl.keyPath !== undefined && cSsl.certPath !== undefined) || cSsl.pfxPath !== undefined)) {
        httpServer = hapi.createServer(configuration.server.host, configuration.server.ssl.port, msngr.extend({
            tls: {
                key: (cSsl.keyPath) ? fs.readFileSync(cSsl.keyPath, "utf8") : undefined,
                cert: (cSsl.certPath) ? fs.readFileSync(cSsl.certPath, "utf8") : undefined,
                pfx: (cSsl.pfxPath) ? fs.readFileSync(cSsl.pfxPath, "utf8") : undefined
            }
        }, hapiConfig));
    } else {
        httpServer = hapi.createServer(configuration.server.host, configuration.server.port, hapiConfig);
    }

    // Setup session state
    var sessionStateOpts = {
        ttl: 24 * 60 * 60 * 1000, // one day
        isSecure: false,
        path: "/",
        encoding: "base64json"
    };

    httpServer.state("session", sessionStateOpts);

    // Setup authentication
    var security = require("./security/" + configuration.server.security)(httpServer, configuration);

    var getParsedThrifts = function (opts, next) {
        var funcs = [];
        var parser = require("./parsers/thrift");
        for (var i = 0; i < configuration.thrifts.length; ++i) {
            var thrift = configuration.thrifts[i];
            (function (file, label, app, serv) {
                funcs.push(function (callback) {
                    var p = parser.create({
                        label: label,
                        file: file,
                        lazy: true,
                        encoding: "utf8",
                        appName: app,
                        serviceName: serv
                    });
                    p.on("ready", function () {
                        p.parse(function (err, result) {
                            callback(null, result);
                        });
                    });
                });
            }("./thrifts/" + thrift.fileName, thrift.label, thrift.appName, thrift.serviceName));
        }
        require("async").parallel(funcs, function (err, results) {
            next(null, results);
        });
    };

    httpServer.method("getParsedThrifts", getParsedThrifts, null);

    httpServer.method("shouldGenerateEndPoint", function (opts, next) {
        var include = undefined;
        var white = (configuration.exposure.serviceOptions.mode === "whitelist");
        var black = (configuration.exposure.serviceOptions.mode === "blacklist");
        var ser = opts.service;
        var met = opts.method;

        if (white === true) {
            if (configuration.exposure.services[ser] !== undefined) {
                if (configuration.exposure.services[ser].indexOf(met) !== -1) {
                    include = true;
                } else {
                    include = false;
                }
            } else {
                include = false;
            }
        }

         if (black === true && include === undefined) {
            if (configuration.exposure.services[ser] !== undefined) {
                if (configuration.exposure.services[ser].indexOf(met) !== -1) {
                    include = false;
                } else {
                    include = true;
                }
            } else {
                include = true;
            }
        }
        next(null, include);
    });

    httpServer.method("ezConfigProperties", function (opts, next) {
        var props = require("./singles/ezconfig").getProperties();

        var okProps = { };
        var white = (configuration.exposure.propertyOptions.mode === "whitelist");
        var black = (configuration.exposure.propertyOptions.mode === "blacklist");

        for (var key in props) {
            if (props.hasOwnProperty(key)) {
                if (white === true) {
                    if (configuration.exposure.properties.indexOf(key) !== -1) {
                        okProps[key] = props[key];
                    }
                } else if (black === true) {
                    if (configuration.exposure.properties.indexOf(key) === -1) {
                        okProps[key] = props[key];
                    }
                } else {
                    okProps[key] = props[key];
                }
            }
        }

        next(null, okProps);
    });

    msngr.register({ topic:"ReadyToCache", category: "ServerStatus" }, function () {
        httpServer.methods.getParsedThrifts(null, function (error, result) {
            msngr.emit({ topic: "ReadyToServe", category: "ServerStatus" });
        });
    });

    // Find all routes and set them up to be served
    fs.readdir("./routes", function (err, files) {
        for (var i = 0, length = files.length; i < length; i++) {
            if (/.*\.js$/.test(files[i])) {
                require("./routes/" + files[i])(httpServer, configuration, security);
            }
        }
        msngr.emit({ topic: "ReadyToCache", category: "ServerStatus" });
    });

    // Start the server when it's ready
    msngr.register({ topic: "ReadyToServe", category: "ServerStatus" }, function () {
        httpServer.start(function () {
            console.log("Web server started up at " + httpServer.info.uri);
        });
    });
});
