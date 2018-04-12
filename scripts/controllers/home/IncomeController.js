/*
* IncomeController Module
*
* Description
*/

angular.module('IncomeController', ['angular.validation', 'angular.modal', 'TeacherModel', 'WithdrawModel', 'BankModel'])
.controller('IncomeController', ['$rootScope', '$scope', '$stateParams', '$location', '$localStorage', '$interval', '$modal', 'dateFilter', 'AuthProvider', 'CommonProvider', 'CommonModel', 'TeacherModel', 'WithdrawModel', 'BankModel',
  function ($rootScope, $scope, $stateParams, $location, $localStorage, $interval, $modal, dateFilter, AuthProvider, CommonProvider, CommonModel, TeacherModel, WithdrawModel, BankModel) {

    // 初始化
    $scope.income = {};
    $scope.income.lists = {};
    $scope.income.charts = {};
    $scope.withdraw = {};
    $scope.withdraw.status = 0;
    $scope.bankAcount = {};
    $scope.bankAcount.bank = {};
    $scope.bankAcount.alipay = {};

    // 获取基本信息
    AuthProvider.init(function (user) {
      $scope.user = user;
    });

    // 获取我的收入列表
    $scope.getIncomeLists = function (params) {
      CommonProvider.promise({
        model: TeacherModel,
        method: 'incomeDetail',
        params: {
          per_page: 7,
          page: params.page || 1
        },
        success: function(lists){
          $scope.income.lists = lists;
        }
      });
    };

    // 获取我的收入图表数据
    $scope.getIncomeCharts = function (dateUnit) {

      // 避免重复请求/并初始化图表
      if (!!$scope.income.charts[dateUnit]) {
        return false;
      }
      $scope.income.charts[dateUnit] = $scope.income.charts[dateUnit] || {};

      // 图表默认配置
      var charts_config = {
        grid: {
          height: 170,
          left: '5%',
          right: '5%',
          top: '18%'
        },
        title: {
          text: '近' + ((dateUnit == 'w') ? '7天' : ((dateUnit == 'M') ? '一个月' : '三个月' )) + '收入',
        },
        tooltip: {
          trigger: 'axis',
          formatter: '日期: {b0}<br/>收入: {c0} 元'
        },
        legend: {
          data:['收入金额（元）']
        },
        xAxis: {
          type: 'category',
          boundaryGap: false,
          data: [],
          nameGap: 50,
          axisLabel: {
            margin: 15
          }
        },
        dataZoom: [{   
          xAxisIndex: 0,
          type: 'slider',
          start: 0,
          end: 100,
          dataBackgroundColor: '#eee',
          fillerColor: 'rgba(221,221,221,0.2)',
          handleColor: '#ddd',
          handleSize: 8,
          filterMode: 'filter'
          },{
          yAxisIndex: 0,
          type: 'slider',
          start: 0,
          end: 100,
          dataBackgroundColor: '#eee',
          fillerColor: 'rgba(221,221,221,0.2)',
          handleColor: '#ddd',
          handleSize: 8,
          filterMode: 'filter'
        }],
        yAxis: {},
        series: [{
          name: '收入金额（元）',
          type: 'line',
          data: [],
          symbolSize: 10,
          legendHoverLink: true,
          smooth: true,
          clipOverflow: true,
          lineStyle: {
            normal: {
              width: 2
            }
          }
        }],
        color: ['#1dba9c']
      };

      // 图表构建方法
      var chartsBuild = function (dateUnit) {
        $scope.income.charts[dateUnit].chart = {};
        var x_axis_data = function () {
          var before = moment().subtract(1, dateUnit);
          var today = moment().startOf('day');
          var days = Math.ceil(moment.duration(today - before).asDays());
          var date_array = [];
          var date_item;
          for (var i = 1; i <= days; i++) {
            date_item = dateFilter(new Date(moment().subtract(i,'d')._d), 'MM-dd');
            date_array.unshift(date_item);
          };
          return date_array;
        };
        $scope.income.charts[dateUnit].chart = echarts.init(document.getElementById('J_chart_' + dateUnit));
        $scope.income.charts[dateUnit].config = charts_config;
        $scope.income.charts[dateUnit].config.xAxis.data = x_axis_data();
        $scope.income.charts[dateUnit].config.title.text += '（共' + eval($scope.income.charts[dateUnit].data.join('+')) + '元）';
        $scope.income.charts[dateUnit].config.series[0].data = $scope.income.charts[dateUnit].data;
        $scope.income.charts[dateUnit].chart.setOption($scope.income.charts[dateUnit].config);
      };

      // 请求图表数据
      CommonProvider.promise({
        model: TeacherModel,
        method: 'incomeDaily',
        params: { start_date: dateFilter(new Date(moment().subtract(1, dateUnit)._d), 'yyyy-MM-dd') },
        success: function(charts){
          $scope.income.charts[dateUnit].data = charts.result;
          chartsBuild(dateUnit);
        }
      });
    };

    // 获取提现记录
    $scope.getWithdrawRecord = function (params) {
      CommonProvider.promise({
        model: WithdrawModel,
        method: 'get',
        params: {
          per_page: 15,
          page: params.page || 1
        },
        success: function(records){
          $scope.withdraw.records = records;
        }
      });
    };

    // 获取金融账户
    $scope.getBankAccount = function () {
       CommonProvider.promise({
        model: BankModel,
        method: 'get',
        params: {
          role: 'user',
          per_page: 100,
          page: 1
        },
        success: function(banks){
          $scope.withdraw.banks = banks;
        }
      });
    };

    // 申请提现
    $scope.postWithDraw = function (withdraw) {
      if (withdraw.amount > $scope.user.profile.income_remain) {
        $modal.error({
          title: '错误',
          message: '提现金额不能大于总余额'
        });
        return false;
      };
      CommonProvider.promise({
        model: WithdrawModel,
        method: 'apply',
        params: {
          amount: withdraw.amount,
          bank_account_id: withdraw.bank_account_id,
        },
        success: function(_withdraw){
          $scope.withdraw.status = 1;
          $scope.user.profile.income_remain = _withdraw.result;
          $rootScope.user.profile.income_remain = _withdraw.result;
          $localStorage.user.profile.income_remain = _withdraw.result;
        }
      });
    };

    // 删除金融账户
    $scope.delAccount = function (bank) {
      $modal.confirm({
        title: '确认操作',
        message: '确认要删除吗?',
        info: '确定要删除本账户吗？如果删除，则该账户将不可恢复，但不影响已申请的提现',
        onsubmit: function () {
          CommonProvider.promise({
            model: BankModel,
            method: 'del',
            params: { bank_id: bank.id },
            success: function(_bank){
              console.log(_bank);
              $scope.withdraw.banks.result.remove(bank);
              $scope.withdraw.banks.pagination.total -= 1;
            }
          });
        }
      });
    };

    // 支付宝账户输入禁止中文
    $scope.alipayIdFormat = function (account) {
      $scope.bankAcount.alipay.account = !account ? '' : account.replace(/[\u4E00-\u9FA5\uf900-\ufa2d]/g,'');
    };

    // 银行卡号4位空格格式化
    $scope.$watch('bankAcount.bank.account', function (account) {
      $scope.bankAcount.bank.account = account == null ? '' : account.replace(/\D/g,'').replace(/....(?!$)/g,'$& ');
    });

    // 身份证号码匹配
    $scope.identityIdFormat = function (identity) {
      $scope.bankAcount.bank.identity = identity == null ? '' : identity.replace(/[^(0-9|x|X)]/g,'');
    };

    // 识别银行归属及银行图片
    $scope.getBankInfo = function (bank_id) {

      // 非空继续执行
      if (bank_id != null) {

        // 去除空格
        var card_id = bank_id.replace(/\s/g, "");

        if (card_id.length < 16 || card_id.length > 19) {
          return false;
        }

      } else {
        return false;
      }

      // return false;

      // 符合规则则请求数据
      CommonProvider.promise({
        model: BankModel,
        method: 'getInfo',
        params: { card_num: card_id },
        success: function(bank_info){
          $scope.bankAcount.bank.info = bank_info.result;
        }
      });
    };

    // 获取短信验证码
    $scope.getVerifyCode = function (phone) {

      // 如果电话号码是空，则警告不请求
      if (!phone) {
        $modal.error({message: '手机号码不能为空'});
        return false;
      };

      // 如果处于等待状态
      if ($scope.verify_status == true) {
        return false;
      }
      
      // 计时器
      var timePromise;
      var verifyTimimg = function(){
        timePromise = $interval(function(){
          $scope.verify_seconds -= 1;
          $scope.verify_status = true;
          if ($scope.verify_seconds == 0) {
            $scope.verify_status = false;
          }
        }, 1000, $scope.verify_seconds);
        return timePromise;
      }

      // 请求验证码
      CommonProvider.promise({
        model: CommonModel,
        method: 'sms',
        params: { 
          rule: 'check_mobile_exists',
          phone: phone
        },
        success: function(_bank){
          // 等待时间，获取成功时才触发
          $scope.verify_seconds = 60;
          // 倒计时
          verifyTimimg();
        },
        error: function (_bank) {
          $modal.error({ message: _bank.message });
        }
      });
    };

    // 添加提现账户
    $scope.addBankAccount = function (bankAcount) {
      var account = {
        // 验证码
        code: bankAcount.v_code,
        // 类型
        account_type: $scope.bankAcount.type,
        // 账户
        account_num: bankAcount.account.replace(/\s/g, ''),
        // 账户编码/ABC/Alipay
        account_code: bankAcount.account_code || bankAcount.info.bank_code,
        // 银行全名
        account_name: bankAcount.account_name || bankAcount.info.bank_name
      };

      // 如果银行卡识别信息不正常，则判断信息是否OK
      if (account.account_type == 2) {
        account.bank_user_ID = bankAcount.identity;
        account.bank_user_phone = bankAcount.phone;
        if ($scope.bankAcount.bank.info.card_type != 1) {
          $scope.bankAcount.bank.status = 0;
          $scope.bankAcount.bank.msg = $scope.bankAcount.bank.info.card_type == -1 ? '不支持信用卡提现' : ($scope.bankAcount.bank.info.card_type == 0 ? '您提供的银行信息无效' : '网络故障，请刷新重试');
          return false;
        }
      };

      // console.log(account);

      CommonProvider.promise({
        model: BankModel,
        method: 'add',
        params: account,
        result: function(_bank_account){
          $scope.bankAcount.status = _bank_account.code;
        },
        error: function (_bank_account) {
          $modal.error({ message: _bank_account.message });
        }
      });
    };
  }
])