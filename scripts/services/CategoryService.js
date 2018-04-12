/**
* CategoryService Module
*
* Description
*/
angular.module('CategoryService', [])

.service('CategoryService', ['$resource', 'appConfig',
  function($resource, appConfig){
    return $resource(appConfig.apiUrl + '/category', {
        per_page: '@per_page',
        page: '@page',
      }, {

      // 根据id获取子分类
      getChildrens: {
        method: 'GET',
        url: appConfig.apiUrl + '/category/:category_id'
      },

      // 编辑分类
      put: {
        method: 'PUT',
        url: appConfig.apiUrl + '/category/:category_id'
      },

      // 删除分类
      del: {
        method: 'DELETE',
        url: appConfig.apiUrl + '/category/:category_id'
      },

      // 批量禁用
      disable: {
        method: 'PUT',
        url: appConfig.apiUrl + '/category/disable'
      },

      // 批量启用
      enable: {
        method: 'PUT',
        url: appConfig.apiUrl + '/category/enable'
      },

      // 批量操作
      sort: {
        method: 'PUT',
        url: appConfig.apiUrl + '/category'
      }


    });
  }
]);