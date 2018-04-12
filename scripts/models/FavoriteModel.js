/**
*
* FavoriteModel Module
*
* Description
*
*/
angular.module('FavoriteModel', ['FavoriteService'])

// 收藏模型
.factory('FavoriteModel', ['FavoriteService', 'CommonProvider',
  function(FavoriteService, CommonProvider){

    var _favorite_lists;
    var _favorite_model = {

      // 获取收藏列表
      get: function (params) {
        return CommonProvider.request({
          method: 'get',
          service: new FavoriteService(),
          params: params,
          success: function (_favorites) {
            _favorite_lists = _favorites;
          }
        });
      },

      // 批量获取收藏状态
      getStatus: function (params) {
        return CommonProvider.request({
          method: 'getStatus',
          service: new FavoriteService(),
          params: params
        });
      },
      
      // 收藏目标
      add: function (config) {
        return CommonProvider.request({
          method: 'save',
          service: new FavoriteService(),
          params: config
        });
      },

      // 取消收藏
      del: function (params) {
        return CommonProvider.request({
          method: 'remove',
          service: new FavoriteService(),
          params: params,
          success: function () {
            _favorite_lists.pagination.total -= 1;
          }
        });
      }
    };
    
    return _favorite_model;
  }
])