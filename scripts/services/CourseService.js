/**
*
* CourseService Module
*
* Description
*
*/
angular.module('CourseService', [])
.service('CourseService', ['$resource', 'appConfig',
  function ($resource, appConfig) {
    return $resource(appConfig.apiUrl + '/course', {
        per_page: '@per_page',
        page: '@page',
      }, {

      // info
      getUsersInfo: {
        method: 'POST',
        url: appConfig.apiUrl + '/user/info'
      },

      // item
      item: {
        method: 'GET',
        url: appConfig.apiUrl + '/course/:course_id'
      },

      // search
      search: {
        method: 'GET',
        url: appConfig.apiUrl + '/course/search/'
      },

      // del
      del: {
        method: 'DELETE',
        url: appConfig.apiUrl + '/course/:course_id'
      },

      // put
      put: {
        method: 'PUT',
        url: appConfig.apiUrl + '/course/:course_id'
      },

      // 批量禁用
      disable: {
        method: 'PUT',
        url: appConfig.apiUrl + '/course/disable'
      },

      // 批量启用
      enable: {
        method: 'PUT',
        url: appConfig.apiUrl + '/course/enable'
      },
      
      // 相关课程
      others: {
        method: 'GET',
        url: appConfig.apiUrl + '/course/:course_id/others'
      },

      // 同学
      classmates: {
        method: 'GET',
        url: appConfig.apiUrl + '/course/:course_id/classmates'
      },

      // 关系
      relation: {
        method: 'GET',
        url: appConfig.apiUrl + '/course/:course_id/with/user'
      },

      // 试听记录
      operation: {
        method: 'POST',
        url: appConfig.apiUrl + '/course/:course_id/operation'
      },

    });
  }
])