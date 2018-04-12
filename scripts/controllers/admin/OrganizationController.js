/**
* OrganizationController Module
*
* Description
*/
angular.module('OrganizationController', ['angular.validation', 'angular.validation.rule', 'OrganizationModel', 'CategoryModel', 'OrganizationService'])
.controller('OrganizationController', ['$scope', '$rootScope', '$state', '$stateParams', '$modal', '$location', 'OrganizationModel', 'CategoryModel', 'OrganizationService', 'CommonProvider', function($scope, $rootScope, $state, $stateParams, $modal, $location, OrganizationModel, CategoryModel, OrganizationService, CommonProvider) {

    /*----------------学校/机构管理事件----------------*/

    $scope.filter = {};
    $scope.params = {};
    $scope.search = {};
    $scope.organization_list = {};
    $scope.organization_user_list = {};

    $scope.organizationAction = {

      // 学校管理首页
      getIndex: function (page) {
        var _self = this;
        $scope.params = {
          role: 'admin',
          page: page || 1,
        };
        // 获取学校列表
        _self.getLists($scope.params);
        // 获取学校分类
        _self.getCategory({
          role: 'admin',
          type: 2,
        });
      },

      // 获取学校列表
      getLists: function (params) {
        CommonProvider.promise({
          model: OrganizationModel,
          method: 'get',
          params: params,
          success: function (organization_list) {
            $scope.organization_list = organization_list;
          }
        });
      },

      // 获取学校分类列表
      getCategory: function () {
        var params = {
          role: 'admin',
          type: 2
        };
        CommonProvider.promise({
          model: CategoryModel,
          method: 'get',
          params: params,
          success: function (category_list) {
            $scope.category_list = category_list.result;
          }
        });
      },

      // 学校状态、分类筛选
      filterChanged: function (option) {
        var _self = this;
        var status = '';
        var category_id = '';
        // 状态筛选
        if(option == 'status') {
          status = $scope.filter.status;
          !status ? delete $scope.params.status : $scope.params.status = status;
        }
        // 分类筛选
        if(option == 'category') {
          category_id = $scope.filter.category_id;
          !category_id ? delete $scope.params.category_id : $scope.params.category_id = category_id;
        }
        _self.getLists($scope.params);
      },

      // 学校搜索
      getSearch: function () {
        var params = [{
          field: 'name',
          operation: 'like',
          value: $scope.search.keyword
        }, {
          field: 'introduction',
          operation: 'like',
          value: $scope.search.keyword
        }];
        CommonProvider.search({
          service: new OrganizationService(),
          method: 'search',
          params: params,
          success: function (_organization_list) {
            $scope.organization_list = _organization_list;
          }
        });
      },

      // 获取学校详情
      getItem: function () {
        CommonProvider.promise({
          model: OrganizationModel,
          method: 'item',
          params: { organization_id: $stateParams.organization_id },
          success: function (organization_item) {
            $scope.organization = organization_item.result;
          }
        });
      },

      // 新增学校
      add: function () {        
        CommonProvider.promise({
          model: OrganizationModel,
          method: 'add',
          params: $scope.organization,
          success: function (_organization) {
            $modal.success({
              message: _organization.message,
              callback: function () {
                $location.path('/organization/manage/list/index');
              }
            });
          },
          error: function (_organization) {
            $modal.error({
              message: _organization.message
            });
          }
        });
      },

      // 编辑学校
      edit: function (params) {
        $scope.organization.role = 'admin';
        CommonProvider.promise({
          model: OrganizationModel,
          method: 'put',
          params: { new: $scope.organization },
          success: function (_organization) {
            $modal.success({
              message: _organization.message,
              callback: function () {
                $location.path('/organization/manage/list/index');
              }
            });
          },
          error: function (_organization) {
            $modal.error({
              message: _organization.message
            });
          }
        });
      },

      // 上传结果回调函数
      getUploadLogo: function (data) {
        if (data) {
          $scope.organization.logo = data.key;
        }
      },

      getUploadScenery: function (data) {
        if (data) {
          $scope.organization.scenery = data.key;
        }
      },

      // 删除学校
      del: function (params) {
        if (params.batch && $scope.organization_list.result.checked().length == 0) {
          $modal.error({ message: '至少需要选中一所学校' });
          return false;
        };
        $modal.confirm({
          title: '确认删除',
          message: params.batch ? '确定要删除选中学校吗？' : '确定要删除此学校吗？',
          info: '学校删除操作不可撤销',
          onsubmit: function () {
            CommonProvider.promise({
              model: OrganizationModel,
              method: params.batch ? 'delete' : 'del',
              params: params.batch ? $scope.organization_list.result.checked() : params.organization,
              success: function (_organization) {
                $modal.success({
                  message: _organization.message
                });
              },
              error: function (_organization) {
                $modal.error({
                  message: _organization.message
                });
              }
            });
          }
        });
      },

      // 审核学校
      audit: function (params) {
        if (params.modal) {
          $rootScope.organization_local = params.organization;
          $rootScope.organization_edit  = angular.copy(params.organization.organization);
          $modal.custom({
            title: '学校审核',
            template_url: '/partials/admin/organization/manage/audit.html',
            callback: function () {
              delete $rootScope.organization_edit;
            }
          });
        } else {
          $scope.organization.role = 'admin';
          CommonProvider.promise({
          model: OrganizationModel,
          method: 'put',
          params: { new: $scope.organization, old: $rootScope.organization_local },
          success: function (_organization) {
            $rootScope.modal.close();
            $modal.success({
              message: _organization.message,
              callback: function () {
                delete $rootScope.organization_local;
              }
            });
          },
          error: function (_organization) {
            $modal.error({
              message: _organization.message
            });
          }
        });
        }
      }
    };

    $scope.organizationUserAction = {

      // 老师管理首页
      getIndex: function () {
        $scope.organizationUserAction.getLists();
        $scope.organizationAction.getLists({
          per_page: 1000,
          role: 'admin'
        });
      },

      // 过滤条件变更
      filterChanged: function () {
        $scope.organizationUserAction.getLists();
      },

      // 获取老师列表
      getLists: function (page) {

        var get_params = {
          organization_role: 'admin',
          role: 'admin',
          page: page || 1,
        };

        var filters = $scope.filter;
        for (var key in filters) {
          if (filters[key] != 'all' && !!filters[key]) get_params[key] = filters[key];
        };

        // console.log(get_params);

        CommonProvider.promise({
          model: OrganizationModel,
          method: 'relation',
          params: get_params,
          success: function (_organization_user_list) {
            $scope.organization_user_list = _organization_user_list;
          }
        });
      },

      // 老师详情
      getItem: function () {
        CommonProvider.promise({
          model: OrganizationModel,
          method: 'itemRelation',
          params: { relation_id: $stateParams.organization_user_id, role: 'admin' },
          success: function (_organization_item) {
            // console.log(_organization_item);
            $scope.organization_user = _organization_item.result;
            $scope.organization_user.status = $scope.organization_user.status.toString();
          }
        });
      },

      // 删除老师
      del: function (params) {
        if (params.organization_user) {
          var relation_user = params.organization_user.organization_user;
          relation_user.relation_id = relation_user.id;
          relation_user.role = 'admin';
          $modal.confirm({
            title: '确认删除',
            message: '确定要删除此老师吗？',
            info: '老师删除后可在回收站中查看',
            onsubmit: function () {
              CommonProvider.promise({
                model: OrganizationModel,
                method: 'delRelation',
                params: relation_user,
                success: function (_organization_user) {
                  $modal.success({
                    message: _organization_user.message
                  });
                },
                error: function (_organization_user) {
                  $modal.error({
                    message: _organization_user.message
                  });
                }
              });
            }
          });
        } 
      },

      // 修改老师关系
      putItem: function () {
        var organization_user = {
          id: $scope.organization_user.id,
          body: {
            title: $scope.organization_user.title,
            introduction: $scope.organization_user.introduction,
            status: $scope.organization_user.status,
            memo: $scope.organization_user.memo
          },
          organization_role: 'admin',
          role: 'admin'
        };
        // console.log(organization_user);
        CommonProvider.promise({
          model: OrganizationModel,
          method: 'putRelation',
          params: organization_user,
          success: function (_organization_user) {
            $modal.success({ message: _organization_user.message});
            // $location.path('/organization/manage/organization_user/list');
          },
          error: function (_err) {
            $modal.error({ message: _err.message });
          }
        });
      },

      // 增加老师弹窗
      addTeacher: function () {
        $modal.custom({
          title: '增加老师',
          template_url: '/partials/admin/organization/organization_user/add.html',
          callback: function () {
            // delete $rootScope.announcement_item;
          }
        });
      },

      // 增加老师关系
      addItem: function () {
        var organization_user = {
          type: '',
          body: {
            title: $scope.organization_user.title,
            introduction: $scope.organization_user.introduction,
            status: $scope.organization_user.status,
            memo: $scope.organization_user.memo
          },
          organization_role: 'admin',
          role: 'admin'
        };
        console.log(organization_user);
        CommonProvider.promise({
          model: OrganizationModel,
          method: 'addRelation',
          params: organization_user,
          success: function (_organization_user) {
            $modal.success({ message: _organization_user.message});
            // $location.path('/organization/manage/organization_user/list');
          },
          error: function (_err) {
            $modal.error({ message: _err.message });
          }
        });
      },

    };
  }
]);