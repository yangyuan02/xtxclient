/**
*
* ArticleService Module
*
* Description
*
*/
angular.module('ArticleService', [])
.service('ArticleService', ['$resource', 'appConfig',
  function($resource, appConfig){
    return $resource(appConfig.apiUrl + '/article', {}, {

      // item
      item: {
        method: 'GET',
        url: appConfig.apiUrl + '/article/:article_id'
      },

      // put
      put: {
        method: 'PUT',
        url: appConfig.apiUrl + '/article/:article_id'
      },

      // search
      search: {
        method: 'GET',
        url: appConfig.apiUrl + '/article/search'
      },

      // 批量禁用
      disable: {
        method: 'PUT',
        url: appConfig.apiUrl + '/article/disable'
      },

      // 批量启用
      enable: {
        method: 'PUT',
        url: appConfig.apiUrl + '/article/enable'
      },

    });
  }
]);