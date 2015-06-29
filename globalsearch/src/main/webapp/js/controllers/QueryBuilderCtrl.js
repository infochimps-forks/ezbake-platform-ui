'use strict';

var controllerModule = angular.module('globalsearch.controllers');

controllerModule.controller('QueryBuilderCtrl', ['$scope', '$location', '$window', function ($scope, $location, $window) {
    var keyValuePairId = 1;

    $scope.query = {
        allWords: '',
        exactPhrase: '',
        anyWords: '',
        noneWords: '',
        keyValuePairs: [{id: keyValuePairId, key: '', value: ''}]
    };

    var buildQuery = function (query) {
        var queryString = '';
        if (query.allWords.length > 0) {
            var allWords = query.allWords.split(' ');
            for (var i = 0; i < allWords.length; i++) {
                queryString += '+' + allWords[i] + ' ';
            }
        }
        if (query.exactPhrase.length > 0) {
            queryString += '+("' + query.exactPhrase + '") ';
        }
        if (query.anyWords.length > 0) {
            queryString += query.anyWords + ' ';
        }
        if (query.noneWords.length > 0) {
            var noneWords = query.noneWords.split(' ');
            for (var j = 0; j < noneWords.length; j++) {
                queryString += '-' + noneWords[j] + ' ';
            }
        }
        for (var index = 0; index < query.keyValuePairs.length; index++) {
            if (query.keyValuePairs[index].key.length > 0 && query.keyValuePairs[index].value.length > 0) {
                queryString += '+' + query.keyValuePairs[index].key + ':(' + query.keyValuePairs[index].value + ') ';
            }
        }

        return queryString.trim();
    };

    $scope.removeKeyValuePair = function ($event, id) {
        for (var i = 0; i < $scope.query.keyValuePairs.length; i++) {
            if ($scope.query.keyValuePairs[i].id === id) {
                $scope.query.keyValuePairs.splice(i, 1);
                break;
            }
        }
        $event.preventDefault();
    };

    $scope.addKeyValuePair = function ($event) {
        keyValuePairId++;
        $scope.query.keyValuePairs.push({id: keyValuePairId, key: '', value: ''});
        $event.preventDefault();
    };

    $scope.searchRedirect = function () {
        $location.path("search/" + encodeURIComponent(buildQuery($scope.query)));
    };

    $scope.cancel = function () {
        $window.history.back();
    };
}]);
