/**
*
* PublicModel Module
*
* PublicModel Description
*
*/
angular.module('PublicModel', ['PublicService'])

// 入驻机构模型
.factory('PublicModel', ['PublicService', 'CommonProvider',
  function(PublicService, CommonProvider){

    var _public_model = {

      // 缓存清理
      clearcache: function (params) {
        return CommonProvider.request({
          method: 'clearcache',
          service: new PublicService(),
          params: params,
        });
      },


      // 获取友链列表
      get: function (params) {
        return CommonProvider.request({
          method: 'get',
          service: new PublicService(),
          params: params,
          success: function (_publics) {
            _public_lists = _publics;
          }
        });
      },
      


    };
    
    return _public_model;
  }
])