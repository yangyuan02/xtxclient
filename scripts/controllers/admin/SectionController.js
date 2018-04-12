/**
* SectionController Module
*
* Description
*/
angular.module('SectionController', ['SectionModel'])
.controller('SectionController', ['$scope', '$rootScope', '$modal', '$state', '$stateParams', 'SectionModel', 'CommonProvider', function($scope, $rootScope, $modal, $state, $stateParams, SectionModel, CommonProvider) {

    $scope.filter = {
      status: 'all',
      is_free: 'all',
      is_live: 'all',
      live_status: 'all',
      order_field: 'all'
    };

    /*----------------章节管理事件----------------*/
    $scope.sectionAction = {

      // 过滤条件改变
      filterChanged: function () {
        if($scope.filter.is_live == 'all') {
          $scope.filter.status = 'all';
          $scope.filter.live_status = 'all';
        };
        if ($scope.filter.is_live == '1') $scope.filter.status = 'all';
        if ($scope.filter.is_live == '0') $scope.filter.live_status = 'all';
        $scope.sectionAction.getLists();
      },

      // 获取章节列表
      getLists: function(page) {
        var get_params = {
          role: 'admin',
          out_type: 'paginate',
          page: page || 1,
          per_page: 16,
          order_method: 'desc'
        };

        var filters = $scope.filter;
        for (var key in filters){
          if (filters[key] != 'all') {
            get_params[key] = filters[key];
          }
        };

        // return console.log(get_params);
        CommonProvider.promise({
          model: SectionModel,
          method: 'get',
          params: get_params,
          success: function (section_list) {
            // console.log(section_list);
            $scope.section_list = section_list;
          }
        });
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
            $rootScope.player = player;
            $modal.custom({
              title: '章节预览',
              template: '<style>.modal-body{overflow:hidden;}.video-player .video-js{width:100%;height:320px;}</style>' + 
                        '<div video-player data="$root.player"></div>',
              callback: function () {
                $rootScope.player = null;
                delete $rootScope.player;
              }
            });
          },
          error: function (err) {
            $rootScope.modal.error({ message: err.message });
          }
        });
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

      // 批量删除章节
      del: function (params) {
        var isbatch = params.batch;
        var checked = $scope.section_list.result.checked();
        if (isbatch && checked.length == 0) {
          return $modal.error({ message: '至少需要选中一门章节' });
        };
        $modal.confirm({
          title: '确认删除',
          message: isbatch ? '确定要删除选中章节吗？' : '确定要删除此章节吗？',
          info: '章节删除操作不可撤销',
          onsubmit: function () {
            // console.log(SectionModel);
            CommonProvider.promise({
              model: SectionModel,
              method: isbatch ? 'delete' : 'del',
              params: isbatch ? checked : { section_id: params.section.id },
              success: function (_section) {
                isbatch || $scope.section_list.result.remove(params.section);
                isbatch && $scope.sectionAction.getLists($scope.section_list.pagination.current_page);
                $modal.success({ message: _section.message });
              },
              error: function (_section) {
                $modal.error({ message: _section.message });
              }
            });
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

    };
  }
]);