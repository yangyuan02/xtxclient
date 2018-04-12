/*
*
* 监听滚动至底 
*
* Description
* 适用于协议阅读状态监听
*
*/

angular.module('ScrolledDirective', [])

.directive('whenScrolled', function() {
  return function(scope, element, attrs) {
    var raw = element[0];
    // if (raw.scrollHeight <= raw.offsetHeight) eval('scope.' + attrs.whenScrolled);
    element.bind('scroll', function() {
      if (raw.scrollTop + raw.offsetHeight >= raw.scrollHeight) {
        // 滚动到底后自动回调
        scope.$apply(attrs.whenScrolled);
      } 
    }); 
  }; 
})