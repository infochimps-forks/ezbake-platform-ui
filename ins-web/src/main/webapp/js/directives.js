'use strict';

/* Directives */


angular.module('registration.directives', [])
  
.directive('ngConfirmClick', [ '$location', function($location) {
	return {
		restrict: 'A',
		priority: 1,
		modal: true,
		scope: {
			callbackYes: '&',
			callbackNo: '&'
		},
		
		link: function(scope, element, attr) {
			var msg = attr.ngConfirmClick || "Are you sure?";
			element.on('click', function() {
				$('#dialog').dialog({
					show: 'fade',
					autoOpen: true,
					modal: true,
					width: 400,
					title: "Confirm",
					buttons: [
						{
							text: "Yes",
							click: function() {
								if(scope.callbackYes({})) {
									scope.$apply(function(){scope.callbackYes({});});	
								}
								$( this ).dialog( "close" );
							}
						},
						{
							text: "No",
							click: function() {
								if(scope.callbackNo({})) {
									scope.$apply(function(){scope.callbackNo({});});
								};
								$(this).parent().fadeOut(500);
								$( this ).dialog( "close" );
							}
						}
					]
				}).text(msg);
			});
		}
	};
}])


.directive('dialogWindowNode', [ '$document', '$timeout', '$window', function( $document, $timeout, $window ) {
	var linkFn;
	linkFn = function link(scope, element, attr ) {
		$timeout(function(){
			var applicationContainer = document.querySelector('#slide-in-container-id');
			applicationContainer.appendChild(document.querySelector('.dialogWindowClass'));
		} );
		
	}; 
		return {
			restrict: 'E',
			link: linkFn
	};
}])

.directive('fileModel', ['$parse', function ($parse) {
    return {
        restrict: 'A',
        link: function(scope, element, attrs) {
            var model = $parse(attrs.fileModel);
            var modelSetter = model.assign;

            element.bind('change', function(){
                scope.$apply(function(){
                    modelSetter(scope, element[0].files[0]);
                });
            });
        }
    };
}])

.directive('autoComplete', ['$timeout', function ($timeout) {
    return {
        restrict: 'AE',
        replace: true,
        templateUrl: 'partials/directive-templates/autocomplete.html',
        link: function(scope, element, attrs) {
            scope.acTitle = attrs.title;
            scope.inputField = attrs.inputFieldClass;
            scope.inputLabel = attrs.inputLabelClass;
            scope.inputShort = attrs.inputShortClass;
            if (!scope.actualValues && !scope.possibleValues) {
                $(element).children().children("input").tagit();
            }
            scope.$watch('actualValues', function(item) {
                if (item) {
                    $timeout(function() {
                        $(element).children().children("input").tagit(
                            {   availableTags: scope.possibleValues || [],
                                beforeTagAdded: function(event, ui) {
                                    if (angular.isDefined(scope.possibleValues) && $.inArray(ui.tagLabel, scope.possibleValues) == -1) {
                                        return false;
                                    }
                                }
                            });
                    });
                }
            });
        },
        scope: {
            actualValues: "=",
            possibleValues: "="
        }
    };
}]);