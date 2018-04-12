/**
*
* FeedbackModel Module
*
* Description
*
*/
angular.module('FeedbackModel', ['FeedbackService'])

// 反馈模型
.factory('FeedbackModel', ['FeedbackService', 'CommonProvider',
  function(FeedbackService, CommonProvider){

    var _feedback_list;
    var _feedback_model = {

      // 获取反馈列表
      get: function (params) {
        return CommonProvider.request({
          method: 'get',
          service: new FeedbackService(),
          params: params,
          success: function (feedback_list) {
            _feedback_list = feedback_list;
          }
        });
      },

      // 获取单条反馈
      item: function (feedback) {
        return CommonProvider.request({
          method: 'item',
          service: new FeedbackService(),
          params: feedback
        });
      },
      
      // 新增反馈
      add: function (feedback) {
        return CommonProvider.request({
          method: 'save',
          service: new FeedbackService(feedback)
        });
      },

      // 编辑反馈
      put: function (feedback) {
        return CommonProvider.request({
          method: 'put',
          service: new FeedbackService(feedback),
          params: { feedback_id: feedback.id },
        });
      },

      // 删除反馈
      del: function (feedback) {
        return CommonProvider.request({
          method: 'del',
          service: new FeedbackService(),
          params: { feedback_id: feedback.feedback.id },
          success: function (_feedback) {
            _feedback_list.result.remove(feedback.feedback);
            _feedback_list.pagination.total -= 1;
          }
        });
      },

      // 批量删除
      delete: function (ids) {
        return CommonProvider.request({
          method: 'delete',
          service: new FeedbackService(),
          params: { ids: ids.join(',') },
          success: function (_feedback) {
            _feedback_model.get({ page: _feedback_list.pagination.current_page });
          }
        });
      }

    };
    
    return _feedback_model;
  }
])