/*
*
* 加载动画模块 
*
* Description
*
*/

angular.module('LoadingDirective', [])

// 全局loading动画
.directive('loading', function() { 
  return {
    restrict: 'A',
    template: '<div></div><div></div><div></div>',
    link: function (scope, element, attrs) {
      if (!attrs.loading || attrs.loading == 'A') {
        angular.element(element).attr('class', 'loading ball-beat');
      } else if (attrs.loading == 'B') {
        angular.element(element).attr('class', 'loading line-spin-fade');
        angular.element(element).html('<div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div>');
      } else if (attrs.loading == 'C') {
        angular.element(element).attr('class', 'loading line-scale');
        angular.element(element).html('<div></div><div></div><div></div><div></div><div></div>');
      }
    }
  };
})