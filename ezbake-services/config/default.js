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
    config/default.js handles the default configuration of the web application.
}
*/
module.exports = (function () {
    return {
        server: {
            host: "localhost",
            port: "3000",
            minify: true,
            ssl: {
                port: "8443",
                keyPath: undefined,
                certPath: undefined,
                pfxPath: undefined
            },
            cors: true,
            baseRelativePath: "/",
            viewEngine: "ejs",
            viewCaching: true,
            minified: true,
            security: "mockSecurity",
            mockSecurityOpts: {
                username: "testUser1"
            },
            ezSecurityOpts: {
                UserInfoHeader: "EZB_VERIFIED_USER_INFO",
                SignatureHeader: "EZB_VERIFIED_SIGNATURE",
                HeaderPrefix: "HTTP_",
                publicKey: ((process.env.EZCONFIGURATION_DIR || "/etc/sysconfig/ezbake/pki/")),
                validate: true,
                requiredExternalGroupKey: "_Ez_internal_project_",
                requiredExternalGroupValue: "_Ez_administrator"
            }
        },
        thrifts: [],
        exposure: {
            serviceOptions: {
                mode: "blacklist"
            },
            services: {
                Service: ["MethodName"]
            },
            propertyOptions: {
                mode: "whitelist"
            },
            properties: [
                "ezbake.application.version",
                "application.name",
                "gee.base2d",
                "gee.base3d",
                "gee.maps",
                "web.application.external.domain",
                "web.application.metrics.endpoint",
                "web.application.metrics.siteid",
                "web.application.chloe.endpoint",
                "web.application.security.banner.text",
                "web.application.security.banner.background.color",
                "web.application.security.banner.text.color"
            ]
        },
        debug: {
            request: ["error"]
        }
    };
}());
