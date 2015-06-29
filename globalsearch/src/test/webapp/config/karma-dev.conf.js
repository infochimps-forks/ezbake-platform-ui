basePath = '../';

files = [
    JASMINE,
    JASMINE_ADAPTER,
    'app/lib/jquery/jquery-1.9.1.min.js',
    'app/lib/jquery/jquery-ui-1.10.2.min.js',
    'app/lib/jquery/jquery.*.js',
    'app/lib/angular/angular.js',
    'app/lib/angular/angular-*.js',
    'app/js/**/*.js',
    'app/lib/external/*.js',
    'test/unit/**/*.js'
];

browsers = ['Chrome'];
autoWatch = true;
singleRun = false;

junitReporter = {
    outputFile: 'dev-test-results.xml',
    suite: 'unit'
};
