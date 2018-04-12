/*
*
* AsideController Module
*
* Description 
* 
*/
angular.module('AsideController', [])
.controller('AsideController', ['$rootScope', '$scope', '$state', '$stateParams', '$location',
  function ($rootScope, $scope, $state, $stateParams, $location) {

    // 初始化
    $scope.default_active = false;

    // Active缺省
    $scope.defaultActive = function () {
      $scope.default_active = !$state.current.parent;
    };

    // 初始化自执行
    $scope.defaultActive();

    // 地址栏变更后
    $scope.$on('$stateChangeSuccess', function (event, next, current) {
      $scope.state = $state.current;
      $scope.defaultActive();
    });

  }
]);