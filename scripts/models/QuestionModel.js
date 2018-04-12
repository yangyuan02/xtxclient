/**
*
* QuestionModel Module
*
* Description
*
*/
angular.module('QuestionModel', ['QuestionService'])

// 问答模型
.factory('QuestionModel', ['QuestionService', 'CommonProvider',
  function(QuestionService, CommonProvider){

    var _question_lists;
    var _answer_lists;
    var _question_model = {
      
      // 获取问答
      get: function (params) {
        return CommonProvider.request({
          method: 'get',
          service: new QuestionService(),
          params: params
        });
      },

      // 新增问答
      post: function (question) {
        return CommonProvider.request({
          method: 'save',
          service: new QuestionService(question),
        });
      },

      // 删除问答
      del: function (params) {
        return CommonProvider.request({
          method: 'del',
          service: new QuestionService(),
          params: params,
          success: function (_question) {
            // _question_list.result.remove(question.question);
            // _question_list.pagination.total -= 1;
          }
        });
      },

      // 批量删除问答
      delete: function (ids) {
        return CommonProvider.request({
          method: 'delete',
          service: new QuestionService(),
          params: { ids: ids.join(',') },
          success: function (_question) {
            _question_model.get({ page: _question_list.pagination.current_page });
          }
        });
      },

      // 获取单条问答
      item: function (question) {
        return CommonProvider.request({
          method: 'item',
          service: new QuestionService(),
          params: question
        });
      },

      // 修改单条问答
      put: function (question) {
        return CommonProvider.request({
          method: 'put',
          service: new QuestionService(question.body),
          params: { question_id: question.id }
        });
      }

    };
    
    return _question_model;
  }
])