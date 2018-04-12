/**
*
* ChatService Module
*
* Description
*
*/
angular.module('ChatService', [])
.service('ChatService', ['$resource', 'appConfig',
  function ($resource, appConfig) {
    return $resource(appConfig.apiUrl + '/chat/record/:section_id', {}, {

      // Example
      /*
      get: {
        method: 'GET',
        url: appConfig.apiUrl + '/chat_message/:type'
      }
      */
      
    });
  }
])