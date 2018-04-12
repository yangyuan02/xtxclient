/**
*
* StudentService Module
*
* Description
*
*/
angular.module('StudentService', [])
.service('StudentService', ['$resource', 'appConfig',
  function ($resource, appConfig) {
    return $resource(appConfig.apiUrl + '/user/:target_type', {}, {

      // 修改用户
      put: {
        method: 'PUT',
        url: appConfig.apiUrl + '/account/info'
      },

    })
  }
]);