/**
/* angular-video-player
 * @By Surmon(surmon.me)
 *
 */
(function() {

  // 使用严格模式
  "use strict";
  var videoPlayer = angular.module('angular-video-player', []);

  // 数据传入
  videoPlayer.directive('videoPlayer', ['$rootScope', '$compile', '$location', function($rootScope, $compile, $location) {
    return {
      restrict: 'A',
      replace: true,
      scope: { data: '=data' },
      template: function () {
        var player = [
          '<div class="video-player">',
          '<video id="J_video_player" class="video-js vjs-default-skin"></video>',
          '</div>'
        ].join('');
        return player;
      },
      link: function ($scope, element, attrs) {

        // 状态标示 / 0 - 未开始或已释放，1 - 已实例化或已启动
        $scope.status = 0;

        // 语言包
        videojs.addLanguage("zh-CN",{
          "Play": "播放",
          "Pause": "暂停",
          "Current Time": "当前时间",
          "Duration Time": "时长",
          "Remaining Time": "剩余时间",
          "Stream Type": "媒体流类型",
          "LIVE": "直播",
          "Loaded": "加载完毕",
          "Progress": "进度",
          "Fullscreen": "全屏",
          "Non-Fullscreen": "退出全屏",
          "Mute": "静音",
          "Unmute": "取消静音",
          "Playback Rate": "播放码率",
          "Subtitles": "字幕",
          "subtitles off": "字幕关闭",
          "Captions": "内嵌字幕",
          "captions off": "内嵌字幕关闭",
          "Chapters": "节目段落",
          "You aborted the media playback": "视频播放被终止",
          "A network error caused the media download to fail part-way.": "网络错误导致视频下载中途失败, 请刷新重试。",
          "The media could not be loaded, either because the server or network failed or because the format is not supported.": "视频因格式不支持或者服务器或网络的问题无法加载。",
          "The media playback was aborted due to a corruption problem or because the media used features your browser did not support.": "由于视频文件损坏或是该视频使用了你的浏览器不支持的功能，播放终止。",
          "No compatible source was found for this media.": "无法找到此视频兼容的源。",
          "The media is encrypted and we do not have the keys to decrypt it.": "视频已加密，无法解密。"
        });

        // 启动播放器
        $scope.playerInit = function (video_data) {

          $scope.status = 1;

          // 初始化
          $scope.player = null;
          var video_start = video_data.start || 0;
          var video_live = !!(!!video_data.is_live && video_data.live_status == 2);
          var video_src  = video_live ? video_data.urls.hls.ORIGIN : video_data.urls;
          var video_type = video_live ? 'application/x-mpegURL' : 'video/mp4';
          videojs.options.flash.swf = 'scripts/player/video-js.swf';
          var video_opts = {
            'controls': true, 
            'autoplay': true,
            'preload': 'auto',
            'poster': 'images/qrcode.png',
            'wdith': '100%',
            'height': '500',
            'playbackRates': [0.7, 1.0, 1.5, 2.0],
            'controlBar': {
              remainingTimeDisplay: false,
              durationDisplay: {},
              currentTimeDisplay: {},
              volumeMenuButton: {
                inline: false,
                vertical: true
              }
            },
            'language': 'zh-CN',
            'techOrder': ['html5', 'flash']
          };

          // 清晰度切换
          if (!video_live) video_opts.plugins = { videoJsResolutionSwitcher: { default: 2, dynamicLabel: true } };

          // 实例化播放器
          $scope.player = videojs('J_video_player', video_opts, function() {

            // console.log('播放器已OK！');

            // 非直播初始化清晰度切换
            if (!video_live) {
              this.updateSrc([
                { type: "video/mp4", src: video_src.H, label: '原画', res: 1 },
                { type: "video/mp4", src: video_src.M, label: '高清', res: 2 },
                { type: "video/mp4", src: video_src.L, label: '流畅', res: 3 },
                // { type: "video/mp4", src: 'http://61.134.46.28/7xkwa7.media1.z0.glb.clouddn.com/c897s11065_M?e=1468377658&token=RA8_8FNcL-cZN8Tf-jDCo6qamhj7mRAI5LKSaV_Q:HCdaEvQ0mivd_3cfX9nAoJ07Sbc=&wsiphost=local', label: '高清', res: 2 },
                // { type: "video/mp4", src: 'http://7xnbft.com2.z0.glb.clouddn.com/sample_video_M.mp4', label: '高清', res: 2 },

                // 公开空间/_mp4.mp4        => 没问题
                // { type: "video/mp4", src: 'http://7xnbft.com2.z0.glb.clouddn.com/c49s610.mp4', label: '高清', res: 2 },

                // 公开空间/_mp4            => 没问题
                // { type: "video/mp4", src: 'http://7xnbft.com2.z0.glb.clouddn.com/c49s610', label: '高清', res: 2 },

                // 公开空间/_mp4.mp4/转码后  => 没问题
                // { type: "video/mp4", src: 'http://7xnbft.com2.z0.glb.clouddn.com/c49s610.mp4_H?e=1468211991&token=RA8_8FNcL-cZN8Tf-jDCo6qamhj7mRAI5LKSaV_Q:nqh6So80GF0ZNNFfbBx0gnMJjJ8=', label: '高清', res: 2 },

                // 公开空间/_mp4/转码后      => 没问题
                // { type: "video/mp4", src: 'http://7xnbft.com2.z0.glb.clouddn.com/c49s610_H?e=1468211991&token=RA8_8FNcL-cZN8Tf-jDCo6qamhj7mRAI5LKSaV_Q:nqh6So80GF0ZNNFfbBx0gnMJjJ8=', label: '高清', res: 2 },

                // 公开空间/_flv.flv        => 有问题/flash不会报错，但未缓冲部分无法播放，拖动也会失效/自动跳回/并暂停播放
                // { type: "video/x-flv", src: 'http://7xnbft.com2.z0.glb.clouddn.com/c49s610.flv', label: '高清', res: 2 },

                // 公开空间/_flv            => 有问题/同上
                // { type: "video/x-flv", src: 'http://7xnbft.com2.z0.glb.clouddn.com/c49s610flv', label: '高清', res: 2 },

                // 公开空间/_flv.flv/转码后  => 有问题/同上
                // { type: "video/x-flv", src: 'http://7xnbft.com2.z0.glb.clouddn.com/c49s610.flv_H?e=1468211991&token=RA8_8FNcL-cZN8Tf-jDCo6qamhj7mRAI5LKSaV_Q:nqh6So80GF0ZNNFfbBx0gnMJjJ8=', label: '高清', res: 2 },

                // 公开空间/_flv/转码后      => 有问题/同上
                // { type: "video/x-flv", src: 'http://7xnbft.com2.z0.glb.clouddn.com/c49s610flv_H?e=1468211991&token=RA8_8FNcL-cZN8Tf-jDCo6qamhj7mRAI5LKSaV_Q:nqh6So80GF0ZNNFfbBx0gnMJjJ8=', label: '高清', res: 2 },

                // ---------------------------------------------

                // 私有空间/_mp4.mp4        => 有问题/拖动报错（原生H5下也是）
                // { type: "video/mp4", src: 'http://7xkwa7.media1.z0.glb.clouddn.com/c49s610.mp4?e=1468311440&token=RA8_8FNcL-cZN8Tf-jDCo6qamhj7mRAI5LKSaV_Q:a3pMxdN81Vgo9Glkl98512eAS9Q=', label: '高清', res: 2 },

                // 私有空间/_mp4            => 有问题/拖动报错同上
                // { type: "video/mp4", src: 'http://7xkwa7.media1.z0.glb.clouddn.com/c49s610?e=1468311453&token=RA8_8FNcL-cZN8Tf-jDCo6qamhj7mRAI5LKSaV_Q:bltZaXDnM59brx0X-aklvS_qLro=', label: '高清', res: 2 },

                // 私有空间/_mp4.mp4/转码后  => 有问题/拖动报错同上
                // { type: "video/mp4", src: 'http://7xkwa7.media1.z0.glb.clouddn.com/c49s610.mp4_M?e=1468311440&token=RA8_8FNcL-cZN8Tf-jDCo6qamhj7mRAI5LKSaV_Q:WeynUtuoGg_c1hILBY89elc8Igk=', label: '高清', res: 2 },

                // 私有空间/_mp4/转码后      => 有问题/拖动报错同上
                // { type: "video/mp4", src: 'http://7xkwa7.media1.z0.glb.clouddn.com/c49s610_M?e=1468311453&token=RA8_8FNcL-cZN8Tf-jDCo6qamhj7mRAI5LKSaV_Q:VTPB3WuaYvr3ZLvEX0J4L-FF-Fk=', label: '高清', res: 2 },

                // 私有空间/_flv.flv        => 有问题/拖动报错同上
                // { type: "video/x-flv", src: 'http://7xkwa7.media1.z0.glb.clouddn.com/c49s610.flv?e=1468311716&token=RA8_8FNcL-cZN8Tf-jDCo6qamhj7mRAI5LKSaV_Q:hKzp566CSZrcmnFGXE31138mPAc=', label: '高清', res: 2 },

                // 私有空间/_flv            => 有问题/拖动报错同上
                // { type: "video/x-flv", src: 'http://7xkwa7.media1.z0.glb.clouddn.com/c49s610flv?e=1468311676&token=RA8_8FNcL-cZN8Tf-jDCo6qamhj7mRAI5LKSaV_Q:cSe01FSEMTPxiOMAZ5KaUbftPUQ=', label: '高清', res: 2 },

                // 私有空间/_flv.flv/转码后  => 有问题/拖动报错同上
                // { type: "video/x-flv", src: 'http://7xkwa7.media1.z0.glb.clouddn.com/c49s610.flv_M?e=1468311716&token=RA8_8FNcL-cZN8Tf-jDCo6qamhj7mRAI5LKSaV_Q:mCVs--G5sGB5PPhuaiOq1apE520=', label: '高清', res: 2 },

                // 私有空间/_flv/转码后      => 有问题/拖动报错同上
                // { type: "video/x-flv", src: 'http://7xkwa7.media1.z0.glb.clouddn.com/c49s610flv_M?e=1468311676&token=RA8_8FNcL-cZN8Tf-jDCo6qamhj7mRAI5LKSaV_Q:R4vIEsnqTXxIwY0g0yxUVGDN5ho=', label: '高清', res: 2 },

              ]);
              this.on('resolutionchange', function (){
                // console.info('分辨率切换至新地址：', this.src());
                $scope.$emit('videoPlayerResolution', this.src());
              })
            };

            // 直播载入
            if (video_live) {
              
              this.src({ src: video_src, type: 'application/x-mpegURL', withCredentials: false });
              // var hls = $scope.player.tech({ IWillNotUseThisInPlugins: true }).hls;
              /*
              // 直播每次的切片请求
              $scope.player.tech_.hls.xhr.beforeRequest = function(options) {
                console.log(options);
                return options;
              };
              */
            };

            // 监听播放
            this.on('play', function () { $scope.$emit('videoPlayerPlaying', true) });

            // 监听暂停
            this.on('pause', function () { $scope.$emit('videoPlayerPause', true) });

            // 监听结束
            this.on('ended', function () { $scope.$emit('videoPlayerEnded', true) });

            // 文件信息
            this.on('loadeddata', function () {
              if (!video_live && !!video_start) this.currentTime(video_start);
              $scope.$emit('videoPlayerLoadeddata', true);
            });

            // 监听时间
            this.on('timeupdate', function () { $scope.$emit('videoPlayerTimeUpdate', this.currentTime()) });

          });

          // Pause
          $scope.$on('doVideoPlayerPause', function () { $scope.player.pause() });

          // Play
          $scope.$on('doVideoPlayerPlay', function () { $scope.player.play() });

          // RefreshPlay
          $scope.$on('doVideoPlayerRefreshPlay', function () {
            $scope.player.currentTime(0);
            $scope.player.play();
          });
        };

        // 释放播放器
        $scope.playerDispose = function () {
          if (!!$scope.player && !!$scope.player.dispose) $scope.player.dispose();
          $scope.player = null;
        };

        // 监听父容器数据并启动播放器
        $scope.$watch('data', function (newData, oldData) {
          // console.log(newData, oldData, $scope.status);
          if (!newData && $scope.status == 1) $scope.playerDispose();
          if (!!newData && !!newData.urls && $scope.status == 0) $scope.playerInit(newData);
        });

        // 释放播放器
        $scope.$on('$locationChangeStart', $scope.playerDispose);
      }
    };
  }]);

})();
