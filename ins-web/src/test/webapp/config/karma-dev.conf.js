module.exports = function(config){
  config.set({
	basePath : '../../../',
    files : [
             'main/webapp/lib/jquery-1.10.2.js',
             'main/webapp/lib/angular-file-upload/angular-file-upload-shim.min.js',
             'main/webapp/lib/angular/angular.min.js',
             'main/webapp/lib/angular/angular-route.min.js',
             'main/webapp/lib/angular/angular-resource.min.js',
             'main/webapp/lib/angular/angular-cookies.min.js',
             'main/webapp/lib/angular/angular-mocks.min.js',
             'main/webapp/lib/angular/angular-animate.min.js',
             'main/webapp/lib/angular-file-upload/angular-file-upload.min.js',             
             'main/webapp/lib/ui-bootstrap-tpls-0.10.0.min.js',
             'main/webapp/js/*.js',
             'test/webapp/unit/*.js'
    ],

    exclude : [
      'lib/angular/angular-loader.js',
      'lib/angular/*.min.js',
      'lib/angular/angular-scenario.js'
    ],

    autoWatch : true,

    frameworks: ['jasmine'],

    browsers : ['Chrome'],

    plugins : [
      'karma-junit-reporter',
      'karma-chrome-launcher',
      'karma-script-launcher',
      'karma-jasmine'
    ],

    junitReporter : {
      outputFile: 'dev-test-results.xml',
      suite: 'unit'
    }
  });
};
