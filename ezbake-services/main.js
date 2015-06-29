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
    main.js is the entry point into the application.
*/
(function () {
    var pkg = require("./package");

    if (pkg.environment === "development") {
        var ofe = require('ofe');
        if (ofe !== undefined) {
            ofe.call();
        }
    }

    var defaultConfig = require("./config/default");
    var environmentConfig = require("./config/environments/" + pkg.environment) || { };

    var finalConfig = require("msngr").extend(environmentConfig, defaultConfig);
    finalConfig.environment = pkg.environment;
    finalConfig.name = pkg.name;
    require("./server")(finalConfig);
}());
