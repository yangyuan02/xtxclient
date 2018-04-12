/*
* IndexController Module
*
* Description
*/
angular.module('IndexController', ['angular.modal', 'angular.bootstrap.carousel', 'FocusAddClassDirective', 'CategoryModel', 'AdvertiseModel'])
.controller('IndexController', ['$scope', '$rootScope', '$modal', '$timeout', '$location', '$localStorage', 'appConfig', 'CommonProvider', 'CategoryModel', 'AdvertiseModel', 'IndexModel',
  function ($scope, $rootScope, $modal, $timeout, $location, $localStorage, appConfig, CommonProvider, CategoryModel, AdvertiseModel, IndexModel) {

    //初始化首位活动数据的下标
    var active_partner_last_index, active_partner_first_index = 0;

    // 首页初始化
    $scope.initIndex = function() {

      // 请求首页广告Banner信息
      CommonProvider.promise({
        model: AdvertiseModel,
        method: 'get',
        params: {
          role: 'user',
          type: 1,
          per_page: 100
        },
        success: function(advertise){
          $scope.banners = advertise.result;
        }
      });

      // 获取首页分Banner下分类列表
      if (!!$localStorage.categories) $scope.main_categories = $localStorage.categories;
      CommonProvider.promise({
        model: CategoryModel,
        method: 'get',
        params: {
          role: 'student',
          type: 1
        },
        success: function(categories){
          $localStorage.categories = categories.result;
          $scope.main_categories = categories.result;
        }
      });

      // 获取首页主体列表
      if (!!$localStorage.indexCategories) $scope.categories = $localStorage.indexCategories;
      CommonProvider.promise({
        model: IndexModel,
        method: 'get',
        params: {
          role: 'user'
        },
        success: function(index){
          $localStorage.indexCategories = index.result;
          $scope.categories = index.result;
        }
      });

      // 获取首页合作结构列表
      CommonProvider.promise({
        model: IndexModel,
        method: 'partners',
        params: {
          role: 'user',
          per_page: 100
        },
        success: function(partners){
          $scope.partners = partners.result;
          $scope.activePartners = $scope.partners;
          active_partner_last_index = $scope.partners.length >= 8 ? 8 : $scope.partners.length - 1;
        }
      });
    };
    
    // 合作机构上一页
    $scope.toPrevPage = function () {

      // 清空显示数据
      $scope.activePartners = [];
      // 初始化显示数据下标
      var active_partner_index = 0;

      // 如果首位活动下标小于等于8（前方无页），则直接转换为最后一位
      if (active_partner_first_index <= 8) {
        active_partner_first_index = $scope.partners.length;
      }

      // 遍历总数据，以总数据相对末位向前遍历四位
      for (var i = active_partner_first_index - 8; i < active_partner_first_index; i++) {
        // 如果数据存在，则赋值给显示数据
        if ($scope.partners[i]) {
          // 给显示数据赋予数据
          $scope.activePartners[active_partner_index] = $scope.partners[i];
          // 显示数据下标递归
          active_partner_index += 1;
        } else {
          // 否则，数据不存在，更新总数据末位为总数组最大长度，并跳出
          active_partner_first_index = $scope.partners.length;
          break;
        }
      };

      // 更新总数据相对首尾
      active_partner_last_index = active_partner_first_index;
      active_partner_first_index -= 8;
    };

    // 合作机构下一页
    $scope.toNextPage = function () {

      // 清空显示数据
      $scope.activePartners = [];
      // 初始化显示数据下标
      var active_partner_index = 0;

      // 如果末位活动下标大于总长度-8（后方无页），则直接转换为第一一位
      if (active_partner_last_index >= $scope.partners.length) {
        active_partner_last_index = 0;
      };

      // 遍历总数据，以总数据相对末位为起始，遍历四位
      for (var i = active_partner_last_index; i < active_partner_last_index + 8; i++) {
        // 如果数据存在，则赋值给显示数据
        if ($scope.partners[i]) {
          // 给显示数据赋予数据
          $scope.activePartners[active_partner_index] = $scope.partners[i];
          // 显示数据下标递归
          active_partner_index += 1;
        } else {
          // 否则，数据不存在，更新总数据末位为0，并跳出
          active_partner_last_index = 0;
          break;
        }
      };

      // 更新总数据相对末位
      active_partner_last_index = i;
    };

    // 获取app下载地址
    $scope.getAppDownload = function () {
      $rootScope.getConfig({
        name: 'APP_DOWNLOAD',
        success: function(links){
          $scope.download_link = links.result.value;
        }
      });
    };

  }
]);