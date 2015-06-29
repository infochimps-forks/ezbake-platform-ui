quarantineAppControllers
  .controller('ObjectDetailCtrl', ['$scope', 'Quarantine', '$routeParams', '$modal',
    function($scope, Quarantine, $routeParams, $modal){
      $scope.pipelineName = $routeParams.pipelineId;
      $scope.pipeName = $routeParams.pipeId;
      $scope.objectId = $routeParams.id;

      //Check box filter functionality
      $scope.update = function () {
        $scope.loading = true;
        Quarantine.QuarantinedObject.get({
                ids: $routeParams.id
              },
              function (result) {
                $scope.objectDetails = result;
                $scope.loading = false;
              }
          );
      }

      //Trigger for opening error detail modal
      $scope.showErrorDetail = function(errorMsg) {
        openErrorDetailModal(errorMsg);
      }

      //Error message detail modal
      var openErrorDetailModal = function (modalData) {
        var modalInstance = $modal.open({
          templateUrl: 'partials/error-detail-modal.html',
          controller: 'DetailModalCtrl',
          resolve:{
            data : function () {
              return modalData;
            }
          }
        });
        return modalInstance;
      }

      //Trigger for opening error detail modal
      $scope.showAdditionalMetadata = function(additionalMetadata) {
        openAdditionalMetadataModal(additionalMetadata);
      }

      //Error message detail modal
      var openAdditionalMetadataModal = function (additionalMetadata) {
        var modalInstance = $modal.open({
          templateUrl: 'partials/additional-metadata-modal.html',
          controller: 'DetailModalCtrl',
          windowClass: 'wide-modal',
          resolve:{
            data : function () {
              return additionalMetadata;
            }
          }
        });
        return modalInstance;
      }
  }]);