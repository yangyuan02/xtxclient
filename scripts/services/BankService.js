/**
*
* BankService Module
*
* Description
*
*/
angular.module('BankService', [])
.service('BankService', ['$resource', 'appConfig',
  function($resource, appConfig){
    return $resource(appConfig.apiUrl + '/bank_account', {}, {

      // 删除银行账户
      del: {
        method: 'DELETE',
        url: appConfig.apiUrl + '/bank_account/:bank_id'
      },

      // 获取银行信息
      getInfo: {
        method: 'GET',
        url: appConfig.apiUrl + '/card_info'
      },

    });
  }
]);