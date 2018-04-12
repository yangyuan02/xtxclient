/*
*
* 到达屏幕中心，添加指定class 
*
* FocusAddClassDirective
*
*/

angular.module('FocusAddClassDirective', [])

.directive('focusAddClass', function () {
  return {
    restrict: 'A',
    scope: {
      autoRemove: '=',
    },
    link: function (scope, element, attrs) {
      var mainFunc = function () {
        var windowHeight = $(window).height();
        var domTopGauge = element[0].getBoundingClientRect().top;
        var domHeight = element[0].clientHeight;
        var domInCenter = (0 < (domTopGauge + (domHeight / 2)) && (domTopGauge + (domHeight / 2)) < windowHeight);
        if (domInCenter) element.addClass(attrs.focusAddClass);
        if (!domInCenter && scope.autoRemove) element.removeClass(attrs.focusAddClass);
      };
      mainFunc();
      $(window).scroll(mainFunc);
    }
  };
})

.directive('autoScreenHeight', function () {
  return {
    restrict: 'A',
    link: function (scope, element, attrs) {
      // $('body').css('overflow', 'hidden');
      // console.log(element);
      var windowHeight;
      var heightPercentage = Number(attrs.heightPercentage) || 100;
      var mainFunc = function () {
        windowHeight = $(window).height();
        element.css('height', windowHeight / 100 * heightPercentage);
        if (heightPercentage != 100) element.css('marginTop', windowHeight / 100 * (( 100 - heightPercentage) / 2) + 'px');
      };
      mainFunc();
      $(window).resize(mainFunc);
      $(window).scroll(function () {
        return false;
      });
    }
  };
})