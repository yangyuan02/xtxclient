/**
*
* AnnouncementService Module
*
* Description
*
*/
angular.module('AnnouncementService', [])
.service('AnnouncementService', ['$resource', 'appConfig',
  function ($resource, appConfig) {
    return $resource(appConfig.apiUrl + '/announcement', {}, {


      put: {
        method: 'PUT',
        url: appConfig.apiUrl + '/announcement/:announcement_id'
      },

      del: {
        method: 'DELETE',
        url: appConfig.apiUrl + '/announcement/:announcement_id'
      },

    })
  }
]);