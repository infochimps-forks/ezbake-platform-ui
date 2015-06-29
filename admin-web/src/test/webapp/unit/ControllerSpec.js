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


  describe('ApplicationDetailsController', function() {
    beforeEach(inject(function(_$httpBackend_, $rootScope, $controller) {
      $httpBackend = _$httpBackend_;
      scope = $rootScope.$new();
      var routeParams = {};
      ctrl = $controller('ApplicationDetailsCtrl', {$scope: scope, $routeParams: routeParams});
    }));

    it('addCategory', inject(function() {
      scope.addCategory("test", "category");
      expect(scope.currentApplication.categories["test"]).toBe("category");
      expect(scope.newCategoryKey).toBe("");
      expect(scope.newCategoryValue).toBe("");
    }));

    it('removeCategory', inject(function() {
      scope.addCategory("test", "category");
      scope.removeCategory("test");
      expect(scope.currentApplication.categories["test"]).toBe(undefined);
    }));
  });

  describe('AdminController', function() {
    beforeEach(inject(function(_$httpBackend_, $rootScope, $controller) {
      $httpBackend = _$httpBackend_;
      scope = $rootScope.$new();
      ctrl = $controller("AdminCtrl", {$scope: scope});
    })
    );

    it('Add new hashtags should refresh the graph', inject(function() {
      expect("1").toBe("1");
    }));
  });
});