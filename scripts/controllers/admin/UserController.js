/**
* UserController Module
*
* Description
*
*/
angular.module('UserController', ['angular.validation', 'angular.validation.rule', 'UserModel', 'angular-sortable-view', 'UserService'])
.controller('UserController', ['$scope', '$rootScope', '$state', '$stateParams', '$modal', '$location', 'UserModel', 'RoleModel', 'PermissionModel', 'GrantApiModel', 'UserService', 'CommonProvider', 'PermissionProvider', function ($scope, $rootScope, $state, $stateParams, $modal, $location, UserModel, RoleModel, PermissionModel, GrantApiModel, UserService, CommonProvider, PermissionProvider) {

    /*----------------用户管理事件----------------*/
    $scope.filter = {};
    $scope.params = {};
    $scope.search = {};

    $scope.userAction = {

      // 获取用户首页
      getIndex: function (page) {
        var _self = this;
        $scope.params = {
          page: page || 1,
          per_page: 20,
          // role: 'admin',
        };
        // 获取课程列表
        _self.getLists($scope.params);
      },

      // 获取列表
      getLists: function (params) {
        // 获取用户列表
        CommonProvider.promise({
          model: UserModel,
          method: 'get',
          params: params,
          success: function (_user_list) {
            $scope.user_list = _user_list;
          }
        });

        // 获取角色列表
        if (!$rootScope.role_list) {
          CommonProvider.promise({
            model: RoleModel,
            method: 'get',
            params: { per_page: 100 },
            success: function (role_list) {
              $rootScope.role_list = role_list;
            }
          });
        }
      },

      // 用户不同角色筛选
      filterChanged: function () {
        var _self = this;
        var status = $scope.filter.status;
        !status ? delete $scope.params.status : $scope.params.status = status;
        _self.getLists($scope.params);
      },

      // 用户搜索
      getSearch: function () {
        var params = [{
          field: 'name',
          operation: 'like',
          value: $scope.search.keyword
        }, {
          field: 'id',
          operation: 'like',
          value: $scope.search.keyword
        }];
        CommonProvider.search({
          service: new UserService(),
          method: 'search',
          params: params,
          success: function (_user_list) {
            $scope.user_list = _user_list;
          }
        });
      },

      // 用户详情
      getItem: function () {
        CommonProvider.promise({
          model: UserModel,
          method: 'item',
          params: { user_id: $stateParams.user_id },
          success: function (user_item) {
            $scope.user = user_item.result;
          }
        });
      },

      // 创建用户
      add: function (params) {
        if (params.modal) {
          $modal.custom({
            title: '创建用户',
            template_url: '/partials/admin/user/manage/add.html'
          });
        } else {
          CommonProvider.promise({
            model: UserModel,
            method: 'add',
            params: $scope.user,
            success: function (_user) {
              CommonProvider.promise({
                model: UserModel,
                method: 'role',
                params: { user: _user.result, ids: $rootScope.role_list.result.checked(), add: true },
                success: function (_user) {
                  $rootScope.modal.close();
                  $modal.error({
                    message: _user.message
                  });
                },
                error: function (_user) {
                  $modal.error({
                    message: _user.message
                  });
                }
              });
            },
            error: function (_user) {
              $modal.error({ message: _user.message });
            }
          });
        }
      },

      // 编辑用户
      put: function (params) {
        if (params.modal) {
          $rootScope.user_local = params.user;
          $rootScope.user_edit  = angular.copy(params.user.user);
          $modal.custom({
            title: '编辑用户',
            template_url: '/partials/admin/user/manage/edit.html',
            callback: function () {
              $rootScope.user_edit = null;
            }
          });
        } else {
          CommonProvider.promise({
            model: UserModel,
            method: 'put',
            params: { new: $scope.user, old: $rootScope.user_local },
            success: function (_user) {
              $rootScope.user_local = null;
              $rootScope.modal.close();
              $modal.success({
                message: _user.message
              });
            },
            error: function (_user) {
              $modal.error({
                message: _user.message
              });
            }
          });
          CommonProvider.promise({
            model: UserModel,
            method: 'role',
            params: { user: $rootScope.user_local, ids: $rootScope.role_list.result.checked() }
          });
        }
      },

      // 更新用户角色组
      role: function (user) {
        CommonProvider.promise({
          model: UserModel,
          method: 'role',
          params: user,
          success: function (_user) {
            console.log(_user);
          }
        });
      },

      // （批量）删除用户
      del: function (params) {
        if (params.batch && $scope.user_list.result.checked().length == 0) {
          $modal.error({ message: '至少需要选中一个用户' });
          return false;
        };
        $modal.confirm({
          title: '确认删除',
          message: params.batch ? '确定要删除选中用户吗？' : '确定要删除此用户吗？',
          info: '用户删除操作不可撤销',
          onsubmit: function () {
            CommonProvider.promise({
              model: UserModel,
              method: params.batch ? 'delete' : 'del',
              params: params.batch ? $scope.user_list.result.checked() : params.user,
              success: function (_user) {
                $modal.success({
                  message: _user.message
                });
              },
              error: function (_user) {
                $modal.error({
                  message: _user.message
                });
              }
            });
          }
        });
      },

      // （批量）禁用用户
      disable: function (params) {
        if (params.batch && $scope.user_list.result.checked().length == 0) {
          $modal.error({ message: '至少需要选中一个用户' });
          return false;
        };
        $modal.confirm({
          title: '确认操作',
          message: params.batch ? '确定要禁用选中用户吗？' : '确定要禁用此用户吗？',
          info: params.batch ? '禁用后这些用户将不再可以登录及操作' : '禁用后该用户将不再可以登录及操作',
          onsubmit: function () {
            CommonProvider.promise({
              model: UserModel,
              method: 'disable',
              params: params.batch ? $scope.user_list.result.checked() : params.user,
              success: function (_user) {
                $modal.success({
                  message: _user.message
                });
              },
              error: function (_user) {
                $modal.error({
                  message: _user.message
                });
              }
            });
          }
        });
      },

      // (批量)启用用户
      enable: function (params) {
        if (params.batch && $scope.user_list.result.checked().length == 0) {
          $modal.error({ message: '至少需要选中一个用户' });
          return false;
        };
        $modal.confirm({
          title: '确认操作',
          message: params.batch ? '确定要启用选中用户吗？' : '确定要启用此用户吗？',
          info: params.batch ? '启用后选中用户将恢复正常操作权限' : '启用后该用户将恢复正常操作权限',
          onsubmit: function () {
            CommonProvider.promise({
              model: UserModel,
              method: 'enable',
              params: params.batch ? $scope.user_list.result.checked() : params.user,
              success: function (_user) {
                $modal.success({
                  message: _user.message
                });
              },
              error: function (_user) {
                $modal.error({
                  message: _user.message
                });
              }
            });
          }
        });
      },

      // 导入CSV
      csv: function () {
        $modal.custom({
          title: 'CSV',
          template: '<div class="text-center"><h1>来来来，CSV Import!</h1></div>'
        });
      }
    };

    /*----------------角色管理----------------*/

    $scope.roleAction = {

      // 请求角色列表
      getLists: function (page) {
        $rootScope.role_list = null;
        // 获取角色列表
        CommonProvider.promise({
          model: RoleModel,
          method: 'get',
          params: { page: page || 1 },
          success: function (_role_list) {
            $scope.role_list = _role_list;
          }
        });
      },

      // 添加角色
      add: function (params) {
        if (params.modal) {
          $modal.custom({
            title: '添加角色',
            template_url: '/partials/admin/user/role/add.html'
          });
        } else {
          CommonProvider.promise({
            model: RoleModel,
            method: 'add',
            params: $scope.role,
            success: function (_role) {
              $rootScope.modal.close();
              $modal.success({
                message: _role.message
              });
            },
            error: function (_role) {
              $rootScope.modal.close();
              $modal.error({
                message: _role.message
              });
            }
          });
        }
      },

      // 编辑角色
      edit: function (params) {
        if (params.modal) {
          $rootScope.role_local = params.role;
          $rootScope.role_edit  = angular.copy(params.role.role);
          $modal.custom({
            title: '编辑角色',
            template_url: '/partials/admin/user/role/edit.html',
            callback: function () {
              delete $rootScope.role_edit;
            }
          });
        } else {
          CommonProvider.promise({
            model: RoleModel,
            method: 'put',
            params: { new: $scope.role, old: $rootScope.role_local },
            success: function (_role) {
              $rootScope.role_local = null;
              $rootScope.modal.close();
              $modal.success({
                message: _role.message
              });
            },
            error: function (_role) {
              $rootScope.modal.close();
              $modal.error({
                message: _role.message
              });
            }
          });
        }
      },

      // （批量）删除角色
      del: function (params) {
        if (params.batch && $scope.role_list.result.checked().length == 0) {
          $modal.error({ message: '至少需要选中一个角色' });
          return false;
        };
        $modal.confirm({
          title: '确认删除',
          message: params.batch ? '确定要删除选中角色吗？' : '确定要删除此角色吗？',
          info: '角色删除操作不可撤销',
          onsubmit: function () {
            CommonProvider.promise({
              model: RoleModel,
              method: params.batch ? 'delete' : 'del',
              params: params.batch ? $scope.role_list.result.checked() : params.role,
              success: function (_role) {
                $modal.success({
                  message: _role.message
                });
              },
              error: function (_role) {
                $modal.error({
                  message: _role.message
                });
              }
            });
          }
        });
      },

      // （批量）禁用角色
      disable: function (params) {
        if (params.batch && $scope.role_list.result.checked().length == 0) {
          $modal.error({ message: '至少需要选中一个角色' });
          return false;
        };
        $modal.confirm({
          title: '确认操作',
          message: params.batch ? '确定要禁用选中角色吗？' : '确定要禁用此角色吗？',
          info: params.batch ? '禁用后选中角色权限将失效，成为普通用户' : '禁用后该角色权限将失效，成为普通用户',
          onsubmit: function () {
            CommonProvider.promise({
              model: RoleModel,
              method: 'disable',
              params: params.batch ? $scope.role_list.result.checked() : params.role,
              success: function (_role) {
                $modal.success({
                  message: _role.message
                });
              },
              error: function (_role) {
                $modal.error({
                  message: _role.message
                });
              }
            });
          }
        });
      },

      // (批量)启用角色
      enable: function (params) {
        if (params.batch && $scope.role_list.result.checked().length == 0) {
          $modal.error({ message: '至少需要选中一个角色' });
          return false;
        };
        $modal.confirm({
          title: '确认操作',
          message: params.batch ? '确定要启用选中角色吗？' : '确定要启用此角色吗？',
          info: params.batch ? '启用后选中角色包含用户将恢复正常操作权限' : '启用后该角色包含用户将恢复正常操作权限',
          onsubmit: function () {
            CommonProvider.promise({
              model: RoleModel,
              method: 'enable',
              params: params.batch ? $scope.role_list.result.checked() : params.role,
              success: function (_role) {
                $modal.success({
                  message: _role.message
                });
              },
              error: function (_role) {
                $modal.error({
                  message: _role.message
                });
              }
            });
          }
        });
      },

      // 查看角色权限
      permission: function (role) {
        $rootScope.current_role_permissions = role.permissions;
        $modal.custom({
          title: role.name + '所拥有的权限',
          template_url: '/partials/admin/user/role/permission.html',
          callback: function () {
            delete $rootScope.current_role_permissions;
          }
        });
      },

      // 获取单个角色资料
      getRole: function () {
        CommonProvider.promise({
          model: RoleModel,
          method: 'getRole',
          params: $stateParams.role_id,
          success: function (_role) {
            $scope.role = _role.result;
          }
        });

        // 获取权限列表
        CommonProvider.promise({
          model: PermissionModel,
          method: 'get',
          success: function (permission_list) {
            $scope.permission_list = permission_list;
          }
        });
      },

      // 编辑角色权限
      editPermissions: function () {
        CommonProvider.promise({
          model: RoleModel,
          method: 'permission',
          params: { 
            id: $scope.role.id,
            ids: $scope.permission_list.result.checked('children')
          },
          success: function (_role) {
            PermissionProvider.init();
            $modal.success({
              message: _role.message
            });
            $location.path('/user/manage/role/list');
          },
          error: function (_role) {
            $modal.error({
              message: _role.message
            });
          }
        });
      }
    };

    /*----------------权限管理----------------*/

    $scope.permissionAction = {

      // 请求权限列表
      getLists: function () {

        // 获取权限列表
        CommonProvider.promise({
          model: PermissionModel,
          method: 'get',
          success: function (permission_list) {
            $scope.permission_list = permission_list;
            $rootScope.permission_list = permission_list.result;
          }
        });

        // 获取Api列表
        if (!$rootScope.api_list) {
          CommonProvider.promise({
            model: GrantApiModel,
            method: 'get',
            params: { per_page: 400 },
            success: function (api_list) {
              $rootScope.api_list = api_list.result;
            }
          });
        };
      },

      // 权限排序监听
      sort: function ($item, $partFrom, $partTo, $indexFrom, $indexTo) {
        // 整理数据并更新
        var sorts = [],sort;
        for (var i = 0; i < $partTo.length; i++) {
          sort = {};
          sort.id = $partTo[i].id;
          sort.sort = i;
          sorts.push(sort);
        };
        PermissionModel.sort(sorts);
      },

      // 新增权限
      add: function (params) {
        if (params.modal) {
          $modal.custom({
            title: '添加权限',
            template_url: '/partials/admin/user/permission/add.html'
          });
        } else {
          CommonProvider.promise({
            model: PermissionModel,
            method: 'add',
            params: $scope.permission,
            success: function (permission) {
              $rootScope.modal.close();
              $modal.success({
                title: '添加成功'
              });
            },
            error: function (permission) {
              $modal.error({
                title: permission.message
              });
            }
          });
        }
      },

      // （批量）删除权限
      del: function (params) {
        if (params.batch && $scope.permission_list.result.checked('children').length == 0) {
          $modal.error({ message: '至少需要选中一个角色' });
          return false;
        };
        $modal.confirm({
          title: '确认删除',
          message: params.batch ? '确定要删除选中权限吗？' : '确定要删除此权限吗？',
          info: '权限删除操作不可撤销',
          onsubmit: function () {
            CommonProvider.promise({
              model: PermissionModel,
              method: params.batch ? 'delete' : 'del',
              params: params.batch ? $scope.permission_list.result.checked('children') : params.permission,
              success: function (_permission) {
                $modal.success({
                  message: _permission.message
                });
              },
              error: function (_permission) {
                $modal.error({
                  message: _permission.message
                });
              }
            });
          }
        });
      },

      // 编辑权限
      edit: function (params) {
        if (params.modal) {
          $rootScope.permission_local = params.permission;
          $rootScope.permission_edit = angular.copy(params.permission.permission);
          $modal.custom({
            title: '编辑用户',
            template_url: '/partials/admin/user/permission/edit.html',
            callback: function () {
              delete $rootScope.permission_edit;
            }
          });
        } else {
          CommonProvider.promise({
            model: PermissionModel,
            method: 'put',
            params: { new: $scope.permission, old: $rootScope.permission_local },
            success: function (_permission) {
              $rootScope.modal.close();
              $modal.success({
                message: _permission.message,
                callback: function () {
                  delete $rootScope.permission_local;
                }
              });
            },
            error: function (_permission) {
              $modal.error({
                message: _permission.message
              });
            }
          });
        }
      },

      // （批量）禁用权限
      disable: function (params) {
        if (params.batch && $scope.permission_list.result.checked('children').length == 0) {
          $modal.error({ message: '至少需要选中一个权限' });
          return false;
        };
        $modal.confirm({
          title: '确认操作',
          message: params.batch ? '确定要禁用选中权限吗？' : '确定要禁用此权限吗？',
          info: params.batch ? '禁用权限后，所有关联用户的权限将立即失效' : '禁用后该权限将失效',
          onsubmit: function () {
            CommonProvider.promise({
              model: PermissionModel,
              method: 'disable',
              params: params.batch ? $scope.permission_list.result.checked('children') : params.permission,
              success: function (_permission) {
                $modal.success({
                  message: _permission.message
                });
              },
              error: function (_permission) {
                $modal.error({
                  message: _permission.message
                });
              }
            });
          }
        });
      },

      // (批量)启用权限
      enable: function (params) {
        if (params.batch && $scope.permission_list.result.checked('children').length == 0) {
          $modal.error({ message: '至少需要选中一个权限' });
          return false;
        };
        $modal.confirm({
          title: '确认操作',
          message: params.batch ? '确定要启用选中权限吗？' : '确定要启用此权限吗？',
          info: params.batch ? '启用后选中权限包含用户将恢复正常操作权限' : '启用后该权限包含用户将恢复正常操作权限',
          onsubmit: function () {
            CommonProvider.promise({
              model: PermissionModel,
              method: 'enable',
              params: params.batch ? $scope.permission_list.result.checked('children') : params.permission,
              success: function (_permission) {
                $modal.success({
                  message: _permission.message
                });
              },
              error: function (_permission) {
                $modal.error({
                  message: _permission.message
                });
              }
            });
          }
        });
      },

      // 查看api
      api: function (apis) {
        $rootScope.current_permission_apis = apis;
        $modal.custom({
          title: 'api详情',
          template_url: '/partials/admin/user/permission/api.html',
          callback: function () {
            delete $rootScope.current_permission_apis;
          }
        });
      },

      // 获取单个权限资料
      getPermission: function () {
        $scope.permission = null;
        CommonProvider.promise({
          model: PermissionModel,
          method: 'item',
          params: $stateParams.permission_id,
          success: function (_permission) {
            $scope.permission = _permission.result;
          }
        });

        // 获取Api列表
        if (!$rootScope.api_list) {
          CommonProvider.promise({
            model: GrantApiModel,
            method: 'get',
            params: { per_page: 400 },
            success: function (api_list) {
              $rootScope.api_list = api_list.result;
            }
          });
        };

      },

      // 编辑权限API
      editApis: function (params) {
        CommonProvider.promise({
          model: PermissionModel,
          method: 'api',
          params: {
            id: $scope.permission.id,
            ids: $rootScope.api_list.checked()
          },
          success: function (_permission) {
            $modal.success({
              message: _permission.message
            });
            $location.path('/user/manage/permission/list');
          },
          error: function (_permission) {
            $modal.error({
              message: _permission.message
            });
          }
        });
      },

      // 路由转换为标识符
      toSlug: function () {
        $scope.permission.slug = !!$scope.permission.url ? $scope.permission.url.replace(/^\/|\s+$/g,'').replace(/\//g, ".") : '';
      }
    };

    /*----------------APi管理----------------*/

    $scope.apiAction = {

      // 获取api列表
      getLists: function (page) {
        CommonProvider.promise({
          model: GrantApiModel,
          method: 'get',
          params: { page: page || 1 },
          success: function (api_list) {
            $scope.api_list = api_list;
          }
        });
      },

      // 增加api
      add: function (params) {
        if (params.modal) {
          $modal.custom({
            title: '添加API',
            template_url: '/partials/admin/user/api/add.html'
          });
        } else {
          CommonProvider.promise({
            model: GrantApiModel,
            method: 'add',
            params: $scope.api,
            success: function (_api) {
              $rootScope.modal.close();
              $modal.success({
                message: _api.message
              });
            },
            error: function (_api) {
              $modal.error({
                message: _api.message
              });
            }
          });
        }
      },

      // 编辑API
      put: function (params) {
        if (params.modal) {
          $rootScope.api = angular.copy(params.api.api);
          $rootScope.api_local = params.api;
          $modal.custom({
            title: '添加API',
            template_url: '/partials/admin/user/api/edit.html',
            callback: function () {
              $rootScope.api = null;
            }
          });
        } else {
          CommonProvider.promise({
            model: GrantApiModel,
            method: 'put',
            params: { new: $scope.api, old: $rootScope.api_local },
            success: function (_api) {
              $rootScope.api_local = null;
              $rootScope.modal.close();
              $modal.success({
                message: _api.message
              });
            },
            error: function (_api) {
              $modal.error({
                message: _api.message
              });
            }
          });
        }
      },

      // （批量）删除API
      del: function (params) {
        if (params.batch && $scope.api_list.result.checked().length == 0) {
          $modal.error({ message: '至少需要选中一个API' });
          return false;
        };
        $modal.confirm({
          title: '确认删除',
          message: params.batch ? '确定要删除选中API吗？' : '确定要删除此API吗？',
          info: 'API删除操作不可撤销',
          onsubmit: function () {
            CommonProvider.promise({
              model: GrantApiModel,
              method: params.batch ? 'delete' : 'del',
              params: params.batch ? $scope.api_list.result.checked() : params.api,
              success: function (_api) {
                $modal.success({
                  message: _api.message
                });
              },
              error: function (_api) {
                $modal.error({
                  message: _api.message
                });
              }
            });
          }
        });
      }
    };
  }
]);