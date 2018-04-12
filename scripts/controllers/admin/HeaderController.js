/*
* HeaderController Module
*
* Description
*/

angular.module('HeaderController', [])
.controller('HeaderController', ['$rootScope', '$scope', '$state', '$stateParams', '$location',
  function ($rootScope, $scope, $state, $stateParams, $location) {

    // 更新边栏菜单
    $scope.asideMenusEvent = function () {
      if (!$rootScope.menus || !$rootScope.menus.length) return;
      if ($rootScope.menus.find) {
        $rootScope.aside_menus = $rootScope.menus.find($scope.current_slug || 'index', 'slug').children;
      } else {
        $rootScope.aside_menus = $rootScope.menus[0].children;
      };
      $scope.pagePermissionsEvent();
      
      // 如果当前在父页则跳转到第一个子页
      if (!$state.current.parent && $rootScope.aside_menus) {
        $location.path($rootScope.aside_menus[0].children[0].url);
      }
    };

    // 更新对应页面权限信息，并推送给父控
    $scope.pagePermissionsEvent = function () {
      if ($scope.current_node_slug) {
        $scope.node_permission = $rootScope.aside_menus.find($scope.current_node_slug, 'slug');
        if ($scope.node_permission && $scope.node_permission.children) {
          $rootScope.page_permission = $scope.node_permission.children.find($state.current.name, 'slug').children;
        }
      } else if ($rootScope.aside_menus && $rootScope.aside_menus[0] && $rootScope.aside_menus[0].children && $rootScope.aside_menus[0].children[0].children) {
        $rootScope.page_permission = $rootScope.aside_menus[0].children[0].children;
      }
      if ($rootScope.page_permission && $rootScope.page_permission.toObject) {
        $rootScope.page_permission = $rootScope.page_permission.toObject('slug');
        // console.log('当前页面权限信息：', $rootScope.page_permission);
      };
    };

    // 地址栏更新后
    $scope.$on('$stateChangeSuccess', function () {

      // 更新导航栏活动状态
      $scope.current_slug = ($state.current.name.indexOf('.') == -1 ) ? $state.current.data.slug : $state.current.name.substr(0, $state.current.name.indexOf('.'));
      $scope.current_node_slug = $state.current.name.substr(0, $state.current.name.indexOf('.', $state.current.name.indexOf('.') + 1 ));

      // 更新边栏菜单
      $scope.asideMenusEvent();
    });

    // 当权限数据初始化完毕时
    $scope.$on('permissionsChanged', function () {

      // 更新边栏菜单
      $scope.asideMenusEvent();
    });
  }
]);