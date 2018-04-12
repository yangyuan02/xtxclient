/**
* FeedbackController Module
*
* Description
*/
angular.module('FeedbackController', ['FeedbackModel'])
.controller('FeedbackController', ['$scope', '$rootScope', '$state', '$stateParams', '$location', '$modal', 'FeedbackModel', 'CommonProvider', function($scope, $rootScope, $state, $stateParams, $location, $modal, FeedbackModel, CommonProvider) {

    /*----------------反馈管理事件----------------*/
    $scope.filter = {};
    $scope.params = {};
    $scope.feedback_list = {};

    $scope.feedbackAction = {

      // 反馈管理首页
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
          model: FeedbackModel,
          method: 'get',
          params: params,
          success: function (_feedback_list) {
            $scope.feedback_list = _feedback_list;
          }
        });
      },

      // 获取反馈详情
      getItem: function () {
        CommonProvider.promise({
          model: FeedbackModel,
          method: 'item',
          params: { feedback_id: $stateParams.feedback_id },
          success: function (_feedback_item) {
            $scope.feedback = _feedback_item.result;
          }
        });
      },

      // 删除反馈
      del: function (params) {
        if (params.batch && $scope.feedback_list.result.checked().length == 0) {
          $modal.error({ message: '至少需要选中一条反馈' });
          return false;
        };
        $modal.confirm({
          title: '确认删除',
          message: params.batch ? '确定要删除选中反馈吗？' : '确定要删除此反馈吗？',
          info: '反馈删除后可在回收站中查看',
          onsubmit: function () {
            CommonProvider.promise({
              model: FeedbackModel,
              method: params.batch ? 'delete' : 'del',
              params: params.batch ? $scope.feedback_list.result.checked() : params.feedback,
              success: function (_feedback) {
                $modal.success({
                  message: _feedback.message
                });
              },
              error: function (_feedback) {
                $modal.error({
                  message: _feedback.message
                });
              }
            });
          }
        });
      },

    };
  }
]);