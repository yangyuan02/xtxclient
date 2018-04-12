/**
*
* NoteModel Module
*
* Description
*
*/
angular.module('NoteModel', ['NoteService'])

// 笔记模型
.factory('NoteModel', ['NoteService', 'CommonProvider',
  function(NoteService, CommonProvider){

    var _note_list;
    var _note_model = {
      
      // 获取笔记
      get: function (params) {
        params.page = params.page || 1;
        params.per_page = params.per_page || 20;
        return CommonProvider.request({
          method: 'get',
          service: new NoteService(),
          params: params,
          success: function (note_list) {
            _note_list = note_list;
          }
        });
      },

      // 新增笔记
      post: function (note) {
        return CommonProvider.request({
          method: 'save',
          service: new NoteService(note),
        });
      },

      // 删除笔记
      del: function (note) {
        return CommonProvider.request({
          method: 'del',
          service: new NoteService(),
          params: { note_id: note.note.id },
          success: function (_note) {
            _note_list.result.remove(note.note);
            _note_list.pagination.total -= 1;
          }
        });
      },

      // 批量删除分类
      delete: function (ids) {
        return CommonProvider.request({
          method: 'delete',
          service: new NoteService(),
          params: { ids: ids.join(',') },
          success: function (_note) {
            _note_model.get({ page: _note_list.pagination.current_page });
          }
        });
      },

      // 获取单条笔记
      item: function (note) {
        return CommonProvider.request({
          method: 'item',
          service: new NoteService(),
          params: note
        });
      },

      // 修改单条笔记
      put: function (note) {
        return CommonProvider.request({
          method: 'put',
          service: new NoteService(note.body),
          params: { note_id: note.id },
        });
      }

    };
    
    return _note_model;
  }
])