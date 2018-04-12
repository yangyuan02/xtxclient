/**
/* angular-related-select
 * @By Surmon(surmon.me)
 *
 */
(function() {

  // 使用严格模式
  // "use strict";

  // 声明模块
  var relatedSelect = angular.module('angular-related-select', []);

  // 逻辑
  relatedSelect.controller('RSController', ['$rootScope', '$modal', '$scope', function( $rootScope, $modal, $scope) {
    
    // 初始化
    // repeat使用
    // $scope.is_edit = false;
    $scope.disSelects = [];
    $scope.ckdSelects = [];
    $scope.ckdSelectCates = [];
    $scope.ckdSelectId = 0;

    // 监听传入总数据(allSelects)变化
    $scope.$watch('allSelects', function (allSelects) {
      if (!allSelects || !allSelects.length) return false;

      // 编辑模式
      if ($scope.is_edit) {
        if (!!$scope.editSelectId) {
          // 递归方法
          var allSelects = $scope.allSelects;
          var editSelectId = $scope.editSelectId;
          var select = allSelects.find(editSelectId, 'id', 'children');
          var initCates = function (select) {
            if (!!select.id) {
              var parent = allSelects.parent(select.id, 'id', 'children');
              if (!!parent) {
                $scope.disSelects.unshift(parent.children);
                $scope.ckdSelects.unshift(parent.id);
                initCates(parent);
              }
            }
          };
          initCates(select);
          $scope.ckdSelects.shift();
          $scope.ckdSelects.push(select.id);
          // 处理另一种模式
          for (var i = 0; i < $scope.ckdSelects.length; i++) {
            $scope.ckdSelectCates.push($scope.disSelects[i].find($scope.ckdSelects[i], 'id'));
          }
        }
      } else {
        $scope.disSelects.push(allSelects);
      };
    });

    // 监听选择改变
    $scope.selectChange = function (params) {

      // 如果每次切换到待选选项卡，则停止请求
      if (!params.id) return false;

      // 清除下拉分类的数组里对应下标之后的数据
      $scope.disSelects.splice(params.index + 1, $scope.disSelects.length - params.index + 1);
      $scope.ckdSelects.splice(params.index + 1, $scope.ckdSelects.length - params.index + 1);

      // 并puhs进新的数据
      var children = $scope.disSelects[params.index].find(params.id, 'id').children;
      if (!!children && !!children.length) $scope.disSelects.push(children);

      // 将要提交分类更新为select选中数组中的最后一个值
      $scope.ckdSelectId = $scope.ckdSelects[$scope.ckdSelects.length - 1];

      // 触发调用源回调
      if ($scope.selectChangeCallBack && angular.isFunction($scope.selectChangeCallBack)) $scope.selectChangeCallBack({ ckdSelectId: $scope.ckdSelectId, disSelects: $scope.disSelects });
    };

  }]);

  // Dom
  relatedSelect.directive('relatedSelect', function() {
    return {
      restrict: 'A',
      scope: {
        is_edit: '=isEdit',
        allSelects: '=selects', 
        editSelectId: '=selectId',
        selectChangeCallBack: '=selectChange'
      },
      templateUrl: function(element, attrs) {
        return attrs.templateUrl || 'partials/template/related-select/related-select.html';
      },
      controller: 'RSController',
      replace: true,
      link: function(scope, element, attrs) {
        // console.log(attrs);
      }
    };
  });

})();
