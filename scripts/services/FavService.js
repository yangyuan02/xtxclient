/**
*
* FavoriteService Module
*
* Description
*
*/
angular.module('FavoriteService', [])
.service('FavoriteService', ['$resource', 'appConfig',
  function ($resource, appConfig) {
    return $resource(appConfig.apiUrl + '/favorite/:type/:target_id', {}, {

      // 获取收藏列表
      get: {
        method: 'GET',
        url: appConfig.apiUrl + '/favorite/:type'
      },

      // 获取收藏状态
      getStatus: {
        method: 'GET',
        url: appConfig.apiUrl + '/favorite/:type/status'
      }
      
    });
  }
])