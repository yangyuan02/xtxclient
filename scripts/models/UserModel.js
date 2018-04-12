/*
*
* User 数据模型
*
* Description
*
*/
angular.module('UserModel', ['UserService'])

// 用户数据模型
.factory('UserModel', ['UserService', 'CommonProvider',
  function (UserService, CommonProvider) {

    // 初始化
    var _user;
    var _user_list;
    var _user_service = new UserService();

    var _user_model = {

      // 获取用户列表
      get: function (params) {
        return CommonProvider.request({
          method: 'get',
          service: _user_service,
          params: params,
          success: function (_user_lists) {
            _user_list = _user_lists;
          }
        });
      },

      // 获取单个用户
      item: function (params) {
        return CommonProvider.request({
          method: 'item',
          service: new UserService(),
          params: params,
          success: function (user) {
            _user = user;
          }
        });
      },

      // 增加用户
      add: function (user) {
        return CommonProvider.request({
          method: 'save',
          service: new UserService(user),
          success: function (_user) {
            _user_list.result.unshift(_user.result);
            _user_list.pagination.total += 1;
          }
        });
      },

      // 删除用户
      del: function (user) {
        return CommonProvider.request({
          method: 'del',
          service: new UserService(),
          params: { user_id: user.user.id },
          success: function (_user) {
            _user_list.result.remove(user.user);
            _user_list.pagination.total -= 1;
          }
        });
      },

      // 修改用户
      put: function (user) {
        return CommonProvider.request({
          method: 'put',
          service: new UserService(user.new),
          params: { user_id: user.new.id },
          success: function (_user) {
            var roles = angular.copy(user.old.user.roles);
            _user_list.result[user.old.$parent.$index] = _user.result;
            _user_list.result[user.old.$parent.$index].roles = roles;
          }
        });
      },

      // (批量)禁用用户
      disable: function (params) {
        var ids = params.length ? params.join(',') : params.user.id;
        return CommonProvider.request({
          method: 'disable',
          service: new UserService({ ids: ids }),
          success: function (_user) {
            if (params.length) {
              _user_model.get({ page: _user_list.pagination.current_page });
            } else {
              params.user.x_status = 0;
            }
          }
        });
      },

      // (批量)启用用户
      enable: function (params) {
        var ids = params.length ? params.join(',') : params.user.id;
        return CommonProvider.request({
          method: 'enable',
          service: new UserService({ ids: ids }),
          success: function (_user) {
            if (params.length) {
              _user_model.get({ page: _user_list.pagination.current_page });
            } else {
              params.user.x_status = 1;
            }
          }
        });
      },

      // 批量删除用户
      delete: function (ids) {
        return CommonProvider.request({
          method: 'delete',
          service: new UserService(),
          params: { ids: ids.join(',') },
          success: function (_user) {
            _user_model.get({ page: _user_list.pagination.current_page });
          }
        });
      },

      // 更新用户所属角色组
      role: function (params) {
        return CommonProvider.request({
          method: 'role',
          service: new UserService({ ids: params.ids.join(',') }),
          params: { user_id: params.add ? params.user.id : params.user.user.id },
          success: function (_user) {
            if (params.add) {
              _user_list.result[0].roles = _user.result.roles;
            } else {
              _user_list.result[params.user.$parent.$index].roles = _user.result.roles;
            }
          }
        });
      },

    };

    return _user_model;
  }
])

