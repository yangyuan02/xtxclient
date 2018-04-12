/**
*
* NoteService Module
*
* Description
*
*/
angular.module('NoteService', [])
.service('NoteService', ['$resource', 'appConfig',
  function ($resource, appConfig) {
    return $resource(appConfig.apiUrl + '/note', {}, {

      // 获取单条笔记
      item: {
        method: 'GET',
        url: appConfig.apiUrl + '/note/:note_id'
      },

      // 搜索笔记
      search: {
        method: 'GET',
        url: appConfig.apiUrl + '/note/search'
      },

      // 删除单条笔记
      del: {
        method: 'DELETE',
        url: appConfig.apiUrl + '/note/:note_id'
      },

      // 更新单条笔记
      put: {
        method: 'PUT',
        url: appConfig.apiUrl + '/note/:note_id'
      },

    });
  }
])