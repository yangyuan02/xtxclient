/*
*
* AuthProvider
*
* Description
*
*/

angular.module('AuthProvider', ['AuthModel'])

// 权限初始化
.factory('PermissionProvider', ['$rootScope', '$localStorage', '$location', '$state', 'CommonProvider', 'AuthModel', function ($rootScope, $localStorage, $location, $state, CommonProvider, AuthModel) {
    return {
      init: function() {
        if ($localStorage.token) {
          CommonProvider.promise({
            model: AuthModel,
            method: 'check',
            success: function (auth) {
              $localStorage.user = auth.result;
              CommonProvider.promise({
                method: 'menu',
                model: AuthModel,
                success: function (permissions) {
                  $rootScope.permissions = permissions.result;
                  $rootScope.menus = $rootScope.permissions.menus;
                  $rootScope.routes = $rootScope.permissions.grant_routes;
                  $rootScope.admin_menu_show = false;
                  $rootScope.$broadcast('permissionsChanged');
                  $rootScope.routeCheck();
                }
              });
            },
            error: function () {
              $location.path('/login');
            }
          });
        } else {
          if ($location.$$url != '/login' && $location.$$url != '/forgot' && $location.$$url != '/register') {
            $location.path('/login');
          }
        };
      }
   };
}])

// 前端初始化
.factory('AuthProvider', ['$rootScope', '$localStorage', '$location', '$state', '$window', 'CommonProvider', 'AuthModel', function ($rootScope, $localStorage, $location, $state, $window, CommonProvider, AuthModel) {
    var AuthProvider =  {

      // 自动登录以及拿到token后登录
      init: function(callback) {
        if ($localStorage.token) {
          CommonProvider.promise({
            model: AuthModel,
            method: 'check',
            success: function (auth) {
              $localStorage.user = auth.result;
              $rootScope.user = auth.result;
              if (!!callback && typeof callback == 'function') {
                callback(auth.result);
              }
            },
            error: function () {
              delete $localStorage.token;
              if ($localStorage.user) delete $localStorage.user;
            }
          });
        } else {
          if ($localStorage.user) delete $localStorage.user;
        }
      },

      // 登录获取token
      login: function (config) {
        CommonProvider.promise({
          model: AuthModel,
          method: 'login',
          params: config.user,
          success: function (auth) {
            $localStorage.token = auth.result;
            $rootScope.setTokenLimit(config.user.auto_login);
            if (config.callback) {
              config.callback(auth);
              return false;
            };
            AuthProvider.init();
            if (config.modal) {
              $rootScope.modal.close();
            } else {
              $location.path('/index');
            }
          },
          error: function (auth) {
            $rootScope.modal.close();
            $rootScope.modal.error({ message: auth.message, info: auth.result });
          }
        });
      },

      // 退出
      logout: function () {
        CommonProvider.promise({
          model: AuthModel,
          method: 'logout',
          success: function () {
            console.log('退出成功');
            delete $rootScope.user;
            delete $rootScope.token;
            delete $localStorage.user;
            delete $localStorage.token;
            $window.location.href = '/';
          }
        }); 
      },

      // 检查本地是否登录及回调
      check: function (callback) {
        var user = $rootScope.user || $localStorage.user || false;
        if (!!user) {
          callback(user);
        } else {
          $rootScope.$watch('user', function (user) {
            if (!!user) callback(user);
          });
        }
      }
    };
    return AuthProvider;
}])