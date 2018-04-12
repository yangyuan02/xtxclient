/**
*
* BankModel Module
*
* Description
*
*/
angular.module('BankModel', ['BankService'])

// 银行账户模型
.factory('BankModel', ['BankService', 'CommonProvider',
  function(BankService, CommonProvider){

    var _bank_lists;
    var _bank_model = {

      // 获取银行列表
      get: function (params) {
        return CommonProvider.request({
          method: 'get',
          service: new BankService(),
          params: params,
          success: function (_banks) {
            _bank_lists = _banks;
          }
        });
      },

      // 添加银行账户
      add: function (bank) {
        return CommonProvider.request({
          method: 'save',
          service: new BankService(bank)
        });
      },

      // 删除银行账户
      del: function (params) {
        return CommonProvider.request({
          method: 'del',
          service: new BankService(),
          params: params
        });
      },

      // 获取银行信息
      getInfo: function (params) {
        return CommonProvider.request({
          method: 'getInfo',
          service: new BankService(),
          params: params
        });
      },

    };
    
    return _bank_model;
  }
])