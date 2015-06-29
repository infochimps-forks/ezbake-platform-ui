quarantineAppControllers
  .controller('PipelinesCtrl', ['$scope', 'Quarantine', '$q',
    function($scope, Quarantine, $q) {
      // Used to send data to the Pipes page
      var selectedPipeline = {};

      $scope.refresh = function(){
        $scope.loading = true;
        $scope.pipelines = [];
        Quarantine.Pipelines.query({},
         function(data) {
              var promises = [];
              for (var i = 0; i < data.length; i++) {
                promises.push(
                  Quarantine.PipelineData.query({
                    pipelineId : data[i].pipelineId
                  }).$promise);
              }
              $q.all(promises).then(function(result) {
                var pipelineResults = [];
                for (var i = 0; i < result.length; i++) {
                  if (result[i] && result[i].length > 0) {
                    pipelineResults.push(result[i][0]);
                  }
                }
                $scope.pipelines = pipelineResults;
                $scope.loading = false;
              }, function(reason) {
                window.alert("Could not retrieve pipelines: " + reason.statusText);
                $scope.loading = false;
              });
         });
      }
      // Set selected pipeline
      $scope.setSelectedPipeline = function(index){
        selectedPipeline["date"] = $scope.pipelines[index].object.timestamp;
        selectedPipeline["event_type"] = $scope.pipelines[index].event_type;
        Quarantine.setProperty(selectedPipeline);
      }
  }]);