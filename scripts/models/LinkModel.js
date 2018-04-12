/**
*
* LinkModel Module
*
* Description
*
*/
angular.module('LinkModel', ['LinkService'])

// 友链模型
.factory('LinkModel', ['LinkService', 'CommonProvider',
  function(LinkService, CommonProvider){

    var _link_list;
    var _link_model = {

      // 获取友链列表
      get: function (params) {
        return CommonProvider.request({
          method: 'get',
          service: new LinkService(),
          params: params,
          success: function (_links) {
            _link_list = _links;
          }
        });
      },
      
      // 新增友链
      add: function (link) {
        return CommonProvider.request({
          method: 'save',
          service: new LinkService(link),
          success: function (_link) {
            _link_list.result.unshift(_link.result);
            _link_list.pagination.total += 1;
          }
        });
      },

      // 编辑友链
      put: function (link) {
        return CommonProvider.request({
          method: 'put',
          service: new LinkService(link),
          params: { link_id: link.id },
        });
      },

      // 删除友链
      del: function (link) {
        return CommonProvider.request({
          method: 'del',
          service: new LinkService(),
          params: { link_id: link.link.id },
          success: function (_link) {
            _link_list.result.remove(link.link);
            _link_list.pagination.total -= 1;
          }
        });
      },

      // 批量删除
      delete: function (ids) {
        return CommonProvider.request({
          method: 'delete',
          service: new LinkService(),
          params: { ids: ids.join(',') },
          success: function (_link) {
            _link_model.get({ page: _link_list.pagination.current_page });
          }
        });
      }

    };
    
    return _link_model;
  }
])