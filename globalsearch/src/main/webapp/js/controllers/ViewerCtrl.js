'use strict';

var controllerModule = angular.module('viewer.controllers', []);

controllerModule.controller('ViewerCtrl', ['$scope', '$window', function ($scope, $window) {
    $scope.export = function (uri) {
        $window.open('api/viewer/export?uri=' + uri);
    };
}]);
