/**
* AdvertiseController Module
*
* Description
*/
angular.module('AdvertiseController', ['AdvertiseModel'])
.controller('AdvertiseController', ['$scope', '$rootScope', '$state', '$stateParams', '$location', '$modal', 'AdvertiseModel', 'CommonProvider', function($scope, $rootScope, $state, $stateParams, $location, $modal, AdvertiseModel, CommonProvider) {

    /*----------------广告管理事件----------------*/
    $scope.filter = {};
    $scope.advertise_list = {};

    $scope.advertiseAction = {

      // 广告管理首页
      getIndex: function (page) {
        var _self = this;
        // 获取广告列表
        $scope.params = {
          role: 'admin',
          page: page || 1,
        };
        _self.getLists($scope.params);
      },

      // 获取列表数据
      getLists: function (params) {
        CommonProvider.promise({
          model: AdvertiseModel,
          method: 'get',
          params: params,
          success: function (_advertise_list) {
            $scope.advertise_list = _advertise_list;
          }
        });
      },

      // 获取笔记详情
      getItem: function () {
        CommonProvider.promise({
          model: AdvertiseModel,
          method: 'item',
          params: { advertise_id: $stateParams.advertise_id },
          success: function (_advertise_item) {
            _advertise_item.result.type = _advertise_item.result.type.toString();
            $scope.advertise = _advertise_item.result;
          }
        });
      },

      // 获取配置数据
      getAdConfig: function () {
        $rootScope.getConfig({
          name: 'SITE_AD_CONFIG',
          role: 'admin',
          group: 2,
          success: function (config) {
            $scope.ad_config = config.result;
          }
        });
      },

      // 新增广告
      add: function (params) {
        CommonProvider.promise({
          model: AdvertiseModel,
          method: 'add',
          params: $scope.advertise,
          success: function (_advertise) {
            $modal.success({
              message: _advertise.message,
              callback: function () {
                $location.path('/advertise/advertise/list/index');
              }
            });
          },
          error: function (_advertise) {
            $modal.error({
              message: _advertise.message
            });
          }
        });
      },

      // 编辑广告
      edit: function (params) {
        $scope.advertise.type = Number($scope.advertise.type);
        CommonProvider.promise({
          model: AdvertiseModel,
          method: 'put',
          params: $scope.advertise,
          success: function (_advertise) {
            $modal.success({
              message: _advertise.message,
              callback: function () {
                $location.path('/article/advertise/list/index');
              }
            });
          },
          error: function (_advertise) {
            $modal.error({
              message: _advertise.message
            });
          }
        });
      },

      // 删除广告
      del: function (params) {
        if (params.batch && $scope.advertise_list.result.checked().length == 0) {
          $modal.error({ message: '至少需要选中一个广告' });
          return false;
        };
        $modal.confirm({
          title: '确认删除',
          message: params.batch ? '确定要删除选中广告吗？' : '确定要删除此广告吗？',
          info: '广告删除后可在广告回收站中查看',
          onsubmit: function () {
            CommonProvider.promise({
              model: AdvertiseModel,
              method: params.batch ? 'delete' : 'del',
              params: params.batch ? $scope.advertise_list.result.checked() : params.advertise,
              success: function (_advertise) {
                $modal.success({
                  message: _advertise.message
                });
              },
              error: function (_advertise) {
                $modal.error({
                  message: _advertise.message
                });
              }
            });
          }
        });
      },

      // 广告图片上传结果回调函数
      getUploadThumb: function (data) {
        if (data) {
          $scope.advertise.image = data.key;
        }
      },

    };
  }
]);