'use strict';

// Declare app level module which depends on filters, and services
angular.module('registration', [
  'ngRoute',
  'registration.filters',
  'registration.services',
  'registration.directives',
  'registration.controllers',
  'ui.bootstrap',
  'ngCookies',
  'localytics.directives',
  'angularFileUpload',
  'toaster'
]).
  config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/application/:appId', {templateUrl: 'partials/application.html', controller: 'WizardCtrl'});
  $routeProvider.when('/authorizations', {templateUrl: 'partials/authorizations.html'});
  $routeProvider.when('/feeds', {templateUrl: 'partials/feeds.html', controller: 'FeedsCtrl'});
  $routeProvider.when('/myapps', {templateUrl: 'partials/myapps.html', controller: 'AppsCtrl'});
  $routeProvider.when('/home',{templateUrl: 'partials/myapps.html', controller: 'AppsCtrl', action: '1'});
  $routeProvider.otherwise({redirectTo: '/myapps'});
}]);