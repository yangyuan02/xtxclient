/**
* AuthController Module
*
* Description
*
*/

angular.module('AuthController', ['angular.validation', 'angular.validation.rule', 'AuthModel'])
.controller('AuthController', ['$rootScope', '$scope', '$stateParams', '$location', '$localStorage', '$modal', 'AuthModel', 'CommonProvider', 'PermissionProvider', 
  function ($rootScope, $scope, $stateParams, $location, $localStorage, $modal, AuthModel, CommonProvider, PermissionProvider) {

    // 登录 
    $scope.login = function () {
      CommonProvider.promise({
        model: AuthModel,
        method: 'login',
        params: $scope.user,
        success: function (_auth) {
          $localStorage.token = _auth.result;
          PermissionProvider.init();
          $location.path('/index');
        },
        error: function (_auth) {
          $modal.error({
            message: _auth.message,
            info: _auth.result
          });
        }
      });
    };

    // 注册
    $scope.register = function () {
      CommonProvider.promise({
        model: AuthModel,
        method: 'register',
        params: $scope.user,
        success: function (_auth) {
          $localStorage.token = _auth.result;
          $modal.success({
            message: _auth.message
          });
          PermissionProvider.init();
          $location.path('/index');
        },
        error: function (_auth) {
          $modal.error({
            message: _auth.message
          });
        }
      });
    };

    // 找回密码
    $scope.forgot = function () {
      CommonProvider.promise({
        model: AuthModel,
        method: 'forgot',
        params: $scope.user,
        success: function (_auth) {
          $modal.success({
            message: _auth.message
          });
          $location.path('/login');
        },
        error: function (_auth) {
          $modal.error({
            message: _auth.message
          });
        }
      });
    };

    // 注销
    $scope.logout = function () {
      CommonProvider.promise({
        model: AuthModel,
        method: 'logout',
        success: function (_auth) {
          delete $localStorage.token;
          delete $localStorage.user;
          $rootScope.permissions = null;
          $location.path('/login');
        },
        error: function (_auth) {
          $modal.error({
            message: _auth.message
          });
        }
      });
    };
  }
]);