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
    public/js/index.js handles the client scripting for the index view.
*/
(function () {
    var isObject = function (input) {
        return ((input !== undefined && input !== null) && Object.prototype.toString.call(input) === "[object Object]");
    };

    var isString = function (input) {
        return ((input !== undefined && input !== null) && Object.prototype.toString.call(input) === "[object String]");
    };

    var isArray = function (input) {
        return ((input !== undefined && input !== null) && Object.prototype.toString.call(input) === "[object Array]");
    };

    var ajax = function (options) {
		if (options === undefined || options.method === undefined || options.url === undefined) {
			return;
		}
        var numTries = 0,
            maxTries = (typeof options.retries == 'number') ? options.retries : 3;
		try {
			var xhr = new XMLHttpRequest();

			xhr.onreadystatechange = function () {
                var url;
				if (xhr.readyState === 4) {
					if (xhr.status === 200 || xhr.status === 201) {
						if (options.success !== undefined) {
							options.success.apply((options.context || this), [xhr.status, xhr.response, xhr]);
						}
					} else if (xhr.status === 401) {
						if (options.error !== undefined || options.failure !== undefined) {
                           (options.error || options.failure).apply((options.context || this), [xhr.status, xhr.response, xhr]);
                       }
					} else if (xhr.status === 403) {
						if (options.error !== undefined || options.failure !== undefined) {
						   (options.error || options.failure).apply((options.context || this), [xhr.status, xhr.response, xhr]);
						}
                    } else {
                        if (xhr.status == 0 && (options.method == 'GET' || options.method == 'OPTIONS') && numTries++ < maxTries) {
                            url = createUrl();
			                xhr.open(options.method, url);
                            if (isObject(options.data) || isArray(options.data)) {
				                xhr.setRequestHeader("Content-Type", "application/json");
				                xhr.send(JSON.stringify(options.data));
			                } else {
				                xhr.send(options.data);
			                }
                        } else {
						    if (options.error !== undefined || options.failure !== undefined) {
							    (options.error || options.failure).apply((options.context || this), [xhr.status, xhr.response, xhr]);
						    }
                        }
					}
				}
			};

            xhr.ontimeout = function () {
                if (options.error !== undefined || options.failure !== undefined) {
                    (options.error || options.failure).apply((options.context || this), ["timeout", xhr.response, xhr]);
                }
            };

			if (options.progress !== undefined) {
				xhr.addEventListener("progress", options.progress);
			}

			xhr.withCredentials = (options.withCredentials !== undefined) ? options.withCredentials : true;

			var query = [];
			if (options.query !== undefined) {
				for (var key in options.query) {
					if (options.query.hasOwnProperty(key)) {
						var opt = options.query[key];
						if (!isArray(opt)) {
							opt = [opt];
						}
						for (var i = 0; i < opt.length; ++i) {
							query.push(key + "=" + options.query[key]);
						}
					}
				}
			}

            var queryString = ((query.length > 0) ? "&" + query.join("&") : "");
            function createUrl () {
                var url = options.url;
                if (options.allowCaching !== true) {
                    url = url + "?=_" + (new Date().getTime());
                }
                url = url + queryString;
                return url;
            }
			xhr.open(options.method, createUrl());
			xhr.timeout = (options.timeout !== undefined) ? options.timeout : 30000;
			xhr.responseType = (options.type !== undefined) ? options.type : "json";

			if (isObject(options.data) || isArray(options.data)) {
				xhr.setRequestHeader("Content-Type", "application/json");
				xhr.send(JSON.stringify(options.data));
			} else {
				xhr.send(options.data);
			}
		} catch (ex) {
			if (options.error !== undefined || options.failure !== undefined) {
				(options.error || options.failure).apply((options.context || this), [ex]);
			}
		}
	};

    // On load within index
    document.addEventListener("polymer-ready", function () {
        var tabs = document.querySelector("paper-tabs");
        var pages = document.querySelector("core-pages");
        var aboutDialog = document.querySelector("paper-dialog[id=about]");
        var credentialsDialog = document.querySelector("paper-dialog[id=creds]");
        var outputDialog = document.querySelector("paper-dialog[id=output]");
        var propertiesDialog = document.querySelector("paper-dialog[id=properties]");
        var outputDialogContent = outputDialog.querySelector("div.console");

        var resetOutput = function () {
            if (outputDialogContent !== undefined && outputDialogContent !== null) {
                while (outputDialogContent.firstChild) {
                    outputDialogContent.removeChild(outputDialogContent.firstChild);
                }
            }
        };

        var logToOutput = function (input, status, targetElm) {
            var p = document.createElement("p");
            p.appendChild(document.createTextNode(input));
            if (status !== undefined) {
                p.setAttribute("class", status);
            }
            (targetElm || outputDialogContent).appendChild(p);
        };

        var ensureOutputOpen = function () {
            if (outputDialog.opened === false) {
                outputDialog.toggle();
            }
        };

        ajax({
            url: (baseUrl + "properties/"),
            method: "GET",
            success: function (status, response) {
                logToOutput(JSON.stringify(response, null, 4), undefined, propertiesDialog.querySelector("div.console"));
            },
            error: function (status, response) {
                logToOutput("Failed fetching properties from server.", "failure", propertiesDialog.querySelector("div.console"));
            }
        });

        if (tabs !== undefined && tabs !== null) {
            tabs.addEventListener("core-select", function () {
                var selectedTab = tabs.querySelector("paper-tab[name=" + tabs.selected + "]");
                pages.selected = selectedTab.getAttribute("pageIndex");
            });

            document.querySelector("paper-menu-button paper-item[name=mycreds]").addEventListener("click", function (e) {
                credentialsDialog.toggle();
            });

            document.querySelector("paper-menu-button paper-item[name=about]").addEventListener("click", function (e) {
                aboutDialog.toggle();
            });

            document.querySelector("paper-menu-button paper-item[name=output]").addEventListener("click", function (e) {
                outputDialog.toggle();
            });

            document.querySelector("paper-menu-button paper-item[name=properties]").addEventListener("click", function (e) {
                propertiesDialog.toggle();
            });

            document.addEventListener("keypress", function (e) {
                var key = e.key;
                if (key === undefined) {
                    var keyChar = e.which || e.keyCode || e.charCode;
                    key = String.fromCharCode(keyChar);
                }
                if (key === "~") {
                    outputDialog.toggle();
                }
            });

            var ipages = document.querySelector("core-pages").childNodes;
            for (var i = 0; i < ipages.length; ++i) {
                if (ipages[i].nodeName.toLowerCase() === "div") {
                    (function (page) {
                        page.querySelector("paper-button[name=viewThrift]").addEventListener("click", function (e) {
                            page.querySelector("paper-dialog[name=thrift]").toggle();
                        });
                        page.querySelector("paper-button[name=viewJson]").addEventListener("click", function (e) {
                            page.querySelector("paper-dialog[name=json]").toggle();
                        });
                    }(ipages[i]));
                }
            }

            var methods = document.querySelectorAll("div.serviceMethod");
            for (var i = 0; i < methods.length; ++i) {
                var method = methods[i];

                (function (m) {
                    var button = m.querySelector("paper-button[name=post]");
                    button.addEventListener("click", function (e) {
                        var obj = { };
                        obj.appName = m.getAttribute("data-app-name");
                        obj.serviceName = m.getAttribute("data-service-name");
                        obj.params = [];

                        var inputs = m.querySelectorAll("paper-input");
                        var checks = m.querySelectorAll("paper-checkbox");
                        var files = m.querySelectorAll("input[type=file]");

                        var valueIndex = { };
                        for (var j = 0; j < inputs.length; ++j) {
                            valueIndex[inputs[j].getAttribute("name")] = inputs[j].value;
                        }

                        for (var j = 0; j < checks.length; ++j) {
                            valueIndex[checks[j].getAttribute("name")] = checks[j].checked;
                        }

                        var formData = undefined;
                        if (files.length > 0) {
                            formData = new FormData();
                            for (var j = 0; j < files.length; ++j) {
                                for (var k = 0; k < files[j].files.length; ++k) {
                                    formData.append('files[]', files[j].files[k], files[j].files[k].name);
                                }
                            }
                        }

                        var paramDefinition = m.querySelector("textarea").value;
                        if (paramDefinition !== undefined && paramDefinition !== null && paramDefinition.trim() !== "") {
                            paramDefinition = JSON.parse(paramDefinition);
                            for (var k = 0; k < paramDefinition.length; ++k) {
                                var d = paramDefinition[k];
                                if (d !== undefined && d !== null) {
                                    if (valueIndex[d.name] !== undefined && d.type !== "EzSecurityToken") {
                                        if (valueIndex[d.name].indexOf && valueIndex[d.name].indexOf("{") !== -1 && valueIndex[d.name].indexOf("}") !== -1) {
                                            // Probably an object
                                            obj.params.push(JSON.parse(valueIndex[d.name].replace(/'/g, '"')));
                                        } else {
                                            if (isString(valueIndex[d.name])) {
                                                if (valueIndex[d.name].trim() === "") {
                                                    obj.params.push(null);
                                                } else {
                                                    obj.params.push(valueIndex[d.name]);
                                                }
                                            } else {
                                                obj.params.push(valueIndex[d.name]);
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        if (formData !== undefined) {
                            formData.append('json', JSON.stringify(obj));
                        }

                        var split = m.getAttribute("id").split(".");
                        var uri = baseUrl + "services/" + split[0] + "/" + split[1];
                        resetOutput();
                        ensureOutputOpen();
                        logToOutput("Service: " + split[0]);
                        logToOutput("Method: " + split[1]);
                        logToOutput("URL: " + uri);
                        logToOutput("Data: " + JSON.stringify(obj, null, 4));
                        logToOutput("Sending to server...");
                        var start = new Date();
                        ajax({
                            url: uri,
                            method: "POST",
                            timeout: 60000,
                            data: (formData || obj),
                            success: function (status, response) {
                                var end = new Date();
                                logToOutput("Round trip took " + (end - start) + "ms");
                                logToOutput("Received success from the server.", "success");
                                logToOutput("Response: " + JSON.stringify(response, null, 4));
                            },
                            error: function (status, response) {
                                var end = new Date();
                                if (status === "timeout") {
                                    logToOutput("Sending to server timed out after " + (end - start) + "ms.", "failure");
                                } else {
                                    logToOutput("Round trip took " + (end - start) + "ms");
                                    logToOutput("Received failure from the server.", "failure");
                                    logToOutput("Response: " + JSON.stringify(response, null, 4));
                                }
                            }
                        });

                    });
                }(method));
            }
        }
    });
}());
