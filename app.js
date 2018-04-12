// 主程序入口模块
angular.module('app', [

  // angular modules
  'ui.router',
  'ngStorage',
  'ngResource',
  'ngSanitize',
  'ngAnimate',

  // angular routes
  'AppRoutes',

  // third modules
  'angular.modal',
  'angular.loading',
  // 'angular.lazyImage',

  // angular directive
  'TabsDirective',
  'TooltipDirective',
  'PaginationDirective',
  'LoadingDirective',
  'CourseListDirective',

  // Global controller
  'MainController',
  'ArticleController',
  'HeaderController',
  'AuthController',

  // Function controller
  'IndexController',
  'CourseController',
  'LearnController',
  'PaymentController',
  'OrganizationlController',
  'UserController',
  'StudentController',
  'IncomeController',
  'LessonController',
  'TeacherController',
  'SchoolController',

  // Global Filter
  'HtmlFilter',
  'TimeFilter',

  // Global package
  'CommonProvider',
  'AuthProvider',
  'QuploadProvider',

  // Global Service
  'AuthService',
  'CommonService',

  // Global Model
  'CommonModel'
])

// 全局配置
.provider('appConfig', function() {
  var config = {
    baseUrl: 'http://xtx.com',
    fileUrl: 'http://7xnbft.com2.z0.glb.qiniucdn.com/',
    staticUrl: 'http://7xpb5v.com2.z0.glb.qiniucdn.com',
    apiUrl: '/server/api/v1'
  };
  return {
    config:config,
    $get: function() {
      return config;
    }
  }
})

// 初始化
.run(['AuthProvider', 'CommonProvider', function(AuthProvider, CommonProvider) {
  // 自动登陆
  AuthProvider.init();
  // 自动回顶
  CommonProvider.autoTop();
}])

.config(['cfpLoadingBarProvider', function(cfpLoadingBarProvider) {
  cfpLoadingBarProvider.includeSpinner = false;
  cfpLoadingBarProvider.includeBar = false;
  cfpLoadingBarProvider.latencyThreshold = 10;
}])

.config(function ($validationProvider, appConfigProvider) {
  // 表单验证配置
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
});