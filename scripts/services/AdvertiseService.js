/**
*
* AdvertiseService Module
*
* Description
*
*/
angular.module('AdvertiseService', [])
.service('AdvertiseService', ['$resource', 'appConfig',
  function($resource, appConfig){
    return $resource(appConfig.apiUrl + '/advertise', {}, {

      // item
      item: {
        method: 'GET',
        url: appConfig.apiUrl + '/advertise/:advertise_id'
      },

      // del
      del: {
        method: 'DELETE',
        url: appConfig.apiUrl + '/advertise/:advertise_id'
      },

      // put
      put: {
        method: 'PUT',
        url: appConfig.apiUrl + '/advertise/:advertise_id'
      },

    });
  }
]);