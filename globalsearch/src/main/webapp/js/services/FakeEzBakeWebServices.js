angular.module('globalsearch.webservices')
    .factory("EzBakeWebServices", ['$q', '$http', 'ErrorService', function ($q, $http, ErrorService) {
        return {
            getConfiguration: function () {
                var deferred = $q.defer();

                var ezConfiguration;

                $http.get("/ezbake-webservice/ezconfiguration", {cache: true})
                    .success(function (data) {
                        ezConfiguration = data;

                        // NB: Chloe WebSocket clients shouldn't use the "web.application.chloe.endpoint" property directly.
                        // Instead, use the "web.application.chloe.wss.url" (created below) which accounts
                        // for the appropriate port being used in development and test environments.

                        if (typeof ezConfiguration["web.application.chloe.endpoint"] !== "string") {
                            var chloeEndpointError = "An error occurred communicating with the GlobalSearch web service.  " +
                                'Chloe integration will not be available.';
                            ErrorService.showError(chloeEndpointError, new Error(chloeEndpointError));
                            deferred.reject(chloeEndpointError);
                        }
                        else {
                            ezConfiguration["web.application.chloe.wss.url"] = 'ws://' + location.hostname +
                                // Add the appropriate port number for development environments
                            ':' + 8001 +
                            ezConfiguration["web.application.chloe.endpoint"];

                            $http.get("/ezbake-webservice/user", {cache: true})
                                .success(function (userFromServer) {
                                    var swivlEndpoint = ezConfiguration["web.application.metrics.endpoint"];
                                    var siteId = ezConfiguration["web.application.metrics.siteid"];
                                    ezConfiguration.userDN = userFromServer.userDn;

                                    Stats.setEndPoint(swivlEndpoint);
                                    var stat = Stats.getTemplate();
                                    stat.name = "GlobalSearch";
                                    stat.user = userFromServer.userDn;
                                    stat.version = "2.0";
                                    stat.siteId = siteId;

                                    deferred.resolve(ezConfiguration);
                                })
                                .error(function (error) {
                                    var userDnError = "An error occurred communicating with the GlobalSearch web service.  " +
                                        'Swivl (metrics) integration will not be available.';
                                    ErrorService.showError(userDnError, error);
                                    deferred.reject(userDnError);
                                });
                        }
                    })
                    .error(function (error) {
                        var errorMsg = "An error occurred communicating with the EzBakeWebServices web service.  The map will not be available.";
                        ErrorService.showError(errorMsg, error);

                        var defaults = {};
                        defaults["web.application.chloe.endpoint"] = '';
                        deferred.resolve(defaults);
                    });
                return deferred.promise;

            }
        };
    }]);