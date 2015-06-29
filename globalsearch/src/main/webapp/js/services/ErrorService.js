angular.module('globalsearch.errorservices', ['toaster']).factory("ErrorService", ['$log', 'toaster', function ($log, toaster) {
    return {
        showError: function (displayMessage, error) {
            $log.error(displayMessage, error);
            toaster.pop('error', "An error occurred", displayMessage);
        }
    };
}]);
