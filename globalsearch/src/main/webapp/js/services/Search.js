angular.module('globalsearch.webservices', []);

angular.module('globalsearch.webservices').factory('Search', ['$http', '$q', function ($http, $q) {

    var open = function (uri, scope) {
        var deferred = $q.defer();

        $http.post("api/download", decodeURIComponent(uri)).success(function (data) {
            deferred.resolve(data);
        }).error(function (data) {
            deferred.reject({'Error Message': 'Unable to open the selected document'});
        });

        return deferred.promise;
    };

    var search = function (query, pageIndex) {
        // Send stats to Swivl to track the # of searches
        var promise = $http.post("api/ssr/", {query: query, pageSize: 20, pageOffset: pageIndex * 20});
        // Per Redmine # 5220
        var stat = Stats.createStatFromTemplate();
        stat.action = "SSR Search";
        stat.actionParams = JSON.stringify({query: query});
        Stats.pushStat(stat);
        return promise;
    };

    return {
        performOpen: function (uri, scope) {
            return open(uri, scope);
        },
        performSearch: function (query, page) {
            return search(query, page - 1);
        }
    };
}]);
