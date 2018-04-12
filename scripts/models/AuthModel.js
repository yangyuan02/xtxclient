/*
* 用户授权模型
*
* Description
*/

angular.module('AuthModel', ['AuthService'])

// 用户数据处理模块
.factory('AuthModel', ['AuthService', 'CommonProvider', '$localStorage',
  function (AuthService, CommonProvider, $localStorage) {

    // 初始化
    var _auth_model = {

    // 登录
    login: function (user) {
      return CommonProvider.request({
        method: 'login',
        service: new AuthService(user)
      });
    },

    // 退出
    logout: function (user) {
      return CommonProvider.request({
        method: 'logout',
        service: new AuthService()
      });
    },

    // 注册
    register: function (user) {
      return CommonProvider.request({
        method: 'register',
        service: new AuthService(user)
      });
    },

    // 找回密码
    forgot: function (user) {
      return CommonProvider.request({
        method: 'forgot',
        service: new AuthService(user)
      });
    },

    // 检验
    check: function () {
      return CommonProvider.request({
        method: 'check',
        service: new AuthService(),
        error: function (err) {
          if (err.status == 401) {
            delete $localStorage.user;
            delete $localStorage.token;
          }
        }
      });
    },

    // 菜单
    menu: function () {
      return CommonProvider.request({
        method: 'menu',
        service: new AuthService()
      });
    },

    // 重置密码
    reset: function (password) {
      return CommonProvider.request({
        method: 'reset',
        service: new AuthService(password)
      });
    },

    // 获取第三方账户列表
    getThirds: function () {
      return CommonProvider.request({
        method: 'getThirds',
        service: new AuthService()
      });
    },

    // 第三方登录
    thirdLogin: function (params) {
      return CommonProvider.request({
        method: 'thirdLogin',
        service: new AuthService(),
        params: params
      });
    },

    // 第三方绑定
    thirdBind: function (params) {
      return CommonProvider.request({
        method: 'thirdBind',
        service: new AuthService(params.body),
        params: { type: params.type }
      });
    },

    // 第三方解绑
    thirdUnbind: function (params) {
      return CommonProvider.request({
        method: 'thirdUnbind',
        service: new AuthService(),
        params: params
      });
    },

    };

    return _auth_model;
  }
]);
