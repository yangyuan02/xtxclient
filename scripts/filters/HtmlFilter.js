/*
* HTML编译输出模块 
*
* Description
*/

angular.module('HtmlFilter', [])

// html安全解析过滤器
.filter('toHtml', ['$sce', function($sce){
  return function(text) {
    return $sce.trustAsHtml(text);
  };
}])

// 文字溢出过滤器
.filter('textOverflow', ['$sce', function($sce){
  return function(text, length) {
    if (length && text && (text.length) > length ) {
      return text.substr(0, length) + '...';
    } else {
      return text;
    }
  };
}])

// 价格自动+.00
.filter('priceFormat', [function(){
  return function(text) {
    if (!isNaN(text)) {
      return (text.toFixed(2));
    } else {
      return text;
    }
  }
}])

// 查看更多
.filter('readMore',function(){
  return function(content, length, text){
    var more_btn = '...<a class="read-more">&nbsp;&nbsp;' + ( text || "查看全部" ) + '&nbsp;>></a>';
    // 如果实际内容长度小于设置的长度则输出原文
    if (content.length != 0 && content.length < length) {
      return content;
    // 否则，仅输出截取后的内容以及提示文字
    } else {
      return content.substr(0, length) + more_btn;
    }
    
  }
})