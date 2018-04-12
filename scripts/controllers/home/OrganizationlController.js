/*
*
* OrganizationlController Module
*
* Description
*
*/
angular.module('OrganizationlController', ['OrganizationModel', 'CourseModel', 'CategoryModel', 'SearchModel', 'StudentModel', 'AnnouncementModel', 'AuditModel'])
.controller('OrganizationlController', ['$rootScope', '$scope', '$stateParams', '$location', '$modal', 'CommonProvider', 'OrganizationModel', 'CourseModel', 'CategoryModel', 'SearchModel', 'StudentModel', 'AnnouncementModel', 'AuditModel', 
  function ($rootScope, $scope, $stateParams, $location, $modal, CommonProvider, OrganizationModel, CourseModel, CategoryModel, SearchModel, StudentModel, AnnouncementModel, AuditModel) {

    // 初始化
    $scope.organization_id = $stateParams.organization_id || false;
    $scope.teacher_id = $stateParams.teacher_id || false;
    $scope.teacher = {};
    $scope.categorys = {};
    $scope.organization = {};
    $scope.organizations = {};
    $scope.currrent_category = {};
    $scope.organization.courses = {};
    $scope.organization.courses.sort_id = 0;
    $scope.organization.courses.is_live = 0;

    // List -------------------------------

    // 请求学校/机构分类列表
    $scope.getOrganizations = function () {
      CommonProvider.promise({
        model: CategoryModel,
        method: 'get',
        params: { 
          type: 2,
          role: 'student'
        },
        success: function(categorys){
          $scope.categorys = categorys.result;
        },
        error: function (categorys) {
          $modal.error({
            title: '请求异常',
            message: categorys.message
          });
        }
      });
    };

    // 根据id请求学校/机构列表
    $scope.getOrganizationLists = function (params) {

      CommonProvider.toTop();

      // 如果点击选项卡时此区已有内容且是请求第一页，则不请求
      if (!!$scope.organizations[params.cate.id] && !params.page) {
        return false;
      }

      // 没有参数则不请求
      if (!params.cate.id) {
        return false;
      }

      CommonProvider.promise({
        model: OrganizationModel,
        method: 'get',
        params: {
          category_id: params.cate.id,
          role: 'student',
          per_page: 20,
          page: params.page || 1
        },
        success: function(organizations){
          $scope.organizations[params.cate.id] = organizations;
        },
        error: function (organizations) {
          $modal.error({
            title: '请求异常',
            message: organizations.message
          });
        }
      });
    };

    // 获取机构搜索列表数据
    $scope.getOrganizationSearchList = function (params) {
      $rootScope.toTop();
      $scope.keyword = $stateParams.key;
      CommonProvider.promise({
        model: SearchModel,
        method: 'get',
        params: {
          keyword: $stateParams.key || '',
          detail: 1,
          only_name: 1,
          search_type: 'organization',
          per_page: 20,
          page: params.page || 1
        },
        success: function (organizations) {
          $scope.organizations = organizations;
        }
      });
    };

    // 每此切换选项后，改变面包屑数据
    $scope.changeCate = function (cate) {

      // 改变活动项
      $scope.currrent_category = cate;

      $scope.getOrganizationLists({ cate: cate });
    };

    // 主页 -------------------------------

    // 获取机构首页基本信息
    $scope.getIndex = function () {
      CommonProvider.promise({
        model: OrganizationModel,
        method: 'item',
        params: {
          organization_id: $scope.organization_id
        },
        success: function(organization){
          $scope.organization.info = organization.result;
          $rootScope.title = $scope.organization.info.name;
          $rootScope.description = $scope.organization.info.introduction;
          $scope.getIndexCourses();
          $scope.getIndexTeachers();
          $scope.getIndexAnnouncements();
        },
        error: function (organization) {
          $modal.error({
            title: '请求异常',
            message: organization.message
          });
        }
      });
    };

    // 获取机构首页精品课程
    $scope.getIndexCourses = function () {
      CommonProvider.promise({
        model: CourseModel,
        method: 'get',
        params: { 
          role: 'student',
          page: 1,
          per_page: 12,
          organization_id: $scope.organization_id
        },
        success: function(courses){
          $scope.organization.info.courses = courses.result;
        }
      });
    };

    // 获取首页老师
    $scope.getIndexTeachers = function () {
      CommonProvider.promise({
        model: OrganizationModel,
        method: 'relation',
        params: {
          per_page: 5,
          role: 'student',
          organization_role: 'teacher',
          page: 1,
          organization_id: $scope.organization_id
        },
        success: function(teachers){
          $scope.organization.info.teachers = teachers.result;
        }
      });
    };

    // 获取公告列表
    $scope.getIndexAnnouncements = function () {
      CommonProvider.promise({
        model: AnnouncementModel,
        method: 'get',
        params: {
          per_page: 10,
          role: 'student',
          type: 1,
          page: 1,
          organization_id: $scope.organization_id
        },
        success: function(announcements){
          $scope.organization.info.announcements = announcements.result;
        }
      });
    };

    // 机构首页公告弹窗
    $scope.announcementDetail = function (announcement) {
      $modal.custom({
        title: '公告详情',
        template: '<h4 class="text-center">' + announcement.title + '</h4><hr><p class="text-height">' + announcement.content + '</p>'
      });
    };

    // 机构首页简介弹窗
    $scope.descriptionDetail = function (organization, length) {
      if (organization.introduction.length <= length) return false;
      $modal.custom({
        title: organization.name + ' - 学校详情',
        template: '<p class="text-height">' + organization.introduction + '</p>'
      })
    };

    // 老师介绍弹窗
    $scope.teacherDetail = function (teacher, length) {
      if (teacher.introduction.length <= length) return false;
      $modal.custom({
        title: teacher.user.real_name + ' - 老师详情',
        template: '<p class="text-height">' + teacher.introduction + '</p>'
      })
    };

    // 获取机构所有课程列表
    $scope.getCourseLists = function (page) {

      // tab切换若有数据，则不再请求
      if (!!$scope.organization.courses.pagination && !page) return false;

      var get_params = {
        role: 'student',
        page: page || 1,
        per_page: 12,
        sort_id: $scope.organization.courses.sort_id || 0,
        organization_id: $scope.organization_id
      };
      
      if ($scope.organization.courses.is_live == 1) get_params.is_live = 1;

      CommonProvider.promise({
        model: CourseModel,
        method: 'get',
        params: get_params,
        success: function(courses){
          courses.sort_id = $scope.organization.courses.sort_id;
          courses.is_live = $scope.organization.courses.is_live;
          $scope.organization.courses = courses;
        }
      });
    };

    // 按照条件获取排序列表数据
    $scope.sortCourseLists = function (sort_id) {
      if ($scope.organization.courses.sort_id == sort_id) return false;
      $scope.organization.courses.sort_id = sort_id;
      $scope.getCourseLists(1);
    };

    // 直播过滤
    $scope.liveCourseLists = function (is_live) {
      var is_live = Number(is_live);
      if ($scope.organization.courses.is_live == is_live) return false;
      $scope.organization.courses.is_live = is_live;
      $scope.getCourseLists(1);
    };

    // 获取机构所有老师列表
    $scope.getTeacherLists = function (params) {
      if (!params.page && !!$scope.organization.teachers) return false;
      CommonProvider.promise({
        model: OrganizationModel,
        method: 'relation',
        params: {
          per_page: 10,
          role: 'student',
          organization_role: 'teacher',
          page: params.page || 1,
          organization_id: $scope.organization_id
        },
        success: function(teachers){
          $scope.organization.teachers = teachers;
        }
      });
    };

    // Teacher ------------------------------------

    // 获取老师基本数据
    $scope.getTeacherIndex = function () {
      $scope.teacher.sort_id = 0;
      $scope.teacher.is_live = 0;
      CommonProvider.promise({
        model: OrganizationModel,
        method: 'relation',
        params: { 
          role: 'student',
          organization_role: 'teacher',
          organization_id: $scope.organization_id,
          user_id: $scope.teacher_id
        },
        success: function (teacher) {
          $scope.teacher.info = teacher.result[0];
          $rootScope.title = $scope.teacher.info.user.profile.rel_name + '老师的主页';
        }
      });
    };

    // 获取老师课程数据
    $scope.getTeacherCourse = function (params) {
      var params = params || {};

      var get_params = {
        role: 'student',
        page: params.page || 1,
        per_page: 12,
        organization_id: $scope.organization_id,
        user_id: $scope.teacher_id,
        sort_id: $scope.teacher.sort_id
      };

      if ($scope.teacher.is_live == 1) get_params.is_live = 1;

      CommonProvider.promise({
        model: CourseModel,
        method: 'get',
        params: get_params,
        success: function(courses){
          $scope.teacher.courses = courses;
        }
      });
    };
    
    $scope.organizationIcon = function (cate) {
      if (!!cate) {
        switch(cate.name) {
          case '大学':
              return 'icon-university';
              break;
          case '中学':
              return 'icon-high-school';
              break;
          case '培训机构':
              return 'icon-entrance-tests';
              break;
          case '公益组织':
              return 'icon-welfare';
              break;
            default:
              break;
        };
      }
    };

  }
])