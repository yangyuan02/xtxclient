/*
*
* 返回顶部模块 
*
* Description
*
*/

angular.module('TotopDirective', [])

// 返回顶部
.directive('goToTop', function($window) { 
  return {
    replace: true,
    restrict: 'A',
    template: '<a href="" class="go-to-top"><i class="icon icon-to-top"></i></a>',
    link: function (scope, element, attrs) {

      var window_height = $window.innerHeight;

      // 监听window窗口变化
      angular.element($window).bind('resize', function() {
        window_height = $window.innerHeight;
      })

      // 初次初始化
      if ($window.pageYOffset <= (window_height / 2)) {
        element.removeClass('display');
        element.addClass('none');
        element.prev().addClass('is-top');
      }

      // 绑定winodw滑动监听
      angular.element($window).bind('scroll', function() {
        if ($window.pageYOffset <= (window_height / 2)) {
          element.removeClass('display');
          element.addClass('none');
          element.prev().addClass('is-top');
        } else {
          element.removeClass('none');
          element.addClass('display');
          element.prev().removeClass('is-top');
        }
      })

      // 绑定回顶部事件
      element.bind('click', function () {
        var scrollTo = function (element, to, duration) {
        if (duration <= 0) return;
        var difference = to - element.scrollTop;
        var perTick = difference / duration * 10;
        setTimeout(function() {
          element.scrollTop = element.scrollTop + perTick;
          if (element.scrollTop == to) return;
          scrollTo(element, to, duration - 10);
        }, 10);
      };
      scrollTo(document.body, 0, 300);
      })

    }
  }
})