/**
*
* SearchModel Module
*
* Description
*
*/
angular.module('SearchModel', ['SearchService'])

// 章节数据模型
.factory('SearchModel', ['SearchService', 'CommonProvider',
  function(SearchService, CommonProvider){

    var _search_model = {

      // 搜索
      get: function (params) {
        return CommonProvider.request({
          method: 'get',
          service: new SearchService(),
          params: params
        });
      },

      // 获取热词
      getHotWords: function (params) {
        return CommonProvider.request({
          method: 'getHotWords',
          service: new SearchService(),
          params: params
        });
      },

      // 保存热词
      putHotWords: function (hot_words) {
        return CommonProvider.request({
          method: 'putHotWords',
          service: new SearchService(hot_words),
        });
      },

      // 索引初始化
      searchInit: function (params) {
        return CommonProvider.request({
          method: 'searchInit',
          service: new SearchService(),
          params: { type: params.type }
        });
      },

      // 清空索引
      searchClean: function (params) {
        return CommonProvider.request({
          method: 'searchClean',
          service: new SearchService(),
          params: { type: params.type }
        });
      },

    };
    
    return _search_model;
  }
])