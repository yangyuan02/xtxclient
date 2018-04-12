/**
* PaymentModel Module
*
* Description
*/
angular.module('PaymentModel', ['PaymentService'])

// 支付模型
.factory('PaymentModel', ['PaymentService', 'CommonProvider',
  function(PaymentService, CommonProvider){
    
    var _payment = {};
    var _payment_list;
    var _payment_service = new PaymentService();

    _payment_model = {

      // 生成支付订单
      pay: function (config) {
        return CommonProvider.request({
          method: 'pay',
          service: new PaymentService({ course_ids: config.course_ids }),
        });
      },

      // 获取支付状态
      getPayStatus: function (config) {
        return CommonProvider.request({
          method: 'getStatus',
          service: _payment_service,
          params: config
        });
      },

      // 实际支付
      payment: function (config) {
        return CommonProvider.request({
          method: 'payment',
          service: new PaymentService(config.body),
          params: { payment_id: config.payment_id }
        });
      },

      // 获取支付单列表
      get: function (params) {
        params.page = params.page || 1;
        params.per_page = params.per_page || 20;
        return CommonProvider.request({
          method: 'get',
          service: new PaymentService(),
          params: params,
          success: function (_payment_lists) {
            _payment_list = _payment_lists;
          }
        });
      },

      // 获取支付单详情
      item: function (params) {
        return CommonProvider.request({
          method: 'item',
          service: new PaymentService(),
          params: params,
          success: function (_payment_item) {
            _payment.info = _payment_item;
          }
        });
      },

      // 删除支付单
      del: function (payment) {
        return CommonProvider.request({
          method: 'del',
          service: new PaymentService(),
          params: { payment_id: payment.payment.id },
          success: function (_payment) {
            _payment_list.result.remove(payment.payment);
            _payment_list.pagination.total -= 1;
          }
        });
      },

      // 批量删除支付单
      delete: function (ids) {
        return CommonProvider.request({
          method: 'delete',
          service: new PaymentService(),
          params: { ids: ids.join(',') },
          success: function (_payment) {
            _payment_model.get({ page: _payment_list.pagination.current_page });
          }
        });
      },
    };
    
    return _payment_model;
  }
])