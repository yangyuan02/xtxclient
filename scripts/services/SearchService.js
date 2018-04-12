/**
*
* SearchService Module
*
* Description
*
*/
angular.module('SearchService', [])
.service('SearchService', ['$resource', 'appConfig',
  function ($resource, appConfig) {
    return $resource(appConfig.apiUrl + '/search/:search_type', {
      key: '@search_type'
    }, {

      // 全局搜索
      get: {
        method: 'GET',
        params: {
          page: '@page',
          detail: '@detail',
          keyword: '@keyword',
          per_page: '@per_page',
          category_id: '@category_id',
          sort_id: '@sort_id',
          labels: '@labels'
        },
        headers: { 'Content-Type': 'application/x-www-form-encoded;charset=UTF-8' }
      },

      // 获取搜索热词
      getHotWords: {
        method: 'GET',
        url: appConfig.apiUrl + '/search/hot'
      },

      // 保存搜索热词
      putHotWords: {
        method: 'PUT',
        url: appConfig.apiUrl + '/search/hot'
      },

      // 索引初始化
      searchInit: {
        method: 'GET',
        url: appConfig.apiUrl + '/search/:type/init'
      },

      // 清空索引
      searchClean: {
        method: 'GET',
        url: appConfig.apiUrl + '/search/:type/clean'
      },

    });
  }
]);