/**
* AnnouncementController Module
*
* Description
*/
angular.module('AnnouncementController', ['AnnouncementModel', 'OrganizationModel'])
.controller('AnnouncementController', ['$scope', '$rootScope', '$state', '$stateParams', '$modal', 'AnnouncementModel', 'OrganizationModel', 'CommonProvider', function($scope, $rootScope, $state, $stateParams, $modal, AnnouncementModel, OrganizationModel, CommonProvider) {

    /*----------------公告管理事件----------------*/
    $scope.announcement_list = {};
    $scope.filter = { 
      type: 'all',
      organization_id: null
    };

    $scope.announcementAction = {

      // 过滤条件改变
      filterChanged: function () {
        $scope.announcementAction.getLists();
      },

      // 公告管理首页
      getIndex: function (page) {
        $scope.announcementAction.getLists(page);
        $scope.announcementAction.getOrganizations();
      },

      // 获取所有机构
      getOrganizations: function () {
        CommonProvider.promise({
          model: OrganizationModel,
          method: 'get',
          params: { 
            per_page: 1000,
            role: 'admin'
          },
          success: function (_organizations) {
            $scope.organizations = _organizations.result;
          }
        });
      },

      // 获取列表数据
      getLists: function (page) {

        var get_params = {
          role: 'admin',
          page: page || 1,
        };

        var filters = $scope.filter;
        for (var key in filters) {
          if (filters[key] != 'all' && !!filters[key]) get_params[key] = filters[key];
        };

        CommonProvider.promise({
          model: AnnouncementModel,
          method: 'get',
          params: get_params,
          success: function (_announcement_list) {
            $scope.announcement_list = _announcement_list;
          }
        });
      },

      // 获取公告详情
      getItem: function () {
        CommonProvider.promise({
          model: AnnouncementModel,
          method: 'item',
          params: { announcement_id: $stateParams.announcement_id },
          success: function (announcement_item) {
            $scope.announcement = announcement_item.result;
          }
        });
      },

      // 公告详情
      item: function (params) {
        if (params.modal) {
          $rootScope.announcement_item = angular.copy(params.announcement.announcement);
          $modal.custom({
            title: '公告详情',
            template_url: '/partials/admin/article/announcement/item.html',
            callback: function () {
              delete $rootScope.announcement_item;
            }
          });
        } else {
          $rootScope.modal.close();
        }
      },

      // 添加公告
      add: function (params) {
        if (params.modal) {
          $modal.custom({
            title: '添加公告',
            template_url: '/partials/admin/organization/announcement/add.html',
          });
        } else {
          $scope.announcement.role = 'admin';
          CommonProvider.promise({
            model: AnnouncementModel,
            method: 'add',
            params: $scope.announcement,
            success: function (_announcement) {
              $rootScope.modal.close();
              $modal.success({
                message: _announcement.message,
              });
            },
            error: function (_announcement) {
              $modal.error({
                message: _announcement.message
              });
            }
          });
        }
      },

      // 编辑公告
      edit: function (params) {
        if (params.modal) {
          $rootScope.announcement_local = params.announcement;
          $rootScope.announcement_edit  = angular.copy(params.announcement.announcement);
          $rootScope.announcement_edit.type = $rootScope.announcement_edit.type.toString();
          $modal.custom({
            title: '编辑公告',
            template_url: '/partials/admin/organization/announcement/edit.html',
            callback: function () {
              delete $rootScope.announcement_edit;
            }
          });
        } else {
          CommonProvider.promise({
            model: AnnouncementModel,
            method: 'put',
            params: { body: $scope.announcement, id: $scope.announcement.id },
            success: function (_announcement) {
              $rootScope.announcement_local.$parent.announcement = _announcement.result;
              $rootScope.modal.close();
              $modal.success({
                message: _announcement.message,
                callback: function () {
                  delete $rootScope.announcement_local;
                }
              });
            },
            error: function (_announcement) {
              $modal.error({
                message: _announcement.message
              });
            }
          });
        }
      },

      // 删除公告
      del: function (params) {
        if (params.batch && $scope.announcement_list.result.checked().length == 0) {
          $modal.error({ message: '至少需要选中一条公告' });
          return false;
        };

        if (!params.batch) {
          var params_del = {
            announcement_id: params.announcement.announcement.id,
            role: 'admin'
          };
        }

        $modal.confirm({
          title: '确认删除',
          message: params.batch ? '确定要删除选中公告吗？' : '确定要删除此公告吗？',
          info: '公告删除后可在公告回收站中查看',
          onsubmit: function () {
            CommonProvider.promise({
              model: AnnouncementModel,
              method: params.batch ? 'delete' : 'del',
              params: params.batch ? $scope.announcement_list.result.checked() : params_del,
              success: function (_announcement) {
                $modal.success({
                  message: _announcement.message
                });
              },
              error: function (_announcement) {
                $modal.error({
                  message: _announcement.message
                });
              }
            });
          }
        });
      },

    };
  }
]);