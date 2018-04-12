/**
* QuploadProvider Module
*
* Description
*/
angular.module('QuploadProvider', [])

.factory('QuploadProvider', ['$rootScope', 'appConfig',
  function($rootScope, appConfig){

    var quploadProvider = {
      /**
       * 根据图片名称获取剪裁后的图片路径
       * 图片剪裁详细说明参照：http://developer.qiniu.com/docs/v6/api/reference/fop/image/imageview2.html
       */
      getThumbnail: function (key, type, params) {
        if (!key || key == '') {
          return ;
        }
        
        var default_params = {
          mode: 1,
          width: 500,
          height: 300,
          format: 'jpg', // 取值范围：jpg，gif，png，webp等，缺省为原图格式。
          interlace: 1, // 取值范围：1 支持渐进显示，0不支持渐进显示(缺省为0)，适用目标格式：jpg
          quality: 100, // 取值范围是[1, 100]，默认75。
          blur: 0 // 模糊滤镜级别，0是关闭
        }

        if (params == undefined) {
          params = {};
        }

        var param = angular.extend(default_params, params);

        // 配置模糊
        var blur; 
        if (param.blur == 0) {
          blur = '';
        } else if (param.blur == 1) {
          blur = '|imageMogr2/blur/2x2';
        } else if (param.blur == 2) {
          blur = '|imageMogr2/blur/5x5';
        } else if (param.blur == 3) {
          blur = '|imageMogr2/blur/10x10';
        }

        var thumbnail_src = appConfig.fileUrl + key + '?imageView2/' + param.mode + '/w/' + param.width + '/h/' + param.height + '/format/' + param.format + '/interlace/' + param.interlace + '/q/' + param.quality + blur;
        return thumbnail_src;
      },

      /**
       * 获取七牛静态资源数据
       */
      getStatic: function (key, params) {
        if (!key || key == '') {
          return ;
        }
        
        var default_params = {
          mode: 1,
          width: 500,
          height: 300,
          format: 'jpg', // 取值范围：jpg，gif，png，webp等，缺省为原图格式。
          interlace: 1, // 取值范围：1 支持渐进显示，0不支持渐进显示(缺省为0)，适用目标格式：jpg
          quality: 100, // 取值范围是[1, 100]，默认75。
          blur: 0 // 模糊滤镜级别，0是关闭
        }

        if (params == undefined) {
          params = {};
        }

        // 配置参数
        var param = angular.extend(default_params, params);
        // 配置模糊
        var blur; 
        if (param.blur == 0) {
          blur = '';
        } else if (param.blur == 1) {
          blur = '|imageMogr2/blur/2x2';
        } else if (param.blur == 2) {
          blur = '|imageMogr2/blur/5x5';
        } else if (param.blur == 3) {
          blur = '|imageMogr2/blur/10x10';
        }
        var thumbnail_src = appConfig.staticUrl + key + '?imageView2/' + param.mode + '/w/' + param.width + '/h/' + param.height + '/format/' + param.format + '/interlace/' + param.interlace + '/q/' + param.quality + blur;
        return thumbnail_src;
      }
    };

    return quploadProvider;
  }
])