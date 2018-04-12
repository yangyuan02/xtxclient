// 引入 gulp及组件
const gulp        = require('gulp');                       //基础库
// const less        = require('gulp-less');                 //less
const sass        = require('gulp-sass');                 //sass
const minifycss   = require('gulp-minify-css');          //css压缩
const jshint      = require('gulp-jshint');             //js检查
const uglify      = require('gulp-uglify');            //js压缩
const rename      = require('gulp-rename');           //重命名
const concat      = require('gulp-concat');          //合并文件
const clean       = require('gulp-clean');         //清空文件夹
const notify      = require("gulp-notify");       //消息提醒
const sourcemaps  = require("gulp-sourcemaps");  //资源地图
const babel       = require("gulp-babel");
const shell       = require('gulp-shell');
const debug       = false;

// Less合并压缩
/*
gulp.task('Less', function () {
  var css_src = './src/less/admin.less';
  var css_dst = './css/';
  console.log('开始处理Less文件编译');
  gulp.src(css_src)
  .pipe(sourcemaps.init())
  .pipe(less())
  .pipe(sourcemaps.write())
  .pipe(gulp.dest(css_dst))
  .pipe(minifycss())
  .pipe(rename({ suffix: '.min' }))
  .pipe(gulp.dest(css_dst))
  .pipe(notify({ message: 'Less编译压缩完成' }))
});
*/

/*
gulp.task('Sass', function () {
  var css_src = './src/scss/xuetianxia.scss';
  var css_dst = './css/';
  console.log('开始处理Scss文件编译');
  return gulp.src(css_src)
  .pipe(sourcemaps.init())
  .pipe(sass({ outputStyle: 'expanded' }))
  .pipe(sourcemaps.write())
  .on('error', sass.logError)
  // .pipe(gulp.dest(css_dst))
  .pipe(rename({ basename: 'style' }))
  .pipe(gulp.dest(css_dst))
  .pipe(minifycss())
  .pipe(rename({ suffix: '.min' }))
  .pipe(gulp.dest(css_dst))
  .pipe(notify({ message: 'Sass文件编译完成' }))
});
*/

// Css合并压缩
gulp.task('Less', shell.task(['lessc --source-map -x src/less/admin.less css/admin.css']));
gulp.task('Sass', shell.task(['sass --style compressed src/scss/xuetianxia.scss css/style.css']));

// Angular主程序库压缩处理
gulp.task('angular_libs', function () {

  var js_src = [
                './scripts/libs/angular/angular.min.js', 
                './scripts/libs/angular/angular-resource.min.js',
                './scripts/libs/angular/angular-ui-router.min.js',
                './scripts/libs/angular/angular-animate.min.js', 
                './scripts/libs/angular/angular-storage.min.js',
                './scripts/libs/angular/angular-sanitize.min.js',
                ],
      js_dst ='./js/';

  console.log('开始处理Libs库');

  return gulp.src(js_src)
    // .pipe(jshint())
    // .pipe(jshint.reporter('default'))
    .pipe(concat('angular.libs.js'))
    .pipe(gulp.dest(js_dst))
    .pipe(rename({suffix: '.min'}))
    .pipe(uglify())
    .pipe(gulp.dest(js_dst))
    .pipe(notify({ message: 'Js-Libs库编译完成' }))
});

// Angular - Util压缩处理
gulp.task('angular_util', function () {

  var js_src = [
                './scripts/utils/*.js',

                './scripts/im/strophe.js',
                './scripts/im/easemob.im-1.1.js',
                './scripts/im/easemob.im-1.1.shim.js',
                './scripts/im/easemob.im.config.js',

                './scripts/player/video.js',
                './scripts/player/videojs-contrib-hls.js',
                './scripts/player/videojs-resolution-switcher.js'
               ],
      js_dst ='./js/';

  console.log('开始自动化处理Js_Util');

  return gulp.src(js_src)
    .pipe(concat('angular.util.js'))
    .pipe(gulp.dest(js_dst))
    .pipe(rename({suffix: '.min'}))
    .pipe(uglify())
    .pipe(gulp.dest(js_dst))
    .pipe(notify({ message: 'Js_Util编译完成' }))
});

