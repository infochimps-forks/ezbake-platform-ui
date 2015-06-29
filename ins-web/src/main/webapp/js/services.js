'use strict';

/* Services */


// Demonstrate how to register services
// In this case it is a simple value service.
var services = angular.module('registration.services', ['ngResource']);

services.factory('Application', ['$resource',
  function($resource) {
    return $resource('rest/application/:id');
  }]);

services.factory('Feed', ['$resource',
  function($resource) {
    return $resource('rest/feed');
  }]);

services.factory('Profile', ['$resource',
  function($resource) {
    return $resource('rest/authenticate/profile');
  }]);

services.factory('AppImport', function () {
    var importedData = {};
    function set(data) {
        importedData = data;
        importedData.id = null;
    }

    function get() {
        return importedData;
    }

    return {
        get : get,
        set : set
    }
});