/**
* TradeController Module
*
* Description
*/
angular.module('TradeController', ['TradeModel', 'TradeService'])
.controller('TradeController', ['$scope', '$rootScope', '$state', '$stateParams', '$modal', 'TradeModel', 'TradeService', 'CommonProvider', function($scope, $rootScope, $state, $stateParams, $modal, TradeModel, TradeService, CommonProvider) {

    /*----------------订单管理事件----------------*/
    $scope.filter = {};
    $scope.params = {};
    $scope.search = {};
    $scope.trade_list = {};

    $scope.tradeAction = {

      // 订单管理首页
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
      getLists: function(params) {
        CommonProvider.promise({
          model: TradeModel,
          method: 'get',
          params: params,
          success: function (trade_list) {
            $scope.trade_list = trade_list;
          }
        });
      },

      // 获取订单详情
      getItem: function () {
        CommonProvider.promise({
          model: TradeModel,
          method: 'item',
          params: { trade_id: $stateParams.trade_id },
          success: function (trade_item) {
            $scope.trade = trade_item.result;
          }
        });
      },

      // 订单不同状态筛选
      filterChanged: function () {
        var _self = this;
        var status = $scope.filter.status;
        !status ? delete $scope.params.status : $scope.params.status = status;
        _self.getLists($scope.params);
      },

      // 订单搜索
      getSearch: function () {
        var params = [{
          field: 'num',
          operation: 'like',
          value: $scope.search.keyword
        }];
        CommonProvider.search({
          service: new TradeService(),
          method: 'search',
          params: params,
          success: function (_trade_list) {
            $scope.trade_list = _trade_list;
          }
        });
      },

      // 删除订单
      del: function (params) {
        if (params.batch && $scope.trade_list.result.checked().length == 0) {
          $modal.error({ message: '至少需要选中一个订单' });
          return false;
        };        
        $modal.confirm({
          title: '确认删除',
          message: params.batch ? '确定要删除选中订单吗？' : '确定要删除此订单吗？',
          info: '订单删除后可在订单回收站中查看',
          onsubmit: function () {
            CommonProvider.promise({
              model: TradeModel,
              method: params.batch ? 'delete' : 'del',
              params: params.batch ? $scope.trade_list.result.checked() : params.trade,
              success: function (_trade) {
                $modal.success({
                  message: _trade.message
                });
              },
              error: function (_trade) {
                $modal.error({
                  message: _trade.message
                });
              }
            });
          }
        });
      },

      // 订单回收站
      getRecycle: function (page) {
        var _self = this;
        // 获取课程列表
        var params_recycle = {
          role: 'admin',
          x_status: 0,
          page: page || 1,
        };
        _self.getLists(params_recycle);
      },
    };
  }
]);