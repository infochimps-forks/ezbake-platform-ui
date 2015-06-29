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
    parsers/thrift.js
    A "good enough" parser to turn thrift into JSON. It doesn't translate the entire thrift file
    and will most likely contain bugs but it gathers enough information to provide RESTful services
    that can directly hit each thrift service.

    Usage:
    This exported method attempts to parse a thrift file and generate output in JSON that describes the thrift service.

    Expected input (file or thrift are required; not both):
    parser.create({
        thrift: "", // raw thrift service content
        file: "mythrift.thrift", // path to thrift file.
        encoding: "utf8" // Specify the coding of the file; defaults to uft8.
        lazy: false // Specify whether parsing should be done lazily; defaults to false to parse up front.
    });

*/
(function () {
    var tokener = require("./tokener");
    var helpers = {
        removeComments: function (input) {
            /*
                This function is loosely based on the one found here:
                http://www.weanswer.it/blog/optimize-css-javascript-remove-comments-php/
            */
            input = ('__' + input + '__').split('');
            var mode = {
                singleQuote: false,
                doubleQuote: false,
                regex: false,
                blockComment: false,
                lineComment: false,
                condComp: false
            };
            for (var i = 0, l = input.length; i < l; i++) {

                if (mode.regex) {
                    if (input[i] === '/' && input[i-1] !== '\\') {
                        mode.regex = false;
                    }
                    continue;
                }

                if (mode.singleQuote) {
                    if (input[i] === "'" && input[i-1] !== '\\') {
                        mode.singleQuote = false;
                    }
                    continue;
                }

                if (mode.doubleQuote) {
                    if (input[i] === '"' && input[i-1] !== '\\') {
                        mode.doubleQuote = false;
                    }
                    continue;
                }

                if (mode.blockComment) {
                    if (input[i] === '*' && input[i+1] === '/') {
                        input[i+1] = '';
                        mode.blockComment = false;
                    }
                    input[i] = '';
                    continue;
                }

                if (mode.lineComment) {
                    if (input[i+1] === '\n' || input[i+1] === '\r') {
                        mode.lineComment = false;
                    }
                    input[i] = '';
                    continue;
                }

                if (mode.condComp) {
                    if (input[i-2] === '@' && input[i-1] === '*' && input[i] === '/') {
                        mode.condComp = false;
                    }
                    continue;
                }

                mode.doubleQuote = input[i] === '"';
                mode.singleQuote = input[i] === "'";

                if (input[i] === '/') {

                    if (input[i+1] === '*' && input[i+2] === '@') {
                        mode.condComp = true;
                        continue;
                    }
                    if (input[i+1] === '*') {
                        input[i] = '';
                        mode.blockComment = true;
                        continue;
                    }
                    if (input[i+1] === '/') {
                        input[i] = '';
                        mode.lineComment = true;
                        continue;
                    }
                    mode.regex = true;

                }

            }
            return input.join('').slice(2, -2);
        },
        extend: function (obj, target) {
			if (Object.prototype.toString.call(obj) === "[object Object]") {
				for (var key in obj) {
					if (obj.hasOwnProperty(key)) {
						if (Object.prototype.toString.call(obj[key]) === "[object Object]") {
							if (target[key] === undefined) {
								target[key] = { };
							}
							target[key] = helpers.extend(obj[key], target[key]);
						} else if (Object.prototype.toString.call(obj[key]) === "[object Array]") {
							target[key] = (target[key] || []).concat(obj[key]);
						} else {
							target[key] = obj[key];
						}
					}
				}
			}
			return target;
		},
        normalizeServiceEnds: function (str) {
            // Normalize newlines
            str = str.replace(/\r/g, "");
            str = str.replace(/\)\n/g, ");\n");
            return str;
        },
        extractNamespaces: function (tokens) {
            var keyword = ["namespace", "php_namespace", "xsd_namespace"];

            var result = { };
            var count = 0;

            var val = tokens.nextUntil(keyword);
            while (val !== undefined) {
                if (result[val] === undefined) {
                    result[val] = { };
                }
                result[val][tokens.next()] = tokens.next();
                count++;
                val = tokens.nextUntil(keyword);
            }

            return ((count > 0) ? result : undefined);
        },
        extractTypedefs: function (tokens) {
            var keyword = "typedef";

            var result = { };
            var count = 0;

            var val = tokens.nextUntil(keyword);
            while (val !== undefined) {
                if (result[val] === undefined) {
                    result[val] = { };
                }
                result[val][tokens.next()] = tokens.next();
                count++;
                val = tokens.nextUntil(keyword);
            }

            return ((count > 0) ? result : undefined);
        },
        extractEnums: function (tokens) {
            var keyword = "enum";

            var result = { };
            var count = 0;

            var val = tokens.nextUntil(keyword);
            while (val !== undefined) {
                if (result[val] === undefined) {
                    result[val] = { };
                }

                var name = tokens.next();
                result[val][name] = undefined;
                if (tokens.next() === "{") {
                    var vals = { };
                    var val2 = tokens.next();
                    var count = 0;
                    while (val2 !== "}") {
                        var split = val2.split("=");
                        if (split.length > 1) {
                            // It has an equal with no spaces.
                            vals[split[0]] = split[1];
                            val2 = tokens.next();
                        } else {
                            var valT = tokens.next();
                            if (valT === "=") {
                                var v = tokens.next();
                                vals[val2] = (v !== undefined && v !== null) ? v.replace(",", "") : v;
                            } else {
                                vals[val2.replace(",", "")] = count;
                                count++;
                                val2 = valT;
                            }
                        }
                    }
                    result[val][name] = vals;
                }

                count++;
                val = tokens.nextUntil(keyword);
            }

            return ((count > 0) ? result : undefined);
        },
        extractStructs: function (tokens) {
            var keyword = "struct";

            var result = { };
            var count = 0;

            var val = tokens.nextUntil(keyword);
            while (val !== undefined) {
                if (result[val] === undefined) {
                    result[val] = { };
                }

                var name = tokens.next();
                result[val][name] = undefined;
                if (tokens.next() === "{") {
                    var vals = { };
                    var val2 = tokens.next();
                    var count = 0;
                    while (val2 !== "}") {
                        val2 = tokens.next();
                        count++;
                    }
                    result[val][name] = vals;
                }

                count++;
                val = tokens.nextUntil(keyword);
            }

            return ((count > 0) ? result : undefined);
        },
        extractExceptions: function (tokens) {
            var keyword = "exception";

            var result = { };
            var count = 0;

            var val = tokens.nextUntil(keyword);
            while (val !== undefined) {
                if (result[val] === undefined) {
                    result[val] = { };
                }

                var name = tokens.next();
                result[val][name] = undefined;
                if (tokens.next() === "{") {
                    var vals = { };
                    var val2 = tokens.next();
                    var count = 0;
                    while (val2 !== "}") {
                        val2 = tokens.next();
                        count++;
                    }
                    result[val][name] = vals;
                }

                count++;
                val = tokens.nextUntil(keyword);
            }

            return ((count > 0) ? result : undefined);
        },
        extractServices: function (tokens) {
            var keyword = "service";

            var result = { };
            var count = 0;

            var val = tokens.nextUntil(keyword);
            while (val !== undefined) {
                if (result[val] === undefined) {
                    result[val] = { };
                }

                var name = tokens.next();
                result[val][name] = undefined;
                var n = tokens.next();
                var extend = undefined;
                if (n === "extends") {
                    extend = tokens.next();
                    n = tokens.next();
                }
                if (n === "{") {
                    var vals = { };
                    var val2 = tokens.next();
                    var count = 0;
                    var reass = [];

                    // Due to some funny business that's possible inside of the service block we need to reconstitute
                    // the block of text (our original tokenization works well for everything but this).
                    while (val2 !== "}") {
                        reass.push(val2);
                        val2 = tokens.next();
                    }
                    var text = reass.join(" ");
                    text = text.trim();
                    // Drop all newlines and replace with a single space
                    text = text.replace(tokener.splitPatterns.newline, " ");
                    // Replace all instances of whitespace with a single space each
                    text = text.replace(tokener.splitPatterns.whiteSpace, " ");
                    // Misc normalization operations based upon real-world data
                    var dataMassage = function (t) {
                        t = t.replace(/\( +/g, "(");
                        t = t.replace(/ +\)/g, ")");
                        t = t.replace(/ *, */g, ",");
                        t = t.replace(/,\)/g, ")");
                        t = t.replace(/\),/g, ");");
                        t = t.replace(/: +/g, ":");
                        return t;
                    };

                    // Run the massager 2 times. Why? Some cases affect others so running it twice covers this issue.
                    // At least, it was an issue before we were using regexes; not sure now.
                    var times = 0;
                    while (times < 2) {
                        text = dataMassage(text);
                        ++times;
                    }

                    // Split up the found methods for easy parsing.
                    var splitsville = text.split(";");
                    for (var i = 0; i < splitsville.length; ++i) {
                        // Side-affect from the split is sometimes leading whitespace. Let's just nuke this possibility now.
                        splitsville[i] = splitsville[i].trim();
                        if (splitsville[i].length === 0) {
                            // This item is no good. Pfft! Pop it and break!
                            splitsville.pop();
                            break;
                        }
                    }

                    // Okay let's relax now, run the tokener per character and let's move on with life. Please. Thanks.
                    var processMethod = function (str) {
                        var end = {
                            type: undefined,
                            method: undefined,
                            params: undefined,
                            throws: undefined
                        };
                        var charTokens = tokener.create(str, tokener.splitPatterns.characters);
                        var char = charTokens.next();

                        // Figure out type
                        var typeChars = [];
                        while (char !== " ") {
                            typeChars.push(char);
                            var n = charTokens.next();
                            if (char === "," && n === " ") {
                                char = charTokens.next();
                            } else {
                                char = n;
                            }
                        }
                        end.type = typeChars.join("");

                        // Figure out method name
                        var methodChars = [];
                        char = charTokens.next();
                        while (char !== "(") {
                            methodChars.push(char);
                            char = charTokens.next();
                        }
                        end.method = methodChars.join("");

                        // End?
                        char = charTokens.next();
                        if (char === undefined) {
                            return end;
                        }

                        // Figure out the params
                        var paramChars = [];
                        while (char !== ")") {
                            paramChars.push(char);
                            char = charTokens.next();
                        }
                        var unfunkedParams = paramChars.join("").replace("(", "").replace(")", "").trim().split(",");

                        var fixBadDeveloperSyntaxBecauseEveryoneHasToBeAJerkAboutThings = function (arr) {
                            var result = arr;
                            for (var i = 0; i < arr.length; ++i) {
                                var colon1 = arr[i].indexOf(":");
                                var colon2 = (colon1 === -1) ? -1 : arr[i].indexOf(":", colon1 + 1);
                                if (colon2 !== -1) {
                                    // We have to fix this. Bah!
                                    var ci = colon2;
                                    while (ci !== 0) {
                                        if (arr[i].charAt(ci) === " ") {
                                            var splits = [arr[i].substring(0, ci), arr[i].substring(ci, arr[i].length)];
                                            result[i] = splits[0];
                                            result.splice(i + 1, 0, splits[1]);
                                            break;
                                        }
                                        --ci;
                                    }
                                }
                            }
                            return result;
                        }

                        unfunkedParams = fixBadDeveloperSyntaxBecauseEveryoneHasToBeAJerkAboutThings(unfunkedParams);

                        if (unfunkedParams.length > 0 && unfunkedParams[0].length > 0) {
                            end.params = [];
                            for (var i = 0; i < unfunkedParams.length; ++i) {
                                var ps = unfunkedParams[i].trim().split(" ");
                                var index = Number(ps[0].substring(0, ps[0].indexOf(":"))) - 1; // Thrift uses stupid 1-based indexes. Ugh.

                                if (ps.length === 2) {
                                    var val1 = ps[0].substring(ps[0].indexOf(":") + 1, ps[0].length);
                                    var val2 = ps[1];
                                    var hasEquals = (val2.indexOf("=") === -1) ? false : true;
                                    end.params[index] = {
                                        type: val1,
                                        name: (hasEquals) ? val2.substring(0, val2.indexOf("=")) : val2,
                                        __default: (hasEquals) ? val2.substring(val2.indexOf("=") + 1, val2.length) : undefined
                                    };
                                } else if (ps.length === 3) {
                                    end.params[index] = {
                                        requiredness: ps[0].substring(ps[0].indexOf(":") + 1, ps[0].length),
                                        type: ps[1],
                                        name: ps[2]
                                    };
                                }
                            }
                        }

                        // End?
                        char = charTokens.next();
                        if (char === undefined) {
                            return end;
                        }

                        // Figure out the throws
                        var throwChars = [];
                        while (char !== ")") {
                            throwChars.push(char);
                            char = charTokens.next();
                        }
                        var unfunkedThrows = throwChars.join("").replace("throws", "").replace("(", "").replace(")", "").trim().split(",");
                        if (unfunkedThrows.length > 0 && unfunkedThrows[0].length > 0) {
                            end.throws = [];
                            for (var i = 0; i < unfunkedThrows.length; ++i) {
                                var ps = unfunkedThrows[i].split(" ");
                                var index = Number(ps[0].substring(0, ps[0].indexOf(":"))) - 1; // Thrift uses stupid 1-based indexes. Ugh.
                                if (ps.length === 2) {
                                    end.throws[index] = {
                                        type: ps[0].substring(ps[0].indexOf(":") + 1, ps[0].length),
                                        name: ps[1]
                                    };
                                } else if (ps.length === 3) {
                                    end.throws[index] = {
                                        requiredness: ps[0].substring(ps[0].indexOf(":") + 1, ps[0].length),
                                        type: ps[1],
                                        name: ps[2]
                                    };
                                }
                            }
                        }
                        return end;
                    };

                    var vals = { };
                    for (var i = 0; i < splitsville.length; ++i) {
                        var data = processMethod(splitsville[i]);
                        if (data !== undefined && data.type !== undefined && data.method !== undefined) {
                            vals[data.method] = {
                                returns: data.type,
                                params: data.params || [],
                                throws: data.throws || []
                            };
                        }
                    }
                    result[val][name] = vals;
                }
                if (extend !== undefined) {
                    result[val][name]["__extends"] = extend;
                }

                count++;
                val = tokens.nextUntil(keyword);
            }

            return ((count > 0) ? result : undefined);
        }
    };

    var parser = {
        create: function (obj) {
            var self = Object.create(this);
            self.thrift = undefined;
            self.eventQueue = { };
            self.parsedJson = {
                meta: {
                    filename: obj.file,
                    label: obj.label,
                    appName: obj.appName,
                    serviceName: obj.serviceName
                }
            };
            self.states = {
                ready: false,
                parsed: false
            };

            if (obj !== undefined && obj !== null) {
                if (obj.thrift !== undefined && obj.thrift !== null) {
                    self.thrift = obj.thrift;
                    self.states.ready = true;
                    if (obj.lazy !== true) {
                        self.parse(undefined, self);
                    }
                }

                if (self.thrift === undefined && obj.file !== undefined && obj.file !== null) {
                    require("fs").readFile(obj.file, {
                        encoding: obj.encoding || "utf8"
                    }, function (err, data) {
                        if (err !== undefined && err !== null) {
                            throw err;
                        }
                        self.thrift = data;
                        self.states.ready = true;
                        if (obj.lazy !== true) {
                            self.parse();
                        }
                        self.trigger("ready");
                    });
                }
            } else {
                throw "No thrift file specified for parsing."
            }
            return self;
        },
        on: function (event, callback, context) {
            if (this.eventQueue[event] === undefined) {
                this.eventQueue[event] = [];
            }
            this.eventQueue[event].push({ callback: callback, context: context || this });

            if (this.states.ready === true && event === "ready") {
                this.trigger("ready");
            }

            if (this.states.parsed === true && event === "parsed") {
                this.trigger("parsed");
            }

            return this;
        },
        trigger: function (event) {
            if (this.eventQueue[event] !== undefined && this.eventQueue[event].length > 0) {
                var delegate;
                while (this.eventQueue[event].length > 0) {
                    delegate = this.eventQueue[event].shift();
                    (function (d) {
                        setTimeout(function () {
                            d.callback.apply(d.context, []);
                        }, 0);
                    }(delegate));
                }
            }

            return this;
        },
        parse: function (callback, context) {
            var err = undefined;
            try {
                this.parsedJson.original = this.thrift;
                this.thrift = helpers.normalizeServiceEnds(this.thrift);
                this.thrift = helpers.removeComments(this.thrift);
                var token = tokener.create(this.thrift, tokener.splitPatterns.whiteSpace);
                this.parsedJson = helpers.extend(helpers.extractNamespaces(token.reset()), this.parsedJson);
                this.parsedJson = helpers.extend(helpers.extractTypedefs(token.reset()), this.parsedJson);
                this.parsedJson = helpers.extend(helpers.extractEnums(token.reset()), this.parsedJson);
                this.parsedJson = helpers.extend(helpers.extractStructs(token.reset()), this.parsedJson);
                this.parsedJson = helpers.extend(helpers.extractExceptions(token.reset()), this.parsedJson);
                this.parsedJson = helpers.extend(helpers.extractServices(token.reset()), this.parsedJson);
            } catch (e) {
                this.states.parsed = "FAILED";
                err = e;
                console.log("The following failure occurred during parsing: ");
                console.log(e);
            }

            this.states.parsed = (this.states.parsed === false) ? true : this.states.parsed;
            if (callback !== undefined && callback !== null) {
                callback.apply(context || this, [err, this.parsedJson]);
            }

            this.trigger("parsed");

            return this;
        },
        getRawThrift: function (callback, context) {
            this.on("ready", function () {
                if (callback !== undefined && callback !== null) {
                    callback.apply(context || this, [undefined, this.thrift]);
                }
            });
            return this;
        },
        getJSONOverview: function (callback, context) {
            if (this.states.parsed === false) {
                this.parse(function (err, result) {
                    if (callback !== undefined && callback !== null) {
                        callback.apply(this, [err, this.parsedJson]);
                    }
                });
            } else if (this.states.parsed === true) {
                if (callback !== undefined && callback !== null) {
                    callback.apply(context || this, [undefined, this.parsedJson]);
                }
            } else {
                if (callback !== undefined && callback !== null) {
                    callback.apply(this, ["Unknown issue with parsed data.", this.parsedJson]);
                }
            }

            return this;
        }
    };

    module.exports = parser;
}());
