/**
*
* MsgModel Module
*
* Description
*
*/
angular.module('MsgModel', ['MsgService'])

// 课程数据模型
.factory('MsgModel', ['MsgService', 'CommonProvider',
  function(MsgService, CommonProvider){

    var _msg_model = {

      // 获取分类列表
      get: function (params) {
        return CommonProvider.request({
          method: 'get',
          service: new MsgService(),
          params: params
        });
      },

      // 批量操作
      batch: function (params) {
        return CommonProvider.request({
          method: 'batch',
          service: new MsgService(),
          params: params
        });
      }
    }

    return _msg_model;
  }
]);