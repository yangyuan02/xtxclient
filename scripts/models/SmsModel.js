/**
*
* SmsModel Module
*
* Description
*
*/
angular.module('SmsModel', ['SmsService'])

// 短信记录数据模型
.factory('SmsModel', ['SmsService', 'CommonProvider',
  function(SmsService, CommonProvider){

    var _sms_list;
    var _sms_item;
    var _sms_model = {};

    _sms_model = {

      // 获取短信记录列表
      get: function (params) {
        params.page = params.page || 1;
        params.per_page = params.per_page || 20;
        return CommonProvider.request({
          method: 'get',
          service: new SmsService(),
          params: params,
          success: function (sms_lists) {
            _sms_list = sms_lists;
          }
        });
      },

      // 获取单条短信记录详情
      item: function (params) {
        return CommonProvider.request({
          method: 'item',
          service: new SmsService(),
          params: params,
          success: function (sms_item) {
            _sms_item = sms_item;
          }
        });
      },

      // 删除短信记录
      del: function (sms) {
        return CommonProvider.request({
          method: 'del',
          service: new SmsService(),
          params: { sms_id: sms.id },
          success: function (_sms) {
            _sms_list.result.remove(sms);
            _sms_list.pagination.total -= 1;
          }
        });
      }
    };
    
    return _sms_model;
  }
])