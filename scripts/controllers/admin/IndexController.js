/**
* IndexController Module
*
* Description
*/
angular.module('IndexController', ['PublicModel'])
.controller('IndexController', ['$rootScope', '$scope', '$state', '$stateParams', '$location', '$localStorage', '$modal', 'PublicModel', 'CommonProvider',
  function ($rootScope, $scope, $state, $stateParams, $location, $localStorage, $modal, PublicModel, CommonProvider) {

    $scope.dashboardAction = {

      // 缓存清理
      clearcache: function (params) {
        CommonProvider.promise({
          model: PublicModel,
          method: 'clearcache',
          params: params,
          success: function (_cache) {
            $modal.success({
              message: _cache.message
            });
          },
          error: function (_cache) {
            $modal.error({
              message: _cache.message
            });
          }
        });
      }

    };

  }
]);