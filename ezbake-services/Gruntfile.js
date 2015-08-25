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
    Gruntfile.js
    Grunt file that provides internal tasks for building and getting setup.
    Run 'grunt' in terminal to get a list of available tasks.
 */
module.exports = (function (grunt) {
    grunt.loadNpmTasks('grunt-contrib-clean');
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-shell');
    grunt.loadNpmTasks('grunt-vulcanize');
    grunt.loadNpmTasks('grunt-available-tasks');

    // Get rid of the header output nonsense
	grunt.log.header = function () {};

    var packInfo = require("./package.json");
    var versionString = "-" + packInfo.version;

    var execute = function (command, args, path, callback, context){
	    var cmd = require("child_process").spawn(command, args, { cwd: path });
	    cmd.stdout.setEncoding("utf8");
	    cmd.stdout.on("data", function (data) {
	    	console.log(data);
	    });
	    cmd.stderr.setEncoding("utf8");
	    cmd.stderr.on("data", function (data) {
	    	console.log(data);
	    });
	    if (callback !== undefined) {
	    	cmd.on("exit", function (code) {
	    		callback.apply((context || this), [code]);
	    	});
	    }
	};

    grunt.initConfig({
        pkg: grunt.file.readJSON("package.json"),
        clean: {
            build: "./build/",
            thriftGen: "./gen-nodejs/",
            thrift_modules: "./.tmp/",
            thriftFiles: "./thrifts/",
            webComps: "./public/lib/min.html"
        },
        copy: {
            build: {
                src: "**",
                dest: "./build/target/"
            },
            deployer: {
                src: "./registration.yml",
                dest: "./build/release/EzBakeServices" + versionString + "-manifest.yml"
            }
        },
        shell: {
            pack: {
                options: {
                    execOptions: {
                        cwd: "./build/target/",
                        maxBuffer: NaN
                    }
                },
                command: "tar -zcvf /tmp/EzBakeServices" + versionString + ".tar.gz ./*; mv /tmp/EzBakeServices" + versionString + ".tar.gz ../release/EzBakeServices" + versionString + ".tar.gz;"
            },
            findAndCopyThrifts: {
                options: {
                    execOptions: {
                        cwd: "./"
                    }
                },
                command: 'find ./.tmp/ -iname "*.thrift" -type f -exec /bin/mv {} ./thrifts/ \\;'
            },
            getThriftSubmodules: {
                options: {
                    execOptions: {
                        cwd: "./.tmp/"
                    }
                },
                command: "git submodule init; git submodule update;"
            },
            npmPruneDevDependencies: {
                options: {
                    execOptions: {
                        cwd: "./build/target/"
                    }
                },
                command: "npm prune --production"
            },
            start: {
                options: {
                    execOptions: {
                        cwd: "./"
                    }
                },
                command: "npm start"
            },
            test: {
                options: {
                    execOptions: {
                        cwd: "./"
                    }
                },
                command: packInfo.scripts.test
            }
        },
        availabletasks: {
            tasks: {
                options: {
                    filter: "include",
                    tasks: ["init", "start", "test", "build:ezbake", "build:development", "build:production"]
                }
            }
        },
        vulcanize: {
            default: {
                options: {
                    inline: true
                },
                files: {
                    "./public/components/includes.min.html": "./public/components/includes.html"
                }
            }
        }
    });

    grunt.registerTask("header:init", function () {
        grunt.log.subhead("Initializing " + packInfo.name);
    });

    grunt.registerTask("header:building", function () {
        grunt.log.subhead("Building " + packInfo.name);
    });

    grunt.registerTask("header:starting", function () {
        grunt.log.subhead("Starting " + packInfo.name);
    });

    grunt.registerTask("header:testing", function () {
        grunt.log.subhead("Testing " + packInfo.name);
    });

    grunt.registerTask("default", ["availabletasks"]);

    grunt.registerTask("start", "An alias for the `npm start` command; simply starts the web application.", ["header:starting", "shell:start"]);
    grunt.registerTask("test", "An alias for the `npm test` command; simply starts the mocha unit tests.", ["header:testing", "shell:test"]);

    grunt.registerTask("generateConfiguredThrifts", function () {
        var done = this.async();

        var pkg = require("./package");
        var defaultConfig = require("./config/default");
        var environmentConfig = require("./config/environments/" + pkg.environment) || { };

        var finalConfig = require("msngr").extend(environmentConfig, defaultConfig);

        if (grunt.option("no-gen") === true) {
            done();
        } else {
            var tasks = [];
            for (var i = 0; i < finalConfig.thrifts.length; ++i) {
                (function (file) {
                    tasks.push(function (callback) {
                        execute("thrift", ["-r", "--gen", "js:node", ("./thrifts/" + file)], "./", function () {
                            callback(null, null);
                        });
                    });
                }(finalConfig.thrifts[i].fileName));
            }
            require("async").parallel(tasks, function () {
                done();
            });
        }
    });

    grunt.registerTask("tweakGeneratedThriftForTypes", "Tweaks the generated JavaScript from thrift to allow easy access to types", function () {
        var constPath = "./gen-nodejs/";
        var constTextEnd = "//HELPER FUNCTIONS AND STRUCTURES";

        var fs = require("fs");
        var path = require("path");
        if (fs.existsSync(constPath)) {
            var files = fs.readdirSync(constPath);
            for (var i = 0; i < files.length; ++i) {
                if (files[i].indexOf(".js") !== -1) {
                    var file = fs.readFileSync(path.join(constPath, files[i]), { encoding: "utf8" });
                    var top = file.substring(0, file.indexOf(constTextEnd));
                    var bottom = file.substring(file.indexOf(constTextEnd), file.length - 1);

                    var tops = top.split(/\n/g);

                    var additive = "\nvar msngr = require('msngr'); exports.ttypes = { };";
                    for (var k = 0; k < tops.length; ++k) {
                        if (tops[k].indexOf("ttypes") !== -1) {
                            var varLoc = tops[k].indexOf("var");
                            var equalLoc = tops[k].indexOf("=");
                            var varName = tops[k].substring(varLoc + 3, equalLoc).trim();
                            additive = additive + "msngr.extend(" + varName + ", exports.ttypes);";
                        }
                    }
                }
                additive = additive + "\n";
                fs.writeFileSync(path.join(constPath, files[i]), (top + additive + bottom), { encoding: "utf8" });
            }
        }
    });

    grunt.registerTask("fixMinifiedSourceMap", function () {
        var p = "./public/components/includes.min.html";
        var file = require("fs").readFileSync(p, { encoding: "utf8" });
        file = file.replace("sourceMappingURL=polymer.js.map", "sourceMappingURL=../lib/polymer/polymer.js.map");
        require("fs").writeFileSync(p, file, { encoding: "utf8" });
    });

    grunt.registerTask("generateThrifts", function () {
        var done = this.async();

        var files = require("fs").readdirSync("./thrifts/");

        if (grunt.option("no-gen") === true) {
            done();
        } else {
            var tasks = [];
            for (var i = 0; i < files.length; ++i) {
                (function (file) {
                    tasks.push(function (callback) {
                        try {
                            execute("thrift", ["-r", "--gen", "js:node", ("./thrifts/" + file)], "./", function () {
                                callback(null, null);
                            });
                        }
                        catch (e) {
                            // Ignore this error; it probably won't really matter in the end.
                        }

                    });
                }(files[i]));
            }
            require("async").parallel(tasks, function () {
                done();
            });
        }
    });

    grunt.registerTask("fetchThrifts", function () {
        var done = this.async();
        execute("git", ["clone", "-b", "2.1release", "https://github.com/infochimps-forks/ezbake-thrift.git", ".tmp"], "./", function () {
            done();
        });
    });

    grunt.registerTask("mkdir:release", function () {
        grunt.file.mkdir("./build/release/");
    });

    grunt.registerTask("mkdir:thrifts", function () {
        grunt.file.mkdir("./thrifts/");
    });

    grunt.registerTask("generateThrift", [
            "clean:thriftGen",
            "clean:thriftFiles",
            "mkdir:thrifts",
            "clean:thrift_modules",
            "fetchThrifts",
            "shell:getThriftSubmodules",
            "shell:findAndCopyThrifts",
            "clean:thrift_modules",
            "generateThrifts",
            "tweakGeneratedThriftForTypes"]);

    grunt.registerTask("init", "Initializes the project by fetching the latest thrift services within EzBake and generating their node.js code.", ["header:init", "generateThrift"]);

    grunt.registerTask("openshit-ify", function () {
        var pkg = "./build/target/package.json";
        var p = require(pkg);
        delete p.dependencies;
        delete p.devDependencies;
        delete p.optionalDependencies;
        require("fs").writeFileSync(pkg, JSON.stringify(p, null, 4), { encoding: "utf8" });
    });

    grunt.registerTask("targetEnv:openshift", function () {
        var pkg = "./build/target/package.json";
        var p = require(pkg);
        p.environment = "ezbake-openshift";
        require("fs").writeFileSync(pkg, JSON.stringify(p, null, 4), { encoding: "utf8" });
    });

    grunt.registerTask("targetEnv:development", function () {
        var pkg = "./build/target/package.json";
        var p = require(pkg);
        p.environment = "development";
        require("fs").writeFileSync(pkg, JSON.stringify(p, null, 4), { encoding: "utf8" });
    });

    grunt.registerTask("targetEnv:production", function () {
        var pkg = "./build/target/package.json";
        var p = require(pkg);
        p.environment = "production";
        require("fs").writeFileSync(pkg, JSON.stringify(p, null, 4), { encoding: "utf8" });
    });

    grunt.registerTask("build:development", "Builds a version ready for deploying within a development environment.", [
        "header:building",
        "clean:build",
        "clean:webComps",
        "init",
        "vulcanize",
        "fixMinifiedSourceMap",
        "copy:build",
        "targetEnv:development",
        "mkdir:release",
        "shell:pack"]);

    grunt.registerTask("build:production", "Builds a version ready for deploying within a production environment.", [
        "header:building",
        "clean:build",
        "clean:webComps",
        "init",
        "vulcanize",
        "fixMinifiedSourceMap",
        "copy:build",
        "targetEnv:production",
        "mkdir:release",
        "shell:pack"]);

    grunt.registerTask("build:ezbake", "Builds a version ready for deploying within the EzBake platform.", [
        "header:building",
        "clean:build",
        "clean:webComps",
        "init",
        "vulcanize",
        "fixMinifiedSourceMap",
        "copy:build",
        "shell:npmPruneDevDependencies",
        "openshit-ify",
        "targetEnv:openshift",
        "mkdir:release",
        "copy:deployer",
        "shell:pack"]);
});
