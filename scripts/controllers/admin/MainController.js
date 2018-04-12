/*
*
* MainController Module
*
* Description
*/

angular.module('MainController', ['angular.modal', 'AuthModel', 'CommonModel', 'cfp.loadingBar'])
.controller('MainController', ['$rootScope', '$scope', '$state', '$stateParams', '$location', '$localStorage', '$modal', 'appConfig', 'AuthModel', 'CommonModel', 'cfpLoadingBar', 'QuploadProvider', 'CommonProvider', 
  function($rootScope, $scope, $state, $stateParams, $location, $localStorage, $modal, appConfig, AuthModel, CommonModel, cfpLoadingBar, QuploadProvider, CommonProvider) {

    // 初始化
    $rootScope.config = appConfig;

    // 路由发生变化时，title更新，监听布局的更新变化
    $scope.$on('$stateChangeSuccess', function () {
      $rootScope.title = $state.current.data.title || 'Wind - Admin';
      $rootScope.full = $state.current.data.full || false;
    });

    // 弹窗模块
    $rootScope.modal = {

      // 弹窗确认
      submit: function () {
        $modal.confirmSubmit();
      },

      // 弹窗取消
      cancel: function () {
        $modal.confirmCancel();
      },

      // 加载动画
      loading: function () {
        $modal.loading();
      },

      // 关闭加载动画
      closeLoading: function () {
        $modal.closeLoading();
      },

      // 关闭弹窗
      close: function () {
        $modal.closeCallback();
      },

      // 错误弹窗
      error: function (config) {
        $modal.error({
          message: config.message || 'error'
        });
      },

      // 图片预览
      imagePreview: function (url) {
        var img_url;
        if (url.indexOf('http') >= 0) {
          img_url = url;
        } else {
          img_url = $rootScope.config.fileUrl + url;
        }
        $modal.image({
          url: img_url
        });
      },
    };

    // 监听加载状态
    $rootScope.$on('cfpLoadingBar:loading', function(event, data) {
      // $rootScope.modal.loading();
    });

    // 监听加载完成状态
    $rootScope.$on('cfpLoadingBar:completed', function(event, data) {
      // $rootScope.modal.closeLoading();
    });

    // 地址栏路由拦截
    $rootScope.routeCheck = function () {
      if ($rootScope.routes && $rootScope.routes.indexOf($state.current.name) == -1) {
        $location.path('/index');
      }
    };

    // 全局路由监听（若跳转到无权访问的路由，则拦截至首页）
    $rootScope.$on('$stateChangeStart', function (event, toState, toParams, fromState, fromParams) {
      if (toState.name == 'login' || toState.name == 'forgot' || toState.name == 'register') return;
      if (!!$rootScope.routes && $rootScope.routes.indexOf(toState.name) == -1) {
        $location.path('/index');
      }
    });

    // 七牛文件上传方法绑定
    $rootScope.getThumbnail = QuploadProvider.getThumbnail;
    $rootScope.getStatic = QuploadProvider.getStatic;

    // 获取系统配置项
    // 请求配置信息
    $rootScope.getConfig = function (params) {
      var get_config = {};
      if (params.group) {
        get_config = {
          role: 'admin',
          is_front: 1,
          per_page: 100,
          parge: 1,
          group: params.group
        };
      };
      if (params.name) {
        get_config.name = params.name;
      };
      if (!get_config.name && !get_config.group) {
        return false;
      }

      CommonProvider.promise({
        model: CommonModel,
        method: get_config.name ? 'configByName' : 'config',
        params: get_config,
        success: function (config) {
          if (params.success) {
            params.success(config);
          }
        }
      });
    };

  }
]);