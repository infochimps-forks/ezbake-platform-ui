quarantineAppControllers
  .controller('DetailModalCtrl', ['$scope', '$modalInstance', 'data',
    function($scope, $modalInstance, data){
      $scope.data = data;
      $scope.done = function () {
        $modalInstance.dismiss('cancel');
      }
  }]);