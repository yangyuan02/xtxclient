/**
* SectionModel Module
*
* Description
*/
angular.module('SectionModel', ['SectionService'])

// 章节数据模型
.factory('SectionModel', ['SectionService', 'CommonProvider',
  function(SectionService, CommonProvider){

    var _section_list;
    var _section_item;
    var _section_model = {};

    _section_model = {

      // 获取课程列表
      get: function (params) {
        params.page = params.page || 1;
        params.per_page = params.per_page || 20;
        return CommonProvider.request({
          method: 'get',
          service: new SectionService(),
          params: params,
          success: function (_section_lists) {
            _section_list = _section_lists;
          }
        });
      },

      // 添加章节
      add: function (section) {
        return CommonProvider.request({
          method: 'save',
          service: new SectionService(section)
        });
      },

      // 修改章节
      put: function (section) {
        return CommonProvider.request({
          method: 'put',
          service: new SectionService(section),
          params: { section_id: section.id, role: section.role }
        });
      },

      // 删除章节
      del: function (params) {
        return CommonProvider.request({
          method: 'del',
          service: new SectionService(),
          params: params
        });
      },

      // 批量删除章节
      delete: function (ids) {
        return CommonProvider.request({
          method: 'delete',
          service: new SectionService(),
          params: { ids: ids.join(',') }
        });
      },

      // 获取单个课程信息
      item: function (params) {
        return CommonProvider.request({
          method: 'item',
          service: new SectionService(),
          params: params,
          success: function (section_item) {
            _section_item = section_item.result;
          }
        });
      },

      // 更新排序
      sort: function (sorts) {
        return CommonProvider.request({
          method: 'update',
          service: new SectionService(),
          body: { data: sorts }
        });
      },

      // 更新播放记录
      postStudyRecord: function (params) {
        return CommonProvider.request({
          method: 'postStudyRecord',
          service: new SectionService(),
          params: params
        });
      },

      // 获取视频地址
      getVideos: function (params) {
        return CommonProvider.request({
          method: 'getVideos',
          service: new SectionService(),
          params: params
        });
      },

      // 获取问答列表
      getQuestions: function (params) {
        return CommonProvider.request({
          method: 'getQuestions',
          service: new SectionService(),
          params: params
        });
      },

      // 初始化直播节
      initLiveSection: function (params) {
        return CommonProvider.request({
          method: 'initLiveSection',
          service: new SectionService(),
          params: params
        });
      },

      // 关闭直播节
      closeLiveSection: function (params) {
        return CommonProvider.request({
          method: 'closeLiveSection',
          service: new SectionService(),
          params: params
        });
      },

      // 获取推流地址
      getLiveUpstream: function (params) {
        return CommonProvider.request({
          method: 'getLiveUpstream',
          service: new SectionService(),
          params: params
        });
      },

    };

    return _section_model;
  }
])
