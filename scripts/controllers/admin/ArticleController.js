/**
* ArticleController Module
*
* Description
*/
angular.module('ArticleController', ['ArticleModel', 'CategoryModel', 'ArticleService'])
.controller('ArticleController', ['$scope', '$rootScope', '$state', '$stateParams', '$location', '$modal', 'ArticleModel', 'CategoryModel', 'ArticleService', 'CommonProvider', function($scope, $rootScope, $state, $stateParams, $location, $modal, ArticleModel, CategoryModel, ArticleService, CommonProvider) {

    /*----------------文章管理事件----------------*/
    $scope.filter = {};
    $scope.params = {};
    $scope.search = {};
    $scope.article_list = {};

    $scope.articleAction = {

      // 文章管理首页
      getIndex: function (page) {
        var _self = this;
        // 获取课程列表
        $scope.params = {
          role: 'admin',
          page: page || 1,
        };
        _self.getLists($scope.params);
      },

      // 获取列表数据
      getLists: function(params) {
        CommonProvider.promise({
          model: ArticleModel,
          method: 'get',
          params: params,
          success: function (article_list) {
            $scope.article_list = article_list;
          }
        });
      },

      // 获取文章分类列表
      getCategory: function () {
        var params = {
          role: 'admin',
          type: 3
        };
        CommonProvider.promise({
          model: CategoryModel,
          method: 'get',
          params: params,
          success: function (category_list) {
            $scope.category_list = category_list.result;
          }
        });
      },

      // 获取文章详情
      getItem: function () {
        CommonProvider.promise({
          model: ArticleModel,
          method: 'item',
          params: { article_id: $stateParams.article_id },
          success: function (article_item) {
            $scope.article = article_item.result;
          }
        });
      },

      // 文章不同状态筛选
      filterChanged: function () {
        var _self = this;
        var status = $scope.filter.status;
        !status ? delete $scope.params.status : $scope.params.status = status;
        _self.getLists($scope.params);
      },

      // 文章搜索
      getSearch: function () {
        var params = [{
          field: 'title',
          operation: 'like',
          value: $scope.search.keyword
        }, {
          field: 'content',
          operation: 'like',
          value: $scope.search.keyword
        }];
        CommonProvider.search({
          service: new ArticleService(),
          method: 'search',
          params: params,
          success: function (_article_list) {
            $scope.article_list = _article_list;
          }
        });
      },

      add: function () {
        CommonProvider.promise({
          model: ArticleModel,
          method: 'add',
          params: $scope.article,
          success: function (_article) {
            $modal.success({
              message: _article.message,
              callback: function () {
                $location.path('/article/manage/list/index');
              }
            });
          },
          error: function (_article) {
            $modal.error({
              message: _article.message
            });
          }
        });
      },

      // 编辑文章
      edit: function () {
        CommonProvider.promise({
          model: ArticleModel,
          method: 'put',
          params: $scope.article,
          success: function (_article) {
            $modal.success({
              message: _article.message,
              callback: function () {
                $location.path('/article/manage/list/index');
              }
            });
          },
          error: function (_article) {
            $modal.error({
              message: _article.message
            });
          }
        });
      },

      // 删除文章
      del: function (params) {
        if (params.batch && $scope.article_list.result.checked().length == 0) {
          $modal.error({ message: '至少需要选中一篇文章' });
          return false;
        };
        $modal.confirm({
          title: '确认删除',
          message: params.batch ? '确定要删除选中文章吗？' : '确定要删除此文章吗？',
          info: '文章删除后可在文章回收站中查看',
          onsubmit: function () {
            CommonProvider.promise({
              model: ArticleModel,
              method: params.batch ? 'delete' : 'del',
              params: params.batch ? $scope.article_list.result.checked() : params.article,
              success: function (_article) {
                $modal.success({
                  message: _article.message
                });
              },
              error: function (_article) {
                $modal.error({
                  message: _article.message
                });
              }
            });
          }
        });
      },

      // 禁用文章
      disable: function (params) {
        if (params.batch && $scope.article_list.result.children.checked().length == 0) {
          $modal.error({ message: '至少需要选中一个文章' });
          return false;
        };
        $modal.confirm({
          title: '确认操作',
          message: params.batch ? '确定要禁用选中文章吗？' : '确定要禁用此文章吗？',
          info: params.batch ? '禁用后这些文章将不再前台显示' : '禁用后该文章将不再前台显示',
          onsubmit: function () {
            CommonProvider.promise({
              model: ArticleModel,
              method: 'disable',
              params: params.batch ? $scope.article_list.result.children.checked() : params.article,
              success: function (_article) {
                $modal.success({
                  message: _article.message
                });
              },
              error: function (_article) {
                $modal.error({
                  message: _article.message
                });
              }
            });
          }
        });
      },

      // 启用文章
      enable: function (params) {
        if (params.batch && $scope.article_list.result.checked().length == 0) {
          $modal.error({ message: '至少需要选中一个文章' });
          return false;
        };
        $modal.confirm({
          title: '确认操作',
          message: params.batch ? '确定要启用选中文章吗？' : '确定要启用此文章吗？',
          info: params.batch ? '启用后这些文章将不再前台显示' : '启用后该文章将不再前台显示',
          onsubmit: function () {
            CommonProvider.promise({
              model: ArticleModel,
              method: 'enable',
              params: params.batch ? $scope.article_list.result.checked() : params.article,
              success: function (_article) {
                $modal.success({
                  message: _article.message
                });
              },
              error: function (_article) {
                $modal.error({
                  message: _article.message
                });
              }
            });
          }
        });
      },

    };
  }
]);