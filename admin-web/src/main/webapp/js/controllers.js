/*   Copyright (C) 2013-2015 Computer Sciences Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License. */


/* Controllers */
angular.module('admin.controllers', [] )
	.controller('ModalWindowCtrl', [ '$scope', '$modal',  function ($scope, $modal ) {
  		$scope.open = function (params) {
  	    $scope.modalInstance = $modal.open({
  	      backdrop: 'static', // do not want it to be closed by clicking outside of modal window
  	      keyboard: false, // do not want it to be closed by esc key
  	      templateUrl: params.template,
  	      controller: params.controller || 'ModalInstanceCtrl',
  	      windowClass: 'modalDialog',
  	      resolve: {
  			params: function() {
			      return params;
  			},
  	    	application: function() { 
				  	  if(!angular.isUndefined($scope.app)) {
				  		  return $scope.app;
				      }
			      },
            securityId : function() {
              if(!angular.isUndefined($scope.appSecId)) {
                return $scope.appSecId;
              }
            }
  	      }
  	    });
  	  };
  	}]) 

  	.controller('ModalInstanceCtrl', [ '$scope', '$rootScope', '$modalInstance', '$timeout', '$http', 'RegisterApp', 'DeleteApp', 'DeployApp', 'UpdateManifest', 'application', 'params', 'securityId', 'toaster', function ($scope, $rootScope, $modalInstance, $timeout, $http, RegisterApp, DeleteApp, DeployApp, UpdateManifest, application, params, securityId, toaster) {
  		
		$scope.app = application;
		
		$scope.appSecId = securityId;
		$scope.subTemplate = params.subTemplate;
		$scope.altText = params.altText;
		$scope.isApprove = params.isApprove;
		$scope.isDelete = params.isDelete;
		$scope.isApplicationRegistrationDetails = params.isApplicationRegistrationDetails;
		$scope.isManifestDetails = params.isManifestDetails;
		$scope.servicePackage = params.servicePackage;
		$scope.isDeployed = (params.currentStatus == "Deployed") ? true : false;
		$scope.currentStatus = params.currentStatus;
		$scope.deployCloseButton = "Close Without Approval";
		
		$scope.close = function() {
			$modalInstance.close();
		};

		// registration
		$scope.viewApplicationRegistrationDetails = function(appSecId) {
			$http.get('rest/admin/applicationRegistrationDetails/' + appSecId)
                .success(function(data){
				    $scope.applicationRegistrationDetails = data;
			    })
                .error(function() {
                    toaster.pop('error', "INS Error", "Failed to get registration information from INS.  Please check the logs");
                });
		};
		
		$scope.registerApp = function(appSecId, isApproved) {
			RegisterApp.register({"appSecId" : appSecId, "isApproved" : isApproved},
                function() {
                    $rootScope.$emit('registeredApps', $scope.currentStatus);
                },
                function() {
                    toaster.pop('error', "INS Error", "Failed to register with INS.  Please check the logs");
                });
		};
  
		// deployment
		$scope.deployApp = function(appSecId, isApproved, status) {
			DeployApp.deploy({"appSecId" : appSecId, "isApproved" : isApproved, "status" : status},
                function() {
                    if (isApproved) {
                        $scope.pollDeploymentStatus(appSecId); // start poller
                    } else {
                    	$scope.close();
                        $rootScope.$emit('allDeploymentApps', status);
                    }
                },
                function() {
                    toaster.pop('error', "Deployer Error", "Failed communicating with ezDeployer.  Please check the logs");
                }
            );
		};
		
		$scope.deleteApp = function(appSecId) {
			DeleteApp.deleteApp({"appSecId" : appSecId},
                function() {
                    $rootScope.$emit('allDeploymentApps', $scope.currentStatus);
                },
                function() {
                    toaster.pop('error', "Deployer Error", "Failed to delete from ezDeployer.  Please check the logs");
                }
            );
		};
		
		// update number of instances
	  	$scope.updateManifest = function(appName, appServiceId, numOfInstances) {
		  if(!isNaN(numOfInstances) || numOfInstances === "0") {
			  UpdateManifest.update({"appName" : appName, "appServiceId" : appServiceId, "numOfInstances" : numOfInstances},
                  function() {
                      $rootScope.$emit('allDeploymentApps', $scope.currentStatus);
                  },
                  function() {
                      toaster.pop('error', "Deployer Error", "Failed to update manifest with ezDeployer.  Please check the logs");
                  }
              );
		  }
	  	};
		 
		$scope.deployAppButtonDisabled = false;
		$scope.showDeployLoader = false;

        var endPollCleanUp = function(appSecId, pollingData) {
            $scope.showDeployLoader = false;
            $scope.deployCloseButton = "Close";

            // remove task from the poller
            $http.post("rest/admin/removeFromDeploymentStatusMap/" + appSecId).success(function(data, status){
                if(status === 200) {
                    console.log("Removed " + appSecId + " from the poller.");
                }
            });

            if (pollingData) {
                // if there were errors get list of service ids that failed to deploy
                var someErrors = false; // for tasks that do not have service ids
                var erroredOutServiceIds = [];
                for (var i = 0; i < pollingData[appSecId].length; i++) {
                    if (pollingData[appSecId][i].error === true) {
                        if (angular.isDefined(pollingData[appSecId][i].serviceId)) {
                            erroredOutServiceIds.push(pollingData[appSecId][i].serviceId);
                        }
                        someErrors = true;
                    }
                }

                if (erroredOutServiceIds.length > 0) {
                    $scope.deployMessage = "Failed to Deploy Following Services For App Id:" + appSecId + ": " + erroredOutServiceIds.join(", ");
                } else if (someErrors === true) {
                    $scope.deployMessage = "Failed to deploy entire or part of the application.";
                } else {
                    //everything is good
                    $scope.close();
                }
            } else if (!$scope.deployMessage) {
                $scope.deployMessage = "Failed to get status from the deployer";
            }
            $rootScope.$emit('allDeploymentApps', $scope.currentStatus);	// refresh tab
        };

		$scope.pollDeploymentStatus = function(appSecId) {
			 $scope.showDeployLoader = true;
			 $scope.deployAppButtonDisabled = true;
			 var sleep = 10000;// sleep in  milliseconds
			 
			 (function tick() {
				 $http.get("rest/admin/pollDeploymentStatusMap/" + appSecId).success(function(data, status) {
					 var isDeployTaskDone = false;
                     if(status === 400 || jQuery.isEmptyObject(data)) { // bad request, stop polling for given appSecId
						 endPollCleanUp(appSecId, null);
					 } else {
						 var truths = 0;
						 var sz = data[appSecId].length;
						 for(var i = 0; i < sz; i++) {
							 if(data[appSecId][i].future.done === true) {
								 truths++;
							 }
						 }
						 isDeployTaskDone = truths === sz || false;
                         if(!isDeployTaskDone) {
                             $timeout(tick, sleep);
                         } else {
                             endPollCleanUp(appSecId, data);
                         }
					 }
				 }).error( function() {
					 $scope.deployMessage = "Failed to deploy entire or part of the application.";
					 endPollCleanUp(appSecId, null);
				 });
			 })();
		 };
		
		 // Artifact Manifest formatting related functions
		$scope.numberOfInstances = 0;
		$scope.isDisabled = false;
		
		$scope.artifactTypeDisabled = function(artType) {
			switch(artType.toUpperCase()) {
				case 'BATCH':
					$scope.isDisabled = true;
					break;
				case 'FRACK':
					$scope.isDisabled = true;
					break;
			};
		};
		
		$scope.type = function(val) {
			var type = typeof(val);
			if(type === "object") {
				if(val instanceof Array){
					return "array";
				}
			}
			
			return type;
		};
		
		$scope.setNumberOfInstances = function(n) {
			$scope.numberOfInstances = 0;
			if(!isNaN(n) && n >= 0){
				$scope.numberOfInstances = n;
			};
		};
		
		$scope.formatManifest = function() {
            if (!$scope.servicePackage) {
                return;
            }
			var rawManifest = $scope.servicePackage.stringManifest;
			var temp, format;
			while( /(\b\w+:\w+\()/.exec(rawManifest) != null ) {
				temp = /(\b\w+:\w+\()/.exec(rawManifest)[0]; // remember what you were looking for
				format = temp.split(":")[1]; // proper format
				rawManifest = rawManifest.replace(temp, format); // replace improper format with proper one
			}
			
			$scope.servicePackage.stringManifest = JSON.parse(rawManifest.replace(/^ArtifactManifest\(/, '')
                .replace(/\(/g, ': {').replace(/\)/g,' } ').replace(/^/, '{ ')
                .replace(/([\w0-9\-+\.]+)/g, '\"$1\"').replace(/:/, ' : ')
                .replace(/(\w+)\:/g, '"$1":').replace(/\:(\w+)/g, ':"$1"')
                .replace(/(, \"\w+\":\s*(,|}))/g, ' $2 '));
		};
		
		$scope.formatString = function(str) {
		    return str.replace(/([A-Z])/g, ' $1').replace(/^./, function(str){ return str.toUpperCase(); });
		};
		
		$scope.formatManifest();	// format raw manifest
  	}])
    .controller('UndeployPkgModalCtrl', ['$scope', '$rootScope', '$modalInstance', 'toaster', 'params', 'securityId', 'AppServiceDeployment', function ($scope, $rootScope, $modalInstance, toaster, params, securityId, AppServiceDeployment) {
        $scope.pkg = params.servicePackage;
        $scope.close = function () {
            $modalInstance.close();
        };

        $scope.undeploy = function () {
            AppServiceDeployment.save({appSecId: securityId, serviceId: $scope.pkg.appServiceId, isDeployed: false},
                              function (value, responseHeaders) {
                                  toaster.pop("success", "Package undeployed");
                                  $rootScope.$emit('allDeploymentApps', params.currentStatus);
                              },
                              function (httpResponse) {
                                  toaster.pop("error", "Undeploy failed", "Please check your permissions and application status");
                              });
            $scope.close();
        };
    }])
  	
	.controller('AdminCtrl', ['$scope', '$http', '$rootScope', function($scope, $http, $rootScope){
		   $scope.showSpinner = false;
		   $scope.spinnerDelayTimout = 500; // value in milliseconds (1000ms = 1sec)
		   $scope.isAdmin = false;
		   
		   $scope.isAdmin = function() {
			 $http.get("rest/admin/isAdmin/").success(function(data, status){
				 if(status === 200) {
					 $scope.isAdmin = true;
				 }
			 }).error(function(error, status) {
				 if(status === 403) {
					 console.log("Unauthorized user.");
					 $scope.isAdmin = false;	 
				 }
			 });};
			 
			
	       $scope.statuses = [
	         {name:"PENDING", deployerValue:"Staged", registrationValue: "PENDING"},
	         {name:"ACTIVE", deployerValue:"Deployed", registrationValue: "ACTIVE"},
	         {name:"DENIED", deployerValue:"Denied", registrationValue: "DENIED"}];
	       
	       $scope.deployerStatuses = jQuery.extend(true, {}, $scope.statuses);
	       $scope.deployerStatuses[$scope.statuses.length] = {name:"UNDEPLOYED", deployerValue:"Undeployed", registrationValue: "INACTIVE"};
	       
		   $scope.refreshTab = function(tabType) {
			   $scope.accordionGroups = {
				        PENDING : {open: true},
				        ACTIVE : {open: false},
				        DENIED : {open: false},
				        UNDEPLOYED : {open: false}
				    };
			   
			   // refresh tab data
			   switch(tabType) {
			   case "REGISTRATION":
				   $rootScope.$emit('registeredApps', $scope.statuses[0].registrationValue);
				   break;
			   case "DEPLOYMENT":
				   $rootScope.$emit('allDeploymentApps', $scope.statuses[0].deployerValue);
				   break;
			   }
			   
		   };
	   }])

  	.controller('AdminRegistrationCtrl', ['$q', '$scope', '$rootScope', '$http', '$location', '$timeout', 'toaster', function($q, $scope, $rootScope, $http, $location, $timeout, toaster){
  		// listeners
  		$rootScope.$on('registeredApps', function(event, status) {
			$scope.registeredApps(status);
		});
	   
  		$rootScope.$on('viewApplicationRegistrationDetails', function(event, appSecId) {
			$scope.viewApplicationRegistrationDetails(appSecId);
		});
  		
		$scope.refreshIfOpen = function(status) {
			if($scope.accordionGroups[status.name].open === false) {
				$scope.registeredApps(status.registrationValue);
			}
		}

		
  		// registration
		$scope.registeredApps = function(status) {
			$scope.registered = "";
            var timeout = $timeout(function(){$scope.showSpinner = true; }, $scope.spinnerDelayTimout);
			var httpCall = $http.get('rest/admin/registeredApps/' + status)
                .success(function(data) {
				    $scope.registered = data;
				})
                .error(function() {
                    toaster.pop('error', "INS Error", "Failed to get registered apps from INS.  Please check the logs");
                });
			
			$q.all([timeout, httpCall]).then(function(){$scope.showSpinner = false;});
		};
  	}])
  	
  	
  	.controller('AdminDeploymentCtrl', ['$q', '$scope', '$rootScope', '$http', '$location', '$timeout', 'toaster', function($q, $scope, $rootScope, $http, $location, $timeout, toaster ){
  		// listeners
  		$rootScope.$on('allDeploymentApps', function(event, status) {
  			$scope.allDeploymentApps(status);
		});
  		
		$rootScope.$on('updateManifest', function(event, appName, appServiceId, numOfInstances) {
  			$scope.updateManifest(appName, appServiceId, numOfInstances);
		});
		
		
		$scope.refreshIfOpen = function(status) {
			if($scope.accordionGroups[status.name].open === false) {
				$scope.allDeploymentApps(status.deployerValue);	
			}
		}
  		
		// deployment
		$scope.allDeploymentApps = function(status) {
			$scope.deploymentApps = "";
            var timeout = $timeout(function(){$scope.showSpinner = true; }, $scope.spinnerDelayTimout);
			var httpCall = $http.get('rest/admin/deploymentApps/' + status )
                .success(function(data){
				    $scope.deploymentApps = data;
			    })
                .error(function() {
                    toaster.pop('error', "Deployer Error", "Failed to get apps from ezDeployer.  Please check the logs");
                });
			
			$q.all([timeout, httpCall]).then(function(){$scope.showSpinner = false;});
		};
		
  	}])
  	
  	.controller('AdminSystemToolsCtrl', ['$q', '$scope', '$http', '$location', '$timeout', 'toaster', function($q, $scope, $http, $location, $timeout, toaster){
  		
  		$scope.categories = [];
  		$scope.systemTopics = []; 
  		
  		$scope.populateTab = function() {
  			var timeout = $timeout(function(){$scope.showSpinner = true; }, $scope.spinnerDelayTimout);
  			var getCategoriesHttpCall = $http.get('rest/admin/categories')
                .success(function(data) {
  				    $scope.categories = data;
  		        })
                .error(function() {
                    toaster.pop('error', "INS Error", "Failed to get categories apps from INS.  Please check the logs");
                });
  			
  			var getSystemTopicsHttpCall = $http.get('rest/admin/systemTopics')
                .success(function(data) {
  				    $scope.systemTopics = data;
  		        })
                .error(function() {
                    toaster.pop('error', "INS Error", "Failed to get system topics from INS.  Please check the logs");
                });
  			
  			$q.all([timeout, getCategoriesHttpCall, getSystemTopicsHttpCall]).then(function(){$scope.showSpinner = false;});
  		};
  		
  		/* Categories */
	  $scope.addCategory = function(category) {
	    $http.post('rest/admin/categories/' + category)
	        .success(function(data) {
	            $scope.categories = data;
	        })
            .error(function() {
                toaster.pop('error', "INS Error", "Failed to add category to INS.  Please check the logs");
            });
	  };
	  
	  $scope.removeCategory = function(category) {
	    $http.delete('rest/admin/categories/' + category)
	        .success(function(data) {
	            $scope.categories = data;
	        })
            .error(function() {
                toaster.pop('error', "INS Error", "Failed to delete category from INS.  Please check the logs");
            });
	  };
	  
	  /* System Topics */
	  $scope.addSystemTopic = function(systemTopic) {
		  $http.post('rest/admin/systemTopics/' + systemTopic)
            .success(function(data) {
		        $scope.systemTopics = data;
		    })
            .error(function() {
                toaster.pop('error', "INS Error", "Failed to add system topics to INS.  Please check the logs");
            });
	  };
	  
	  $scope.removeSystemTopic = function(systemTopic) {
         $http.delete('rest/admin/systemTopics/' + systemTopic)
            .success(function(data) {
		    	$scope.systemTopics = data;
		    })
            .error(function() {
                toaster.pop('error', "INS Error", "Failed to delete system topic from INS.  Please check the logs");
            });
	  };
	  
	  $scope.clearSystemCache = function() {
		$http.post('rest/admin/clearSystemCache')
           .success(function() {
		        toaster.pop('success', "Cache Cleared", "EzSecurity Cache has been cleared");
		   })
           .error(function() {
               toaster.pop('error', "EzSecurity Error", "Failed to clear cache.  Please check the logs");
           });
	  };
  		
  	}]);