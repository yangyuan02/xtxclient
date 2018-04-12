/**
*
* StudentModel Module
*
* Description
*
*/
angular.module('StudentModel', ['StudentService'])

// 课程数据模型
.factory('StudentModel', ['StudentService', 'CommonProvider',
  function(StudentService, CommonProvider){
    
    var _student_model = {

      // 路径汇总
      get: function (params) {
        return CommonProvider.request({
          method: 'get',
          service: new StudentService(),
          params: params
        });
      },

      // 修改资料
      put: function (user) {
        return CommonProvider.request({
          method: 'put',
          service: new StudentService(user)
        });
      }
    };

    return _student_model;
  }
]);