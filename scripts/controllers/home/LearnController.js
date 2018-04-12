/*
 * LearnController
*/
angular.module('LearnController', ['angular.bootstrap.rating', 'angular-video-player', 'angular-chat', 'angular-related-select', 'CategoryModel', 'CourseModel', 'SectionModel', 'CommentModel', 'FavoriteModel', 'NoteModel', 'QuestionModel', 'SearchModel'])
.controller('LearnController', ['$rootScope', '$scope', '$state', '$stateParams', '$location', '$http', '$localStorage', '$window', '$timeout', '$interval', '$modal', '$filter', '$sce', 'CommonProvider', 'CategoryModel', 'CourseModel', 'SectionModel', 'CommentModel','FavoriteModel', 'NoteModel', 'QuestionModel', 'SearchModel',
  function ($rootScope, $scope, $state, $stateParams, $location, $http, $localStorage, $window, $timeout, $interval, $modal, $filter, $sce, CommonProvider, CategoryModel, CourseModel, SectionModel, CommentModel, FavoriteModel, NoteModel, QuestionModel, SearchModel) {

    // 初始化
    $scope.course_id = $stateParams.course_id || false;
    $scope.section_id = $stateParams.section_id || false;
    $scope.player = {};
    $scope.course = {};
    $scope.course.info = {};
    $scope.course.relation = false;
    $scope.section = {};
    $scope.sections = {};
    $scope.sections.all = [];
    $scope.sections.free = [];
    $scope.sections.current = 0;
    $scope.sections.current_free = 0;
    $scope.sections.last = {};
    $scope.section.player = {};
    $scope.section.player.ended = false;
    $scope.section.player.mask = {
      show: false,
      refresh: false,
      title: '',
      btn: {
        show: false,
        text: '下一节',
        style: 1,
        click: function () {}
      }
    };

    // 获取课程基本信息
    $scope.getBasicInfo = function () {
      CommonProvider.promise({
        model: CourseModel,
        method: 'item',
        params: { course_id: $scope.course_id },
        success: function (course) {
          $scope.course.info = course.result;
          $rootScope.title = $scope.course.info.name;
          $rootScope.description = $scope.course.info.description;
          $rootScope.setDomPosition(angular.element('#detailTab div').scope());
          if ($localStorage.categories) {
            $scope.categories = $localStorage.categories;
          }
        },
        result: function (result) {
          if (result.status == 404) {
            $modal.error({
              message: '课程不存在',
              callback: function () { $location.path('course') }
            });
          };
        }
      });
    };

    // 请求章节信息
    $scope.getSections = function () {
      CommonProvider.promise({
        model: SectionModel,
        method: 'get',
        params: { course_id: $scope.course_id },
        success: function(chapters){
          $scope.course.chapters = chapters.result;
        }
      });
    };

    // 请求评论信息
    $scope.getComments = function (params) {
      CommonProvider.promise({
        model: CommentModel,
        method: 'get',
        params: {
          course_id: $scope.course_id,
          per_page: 10,
          page: params ? (params.page || 1) : 1
        },
        success: function(comments){
          $scope.course.comments = comments;
        }
      });
    };

    // 请求同学列表
    $scope.getClassmates = function (page) {
      CommonProvider.promise({
        model: CourseModel,
        method: 'classmates',
        params: {
          course_id: $scope.course_id,
          page: page || 1,
          per_page: 12
        },
        success: function(classmates){
          $scope.course.classmates = classmates;
        }
      });
    };

    // 展示直播中的同学
    $scope.initLiveRoomUsers = function () {
      // 监听聊天室用户变动
      $scope.$on('chatRoomUserChanged', function (event, uids) {
        var nowLiveUserIds = uids;
        $scope.course.info.teacher = $scope.course.info.teacher || {};
        var teacher_id = $scope.course.info.teacher.id || false;
        if(!!teacher_id) nowLiveUserIds.remove(teacher_id);
        // console.log('聊天室成员变动', nowLiveUserIds);
        // return false;
        CommonProvider.promise({
          model: CourseModel,
          method: 'getUsersInfo',
          params: { user_ids: nowLiveUserIds },
          success: function(live_users){
            // console.log(live_users);
            $scope.course.live_users = live_users.result;
          }
        });
      });
    };

    // 刷新同学列表
    $scope.refreshClassmates = function () {
      if (!$scope.course.classmates) return false;
      var pagination = $scope.course.classmates.pagination;
      if (pagination.total > pagination.per_page) {
        if (pagination.current_page < pagination.total_page) {
          $scope.getClassmates(pagination.current_page + 1);
        } else if (pagination.current_page == pagination.total_page && pagination.current_page != 1) {
          $scope.getClassmates(1);
        }
      }
      return false;
    };

    // 请求课程关系（订单状态，收藏状态...）
    $scope.getRelation = function (callback) {

      // 未登录则不请求
      if (!$localStorage.token) return false;

      CommonProvider.promise({
        model: CourseModel,
        method: 'relation',
        params: $scope.course_id,
        success: function(relation){
          $scope.course.relation = relation.result;
          if (!!callback && typeof callback == 'function') {
            callback();
          }
        }
      });
    };

    // 弹窗登录并获取最新信息
    $scope.loginGetRelation = function (callback) {
      $rootScope.modal.login(function () {
        if (callback) {
          $scope.getRelation(function () {
            callback();
          });
        } else {
          $scope.getRelation();
        }
      });
    };

    // 章节遍历时生成数组
    $scope.pushSections = function (section) {

      // 最后一节
      $scope.sections.last = section;

      // 所有节
      $scope.sections.all.push(section);

      // 免费节
      if (section.is_free) {
        $scope.sections.free.push(section);
      };

      if (section.id && $scope.section_id && section.id == $scope.section_id) {

        // 当前播放节
        $scope.sections.current = $scope.sections.all.length - 1;

        // 当前播放免费/节
        if (!!$scope.sections.free.length) {
          $scope.sections.current_free = $scope.sections.free.length - 1;
        };
      };
    };

    // 购买课程逻辑
    $scope.buy = function (params) {

      if (!$scope.course.chapters.length || !$scope.course.chapters[0].children) return $modal.warning({ message: '没有有效章节，无法购买' });

      if (!$scope.course.chapters[0].children.length) return $modal.warning({ message: '没有有效章节，无法购买' });

      // 预指定购买成功的跳转节为指定节或者第一节
      var section_id = params.section_id || $scope.course.chapters[0].children[0].id;
      var course_id = params.course_id || $scope.course_id;

      // 支付请求
      CommonProvider.promise({
        model: CourseModel,
        method: 'operation',
        params: {
          method: 'buy',
          course_id: course_id
        },
        success: function(buy){
          if (!params.is_free) {

            // 课程收费，跳转到支付页面
            $location.path('/payment/' + course_id);

          } else {

            // 课程免费，则跳转至播放页，播放/指定节/第一节
            $location.path('/course/' + course_id + '/learn/' + section_id );
          }
        },
        error: function (buy) {
          $modal.error({ message: buy.message });
        }
      });
    };

    // 收藏课程
    $scope.addFav = function (course_id) {

      var course_id = course_id || $scope.course.info.id;

      // 执行收藏
      var doAddFav = function () {
        if (!!$scope.course.relation.follow) return false;
        CommonProvider.promise({
          model: FavoriteModel,
          method: 'add',
          params: {
            type: 'course',
            target_id: course_id
          },
          success: function(fav){
            $scope.course.relation.follow = true;
            $scope.course.info.follow_count += 1;
          },
          error: function (fav) {
            $modal.error({ message: fav.message });
          }
        });
      };

      // 如果用户没有登录则弹窗
      if (!$rootScope.user) {

        // 获取到关系后回调执行二次点击
        $scope.loginGetRelation(function () {
          $scope.addFav();
        });
      } else {
        doAddFav();
      }
    };

    // 写入学习记录(时间记录)
    $scope.postStudyRecord = function () {
      if (!!$scope.section.player.current) {
        CommonProvider.promise({
          model: SectionModel,
          method: 'postStudyRecord',
          params: {
            section_id: $scope.section_id,
            record_time: $scope.section.player.current
          }
        });
      };
    };

    // 请求本节笔记
    $scope.getSectionNotes = function (params) {
      CommonProvider.promise({
        model: NoteModel,
        method: 'get',
        params: {
          role: 'student',
          section_id: $scope.section_id,
          per_page: 10,
          page: params ? (params.page || 1) : 1
        },
        success: function(notes){
          $scope.section.notes = notes;
        }
      });
    };

    // 请求本节问答
    $scope.getSectionQuestions = function (params) {
      CommonProvider.promise({
        model: QuestionModel,
        method: 'get',
        params: {
          role: 'student',
          section_id: $scope.section_id,
          per_page: 10,
          page: params ? (params.page || 1) : 1
        },
        success: function(questions){
          $scope.section.questions = questions;
        }
      });
    };

    // 获取/章节信息/问答/笔记列表
    $scope.getSectionInfo = function () {

      // 节基本信息
      CommonProvider.promise({
        model: SectionModel,
        method: 'item',
        params: {
          role: 'student',
          section_id: $scope.section_id,
        },
        success: function(section){
          $scope.section.info = section.result;
        }
      });

      // 笔记
      $scope.getSectionNotes();

      // 问答
      $scope.getSectionQuestions();
    };

    // 提交评论
    $scope.postComment = function (comment) {
      CommonProvider.promise({
        model: CommentModel,
        method: 'post',
        params: {
          role: 'student',
          body: {
            course_id: $scope.course_id,
            content: comment.content,
            description_score: comment.score.description,
            quality_score: comment.score.quality,
            satisfaction_score: comment.score.satisfaction
          }
        },
        success: function(_comment){
          comment.content = null;
          _comment.result.user = {};
          _comment.result.user.id = $rootScope.user.id;
          _comment.result.user.name = $rootScope.user.name;
          _comment.result.user.gravatar = $rootScope.user.gravatar;
          $scope.course.comments.result.unshift(_comment.result);
          $scope.course.comments.pagination.total += 1;
          $scope.course.relation.trade_status = 3;
        },
        error: function (_comment) {
          $modal.error({ message: _comment.message });
        }
      });
    };

    // 提交问题
    $scope.postQuestion = function (question) {
      CommonProvider.promise({
        model: QuestionModel,
        method: 'post',
        params: {
          section_id: Number($scope.section_id),
          content: question.content,
          pid: 0
        },
        success: function(_question){
          question.content = null;
          _question.result.user = {};
          _question.result.user.id = $rootScope.user.id;
          _question.result.user.gravatar = $rootScope.user.gravatar;
          _question.result.user.name = $rootScope.user.name;
          $scope.section.questions.result.unshift(_question.result);
          $scope.section.questions.pagination.total += 1;
        },
        error: function (_question) {
          $modal.error({ message: _question.message });
        }
      });
    };

    // 回复问题
    $scope.replyQuestion = function (params) {
      if (params.modal) {
        $rootScope.questions = $scope.section.questions;
        $rootScope.reply_question = params.question;
        $modal.custom({
          title: '添加回答',
          template_url: '/partials/home/user/question/reply-question.html',
          callback: function () {
            $rootScope.questions = null;
            delete $rootScope.reply_question;
          }
        });
      } else {
        // console.log(params, $rootScope.reply_question);
        CommonProvider.promise({
          model: QuestionModel,
          method: 'post',
          params: {
            section_id: Number($scope.section_id),
            content: params.content,
            pid: $rootScope.reply_question.id,
            to_user_id: $rootScope.reply_question.user.id
          },
          success: function(_answer){
            _answer.result.user = {};
            _answer.result.user.id = $rootScope.user.id;
            _answer.result.user.gravatar = $rootScope.user.gravatar;
            _answer.result.user.name = $rootScope.user.name;
            var replys = $rootScope.questions.result.find($rootScope.reply_question);
            replys.children = replys.children || [];
            replys.children.unshift(_answer.result);
            $rootScope.modal.close();
            $modal.success({ message: '回复成功' });
          },
          error: function (_answer) {
            $modal.error({ message: _answer.message });
          }
        });
      }
    };

    // 提交笔记
    $scope.postNote = function (note) {

      CommonProvider.promise({
        model: NoteModel,
        method: 'post',
        params: {
          // 章节ID
          section_id: $scope.section_id,
          // 内容
          content: note.content,
          // 是否公开
          is_publish: Number(note.publish),
          // 是否截屏
          is_capture: Number(note.capture),
          // 资源文件名
          key: 'c' + $scope.course_id + 's' + $scope.section_id,
          // 截图时间
          record_time: $scope.section.player.current
        },
        success: function(_note){
          _note = _note.result;
          _note.capture_url = null;
          _note.user = {};
          _note.user.gravatar = $rootScope.user.gravatar;
          _note.user.name = $rootScope.user.name;
          _note.user.id = $rootScope.user.id;
          _note.section = $scope.section.info;
          $scope.section.notes.result.unshift(_note);
          $scope.section.notes.pagination.total += 1;
          note.content = null;
        },
        error: function (_note) {
          $modal.error({ message: _note.message });
        }
      });
    };

    // 收藏课程下的笔记
    $scope.addFavNote = function (note) {

      // 执行收藏
      var doAddFav = function () {

        // if (!!$scope.course.relation.follow) return false;
        CommonProvider.promise({
          model: FavoriteModel,
          method: 'add',
          params: {
            type: 'note',
            target_id: note.id
          },
          success: function(fav){
            note.followed = true;
          },
          error: function (fav) {
            $modal.error({ message: fav.message });
          }
        });
      };

      // 如果用户没有登录则弹窗
      if (!$rootScope.user) {

        // 获取到关系后执行收藏
        $scope.loginGetRelation(function () {
          doAddFav();
        });
      } else {
        doAddFav();
      }
    };

    // 定位
    $scope.postDataFocus = function () {
      $rootScope.goTo('player-container');
      // 如果获取到焦点时视频在播放，则暂停
      if (!$scope.section.player.ended && !!$scope.playerPause) {
        $scope.playerPause();
      }
    };

    // 播放结束检查/更新提示语
    $scope.playEndedCheck = function (params) {

      var params = params || {};
      var click = params.click || false;
      var playback = params.playback || false;

      $scope.section.player.mask.show = true;
      $scope.section.player.mask.refresh = true;
      $scope.section.player.mask.btn.show = true;
      $scope.section.player.mask.btn.click = function () {
        $scope.playEndedCheck({ click: true });
      };

      // 1:试听，试听已结束或未结束
      if (!!$scope.course.relation.trade_status && $scope.course.relation.trade_status < 2) {

        // 未结束，试听下一节
        if ($scope.sections.free[$scope.sections.current_free + 1]) {
          var next_section = $scope.sections.free[$scope.sections.current_free + 1];

          // 判断来源为检查或者用户点击
          if (click) {

            // 播放下一节试听视频
            $location.path('/course/' + $scope.course_id + '/learn/' + next_section.id);

          } else {
            $scope.section.player.mask.title = '下一节课程：' + next_section.name + '（' + $filter('toHHMMSS')(next_section.duration, 'MMSS') + '）';
            $scope.section.player.mask.btn.text = '试听下一节';
            $scope.section.player.mask.btn.style = 1;
          }

        } else {
          if ($scope.course.relation.trade_status <= 0) {
            if (click) {
              $scope.buy($scope.course_id, !$scope.course.info.rel_price);
            } else {
              // 结束，未购买显示购买
              $scope.section.player.mask.title = '本课程免费章节已试听完毕，如需学习更多章节，请您购买本课程';
              $scope.section.player.mask.btn.text = '购买课程';
              $scope.section.player.mask.btn.style = 2;
            }
          } else if ($scope.course.relation.trade_status == 1) {
            if (click) {
              $location.path('/payment/' + $scope.course_id);
            } else {
              // 结束，未付款显示付款
              $scope.section.player.mask.title = '本课程免费章节已试听完毕，如需学习更多章节，请您付款';
              $scope.section.player.mask.btn.text = '立即付款';
              $scope.section.player.mask.btn.style = 2;
            }
          }
        }
      // 2:正常播放，播放已结束或未结束
      } else {

        // 未结束，播放下一节
        var next_section = $scope.sections.all[$scope.sections.current + 1];
        if (!!next_section) {

          // 判断来源为检查或者用户点击
          if (click) {

            // 播放下一节试听视频
            $location.path('/course/' + $scope.course_id + '/learn/' + next_section.id);

          } else {

            // 判断是否为回放
            if (playback) $scope.section.player.mask.title = '回放已结束，下一节课程：' + next_section.name + '（'+ $filter('toHHMMSS')(next_section.duration, 'MMSS') + '）';
            if (!playback) $scope.section.player.mask.title = '下一节课程：' + next_section.name + '（'+ $filter('toHHMMSS')(next_section.duration, 'MMSS') + '）';
            $scope.section.player.mask.btn.text = '下一节';
            $scope.section.player.mask.btn.style = 1;
          }

        // 课程已结束
        } else {

          if ($scope.course.relation.trade_status == 2) {
            if (click) {
              $rootScope.goTo('player-container');
              $rootScope.setTabActive(angular.element('#J_learn_tab ul').scope(), 3);
            } else {
              // 结束，未购买显示购买
              $scope.section.player.mask.title = '恭喜您，已完成本章课程的学习！快去评价一下吧~';
              $scope.section.player.mask.btn.text = '评价课程';
              $scope.section.player.mask.btn.style = 1;
            }
          } else if ($scope.course.relation.trade_status == 3) {

            if (click) {
              $location.path('/course/' + $scope.course_id);
            } else {
              // 结束，用户已评价
              $scope.section.player.mask.title = '恭喜您，已完成本章课程的学习！';
              $scope.section.player.mask.btn.text = '返回课程';
              $scope.section.player.mask.btn.style = 1;
            }
          }
        }
      }

      if (params.callback) params.callback();
    };

    // 判断Mask主按钮的显示
    $scope.checkNextSection = function (params) {

      var params = params || {};
      var click = params.click || false;
      var title = params.title || false;

      $scope.section.player.mask.btn.show = true;
      $scope.section.player.mask.btn.click = function () {
        $scope.checkNextSection({ click: true });
      };

      // 未结束，播放下一节
      var next_section = $scope.sections.all[$scope.sections.current + 1];

      // 如果有下一页
      if (!!next_section) {

        // 判断来源为检查或者用户点击
        if (click) {

          // 播放下一节试听视频
          $location.path('/course/' + $scope.course_id + '/learn/' + next_section.id);

        } else {

          // 如果需要设置标题
          if (title) {

            // 判断是否为回放
            if (playback) $scope.section.player.mask.title = '回放已结束，下一节课程：' + next_section.name + '（'+ $filter('toHHMMSS')(next_section.duration, 'MMSS') + '）';
            if (!playback) $scope.section.player.mask.title = '下一节课程：' + next_section.name + '（'+ $filter('toHHMMSS')(next_section.duration, 'MMSS') + '）';
          };

          $scope.section.player.mask.btn.text = '下一节';
          $scope.section.player.mask.btn.style = 1;
        }

      // 课程已结束
      } else {

        if ($scope.course.relation.trade_status == 2) {

          if (click) {
            $rootScope.goTo('player-container');
            $rootScope.setTabActive(angular.element('#J_learn_tab ul').scope(), 3);

          } else {

            // 如果需要设置标题
            if (title) {

              // 结束，未购买显示购买
              $scope.section.player.mask.title = '恭喜您，已完成本章课程的学习！快去评价一下吧~';
            };

            $scope.section.player.mask.btn.text = '评价课程';
            $scope.section.player.mask.btn.style = 1;
          }
        } else if ($scope.course.relation.trade_status == 3 || !$scope.course.relation) {

          if (click) {

            $location.path('/course/' + $scope.course_id);

          } else {

            // 如果需要设置标题
            if (title) {

              // 结束，用户已评价
              $scope.section.player.mask.title = '恭喜您，已完成本章课程的学习！';
            };

            $scope.section.player.mask.btn.text = '返回课程';
            $scope.section.player.mask.btn.style = 1;
          }
        }
      }
    };

    // Init视频和聊天
    $scope.initVideoAndChat = function () {

      // 加载时的遮罩层
      $scope.section.player.mask.show = true;
      $scope.section.player.mask.refresh = false;
      $scope.section.player.mask.title = '课程资源加载中...';
      $scope.section.player.mask.btn.show = false;

      // 视频播放器部分
      if ($scope.course_id && $scope.section_id) {

        // 获取播放器资源地址
        CommonProvider.promise({
          model: SectionModel,
          method: 'getVideos',
          params: {
            section_id: $scope.section_id,
            role: 'student'
          },
          success: function(video) {

            // 隐藏遮罩层
            $scope.section.player.mask.show = false;
            $scope.section.player.mask.refresh = false;

            // 数据整理
            var video = video.result;
            // console.log(video);

            var player = {};
            player.modal = 0;
            player.urls = video.urls;
            player.is_live = video.is_live;
            player.live_status = video.live_status;

            // 直播模式
            if (player.is_live) {
              // console.log(player);
              switch (player.live_status) {
                case 0:
                case 1:
                case 10:
                case 11:
                case 12:
                  // console.log('直播未开始，更改遮罩层内容，不创建播放器');
                  player.live_at = video.live_at;
                  $scope.section.player.mask.show = true;
                  $scope.section.player.mask.title = '本节课程直播将在 ' + player.live_at + ' 开始，请等待~';
                  $scope.checkNextSection({ title: false });
                  break;
                case 2:
                  // console.log('直播进行中，创建播放器和聊天室');
                  player.room_id = video.room_id;
                  $scope.player = player;
                  break;
                case 3:
                case 4:
                  // console.log('结束，不可回放，更改遮罩层内容，不创建播放器，聊天室请求记录接口');
                  $scope.section.player.mask.show = true;
                  $scope.section.player.mask.title = '直播已结束，暂无有效回放资源';
                  $scope.checkNextSection({ title: false });
                  break;
                case 5:
                  // console.log('结束，可回放，创建普通播放器，聊天室请求记录接口');
                  $scope.section.player.mask.show = false;
                  player.room_id = 0;
                  break;
              };
            };

            // 点播/回放模式
            if (!player.is_live || (!!player.is_live && player.live_status == 5)) {

              // 初始化当前时间为服务器返回时间
              $scope.section.player.current = video.record != null ? video.record.record_time : 0;

              // 如果本地没有播放记录，则开始创建本地记录
              $localStorage.play_record = $localStorage.play_record || {};

              // 如果本地记录不包含此用户，则开始创建此用户的记录
              $localStorage.play_record[$rootScope.user.id] = $localStorage.play_record[$rootScope.user.id] || {};

              // 计算播放器开始续播时间
              var playerStartTime = function () {

                // 如果是通过定位链接定位的，则直接返回为该定位链接的时间点
                if ($stateParams.record_time) {
                  return $stateParams.record_time;
                };

                // 否则，续接上次播放记录，先读取本地记录，如果记录上次已学完，则从0开始，如果本地记录不存在，则读取服务器继续判断，如果服务器记录不存在，则从0开始
                if ($localStorage.play_record[$rootScope.user.id][$scope.section.info.id]) {
                  if ($localStorage.play_record[$rootScope.user.id][$scope.section.info.id] == Number($scope.section.info.duration).toFixed(0)) {
                    return 0;
                  } else {
                    return $localStorage.play_record[$rootScope.user.id][$scope.section.info.id];
                  }
                } else {
                  if (video.record != null && video.record.record_time != Number($scope.section.info.duration).toFixed(0)) {
                    return video.record.record_time;
                  } else {
                    return 0;
                  }
                }
              };

              player.start = playerStartTime();
              $scope.player = player;

              // 监听时间
              $scope.$on('videoPlayerTimeUpdate', function (event, current_time) {

                if (!current_time) return false;

                // 实时时间无变化则不保存
                if ($scope.section.player.current == Number(Math.floor(current_time))) return false;

                // 保存给内存
                $scope.section.player.current = Number(Math.floor(current_time));

                // 实时时间保存给本地
                $localStorage.play_record[$rootScope.user.id][$scope.section.info.id] = Number(Math.floor(current_time));
              });

              // 监听播放
              $scope.$on('videoPlayerPlaying', function (event, playing) {
                $scope.$apply(function () {
                  $scope.section.player.mask.show = false;
                });
              });

              // 监听暂停
              $scope.$on('videoPlayerPause', function (event, pause) {
                $scope.postStudyRecord();
              });

              // 监听结束
              $scope.$on('videoPlayerEnded', function (event, ended) {

                // console.log('播放结束');

                // 写入播放记录
                $scope.postStudyRecord();
                // $scope.section.player.mask.show = true;

                // 是否为回放
                var playback = !!player.is_live;

                // 触发播放停止检查，传入是否回放参数
                $scope.playEndedCheck({ playback: playback });

              });

              // 监听预加载准备
              $scope.$on('videoPlayerLoadeddata', function (event, preload) {
                $scope.section.player.mask.show = false;
              });

              // 监听分辨率切换
              $scope.$on('videoPlayerResolution', function (event, new_src) {
                // console.log(new_src);
              });

              // 定义暂停动作
              $scope.playerPause = function (){
                $scope.$broadcast('doVideoPlayerPause', true);
              };

              // 定义播放动作
              $scope.playerPlay = function (){
                $scope.$broadcast('doVideoPlayerPlay', true);
              };

              // 定义重新播放动作
              $scope.playerRefreshPlay = function (){
                $scope.$broadcast('doVideoPlayerRefreshPlay', true);
              };
            }
          },
          error: function (video) {
            if (video.code == 600 && !$scope.course.relation.author) {
              var trade_status = $scope.course.relation.trade_status;
              // 未登录
              $modal.confirm({
                title: trade_status < 1 ? '本课程需要购买' : '本课程尚未付款',
                message: '无法播放付费课程，请前往' + ( trade_status < 1 ? '购买' : '付款' ),
                info: trade_status < 1 ? '是否购买本课程？' : '是否付款本课程？',
                button: {
                  confirm: trade_status < 1 ? '立即购买' : '立即付款',
                  cancel: trade_status < 1 ? '暂不购买' : '暂不付款'
                },
                onsubmit: function () {
                  if (trade_status < 1) $scope.buy($scope.course_id, !$scope.course.info.rel_price);
                  if (trade_status == 1) $location.path('/payment/' + $scope.course_id);
                },
                oncancel: function () {
                  $location.path('/course/' + $scope.course_id);
                },
                callback: function () {
                  // 关闭窗口后，离开本页
                  $location.path('/course/' + $scope.course_id);
                }
              });
            } else {
              $scope.section.player.mask.show = true;
              $scope.section.player.mask.title = video.message;
              $scope.checkNextSection({ title: false });
            }
          }
        });
      }
    };

    // 播放页初始化
    $scope.initLearn = function () {

      // 登录判断
      if (!$localStorage.token) {
        $modal.warning({
          message: '请先登录',
          callback: function () {
            $location.path('auth/login');
          }
        });
        return false;
      };

      // 进入播放页隐藏全局导航栏
      $rootScope.navBarHide = true;

      // 进入播放页添加样式
      $rootScope.learnActive = true;

      // 请求基本信息
      $scope.getBasicInfo();

      // 请求章节信息
      $scope.getSections();

      // 请求评论信息
      $scope.getComments();

      // 请求同学列表
      $scope.getClassmates();

      // 请求订单关系
      $scope.getRelation();

      // 请求章节/附属信息/问答/笔记列表
      $scope.getSectionInfo();

      // 监听路径的跳出
      $scope.$on('$locationChangeStart', function() {

        // console.log('跳出了');

        // 写入学习记录
        $scope.postStudyRecord();

        // 导航栏显示
        $rootScope.navBarHide = false;

        // 移除播放页样式
        $rootScope.learnActive = false;

      });

      // 监听页面/关闭/刷新/时写入学习记录
      $window.onbeforeunload = function (){
        $scope.postStudyRecord();
      };

      // 初始化视频和聊天
      $scope.initVideoAndChat();
    };

    // 监听状态的变化，用于实时改变状态
    $scope.$watch('course.relation.trade_status', function () {
      // console.log('关系发生变化');
      // $scope.playEndedCheck();
    });

  }
]);
