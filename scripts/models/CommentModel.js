/**
*
* CommentModel Module
*
* Description
*
*/
angular.module('CommentModel', ['CommentService'])

// 评价数据模型
.factory('CommentModel', ['CommentService', 'CommonProvider',
  function(CommentService, CommonProvider){
    
    var _comment_list;
    var _comment_item;
    var _comment_model = {};


    _comment_model = {
      
      // 获取课程评论列表
      get: function (config) {
        config.page = config.page || 1;
        config.per_page = config.per_page || 20;
        return CommonProvider.request({
          method: 'get',
          service: new CommentService(),
          params: config,
          success: function (_comment_lists) {
            _comment_list = _comment_lists;
          }
        });
      },

      // 添加新评论
      post: function (params) {
        return CommonProvider.request({
          method: 'save',
          service: new CommentService(params.body),
          params: { role: params.role }
        });
      },

      // 删除评论
      del: function (params) {
        return CommonProvider.request({
          method: 'del',
          service: new CommentService(),
          params: params
        });
      },

    };
    
    return _comment_model;
  }
])