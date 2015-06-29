angular.module('globalsearch.webservices').factory('SavedSearch', ['$http', '$q', 'ErrorService', function ($http, $q, ErrorService) {
    var savedSearchUri = "api/savedSearch";

    var getSavedSearch = function (callback) {
        $http.get(savedSearchUri).success(function (data) {
            callback(data);
        }).error(function (err) {
            ErrorService.showError(err, "Error get saved searches");
        });
    };

    var addSavedSearch = function (record, callback) {
        $http.put(savedSearchUri, record).success(function (data) {
            callback(data);
        }).error(function (err) {
            ErrorService.showError(err, "Error save search");
        });
    };

    var updateSavedSearch = function (record, callback) {
        $http.post(savedSearchUri, record).success(function (data) {
            callback(data);
        }).error(function (err) {
            ErrorService.showError(err, "Error update saved search");
        });
    };

    var deleteSavedSearch = function (record, callback) {
        $http.delete(savedSearchUri + "/" + record.id).success(function (data) {
            callback(data);
        }).error(function (err) {
            ErrorService.showError(err, "Error delete saved search");
        });
    };

    var getSavedSearchUpdates = function (record, callback) {
        $http.get(savedSearchUri + "/" + record.id).success(function (data) {
            callback(data);
        }).error(function (err) {
            ErrorService.showError(err, "Error get saved search inbox");
        });
    };

    return {
        getSavedSearch: getSavedSearch,
        addSavedSearch: addSavedSearch,
        updateSavedSearch: updateSavedSearch,
        deleteSavedSearch: deleteSavedSearch,
        getSavedSearchUpdates: getSavedSearchUpdates
    };
}]);
