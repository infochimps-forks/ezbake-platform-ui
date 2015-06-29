'use strict';

/* Filters */

angular.module('registration.filters', []).
  filter('uriExample', function() {
    return function(webApplication, urnKey) {
      var id = "12345";
      if (webApplication.includePrefix) {
        id = encodeURIComponent(urnKey + "/") + id;
      }
      return webApplication.webUrl.replace("{uri}", id);
    }
  });
