/**
*
* AnnouncementModel Module
*
* Description
*
*/
angular.module('AnnouncementModel', ['AnnouncementService'])

// 课程数据模型
.factory('AnnouncementModel', ['AnnouncementService', 'CommonProvider',
  function(AnnouncementService, CommonProvider){

    var _announcement_list;
    var _announcement_model = {

      // 获取公告列表
      get: function (params) {
        return CommonProvider.request({
          method: 'get',
          service: new AnnouncementService(),
          params: params,
          success: function (announcement_list) {
            _announcement_list = announcement_list;
          }
        });
      },

      // 删除单条公告
      del: function (params) {
        return CommonProvider.request({
          method: 'del',
          service: new AnnouncementService(),
          params: params,
          success: function (_announcement) {
            var remove_item = _announcement_list.result.find(params.announcement_id, 'id');
            _announcement_list.result.remove(remove_item);
            _announcement_list.pagination.total -= 1;
          }
        });
      },

      // 批量删除公告
      delete: function (ids) {
        return CommonProvider.request({
          method: 'delete',
          service: new AnnouncementService(),
          params: { ids: ids.join(',') },
          success: function (_feedback) {
            _announcement_model.get({ page: _announcement_list.pagination.current_page });
          }
        });
      },

      // 修改单条公告
      put: function (params) {
        return CommonProvider.request({
          method: 'put',
          service: new AnnouncementService(params.body),
          params: {
            role: params.role,
            announcement_id: params.body.id
          }
        });
      },

      // 新增单条公告
      add: function (params) {
        return CommonProvider.request({
          method: 'save',
          service: new AnnouncementService(params.body),
          params: {
            role: params.role,
          }
        });
      },

    }

    return _announcement_model;
  }
]);