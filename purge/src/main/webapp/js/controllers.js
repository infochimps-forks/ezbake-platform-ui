wh.app.controller('GlobalController',
   [ '$scope', '$http', function($scope, $http) {
      
      $http
         .get('api/ping')
         .success(function(data, status){
         })
         .error(function(data, status){
         });
   }]
);

wh.app.controller('ErrorController',
   [ '$scope', 'ErrorService', function($scope, ErrorService) {
      
      $scope.title = ErrorService.getTitle();
      $scope.message = ErrorService.getMessage();
      ErrorService.reset();
      
   }]
);

wh.app.controller('EntrySearchController',
   [ '$scope', '$location', function($scope, $location) {
      
      $scope.uri = '';
      $scope.displayNotFound = false;
      
      $scope.searchByUri = function() {
         if (!wh.isEmpty($scope.uri)) {
            $location.path('/entries/' + encodeURIComponent($scope.uri));
         }
      };
      
   }]
);

wh.app.controller('EntryController',
   [ '$scope', '$stateParams', '$location', 'EntryService', 'PurgeService', 'toaster', '$modal', 'SpinnerService',
     function($scope, $stateParams, $location, EntryService, PurgeService, toaster, $modal, SpinnerService) {
      
      $scope.spinner = SpinnerService;
      $scope.spinner.on("Searching ...", "Processing Warehouse Document Search");
      
      $scope.entry = {};
      $scope.displayNotFound = false;
      $scope.displayEntry = false;
      $scope.uri = decodeURIComponent($stateParams.uri);
      
      EntryService.get($scope.uri)
      .success(function(data, status) {
         $scope.entry = wh.model.entry(data);
         $scope.displayNotFound = false;
         $scope.displayEntry = true;
         $scope.spinner.off();
      })
      .error(function(data, status, headers, config) {
         $scope.displayEntry = false;
         $scope.displayNotFound = true;
         $scope.spinner.off();
     });
      
      $scope.purge = function() {
         var modal = $modal.open({
            templateUrl : 'partials/confirm.html',
            controller : 'ConfirmModalController',
            size : 'sm',
            resolve : {
               title : function() { return 'Purge'; },
               content : function() { return 'Purging this record will delete it permanently from all data repositories. Are you sure you want to proceed with the purge?'; }
            }
         });
         modal.result.then(function() {
            // TODO: Get real input for name & description
            $scope.spinner.on("Submitting the purge request ...", "Processing Document Purge Request");
            var name = PurgeService.generateGuid();
            PurgeService.purge({
               name: name,
               description: name,
               uris: [$scope.uri]
            })
            .success(function(data) {
               var purgeInitiationResult = wh.model.purgeResult.create(data);
               PurgeService.setPurgeInitiationResult(purgeInitiationResult);
               $scope.spinner.off();
               $location.path('/purge-initiated');
            })
            .error(function() {
               $scope.spinner.off();
               toaster.pop('error', 'Error', 'The purge of ' + $scope.uri + ' failed.');
            });
         });
      };
   }]
);

wh.app.controller('PurgeInitiatedController',
   [ '$scope', 'PurgeService', function($scope, PurgeService) {
      
      $scope.purgeResult = PurgeService.getPurgeInitiationResult();
      
   }]
);

wh.app.controller('PurgeStatusSearchController',
   [ '$scope', 'PurgeService','$location',
     function($scope, PurgeService, $location) {
      
      $scope.purgeId = "";
      
      /**
       * @description
       * Routes to the purge status page to perform the search for the purge
       * associated with the scope's purgeId. If no purgeId is available on
       * the page then nothing happens.
       */
      $scope.searchForPurgeStatus = function() {
         if (!wh.isEmpty($scope.purgeId)) {
            $location.path('/purge/status/' + $scope.purgeId);
         }
      };
   }]
);

/**
 * @description
 * Routes to the view purges/ageOffs page to see a paged,
 * filtered and sorted list of either purges or ageOffs
 */
