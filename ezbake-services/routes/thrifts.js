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
    routes/thrifts.js handles generating RESTful endpoints based upon parsed thrift files.
*/
module.exports = (function (server, configuration, security) {
    var path = require("path");

    var registeredServices = [];

    var generateRestEndPoints = function (serviceName, methodName, methodObj) {
        var p = path.join(configuration.server.baseRelativePath, ("/services/" + serviceName + "/" + methodName));
        registeredServices.push({
            path: p,
            method: "POST"
        });

        server.route({
            method: "GET",
            path: p,
            config: {
                handler: function (request, reply) {
                    reply(JSON.stringify(methodObj, null, 4)).type('application/json');
                }
            }
        });

        server.route({
            method: "POST",
            path: p,
            config: {
                handler: function (request, reply) {
                    var data = request.payload;
                    var json = undefined;
                    var files = undefined;

                    if (data.files !== undefined && data.json !== undefined) {
                        files = data.files;
                        json = JSON.parse(data.json);
                    } else {
                        json = data;
                    }

                    console.log(json);
                    console.log(files);

                    if (configuration.server.security === "ezSecurity") {
                        // We're in an EzBake environment; use the real stuff
                        var thrift = require("thrift");
                        var ezConfig = require("../singles/ezconfig");
                        var utils = require("../singles/thriftUtils");

                        // Code to interface with thrift here!
                        var gened = require("../gen-nodejs/" + serviceName) || require("../gen-nodejs/" + serviceName.toLowerCase());
                        var ttypes = gened.ttypes;

                        var p = []; // args that will be passed to actual thrift call
                        var data_i = 0;
                        var secToken_i,
                            nextParam;
                        var tokenNameRexp = /SecurityToken$/; // This is an alias used in some definition
                        // files, but it will cover all known nomenclatures for the EzSecurityToken
                        try {
                            for (var i = 0; i < methodObj.params.length; ++i) {
                                next_param = json.params[data_i];
                                if (tokenNameRexp.test(methodObj.params[i].type)) {
                                    // Security token is not sent thru the REST call; we add it on the server side in the proper location in the arg list
                                    secToken_i = i;
                                    p.push(null);
                                    continue;
                                }
                                if (ttypes.hasOwnProperty(methodObj.params[i].type) && next_param !== undefined && next_param !== null) {
                                    p.push(new ttypes[methodObj.params[i].type](next_param));
                                } else {
                                    p.push(next_param);
                                };
                                data_i++;
                            }
                        } catch (e) {
                            // Don't really care
                            console.log(e);
                        }

                        utils.getSecurityId(json.serviceName, function(errSecurityId, securityId) {
                            security.getAuthToken(request, securityId, function (errGetToken, token) {
                                var params = p;
                                params[secToken_i] = token;
                                utils.getConnection(json.appName, json.serviceName, function (errGetThrift, connection, close) {
                                    params = params.concat(function (errThrift, results) {
				                        close();
                                        reply({
                                            results: results,
                                            service: serviceName,
                                            error: errThrift
                                        }).type('application/json');
                                    });
                                    var thriftClient = thrift.createClient(gened, connection);
                                    thriftClient[methodName].apply(thriftClient, params);
                                });

                            });
                        });
                    } else {
                        // Mocking things here
                        // We're mocking or something else; can't use thrift etc
                        reply({
                            results: { InsertMockResultHere: "Result" },
                            service: serviceName,
                            error: undefined,
                            data: json,
                            files: files
                        }).type('application/json');
                    }
                }
            }
        });
    };

    server.methods.getParsedThrifts(null, function (errGetParsedThrifts, result) {
        if (errGetParsedThrifts !== undefined && errGetParsedThrifts !== null) {
            console.log("Failed to parse thrift files.");
            return;
        }

        if (result === undefined || result === null || result.length === 0) {
            console.log("Failed to parse thrift files.");
            return;
        }

        for (var i = 0; i < result.length; ++i) {
            for (var serviceName in result[i].service) {
                if (result[i].service.hasOwnProperty(serviceName)) {
                    var service = result[i].service[serviceName];
                    for (var methodName in service) {
                        if (service.hasOwnProperty(methodName)) {
                            var method = service[methodName];
                            if (method !== "__extends") {
                                (function (ser, met) {
                                    server.methods.shouldGenerateEndPoint({ service: ser, method: met }, function (err, include) {
                                        if (include === true) {
                                            generateRestEndPoints(serviceName, methodName, method);
                                        }
                                    });
                                }(serviceName, methodName));
                            }
                        }
                    }
                }
            }
        }

        server.route({
            method: "GET",
            path: path.join(configuration.server.baseRelativePath, "/services/"),
            config: {
                handler: function (request, reply) {
                    reply(JSON.stringify(registeredServices, null, 4)).type('application/json');
                }
            }
        });
    });
});
