/**
*
* AuditModel Module
*
* Description
*
*/
angular.module('AuditModel', ['AuditService'])

// 机构认证数据模型
.factory('AuditModel', ['AuditService', 'CommonProvider',
  function(AuditService, CommonProvider){

    var _audit_model = {

      // 获取机构认证列表
      get: function (params) {
        return CommonProvider.request({
          method: 'get',
          service: new AuditService(),
          params: params
        });
      },

      // 获取单条机构认证详情
      item: function (params) {
        return CommonProvider.request({
          method: 'item',
          service: new AuditService(),
          params: params,
        });
      },

      // 修改机构认证资料
      put: function (audit) {
        return CommonProvider.request({
          method: 'put',
          service: new AuditService(audit.body),
          params: {
            role: audit.role,
            organization_id: audit.organization_id
          }
        });
      },

    }

    return _audit_model;
  }
]);