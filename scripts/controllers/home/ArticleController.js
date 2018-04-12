/*
 * ArticleController
 */
angular.module('ArticleController', ['ArticleModel'])
.controller('ArticleController', ['$rootScope', '$scope', '$state', '$modal', '$stateParams', '$location', 'CommonProvider', 'ArticleModel',
  function ($rootScope, $scope, $state, $modal, $stateParams, $location, CommonProvider, ArticleModel) {

    // 初始化
    $scope.currentArticle = {};
    $scope.category_id = $stateParams.category_id || false;
    $scope.article_id = $stateParams.article_id || false;

    // 根据分类id请求此分类下的文章列表
    $scope.getArticleList = function () {
      CommonProvider.promise({
        model: ArticleModel,
        method: 'get',
        params: {
          role: 'user',
          category_id: $scope.category_id,
          per_page: 100
        },
        success: function(articles){
          $scope.articles = articles.result;
          $scope.currentArticle = $scope.articles[0];
        }
      });
    };

    // 请求入驻协议
    $scope.getRegistlicense = function () {
      Main.get_license({ type: 'user_register' }, function (license) {
        if (license.code == 1) {
          $scope.license = license.result;
        } else {
          $modal.error({ message: license.message });
        }
      });
    };

  }
]);
