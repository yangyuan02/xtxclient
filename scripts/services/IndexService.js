/**
*
* IndexService Module
*
* Description
*/
angular.module('IndexService', [])
.service('IndexService', ['$resource', 'appConfig',
  function($resource, appConfig){
    return $resource(appConfig.apiUrl + '/index', {}, {

      // 获取合作机构
      partners: {
        method: 'GET',
        url: appConfig.apiUrl + '/partner'
      },

      // 修改配置
      put: {
        method: 'PUT',
        url: appConfig.apiUrl + '/index/:config_id'
      },


    });
  }
]);