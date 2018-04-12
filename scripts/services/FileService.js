/**
*
* FileService Module
*
* Description
*
*/
angular.module('FileService', [])
.service('FileService', ['$resource', 'appConfig',
  function ($resource, appConfig) {
    return $resource(appConfig.apiUrl + '/file/:type', {
        type: '@type'
      }, {

      getFileUptoken: {
        method: 'GET',
        params: {token: '@token'},
        url: appConfig.apiUrl + '/file/file_uptoken'
      },
      getVideoUptoken: {
        method: 'GET',
        params: {token: '@token'},
        url: appConfig.apiUrl + '/file/video_uptoken/:key'
      }

    });
  }
]);