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
    security/mockSecurity.js handles a mock authorization mechanism when running locally.
*/
module.exports = (function (server, configuration) {
    server.auth.scheme("EzSecurity", function (serv, options) {
        return {
            authenticate: function (request, reply) {
                reply(null, {
                    credentials: {
                        username: configuration.server.mockSecurityOpts.username || "test",
                        dn: undefined,
                        json: { }
                    }
                });
            }
        };
    });

    server.auth.strategy("SecureAll", "EzSecurity", true);

    return {
        getAuthToken: function (request, targetSecurityId, callback) {
            callback.apply(this, [{ mock: "mock" }]);
        }
    };
});
