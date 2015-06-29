describe('Warehaus controllers', function() {
   beforeEach(module('warehausApp'));
     
   describe('WarehausListController', function(){
     
      it('should create "feed" model with 4 feeds', inject(function($controller) {
         var scope = {},
         ctrl = $controller('WarehausListController', { $scope: scope });
     
         expect(scope.feeds.length).toBe(4);
      }));
   });
});