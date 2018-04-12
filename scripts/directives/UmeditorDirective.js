/**
* Umeditor Module
*
* Description
*/
angular.module('Umeditor', [])

.directive('umeditor', ['$timeout', function ($timeout) {
  // Runs during compile
  return {
    restrict: 'EA',
    require:'ngModel',
    scope:{},
    link: function(scope, element, attrs, controller) {
      var editor_id = attrs.id ? attrs.id : "_editor" + (Date.now());
      element[0].id = editor_id;
      var umeditor = UM.getEditor(editor_id);

      if (controller) {
        umeditor.addListener('contentChange',function(){
          $timeout(function (argument) {
            scope.$apply(function(){
              controller.$setViewValue(umeditor.getContent());
            });
          }, 0);
        });

        controller.$render = function(){
          $timeout(function () {
            if (controller.$viewValue != undefined) {
              umeditor.setContent(controller.$viewValue);
            }            
          }, 100);
        }
      }
    }
  };
}]);