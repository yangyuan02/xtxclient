/**
*
* ScoreService Module
*
* Description
*
*/
angular.module('ScoreService', [])
.service('ScoreService', ['$resource', 'appConfig',
  function ($resource, appConfig) {
    return $resource(appConfig.apiUrl + '/score', {}, {

      // 获取积分等级
      getLevels: {
        method: 'GET',
        url: appConfig.apiUrl + '/score_level'
      },

      // 获取积分规则
      getRules: {
        method: 'GET',
        url: appConfig.apiUrl + '/score_rule'
      },

    });
  }
]);