quarantineAppControllers
  .controller('UploadModalCtrl', ['$scope', '$modalInstance', '$http', '$upload', '$location',
      function($scope, $modalInstance, $http, $upload, $location) {

        $scope.cancel = function() {
          $modalInstance.dismiss('cancel');
        }

        //Uploader
        $scope.filesChanged = function(elm) {
          $scope.files = elm.files;
          $scope.apply();
        }

        $scope.passphrase = {};
        $scope.passphrase.text = '';
        var selectedFiles;

        $scope.onFileSelect = function ($files) {
          selectedFiles = $files;
        }

        $scope.triggerUpload = function() {
          if (selectedFiles == null) {
            alert('No file was selected');
          } else if ($scope.passphrase.text.length == 0) {
            alert('Pass phrase cannot be blank');
          } else {
            startUpload();
          }
        }

        //Triggers the upload process.  It is the callers
        //responsibility to make sure selected files is not null
        var startUpload = function(){
          for (var i=0; i < selectedFiles.length; i++) {
            var file = selectedFiles[i];
            $scope.upload = $upload.upload({
              url: '/quarantine/rest/quarantine/importData',
              method : 'POST',
              headers: {'my-header' : 'my-header-value'},
              data : {
                key : $scope.passphrase.text
              },
              file: file,
              fileFormDataName: 'file'
            }).progress(function(evt) {
              //This can be used for a progress bar
              //console.log(evt.loaded / evt.total);
            }).success(function(data, status, headers, config) {
              var totalRecords = "\nTotal Records: " + data.totalRecords;
              var duplicates = "\nDuplicates: " + data.duplicateRecords;
              alert('Data was successfully imported,' + totalRecords + duplicates);
            }).error(function(){
              alert('An error occurred while importing data. Please verify that the provided pass phrase is correct. If the problem persists please contact a systems administrator.');
            });
          }
        }
      }
    ]);