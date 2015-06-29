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
    routes/pages.js handles routes to different web pages.
*/
module.exports = (function (server, configuration) {

    var formatters = {
        getLang: function (abb) {
            var langs = {
                "java": "Java",
                "cpp": "C++",
                "py": "Python",
                "js": "JavaScript",
                "cs": "C#",
                "thrift": "Thrift"
            };
            if (langs[abb] !== undefined) {
                return langs[abb];
            }
            return abb;
        }
    };

    var path = require("path");
    // Serve the start page of the web application
    server.route({
        method: "GET",
        path: path.join(configuration.server.baseRelativePath, "/"),
        config: {
            handler: function (request, reply) {
                server.methods.getParsedThrifts(null, function (err, result) {
                    var gens = { };
                    console.log(result.length);
                    for (var i = 0; i < result.length; ++i) {
                        var thrift = result[i];
                        for (var service in thrift.service) {
                            console.log(service);
                            if (thrift.service.hasOwnProperty(service)) {
                                if (gens[service] === undefined) {
                                    gens[service] = require("../gen-nodejs/" + service) || require("../gen-nodejs/" + service.toLowerCase());
                                }
                            }
                        }
                    }
                    console.log(gens);
                    reply.view("index", {
                        username: request.auth.credentials.username,
                        dn: request.auth.credentials.dn,
                        authJson: request.auth.credentials.json,
                        basePath: path.join(configuration.server.baseRelativePath, "/"),
                        thrifts: result,
                        generated: gens,
                        formatters: formatters,
                        shouldInclude: server.methods.shouldGenerateEndPoint,
                        minified: configuration.server.minified
                    });
                });
            }
        }
    });

    server.route({
        method: "GET",
        path: path.join(configuration.server.baseRelativePath, "/unauthorized/"),
        config: {
            handler: function (request, reply) {
                reply.view("unauthorized", {
                    basePath: path.join(configuration.server.baseRelativePath, "/")
                });
            }
        }
    })
});
