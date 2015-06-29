var wh = wh || {};

wh.app = angular.module("whApp",
    [
      'ui.router', 
      'ui.bootstrap', 
      'toaster',
      'ngMockE2E'
    ]
  );

/**
 * <p>Returns true if the given obj parameter is neither undefined
 * nor null. Returns false if the given obj parameter is undefined
 * or null.</p>
 * 
 * @param   obj {Object} An object or element.
 * @return  true if obj has a value and false if obj is undefined
 *          or null.
 */
wh.isNone = function(obj) {

   return (obj===undefined || obj===null); 
};

/**
 * <p>Returns true if obj is of type string and it has an empty
 * string value. In addition, returns true if obj is undefined or
 * null. Returns false in all other cases.
 * 
 * @param   obj An object or element.
 * @return  true if obj is an empty string or if obj is undefined or
 *          null; false otherwise.
 */
wh.isEmpty = function(obj) {

   if (wh.isNone(obj)) return true;

   if (typeof obj == "string") {
      return $.trim(obj).length == 0;
   }

   return false;
};
