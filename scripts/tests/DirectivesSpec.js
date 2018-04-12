/**
 * Directive单元测试demo
 */

'use strict';
describe('Directives', function () {

  //载入测试目标模块
  beforeEach(module('TotopDirective'));

  it('TotopDirective 返回顶部', inject(function($compile, $rootScope) {
      // 创建作用域
      var scope = $rootScope.$new();
      // 创建元素
      var elem = angular.element('<a href="" go-to-top></a>');
      // 编译HTML
      $compile(elem)(scope);
      // 测试是否编译成功
      expect(elem[0].childNodes.length).to.equal(1);
     })
  );

  
});