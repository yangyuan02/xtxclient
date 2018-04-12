/**
* StudentController Module
*
* Description
*/
angular.module('StudentController', ['StudentModel', 'TradeModel', 'NoteModel', 'QuestionModel', 'FavoriteModel'])
.controller('StudentController', ['$rootScope', '$scope', '$stateParams', '$state', '$localStorage', 'CommonProvider', 'StudentModel', 'TradeModel', 'NoteModel', 'QuestionModel', 'FavoriteModel',
  function ($rootScope, $scope, $stateParams, $state, $localStorage, CommonProvider, StudentModel, TradeModel, NoteModel, QuestionModel, FavoriteModel) {

    // 初始化
    $scope.student = {};
    $scope.student_id = $stateParams.student_id || false;
    $scope.course_sort_id = 2;

    // 获取基本信息
    $scope.getStudentInfo = function (target_page) {
      CommonProvider.promise({
        model: StudentModel,
        method: 'get',
        params: { target_type: $scope.student_id },
        success: function (student) {
          $scope.student.info = student.result;
          $rootScope.title = $scope.student.info.name + '的个人主页';
        }
      });
    };

    // 获取学生课程
    $scope.getStudentCourses = function (params) {
      CommonProvider.promise({
        model: TradeModel,
        method: 'get',
        params: { 
          role: 'student',
          user_id: $scope.student_id,
          page: params.page || 1,
          per_page: 20
        },
        success: function (courses) {
          $scope.student.courses = courses;
          $rootScope.toTop();
        }
      });
    };

    // 获取笔记收藏状态
    $scope.getNoteFavStatus = function () {
      CommonProvider.promise({
        model: FavoriteModel,
        method: 'getStatus',
        params: { 
          type: 'note',
          target_ids: $scope.student.notes.result.ids().join(','),
          per_page: 100
        },
        success: function (status) {
          var followeds = status.result;
          var notes = $scope.student.notes.result;
          followeds.forEach(function (id) {
            notes.forEach(function(note) {
               if (note.id == id) note.is_followed = 1;
            });
          });
        }
      });
    };

    // 获取笔记
    $scope.getStudentNotes = function (params) {
      CommonProvider.promise({
        model: NoteModel,
        method: 'get',
        params: { 
          role: 'student',
          user_id: $scope.student_id,
          page: params.page || 1,
          per_page: 20
        },
        success: function (notes) {
          $scope.student.notes = notes;
          $scope.getNoteFavStatus();
          $rootScope.toTop();
        }
      });
    };

    // 获取问题
    $scope.getStudentQuestions = function (params) {
      CommonProvider.promise({
        model: QuestionModel,
        method: 'get',
        params: { 
          role: 'student',
          user_id: $scope.student_id,
          type: 'question',
          page: params.page || 1,
          per_page: 20
        },
        success: function (questions) {
          $scope.student.questions = questions;
          $rootScope.toTop();
        }
      });
    };

    // 获取回答
    $scope.getStudentAnswers = function (params) {
      CommonProvider.promise({
        model: QuestionModel,
        method: 'get',
        params: { 
          role: 'student',
          user_id: $scope.student_id,
          type: 'answer',
          page: params.page || 1,
          per_page: 20
        },
        success: function (answers) {
          $scope.student.answers = answers;
          $rootScope.toTop();
        }
      });
    };

    // 收藏笔记
    $scope.addFavNote = function (note) {
      var doFav = function () {
        CommonProvider.promise({
          model: FavoriteModel,
          method: 'add',
          params: {
            type: 'note',
            target_id: note.id
          },
          success: function(fav){
            note.is_followed = 1;
          },
          error: function (fav) {
            $modal.error({ message: fav.message });
          }
        });
      };
      if (!!$localStorage.token) {
        doFav();
      } else {
        $rootScope.modal.login(function () {
          doFav();
        });
      };
    };

  }
]);