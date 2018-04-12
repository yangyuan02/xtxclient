/**
*
* CategoryModel Module
*
* Description
*
*/
angular.module('CategoryModel', ['CategoryService'])

// 分类数据模型
.factory('CategoryModel', ['CategoryService', 'CommonProvider',
  function(CategoryService, CommonProvider){

    var _category_list;
    var _category_model = {};
    var _category_service = new CategoryService();

    _category_model = {

      // 获取分类列表
      get: function (params) {

        params.page = params.page || 1;
        params.per_page = params.per_page || 20;

        return CommonProvider.request({
          method: 'get',
          service: new CategoryService(),
          params: params,
          success: function (_lists) {
            _category_list = _lists;
          }
        });
      },

      // 根据分类ID获取下子列表
      childrens: function (params) {
        params.category_id = params.category_id || 0;
        params.children = params.children || 1;
        params.crumbs = params.crumbs || 1;

        return CommonProvider.request({
          method: 'getChildrens',
          service: _category_service,
          params: params,
          success: function (_lists) {
            _category_list = _lists;
          }
        });
      },

      // 添加分类
      add: function (category) {
        return CommonProvider.request({
          method: 'save',
          service: new CategoryService(category),
          success: function (_category) {
            _category_model.childrens({category_id: _category_list.result.id});
          }
        });
      },

      // 修改分类
      put: function (category) {
        return CommonProvider.request({
          method: 'put',
          service: new CategoryService(category.new),
          params: { category_id: category.new.id },
        });
      },

      // 删除分类
      del: function (category) {
        return CommonProvider.request({
          method: 'del',
          service: new CategoryService(),
          params: { category_id: category.category.id },
          success: function (_category) {
            _category_list.result.children.remove(category.category);
          }
        });
      },

      // 批量删除分类
      delete: function (ids) {
        return CommonProvider.request({
          method: 'delete',
          service: new CategoryService(),
          params: { ids: ids.join(',') },
          success: function (_category) {
            _category_model.childrens({category_id: _category_list.result.id});
          }
        });
      },

      // (批量)禁用课程
      disable: function (params) {
        var ids = params.length ? params.join(',') : params.category.id;
        return CommonProvider.request({
          method: 'disable',
          service: new CategoryService({ ids: ids }),
          success: function (_category) {
            if (params.length) {
              _category_model.childrens({category_id: _category_list.result.id});
            } else {
              params.category.x_status = 0;
            }
          }
        });
      },

      // (批量)启用课程
      enable: function (params) {
        var ids = params.length ? params.join(',') : params.category.id;
        return CommonProvider.request({
          method: 'enable',
          service: new CategoryService({ ids: ids }),
          success: function (_category) {
            if (params.length) {
              _category_model.childrens({category_id: _category_list.result.id});
            } else {
              params.category.x_status = 1;
            }
          }
        });
      },

      // 批量更新排序
      sort: function (params) {
        return CommonProvider.request({
          method: 'sort',
          service: new CategoryService(),
          body: { data: params },
        });
      }

    }

    return _category_model;
  }
]);