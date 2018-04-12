/*
*
* SchoolController Module
*
* Description
*
*/
angular.module('SchoolController', ['angular.modal', 'TypeaheadDirective', 'ScrolledDirective', 'TeacherModel', 'AuditModel', 'CategoryModel', 'SearchModel', 'SearchService', 'StudentModel'])
.controller('SchoolController', ['$rootScope', '$scope', '$state', '$http', '$stateParams', '$location', '$timeout', '$modal', '$localStorage', 'AuthProvider', 'CommonProvider', 'AnnouncementModel', 'OrganizationModel', 'AuditModel', 'CommonModel', 'CategoryModel', 'SearchModel', 'SearchService', 'StudentModel',
  function ($rootScope, $scope, $state, $http, $stateParams, $location, $timeout, $modal, $localStorage, AuthProvider, CommonProvider, AnnouncementModel, OrganizationModel, AuditModel, CommonModel, CategoryModel, SearchModel, SearchService, StudentModel) {
    

    // 首次载入时验证登录状态
    $rootScope.checkLogin();

    // 链接产生变动时验证登录状态
    $scope.$on('$locationChangeStart', function () {
      $rootScope.checkLogin();
    });

    // 初始化
    $scope.organization = {};
    $scope.organization_id = $stateParams.organization_id || false;

    // 链接变更成功时，更新面包屑/title
    $scope.$on('$stateChangeSuccess', function (event, next, current) {

      $scope.status.current = $state.current.data.slug || false;
      $scope.status.parent = $state.$current.parent ? ( $state.$current.parent.data ? $state.$current.parent.data.slug : false ) : false;

      // 如果路由中定义的url是空则是指当前页面
      $state.current.data.url = $state.current.data.url || $location.$$url;
      $scope.breadcrumb = $state;
      $rootScope.title = $state.current.data.title || $state.$current.parent.data.title || '';
    });

    // 学校管理初始化
    $scope.schoolManageInit = function () {

      // 初始化数据
      $scope.organization.info = {};
      $scope.organization.audit = {};
      $scope.organization.theme = {};
      $scope.organization.teacher = {};
      $scope.organization.announcements = {};
      $scope.organization.info_can_edit = false;
      $scope.organization.audit_can_edit = false;

      // 获取数据
      $scope.getOrganizationInfo();
      $scope.getOrganizationAudit();
      $scope.initOrganizationTeachers();
      $scope.getAnnouncement({});
      $scope.getThemeTemplate();
    };

    // 我的学校初始化
    $scope.schoolInit = function () {
      if (!$scope.all_schools) {
        $scope.all_schools = [
          {
            name: '我创建的',
            type: 'creator',
            status: '5',
            sort: 0
          },
          {
            name: '我管理的',
            type: 'manage',
            status: '4',
            sort: 1
          }, {
            name: '我申请的',
            type: 'apply',
            status: '1,2,-2',
            from: '2',
            sort: 2
          }, {
            name: '邀请我的',
            type: 'invite',
            status: '0,-1,2',
            from: '1',
            sort: 3
          }
        ];
      };
    };

    // 机构列表-获取学校列表
    $scope.getOrganizationList = function (params) {
      if (!params.page && params.from == 1) $rootScope.setDomPosition(angular.element('#J_school_list ul').scope());
      var current_relations = $scope.all_schools.find(params.status, 'status').relations;
      if (!!current_relations && !params.page) return false;
      $rootScope.toTop();
      var get_config = {
        role: 'teacher',
        status: params.status,
        page: params.page || 1,
        per_page: 8
      };
      if (params.from) get_config.from = params.from;
      CommonProvider.promise({
        model: OrganizationModel,
        method: 'relation',
        params: get_config,
        result: function(relations){
          $scope.all_schools.find(get_config.status, 'status').relations = relations;
        }
      });
    };

    // 退出机构
    $scope.quitOrganization = function (relation) {
      $modal.confirm({
        title: '确认操作',
        message: '你确定要退出这个学校吗？',
        info: '确定要退出吗？退出后不可再次加入',
        button: {
          confirm: '确定',
          cancel: '放弃'
        },
        onsubmit: function () {
          console.log(relation);
          // return false;
          CommonProvider.promise({
            model: OrganizationModel,
            method: 'delRelation',
            params: {
              role: 'user',
              relation_id: relation.relation.id
            },
            success: function(_teacher){
              $scope.all_schools.find(relation.type, 'type').relations.result.remove(relation.relation);
              $modal.success({ message: '操作成功' });
            }
          });
        }
      });
    };

    // 同意邀请，加入机构
    $scope.agreeInviteJoin = function (relation) {
      $modal.confirm({
        title: '确认操作',
        message: '你确定要加入此机构吗？',
        info: '确定要加入吗？加入后将成为此机构老师',
        button: {
          confirm: '确定',
          cancel: '放弃'
        },
        onsubmit: function () {
          console.log(relation);
          // $scope.all_schools.find(relation.type, 'type').relations.result.find(relation.relation).status = 2;
          // return false;
          CommonProvider.promise({
            model: OrganizationModel,
            method: 'putRelation',
            params: {
              role: 'user',
              id: relation.relation.id,
              organization_role: 'teacher',
              body: { status: 2 }
            },
            success: function(_teacher){
              $modal.success({ message: '操作成功' });
              $scope.all_schools.find(relation.type, 'type').relations.result.find(relation.relation).status = 2;
            }
          });
        }
      });
    };

    // 拒绝邀请，不加入机构
    $scope.refuseInviteJoin = function (relation) {
      $modal.confirm({
        title: '确认操作',
        message: '你确定要拒绝此机构吗？',
        info: '确定要拒绝吗？拒绝后再次加入需主动申请',
        button: {
          confirm: '确定',
          cancel: '放弃'
        },
        onsubmit: function () {
          CommonProvider.promise({
            model: OrganizationModel,
            method: 'putRelation',
            params: {
              role: 'user',
              id: relation.relation.id,
              organization_role: 'teacher',
              body: { status: -1 }
            },
            success: function(_teacher){
              $modal.success({ message: '操作成功' });
              $scope.all_schools.find(relation.type, 'type').relations.result.find(relation.relation).status = -1;
            }
          });
        }
      });
    };

    // 获取机构基本信息
    $scope.getOrganizationInfo = function () {
      CommonProvider.promise({
        model: OrganizationModel,
        method: 'item',
        params: { organization_id: $scope.organization_id },
        success: function(organization){
          // console.log(organization);
          $scope.organization.info = organization.result;
          $scope.organization.audit = $scope.organization.info.audit_info;
        }
      });
    };

    // 更新机构基本信息
    $scope.updateOrganizationInfo = function () {
      CommonProvider.promise({
        model: OrganizationModel,
        method: 'put',
        params: { 
          role: 'user',
          new: $scope.organization.info
        },
        success: function(organization){
          $scope.organization.info = organization.result;
          $scope.organization.info_can_edit = false;
          $modal.success({ message: '更新成功' });
          $rootScope.toTop();
        },
        error: function (err) {
          console.log(err);
        }
      });
    };

    // 机构logo上传回调
    $scope.getLogoUpload = function (data) {
      if (data) $scope.organization.info.logo = data.key;
    };

    // Scenery
    $scope.getSceneryUpload = function (data) {
      if (data) $scope.organization.info.scenery = data.key;
    };

    // 营业执照
    $scope.getLicenseUpload = function (data) {
      if (data) $scope.organization.audit.business_license = data.key;
    };

    // 认证身份证
    $scope.getIdCardUpload = function (data) {
      if (data) $scope.organization.audit.id_card = data.key;
    };

    // 教育资质
    $scope.getQualificationUpload = function (data) {
      if (data) $scope.organization.audit.education_qualification = data.key;
    };

    // 获取机构的认证信息
    $scope.getOrganizationAudit = function () {
      CommonProvider.promise({
        model: AuditModel,
        method: 'get',
        params: { 
          role: 'teacher',
          organization_id: $scope.organization_id 
        },
        success: function(audit){
          $scope.organization.audit = audit.result;
        },
        error: function (err) {
          // console.log(err);
        }
      });
    };

    // 更新机构认证信息
    $scope.updateOrganizationAudit = function (callback) {
      CommonProvider.promise({
        model: AuditModel,
        method: 'put',
        params: { 
          role: 'user',
          organization_id: $scope.organization_id,
          body: callback ? $scope.organization : $scope.organization.audit
        },
        success: function(audit){
          if (!!callback) {
            callback(audit);
            return false;
          };
          $scope.organization.audit = audit.result;
          $scope.organization.audit.status = 0;
          $scope.organization.audit_can_edit = false;
          $modal.success({ message: '提交成功' });
          $rootScope.toTop();
        },
        error: function (err) {
          console.log(err);
        }
      });
    };

    // 机构老师初始化
    $scope.initOrganizationTeachers = function () {
      $scope.organization.teacher.types = [
        {
          name: '全部',
          sort: 0
        }, {
          name: '管理员',
          status: '4',
          sort: 1
        }, {
          name: '普通老师',
          status: '2,3',
          sort: 2
        }, {
          name: '待审核',
          status: '1',
          from: '2',
          sort: 3
        }, {
          name: '我已拒绝',
          status: '-2',
          from: '2',
          sort: 4
        }, {
          name: '已邀请',
          status: '0',
          // from: '1',
          sort: 5
        }, {
          name: '邀请失败',
          status: '-1',
          from: '1',
          sort: 6
        }
      ];
      $scope.organization.teacher.act_get = $scope.organization.teacher.types[0];
      $scope.getOrganizationTeachers($scope.organization.teacher.act_get);
    };

    // 获取机构老师
    $scope.getOrganizationTeachers = function (params) {
      $scope.organization.teacher.act_get = params;
      var get_config = {
        per_page: 8,
        role: 'teacher',
        organization_role: 'admin',
        page: params.page || 1,
        organization_id: $scope.organization_id
      };

      // 1/邀请，2/申请
      if (!!params.from) get_config.form = params.from;

      // -1/已拒绝，0/已邀请，1/已申请，2/已加入，3/已申请管理员，4/管理员
      if (params.status != undefined) get_config.status = params.status;

      CommonProvider.promise({
        model: OrganizationModel,
        method: 'relation',
        params: get_config,
        success: function(teachers){
          $scope.organization.teacher.lists = teachers;
        },
        error: function (err) {
          console.log(err);
        }
      });
    };

    // 刷新当前页老师列表
    $scope.refreshOrganizationTeachers = function () {
      $scope.getOrganizationTeachers({
        sort: $scope.organization.teacher.act_get.sort,
        form: $scope.organization.teacher.act_get.form,
        status: $scope.organization.teacher.act_get.status,
        page: $scope.organization.teacher.lists.pagination.current_page
     })
    };

    // 老师管理 - 查看资料（审核资料）
    $scope.checkTeacherInfo = function (params) {
      if (params.modal) {
        $rootScope.organization = $scope.organization;
        $rootScope.teacher_local = params.teacher;
        $rootScope.teacher_check = angular.copy(params.teacher.$parent.teacher);
        $modal.custom({
          title: '查看资料',
          template_url: '/partials/home/teacher/organization/teacher-check.html',
          callback: function () {
            $rootScope.teacher_check = null;
            delete $rootScope.organization;
            delete $rootScope.teacher_local;
          }
        });
      } else {
        CommonProvider.promise({
          model: OrganizationModel,
          method: 'putRelation',
          params: {
            role: 'user',
            id: $rootScope.teacher_check.id,
            organization_role: $rootScope.organization.info.user.id == $rootScope.user.id ? 'founder' : 'admin',
            body: {
              status: params.action ? 2 : -2,
              memo: params.action ? '' : ($rootScope.teacher_check.memo || '')
            }
          },
          success: function(_teacher){
            $rootScope.teacher_local.$parent.teacher.status = params.action ? 2 : -2;
            $rootScope.teacher_local.$parent.teacher.memo = $rootScope.teacher_check.memo;
            $rootScope.modal.close();
          }
        });
      }
    };

    // 老师管理 - 编辑资料
    $scope.editTeacherInfo = function (params) {
      if (params.modal) {
        $rootScope.organization = $scope.organization;
        $rootScope.teacher_local = params.teacher;
        $rootScope.teacher_edit = angular.copy(params.teacher.$parent.teacher);
        $modal.custom({
          title: '查看资料',
          template_url: '/partials/home/teacher/organization/teacher-edit.html',
          callback: function () {
            $rootScope.teacher_edit = null; 
            delete $rootScope.organization;
            delete $rootScope.teacher_local;
          }
        });
      } else {
        CommonProvider.promise({
          model: OrganizationModel,
          method: 'putRelation',
          params: {
            role: 'user',
            id: $rootScope.teacher_edit.id,
            organization_role: $rootScope.organization.info.user.id == $rootScope.user.id ? 'founder' : 'admin',
            body: {
              title: $rootScope.teacher_edit.title,
              introduction: $rootScope.teacher_edit.introduction
            }
          },
          success: function(teacher){
            $rootScope.teacher_local.$parent.teacher = teacher.result;
            $rootScope.modal.close();
          }
        });
      }
    };

    // 老师管理 - 设置管理员
    $scope.addTeacherAdmin = function (teacher) {
      $modal.confirm({
        title: '确认操作',
        message: '你确定要设置“'+ teacher.user.rel_name +'”为管理员吗？',
        info: '设置后“'+ teacher.user.rel_name +'”即拥有操作普通老师的权限',
        button: {
          confirm: '确定',
          cancel: '取消'
        },
        onsubmit: function () {
          CommonProvider.promise({
            model: OrganizationModel,
            method: 'putRelation',
            params: {
              role: 'user',
              id: teacher.id,
              organization_role: $scope.organization.info.user.id == $rootScope.user.id ? 'founder' : 'admin',
              body: { status: 4 }
            },
            success: function(_teacher){
              $scope.organization.teacher.lists.result.find(teacher).status = 4;
            }
          });
        }
      });
    };

    // 老师管理 - 取消管理员
    $scope.delTeacherAdmin = function (teacher) {
      $modal.confirm({
        title: '确认操作',
        message: '你确定要取消“' + teacher.user.rel_name + '”管理员吗？',
        info: '取消后“'+ teacher.user.rel_name + '”将仅拥有普通老师的身份',
        button: {
          confirm: '确定',
          cancel: '取消'
        },
        onsubmit: function () {
          CommonProvider.promise({
            model: OrganizationModel,
            method: 'putRelation',
            params: {
              role: 'user',
              id: teacher.id,
              organization_role: $scope.organization.info.user.id == $rootScope.user.id ? 'founder' : 'admin',
              body: { status: 2 }
            },
            success: function(_teacher){
              $scope.organization.teacher.lists.result.find(teacher).status = 2;
            }
          });
        }
      });
    };

    // 老师管理 - 转让创始人
    $scope.attornFounder = function (teacher) {
      $modal.confirm({
        title: '确认操作',
        message: '确定要转让身份吗？',
        info: '确定要转让创始人给“'+ teacher.user.rel_name +'”吗？转让后您将成为普通老师（无管理权限），且无法回退操作',
        button: {
          confirm: '确定',
          cancel: '放弃'
        },
        onsubmit: function () {
          CommonProvider.promise({
            model: OrganizationModel,
            method: 'putRelation',
            params: {
              role: 'user',
              id: teacher.id,
              organization_role: $scope.organization.info.user.id == $rootScope.user.id ? 'founder' : 'admin',
              body: { status: 5 }
            },
            success: function(_teacher){
              $scope.getOrganizationInfo();
              $scope.refreshOrganizationTeachers();
            }
          });
        }
      });
    };

    // 老师管理 - 删除老师
    $scope.delTeacher = function (teacher) {
      $modal.confirm({
        title: '确认操作',
        message: '你确定要删除老师吗？',
        info: '你确定要删除老师'+ teacher.user.rel_name +'吗？删除后老师即不再与本机构有任何关系',
        button: {
          confirm: '确定',
          cancel: '放弃'
        },
        onsubmit: function () {
          CommonProvider.promise({
            model: OrganizationModel,
            method: 'delRelation',
            params: {
              role: 'user',
              relation_id: teacher.id,
              organization_role: $scope.organization.info.user.id == $rootScope.user.id ? 'founder' : 'admin'
            },
            success: function(_teacher){
              $scope.refreshOrganizationTeachers();
            }
          });
        }
      });
    };

    // 机构管理 - 邀请老师
    $scope.inviteTeacher = function (params) {
      if (params.modal) {
        $rootScope.organization = $scope.organization;
        $modal.custom({
          title: '邀请老师',
          template_url: '/partials/home/teacher/organization/teacher-invite.html',
          callback: function () {
            $rootScope.organization = null;
          }
        });
      } else {
        CommonProvider.promise({
          model: OrganizationModel,
          method: 'addRelation',
          params: {
            type: 'invite',
            body: {
              organization_id: $scope.organization_id,
              phone: params.phone,
            }
          },
          success: function(_teacher){
            $rootScope.modal.close();
            $modal.success({ message: '邀请成功' });
          },
          error: function (result) {
            $rootScope.modal.close();
            $modal.error({ message: result.message });
          }
        });
      }
    };

    // 机构管理-管理员再次邀请老师
    $scope.againInviteTeacher = function (teacher) {
      $modal.confirm({
        title: '确认操作',
        message: '确定要邀请老师' + teacher.user.rel_name + '吗？',
        button: {
          confirm: '确定',
          cancel: '放弃'
        },
        onsubmit: function () {
          CommonProvider.promise({
            model: OrganizationModel,
            method: 'putRelation',
            params: {
              role: 'user',
              id: teacher.id,
              organization_role: $scope.organization.info.user.id == $rootScope.user.id ? 'founder' : 'admin',
              body: { status: 0 }
            },
            success: function(_teacher){
              $scope.organization.teacher.lists.result.find(teacher).status = 0;
            }
          });
        }
      });
    };

    // 机构管理-获取机构的所有公告
    $scope.getAnnouncement = function (params) {
      CommonProvider.promise({
        model: AnnouncementModel,
        method: 'get',
        params: {
          role: 'teacher',
          organization_id: $scope.organization_id,
          type: 1,
          per_page: 12,
          page: params.page || 1
        },
        success: function(announcements){
          $rootScope.toTop();
          $scope.organization.announcements = announcements;
        }
      });
    };

    // 机构管理 - 删除公告
    $scope.delAnnouncement = function (announcement) {
      $modal.confirm({
        title: '确认操作',
        message: '你确定要删除公告吗？',
        info: '你确定要删除公告“'+ announcement.title +'”吗？删除后不可恢复',
        button: {
          confirm: '确定',
          cancel: '放弃'
        },
        onsubmit: function () {
          CommonProvider.promise({
            model: AnnouncementModel,
            method: 'del',
            params: {
              role: 'user',
              announcement_id: announcement.id
            },
            success: function(announcements){
              $scope.organization.announcements.result.remove(announcement);
              $scope.organization.announcements.pagination.total -= 1;
            }
          });
        }
      });
    };

    // 机构管理 - 编辑公告
    $scope.editAnnouncement = function (params) {
      if (params.modal) {
        $rootScope.announcement_local = params.announcement;
        $rootScope.announcement_edit = angular.copy(params.announcement.announcement);
        $modal.custom({
          title: '编辑公告',
          template_url: '/partials/home/teacher/organization/announcement-edit.html',
          callback: function () {
            $rootScope.announcement_edit = null;
            delete $rootScope.announcement_local;
          }
        });
      } else {
        CommonProvider.promise({
          model: AnnouncementModel,
          method: 'put',
          params: {
            role: 'user',
            body: $rootScope.announcement_edit
          },
          success: function(_announcement){
            $rootScope.announcement_local.announcement = _announcement.result;
            $rootScope.modal.close();
            $modal.success({ message: '更新成功' });
          }
        });
      }
    };

    // 机构管理 - 发布公告
    $scope.addAnnouncement = function (params) {
      if (params.modal) {
        $rootScope.organization = $scope.organization;
        $rootScope.announcement_edit = {};
        $modal.custom({
          title: '编辑公告',
          template_url: '/partials/home/teacher/organization/announcement-edit.html',
          callback: function () {
            $rootScope.announcement_edit = null;
            delete $rootScope.organization;
          }
        });
      } else {
        CommonProvider.promise({
          model: AnnouncementModel,
          method: 'add',
          params: { 
            role: 'user',
            body: {
              organization_id: $scope.organization_id,
              type: 1,
              title: $rootScope.announcement_edit.title,
              content: $rootScope.announcement_edit.content
            }
          },
          success: function(_announcement){
            $rootScope.organization.announcements.result.unshift(_announcement.result);
            $rootScope.organization.announcements.pagination.total += 1;
            $rootScope.modal.close();
            $modal.success({ message: '添加成功' });
          }
        });
      }
    };

    // 机构管理-获取机构主题模板
    $scope.getThemeTemplate = function () {
      $rootScope.getConfig({
        name: 'ORGANIZATION_THEME',
        success: function(theme){
          $scope.organization.theme = theme.result;
        }
      });
    };

    // 机构管理-设置机构主题模板及banner
    $scope.setThemeTemplate = function () {
      CommonProvider.promise({
        model: OrganizationModel,
        method: 'putProfile',
        params: { 
          role: 'user',
          organization_id: $scope.organization_id,
          body: {
            index_template: $scope.organization.info.profile.index_template,
            big_banner: $scope.organization.info.profile.big_banner,
            is_blur: Number($scope.organization.info.profile.is_blur) || 0
          }
        },
        success: function(_theme){
          $modal.success({ message: '更新成功' });
        }
      });
    };

    // big_banner
    $scope.getBigBannerUpload = function (data) {
      if (data) $scope.organization.info.profile.big_banner = data.key;
    };

    // 初始化机构创建流程
    $scope.initCreateOrganization = function () {

      // 初始化
      $scope.createOrganization = {};

      // 流程
      $scope.createOrganization.step = {
        is_read: false,
        is_agree: false,
        is_submit: false,
        can_audit: 1,
        is_audit: false,
        current: 1,
        success: false
      };

      // 获取所需数据
      $scope.getLicense();
      $scope.getOrganizationCate();
    };

    // 创建机构 - 获取学校类型
    $scope.getOrganizationCate = function () {
      CommonProvider.promise({
        model: CategoryModel,
        method: 'get',
        params: {
          role: 'student',
          type: 2
        },
        success: function(cates){
          $scope.createOrganization.cates = cates.result;
        }
      });
    };

    // 创建机构-学校分类选择变化
    $scope.changeOrganizationCate = function () {
      var current_cate = $scope.createOrganization.cates.find($scope.organization.category_id, 'id');
      $scope.createOrganization.step.can_audit = current_cate.can_audit;
      if (!current_cate.can_audit) $scope.createOrganization.step.is_audit = false;
    };

    // 创建机构-获取入驻协议
    $scope.getLicense = function () {
      $rootScope.getConfig({
        name: 'CREATE_ORGANIZATION_LICENSE',
        success: function(license){
          $scope.createOrganization.license = license.result.value;
        }
      });
    };

    // 创建机构- 添加学校 [下一步] 逻辑
    $scope.createOrganizationNext = function () {
      var current_step = $scope.createOrganization.step.current;
      if (current_step == 1) {
        $scope.organization.url = 'http://';
        $scope.createOrganization.step.current = 2;
        $scope.createOrganization.step.is_agree = true;
      };
      if (current_step == 2) {
        $scope.postOrganization();
      };
    };

    // 上传图片
    // 机构logo上传回调
    $scope.addLogoUpload = function (data) {
      if (data) $scope.organization.logo = data.key;
    };

    // Scenery
    $scope.addSceneryUpload = function (data) {
      if (data) $scope.organization.scenery = data.key;
    };

    // 营业执照
    $scope.addLicenseUpload = function (data) {
      if (data) $scope.organization.business_license = data.key;
    };

    // 认证身份证
    $scope.addIdCardUpload = function (data) {
      if (data) $scope.organization.id_card = data.key;
    };

    // 老师身份证
    $scope.addIdentityUpload = function (data) {
      if (data) $scope.organization.id_card = data.key;
    };

    // 教育资质
    $scope.addQualificationUpload = function (data) {
      if (data) $scope.organization.education_qualification = data.key;
    };

    // 验证机构名称
    $scope.checkNameValid = function (name) {
      if (!name) return false;
      CommonProvider.promise({
        model: SearchModel,
        method: 'get',
        params: {
          keyword: name,
          detail: 1,
          only_name: 1,
          search_type: 'organization',
          per_page: 200,
          page: 1
        },
        success: function (organizations) {
          var orgs = organizations.result;
          if (!orgs.length) { $scope.organization.name_is_valid = true };
          if (orgs.length) { 
            $scope.organization.name_is_valid = true;
            orgs.forEach(function (org) {
              if (name == org.name) { $scope.organization.name_is_valid = false; }
            });
          };
        }
      });
    };

    // 创建机构-添加新的学校
    $scope.postOrganization = function () {
      CommonProvider.promise({
        model: OrganizationModel,
        method: 'add',
        params: $scope.organization,
        success: function(organization){
          $scope.organization_id = organization.result.id;
          var success = function () {
            $scope.createOrganization.step.is_submit = true;
            $scope.createOrganization.step.current = 3;
            $rootScope.toTop();
          };
          if (!!$scope.createOrganization.step.is_audit) {
            $scope.updateOrganizationAudit(function () {
              success();
            });
          } else {
            success();
          }
        },
        result: function (res) {
          if (res.code == 0) $modal.error({ message: err.message });
        }
      });
    };

    // 搜索机构初始化
    $scope.searchBoxInit = function () {
      $scope.organization.keyword = '';
      $scope.organization.lists = {};
    };

    // 加入机构 - 搜索格式化
    $scope.searchFormat = function (keyword) {

      // 去除非中文&空格
      $scope.organization.keyword = keyword == null ? '' : keyword.replace(/[^\u4E00-\u9FA5\uf900-\ufa2d]/g,'').replace(/\s+/g,'').replace(/(^\s+)|(\s+$)/g,'');
    }

    // 机构联想搜索
    $scope.searchSuggest = function(keyword) {
      return CommonProvider.request({
        method: 'get',
        service: new SearchService(),
        params: {
          keyword: keyword,
          only_name: 1,
          search_type: 'organization',
        }
      }).then(function(res){
        return res.result;
      });
    };

    // 机构搜索
    $scope.searchOrganiztion = function (params) {
      if (!$scope.organization.keyword) return false;
      CommonProvider.promise({
        model: SearchModel,
        method: 'get',
        params: {
          keyword: $scope.organization.keyword,
          only_name: 1,
          search_type: 'organization',
          per_page: 8,
          page: params.page || 1
        },
        success: function (orgs) {
          $scope.organization.lists = orgs;
        }
      });
    };

    // 加入机构初始化
    $scope.joinOrganizationInit = function () {
      if (!$scope.teacher) $scope.teacher = {};
      $scope.getOrganizationInfo();
      AuthProvider.init(function (user) {
        $scope.teacher.rel_name = user.profile.rel_name;
        $scope.teacher.phone = user.phone;
        $scope.teacher.id_card_pic = user.profile.id_card_pic;
      });
    };

    // 老师身份证更新
    $scope.getIdentityUpload = function (data) {
      if (data) $scope.teacher.id_card_pic = data.key;
      CommonProvider.promise({
        model: StudentModel,
        method: 'put',
        params: {
          id_card_pic: $scope.teacher.id_card_pic
        },
        success: function (user) {
          $rootScope.user.profile.id_card_pic = $scope.teacher.id_card_pic;
          $localStorage.user.profile.id_card_pic = $scope.teacher.id_card_pic;
        }
      });
    };

    // 老师操作-申请加入机构
    $scope.joinOrganization = function () {
      CommonProvider.promise({
        model: OrganizationModel,
        method: 'addRelation',
        params: {
          type: 'apply',
          body: {
            organization_id: $scope.organization_id,
            phone: $scope.teacher.phone,
            title: $scope.teacher.title,
            introduction: $scope.teacher.introduction,
            status: 1,
          }
        },
        success: function(_teacher){
          $modal.success({ message: '申请成功' });
          $location.path('teacher/organization/list').search({ 'tab': 3 });
        },
        error: function (result) {
          // $rootScope.modal.close();
          $modal.error({ message: result.message });
        }
      });
    };

  }
]);