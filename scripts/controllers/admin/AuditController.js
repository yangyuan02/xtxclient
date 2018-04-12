/**
*
* AuditController Module
* 机构资质管理模块
*
* Description
*/
angular.module('AuditController', ['AuditModel'])
.controller('AuditController', ['$scope', '$rootScope', '$state', '$stateParams', '$location', '$modal', 'AuditModel', 'CommonProvider', function($scope, $rootScope, $state, $stateParams, $location, $modal, AuditModel, CommonProvider) {

    /*----------------机构资质管理事件----------------*/
    $scope.filter = { status: 'all' };

    $scope.auditAction = {

      // 机构资质不同状态筛选
      filterChanged: function () {
        $scope.auditAction.getLists();
      },

      // 获取列表数据
      getLists: function(page) {
        var get_params = {
          order_method: 'desc',
          page: page || 1
        };
        if ($scope.filter.status != 'all') get_params.status = $scope.filter.status;
        CommonProvider.promise({
          model: AuditModel,
          method: 'get',
          params: get_params,
          success: function (audit_list) {
            $scope.audit_list = audit_list;
          }
        });
      },

      // 获取机构资质详情
      getItem: function () {
        CommonProvider.promise({
          model: AuditModel,
          method: 'item',
          params: { organization_id: $stateParams.organization_id, role: 'admin' },
          success: function (audit_item) {
            $scope.audit = audit_item.result;
          }
        });
      },

      // 编辑机构资质
      edit: function (params) {
        var audit = {
          role: 'admin',
          body: $scope.audit,
          organization_id: $scope.audit.organization_id
        };
        // return console.log(audit);
        CommonProvider.promise({
          model: AuditModel,
          method: 'put',
          params: audit,
          success: function (_audit) {
            $modal.success({
              message: _audit.message,
              callback: function () {
                $location.path('/organization/manage/audit/list');
              }
            });
          },
          error: function (_audit) {
            $modal.error({
              message: _audit.message
            });
          }
        });
      },

      // 删除机构资质
      del: function (params) {
        if (params.batch && $scope.audit_list.result.checked().length == 0) {
          $modal.error({ message: '至少需要选中一个机构资质' });
          return false;
        };
        $modal.confirm({
          title: '确认删除',
          message: params.batch ? '确定要删除选中机构资质吗？' : '确定要删除此机构资质吗？',
          info: '机构资质删除后可在机构资质回收站中查看',
          onsubmit: function () {
            CommonProvider.promise({
              model: AuditModel,
              method: params.batch ? 'delete' : 'del',
              params: params.batch ? $scope.audit_list.result.checked() : params.audit,
              success: function (_audit) {
                $modal.success({
                  message: _audit.message
                });
              },
              error: function (_audit) {
                $modal.error({
                  message: _audit.message
                });
              }
            });
          }
        });
      },

    };
  }
]);