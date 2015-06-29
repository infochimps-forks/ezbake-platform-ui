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
    routes/development.js handles routes for accessing EzConfiguration
*/
module.exports = (function (server, configuration) {
    if (configuration.environment === "development") {
        var devBanner = {
            "web.application.security.banner.text.color": configuration.classificationBanner.color,
            "web.application.security.banner.text": configuration.classificationBanner.text,
            "web.application.security.banner.background.color": configuration.classificationBanner.backgroundColor
        };
        var path = require("path");
        
        server.route({
            method: "GET",
            path: path.join(configuration.server.baseRelativePath, "/ezbake-webservice/ezconfiguration"),
            config: {
                handler: function (request, reply) {
                    reply(devBanner).type('application/json');
                }
            }
        });
    }
});
