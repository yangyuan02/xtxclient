/**
*
* CourseModel Module
*
* Description
*
*/
angular.module('CourseModel', ['CourseService'])

// 课程数据模型
.factory('CourseModel', ['CourseService', 'CommonProvider',
  function(CourseService, CommonProvider){
    
    var _course = {};
    var _course_list;
    var _course_item;
    var _course_others;
    var _course_classmates;
    var _course_model = {};
    var _course_service = new CourseService();

    _course_model = {

      // 获取多个用户的信息
      getUsersInfo: function (params) {
        return CommonProvider.request({
          method: 'getUsersInfo',
          service: new CourseService({ user_ids: params.user_ids })
        });
      },

      // 获取课程列表
      get: function (params) {
        params.page = params.page || 1;
        params.per_page = params.per_page || 20;
        return CommonProvider.request({
          method: 'get',
          service: new CourseService(),
          params: params,
          success: function (_course_lists) {
            _course_list = _course_lists;
          }
        });
      },

      // 获取单条课程详情
      item: function (params) {
        return CommonProvider.request({
          method: 'item',
          service: _course_service,
          params: params,
          success: function (_course_item) {
            _course.info = _course_item;
          }
        });
      },

      // 修改课程
      put: function (course) {
        return CommonProvider.request({
          method: 'put',
          service: new CourseService(course.new),
          params: { course_id: course.new.id },
          success: function (_course) {
            return _course;
          }
        });
      },

      // 新增课程
      add: function (course) {
        return CommonProvider.request({
          method: 'save',
          service: new CourseService(course),
          success: function (_course) {
            return _course;
          }
        });
      },

      // 删除课程
      del: function (course) {
        return CommonProvider.request({
          method: 'del',
          service: new CourseService(),
          params: { course_id: course.course.id },
          success: function (_course) {
            _course_list.result.remove(course.course);
            _course_list.pagination.total -= 1;
          }
        });
      },

      // 批量删除课程
      delete: function (ids) {
        return CommonProvider.request({
          method: 'delete',
          service: new CourseService(),
          params: { ids: ids.join(',') },
          success: function (_course) {
            _course_model.get({ page: _course_list.pagination.current_page });
          }
        });
      },

      // (批量)下架课程
      disable: function (params) {
        var ids = params.length ? params.join(',') : params.course.id;
        return CommonProvider.request({
          method: 'disable',
          service: new CourseService({ ids: ids }),
          success: function (_course) {
            if (params.length) {
              _course_model.get({ page: _course_list.pagination.current_page });
            } else {
              params.course.x_status = 0;
            }
          }
        });
      },

      enable: function (params) {
        var ids = params.length ? params.join(',') : params.course.id;
        return CommonProvider.request({
          method: 'enable',
          service: new CourseService({ ids: ids }),
          success: function (_course) {
            if (params.length) {
              _course_model.get({ page: _course_list.pagination.current_page });
            } else {
              params.course.x_status = 1;
            }
          }
        });
      },

      // 关系
      relation: function (course_id) {
        return CommonProvider.request({
          method: 'relation',
          service: new CourseService(),
          params: { course_id: course_id },
          success: function (_relation) {
            _course.relation = _relation;
          }
        });
      },

      // 相关课程
      others: function (params) {
        return CommonProvider.request({
          method: 'others',
          service: new CourseService(),
          params: params,
          success: function (_others) {
            _course.others = _others;
          }
        });
      },

      // 同学
      classmates: function (params) {
        return CommonProvider.request({
          method: 'classmates',
          service: new CourseService(),
          params: params,
          success: function (_classmates) {
            _course.classmates = _classmates;
          }
        });
      },

      // 操作课程（添加试听/购买/记录）
      operation: function (params) {
        return CommonProvider.request({
          method: 'operation',
          service: new CourseService(),
          params: { 
            method: params.method, 
            course_id: params.course_id
          }
        });
      }
    };
    
    return _course_model;
  }
])