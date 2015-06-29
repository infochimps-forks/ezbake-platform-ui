quarantineAppControllers
.controller('PipeModalCtrl', ['$scope', '$modalInstance', 'data', 'Quarantine', '$q',
    function($scope, $modalInstance, data, Quarantine, $q){
      $scope.data = data;
      $scope.comment = {};
      $scope.comment.text = "";

      var update = function (comment) {
          if ($scope.data.isEventDetail) {
            var idsWithStatus = {comment: comment,
                                 status: $scope.data.status,
                                 ids: $scope.data.ids};
            Quarantine.StatusModifier.save (
              {},
              idsWithStatus,
              function() {
                $modalInstance.close('success');
              }
            );
          } else {
            var commentAndStatus = {comment: comment, status: $scope.data.status};
            var promises = [];
            for (var i = 0; i < $scope.data.selectedEvents.length; i++) {
              var event = $scope.data.selectedEvents[i];
              promises.push(
                Quarantine.EventStatusModifier.save({
                  pipelineId : $scope.data.pipelineName,
                  pipeId : $scope.data.pipeName,
                  oldStatus : event.status,
                  event : event.event.event
                },
                commentAndStatus).$promise);
            }
            $q.all(promises).then(function(result) {
              $modalInstance.close('success');
            }, function(reason) {
              window.alert("Could not update: " + reason.statusText);
              $modalInstance.dismiss('failed');
            });
          }
        }

      $scope.ok = function() {
        $scope.inProgress = true;
        if ($scope.comment.text.length == 0) {
          alert($scope.data.labelTwo + " is required");
          //Special case for export dialog
        } else if(data.labelTwo === 'Pass phrase') {
          if(isValid($scope.comment.text)){
            $modalInstance.close($scope.comment.text);
          }else{
            alert('Pass phrase does not meet the complexity requirements');
            $scope.inProgress = false;
          }
        } else {
          update($scope.comment.text);
        }
      }

      var isValid = function(key){
        var validLength = key.length >= 14;
        var hasUpperCase = key.match('[A-Z]');
        var hasLowerCase = key.match('[a-z]');
        var hasNumber = key.match('\\d');
        var hasSpecial = key.match('\\W');
        return validLength && hasUpperCase && hasLowerCase && hasNumber && hasSpecial;
      }

      $scope.cancel = function() {
        $modalInstance.dismiss('cancel');
      }
    }
  ])