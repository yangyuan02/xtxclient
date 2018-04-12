/**
*
* MsgService Module
*
* Description
*
*/
angular.module('MsgService', [])
.service('MsgService', ['$resource', 'appConfig',
  function($resource, appConfig){
    return $resource(appConfig.apiUrl + '/message', {
        per_page: '@per_page',
        page: '@page' 
      }, {

      // 批量操作
      batch: {
        method: 'PUT',
        url: appConfig.apiUrl + '/message/:act_type'
      }

    });
  }
]);