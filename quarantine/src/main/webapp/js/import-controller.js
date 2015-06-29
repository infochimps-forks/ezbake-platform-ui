'use strict';

/* Controllers */
quarantineAppControllers
  .controller('ImportCtrl', ['$scope', '$modal',
    function($scope, $modal){
      $scope.triggerUpload = function () {
        var modal = openUploadModal();
      }

      //Upload functionality
      var openUploadModal = function() {
        var modalInstance = $modal.open({
          templateUrl: 'partials/upload-modal.html',
          controller: 'UploadModalCtrl',
          backdrop: 'static',
        });
        return modalInstance;
      }
    }
  ]);