wh.app.controller('GetPurgesController',
    [ '$scope', 'PurgeService','$location','toaster',
    function($scope, PurgeService, $location,toaster) {
        if (typeof $scope.pageNumber === 'undefined') {
            $scope.pageNumber=1;
        }
        if (typeof $scope.length === 'undefined') {
            $scope.length=0;
        }
        $scope.statuses = {"ACTIVE" : true, "ACTIVE_MANUAL_INTERVENTION_WILL_BE_NEEDED" : true,
            "STOPPED_MANUAL_INTERVENTION_NEEDED" : true, "RESOLVED_AUTOMATICALLY" : true, "RESOLVED_MANUALLY" : true};
        PurgeService.getPurgesListing($scope.statuses,$scope.pageNumber)
            .success(function(data, status, headers, config) {
                $scope.purgeMap = data.purgeStates;
                $scope.length = data.count;
            })
            .error(function(data, status, headers, config) {
                $scope.displayEntry = false;
                $scope.displayNotFound = true;
                toaster.pop('error', 'Error', 'Failed to get a list of purges');
            });
        $scope.refresh = function (){
            var myonoffswitch = $scope.onoffswitchValue;
            if(myonoffswitch==false) {
                PurgeService.getPurgesListing($scope.statuses,$scope.pageNumber)
                    .success(function (data, status, headers, config) {
                        $scope.purgeMap = data.purgeStates;
                        $scope.length = data.count;
                    })
                    .error(function (data, status, headers, config) {
                        $scope.displayEntry = false;
                        $scope.displayNotFound = true;
                        toaster.pop('error', 'Error', 'Failed to get a list of purges');
                    });
            } else{
                PurgeService.getAgeOffsListing($scope.statuses,$scope.pageNumber)
                    .success(function (data, status, headers, config) {
                        $scope.purgeMap = data.purgeStates;
                        $scope.length = data.count;
                    })
                    .error(function (data, status, headers, config) {
                        $scope.displayEntry = false;
                        $scope.displayNotFound = true;
                        toaster.pop('error', 'Error', 'Failed to get a list of ageOffs');
                    })

            }

        }
        $scope.incrementPage = function (){
            $scope.pageNumber++;
            $scope.refresh();
        }
        $scope.decrementPage = function (){
            $scope.pageNumber--;
            $scope.refresh();
        }
        $scope.changeTypes = function(){
            $scope.pageNumber=1;
            $scope.refresh();
        }
    }]
);

wh.app.controller('PurgeStatusController',
   [ '$scope', 'PurgeService', '$stateParams', '$location', 'SpinnerService', '$modal', 'toaster',
     function($scope, PurgeService, $stateParams, $location, SpinnerService, $modal, toaster) {
      
      $scope.displayNotFound = false;
      $scope.displayEntry = false;
      $scope.spinner = SpinnerService;
      $scope.spinner.on("Searching ...", "Processing Purge Status Search");
      $scope.purgeId = $stateParams.purgeId;
      $scope.purge = {};

      PurgeService.getStatus($scope.purgeId)
         .success(function(data, status, headers, config) {
            $scope.displayNotFound = false;
            $scope.displayEntry = true;
            $scope.purge = data;
            $scope.spinner.off();
         })
         .error(function(data, status, headers, config) {
            $scope.displayEntry = false;
            $scope.displayNotFound = true;
            $scope.spinner.off();
         });

     $scope.resolvePurge = function() {
         //$scope.resolveNote="test resolve";
         var modal = $modal.open({
             templateUrl : 'partials/textModal.html',
             controller : 'ResolvePurgeModalController',
             size : 'sm',
             resolve : {
                 title : function() { return 'Resolve Purge Manually'; },
                 content : function() { return 'Enter a note regarding why this purge is being manually resolved'; }
             }
         });
         modal.result.then(function(resolveNote) {
             $scope.resolveNote = resolveNote;
             $scope.spinner.on("Submitting the manual resolution request ...", "Processing Manual Purge Resolution Request");
             PurgeService.resolvePurge({
                 purgeId:$scope.purgeId,
                 resolveNote:$scope.resolveNote})
                 .success(function() {
                     $scope.spinner.off();
                     location.reload(true);
                 })
                 .error(function() {
                     $scope.displayEntry = false;
                     $scope.displayNotFound = true;
                     $scope.spinner.off();
                     toaster.pop('error', 'Error', 'The manual resolution of purge ' + $scope.purgeId + ' failed.');
                 });
         });
     };

     $scope.manualInterventionNeeded = function (purgeStatus){
             if(purgeStatus=="ACTIVE_MANUAL_INTERVENTION_WILL_BE_NEEDED" || purgeStatus == "STOPPED_MANUAL_INTERVENTION_NEEDED"){
                 return true;
             } else{
                 return false;
             }
         }
   }]
);