// 角色组数据模型
.factory('RoleModel', ['RoleService', 'CommonProvider',
  function (RoleService,  CommonProvider) {

    // 初始化
    var _role_item;
    var _role_list;
    var _role_model = {};
    var _role_service = new RoleService();

    // 获取角色列表
    _role_model.get = function(config) {

      var get_config = {
        page: config ? config.page : 1,
        per_page: config ? config.per_page : 20
      };

      return CommonProvider.request({
        method: 'get',
        service: _role_service,
        params: get_config,
        success: function (roles) {
          _role_list = roles;
        }
      });
    };

    // 增加角色
    _role_model.add = function (role) {
      return CommonProvider.request({
        method: 'save',
        service: new RoleService(role),
        success: function (_role) {
          _role_list.result.unshift(_role.result);
          _role_list.pagination.total += 1;
        }
      });
    };

    // 删除角色
    _role_model.del = function (role) {
      return CommonProvider.request({
        method: 'del',
        service: new RoleService(),
        params: { role_id: role.role.id },
        success: function (_role) {
          _role_list.result.splice(role.$index, 1);
          _role_list.pagination.total -= 1;
        }
      });
    };

    // 修改角色
    _role_model.put = function (role) {
      return CommonProvider.request({
        method: 'put',
        service: new RoleService(role.new),
        params: { role_id: role.new.id },
        success: function (_role) {
          role.old.role = _role.result;
        }
      });
    };

    // 批量删除角色
    _role_model.delete = function (ids) {
      return CommonProvider.request({
        method: 'delete',
        service: new RoleService(),
        params: { ids: ids.join(',') },
        success: function (_user) {
          _role_model.get({ page: _role_list.pagination.current_page });
        }
      });
    };

    // (批量)禁用角色
    _role_model.disable = function (params) {
      var ids = params.length ? params.join(',') : params.role.id;
      return CommonProvider.request({
        method: 'disable',
        service: new RoleService({ ids: ids }),
        success: function (_role) {
          if (params.length) {
            _role_model.get({ page: _role_list.pagination.current_page });
          } else {
            params.role.x_status = 0;
          }
        }
      });
    };

    // (批量)启用角色
    _role_model.enable = function (params) {
      var ids = params.length ? params.join(',') : params.role.id;
      return CommonProvider.request({
        method: 'enable',
        service: new RoleService({ ids: ids }),
        success: function (_role) {
          if (params.length) {
            _role_model.get({ page: _role_list.pagination.current_page });
          } else {
            params.role.x_status = 1;
          }
        }
      });
    };

    // 修改（添加）角色权限
    _role_model.permission = function (role) {
      return CommonProvider.request({
        method: 'permission',
        service: new RoleService({ ids: role.ids.join(',') }),
        params: { role_id: role.id }
      });
    };

    // 获取单个用户资料
    _role_model.getRole = function (role_id) {
      return CommonProvider.request({
        method: 'getRole',
        service: _role_service,
        params: { role_id: role_id },
        success: function (_role) {
          _role_item = _role.result;
        }
      });
    };

    return _role_model;
  }
])

