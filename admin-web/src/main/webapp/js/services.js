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

/* Services */

angular.module('admin.services', ['ngResource'])

.factory('DeployApp', ['$resource',
   function($resource) {
     return $resource('rest/admin/deployApp/:appSecId/:isApproved/:status',
    		 {appSecId : '@appSecId', isApproved : '@isApproved', status: '@status'},
    		 {deploy: {method: 'POST'}});
}])

.factory('DeleteApp', ['$resource',
   function($resource) {
     return $resource('rest/admin/deleteApp/:appSecId',
    		 {appSecId : '@appSecId'},
    		 {deleteApp: {method: 'DELETE'}});
}])

.factory('AppServiceDeployment', ['$resource',
   function($resource) {
     return $resource('rest/admin/appServiceDeployment/:appSecId/:serviceId/:isDeployed',
                      {appSecId : '@appSecId', serviceId: '@serviceId', isDeployed: '@isDeployed'},
                      {});
}])

.factory('RegisterApp', ['$resource', 
     function($resource) {
		return $resource('rest/admin/registerApp/:appSecId/:isApproved',
				{appSecId : '@appSecId', isApproved : '@isApproved'},
				{register: {method: 'POST'}});
}])

.factory('UpdateManifest', ['$resource', 
     function($resource) {
		return $resource('rest/admin/updateAndDeploy/:appName/:appServiceId/:numOfInstances',
				{appName : '@appName', appServiceId : '@appServiceId', numOfInstances : '@numOfInstances'},
				{update: {method: 'POST'}});
}]);