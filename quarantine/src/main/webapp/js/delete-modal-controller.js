quarantineAppControllers
  .controller('DeleteModalCtrl', ['$scope', '$modalInstance', 'data', 'Quarantine', '$q',
      function($scope, $modalInstance, data, Quarantine, $q){
        $scope.data = data;

        $scope.triggerDelete = function() {
          $scope.inProgress = true;
          if ($scope.data.isEventDetail) {
              Quarantine.QuarantinedObject.delete({
                ids : $scope.data.ids
              },
              function() {
                $modalInstance.close('success');
              },
              function(reason) {
                window.alert("Could not delete: " + reason.statusText);
                $modalInstance.dismiss('failed');
              });
            } else {
              var promises = [];
              for (var i = 0; i < $scope.data.selectedEvents.length; i++) {
                var event = $scope.data.selectedEvents[i];
                promises.push(
                  Quarantine.EventDetail.delete({
                    methodId : 'quarantinedObjects',
                    pipelineId : $scope.data.pipelineName,
                    pipeId : $scope.data.pipeName,
                    status : event.status,
                    eventText : event.event.event
                  }).$promise);
              }
              $q.all(promises).then(function(result) {
                $modalInstance.close('success');
              }, function(reason) {
                window.alert("Could not delete: " + reason.statusText);
                $modalInstance.dismiss('failed');
              });
            }
        }

        $scope.cancel = function() {
          $modalInstance.dismiss('cancel');
        }
      }
    ]);