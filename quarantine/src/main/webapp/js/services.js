'use strict';

/* Services */

var quarantineServices = angular.module('quarantineServices', ['ngResource']);

var baseUrl = 'rest/quarantine';

quarantineServices.factory('Quarantine', ['$resource',  
	function($resource){
		var property;
		var selectedEvent;
		return {
			Pipelines : 
				$resource(
					baseUrl + '/pipelines',
					{}
				),
			PipelineData :
			    $resource(
			        baseUrl + '/pipeline/:pipelineId',
			        {}
			    ),
			Pipeline : 
				$resource(
					baseUrl + '/:methodId/:pipeMetaId', 
					{
						pipeMetaId: '@pipeMetaId', 
						methodId: '@methodId'
					}
				),
			Pipe : 
				$resource(
					baseUrl + '/:methodId/:pipelineId/:pipeId', 
					{
						pipelineId: '@pipelineId',
						pipeId: '@pipeId',
						methodId: '@methodId',
						status : '@selectedStatus',
						pageNumber : '@pageNumber',
						pageSize : '@pageSize'
					}
				),
			StatusModifier :
				$resource(
					baseUrl + '/updateStatus'
				),
	        EventStatusModifier :
	            $resource(
	                baseUrl + '/updateStatus/:pipelineId/:pipeId/:event',
	                {
	                    pipelineId: '@pipelineId',
	                    pipeId: '@pipeId',
	                    oldStatus: '@selectedStatus',
	                    event: '@event',
                        status: '@newStatus',
                        comment: '@comment'
	                }
	            ),
			EventDetail :
				$resource(
					baseUrl + '/:methodId/:pipelineId/:pipeId',
					{
						methodId: '@methodId',
						pipelineId: '@pipelineId',
						pipeId: '@pipeId',
						status: '@selectedStatus',
						eventText: '@eventText'
					}
				),
			ExportData : 
				$resource(
					baseUrl + '/:methodId/:pipelineId',
					{
						methodId: '@methodId',
						pipelineId : '@pipelineId',
						ids : '@ids'
					}
				),
			QuarantinedObject :
			    $resource(
			        baseUrl + '/quarantinedObject',
			        {
			            ids : '@ids'
			        }
			    ),
			getProperty : 
				function(){
					return property;
				},
			setProperty : 
				function(value){
					property = value;
				},
			setSelectedEvent :
				function(value) {
					selectedEvent = value;
				},
			getSelectedEvent :
				function () {
					return selectedEvent;
				},
			openObjectDetailModal :
			    function (objectId, modal) {
                    var modalInstance = modal.open({
                        templateUrl: 'partials/object-detail-modal.html',
                        controller: 'ObjectDetailModalCtrl',
                        resolve:{
                          data : function () {
                            return objectId;
                          }
                        }
                      });
                      return modalInstance;
			    },
			parseTimeStamp : 
				function(timestamp){
					var result = timestamp.date.month + '/'
						+ timestamp.date.day + '/'
						+ timestamp.date.year + ' '
						+ timestamp.time.hour + ':'
						+ timestamp.time.minute + ':'
						+ timestamp.time.second;
					return result;
				}
		};
	}]);
