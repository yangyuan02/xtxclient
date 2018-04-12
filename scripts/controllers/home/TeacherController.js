/*
*
* Teacher Module
*
* Description
*
*/
angular.module('TeacherController', ['angular.validation', 'angular.bootstrap.rating', 'angular.modal', 'TeacherModel', 'TradeModel', 'AnnouncementModel', 'CommentModel'])
.controller('TeacherController', ['$rootScope', '$scope', '$state', '$stateParams', '$location', '$timeout', '$modal', '$localStorage', 'AuthProvider', 'CommonProvider', 'TeacherModel', 'TradeModel', 'AnnouncementModel', 'CommentModel',
  function ($rootScope, $scope, $state, $stateParams, $location, $timeout, $modal, $localStorage, AuthProvider, CommonProvider, TeacherModel, TradeModel, AnnouncementModel, CommentModel) {


    // 首次载入时验证登录状态
    $rootScope.checkLogin();

    // 链接产生变动时验证登录状态
    $scope.$on('$locationChangeStart', function () {
      $rootScope.checkLogin();
    });

    // 初始化
    $scope.status = {};
    $scope.organization_id = $stateParams.organization_id;

    // 链接变更成功时，更新面包屑/title
    $scope.$on('$stateChangeSuccess', function (event, next, current) {

      $scope.status.current = $state.current.data.slug || false;
      $scope.status.parent = $state.$current.parent ? ( $state.$current.parent.data ? $state.$current.parent.data.slug : false ) : false;

      // 如果路由中定义的url是空则是指当前页面
      $state.current.data.url = $state.current.data.url || $location.$$url;
      $scope.breadcrumb = $state;
      $rootScope.title = $state.current.data.title || $state.$current.parent.data.title || '';
    });

    // 获取老师中心首页信息
    $scope.getIndex = function () {
      AuthProvider.init(function (user) {
        $scope.teacher = user;
      });
    };

    // 获取系统通知
    $scope.getNotices = function () {
      CommonProvider.promise({
        model: AnnouncementModel,
        method: 'get',
        params: {
          role: 'teacher',
          type: 2,
          page: 1,
          per_page: 5
        },
        success: function(notices){
          $scope.notices = notices;
        }
      });
    };

    // 获取代办事项
    $scope.getToDoList = function () {
      CommonProvider.promise({
        model: TeacherModel,
        method: 'get',
        params: { target_type: 'todo' },
        success: function(to_do_list){
          $scope.to_do_list = to_do_list.result;
        }
      });
    };

    // 已售课程初始化
    $scope.tradeInit = function () {
      AuthProvider.check(function (user) {
        $scope.user = user;
        if (user.is_teacher) {
          if (!$scope.all_courses) {
            $scope.all_courses = [
              {
                name: '全部课程',
                status: 'all',
                sort: 1
              }, {
                name: '待付款',
                status: '1',
                sort: 3
              }, {
                name: '交易成功',
                status: '2',
                sort: 4
              }, {
                name: '已评价',
                status: '3',
                sort: 5
              }, {
                name: '关闭的订单',
                status: '-1',
                sort: 6
              }
            ];
          };
        }
      });
    };

    // 获取已售课程
    $scope.getTrades = function (params) {

      $rootScope.toTop();

      var get_params = {
        role: 'teacher',
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
        },
        result: function (courses) {
          if (!!courses.status && courses.data.code == 0) {
            var current = $scope.all_courses.find(params.status, 'status');
            current.courses = {
              pagination: {
                total: 0
              },
              result: []
            };
          }
        }
      });
    };

    // 关闭课程订单
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
            // 更新‘all’ + ‘待付款’ + '已关闭'列表
            $scope.getTrades({ status: 'all', page: $scope.all_courses.find('all', 'status').courses.pagination.current_page });
            $scope.getTrades({ status: '1', page: $scope.all_courses.find('1', 'status').courses.pagination.current_page });
            $scope.getTrades({ status: '-1', page: $scope.all_courses.find('-1', 'status').courses.pagination.current_page });
          }
        });
      };

      $modal.confirm({
        message: '你真的要取消订单吗？',
        onsubmit: doDelCourseTrade
      });
    };

    // 评价初始化
    $scope.rateInit = function () {
      AuthProvider.check(function (user) {
        $scope.user = user;
        if (user.is_teacher) {
          $scope.rates = $scope.rates || {};
        }
      });
    };

    // 获取评价列表
    $scope.getRates = function (params) {
      $rootScope.toTop();
      var get_params = {
        role: 'teacher',
        type: 'comment',
        per_page: 6,
        page: params.page || 1
      };

      if (!!params.x_status) {
        get_params.x_status = params.x_status;
      }

      if (!!params.is_replied) {
        get_params.is_replied = params.is_replied;
      }

      CommonProvider.promise({
        model: CommentModel,
        method: 'get',
        params: get_params,
        success: function (rates) {
          $scope.rates[params.type] = rates;
        },
        result: function (rates) {
          if (!!rates.status && rates.data.code == 0) {
            var current = $scope.rates[params.type];
            current = {
              pagination: {
                total: 0
              },
              result: []
            };
          }
        }
      });
    };

    // 回复买家弹窗
    $scope.replyRate = function (params) {
      if (params.modal) {
        $rootScope.rate_local = params.rate;
        $rootScope.rate_edit  = angular.copy(params.rate.$parent.rate);
        $modal.custom({
          title: '回复评价',
          template_url: '/partials/home/teacher/rate/reply.html',
          callback: function () {
            delete $rootScope.rate_edit;
            $rootScope.rate_local = null;
          }
        });
      } else {
        CommonProvider.promise({
          model: CommentModel,
          method: 'post',
          params: {
            role: 'teacher',
            body: {
              course_id: $rootScope.rate_edit.course_id,
              content: $rootScope.rate_edit.new_reply,
              pid: $rootScope.rate_edit.id
            }
          },
          success: function (_reply) {
            $rootScope.rate_local.$parent.rate.reply_info = _reply.result;
            $rootScope.rate_local.$parent.rate.is_replied = 1;
            $rootScope.modal.close();
            $scope.getRates({ type: 'replied', is_replied: 1 });
          },
          error: function (err) {
            $modal.error({ message: err.message });
          }
        });
      }
    };

    // 删除我对买家评价的回复
    $scope.delReply = function (comment) {
      $modal.confirm({
        title: '确认操作',
        message: '您确定要删除该回复吗？',
        info: '用户评价仅可以回复一次，删除后无法再恢复',
        button: {
          confirm: '确定',
          cancel: '取消'
        },
        onsubmit: function () {
          CommonProvider.promise({
            model: CommentModel,
            method: 'del',
            params: { comment_id: comment.rate.reply[0].id },
            success: function (rates) {
              comment.rate.reply = [];
            },
            error: function (res) {
              $modal.error({ message: res.message });
            }
          });
        }
      });
    };
  }
]);