wh.app.controller('PurgeController',
   [ '$scope','$stateParams', '$location', 'PurgeService', 'toaster', '$modal', 'SpinnerService',
     function($scope, $stateParams, $location, PurgeService, toaster, $modal, SpinnerService) {
      
      $scope.spinner = SpinnerService;
      $scope.step = 1;
      $scope.ssrs = [];
      $scope.purge = wh.model.purge.create();
      $scope.purgeResult = wh.model.purgeResult.create();
      
      /**
       * @description
       * Adds the list of SSR objects to the scope.
       * 
       * @param   ssrList {Array} An array of SSR objects from Global Search.
       */
      var addSsrs = function(ssrList) {
         function isInItemList(ssr) {
            for (var i = 0; i < $scope.ssrs.length; i++) {
               if (ssr.uri == $scope.ssrs[i].uri) return true;
            }
            return false;
         }
         
         if (ssrList && ssrList instanceof Array) {
            for (var i = 0; i < ssrList.length; i++) {
               var ssr = wh.model.ssr.create(ssrList[i]); 
               if (!isInItemList(ssr)) {
                  $scope.ssrs.push(ssr);
               }
            }
         }
      };
      
      if (wh.isInTestMode) {
         var mockSsrList = wh.model.ssr.getMockData();
         for (var i = 0; i < mockSsrList.length; i++) {
            $scope.ssrs.push(wh.model.ssr.create(mockSsrList[i]));
         }
      } else {
         if (wh.isEmpty($stateParams.app) || wh.isEmpty($stateParams.channel) ||
               wh.isEmpty($stateParams.chloeUri)) {
            console.error("A connection to Chloe requires values for app, channel and chloeUri. " +
                  "One or more of the aforementioned values was missing when trying to make the connection." +
                  "\nThe following values were used to make the Chloe connection:\n   app = " + $stateParams.app + "\n   channel = " +
                  $stateParams.channel + "\n   chloeUri = " + $stateParams.chloeUri);
         } else {
            try {
               chloe.init($stateParams.app, $stateParams.channel, $stateParams.chloeUri, function(gsObj) {
                  $scope.$apply(function() {
                     if (gsObj && gsObj.SSRs) {
                        addSsrs(gsObj.SSRs);
                     }
                  });
               });
            } catch (e) {
               console.error("An error occurred when trying to connect to Chloe using the following values:\n   app = " +
                     $stateParams.app + "\n   channel = " + $stateParams.channel + "\n   chloeUri = " + 
                     $stateParams.chloeUri + "\nThe error message is as follows: " + e.message);
            }
         }
      }
               
      /**
       * @description
       * Selects all ssrs in the table.
       */
      $scope.selectAll = function() {
         for (var i = 0; i < $scope.ssrs.length; i++) {
            $scope.ssrs[i].select();
         }
      };
      /**
       * @description
       * Deselects all ssrs from the table.
       */
      $scope.deselectAll = function() {
         for (var i = 0; i < $scope.ssrs.length; i++) {
            $scope.ssrs[i].deselect();
         }
      };
      /**
       * @description
       * Answers whether or not at least one item in $scope.ssrs is selected.
       * 
       * @return  true if at least one item is selected and false if not.
       */
      $scope.anySelected = function() {
         for (var i = 0; i < $scope.ssrs.length; i++) {
            if ($scope.ssrs[i].isSelected) return true;
         }
         return false;
      };
      /**
       * @description
       * Returns an array of the ssrs that are currently selected.
       * 
       * @return  {Array<Object>} The $scope.ssrs entries that are currently
       *          selected.
       */
      $scope.getSelected = function() {
         var selected = [];
         for (var i = 0; i < $scope.ssrs.length; i++) {
            if ($scope.ssrs[i].isSelected) {
               selected.push($scope.ssrs[i]);
            }
         }
         return selected;
      };
      /**
       * @description
       * Removes the selected ssrs from the table in the UI.
       */
      $scope.clear = function() {
         if ($scope.anySelected()) {
            var newItems = [];
            for (var i = 0; i < $scope.ssrs.length; i++) {
               if (!$scope.ssrs[i].isSelected) newItems.push($scope.ssrs[i]);
            }
            $scope.ssrs = newItems;
         }
      };
      /**
       * @description
       * Answers whether or not there are any ssrs in the purge table.
       * 
       * @return  true if there are ssrs in the purge table and false if not.
       */
      $scope.hasItems = function() {
         return $scope.ssrs.length > 0;
      };
      /**
       * @description
       * Generates a GUID value and sets the purge name to that value.
       */
      $scope.generateGuidForName = function() {
         $scope.purge.name = PurgeService.generateGuid();
      };
      /**
       * @description
       * Displays the confirmation page of the selected ssrs for purge. A
       * message is displayed if no ssrs are selected; in addition, no
       * action is taken.
       */
      $scope.confirmPurge = function() {
         if (!$scope.anySelected()) {
            toaster.pop('info', '', 'You must select at least one item to purge.');
            return;
         }
         $scope.purge.setSsrs($scope.getSelected());
         $scope.step = 2;
      };
      /**
       * @description
       * Cancels the purge request and returns to the list of entries.
       */
      $scope.cancelRemove = function() {
         $scope.step = 1;
         $scope.purge.reset();
         $scope.purgeResult.reset();
      };
      /**
       * @description
       * Sends a request to purge the selected ssrs from the repositories
       * where the data exists.
       */
      $scope.remove = function() {
         $scope.spinner.on("Submitting the purge request ...", "Processing Document Purge Request");
         PurgeService.purge($scope.purge.asPurgeObject())
         .success(function(data, status, headers, config) {
            $scope.purgeResult = wh.model.purgeResult.create(data);
            $scope.clear();
            $scope.spinner.off();
            $scope.step = 3;
            $scope.purge.reset();
         })
         .error(function(data, status, headers, config) {
            $scope.spinner.off();
            $location.path('/error');
         });
      };
   }]
);

wh.app.controller('ConfirmModalController',
   [ '$scope', '$modalInstance', function($scope, $modalInstance, title, content) {
      
      $scope.title = title || 'Confirm';
      $scope.content = content || 'Are you sure you want to continue?'; 
      
      $scope.ok = function() {
         $modalInstance.close();
      };
      $scope.cancel = function() {
         $modalInstance.dismiss();
      };
   }]
);

wh.app.controller('ResolvePurgeModalController',
    [ '$scope', '$modalInstance', function($scope, $modalInstance, title, content){
        $scope.title = title || 'Resolve Purge Manually';
        $scope.content = content || 'Enter a note regarding why this purge is being manually resolved.';

        $scope.cancel = function(){
            $modalInstance.dismiss('canceled');
        }; // end cancel

        $scope.save = function(){
            $scope.resolveNote = document.getElementById("resolveNotes").value;
            $modalInstance.close($scope.resolveNote);
        }; // end save

        $scope.hitEnter = function(evt){
            if(angular.equals(evt.keyCode,13) && !(angular.equals($scope.resolveNote,null) || angular.equals(resolveNote,'')))
                $scope.save();
        }; // end hitEnter
    }]
);