/**
*
* TradeService Module
*
* Description
*
*/
angular.module('TradeService', [])
.service('TradeService', ['$resource', 'appConfig',
  function($resource, appConfig){
    return $resource(appConfig.apiUrl + '/trade', {
        per_page: '@per_page',
        page: '@page' 
      }, {

      // 订单详情
      item: {
        method: 'GET',
        url: appConfig.apiUrl + '/trade/:trade_id'
      },

      // 订单搜索
      search: {
        method: 'GET',
        url: appConfig.apiUrl + '/trade/search'
      },

      // 修改订单
      cancel: {
        method: 'PUT',
        url: appConfig.apiUrl + '/trade/:trade_id/cancel'
      },

      // 删除订单
      del: {
        method: 'DELETE',
        url: appConfig.apiUrl + '/trade/:trade_id'
      },

    });
  }
]);