/**
*
* QuestionService Module
*
* Description
*
*/
angular.module('QuestionService', [])
.service('QuestionService', ['$resource', 'appConfig',
  function ($resource, appConfig) {
    return $resource(appConfig.apiUrl + '/question', {}, {

      // 获取单条问答
      item: {
        method: 'GET',
        url: appConfig.apiUrl + '/question/:question_id'
      },

      // 搜索问答
      search: {
        method: 'GET',
        url: appConfig.apiUrl + '/question/search'
      },

      // 删除单条问答
      del: {
        method: 'DELETE',
        url: appConfig.apiUrl + '/question/:question_id'
      },

      // 更新单条问答
      put: {
        method: 'PUT',
        url: appConfig.apiUrl + '/question/:question_id'
      },

    });
  }
])