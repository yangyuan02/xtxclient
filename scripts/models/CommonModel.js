/**
* GlobalModel Module
*
* Description
*
*/
angular.module('CommonModel', ['CommonService'])

// 公共模型
.factory('CommonModel', ['CommonService', 'CommonProvider',
  function(CommonService, CommonProvider){

    _common_model = {
      
      // 获取短信验证码
      sms: function (config) {
        return CommonProvider.request({
          method: 'sms',
          service: new CommonService(),
          params: config
        });
      },

      // 获取全国树形地区
      area: function () {
        return CommonProvider.request({
          method: 'area',
          service: new CommonService()
        });
      },

      // 获取全局配置
      config: function (params) {
        return CommonProvider.request({
          method: 'config',
          service: new CommonService(),
          params: params
        });
      },

      // 获取全局配置
      configByName: function (params) {
        return CommonProvider.request({
          method: 'configByName',
          service: new CommonService(),
          params: params
        });
      },

    };
    
    return _common_model;
  }
])