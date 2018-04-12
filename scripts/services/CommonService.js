/*
*
* 全局服务模块 
*
* Description
*
*/
angular.module('CommonService', [])

.service('CommonService', ['$resource', 'appConfig',
  function ($resource, appConfig) {
    return $resource(appConfig.apiUrl + '/', {}, {

      // 获取短信
      sms: {
        method: 'GET',
        url: appConfig.apiUrl + '/sms/verify_code/:rule/:phone'
      },

      // 获取树形地区
      area: {
        method: 'GET',
        url: appConfig.apiUrl + '/area'
      },

      // 获取配置
      config: {
        method: 'GET',
        url: appConfig.apiUrl + '/config'
      },

      // 获取配置（通过别名）
      configByName: {
        method: 'GET',
        url: appConfig.apiUrl + '/config/name/:name'
      },

      /*

      // 更新token（延时）
      update_token: {
        method: 'GET',
        url: appConfig.apiUrl + '/user/refresh_token'
      },

      // 获取一个资源
      getResource: {
        method: 'GET',
        url: appConfig.fileUrl + '/:url'
      },

      // 轮询消息提示
      get_msg_count: {
        method: 'GET',
        params: {
          token: '@token'
        },
        url: appConfig.apiUrl + '/user/unread_count'
      }

      */
      
    });
  }
]);