/*
* AuthController Module
*
* Auth模块，包括：用户登录、第三方用户登录、注册、找回密码
*
*/
angular.module('AuthController', ['angular.validation', 'angular.validation.rule', 'AuthModel'])
.controller('AuthController', ['$rootScope', '$scope', '$location', '$localStorage', '$state', '$timeout', '$interval', '$modal', '$window', 'AuthModel', 'CommonProvider', 'AuthProvider', 'CommonModel',
  function ($rootScope, $scope, $location, $localStorage, $state, $timeout, $interval, $modal, $window, AuthModel, CommonProvider, AuthProvider, CommonModel) {

    // 初始化
    // 获取绑定页所需的第三方用户数据
    $scope.thirdLoginInfo = $localStorage.thirdLoginInfo || false;
    $scope.verify = {
      text: '获取手机校验码',
      status: false,
      verifyed: false,
      phone: false,
      warning: false,
      message: ''
    };

    // 默认非绑定，非第三方
    $scope.auth = {
      mode: 'login',
      bind: false,
      auto: true,
      agree: true,
      success: false
    };

    $scope.user = {
      auto_login: true
    };

    // 登录 
    $scope.login = AuthProvider.login;

    // 注销
    $scope.logout = AuthProvider.logout;

    // 注册
    $scope.register = function (params) {
      CommonProvider.promise({
        model: AuthModel,
        method: 'register',
        params: $scope.user,
        success: function (auth) {
          $localStorage.token = auth.result;
          $rootScope.setTokenLimit();

          // 回调
          if (params.callback) {
            params.callback(auth);
            return false;
          };

          // 注册成功
          $modal.success({ 
            message: '注册成功',
            callback: function () {
              AuthProvider.init();
              $location.path('/user/index');
            } 
          });
        },
        error: function (auth) {
          $modal.error({ message: auth.message });
        }
      });
    };

    // 登录并绑定
    $scope.bindLogin = function (params) {
      AuthProvider.login({
        user: $scope.user,
        callback: function (token) {
          $scope.thirdBind({ bind: false, modal: params.modal || false });
        }
      });
    };

    // 注册并绑定
    $scope.bindRegister = function (params) {
      $scope.register({ 
        callback: function (token) {
          $scope.thirdBind({ bind: false, modal: params.modal || false });
        }
      });
    };

    // 找回密码
    $scope.forgot = function () {
      CommonProvider.promise({
        model: AuthModel,
        method: 'forgot',
        params: $scope.user,
        success: function (auth) {
          $scope.auth.success = true;
          $timeout(function() {
            $location.path('/auth/login');
          }, 2000);
        },
        error: function (auth) {
          $modal.error({ message: auth.message });
        }
      });
    };

    // 获取验证码
    $scope.getVerifyCode = function (config) {

      if (!$scope.user.phone) return false;
      if (!!$scope.user.phone && $scope.user.phone.length != 11) return false;
      if (!!$scope.user.phone && isNaN(parseInt($scope.user.phone))) return false;
      if (!!$scope.verify.status) return false;

      $scope.verify.seconds = 60;
      var timePromise;
      var verifyTimimg = function(){
        timePromise = $interval(function(){
          $scope.verify.seconds -= 1;
          $scope.verify.status = true;
          $scope.verify.text = $scope.verify.seconds + '秒后重新获取';
          if ($scope.verify.seconds == 0) {
            $scope.verify.status = false;
            $scope.verify.text = '重新获取校验码';
          }
        }, 1000, $scope.verify.seconds);
        return timePromise;
      };

      CommonProvider.promise({
        model: CommonModel,
        method: 'sms',
        params: {
          rule: config.type == 'exist' ? 'check_mobile_exists' : 'check_mobile_unique',
          phone: $scope.user.phone
        },
        success: function (verify) {

          if (config.modal) $scope.verify.warning = false;
          if (!config.modal) $modal.success({ message: verify.message });

          // 倒计时
          verifyTimimg();
        },
        error: function (verify) {

          if (config.modal) {
            $scope.verify.warning = true;
            $scope.verify.message = verify.message;
          } else {
            $modal.error({ message: verify.message });
          }
        }
      });
    };

    // 获取第三方账户列表
    $scope.getThirdAccounts = function () {
      CommonProvider.promise({
        model: AuthModel,
        method: 'getThirds',
        success: function(accounts){
          $scope.third_accounts = accounts.result;
        }
      });
    };

    // 第三方登录
    $scope.thirdLogin = function (config) {

      // 参数
      if (config.provider == undefined) {
        return false;
      }

      // 轮询器
      var loginCodeCheckInterval;

      // 第三方配置
      var loginProviders = {
        qq: {
          name: 'qq',
          title: 'QQ授权登录',
          author_ization_endpoint: 'https://graph.qq.com/oauth2.0/authorize',
          required_url_params: {
            response_type: 'code',
            state: 'qq',
            client_id: '101277423',
            display: 'default',
            scope: 'get_user_info',
            redirect_uri: 'http://xuetianxia.cn/partials/home/auth/relay.html'
          },
          oauth_type: '2.0',
          popup_options: { width: 700, height: 520 }
        },
        weibo: {
          name: 'weibo',
          title: '微博授权登录',
          author_ization_endpoint: 'https://api.weibo.com/oauth2/authorize',
          required_url_params: {
            state: 'weibo',
            client_id: '3912473749',
            display: 'default',
            scope: '',
            redirect_uri: 'http://xuetianxia.cn/partials/home/auth/relay.html'
          },
          oauth_type: '2.0',
          popup_options: { width: 760, height: 570 }
        },
        wechat: {
          name: 'wechat',
          title: '微信授权登录',
          author_ization_endpoint: 'https://open.weixin.qq.com/connect/qrconnect',
          required_url_params: {
            state: 'wechat',
            response_type: 'code',
            appid: 'wx0ed2dfdc25e8a274',
            scope: 'snsapi_login',
            redirect_uri: 'http://xuetianxia.cn/partials/home/auth/relay.html'
          },
          oauth_type: '2.0',
          popup_options: { width: 730, height: 530 }
        }
      }

      // 获取第三方账户判断结果
      var getLoginStatus = function (type, code) {
        CommonProvider.promise({
          model: AuthModel,
          method: 'thirdLogin',
          params: {
            type: type,
            code: code
          },
          result: function(user){

            // 用户已绑定，拿到了token和，将token存在本地
            if (user.code == 1) {

              // 如果是绑定页面，则弹出占用提示
              if (config.bind) {
                $modal.error({
                  message: '账户已被绑定',
                  info: '您的账户已和“' + user.result.name + '”绑定，请更换账户',
                  lazytime: 5
                });

              // 否则是第三方登录
              } else {

                // 存储token，并登录
                $localStorage.token = user.result;
                AuthProvider.init(function () {

                  // 如果是弹窗登录，则不再跳转，关闭弹窗并执行弹窗前事件，否则是登录页面，跳转到个人中心
                  if (config.modal) $rootScope.modal.close();
                  if (!config.modal) $location.path('user/index');
                });
              }

            // 如果用户未绑定，此时拿到UID，头像名称信息，存储到本地
            } else if (user.code == 2) {

              $localStorage.thirdLoginInfo = user.result;
              $scope.thirdLoginInfo = $localStorage.thirdLoginInfo;

              // 绑定页面，则执行绑定请求
              if (config.bind) $scope.thirdBind(config);

              // 登录页面
              if (!config.bind) {

                // 弹窗登录，更改当前弹窗的状态为绑定状态
                if (config.modal) $scope.auth.bind = true;

                // 页面登录，则跳转到绑定页面
                if (!config.modal) {
                  $location.path('auth/bind');
                }
              }

            // 参数有问题，需要重新登录
            } else {
              $modal.error({ message: '参数异常，请稍后重试' });
            }

            // 删除存储数据
            delete $localStorage.thirdLoginCode;
          }
        });
      };

      // 检查code是否获取成功
      var checkLoginCode = function () {

        // 如果找到则取消定时器
        if ($localStorage.thirdLoginCode) {
          var thirdLoginCode = $localStorage.thirdLoginCode;
          var type = loginProviders[config.provider].name;
          var code = thirdLoginCode[loginProviders[config.provider].required_url_params.state];
          // 获取用户的登录结果判断
          getLoginStatus(type, code);
          clearInterval(loginCodeCheckInterval);
        }
      };

      // 弹窗模块
      var loginPopup = function (provider_name) {
        // 弹窗配置
        var popup_config = loginProviders[provider_name];
        if (!popup_config) {
          return false;
        }
        popup_config.popup_options.top = ($window.outerHeight - popup_config.popup_options.height) / 2;
        popup_config.popup_options.left = ($window.outerWidth - popup_config.popup_options.width) / 2;
        var popup_url = [popup_config.author_ization_endpoint, query_format(popup_config.required_url_params)].join('?');
        var popup_title = popup_config.title;
        var popup_options = query_format(popup_config.popup_options, ',');
        // 弹窗
        $window.open(popup_url, popup_title, popup_options);
        // 每1秒检查一次本地code
        loginCodeCheckInterval = setInterval(checkLoginCode, 1000);
      };

      // url参数格式化
      var query_format = function(params, delimiter) {
        var delimiter = delimiter || '&';
        var str = [];
        angular.forEach(params, function(value, key) {
          str.push(encodeURIComponent(key) + '=' + value);
        });
        return str.join(delimiter);
      };

      // 执行检查
      loginPopup(config.provider);
    };

    // 第三方绑定
    $scope.thirdBind = function (config) {

      // 从本地获取第三方用户数据
      if ($localStorage.thirdLoginInfo) $scope.thirdLoginInfo = $localStorage.thirdLoginInfo;
      if (!$localStorage.thirdLoginInfo) return console.log('本地缺少用户基本信息');

      // 确定地址
      var third_type_code = $scope.thirdLoginInfo.type;
      var third_type = function () {
        switch (third_type_code) {
          case 1:
            return 'weibo';
            break;
          case 2:
            return 'qq';
            break;
          case 3:
            return 'wechat';
            break;
          default:
            return '';
            break;
        }
      }

      // 参数检查
      if (!third_type()) {
        return false;
      };

      CommonProvider.promise({
        model: AuthModel,
        method: 'thirdBind',
        params: { 
          type: third_type(),
          body: {
            open_id: $scope.thirdLoginInfo.open_id,
            randomstr: $scope.thirdLoginInfo.randomstr
          } 
        },
        success: function(account){

          // 绑定成功，删除本地的第三方用户信息
          delete $localStorage.thirdLoginInfo;

          // 如果是在第三方绑定页面，则不跳转而是刷新列表
          if (config.bind) $modal.success({ message: account.message, callback: $scope.getThirdAccounts });
          if (!config.bind) {

            // 如果是弹窗登录页，则关闭窗口，并执行弹窗前回调
            if (config.modal) {
              // console.log('总之弹窗第三方绑定成功，应该还没有登录');
              AuthProvider.init();
              $modal.closeCallback();
            };

            // 否则是单页登录，进入个人中心
            if (!config.modal) $location.path($rootScope.redirect || 'user/index');
          }
        },
        error: function (account) {

          // 第三方绑定失败
          if (config.modal) console.log(account.message);
          if (!config.modal) $modal.error({ message: account.message });
        }
      });
    };

    // 第三方解绑
    $scope.thirdUnbind = function (account) {
      $modal.confirm({
        title: '请确认操作',
        message: '您确定要解除与' + account.type_name + '用户“' + account.name + '”的绑定吗？',
        button: {
          confirm: '确定',
          cancel: '取消'
        },
        onsubmit: function () {
          CommonProvider.promise({
            model: AuthModel,
            method: 'thirdUnbind',
            params: { id: account.id },
            success: function(account){
              $modal.success({ message: account.message });
              $scope.getThirdAccounts();
            },
            error: function () {
              $modal.error({ message: account.message });
            }
          });
        }
      });
    };
    
  }
]);
