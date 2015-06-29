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
    routes/static.js handles routing for static assets.
*/
module.exports = (function (server, configuration) {
    var path = require("path");
    // Statically serve the frontend thirdparty libraries
    server.route({
        method: "GET",
        path: path.join(configuration.server.baseRelativePath, "/lib/{path*}"),
        config: {
            auth: false,
            handler: {
                directory: {
                    path: "./public/lib/",
                    listing: false,
                    index: false
                }
            }
        }
    });

    // Statically serve our own web components
    server.route({
        method: "GET",
        path: path.join(configuration.server.baseRelativePath, "/components/{path*}"),
        config: {
            auth: false,
            handler: {
                directory: {
                    path: "./public/components/",
                    listing: false,
                    index: false
                }
            }
        }
    });

    // Statically serve the frontend images
    server.route({
        method: "GET",
        path: path.join(configuration.server.baseRelativePath, "/images/{path*}"),
        config: {
            auth: false,
            handler: {
                directory: {
                    path: "./public/images/",
                    listing: false,
                    index: false
                }
            }
        }
    });

    // Statically serve the frontend css
    server.route({
        method: "GET",
        path: path.join(configuration.server.baseRelativePath, "/css/{path*}"),
        config: {
            auth: false,
            handler: {
                directory: {
                    path: "./public/css/",
                    listing: false,
                    index: false
                }
            }
        }
    });

    // Statically serve the frontend js
    server.route({
        method: "GET",
        path: path.join(configuration.server.baseRelativePath, "/js/{path*}"),
        config: {
            auth: false,
            handler: {
                directory: {
                    path: "./public/js/",
                    listing: false,
                    index: false
                }
            }
        }
    });

    // Statically serve the frontend fonts
    server.route({
        method: "GET",
        path: path.join(configuration.server.baseRelativePath, "/fonts/{path*}"),
        config: {
            auth: false,
            handler: {
                directory: {
                    path: "./public/fonts/",
                    listing: false,
                    index: false
                }
            }
        }
    });
});
