/**
*
* TeacherService Module
*
* Description
*
*/
angular.module('TeacherService', [])
.service('TeacherService', ['$resource', 'appConfig',
  function($resource, appConfig){
    return $resource(appConfig.apiUrl + '/teacher/:target_type', {}, {

      // 获取收入明细列表
      incomeDetail: {
        method: 'GET',
        url: appConfig.apiUrl + '/teacher/income/detail'
      },

      // 获取每日收入统计
      incomeDaily: {
        method: 'GET',
        url: appConfig.apiUrl + '/teacher/income/daily'
      },

      /*

      // 个人中心首页
      get_index: {
        method: 'GET',
        url: appConfig.apiUrl + '/user/index'
      },

      // 获取待办事项
      get_to_do_list: {
        method: 'GET',
        url: appConfig.apiUrl + '/user/teacher/to_do_list'
      },

      // 获取待办事项
      get_msg_list: {
        method: 'GET',
        url: appConfig.apiUrl + '/user/teacher/announcement'
      },

      // 更新基本资料
      update: { 
        method:'PUT',
        params: {
          token: '@token'
        },
        url: appConfig.apiUrl + '/organization/:organization_id'
      },

      // 已售课程
      get_trade: {
        method: 'GET',
        params: {
          token: '@token',
          status: '@status',
          is_study_finish: '@is_study_finish'
        },
        url: appConfig.apiUrl + '/trade/list/teacher'
      },

      // 获取评价列表
      get_rates: {
        method: 'GET',
        params: {
          token: '@token',
          type: '@type'
        },
        url: appConfig.apiUrl + '/course_comment/list/teacher/:user_id'
      },

      // 回复买家评价
      post_reply_rate: {
        method: 'POST',
        params: {
          token: '@token'
        },
        url: appConfig.apiUrl + '/course_comment/:comment_id/reply'
      },

      // 删除我的回复
      del_my_reply: {
        method: 'DELETE',
        params: {
          token: '@token'
        },
        url: appConfig.apiUrl + '/course_comment/:comment_id'
      },

      // 请求课程类别
      get_organization_type: {
        method: 'GET',
        url: appConfig.apiUrl + '/category?type=2'
      },

      // 添加新的学校(基础信息)
      post_new_organization: {
        method: 'POST',
        url: appConfig.apiUrl + '/organization/register'
      },

      // 添加学校认证信息
      post_audit_organization: {
        method: 'POST',
        url: appConfig.apiUrl + '/organization/:organization_id/audit'
      },

      // 更新学校认证信息
      update_audit_organization: {
        method: 'PUT',
        url: appConfig.apiUrl + '/organization/:organization_id/audit'
      },

      // 获取与我有关系的机构的列表
      get_organization_list: {
        method: 'GET',
         params: {
          token: '@token',
          type: '@type',
          per_page: '@per_page',
          page: '@per_page'
        },
        url: appConfig.apiUrl + '/organization/mylist'
      },

      // 获取我管理的学校的基本信息
      get_organization_info: {
        method: 'GET',
         params: {
          token: '@token'
        },
        url: appConfig.apiUrl + '/organization/:organization_id/info'
      },

      // 获取我管理的学校的认证信息
      get_organization_audit: {
        method: 'GET',
         params: {
          token: '@token'
        },
        url: appConfig.apiUrl + '/organization/:organization_id/audit'
      },

      // 获取我管理的学校的老师列表
      get_organization_teacher: {
        method: 'GET',
         params: {
          from: '@from',
          status: '@status',
          per_page: '@per_page',
          page: '@page'
        },
        url: appConfig.apiUrl + '/organization/:organization_id/teacher'
      },

      // 管理员修改低级别用户资料
      edit_teacher_info: {
        method: 'PUT',
         params: {
          token: '@token'
        },
        url: appConfig.apiUrl + '/organization/:organization_id/teacher/:edit_id'
      },

      // 管理员删除用户关系
      del_teacher: {
        method: 'DELETE',
         params: {
          token: '@token'
        },
        url: appConfig.apiUrl + '/organization/:organization_id/teacher/:edit_id'
      },

      // 转让创始人身份
      attorn_founder: {
        method: 'PUT',
         params: {
          token: '@token'
        },
        url: appConfig.apiUrl + '/organization/:organization_id/admin/attornFounder/:user_id'
      },

      // 最高管理员设置用户为管理员
      add_admin: {
        method: 'PUT',
         params: {
          token: '@token'
        },
        url: appConfig.apiUrl + '/organization/:organization_id/admin/setUserToAdmin/:user_id'
      },

      // 最高管理员取消管理员
      del_admin: {
        method: 'PUT',
         params: {
          token: '@token'
        },
        url: appConfig.apiUrl + '/organization/:organization_id/admin/cancelAdmin/:user_id'
      },

      // 管理员邀请老师
      post_invite_teacher: {
        method: 'POST',
         params: {
          token: '@token'
        },
        url: appConfig.apiUrl + '/organization/:organization_id/teacher/invite/:phone'
      },

      // 管理员再次邀请老师
      post_again_invite_teacher: {
        method: 'PUT',
         params: {
          token: '@token'
        },
        url: appConfig.apiUrl + '/organization/:organization_id/teacher/reinvite/:invite_id'
      },

      // 老师加入机构时搜索机构
      search_organization_join: {
        method: 'GET',
        params: {
          page: '@page',
          detail: '@detail',
          keyword: '@keyword',
          per_page: '@per_page'
        },
        url: appConfig.apiUrl + '/search/:search_type'
      },

      // 管理员接受老师申请
      agree_teacher: {
        method: 'PUT',
        params: {
          token: '@token'
        },
        url: appConfig.apiUrl + '/organization/:organization_id/teacher/agree/:user_id'
      },

      // 管理员拒绝老师申请
      refuse_teacher: {
        method: 'POST',
        params: {
          token: '@token'
        },
        url: appConfig.apiUrl + '/organization/:organization_id/teacher/refuse/:refuse_id'
      },

      // 管理员获取机构公告
      get_organization_announcement: {
        method: 'GET',
        params: {
          page: '@page',
          per_page: '@per_page'
        },
        url: appConfig.apiUrl + '/organization/:organization_id/announcement'
      },

      // 管理员发布机构公告
      add_organization_announcement: {
        method: 'POST',
        params: {
          token: '@token'
        },
        url: appConfig.apiUrl + '/organization/:organization_id/announcement'
      },

      // 管理员修改机构公告
      update_organization_announcement: {
        method: 'PUT',
        params: {
          token: '@token'
        },
        url: appConfig.apiUrl + '/organization/:organization_id/announcement/:announcement_id'
      },

      // 管理员删除机构公告
      del_organization_announcement: {
        method: 'DELETE',
        params: {
          token: '@token'
        },
        url: appConfig.apiUrl + '/organization/:organization_id/announcement/:announcement_id'
      },

      // 管理员请求主题模板
      get_theme_template: {
        method: 'GET',
        params: {
          token: '@token'
        },
        url: appConfig.apiUrl + '/organization/theme'
      },

      // 管理员设置主题模板及图片
      set_theme_template: {
        method: 'PUT',
        params: {
          token: '@token'
        },
        url: appConfig.apiUrl + '/organization/:organization_id/organizationProfile'
      },

      // 老师退出加入的机构
      quit_organization: {
        method: 'DELETE',
        params: {
          token: '@token'
        },
        url: appConfig.apiUrl + '/organization/:organization_id/teacher/quit'
      },

      // 老师同意邀请
      put_agree_invite: {
        method: 'PUT',
        params: {
          token: '@token'
        },
        url: appConfig.apiUrl + '/organization/:organization_id/teacher/agree'
      },

      // 老师拒绝邀请
      put_refuse_invite: {
        method: 'PUT',
        params: {
          token: '@token'
        },
        url: appConfig.apiUrl + '/organization/:organization_id/teacher/refuse'
      },

      // 老师申请加入机构
      join_organization: {
        method: 'POST',
        params: {
          token: '@token'
        },
        url: appConfig.apiUrl + '/organization/:organization_id/teacher/apply'
      },

      // 上架课程
      sell_lessons: {
        method: 'POST',
        params: {
          token: '@token',
          course_ids: '@course_ids'
        },
        url: appConfig.apiUrl + '/course/sell'
      },

      // 下线课程
      delisting_lessons: {
        method: 'POST',
        params: {
          token: '@token',
          course_ids: '@course_ids'
        },
        url: appConfig.apiUrl + '/course/sell/cancel'
      },

      // 删除已下线课程
      del_lessons: {
        method: 'DELETE',
        params: {
          token: '@token',
          course_ids: '@course_ids'
        },
        url: appConfig.apiUrl + '/course'
      }

      */


    });
  }
]);