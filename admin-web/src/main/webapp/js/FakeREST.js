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

angular.module('admin.fakeREST', ['ngMockE2E']).run(function($injector) {
  var $httpBackend = $injector.get('$httpBackend');

  var cnn = {
		    "intentServiceMap" : {"INTENT_EXAMPLE_1" : "Service1", "INTENT_EXAMPLE_2" : "Service2"},
		    "jobRegistrations" : [{"jobName": "Amino Acid", "feedName" : "cnn"}, {"jobName": "Protein", "feedName" : "shark"}],
		    "id":"7c8336b7-3aad-4434-b0bd-d313efc4eaac",
		    "appName":"cnn",
		    "poc":"Me",
		    "allowedUsers":["jdoe","mcole"],
		    "categories":{"cnn":"NEWS"},
		    "sponsoringOrganization" : "Jedi Council",
		    "feedPipelines":[
		      {"feedName":"cnn",
		        "description":"Ingests cnn data",
		        "broadcastTopics":[
		          {"name":"cnn",
		            "description":"CNN data",
		            "thriftDefinition":"thrift idl"},
		          { "name":"GooglePlaces",
			        "description":"The places",
                    "thriftDefinition":"thrift idl"}
		          ],
		        "exportingSystem":"cnn",
		        "type":"upload",
		        "maxClassification":"UNCLASSIFIED",
		        "networkInitiated":"Public Internet",
		        "physicalServers":null,
		        "dateAdded":"2013-12-27",
		        "dataType":"XML"}],
		    "listenerPipelines": [ 
		        { "pipelineName": "pipeName", 
		          "description": "pipeDesc", 
		           "listeningTopics": [ "pipeTopictoListen1", "pipeTopictoListen2", "pipeTopictoListen3" ], 
		           "broadcastTopics": [ { "name": "broadcastName", "description": "broadcastDesc", "thriftDefinition": "thrift_Def" }
		           					  ] 
		        } 
		        ], 
		    "webApp":{
		      "urnMap":{"NEWS://cnn": {webUrl: "http://some.domain.org/cnn/{uri}", includePrefix: false} },
		      "isChloeEnabled":true,
		      "chloeWebUrl": "http://chloe/web/url",
		      "externalUri" : "http://my_external_uri/myapp.html",
		      "requiredGroupName" : "required_group_name"
            },
            "authorizations":["U","FOUO"],
            "communityAuthorizations": ["gg_ext", "gt_ext"]
    };

var geoapp = {
		    "intentServiceMap" : {"INTENT_EXAMPLE_1" : "Service1"},
		    "jobRegistrations" : [{"jobName": "Amino Acid", "feedName" : "map"}],
		    "id":"b9a0c985-7ef4-465b-be04-55e8518a576c",
		    "appName":"iSpatial",
		    "poc":"Jordon",
		    "allowedUsers":["jdoe"],
		    "categories":{"map":"GEO"},
		    "feedPipelines":[
		      { "feedName":"map",
		        "description":"Places data",
		        "broadcastTopics":[
		          { "name":"GooglePlaces",
		            "description":"The places",
                    "thriftDefinition":"thrift idl"}],
		        "exportingSystem":"Google",
		        "type":"Map Data",
		        "maxClassification":"UNCLASSIFIED",
		        "networkInitiated":"Public Internet",
		        "dataType":"XML"}],
		    "listenerPipelines":[],
		    "webApp":{},
		    "authorizations":["U","FOUO"],
            "communityAuthorizations": ["gg_ext", "gt_ext"]
		  };
  
  var registrationApp = [
  			{   "appName": "cnn",
		  	    "appId": "7c8336b7-3aad-4434-b0bd-d313efc4eaac",
		  	    "authorizations": [ "U" ],
                "communityAuthorizations": ["gg_ext", "gt_ext"],
                "poc": "me@email.com",
		  	    "topics": {"pipe_1" : [ "pipeTopictoListen1", "pipeTopictoListen2", "pipeTopictoListen3" ]},
		  	    "jobRegistrations": [ { "jobName": "amino acid", "feedName": "feedname"} ],
		  	    "currentAppAdmin" : false
		  	},
  			{ 	"appName": "geoapp",
			  	"appId": "b9a0c985-7ef4-465b-be04-55e8518a576c",
			  	"authorizations": [ "U" ],
                "communityAuthorizations": ["gg_ext", "gt_ext"],
                "poc": "me@email.com",
			  	"topics": {"pipe_1" : [ "pipeTopictoListen1", "pipeTopictoListen2", "pipeTopictoListen3" ]},
			  	"jobRegistrations": [ { "jobName": "amino acid", "feedName": "feedname"} ],
			  	"currentAppAdmin" : true
			 }
  			];
  
  var deploymentPoll = [
			{ 
				"appSecId-123456ABC-DEF": 
					[ 	
					  	{ "future": { "cancelled": false, "done": true }, "serviceId" : "1233", "errors": "Errors!", "error": true }, 
						{ "future": { "cancelled": false, "done": true }, "serviceId" : "1235", "errors": "Errors!", "error": true }, 
						{ "future": { "cancelled": false, "done": true }, "serviceId" : "1234", "errors": "Errors!", "error": true } 
					]
			},
			{
			"appSecId-ABC-DEF": 
					[ 	
					  	{ "future": { "cancelled": false, "done": true }, "errors": "Errors!", "error": true },
						{ "future": { "cancelled": false, "done": true }, "errors": null, "error": false }, 
						{ "future": { "cancelled": false, "done": true }, "errors": null, "error": false } 
					]
		
			},
            {
                  "appSecId-ABC-DEF":
                      [
                          { "future": { "cancelled": false, "done": true }, "serviceId" : "1233", "error": false },
                          { "future": { "cancelled": false, "done": true }, "errors": null, "error": false },
                          { "future": { "cancelled": false, "done": true }, "errors": null, "error": false }
                      ]

            }
	];
  
  $httpBackend.whenGET(/partials/).passThrough();
  
  $httpBackend.whenGET(/rest\/admin\/isAdmin/).respond(200); // use 403 to simulate unauthorized user, 200 for admin user
  
  $httpBackend.whenGET(/rest\/admin\/categories/).respond(
    ["GEO","NEWS","SOCIAL"]
  );
  
  $httpBackend.whenGET(/rest\/admin\/systemTopics/).respond(
		    ["SystemTopic1", "SystemTopic2"]
		  );
  
  /* Registered apps details */
  $httpBackend.whenGET(/rest\/admin\/applicationRegistrationDetails\/7c8336b7-3aad-4434-b0bd-d313efc4eaac/).respond( cnn );

  
  /* Registered apps */
  $httpBackend.whenGET(/rest\/admin\/registeredApps\/PENDING/).respond( [registrationApp[0]] );
  
  $httpBackend.whenGET(/rest\/admin\/registeredApps\/ACTIVE/).respond( [registrationApp[1]] );
  
  $httpBackend.whenGET(/rest\/admin\/registeredApps\/DENIED/).respond( [registrationApp[1]] );

  /* Deployment apps */
  $httpBackend.whenGET(/rest\/admin\/pollDeploymentStatusMap\/appSecId-123456ABC-DEF/).respond(deploymentPoll[0]);
  $httpBackend.whenGET(/rest\/admin\/pollDeploymentStatusMap\/appSecId-ABC-DEF/).respond(deploymentPoll[2]);
  
  $httpBackend.whenPOST(/rest\/admin\/removeFromDeploymentStatusMap\/appSecId-123456ABC-DEF/).respond(200);
  $httpBackend.whenPOST(/rest\/admin\/removeFromDeploymentStatusMap\/appSecId-ABC-DEF/).respond(200);
  
  $httpBackend.whenPOST(/rest\/admin\/deployApp\/appSecId-123456ABC-DEF\/true/).respond(200);
  $httpBackend.whenPOST(/rest\/admin\/deployApp\/appSecId-ABC-DEF\/true/).respond(200);
  
  var stagedApps =
		   	{ "appSecId-123456ABC-DEF": [ 
		   	                              { "appName": "myApp1", "appSecId": "appSecId-123456ABC-DEF", "appServiceId": "serviceId-1-123455", "poc": "poc@poc.com", "status": "staged", "currentAppAdmin" : false },
		   	                              { "appName": "myApp1", "appSecId": "appSecId-123456ABC-DEF", "appServiceId": "serviceId-2-123455", "poc": "poc@poc.com", "status": "staged", "currentAppAdmin" : false },
		   	                              { "appName": "myApp1", "appSecId": "appSecId-123456ABC-DEF", "appServiceId": "serviceId-3-123455", "poc": "poc@poc.com", "status": "staged", "currentAppAdmin" : false }
		   	                            ], 
		   	 "appSecId-ABC-DEF":
		   	                              [{ "appName": "myApp2", "appSecId": "appSecId-ABC-DEF", "appServiceId": "serviceId-0-123455", "poc": "poc@poc.com", "status": "staged", "currentAppAdmin" : false }]
		   	                      
		   	}

  $httpBackend.whenGET(/rest\/admin\/deploymentApps\/Staged/).respond(
      function (method, url) {
          return [200, stagedApps];
      }
  );
  
  var deployedApps =
		   { "appSecId-ABC-DEF": [ 
		   	                       	{ "appName": "myApp3", "appSecId": "appSecId-ABC-DEF", "appServiceId": "serviceId-90-123455", "poc": "poc@poc.com", "status": "deployed", "currentAppAdmin" : false },
		   	                       	{ "appName": "myApp3", "appSecId": "appSecId-ABC-DEF", "appServiceId": "serviceId-AB-123455", "poc": "poc@poc.com", "status": "deployed", "currentAppAdmin" : false },
		   	                       	{ "appName": "myApp3", "appSecId": "appSecId-ABC-DEF", "appServiceId": "serviceId-ZZ-123455", "poc": "poc@poc.com", "status": "deployed", "currentAppAdmin" : false }
	                              ], 
	          "appSecId-ABC-DEFGH": [ 
		   	                       	{ "appName": "myApp31", "appSecId": "appSecId-ABC-DEF1", "appServiceId": "serviceId-90-1234551", "poc": "poc1@poc.com", "status": "deployed", "currentAppAdmin" : true },
		   	                       	{ "appName": "myApp31", "appSecId": "appSecId-ABC-DEF1", "appServiceId": "serviceId-AB-1234551", "poc": "poc1@poc.com", "status": "deployed", "currentAppAdmin" : true },
		   	                       	{ "appName": "myApp31", "appSecId": "appSecId-ABC-DEF1", "appServiceId": "serviceId-ZZ-1234551", "poc": "poc1@poc.com", "status": "deployed", "currentAppAdmin" : true }
	                              ] 
		   	}
		   	
   $httpBackend.whenGET(/rest\/admin\/deploymentApps\/Deployed/).respond(deployedApps);

  $httpBackend.whenGET(/rest\/admin\/deploymentApps\/Denied/).respond(
		   	{ "appSecId-ABC": [ 
		   	                       	{ "appName": "myApp4", "appSecId": "appSecId-ABC", "appServiceId": "serviceId-90-123455", "poc": "poc@poc.com", "status": "denied", "currentAppAdmin" : false }
	                          ] 
		   	}
  );

  var undeployedApps =
		   	{ "appSecId-ABC": [ 
		   	                       	{ "appName": "myApp4", "appSecId": "appSecId-ABC", "appServiceId": "serviceId-90-123455", "poc": "poc@poc.com", "status": "undeployed", "currentAppAdmin" : true }
	                          ] 
		   	}
  $httpBackend.whenGET(/rest\/admin\/deploymentApps\/Undeployed/).respond(undeployedApps);
  
  $httpBackend.whenPOST(/rest\/admin\/registerApp\/5876601348595428209\/true/).respond(200, '');
  $httpBackend.whenPOST(/rest\/admin\/registerApp\/5876601348595428209\/false/).respond(200, '');

  var appServicePattern = new RegExp("rest/admin/appServiceDeployment/(appSecId-.*)/(.+)/false");
  $httpBackend.whenPOST(appServicePattern).respond(function (method, url) {
      var urlMatch = appServicePattern.exec(url),
          appsecId = urlMatch[1],
          appServiceId = urlMatch[2];

      if (!(appsecId in deployedApps)) return [400, ''];
      var canUndeploy = true;
      var app = deployedApps[appsecId];
      var serviceIndex = -1;
      $.each(app, function (index, value) {
          if (value.appServiceId == appServiceId ) {
              serviceIndex = index;
              if (value.status != "deployed") {
                  canUndeploy = false;
              };
              // early escape from .each loop
              return false;
          }
          return true;
      });
      if (canUndeploy) {
          if (serviceIndex >= 0) {
              var appService = app.splice(serviceIndex, 1)[0];
              var appSecId = appService.appSecId;
              appService.status = "undeployed";
              if (! (appSecId in undeployedApps)){
                  undeployedApps[appSecId] = [];
              };
              undeployedApps[appSecId].push(appService);
          };
          return [200, ''];
      } else {
          return [400, ''];
      };
  });

  $httpBackend.whenPOST(/rest\/admin\/categories/).respond(200,'');
  $httpBackend.whenDELETE(/rest\/admin\/categories/).respond(200,'');
  
  $httpBackend.whenPOST(/rest\/admin\/systemTopics\/SystemTopic3/).respond(200,'["SystemTopic1", "SystemTopic2", "SystemTopic3"]');
  $httpBackend.whenDELETE(/rest\/admin\/systemTopics\/SystemTopic3/).respond(200,'["SystemTopic1", "SystemTopic2"]');
  
  $httpBackend.whenPOST(/rest\/admin\/clearSystemCache/).respond(200, '');

  
});  
  
