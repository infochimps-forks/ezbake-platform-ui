basePath = '../';

files = [
    JASMINE,
    JASMINE_ADAPTER,
    'app/lib/jquery/jquery-1.9.1.min.js',
    'app/lib/jquery/jquery-ui-1.10.2.min.js',
    'app/lib/jquery/jquery.*.js',
    'app/lib/angular/angular.js',
    'app/lib/angular/angular-*.js',
    'app/js/services/FakeREST.js',
    'app/js/social-ui.min.js',
    'app/lib/external/*.js',
    'test/unit/**/*.js'
];

// We need to exclude the keylines javascript files
// since they are in app/lib/external but have been
// packaged with the social-ui.min.js file
exclude = ['app/lib/external/keylines*.js'];

browsers = ['PhantomJS'];
autoWatch = false;
singleRun = true;

reporters = ['dots', 'junit'];
junitReporter = {
    outputFile: 'build-test-results.xml',
    suite: 'unit'
};
