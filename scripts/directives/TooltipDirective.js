/**
* angular.tooltip
* Author: Surmon
* site: //surmon.me
* Description:  
  可指定四个参数：(最少需要两个参数: tooltip && title内容 否则不显示)
  tooltip：[空/normal - 默认hover触发事件, focus - 支持input/dom, event - 事件触发在js中给绑定数据tooltit赋予提示内容即可]
  title: String字符串
  tooltit: Model绑定（在tooltip触发方式为event时，必须配合此属性以激活）
  toolpos : String字符串/left/right/center
*
*/
angular.module('TooltipDirective', [])
// 全局tooltip
.directive('tooltip', function($window) {
  return {
    restrict: 'A',
    scope: {
      toolpos: '@',
      tooltip: '@',
      title:   '@',
      tooltit: '='
    },
    link: function($scope, $element, $attrs) {

      // 初始化构造方法
      var tooltip = function () {

        // 绑定父对象
        var self = this;

        // 判断触发方式
        this.tigger = $scope.tooltip || 'normal';

        // 判断触发位置
        this.position = $scope.toolpos || 'center';

        // 提示内容
        this.title = $scope.tooltit || $scope.title || '';

        // 显示状态
        this.display = false;

        // 显示方法
        this.visible = function (option) {

          // 显示前更新
          self.title = $scope.tooltit || $scope.title || '';

          // 如果为空则不显示
          if (!self.title) {
            return false;
          }

          // 显示前如果存在工具，则删除此工具
          if (document.getElementById('J_tooltip')) {
            angular.element(document.getElementById('J_tooltip')).remove();
          }

          // 给当前文档以高亮显示
          $element.addClass('tooltip-active');

          // 定义工具模板
          var tooltip_template = '<div id="J_tooltip" class="tooltip tooltip-hidden">';
          tooltip_template += '<div class="tooltip-inner">';
          tooltip_template += '<span class="tooltip-text">' + self.title + '</span>';
          tooltip_template += '<span class="tooltip-sulg"></span>';
          tooltip_template += '</div></div>';

          // 向文档树添加内容
          angular.element(document.body).append(tooltip_template);
          var tool_element = angular.element(document.getElementById('J_tooltip'));
          var tool_position = function () {
            switch(self.position){
              case 'center':
                return $element[0].getBoundingClientRect().left + $element[0].offsetWidth / 2 - document.getElementById('J_tooltip').offsetWidth / 2 + 'px';
                break;
              case 'left':
                return $element[0].getBoundingClientRect().left - document.getElementById('J_tooltip').offsetWidth / 2 + 'px';
                break;
              case 'right':
                return $element[0].getBoundingClientRect().left + $element[0].offsetWidth - document.getElementById('J_tooltip').offsetWidth / 2 + 'px';
                break;
              default:
                return $element[0].getBoundingClientRect().left + $element[0].offsetWidth / 2 - document.getElementById('J_tooltip').offsetWidth / 2 + 'px';
            }
          }

          // 定位位置
          tool_element.css('left', tool_position());
          tool_element.css('top', $element[0].getBoundingClientRect().top - 40 + 'px');
          tool_element.removeClass('tooltip-hidden');
          tool_element.addClass('tooltip-display');
          self.display = true;

          // 如果设置了自动隐藏，则1秒后赋予不可见属性，随后删除
          if (!!option && option.autohide) {
            setTimeout(function () {
              $element.removeClass('tooltip-active');
              tool_element.removeClass('tooltip-display');
              tool_element.addClass('tooltip-hidden');
              $scope.tooltit = '';
            }, 600)
          }

          // 元素显示时需要绑定窗口滚动监听
          self.scroll();
          self.resize();
        }

        // 隐藏方法
        this.hidden = function () {
          $element.removeClass('tooltip-active');
          var tool_element = angular.element(document.getElementById('J_tooltip'));
          tool_element.removeClass('tooltip-display');
          tool_element.addClass('tooltip-hidden');
          setTimeout(function () {
            tool_element.remove();
          }, 500);
          self.display = false;
        }

        // hover方法
        this.hover = function () {

          // 存储属性值
          var title = $attrs.title;

          // 绑定鼠标移入事件
          $element.bind('mouseover', function() {
            if( $attrs.title == undefined || $attrs.title == '') return;
            $element.attr('title', '');
            self.visible();
          });

          // 鼠标移除事件
          $element.bind('mouseout', function() {
            $element.attr('title', title);
            self.hidden();
          });
        }

        // focus方法
        this.focus = function () {

          // 如果是input控件则绑定focus事件
          if ($element[0].tagName.toUpperCase() == 'INPUT') {

            $element.bind('focus', function () {
              self.visible();
            })
            $element.bind('blur', function () {
              self.hidden();
            })

          // 否则绑定click事件
          } else {
            $element.bind('click', function () {
              // 如果在显示则隐藏，否则反之
              if (self.display) {
                self.hidden();
              } else {
                self.visible();
              }
            })
            $element.bind('blur', function () {
              self.hidden();
            })
          }
        }

        // 监听方法
        this.event = function () {
          $scope.$watch('tooltit', function () {
            self.title = $scope.tooltit;
            self.visible({'autohide': true});
          });
        }

        // 类型绑定事件
        this.bind = function () {
          // 根据用户设置的事件触发方式来绑定不同事件
          switch (self.tigger) {
            case 'normal':
                    self.hover();
                    break;
            case 'focus':
                    self.focus();
                    break;
            case 'event':
                    self.event();
                    break;
                  default: 
                    break;
          }
        }

        // 滚动监听事件
        this.scroll = function () {
          // 绑定winodw滑动监听
          angular.element($window).bind('scroll', function() {
            // 如果在显示，则实时改变他的顶部高度
            if (angular.element(document.getElementById('J_tooltip'))) {
              self.hidden();
            }
          })
        }

        // 窗口监听事件
        this.resize = function () {
          angular.element($window).bind('resize', function() {
            // 如果在显示，暂时没什么要做的
          })
        }
      }

      // 实例化执行
      var _tooltip = new tooltip();
      _tooltip.bind(); 

    }
  }
});