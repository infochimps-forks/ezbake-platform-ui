'use strict';
// Declare app level module which depends on filters, and services
var quarantineAppControllers = angular.module('quarantineApp.controllers', []);

var quarantineApp = angular.module('quarantineApp', [
		'ngRoute',
		'quarantineApp.controllers',
		'quarantineServices',
		'ui.bootstrap',
		'angularFileUpload',
		'quarantine.interceptor'
	]);

quarantineApp.config(['$routeProvider',
	function($routeProvider){
		$routeProvider.when('/pipelines', 
			{
				templateUrl: 'partials/pipelines.html', 
				controller: 'PipelinesCtrl'
			});
		$routeProvider.when('/pipelines/:pipelineId', 
			{
				templateUrl: 'partials/pipes.html', 
				controller: 'PipesCtrl'
			});
		$routeProvider.when('/pipelines/:pipelineId/:pipeId', 
			{
				templateUrl: 'partials/pipe-detail.html',
				controller: 'PipeDetailCtrl'
			});
		$routeProvider.when('/pipelines/:pipelineId/:pipeId/event-detail', 
			{
				templateUrl: 'partials/error-detail.html',
				controller: 'PipeDetailCtrl'
			});
        $routeProvider.when('/pipelines/:pipelineId/:pipeId/:id/object-detail',
            {
                templateUrl: 'partials/object-detail.html',
                controller: 'ObjectDetailCtrl'
            });
		$routeProvider.otherwise(
			{
				redirectTo: '/pipelines'
		});
}]);