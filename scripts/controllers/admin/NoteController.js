/**
* NoteController Module
*
* Description
*/
angular.module('NoteController', ['NoteModel', 'NoteService'])
.controller('NoteController', ['$scope', '$rootScope', '$state', '$stateParams', '$modal', 'NoteModel', 'NoteService', 'CommonProvider', function($scope, $rootScope, $state, $stateParams, $modal, NoteModel, NoteService, CommonProvider) {

    /*----------------笔记管理事件----------------*/
    $scope.filter = {};
    $scope.params = {};
    $scope.search = {};
    $scope.note_list = {};

    $scope.noteAction = {

      // 笔记管理首页
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
          model: NoteModel,
          method: 'get',
          params: params,
          success: function (note_list) {
            $scope.note_list = note_list;
          }
        });
      },

      // 笔记搜索
      getSearch: function () {
        var params = [{
          field: 'content',
          operation: 'like',
          value: $scope.search.keyword
        }];
        CommonProvider.search({
          service: new NoteService(),
          method: 'search',
          params: params,
          success: function (_note_list) {
            $scope.note_list = _note_list;
          }
        });
      },

      // 获取笔记详情
      getItem: function () {
        CommonProvider.promise({
          model: NoteModel,
          method: 'item',
          params: { note_id: $stateParams.note_id },
          success: function (note_item) {
            $scope.note = note_item.result;
          }
        });
      },

      // 笔记详情
      item: function (params) {
        if (params.modal) {
          $rootScope.note_item = angular.copy(params.note.note);
          $modal.custom({
            title: '笔记详情',
            template_url: '/partials/admin/article/note/item.html',
            callback: function () {
              delete $rootScope.note_item;
            }
          });
        } else {
          $rootScope.modal.close();
        }
      },

      // 编辑笔记
      edit: function (params) {
        if (params.modal) {
          $rootScope.note_local = params.note;
          $rootScope.note_edit  = angular.copy(params.note.note);
          $modal.custom({
            title: '编辑分类',
            template_url: '/partials/admin/article/note/edit.html',
            callback: function () {
              delete $rootScope.note_edit;
            }
          });
        } else {
          CommonProvider.promise({
            model: NoteModel,
            method: 'put',
            params: { body: $scope.note, id: $scope.note.id },
            success: function (_note) {
              $rootScope.note_local.$parent.note = _note.result;
              $rootScope.modal.close();
              $modal.success({
                message: _note.message,
                callback: function () {
                  delete $rootScope.note_local;
                }
              });
            },
            error: function (_note) {
              $modal.error({
                message: _note.message
              });
            }
          });
        }
      },

      // 删除笔记
      del: function (params) {
        if (params.batch && $scope.note_list.result.checked().length == 0) {
          $modal.error({ message: '至少需要选中一篇笔记' });
          return false;
        };
        $modal.confirm({
          title: '确认删除',
          message: params.batch ? '确定要删除选中笔记吗？' : '确定要删除此笔记吗？',
          info: '笔记删除后可在笔记回收站中查看',
          onsubmit: function () {
            CommonProvider.promise({
              model: NoteModel,
              method: params.batch ? 'delete' : 'del',
              params: params.batch ? $scope.note_list.result.checked() : params.note,
              success: function (_note) {
                $modal.success({
                  message: _note.message
                });
              },
              error: function (_note) {
                $modal.error({
                  message: _note.message
                });
              }
            });
          }
        });
      },

    };
  }
]);