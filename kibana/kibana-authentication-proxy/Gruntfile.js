var _ = require('lodash-node');
module.exports = (function (grunt) {
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-mkdir');
  grunt.loadNpmTasks('grunt-shell');
  grunt.loadNpmTasks('grunt-easy-rpm');

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

  var rpmFiles = [{
    src: [
      "README.md",
      "LICENSE",
      "app.js",
      "config.js",
      "constants.json",
      "public/**/*",
      "kibana/**/*",
      "lib/**/*",
      "node_modules/**/*"
     ],
     dest: "/opt/kibana3-ezbake/"
    }, {
      cwd: 'build/target',
      src: "package.json",
      dest: "/opt/kibana3-ezbake/"
    }, {
      cwd: 'rpm',
      src: 'config/*',
      dest: "/opt/kibana3-ezbake/"
    }, {
      cwd: 'rpm/scripts',
      src: "etc/init.d/kibana3-ezbake",
      dest: "/",
      mode: "755"
    }, {
      cwd: 'rpm/scripts',
      src: 'etc/logrotate.d/*',
      dest: '/',
      mode: '644'
    }];


  grunt.initConfig({
    pkg: grunt.file.readJSON("package.json"),
    mkdir: {
      build: {
        options: {
          create: ['build/target']
        }
      }
    },
    clean: {
      build: "./build/",
      kibana: './build/target/kibana'
    },
    copy: {
      build: {
        cwd: "./",
        src: [
          "README.md",
          "LICENSE",
          "app.js",
          "config.js",
          "constants.json",
          "kibana3-ezbake",
          "public/**/*",
          "kibana/**/*",
          "lib/**/*",
          "node_modules/**/*"
        ],
        dest: "./build/target/"
      },
      package: {
        src: "package.json",
        dest: "build/target/"
      },
      deployer: {
        src: "./logging-manifest.yml",
        dest: "./build/release/logging-manifest.yml"
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
        command: "tar -cvzf ../release/kibana-authentication-proxy.tar.gz ./"
      },
      fetchKibana: {
        options: {
          execOptions: {
            cwd: './build/target/'
          }
        },
        command: [
          'git clone --depth=1 git@github.com:ezbake/kibana.git kibana',
          'rm -rf kibana/.git'
        ]
      }
    },
    easy_rpm: {
      options: {
        name: "kibana3-ezbake",
        version: "2.0",
        vendor: "42six",
        group: "EzBake",
        license: "Apache 2.0",
        summary: "Kibana Authentication and EzBake integration proxy",
        description: "Hosts a custom version of kibana3 and elasticsearch behind EzSecurity with NodeJS and Express",
        prefix: "/opt",
        dependencies: ["nodejs >= 0.10.30"],
        tempDir: "build/rpmbuild",
        rpmDestination: "build"
      },
      release: {
        options: {
          release: "2",
        },
        files: rpmFiles
      },
      snapshot: {
        options: {
          release: snapshotRelease()
        },
        files: rpmFiles
      }
    }
  });

  function snapshotRelease() {
    var d = new Date();
    return require('util').format("0.%d%d%d%d%d", d.getFullYear(), d.getMonth()+1, d.getDate(), d.getUTCHours(), d.getUTCMinutes());
  }

  grunt.registerTask("copy:all", function() {
    grunt.task.run("copy:package", "copy:build");
  });

  grunt.registerTask("mkdir:release", function () {
    grunt.file.mkdir("./build/release/");
  });

  grunt.registerTask("openshiftify", function () {
    grunt.task.requires("copy:package");
    var pkg = "./build/target/package.json";
    var p = require(pkg);
    delete p.dependencies;
    delete p.devDependencies;
    delete p.optionalDependencies;
    require("fs").writeFileSync(pkg, JSON.stringify(p), { encoding: "utf8" });
  });

  grunt.registerTask("targetEnv:openshift", function () {
    grunt.task.requires("copy:package");
    var pkg = "./build/target/package.json";
    var p = require(pkg);
    p.environment = "openshift";
    require("fs").writeFileSync(pkg, JSON.stringify(p), { encoding: "utf8" });
  });

  grunt.registerTask("targetEnv:development", function () {
    grunt.task.requires("copy:package");
    var pkg = "./build/target/package.json";
    var p = require(pkg);
    p.environment = "development";
    require("fs").writeFileSync(pkg, JSON.stringify(p), { encoding: "utf8" });
  });

  grunt.registerTask("targetEnv:standalone", function () {
    grunt.task.requires("copy:package");
    var pkg = "./build/target/package.json";
    var p = require(pkg);
    p.environment = "standalone";
    require("fs").writeFileSync(pkg, JSON.stringify(p), { encoding: "utf8" });
  });



  grunt.registerTask('prepare:kibana', [
    'clean:kibana',
    'mkdir:build',
    'shell:fetchKibana'
  ]);

  grunt.registerTask("build:openshift", [
    "clean:build",
    "copy:all",
    "openshiftify",
    "targetEnv:openshift",
    "mkdir:release",
    "copy:deployer",
    "shell:pack"
  ]);

  grunt.registerTask("prepare:rpm", [
    "clean:build",
    "copy:package",
    "targetEnv:standalone",
  ]);
  grunt.registerTask("build:rpm", [
    "prepare:rpm",
    "easy_rpm:release"
  ]);

  grunt.registerTask("build:rpm_snapshot", [
    "prepare:rpm",
    "easy_rpm:snapshot"
  ]);
});
