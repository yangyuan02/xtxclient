/*
*
* 会员服务模块 
*
* Description
*
*/
angular.module('AuthService', [])

.service('AuthService', ['$resource', 'appConfig',
  function ($resource, appConfig) {
    return $resource(appConfig.apiUrl + '/account/login', {}, {

      // 登录
      login: {
        method: 'POST',
        url: appConfig.apiUrl + '/account/login'
      },

      // 退出
      logout: {
        method: 'GET',
        url: appConfig.apiUrl + '/account/logout'
      },

      // 注册
      register: {
        method: 'POST',
        url: appConfig.apiUrl + '/account/register'
      },

      // 找回密码
      forgot: {
        method: 'PUT',
        url: appConfig.apiUrl + '/account/password/forget'
      },

      // 修改密码
      reset: {
        method: 'PUT',
        url: appConfig.apiUrl + '/account/password/reset'
      },

      // 检查登录
      check: {
        method: 'GET',
        url: appConfig.apiUrl + '/account/probe_login'
      },

      // 获取权限（菜单）
      menu: {
        method: 'GET',
        url: appConfig.apiUrl + '/account/menu'
      },

      // 获取账户绑定列表
      getThirds: {
        method: 'GET',
        url: appConfig.apiUrl + '/account/social'
      },

      // 第三方登录
      thirdLogin: {
        method: 'GET',
        url: appConfig.apiUrl + '/account/social/login/:type'
      },

      // 第三方绑定
      thirdBind: {
        method: 'POST',
        url: appConfig.apiUrl + '/account/social/:type'
      },

      // 第三方解绑
      thirdUnbind: {
        method: 'DELETE',
        url: appConfig.apiUrl + '/account/social/:id'
      },
      
    });
  }
]);