// 权限数据模型
.factory('PermissionModel', ['PermissionService', 'CommonProvider',
  function (PermissionService, CommonProvider) {

    // 初始化
    var _permission_item;
    var _permission_list;
    var _permission_model = {};
    var _permission_service = new PermissionService();

    // 获取权限列表
    _permission_model.get = function () {
      return CommonProvider.request({
        method: 'get',
        service: _permission_service,
        success: function (permission_list) {
          _permission_list = permission_list.result;
        }
      });
    };

    // 增加权限
    _permission_model.add = function (permission) {

      // 格式化数据，确定回调所需参数
      permission.type = Number(permission.type) || 0;

      var root_index = permission.belong.root ? Number(permission.belong.root.index) : 0;
      var node_index = permission.belong.node ? Number(permission.belong.node.index) : 0;
      var page_index = permission.belong.page ? Number(permission.belong.page.index) : 0;
      
      // 添加菜单
      var add_menu = function (_permission) {
        _permission_list.push(_permission);
      };

      // 添加节点
      var add_node = function (_permission) {
        if (!!_permission_list[root_index].children) {
          _permission_list[root_index].children.push(_permission);
        } else {
          _permission_list[root_index].children = [];
          _permission_list[root_index].children.push(_permission);
        }
      };

      // 添加页面
      var add_page = function (_permission) {
        if(!!_permission_list[root_index]) {
          if(!!_permission_list[root_index].children[node_index]) {
            if (!!_permission_list[root_index].children[node_index].children) {
              _permission_list[root_index].children[node_index].children.push(_permission);
            } else {
              _permission_list[root_index].children[node_index].children = [];
              _permission_list[root_index].children[node_index].children.push(_permission);
            }
          }
        }
      };

      // 添加功能
      var add_func = function (_permission) {
        if(!!_permission_list[root_index]) {
          if(!!_permission_list[root_index].children[node_index]) {
            if(!!_permission_list[root_index].children[node_index].children[page_index]) {
              if (!!_permission_list[root_index].children[node_index].children[page_index].children) {
                _permission_list[root_index].children[node_index].children[page_index].children.push(_permission);
              } else {
                _permission_list[root_index].children[node_index].children[page_index].children = [];
                _permission_list[root_index].children[node_index].children[page_index].children.push(_permission);
              }
            }
          }
        }
      };

      // 请求前格式化格式
      var add_check = function () {
        switch(permission.type) {
          case 1:
            permission.pid = 0;
            break;
          case 2:
            permission.pid = permission.belong.root.id;
            break;
          case 3:
            permission.pid = permission.belong.node.id;
            break;
          case 4:
            permission.pid = permission.belong.page.id;
            break;
          default:
            console.log('类型参数不正确');
            break;
        };
      };

      add_check();
      return CommonProvider.request({
        method: 'save',
        service: new PermissionService(permission),
        success: function (_permission) {
          _permission.result.x_status = _permission.x_status || 1;
          switch(permission.type) {
            case 1:
              add_menu(_permission.result);
              break;
            case 2:
              add_node(_permission.result);
              break;
            case 3:
              add_page(_permission.result);
              break;
            case 4:
              add_func(_permission.result);
              break;
            default:
              console.log('类型参数不正确');
              break;
          };
        }
      });
    };

    // 删除权限
    _permission_model.del = function (permission) {
      return CommonProvider.request({
        method: 'del',
        service: new PermissionService(),
        params: { permission_id: permission.permission.id },
        success: function (_permission) {
          if (permission.permission.type == 1) {
            _permission_list.splice(permission.$index, 1);
          } else {
            permission.$parent.$parent.permission.children.splice(permission.$index, 1);
          }
        }
      });
    };

    // 修改权限
    _permission_model.put = function (permission) {
      return CommonProvider.request({
        method: 'put',
        service: new PermissionService(permission.new),
        params: { permission_id: permission.new.id },
        success: function (_permission) {
          permission.old.permission = permission.new;
        }
      });
    };

    // （批量）禁用权限
    _permission_model.disable = function (params) {
      var ids = params.length ? params.join(',') : params.permission.id;
      return CommonProvider.request({
        method: 'disable',
        service: new PermissionService({ ids: ids }),
        success: function (_permission) {
          if (params.length) {
            _permission_model.get();
          } else {
            params.permission.x_status = 0;
          }
        }
      });
    };

    // （批量）启用权限
    _permission_model.enable = function (params) {
      var ids = params.length ? params.join(',') : params.permission.id;
      return CommonProvider.request({
        method: 'enable',
        service: new PermissionService({ ids: ids }),
        success: function (_permission) {
          if (params.length) {
            _permission_model.get();
          } else {
            params.permission.x_status = 1;
          }
        }
      });
    };

    // 批量删除权限
    _permission_model.delete = function (ids) {
      return CommonProvider.request({
        method: 'delete',
        service: new PermissionService(),
        params: { ids: ids.join(',') },
        success: function (_permission) {
          _permission_model.get();
        }
      });
    };

    // 获取单个权限
    _permission_model.item = function (id) {
      return CommonProvider.request({
        method: 'item',
        service: new PermissionService(),
        params: { permission_id: id },
        success: function (_permission) {
          _permission_item = _permission.result;
        }
      });
    };

    // 修改/增加api
    _permission_model.api = function (params) {
      return CommonProvider.request({
        method: 'api',
        service: new PermissionService({ ids: params.ids.join(',') }),
        params: { permission_id: params.id }
      });
    };

    // 重新排序
    _permission_model.sort = function (sorts) {
      return CommonProvider.request({
        method: 'sort',
        service: new PermissionService(),
        body: { data: sorts }
      });
    };

    return _permission_model;
  }
])

// API数据模型
.factory('GrantApiModel', ['GrantApiService', 'CommonProvider', 
  function (GrantApiService, CommonProvider) {

    // 初始化
    var _api_list;
    var _api_model = {};
    var _api_service = new GrantApiService();

    // 获取API列表
    _api_model.get = function(params) {
      return CommonProvider.request({
        method: 'get',
        params: params,
        service: _api_service,
        success: function (apis) {
          _api_list = apis;
        }
      });
    };

    // 增加API
    _api_model.add = function (api) {
      return CommonProvider.request({
        method: 'save',
        service: new GrantApiService(api),
        success: function (_api) {
          _api_list.result.unshift(_api.result);
          _api_list.pagination.total += 1;
        }
      });
    };

    // 删除API
    _api_model.del = function (api) {
      return CommonProvider.request({
        method: 'del',
        service: new GrantApiService(),
        params: { api_id: api.api.id },
        success: function (_api) {
          _api_list.result.splice(api.$index, 1);
          _api_list.pagination.total -= 1;
        }
      });
    };

    // 修改API
    _api_model.put = function (api) {
      return CommonProvider.request({
        method: 'put',
        service: new GrantApiService(api.new),
        params: { api_id: api.new.id },
        success: function (_api) {
          api.old.api = _api.result;
        }
      });
    };

    // 批量删除API
    _api_model.delete = function (ids) {
      return CommonProvider.request({
        method: 'delete',
        service: new GrantApiService(),
        params: { ids: ids.join(',') },
        success: function (_user) {
          _api_model.get({ page: _api_list.pagination.current_page });
        }
      });
    };

    return _api_model;
  }
])