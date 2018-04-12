var app = angular.module('app', [

  // angular modules
  'ui.router',
  'ngStorage',
  'ngResource',
  'ngAnimate',

  // third modules
  'angular.modal',
  'angular.loading',

  // angular routes
  'AppRoutes',

  // angular directive
  'LayoutDirective',
  'TotopDirective',
  'TabsDirective',
  'LoadingDirective',
  'CollapseDirective',
  'PaginationDirective',

  // Global controller
  'MainController',
  'HeaderController',
  'AsideController',
  'AuthController',

  // Function controller
  'IndexController',
  'UserController',
  'ConfigController',
  'CategoryController',
  'CourseController',
  'SectionController',
  'TradeController',
  'PaymentController',
  'WithdrawController',
  'OrganizationController',
  'AnnouncementController',
  'AuditController',
  'ArticleController',
  'NoteController',
  'QuestionController',
  'AdvertiseController',
  'SmsController',
  'FeedbackController',

  // Global package
  'CommonProvider',
  'AuthProvider',
  'QuploadProvider',

  // Global Service
  'AuthService',

  // Global Filter
  'TimeFilter',
  'HtmlFilter',
])

// 全局配置
.provider('appConfig', function() {
  var config = {
    baseUrl: 'http://admin.xtx.com',
    apiUrl: '/server/api/v1',
    fileUrl: 'http://7xnbft.com2.z0.glb.qiniucdn.com/',
    staticUrl: 'http://7xpb5v.com2.z0.glb.qiniucdn.com',
  };
  return {
    config:config,
    $get: function() {
      return config;
    }
  }
})

// 表单配置
.config(function ($validationProvider, appConfigProvider) {
  angular.extend($validationProvider, {
    validCallback: function (element){
      $(element).parents('.form-group:first').removeClass('has-error').addClass('has-success');
    },
    invalidCallback: function (element) {
      $(element).parents('.form-group:first').addClass('has-error');
    }
  });

  $validationProvider.setErrorHTML(function (msg) {
    return  "<i class=\"icon icon-error\"></i>" + msg;
  });

  $validationProvider.setSuccessHTML(function (msg) {
    return  "<i class=\"icon icon-success\"></i>" + msg;
  });
})

.config(['cfpLoadingBarProvider', function(cfpLoadingBarProvider) {
  cfpLoadingBarProvider.includeSpinner = false;
  cfpLoadingBarProvider.latencyThreshold = 10;
}])

// 程序初始化
.run(['PermissionProvider', 'CommonProvider', function(PermissionProvider, CommonProvider) {
  PermissionProvider.init();
  CommonProvider.autoTop();
}]);
