/* Controllers */

angular.module('registration.controllers', ['ui.bootstrap'])
	.controller('ModalWindowCtrl', [ '$scope', '$modal', '$log', '$anchorScroll',  function ($scope, $modal, $log, $anchorScroll) {
  		$scope.open = function () {
  	    $scope.modalInstance = $modal.open({
	      backdrop: 'static', // do not want it to be closed by clicking outside of modal window - instead user has X icon to close window
  	      keyboard: false, // do not want it to be closed by ESC key
  	      templateUrl: 'templateContent',
  	      controller: 'ModalInstanceCtrl',
  	      windowClass: 'dialogWindowClass',
  	      resolve: {
  	    	  appSecId: function() {
				  	if(!angular.isUndefined($scope.application)) {
				  		return $scope.application.id;
				}
			  },
              authorizations: function() { return function() {
                  if(!angular.isUndefined($scope.currentApplication)) {
                      if($scope.currentApplication.authorizationBuilder) {
                          return $scope.currentApplication.authorizationBuilder;
                      }
                  }
              };
              },
              isRegistrationForm: function() {
                  if ($scope.appForm) {
                      return true;
                  }
                  else {
                      return false;
                  }
              }
  	      }
  	    });
  	  };
  	}])

  	.controller('ModalInstanceCtrl', [ '$scope', '$rootScope', '$http', '$modalInstance', '$timeout', 'appSecId', 'isRegistrationForm', 'authorizations', '$anchorScroll', function ($scope, $rootScope, $http, $modalInstance, $timeout, appSecId, isRegistrationForm, authorizations, $anchorScroll) {
        // scroll to the top
        $anchorScroll();

        $scope.appSecId = appSecId;

        $scope.close = function () {
            $modalInstance.close();
        };

        $scope.selectedAuthorizations = authorizations() || {};

        $scope.save = function () {
            $rootScope.$emit('updatedAuths', $scope.selectedAuthorizations);
        };
    }])

    .controller('FileUploadCtrl', ['$scope', '$http', '$location', 'AppImport', function($scope, $http, $location, AppImport) {
        $scope.showImportAppBtn = true;

        $scope.importApplicationReg = function($files) {
            $scope.showImportAppBtn = false;
            var fileReader = new FileReader();
            fileReader.onload = function(event) {
                try {
                    var app = JSON.parse(fileReader.result);
                    AppImport.set(app);
                }
                catch(e) {
                    console.log("Unexpected error: " + e);
                }
            };
            fileReader.readAsText($files[0]); //TODO: Might want to support multiple file upload as the module already does. -DCG
            $location.path('/application/0');
        };
        
        
    	$scope.appIconSrc = "images/appIcon.png";	
    	$scope.showDefaultAppIcon = (angular.isUndefined($scope.currentApplication) || angular.isUndefined($scope.currentApplication.appIconSrc)) ? true : false;
        	
        $scope.uploadAppIcon = function($files) {
            if ($files[0].type.match('image.*')) {
                var fileReader = new FileReader();
                fileReader.readAsDataURL($files[0]);
                fileReader.onload = function(event) {
                	$scope.currentApplication.appIconSrc = fileReader.result;
                	$scope.showDefaultAppIcon = false;
                    $scope.$apply();
                };
            }
        };
        
        $scope.uploadThrift = function($files, topic, topicDetails) {
            var fileReader = new FileReader();
            fileReader.onload = function(event) {
                try {
                    topic.thriftDefinition = fileReader.result;
                    topicDetails.thriftFileName = $files[0].name;
                    $scope.$apply();
                }
                catch(e) {
                    console.log("Unexpected error: " + e);
                }
            };

            fileReader.readAsText($files[0]);
        };
}])

  .controller('FeedsCtrl', ['$scope', 'Feed', function($scope, Feed) {
    $scope.feeds = Feed.query();
}])

  .controller('AppsCtrl', ['$scope', '$rootScope', 'Application', '$http', '$location', '$timeout', '$route', 'toaster', function($scope, $rootScope, Application, $http, $location, $timeout, $route, toaster) {
    $scope.homeEnabled = 0;
  	$scope.myApplications = Application.query();
  	$scope.simple = true;

    $scope.myApplications.$promise.then(function (data) {
        if ($route.current.action){
            $scope.homeEnabled = parseInt($route.current.action);
        }
        else {
            $scope.homeEnabled = (data.length === 0) ? 1 : 2; //We're using Numbers here to ensure that the toggle is falsey for both elements in the view prior to the promise being fulfilled.
                                                              //Once the promise is fulfilled, then the two elements will toggle.
        }
    });

    $scope.linkTo = function(path) {
        $location.path(path);
    };
  	
    $scope.unDeploy = function(application, $index, $event) {
        $scope.showUndeployLoader++; //While showUndeployLoader is not zero, it will be true in ng-show.
    	var pkg = application.packages[$index]; 
    	
    	$http.post('rest/application/undeploy/' + pkg.appName +"/" + pkg.appServiceId, null )
            .success(function(response) {
    		    application.packages.splice($index, 1);
                $scope.showUndeployLoader--;
            })
            .error(function(response){
                $scope.showUndeployLoader--;
                toaster.pop('error', "Deployer Error", "Failed to undeploy from ezDeployer.  Please check the logs");
            });
    };

    $scope.unStage = function(application, $index) {
      var pkg = application.packages[$index];

      $http.post('rest/application/unstage/' + pkg.appName +"/" + pkg.appServiceId, null )
          .success(function(response) {
            application.packages.splice($index, 1);
          })
          .error(function() {
              toaster.pop('error', "Deployer Error", "Failed to unstage from ezDeployer.  Please check the logs");
          });
    };
    
    $scope.getListOfDeployedPackages = function(application, $event) {
    	if( application.show == null || application.show == false ) {
            $http.get('rest/application/deployedServices/' + application.id)
                .success(function(result) {
            	    application.packages = result;
                })
                .error(function() {
                    application.packages = [{"appName":"","appSecId":"", "appServiceId":"FAILED TO GET DEPLOYER STATUS", "status": "Please Try Again"}];
                    toaster.pop('error', "Deployer Error", "Failed to get information from ezDeployer.  Please check the logs");
                });
    	} else {
    		application.packages = null;
    	};
    	
    	application.show = !application.show;
    }; 
    
    $scope.deleteApplication = function(id) {
      Application.delete({id: id},null,function() {$scope.myApplications = Application.query()});
    };

    $scope.downloadApplication = function(id) {
        window.open('rest/application/download/' + id, '_blank');
    }
    
	$scope.registrationStatus = function(application) {
        $http.get('rest/application/registrationStatus/' + application.id)
            .success(function(result) {
                application.registrationStatus = result;
                if(application.registrationStatus === "ACTIVE") {
                    application.isDeployShow = true;
                } else {
                    application.isDeployShow = false;
                }
            })
            .error(function() {
                application.registrationStatus = "FAILED TO RETRIEVE APPLICATION STATUS";
                toaster.pop('error', "INS Error", "Failed to get information from INS.  Please check the logs");
            });
    };

	$scope.isAllowedToRegisterApplication = function() {
		$http.get('rest/application/allowedToRegister')
            .success(function(result) {
			    $scope.isAllowedToRegister = result;
		    })
            .error(function(data, status) {
                if (status >= 500) {
                    toaster.pop('error', "Registration Error", "Failed to get information from EzSecurityRegistration.  Please check the logs");
                }
            });
    };
	
    $scope.files = {};
	$scope.formatFileAttributes = function($files, isAppManifest, isAppProperties, isTarGz) {
		if(isAppProperties) {
			$scope.appProperties = [];
			var sz = $files.length;
			if(sz > 0) {
				$scope.files["appPropertiesArray"] = $files;
			};
			for(var i=0; i < $files.length; i++) {
				$scope.appProperties.push($files[i].name);
			};
		};
        if (isTarGz) {
            $scope.appTar = $files[0].name;
  			$scope.files["appTar"] = $files[0];
        };
	};
	
	$scope.validateArchiveFile = function($files) {
		var fileReader = new FileReader();
		fileReader.readAsArrayBuffer($files[0].slice(0, 4));
		
        fileReader.onload = function(event) {
	        try {
	        	
	            $http.post('rest/application/validateArchiveFile/' + new DataView(fileReader.result).getUint32(0, false))
	            	.success(function(result) {
	            		$scope.appArchive = $files[0].name;
	            		$scope.files["appArchive"] = $files[0];
	            	}).error(function(result){
	            		$scope.appArchive = ""; // in case it is populated, reset it, so that form validation works properly
	            	});
	        }
	        catch(e) {
	        	console.log(e);
	        	$scope.appArchive = "";
	        };
	    };
	};
	
	$scope.manifestValidationMessage = "Valid application manifest file required.";
	$scope.validateManifestFile = function(appSecId, $files) {
		var fileReader = new FileReader();
		fileReader.readAsDataURL($files[0]);
		
		fileReader.onload = function(event) {
			try {
				var base64 = fileReader.result.split(",")[1];
					$http.post('rest/application/validateManifestFile/' + appSecId + '/' + base64 ).success(function(data) {
						if(data.length > 0) {
							$scope.manifestValidationMessage = "ERROR:" + data.split(":")[0];
						} else {
							$scope.appManifest = $files[0].name;
							$scope.files["appManifest"] = $files[0]; 
						}
					}).error(function(error) {
						$scope.appManifest = ""; // in case it is populated, reset it, so that form validation works properly
					});
			} catch(e) {
				console.log(e);
				$scope.appManifest = "";
			};
		};
	};
	
	  $scope.showSpinner = false;
	  $scope.deployerSpinner = function() {
		  $scope.showSpinner = !$scope.showSpinner;
	  };
	  
	  $scope.isValidForm = function() {
		  return ( ($scope.simple && $scope.deployForm.archiveFile.$valid && $scope.deployForm.manifestFile) || 
				  (!$scope.simple && $scope.deployForm.tarArchiveFile.$valid && $scope.deployForm.manifestFile.$valid) ); // if either combination is true, then form is valid
	  };
	  
      var endPollCleanUp = function(appSecId, pollingData) {
          // remove task from the poller
          $http.post("rest/application/removeFromDeploymentStatusMap/" + appSecId).success(function(data, status){
              if(status === 200 ) {
            	  $scope.uploadingMessage += "Done";
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
                  };
              }

              if (erroredOutServiceIds.length > 0) {
                  var deployMessage = "Failed to Deploy Following Services For App Id:" + appSecId + ": " + erroredOutServiceIds.join(", ");
                  toaster.pop('error', "Deployer Error", deployMessage + " Please check the logs");
              } else if (someErrors === true) {
                  toaster.pop('error', "Deployer Error", "Failed to deploy entire or part of the application. Please check the logs");
              } else {
                  //everything is good
            	  toaster.pop('success', "Deployed", "App Id: " + appSecId + " successfully deployed.");
                  $scope.close();
              }
          };
      };

		$scope.pollDeploymentStatus = function(appSecId) {
			 var sleep = 10000;// sleep in  milliseconds
			 
			 (function tick() {
				 $http.get("rest/application/pollDeploymentStatusMap/" + appSecId).success(function(data, status) {
					 var isDeployTaskDone = false;
					
					 if(jQuery.isEmptyObject(data)) {  //	if result is empty, sleep and try again
						 $timeout(tick, sleep);
					 } else if(status === 400 ) { // bad request, stop polling for given appSecId
						 endPollCleanUp(appSecId, null);
					 } else {
						 var truths = 0;
						 var sz = data[appSecId].length;
						 for(var i = 0; i < sz; i++) {
							 if(data[appSecId][i].future.done === true) {
								 truths++;
							 };
						 }
						 isDeployTaskDone = truths === sz || false;
                       if(!isDeployTaskDone) {
                           $timeout(tick, sleep);
                       } else {
                           endPollCleanUp(appSecId, data);
                       };
					 };
				 }).error( function() {
					 toaster.pop('error', "Deployer Error", "Failed to deploy entire or part of the application. Please check the logs");
					 endPollCleanUp(appSecId, null);
				 });
			 })();
		 };
		 
		 $scope.prepForm = function(appSecId) {
			var formData = new FormData();
			
			$scope.files["appSecId"] = appSecId; // pass in app id
			angular.forEach($scope.files, function(v, k){
				if(k == "appPropertiesArray") {
					angular.forEach(v, function(val, key){
						formData.append("appProperties", val);
					});
				} else {
					formData.append(k, v);	
				}
			});
			
			$scope.sendForm(formData, appSecId);
		 };
		 
		 $scope.sendForm = function(formData, appSecId) {
			$scope.uploadingMessages = "";
			var xhr = new XMLHttpRequest();
				
			 // while uploading file
			 xhr.upload.onprogress = function(data) {
		            $scope.$apply(function() {
		                var sofar;
		                if (data.lengthComputable) {
		                    sofar = Math.round(data.loaded / data.total * 100);
		                    if (sofar < 100) {
		                        $scope.uploadingMessage = "...Uploading " + sofar + "%";
		                    } else if (sofar == 100) {
		                        $scope.uploadingMessage = "...Uploaded -> Saving Data";
		                    };
		                };
		            });
		        };

		        // finished uploading, ready for server processing
		        xhr.upload.onload = function(data) {
		        	$scope.$apply(function() {
		        		$scope.uploadingMessage += " -> Server Processing...";
		        	});
		        };
		        
		        // uploaded, server processing, poll for status
		        xhr.upload.onloadend = function(data) {
		        	$scope.pollDeploymentStatus(appSecId); // if there was an error, or abort, this call will follow onerror/onabort function		        	
		        }

		        // handle errors
		        xhr.upload.onerror = function(error) {
		        	toaster.pop('error', "Deployer Error", "Failed to deploy entire or part of the application. Please check the logs");
		        	$scope.deployerSpinner();
		        }
		        
		        xhr.open('POST', 'rest/application/deploy');
		        xhr.send(formData);
		 };
}]);
