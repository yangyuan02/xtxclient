/*
*
* 课程列表模块 
*
* Description
*
*/

angular.module('CourseListDirective', [])

// 返回顶部
.directive('courseList', function($window) { 
  return {
    scope: { courses: '=courseList' },
    replace: true,
    restrict: 'A',
    templateUrl: 'partials/home/course/list-item.html',
    link: function (scope, element, attrs) {
      // console.log(scope);
      // console.log(element);
      // console.log(attrs);
    }
  }
})