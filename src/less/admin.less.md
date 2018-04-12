//== 常用变量 
//== FAQ: - : 直接量;   ~ : 计算量;

// 静态资源API:              $static-file-api;

// 默认边距(20):             $gauge;

// 企业-色:                  $brand-primary;

// 企业-反色:                $brand-warning;     $brand-danger;  

// 浅企业-色:                $brand-color-light;

// 最浅灰色-#F4F4F0:         $gray-lightsuper;

// 灰-EEE:                  $gray-lightest;

// 黑-000:                  $gray-base;

// #-333(深字):              $gray-dark;

// #-777:                   $gray-light;

// #-999:                   $gray-lighter;

// 背景-白:                  $body-bg;

// 字~12px:                 $font-size-small;   

// 字~14px:                 $font-size-base;  

// 字~16px:                 $font-size-h4; 

// 字~18px:                 $font-size-large;

// 字~20px:                 $font-size-h3;

// 行高~1.4:                 $line-height-base;

// 计算行高~20px:             $line-height-computed;

// 宽度-20px:                $grid-gutter-width;

// 行内元素内边距-(10 25):     $nav-link-padding;

// tab元素内边距-(13 27):      $nav-tab-padding;

//--------------------------------------------------

//== 常用函数

// 企业色按钮:                 btn-primary

// 按钮样式:                   @include button-variant(color,background-color,border-color);

// 按钮尺寸:                   @include button-size(padding/10px 5px,font-size/14px,line-height/$line-height-computed,border-radius);

// 元素圆角:                   @include radius($radius);

// 盒子尺寸:                   @include size(10px,20px);

// 块级盒居中:                 @include center-block;

// 正方形盒子:                 @include square(30px);

// r/p/f定位:                 @include position(absolute,left 0 bottom 0); / @include absolute(left 10px bottom 40%);


// 盒计算Hack:                @include box-sizing(border-sizing);

// 文本溢出省略:               @include text-overflow;

// input/color:              @include placeholder($gray-dark);


//== CSS3Hack

// 关键帧Hack:              @include keyframes(name){frames...};

// 动画Hack:                @include animation(name .5s);

// 过渡Hack:                @include transition(all .5s);

// 旋转Hack:                @include rotate(90deg);

// 缩放Hack:                @include scale(2);

// --------------------------------------------------