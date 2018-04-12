/**
*
* WithdrawModel Module
*
* Description
*
*/
angular.module('WithdrawModel', ['WithdrawService'])

// 提现模型
.factory('WithdrawModel', ['WithdrawService', 'CommonProvider',
  function(WithdrawService, CommonProvider){

    var _withdraw_list;
    var _withdraw_model = {

      // 获取提现列表
      get: function (params) {
        params.page = params.page || 1;
        params.per_page = params.per_page || 20;
        return CommonProvider.request({
          method: 'get',
          service: new WithdrawService(),
          params: params,
          success: function (_withdraw_lists) {
            _withdraw_list = _withdraw_lists;
          }
        });
      },

      // 申请提现
      apply: function (bill) {
        return CommonProvider.request({
          method: 'save',
          service: new WithdrawService(bill)
        });
      },

      // 获取提现详情
      item: function (params) {
        return CommonProvider.request({
          method: 'item',
          service: new WithdrawService(),
          params: params,
          success: function (_withdraw_item) {
            return _withdraw_item;
          }
        });
      },

      // 取消提现
      cancel: function (withdraw) {
        return CommonProvider.request({
          method: 'cancel',
          service: new WithdrawService(),
          params: withdraw,
          success: function (_withdraw) {
          }
        });
      },

      // 修改提现
      put: function (withdraw) {
        return CommonProvider.request({
          method: 'put',
          service: new WithdrawService(withdraw.body),
          params: { withdraw_id: withdraw.id }
        });
      },

      // 删除提现订单
      del: function (withdraw) {
        return CommonProvider.request({
          method: 'del',
          service: new WithdrawService(),
          params: { withdraw_id: withdraw.withdraw.id },
          success: function (_withdraw) {
            _withdraw_list.result.remove(withdraw.withdraw);
            _withdraw_list.pagination.total -= 1;
          }
        });
      },

      // 批量删除提现订单
      delete: function (ids) {
        return CommonProvider.request({
          method: 'delete',
          service: new WithdrawService(),
          params: { ids: ids.join(',') },
          success: function (_withdraw) {
            _withdraw_model.get({ page: _withdraw_list.pagination.current_page });
          }
        });
      },

    };

    return _withdraw_model;
  }
]);
