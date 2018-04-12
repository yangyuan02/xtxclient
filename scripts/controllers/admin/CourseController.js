/**
* CourseController Module
*
* Description
*/
angular.module('CourseController', ['Umeditor', 'Qupload', 'angular-video-player', 'angular-sortable-view', 'angular-related-select', 'CourseModel', 'CategoryModel', 'SectionModel', 'CourseService'])
.controller('CourseController', ['$scope', '$rootScope', '$state', '$location', '$stateParams', '$modal', 'CourseModel', 'CategoryModel', 'SectionModel', 'CourseService', 'CommonProvider', function($scope, $rootScope, $state, $location, $stateParams, $modal, CourseModel, CategoryModel, SectionModel, CourseService, CommonProvider) {

    /*----------------课程管理事件----------------*/
    $rootScope.player = {};
    $scope.search = {};
    $scope.course = {};
    $scope.course_id = $stateParams.course_id || false;
    $scope.categories = [];
    $scope.course_section = [];
    $scope.sections = [];
    $scope.sections_filter = [];

    // 过滤条件
    $scope.filter = {
      sort_id: 'all',
      x_status: 'all',
      is_live: 'all',
      status: 'all',
      category_id: 'all'
    };

    $scope.courseAction = {

      // 课程管理首页
      getIndex: function () {
        
        // 获取课程列表
        $scope.courseAction.getLists();

        // 获取课程分类
        $scope.courseAction.getCategory();
      },

      // 课程状态、分类筛选
      filterChanged: function() {

        $scope.courseAction.getLists();
      },

      // 获取课程列表
      getLists: function (page) {

        var get_params = {
          role: 'admin',
          page: page || 1,
          per_page: 16
        };

        var filters = $scope.filter;
        for (var key in filters){
          if (filters[key] != 'all') {
            get_params[key] = filters[key];
          }
        };

        // return;
        // console.log(get_params);

        CommonProvider.promise({
          model: CourseModel,
          method: 'get',
          params: get_params,
          success: function (course_list) {
            $scope.course_list = course_list;
          }
        });
      },

      // 获取分类列表
      getCategory: function (params) {
        CommonProvider.promise({
          model: CategoryModel,
          method: 'get',
          params: {
            role: 'admin',
            type: 1,
          },
          success: function (categories) {
            var categories = categories.result;
            var cate_lists = [];
            var pushCate = function (cates, prefix) {
              var prefix = prefix || '—';
              cates.forEach(function (cate) {
                if (!!cate.pid) cate.name = prefix + cate.name;
                cate_lists.push(cate);
                if (cate.children && !!cate.children.length) {
                  pushCate(cate.children, prefix + '——');
                }
              });
            };
            pushCate(categories);
            cate_lists.forEach(function (cate) {
              cate.children = null;
            });
            $scope.categories = cate_lists;
          }
        });
      },

      // 课程详情
      getItem: function () {
        CommonProvider.promise({
          model: CourseModel,
          method: 'item',
          params: { course_id: $scope.course_id, role: 'admin' },
          success: function (course) {

            $scope.course = course.result;
            $scope.course.organization_id = $scope.course.organization_id || undefined;

            // 请求分类数据
            $scope.courseAction.getCategory({ category_id: 0, type: 1 });
          }
        });
      },

      // 课程章节
      getSection: function () {
        var params = {
          course_id: $scope.course_id,
          role: 'admin'
        };
        CommonProvider.promise({
          model: SectionModel,
          method: 'get',
          params: params,
          success: function (course_section) {
            $scope.course_section = course_section.result;
            $scope.sections = angular.copy($scope.course_section);
          }
        });
      },

      // 课程搜索
      getSearch: function () {
        var params = [{
          field: 'name',
          operation: 'like',
          value: $scope.search.keyword
        }, {
          field: 'introduction',
          operation: 'like',
          value: $scope.search.keyword
        }, {
          field: 'description',
          operation: 'like',
          value: $scope.search.keyword
        }];
        CommonProvider.search({
          service: new CourseService(),
          method: 'search',
          params: params,
          success: function (_course_list) {
            $scope.course_list = _course_list;
          }
        });
      },

      // 录播视频审核
      audit: function (params) {
        $rootScope.section_local = params.section.section;
        $scope.section = angular.copy(params.section.section);
        $scope.section.status = 3;
        $scope.section.role = 'admin';
        $modal.confirm({
          title: '确认操作',
          message: '确定要审核通过该视频吗？',
          info: '本操作不可恢复',
          onsubmit: function () {
            CommonProvider.promise({
              model: SectionModel,
              method: 'put',
              params: $scope.section,
              success: function (_section) {
                $modal.success({
                  message: _section.message,
                });
                $rootScope.section_local.status = 3;
                delete $rootScope.section_local;
              },
              error: function (_section) {
                $modal.error({
                  message: _section.message,
                });
              }
            });
          }
        });
      },

      // 录播拒绝审核
      auditRefuse: function (params) {
        var section = params.section;
        var ismodel = params.ismodel;
        if (ismodel) {
          $rootScope.section_edit = section;
          $modal.custom({
            title: '《' + section.name + '》 - 拒绝审核',
            template_url: 'partials/admin/course/manage/section/video.html',
            callback: function () {
              $rootScope.section_edit = null;
              delete $rootScope.section_edit;
            }
          });
        } else {
          // console.log(params);
          var section = angular.copy($rootScope.section_edit);
          section.status = -3;
          section.role = 'admin';
          section.remark = params.remark;
          CommonProvider.promise({
            model: SectionModel,
            method: 'put',
            params: section,
            success: function (_section) {
              $rootScope.section_edit.status = -3;
              $rootScope.section_edit.remark = section.remark;
              $rootScope.modal.close();
              $modal.success({ message: _section.message });
            },
            error: function (_section) {
              $rootScope.modal.close();
              $modal.error({
                message: _section.message,
              });
            }
          });
        }
      },

      // 直播信息审核
      liveAudit: function (params) {
        var section = params.section;
        var ismodel = params.ismodel;
        if (ismodel) {
          section.live = {};
          section.live.duration = {};
          section.live.duration.hours = parseInt(section.live_duration / 60);
          section.live.duration.moments = parseInt(section.live_duration % 60);
          $rootScope.section_edit = section;
          $modal.custom({
            title: '《' + section.name + '》 - 直播信息预览',
            template_url: 'partials/admin/course/manage/section/live.html'
          });
        } else {
          var isaudit = params.audit.pass;
          var remark  = params.audit.remark;
          section.live_status = isaudit ? 1 : -1;
          section.role = 'admin';
          if (!isaudit) section.remark = remark;
          // return console.log(section);
          CommonProvider.promise({
            model: SectionModel,
            method: 'put',
            params: section,
            success: function (_section) {
              $rootScope.modal.close();
              $modal.success({ message: '操作成功' });
            },
            error: function (_section) {
              $rootScope.modal.close();
              $modal.error({ message: _section.message });
            },
            callback: function () {
              $rootScope.section_edit = null;
            }
          });

        }
      },

      // 视频预览
      preview: function (section_id) {
        var params = {
          role: 'admin',
          section_id: section_id
        };
        // 获取视频地址
        CommonProvider.promise({
          model: SectionModel,
          method: 'getVideos',
          params: params,
          success: function (videos) {

            var video = videos.result;
            var player = {};
            player.modal = 1;
            player.urls = video.urls;
            player.is_live = video.is_live;
            player.live_status = video.live_status;

            // 启动播放器
            $rootScope.player = player;

            // 弹出播放器
            $modal.custom({
              title: '课程预览',
              template: '<style>.modal-body{overflow:hidden;}.video-player .video-js{width:100%;height:320px;}</style>' + 
                        '<div video-player data="$root.player"></div>',
              callback: function () {
                $rootScope.player = null;
                delete $rootScope.player;
              }
            });
          }
        });
      },

      // 章节状态、类型筛选
      sectionFilterChanged: function() {
        var status = $scope.filter.section_status;
        var type = $scope.filter.section_type;
        if (status == 'all' && type == 'all') return $scope.sections = $scope.course_section;
        var chapters = angular.copy($scope.course_section);
        var f_chapters = [];
        chapters.forEach(function (chapter) {
          var sections = [];
          chapter.children.forEach(function (section) {

            // 全部类型/单个当前类型
            if (type == 'all' || section.is_live == type) {

              // 全部状态
              if (status == 'all') sections.push(section);

              // 未审核
              if (status == 0) {
                if (!!section.is_live) {
                  if (section.live_status == 0) sections.push(section);
                } else { if (section.status < 3) sections.push(section) }
              }

              // 审核成功
              if (status == 1) {
                if (!!section.is_live) {
                  if (section.live_status > 0) sections.push(section);
                } else { if (section.status == 3) sections.push(section) }
              }

              // 审核失败
              if (status == -1) {
                if (!!section.is_live) {
                  if (section.live_status == -1) sections.push(section);
                } else { if (section.status == -3) sections.push(section) }
              }
            }
          });
          chapter.children = sections;
          // if (!!sections.length) 
          f_chapters.push(chapter);
        });
        $scope.sections = f_chapters;
      },

      // 编辑课程
      edit: function () {
        $scope.course.role = 'admin';
        CommonProvider.promise({
          model: CourseModel,
          method: 'put',
          params: { new: $scope.course },
          success: function (_course) {
            $modal.success({
              message: _course.message,
              callback: function () {
                // $location.path('/course/manage/list/index');
              }
            });
          },
          error: function (_course) {
            $modal.error({
              message: _course.message
            });
          }
        });
      },

      // 课程图片上传后回调
      getUploadThumb: function (data) {
        if (data) {
          $scope.course.thumb = data.key;
        }
      },

      // 分类选择改变回调
      courseCateChange: function (select) {
        $scope.course.category_id = select.ckdSelectId;
      },

      // 删除课程
      del: function (params) {
        if (params.batch && $scope.course_list.result.checked().length == 0) {
          return $modal.error({ message: '至少需要选中一门课程' });
        };
        $modal.confirm({
          title: '确认删除',
          message: params.batch ? '确定要删除选中课程吗？' : '确定要删除此课程吗？',
          info: '课程删除操作不可撤销',
          onsubmit: function () {
            CommonProvider.promise({
              model: CourseModel,
              method: params.batch ? 'delete' : 'del',
              params: params.batch ? $scope.course_list.result.checked() : params.course,
              success: function (_course) {
                $modal.success({ message: _course.message });
              },
              error: function (_course) {
                $modal.error({ message: _course.message });
              }
            });
          }
        });
      },

      // 课程下架
      disable: function (params) {
        if (params.batch && $scope.course_list.result.checked().length == 0) {
          $modal.error({ message: '至少需要选中一门课程' });
          return false;
        };
        $modal.confirm({
          title: '确认操作',
          message: params.batch ? '确定要下架选中课程吗？' : '确定要下架此课程吗？',
          info: params.batch ? '下架后这些课程将不再前台显示' : '下架后该课程将不再前台显示',
          onsubmit: function () {
            CommonProvider.promise({
              model: CourseModel,
              method: 'disable',
              params: params.batch ? $scope.course_list.result.checked() : params.course,
              success: function (_course) {
                $modal.success({
                  message: _course.message
                });
              },
              error: function (_course) {
                $modal.error({
                  message: _course.message
                });
              }
            });
          }
        });
      },

      // 课程上架
      enable: function (params) {
        if (params.batch && $scope.course_list.result.checked().length == 0) {
          $modal.error({ message: '至少需要选中一个课程' });
          return false;
        };
        $modal.confirm({
          title: '确认操作',
          message: params.batch ? '确定要上架选中课程吗？' : '确定要上架此课程吗？',
          info: params.batch ? '上架后选中课程将恢复正常购买' : '上架后该课程将恢复正常购买',
          onsubmit: function () {
            CommonProvider.promise({
              model: CourseModel,
              method: 'enable',
              params: params.batch ? $scope.course_list.result.checked() : params.course,
              success: function (_course) {
                $modal.success({ message: _course.message });
              },
              error: function (_course) {
                $modal.error({ message: _course.message });
              }
            });
          }
        });
      },

    };
  }
]);