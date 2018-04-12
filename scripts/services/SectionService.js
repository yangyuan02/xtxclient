/**
*
* SectionService Module
*
* Description
*
*/
angular.module('SectionService', [])
.service('SectionService', ['$resource', 'appConfig',
  function ($resource, appConfig) {
    return $resource(appConfig.apiUrl + '/section', {}, {

      // 修改资源
      update: {
        method: 'PUT',
        url: appConfig.apiUrl + '/section'
      },

      // item
      item: {
        method: 'GET',
        url: appConfig.apiUrl + '/section/:section_id'
      },

      // 修改章节
      put: {
        method: 'PUT',
        url: appConfig.apiUrl + '/section/:section_id'
      },

      // 删除章节
      del: {
        method: 'DELETE',
        url: appConfig.apiUrl + '/section/:section_id'
      },

      // 更新学习记录
      postStudyRecord: {
        method: 'POST',
        url: appConfig.apiUrl + '/section/:section_id/study_record'
      },

      // 获取视频地址
      getVideos: {
        method: 'GET',
        url: appConfig.apiUrl + '/section/:section_id/videos'
      },

      // 获取问答列表
      getQuestions: {
        method: 'GET',
        url: appConfig.apiUrl + '/section/:section_id/questions'
      },

      // 初始化直播间
      initLiveSection: {
        method: 'GET',
        url: appConfig.apiUrl + '/section/:section_id/live_init'
      },

      // 关闭直播间
      closeLiveSection: {
        method: 'GET',
        url: appConfig.apiUrl + '/section/:section_id/live_finish'
      },

      // 获取推流地址
      getLiveUpstream: {
        method: 'GET',
        url: appConfig.apiUrl + '/section/:section_id/live_upstream'
      },

    })
  }
]);