// Angular - App压缩处理
gulp.task('angular_main', function () {

  var js_src = [
                './scripts/libs/angular-modules/angular-chat.js',
                './scripts/libs/angular-modules/angular-validation.js',
                './scripts/libs/angular-modules/angular-validation-rule.js',
                './scripts/libs/angular-modules/angular-rating.js',
                './scripts/libs/angular-modules/angular-modal.js',
                './scripts/libs/angular-modules/angular-datepicker.js',
                './scripts/libs/angular-modules/angular-video-player.js',
                './scripts/libs/angular-modules/angular-sortable-view.min.js',
                './scripts/libs/angular-modules/angular-loading-bar.js',
                './scripts/libs/angular-modules/angular-related-select.js',
                // './scripts/libs/angular-modules/angular-lazy-image.js',

                './scripts/directives/*.js', 
                '!./scripts/directives/LayoutDirective.js', 

                './scripts/controllers/home/MainController.js',
                './scripts/controllers/home/HeaderController.js',
                './scripts/controllers/home/ArticleController.js',
                './scripts/controllers/home/IndexController.js',
                './scripts/controllers/home/AuthController.js',
                './scripts/controllers/home/CourseController.js',
                './scripts/controllers/home/LearnController.js',
                './scripts/controllers/home/PaymentController.js',
                './scripts/controllers/home/OrganizationlController.js',
                './scripts/controllers/home/UserController.js',
                './scripts/controllers/home/LessonController.js',
                './scripts/controllers/home/IncomeController.js',
                './scripts/controllers/home/StudentController.js',
                './scripts/controllers/home/TeacherController.js',
                './scripts/controllers/home/SchoolController.js',
                
                './scripts/services/*.js',
                '!./scripts/services/UserService.js',

                './scripts/models/*.js', 
                '!./scripts/models/UserModel.js',

                './scripts/providers/*.js',

                './scripts/filters/*.js', 

                './appRoutes.js',

                './app.js',
               ],
      js_dst ='./js/';

  console.log('开始自动化处理Js_Main');

  return gulp.src(js_src)
    .pipe(concat('angular.main.js'))
    .pipe(gulp.dest(js_dst))
    // .pipe(babel({ 
      // presets: ['es2015'],
      // compact: false
    // }))
    .pipe(rename({suffix: '.min'}))
    
    .pipe(uglify({
      // 保留注释
      // preserveComments: ,
      // 输出配置
      output: {
        // 美化
        beautify: debug,
        comments: /^nothing/i,
      },
      compress: {
        // 序列
        sequences: !debug,
        // 布尔值
        booleans: !debug,
        // 条件语句
        conditionals: !debug,
        // 
        hoist_funs: false,
        // 变量
        hoist_vars: debug,
        // 警告
        warnings: debug,
      },
      // 是否修改变量名
      mangle: false
    }).on('error', function(e){
      console.log(e);
    }))
    .pipe(gulp.dest(js_dst))
    .pipe(notify({ message: 'Js_Main编译完成' }))
});

// Admin - Util压缩处理
gulp.task('admin_util', function () {

  var js_src = [
                './scripts/utils/*.js',

                './scripts/player/video.js',
                './scripts/player/videojs-contrib-hls.js',
                './scripts/player/videojs-resolution-switcher.js'
               ],
      js_dst ='./js/';

  console.log('开始自动化处理Js_Util');

  return gulp.src(js_src)
    .pipe(concat('admin.util.js'))
    .pipe(gulp.dest(js_dst))
    .pipe(rename({suffix: '.min'}))
    .pipe(uglify())
    .pipe(gulp.dest(js_dst))
    .pipe(notify({ message: 'Js_Util编译完成' }))
});

// Admin - Admin压缩处理
gulp.task('admin_main', function () {

  var js_src = [
                './scripts/libs/angular-modules/*.js',
                '!./scripts/libs/angular-modules/angular-rating.js',
                './scripts/directives/*.js', 
                '!./scripts/directives/FocusAddClassDirective.js', 
                '!./scripts/directives/BreadcrumbDirective.js', 
                './scripts/controllers/admin/*.js', 
                './scripts/providers/*.js',
                './scripts/services/*.js',
                './scripts/filters/*.js', 
                './scripts/models/*.js', 
                './adminRoutes.js',
                './admin.js',
               ],
      js_dst ='./js/';

  console.log('开始自动化处理Js_Main_Admin');

  return gulp.src(js_src)
    // 检查代码
    // .pipe(jshint())
    // .pipe(jshint.reporter('default'))
    .pipe(concat('admin.main.js'))
    .pipe(gulp.dest(js_dst))
    .pipe(rename({suffix: '.min'}))
    .pipe(uglify({
      // 输出配置
      output: {
        // 美化
        beautify: debug,
        comments: debug ? true : /^!|\b(copyright|license)\b|@(preserve|license|cc_on)\b/i,
      },
      compress: {
        // 序列
        sequences: !debug,
        // 布尔值
        booleans: !debug,
        // 条件语句
        conditionals: !debug,
        // 
        hoist_funs: false,
        // 变量
        hoist_vars: debug,
        // 警告
        warnings: debug,
      },
      // 是否修改变量名
      mangle: false
    }))
    .pipe(gulp.dest(js_dst))
    .pipe(notify({ message: 'Js_Main_Admin编译完成' }))
});

// 监听任务 运行语句 gulp watch
gulp.task('watch',function(){

  console.log('开始启用Gulp监听服务');

  // 监听Less
  gulp.watch('./src/less/**/*.less', function(){
    console.log('监听到Less文件发生变动');
    gulp.start('Less');
  });

  // 监听Sass
  gulp.watch('./src/scss/**/*.scss', function(){
    console.log('监听到Scss文件发生变动');
    gulp.start('Sass');
  });
});

// 默认任务/启动监听
gulp.task('default', ['watch']);