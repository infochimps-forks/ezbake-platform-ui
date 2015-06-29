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
    config/environments/ezbake-openshift.js a configuration for an EzBake platform deployment.
}
*/
module.exports = (function () {
    return {
        server: {
            host: process.env.OPENSHIFT_NODEJS_IP || "localhost",
            port: process.env.OPENSHIFT_NODEJS_PORT || 8080,
            ssl: {
                port: undefined,
                keyPath: undefined,
                certPath: undefined,
                pfxPath: undefined
            },
            baseRelativePath: "/ezbake-services/",
            security: "ezSecurity",
            viewCaching: true,
            minified: true,
            ezSecurityOpts: {
                validate: true
            }
        },
        thrifts: [
            { fileName: "EzGroups.thrift", label: "EzGroups", appName: "common_services", serviceName: "ezgroups" }
        ],
        debug: {
            request: ["error", "uncaught"]
        }
    };
}());
