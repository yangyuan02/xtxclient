/**
* QuestionController Module
*
* Description
*/
angular.module('QuestionController', ['QuestionModel', 'QuestionService'])
.controller('QuestionController', ['$scope', '$rootScope', '$state', '$stateParams', '$modal', 'QuestionModel', 'QuestionService', 'CommonProvider', function($scope, $rootScope, $state, $stateParams, $modal, QuestionModel, QuestionService, CommonProvider) {

    /*----------------问答管理事件----------------*/
    $scope.filter = {};
    $scope.params = {};
    $scope.search = {};
    $scope.question_list = {};

    $scope.questionAction = {

      // 问答管理首页
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
          model: QuestionModel,
          method: 'get',
          params: params,
          success: function (question_list) {
            $scope.question_list = question_list;
          }
        });
      },

      // 问答搜索
      getSearch: function () {
        var params = [{
          field: 'content',
          operation: 'like',
          value: $scope.search.keyword
        }];
        CommonProvider.search({
          service: new QuestionService(),
          method: 'search',
          params: params,
          success: function (_question_list) {
            $scope.question_list = _question_list;
          }
        });
      },

      // 获取问答详情
      getItem: function () {
        CommonProvider.promise({
          model: QuestionModel,
          method: 'item',
          params: { question_id: $stateParams.question_id },
          success: function (question_item) {
            $scope.question = question_item.result;
          }
        });
      },

      // 问答详情
      item: function (params) {
        if (params.modal) {
          $rootScope.question_item = angular.copy(params.question.question);
          $modal.custom({
            title: '问答详情',
            template_url: '/partials/admin/article/question/item.html',
            callback: function () {
              delete $rootScope.question_item;
            }
          });
        } else {
          $rootScope.modal.close();
        }
      },

      // 编辑问答
      edit: function (params) {
        if (params.modal) {
          $rootScope.question_local = params.question;
          $rootScope.question_edit  = angular.copy(params.question.question);
          $modal.custom({
            title: '编辑问答',
            template_url: '/partials/admin/article/question/edit.html',
            callback: function () {
              delete $rootScope.question_edit;
            }
          });
        } else {
          CommonProvider.promise({
            model: QuestionModel,
            method: 'put',
            params: { body: $scope.question, id: $scope.question.id },
            success: function (_question) {
              $rootScope.question_local.$parent.question = _question.result;
              $rootScope.modal.close();
              $modal.success({
                message: _question.message,
                callback: function () {
                  delete $rootScope.question_local;
                }
              });
            },
            error: function (_question) {
              $modal.error({
                message: _question.message
              });
            }
          });
        }
      },

      // 删除问答
      del: function (params) {
        if (params.batch && $scope.question_list.result.checked().length == 0) {
          $modal.error({ message: '至少需要选中一篇问答' });
          return false;
        };
        $modal.confirm({
          title: '确认删除',
          message: params.batch ? '确定要删除选中问答吗？' : '确定要删除此问答吗？',
          info: '问答删除后可在问答回收站中查看',
          onsubmit: function () {
            CommonProvider.promise({
              model: QuestionModel,
              method: params.batch ? 'delete' : 'del',
              params: params.batch ? $scope.question_list.result.checked() : params.question,
              success: function (_question) {
                $modal.success({
                  message: _question.message
                });
              },
              error: function (_question) {
                $modal.error({
                  message: _question.message
                });
              }
            });
          }
        });
      },

    };
  }
]);