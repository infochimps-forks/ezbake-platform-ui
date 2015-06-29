/*   Copyright (C) 2013-2015 Computer Sciences Corporation
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

module.exports = function(config){
  config.set({
    basePath : '../../../main/webapp/',

    files : [
      'lib/angular/angular.js',
      'lib/angular/angular-*.js',
      'js/*.js',
      '../../test/webapp/unit/*.js'
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
      'karma-firefox-launcher',
      'karma-script-launcher',
      'karma-jasmine'
    ],

    junitReporter : {
      outputFile: 'dev-test-results.xml',
      suite: 'unit'
    }
  });
};