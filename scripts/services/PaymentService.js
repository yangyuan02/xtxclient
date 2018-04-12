/**
* TradeService Module
*
* Description
*
*/
angular.module('PaymentService', [])

.service('PaymentService', ['$resource', 'appConfig',
  function($resource, appConfig){
    return $resource(appConfig.apiUrl + '/payment', {}, {

      // 生成支付订单
      pay: {
        method: 'POST',
        url: appConfig.apiUrl + '/payment'
      },

      // 获取支付结果
      getStatus: {
        method: 'GET',
        url: appConfig.apiUrl + '/payment/:payment_id'
      },

      // 实际支付
      payment: {
        method: 'PUT',
        url: appConfig.apiUrl + '/payment/:payment_id'
      },

      // 支付单详情
      item: {
        method: 'GET',
        url: appConfig.apiUrl + '/payment/:payment_id'
      },

      // 删除支付单
      del: {
        method: 'DELETE',
        url: appConfig.apiUrl + '/payment/:payment_id'
      },

    });
  }
]);