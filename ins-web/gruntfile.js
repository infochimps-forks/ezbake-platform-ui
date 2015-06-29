module.exports = function(grunt){

    // load all dependencies specified in package.json
	require("matchdep").filterDev("grunt-*").forEach(grunt.loadNpmTasks);


	grunt.initConfig({

        pkg: grunt.file.readJSON('package.json'),

        banner: '/*! <%= pkg.title || pkg.name %> - v<%= pkg.version %> - <%= grunt.template.today("yyyy-mm-dd") %>*/',

        dir: {
          dest              : 'dist',
  
        	/* WEBAPP */
            root_webapp 		  : 'src/main/webapp', 
        	root_partials 		: '<%= dir.root_webapp %>' + '/partials',
        	root_js 			    : '<%= dir.root_webapp %>' + '/js',
        	root_css 			    : '<%= dir.root_webapp %>' + '/css',
          
        	/* TEST */
        	root_test			    : 'src/test/webapp',
        	root_test_config 	: '<%= dir.root_test %>/config',
        	root_test_unit	 	: '<%= dir.root_test %>/unit'

        },
       
   	
	   /*********** TASK DEFINITION **********/
       // clean up
       clean: {
      		build: ['<%= copy.dist.dest %>'],
      		js: [
      				'<%= copy.dist.dest %>/<%= dir.root_js %>/*', 
      				'<%= copy.dist.dest %>/*.*',
      				'!<%= copy.dist.dest %>/<%= dir.root_js %>/*.min.js'
      			]
       },

       // copy files
       copy: {
       	dist: {
       		expand: true,
       		src: [
       				'<%= dir.root_webapp %>/**',
       				'<%= dir.root_test %>/**',
       			   ],
       		dest: '<%= dir.dest %>'
       	}
       },

       	/*** js ***/
       	// concat files
       	concat: {
       		options: {
       			banner: '<%= banner %>',
       			stripBanners: true
       		},
       		dist: {
       			src: 
	       			[
	       				'<%= copy.dist.dest %>/<%= dir.root_js %>/*.js'
	       			],
	       		dest: '<%= copy.dist.dest %>/<%= pkg.name %>.js'
       		}
       	},

       	// minify AngularJS
      	ngmin: {
      		dist: {
        		src: ['<%= concat.dist.dest %>'],
        		dest: '<%= copy.dist.dest %>/<%= pkg.name %>.annotate.js'
      		}
    	},

    	// minify all js
    	uglify: {
    		options: {
    			banner: '<%= banner %>'
    		},
    		dist: {
    			src: ['<%= ngmin.dist.dest %>'],
    			dest: '<%= copy.dist.dest %>/<%= dir.root_js %>/<%= pkg.name %>.min.js'
    		}
    	},

    	/*** html ***/
    	// copy relevant html files and use point it to optimized js files
    	useminPrepare: {
    		html: '<%= copy.dist.dest %>/<%= dir.root_webapp %>/index.html',
    		options: {
    			dest: '<%= copy.dist.dest %>'
    		}

    	},
    	usemin: {
    		html: [
    				'<%= copy.dist.dest %>/<%= dir.root_webapp %>/**/*.html',
    				'<%= copy.dist.dest %>/<%= dir.root_test %>/**/*.html'
    			  ],
    		options: {
    			dirs: ['<%= copy.dist.dest %>'],
    			basedir: ['<%= copy.dist.dest %>']
    		}
    	},

        // validate html files
		htmlhint: {
		    build: {
		        options: {
		            'tag-pair'					: true,
		            'spec-char-escape'			: true,
		            'id-unique'					: true,
		            'style-disabled'			: true,
		            'head-script-disabled'		: false,
		            'tagname-lowercase'			: false,
		            'attr-lowercase'			: false,
		            'attr-value-double-quotes'	: false,
		            'doctype-first'				: false
		        },
		        src: ['<%= dir.root_webapp %>*.html', '<%= dir.root_partials %>*.html']
		    }
		},

		/*** test ***/
		karma: {
				dev: {
				configFile: '<%= copy.dist.dest %>/<%= dir.root_test_config %>/karma-dev.conf.js'
			}
		},

		// watch files for changes and run task automatically
		// task runs in terminal until interupted by the user
		// run: "grunt watch"
		// or run "grunt watch -v" for verbose
		watch: {
		    html: {
		        files: ['<%= dir.root_webapp %>*.html', '<%= dir.root_partials %>*.html'],
		        tasks: ['htmlhint', 'build']
		    },
		    js: {
		    	files: ['<%= dir.root_js%>app.js'],
		    	tasks: ['build']
		    }
		}

    });

	// register tasks
  grunt.registerTask('build', ['clean:build', 'copy', 'concat', 'ngmin', 'uglify', 'usemin', 'clean:js']);
	grunt.registerTask('default', ['build']);
  grunt.registerTask('build-dev', ['clean:build', 'copy' ]);
	grunt.registerTask('build-test', ['build', 'karma:dev']);
};
