/**
*
* CommentService Module
*
* Description
*
*/
angular.module('CommentService', [])
.service('CommentService', ['$resource', 'appConfig',
  function ($resource, appConfig) {
    return $resource(appConfig.apiUrl + '/course_comment', {}, {

      // 删除
      del: {
        method: 'DELETE',
        url: appConfig.apiUrl + '/course_comment/:comment_id'
      },

    });
  }
])