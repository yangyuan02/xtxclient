/**
*
* PublicService Module
*
* Description
*
*/
angular.module('PublicService', [])
.service('PublicService', ['$resource', 'appConfig',
  function ($resource, appConfig) {
    return $resource(appConfig.apiUrl + '/', {}, {

      // 清空缓存
      clearcache: {
        method: 'DELETE',
        url: appConfig.apiUrl + '/cache/:tag'
      },

    })
  }
]);