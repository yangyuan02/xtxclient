/**
*
* ChatModel Module
*
* Description
*
*/
angular.module('ChatModel', ['ChatService'])

// 收藏模型
.factory('ChatModel', ['ChatService', 'CommonProvider',
  function(ChatService, CommonProvider){

    var _chat_model = {

      // 获取收藏列表
      message: function (params) {
        return CommonProvider.request({
          method: 'get',
          service: new ChatService(),
          params: params
        });
      }
    };
    
    return _chat_model;
  }
])