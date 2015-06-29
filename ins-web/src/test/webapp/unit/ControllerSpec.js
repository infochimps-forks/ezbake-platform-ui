'use strict';

/* jasmine specs for controllers go here */

describe('Registration controllers', function(){
  beforeEach(module('registration.controllers'));
  beforeEach(module('registration.services'));

  beforeEach(function(){
    this.addMatchers({
      toEqualData: function(expected) {
        return angular.equals(this.actual, expected);
      }
    });
  });

  var scope, ctrl, $httpBackend;


  describe('WizardCtrl', function() {
    beforeEach(inject(function($rootScope, $controller, _$httpBackend_) {
      scope = $rootScope.$new();
      var routeParams = {appId: "0"};
      $httpBackend =_$httpBackend_;
      $httpBackend.whenGET(/rest\/admin\/categories/).respond(
        ["SOCIAL","NEWS","MAIL"]
      );

      $httpBackend.whenGET(/rest\/admin\/prefixes/).respond(
        ["GEO://map/","NEWS://cnn/"]
      );

      $httpBackend.whenGET(/rest\/application\/intents/).respond(
        ["INTENT_EXAMPLE_1","INTENT_EXAMPLE_2", "INTENT_EXAMPLE_3", "INTENT_EXAMPLE_4", "INTENT_EXAMPLE_5"]
      );

      $httpBackend.whenGET(/rest\/application\/allPipelineFeedNames/).respond(
        ["FEED1","FEED2"]
      );

      $httpBackend.whenGET(/rest\/authenticate\/profile/).respond({username: "testuser", isAdmin: false});

      $httpBackend.whenGET(/partials/).respond("");

      ctrl = $controller('WizardCtrl', {$scope: scope, $routeParams: routeParams});
      $httpBackend.flush();
    }));

    it('showPagesQuestionNullColl', inject(function() {
      var page = {
        collection : null,
        question: "I have a question"
      };
      expect(scope.showPagesQuestion(page)).toBe(true);
    }));

    it('showPagesQuestionEmptyColl', inject(function() {
      var page = {
        collection : [],
        question: "I have a question"
      };
      expect(scope.showPagesQuestion(page)).toBe(true);
    }));

    it('showPagesQuestionHash-No', inject(function() {
      var page = {
        collection : [],
        question: "I have a question",
        isHash: true
      };
      page.collection["myVal"] = "test";
      expect(scope.showPagesQuestion(page)).toBe(false);
    }));

    it('showPagesQuestionCurrentItem-No', inject(function() {
      var page = {
        collection : null,
        question: "I have a question",
        currentItem: {}
      };
      expect(scope.showPagesQuestion(page)).toBe(false);
    }));

    it('addUrnMapping', inject(function() {
      scope.addUrnMapping("test", {webUrl:"category", includePrefix:true});
      expect(scope.currentApplication.webApp.urnMap["test"].webUrl).toBe("category");
      expect(scope.currentApplication.webApp.urnMap["test"].includePrefix).toBe(true);
      expect(scope.webApp.webUrl).toBe(undefined);
    }));

    it('removeUrnMapping', inject(function() {
      scope.addUrnMapping("test", {webUrl:"category", includePrefix:true});
      scope.removeUrnMapping("test");
      expect(scope.currentApplication.webApp.urnMap["test"]).toBe(undefined);
    }));

    it('addFeedTopic', inject(function() {
      scope.currentApplication.feedPipelines = [];
      scope.currentApplication.feedPipelines.push({feedName:"map",description:"Places data"});
      var topic = {name:"test", description: "describe", location:"some.domain.com"};
      scope.addFeedTopic(scope.currentApplication.feedPipelines[0], topic);
      expect(scope.currentApplication.feedPipelines[0].broadcastTopics[0].name).toBe("test");
      expect(scope.newFeedTopic).toEqualData({});
    }));

    it('removeFeedTopic', inject(function() {
      scope.currentApplication.feedPipelines = [];
      scope.currentApplication.feedPipelines.push({feedName:"map",description:"Places data"});
      var topic = {name:"test", description: "describe", location:"some.domain.com"};
      scope.addFeedTopic(scope.currentApplication.feedPipelines[0], topic);
      scope.removeTopic(scope.currentApplication.feedPipelines[0], 0);
      expect(scope.currentApplication.feedPipelines[0].broadcastTopics.length).toBe(0);
    }));

    it('addListenerTopic', inject(function() {
      scope.currentApplication.listenerPipelines = [];
      scope.currentApplication.listenerPipelines.push({feedName:"map",description:"Places data"});
      var topic = {name:"test", description: "describe", location:"some.domain.com"};
      scope.addListenerTopic(scope.currentApplication.listenerPipelines[0], topic);
      expect(scope.currentApplication.listenerPipelines[0].broadcastTopics[0].name).toBe("test");
      expect(scope.newListenerTopic).toEqualData({});
    }));

    it('removeListenerTopic', inject(function() {
      scope.currentApplication.listenerPipelines = [];
      scope.currentApplication.listenerPipelines.push({feedName:"map",description:"Places data"});
      var topic = {name:"test", description: "describe", location:"some.domain.com"};
      scope.addListenerTopic(scope.currentApplication.listenerPipelines[0], topic);
      scope.removeTopic(scope.currentApplication.listenerPipelines[0], 0);
      expect(scope.currentApplication.listenerPipelines[0].broadcastTopics.length).toBe(0);
    }));

  });
});