/**
 * 全局布局模块
 *
 * @description
 * AngularJS app Layout.
 */

angular.module('LayoutDirective', [])

// 头部
.directive('header', function() {
  return {
  restrict: 'E',
  templateUrl: 'partials/admin/layout/header.html'
  };
})

// 边栏
.directive('aside', function() {
  return {
  restrict: 'E',
  templateUrl: 'partials/admin/layout/sidebar.html'
  };
})

// 底部
.directive('footer', function() {
  return {
  restrict: 'E',
  templateUrl: 'partials/admin/layout/footer.html'
  };
})

// Remove ng-include tag
.directive('includeReplace', function () {
  return {
    require: 'ngInclude',
    restrict: 'A',
    link: function (scope, element, attrs) {
      element.replaceWith(element.children());
    }
  };
})