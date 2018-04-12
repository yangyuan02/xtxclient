/**
*
* ScoreModel Module
*
* Description
*
*/
angular.module('ScoreModel', ['ScoreService'])

// 积分数据模型
.factory('ScoreModel', ['ScoreService', 'CommonProvider',
  function(ScoreService, CommonProvider){

    var _score_model = {

      // 获取我的积分
      get: function (params) {
        return CommonProvider.request({
          method: 'get',
          service: new ScoreService(),
          params: params
        });
      },

      // 获取积分等级
      getLevels: function (params) {
        return CommonProvider.request({
          method: 'getLevels',
          service: new ScoreService(),
          params: params
        });
      },

      // 获取积分规则
      getRules: function (params) {
        return CommonProvider.request({
          method: 'getRules',
          service: new ScoreService(),
          params: params
        });
      },

    };
    
    return _score_model;
  }
])