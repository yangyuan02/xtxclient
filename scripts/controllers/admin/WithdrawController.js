/**
* WithdrawController Module
*
* Description
*/
angular.module('WithdrawController', ['WithdrawModel'])
.controller('WithdrawController', ['$scope', '$rootScope', '$state', '$stateParams', '$modal', 'WithdrawModel', 'CommonProvider', function($scope, $rootScope, $state, $stateParams, $modal, WithdrawModel, CommonProvider) {

    /*----------------提现管理事件----------------*/
    $scope.filter = {};
    $scope.params = {};
    $scope.withdraw = {};
    $scope.withdraw_list = {};

    $scope.withdrawAction = {

      // 提现管理首页
      getIndex: function (page) {
        var _self = this;
        // 获取提现列表
        $scope.params = {
          page: page || 1,
        };
        _self.getLists($scope.params);
      },

      // 获取列表数据
      getLists: function(params) {
        CommonProvider.promise({
          model: WithdrawModel,
          method: 'get',
          params: params,
          success: function (_withdraw_list) {
            // console.log(_withdraw_list);
            $scope.withdraw_list = _withdraw_list;
          }
        });
      },

      // 获取提现详情
      getItem: function () {
        CommonProvider.promise({
          model: WithdrawModel,
          method: 'item',
          params: { withdraw_id: $stateParams.withdraw_id },
          success: function (_withdraw_item) {
            $scope.withdraw = _withdraw_item.result;
          }
        });
      },

      // 支付单不同支付方式筛选
      filterChanged: function () {
        var _self = this;
        var status = $scope.filter.status;
        !status ? delete $scope.params.status : $scope.params.status = status;
        _self.getLists($scope.params);
      },

      // 处理提现
      edit: function (params) {
        if (params.modal) {
          $rootScope.withdraw_local = params.withdraw;
          $rootScope.withdraw_edit  = angular.copy(params.withdraw.withdraw);
          $modal.custom({
            title: '处理提现',
            template_url: '/partials/admin/trade/withdraw/edit.html',
            callback: function () {
              delete $rootScope.withdraw_edit;
            }
          });
        } else {
          CommonProvider.promise({
            model: WithdrawModel,
            method: 'put',
            params: { body: $scope.withdraw, id: $scope.withdraw.id },
            success: function (_withdraw) {
              $rootScope.withdraw_local.$parent.withdraw = _withdraw.result;
              $rootScope.modal.close();
              $modal.success({
                message: _withdraw.message,
                callback: function () {
                  delete $rootScope.withdraw_local;
                }
              });
            },
            error: function (_withdraw) {
              $modal.error({
                message: _withdraw.message
              });
            }
          });
        }
      },

      // 删除提现
      del: function (params) {
        if (params.batch && $scope.withdraw_list.result.checked().length == 0) {
          return $modal.error({ message: '至少需要选中一个提现单' });
        };
        $modal.confirm({
          title: '确认删除',
          message: params.batch ? '确定要删除选中提现单吗？' : '确定要删除此提现单吗？',
          info: '提现单删除后可在回收站中查看',
          onsubmit: function () {
            CommonProvider.promise({
              model: WithdrawModel,
              method: params.batch ? 'delete' : 'del',
              params: params.batch ? $scope.withdraw_list.result.checked() : params.withdraw,
              success: function (_withdraw) {
                $modal.success({
                  message: _withdraw.message
                });
              },
              error: function (_withdraw) {
                $modal.error({
                  message: _withdraw.message
                });
              }
            });
          }
        });
      },
    };
  }
]);