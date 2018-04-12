/**
* CategoryController Module
*
* Description
*/
angular.module('CategoryController', ['angular.validation', 'angular.validation.rule', 'angular-sortable-view', 'Qupload', 'CategoryModel'])
.controller('CategoryController', ['$scope', '$rootScope', '$state', '$stateParams', '$location', '$modal', 'CategoryModel', 'CommonProvider', function($scope, $rootScope, $state, $stateParams, $location, $modal, CategoryModel, CommonProvider) {

    $scope.category_type = $stateParams.category_type || '1';
    $scope.category_id = $stateParams.category_id || '0';
    $scope.category_title = '';
    $scope.category_alais = '';
    $scope.category_info = {};
    switch ($scope.category_type) {
      case '1':
        $scope.category_info = {
          title: '课程分类',
          alais: 'course'
        };
        break;
      case '2':
        $scope.category_info = {
          title: '学校分类',
          alais: 'organization'
        };
        break;
      case '3':
        $scope.category_info = {
          title: '文章分类',
          alais: 'article'
        };
        break;
      default:
        break;
    }

    /*----------------分类管理事件----------------*/
    $scope.categoryAction = {

      // 获取课程分类
      getLists: function () {
        var params = {
          role: 'admin',
          category_id: $scope.category_id,
          type: $scope.category_type,
          children: 1,
        };
        CommonProvider.promise({
          model: CategoryModel,
          params: params,
          method: 'childrens',
          success: function (category_list) {
            $scope.category_list = category_list;
          }
        });
      },

      // 分类排序
      sort: function (params) {
        CommonProvider.sort({
          model: CategoryModel,
          params: params,
          data: $scope.category_list.result.children,
          method: 'sort'
        });
      },

      // 添加分类
      add: function (params) {
        if (params.modal) {
          $rootScope.category = {
            alais: $scope.category_info.alais,
            pid: params.pid || 0,
            type: $scope.category_type,
            redirect: params.redirect || false,
          };
          $modal.custom({
            title: '添加分类',
            template_url: '/partials/admin/category/manage/add.html',
            callback: function () {
              delete $rootScope.category;
            }
          });
        } else {
          $scope.category.type = $rootScope.category.type;
          $scope.category.pid = $rootScope.category.pid;
          var category_option = {
            alais: $rootScope.category.alais,
            pid: $rootScope.category.pid,
            type: $rootScope.category.type,
            redirect: $rootScope.category.redirect,
          };
          CommonProvider.promise({
            model: CategoryModel,
            method: 'add',
            params: $scope.category,
            success: function (_category) {
              $rootScope.modal.close();
              $modal.success({
                message: _category.message,
                callback: function () {
                  delete $rootScope.category;
                  if (category_option.redirect) {
                    $location.path('/' + category_option.alais + '/manage/category/list/' + category_option.type + '/' + category_option.pid);
                  }
                }
              });
            },
            error: function (_category) {
              $modal.error({
                message: _category.message
              });
            }
          });
        }
      },

      // 编辑分类
      edit: function (params) {
        if (params.modal) {
          $rootScope.category_local = params.category;
          $rootScope.category_edit  = angular.copy(params.category.category);
          $modal.custom({
            title: '编辑分类',
            template_url: '/partials/admin/category/manage/edit.html',
            callback: function () {
              delete $rootScope.category_edit;
            }
          });
        } else {
          CommonProvider.promise({
            model: CategoryModel,
            method: 'put',
            params: { new: $scope.category, old: $rootScope.category_local },
            success: function (_category) {
              $rootScope.category_local.$parent.category = _category.result;
              $rootScope.modal.close();
              $modal.success({
                message: _category.message,
                callback: function () {
                  delete $rootScope.category_local;
                }
              });
            },
            error: function (_category) {
              $modal.error({
                message: _category.message
              });
            }
          });
        }
      },

      // 图片上传回调
      getUploadThumb: function (data) {
        if (data) {
          $scope.category.icon = data.key;
        }
      },

      // 删除分类
      del: function (params) {
        if (params.batch && $scope.category_list.result.children.checked().length == 0) {
          $modal.error({ message: '至少需要选中一个分类' });
          return false;
        };
        $modal.confirm({
          title: '确认删除',
          message: params.batch ? '确定要删除选中分类吗？' : '确定要删除此分类吗？',
          info: '分类删除操作不可撤销，下级分类也将被删除',
          onsubmit: function () {
            CommonProvider.promise({
              model: CategoryModel,
              method: params.batch ? 'delete' : 'del',
              params: params.batch ? $scope.category_list.result.children.checked() : params.category,
              success: function (_category) {
                $modal.success({
                  message: _category.message
                });
              },
              error: function (_category) {
                $modal.error({
                  message: _category.message
                });
              }
            });
          }
        });
      },

      // 禁用分类
      disable: function (params) {
        if (params.batch && $scope.category_list.result.children.checked().length == 0) {
          $modal.error({ message: '至少需要选中一个分类' });
          return false;
        };
        $modal.confirm({
          title: '确认操作',
          message: params.batch ? '确定要禁用选中分类吗？' : '确定要禁用此分类吗？',
          info: params.batch ? '禁用后这些分类将不再前台显示' : '禁用后该分类将不再前台显示',
          onsubmit: function () {
            CommonProvider.promise({
              model: CategoryModel,
              method: 'disable',
              params: params.batch ? $scope.category_list.result.children.checked() : params.category,
              success: function (_category) {
                $modal.success({
                  message: _category.message
                });
              },
              error: function (_category) {
                $modal.error({
                  message: _category.message
                });
              }
            });
          }
        });
      },

      // 启用分类
      enable: function (params) {
        if (params.batch && $scope.category_list.result.children.checked().length == 0) {
          $modal.error({ message: '至少需要选中一个分类' });
          return false;
        };
        $modal.confirm({
          title: '确认操作',
          message: params.batch ? '确定要启用选中分类吗？' : '确定要启用此分类吗？',
          info: params.batch ? '启用后这些分类将不再前台显示' : '启用后该分类将不再前台显示',
          onsubmit: function () {
            CommonProvider.promise({
              model: CategoryModel,
              method: 'enable',
              params: params.batch ? $scope.category_list.result.children.checked() : params.category,
              success: function (_category) {
                $modal.success({
                  message: _category.message
                });
              },
              error: function (_category) {
                $modal.error({
                  message: _category.message
                });
              }
            });
          }
        });
      },

    };
  }
]);