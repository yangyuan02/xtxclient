/**
* SmsController Module
*
* Description
*/
angular.module('SmsController', ['SmsModel', 'SmsService'])
.controller('SmsController', ['$scope', '$rootScope', '$state', '$stateParams', '$modal', 'SmsModel', 'SmsService', 'CommonProvider', function($scope, $rootScope, $state, $stateParams, $modal, SmsModel, SmsService, CommonProvider) {

    /*----------------短信管理事件----------------*/
    $scope.filter = {};
    $scope.params = {};
    $scope.search = {};
    $scope.sms_list = {};

    $scope.smsAction = {

      // 短信管理首页
      getIndex: function (page) {
        var _self = this;
        // 获取课程列表
        $scope.params = {
          role: 'admin',
          page: page || 1,
        };
        _self.getLists($scope.params);
      },

      // 获取列表数据
      getLists: function (params) {
        CommonProvider.promise({
          model: SmsModel,
          method: 'get',
          params: params,
          success: function (_sms_list) {
            $scope.sms_list = _sms_list;
          }
        });
      },

      // 获取短信详情
      getItem: function () {
        CommonProvider.promise({
          model: SmsModel,
          method: 'item',
          params: { sms_id: $stateParams.sms_id },
          success: function (sms_item) {
            $scope.sms = sms_item.result;
          }
        });
      },

      // 短信详情
      item: function (params) {
        if (params.modal) {
          $rootScope.sms_item = angular.copy(params.sms.sms);
          $modal.custom({
            title: '短信详情',
            template_url: '/partials/admin/article/sms/item.html',
            callback: function () {
              delete $rootScope.sms_item;
            }
          });
        } else {
          $rootScope.modal.close();
        }
      },

      // 删除短信
      del: function (params) {
        if (params.batch && $scope.sms_list.result.checked().length == 0) {
          $modal.error({ message: '至少需要选中一篇短信' });
          return false;
        };
        $modal.confirm({
          title: '确认删除',
          message: params.batch ? '确定要删除选中短信吗？' : '确定要删除此短信吗？',
          info: '短信删除后可在短信回收站中查看',
          onsubmit: function () {
            CommonProvider.promise({
              model: SmsModel,
              method: params.batch ? 'delete' : 'del',
              params: params.batch ? $scope.sms_list.result.checked() : params.sms,
              success: function (_sms) {
                $modal.success({
                  message: _sms.message
                });
              },
              error: function (_sms) {
                $modal.error({
                  message: _sms.message
                });
              }
            });
          }
        });
      },

    };
  }
]);