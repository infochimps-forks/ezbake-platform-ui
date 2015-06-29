quarantineAppControllers
  .controller('PipesCtrl', ['$scope', 'Quarantine', '$routeParams',
    function($scope, Quarantine, $routeParams) {
      //Set the pipeline id
      $scope.pipelineId = $routeParams.pipelineId;
      // Retrieve the meta data for selected pipeline
      $scope.pipelineMeta = Quarantine.getProperty();
      // Retrieve list of pipes for the given pipeline
      $scope.refresh = function (force) {
        $scope.loading = true;
        $scope.pipedata = Quarantine.Pipeline.query(
        {
          pipeMetaId: $routeParams.pipelineId,
          methodId: 'pipeDataForPipeline'
        }, function(data) {
          $scope.loading = false;
          retrievePipelineMeta(force);
        });
      }

      var retrievePipelineMeta = function(force){
        //If no meta data is found, then retrieve it from
        //the server
        if(force || ($scope.pipelineMeta == null && $scope.pipelineId != null)){
          Quarantine.Pipeline.get(
              {
                pipeMetaId : $scope.pipelineId,
                methodId : 'lastEventHeaderForPipeline'
              },
              //Call back function
              function(data){
                $scope.pipelineMeta = data;
            }
          )
        }
      }
  }]);