/*
* HeaderController Module
*
* Description
*/

angular.module('HeaderController', ['SearchModel', 'TypeaheadDirective', 'SearchService'])
.controller('HeaderController', ['$rootScope', '$scope', '$state', '$stateParams', '$location', '$localStorage', 'CommonProvider', 'SearchModel', 'SearchService', 
  function ($rootScope, $scope, $state, $stateParams, $location, $localStorage, CommonProvider, SearchModel, SearchService) {

    if (!$scope.search) $scope.search = {};

    $scope.isActive = {};

    // 全局导航搜索模块初始化
    $scope.searchBoxInit = function () {
      $scope.search.type = 1;
      $scope.search.lists = {};
      $scope.search.keyword = '';
      $scope.search.hotwords = {};
      $scope.getHotWords();
    };

    // 搜索类型点击切换逻辑
    $scope.searchTypeChange = function () {
      $scope.search.type = ($scope.search.type == 1) ? 2 : 1;
      $scope.search.keyword = '';
    };

    // 联想搜索请求
    $scope.searchSuggest = function (keyword) {
      return CommonProvider.request({
        method: 'get',
        service: new SearchService(),
        params: {
          keyword: keyword,
          only_name: 0,
          search_type: $scope.search.type == 1 ? 'course' : 'organization',
        }
      }).then(function(res){
        return res.result;
      });
    };

    // 搜索结果
    $scope.searchResult = function (keyword) {

      // 如果关键词是空，则判断要跳转至哪个页面
      if (!keyword) {
        
        if ($scope.search.type == 1) {
          $location.path('/course');
        } else {
          $location.path('/organization');
        }
      } else {

        // 如果关键词不是空，则判断是要执行哪个类型搜素
        if ($scope.search.type == 1) {
          $location.path('/course/search/' + $scope.search.keyword);
        } else {
          $location.path('/organization/search/' + $scope.search.keyword);
        }
      }
    };

    // 热词/推荐词数据获取
    $scope.getHotWords = function () {
      if (!!$scope.search.hotwords.courses) return false;
      CommonProvider.promise({
        model: SearchModel,
        method: 'getHotWords',
        params: { out_type: 'array' },
        success: function(hotwords){
          $scope.search.hotwords = hotwords.result;
        }
      });
    };

    // 推荐词点击逻辑
    $scope.hotWordClick = function (keyword) {

      // 点击后，搜索框数据变为热词，且判断类型并执行搜索跳转
      $scope.search.keyword = keyword;

      // 执行对应搜索
      if ($scope.search.type == 1) {
        $location.path('/course/search/' + $scope.search.keyword);
      } else {
        $location.path('/organization/search/' + $scope.search.keyword);
      }
    };

    // 获取系统配置
    $scope.getBaseConfig = function () {
      $rootScope.getConfig({
        group: 1,
        success: function(_base_config){
          $localStorage.site_config = $localStorage.site_config || {};
          $localStorage.site_config.base = _base_config.result.toObject('name', 'value');
          $rootScope.site_config = $localStorage.site_config;
        }
      });
    };

    // 路由切换监听
    $scope.$on('$stateChangeSuccess', function() {

      // 更新导航栏active状态
      $scope.isActive.index = $state.current.name == 'index';
      $scope.isActive.course = $state.current.name.contain('course');
      $scope.isActive.organization = $state.current.name.contain('organization');

      // URL渠道搜索词初始化
      if (!!$state.params.key) {
        $scope.search.keyword = $state.params.key;
        $scope.search.type = ($state.current.url.contain('course') ? 1 : 2);
      } else {
        $scope.search.type = 1;
        $scope.search.keyword = '';
      }
    });
  }
]);