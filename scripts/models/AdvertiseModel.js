/**
*
* AdvertiseModel Module
*
* Description
*
*/
angular.module('AdvertiseModel', ['AdvertiseService'])

// 广告数据模型
.factory('AdvertiseModel', ['AdvertiseService', 'CommonProvider',
  function(AdvertiseService, CommonProvider){

    var _advertise_list;
    var _advertise_item;
    var _advertise_model = {};

    _advertise_model = {

      // 获取广告列表
      get: function (params) {
        params.page = params.page || 1;
        params.per_page = params.per_page || 20;
        return CommonProvider.request({
          method: 'get',
          service: new AdvertiseService(),
          params: params,
          success: function (advertise_lists) {
            _advertise_list = advertise_lists;
          }
        });
      },

      // 获取单条广告详情
      item: function (params) {
        return CommonProvider.request({
          method: 'item',
          service: new AdvertiseService(),
          params: params,
          success: function (advertise_item) {
            _advertise_item = advertise_item;
          }
        });
      },

      // 新增广告
      add: function (advertise) {
        return CommonProvider.request({
          method: 'save',
          service: new AdvertiseService(advertise)
        });
      },

      // 修改广告
      put: function (advertise) {
        return CommonProvider.request({
          method: 'put',
          service: new AdvertiseService(advertise),
          params: { advertise_id: advertise.id },
          success: function (_advertise) {
            return _advertise;
          }
        });
      },


      // 删除广告
      del: function (advertise) {
        return CommonProvider.request({
          method: 'del',
          service: new AdvertiseService(),
          params: { advertise_id: advertise.id },
          success: function (_advertise) {
            _advertise_list.result.remove(advertise);
            _advertise_list.pagination.total -= 1;
          }
        });
      }
    };
    
    return _advertise_model;
  }
])