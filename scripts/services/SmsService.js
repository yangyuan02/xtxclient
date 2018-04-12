/**
*
* SmsService Module
*
* Description
*
*/
angular.module('SmsService', [])
.service('SmsService', ['$resource', 'appConfig',
  function($resource, appConfig){
    return $resource(appConfig.apiUrl + '/sms', {}, {

      // item
      item: {
        method: 'GET',
        url: appConfig.apiUrl + '/sms/:sms_id'
      },

      // del
      del: {
        method: 'DELETE',
        url: appConfig.apiUrl + '/sms/:sms_id'
      },

    });
  }
]);