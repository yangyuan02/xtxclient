/*
*
* CommonProvider
*
* Description
*
*/

angular.module('CommonProvider', [])

// 公共封装
.factory('CommonProvider', ['$q', '$rootScope', '$window', '$location', '$anchorScroll', '$modal',
  function ($q, $rootScope, $window, $location, $anchorScroll, $modal) {

    var commonProvider =  {

      // 服务请求封装
      request: function (config) {
        config.method = '$' + config.method;
        config.params = config.params || {};
        if (config.body) {
          for(var key in config.body) { 
            var name = key;
            var value = config.body[key];
            config.service[name] = config.body[key];
          }
        } else {
          config.body = {};
        };
        var deferred = $q.defer();
        var success_callback = function (result) {
          deferred.resolve(result);
          if (result.code == 1) {
            if (config.success && typeof config.success == 'function') {
              eval(config.success(result));
            }
          }
        };
        var error_callback = function (error) {
          deferred.reject(error);
          if (config.error && typeof config.error == 'function') {
            eval(config.error(error));
          }
        };
        if (!!config.service[config.method]) {
          config.service[config.method](config.params, function (result) {
            success_callback(result);
          }, function (error) { 
            error_callback(error);
          });
        };
        return deferred.promise;
      },

      // 期望请求封装
      promise: function (config) {
        config.method = config.method;
        config.params = config.params || {};
        var success_callback = function (result) {
          if (result.code == 1) {
            if (config.success && typeof config.success == 'function') {
              eval(config.success(result));
            }
          } else {
            if (config.error && typeof config.error == 'function') {
              eval(config.error(result));
            }
          }
        };
        var error_callback = function (error) {
          if (config.error && typeof config.error == 'function') {
            eval(config.error(error));
          }
        };
        var result_callback = function (result) {
          if (config.result && typeof config.result == 'function') {
            eval(config.result(result));
          }
        };
        if (!!config.model[config.method]) {
          config.model[config.method](config.params).then(function (result) {
            result_callback(result);
            success_callback(result);
          }, function (error) { 
            result_callback(error);
            // error_callback(error);
          });
        };
      },

      // 全局搜索请求封装
      search: function (config) {
        config.method = config.method;
        config.params = config.params || {};
        config.success = config.success;
        config.error = config.error;
        var params_length = config.params.length;
        var params_search = [];
        if (params_length > 0) {
          angular.forEach(config.params, function(value, key) {
            angular.forEach(value, function(v, k) {
              params_search['column['+key+']['+k+']'] = v;
            });
          });
        }
        commonProvider.request({
          service: config.service,
          method: 'search',
          params: params_search,
          success: config.success,
          error: config.error
        });
      },

      // 全局排序操作封装
      sort: function (config) {
        config.method = config.method;
        config.params = config.params || {};
        config.data = config.data || {};
        if (config.params.partTo) {
          var sorts = [];
          var sort = {};
          for (var i = 0; i < config.params.partTo.length; i++) {
            sort = {};
            sort.id = config.params.partTo[i].id;
            sort.data = {sort: i};
            sorts.push(sort);
          }
          if (!!config.model['sort']) {
            config.model['sort'](sorts).then(function (result) {
              config.data.find(config.params.item).sort = config.params.indexTo
            });
          }
        }
      },
      
      // 到顶部
      toTop: function() {
        var scrollTo = function (element, to, duration) {
          if (duration <= 0) return;
          var difference = to - element.scrollTop;
          var perTick = difference / duration * 10;
          setTimeout(function() {
            element.scrollTop = element.scrollTop + perTick;
            if (element.scrollTop == to) return;
            scrollTo(element, to, duration - 10);
          }, 10);
        };
        scrollTo(document.body, 0, 30);
      },

      // 自动回顶部
      autoTop: function () {
        $rootScope.$on('$locationChangeSuccess', function () {
          commonProvider.toTop();
        });
      },

      // 定位到某ID元素
      goToDom: function (id) {
        var old = $location.hash();
        $location.hash(id);
        $anchorScroll();
        $location.hash(old);
      },

      // 定位到某活动tab
      setTabActive: function (scope, tab_index) {

        // 确认上下文有效
        if (!scope) return false;

        // 本级域
        if (!scope.tabs || (scope.tabs && !scope.tabs.length)) return false;
        scope.tabs.setAttr('active', false);
        scope.tabs[tab_index - 1].active = true;
      },

      // 获取图片
      getThumbnail: function (key, type, params) {
        if (!key) return;
        var default_params = {
          mode: 1,
          width: 500,
          height: 300,
          format: 'jpg', // 取值范围：jpg，gif，png，webp等，缺省为原图格式。
          interlace: 1, // 取值范围：1 支持渐进显示，0不支持渐进显示(缺省为0)，适用目标格式：jpg
          quality: 100, // 取值范围是[1, 100]，默认75。
          blur: 0 // 模糊滤镜级别，0是关闭
        };
        var param = angular.extend(default_params, (params || {}));
        var blur; 
        switch (param.blur) {
          case 0:
            blur = '';
            break;
          case 1:
            blur = '|imageMogr2/blur/2x2';
            break;
          case 2:
            blur = '|imageMogr2/blur/5x5';
            break;
          case 3:
            blur = '|imageMogr2/blur/10x10';
            break;
          default:
            break;
        }
        return $rootScope.config.fileUrl + key + '?imageView2/' + param.mode + '/w/' + param.width + '/h/' + param.height + '/format/' + param.format + '/interlace/' + param.interlace + '/q/' + param.quality + blur;
      },

      // 全局分享
      share: function (type) {
        var wb_parems = 'url=' + $location.$$absUrl + '&title=' + $rootScope.title + ' - ' + $rootScope.description + '&language=zh_cn&searchPic=true';
        var qq_parems = 'url=' + $location.$$absUrl + '&title=' + $rootScope.title + '&summary=' + $rootScope.description + '&site=' + '学天下' + '&desc=' + '我发现了一个不错的学习网站哦，快来看看吧！' + '&pics=';
        var qr_parems = 'text=' + $location.$$absUrl;
        qr_parems = (qr_parems.contain('www')) ? qr_parems.replace(/www/ig, 'm') : qr_parems.add('m.', 'http://');
        switch (type) {
          case 'qq':
              $window.open('http://sns.qzone.qq.com/cgi-bin/qzshare/cgi_qzshare_onekey?' + qq_parems);
              break;
          case 'weibo':
              $window.open('http://service.weibo.com/share/share.php?' + wb_parems);
              break;
          case 'qrcode':
              $modal.image({ url: '/server/api/v1/qrcode?' + qr_parems });
              // $modal.image({ url: '/images/qrcode.png' });
              break;
            default:
              break;
        }
      },

    };
    return commonProvider;
  }
])