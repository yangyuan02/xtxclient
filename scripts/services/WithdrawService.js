/**
*
* WithdrawService Module
*
* Description
*
*/
angular.module('WithdrawService', [])
.service('WithdrawService', ['$resource', 'appConfig',
  function($resource, appConfig){
    return $resource(appConfig.apiUrl + '/withdraw', {
        per_page: '@per_page',
        page: '@page' 
      }, {

      // 提现详情
      item: {
        method: 'GET',
        url: appConfig.apiUrl + '/withdraw/:withdraw_id'
      },

      // 修改提现
      cancel: {
        method: 'PUT',
        url: appConfig.apiUrl + '/withdraw/:withdraw_id/cancel'
      },

      // 更新提现
      put: {
        method: 'PUT',
        url: appConfig.apiUrl + '/withdraw/:withdraw_id'
      },

      // 删除提现
      del: {
        method: 'DELETE',
        url: appConfig.apiUrl + '/withdraw/:withdraw_id'
      },
      
    });
  }
]);