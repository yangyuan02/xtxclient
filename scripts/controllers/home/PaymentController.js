/*
* PaymentController Module
*
* Description
*/

angular.module('PaymentController', ['PaymentModel'])
.controller('PaymentController', ['$rootScope', '$scope', '$stateParams', '$state', '$window', '$location', '$localStorage', '$interval', '$timeout', '$modal', 'CommonProvider', 'PaymentModel', 'CommonModel',
  function ($rootScope, $scope, $stateParams, $state, $window, $location, $localStorage, $interval, $timeout, $modal, CommonProvider, PaymentModel, CommonModel) {

    // 初始化
    $scope.course_ids = $stateParams.course_ids;
    $scope.course_id = parseInt($stateParams.course_ids);

    // 定义支付宝银行卡支付列表
    $scope.banks = {
      ICBC: {name: '中国工商银行', value: 'ICBCB2C'},
      CCB: {name: '中国建设银行', value: 'CCB'},
      ABC: {name: '中国农业银行', value: 'ABC'},
      CMB: {name: '招商银行', value: 'CMB'},
      BOC: {name: '中国银行', value: 'BO'},
      COMM: {name: '交通银行', value: 'COMM'},
      PSBC: {name: '中国邮政储蓄银行', value: 'PSBC-DEBIT'},
      GDB: {name: '广发银行', value: 'GDB'},
      SPDB: {name: '浦发银行', value: 'SPDB'},
      SPABANK: {name: '平安银行', value: 'SPABANK'},
      CIB: {name: '兴业银行', value: 'CIB'},
      CMBC: {name: '中国民生银行', value: 'CMBC'},
      SHBANK: {name: '上海银行', value: 'SHBANK'},
      BJRCB: {name: '北京农商银行', value: 'BJRCB'},
      HZCB: {name: '杭州银行', value: 'HZCBB2C'}
    }

    $scope.show_bankbox = false;
    $scope.total_amount = 0.00;
    $scope.account_remain = 0.00;
    $scope.is_remain_avariable = false;

    // 定义支付模型
    $scope.payment_model = {
      is_use_remain: false,
      is_use_thirdparty: false,
      thirdparty_disabled: false,
      warning_slug: false,
      verify_status: false,
      payment_id: '',
      payment_type: '',
      bank_code: '',
      payment_success: false,
      payment_warning: false
    }

    // 验证码正则
    $scope.verifyCodeCheck = function (value) {
      $scope.payment_verify_code = value == null ? '' : value.replace(/\W/g,'');
    }

    // 支付成功
    $scope.paymentSuccess = function () {

      $rootScope.modal.close();

      // 显示成功内容
      $scope.payment_model.payment_success = true;

      // 3秒后跳转至我的课程
      $scope.path_seconds = 3;
      $interval(function(){
        $scope.path_seconds -= 1;
        if ($scope.path_seconds == 0) {
          $location.path('/user/course');
        }
      }, 1000, $scope.path_seconds);
    };

    // 获取预支付单信息
    $scope.getPrepay = function () {
      CommonProvider.promise({
        model: PaymentModel,
        method: 'pay',
        params: { course_ids: $scope.course_ids },
        result: function(prepay){

          if (prepay.code == 1) {
            // 订单课程
            $scope.trades = prepay.result.trades;
            // 订单金额
            $scope.total_amount = prepay.result.total_amount;
            // 账户余额
            $scope.account_remain = prepay.result.account_remain;
            // 支付ID
            $scope.payment_model.payment_id = prepay.result.payment_id;
            // 余额为零状态
            $scope.is_remain_avariable = ($scope.account_remain <= 0) ? false : true;
            // 加载完成执行支付检查
            $scope.paymentCheck();
          }

          if (prepay.code == 2) {
            $scope.paymentSuccess();
          }

          if (prepay.code == 0) {
            $modal.error({ 
              message: prepay.message,
              lazytime: 1,
              callback: function () {
                $location.path('/user/course');
              },
            });
          }
        }
      });
    };

    // 变动检测逻辑
    $scope.paymentChange = function () {

      // 如果余额大于订单金额,且选中了余额支付,则取消第三方勾选及禁用第三方
      if ($scope.account_remain >= $scope.total_amount) {
        if ($scope.payment_model.is_use_remain) {
          $scope.payment_model.is_use_thirdparty = false;
          $scope.payment_model.thirdparty_disabled = true;
        } else {
          $scope.payment_model.thirdparty_disabled = false;
        }
      }

      // 如果第三方支付未选中，则将银行数据提交为空
      if ($scope.payment_model.is_use_thirdparty == false) {
        $scope.payment_model.bank_code = '';
      }
    }
    

    // 支付检查
    $scope.paymentCheck = function () {

      // 有可用账户余额
      if ($scope.is_remain_avariable) {

        // 选中余额支付
        $scope.payment_model.is_use_remain = true;

        // 判断是否足够支付
        if ($scope.account_remain >= $scope.total_amount) {

          // 足够则不勾选第三方支付
          $scope.payment_model.is_use_thirdparty = false;
          $scope.payment_model.thirdparty_disabled = true;
        } else {

          // 不够支付则启用第三方
          $scope.payment_model.is_use_thirdparty = true;
        }
      } else {

        // 无可用余额，禁用余额支付选择控件,并启用第三方控件
        $scope.payment_model.is_use_remain = false;
        $scope.payment_model.is_use_thirdparty = true;
      }
    }

    // 请求手机验证码
    $scope.getVerifyCode = function (phone) {

      // 如果在已请求状态,则返回
      if ($scope.payment_model.verify_status) {
        return false;
      };

      // 请求验证码
      CommonProvider.promise({
        model: CommonModel,
        method: 'sms',
        params: { rule: 'check_mobile_exists', phone: phone },
        success: function(sms){
          // 请求成功，显示控件，更改状态
          $scope.payment_model.verify_status = true;
        },
        error: function () {
          // 请求成功，显示控件，更改状态
          $scope.payment_model.verify_status = true;
        }
      });
    };

    // 确认付款状态
    $scope.getPaymentStatus = function () {
      if ($state.current.name != 'payment') return false;
      CommonProvider.promise({
        model: PaymentModel,
        method: 'getPayStatus',
        params: { payment_id: $scope.payment_model.payment_id },
        success: function(pay){
          // console.log('请求支付状态', pay);
          // console.log('当前路由', $state.current.name);
          var is_pay_success = pay.result.pay_status == 1;
          var is_pay_failed = pay.result.pay_status == -1;
          var is_use_wx_pay = $scope.payment_model.payment_type == 'wxpay';
          is_pay_success && $scope.paymentSuccess();
          if (!is_pay_success) {
            if (is_use_wx_pay && is_pay_failed) {
              $rootScope.modal.close();
              $scope.getPrepay();
              $modal.error({ message: '支付失败，请重新支付' });
            };
            is_use_wx_pay && !is_pay_failed && $timeout($scope.getPaymentStatus, 1500);
            is_use_wx_pay || $modal.error({ message: '支付失败，请重新支付' });
          }
        },
        error: function (pay) {
          $modal.error({ message: pay.message });
          return false;
        }
      });
    }

    // 提交付款
    $scope.submitPayment = function () {

      // 复位
      $scope.payment_model.payment_warning = false;

      // 支付检查
      if (!$scope.payment_model.is_use_thirdparty && !$scope.payment_model.is_use_remain) {

        // 如果没有选中项,则进行支付检查,且不提交
        $scope.paymentCheck();
        return false;

      } else if ($scope.payment_model.is_use_thirdparty) {

        // 如果包含平台支付,则判断支付渠道是否选中
        if ($scope.payment_model.bank_code == '') {

          // 如果支付渠道未选,则提示错误,且不提交
          $rootScope.goTo('payment_thirdparty');
          $scope.payment_model.warning_slug = true;
          return false;
        }
      } else if ($scope.payment_model.is_use_remain && !$scope.payment_model.is_use_thirdparty) {

        // 如果仅选择余额支付,则判断余额是否足够支付
        if ($scope.account_remain < $scope.total_amount) {

          //如果余额不足够支付,则选中第三方支付,且不提交
          $scope.payment_model.is_use_thirdparty = true;
          return false;
        } else {

          // 如果余额足够,则判断手机验证码是否已请求
          if ($scope.payment_model.verify_status) {

            // 如果已请求,则判断用户是否输入了验证码
            if (!$scope.payment_verify_code) {

              // 如果没有输入,则提示输入的提示
              $scope.payment_verify_code_status = 1;
              return false;
            }
          } else {

            // 如果未请求,则请求验证码,且显示输入控件(在请求模块完成),不提交数据
            $scope.getVerifyCode($rootScope.user.phone);
            return false;
          }
        }
      }

      // 支付渠道标示
      if ($scope.payment_model.bank_code == 'ALIPAY') {
        $scope.payment_model.payment_type = 'alipay';
      } else if ($scope.payment_model.bank_code == 'WECHAT') {
        $scope.payment_model.payment_type = 'wxpay';
      } else {
        $scope.payment_model.payment_type = 'bankpay';
      };
      
      // 配置支付
      var payment_config = {
        // 支付方式 alipay、bankpay、alimobile、wxpay、wxmobile
        payment_type: this.payment_model.payment_type,
        // 银行渠道
        bank_code: this.payment_model.bank_code,
        // 是否使用余额
        use_remain: (this.payment_model.is_use_remain == true) ? 1 : 0,
        // 是否使用第三方
        use_thirdparty: (this.payment_model.is_use_thirdparty == true) ? 1 : 0,
        // token: $localStorage.token,
        code: $scope.payment_verify_code
      };

      // 如果是第三方则新窗打开
      if ($scope.payment_model.is_use_thirdparty && $scope.payment_model.payment_type != 'wxpay') {
        var pay_window = window.open('', '_blank');
      };

      // 如果是微信支付
      if ($scope.payment_model.payment_type == 'wxpay') {
        $modal.warning({
          title: '正在请求支付接口',
          message: '正在生成支付二维码，请勿刷新'
        });
      };

      // 请求支付地址
      CommonProvider.promise({
        model: PaymentModel,
        method: 'payment',
        params: { 
          body: payment_config, 
          payment_id: this.payment_model.payment_id
        },
        result: function(pay){

          // 返回成功
          if (pay.code == 1) {

            // 第三方支付（且不是微信），则执行新窗+弹窗
            if ($scope.payment_model.is_use_thirdparty && $scope.payment_model.payment_type != 'wxpay') {
              pay_window.location = pay.result;
              $modal.confirm({
                title: '请您在新打开的页面上完成付款',
                message: '付款完成前请不要关闭此窗口',
                button: { confirm: '付款成功', cancel: '遇到问题' },
                onsubmit: $scope.getPaymentStatus,
                oncancel: function () {
                  $scope.payment_model.payment_warning = true;
                  $rootScope.goTo('payment');
                }
              });

            // 微信支付
            } else if ($scope.payment_model.payment_type == 'wxpay') {
              // console.log('微信支付地址或者二维码已拿到', pay);
              $rootScope.modal.close();
              $modal.custom({
                title: '扫描二维码支付本课程',
                template: '<div>' +
                            '<div class="col-xs-12">' +
                              '<div class="col-xs-offset-3 col-xs-6">' + 
                                '<p class="text-center">' + 
                                  '<img class="img-thumbnail" src="/server/api/v1/qrcode?text=' + pay.result.code_url + '">' +
                                '</p>' +
                              '</div>' +
                            '</div>' +
                            '<div class="col-xs-12">' +
                              '<div class="col-xs-offset-3 col-xs-6">' + 
                                '<p class="text-center">' + 
                                  '<img class="img-rounded" src="images/pay/PAY_WX_ PROMPT.png">' + 
                                '</p>' +
                              '</div>' +
                            '</div>' +
                          '</div>'
              });
              $timeout($scope.getPaymentStatus, 4000);

            // 否则，支付成功
            } else {
              $scope.paymentSuccess();
            }
          } else {
            $modal.error({
              message: pay.message
            });
          }
        },
        error: function (err) {

          // 提示验证码错误
          $scope.payment_verify_code_status = 2;
        }
      });
    }
  }
]);