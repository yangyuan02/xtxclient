/**
*
* AuditService Module
*
* Description
*
*/
angular.module('AuditService', [])
.service('AuditService', ['$resource', 'appConfig',
  function ($resource, appConfig) {
    return $resource(appConfig.apiUrl + '/organization/audit_infos', {}, {

      // put
      put: {
        method: 'PUT',
        url: appConfig.apiUrl + '/organization/:organization_id/audit_info'
      },

      // item
      item: {
        method: 'GET',
        url: appConfig.apiUrl + '/organization/:organization_id/audit_info'
      },

      // 修改机构认证
      put: {
        method: 'PUT',
        url: appConfig.apiUrl + '/organization/:organization_id/audit_info'
      },

    })
  }
]);