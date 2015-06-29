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
    security/ezSecurity.js handles authorization when deployed within the EzBake platform.
*/
module.exports = (function (server, configuration) {
    var userInfoHeader = configuration.server.ezSecurityOpts.UserInfoHeader;
    var sigHeader = configuration.server.ezSecurityOpts.SignatureHeader;
    var prefixHeader = configuration.server.ezSecurityOpts.HeaderPrefix;

    var path = require("path");
    var thrift = require("thrift");
    var thriftUtils = require("ezbake-thrift-utils").ThriftUtils;
    var EzConfiguration = require("ezbake-configuration");
    var ezConfig = new EzConfiguration.EzConfiguration();
    var utils = new thriftUtils(ezConfig);

    var getHeader = function (request, header) {
        var ezSecHead = request.headers[header];
        ezSecHead = ezSecHead || request.headers[header.toLowerCase()];
        ezSecHead = ezSecHead || request.headers[prefixHeader + header];
        ezSecHead = ezSecHead || request.headers[prefixHeader + header.toLowerCase()];

        return ezSecHead;
    };

    var getUserCN = function (userDN) {
        var fields = (userDN || "").split(",");
        var userCN;

        for (var i = 0; i < fields.length; ++i) {
            var field = fields[i].trim();
            if (field.indexOf("CN=") === 0) {
                userCN = field.substring(3);
                break;
            }
        }

        return userCN;
    };

    var validateSignature = function (request, userDN) {
        if (configuration.server.ezSecurityOpts.validate !== true) {
            return true;
        }
        var result = undefined;
        try {
            var EzSecurityClient = require("ezbake-security-client");
            var client = new EzSecurityClient.Client();
            result = client.validateCurrentRequest(request);
        } catch (e) {
            console.log(e);
        }

        return result;
    };

    var getAuthToken = function (request, targetSecurityId, callback) {
        var EzSecurityClient = require("ezbake-security-client");
        var client = new EzSecurityClient.Client();
        client.fetchTokenForProxiedUser(request, targetSecurityId, callback);
    };

    var replyWithUnAuth = function (reply) {
        reply.view("unauthorized", {
            basePath: path.join(configuration.server.baseRelativePath, "/"),
            credentials: null
        });
    };

    server.auth.scheme("EzSecurity", function (serv, options) {
        return {
            authenticate: function (request, reply) {
                try {
                    var userDNJson = JSON.parse(getHeader(request, userInfoHeader));
                    var userDN = ((userDNJson || { })["x509"] || { })["subject"];

                    if (validateSignature(request, userDN) === true) {
                        var userCN = getUserCN(userDN);
                        if (userCN !== undefined && userCN !== null) {
                            utils.getSecurityId(configuration.name, function(errSecurityId, securityId) {
                                getAuthToken(request, securityId, function (errGetToken, token) {
                                    var hasAccess = false;
                                    if (token !== undefined && token.externalProjectGroups !== undefined) {
                                        var internal = token.externalProjectGroups[configuration.server.ezSecurityOpts.requiredExternalGroupKey];
                                        if (internal !== undefined) {
                                            hasAccess = (internal.indexOf(configuration.server.ezSecurityOpts.requiredExternalGroupValue) !== -1);
                                        }
                                    }
                                    if (hasAccess) {
                                        reply(null, {
                                            credentials: {
                                                username: userCN,
                                                dn: userDN,
                                                json: userDNJson
                                            }
                                        });
                                    } else {
                                        replyWithUnAuth(reply);
                                    }
                                });
                            });
                        } else {
                            replyWithUnAuth(reply);
                        }
                    } else {
                        replyWithUnAuth(reply);
                    }
                }
                catch (e) {
                    replyWithUnAuth(reply);
                }
            }
        };
    });

    server.auth.strategy("SecureAll", "EzSecurity", true);

    return {
        getAuthToken: getAuthToken
    };
});
