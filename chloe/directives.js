'use strict';

/* Directives */
angular.module('BarryWidget.directives', []).
  directive('dropX', function($compile) {
    return {
      restrict: 'A',
      link: function(scope, element, attrs) {
        scope.menuvisible = false;
        var template = element.find('.drop-x-template');
        template.remove();
        template = template.children().remove();
        $compile(template)(scope);
        $('body').append(template);
        element.draggable({
          cursor: 'crosshair',
          distance: 20
        }).click(function(event) {
          template.css({left:event.pageX,top:event.pageY});
          scope.$apply(scope.menuvisible = !scope.menuvisible)
        });
      }
    }
  }).
  directive('draggable', function() {
    return {
      restrict: 'A',
      link: function(scope, element, attrs) {
        element.draggable({
          cursor: 'crosshair'
        });
      }
    }
  }).
  directive('droppable', function() {
    return {
      restrict: 'A',
      link: function(scope, element, attrs) {
        var afterDrop = scope.$eval(attrs['droppable']);
        if (!afterDrop) {
          afterDrop = function() {
            console.log(element.html() + " has no afterDrop function.");
          };
        }
        element.droppable({
          hoverClass: 'hover',
          drop: function(event,ui) {
            afterDrop(element, ui.draggable);
          }
        });
      }
    }
  });