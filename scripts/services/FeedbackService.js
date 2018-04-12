/**
*
* FeedbackService Module
*
* Description
*
*/
angular.module('FeedbackService', [])
.service('FeedbackService', ['$resource', 'appConfig',
  function ($resource, appConfig) {
    return $resource(appConfig.apiUrl + '/feedback', {}, {

      // 获取单条反馈
      item: {
        method: 'GET',
        url: appConfig.apiUrl + '/feedback/:feedback_id'
      },

      // 修改单条反馈
      put: {
        method: 'PUT',
        url: appConfig.apiUrl + '/feedback/:feedback_id'
      },

      // 删除单条反馈
      del: {
        method: 'DELETE',
        url: appConfig.apiUrl + '/feedback/:feedback_id'
      },

    })
  }
]);