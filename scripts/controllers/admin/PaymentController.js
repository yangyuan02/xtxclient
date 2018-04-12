/**
* PaymentController Module
*
* Description
*/
angular.module('PaymentController', ['PaymentModel'])
.controller('PaymentController', ['$scope', '$rootScope', '$state', '$stateParams', '$modal', 'PaymentModel', 'CommonProvider', function($scope, $rootScope, $state, $stateParams, $modal, PaymentModel, CommonProvider) {

    /*----------------收款单管理事件----------------*/
    $scope.payment = {};
    $scope.payment_list = {};
    $scope.filter = {
      pay_type: 'all',
      pay_status: 'all'
    };

    $scope.paymentAction = {

      // 收款单管理首页
      getIndex: function () {
        $scope.paymentAction.getLists();
      },

      // 过滤条件变更
      filterChanged: function () {
        $scope.paymentAction.getLists();
      },

      // 获取列表数据
      getLists: function(page) {

        var get_params = {
          page: page || 1,
        };

        var filters = $scope.filter;
        for (var key in filters) {
          if (filters[key] != 'all' && !!filters[key]) get_params[key] = filters[key];
        };

        // console.log(get_params);

        CommonProvider.promise({
          model: PaymentModel,
          method: 'get',
          params: get_params,
          success: function (payment_list) {
            $scope.payment_list = payment_list;
          }
        });
      },

      // 获取收款单详情
      getItem: function () {
        CommonProvider.promise({
          model: PaymentModel,
          method: 'item',
          params: { payment_id: $stateParams.payment_id },
          success: function (payment_item) {
            $scope.payment = payment_item.result;
          }
        });
      },

      // 删除收款单
      del: function (params) {
        if (params.batch && $scope.payment_list.result.checked().length == 0) {
          $modal.error({ message: '至少需要选中一个收款单' });
          return false;
        };
        $modal.confirm({
          title: '确认删除',
          message: params.batch ? '确定要删除选中收款单吗？' : '确定要删除此收款单吗？',
          info: '收款单删除后可在收款单回收站中查看',
          onsubmit: function () {
            CommonProvider.promise({
              model: PaymentModel,
              method: params.batch ? 'delete' : 'del',
              params: params.batch ? $scope.payment_list.result.checked() : params.payment,
              success: function (_payment) {
                $modal.success({
                  message: _payment.message
                });
              },
              error: function (_payment) {
                $modal.error({
                  message: _payment.message
                });
              }
            });
          }
        });
      },
    };
  }
]);