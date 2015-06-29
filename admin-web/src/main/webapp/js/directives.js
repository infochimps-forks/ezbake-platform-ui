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

/* Directives */


angular.module('admin.directives', [])
  .directive('ngConfirmClick', [
    function(){
      return {
        priority: 1,
        terminal: true,
        link: function (scope, element, attr) {
          var msg = attr.ngConfirmClick || "Are you sure?";
          var clickAction = attr.ngClick;
          element.bind('click',function (event) {
            if ( window.confirm(msg) ) {
              scope.$eval(clickAction)
            }
          });
        }
      };
    }
  ])
  .directive('dialogWindowNode', [ '$document', '$timeout', '$window', function( $document, $timeout, $window ) {
	var linkFn;
	linkFn = function link(scope, element, attr ) {
		$timeout(function(){
			var applicationContainer = document.querySelector('#slide-in-container-id');
			applicationContainer.appendChild(document.querySelector('.modalDialog'));
		} );
		
	}; 
		return {
			restrict: 'E',
			link: linkFn
	};
}]) 
  ;

