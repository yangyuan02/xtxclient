/**
*
* OrganizationService Module
*
* Description
*
*/
angular.module('OrganizationService', [])
.service('OrganizationService', ['$resource', 'appConfig',
  function($resource, appConfig){
    return $resource(appConfig.apiUrl + '/organization', {
        per_page: '@per_page',
        page: '@page' 
      }, {

      // 获取老师机构关系
      relation: {
        method: 'GET',
        url: appConfig.apiUrl + '/organization_user'
      },

      // 机构教师详情
      itemRelation: {
        method: 'GET',
        url: appConfig.apiUrl + '/organization_user/:relation_id'
      },

      // 增加老师机构关系
      addRelation: {
        method: 'POST',
        url: appConfig.apiUrl + '/organization_user'
      },

      // 修改老师机构关系
      putRelation: {
        method: 'PUT',
        url: appConfig.apiUrl + '/organization_user/:relation_id'
      },

      // 删除老师机构关系
      delRelation: {
        method: 'DELETE',
        url: appConfig.apiUrl + '/organization_user/:relation_id'
      },

      // item
      item: {
        method: 'GET',
        url: appConfig.apiUrl + '/organization/:organization_id'
      },

      // search
      search: {
        method: 'GET',
        url: appConfig.apiUrl + '/organization/search'
      },

      // get profile
      getProfile: {
        method: 'GET',
        url: appConfig.apiUrl + '/organization/:organization_id/profile'
      },

      // put profile
      putProfile: {
        method: 'PUT',
        url: appConfig.apiUrl + '/organization/:organization_id/profile'
      },

      // put
      put: {
        method: 'PUT',
        url: appConfig.apiUrl + '/organization/:organization_id'
      },

      // del
      del: {
        method: 'DELETE',
        url: appConfig.apiUrl + '/organization/:organization_id'
      },

    });
  }
]);