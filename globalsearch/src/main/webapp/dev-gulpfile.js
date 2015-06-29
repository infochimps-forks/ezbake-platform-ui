// Include gulp
var gulp = require('gulp');

// Plugins we depend on to build
var install = require("gulp-install");
var jshint = require('gulp-jshint');
var ngAnnotate = require('gulp-ng-annotate');
var notify = require('gulp-notify');
var rev = require('gulp-rev');
var rimraf = require('gulp-rimraf');
var sourcemaps = require('gulp-sourcemaps');
// Be careful upgrading 'gulp-uglify'.  Currently, version 0.3.2 is not 
// properly generating sourcemaps for minified JavaScript
var uglify = require('gulp-uglify');
var usemin = require('gulp-usemin');
var summary = require('jshint-summary');
var runSequence = require('run-sequence');


// Configuration 
var
    buildDirectory = "dist/",
    globalSearchFiles = ["js/**/*.js", "lib/chloe/chloe.js"];

gulp.task('clean', function () {
    return gulp.src([buildDirectory], {read: false})
        .pipe(rimraf());
});

// Lint Task
gulp.task('jshint', function () {
    var jsHintOptions = {
        globalstrict: true,
        browser: true,
        // The following are used throughout our code without dependency injection
        // or the like, so we need to let JSHint know that they are known globals
        globals: {
            angular: true,
            // Used in logging
            console: true,
            // Swivl's "Stats" API
            Stats: true,
            // jQuery
            jQuery: true,
            $: true,
            // Map stuff
            GEE_SERVER_URL: true,
            // For connections to Chloe
            WebSocket: true
        },
        // Suppress the warning 'x' is already defined.
        // TODO: This could be dangerous, we should fix this.
        shadow: true,
        // Suppress the warning "['x'] is better written in dot notation"
        sub: true,
        strict: false,
        // Suppress the warning about commas at the front of a line rather than the end
        laxcomma: true
    };

    gulp.src(globalSearchFiles.concat('dev-gulpfile.js'), {base: './'})
        .pipe(jshint(jsHintOptions))
        // Improved output for JSHint
        .pipe(jshint.reporter('jshint-summary', {
            verbose: true,
            statistics: true
        }))
        // This reporter fails the build when some JSHint error occurs
        .pipe(jshint.reporter('fail'));
});

// Copy all the non-minified scripts
gulp.task('copy-libs', function () {
    // Install our Bower dependencies
    gulp.src(['components/bower.json'])
        .pipe(install());

    console.log("Copying files that aren't going to be minimized to the build directory...");
    gulp.src(globalSearchFiles.concat(['components/**', 'css/**', 'fonts/**', 'img/**', 'partials/**', 'templates/**', 'test_images/**',
            'index.jsp', 'viewer.html']),
        // Need to pass the base directory to preserve file tree structure
        {base: './'})
        .pipe(gulp.dest(buildDirectory));
});

gulp.task('build', function (callback) {
    // The order of arguments passed to 'runSequence' will
    // be enforced by the build executor
    runSequence(
        // Arrays that are passed to the 'runSequence' function
        // are parralellized.  However, both clean and lint
        // will finish before usemin starts.
        ['clean', 'jshint'],
        'copy-libs',
        callback
    );
});

// Default Task
gulp.task('default', ['build']);
