/**
* OrganizationModel Module
*
* Description
*/
angular.module('OrganizationModel', ['OrganizationService'])

// 课程数据模型
.factory('OrganizationModel', ['OrganizationService', 'CommonProvider',
  function(OrganizationService, CommonProvider){

    var _organization_list;
    var _organization_relation;
    var _organization_model = {};

    _organization_model = {

      // 获取学校列表
      get: function (params) {
        params.page = params.page || 1;
        params.per_page = params.per_page || 20;
        return CommonProvider.request({
          method: 'get',
          service: new OrganizationService(),
          params: params,
          success: function (_organization_lists) {
            _organization_list = _organization_lists;
          }
        });
      },

      // 获取关系列表
      relation: function (params) {
        params.page = params.page || 1;
        params.per_page = params.per_page || 20;
        return CommonProvider.request({
          method: 'relation',
          service: new OrganizationService(),
          params: params,
          success: function (_organization_relations) {
            _organization_relation = _organization_relations;
          }
        });
      },

      // 获取学校老师详情
      itemRelation: function (params) {
        return CommonProvider.request({
          method: 'itemRelation',
          service: new OrganizationService(params),
          params: params
        });
      },

      // 修改用户机构关系
      putRelation: function (relation) {
        return CommonProvider.request({
          method: 'putRelation',
          service: new OrganizationService(relation.body),
          params: {
            role: relation.role,
            relation_id: relation.id,
            organization_role: relation.organization_role,
          }
        });
      },

      // 新增关系
      addRelation: function (relation) {
        return CommonProvider.request({
          method: 'addRelation',
          service: new OrganizationService(relation.body),
          params: { type: relation.type }
        });
      },

      // 删除用户机构关系
      delRelation: function (relation) {
        return CommonProvider.request({
          method: 'delRelation',
          service: new OrganizationService(),
          params: relation,
          success: function (_relation) {
            _organization_relation.result.remove(relation);
            _organization_relation.pagination.total -= 1;
          }
        });
      },

      // 获取学校基本信息
      item: function (params) {
        return CommonProvider.request({
          method: 'item',
          service: new OrganizationService(),
          params: params,
          success: function (_organization_item) {
            return _organization_item;
          }
        });
      },

      // 获取机构profile
      getProfile: function (params) {
        return CommonProvider.request({
          method: 'getProfile',
          service: new OrganizationService(params),
          params: params
        });
      },

      // 获取机构profile
      putProfile: function (params) {
        return CommonProvider.request({
          method: 'putProfile',
          service: new OrganizationService(params.body),
          params: {
            role: params.role,
            organization_id: params.organization_id,
          }
        });
      },

      // 新增学校
      add: function (organization) {
        return CommonProvider.request({
          method: 'save',
          service: new OrganizationService(organization),
          success: function (_organization) {
            return _organization;
          }
        });
      },

      // 修改学校
      put: function (organization) {
        return CommonProvider.request({
          method: 'put',
          service: new OrganizationService(organization.new),
          params: { 
            role: organization.role || 'user',
            organization_id: organization.new.id
          },
          success: function (_organization) {
            // 更新列表信息
            if (organization.old != undefined) {
              _organization_list.result[organization.old.$parent.$index] = _organization.result;
            }
          }
        });
      },

      // 删除学校
      del: function (organization) {
        return CommonProvider.request({
          method: 'del',
          service: new OrganizationService(),
          params: { organization_id: organization.organization.id },
          success: function (_organization) {
            _organization_list.result.remove(organization.organization);
            _organization_list.pagination.total -= 1;
          }
        });
      },

      // 批量删除学校
      delete: function (ids) {
        return CommonProvider.request({
          method: 'delete',
          service: new OrganizationService(),
          params: { ids: ids.join(',') },
          success: function (_organization) {
            _organization_model.get({ page: _organization_list.pagination.current_page });
          }
        });
      },

    };

    return _organization_model;
  }
]);