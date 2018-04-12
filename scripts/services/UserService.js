/*
*
* 用户数据请求模块 
*
* Description
*
*/
angular.module('UserService', [])

// 用户数据资源服务
.service('UserService', ['$resource', 'appConfig',
  function ($resource, appConfig) {
    return $resource(appConfig.apiUrl + '/user', {
        per_page: '@per_page',
        page: '@page' 
      }, {

      // item
      item: {
        method: 'GET',
        url: appConfig.apiUrl + '/user/:user_id'
      },

      // search
      search: {
        method: 'GET',
        url: appConfig.apiUrl + '/user/search'
      },
      
      // del
      del: {
        method: 'DELETE',
        url: appConfig.apiUrl + '/user/:user_id'
      },

      // put
      put: {
        method: 'PUT',
        url: appConfig.apiUrl + '/user/:user_id'
      },

      // 批量禁用
      disable: {
        method: 'PUT',
        url: appConfig.apiUrl + '/user/disable'
      },

      // 批量启用
      enable: {
        method: 'PUT',
        url: appConfig.apiUrl + '/user/enable'
      },

      // 更新用户角色
      role: {
        method: 'POST',
        url: appConfig.apiUrl + '/user/:user_id/role'
      }

    });
  }
])

// 角色组数据资源服务
.service('RoleService', ['$resource', 'appConfig',
  function ($resource, appConfig) {
    return $resource(appConfig.apiUrl + '/role', {
        per_page: '@per_page',
        page: '@page' 
      }, {

      // 获取单个角色
      getRole: {
        method: 'GET',
        url: appConfig.apiUrl + '/role/:role_id'
      },

      // del
      del: {
        method: 'DELETE',
        url: appConfig.apiUrl + '/role/:role_id'
      },

      // put
      put: {
        method: 'PUT',
        url: appConfig.apiUrl + '/role/:role_id'
      },

      // 批量禁用
      disable: {
        method: 'PUT',
        url: appConfig.apiUrl + '/role/disable'
      },

      // 批量启用
      enable: {
        method: 'PUT',
        url: appConfig.apiUrl + '/role/enable'
      },

      // 更新角色权限
      permission: {
        method: 'POST',
        url: appConfig.apiUrl + '/role/:role_id/permission'
      }

    });
  }
])

// 权限数据资源服务
.service('PermissionService', ['$resource', 'appConfig',
  function ($resource, appConfig) {
    return $resource(appConfig.apiUrl + '/permission', {}, {

      // get_item
      item: {
        method: 'GET',
        url: appConfig.apiUrl + '/permission/:permission_id'
      },

      // del
      del: {
        method: 'DELETE',
        url: appConfig.apiUrl + '/permission/:permission_id'
      },

      // put
      put: {
        method: 'PUT',
        url: appConfig.apiUrl + '/permission/:permission_id'
      },

      // 批量禁用
      disable: {
        method: 'PUT',
        url: appConfig.apiUrl + '/permission/disable'
      },

      // 批量启用
      enable: {
        method: 'PUT',
        url: appConfig.apiUrl + '/permission/enable'
      },

      // api关系更新
      api: {
        method: 'POST',
        url: appConfig.apiUrl + '/permission/:permission_id/api'
      },

      // 更新排序
      sort: {
        method: 'POST',
        url: appConfig.apiUrl + '/permission/update_sort'
      }
    });
  }
])

// API资源服务
.service('GrantApiService', ['$resource', 'appConfig',
  function ($resource, appConfig) {
    return $resource(appConfig.apiUrl + '/api', {
        per_page: '@per_page',
        page: '@page' 
      }, {

      // del
      del: {
        method: 'DELETE',
        url: appConfig.apiUrl + '/api/:api_id'
      },

      // put
      put: {
        method: 'PUT',
        url: appConfig.apiUrl + '/api/:api_id'
      }
    });
  }
])