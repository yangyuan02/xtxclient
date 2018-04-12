/**
*
* IndexModel Module
*
* Description
*
*/
angular.module('IndexModel', ['IndexService'])

// 课程数据模型
.factory('IndexModel', ['IndexService', 'CommonProvider',
  function(IndexService, CommonProvider){

    _index_model = {

      // 获取分类列表
      get: function (params) {
        return CommonProvider.request({
          method: 'get',
          service: new IndexService(),
          params: params
        });
      },

      // 获取合作机构
      partners: function (params) {
        return CommonProvider.request({
          method: 'partners',
          service: new IndexService(),
          params: params
        });
      },

      // 修改配置
      put: function (config) {
        console.log(config);
        return CommonProvider.request({
          method: 'put',
          service: new IndexService(config),
          params: { config_id: config.id },
          success: function (_config) {
          }
        });
      },
    }

    return _index_model;
  }
]);