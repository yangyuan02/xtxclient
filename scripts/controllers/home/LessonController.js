/*
* LessonController Module
*
* Description
*/

angular.module('LessonController', ['angular.validation', 'angular.validation.rule', 'Qupload', 'Umeditor', 'angular-sortable-view', 'angular-related-select', 'SectionModel', 'CategoryModel'])
.controller('LessonController', ['$rootScope', '$scope', '$stateParams', '$location', '$localStorage', '$modal', 'CommonProvider', 'AuthProvider', 'SectionModel', 'CategoryModel', 'CourseModel', 'OrganizationModel',
  function ($rootScope, $scope, $stateParams, $location, $localStorage, $modal, CommonProvider, AuthProvider, SectionModel, CategoryModel, CourseModel, OrganizationModel) {

    // 首次载入时验证登录状态
    $rootScope.checkLogin();

    // 链接产生变动时验证登录状态
    $scope.$on('$locationChangeStart', function () {
      $rootScope.checkLogin();
    });

    // 初始化
    $scope.course = {};
    $scope.course_id = $stateParams.course_id || false;
    $scope.categories = [];
    $scope.course.category_id = 0;

    // 分类选择改变回调
    $scope.selectChange = function (select) {
      $scope.course.category_id = select.ckdSelectId;
    };

    // 窗口关闭检测
    window.onbeforeunload = function(event) {
      if ($rootScope.uploading) {
        event.returnValue = '当前存在正在上传的视频，确定要退出吗？';
      }
    };

    // 发布课程初始化
    $scope.courseInit = function () {
      AuthProvider.check(function (user) {
        $scope.user = user;
      });
    };

    // 添加/编辑课程
    $scope.editCourse = function () {

      // 编辑课程
      if ($scope.course_id) {

        // 获取课程信息
        CommonProvider.promise({
          model: CourseModel,
          method: 'item',
          params: { course_id: $scope.course_id, role: 'teacher' },
          success: function (course) {

            // 如果本课程没有存在已选机构，则置为未选择已适应表单检查
            $scope.course = course.result;
            $scope.course.organization_id = $scope.course.organization_id || undefined;

            // 请求分类数据
            $scope.getCategorys();

            // 请求机构列表
            $scope.getOrganizations();
          }
        });

      // 新增课程
      } else {

        // 表单数据初始化
        $scope.course.category_id = 0;
        $scope.course.thumb = '';

        // 请求所有分类
        $scope.getCategorys();

        // 请求机构列表
        $scope.getOrganizations();
      }
    };

    // 获取分类菜单
    $scope.getCategorys = function (callback) {
      CommonProvider.promise({
        model: CategoryModel,
        method: 'get',
        params: {
          category_id: 0,
          type: 1
        },
        success: function (categories) {
          $scope.categories = categories.result;
          if (callback && typeof callback == 'function') callback($scope.categories);
        }
      });
    };

    // 获取机构列表
    $scope.getOrganizations = function () {
      CommonProvider.promise({
        model: OrganizationModel,
        method: 'relation',
        params: {
          role: 'teacher',
          status: '2,3,4,5',
          page: 1,
          per_page: 100
        },
        success: function (organizations) {
          $scope.organizations = organizations.result;
        }
      });
    };

    // 更新/发布课程
    $scope.updateCourse = function () {

      var course = {
        name: $scope.course.name,
        thumb: $scope.course.thumb,
        rel_price: $scope.course.rel_price,
        description: $scope.course.description,
        introduction: $scope.course.introduction,
        category_id: $scope.course.category_id,
        organization_id: $scope.course.organization_id,
        role: 'teacher'
      };

      if ($scope.course_id) {
        course.id = $scope.course_id;
      }

      CommonProvider.promise({
        model: CourseModel,
        method: $scope.course_id ? 'put' : 'add',
        params: $scope.course_id ? { new: course } : course,
        success: function (course) {

          // 修改课程
          if ($scope.course_id) {
            $modal.success({
              message: '课程编辑成功',
              callback: function () {
                $location.path('teacher/course/list');
              }
            });

          // 发布课程，跳转到此课程的章节编辑页面
          } else {
            $modal.success({
              message: '课程发布成功',
              callback: function () {
                $location.path('teacher/course/section/edit/' + course.result.id );
              }
            });
          }
        },
        error: function (course) {
          $modal.error({ message: course.message });
        }
      });
    };

    // 课程缩略图上传结果回调函数
    $scope.getUploadThumb = function (data) {
      if (data) {
        $scope.course.thumb = data.key;
      }
    };

    // 已开课程初始化
    $scope.courseInit = function () {
      AuthProvider.check(function (user) {
        $scope.user = user;
        if (user.is_teacher) {
          if (!$scope.all_courses) {
            $scope.all_courses = [
              {
                name: '全部课程',
                x_status: 'all',
                sort: 1
              }, {
                name: '上架中',
                x_status: '1',
                sort: 2
              }, {
                name: '已下架',
                x_status: '0',
                sort: 3
              }
            ];
          };
        }
      });
    };

    // 获取已开课程
    $scope.getCourses = function (params) {

      $rootScope.toTop();

      var get_params = {
        role: 'teacher',
        user_id: 1,
        per_page: 6,
        sort_id: 1,
        page: params.page || 1
      };

      if (params.x_status != undefined) {
        if (params.x_status != 'all') {
          get_params.x_status = params.x_status;
        }
      }

      CommonProvider.promise({
        model: CourseModel,
        method: 'get',
        params: get_params,
        success: function (courses) {
          $scope.all_courses.find(params.x_status, 'x_status').courses = courses;
        }
      });
    };

    // 课程操作-选中值检测
    $scope.courseEvent = function (callback) {
      var ids = $scope.all_courses.find(true, 'active').courses.result.checked();
      if (!ids.length) {
        $modal.error({ message: '无有效选中课程用于操作' });
        return false;
      } else {
        callback(ids);
      }
    };

    // 课程操作，更新全部数据
    $scope.refreshCourses = function () {
      $scope.getCourses({ x_status: 'all', page: $scope.all_courses.find('all', 'x_status').courses.pagination.current_page });
      $scope.getCourses({ x_status: '0', page: $scope.all_courses.find('0', 'x_status').courses.pagination.current_page });
      $scope.getCourses({ x_status: '1', page: $scope.all_courses.find('1', 'x_status').courses.pagination.current_page });
    };

    // 课程列表-上架
    $scope.sellCourse = function () {
      $scope.courseEvent(function (ids) {
        $modal.confirm({
          title: '确认操作',
          message: '确定要上架这些课程吗？',
          onsubmit: function () {
            CommonProvider.promise({
              model: CourseModel,
              method: 'enable',
              params: ids,
              success: function (course) {
                $modal.success({ message: '成功上架' + course.result + '个课程' });
                $scope.all_courses.setAttr('check_all', false);
                $scope.refreshCourses();
              },
              error: function (course) {
                $modal.error({ message: course.message });
              }
            });
          }
        });
      });
    };

    // 课程列表-下架
    $scope.delistingCourse = function () {
      $scope.courseEvent(function (ids) {
        $modal.confirm({
          title: '确认操作',
          message: '确定要下架这些课程吗？',
          onsubmit: function () {
            CommonProvider.promise({
              model: CourseModel,
              method: 'disable',
              params: ids,
              success: function (course) {
                $modal.success({ message: '成功下架' + course.result + '个课程' });
                $scope.all_courses.setAttr('check_all', false);
                $scope.refreshCourses();
              },
              error: function (course) {
                $modal.error({ message: course.message });
              }
            });
          }
        });
      });
    };

    // 课程列表-删除
    $scope.delCourse = function () {
      $scope.courseEvent(function (ids) {
        $modal.confirm({
          title: '确认操作',
          message: '确定要删除这些课程吗？',
          info: '删除后该课程所有相关信息将不复存在',
          onsubmit: function () {
            CommonProvider.promise({
              model: CourseModel,
              method: 'delete',
              params: ids,
              success: function (course) {
                $modal.success({ message: '成功删除' + course.result + '个课程' });
                $scope.all_courses.setAttr('check_all', false);
                $scope.refreshCourses();
              },
              error: function (course) {
                $modal.error({ message: course.message });
              }
            });
          }
        });
      });
    };

    // 获取章节列表和课程信息
    $scope.editSection = function () {
      if (!$scope.course_id) {
        $modal.error({
          message: '请您选择课程添加章节'
        });
        $location.path('teacher/course/list');
        return false;
      } else {
        // 获取课程基本信息
        CommonProvider.promise({
          model: CourseModel,
          method: 'item',
          params: { course_id: $scope.course_id, role: 'teacher' },
          success: function (course) {
            $scope.course = course.result;
            if (!$scope.course.rel_price) $scope.chapters.setAttr('is_free', 1, 'children');
          }
        });
        // 获取章节信息
        CommonProvider.promise({
          model: SectionModel,
          method: 'get',
          params: {
            role: 'teacher',
            course_id: $scope.course_id
          },
          success: function (chapters) {
            // console.log(chapters);
            $scope.chapters = chapters.result;
            if (!$scope.chapters.length) {
              $scope.addChapter();
            }
          },
          error: function (chapters) {
            $modal.error({ message: chapters.message });
          }
        });
      }
    };

    // 添加章
    $scope.addChapter = function () {
      var chapter = {
        name: '',
        course_id: $scope.course_id,
        pid: 0,
        is_free: Number(!$scope.course.rel_price),
        sort: $scope.chapters.length + 1
      };
      $scope.chapters.push(chapter);
    };

    // 添加节
    $scope.addSection = function (chapter) {
      var section = {
        name: '',
        course_id: $scope.course_id,
        description: '',
        pid: chapter.chapter.id,
        is_free: !!chapter.chapter.is_free || 0,
        status: 0,
        sort: chapter.chapter.children ? chapter.chapter.children.length + 1 : 1
      };
      if (!section.pid) {
        $modal.error({ message: '请先完善该章内容' });
        return false;
      };
      chapter.chapter.children = chapter.chapter.children || [];
      chapter.chapter.children.push(section);
      chapter.chapter.open = true;
    };

     // 更新/添加章
    $scope.updateChapter = function (chapter) {
      var _chapter = {
        pid: 0,
        name: chapter.name,
        sort: chapter.sort,
        is_free: Number(chapter.is_free),
        course_id: $scope.course_id
      };
      if (chapter.id) _chapter.id = chapter.id;
      CommonProvider.promise({
        model: SectionModel,
        method: _chapter.id ? 'put' : 'add',
        params: _chapter,
        success: function (__chapter) {
          var index = $scope.chapters.indexOf(chapter);
          angular.extend($scope.chapters[index], __chapter.result);
          $scope.chapters[index].tooltit = _chapter.id ? '章节信息更新成功' : '章节添加成功';
        },
        error: function (__chapter) {
          $modal.error({ message: __chapter.message });
        }
      });
    };

    // 更新/添加节
    $scope.updateSection = function (section) {
      var _section = {
        pid: section.section.pid,
        name: section.section.name,
        sort: section.section.sort,
        is_free: section.section.is_free,
        is_live: section.section.is_live,
        course_id: $scope.course_id
      };
      if (_section.is_live) {
        _section.live_at = section.section.live_at;
        _section.live_duration = section.section.live_duration;
      };
      if (section.section.id) _section.id = section.section.id;
      // console.log(_section);
      CommonProvider.promise({
        model: SectionModel,
        method: _section.id ? 'put' : 'add',
        params: _section,
        success: function (__section) {
          var index = section.$parent.$parent.chapter.children.indexOf(section.section);
          angular.extend(section.$parent.$parent.chapter.children[index], __section.result);
          section.section.status = section.section.status || 0;
          section.section.live_status = 0;
          section.section.tooltit = _section.id ? '本节信息更新成功' : '成功添加本节';
        },
        error: function (__section) {
          $modal.error({ message: __section.message });
        }
      });
    };

    // 设置课程节免费状态
    $scope.setSectionFree = function (section) {
      if ($scope.course.rel_price <= 0) return false;
      if (!section.name || !section.id) {
        section.is_free = 0;
        $modal.error({  message: '请先完善本节内容' });
        return false;
      };
      CommonProvider.promise({
        model: SectionModel,
        method: 'put',
        params: {
          id: section.id,
          name: section.name,
          is_free: section.is_free,
        }
      });
    };

    // 设置直播查看时间情况
    $scope.setSectionLive = function (section) {
      if (!section.section.is_live) return false;
      var is_add = section.section.id == undefined;
      var live_at = section.section.live_at;
      var live_duration = section.section.live_duration;
      if (is_add && (!live_at || !live_duration || !(moment(live_at) > moment()))) {
        $scope.updateSectionLiveInfo({ modal: false, section: section });
      };
    };

    // 删除章
    $scope.delChapter = function (chapter) {
      $modal.confirm({
        title: '是否真的要删除',
        message: '确定要删除本章吗？',
        info: '如果删除，章所属课程及视频也同时将被删除',
        onsubmit: function () {
          // 如果是未保存的章
          if (!chapter.id) {
            $scope.chapters.remove(chapter);
            return false;
          }
          // 请求
          CommonProvider.promise({
            model: SectionModel,
            method: 'del',
            params: { section_id: chapter.id },
            success: function (_chapter) {
              $scope.chapters.remove(chapter);
            }
          });
        }
      });
    };

    // 删除节
    $scope.delSection = function (section) {
      $modal.confirm({
        title: '是否真的要删除',
        message: '确定要删除本节吗？',
        info: '如果删除，删除后本节视频也将会被删除',
        onsubmit: function () {
          // 如果是未保存的节
          if (!section.section.id) {
            section.$parent.$parent.chapter.children.remove(section.section);
            return false;
          }
          // 请求
          CommonProvider.promise({
            model: SectionModel,
            method: 'del',
            params: { section_id: section.section.id },
            success: function (_chapter) {
              section.$parent.$parent.chapter.children.remove(section.section);
            }
          });
        }
      });
    };

    // 视频预览
    $scope.sectionPreview = function (section) {

      // 过滤
      if (!section.id) {
        $modal.error({ message: '参数异常' });
        return false;
      }

      // 请求视频
      CommonProvider.promise({
        model: SectionModel,
        method: 'getVideos',
        params: { section_id: section.id },
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
        },
        error: function (videos) {
          $modal.warning({ message: videos.message });
        }
      });
    };

    // 更新排序
    $scope.sectionSort = function ($item, $partFrom, $partTo, $indexFrom, $indexTo) {
      var sorts = [],sort;
      for (var i = 0; i < $partTo.length; i++) {
        sort = {};
        sort.data = {};
        sort.id = $partTo[i].id;
        sort.data.sort = i;
        sorts.push(sort);
      };
      SectionModel.sort(sorts);
    };

    // 修改直播信息弹窗初始化
    $scope.updateSectionInit = function () {
      var duration = $rootScope.section_local.live_duration;
      var live_at = $rootScope.section_local.live_at;
      $scope.live = {};
      $scope.live.at = live_at ? moment(live_at) : moment();
      $scope.live.duration = {};
      $scope.live.duration.hours = parseInt(duration / 60);
      $scope.live.duration.moments = duration % 60;
      $scope.minDate = moment();
      $scope.maxDate = moment().add(30, 'days');
    };

    // 修改/完善直播（时间）信息
    $scope.updateSectionLiveInfo = function (params) {
      if (!params.modal) {
        $rootScope.section_edit = params.section;
        $rootScope.section_local = angular.copy(params.section.section);
        $modal.custom({
          title: (params.edit ? '修改' : '完善') + '直播信息 - 《' + ( params.section.section.name || '新发布课程' ) +  '》',
          template_url: '/partials/home/teacher/course/section-live-info.html',
          callback: function () {
            var section = $rootScope.section_edit;
            var is_add = section.section.id == undefined;
            var live_at = section.section.live_at;
            var live_duration = section.section.live_duration;
            if (is_add && (!live_at || !live_duration || !(moment(live_at) > moment()))) {
              $rootScope.section_edit.section.is_live = 0;
              return false; 
            };
            $rootScope.section_edit = null;
            delete $rootScope.section_local;
          }
        })
      } else {
        $rootScope.section_local.live_at = params.live.at.format('YYYY-MM-DD HH:mm:ss');
        $rootScope.section_local.live_duration = (params.live.duration.hours * 60) + params.live.duration.moments;
        if (!$rootScope.section_edit.section.id) {
          $rootScope.section_edit.section.live_at = $rootScope.section_local.live_at;
          $rootScope.section_edit.section.live_duration = $rootScope.section_local.live_duration;
          $rootScope.modal.close();
          return false;
        };
        CommonProvider.promise({
          model: SectionModel,
          method: 'put',
          params: $rootScope.section_local,
          success: function (section) {
            $rootScope.section_edit.section.live_at = $rootScope.section_local.live_at;
            $rootScope.section_edit.section.live_duration = $rootScope.section_local.live_duration;
            $rootScope.section_edit.section.live_status = 0;
            $rootScope.modal.close();
          },
          error: function (section) {
            $modal.error({ message: section.message });
          }
        });
      };
    };

    // 直播节初始化/关闭操作
    $scope.liveSectionAction = function(params) {
      var section = params.section;
      var is_init = params.init;
      var live_ok = moment(section.live_at) > moment();
      if (is_init && (!section.name || !section.id || !section.live_duration || !live_ok)) {
        return $modal.error({  message: '请先完善本节信息' });
      };
      $modal.confirm({
        title: '确认操作',
        message: is_init ? '确定要初始化本节吗？' : '确定要结束本节直播吗？',
        info: is_init ? '本操作将立即创建直播间及聊天室，且不可撤销' : '本操作将关闭直播间及聊天室，且不可撤销',
        onsubmit: function () {
          CommonProvider.promise({
            model: SectionModel,
            method: is_init ? 'initLiveSection' : 'closeLiveSection',
            params: { section_id: section.id },
            result: function (status) {
              if (status.code == 1) {
                // console.log(status);
                if (is_init) section.live_status = 1.1;
                if (!is_init) section.live_status = 3;
                $modal.success({ message: status.message });
              } else {
                $modal.error({ message: status.message });
              }
            }
          });
        }
      });
    };

    // 审核失败弹窗
    $scope.sectionVerifyFailed = function (section) {
      // console.log(section);
      $modal.custom({
        title: '《' + section.name +  '》 - ' + '审核失败',
        template: '<div>' +
                    '<div class="col-xs-offset-1 col-xs-10">' + 
                      '<h4>本节审核失败，失败原因：<span class="text-danger">' + (section.remark || '暂无') + '</span></h4>' + 
                      '<h4 class="text-muted">建议更正本节信息或重新上传视频，会重新发起审核</h4>' + 
                    '</div>' + 
                    '<div class="col-xs-12">' +
                      '<br>' +
                    '</div>' +
                  '</div>'
      });
    };

    // 跳转回放
    $scope.toLiveSectionLearn = function (section) {
      $location.path('course/' + $scope.course_id + '/learn/' + section.id);
    };

    // 节格式化
    $scope.getLiveSectionRtmp = function (section) {
      CommonProvider.promise({
        model: SectionModel,
        method: 'getLiveUpstream',
        params: { section_id: section.id },
        result: function (rtmp) {
          if (rtmp.code == 1) {
            $modal.custom({
              title: '章节 - 《' + section.name +  '》' + '推流地址',
              template: '<div>' +
                          '<div class="col-xs-12">' +
                            '<br>' + 
                          '</div>' +
                          '<div class="col-xs-12">' +
                            '<div class="col-xs-offset-1 col-xs-6">' + 
                              '<h4>推流地址：<a href="" ng-click="$root.copyLink(\'' + rtmp.result.publish_url + '\')">( 点击复制 )</a></h4>' + 
                              '<p>' + rtmp.result.publish_url + '</p>' +
                            '</div>' + 
                          '</div>' +
                          '<div class="col-xs-12">' +
                            '<div class="col-xs-offset-1 col-xs-6">' + 
                              '<h4>推流秘钥：<a href="" ng-click="$root.copyLink(\'' + rtmp.result.publish_key + '\')">( 点击复制 )</a></h4>' + 
                              '<p>' + rtmp.result.publish_key + '</p>' +
                            '</div>' + 
                          '</div>' +
                          '<div class="col-xs-12">' +
                            '<div class="col-xs-offset-1 col-xs-6">' + 
                              '<h4>RoomId：<a href="" ng-click="$root.copyLink(\'' + rtmp.result.room_id + '\')">( 点击复制 )</a></h4>' + 
                              '<p>' + rtmp.result.room_id + '</p>' +
                            '</div>' + 
                          '</div>' +
                          '<div class="col-xs-12">' +
                            '<div class="col-xs-offset-1 col-xs-6">' + 
                              '<h4 class="text-danger">推流教程：</h4>' + 
                              '<p>官方客户端：OBS</p>' +
                            '</div>' + 
                          '</div>' +
                          '<div class="col-xs-12">' +
                            '<br>' +
                          '</div>' +
                        '</div>'
            });
          } else {
            $modal.error({ message: rtmp.message });
          }
        }
      });
    };

    $rootScope.copyLink = function (link) {
      window.prompt("按下Ctrl+C, 复制地址", link);
    };

  }
]);