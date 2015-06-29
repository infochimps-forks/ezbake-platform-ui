angular.module('registration.fakeREST', ['ngMockE2E']).run(function($injector) {
  var $httpBackend = $injector.get('$httpBackend');

  var cnn = {
    "intentServiceMap" : {"INTENT_EXAMPLE_1" : "Service1"},
    "jobRegistrations" : [{"jobName": "Amino Acid", "feedName" : "cnn"}],
    "id":"7c8336b7-3aad-4434-b0bd-d313efc4eaac",
    "appName":"CNN",
    "poc":"Me",
    "allowedUsers":["jdoe","mcole"],
    "categories":{"cnn":"NEWS"},
    "feedPipelines":[
      {"feedName":"cnn",
        "description":"Ingests cnn data",
        "broadcastTopics":[
          {"name":"cnn",
            "description":"CNN data",
            "thriftDefinition":"thrift idl"}],
        "exportingSystem":"CNN.com",
        "type":"upload",
        "maxClassification":"UNCLASSIFIED",
        "networkInitiated":"public internet",
        "physicalServers":null,
        "dateAdded":"2013-12-27",
        "dataType":"XML"}],
    "listenerPipelines":[],
    "webApp":{
      "urnMap":{"NEWS://cnn": {webUrl: "http://some.domain.org/cnn/{uri}", includePrefix: false} },
      "isChloeEnabled":false,
      "externalUri" : "http://my_external_uri/myapp.html"
      },
    "authorizations":  ["U", "FOUO", "U", "EL", "RS", "DS", "AUS","CAN","GBR","USA","NZL", "ALA", "ci_xyz", "gt_topic", "gg_group", "gr_region" ],
    "authorizationBuilder": {
		"classifications" : ["U"],
		"controlSystems" : ["EL"],
		"disseminationControls" :["RS"],
		"nonICMarkings" : ["DS"],
		"citizenshipCountries" : ["USA", "ALA"],
		"fveyCountries" : ["AUS","CAN","GBR","USA","NZL"],
		"externalGroups" : ["ci_xyz", "gt_topic", "gg_group", "gr_region" ]
	},
    "appIconSrc" : ""
  };

  var geoapp = {
    "intentServiceMap" : {"INTENT_EXAMPLE_1" : "Service1"},
    "jobRegistrations" : [{"jobName": "Amino Acid", "feedName" : "map"}],
    "id":"b9a0c985-7ef4-465b-be04-55e8518a576c",
    "appName":"geoapp",
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
        "networkInitiated":"public internet",
        "dataType":"XML"}],
    "listenerPipelines":[
        {   "feedName":"listeningPipeline",
            "description":"Retrieves items from the topic and indexes them.",
            "listeningTopics":["Alpha","Delta"],
            "broadcastTopics":[]
        }],
    "webApp":{},
    "authorizations":  ["U", "S", "C", "TS", "EL", "RS", "DS", "ALA"],
    "authorizationBuilder": {
		"classifications" : ["U", "S", "C", "TS"],
		"controlSystems" : ["EL"],
		"disseminationControls" :["RS"],
		"nonICMarkings" : ["DS"],
		"citizenshipCountries" : ["ALA"],
		"fveyCountries" : [],
        "organizations" : ["Org1", "Org2"],
		"externalGroups" : []
	}
  };

  $httpBackend.whenGET(/partials/).passThrough();
  
  $httpBackend.whenGET(/rest\/authenticate\/profile/).respond({username: "testuser", isAdmin: false});

  $httpBackend.whenGET(/rest\/application\/intents/).respond(
		    ["INTENT_EXAMPLE_1","INTENT_EXAMPLE_2", "INTENT_EXAMPLE_3", "INTENT_EXAMPLE_4", "INTENT_EXAMPLE_5"]
  );

  $httpBackend.whenGET(/rest\/application\/allowedToRegister/).respond('true');

  $httpBackend.whenGET(/rest\/application\/allPipelineFeedNames/).respond(["facespace","mybook"]);

  $httpBackend.whenGET(/rest\/application\/allTopicNames\/all/).respond(
    ["Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot", "Golf", "Hotel", "India", "Juliet", "Kilo", "Lima", "Mike", "November"]
  );

  $httpBackend.whenGET(/rest\/application\/allTopicNames\/app/).respond(
    ["Hotel", "India", "Juliet", "Kilo", "Lima", "Mike", "November"]
  );

  $httpBackend.whenGET(/rest\/application\/b9a0c985-7ef4-465b-be04-55e8518a576c/).respond(geoapp);

  $httpBackend.whenGET(/rest\/application\/7c8336b7-3aad-4434-b0bd-d313efc4eaac/).respond(cnn);

  $httpBackend.whenGET(/rest\/application\/capco/).respond(
      {"classifications": [{"groups":[{"markingGroup":"US_CLASSIFICATION","markings":[{"portion":"C","title":"CONFIDENTIAL", classifRank: 25},{"portion":"U","title":"UNCLASSIFIED", classifRank: 10}]},{"markingGroup":"SCI_CONTROLS","markings":[{"portion":"TT","title":"TITLE"},{"portion":"-TP","title":"-LOP"}]},{"markingGroup":"DISSEM_CONTROLS","markings":[{"portion":"YY","title":"YERE REER"},{"portion":"FOUO","title":"FOR OFFICIAL USE ONLY"}]},{"markingGroup":"NON_IC_CONTROLS","markings":[{"portion":"DS","title":"LIMITED DISTRIBUTION"},{"portion":"XD","title":"EXCLUSIVE DISTRIBUTION"}]}]}], "countryData": [{"countryName":"United Kingdom","countryDigraph":"UK","countryTrigraph":"GBR"},{"countryName":"United States","countryDigraph":"US","countryTrigraph":"USA"},{"countryName":"New Zealand","countryDigraph":"NZ","countryTrigraph":"NZL"}], "orgData":[{"orgTetragraph": "FVEY", "orgTrigraphs": ["AUS","CAN","GBR","USA","NZL"]}]}
  );
  
  $httpBackend.whenGET(/rest\/application\/deployedServices\/b9a0c985-7ef4-465b-be04-55e8518a576c/).respond(
		 [ 
		   {"appName":"geoapp","appSecId":"b9a0c985-7ef4-465b-be04-55e8518a576c", "appServiceId":"MyGeoService1", "status": "Staged", "canDeploy": true, "ezfrontEndLink" : ""},
		   {"appName":"geoapp","appSecId":"b9a0c985-7ef4-465b-be04-55e8518a576c", "appServiceId":"MygeoappService1", "status": "Staged", "canDeploy": true, "ezfrontEndLink" : ""},
		   {"appName":"geoapp","appSecId":"b9a0c985-7ef4-465b-be04-55e8518a576c", "appServiceId":"MygeoappService1", "status": "Deployed", "canDeploy": true, "ezfrontEndLink" : "userfacing.domain/example/myWebApp1"},
		   {"appName":"geoapp","appSecId":"b9a0c985-7ef4-465b-be04-55e8518a576c", "appServiceId":"MygeoappService1", "status": "Deployed", "canDeploy": true, "ezfrontEndLink" : "userfacing.domain/example/myWebApp2"},
		   {"appName":"geoapp","appSecId":"b9a0c985-7ef4-465b-be04-55e8518a576c", "appServiceId":"MygeoappService1", "status": "Deployed", "canDeploy": true, "ezfrontEndLink" : "userfacing.domain/example/myWebApp3"}
		 ]
	  );

  $httpBackend.whenGET(/rest\/application\/deployedServices\/7c8336b7-3aad-4434-b0bd-d313efc4eaac/).respond(
			 [ 
			   {"appName":"cnn","appSecId":"7c8336b7-3aad-4434-b0bd-d313efc4eaac", "appServiceId":"My cnn Service1", "status": "Deployed", "ezfrontEndLink" : "userfacing.domain/cnn/myCoralWebApp1"},
			   {"appName":"cnn","appSecId":"7c8336b7-3aad-4434-b0bd-d313efc4eaac", "appServiceId":"My cnn Service1", "status": "Deployed", "ezfrontEndLink" : "userfacing.domain/cnn/myCoralWebApp2"},
			   {"appName":"cnn","appSecId":"7c8336b7-3aad-4434-b0bd-d313efc4eaac", "appServiceId":"My cnn Service1", "status": "Deployed", "ezfrontEndLink" : "userfacing.domain/cnn/myCoralWebApp3"},
			   {"appName":"cnn","appSecId":"7c8336b7-3aad-4434-b0bd-d313efc4eaac", "appServiceId":"My cnn Service1", "status": "Deployed"},
			   {"appName":"cnn","appSecId":"7c8336b7-3aad-4434-b0bd-d313efc4eaac", "appServiceId":"My cnn Service1", "status": "Deployed", "ezfrontEndLink" : ""},
			   {"appName":"cnn","appSecId":"7c8336b7-3aad-4434-b0bd-d313efc4eaac", "appServiceId":"My cnn Service1", "status": "Deployed", "ezfrontEndLink" : ""},
			   {"appName":"cnn","appSecId":"7c8336b7-3aad-4434-b0bd-d313efc4eaac", "appServiceId":"My cnn Service1", "status": "Deployed", "ezfrontEndLink" : ""},
			   {"appName":"cnn","appSecId":"7c8336b7-3aad-4434-b0bd-d313efc4eaac", "appServiceId":"My cnn Service1", "status": "Deployed", "ezfrontEndLink" : ""}
			 ]
		  );

  
  $httpBackend.whenGET(/rest\/application\/isAppNameExists\/cnn2/).respond("false");
  $httpBackend.whenGET(/rest\/application\/isAppNameExists\/cnn/).respond("true");
  
  $httpBackend.whenGET(/rest\/application\/registrationStatus\/b9a0c985-7ef4-465b-be04-55e8518a576c/).respond("ACTIVE");
  $httpBackend.whenGET(/rest\/application\/registrationStatus\/7c8336b7-3aad-4434-b0bd-d313efc4eaac/).respond("PENDING");
  
  $httpBackend.whenGET(/rest\/application/).respond([cnn, geoapp]);
  

  $httpBackend.whenGET(/rest\/feed/).respond(cnn.feedPipelines.concat(geoapp.feedPipelines));
  
  $httpBackend.whenGET(/rest\/admin\/categories/).respond(
		    ["SOCIAL","NEWS","MAIL"]
		  );
  
  $httpBackend.whenGET(/rest\/admin\/prefixes/).respond(
		    ["GEO://map/","NEWS://cnn/"]
		  );


  $httpBackend.whenPOST(/rest\/application\/undeploy/).respond(200,'');
  $httpBackend.whenPOST(/rest\/application\/unstage/).respond(200,'');
  $httpBackend.whenPOST(/rest\/application/).respond(200,'');
  $httpBackend.whenDELETE(/rest\/application/).respond(200,'');

  $httpBackend.whenPOST(/rest\/admin\/categories/).respond(200,'');
  $httpBackend.whenDELETE(/rest\/admin\/categories/).respond(200,'');
});
