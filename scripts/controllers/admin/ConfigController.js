/**
*
* ConfigController Module
*
* Description
*
*/
angular.module('ConfigController', ['angular-sortable-view', 'angular-related-select', 'TabsDirective', 'TypeaheadDirective', 'ConfigModel', 'IndexModel', 'SearchModel', 'PartnerModel', 'LinkModel', 'PublicModel', 'CategoryModel', 'SearchService', 'OrganizationService', 'CategoryService', 'CourseService'])
.controller('ConfigController', ['$rootScope', '$scope', '$http', '$stateParams', '$location', '$localStorage', '$modal', 'SystemModel', 'IndexModel', 'LogModel', 'PartnerModel', 'LinkModel', 'PublicModel', 'SearchModel', 'CategoryModel', 'SearchService', 'OrganizationService', 'CategoryService', 'CourseService', 'CommonProvider',
  function ($rootScope, $scope, $http, $stateParams, $location, $localStorage, $modal, SystemModel, IndexModel, LogModel, PartnerModel, LinkModel, PublicModel, SearchModel, CategoryModel, SearchService, OrganizationService, CategoryService, CourseService, CommonProvider) {

    $scope.params = {};

    /*----------------系统配置----------------*/

    $scope.systemAction = {

      all_tabs: [ '基本设置', '内容设置', '用户设置', '系统设置'],

      // 获取配置列表
      getLists: function (page) {
        CommonProvider.promise({
          model: SystemModel,
          method: 'get',
          params: { page: page || 1, role: 'admin' },
          success: function (_lists) {
            $scope.config_list = _lists;
          }
        });
      },

      // 获取配置列表（组）
      getGroup: function (group) {
        $scope.config_group = $scope.config_group || {};
        if (!!$scope.config_group[group]) return;
        if ($localStorage.config_group) {
          if ($localStorage.config_group[group]) {
            $scope.config_group[group] = angular.copy($localStorage.config_group[group]);
          }
        } else {
          $localStorage.config_group = {};
        }
        CommonProvider.promise({
          model: SystemModel,
          method: 'get',
          params: { per_page: 100, group: group + 1, role: 'admin'},
          success: function (_config_list) {
            $localStorage.config_group[group] = angular.copy(_config_list.result.toObject('name'));
            $scope.config_group[group] = _config_list.result.toObject('name');
          }
        });
      },

      // 保存配置（组）
      putGroup: function (group) {
        CommonProvider.promise({
          model: SystemModel,
          method: 'putGroup',
          params: $scope.config_group[group],
          success: function (_config_group) {
            $modal.success({
              message: _config_group.message
            });
          }
        });
      },

      // 新增配置
      add: function (params) {
        if (params.modal) {
          $modal.custom({
            title: '新增配置项',
            template_url: '/partials/admin/config/system/add.html'
          });
        } else {
          CommonProvider.promise({
            model: SystemModel,
            method: 'add',
            params: $scope.config,
            success: function (_config) {
              $scope.config = null;
              $rootScope.modal.close();
              $modal.success({
                message: _config.message
              });
            },
            error: function (_config) {
              $modal.error({
                message: _config.message
              });
            }
          });
        }
      },

      // 更新配置
      edit: function (params) {
        if (params.modal) {
          $rootScope.config_local = params.config;
          $rootScope.config_edit = angular.copy(params.config.config);
          $modal.custom({
            title: '更新配置项',
            template_url: '/partials/admin/config/system/edit.html',
            callback: function () {
              $rootScope.config_local = null;
              delete $rootScope.config_edit;
            }
          });
        } else {
          // 提交前数据转换
          $rootScope.config_edit.value = $rootScope.config_edit.value.toString();
          CommonProvider.promise({
            model: SystemModel,
            method: 'put',
            params: { old: $rootScope.config_local, new: $rootScope.config_edit },
            success: function (_config) {
              $rootScope.modal.close();
              $modal.success({
                message: _config.message
              });
            },
            error: function (_config) {
              $modal.error({
                message: _config.message
              });
            }
          });
        }
      },

      // （批量）删除配置
      del: function (params) {
        if (params.batch && $scope.config_list.result.checked().length == 0) {
          $modal.error({ message: '至少需要选中一个配置项' });
          return false;
        };
        $modal.confirm({
          title: '确认删除',
          message: params.batch ? '确定要删除选中配置项吗？' : '确定要删除此配置项吗？',
          info: '配置项删除操作不可撤销',
          onsubmit: function () {
            CommonProvider.promise({
              model: SystemModel,
              method: params.batch ? 'delete' : 'del',
              params: params.batch ? $scope.config_list.result.checked() : params.config,
              success: function (_config) {
                $modal.success({
                  message: _config.message
                });
              },
              error: function (_config) {
                $modal.error({
                  message: _config.message
                });
              }
            });
          }
        });
      }
    };

    /*----------------首页配置----------------*/

    $scope.config_list = {};
    $scope.config_data = {};
    $scope.search = {};
    $scope.indexAction = {

      // 获取配置列表
      getLists: function (page) {
        CommonProvider.promise({
          model: IndexModel,
          method: 'get',
          params: { page: page || 1, role: 'admin' },
          success: function (_config_list) {
            $scope.config_list = _config_list;
          }
        });
      },

      // 获取所有分类列表
      getCategories: function () {
        CommonProvider.promise({
          model: CategoryModel,
          method: 'get',
          params: {
            category_id: 0,
            type: 1
          },
          success: function (categories) {
            var categories = categories.result;
            $rootScope.categories = categories;
          }
        });
      },

      // 分类联动选择回调
      selectChange: function (params) {
        var disSelects = angular.copy(params.disSelects);
        var select_categories = disSelects.pop();
        $rootScope.select_categories = select_categories;
      },

      // 管理配置
      manage: function (params) {
        if (params.modal) {
          // $rootScope.categories = {};
          $rootScope.config_local = params;
          $rootScope.config_edit = params;
          // 获取配置信息
          $modal.custom({
            title: '管理配置',
            template_url: '/partials/admin/config/index/manage.html',
            callback: function () {
              delete $rootScope.config_edit;
              delete $rootScope.categories;
              delete $rootScope.select_categories;
            }
          });
        } else {
          switch (params.option) {
            case 'organization':
              $scope.config_data.organization = $scope.config.organization.ids().join(',');
              break;
            case 'category':
              $scope.config_data.sub_category = $scope.config.sub_category.ids().join(',');
              break;
            case 'course':
              $scope.config_data.course = $scope.config.course.ids().join(',');
              break;
            default:
              break;
          };
          $scope.config_data.category_id = $scope.config.category_id;
          $scope.config_data.id = $scope.config.id;

          CommonProvider.promise({
            model: IndexModel,
            method: 'put',
            params: $scope.config_data,
            success: function (_config) {
              $rootScope.config_local = _config.result[params.option];
              $rootScope.modal.close();
              $modal.success({
                message: _config.message,
                callback: function () {
                  delete $rootScope.config_local;
                  delete $rootScope.select_categories;
                }
              });
            },
            error: function (_config) {
              $modal.error({
                message: _config.message
              });
            }
          });
        }
      },

      // 移除选项
      remove: function (params) {
        switch (params.option) {
          case 'organization':
              $rootScope.config_edit.data.config.organization.remove(params.config.config);
              break;
            case 'category':
              $rootScope.config_edit.data.config.sub_category.remove(params.config.config);
              break;
            case 'course':
              $rootScope.config_edit.data.config.course.remove(params.config.config);
              break;
            default:
              break;
        };
      },

      // 搜索
      search: function (params) {
        if (params.keyword) {
          var params_search = {
            keyword: params.keyword,
            search_type: params.type,
            only_name: 1
          };
          $scope.search.keyword = params.keyword;
          return CommonProvider.request({
            method: 'get',
            service: new SearchService(),
            params: params_search
          }).then(function (res) {
            return res.result;
          });
        }
      },

      // 课程、学校推荐选择
      searchSelect: function (params) {
        $scope.search.keyword = params.label;
        // 获取item加入到列表中
        var _search_data = {
          service: {},
          params: {},
          method: '',
        };
        var _search_list = {};

        switch (params.type) {
          case 'organization':
            _search_data = {
              service: new OrganizationService(),
              params: { organization_id: params.item.id },
              method: 'item',
            };
            if ($rootScope.config_edit.data.config.organization.find(params.item.id, 'id')) {
              return false;
            }
            break;
          case 'course':
            _search_data = {
              service: new CourseService(),
              params: { course_id: params.item.id },
              method: 'item'
            };
            if ($rootScope.config_edit.data.config.course.find(params.item.id, 'id')) {
              return false;
            }
            break;
          default:
            break;
        };
        
        CommonProvider.request({
          service: _search_data.service,
          params: _search_data.params,
          method: _search_data.method,
          success: function (_data) {
            switch (params.type) {
              case 'organization':
                $rootScope.config_edit.data.config.organization.push(_data.result);
                break;
              case 'course':
                $rootScope.config_edit.data.config.course.push(_data.result);
                break;
              default:
                break;
            };
          }
        });
      },

      // 分类推荐选择
      categorySelect: function (params) {
        if (params.category.value) {
          var category = params.category.value;
          params.category.is_selected ? $rootScope.config_edit.data.config.sub_category.push(category) : $rootScope.config_edit.data.config.sub_category.remove(category);
        }
      },
    };

    /*----------------入驻机构配置----------------*/

    $scope.partner_list = {};
    $scope.partnerAction = {
      // 获取入驻机构首页数据
      getIndex: function (page) {
        var _self = this;
        $scope.params = {
          role: 'admin',
          page: page || 1,
        };
        _self.getLists($scope.params);
      },

      // 获取列表
      getLists: function (params) {
        CommonProvider.promise({
          model: PartnerModel,
          method: 'get',
          params: params,
          success: function (partner_list) {
            $scope.partner_list = partner_list;
          }
        });
      },

      // 新增入驻机构
      add: function (params) {
        if (params.modal) {
          $modal.custom({
            title: '新增入驻机构',
            template_url: '/partials/admin/config/partner/add.html'
          });
        } else {


        }
      },

    };

    /*----------------友情链接配置----------------*/

    $scope.link_list = {};
    $scope.linkAction = {
      // 获取友情链接首页数据
      getIndex: function (page) {
        var _self = this;
        $scope.params = {
          role: 'admin',
          page: page || 1,
        };
        _self.getLists($scope.params);
      },

      // 获取列表
      getLists: function (params) {
        CommonProvider.promise({
          model: LinkModel,
          method: 'get',
          params: params,
          success: function (link_list) {
            $scope.link_list = link_list;
          }
        });
      },

      // 添加友情链接
      add: function (params) {
        if (params.modal) {
          $modal.custom({
            title: '添加友情链接',
            template_url: '/partials/admin/config/link/add.html'
          });
        } else {
          CommonProvider.promise({
            model: LinkModel,
            method: 'add',
            params: $scope.link,
            success: function (_link) {
              $rootScope.modal.close();
              $modal.success({
                message: _link.message
              });
            },
            error: function (_link) {
              $modal.error({
                message: _link.message
              });
            }
          });
        }
      },

      // 编辑友情链接
      edit: function (params) {
        if (params.modal) {
          $rootScope.link_local = params.link;
          $rootScope.link_edit  = angular.copy(params.link.link);
          $modal.custom({
            title: '编辑友情链接',
            template_url: '/partials/admin/config/link/edit.html',
            callback: function () {
              delete $rootScope.link_edit;
            }
          });
        } else {
          CommonProvider.promise({
            model: LinkModel,
            method: 'put',
            params: $scope.link,
            success: function (_link) {
              $rootScope.link_local.$parent.link = _link.result;
              $rootScope.modal.close();
              $modal.success({
                message: _link.message,
                callback: function () {
                  delete $rootScope.link_local;
                }
              });
            },
            error: function (_link) {
              $modal.error({
                message: _link.message
              });
            }
          });
        }
      },

      // 删除友情链接
      del: function (params) {
        if (params.batch && $scope.link_list.result.checked().length == 0) {
          $modal.error({ message: '至少需要选中一个友情链接' });
          return false;
        };
        $modal.confirm({
          title: '确认删除',
          message: params.batch ? '确定要删除选中友情链接吗？' : '确定要删除此友情链接吗？',
          info: '友情链接删除后可在回收站中查看',
          onsubmit: function () {
            CommonProvider.promise({
              model: LinkModel,
              method: params.batch ? 'delete' : 'del',
              params: params.batch ? $scope.link_list.result.checked() : params.link,
              success: function (_link) {
                $modal.success({
                  message: _link.message
                });
              },
              error: function (_link) {
                $modal.error({
                  message: _link.message
                });
              }
            });
          }
        });
      },
    };

    /*----------------搜索管理----------------*/

    $scope.searchAction = {
      // 获取搜索热词
      getHot: function () {
        CommonProvider.promise({
          model: SearchModel,
          method: 'getHotWords',
          success: function (_search_hot) {
            $scope.search_hot = _search_hot.result;
          }
        });
      },

      // 保存搜索热词
      hot: function () {
        CommonProvider.promise({
          model: SearchModel,
          method: 'putHotWords',
          params: $scope.search_hot,
          success: function (_search_hot) {
            $modal.success({
              message: _search_hot.message,
            });
          },
          error: function (_search_hot) {
            $modal.error({
              message: _search_hot.message
            });
          }
        });
      },

      // 搜索索引初始化
      searchInit: function (params) {
        var type_text = params.type == 'course' ? '课程' : '学校';
        $modal.confirm({
          title: '确认操作',
          message: '确定要初始化'+ type_text +'搜索索引？',
          onsubmit: function () {
            CommonProvider.promise({
              model: SearchModel,
              method: 'searchInit',
              params: params,
              success: function (_search_init) {
                $modal.success({
                  message: _search_init.message
                });
                $scope.search_init_menu = false;
              },
              error: function (_search_init) {
                $modal.error({
                  message: _search_init.message
                });
              }
            });
          }
        });
      },

      // 清除历史索引
      searchClean: function (params) {
        var type_text = params.type == 'course' ? '课程' : '学校';
        $modal.confirm({
          title: '确认操作',
          message: '确定要清空'+ type_text +'搜索索引？',
          onsubmit: function () {
            CommonProvider.promise({
              model: SearchModel,
              method: 'searchClean',
              params: params,
              success: function (_search_clean) {
                $modal.success({
                  message: _search_clean.message
                });
                $scope.search_clean_menu = false;
              },
              error: function (_search_clean) {
                $modal.error({
                  message: _search_clean.message
                });
              }
            });
          }
        });
      },
    };

    /*----------------数据库管理----------------*/
    $scope.databaseAction = {

      // 获取备份的数据列表
      getExport: function () {

      },

      // 获取还原的数据列表
      getImport: function () {

      },

    };


    /*----------------操作日志----------------*/

    // 日志行为
    $scope.logAction = {

      // 日志行为首页
      getIndex: function (page) {
        var _self = this;
        // 获取列表
        $scope.params = {
          page: page || 1,
        };
        _self.getLists($scope.params);
      },

      // 获取日志列表
      getLists: function (params) {
        CommonProvider.promise({
          model: LogModel,
          method: 'get',
          params: params,
          success: function (_log_list) {
            $scope.log_list = _log_list;
          }
        });
      },

      // 删除日志
      del: function (params) {
        if (params.batch && $scope.log_list.result.checked().length == 0) {
          $modal.error({ message: '至少需要选中一条日志' });
          return false;
        };
        $modal.confirm({
          title: '确认删除',
          message: params.batch ? '确定要删除选中日志吗？' : '确定要删除此日志吗？',
          info: '日志删除操作不可撤销',
          onsubmit: function () {
            CommonProvider.promise({
              model: LogModel,
              method: 'del',
              params: params.batch ? $scope.log_list.result.checked() : params.log,
              success: function (_log) {
                $modal.success({
                  message: _log.message
                });
              },
              error: function (_log) {
                $modal.error({
                  message: _log.message
                });
              }
            });
          }
        });
      },

      // 清空日志
      clear: function () {
        $modal.confirm({
          title: '确认删除',
          message: '确定要清空所有日志吗？',
          info: '本操作不可恢复',
          onsubmit: function () {
            CommonProvider.promise({
              model: LogModel,
              method: 'clear',
              success: function (_log) {
                $modal.success({
                  message: _log.message
                });
              },
              error: function (_log) {
                $modal.error({
                  message: _log.message
                });
              }
            });
          }
        });
      }
    };

    /*----------------短信记录----------------*/
    $scope.smsAction = {

      // 短信记录首页
      getIndex: function (page) {
        var _self = this;
        // 获取列表
        $scope.params = {
          role: 'admin',
          page: page || 1,
        };
        _self.getLists($scope.params);
      },

      // 获取列表数据
      getLists: function (params) {
        CommonProvider.promise({
          model: SmsModel,
          method: 'get',
          params: params,
          success: function (_sms_list) {
            $scope.sms_list = _sms_list;
          }
        });
      },
    };
  }
]);

