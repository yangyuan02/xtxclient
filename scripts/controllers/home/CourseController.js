/*
 * CourseController
*/
angular.module('CourseController', ['angular.bootstrap.rating', 'CategoryModel', 'CourseModel', 'SectionModel', 'CommentModel', 'FavoriteModel', 'SearchModel'])
.controller('CourseController', ['$rootScope', '$scope', '$state', '$stateParams', '$location', '$http', '$localStorage', '$window', '$timeout', '$interval', '$modal', '$filter', '$sce', 'CommonProvider', 'CategoryModel', 'CourseModel', 'SectionModel', 'CommentModel','FavoriteModel', 'SearchModel', 
  function ($rootScope, $scope, $state, $stateParams, $location, $http, $localStorage, $window, $timeout, $interval, $modal, $filter, $sce, CommonProvider, CategoryModel, CourseModel, SectionModel, CommentModel, FavoriteModel, SearchModel) {

    // 初始化
    $scope.filter = {
      sort_id: 0,
      is_live: 0
    };
    $scope.course_id = $stateParams.course_id || false;
    $scope.category_id = $stateParams.category_id || '0';
    $scope.course = {};
    $scope.course.relation = false;
    $scope.sections = {};
    $scope.sections.all = [];
    $scope.sections.free = [];
    $scope.sections.live = [];
    $scope.sections.current = 0;
    $scope.sections.current_free = 0;
    $scope.sections.last = {};
    $scope.course.btn = {
      primary: {
        text: '立即购买',
        show: true
      },
      secondary: {
        text: '免费试听',
        show: true,
        type: 'audition'
      }
    };

    // List ----------------------------------------------------

    // 获取课程分类
    $scope.getCateList = function () {
      CommonProvider.promise({
        model: CategoryModel,
        method: 'childrens',
        params: { category_id: $scope.category_id },
        success: function(categories){
          if (!!categories.result.children.length) {
            $scope.categories = categories.result;
            $rootScope.categories = categories.result;
          } else {
            $scope.categories = $rootScope.categories;
          }
        }
      });
    };

    // 获取课程列表数据
    $scope.getCourseList = function (page) {

      // 返回顶部
      $rootScope.toTop();

      // 判断是否为搜索页
      if (!!$stateParams.key) {
        $scope.getSearchList(page);
        return false;
      };

      var get_params = {
        role: 'student',
        category_id: $scope.category_id,
        sort_id: $scope.filter.sort_id || 0,
        page: page || 1,
        per_page: 12
      };

      if ($scope.filter.is_live == 1) get_params.is_live = 1;

      CommonProvider.promise({
        model: CourseModel,
        method: 'get',
        params: get_params,
        success: function(courses){
          $scope.courses = courses;
        }
      });
    };

    // 获取课程列表数据
    $scope.getSearchList = function (page) {
      $scope.keyword = $stateParams.key;

      var get_params = {
        keyword: $stateParams.key,
        detail: 1,
        only_name: 1,
        search_type: 'course',
        sort_id: $scope.filter.sort_id || 0,
        page: page || 1,
        per_page: 12
      };

      if ($scope.filter.is_live == 1) get_params.is_live = 1;

      CommonProvider.promise({
        model: SearchModel,
        method: 'get',
        params: get_params,
        success: function (courses) {
          $scope.courses = courses;
        }
      });
    };

    // 分类列表页请求
    $scope.getListInit = function () {
      $scope.getCateList();
      $scope.getCourseList();
    };

    // 排序方式改变
    $scope.sortChanged = function (sort_id) {
      $scope.filter.sort_id = sort_id;
      $scope.getCourseList();
    };

    // 直播条件改变
    $scope.isLiveChanged = function (is_live) {
      $scope.filter.is_live = Number(is_live);
      $scope.getCourseList();
    };

    // Detail ----------------------------------------------------

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

    // 请求相关课程
    $scope.getRelated = function (page) {
      CommonProvider.promise({
        model: CourseModel,
        method: 'others',
        params: { 
          page: page || 1,
          per_page: 8,
          course_id: $scope.course_id
        },
        success: function(related){
          $scope.course.related = related;
        }
      });
    };

    // 刷新相关课程
    $scope.refreshRelated = function () {
      if (!$scope.course.related) return false;
      var pagination = $scope.course.related.pagination;
      if (pagination.total > pagination.per_page) {
        if (pagination.current_page < pagination.total_page) {
          $scope.getRelated(pagination.current_page + 1);
        } else if (pagination.current_page == pagination.total_page && pagination.current_page != 1) {
          $scope.getRelated(1);
        }
      }
      return false;
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

    // 按钮状态更新
    $scope.checkBtnStatus = function () {

      // 获取到关系
      if (!!$scope.course.relation) {

        // 发布者
        if (!!$scope.course.relation.author) {

          // 课程预览
          $scope.course.btn.primary.text = '课程预览';
          $scope.course.btn.secondary.show = false;
        
        // 非发布者
        } else {

          // 课程免费
          if (!!$scope.course.info && !$scope.course.info.rel_price) {
            $scope.course.btn.primary.text = '立即学习';
            $scope.course.btn.secondary.show = false;
          }

          // 立即购买，免费试听
          if ($scope.course.relation.trade_status == -1) {
            $scope.course.btn.primary.text = '立即购买';
            $scope.course.btn.secondary.text = '免费试听';
            $scope.course.btn.secondary.type = 'audition';
          }

          // 立即购买，继续试听
          if ($scope.course.relation.trade_status == 0) {
            $scope.course.btn.secondary.text = '继续试听';
            $scope.course.btn.secondary.type = 'audition';
          }

          // 立即付款，继续试听
          if ($scope.course.relation.trade_status == 1) {
            $scope.course.btn.primary.text = '立即付款';
            $scope.course.btn.secondary.text = '继续试听';
            $scope.course.btn.secondary.type = 'audition';
          }

          // 继续学习，立即评价
          if ($scope.course.relation.trade_status == 2) {
            // 如果没有学习记录
            if (!$scope.course.relation.last_study_section_id) {
              $scope.course.btn.primary.text = '开始学习';
            } else {
              $scope.course.btn.primary.text = '继续学习';
            }
            $scope.course.btn.secondary.text = '立即评价';
            $scope.course.btn.secondary.show = true;
            $scope.course.btn.secondary.type = 'evaluate';
          }

          // 再次学习
          if ($scope.course.relation.trade_status == 3) {
            $scope.course.btn.primary.text = '再次学习';
            $scope.course.btn.secondary.show = false;
          }
        }
      }
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
          $scope.checkBtnStatus();
          if (!!callback && typeof callback == 'function') {
            callback();
          }
        }
      });
    };

    // 获取课程详情
    $scope.getDetail = function () {

      // 请求基本信息
      $scope.getBasicInfo();

      // 请求章节信息
      $scope.getSections();

      // 请求评论信息
      $scope.getComments();

      // 请求相关课程
      $scope.getRelated();

      // 请求同学列表
      $scope.getClassmates();

      // 请求订单关系
      $scope.getRelation();
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
      if (!!section.is_free) $scope.sections.free.push(section);

      // 直播节
      if (!!section.is_live) $scope.sections.live.push(section);

      if (section.id && $scope.section_id && section.id == $scope.section_id) {

        // 当前播放节
        $scope.sections.current = $scope.sections.all.length - 1;

        // 当前播放免费/节
        if (!!$scope.sections.free.length) {
          $scope.sections.current_free = $scope.sections.free.length - 1;
        };
      }

      // 没有免费课程供试听，隐藏次要按钮
      if (!$scope.sections.free.length) {
        $scope.course.btn.secondary.show = false;
      }
    };

    // 添加试听记录
    $scope.addExperience = function (section_id) {

      var section_id = section_id || $scope.sections.free[0].id;

      CommonProvider.promise({
        model: CourseModel,
        method: 'operation',
        params: { 
          method: 'experience',
          course_id: $scope.course_id 
        },
        success: function(){

          // 开始试听本课程第一节可以试听的节
          $location.path('/course/' + $scope.course_id + '/learn/' + section_id);
        }
      });
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

    // 主按钮点击逻辑
    $scope.primaryBtnEvent = function () {

      // 已登录
      if (!!$scope.course.relation) {

        // 发布者登录
        if (!!$scope.course.relation.author) {

          // 课程预览
          if (!!$scope.sections.all.length) {
            $location.path('/course/' + $scope.course_id + '/learn/' + $scope.sections.all[0].id);
          } else {
            $modal.error({
              message: '没有有效章节'
            });
          };
          
        // 非发布者
        } else {

          // 判断订单关系
          switch ($scope.course.relation.trade_status) {

            // 无试听/已试听，执行购买
            case 0:
            case -1:
              $scope.buy({course_id: $scope.course_id, is_free: !$scope.course.info.rel_price});
              break;

            // 未付款，跳转付款
            case 1:
              $location.path('/payment/' + $scope.course_id);
              break;

            // 已付款，继续播放
            case 2:

              // 若无学习记录，则从第一节开始
              if (!$scope.course.relation.last_study_section_id) {
                $location.path('/course/' + $scope.course_id + '/learn/' + $scope.sections.all[0].id);
              } else {
                $location.path('/course/' + $scope.course_id + '/learn/' + $scope.course.relation.last_study_section_id);
              }
              break;

            // 已评价，播放第一节有效视频
            case 3:

              // 如果存在有效章节
              if (!!$scope.sections.all.length) {
                $location.path('/course/' + $scope.course_id + '/learn/' + $scope.sections.all[0].id);
              } else {
                $modal.error({
                  message: '没有有效章节'
                });
              }
              break;
            default:
              console.log('执行弹窗登录');
              // 登录成功后获取最新的关系，并执行一次点击事件
              // $scope.loginGetRelation(function () {
              //   $scope.primaryBtnEvent();
              // });
              break;
          }
        }

      // 未登录
      } else {

        // 登录成功后获取最新的关系，并执行一次点击事件
        $scope.loginGetRelation(function () {
          $scope.primaryBtnEvent();
        });
      }
    };

    // 次按钮点击逻辑
    $scope.secondaryBtnEvent = function () {

      // 如果用户登录
      if (!!$scope.course.relation) {

        // 试听
        if ($scope.course.btn.secondary.type == 'audition') {

          // 确保免费节存在
          if (!!$scope.sections.free.length) {

            // 如果无试听记录，则写入试听记录（并跳至默认第一节免费节）
            if ($scope.course.relation.trade_status < 0) {
              $scope.addExperience();
              return;

            // 否则跳至试听上一次试听记录
            } else {
              $location.path('/course/' + $scope.course_id + '/learn/' + $scope.course.relation.last_study_section_id || $scope.sections.free[0].id);
            }
          }

        // 评价
        } else {
          $rootScope.goTo('detailTab');
          $rootScope.setTabActive(angular.element('#detailTab ul').scope(), 3);
        }

      // 未登录
      } else {

        // 获取到关系后回调执行二次点击
        $scope.loginGetRelation(function () {
          $scope.secondaryBtnEvent();
        });
      }
    };

    // 目录节点击逻辑
    $scope.sectionClickEvent = function (section) {
      
      // 已登录
      if (!!$scope.course.relation) {

        // 发布者/已付款/已评价/=直接播放
        if (!!$scope.course.relation.author || $scope.course.relation.trade_status == 2 || $scope.course.relation.trade_status == 3) {
          $location.path('/course/' + $scope.course_id + '/learn/' + section.id);
          return false;
        }

        // 本节免费 = 写入试听记录 + 跳转播放
        if (!!section.is_free) {

          // 如果还未试听，则写入记录并试听，否则直接播放
          if ($scope.course.relation.trade_status < 0) {
            $scope.addExperience(section.id);
          } else {
            $location.path('/course/' + $scope.course_id + '/learn/' + section.id);
          }
          return;
        }

        // 未购买 = 购买
        if ($scope.course.relation.trade_status < 1) {

          // 课程免费=购买跳转+播放 / 课程非免费=执行购买
          $scope.buy({ course_id: $scope.course_id, is_free: !$scope.course.info.rel_price, section_id: section.id});
          return false;
        }

        // 未付款
        if ($scope.course.relation.trade_status == 1) {
          $location.path('/payment/' + $scope.course_id);
        }

      // 未登录
      } else {

        // 获取到关系后回调执行二次点击
        $scope.loginGetRelation(function () {
          $scope.sectionClickEvent(section);
        });
      }
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

  }
]);