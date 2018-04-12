/**
 * 模态弹窗
 * v0.0.2
 *
 * @author max@winhu.com
 */
angular.module('angular.modal', [])

.factory('templateEngine', ['$rootScope', '$http', '$templateCache', '$compile', function ($rootScope, $http, $templateCache, $compile) {

  return function (params) {

    // 如果是自定义内容
    if (!!params.template) {
      params.success(params.template);
      return false;
    };

    // 请求模板内容
    $http.get(params.template_url, { cache: $templateCache }).success(function (tplContent) {
      params.success(tplContent);
    }).error(function () {
      params.error();
    });
  }
}])

.factory('$modal', ['$rootScope', 'templateEngine', '$compile', '$window', '$document', '$timeout', '$interval', function ($rootScope, templateEngine, $compile, $window, $document, $timeout, $interval) {

  // 弹窗居中
  var modal_center = function () {
    var vertical_center = function () {
      var e_height = $('#J_modal_dialog').height();
      var w_height = $(window).height();
      var m_height = (w_height - e_height) / 2;
      $('#J_modal_dialog').css('marginTop', m_height + 'px');
    };
    vertical_center();
    $(window).resize(vertical_center);
  };

  var modal = {
    timer_text: '',
    lazytime: 0,
    callback: '',
    openCallback: '',
    onsubmit: '',
    oncancel: '',
    modal_promise: '',
    init: function (param) {
      var _self = this,
          type = param.type,
          title = param.title || '提示信息',
          message = param.message || '',
          info = param.info || '',
          lazytime = param.lazytime || 2,
          template_url = param.template_url,
          template = param.template,
          button = param.button || { confirm: '确定', cancel: '取消' },
          callback = param.callback,
          openCallback = param.openCallback,
          onsubmit = param.onsubmit,
          oncancel = param.oncancel,
          icon = '',
          modal_class = '',
          modal_header = '',
          modal_body = '',
          modal_info = '',
          modal_footer = '';

      _self.lazytime = lazytime;
      _self.callback = callback;
      _self.openCallback = openCallback;
      _self.onsubmit = onsubmit;
      _self.oncancel = oncancel;

      if (!!info) modal_info = '<p class="info">'+ info + '</p>';

      // 弹窗（非图片）append方法
      var appendModal = function (_modal) {

        var template = '<div id="J_modal_box" class="modal fade in show">' +
          '<div id="J_modal_dialog" class="modal-dialog '+ (_modal.class || '') +'">' +
            '<div class="modal-content">' +
              '<div class="modal-header">' +
                '<button type="button" class="close" ng-click="modal.close()"><i class="icon icon-close h3"></i></button>' +
                '<h4 class="modal-title">'+ title +'</h4>' +
              '</div>' + _modal.body + (_modal.footer || '') +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div id="J_modal_backdrop" class="modal-backdrop fade"></div>';

        var scope = $rootScope.$new(true).$root;
        var modal_html = $compile(template)(scope);

        var append_modal = function () {
          // $document.find('body').addClass('modal-open');
          $('#J_main_container').append(modal_html);
          setTimeout(function () {
            $('#J_modal_backdrop').addClass('in');
            modal_center();
          }, 10);
          // 弹出弹窗后的回调函数
          if (!!_self.openCallback) $timeout(_self.openCallback, 40);
        };

        // 如果已有弹窗元素，则延时200毫秒再执行
        if(!!$('#J_modal_box').length) setTimeout(append_modal, 250);
        if(!$('#J_modal_box').length) append_modal();
      };

      switch (type) {
        case 'success':
        case 'error':
        case 'warning':
          icon = 'icon-' + type;
          // lazytime秒后自动关闭
          if (lazytime > 0) {
            this.autoClose();
          }
          modal_class = 'modal-message';
          modal_body = '<div id="J_modal_body" class="modal-body">' +
              '<i class="icon '+ icon +'"></i>' +
              message +
              modal_info +
              '<p class="info timer">' + lazytime +'秒后窗口将自动关闭</p>' +
            '</div>';
          break;
        case 'confirm':
          icon = 'icon-warning';
          modal_class = 'modal-confirm';
          modal_body = '<div id="J_modal_body" class="modal-body">' +
              '<i class="icon '+ icon +'"></i>' +
              message +
              modal_info +
            '</div>';
          modal_footer = '<div class="modal-footer" id="J_modal_footer">' +
              '<button type="button" class="btn btn-primary" ng-click="modal.submit()">'+ button.confirm +'</button>' +
              '<button type="button" class="btn btn-default" ng-click="modal.cancel()">'+ button.cancel +'</button>' +
            '</div>';
          break;
        case 'custom':
          templateEngine({
            template_url: template_url,
            template: template,
            success: function (tplContent) {
              modal_body = '<div id="J_modal_body" class="modal-body clearfix">' + tplContent + '</div>';
              appendModal({ class: 'modal-custom', body: modal_body });
            },
            error: function () {
              modal.init({
                type: 'error',
                info: '加载错误',
                message: '由于网络原因加载失败'
              })
            }
          });
          return;
          break;
        default: break;
      };
      appendModal({ class: modal_class, body: modal_body, footer: modal_footer });
    },
    initImage: function (param) {
      var _self = this;
      var url = param.url || '';
      if (!url) {
        modal.init({
          type: 'error',
          info: '图片错误',
          message: '无效图片地址'
        })
        return false;
      }
      var img = new Image();  
      img.onload = function(){
        var template = '<div id="J_modal_box" class="modal modal-image fade in show">' +
            '<div id="J_modal_dialog" class="modal-dialog">' +
              '<div class="modal-content">' +
                '<button type="button" class="close" ng-click="modal.close()"><i class="icon icon-close h3"></i></button>' +
                // '<a href="#" class="prev" ng-click="modal.close()"><i class="icon icon-arrow-left"></i></a>' +
                // '<a href="#" class="next" ng-click="modal.close()"><i class="icon icon-arrow-right"></i></a>' +
                '<img src="'+ url +'">' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div id="J_modal_backdrop" class="modal-backdrop fade"></div>';
        var scope = $rootScope.$new(true).$root;
        var modal_html = $compile(template)(scope);
        $('#J_main_container').append(modal_html);
        // $document.find('body').addClass('modal-open');
        $timeout(function () {
          $('#J_modal_backdrop').addClass('in')
          // $('#J_modal_box').click(modal.close);
          modal_center();
        }, 10);
        // $(window).scroll(function() { modal.close() });
      };  
      img.onerror = function(){
        modal.init({
          type: 'error',
          info: '图片错误',
          message: '图片加载失败'
        });
      };  
      img.src = url;
    },
    initLoading: function (param) {
      if (!!$('#J_loading_box').length) return;
      var _self = this,loader = param.loader || 'images/loader.gif';
      var template = '<div id="J_loading_box" class="modal modal-loading fade out show">' +
                      '<div class="loader">' +
                        '<img src="'+ loader +'">' +
                        // '<div class="loader">' + 
                        //   '<div class="loader-inner">' +
                        //     '<div class="sk-fading-circle">' + 
                        //       '<div class="sk-circle1 sk-circle"></div>' + 
                        //       '<div class="sk-circle2 sk-circle"></div>' + 
                        //       '<div class="sk-circle3 sk-circle"></div>' + 
                        //       '<div class="sk-circle4 sk-circle"></div>' + 
                        //       '<div class="sk-circle5 sk-circle"></div>' + 
                        //       '<div class="sk-circle6 sk-circle"></div>' + 
                        //       '<div class="sk-circle7 sk-circle"></div>' + 
                        //       '<div class="sk-circle8 sk-circle"></div>' + 
                        //       '<div class="sk-circle9 sk-circle"></div>' + 
                        //       '<div class="sk-circle10 sk-circle"></div>' + 
                        //       '<div class="sk-circle11 sk-circle"></div>' + 
                        //       '<div class="sk-circle12 sk-circle"></div>' + 
                        //     '</div>' + 
                        //   '</div>'  +
                        // '</div>'  +
                      '</div>';
      var scope = $rootScope.$new(true).$root;
      var loading_html = $compile(template)(scope);
      $('#J_main_container').append(loading_html);
      $timeout(function() {
        $('#J_loading_box').removeClass('out').addClass('in');
      }, 100);
    },
    success: function (param) {
      param.type = 'success';
      param.lazytime = param.lazytime || 1;
      this.init(param);
    },
    error: function (param) {
      param.type = 'error';
      param.lazytime = param.lazytime || 2;
      this.init(param);
    },
    warning: function (param) {
      param.type = 'warning';
      this.init(param);
    },
    confirm: function (param) {
      param.type = 'confirm';
      this.init(param);
    },
    custom: function (param) {
      param.type = 'custom';
      this.init(param);
    },
    loading: function (param) {
      if (param == undefined) {
        param = {};
      }
      param.type = 'loading';
      this.initLoading(param);
    },
    image: function (param) {
      param.type = 'image';
      this.initImage(param);
    },
    confirmSubmit: function () {
      var _self = this,
          onsubmit = this.onsubmit;
      _self.close();
      if ('function' == typeof(onsubmit)) {
        onsubmit();
      } else {
        eval(onsubmit);
      }
    },
    confirmCancel: function () {
      var _self = this,
          oncancel = this.oncancel;
      _self.close();
      if ('function' == typeof(oncancel)) {
        oncancel();
      } else {
        eval(oncancel);
      }
    },
    closeCallback: function() {
      var _self = this,callback = this.callback;
      if ('function' == typeof(callback)) {
        callback();
      } else {
        eval(callback);
      }
      _self.close();
    },
    close: function () {
      // $document.find('body').removeClass('modal-open');
      $('#J_modal_box').removeClass('in');
      $('#J_modal_backdrop').removeClass('in');
      if(!$('#J_modal_box').length) this.remove();
      if(!!$('#J_modal_box').length) $timeout(this.remove, 250);
      $interval.cancel(this.modal_promise);
    },
    autoClose: function () {
      var _self = this,
          timer = _self.lazytime;
      var modal_promise = $interval(function() {
        timer -= 1;
        angular.element(document.getElementById('J_modal_body').querySelector('.timer')).html(timer + '秒后窗口将自动关闭');
        if (timer == 0) {
          _self.closeCallback();
          $interval.cancel(modal_promise);
          timer = _self.lazytime = 0;
        }
      }, 1000);
      _self.modal_promise = modal_promise;
    },
    remove: function () {
      angular.element(document.getElementById('J_modal_box')).remove();
      angular.element(document.getElementById('J_modal_backdrop')).remove();
    },
    closeLoading: function () {
      if (!!$('#J_loading_box').length) {
        // $('body').removeClass('modal-open');
        $('#J_loading_box').removeClass('in').addClass('out');
        $timeout(function() {
          $('#J_loading_box').remove();
        }, 260);
      }
    },
    closeAll: function () {
      var _self = this;
      _self.closeLoading();
      _self.close();
    }
  };
  return modal;
}]);