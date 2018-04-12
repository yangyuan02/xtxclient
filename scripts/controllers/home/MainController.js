/**
* MainController Module
*
* Description
*/
angular.module('MainController', ['angular.modal', 'LinkModel', 'IndexModel', 'CategoryModel', 'TotopDirective', 'FeedbackModel'])
.controller('MainController', ['$rootScope', '$scope', '$stateParams', '$state', '$location', '$localStorage', '$anchorScroll', '$modal', '$window', '$timeout', 'appConfig', 'CommonProvider', 'AuthProvider', 'LinkModel', 'IndexModel', 'CategoryModel', 'CommonModel', 'FeedbackModel',
  function ($rootScope, $scope, $stateParams, $state, $location, $localStorage, $anchorScroll, $modal, $window, $timeout, appConfig, CommonProvider, AuthProvider, LinkModel, IndexModel, CategoryModel, CommonModel, FeedbackModel) {

    // 初始化
    $rootScope.config = appConfig;
    $scope.parseInt = parseInt;

    // 全局导航栏默认显示
    $rootScope.navBarHide = false;

    // 路由发生变化时，title更新
    $scope.$on('$stateChangeSuccess', function() {
      $rootScope.title = $state.current.data.title || $state.$current.parent.data.title || '';
    });

    // 全局模态弹窗模块
    $rootScope.modal = {

      // 登录
      login: function (callback) {
        $modal.custom({
          title: '登录/注册',
          template_url: '/partials/home/layout/login.html',
          callback: callback
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

      // 弹窗确认
      submit: function() {
        $modal.confirmSubmit();
      },

      // 弹窗取消
      cancel: function() {
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
      close: function() {
        $modal.closeCallback();
      },

      // 错误弹窗
      error: function (config) {
        $modal.error({
          message: config.message || 'error',
          info: config.info || ''
        });
      },

      // 反馈信息
      feedback: function () {
        $modal.custom({
          title: '反馈信息',
          template_url: '/partials/home/layout/feedback.html'
        });
      },
    };

    // 定义需要排除Loading动画的url关键字
    var exclude_api = ['partner', 'index', 'category', 'advertise', 'link', 'search/hot', 'follow', 'record'];

    // 监听加载状态
    $rootScope.$on('cfpLoadingBar:loading', function(event, data) {
      if (exclude_api.containStr(data.url)) $rootScope.modal.loading();
      if (!exclude_api.containStr(data.url)) $rootScope.modal.closeLoading();
    });

    // 监听加载完成状态
    $rootScope.$on('cfpLoadingBar:completed', function(event, data) {
      $rootScope.modal.closeLoading();
    });

    // 反馈信息
    $rootScope.postFeedback = function (feedback) {
      if (!feedback.content) return false;
      CommonProvider.promise({
        model: FeedbackModel,
        method: 'add',
        params: feedback,
        success: function(feedback){
          $rootScope.modal.close();
          $modal.success({ title: '反馈成功', message: '反馈成功，感谢你的支持' });
        },
        error: function (feedback) {
          $modal.error({ title: '反馈失败', message: feedback.message });
        }
      });
    };

    // 退出
    $scope.logout = AuthProvider.logout;

    // 锚点定位(传入元素ID)
    $rootScope.goTo = CommonProvider.goToDom;

    // 获取图片
    $rootScope.getThumbnail = CommonProvider.getThumbnail;

    // 第三方分享
    $rootScope.share = CommonProvider.share;

    // 返回顶部
    $rootScope.toTop = CommonProvider.toTop;

    // 判断登录状态：跳转、弹窗
    $rootScope.checkLogin = function (option) {
      if (!$localStorage.token) {
        if (option == 'modal') {
          $modal.custom({
            title: '登录',
            template_url: '/partials/home/layout/login.html',
          });
        } else {
          $location.path('auth/login');
        }
      }
    };

    // 获取友链
    $scope.getFriendLinks = function () {
      if (!!$localStorage.friendLinks) $scope.friendLinks = $localStorage.friendLinks;
      CommonProvider.promise({
        model: LinkModel,
        method: 'get',
        params: { 
          role: 'user',
          type: 1,
          page: 1,
          per_page: 100
        },
        success: function(links){
          $localStorage.friendLinks = links.result;
          $scope.friendLinks = links.result;
        }
      });
    };

    // 获取文章分类
    $scope.getArticleCates = function () {
      CommonProvider.promise({
        model: CategoryModel,
        method: 'get',
        params: { 
          role: 'student',
          type: 3,
          per_page: 100
        },
        success: function(articleCates){
          $scope.articleCates = articleCates.result;
        }
      });
    };

    // 请求配置信息
    $rootScope.getConfig = function (params) {
      var get_config = {};
      if (params.group) {
        get_config = {
          role: 'user',
          is_front: 1,
          per_page: 100,
          parge: 1,
          group: params.group
        };
      };
      if (params.name) {
        get_config.name = params.name;
      };
      if (!get_config.name && !get_config.group) return false;
      CommonProvider.promise({
        model: CommonModel,
        method: get_config.name ? 'configByName' : 'config',
        params: get_config,
        success: function(config){
          if (params.success) params.success(config);
        }
      });
    };

    // 全局获取当前日期
    $rootScope.date = new Date();

    // 时间器模块全局配置
    moment.locale('zh-cn', {
      relativeTime : {
        future: "%s",
        past:   "%s",
        s:  "刚刚",
        m:  "1分钟前",
        mm: "%d分钟前",
        h:  "1小时前",
        hh: "%d小时前",
        d:  "1天前",
        dd: "%d天前",
        M:  "1个月前",
        MM: "%d个月前",
        y:  "1年前",
        yy: "%d年前"
      }
    });

    $rootScope.moment = new moment();

    // 本地存储/更新token时间戳
    $rootScope.setTokenLimit = function (auto_login) {

      // 检查token有效期时间戳,如果不存在则创建(分钟)
      var token_limit = {};
      token_limit.start_time = new Date().getTime() / 1000 / 60;

      // 如果用户勾选了记住我长期登录，则时间为30天，否则为一天
      if (!!auto_login) token_limit.end_time = ($rootScope.date.getTime() / 1000 / 60) + 60*24*30;
      if (!auto_login) token_limit.end_time = ($rootScope.date.getTime() / 1000 / 60) + 60*24;

      // 若本地不存在，则创建
      if (!$localStorage.token_limit) $localStorage.token_limit = {};
      $localStorage.token_limit = token_limit;
    };

    // token检查及更新
    $rootScope.updateToken = function () {
      // 如果本地存在token,才执行此项
      if (!!$localStorage.token) {
        // 如果本地存储过数据，则读取数据判断
        if (!!$localStorage.token_limit) {
          // 如果token剩余的过期时间小于一小时
          if (($localStorage.token_limit.end_time - ($rootScope.date.getTime() / 1000 / 60)) <= 60) {
            // 且一小时内用户处于请求活跃状态
            if (($rootScope.date.getTime() / 1000 / 60) - $localStorage.token_limit.last_request < 60) {
              // 且10分钟内没有请求更新过token(或首次请求)
              if (($rootScope.date.getTime() / 1000 / 60) - $localStorage.token_limit.last_token_request > 10 || !$localStorage.token_limit.last_token_request) {
                // 则更换token
                // 首次更换请求完成后存储，防止多次请求
                $localStorage.token_limit.last_token_request = $rootScope.date.getTime() / 1000 / 60;
                Main.update_token({ token: $localStorage.token }, function (token) {
                  if (token.code == 1) {
                    $localStorage.token = token.result;
                    console.log('token就快过期，已执行了更换');
                    // 本地写入token新的起始时间
                    $localStorage.token_limit.start_time = $rootScope.date.getTime() / 1000 / 60;
                    // 新的token结束时间
                    $localStorage.token_limit.end_time = $rootScope.date.getTime() / 1000 / 60 + 60*24;
                    // 本地写入最后一次请求更新token的时间（覆盖）
                    $localStorage.token_limit.last_token_request = $rootScope.date.getTime() / 1000 / 60;
                  } else {
                    console.log(token.message);
                  }
                });
              }
            }
          }
        } else {
          // 否则创建空的
          $localStorage.token_limit = {};
        }
        // 每一次登录之后的请求向本地写入最后一次发出请求的时间
        $localStorage.token_limit.last_request = $rootScope.date.getTime() / 1000 / 60;
      };
    };

    // tab定位(传入目标tab下标)
    $rootScope.setTabActive =  CommonProvider.setTabActive;

    // 供子页面使用，在链接包含定位参数时定位文档
    $rootScope.setDomPosition = function (scope) {

      // 锚点定位
      if ($location.$$hash) {
        $rootScope.goTo($location.$$hash);
      };

      // TAB活动定位
      if ($location.$$search.tab) {
        $rootScope.setTabActive(scope, $location.$$search.tab);
      }
    };

  }
])