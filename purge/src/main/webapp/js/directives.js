/**
 * @description
 * A component that executes logic as provided by the implementor whenever
 * the enter key up action occurs on the element.
 * 
 * @usage
 * <input wh-enterup="doSomething()">
 */
wh.app.directive('whEnterup', function() {
      return function(scope, element, attrs) {
         element.bind('keyup', function(event) {
            if (event.which == '13') {
               scope.$apply(attrs.whEnterup);
            }
         });
      };
   }
);

/**
 * @description
 * A component that executes logic as provided by the implementor whenever
 * the up action occurs on the given keys.
 * 
 * @usage
 * <input wh-keyup="doSomething()" keys="[27,13]">
 */
wh.app.directive('whKeyup', function() {
      return function(scope, element, attrs) {
         function applyKeyup() {
            scope.$apply(attrs.whKeyup);
         };
         
         var allowedKeys = scope.$eval(attrs.keys);
         element.bind('keyup', function(event) {
            if (!allowedKeys || allowedKeys.length == 0) {
                applyKeyup();
            } else {
                angular.forEach(allowedKeys, function(key) {
                    if (key == event.which) {
                        applyKeyup();
                    }
                });
            }
         });
      };
   }
);
