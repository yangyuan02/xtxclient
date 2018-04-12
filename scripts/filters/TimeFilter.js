/*
*
* 时间格式化模块 
*
* Description
*
*/

angular.module('TimeFilter', [])

// ISO时间转换过滤器
.filter('dateFilter', ['dateFilter', function(dateFilter){
  return function(text) {
    return dateFilter(text, 'yyyy-MM-dd');
  };
}])

// YMDHMS时间转换过滤器
.filter('toYMD', [function(){
  return function(date) {
    return !!date ? date.toString().substr(0 ,10) : date;
  };
}])

// 转换为相对时间 2016-04-01 to 三天前/10分钟前/半年前...
.filter('relativeTime', ['$rootScope', function($rootScope){
  return function(time) {
    return $rootScope.moment.from(time, false);
  };
}])

// 秒转为小时分钟过滤器
.filter('toHHMMSS', function () {
  return function (sec, type, h_slug, m_slug, s_slug) {

    // 计算
    var sec_num = parseInt(sec, 10);
    var hours   = Math.floor( sec_num / 3600 );
    var minutes = Math.floor(( sec_num - ( hours * 3600 )) / 60 );
    var seconds = sec_num - ( hours * 3600 ) - ( minutes * 60 );

    // 低级格式化
    if (hours   < 10) { hours   = '0' + hours; }
    if (minutes < 10) { minutes = '0' + minutes; }
    if (seconds < 10) { seconds = '0' + seconds; }

    // 显示规则
    var hour_display, minute_display, second_display;
    if (type) {
      hour_display = type.indexOf("H") > -1 && hours > 0 ? true : false;
      minute_display = type.indexOf("M") > -1 ? true : false;
      second_display = type.indexOf("S") > -1 ? true : false;
    } else {
      hour_display = minute_display = second_display = true;
    }

    // 自定义格式化
    var hour_slug = h_slug != undefined ? h_slug : ':';
    var minute_slug = m_slug != undefined ? m_slug : ':';
    var second_slug = s_slug != undefined ? s_slug : '';

    var time = ( hour_display ? hours + hour_slug : '' ) + ( minute_display ? minutes + minute_slug : '' ) + ( second_display ? seconds + second_slug : '' );
    return time;
  };
})