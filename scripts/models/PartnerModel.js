/**
*
* PartnerModel Module
*
* Description
*
*/
angular.module('PartnerModel', ['PartnerService'])

// 入驻机构模型
.factory('PartnerModel', ['PartnerService', 'CommonProvider',
  function(PartnerService, CommonProvider){

    var _partner_lists;
    var _partner_model = {

      // 获取友链列表
      get: function (params) {
        return CommonProvider.request({
          method: 'get',
          service: new PartnerService(),
          params: params,
          success: function (_partners) {
            _partner_lists = _partners;
          }
        });
      },
      
      // 新增友链
      add: function (partner) {
        return CommonProvider.request({
          method: 'save',
          service: new PartnerService(partner)
        });
      },

      // 删除友链
      del: function (params) {
        return CommonProvider.request({
          method: 'remove',
          service: new PartnerService(),
          params: params,
          success: function () {
            _partner_lists.pagination.total -= 1;
          }
        });
      }
    };
    
    return _partner_model;
  }
])