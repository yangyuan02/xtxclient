(function() {
  angular.module('angular.validation.rule', ['angular.validation'])
    .config(['$validationProvider',
      function($validationProvider) {

        var expression = {
          price: function(value, scope, element, attrs, param) {
            if (Number(value) >= 0) return true;
            return false;
          },
          required: function(value, scope, element, attrs, param) {
            return ((value !== undefined) && (value !== ''));
          },
          url: /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[-;:&=\+\$,\w]+@)?[A-Za-z0-9.-]+|(?:www.|[-;:&=\+\$,\w]+@)[A-Za-z0-9.-]+)((?:\/[\+~%\/.\w-_]*)?\??(?:[-\+=&;%@.\w_]*)#?(?:[\w]*))?)/,
          email: /^([\w-\.]+)@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.)|(([\w-]+\.)+))([a-zA-Z]{2,4}|[0-9]{1,3})(\]?)$/,
          mobile: /^(13[0-9]{9})|(18[0-9]{9})|(15[0-9]{9})|(14[57][0-9]{8})|(17[0-9]{9})$/,
          number: /^\d+\.?\d*$/,
          minlength: function(value, scope, element, attrs, param) {
            if (typeof value == 'number') {
              return value.toString().length >= param;
            } else {
              return value.length >= param;
            }
          },
          maxlength: function(value, scope, element, attrs, param) {
            if (typeof value == 'number') {
              return value.toString().length <= param;
            } else {
              return value.length <= param;
            }
          },
          /*验证密码是否相等*/
          pwdVerify: function (value, scope, element, attrs, param) {
            /*如果参数是对象*/
            if(param.indexOf('.') > 0 ){
              var paramArrays = param.split(".");
              var params = new Object();
              for (var i = 0; i < paramArrays.length - 1; i++) {
                params[paramArrays[i]] = paramArrays[i + 1];
              }
              for (var key in params) {
                return value == scope.$parent[key][params[key]];
              };
            } else {
              return value == scope.$parent[param];
            }
          },
          min: function (value, scope, element, attrs, param) {
            return parseInt(value) >= parseInt(param);
          },
          max: function (value, scope, element, attrs, param) {
            return parseInt(value) <= parseInt(param);
          },
          /*自定义方法，支持方法，变量，取反*/
          custom: function (value, scope, element, attrs, param) {

            if (param.indexOf('(') > 0 && param.indexOf(')') > 0) {

              /*判断如果是函数*/
              var fun_before = param.indexOf('(');
              var fun_after  = param.indexOf(')');
              var fun = param.substring(0, fun_before);
              var pam = param.substring(fun_before + 1, fun_after);
              return !!eval('scope.$parent.' + fun + '(' + scope.$parent[pam] + ')' + ';');
            } else {

              /*否则读取变量数据*/
              if (param[0] == '!') {
                return !!!scope.$parent[param.substr(1)];
              } else {
                return !!scope.$parent[param];
              }
            }
          }
        };

        var defaultMsg = {
          price: {
            error: '请输入价格',
            success: ' '
          },
          required: {
            error: '此项必填',
            success: ' '
          },
          url: {
            error: 'URL格式不正确',
            success: ' '
          },
          email: {
            error: '邮箱格式不正确',
            success: ' '
          },
          mobile: {
            error: '手机号码不正确',
            success: ' '
          },
          number: {
            error: '格式应为数字',
            success: ' '
          },
          minlength: {
            error: '长度不正确',
            success: ' '
          },
          maxlength: {
            error: '长度不正确',
            success: ' '
          },
          pwdVerify: {
            error: '两次密码不相符',
            success: ' '
          },
          min: {
            error: '不可少于最小值限制',
            success: ' '
          },
          max: {
            error: '不可超过最大值限制',
            success: ' '
          },
          custom: {
            error: '不符合要求',
            success: ' '
          }
        };

        $validationProvider.setExpression(expression).setDefaultMsg(defaultMsg);

      }
    ]);

}).call(this);
