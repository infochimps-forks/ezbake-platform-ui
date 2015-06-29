// Intercepting HTTP calls with AngularJS.
angular.module('quarantine.interceptor', [])
.config(function ($provide, $httpProvider) {

  // Intercept http calls.
  $provide.factory('interceptor', function ($q) {
    return {
      // On response failture
      responseError: function (rejection) {
        if (rejection.status == 403) {
          window.location = "./error.html";
          return;
        }
        return $q.reject(rejection);
      }
    };
  });

  // Add the interceptor to the $httpProvider.
  $httpProvider.interceptors.push('interceptor');
});