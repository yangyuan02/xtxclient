/**
*
* PartnerService Module
*
* Description
*
*/
angular.module('PartnerService', [])
.service('PartnerService', ['$resource', 'appConfig',
  function ($resource, appConfig) {
    return $resource(appConfig.apiUrl + '/partner', {}, {

      // 修改单个入驻机构
      put: {
        method: 'PUT',
        url: appConfig.apiUrl + '/partner/:partner_id'
      },

      // 删除单个入驻机构
      del: {
        method: 'DELETE',
        url: appConfig.apiUrl + '/partner/:partner_id'
      },

    })
  }
]);