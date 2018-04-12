/*
*
* 系统服务模块 
*
* Description
*
*/
angular.module('ConfigService', [])

// 系统配置资源服务
.service('SystemService', ['$resource', 'appConfig',
  function ($resource, appConfig) {
    return $resource(appConfig.apiUrl + '/config', {}, {

      // put
      putGroup: {
        method: 'PUT',
        url: appConfig.apiUrl + '/config'
      },

      // put
      putItem: {
        method: 'PUT',
        url: appConfig.apiUrl + '/config/:config_id'
      },

      // del
      del: {
        method: 'DELETE',
        url: appConfig.apiUrl + '/config/:config_id'
      }
      
    });
  }
])

// Log资源服务
.service('LogService', ['$resource', 'appConfig',
  function ($resource, appConfig) {
    return $resource(appConfig.apiUrl + '/log', {}, {

      // 清空日志
      clear: {
        method: 'DELETE',
        url: appConfig.apiUrl + '/log/all'
      }
    });
  }
])