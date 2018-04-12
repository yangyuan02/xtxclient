/**
*
* ArticleModel Module
*
* Description
*
*/
angular.module('ArticleModel', ['ArticleService'])

// 文章数据模型
.factory('ArticleModel', ['ArticleService', 'CommonProvider',
  function(ArticleService, CommonProvider){

    var _article = {};
    var _article_list;
    var _article_item;
    var _article_model = {};

    _article_model = {

      // 获取文章列表
      get: function (params) {
        params.page = params.page || 1;
        params.per_page = params.per_page || 20;
        return CommonProvider.request({
          method: 'get',
          service: new ArticleService(),
          params: params,
          success: function (_article_lists) {
            _article_list = _article_lists;
          }
        });
      },

      // 发布文章
      add: function (article) {
        return CommonProvider.request({
          method: 'save',
          service: new ArticleService(article)
        });
      },

      // 获取单条文章详情
      item: function (params) {
        return CommonProvider.request({
          method: 'item',
          service: new ArticleService(),
          params: params,
          success: function (_article_item) {
            _article.info = _article_item;
          }
        });
      },

      // 修改文章
      put: function (article) {
        return CommonProvider.request({
          method: 'put',
          service: new ArticleService(article),
          params: { article_id: article.id },
          success: function (_article) {
            return _article;
          }
        });
      },

      // 删除文章
      del: function (article) {
        return CommonProvider.request({
          method: 'del',
          service: new ArticleService(),
          params: { article_id: article.article.id },
          success: function (_article) {
            _article_list.result.remove(article.article);
            _article_list.pagination.total -= 1;
          }
        });
      },

      // (批量)禁用文章
      disable: function (params) {
        var ids = params.length ? params.join(',') : params.article.id;
        return CommonProvider.request({
          method: 'disable',
          service: new ArticleService({ ids: ids }),
          success: function (_article) {
            if (params.length) {
              _article_model.get({ page: _article_list.pagination.current_page });
            } else {
              params.article.x_status = 0;
            }
          }
        });
      },

      // (批量)启用文章
      enable: function (params) {
        var ids = params.length ? params.join(',') : params.article.id;
        return CommonProvider.request({
          method: 'enable',
          service: new ArticleService({ ids: ids }),
          success: function (_article) {
            if (params.length) {
              _article_model.get({ page: _article_list.pagination.current_page });
            } else {
              params.article.x_status = 1;
            }
          }
        });
      },
    };
    
    return _article_model;
  }
])