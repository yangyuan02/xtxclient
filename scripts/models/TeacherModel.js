/**
*
* TeacherModel Module
*
* Description
*
*/
angular.module('TeacherModel', ['TeacherService'])

// 课程数据模型
.factory('TeacherModel', ['TeacherService', 'CommonProvider',
  function(TeacherService, CommonProvider){

    var _teacher_model = {

      // 获取老师信息
      get: function (params) {
        return CommonProvider.request({
          method: 'get',
          service: new TeacherService(),
          params: params
        });
      },

      // 获取收入明细列表
      incomeDetail: function (params) {
        return CommonProvider.request({
          method: 'incomeDetail',
          service: new TeacherService(),
          params: params
        });
      },

      // 获取收入统计
      incomeDaily: function (params) {
        return CommonProvider.request({
          method: 'incomeDaily',
          service: new TeacherService(),
          params: params
        });
      },
    }

    return _teacher_model;
  }
]);