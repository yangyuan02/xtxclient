/**
*
* LinkService Module
*
* Description
*
*/
angular.module('LinkService', [])
.service('LinkService', ['$resource', 'appConfig',
  function ($resource, appConfig) {
    return $resource(appConfig.apiUrl + '/link', {}, {

      // 获取单个链接
      item: {
        method: 'GET',
        url: appConfig.apiUrl + '/link/:link_id'
      },

      // 修改单个链接
      put: {
        method: 'PUT',
        url: appConfig.apiUrl + '/link/:link_id'
      },

      // 删除单个链接
      del: {
        method: 'DELETE',
        url: appConfig.apiUrl + '/link/:link_id'
      },

    })
  }
]);