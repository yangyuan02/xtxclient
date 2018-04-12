angular.module('AppRoutes',['ui.router.stateHelper']).config(['$stateProvider', '$urlRouterProvider', 'stateHelperProvider', '$httpProvider', '$locationProvider',
  function ($stateProvider, $urlRouterProvider, stateHelperProvider, $httpProvider, $locationProvider) {

    // 404路径，跳转至首页
    $urlRouterProvider.otherwise('/index');

    // 定义树形路由
    stateHelperProvider

    // 首页
    .state({
      name: 'index',
      url: '/index',
      templateUrl: 'partials/admin/index/index.html',
      controller: 'IndexController',
      data: {
        title: '首页',
        url: '/index',
        slug: 'index'
      },
      children: [{
        // 常用操作（抽象）
        abstract: true,
        name: 'action',
        url: '/action',
        template: '<div ui-view class="view-box slide-top"></div>',
        controller: 'IndexController',
        data: {
          title: '常用操作',
          url: '/index/action',
          slug: 'action'
        },
        children: [{
          // 快速开始
          name: 'dashboard',
          url: '/dashboard',
          templateUrl: 'partials/admin/index/dashboard.html',
          controller: 'IndexController',
          data: {
            title: '快速开始',
            url: '/index/action/dashboard',
            slug: 'dashboard'
          }
        }, {
          // 缓存清理
          name: 'clearcache',
          url: '/clearcache',
          templateUrl: 'partials/admin/index/clearcache.html',
          controller: 'IndexController',
          data: {
            title: '缓存清理',
            url: '/index/action/clearcache',
            slug: 'clearcache'
          }
        }]
      }]
    })

    // 课程
    .state({
      name: 'course',
      url: '/course',
      templateUrl: 'partials/admin/course/index.html',
      controller: 'CourseController',
      data: {
        title: '课程',
        slug: 'course'
      },
      children: [{
        // 课程管理（抽象）
        abstract: true,
        name: 'manage',
        url: '/manage',
        template: '<div ui-view class="view-box slide-top"></div>',
        controller: 'CourseController',
        data: {
          title: '课程管理',
          slug: 'manage'
        },
        children: [{
          // 课程列表
          abstract: true,
          name: 'list',
          url: '/list',
          template: '<div ui-view class="view-box slide-top"></div>',
          controller: 'CourseController',
          data: {
            title: '课程列表',
            slug: 'list',
          },
          children: [{
            // 课程列表
            name: 'index',
            url: '/index',
            templateUrl: 'partials/admin/course/manage/list.html',
            controller: 'CourseController',
            data: {
              title: '课程列表',
              slug: 'list',
            },
          }, {
            // 课程编辑
            name: 'edit',
            url: '/:course_id',
            templateUrl: 'partials/admin/course/manage/edit.html',
            controller: 'CourseController',
            data: {
              title: '课程编辑',
              slug: 'list',
              name: 'course.manage.list.index'
            }
          }, {
            // 课程章节
            name: 'section',
            url: '/section/:course_id',
            templateUrl: 'partials/admin/course/manage/section/list.html',
            controller: 'CourseController',
            data: {
              title: '课程章节',
              slug: 'list',
              name: 'course.manage.list.index'
            }
          }]
        }, {
          // 课程分类
          abstract: true,
          name: 'category',
          url: '/category',
          template: '<div ui-view class="view-box slide-top"></div>',
          controller: 'CategoryController',
          data: {
            title: '课程分类',
            slug: 'category',
          },
          children: [{
            // 课程分类
            name: 'list',
            url: '/list/:category_type/:category_id',
            templateUrl: 'partials/admin/category/manage/list.html',
            controller: 'CategoryController',
            data: {
              title: '课程分类',
              slug: 'list',
              name: 'course.manage.category.index'
            }
          }, {
            // 新增分类
            name: 'add',
            url: '/add',
            templateUrl: 'partials/admin/category/manage/add.html',
            controller: 'CategoryController',
            data: {
              title: '新增分类',
              slug: 'list',
              name: 'course.manage.category.index'
            }
          }, {
            // 编辑分类
            name: 'edit',
            url: '/edit',
            templateUrl: 'partials/admin/category/manage/edit.html',
            controller: 'CategoryController',
            data: {
              title: '编辑分类',
              slug: 'list',
              name: 'course.manage.category.index'
            }
          }]
        }, {
          // 课程分类
          abstract: true,
          name: 'section',
          url: '/section',
          template: '<div ui-view class="view-box slide-top"></div>',
          controller: 'SectionController',
          data: {
            title: '章节列表',
            slug: 'section',
          },
          children: [{
            // 章节列表
            name: 'index',
            url: '/index',
            templateUrl: 'partials/admin/course/manage/section/index.html',
            controller: 'SectionController',
            data: {
              title: '章节列表',
              slug: 'index',
              name: 'course.manage.section.index'
            }
          }]
        }]
      }]
    })

    // 订单
    .state({
      name: 'trade',
      url: '/trade',
      templateUrl: 'partials/admin/trade/index.html',
      controller: 'TradeController',
      data: {
        title: '订单',
        slug: 'trade'
      },
      children: [{
        // 订单管理（抽象）
        abstract: true,
        name: 'manage',
        url: '/manage',
        template: '<div ui-view class="view-box slide-top"></div>',
        controller: 'TradeController',
        data: {
          title: '订单管理',
          slug: 'manage'
        },
        children: [{
          // 订单管理
          abstract: true,
          name: 'list',
          url: '/list',
          template: '<div ui-view class="view-box slide-top"></div>',
          controller: 'TradeController',
          data: {
            title: '订单管理',
            slug: 'list',
          },
          children: [{
            // 订单管理
            name: 'index',
            url: '/index',
            templateUrl: 'partials/admin/trade/manage/list.html',
            controller: 'TradeController',
            data: {
              title: '订单列表',
              slug: 'list'
            }
          }, {
            // 订单详情
            name: 'item',
            url: '/:trade_id',
            templateUrl: 'partials/admin/trade/manage/item.html',
            controller: 'TradeController',
            data: {
              title: '订单详情',
              slug: 'list',
              name: 'trade.manage.list.index'
            }
          }]
        }, {
          // 收款单
          abstract: true,
          name: 'payment',
          url: '/payment',
          template: '<div ui-view class="view-box slide-top"></div>',
          controller: 'PaymentController',
          data: {
            title: '收款单',
            slug: 'list',
          },
          children: [{
            // 收款单管理
            name: 'list',
            url: '/list',
            templateUrl: 'partials/admin/trade/payment/list.html',
            controller: 'PaymentController',
            data: {
              title: '收款单管理',
              slug: 'list'
            }
          }, {
            // 收款单详情
            name: 'item',
            url: '/:payment_id',
            templateUrl: 'partials/admin/trade/payment/item.html',
            controller: 'PaymentController',
            data: {
              title: '收款单详情',
              slug: 'list',
              name: 'trade.manage.payment.list'
            }
          }]
        }]
      }, {
        // 提现管理
        abstract: true,
        name: 'withdraw',
        url: '/withdraw',
        template: '<div ui-view class="view-box slide-top"></div>',
        controller: 'TradeController',
        data: {
          title: '订单管理',
          slug: 'withdraw'
        },
        children: [{
          // 提现列表
          name: 'list',
          url: '/list',
          templateUrl: 'partials/admin/trade/withdraw/list.html',
          controller: 'WithdrawController',
          data: {
            title: '提现列表',
            slug: 'list'
          }
        }]
      }]
    })

    // 学校
    .state({
      name: 'organization',
      url: '/organization',
      templateUrl: 'partials/admin/organization/index.html',
      controller: 'OrganizationController',
      data: {
        title: '学校',
        slug: 'organization'
      },
      children: [{
        // 学校管理（抽象）
        abstract: true,
        name: 'manage',
        url: '/manage',
        template: '<div ui-view class="view-box slide-top"></div>',
        controller: 'OrganizationController',
        data: {
          title: '学校管理',
          slug: 'manage'
        },
        children: [{
          // 学校管理
          abstract: true,
          name: 'list',
          url: '/list',
          template: '<div ui-view class="view-box slide-top"></div>',
          controller: 'OrganizationController',
          data: {
            title: '学校管理',
            slug: 'list',
          },
          children: [{
            // 学校列表
            name: 'index',
            url: '/index',
            templateUrl: 'partials/admin/organization/manage/list.html',
            controller: 'OrganizationController',
            data: {
              title: '学校列表',
              slug: 'list'
            }
          }, {
            // 新增学校
            name: 'add',
            url: '/add',
            templateUrl: 'partials/admin/organization/manage/add.html',
            controller: 'OrganizationController',
            data: {
              title: '新增学校',
              slug: 'list',
              name: 'organization.manage.list.index'
            }
          }, {
            // 编辑学校
            name: 'edit',
            url: '/:organization_id',
            templateUrl: 'partials/admin/organization/manage/edit.html',
            controller: 'OrganizationController',
            data: {
              title: '编辑学校',
              slug: 'list',
              name: 'organization.manage.list.index'
            }
          }]
        }, {
          // 学校分类
          abstract: true,
          name: 'category',
          url: '/category',
          template: '<div ui-view class="view-box slide-top"></div>',
          controller: 'CategoryController',
          data: {
            title: '学校分类',
            slug: 'category',
          },
          children: [{
            // 学校分类
            name: 'list',
            url: '/list/:category_type/:category_id',
            templateUrl: 'partials/admin/category/manage/list.html',
            controller: 'CategoryController',
            data: {
              title: '学校分类',
              slug: 'list',
              name: 'course.manage.category.index'
            }
          }, {
            // 新增分类
            name: 'add',
            url: '/add',
            templateUrl: 'partials/admin/category/manage/add.html',
            controller: 'CategoryController',
            data: {
              title: '新增分类',
              slug: 'list',
              name: 'course.manage.category.index'
            }
          }, {
            // 编辑分类
            name: 'edit',
            url: '/edit',
            templateUrl: 'partials/admin/category/manage/edit.html',
            controller: 'CategoryController',
            data: {
              title: '编辑分类',
              slug: 'list',
              name: 'course.manage.category.index'
            }
          }]
        }, {
          // 机构资质
          abstract: true,
          name: 'audit',
          url: '/audit',
          template: '<div ui-view class="view-box slide-top"></div>',
          controller: 'AuditController',
          data: {
            title: '机构资质',
            slug: 'audit',
          },
          children: [{
            // 机构资质列表
            name: 'list',
            url: '/list',
            templateUrl: 'partials/admin/organization/audit/list.html',
            controller: 'AuditController',
            data: {
              title: '机构资质列表',
              slug: 'list',
              name: 'organization.manage.audit.list'
            }
          }, {
            // 机构资质详情
            name: 'edit',
            url: '/:organization_id',
            templateUrl: 'partials/admin/organization/audit/edit.html',
            controller: 'AuditController',
            data: {
              title: '机构资质详情',
              slug: 'list',
              name: 'organization.manage.audit.list'
            }
          }]
        }, {
          // 老师列表
          abstract: true,
          name: 'organization_user',
          url: '/organization_user',
          template: '<div ui-view class="view-box slide-top"></div>',
          controller: 'OrganizationController',
          data: {
            title: '老师列表',
            slug: 'organization_user',
          },
          children: [{
            // 老师列表
            name: 'list',
            url: '/list',
            templateUrl: 'partials/admin/organization/organization_user/list.html',
            controller: 'OrganizationController',
            data: {
              title: '老师列表',
              slug: 'list',
              name: 'organization.manage.organization_user.list'
            }
          }, {
            // 老师详情
            name: 'item',
            url: '/:organization_user_id',
            templateUrl: 'partials/admin/organization/organization_user/item.html',
            controller: 'OrganizationController',
            data: {
              title: '老师详情',
              slug: 'list',
              name: 'organization.manage.organization_user.list'
            }
          }]
        }, {
          // 公告列表
          abstract: true,
          name: 'announcement',
          url: '/announcement',
          template: '<div ui-view class="view-box slide-top"></div>',
          controller: 'AnnouncementController',
          data: {
            title: '公告列表',
            slug: 'announcement',
          },
          children: [{
            // 公告列表
            name: 'list',
            url: '/list',
            templateUrl: 'partials/admin/organization/announcement/list.html',
            controller: 'AnnouncementController',
            data: {
              title: '公告列表',
              slug: 'list',
              name: 'organization.manage.announcement.list'
            }
          }, {
            // 编辑公告
            name: 'edit',
            url: '/:announcement_id',
            templateUrl: 'partials/admin/organization/announcement/edit.html',
            controller: 'AnnouncementController',
            data: {
              title: '编辑公告',
              slug: 'list',
              name: 'organization.manage.announcement.list'
            }
          }, {
            // 公告详情
            name: 'item',
            url: '/:announcement_id',
            templateUrl: 'partials/admin/organization/announcement/item.html',
            controller: 'AnnouncementController',
            data: {
              title: '公告详情',
              slug: 'list',
              name: 'organization.manage.announcement.list'
            }
          }]
        }]
      }]
    })

    // 内容
    .state({
      name: 'article',
      url: '/article',
      templateUrl: 'partials/admin/article/index.html',
      controller: 'ArticleController',
      data: {
        title: '内容',
        slug: 'article'
      },
      children: [{
        // 内容管理（抽象）
        abstract: true,
        name: 'manage',
        url: '/manage',
        template: '<div ui-view class="view-box slide-top"></div>',
        controller: 'ArticleController',
        data: {
          title: '内容管理',
          slug: 'manage'
        },
        children: [{
          // 文章管理
          abstract: true,
          name: 'list',
          url: '/list',
          template: '<div ui-view class="view-box slide-top"></div>',
          controller: 'ArticleController',
          data: {
            title: '文章管理',
            slug: 'list',
          },
          children: [{
            // 文章列表
            name: 'index',
            url: '/index',
            templateUrl: 'partials/admin/article/manage/list.html',
            controller: 'ArticleController',
            data: {
              title: '文章列表',
              slug: 'index'
            }
          }, {
            // 新增文章
            name: 'add',
            url: '/add',
            templateUrl: 'partials/admin/article/manage/add.html',
            controller: 'ArticleController',
            data: {
              title: '新增文章',
              slug: 'list',
              name: 'article.manage.list.index'
            }
          }, {
            // 编辑文章
            name: 'edit',
            url: '/:article_id',
            templateUrl: 'partials/admin/article/manage/edit.html',
            controller: 'ArticleController',
            data: {
              title: '编辑文章',
              slug: 'list',
              name: 'article.manage.list.index'
            }
          }]
        }, {
          // 文章分类
          abstract: true,
          name: 'category',
          url: '/category',
          template: '<div ui-view class="view-box slide-top"></div>',
          controller: 'CategoryController',
          data: {
            title: '文章分类',
            slug: 'category',
          },
          children: [{
            // 文章分类
            name: 'list',
            url: '/list/:category_type/:category_id',
            templateUrl: 'partials/admin/category/manage/list.html',
            controller: 'CategoryController',
            data: {
              title: '文章分类',
              slug: 'list',
              name: 'article.manage.category.index'
            }
          }, {
            // 新增分类
            name: 'add',
            url: '/add',
            templateUrl: 'partials/admin/category/manage/add.html',
            controller: 'CategoryController',
            data: {
              title: '新增分类',
              slug: 'list',
              name: 'article.manage.category.index'
            }
          }, {
            // 编辑分类
            name: 'edit',
            url: '/edit',
            templateUrl: 'partials/admin/category/manage/edit.html',
            controller: 'CategoryController',
            data: {
              title: '编辑分类',
              slug: 'list',
              name: 'article.manage.category.index'
            }
          }]
        }]
      }, {
        // 笔记管理
        abstract: true,
        name: 'note',
        url: '/note',
        template: '<div ui-view class="view-box slide-top"></div>',
        controller: 'NoteController',
        data: {
          title: '笔记管理',
          slug: 'note',
        },
        children: [{
          // 笔记列表
          name: 'list',
          url: '/list',
          templateUrl: 'partials/admin/article/note/list.html',
          controller: 'NoteController',
          data: {
            title: '笔记列表',
            slug: 'note',
            name: 'article.manage.note.list'
          }
        }, {
          // 笔记详情
          name: 'item',
          url: '/item',
          templateUrl: 'partials/admin/article/note/item.html',
          controller: 'NoteController',
          data: {
            title: '笔记详情',
            slug: 'note',
            name: 'article.manage.note.item'
          }
        }]
      }, {
        // 问答管理
        abstract: true,
        name: 'question',
        url: '/question',
        template: '<div ui-view class="view-box slide-top"></div>',
        controller: 'QuestionController',
        data: {
          title: '问答管理',
          slug: 'question',
        },
        children: [{
          // 问答列表
          name: 'list',
          url: '/list',
          templateUrl: 'partials/admin/article/question/list.html',
          controller: 'QuestionController',
          data: {
            title: '问答列表',
            slug: 'question',
            name: 'article.question.list'
          }
        }, {
          // 问答详情
          name: 'item',
          url: '/:article_id',
          templateUrl: 'partials/admin/article/question/item.html',
          controller: 'QuestionController',
          data: {
            title: '问答详情',
            slug: 'index',
            name: 'article.question.item'
          }
        }]
      }, {
        // 广告管理（抽象）
        abstract: true,
        name: 'advertise',
        url: '/advertise',
        template: '<div ui-view class="view-box slide-top"></div>',
        controller: 'ArticleController',
        data: {
          title: '内容管理',
          slug: 'advertise'
        },
        children: [{
          // 广告管理
          abstract: true,
          name: 'list',
          url: '/list',
          template: '<div ui-view class="view-box slide-top"></div>',
          controller: 'ArticleController',
          data: {
            title: '广告管理',
            slug: 'list',
          },
          children: [{
            // 广告列表
            name: 'index',
            url: '/index',
            templateUrl: 'partials/admin/article/advertise/list.html',
            controller: 'AdvertiseController',
            data: {
              title: '广告列表',
              slug: 'index'
            }
          }, {
            // 新增广告
            name: 'add',
            url: '/add',
            templateUrl: 'partials/admin/article/advertise/add.html',
            controller: 'AdvertiseController',
            data: {
              title: '新增广告',
              slug: 'list',
              name: 'article.advertise.list.index'
            }
          }, {
            // 编辑广告
            name: 'edit',
            url: '/:advertise_id',
            templateUrl: 'partials/admin/article/advertise/edit.html',
            controller: 'AdvertiseController',
            data: {
              title: '编辑广告',
              slug: 'list',
              name: 'article.advertise.list.index'
            }
          }]
        }]
      }, {
        // 反馈管理（抽象）
        abstract: true,
        name: 'feedback',
        url: '/feedback',
        template: '<div ui-view class="view-box slide-top"></div>',
        controller: 'ArticleController',
        data: {
          title: '内容管理',
          slug: 'feedback'
        },
        children: [{
          // 反馈管理
          abstract: true,
          name: 'list',
          url: '/list',
          template: '<div ui-view class="view-box slide-top"></div>',
          controller: 'ArticleController',
          data: {
            title: '反馈管理',
            slug: 'list',
          },
          children: [{
            // 反馈管理列表
            name: 'index',
            url: '/index',
            templateUrl: 'partials/admin/article/feedback/list.html',
            controller: 'FeedbackController',
            data: {
              title: '反馈列表',
              slug: 'index'
            }
          }, {
            // 反馈详情
            name: 'item',
            url: '/:feedback_id',
            templateUrl: 'partials/admin/article/feedback/item.html',
            controller: 'FeedbackController',
            data: {
              title: '反馈详情',
              slug: 'list',
              name: 'article.feedback.list.index'
            }
          }]
        }]
      }]
    })

    // 用户
    .state({
      name: 'user',
      url: '/user',
      templateUrl: 'partials/admin/user/index.html',
      controller: 'UserController',
      data: {
        title: '用户',
        url: '/user',
        slug: 'user'
      },
      children: [{
        // 用户管理（抽象）
        abstract: true,
        name: 'manage',
        url: '/manage',
        template: '<div ui-view class="view-box slide-top"></div>',
        controller: 'UserController',
        data: {
          title: '用户管理',
          slug: 'manage'
        },
        children: [{
          // 用户管理
          name: 'list',
          url: '/list',
          abstract: true,
          template: '<div ui-view class="view-box slide-top"></div>',
          controller: 'UserController',
          data: {
            title: '用户管理',
            slug: 'list'
          },
          children: [{
            // 用户管理
            name: 'index',
            url: '/index',
            templateUrl: 'partials/admin/user/manage/list.html',
            controller: 'UserController',
            data: {
              title: '用户列表',
              slug: 'index'
            },
            children: [
            ]
          }, {
            // 用户详情
            name: 'item',
            url: '/:user_id',
            templateUrl: 'partials/admin/user/manage/item.html',
            controller: 'UserController',
            data: {
              title: '用户详情',
              slug: 'item',
              name: 'user.manage.list.index'
            }
          }]
        }, {
          // 角色管理
          name: 'role',
          url: '/role',
          abstract: true,
          template: '<div ui-view class="view-box slide-top"></div>',
          controller: 'UserController',
          data: {
            title: '角色管理',
            url: '/user/manage/role',
            slug: 'role'
          },
          children: [{
            // 角色列表
            name: 'list',
            url: '/list',
            templateUrl: 'partials/admin/user/role/list.html',
            controller: 'UserController',
            data: {
              title: '角色管理',
              url: '/user/manage/role/list',
              slug: 'list'
            }
          }, {
            // 角色权限编辑
            name: 'edit',
            url: '/:role_id',
            templateUrl: 'partials/admin/user/role/permission-edit.html',
            controller: 'UserController',
            data: {
              title: '角色权限管理',
              url: '/user/manage/role/:role_id',
              slug: 'edit',
              name: 'user.manage.role.list'
            }
          }]
        }, {
          // 权限管理
          name: 'permission',
          url: '/permission',
          abstract: true,
          template: '<div ui-view class="view-box slide-top"></div>',
          controller: 'UserController',
          data: {
            title: '权限管理',
            url: '/user/manage/permission',
            slug: 'permission'
          },
          children: [{
            // 权限列表
            name: 'list',
            url: '/list',
            templateUrl: 'partials/admin/user/permission/list.html',
            controller: 'UserController',
            data: {
              title: '权限管理',
              url: '/user/manage/permission/list',
              slug: 'list'
            }
          }, {
            // 权限API编辑
            name: 'edit',
            url: '/:permission_id',
            templateUrl: 'partials/admin/user/permission/api-edit.html',
            controller: 'UserController',
            data: {
              title: '权限API编辑',
              url: '/user/manage/permission/:permission_id',
              slug: 'edit',
              name: 'user.manage.permission.list'
            }
          }]
        }, {
          // API管理
          name: 'api',
          url: '/api',
          abstract: true,
          template: '<div ui-view class="view-box slide-top"></div>',
          controller: 'UserController',
          data: {
            title: 'API管理',
            url: '/user/manage/api',
            slug: 'api'
          },
          children: [{
            // api管理
            name: 'list',
            url: '/list',
            templateUrl: 'partials/admin/user/api/list.html',
            controller: 'UserController',
            data: {
              title: 'api管理',
              url: '/user/manage/api/list',
              slug: 'list'
            }
          }]
        }]
      }]
    })

    // 系统
    .state({
      name: 'config',
      url: '/config',
      templateUrl: 'partials/admin/config/index.html',
      controller: 'ConfigController',
      data: {
        title: '系统',
        url: '/config',
        slug: 'config'
      },
      children: [{
        // 系统配置
        abstract: true,
        name: 'system',
        url: '/system',
        template: '<div ui-view class="view-box slide-top"></div>',
        controller: 'ConfigController',
        data: {
          title: '系统配置',
          url: '/config/system',
          slug: 'system'
        },
        children: [{
          // 系统配置
          name: 'group',
          url: '/group',
          templateUrl: 'partials/admin/config/system/group.html',
          controller: 'ConfigController',
          data: {
            title: '系统配置',
            url: '/config/system/group',
            slug: 'group'
          }
        }, {
          // 配置管理
          name: 'manage',
          url: '/manage',
          templateUrl: 'partials/admin/config/system/list.html',
          controller: 'ConfigController',
          data: {
            title: '配置管理',
            url: '/config/system/manage',
            slug: 'manage'
          }
        }]
      }, {
        // 常用配置
        abstract: true,
        name: 'usual',
        url: '/usual',
        template: '<div ui-view class="view-box slide-top"></div>',
        controller: 'ConfigController',
        data: {
          title: '常用配置',
          url: '/config/usual',
          slug: 'usual'
        },
        children: [{
          // 首页配置
          name: 'index',
          url: '/index',
          templateUrl: 'partials/admin/config/index/index.html',
          controller: 'ConfigController',
          data: {
            title: '首页配置',
            url: '/config/usual/index',
            slug: 'index'
          }
        }, {
          // 友情链接配置
          name: 'link',
          url: '/link',
          templateUrl: 'partials/admin/config/link/index.html',
          controller: 'ConfigController',
          data: {
            title: '友情链接配置',
            url: '/config/usual/link',
            slug: 'link'
          }
        }, {
          // 入驻机构管理
          name: 'partner',
          url: '/partner',
          templateUrl: 'partials/admin/config/partner/index.html',
          controller: 'ConfigController',
          data: {
            title: '入驻机构管理',
            url: '/config/usual/partner',
            slug: 'partner'
          }
        }, {
          // 搜索管理
          name: 'search',
          url: '/search',
          templateUrl: 'partials/admin/config/search/index.html',
          controller: 'ConfigController',
          data: {
            title: '搜索管理',
            url: '/config/usual/search',
            slug: 'search'
          }
        }]
      }, {
        // 数据库管理（抽象）
        abstract: true,
        name: 'database',
        url: '/database',
        template: '<div ui-view class="view-box slide-top"></div>',
        controller: 'ConfigController',
        data: {
          title: '数据库管理',
          url: '/config/database',
          slug: 'database'
        },
        children: [{
          // 数据库备份
          name: 'export',
          url: '/export',
          templateUrl: 'partials/admin/config/database/export.html',
          controller: 'ConfigController',
          data: {
            title: '数据库备份',
            url: '/config/database/export',
            slug: 'export'
          }
        }, {
          // 数据库还原
          name: 'import',
          url: '/import',
          templateUrl: 'partials/admin/config/database/import.html',
          controller: 'ConfigController',
          data: {
            title: '数据库还原',
            url: '/config/database/import',
            slug: 'import'
          }
        }]
      }, {
        // 系统日志
        abstract: true,
        name: 'log',
        url: '/log',
        template: '<div ui-view class="view-box slide-top"></div>',
        controller: 'ConfigController',
        data: {
          title: '系统日志',
          url: '/config/log',
          slug: 'log'
        },
        children: [{
          // 操作日志
          name: 'action',
          url: '/action',
          templateUrl: 'partials/admin/config/log/action.html',
          controller: 'ConfigController',
          data: {
            title: '操作日志',
            url: '/config/log/action',
            slug: 'action'
          }
        }, {
          // 短信记录
          name: 'sms',
          url: '/sms',
          templateUrl: 'partials/admin/config/log/sms.html',
          controller: 'SmsController',
          data: {
            title: '短信记录',
            url: '/config/log/sms',
            slug: 'sms'
          }
        }]
      }]
    })

    // 登录
    .state({
      name: 'login',
      url: '/login',
      views: {
       'auth': { templateUrl: 'partials/admin/auth/login.html' }
      },
      controller: 'AuthController',
      data: {
        title: '登录',
        url: '/login',
        slug: 'login',
        full: true
      }
    })

    // 注册
    .state({
      name: 'register',
      url: '/register',
      views: {
       'auth': { templateUrl: 'partials/admin/auth/register.html' }
      },
      controller: 'AuthController',
      data: {
        title: '注册',
        url: '/register',
        slug: 'register',
        full: true
      }
    })

    // 找回密码
    .state({
      name: 'forgot',
      url: '/forgot',
      views: {
       'auth': { templateUrl: 'partials/admin/auth/forgot.html' }
      },
      controller: 'AuthController',
      data: {
        title: '找回密码',
        url: '/forgot',
        slug: 'forgot',
        full: true
      }
    })

    // UI-Demo
    .state({
      name: 'UI',
      url: '/ui',
      templateUrl: 'partials/admin/index/ui.html',
      controller: 'IndexController',
      data: {
        title: 'UI-Demo',
        url: '/ui'
      }
    })

    $locationProvider.html5Mode(true);

    // 拦截器
    $httpProvider.interceptors.push(['$rootScope', '$q', '$localStorage', '$location', function ($rootScope, $q, $localStorage, $location) {
      return {
        request: function (config) {

          // 请求站内资源时，带上token
          if (!config.url.contain('http://up.qiniu.com')) {
            config.headers = config.headers || {};
            if ($localStorage.token) {
              config.headers.Authorization = 'Bearer ' + $localStorage.token;
            };
          };

          return config;
        },

        response: function (response) {

          if (response.status == 200) {
            // console.log('do something...');
          }
          return response || $q.when(response);
        },

        responseError: function (response) {

          // 关闭动画
          $rootScope.modal.closeLoading();
          $rootScope.modal.close();
          
          switch (response.status) {
            case 401:
                // $rootScope.modal.error({ message: '401 ERROR!' });
                $location.path('/login');
                break;
            case 403:
                $rootScope.modal.error({ message: '403! 无权访问API' });
                // $location.path('/index');
                break;
            case 404:
                $rootScope.modal.error({ message: '404 ERROR!' });
                break;
            case 422:
                $rootScope.modal.error({ message: '422 ERROR!', message: response.message });
                break;
            case 500:
                $rootScope.modal.error({ message: '500 ERROR!' });
                break;
             default:
                break;
          }
          return $q.reject(response);
        }
      }
    }])
  }
]);
