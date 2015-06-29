angular.module('registration.controllers').controller('WizardCtrl', ['$scope', '$rootScope', '$routeParams', '$http', '$location', 'Application', 'AppImport', 'Profile', 'toaster',
  function($scope, $rootScope, $routeParams, $http, $location, Application, AppImport, Profile, toaster) {

    /****************************************************************
     * Initialize some scope variables
     *
     ****************************************************************/
    $scope.existingApplication = $routeParams.appId != "0";
    $scope.addAnotherRadio = "";
    $scope.disableSaveApplication = false;
    
    var importedApp = AppImport.get();
    if (!jQuery.isEmptyObject(importedApp)){
        $scope.currentApplication = new Application(importedApp);
        $scope.existingApplication = true;
        $scope.importedApplication = true;
    }
    else {
        $scope.currentApplication = new Application();
        $scope.importedApplication = false;
    }
    importedApp = null; //Clean up
    $scope.currentUsername = null;
    $scope.appNameExists = false;
    $scope.newListenerTopic = {};
    $scope.newFeedTopic = {};
    $scope.newUser = {name: ""};
    $scope.webApp = {};
    $scope.webAppKey = "";

    /****************************************************************
     * Functions to load data from templates or from the REST tier
     ****************************************************************/

    /* tooltip */
    $http.get('partials/webAppInfoExample.html').then(function(val){
      $scope.htmlTooltip = val.data;
    });

    /* categories */
    $http.get('rest/admin/categories')
      .success(function(data) {
        $scope.categories = data;
      });
    /* intents */
    $http.get('rest/application/intents')
      .success(function(data) {
        $scope.intents = data;
      });
    /* Feed Names */
    $http.get('rest/application/allPipelineFeedNames')
      .success(function(data) {
        $scope.pipelineFeedNames = data;
    });
    /* Prefixes */
    $http({method: 'GET', url: 'rest/admin/prefixes'})
      .success(function(data) {
        $scope.prefixes = data;
    });
    /* Topic names */
    $http.get('rest/application/allTopicNames/all')
      .success(function(data){
        $scope.allTopicNames = data;
    });

    $http.get('rest/application/allTopicNames/app')
      .success(function(data){
        $scope.allAppTopicNames = data;
    });



    /****************************************************************
     * Setup all the wizard pages - this doesn't get called until the current application is loaded
     ****************************************************************/
    var setupWizard = function() {
      $scope.currentApplication.feedPipelines = $scope.currentApplication.feedPipelines || [];
      $scope.currentApplication.listenerPipelines = $scope.currentApplication.listenerPipelines || [];
      $scope.currentApplication.webApp = $scope.currentApplication.webApp || {};
      $scope.currentApplication.webApp.urnMap = $scope.currentApplication.webApp.urnMap || {};
      $scope.currentApplication.intentServiceMap = $scope.currentApplication.intentServiceMap || {};
      $scope.currentApplication.jobRegistrations = $scope.currentApplication.jobRegistrations || [];

      if (!$scope.existingApplication && !$scope.importedApplication) {
          $scope.$watch('currentApplication.appName', function(newValue, oldValue) {
            if (newValue) {
                $scope.currentApplication.webApp.externalUri = angular.lowercase(newValue);
                $scope.currentApplication.webApp.chloeWebUrl = angular.lowercase(newValue);
                $scope.webApp.webUrl = angular.lowercase(newValue) + "/{uri}";
            }
        });
      }

      $scope.wizardPages = [
        { step: 0,
          name: "",
          iconClass: "",
          template: "partials/wizard/gettingStarted.html",
          header: "Registration Overview",
          collection: [],
          currentItem: null,
          currentSection: true,
          enabled: true,
          complete: $scope.existingApplication
        },
        { step: 1,
          name: "Basic Information (Required)",
          iconClass: "icon-info",
          template: "partials/wizard/basicInformation.html",
          header: "Basic Information",
          collection: [],
          currentItem: null,
          currentSection: false,
          enabled: $scope.existingApplication,
          complete: $scope.existingApplication
        },
        { step: 2,
          name: "Pipelines - Feeds and Data",
          iconClass: "icon-feed",
          template: "partials/wizard/feedPipelines.html",
          header: "Add a Feed Pipeline",
          question: "Is your application ingesting or generating new data?",
          answer: $scope.existingApplication ? false : null,
          collection: $scope.currentApplication.feedPipelines,
          currentItem: null,
          currentSection: false,
          enabled: $scope.existingApplication,
          complete: $scope.existingApplication,
          addAnotherQuestion: "Add Another Feed?",
          getItemName: function(item) { return item.feedName;},
          onRemove: function(collection, index) {
            $scope.removeCategory(collection[index].feedName);
          }
        },
        { step: 3,
          name: "Pipelines - Listeners",
          iconClass: "icon-tree",
          template: "partials/wizard/listeningPipelines.html",
          header: "Add a Listening Pipeline",
          question: "Is your application listening to a feed?",
          answer: $scope.existingApplication ? false : null,
          collection: $scope.currentApplication.listenerPipelines,
          currentItem: null,
          currentSection: false,
          enabled: $scope.existingApplication,
          complete: $scope.existingApplication,
          addAnotherQuestion: "Add Another Listener?",
          getItemName: function(item) { return item.feedName; }
        },
        { step: 4,
          name: "Web Application Info",
          iconClass: "icon-cog",
          template: "partials/wizard/webInfo.html",
          header: "Web Application Info",
          question: "Are you deploying a web application?",
          answer: $scope.existingApplication ? false : null,
          collection: null,
          currentItem: null,
          currentSection: false,
          enabled: $scope.existingApplication,
          complete: $scope.existingApplication
        },
        { step: 5,
          name: "Intent Query",
          iconClass: "icon-link",
          template: "partials/wizard/intents.html",
          header: "Add Intent Query",
          question: "Does your application answer any Intent Queries?",
          answer: $scope.existingApplication ? false : null,
          collection: $scope.currentApplication.intentServiceMap,
          isHash: true,
          currentItem: null,
          currentSection: false,
          enabled: $scope.existingApplication,
          complete: $scope.existingApplication,
          addAnotherQuestion: "Want to Add Another Intent Query?",
          getItemName: function(item) { return item; }
        },
        { step: 6,
          name: "Amino Jobs",
          iconClass: "icon-uniE61C",
          template: "partials/wizard/aminoJobs.html",
          header: "Add Amino Jobs",
          question: "Does your application have any Amino Jobs?",
          answer: $scope.existingApplication ? false : null,
          collection: $scope.currentApplication.jobRegistrations,
          currentItem: null,
          currentSection: false,
          enabled: $scope.existingApplication,
          complete: $scope.existingApplication,
          addAnotherQuestion: "Want to Add Another Amino Job?",
          getItemName: function(item) { return item.jobName; }
        }];
    };

    $scope.showPagesQuestion = function(page) {
      //show if the page has a question, there's not a current item being shown AND
      //The collection is empty
      var collectionSize;
      if (page.collection == null) {
        collectionSize = 0;
      } else {
        collectionSize = page.isHash ? Object.keys(page.collection).length : page.collection.length;
      }

      return page.question && !page.currentItem &&
        (page.collection == null || collectionSize === 0);
    };

    $scope.showAddAnother = function(page) {
      if (page.collection == null) return false;
      var collectionSize = page.isHash ? Object.keys(page.collection).length : page.collection.length;
      return page.collection != null && collectionSize > 0 && !page.currentItem;
    };

    $scope.saveApplication = function() {
      if ($scope.currentApplication.appName && $scope.currentApplication.poc && $scope.currentApplication.authorizations) { //required members
    	  // disable save button to prevent duplicate registrations
    	  $scope.disableSaveApplication = true;
    	  $scope.currentApplication.$save(null, 
    	      function(success) { 
    		  	$location.path("myapps");
    	  	  },
    	  	  function(error) { 
	  	  		$scope.disableSaveApplication = false;
	  	  		toaster.pop('error', "Registration Error", "Failed to register application.  Please check the logs");
    	  	  }
    	  );
      }
    };

    $scope.cancelRegistration = function() {
      return $location.path("myapps");
    };

    $rootScope.$on('updatedAuths', function(event, auths) {
    	
      if ($scope.currentApplication.$promise) {
        $scope.currentApplication.$promise.then(function (data){
          $scope.currentApplication.authorizationBuilder = auths;
        });
      }
      else {
        $scope.currentApplication.authorizationBuilder = auths;
      }
      $scope.formatAuthorizations(auths);
    });
    
    $scope.formatAuthorizations = function(auths) {
    	$scope.currentApplication.authorizations = [];
        $scope.currentApplication.communityAuthorizations = [];
		  angular.forEach(auths, function(value, key){
              if (key === "externalGroups") {
                  value.forEach(function (v) {
                      $scope.currentApplication.communityAuthorizations.push(v);
                  });
              } else {
                  value.forEach(function (v) {
                      $scope.currentApplication.authorizations.push(v);
                  });
              }
		  });
	  
		  // remove duplicate entries
		  $scope.currentApplication.authorizations = $scope.currentApplication.authorizations.filter(function(item, index, array) {
	    	return index == array.indexOf(item);
		 });
		 
    };
    

    /****************************************************************
     * Functions related to add or removing items from the collection and moving to the next item
     *
     ****************************************************************/
    $scope.continueRegistration = function(page, answer) {
      var wasOpen = page.currentSection;
      page.currentSection = false;
      page.complete = true;
      var nextPageNum = page.step + 1;
      var nextPage = $scope.wizardPages[nextPageNum];
      if (nextPage) {
        nextPage.enabled = true;
        if (!nextPage.question) {
          nextPage.currentSection = true;
        }
      }
      if (answer === "no" && (page.addAnotherQuestion || !wasOpen)) {
        page.currentSection = !page.currentSection;
      }
    };

    $scope.removeCurrentItem =  function(page, index, $event) {
      if (page.onRemove) {
        page.onRemove(page.collection, index);
      }

      page.collection.splice(index, 1);

      if ($event.stopPropagation) $event.stopPropagation();
      if ($event.preventDefault) $event.preventDefault();
      $event.cancelBubble = true;
      $event.returnValue = false;
    };

    $scope.addCurrentItem = function(page) {
      var addItem = true;
      page.collection.forEach(function(current) {
        if (page.getItemName(page.currentItem) && page.getItemName(current) == page.getItemName(page.currentItem)) {
          addItem = false;
        }
      });
      if (addItem) {
        page.collection.push(page.currentItem);
      }
      $scope.addAnotherRadio = null;
      page.currentItem = null;
      page.currentSection = false;
    };

    $scope.addCurrentHashItem = function(key, page) {
      if(key && page.currentItem) {
        page.collection[key] = page.currentItem;
      }
      $scope.addAnotherRadio = null;
      page.currentItem = null;
      page.currentSection = false;
    };

    $scope.removeCurrentHashItem = function(collection, key) {
      delete collection[key];
    };


    /****************************************************************
     * Functions to get the current application and current user
     *
     ****************************************************************/
    var profile = Profile.get({}, function(){
      $scope.currentUsername = profile.username;

      if (!$scope.existingApplication || $scope.importedApplication) {
        $scope.currentApplication.allowedUsers = [];
        $scope.currentApplication.allowedUsers.push($scope.currentUsername);
        setupWizard();
      }
      else {
        $scope.currentApplication = Application.get({id: $routeParams.appId});
        $scope.currentApplication.$promise.then(function(data){
          if (data.authorizationBuilder){
        	  $scope.formatAuthorizations(data.authorizationBuilder);
          }
          setupWizard();
        });
      }
    });

    $scope.addUser = function(user) {
      if (!$scope.currentApplication.allowedUsers) {
        $scope.currentApplication.allowedUsers = [];
      }
      var index = $scope.currentApplication.allowedUsers.indexOf(user);
      if (index < 0) {
        $scope.currentApplication.allowedUsers.push(user);
        $scope.newUser = {};
      }
    };

    $scope.removeUser = function(user) {
      var index = $scope.currentApplication.allowedUsers.indexOf(user);
      if (index > -1) {
        $scope.currentApplication.allowedUsers.splice(index, 1);
      }
    };

    /****************************************************************
     * check for duplicate app name
     * @param appName
     ****************************************************************/
    $scope.isAppNameExists = function(appName) {
      $http.get('rest/application/isAppNameExists/' + appName).success(function(result){
        // we need to determine whether or not this is edit otherwise warning message would pop up incorrectly
        if(result === "true") {
          var app = Application.get({id: $routeParams.appId});
          app.$promise.then(function(data){
            if($scope.currentApplication.appName === app.appName) {
              $scope.appNameExists = false; // edit, do not display warning message
              return;
            }
          }, function(error) {
            console.log(error);
          });

          $scope.appNameExists = true;
        } else { // new application
          $scope.appNameExists = false;
        }
      });
    };

    /****************************************************************
     * Topic functions
     ****************************************************************/
    var addTopic = function(pipeline, topic) {
      if (topic.name) { //Eliminating any falsey values.
          pipeline.broadcastTopics = pipeline.broadcastTopics || [];
          pipeline.broadcastTopics.push(topic);
      }
    };

    $scope.editTopic = function(){
      var row = $(event.target).parent();
      var input = row.replaceWith('<input class="edit-field" ng-keypress="cleanEditField()" type="text" />');
    };

    $scope.removeTopic = function(pipeline, index) {
      pipeline.broadcastTopics.splice(index, 1);
    };

    $scope.addFeedTopic = function(feed, topic) {
      addTopic(feed, topic);
      $scope.newFeedTopic = {};
    };

    $scope.addListenerTopic = function(listener, topic) {
      addTopic(listener, topic);
      $scope.newListenerTopic = {};
    };

    var buildPrefix = function(key, category) {
      return category + "://" + key;
    };

    $scope.addCategory = function(key, value) {
      if (!$scope.currentApplication.categories) {
        $scope.currentApplication.categories = {};
      }
      $scope.currentApplication.categories[key] = value;
      $scope.newCategoryKey = $scope.newCategoryValue = '';
      $scope.prefixes.push(buildPrefix(key, value));
    };

    $scope.removeCategory = function(key) {
      var category = $scope.currentApplication.categories[key];
      delete $scope.currentApplication.categories[key];
      $scope.prefixes.splice($scope.prefixes.indexOf(buildPrefix(key, category)), 1);
    };

    $scope.addUrnMapping = function(webAppKey, updatedWebApp) {
      if (updatedWebApp.webUrl) {
          $scope.currentApplication.webApp.urnMap[webAppKey] = updatedWebApp;
          $scope.webApp = {};
          $scope.webAppKey = "";
      }
    };

    $scope.removeUrnMapping = function(urnKey) {
      delete $scope.currentApplication.webApp.urnMap[urnKey];
    };

    $scope.topicNameIsUnique = function(currentTopicName) {
        if (typeof $scope.allAppTopicNames === "undefined" || $scope.allAppTopicNames.indexOf(currentTopicName) === -1) {
            return true;
        }
        else {
            return false;
        }
    };

    /*********************************************************
     * Get all the feed names for Job registration. Use the current registrations feeds in addition to all in the database
     * @return {Array}
     */

    $scope.getAllFeedNamesForJobRegistration = function() {
      var allFeedNamesForJobRegistration = [];

      if(!angular.isUndefined($scope.pipelineFeedNames)){
        angular.copy($scope.pipelineFeedNames, allFeedNamesForJobRegistration);
      }

      if(!angular.isUndefined($scope.currentApplication.feedPipelines)) {

        var i = 0;
        var sz = $scope.currentApplication.feedPipelines.length;
        for(i; i < sz; i++) {
          allFeedNamesForJobRegistration.push($scope.currentApplication.feedPipelines[i].feedName);
        }
      };

      return allFeedNamesForJobRegistration;
    };


  }]
);

