/**
 * Filter单元测试
 */

'use strict';
describe('Filters', function () {

  //载入测试目标模块
  beforeEach(module('TimeFilter'));

  // 测试过滤器
  it('IOS日期转换 过滤器', inject(function(dateFilterFilter){
    expect(dateFilterFilter(new Date()).length).to.equal(10);
  }));

  it('toYMD 过滤器', inject(function(toYMDFilter){
    expect(toYMDFilter('2016-03-04 18:00:00')).to.equal('2016-03-04');
  }));

  it('toHHMMSS 过滤器', inject(function(toHHMMSSFilter){
    expect(toHHMMSSFilter(4270)).to.equal('01:11:10');
  }));
  
});