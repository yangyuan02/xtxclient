/**
 * Controller单元测试
 */

'use strict';
// describe('Controllers', function () {

//   // 载入测试目标模块
//   beforeEach(module('UserController'));

//   // $scope变量测试
//   describe('父控制器', function () {

//     // 使用inject()注入控制器(Controller)的测试代码
//     it('title should is 用户', inject(function ($rootScope, $controller) {

//       // 创造一个scope对象
//       var scope = $rootScope.$new();

//       // 运行我们需要调试的'UserController'控制器
//       var user_controller = $controller('UserController', {
//         $scope: scope,
//       });

//       expect(4 + 5).to.equal(9);

//     }));
//   });

//   // 测试scope的变化是否正确
//   it('4 + 4 should is 5', function () {
//     expect(4 + 5).to.equal(9);
//   });

// });

describe('Controllers', function(){

  beforeEach(module('ui.router'));
  beforeEach(module('ngResource'));
  beforeEach(module('angular.modal'));
  beforeEach(module('CommonProvider'));
  beforeEach(module('UserController'));

  describe('用户控制器', function(){
    it('csv', inject(function($controller){

      var scope = {};
      var user_controller = $controller('UserController', {
        $scope: scope,
      });

      console.log(scope.test);

      expect(scope.test).to.equal('12');

    }));
  });
});