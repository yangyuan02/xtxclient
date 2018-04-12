/*
*
* UserController Module
*
* Description
*
*/
angular.module('UserController', ['angular.validation', 'angular.validation.rule', 'angular.modal', 'datePicker', 'StudentModel', 'TradeModel', 'CourseModel', 'CommentModel', 'FavoriteModel', 'NoteModel', 'QuestionModel', 'MsgModel', 'ScoreModel'])
.controller('UserController', ['$rootScope', '$scope', '$state', '$stateParams', '$location', '$localStorage', '$interval', '$modal', 'dateFilter', 'QuploadProvider', 'CommonProvider', 'AuthProvider', 'StudentModel', 'TradeModel', 'CourseModel', 'CommentModel', 'CommonModel', 'FavoriteModel', 'NoteModel', 'QuestionModel', 'MsgModel', 'AuthModel', 'ScoreModel',
  function ($rootScope, $scope, $state, $stateParams, $location, $localStorage, $interval, $modal, dateFilter, QuploadProvider, CommonProvider, AuthProvider, StudentModel, TradeModel, CourseModel, CommentModel, CommonModel, FavoriteModel, NoteModel, QuestionModel, MsgModel, AuthModel, ScoreModel) {

    // 首次载入时验证登录状态
    $rootScope.checkLogin();

    // 链接产生变动时验证登录状态
    $scope.$on('$locationChangeStart', function () {
      $rootScope.checkLogin();
    });

    $scope.status = {};

    // 初始化
    $scope.user = $rootScope.user || {};

    // 链接变更成功时，更新面包屑/title
    $scope.$on('$stateChangeSuccess', function (event, next, current) {

      $scope.status.current = $state.current.data.slug || false;
      $scope.status.parent = $state.$current.parent ? ( $state.$current.parent.data ? $state.$current.parent.data.slug : false ) : false;

      // 如果路由中定义的url是空则是指当前页面
      $state.current.data.url = $state.current.data.url || $location.$$url;
      $scope.breadcrumb = $state;
      $rootScope.title = $state.current.data.title || $state.$current.parent.data.title || '';
    });

    // 请求学习记录
    $scope.getHistory = function (page) {
      CommonProvider.promise({
        model: StudentModel,
        method: 'get',
        params: {
          target_type: 'study_record',
          per_page: 10,
          page: page || 1
        },
        success: function (history) {
          $scope.history = history;
          $rootScope.toTop();
        }
      });
    };

    // 个人中心首页
    $scope.getIndex = function () {

      AuthProvider.init(function (user) {
        $scope.user = user;
      });

      $scope.getHistory();
    };

    // 我的课程初始化
    $scope.courseInit = function () {
      if (!$scope.all_courses) {
        $scope.all_courses = [
          {
            name: '全部课程',
            status: 'all',
            sort: 1
          }, {
            name: '已试听',
            status: '0',
            sort: 2
          }, {
            name: '待付款',
            status: '1',
            sort: 3
          }, {
            name: '待评价',
            status: '2',
            sort: 4
          }, {
            name: '交易成功',
            status: '3',
            sort: 5
          }, {
            name: '已关闭',
            status: '-1',
            sort: 6
          }
        ];
      };
    };

    // 我的课程
    $scope.getCourses = function (params) {
      $rootScope.toTop();

      var get_params = {
        role: 'student',
        per_page: 6,
        page: params.page || 1
      };

      if (params.status != undefined) {
        if (params.status != 'all') {
          get_params.status = params.status;
        }
      }

      CommonProvider.promise({
        model: TradeModel,
        method: 'get',
        params: get_params,
        success: function (courses) {
          $scope.all_courses.find(params.status, 'status').courses = courses;
        }
      });
    };

    // 批量状态
    $scope.batchCheck = function (params) {
      var courses = $scope.all_courses.find(params.status, 'status').courses.result;
      courses.forEach(function (course) {
        if (course.trade_status == 1) course.checked = params.check_all;
      });
    };

    // 批量付款
    $scope.batchPayment = function (status) {

      var ids = $scope.all_courses.find(status, 'status').courses.result.checked(false, 'course_id').join(',');

      // 如果没有选中课程,则弹出提醒
      if (ids == '') {
        $modal.error({ message: '请选择多个课程进行操作' });
        return false;
      }

      // 开始请求
      $location.path('payment/' + ids);
    };

    // 课程购买
    $scope.buy = function (course) {
      CommonProvider.promise({
        model: CourseModel,
        method: 'operation',
        params: { 
          method: 'buy',
          course_id: course.course_id
        },
        success: function(buy){
          if (!!course.rel_price) $location.path('/payment/' + course.course_id);
          if (!course.rel_price) $location.path('/course/' + course.course_id + '/learn/' + course.last_study_section_id);
        },
        error: function (buy) {
          $modal.error({ message: buy.message });
        }
      });
    };

    // 取消订单
    $scope.delCourseTrade = function (params) {

      var doDelCourseTrade = function () {
        var page = $scope.all_courses.find(params.status, 'status').courses.pagination.current_page;
        CommonProvider.promise({
          model: TradeModel,
          method: 'cancel',
          params: {
            trade_id: params.trade_id
          },
          success: function (result) {
            // 更新当前操作列表
            // $scope. getCourses({ status: params.status, page: page });
            // 更新‘all’ + ‘待付款’ + '已关闭'列表
            $scope.getCourses({ status: 'all', page: $scope.all_courses.find('all', 'status').courses.pagination.current_page });
            $scope.getCourses({ status: '1', page: $scope.all_courses.find('1', 'status').courses.pagination.current_page });
            $scope.getCourses({ status: '-1', page: $scope.all_courses.find('-1', 'status').courses.pagination.current_page });
          }
        });
      };

      $modal.confirm({
        message: '你真的要取消订单吗？',
        onsubmit: doDelCourseTrade
      });
    };

    // 获取课程收藏
    $scope.getFavorite = function (params) {
      $rootScope.toTop();
      AuthProvider.check(function (user) {
        CommonProvider.promise({
          model: FavoriteModel,
          method: 'get',
          params: { 
            user_id: user.id,
            type: 'course',
            page: params.page || 1,
            per_page: 12
          },
          success: function(favorites){
            $scope.favorites = favorites;
          }
        });
      });
    };

    // 删除我的收藏
    $scope.delFav = function (params) {

      var doDelFav = function () {
        CommonProvider.promise({
          model: FavoriteModel,
          method: 'del',
          params: { 
            type: 'course',
            target_id: params.id
          },
          success: function(favorites){
            $scope.getFavorite({ page: $scope.favorites.pagination.current_page });
          }
        });
      };

      $modal.confirm({
        title: '确认删除',
        message: '确定要删除本条收藏吗？',
        info: '如果删除，该操作且不可恢复',
        onsubmit: doDelFav
      });
    };

    // 获取原创笔记
    $scope.getNote = function (params) {
      var target_page = params ? params.page || 1 : 1;
      AuthProvider.check(function (user) {
        CommonProvider.promise({
          model: NoteModel,
          method: 'get',
          params: { 
            role: 'student',
            user_id: user.id,
            per_page: 10,
            page: target_page
          },
          success: function(notes){
            if (target_page == 1) {
              $scope.notes = notes;
            } else {
              $scope.notes.pagination = notes.pagination;
              $scope.notes.result = $scope.notes.result.concat(notes.result);
            }
          }
        });
      });
    };

    // 获取收藏笔记
    $scope.getFavoriteNote = function (params) {
      var target_page = params ? params.page || 1 : 1;
      AuthProvider.check(function (user) {
        CommonProvider.promise({
          model: FavoriteModel,
          method: 'get',
          params: { 
            user_id: user.id,
            type: 'note',
            page: target_page,
            per_page: 12
          },
          success: function(notes){
            if (target_page == 1) {
              $scope.fav_notes = notes;
            } else {
              $scope.fav_notes.pagination = notes.pagination;
              $scope.fav_notes.result = $scope.fav_notes.result.concat(notes.result);
            }
          }
        });
      });
    };

    // 删除原创笔记
    $scope.delNote = function (note) {

      var doDelNote = function () {
        CommonProvider.promise({
          model: NoteModel,
          method: 'del',
          params: { note_id: note.id },
          success: function(_note){
            $scope.notes.result.remove(note);
          }
        });
      };

      $modal.confirm({
        title: '确认删除',
        message: '您确定要删除该笔记？',
        info: '删除后无法恢复，请您谨慎操作。',
        onsubmit: doDelNote
      });
    };

    // 删除收藏笔记
    $scope.delFavNote = function (note) {

      var doDelFavNote = function () {
        CommonProvider.promise({
          model: FavoriteModel,
          method: 'del',
          params: {
            target_id: note.note_id,
            type: 'note'
          },
          success: function(_note){
            $scope.fav_notes.result.remove(note);
          }
        });
      };

      $modal.confirm({
        title: '确认删除',
        message: '您确定要删除该笔记收藏？',
        info: '删除后无法恢复，请谨慎操作',
        onsubmit: doDelFavNote
      });
    };

    // 编辑笔记内容
    $scope.editNote = function (note) {
      $rootScope.note_local = note;
      $rootScope.note_edit  = angular.copy(note.note);
      $modal.custom({
        title: '请在下方输入新的笔记内容',
        template_url: '/partials/home/user/note/edit.html',
        callback: function () {
          delete $rootScope.note_edit;
          $rootScope.note_local = null;
        }
      });
    };

    // 保存/更新笔记
    $scope.saveNote = function (note) {
      CommonProvider.promise({
        model: NoteModel,
        method: 'put',
        params: { 
          id: note.id,
          body: {
            section_id: note.section.id,
            content: note.content,
            is_publish: Number(note.is_publish),
            is_capture: Number(!!note.is_capture),
            record_time: note.record_time || 0
          }
        },
        success: function(_note){
          $rootScope.note_local.note = note;
          $rootScope.modal.close();
        }
      });
    };

    // 获取我的提问
    $scope.getQuestion = function (params) {
      var page = params ? ( params.page || 1 ) : 1;
      CommonProvider.promise({
        model: QuestionModel,
        method: 'get',
        params: {
          role: 'student',
          page: page,
          per_page: 10
        },
        success: function(questions){
          if (page == 1) {
            $rootScope.questions = questions;
          } else {
            $scope.questions.pagination = questions.pagination;
            $scope.questions.result = $scope.questions.result.concat(questions.result);
          }
        }
      });
    };

    // 编辑我的问题
    $scope.editQuestion = function (question) {
      $rootScope.question_local = question;
      $rootScope.question_edit  = angular.copy(question.question);
      $modal.custom({
        title: '修改问题',
        template_url: '/partials/home/user/question/edit.html',
        callback: function () {
          delete $rootScope.question_edit;
          $rootScope.question_local = null;
        }
      });
    }

    // 更新我的提问
    $scope.saveQuestion = function (question) {
      CommonProvider.promise({
        model: QuestionModel,
        method: 'put',
        params: { 
          id: question.id,
          body: {
            // section_id: question.section.id,
            content: question.content,
            pid: question.pid,
            // to_user_id: string
          }
        },
        success: function(_question){
          $rootScope.question_local.question = question;
          $rootScope.modal.close();
        }
      });
    };

    // 删除我的提问
    $scope.delQuestion = function (question) {

      var doDelQuestion = function () {
        CommonProvider.promise({
          model: QuestionModel,
          method: 'del',
          params: { question_id: question.id },
          success: function(_question){
            $scope.questions.result.remove(question);
            $scope.questions.pagination.total -= 1;
          }
        });
      };

      $modal.confirm({
        title: '确认删除',
        message: '确定要删除本条问题吗？',
        info: '如果删除，则该问题下包含的回答均会被删除，且不可恢复',
        onsubmit: doDelQuestion
      });
    };

    // 获取我的回答
    $scope.getAnswer = function (params) {
      var page = params ? ( params.page || 1 ) : 1;
      CommonProvider.promise({
        model: QuestionModel,
        method: 'get',
        params: {
          role: 'student',
          page: page,
          per_page: 10,
          type: 'answer'
        },
        success: function(answers){
          if (page == 1) {
            $rootScope.answers = answers;
          } else {
            $scope.answers.pagination = answers.pagination;
            $scope.answers.result = $scope.answers.result.concat(answers.result);
          }
        }
      });
    };

    // 删除我的回答
    $scope.delAnswer = function (answer) {
      $modal.confirm({
        title: '确认删除',
        message: '确定要删除本条回答吗？',
        info: '如果删除，则该回答将不再可见，且不可恢复',
        onsubmit: function () {
          CommonProvider.promise({
            model: QuestionModel,
            method: 'del',
            params: { 
              question_id: answer.id,
              role: 'student'
            },
            success: function(_note){
              $scope.answers.result.remove(answer);
              $scope.answers.pagination.total -= 1;
            }
          });
        }
      });
    };

    // 问答详情页-请求数据
    $scope.getQAdetail = function (params) {
      CommonProvider.promise({
        model: QuestionModel,
        method: 'item',
        params: { question_id: $stateParams.question_id },
        success: function(questionAnswer){
          $scope.questionAnswer = questionAnswer.result;
        }
      });
    };

    // 详情页加载评论
    $scope.getQuestionAnswer = function () {
      CommonProvider.promise({
        model: QuestionModel,
        method: 'get',
        params: {
          role: 'student',
          page: $scope.questionAnswer.next_page,
          type: 'answer'
        },
        success: function(answers){
          $scope.questionAnswer.answers.push(answers.result);
        }
      });
    };

    // 问答详情页回复答案弹窗
    $scope.replyAnswer = function (answer) {
      $rootScope.reply_edit = answer;
      $rootScope.questionAnswer = $scope.questionAnswer;
      $modal.custom({
        title: '回复答案',
        template_url: '/partials/home/user/question/reply-answer.html',
        callback: function () {
          delete $rootScope.reply_edit;
          $rootScope.questionAnswer = null;
        }
      });
    };

    // 问答详情页回复答案方法
    $scope.saveReplyAnswer = function (answer) {
      CommonProvider.promise({
        model: QuestionModel,
        method: 'post',
        params: {
          section_id: Number($rootScope.reply_edit.section_id),
          content: answer,
          pid: $rootScope.reply_edit.id,
          to_user_id: $rootScope.reply_edit.user.id
        },
        success: function (_answer) {
          _answer.result.user = {};
          _answer.result.user.name = $rootScope.user.name;
          _answer.result.user.id = $rootScope.user.id;
          _answer.result.user.gravatar = $rootScope.user.gravatar;
          var current = $rootScope.questionAnswer.answers.find($rootScope.reply_edit);
          current.children = current.children || [];
          current.children.unshift(_answer.result);
          $rootScope.modal.close();
        }
      });
    };

    // 获取账单明细
    $scope.getBill = function (params) {

      // 格式化日期
      $scope.bill_start_date = params.start ? dateFilter(params.start, 'yyyy-MM-dd') : $scope.bill_start_date;
      $scope.bill_end_date = params.end ? dateFilter(params.end, 'yyyy-MM-dd') : $scope.bill_end_date || dateFilter($scope.billDates.today._d, 'yyyy-MM-dd');
      if (!$scope.bill_start_date || !$scope.bill_end_date) return false;

      CommonProvider.promise({
        model: StudentModel,
        method: 'get',
        params: {
          target_type: 'bill',
          role: 'student',
          start_date: $scope.bill_start_date,
          end_date: $scope.bill_end_date,
          page: params.page || 1,
          per_page: 13
        },
        success: function(bills){
          $scope.bills = bills;
        }
      });
    };

    // 获取预定义标签获取账单列表数据
    $scope.getScopeBill = function (dateUnit) {
      $scope.getBill({ 
        start: new Date(moment().subtract(1,dateUnit)._d),
        end: $scope.billDates.today._d
      });
    };

    // 时间选择器模块配置
    $scope.billInit = function () {
      $scope.billDates = {
        // 此刻
        today: moment(),
        // 最早时间范围,3年内
        min: moment().subtract(3, 'y'),
        // 最大时间，此刻
        max: moment(),
        // 开始时间，默认今天
        start: moment().subtract(7, 'd'),
        // 结束时间，默认今天
        end: moment()
      };

      $scope.getScopeBill('w');
    };

    // 获取通知
    $scope.getMsgs = function (params) {
      $rootScope.toTop();

      var get_params = {
        role: 'user',
        per_page: 14,
        page: params.page || 1
      };

      if (params.type != undefined) {
        if (params.type != 'all') {
          get_params.type = params.type;
        }
      }

      CommonProvider.promise({
        model: MsgModel,
        method: 'get',
        params: get_params,
        success: function (messages) {
          $scope.all_msgs.find(params.type, 'type').messages = messages;
        }
      });
    };

    // 通知中心初始化
    $scope.msgInit = function () {
      if (!$scope.all_msgs) {
        $scope.all_msgs = [
          {
            name: '全部消息',
            type: 'all',
            active: true,
            sort: 1
          }, {
            name: '系统消息',
            type: '0',
            active: false,
            sort: 2
          }, {
            name: '笔记消息',
            type: '1',
            active: false,
            sort: 3
          }, {
            name: '问答消息',
            type: '2',
            active: false,
            sort: 4
          }, {
            name: '课程消息',
            type: '3',
            active: false,
            sort: 5
          }, {
            name: '机构消息',
            type: '4',
            active: false,
            sort: 6
          }
        ];
      };
    };

    // 标为已读
    $scope.postMsgRead = function (msgs) {

      var ids;
      var act;
      if (msgs.all) {
        act = $scope.all_msgs.find(true,'active');
        ids = $scope.all_msgs.find(true,'active').messages.result.ids().join(',');
      } else {
        act = msgs.msg;
        ids = msgs.msg.msg.id;
      };

      if (!ids) return false;

      CommonProvider.promise({
        model: MsgModel,
        method: 'batch',
        params: {
          role: 'user',
          act_type: 'disable',
          ids: ids
        },
        success: function (res) {
          if (msgs.all) {
            act.messages.result.setAttr('x_status', 0);
          } else {
            act.msg.x_status = 0;
          }
        }
      });
    };

    // 获取地区数据
    $scope.getAreaData = function () {
      if ($localStorage.area) {
        $scope.area = $localStorage.area;
      } else {
        CommonProvider.promise({
          model: CommonModel,
          method: 'area',
          success: function (area) {
            $scope.area = area.result;
            $localStorage.area = area.result;
          }
        });
      }
    };

    // 请求个人资料
    $scope.getUserInfo = function () {

      // 同步最新数据
      AuthProvider.init(function (user) {
        $scope.user = user;
      });

      // 初始化状态
      $scope.update_info_status = 0;

      // 判断获取地区数据
      $scope.getAreaData();
    };

    // 更新个人资料
    $scope.updateInfo = function () {
      CommonProvider.promise({
        model: StudentModel,
        method: 'put',
        params: {
          gravatar: $scope.user.gravatar,
          name: $scope.user.name,
          rel_name: $scope.user.profile.rel_name,
          gender: $scope.user.profile.gender,
          city: $scope.user.profile.city,
          province: $scope.user.profile.province,
          district: $scope.user.profile.district,
          email: $scope.user.profile.email,
          slogan: $scope.user.profile.slogan,
          id_card_pic: $scope.user.profile.id_card_pic
        },
        success: function (user) {
          $rootScope.toTop();
          $scope.user = user;
          $rootScope.user = user;
          $localStorage.user = user;
          $scope.update_info_status = 1;
        }
      });
    };

    // 返回首页
    $scope.backUp = function () {
      $location.path($state.$current.parent.url.sourcePath + '/index');
    };

    // logo上传回调
    $scope.getlogoUpload = function (data) {
      if (data) {
        $scope.user.gravatar = data.key;
      }
    };

    // 身份证上传回调
    $scope.getIdentityUpload = function (data) {
      if (data) {
        $scope.user.profile.id_card_pic = data.key;
      }
    };

    // 更改密码
    $scope.resetPassword = function (password) {
      CommonProvider.promise({
        model: AuthModel,
        method: 'reset',
        params: {
          old_password: password.old,
          password: password.new
        },
        success: function (pwd) {
          console.log(pwd);
          $scope.reset_pwd_status = 1;
        },
        error: function (pwd) {
          $modal.error({ message: pwd.message });
        }
      });
    };

    // 积分初始化
    $scope.userScoreInit = function () {

      // 初始化
      $scope.score = {};
      $scope.score.lists = {};
      $scope.score.levels = {};
      $scope.score.rules = {};

      // 获取
      $scope.getScore({});
      $scope.getScoreLevel({});
      $scope.getScoreRule({});
    };

    // 获取用户积分
    $scope.getScore = function (params) {
      CommonProvider.promise({
        model: ScoreModel,
        method: 'get',
        params: {
          role: 'user',
          per_page: 14,
          page: params.page || 1
        },
        success: function (lists) {
          $scope.score.lists = lists;
        }
      });
    };

    // 获取积分规则
    $scope.getScoreRule = function (params) {
      CommonProvider.promise({
        model: ScoreModel,
        method: 'getRules',
        params: {
          role: 'user',
          per_page: 14,
          page: params.page || 1
        },
        success: function (rules) {
          $scope.score.rules = rules;
        }
      });
    };

    // 获取积分等级
    $scope.getScoreLevel = function (params) {
      CommonProvider.promise({
        model: ScoreModel,
        method: 'getLevels',
        params: {
          role: 'user',
          per_page: 14,
          page: params.page || 1
        },
        success: function (levels) {
          $scope.score.levels = levels;
        }
      });
    };
    
  }
]);