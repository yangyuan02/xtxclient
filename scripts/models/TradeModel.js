/**
*
* TradeModel Module
*
* Description
*
*/
angular.module('TradeModel', ['TradeService'])

// 交易数据模型
.factory('TradeModel', ['TradeService', 'CommonProvider',
  function(TradeService, CommonProvider){

    var _trade = {};
    var _trade_list;

    var _trade_model = {

      // 获取交易列表
      get: function (params) {
        params.page = params.page || 1;
        params.per_page = params.per_page || 20;
        return CommonProvider.request({
          method: 'get',
          service: new TradeService(),
          params: params,
          success: function (_trade_list) {
            _trade_list = _trade_list;
          }
        });
      },

      // 获取交易详情
      item: function (params) {
        return CommonProvider.request({
          method: 'item',
          service: new TradeService(),
          params: params,
          success: function (_trade_item) {
            return _trade_item;
          }
        });
      },

      // 取消订单
      cancel: function (trade) {
        return CommonProvider.request({
          method: 'cancel',
          service: new TradeService(),
          params: trade,
          success: function (_trade) {
            // console.log(_trade);
          }
        });
      },

      // 删除订单
      del: function (trade) {
        return CommonProvider.request({
          method: 'del',
          service: new TradeService(),
          params: { trade_id: trade.trade.id },
          success: function (_trade) {
            _trade_list.result.remove(trade.trade);
            _trade_list.pagination.total -= 1;
          }
        });
      },

      // 批量删除订单
      delete: function (ids) {
        return CommonProvider.request({
          method: 'delete',
          service: new TradeService(),
          params: { ids: ids.join(',') },
          success: function (_trade) {
            _trade_model.get({ page: _trade_list.pagination.current_page });
          }
        });
      },
    };

    return _trade_model;
  }
]);