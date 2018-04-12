/**
/* angular-im
 * @By Surmon(surmon.me)
 *
 */
(function() {

  // 使用严格模式
  "use strict";
  var videoPlayer = angular.module('angular-chat', ['ChatModel']);

  // 数据传入
  videoPlayer.directive('chatBox', ['$rootScope', '$templateCache', '$compile', '$stateParams', '$location', 'ChatModel', 'CommonProvider', 'appConfig', function($rootScope, $templateCache, $compile, $stateParams, $location, ChatModel, CommonProvider, appConfig) {
    return {
      restrict: 'A',
      replace: true,
      scope: { roomid: '=roomId', isPlayback: '=isPlayback' },
      templateUrl: 'partials/home/course/chatbox.html',
      link: function ($scope, element, attrs) {

        // 初始化/消息/房间
        $scope.messages = [];
        $scope.historys = [];
        $scope.section = $stateParams.section_id || false;
        $scope.room = {
          id: $scope.roomid,
          user: $rootScope.user,
          uid: $rootScope.user.id,
          pwd: $rootScope.user.phone,
          playback: $scope.isPlayback || false,
          faces: Easemob.im.EMOTIONS,
          logined: false,
          occupants: [],
          error: false
        };

        // 聊天
        $scope.chat = {
          content: '',
          emotion: {
            show: false
          },
          pictype: ['jpg','gif','png','bmp'],
          notification: false
        };

        // 图片弹窗事件
        $scope.imagePreview = function (image) {
          return $rootScope.modal.imagePreview(image);
        };

        // 分支判断是否为实时聊天
        if (!$scope.room.id || !$scope.room.uid || !$scope.room.pwd) {

          // 无法启动
          if (!$scope.room.playback) {
            // console.log('缺少必要参数，聊天室ChatRoom没有启动成功', $scope.room);
            $scope.room.error = true;
          };

          // 回放模式
          if (!!$scope.room.playback) {

            // console.log('回放模式，请求聊天历史');
            $scope.messages.push({
              msg_type: 'status',
              content: '历史讨论记录'
            });

            var getMoreHistory = function (params) {
              var params = params || {};
              CommonProvider.promise({
                model: ChatModel,
                method: 'message',
                params: {
                  section_id: $scope.section,
                  page: params.page || 1,
                  per_page: 10
                },
                success: function(messages){
                  // console.log(messages);

                  if (messages.pagination.total == 0) {
                    $scope.messages.push({
                      msg_type: 'status',
                      content: '无历史讨论'
                    });
                  };

                  $scope.historys = messages;
                  var messages = messages.result
                  var occupants = angular.copy($scope.room.occupants);
                  var current_user;
                  for (var i = 0; i < messages.length; i++) {
                    current_user = Number(messages[i].from);
                    if (!$scope.room.occupants.contain(current_user)) {
                      $scope.room.occupants.push(current_user);
                    };
                    messages[i].date = messages[i].ext.weichat.date || moment(messages[i].send_time).format('YYYY-MM-DD HH:mm:ss');
                    if (messages[i].msg_type == 'txt') {
                      messages[i].data = Easemob.im.Utils.parseLink(Easemob.im.Utils.parseEmotions(messages[i].msg));
                    };
                    if (messages[i].msg_type == 'img') {
                      messages[i].url = appConfig.fileUrl + messages[i].url;
                      messages[i].data = '<a href="" onclick="angular.element(this).scope().imagePreview(\'' + messages[i].url + '\');return false;"><img src="' + messages[i].url + '"></a>';
                    };
                  };

                  if (occupants.toString() != $scope.room.occupants.toString()) {
                    if (!!$scope.room.occupants.length) $scope.$emit('chatRoomUserChanged', $scope.room.occupants);
                  };

                  $scope.messages = $scope.messages.concat(messages);

                }
              });
            };

            getMoreHistory();

            // 绑定滑动事件
            $('#J_chat_lists').scroll(function () {
              if (this.scrollTop + this.offsetHeight >= this.scrollHeight) {
                var historys = $scope.historys;
                if (historys.pagination.current_page < historys.pagination.total_page) {
                  getMoreHistory({ page: historys.pagination.current_page + 1 });
                } else {
                  if ($scope.messages.last().msg_type == 'status') return false;
                  $scope.$apply(function () {
                    $scope.messages.push({
                      msg_type: 'status',
                      content: '没有更多记录'
                    });
                  });
                }
              };
            });
          };

          return false;
        };

        // 监听聊天室成员变动
        var emitOccupants = function () {
          var occupants = $scope.room.occupants;
          // console.log('发射成员变动', occupants);
          if (!!occupants.length) $scope.$emit('chatRoomUserChanged', occupants);
        };

        // 绑定Body-Click事件，使表情框，失焦隐藏
        $('body').click(function (event) {
          var is_emotion_box = $(event.toElement).attr('id') == 'J_emotion_box' || $(event.toElement).hasClass('chat-tool-btn') || $(event.toElement).hasClass('icon') || $(event.toElement).parents('#J_emotion_box').length > 0;
          if (!is_emotion_box && $scope.chat.emotion.show) {
            $scope.$apply(function () {
              $scope.chat.emotion.show = false;
            });
          }
        });

        // 桌面通知权限
        $scope.authorizeNotification = function () {
          Notification.requestPermission(function(permission) {
            $scope.chat.notification = permission;
            // console.log(permission);
            if (permission == 'granted') {
              // $scope.showNotification();
            }
          });
        };

        // 发出桌面通知消息
        $scope.showNotification = function (message) {
          if ($scope.chat.notification != 'granted') return false;
          if (message.from == $scope.room.uid) return false;
          // console.log(message);
          var notification = new Notification('收到来自学天下直播室的新消息', {
            dir: 'auto',
            lang: '',
            body: message.msg || message.content || (message.data.indexOf('<img') == 0 ? '[表情]' : (message.data[0] == '<' ? '[图片]' : message.data)),
            tag: message,
          });
        };

        // 添加表情
        $scope.addEmotion = function (key) {
          $scope.chat.content += key;
          $scope.chat.emotion.show = false;
        };

        // 创建连接
        var conn = new Easemob.im.Connection({
          multiResources: Easemob.im.config.multiResources,
          https : Easemob.im.config.https,
          url: Easemob.im.config.xmppURL
        });

        // 用户登录
        var login = function () {
          conn.open({
            user : $scope.room.uid.toString(),
            pwd : $scope.room.pwd,
            appKey : 'xuetianxia#xuetianxia-chat'
          });
        };

        login();

        // 用户退出
        var logout = function() {
          conn.close();
          conn.clear();
        };

        // 加入聊天室
        var joinRoom = function () {

          // 加入聊天室
          conn.joinChatRoom({ roomId: $scope.room.id });

          // 获取聊天室成员
          queryOccupants();
        };

        // 退出聊天室
        var quitRoom = function () {
          conn.quitChatRoom({
            roomId: $scope.room.id
          });
        };

        // 获取聊天室成员信息
        var queryOccupants = function () {
          conn.queryRoomOccupants({
            roomId : $scope.room.id,
            success : function(members) {
              var occupants = [];
              if (members) {
                for (var i = 0; i < members.length; i++) {
                  var jid = members[i].jid;
                  jid = jid.right(jid.length - jid.find('easemob.com/'));
                  occupants.push(Number(jid));
                }
              }
              $scope.room.occupants = occupants;
              emitOccupants();
            }
          });
        };

        // 添加聊天数据
        var appendMsgTimer;
        var appendMsg = function (message) {
          // console.log('PUSH消息', message);
          $scope.messages.push(message);
          var listAutoToBottom = function () {
            $scope.showNotification(message);
            var $lists = $("#J_chat_lists");
            if ($lists[0] && $lists[0].scrollHeight) {
              $lists.animate({ scrollTop: $lists[0].scrollHeight }, 'slow');
            }
          };
          if (!!appendMsgTimer) clearTimeout(appendMsgTimer);
          if (message.click) return appendMsgTimer = setTimeout(listAutoToBottom, 300);
          appendMsgTimer = setTimeout(listAutoToBottom, 800);
        };

        var appendStatusMsg = function (message) {
          // $scope.$apply(function () {
            appendMsg({
              content: message,
              msg_type: 'status'
            });
          // });
        };

        // 发送文本消息
        $scope.sendTextMessage = function (msg) {
          if (!msg) return false;
          var message = {
            to: $scope.room.id,
            msg: msg,
            ext: {
              weichat: {
                date: moment().format('YYYY-MM-DD HH:mm:ss'),
                user: {
                  name: $scope.room.user.name,
                  gravatar: $scope.room.user.gravatar
                }
              }
            },
            type: "groupchat",
            roomType: "chatroom"
          };
          conn.sendTextMessage(message);
          message.data = Easemob.im.Utils.parseLink(Easemob.im.Utils.parseEmotions(msg));
          message.date = message.ext.weichat.date || moment().format('YYYY-MM-DD HH:mm:ss');
          message.from = $scope.room.uid;
          message.click = true;
          $scope.chat.content = '';
          appendMsg(message);
        };

        // 发送图片消息
        $scope.sendPicMessage = function() {
          var fileObj = Easemob.im.Helper.getFileUrl('J_emotion_pic');
          if (Easemob.im.Helper.isCanUploadFileAsync && (fileObj.url == null || fileObj.url == '')) return console.warn('未选择图片');
          var filetype = fileObj.filetype;
          var filename = fileObj.filename;
          if (!Easemob.im.Helper.isCanUploadFileAsync || $scope.chat.pictype.contain(filetype)) {
            var options = {
              type: 'groupchat',
              roomType: 'chatroom',
              to: $scope.room.id,
              ext: {
                weichat: {
                  date: moment().format('YYYY-MM-DD HH:mm:ss'),
                  user: {
                    name: $scope.room.user.name,
                    gravatar: $scope.room.user.gravatar
                  }
                }
              },
              fileInputId: 'J_emotion_pic',
              filename: filename,
              apiUrl: Easemob.im.config.apiURL,
              onFileUploadError : function(error) {
                console.log(error);
                // $rootScope.modal.error({ message: '发送图片文件失败', info: error.msg });
              },
              onFileUploadComplete : function(data) {
                var img_src = fileObj.url || data.uri + '/' + data.entities[0].uuid;
                var send_date = data.timestamp ? moment(data.timestamp).format('YYYY-MM-DD HH:mm:ss') : moment().format('YYYY-MM-DD HH:mm:ss');
                appendMsg({
                  click: true,
                  type: 'groupchat',
                  roomType: 'chatroom',
                  from: $scope.room.uid,
                  to: $scope.room.id,
                  data: '<a href="" onclick="angular.element(this).scope().imagePreview(\'' + img_src + '\');return false;"><img src="' + img_src + '"></a>',
                  date: send_date,
                  ext: {
                    weichat: {
                      date: send_date,
                      user: {
                        name: $scope.room.user.name,
                        gravatar: $scope.room.user.gravatar
                      }
                    }
                  }
                });
                $scope.$apply();
              }
            };
            conn.sendPicture(options);
          } else {
            $rootScope.modal.error({
              message: '不支持此图片类型' + filetype,
              info: '图片格式不支持'
            });
          }
        };

        // 解析文本/表情消息
        var handleTextMessage = function (message) {
          var new_msg = angular.copy(message);
          $scope.$apply(function () {
            new_msg.ext = new_msg.ext || {};
            new_msg.ext.weichat = new_msg.ext.weichat || {};
            new_msg.date = new_msg.ext.weichat.date || moment().format('YYYY-MM-DD HH:mm:ss');
            var message_content = new_msg.data;
            var new_message_content = '';
            if (typeof message_content != 'string') {
              for (var i = 0; i < message_content.length; i++) {
                var msg = message_content[i];
                var type = msg.type;
                var data = msg.data;
                switch(type) {
                  case 'emotion':
                    new_message_content += '<img src="' + data + '"/>';
                    break;
                  case 'pic':
                  case 'audio':
                  case 'video':
                    break;
                  case 'txt':
                    new_message_content += data;
                    break;
                  default:
                    new_message_content += data;
                    break;
                };
              };
            } else {
              new_message_content += message_content;
            };
            new_msg.data = new_message_content;
            appendMsg(new_msg);
          });
        };

        // 解析图片消息
        var handlePicMessage = function (_message) {
          var message = {};
          message.ext = _message.ext || {};
          message.ext.weichat = message.ext.weichat || {};
          message.date = message.ext.weichat.date || moment().format('YYYY-MM-DD HH:mm:ss');
          message.data = '<a href="" onclick="angular.element(this).scope().imagePreview(\'' + _message.url + '\');return false;"><img src="' + _message.url + '"></a>';
          message.from = _message.from;
          message.to = _message.to;
          message.type = 'groupchat';
          message.roomType = 'chatroom';
          appendMsg(message);
          $scope.$apply();
        };

        // 绑定回车键
        $("#J_chat_textarea").keydown(function(event) {
          if ((event.altKey || event.ctrlKey || event.shiftKey) && event.keyCode == 13) {
            event.returnValue = true;
          } else if (event.keyCode == 13) {
            event.returnValue = false;
            $scope.$apply(function () {
              $scope.sendTextMessage($scope.chat.content);
            });
            return false;
          }
        });

        // 监听
        conn.listen({

          // 连接成功
          onOpened : function() {

            // console.log('连接成功');
            $scope.room.logined = true;
            appendStatusMsg('服务器连接成功');

            // 设置上线
            conn.setPresence();

            // 启动心跳包
            if (conn.isOpened()) conn.heartBeat(conn);

            // 加入聊天室
            joinRoom();
          },

          // 连接关闭
          onClosed : function() {
            // console.log('连接关闭');
            appendStatusMsg('连接关闭');
          },

          // 收到文本消息
          onTextMessage : function(message) {
            // console.log('收到文本消息', message);
            handleTextMessage(message);
          },

          // 收到表情消息
          onEmotionMessage : function(message) {
            // console.log('收到表情消息', message);
            handleTextMessage(message);
          },

          // 收到图片消息
          onPictureMessage : function(message) {
            // console.log('收到图片消息', message);
            handlePicMessage(message);
          },

          // 收到音频消息
          onAudioMessage : function(message) {
            // console.log('收到音频消息',message);
          },

          // 收到位置消息
          onLocationMessage : function(message) {
            // console.log('收到位置消息',message);
          },

          // 收到文件消息
          onFileMessage : function(message) {
            // console.log('收到文件消息',message);
          },

          // 收到视频消息
          onVideoMessage: function(message) {
            // console.log('收到视频消息',message);
          },

          // 收到联系人订阅请求
          onPresence: function(message) {
            // console.log('联系人订阅消息', message);
            var jid = message.fromJid;
            jid = jid.right(jid.length - jid.find('easemob.com/'));
            // 判断如果成员不在数组中则，push进数组
            // console.log('此刻成员', $scope.room.occupants);
            var originUid = Number(jid);
            // console.log(originUid);
            // console.log($scope.room.occupants.contain(originUid));
            if (!!originUid && !$scope.room.occupants.contain(originUid)) {
              $scope.room.occupants.push(originUid);
              emitOccupants();
            }
            var msg = jid == $scope.room.uid ? '加入聊天室成功' : '新用户加入聊天室';
            appendStatusMsg(msg);
          },

          // 收到联系人信息
          onRoster: function(message) {
            // console.log(message);
          },

          // 收到群组邀请
          onInviteMessage: function(message) {
            // console.log(message);
          },

          // 异常
          onError: function(err) {

            // console.log(err);
            appendStatusMsg(err.msg);

            // 重新登录
            if (err.type == 1) login();
          }
        });

        // 如果页面刷新或关闭，则断开连接
        $(window).bind('beforeunload', function() {
          if (conn) logout();
        });

        // 如果路由变动则断开连接
        $scope.$on('$locationChangeStart', function() {
          if (conn) logout();
        });

      }
    };
  }]);

})();

(function() {
  angular.module('angular.validation', ['angular.validation.provider', 'angular.validation.directive']);
}).call(this);

(function() {
  angular.module('angular.validation.provider', [])
  .provider('$validation', function() {

    var $injector,
      $scope,
      $http,
      $q,
      $timeout,
      _this = this;


    /**
     * Setup the provider
     * @param injector
     */
    var setup = function(injector) {
      $injector = injector;
      $scope = $injector.get('$rootScope');
      $http = $injector.get('$http');
      $q = $injector.get('$q');
      $timeout = $injector.get('$timeout');
    };


    /**
     * Define validation type RegExp
     * @type {{}}
     */
    var expression = {};


    /**
     * default error, success message
     * @type {{}}
     */
    var defaultMsg = {};


    /**
     * Allow user to set a custom Expression, do remember set the default message using setDefaultMsg
     * @param obj
     * @returns {*}
     */
    this.setExpression = function(obj) {
      angular.extend(expression, obj);
      return _this;
    };


    /**
     * Get the Expression
     * @param exprs
     * @returns {*}
     */
    this.getExpression = function(exprs) {
      return expression[exprs];
    };


    /**
     * Allow user to set default message
     * @param obj
     * @returns {*}
     */
    this.setDefaultMsg = function(obj) {
      angular.extend(defaultMsg, obj);
      return _this;
    };


    /**
     * Get the Default Message
     * @param msg
     * @returns {*}
     */
    this.getDefaultMsg = function(msg) {
      return defaultMsg[msg];
    };


    /**
     * Override the errorHTML function
     * @param func
     * @returns {*}
     */
    this.setErrorHTML = function(func) {
      if (func.constructor !== Function) {
        return;
      }

      _this.getErrorHTML = func;

      return _this;
    };


    /**
     * Invalid message HTML, here's the default
     * @param message
     * @returns {string}
     */
    this.getErrorHTML = function(message) {
      return '<p class="validation-invalid">' + message + '</p>';
    };


    /**
     * Override the successHTML function
     * @param func
     * @returns {*}
     */
    this.setSuccessHTML = function(func) {
      if (func.constructor !== Function) {
        return;
      }

      _this.getSuccessHTML = func;

      return _this;
    };


    /**
     * Valid message HTML, here's the default
     * @param message
     * @returns {string}
     */
    this.getSuccessHTML = function(message) {
      return '<p class="validation-valid">' + message + '</p>';
    };


    /**
     * Whether show the validation success message
     * You can easily change this to false in your config
     * example: $validationProvider.showSuccessMessage = false;
     * @type {boolean}
     */
    this.showSuccessMessage = true;


    /**
     * Whether show the validation error message
     * You can easily change this to false in your config
     * example: $validationProvider.showErrorMessage = false;
     * @type {boolean}
     */
    this.showErrorMessage = true;

    /**
     * Check form valid, return true
     * checkValid(Form): Check the specific form(Form) valid from angular `$valid`
     * @param form
     * @returns {boolean}
     */
    this.checkValid = function(form) {
      if (form.$valid === undefined) {
        return false;
      }
      return (form && form.$valid === true);
    };


    /**
     * Validate the form when click submit, when `validMethod = submit`
     * @param form
     * @returns {promise|*}
     */
    this.validate = function(form) {

      var deferred = $q.defer(),
        idx = 0;

      if (form === undefined) {
        console.error('This is not a regular Form name scope');
        deferred.reject('This is not a regular Form name scope');
        return deferred.promise;
      }

      if (form.validationId) { // single
        $scope.$broadcast(form.$name + 'submit-' + form.validationId, idx++);
      } else if (form.constructor === Array) { // multiple
        for (var k in form) {
          $scope.$broadcast(form[k].$name + 'submit-' + form[k].validationId, idx++);
        }
      } else {
        for (var i in form) { // whole scope
          if (i[0] !== '$' && form[i].hasOwnProperty('$dirty')) {
            $scope.$broadcast(i + 'submit-' + form[i].validationId, idx++);
          }
        }
      }

      deferred.promise.success = function(fn) {
        deferred.promise.then(function(value) {
          fn(value);
        });
        return deferred.promise;
      };

      deferred.promise.error = function(fn) {
        deferred.promise.then(null, function(value) {
          fn(value);
        });
        return deferred.promise;
      };

      $timeout(function() {
        if (_this.checkValid(form)) {
          deferred.resolve('success');
        } else {
          deferred.reject('error');
        }
      });

      return deferred.promise;
    };

    /**
     * Do this function if validation valid
     * @param element
     */
    this.validCallback = null;

    /**
     * Do this function if validation invalid
     * @param element
     */
    this.invalidCallback = null;

    /**
     * reset the specific form
     * @param form
     */
    this.reset = function(form) {
      if (form === undefined) {
        console.error('This is not a regular Form name scope');
        return;
      }

      if (form.validationId) {
        $scope.$broadcast(form.$name + 'reset-' + form.validationId);
      } else if (form.constructor === Array) {
        for (var k in form) {
          $scope.$broadcast(form[k].$name + 'reset-' + form[k].validationId);
        }
      } else {
        for (var i in form) {
          if (i[0] !== '$' && form[i].hasOwnProperty('$dirty')) {
            $scope.$broadcast(i + 'reset-' + form[i].validationId);
          }
        }
      }
    };


    /**
     * $get
     * @returns {{setErrorHTML: *, getErrorHTML: Function, setSuccessHTML: *, getSuccessHTML: Function, setExpression: *, getExpression: Function, setDefaultMsg: *, getDefaultMsg: Function, checkValid: Function, validate: Function, reset: Function}}
     */
    this.$get = ['$injector',
      function($injector) {
        setup($injector);
        return {
          setErrorHTML: this.setErrorHTML,
          getErrorHTML: this.getErrorHTML,
          setSuccessHTML: this.setSuccessHTML,
          getSuccessHTML: this.getSuccessHTML,
          setExpression: this.setExpression,
          getExpression: this.getExpression,
          setDefaultMsg: this.setDefaultMsg,
          getDefaultMsg: this.getDefaultMsg,
          showSuccessMessage: this.showSuccessMessage,
          showErrorMessage: this.showErrorMessage,
          checkValid: this.checkValid,
          validate: this.validate,
          validCallback: this.validCallback,
          invalidCallback: this.invalidCallback,
          reset: this.reset
        };
      }
    ];

  });
}).call(this);

(function() {
  angular.module('angular.validation.directive', ['angular.validation.provider'])
  .directive('validator', ['$injector',
    function($injector) {

      var $validationProvider = $injector.get('$validation'),
        $q = $injector.get('$q'),
        $timeout = $injector.get('$timeout');

      /**
       * Do this function if validation valid
       * @param element
       * @param validMessage
       * @param validation
       * @param callback
       * @param ctrl
       * @returns {}
       */
      var validFunc = function(element, validMessage, validation, scope, ctrl) {
        var messageElem,
          messageToShow = validMessage || $validationProvider.getDefaultMsg(validation).success;

        if (scope.messageId)
          messageElem = angular.element(document.querySelector('#' + scope.messageId));
        else
          messageElem = element.next();

        if ($validationProvider.showSuccessMessage && messageToShow) {
          messageElem.html($validationProvider.getSuccessHTML(messageToShow));
        }

        ctrl.$setValidity(ctrl.$name, true);
        if (scope.validCallback) scope.validCallback({
          message: messageToShow
        });
        if ($validationProvider.validCallback) $validationProvider.validCallback(element);

        return true;
      };


      /**
       * Do this function if validation invalid
       * @param element
       * @param validMessage
       * @param validation
       * @param callback
       * @param ctrl
       * @returns {}
       */
      var invalidFunc = function(element, validMessage, validation, scope, ctrl) {
        var messageElem,
          messageToShow = validMessage || $validationProvider.getDefaultMsg(validation).error;

        if (scope.messageId)
          messageElem = angular.element(document.querySelector('#' + scope.messageId));
        else
          messageElem = element.next();

        if ($validationProvider.showErrorMessage && messageToShow) {
          messageElem.html($validationProvider.getErrorHTML(messageToShow));
        }

        ctrl.$setValidity(ctrl.$name, false);
        if (scope.invalidCallback) scope.invalidCallback({
          message: messageToShow
        });
        if ($validationProvider.invalidCallback) $validationProvider.invalidCallback(element);

        return false;
      };


      /**
       * collect elements for focus
       * @type {Object}
       ***private variable
       */
      var focusElements = {};


      /**
       * Check Validation with Function or RegExp
       * @param scope
       * @param element
       * @param attrs
       * @param ctrl
       * @param validation
       * @param value
       * @returns {}
       */
      var checkValidation = function(scope, element, attrs, ctrl, validation, value) {

        var validators = validation.slice(0),
          validatorExpr = validators[0].trim(),
          paramIndex = validatorExpr.indexOf('='),
          validator = paramIndex === -1 ? validatorExpr : validatorExpr.substr(0, paramIndex),
          validatorParam = paramIndex === -1 ? null : validatorExpr.substr(paramIndex + 1),
          leftValidation = validators.slice(1),
          successMessage = validator + 'SuccessMessage',
          errorMessage = validator + 'ErrorMessage',
          expression = $validationProvider.getExpression(validator),
          valid = {
            success: function() {
              validFunc(element, attrs[successMessage], validator, scope, ctrl);
              if (leftValidation.length) {
                return checkValidation(scope, element, attrs, ctrl, leftValidation, value);
              } else {
                return true;
              }
            },
            error: function() {
              return invalidFunc(element, attrs[errorMessage], validator, scope, ctrl);
            }
          };

        if (expression === undefined) {
          console.error('You are using undefined validator "%s"', validator);
          if (leftValidation.length) {
            return checkValidation(scope, element, attrs, ctrl, leftValidation, value);
          } else {
            return;
          }
        }
        // Check with Function
        if (expression.constructor === Function) {
          return $q.all([$validationProvider.getExpression(validator)(value, scope, element, attrs, validatorParam)])
            .then(function(data) {
              if (data && data.length > 0 && data[0]) {
                return valid.success();
              } else {
                return valid.error();
              }
            }, function() {
              return valid.error();
            });
        }
        // Check with RegExp
        else if (expression.constructor === RegExp) {
          // Only apply the test if the value is neither undefined or null
          if (value !== undefined && value !== null)
            return $validationProvider.getExpression(validator).test(value) ? valid.success() : valid.error();
          else
            return valid.error();
        } else {
          return valid.error();
        }
      };


      /**
       * generate unique guid
       */
      var s4 = function() {
        return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
      };
      var guid = function() {
        return (s4() + s4() + s4() + s4());
      };


      return {
        restrict: 'A',
        require: 'ngModel',
        scope: {
          model: '=ngModel',
          initialValidity: '=initialValidity',
          validCallback: '&',
          invalidCallback: '&',
          messageId: '@'
        },
        link: function(scope, element, attrs, ctrl) {

          /**
           * watch
           * @type {watch}
           *
           * Use to collect scope.$watch method
           *
           * use watch() to destroy the $watch method
           */
          var watch = function() {};

          /**
           * validator
           * @type {Array}
           *
           * Convert user input String to Array
           */
          var validation = attrs.validator.split(',');

          /**
           * guid use
           */
          var uid = ctrl.validationId = guid();


          /**
           * Set initial validity to undefined if no boolean value is transmitted
           */
          var initialValidity;
          if (typeof scope.initialValidity === 'boolean') {
            initialValidity = scope.initialValidity;
          }

          /**
           * Default Valid/Invalid Message
           */
          if (!scope.messageId)
            element.after('<span class="validation-msg"></span>');

          /**
           * Set custom initial validity
           * Usage: <input initial-validity="true" ... >
           */
          ctrl.$setValidity(ctrl.$name, initialValidity);

          /**
           * Reset the validation for specific form
           */
          scope.$on(ctrl.$name + 'reset-' + uid, function() {

            /**
             * clear scope.$watch here
             * when reset status
             * clear the $watch method to prevent
             * $watch again while reset the form
             */
            watch();

            $timeout(function() {
              ctrl.$setViewValue('');
              ctrl.$setPristine();
              ctrl.$setValidity(ctrl.$name, undefined);
              ctrl.$render();
              if (scope.messageId)
                angular.element(document.querySelector('#' + scope.messageId)).html('');
              else
                element.next().html('');
            });

          });

          /**
           * Check validator
           */

          (function() {
            /**
             * Click submit form, check the validity when submit
             */
            scope.$on(ctrl.$name + 'submit-' + uid, function(event, index) {
              var value = ctrl.$viewValue,
                isValid = false;

              isValid = checkValidation(scope, element, attrs, ctrl, validation, value);

              if (attrs.validMethod === 'submit') {
                watch(); // clear previous scope.$watch
                watch = scope.$watch('model', function(value, oldValue) {

                  // don't watch when init
                  if (value === oldValue) {
                    return;
                  }

                  // scope.$watch will translate '' to undefined
                  // undefined/null will pass the required submit /^.+/
                  // cause some error in this validation
                  if (value === undefined || value === null) {
                    value = '';
                  }

                  isValid = checkValidation(scope, element, attrs, ctrl, validation, value);
                });

              }

              var setFocus = function(isValid) {
                if (isValid) {
                  delete focusElements[index];
                } else {
                  focusElements[index] = element[0];

                  $timeout(function() {
                    focusElements[Math.min.apply(null, Object.keys(focusElements))].focus();
                  }, 0);
                }
              };

              if (isValid.constructor === Object) isValid.then(setFocus);
              else setFocus(isValid);
            });

            /**
             * Validate blur method
             */
            if (attrs.validMethod === 'blur') {
              element.bind('blur', function() {
                var value = ctrl.$viewValue;
                scope.$apply(function() {
                  checkValidation(scope, element, attrs, ctrl, validation, value);
                });
              });

              return;
            }

            /**
             * Validate submit & submit-only method
             */
            if (attrs.validMethod === 'submit' || attrs.validMethod === 'submit-only') {
              return;
            }

            /**
             * Validate watch method
             * This is the default method
             */
            scope.$watch('model', function(value) {
              /**
               * dirty, pristine, viewValue control here
               */
              if (ctrl.$pristine && ctrl.$viewValue) {
                // has value when initial
                ctrl.$setViewValue(ctrl.$viewValue);
              } else if (ctrl.$pristine) {
                // Don't validate form when the input is clean(pristine)
                if (scope.messageId)
                  angular.element(document.querySelector('#' + scope.messageId)).html('');
                else
                  element.next().html('');
                return;
              }
              checkValidation(scope, element, attrs, ctrl, validation, value);
            });

          })();

          $timeout(function() {
            /**
             * Don't showup the validation Message
             */
            attrs.$observe('noValidationMessage', function(value) {
              var el;
              if (scope.messageId)
                el = angular.element(document.querySelector('#' + scope.messageId));
              else
                el = element.next();
              if (value == 'true' || value === true) {
                el.css('display', 'none');
              } else if (value == 'false' || value === false) {
                el.css('display', 'block');
              } else {}
            });
          });

        }
      };
    }
  ])

  .directive('validationSubmit', ['$injector',
    function($injector) {

      var $validationProvider = $injector.get('$validation'),
        $timeout = $injector.get('$timeout'),
        $parse = $injector.get('$parse');

      return {
        priority: 1, // execute before ng-click (0)
        require: '?ngClick',
        link: function postLink(scope, element, attrs) {
          var form = $parse(attrs.validationSubmit)(scope);

          $timeout(function() {
            // Disable ng-click event propagation
            element.off('click');
            element.on('click', function(e) {
              e.preventDefault();

              $validationProvider.validate(form)
                .success(function() {
                  $parse(attrs.ngClick)(scope);
                });
            });
          });

        }
      };
    }
  ])

  .directive('validationReset', ['$injector',
    function($injector) {

      var $validationProvider = $injector.get('$validation'),
        $timeout = $injector.get('$timeout'),
        $parse = $injector.get('$parse');

      return {
        link: function postLink(scope, element, attrs) {
          var form = $parse(attrs.validationReset)(scope);

          $timeout(function() {
            element.on('click', function(e) {
              e.preventDefault();
              $validationProvider.reset(form);
            });
          });

        }
      };
    }
  ]);
}).call(this);
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

angular.module('angular.bootstrap.rating', [])

.constant('uibRatingConfig', {
  max: 5,
  stateOn: null,
  stateOff: null,
  titles : ['one', 'two', 'three', 'four', 'five']
})

.controller('UibRatingController', ['$scope', '$attrs', 'uibRatingConfig', function($scope, $attrs, ratingConfig) {
  var ngModelCtrl = { $setViewValue: angular.noop };

  this.init = function(ngModelCtrl_) {
    ngModelCtrl = ngModelCtrl_;
    ngModelCtrl.$render = this.render;

    ngModelCtrl.$formatters.push(function(value) {
      if (angular.isNumber(value) && value << 0 !== value) {
        value = Math.round(value);
      }

      return value;
    });

    this.stateOn = angular.isDefined($attrs.stateOn) ? $scope.$parent.$eval($attrs.stateOn) : ratingConfig.stateOn;
    this.stateOff = angular.isDefined($attrs.stateOff) ? $scope.$parent.$eval($attrs.stateOff) : ratingConfig.stateOff;
    var tmpTitles = angular.isDefined($attrs.titles) ? $scope.$parent.$eval($attrs.titles) : ratingConfig.titles ;
    this.titles = angular.isArray(tmpTitles) && tmpTitles.length > 0 ?
      tmpTitles : ratingConfig.titles;

    var ratingStates = angular.isDefined($attrs.ratingStates) ?
      $scope.$parent.$eval($attrs.ratingStates) :
      new Array(angular.isDefined($attrs.max) ? $scope.$parent.$eval($attrs.max) : ratingConfig.max);
    $scope.range = this.buildTemplateObjects(ratingStates);
  };

  this.buildTemplateObjects = function(states) {
    for (var i = 0, n = states.length; i < n; i++) {
      states[i] = angular.extend({ index: i }, { stateOn: this.stateOn, stateOff: this.stateOff, title: this.getTitle(i) }, states[i]);
    }
    return states;
  };

  this.getTitle = function(index) {
    if (index >= this.titles.length) {
      return index + 1;
    }

    return this.titles[index];
  };

  $scope.rate = function(value) {
    if (!$scope.readonly && value >= 0 && value <= $scope.range.length) {
      ngModelCtrl.$setViewValue(ngModelCtrl.$viewValue === value ? 0 : value);
      ngModelCtrl.$render();
    }
  };

  $scope.enter = function(value) {
    if (!$scope.readonly) {
      $scope.value = value;
    }
    $scope.onHover({value: value});
  };

  $scope.reset = function() {
    $scope.value = ngModelCtrl.$viewValue;
    $scope.onLeave();
  };

  $scope.onKeydown = function(evt) {
    if (/(37|38|39|40)/.test(evt.which)) {
      evt.preventDefault();
      evt.stopPropagation();
      $scope.rate($scope.value + (evt.which === 38 || evt.which === 39 ? 1 : -1));
    }
  };

  this.render = function() {
    $scope.value = ngModelCtrl.$viewValue;
  };
}])

.directive('uibRating', function() {
  return {
    restrict: 'EA',
    require: ['uibRating', 'ngModel'],
    scope: {
      readonly: '=?',
      onHover: '&',
      onLeave: '&'
    },
    controller: 'UibRatingController',
    templateUrl: 'partials/template/rating/angular-rating.html',
    replace: true,
    link: function(scope, element, attrs, ctrls) {
      if (!attrs.readonly) {
        angular.element(element).css('cursor', 'pointer');
      }
      var ratingCtrl = ctrls[0], ngModelCtrl = ctrls[1];
      ratingCtrl.init(ngModelCtrl);
    }
  };
})

.directive('commentRating', function() {
  return {
    restrict: 'EA',
    require: ['commentRating', 'ngModel'],
    scope: {
      readonly: '=?',
      onHover: '&',
      onLeave: '&'
    },
    controller: 'UibRatingController',
    templateUrl: 'partials/home/course/comment.html',
    replace: true,
    link: function(scope, element, attrs, ctrls) {
      scope.type = attrs.type;
      scope.sizeWide = attrs.sizeWide || false;
      var ratingCtrl = ctrls[0], ngModelCtrl = ctrls[1];
      ratingCtrl.init(ngModelCtrl);
    }
  };
});
/**
 * 模态弹窗
 * v0.0.2
 *
 * @author max@winhu.com
 */
angular.module('angular.modal', [])

.factory('templateEngine', ['$rootScope', '$http', '$templateCache', '$compile', function ($rootScope, $http, $templateCache, $compile) {

  return function (params) {

    // 如果是自定义内容
    if (!!params.template) {
      params.success(params.template);
      return false;
    };

    // 请求模板内容
    $http.get(params.template_url, { cache: $templateCache }).success(function (tplContent) {
      params.success(tplContent);
    }).error(function () {
      params.error();
    });
  }
}])

.factory('$modal', ['$rootScope', 'templateEngine', '$compile', '$window', '$document', '$timeout', '$interval', function ($rootScope, templateEngine, $compile, $window, $document, $timeout, $interval) {

  // 弹窗居中
  var modal_center = function () {
    var vertical_center = function () {
      var e_height = $('#J_modal_dialog').height();
      var w_height = $(window).height();
      var m_height = (w_height - e_height) / 2;
      $('#J_modal_dialog').css('marginTop', m_height + 'px');
    };
    vertical_center();
    $(window).resize(vertical_center);
  };

  var modal = {
    timer_text: '',
    lazytime: 0,
    callback: '',
    openCallback: '',
    onsubmit: '',
    oncancel: '',
    modal_promise: '',
    init: function (param) {
      var _self = this,
          type = param.type,
          title = param.title || '提示信息',
          message = param.message || '',
          info = param.info || '',
          lazytime = param.lazytime || 2,
          template_url = param.template_url,
          template = param.template,
          button = param.button || { confirm: '确定', cancel: '取消' },
          callback = param.callback,
          openCallback = param.openCallback,
          onsubmit = param.onsubmit,
          oncancel = param.oncancel,
          icon = '',
          modal_class = '',
          modal_header = '',
          modal_body = '',
          modal_info = '',
          modal_footer = '';

      _self.lazytime = lazytime;
      _self.callback = callback;
      _self.openCallback = openCallback;
      _self.onsubmit = onsubmit;
      _self.oncancel = oncancel;

      if (!!info) modal_info = '<p class="info">'+ info + '</p>';

      // 弹窗（非图片）append方法
      var appendModal = function (_modal) {

        var template = '<div id="J_modal_box" class="modal fade in show">' +
          '<div id="J_modal_dialog" class="modal-dialog '+ (_modal.class || '') +'">' +
            '<div class="modal-content">' +
              '<div class="modal-header">' +
                '<button type="button" class="close" ng-click="modal.close()"><i class="icon icon-close h3"></i></button>' +
                '<h4 class="modal-title">'+ title +'</h4>' +
              '</div>' + _modal.body + (_modal.footer || '') +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div id="J_modal_backdrop" class="modal-backdrop fade"></div>';

        var scope = $rootScope.$new(true).$root;
        var modal_html = $compile(template)(scope);

        var append_modal = function () {
          // $document.find('body').addClass('modal-open');
          $('#J_main_container').append(modal_html);
          setTimeout(function () {
            $('#J_modal_backdrop').addClass('in');
            modal_center();
          }, 10);
          // 弹出弹窗后的回调函数
          if (!!_self.openCallback) $timeout(_self.openCallback, 40);
        };

        // 如果已有弹窗元素，则延时200毫秒再执行
        if(!!$('#J_modal_box').length) setTimeout(append_modal, 250);
        if(!$('#J_modal_box').length) append_modal();
      };

      switch (type) {
        case 'success':
        case 'error':
        case 'warning':
          icon = 'icon-' + type;
          // lazytime秒后自动关闭
          if (lazytime > 0) {
            this.autoClose();
          }
          modal_class = 'modal-message';
          modal_body = '<div id="J_modal_body" class="modal-body">' +
              '<i class="icon '+ icon +'"></i>' +
              message +
              modal_info +
              '<p class="info timer">' + lazytime +'秒后窗口将自动关闭</p>' +
            '</div>';
          break;
        case 'confirm':
          icon = 'icon-warning';
          modal_class = 'modal-confirm';
          modal_body = '<div id="J_modal_body" class="modal-body">' +
              '<i class="icon '+ icon +'"></i>' +
              message +
              modal_info +
            '</div>';
          modal_footer = '<div class="modal-footer" id="J_modal_footer">' +
              '<button type="button" class="btn btn-primary" ng-click="modal.submit()">'+ button.confirm +'</button>' +
              '<button type="button" class="btn btn-default" ng-click="modal.cancel()">'+ button.cancel +'</button>' +
            '</div>';
          break;
        case 'custom':
          templateEngine({
            template_url: template_url,
            template: template,
            success: function (tplContent) {
              modal_body = '<div id="J_modal_body" class="modal-body clearfix">' + tplContent + '</div>';
              appendModal({ class: 'modal-custom', body: modal_body });
            },
            error: function () {
              modal.init({
                type: 'error',
                info: '加载错误',
                message: '由于网络原因加载失败'
              })
            }
          });
          return;
          break;
        default: break;
      };
      appendModal({ class: modal_class, body: modal_body, footer: modal_footer });
    },
    initImage: function (param) {
      var _self = this;
      var url = param.url || '';
      if (!url) {
        modal.init({
          type: 'error',
          info: '图片错误',
          message: '无效图片地址'
        })
        return false;
      }
      var img = new Image();  
      img.onload = function(){
        var template = '<div id="J_modal_box" class="modal modal-image fade in show">' +
            '<div id="J_modal_dialog" class="modal-dialog">' +
              '<div class="modal-content">' +
                '<button type="button" class="close" ng-click="modal.close()"><i class="icon icon-close h3"></i></button>' +
                // '<a href="#" class="prev" ng-click="modal.close()"><i class="icon icon-arrow-left"></i></a>' +
                // '<a href="#" class="next" ng-click="modal.close()"><i class="icon icon-arrow-right"></i></a>' +
                '<img src="'+ url +'">' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div id="J_modal_backdrop" class="modal-backdrop fade"></div>';
        var scope = $rootScope.$new(true).$root;
        var modal_html = $compile(template)(scope);
        $('#J_main_container').append(modal_html);
        // $document.find('body').addClass('modal-open');
        $timeout(function () {
          $('#J_modal_backdrop').addClass('in')
          // $('#J_modal_box').click(modal.close);
          modal_center();
        }, 10);
        // $(window).scroll(function() { modal.close() });
      };  
      img.onerror = function(){
        modal.init({
          type: 'error',
          info: '图片错误',
          message: '图片加载失败'
        });
      };  
      img.src = url;
    },
    initLoading: function (param) {
      if (!!$('#J_loading_box').length) return;
      var _self = this,loader = param.loader || 'images/loader.gif';
      var template = '<div id="J_loading_box" class="modal modal-loading fade out show">' +
                      '<div class="loader">' +
                        '<img src="'+ loader +'">' +
                        // '<div class="loader">' + 
                        //   '<div class="loader-inner">' +
                        //     '<div class="sk-fading-circle">' + 
                        //       '<div class="sk-circle1 sk-circle"></div>' + 
                        //       '<div class="sk-circle2 sk-circle"></div>' + 
                        //       '<div class="sk-circle3 sk-circle"></div>' + 
                        //       '<div class="sk-circle4 sk-circle"></div>' + 
                        //       '<div class="sk-circle5 sk-circle"></div>' + 
                        //       '<div class="sk-circle6 sk-circle"></div>' + 
                        //       '<div class="sk-circle7 sk-circle"></div>' + 
                        //       '<div class="sk-circle8 sk-circle"></div>' + 
                        //       '<div class="sk-circle9 sk-circle"></div>' + 
                        //       '<div class="sk-circle10 sk-circle"></div>' + 
                        //       '<div class="sk-circle11 sk-circle"></div>' + 
                        //       '<div class="sk-circle12 sk-circle"></div>' + 
                        //     '</div>' + 
                        //   '</div>'  +
                        // '</div>'  +
                      '</div>';
      var scope = $rootScope.$new(true).$root;
      var loading_html = $compile(template)(scope);
      $('#J_main_container').append(loading_html);
      $timeout(function() {
        $('#J_loading_box').removeClass('out').addClass('in');
      }, 100);
    },
    success: function (param) {
      param.type = 'success';
      param.lazytime = param.lazytime || 1;
      this.init(param);
    },
    error: function (param) {
      param.type = 'error';
      param.lazytime = param.lazytime || 2;
      this.init(param);
    },
    warning: function (param) {
      param.type = 'warning';
      this.init(param);
    },
    confirm: function (param) {
      param.type = 'confirm';
      this.init(param);
    },
    custom: function (param) {
      param.type = 'custom';
      this.init(param);
    },
    loading: function (param) {
      if (param == undefined) {
        param = {};
      }
      param.type = 'loading';
      this.initLoading(param);
    },
    image: function (param) {
      param.type = 'image';
      this.initImage(param);
    },
    confirmSubmit: function () {
      var _self = this,
          onsubmit = this.onsubmit;
      _self.close();
      if ('function' == typeof(onsubmit)) {
        onsubmit();
      } else {
        eval(onsubmit);
      }
    },
    confirmCancel: function () {
      var _self = this,
          oncancel = this.oncancel;
      _self.close();
      if ('function' == typeof(oncancel)) {
        oncancel();
      } else {
        eval(oncancel);
      }
    },
    closeCallback: function() {
      var _self = this,callback = this.callback;
      if ('function' == typeof(callback)) {
        callback();
      } else {
        eval(callback);
      }
      _self.close();
    },
    close: function () {
      // $document.find('body').removeClass('modal-open');
      $('#J_modal_box').removeClass('in');
      $('#J_modal_backdrop').removeClass('in');
      if(!$('#J_modal_box').length) this.remove();
      if(!!$('#J_modal_box').length) $timeout(this.remove, 250);
      $interval.cancel(this.modal_promise);
    },
    autoClose: function () {
      var _self = this,
          timer = _self.lazytime;
      var modal_promise = $interval(function() {
        timer -= 1;
        angular.element(document.getElementById('J_modal_body').querySelector('.timer')).html(timer + '秒后窗口将自动关闭');
        if (timer == 0) {
          _self.closeCallback();
          $interval.cancel(modal_promise);
          timer = _self.lazytime = 0;
        }
      }, 1000);
      _self.modal_promise = modal_promise;
    },
    remove: function () {
      angular.element(document.getElementById('J_modal_box')).remove();
      angular.element(document.getElementById('J_modal_backdrop')).remove();
    },
    closeLoading: function () {
      if (!!$('#J_loading_box').length) {
        // $('body').removeClass('modal-open');
        $('#J_loading_box').removeClass('in').addClass('out');
        $timeout(function() {
          $('#J_loading_box').remove();
        }, 260);
      }
    },
    closeAll: function () {
      var _self = this;
      _self.closeLoading();
      _self.close();
    }
  };
  return modal;
}]);
(function(angular){
/* global moment */
var Module = angular.module('datePicker', []);

Module.constant('datePickerConfig', {
  template: 'templates/datepicker.html',
  view: 'month',
  views: ['year', 'month', 'date', 'hours', 'minutes'],
  momentNames: {
    year: 'year',
    month: 'month',
    date: 'day',
    hours: 'hours',
    minutes: 'minutes',
  },
  viewConfig: {
    year: ['years', 'isSameYear'],
    month: ['months', 'isSameMonth'],
    hours: ['hours', 'isSameHour'],
    minutes: ['minutes', 'isSameMinutes'],
  },
  step: 5
});

//Moment format filter.
Module.filter('mFormat', function () {
  return function (m, format, tz) {
    if (!(moment.isMoment(m))) {
      return moment(m).format(format);
    }
    return tz ? moment.tz(m, tz).format(format) : m.format(format);
  };
});

Module.directive('datePicker', ['datePickerConfig', 'datePickerUtils', function datePickerDirective(datePickerConfig, datePickerUtils) {

  //noinspection JSUnusedLocalSymbols
  return {
    // this is a bug ?
    require: '?ngModel',
    template: '<div ng-include="template"></div>',
    scope: {
      model: '=datePicker',
      after: '=?',
      before: '=?'
    },
    link: function (scope, element, attrs, ngModel) {
      function prepareViews() {
        scope.views = datePickerConfig.views.concat();
        scope.view = attrs.view || datePickerConfig.view;

        scope.views = scope.views.slice(
          scope.views.indexOf(attrs.maxView || 'year'),
          scope.views.indexOf(attrs.minView || 'minutes') + 1
        );

        if (scope.views.length === 1 || scope.views.indexOf(scope.view) === -1) {
          scope.view = scope.views[0];
        }
      }

      function getDate(name) {
        return datePickerUtils.getDate(scope, attrs, name);
      }

      datePickerUtils.setParams(attrs.timezone);

      var arrowClick = false,
        tz = scope.tz = attrs.timezone,
        createMoment = datePickerUtils.createMoment,
        eventIsForPicker = datePickerUtils.eventIsForPicker,
        step = parseInt(attrs.step || datePickerConfig.step, 10),
        partial = !!attrs.partial,
        minDate = getDate('minDate'),
        maxDate = getDate('maxDate'),
        pickerID = element[0].id,
        now = scope.now = createMoment(),
        selected = scope.date = createMoment(scope.model || now),
        autoclose = attrs.autoClose === 'true';

      if (!scope.model) {
        selected.minute(Math.ceil(selected.minute() / step) * step).second(0);
      }

      scope.template = attrs.template || datePickerConfig.template;

      scope.watchDirectChanges = attrs.watchDirectChanges !== undefined;
      scope.callbackOnSetDate = attrs.dateChange ? datePickerUtils.findFunction(scope, attrs.dateChange) : undefined;

      prepareViews();

      scope.setView = function (nextView) {
        if (scope.views.indexOf(nextView) !== -1) {
          scope.view = nextView;
        }
      };

      scope.selectDate = function (date) {
        if (attrs.disabled) {
          return false;
        }
        if (isSame(scope.date, date)) {
          date = scope.date;
        }
        date = clipDate(date);
        if (!date) {
          return false;
        }
        scope.date = date;

        var nextView = scope.views[scope.views.indexOf(scope.view) + 1];
        if ((!nextView || partial) || scope.model) {
          setDate(date);
        }

        if (nextView) {
          scope.setView(nextView);
        } else if (autoclose) {
          element.addClass('hidden');
          scope.$emit('hidePicker');
        } else {
          prepareViewData();
        }
      };

      function setDate(date) {
        if (date) {
          scope.model = date;
          if (ngModel) {
            ngModel.$setViewValue(date);
          }
        }
        scope.$emit('setDate', scope.model, scope.view);

        //This is duplicated in the new functionality.
        if (scope.callbackOnSetDate) {
          scope.callbackOnSetDate(attrs.datePicker, scope.date);
        }
      }

      function update() {
        var view = scope.view;
        datePickerUtils.setParams(tz);

        if (scope.model && !arrowClick) {
          scope.date = createMoment(scope.model);
          arrowClick = false;
        }

        var date = scope.date;

        switch (view) {
          case 'year':
            scope.years = datePickerUtils.getVisibleYears(date);
            break;
          case 'month':
            scope.months = datePickerUtils.getVisibleMonths(date);
            break;
          case 'date':
            scope.weekdays = scope.weekdays || datePickerUtils.getDaysOfWeek();
            scope.weeks = datePickerUtils.getVisibleWeeks(date);
            break;
          case 'hours':
            scope.hours = datePickerUtils.getVisibleHours(date);
            break;
          case 'minutes':
            scope.minutes = datePickerUtils.getVisibleMinutes(date, step);
            break;
        }

        prepareViewData();
      }

      function watch() {
        if (scope.view !== 'date') {
          return scope.view;
        }
        return scope.date ? scope.date.month() : null;
      }

      scope.$watch(watch, update);

      if (scope.watchDirectChanges) {
        scope.$watch('model', function () {
          arrowClick = false;
          update();
        });
      }

      function prepareViewData() {
        var view = scope.view,
          date = scope.date,
          classes = [], classList = '',
          i, j;

        datePickerUtils.setParams(tz);

        if (view === 'date') {
          var weeks = scope.weeks, week;
          for (i = 0; i < weeks.length; i++) {
            week = weeks[i];
            classes.push([]);
            for (j = 0; j < week.length; j++) {
              classList = '';
              if (datePickerUtils.isSameDay(date, week[j])) {
                classList += 'active';
              }
              if (isNow(week[j], view)) {
                classList += ' now';
              }
              //if (week[j].month() !== date.month()) classList += ' disabled';
              if (week[j].month() !== date.month() || !inValidRange(week[j])) {
                classList += ' disabled';
              }
              classes[i].push(classList);
            }
          }
        } else {
          var params = datePickerConfig.viewConfig[view],
              dates = scope[params[0]],
              compareFunc = params[1];

          for (i = 0; i < dates.length; i++) {
            classList = '';
            if (datePickerUtils[compareFunc](date, dates[i])) {
              classList += 'active';
            }
            if (isNow(dates[i], view)) {
              classList += ' now';
            }
            if (!inValidRange(dates[i])) {
              classList += ' disabled';
            }
            classes.push(classList);
          }
        }
        scope.classes = classes;
      }

      scope.next = function (delta) {
        var date = moment(scope.date);
        delta = delta || 1;
        switch (scope.view) {
          case 'year':
            /*falls through*/
          case 'month':
            date.year(date.year() + delta);
            break;
          case 'date':
            date.month(date.month() + delta);
            break;
          case 'hours':
            /*falls through*/
          case 'minutes':
            date.hours(date.hours() + delta);
            break;
        }
        date = clipDate(date);
        if (date) {
          scope.date = date;
          setDate(date);
          arrowClick = true;
          update();
        }
      };

      function inValidRange(date) {
        var valid = true;
        if (minDate && minDate.isAfter(date)) {
          valid = isSame(minDate, date);
        }
        if (maxDate && maxDate.isBefore(date)) {
          valid &= isSame(maxDate, date);
        }
        return valid;
      }

      function isSame(date1, date2) {
        return date1.isSame(date2, datePickerConfig.momentNames[scope.view]) ? true : false;
      }

      function clipDate(date) {
        if (minDate && minDate.isAfter(date)) {
          return minDate;
        } else if (maxDate && maxDate.isBefore(date)) {
          return maxDate;
        } else {
          return date;
        }
      }

      function isNow(date, view) {
        var is = true;

        switch (view) {
          case 'minutes':
            is &= ~~(now.minutes() / step) === ~~(date.minutes() / step);
            /* falls through */
          case 'hours':
            is &= now.hours() === date.hours();
            /* falls through */
          case 'date':
            is &= now.date() === date.date();
            /* falls through */
          case 'month':
            is &= now.month() === date.month();
            /* falls through */
          case 'year':
            is &= now.year() === date.year();
        }
        return is;
      }

      scope.prev = function (delta) {
        return scope.next(-delta || -1);
      };

      if (pickerID) {
        scope.$on('pickerUpdate', function (event, pickerIDs, data) {
          if (eventIsForPicker(pickerIDs, pickerID)) {
            var updateViews = false, updateViewData = false;

            if (angular.isDefined(data.minDate)) {
              minDate = data.minDate ? data.minDate : false;
              updateViewData = true;
            }
            if (angular.isDefined(data.maxDate)) {
              maxDate = data.maxDate ? data.maxDate : false;
              updateViewData = true;
            }

            if (angular.isDefined(data.minView)) {
              attrs.minView = data.minView;
              updateViews = true;
            }
            if (angular.isDefined(data.maxView)) {
              attrs.maxView = data.maxView;
              updateViews = true;
            }
            attrs.view = data.view || attrs.view;

            if (updateViews) {
              prepareViews();
            }

            if (updateViewData) {
              update();
            }
          }
        });
      }
    }
  };
}]);
/* global moment */

angular.module('datePicker').factory('datePickerUtils', function () {
var tz;
  var createNewDate = function (year, month, day, hour, minute) {
    var utc = Date.UTC(year | 0, month | 0, day | 0, hour | 0, minute | 0);
    return tz ? moment.tz(utc, tz) : moment(utc);
  };

  return {
    getVisibleMinutes: function (m, step) {
      var year = m.year(),
        month = m.month(),
        day = m.date(),
        hour = m.hours(), pushedDate,
        offset = m.utcOffset() / 60,
        minutes = [], minute;

      for (minute = 0 ; minute < 60 ; minute += step) {
        pushedDate = createNewDate(year, month, day, hour - offset, minute);
        minutes.push(pushedDate);
      }
      return minutes;
    },
    getVisibleWeeks: function (m) {
      m = moment(m);
      var startYear = m.year(),
          startMonth = m.month();

      // set date to start of the week
      m.date(1);

      var day = m.day();

      if (day === 0) {
        // day is sunday, let's get back to the previous week
        m.date(-5);
      } else {
        // day is not sunday, let's get back to the start of the week
        m.date(m.date() - day);
      }
      if (m.date() === 1) {
        // day is monday, let's get back to the previous week
        m.date(-6);
      }

      var weeks = [];

      while (weeks.length < 6) {
        if (m.year() === startYear && m.month() > startMonth) {
          break;
        }
        weeks.push(this.getDaysOfWeek(m));
        m.add(7, 'd');
      }
      return weeks;
    },
    getVisibleYears: function (d) {
      var m = moment(d),
        year = m.year();

      m.year(year - (year % 10));
      year = m.year();

      var offset = m.utcOffset() / 60,
        years = [],
        pushedDate,
        actualOffset;

      for (var i = 0; i < 12; i++) {
        pushedDate = createNewDate(year, 0, 1, 0 - offset);
        actualOffset = pushedDate.utcOffset() / 60;
        if (actualOffset !== offset) {
          pushedDate = createNewDate(year, 0, 1, 0 - actualOffset);
          offset = actualOffset;
        }
        years.push(pushedDate);
        year++;
      }
      return years;
    },
    getDaysOfWeek: function (m) {
      m = m ? m : (tz ? moment.tz(tz).day(0) : moment().day(0));

      var year = m.year(),
        month = m.month(),
        day = m.date(),
        days = [],
        pushedDate,
        offset = m.utcOffset() / 60,
        actualOffset;

      for (var i = 0; i < 7; i++) {
        pushedDate = createNewDate(year, month, day, 0 - offset, 0, false);
        actualOffset = pushedDate.utcOffset() / 60;
        if (actualOffset !== offset) {
          pushedDate = createNewDate(year, month, day, 0 - actualOffset, 0, false);
        }
        days.push(pushedDate);
        day++;
      }
      return days;
    },
    getVisibleMonths: function (m) {
      var year = m.year(),
        offset = m.utcOffset() / 60,
        months = [],
        pushedDate,
        actualOffset;

      for (var month = 0; month < 12; month++) {
        pushedDate = createNewDate(year, month, 1, 0 - offset, 0, false);
        actualOffset = pushedDate.utcOffset() / 60;
        if (actualOffset !== offset) {
          pushedDate = createNewDate(year, month, 1, 0 - actualOffset, 0, false);
        }
        months.push(pushedDate);
      }
      return months;
    },
    getVisibleHours: function (m) {
      var year = m.year(),
        month = m.month(),
        day = m.date(),
        hours = [],
        hour, pushedDate, actualOffset,
        offset = m.utcOffset() / 60;

      for (hour = 0 ; hour < 24 ; hour++) {
        pushedDate = createNewDate(year, month, day, hour - offset, 0, false);
        actualOffset = pushedDate.utcOffset() / 60;
        if (actualOffset !== offset) {
          pushedDate = createNewDate(year, month, day, hour - actualOffset, 0, false);
        }
        hours.push(pushedDate);
      }

      return hours;
    },
    isAfter: function (model, date) {
      return model && model.unix() >= date.unix();
    },
    isBefore: function (model, date) {
      return model.unix() <= date.unix();
    },
    isSameYear: function (model, date) {
      return model && model.year() === date.year();
    },
    isSameMonth: function (model, date) {
      return this.isSameYear(model, date) && model.month() === date.month();
    },
    isSameDay: function (model, date) {
      return this.isSameMonth(model, date) && model.date() === date.date();
    },
    isSameHour: function (model, date) {
      return this.isSameDay(model, date) && model.hours() === date.hours();
    },
    isSameMinutes: function (model, date) {
      return this.isSameHour(model, date) && model.minutes() === date.minutes();
    },
    setParams: function (zone) {
      tz = zone;
    },
    findFunction: function (scope, name) {
      //Search scope ancestors for a matching function.
      //Can probably combine this and the below function
      //into a single search function and two comparison functions
      //Need to add support for lodash style selectors (eg, 'objectA.objectB.function')
      var parentScope = scope;
      do {
        parentScope = parentScope.$parent;
        if (angular.isFunction(parentScope[name])) {
          return parentScope[name];
        }
      } while (parentScope.$parent);

      return false;
    },
    findParam: function (scope, name) {
      //Search scope ancestors for a matching parameter.
      var parentScope = scope;
      do {
        parentScope = parentScope.$parent;
        if (parentScope[name]) {
          return parentScope[name];
        }
      } while (parentScope.$parent);

      return false;
    },
    createMoment: function (m) {
      if (tz) {
        return moment.tz(m, tz);
      } else {
        //If input is a moment, and we have no TZ info, we need to remove TZ
        //info from the moment, otherwise the newly created moment will take
        //the timezone of the input moment. The easiest way to do that is to
        //take the unix timestamp, and use that to create a new moment.
        //The new moment will use the local timezone of the user machine.
        return moment.isMoment(m) ? moment.unix(m.unix()) : moment(m);
      }
    },
    getDate: function (scope, attrs, name) {
      var result = false;
      if (attrs[name]) {
        result = this.createMoment(attrs[name]);
        if (!result.isValid()) {
          result = this.findParam(scope, attrs[name]);
          if (result) {
            result = this.createMoment(result);
          }
        }
      }

      return result;
    },
    eventIsForPicker: function (targetIDs, pickerID) {
      //Checks if an event targeted at a specific picker, via either a string name, or an array of strings.
      return (angular.isArray(targetIDs) && targetIDs.indexOf(pickerID) > -1 || targetIDs === pickerID);
    }
  };
});
/* global moment */
var Module = angular.module('datePicker');

Module.directive('dateRange', ['$compile', 'datePickerUtils', 'dateTimeConfig', function ($compile, datePickerUtils, dateTimeConfig) {
  function getTemplate(attrs, id, model, min, max) {
    return dateTimeConfig.template(angular.extend(attrs, {
      ngModel: model,
      minDate: min && moment.isMoment(min) ? min.format() : false,
      maxDate: max && moment.isMoment(max) ? max.format() : false
    }), id);
  }

  function randomName() {
    return 'picker' + Math.random().toString().substr(2);
  }

  return {
    scope: {
      start: '=',
      end: '='
    },
    link: function (scope, element, attrs) {
      var dateChange = null,
          pickerRangeID = element[0].id,
          pickerIDs = [randomName(), randomName()],
          createMoment = datePickerUtils.createMoment,
          eventIsForPicker = datePickerUtils.eventIsForPicker;

      scope.dateChange = function (modelName, newDate) {
        //Notify user if callback exists.
        if (dateChange) {
          dateChange(modelName, newDate);
        }
      };

      function setMax(date) {
        scope.$broadcast('pickerUpdate', pickerIDs[0], {
          maxDate: date
        });
      }

      function setMin(date) {
        scope.$broadcast('pickerUpdate', pickerIDs[1], {
          minDate: date
        });
      }

      if (pickerRangeID) {
        scope.$on('pickerUpdate', function (event, targetIDs, data) {
          if (eventIsForPicker(targetIDs, pickerRangeID)) {
            //If we received an update event, dispatch it to the inner pickers using their IDs.
            scope.$broadcast('pickerUpdate', pickerIDs, data);
          }
        });
      }

      datePickerUtils.setParams(attrs.timezone);

      scope.start = createMoment(scope.start);
      scope.end = createMoment(scope.end);

      scope.$watchGroup(['start', 'end'], function (dates) {
        //Scope data changed, update picker min/max
        setMin(dates[0]);
        setMax(dates[1]);
      });

      if (angular.isDefined(attrs.dateChange)) {
        dateChange = datePickerUtils.findFunction(scope, attrs.dateChange);
      }

      attrs.onSetDate = 'dateChange';

      var template = '<div><table><tr><td valign="top">' +
                    getTemplate(attrs, pickerIDs[0], 'start', false, scope.end) +
                    '</td><td valign="top">' +
                    getTemplate(attrs, pickerIDs[1], 'end', scope.start, false) +
                  '</td></tr></table></div>';

      var picker = $compile(template)(scope);
      element.append(picker);
    }
  };
}]);
/* global moment */
var PRISTINE_CLASS = 'ng-pristine',
    DIRTY_CLASS = 'ng-dirty';

var Module = angular.module('datePicker');

Module.constant('dateTimeConfig', {
  template: function (attrs, id) {
    return '' +
        '<div ' +
        (id ? 'id="' + id + '" ' : '') +
        'date-picker="' + attrs.ngModel + '" ' +
        (attrs.view ? 'view="' + attrs.view + '" ' : '') +
        (attrs.maxView ? 'max-view="' + attrs.maxView + '" ' : '') +
        (attrs.maxDate ? 'max-date="' + attrs.maxDate + '" ' : '') +
        (attrs.autoClose ? 'auto-close="' + attrs.autoClose + '" ' : '') +
        (attrs.template ? 'template="' + attrs.template + '" ' : '') +
        (attrs.minView ? 'min-view="' + attrs.minView + '" ' : '') +
        (attrs.minDate ? 'min-date="' + attrs.minDate + '" ' : '') +
        (attrs.partial ? 'partial="' + attrs.partial + '" ' : '') +
        (attrs.step ? 'step="' + attrs.step + '" ' : '') +
        (attrs.onSetDate ? 'date-change="' + attrs.onSetDate + '" ' : '') +
        (attrs.ngModel ? 'ng-model="' + attrs.ngModel + '" ' : '') +
        (attrs.timezone ? 'timezone="' + attrs.timezone + '" ' : '') +
        'class="date-picker-date-time"></div>';
  },
  format: 'YYYY-MM-DD HH:mm',
  views: ['date', 'year', 'month', 'hours', 'minutes'],
  autoClose: false,
  position: 'relative'
});

Module.directive('dateTimeAppend', function () {
  return {
    link: function (scope, element) {
      element.bind('click', function () {
        element.find('input')[0].focus();
      });
    }
  };
});

Module.directive('dateTime', ['$compile', '$document', '$filter', 'dateTimeConfig', '$parse', 'datePickerUtils', function ($compile, $document, $filter, dateTimeConfig, $parse, datePickerUtils) {
  var body = $document.find('body');
  var dateFilter = $filter('mFormat');

  return {
    require: 'ngModel',
    scope: true,
    link: function (scope, element, attrs, ngModel) {
      var format = attrs.format || dateTimeConfig.format,
        parentForm = element.inheritedData('$formController'),
          views = $parse(attrs.views)(scope) || dateTimeConfig.views.concat(),
          view = attrs.view || views[0],
          index = views.indexOf(view),
          dismiss = attrs.autoClose ? $parse(attrs.autoClose)(scope) : dateTimeConfig.autoClose,
          picker = null,
          pickerID = element[0].id,
          position = attrs.position || dateTimeConfig.position,
          container = null,
          minDate = null,
          minValid = null,
          maxDate = null,
          maxValid = null,
          timezone = attrs.timezone || false,
          eventIsForPicker = datePickerUtils.eventIsForPicker,
          dateChange = null,
          shownOnce = false,
          template;

      if (index === -1) {
        views.splice(index, 1);
      }

      views.unshift(view);

      function formatter(value) {
        return dateFilter(value, format, timezone);
      }

      function parser(viewValue) {
        if (viewValue.length === format.length) {
          return viewValue;
        }
        return undefined;
      }

      function setMin(date) {
        minDate = date;
        attrs.minDate = date ? date.format() : date;
        minValid = moment.isMoment(date);
      }

      function setMax(date) {
        maxDate = date;
        attrs.maxDate = date ? date.format() : date;
        maxValid = moment.isMoment(date);
      }

      ngModel.$formatters.push(formatter);
      ngModel.$parsers.unshift(parser);

      if (angular.isDefined(attrs.minDate)) {
        setMin(datePickerUtils.findParam(scope, attrs.minDate));

        ngModel.$validators.min = function (value) {
          //If we don't have a min / max value, then any value is valid.
          return minValid ? moment.isMoment(value) && (minDate.isSame(value) || minDate.isBefore(value)) : true;
        };
      }

      if (angular.isDefined(attrs.maxDate)) {
        setMax(datePickerUtils.findParam(scope, attrs.maxDate));

        ngModel.$validators.max = function (value) {
          return maxValid ? moment.isMoment(value) && (maxDate.isSame(value) || maxDate.isAfter(value)) : true;
        };
      }

      if (angular.isDefined(attrs.dateChange)) {
        dateChange = datePickerUtils.findFunction(scope, attrs.dateChange);
      }

      function getTemplate() {
        template = dateTimeConfig.template(attrs);
      }


      function updateInput(event) {
        event.stopPropagation();
        if (ngModel.$pristine) {
          ngModel.$dirty = true;
          ngModel.$pristine = false;
          element.removeClass(PRISTINE_CLASS).addClass(DIRTY_CLASS);
          if (parentForm) {
            parentForm.$setDirty();
          }
          ngModel.$render();
        }
      }

      function clear() {
        // return false;
        if (picker) {
          picker.remove();
          picker = null;
        }
        if (container) {
          container.remove();
          container = null;
        }
      }

      if (pickerID) {
        scope.$on('pickerUpdate', function (event, pickerIDs, data) {
          if (eventIsForPicker(pickerIDs, pickerID)) {
            if (picker) {
              //Need to handle situation where the data changed but the picker is currently open.
              //To handle this, we can create the inner picker with a random ID, then forward
              //any events received to it.
            } else {
              var validateRequired = false;
              if (angular.isDefined(data.minDate)) {
                setMin(data.minDate);
                validateRequired = true;
              }
              if (angular.isDefined(data.maxDate)) {
                setMax(data.maxDate);
                validateRequired = true;
              }

              if (angular.isDefined(data.minView)) {
                attrs.minView = data.minView;
              }
              if (angular.isDefined(data.maxView)) {
                attrs.maxView = data.maxView;
              }
              attrs.view = data.view || attrs.view;

              if (validateRequired) {
                ngModel.$validate();
              }
              if (angular.isDefined(data.format)) {
                format = attrs.format = data.format || dateTimeConfig.format;
                ngModel.$modelValue = -1; //Triggers formatters. This value will be discarded.
              }
              getTemplate();
            }
          }
        });
      }

      function showPicker() {
        if (picker) {
          return;
        }
        // create picker element
        picker = $compile(template)(scope);
        scope.$digest();

        //If the picker has already been shown before then we shouldn't be binding to events, as these events are already bound to in this scope.
        if (!shownOnce) {
          scope.$on('setDate', function (event, date, view) {
            updateInput(event);
            if (dateChange) {
              dateChange(attrs.ngModel, date);
            }
            if (dismiss && views[views.length - 1] === view) {
              clear();
            }
          });

          scope.$on('hidePicker', function () {
            element.triggerHandler('blur');
          });

          scope.$on('$destroy', clear);

          shownOnce = true;
        }


        // move picker below input element

        if (position === 'absolute') {
          var pos = angular.extend(element.offset(), { height: element[0].offsetHeight });
          picker.css({ top: pos.top + pos.height, left: pos.left, display: 'block', position: position });
          body.append(picker);
        } else {
          // relative
          container = angular.element('<div date-picker-wrapper></div>');
          element[0].parentElement.insertBefore(container[0], element[0]);
          container.append(picker);
          //          this approach doesn't work
          //          element.before(picker);
          picker.css({ top: element[0].offsetHeight + 'px', display: 'block' });
        }
        picker.bind('mousedown', function (evt) {
          evt.preventDefault();
        });
      }

      element.bind('focus', showPicker);
      element.bind('blur', clear);
      getTemplate();
    }
  };
}]);

angular.module('datePicker').run(['$templateCache', function($templateCache) {
$templateCache.put('templates/datepicker.html',
    "<div ng-switch=\"view\">\r" +
    "\n" +
    "  <div ng-switch-when=\"date\" class=\"no-animation\">\r" +
    "\n" +
    "    <table>\r" +
    "\n" +
    "      <thead>\r" +
    "\n" +
    "      <tr>\r" +
    "\n" +
    "        <th ng-click=\"prev()\"><i class=\"icon icon-arrow-left\"></i></th>\r" +
    "\n" +
    "        <th colspan=\"5\" class=\"switch\" ng-click=\"setView('month')\" ng-bind=\"date|mFormat:'YYYY MMMM':tz\"></th>\r" +
    "\n" +
    "        <th ng-click=\"next()\"><i class=\"icon icon-arrow-right\"></i></th>\r" +
    "\n" +
    "      </tr>\r" +
    "\n" +
    "      <tr>\r" +
    "\n" +
    "        <th ng-repeat=\"day in weekdays\" style=\"overflow: hidden\" class=\"no-animation\" ng-bind=\"day|mFormat:'ddd':tz\"></th>\r" +
    "\n" +
    "      </tr>\r" +
    "\n" +
    "      </thead>\r" +
    "\n" +
    "      <tbody>\r" +
    "\n" +
    "      <tr ng-repeat=\"week in weeks\" ng-init=\"$index2 = $index\" class=\"no-animation\">\r" +
    "\n" +
    "        <td ng-repeat=\"day in week\" class=\"no-animation\">\r" +
    "\n" +
    "          <span\r" +
    "\n" +
    "            ng-class=\"classes[$index2][$index]\"\r" +
    "\n" +
    "            ng-click=\"selectDate(day)\" ng-bind=\"day|mFormat:'DD':tz\"></span>\r" +
    "\n" +
    "        </td>\r" +
    "\n" +
    "      </tr>\r" +
    "\n" +
    "      </tbody>\r" +
    "\n" +
    "    </table>\r" +
    "\n" +
    "  </div>\r" +
    "\n" +
    "  <div ng-switch-when=\"year\" class=\"no-animation\">\r" +
    "\n" +
    "    <table>\r" +
    "\n" +
    "      <thead>\r" +
    "\n" +
    "      <tr>\r" +
    "\n" +
    "        <th ng-click=\"prev(10)\"><i class=\"icon icon-arrow-left\"></i></th>\r" +
    "\n" +
    "        <th colspan=\"5\" class=\"switch\"ng-bind=\"years[0].year()+' - '+years[years.length-1].year()\"></th>\r" +
    "\n" +
    "        <th ng-click=\"next(10)\"><i class=\"icon icon-arrow-right\"></i></th>\r" +
    "\n" +
    "      </tr>\r" +
    "\n" +
    "      </thead>\r" +
    "\n" +
    "      <tbody>\r" +
    "\n" +
    "      <tr>\r" +
    "\n" +
    "        <td colspan=\"7\">\r" +
    "\n" +
    "          <span ng-class=\"classes[$index]\"\r" +
    "\n" +
    "                ng-repeat=\"year in years\"\r" +
    "\n" +
    "                ng-click=\"selectDate(year)\" ng-bind=\"year.year()\"></span>\r" +
    "\n" +
    "        </td>\r" +
    "\n" +
    "      </tr>\r" +
    "\n" +
    "      </tbody>\r" +
    "\n" +
    "    </table>\r" +
    "\n" +
    "  </div>\r" +
    "\n" +
    "  <div ng-switch-when=\"month\" class=\"no-animation\">\r" +
    "\n" +
    "    <table>\r" +
    "\n" +
    "      <thead>\r" +
    "\n" +
    "      <tr>\r" +
    "\n" +
    "        <th ng-click=\"prev()\"><i class=\"icon icon-arrow-left\"></i></th>\r" +
    "\n" +
    "        <th colspan=\"5\" class=\"switch\" ng-click=\"setView('year')\" ng-bind=\"date|mFormat:'YYYY':tz\"></th>\r" +
    "\n" +
    "        <th ng-click=\"next()\"><i class=\"icon icon-arrow-right\"></i></th>\r" +
    "\n" +
    "      </tr>\r" +
    "\n" +
    "      </thead>\r" +
    "\n" +
    "      <tbody>\r" +
    "\n" +
    "      <tr>\r" +
    "\n" +
    "        <td colspan=\"7\">\r" +
    "\n" +
    "          <span ng-repeat=\"month in months\"\r" +
    "\n" +
    "                ng-class=\"classes[$index]\"\r" +
    "\n" +
    "                ng-click=\"selectDate(month)\"\r" +
    "\n" +
    "                ng-bind=\"month|mFormat:'MMM':tz\" class=\"no-animation\"></span>\r" +
    "\n" +
    "        </td>\r" +
    "\n" +
    "      </tr>\r" +
    "\n" +
    "      </tbody>\r" +
    "\n" +
    "    </table>\r" +
    "\n" +
    "  </div>\r" +
    "\n" +
    "  <div ng-switch-when=\"hours\" class=\"no-animation\">\r" +
    "\n" +
    "    <table>\r" +
    "\n" +
    "      <thead>\r" +
    "\n" +
    "      <tr>\r" +
    "\n" +
    "        <th ng-click=\"prev(24)\"><i class=\"icon icon-arrow-left\"></i></th>\r" +
    "\n" +
    "        <th colspan=\"5\" class=\"switch\" ng-click=\"setView('date')\" ng-bind=\"date|mFormat:'DD MMMM YYYY':tz\"></th>\r" +
    "\n" +
    "        <th ng-click=\"next(24)\"><i class=\"icon icon-arrow-right\"></i></th>\r" +
    "\n" +
    "      </tr>\r" +
    "\n" +
    "      </thead>\r" +
    "\n" +
    "      <tbody>\r" +
    "\n" +
    "      <tr>\r" +
    "\n" +
    "        <td colspan=\"7\">\r" +
    "\n" +
    "          <span ng-repeat=\"hour in hours\"\r" +
    "\n" +
    "                ng-class=\"classes[$index]\"\r" +
    "\n" +
    "                ng-click=\"selectDate(hour)\" ng-bind=\"hour|mFormat:'HH:mm':tz\" class=\"no-animation\"></span>\r" +
    "\n" +
    "        </td>\r" +
    "\n" +
    "      </tr>\r" +
    "\n" +
    "      </tbody>\r" +
    "\n" +
    "    </table>\r" +
    "\n" +
    "  </div>\r" +
    "\n" +
    "  <div ng-switch-when=\"minutes\" class=\"no-animation\">\r" +
    "\n" +
    "    <table>\r" +
    "\n" +
    "      <thead>\r" +
    "\n" +
    "      <tr>\r" +
    "\n" +
    "        <th ng-click=\"prev()\"><i class=\"icon icon-arrow-left\"></i></th>\r" +
    "\n" +
    "        <th colspan=\"5\" class=\"switch\" ng-click=\"setView('hours')\" ng-bind=\"date|mFormat:'DD MMMM YYYY':tz\"></th>\r" +
    "\n" +
    "        <th ng-click=\"next()\"><i class=\"icon icon-arrow-right\"></i></i></th>\r" +
    "\n" +
    "      </tr>\r" +
    "\n" +
    "      </thead>\r" +
    "\n" +
    "      <tbody>\r" +
    "\n" +
    "      <tr>\r" +
    "\n" +
    "        <td colspan=\"7\">\r" +
    "\n" +
    "          <span ng-repeat=\"minute in minutes\"\r" +
    "\n" +
    "                ng-class=\"classes[$index]\"\r" +
    "\n" +
    "                ng-click=\"selectDate(minute)\"\r" +
    "\n" +
    "                ng-bind=\"minute|mFormat:'HH:mm':tz\" class=\"no-animation\"></span>\r" +
    "\n" +
    "        </td>\r" +
    "\n" +
    "      </tr>\r" +
    "\n" +
    "      </tbody>\r" +
    "\n" +
    "    </table>\r" +
    "\n" +
    "  </div>\r" +
    "\n" +
    "</div>"
  );

}]);
})(angular);

/**
/* angular-video-player
 * @By Surmon(surmon.me)
 *
 */
(function() {

  // 使用严格模式
  "use strict";
  var videoPlayer = angular.module('angular-video-player', []);

  // 数据传入
  videoPlayer.directive('videoPlayer', ['$rootScope', '$compile', '$location', function($rootScope, $compile, $location) {
    return {
      restrict: 'A',
      replace: true,
      scope: { data: '=data' },
      template: function () {
        var player = [
          '<div class="video-player">',
          '<video id="J_video_player" class="video-js vjs-default-skin"></video>',
          '</div>'
        ].join('');
        return player;
      },
      link: function ($scope, element, attrs) {

        // 状态标示 / 0 - 未开始或已释放，1 - 已实例化或已启动
        $scope.status = 0;

        // 语言包
        videojs.addLanguage("zh-CN",{
          "Play": "播放",
          "Pause": "暂停",
          "Current Time": "当前时间",
          "Duration Time": "时长",
          "Remaining Time": "剩余时间",
          "Stream Type": "媒体流类型",
          "LIVE": "直播",
          "Loaded": "加载完毕",
          "Progress": "进度",
          "Fullscreen": "全屏",
          "Non-Fullscreen": "退出全屏",
          "Mute": "静音",
          "Unmute": "取消静音",
          "Playback Rate": "播放码率",
          "Subtitles": "字幕",
          "subtitles off": "字幕关闭",
          "Captions": "内嵌字幕",
          "captions off": "内嵌字幕关闭",
          "Chapters": "节目段落",
          "You aborted the media playback": "视频播放被终止",
          "A network error caused the media download to fail part-way.": "网络错误导致视频下载中途失败, 请刷新重试。",
          "The media could not be loaded, either because the server or network failed or because the format is not supported.": "视频因格式不支持或者服务器或网络的问题无法加载。",
          "The media playback was aborted due to a corruption problem or because the media used features your browser did not support.": "由于视频文件损坏或是该视频使用了你的浏览器不支持的功能，播放终止。",
          "No compatible source was found for this media.": "无法找到此视频兼容的源。",
          "The media is encrypted and we do not have the keys to decrypt it.": "视频已加密，无法解密。"
        });

        // 启动播放器
        $scope.playerInit = function (video_data) {

          $scope.status = 1;

          // 初始化
          $scope.player = null;
          var video_start = video_data.start || 0;
          var video_live = !!(!!video_data.is_live && video_data.live_status == 2);
          var video_src  = video_live ? video_data.urls.hls.ORIGIN : video_data.urls;
          var video_type = video_live ? 'application/x-mpegURL' : 'video/mp4';
          videojs.options.flash.swf = 'scripts/player/video-js.swf';
          var video_opts = {
            'controls': true, 
            'autoplay': true,
            'preload': 'auto',
            'poster': 'images/qrcode.png',
            'wdith': '100%',
            'height': '500',
            'playbackRates': [0.7, 1.0, 1.5, 2.0],
            'controlBar': {
              remainingTimeDisplay: false,
              durationDisplay: {},
              currentTimeDisplay: {},
              volumeMenuButton: {
                inline: false,
                vertical: true
              }
            },
            'language': 'zh-CN',
            'techOrder': ['html5', 'flash']
          };

          // 清晰度切换
          if (!video_live) video_opts.plugins = { videoJsResolutionSwitcher: { default: 2, dynamicLabel: true } };

          // 实例化播放器
          $scope.player = videojs('J_video_player', video_opts, function() {

            // console.log('播放器已OK！');

            // 非直播初始化清晰度切换
            if (!video_live) {
              this.updateSrc([
                { type: "video/mp4", src: video_src.H, label: '原画', res: 1 },
                { type: "video/mp4", src: video_src.M, label: '高清', res: 2 },
                { type: "video/mp4", src: video_src.L, label: '流畅', res: 3 },
                // { type: "video/mp4", src: 'http://61.134.46.28/7xkwa7.media1.z0.glb.clouddn.com/c897s11065_M?e=1468377658&token=RA8_8FNcL-cZN8Tf-jDCo6qamhj7mRAI5LKSaV_Q:HCdaEvQ0mivd_3cfX9nAoJ07Sbc=&wsiphost=local', label: '高清', res: 2 },
                // { type: "video/mp4", src: 'http://7xnbft.com2.z0.glb.clouddn.com/sample_video_M.mp4', label: '高清', res: 2 },

                // 公开空间/_mp4.mp4        => 没问题
                // { type: "video/mp4", src: 'http://7xnbft.com2.z0.glb.clouddn.com/c49s610.mp4', label: '高清', res: 2 },

                // 公开空间/_mp4            => 没问题
                // { type: "video/mp4", src: 'http://7xnbft.com2.z0.glb.clouddn.com/c49s610', label: '高清', res: 2 },

                // 公开空间/_mp4.mp4/转码后  => 没问题
                // { type: "video/mp4", src: 'http://7xnbft.com2.z0.glb.clouddn.com/c49s610.mp4_H?e=1468211991&token=RA8_8FNcL-cZN8Tf-jDCo6qamhj7mRAI5LKSaV_Q:nqh6So80GF0ZNNFfbBx0gnMJjJ8=', label: '高清', res: 2 },

                // 公开空间/_mp4/转码后      => 没问题
                // { type: "video/mp4", src: 'http://7xnbft.com2.z0.glb.clouddn.com/c49s610_H?e=1468211991&token=RA8_8FNcL-cZN8Tf-jDCo6qamhj7mRAI5LKSaV_Q:nqh6So80GF0ZNNFfbBx0gnMJjJ8=', label: '高清', res: 2 },

                // 公开空间/_flv.flv        => 有问题/flash不会报错，但未缓冲部分无法播放，拖动也会失效/自动跳回/并暂停播放
                // { type: "video/x-flv", src: 'http://7xnbft.com2.z0.glb.clouddn.com/c49s610.flv', label: '高清', res: 2 },

                // 公开空间/_flv            => 有问题/同上
                // { type: "video/x-flv", src: 'http://7xnbft.com2.z0.glb.clouddn.com/c49s610flv', label: '高清', res: 2 },

                // 公开空间/_flv.flv/转码后  => 有问题/同上
                // { type: "video/x-flv", src: 'http://7xnbft.com2.z0.glb.clouddn.com/c49s610.flv_H?e=1468211991&token=RA8_8FNcL-cZN8Tf-jDCo6qamhj7mRAI5LKSaV_Q:nqh6So80GF0ZNNFfbBx0gnMJjJ8=', label: '高清', res: 2 },

                // 公开空间/_flv/转码后      => 有问题/同上
                // { type: "video/x-flv", src: 'http://7xnbft.com2.z0.glb.clouddn.com/c49s610flv_H?e=1468211991&token=RA8_8FNcL-cZN8Tf-jDCo6qamhj7mRAI5LKSaV_Q:nqh6So80GF0ZNNFfbBx0gnMJjJ8=', label: '高清', res: 2 },

                // ---------------------------------------------

                // 私有空间/_mp4.mp4        => 有问题/拖动报错（原生H5下也是）
                // { type: "video/mp4", src: 'http://7xkwa7.media1.z0.glb.clouddn.com/c49s610.mp4?e=1468311440&token=RA8_8FNcL-cZN8Tf-jDCo6qamhj7mRAI5LKSaV_Q:a3pMxdN81Vgo9Glkl98512eAS9Q=', label: '高清', res: 2 },

                // 私有空间/_mp4            => 有问题/拖动报错同上
                // { type: "video/mp4", src: 'http://7xkwa7.media1.z0.glb.clouddn.com/c49s610?e=1468311453&token=RA8_8FNcL-cZN8Tf-jDCo6qamhj7mRAI5LKSaV_Q:bltZaXDnM59brx0X-aklvS_qLro=', label: '高清', res: 2 },

                // 私有空间/_mp4.mp4/转码后  => 有问题/拖动报错同上
                // { type: "video/mp4", src: 'http://7xkwa7.media1.z0.glb.clouddn.com/c49s610.mp4_M?e=1468311440&token=RA8_8FNcL-cZN8Tf-jDCo6qamhj7mRAI5LKSaV_Q:WeynUtuoGg_c1hILBY89elc8Igk=', label: '高清', res: 2 },

                // 私有空间/_mp4/转码后      => 有问题/拖动报错同上
                // { type: "video/mp4", src: 'http://7xkwa7.media1.z0.glb.clouddn.com/c49s610_M?e=1468311453&token=RA8_8FNcL-cZN8Tf-jDCo6qamhj7mRAI5LKSaV_Q:VTPB3WuaYvr3ZLvEX0J4L-FF-Fk=', label: '高清', res: 2 },

                // 私有空间/_flv.flv        => 有问题/拖动报错同上
                // { type: "video/x-flv", src: 'http://7xkwa7.media1.z0.glb.clouddn.com/c49s610.flv?e=1468311716&token=RA8_8FNcL-cZN8Tf-jDCo6qamhj7mRAI5LKSaV_Q:hKzp566CSZrcmnFGXE31138mPAc=', label: '高清', res: 2 },

                // 私有空间/_flv            => 有问题/拖动报错同上
                // { type: "video/x-flv", src: 'http://7xkwa7.media1.z0.glb.clouddn.com/c49s610flv?e=1468311676&token=RA8_8FNcL-cZN8Tf-jDCo6qamhj7mRAI5LKSaV_Q:cSe01FSEMTPxiOMAZ5KaUbftPUQ=', label: '高清', res: 2 },

                // 私有空间/_flv.flv/转码后  => 有问题/拖动报错同上
                // { type: "video/x-flv", src: 'http://7xkwa7.media1.z0.glb.clouddn.com/c49s610.flv_M?e=1468311716&token=RA8_8FNcL-cZN8Tf-jDCo6qamhj7mRAI5LKSaV_Q:mCVs--G5sGB5PPhuaiOq1apE520=', label: '高清', res: 2 },

                // 私有空间/_flv/转码后      => 有问题/拖动报错同上
                // { type: "video/x-flv", src: 'http://7xkwa7.media1.z0.glb.clouddn.com/c49s610flv_M?e=1468311676&token=RA8_8FNcL-cZN8Tf-jDCo6qamhj7mRAI5LKSaV_Q:R4vIEsnqTXxIwY0g0yxUVGDN5ho=', label: '高清', res: 2 },

              ]);
              this.on('resolutionchange', function (){
                // console.info('分辨率切换至新地址：', this.src());
                $scope.$emit('videoPlayerResolution', this.src());
              })
            };

            // 直播载入
            if (video_live) {
              
              this.src({ src: video_src, type: 'application/x-mpegURL', withCredentials: false });
              // var hls = $scope.player.tech({ IWillNotUseThisInPlugins: true }).hls;
              /*
              // 直播每次的切片请求
              $scope.player.tech_.hls.xhr.beforeRequest = function(options) {
                console.log(options);
                return options;
              };
              */
            };

            // 监听播放
            this.on('play', function () { $scope.$emit('videoPlayerPlaying', true) });

            // 监听暂停
            this.on('pause', function () { $scope.$emit('videoPlayerPause', true) });

            // 监听结束
            this.on('ended', function () { $scope.$emit('videoPlayerEnded', true) });

            // 文件信息
            this.on('loadeddata', function () {
              if (!video_live && !!video_start) this.currentTime(video_start);
              $scope.$emit('videoPlayerLoadeddata', true);
            });

            // 监听时间
            this.on('timeupdate', function () { $scope.$emit('videoPlayerTimeUpdate', this.currentTime()) });

          });

          // Pause
          $scope.$on('doVideoPlayerPause', function () { $scope.player.pause() });

          // Play
          $scope.$on('doVideoPlayerPlay', function () { $scope.player.play() });

          // RefreshPlay
          $scope.$on('doVideoPlayerRefreshPlay', function () {
            $scope.player.currentTime(0);
            $scope.player.play();
          });
        };

        // 释放播放器
        $scope.playerDispose = function () {
          if (!!$scope.player && !!$scope.player.dispose) $scope.player.dispose();
          $scope.player = null;
        };

        // 监听父容器数据并启动播放器
        $scope.$watch('data', function (newData, oldData) {
          // console.log(newData, oldData, $scope.status);
          if (!newData && $scope.status == 1) $scope.playerDispose();
          if (!!newData && !!newData.urls && $scope.status == 0) $scope.playerInit(newData);
        });

        // 释放播放器
        $scope.$on('$locationChangeStart', $scope.playerDispose);
      }
    };
  }]);

})();

//
// Copyright Kamil Pękala http://github.com/kamilkp
// angular-sortable-view v0.0.15 2015/01/18
//

;(function(window, angular){
  // 'use strict';
  /* jshint eqnull:true */
  /* jshint -W041 */
  /* jshint -W030 */

  var module = angular.module('angular-sortable-view', []);
  module.directive('svRoot', [function(){
    function shouldBeAfter(elem, pointer, isGrid){
      return isGrid ? elem.x - pointer.x < 0 : elem.y - pointer.y < 0;
    }
    function getSortableElements(key){
      return ROOTS_MAP[key];
    }
    function removeSortableElements(key){
      delete ROOTS_MAP[key];
    }

    var sortingInProgress;
    var ROOTS_MAP = Object.create(null);
    // window.ROOTS_MAP = ROOTS_MAP; // for debug purposes

    return {
      restrict: 'A',
      controller: ['$scope', '$attrs', '$interpolate', '$parse', function($scope, $attrs, $interpolate, $parse){
        var mapKey = $interpolate($attrs.svRoot)($scope) || $scope.$id;
        if(!ROOTS_MAP[mapKey]) ROOTS_MAP[mapKey] = [];

        var that         = this;
        var candidates;  // set of possible destinations
        var $placeholder;// placeholder element
        var options;     // sortable options
        var $helper;     // helper element - the one thats being dragged around with the mouse pointer
        var $original;   // original element
        var $target;     // last best candidate
        var isGrid       = false;
        var onSort       = $parse($attrs.svOnSort);

        // ----- hack due to https://github.com/angular/angular.js/issues/8044
        $attrs.svOnStart = $attrs.$$element[0].attributes['sv-on-start'];
        $attrs.svOnStart = $attrs.svOnStart && $attrs.svOnStart.value;

        $attrs.svOnStop = $attrs.$$element[0].attributes['sv-on-stop'];
        $attrs.svOnStop = $attrs.svOnStop && $attrs.svOnStop.value;
        // -------------------------------------------------------------------

        var onStart = $parse($attrs.svOnStart);
        var onStop = $parse($attrs.svOnStop);

        this.sortingInProgress = function(){
          return sortingInProgress;
        };

        if($attrs.svGrid){ // sv-grid determined explicite
          isGrid = $attrs.svGrid === "true" ? true : $attrs.svGrid === "false" ? false : null;
          if(isGrid === null)
            throw 'Invalid value of sv-grid attribute';
        }
        else{
          // check if at least one of the lists have a grid like layout
          $scope.$watchCollection(function(){
            return getSortableElements(mapKey);
          }, function(collection){
            isGrid = false;
            var array = collection.filter(function(item){
              return !item.container;
            }).map(function(item){
              return {
                part: item.getPart().id,
                y: item.element[0].getBoundingClientRect().top
              };
            });
            var dict = Object.create(null);
            array.forEach(function(item){
              if(dict[item.part])
                dict[item.part].push(item.y);
              else
                dict[item.part] = [item.y];
            });
            Object.keys(dict).forEach(function(key){
              dict[key].sort();
              dict[key].forEach(function(item, index){
                if(index < dict[key].length - 1){
                  if(item > 0 && item === dict[key][index + 1]){
                    isGrid = true;
                  }
                }
              });
            });
          });
        }

        this.$moveUpdate = function(opts, mouse, svElement, svOriginal, svPlaceholder, originatingPart, originatingIndex){
          var svRect = svElement[0].getBoundingClientRect();
          if(opts.tolerance === 'element')
            mouse = {
              x: ~~(svRect.left + svRect.width/2),
              y: ~~(svRect.top + svRect.height/2)
            };

          sortingInProgress = true;
          candidates = [];
          if(!$placeholder){
            if(svPlaceholder){ // custom placeholder
              $placeholder = svPlaceholder.clone();
              $placeholder.removeClass('ng-hide');
            }
            else{ // default placeholder
              $placeholder = svOriginal.clone();
              $placeholder.addClass('sv-visibility-hidden');
              $placeholder.addClass('sv-placeholder');
              $placeholder.css({
                'height': svRect.height + 'px',
                'width': svRect.width + 'px'
              });
            }

            svOriginal.after($placeholder);
            svOriginal.addClass('ng-hide');

            // cache options, helper and original element reference
            $original = svOriginal;
            options = opts;
            $helper = svElement;

            onStart($scope, {
              $helper: {element: $helper},
              $part: originatingPart.model(originatingPart.scope),
              $index: originatingIndex,
              $item: originatingPart.model(originatingPart.scope)[originatingIndex]
            });
            $scope.$root && $scope.$root.$$phase || $scope.$apply();
          }

          // ----- move the element
          $helper[0].reposition({
            x: mouse.x + document.body.scrollLeft - mouse.offset.x*svRect.width,
            y: mouse.y + document.body.scrollTop - mouse.offset.y*svRect.height
          });

          // ----- manage candidates
          getSortableElements(mapKey).forEach(function(se, index){
            if(opts.containment != null){
              // TODO: optimize this since it could be calculated only once when the moving begins
              if(
                !elementMatchesSelector(se.element, opts.containment) &&
                !elementMatchesSelector(se.element, opts.containment + ' *')
              ) return; // element is not within allowed containment
            }
            var rect = se.element[0].getBoundingClientRect();
            var center = {
              x: ~~(rect.left + rect.width/2),
              y: ~~(rect.top + rect.height/2)
            };
            if(!se.container && // not the container element
              (se.element[0].scrollHeight || se.element[0].scrollWidth)){ // element is visible
              candidates.push({
                element: se.element,
                q: (center.x - mouse.x)*(center.x - mouse.x) + (center.y - mouse.y)*(center.y - mouse.y),
                view: se.getPart(),
                targetIndex: se.getIndex(),
                after: shouldBeAfter(center, mouse, isGrid)
              });
            }
            if(se.container && !se.element[0].querySelector('[sv-element]:not(.sv-placeholder):not(.sv-source)')){ // empty container
              candidates.push({
                element: se.element,
                q: (center.x - mouse.x)*(center.x - mouse.x) + (center.y - mouse.y)*(center.y - mouse.y),
                view: se.getPart(),
                targetIndex: 0,
                container: true
              });
            }
          });
          var pRect = $placeholder[0].getBoundingClientRect();
          var pCenter = {
            x: ~~(pRect.left + pRect.width/2),
            y: ~~(pRect.top + pRect.height/2)
          };
          candidates.push({
            q: (pCenter.x - mouse.x)*(pCenter.x - mouse.x) + (pCenter.y - mouse.y)*(pCenter.y - mouse.y),
            element: $placeholder,
            placeholder: true
          });
          candidates.sort(function(a, b){
            return a.q - b.q;
          });

          candidates.forEach(function(cand, index){
            if(index === 0 && !cand.placeholder && !cand.container){
              $target = cand;
              cand.element.addClass('sv-candidate');
              if(cand.after)
                cand.element.after($placeholder);
              else
                insertElementBefore(cand.element, $placeholder);
            }
            else if(index === 0 && cand.container){
              $target = cand;
              cand.element.append($placeholder);
            }
            else
              cand.element.removeClass('sv-candidate');
          });
        };

        this.$drop = function(originatingPart, index, options){
          if(!$placeholder) return;

          if(options.revert){
            var placeholderRect = $placeholder[0].getBoundingClientRect();
            var helperRect = $helper[0].getBoundingClientRect();
            var distance = Math.sqrt(
              Math.pow(helperRect.top - placeholderRect.top, 2) +
              Math.pow(helperRect.left - placeholderRect.left, 2)
            );

            var duration = +options.revert*distance/200; // constant speed: duration depends on distance
            duration = Math.min(duration, +options.revert); // however it's not longer that options.revert

            ['-webkit-', '-moz-', '-ms-', '-o-', ''].forEach(function(prefix){
              if(typeof $helper[0].style[prefix + 'transition'] !== "undefined")
                $helper[0].style[prefix + 'transition'] = 'all ' + duration + 'ms ease';
            });
            setTimeout(afterRevert, duration);
            $helper.css({
              'top': placeholderRect.top + document.body.scrollTop + 'px',
              'left': placeholderRect.left + document.body.scrollLeft + 'px'
            });
          }
          else
            afterRevert();

          function afterRevert(){
            sortingInProgress = false;
            $placeholder.remove();
            $helper.remove();
            $original.removeClass('ng-hide');

            candidates = void 0;
            $placeholder = void 0;
            options = void 0;
            $helper = void 0;
            $original = void 0;

            // sv-on-stop callback
            onStop($scope, {
              $part: originatingPart.model(originatingPart.scope),
              $index: index,
              $item: originatingPart.model(originatingPart.scope)[index]
            });

            if($target){
              $target.element.removeClass('sv-candidate');
              var spliced = originatingPart.model(originatingPart.scope).splice(index, 1);
              var targetIndex = $target.targetIndex;
              if($target.view === originatingPart && $target.targetIndex > index)
                targetIndex--;
              if($target.after)
                targetIndex++;
              $target.view.model($target.view.scope).splice(targetIndex, 0, spliced[0]);

              // sv-on-sort callback
              if($target.view !== originatingPart || index !== targetIndex)
                onSort($scope, {
                  $partTo: $target.view.model($target.view.scope),
                  $partFrom: originatingPart.model(originatingPart.scope),
                  $item: spliced[0],
                  $indexTo: targetIndex,
                  $indexFrom: index
                });

            }
            $target = void 0;

            $scope.$root && $scope.$root.$$phase || $scope.$apply();
          }
        };

        this.addToSortableElements = function(se){
          getSortableElements(mapKey).push(se);
        };
        this.removeFromSortableElements = function(se){
          var elems = getSortableElements(mapKey);
          var index = elems.indexOf(se);
          if(index > -1){
            elems.splice(index, 1);
            if(elems.length === 0)
              removeSortableElements(mapKey);
          }
        };
      }]
    };
  }]);

  module.directive('svPart', ['$parse', function($parse){
    return {
      restrict: 'A',
      require: '^svRoot',
      controller: ['$scope', function($scope){
        $scope.$ctrl = this;
        this.getPart = function(){
          return $scope.part;
        };
        this.$drop = function(index, options){
          $scope.$sortableRoot.$drop($scope.part, index, options);
        };
      }],
      scope: true,
      link: function($scope, $element, $attrs, $sortable){
        if(!$attrs.svPart) throw new Error('no model provided');
        var model = $parse($attrs.svPart);
        if(!model.assign) throw new Error('model not assignable');

        $scope.part = {
          id: $scope.$id,
          element: $element,
          model: model,
          scope: $scope
        };
        $scope.$sortableRoot = $sortable;

        var sortablePart = {
          element: $element,
          getPart: $scope.$ctrl.getPart,
          container: true
        };
        $sortable.addToSortableElements(sortablePart);
        $scope.$on('$destroy', function(){
          $sortable.removeFromSortableElements(sortablePart);
        });
      }
    };
  }]);

  module.directive('svElement', ['$parse', function($parse){
    return {
      restrict: 'A',
      require: ['^svPart', '^svRoot'],
      controller: ['$scope', function($scope){
        $scope.$ctrl = this;
      }],
      link: function($scope, $element, $attrs, $controllers){

        $element.addClass('drag-element');

        var sortableElement = {
          element: $element,
          getPart: $controllers[0].getPart,
          getIndex: function(){
            return $scope.$index;
          }
        };
        $controllers[1].addToSortableElements(sortableElement);
        $scope.$on('$destroy', function(){
          $controllers[1].removeFromSortableElements(sortableElement);
        });

        var handle = $element;
        handle.on('mousedown touchstart', onMousedown);
        $scope.$watch('$ctrl.handle', function(customHandle){
          if(customHandle){
            handle.off('mousedown touchstart', onMousedown);
            handle = customHandle;
            handle.on('mousedown touchstart', onMousedown);
          }
        });

        var helper;
        $scope.$watch('$ctrl.helper', function(customHelper){
          if(customHelper){
            helper = customHelper;
          }
        });

        var placeholder;
        $scope.$watch('$ctrl.placeholder', function(customPlaceholder){
          if(customPlaceholder){
            placeholder = customPlaceholder;
          }
        });

        var body = angular.element(document.body);
        var html = angular.element(document.documentElement);

        var moveExecuted;

        function onMousedown(e){
          touchFix(e);

          if($controllers[1].sortingInProgress()) return;
          if(e.button != 0 && e.type === 'mousedown') return;

          moveExecuted = false;
          var opts = $parse($attrs.svElement)($scope);
          opts = angular.extend({}, {
            tolerance: 'pointer',
            revert: 200,
            containment: 'html'
          }, opts);
          if(opts.containment){
            var containmentRect = closestElement.call($element, opts.containment)[0].getBoundingClientRect();
          }

          var target = $element;
          var clientRect = $element[0].getBoundingClientRect();
          var clone;

          if(!helper) helper = $controllers[0].helper;
          if(!placeholder) placeholder = $controllers[0].placeholder;
          if(helper){
            clone = helper.clone();
            clone.removeClass('ng-hide');
            clone.css({
              'left': clientRect.left + document.body.scrollLeft + 'px',
              'top': clientRect.top + document.body.scrollTop + 'px'
            });
            target.addClass('sv-visibility-hidden');
          }
          else{
            clone = target.clone();
            clone.addClass('sv-helper').css({
              'left': clientRect.left + document.body.scrollLeft + 'px',
              'top': clientRect.top + document.body.scrollTop + 'px',
              'width': clientRect.width + 'px'
            });
          }

          clone[0].reposition = function(coords){
            var targetLeft = coords.x;
            var targetTop = coords.y;
            var helperRect = clone[0].getBoundingClientRect();

            var body = document.body;

            if(containmentRect){
              if(targetTop < containmentRect.top + body.scrollTop) // top boundary
                targetTop = containmentRect.top + body.scrollTop;
              if(targetTop + helperRect.height > containmentRect.top + body.scrollTop + containmentRect.height) // bottom boundary
                targetTop = containmentRect.top + body.scrollTop + containmentRect.height - helperRect.height;
              if(targetLeft < containmentRect.left + body.scrollLeft) // left boundary
                targetLeft = containmentRect.left + body.scrollLeft;
              if(targetLeft + helperRect.width > containmentRect.left + body.scrollLeft + containmentRect.width) // right boundary
                targetLeft = containmentRect.left + body.scrollLeft + containmentRect.width - helperRect.width;
            }
            this.style.left = targetLeft - body.scrollLeft + 'px';
            this.style.top = targetTop - body.scrollTop + 'px';
          };

          var pointerOffset = {
            x: (e.clientX - clientRect.left)/clientRect.width,
            y: (e.clientY - clientRect.top)/clientRect.height
          };
          html.addClass('sv-sorting-in-progress');
          html.on('mousemove touchmove', onMousemove).on('mouseup touchend touchcancel', function mouseup(e){
            html.off('mousemove touchmove', onMousemove);
            html.off('mouseup touchend', mouseup);
            html.removeClass('sv-sorting-in-progress');
            if(moveExecuted){
              $controllers[0].$drop($scope.$index, opts);
            }
            $element.removeClass('sv-visibility-hidden');
          });

          // onMousemove(e);
          function onMousemove(e){
            touchFix(e);
            if(!moveExecuted){
              $element.parent().prepend(clone);
              moveExecuted = true;
            }
            $controllers[1].$moveUpdate(opts, {
              x: e.clientX,
              y: e.clientY,
              offset: pointerOffset
            }, clone, $element, placeholder, $controllers[0].getPart(), $scope.$index);
          }
        }
      }
    };
  }]);

  module.directive('svHandle', function(){
    return {
      require: '?^svElement',
      link: function($scope, $element, $attrs, $ctrl){

        $element.addClass('drag-handle');

        if($ctrl)
          $ctrl.handle = $element.add($ctrl.handle); // support multiple handles
      }
    };
  });

  module.directive('svHelper', function(){
    return {
      require: ['?^svPart', '?^svElement'],
      link: function($scope, $element, $attrs, $ctrl){
        $element.addClass('sv-helper').addClass('ng-hide');
        if($ctrl[1])
          $ctrl[1].helper = $element;
        else if($ctrl[0])
          $ctrl[0].helper = $element;
      }
    };
  });

  module.directive('svPlaceholder', function(){
    return {
      require: ['?^svPart', '?^svElement'],
      link: function($scope, $element, $attrs, $ctrl){
        $element.addClass('sv-placeholder').addClass('ng-hide');
        if($ctrl[1])
          $ctrl[1].placeholder = $element;
        else if($ctrl[0])
          $ctrl[0].placeholder = $element;
      }
    };
  });

  angular.element(document.head).append([
    '<style>' +
    '.sv-helper{' +
      'position: fixed !important;' +
      'z-index: 99999;' +
      'margin: 0 !important;' +
    '}' +
    '.sv-candidate{' +
    '}' +
    '.sv-placeholder{' +
      // 'opacity: 0;' +
    '}' +
    '.sv-sorting-in-progress{' +
      '-webkit-user-select: none;' +
      '-moz-user-select: none;' +
      '-ms-user-select: none;' +
      'user-select: none;' +
    '}' +
    '.sv-visibility-hidden{' +
      'visibility: hidden !important;' +
      'opacity: 0 !important;' +
    '}' +
    '</style>'
  ].join(''));

  function touchFix(e){
    if(!('clientX' in e) && !('clientY' in e)) {
      var touches = e.touches || e.originalEvent.touches;
      if(touches && touches.length) {
        e.clientX = touches[0].clientX;
        e.clientY = touches[0].clientY;
      }
      e.preventDefault();
    }
  }

  function getPreviousSibling(element){
    element = element[0];
    if(element.previousElementSibling)
      return angular.element(element.previousElementSibling);
    else{
      var sib = element.previousSibling;
      while(sib != null && sib.nodeType != 1)
        sib = sib.previousSibling;
      return angular.element(sib);
    }
  }

  function insertElementBefore(element, newElement){
    var prevSibl = getPreviousSibling(element);
    if(prevSibl.length > 0){
      prevSibl.after(newElement);
    }
    else{
      element.parent().prepend(newElement);
    }
  }

  var dde = document.documentElement,
  matchingFunction = dde.matches ? 'matches' :
            dde.matchesSelector ? 'matchesSelector' :
            dde.webkitMatches ? 'webkitMatches' :
            dde.webkitMatchesSelector ? 'webkitMatchesSelector' :
            dde.msMatches ? 'msMatches' :
            dde.msMatchesSelector ? 'msMatchesSelector' :
            dde.mozMatches ? 'mozMatches' :
            dde.mozMatchesSelector ? 'mozMatchesSelector' : null;
  if(matchingFunction == null)
    throw 'This browser doesn\'t support the HTMLElement.matches method';

  function elementMatchesSelector(element, selector){
    if(element instanceof angular.element) element = element[0];
    if(matchingFunction !== null)
      return element[matchingFunction](selector);
  }

  var closestElement = angular.element.prototype.closest || function (selector){
    var el = this[0].parentNode;
    while(el !== document.documentElement && !el[matchingFunction](selector))
      el = el.parentNode;

    if(el[matchingFunction](selector))
      return angular.element(el);
    else
      return angular.element();
  };

  /*
    Simple implementation of jQuery's .add method
   */
  if(typeof angular.element.prototype.add !== 'function'){
    angular.element.prototype.add = function(elem){
      var i, res = angular.element();
      elem = angular.element(elem);
      for(i=0;i<this.length;i++){
        res.push(this[i]);
      }
      for(i=0;i<elem.length;i++){
        res.push(elem[i]);
      }
      return res;
    };
  }

})(window, window.angular);
/*! 
 * angular-loading-bar v0.9.0
 * https://chieffancypants.github.io/angular-loading-bar
 * Copyright (c) 2016 Wes Cruver
 * License: MIT
 */
/*
 * angular-loading-bar
 *
 * intercepts XHR requests and creates a loading bar.
 * Based on the excellent nprogress work by rstacruz (more info in readme)
 *
 * (c) 2013 Wes Cruver
 * License: MIT
 */


(function() {

// 'use strict';

// Alias the loading bar for various backwards compatibilities since the project has matured:
angular.module('angular.loading', ['cfp.loadingBarInterceptor']);
angular.module('chieffancypants.loadingBar', ['cfp.loadingBarInterceptor']);


/**
 * loadingBarInterceptor service
 *
 * Registers itself as an Angular interceptor and listens for XHR requests.
 */
angular.module('cfp.loadingBarInterceptor', ['cfp.loadingBar'])
  .config(['$httpProvider', function ($httpProvider) {

    var interceptor = ['$q', '$cacheFactory', '$timeout', '$rootScope', '$log', 'cfpLoadingBar', function ($q, $cacheFactory, $timeout, $rootScope, $log, cfpLoadingBar) {

      /**
       * The total number of requests made
       */
      var reqsTotal = 0;

      /**
       * The number of requests completed (either successfully or not)
       */
      var reqsCompleted = 0;

      /**
       * The amount of time spent fetching before showing the loading bar
       */
      var latencyThreshold = cfpLoadingBar.latencyThreshold;

      /**
       * $timeout handle for latencyThreshold
       */
      var startTimeout;


      /**
       * calls cfpLoadingBar.complete() which removes the
       * loading bar from the DOM.
       */
      function setComplete() {
        $timeout.cancel(startTimeout);
        cfpLoadingBar.complete();
        reqsCompleted = 0;
        reqsTotal = 0;
      }

      /**
       * Determine if the response has already been cached
       * @param  {Object}  config the config option from the request
       * @return {Boolean} retrns true if cached, otherwise false
       */
      function isCached(config) {
        var cache;
        var defaultCache = $cacheFactory.get('$http');
        var defaults = $httpProvider.defaults;

        // Choose the proper cache source. Borrowed from angular: $http service
        if ((config.cache || defaults.cache) && config.cache !== false &&
          (config.method === 'GET' || config.method === 'JSONP')) {
            cache = angular.isObject(config.cache) ? config.cache
              : angular.isObject(defaults.cache) ? defaults.cache
              : defaultCache;
        }

        var cached = cache !== undefined ?
          cache.get(config.url) !== undefined : false;

        if (config.cached !== undefined && cached !== config.cached) {
          return config.cached;
        }
        config.cached = cached;
        return cached;
      }


      return {
        'request': function(config) {
          // Check to make sure this request hasn't already been cached and that
          // the requester didn't explicitly ask us to ignore this request:
          if (!config.ignoreLoadingBar && !isCached(config)) {
            $rootScope.$broadcast('cfpLoadingBar:loading', {url: config.url});
            if (reqsTotal === 0) {
              startTimeout = $timeout(function() {
                cfpLoadingBar.start();
              }, latencyThreshold);
            }
            reqsTotal++;
            cfpLoadingBar.set(reqsCompleted / reqsTotal);
          }
          return config;
        },

        'response': function(response) {
          if (!response || !response.config) {
            $log.error('Broken interceptor detected: Config object not supplied in response:\n https://github.com/chieffancypants/angular-loading-bar/pull/50');
            return response;
          }

          if (!response.config.ignoreLoadingBar && !isCached(response.config)) {
            reqsCompleted++;
            $rootScope.$broadcast('cfpLoadingBar:loaded', {url: response.config.url, result: response});
            if (reqsCompleted >= reqsTotal) {
              setComplete();
            } else {
              cfpLoadingBar.set(reqsCompleted / reqsTotal);
            }
          }
          return response;
        },

        'responseError': function(rejection) {
          if (!rejection || !rejection.config) {
            $log.error('Broken interceptor detected: Config object not supplied in rejection:\n https://github.com/chieffancypants/angular-loading-bar/pull/50');
            return $q.reject(rejection);
          }

          if (!rejection.config.ignoreLoadingBar && !isCached(rejection.config)) {
            reqsCompleted++;
            $rootScope.$broadcast('cfpLoadingBar:loaded', {url: rejection.config.url, result: rejection});
            if (reqsCompleted >= reqsTotal) {
              setComplete();
            } else {
              cfpLoadingBar.set(reqsCompleted / reqsTotal);
            }
          }
          return $q.reject(rejection);
        }
      };
    }];

    $httpProvider.interceptors.push(interceptor);
  }]);


/**
 * Loading Bar
 *
 * This service handles adding and removing the actual element in the DOM.
 * Generally, best practices for DOM manipulation is to take place in a
 * directive, but because the element itself is injected in the DOM only upon
 * XHR requests, and it's likely needed on every view, the best option is to
 * use a service.
 */
angular.module('cfp.loadingBar', [])
  .provider('cfpLoadingBar', function() {

    this.autoIncrement = true;
    this.includeSpinner = true;
    this.includeBar = true;
    this.latencyThreshold = 100;
    this.startSize = 0.03;
    this.parentSelector = 'body';
    this.spinnerTemplate = '<div id="loading-bar-spinner"><div class="spinner-icon"></div></div>';
    this.loadingBarTemplate = '<div id="J_loading_bar"><div class="bar"><div class="peg"></div></div></div>';

    this.$get = ['$injector', '$document', '$timeout', '$rootScope', function ($injector, $document, $timeout, $rootScope) {
      var $animate;
      var $parentSelector = this.parentSelector,
        loadingBarContainer = angular.element(this.loadingBarTemplate),
        loadingBar = loadingBarContainer.find('div').eq(0),
        spinner = angular.element(this.spinnerTemplate);

      var incTimeout,
        completeTimeout,
        started = false,
        status = 0;

      var autoIncrement = this.autoIncrement;
      var includeSpinner = this.includeSpinner;
      var includeBar = this.includeBar;
      var startSize = this.startSize;

      /**
       * Inserts the loading bar element into the dom, and sets it to 2%
       */
      function _start() {
        if (!$animate) {
          $animate = $injector.get('$animate');
        }

        $timeout.cancel(completeTimeout);

        // do not continually broadcast the started event:
        if (started) {
          return;
        }

        var document = $document[0];
        var parent = document.querySelector ?
          document.querySelector($parentSelector)
          : $document.find($parentSelector)[0]
        ;

        if (! parent) {
          parent = document.getElementsByTagName('body')[0];
        }

        var $parent = angular.element(parent);
        var $after = parent.lastChild && angular.element(parent.lastChild);

        $rootScope.$broadcast('cfpLoadingBar:started');
        started = true;

        if (includeBar) {
          $animate.enter(loadingBarContainer, $parent, $after);
        }

        if (includeSpinner) {
          $animate.enter(spinner, $parent, loadingBarContainer);
        }

        _set(startSize);
      }

      /**
       * Set the loading bar's width to a certain percent.
       *
       * @param n any value between 0 and 1
       */
      function _set(n) {
        if (!started) {
          return;
        }
        var pct = (n * 100) + '%';
        loadingBar.css('width', pct);
        status = n;

        // increment loadingbar to give the illusion that there is always
        // progress but make sure to cancel the previous timeouts so we don't
        // have multiple incs running at the same time.
        if (autoIncrement) {
          $timeout.cancel(incTimeout);
          incTimeout = $timeout(function() {
            _inc();
          }, 200);
        }
      }

      /**
       * Increments the loading bar by a random amount
       * but slows down as it progresses
       */
      function _inc() {
        if (_status() >= 1) {
          return;
        }

        var rnd = 0;

        // TODO: do this mathmatically instead of through conditions

        var stat = _status();
        if (stat >= 0 && stat < 0.25) {
          // Start out between 3 - 6% increments
          rnd = (Math.random() * (5 - 3 + 1) + 3) / 100;
        } else if (stat >= 0.25 && stat < 0.65) {
          // increment between 0 - 3%
          rnd = (Math.random() * 3) / 100;
        } else if (stat >= 0.65 && stat < 0.9) {
          // increment between 0 - 2%
          rnd = (Math.random() * 2) / 100;
        } else if (stat >= 0.9 && stat < 0.99) {
          // finally, increment it .5 %
          rnd = 0.005;
        } else {
          // after 99%, don't increment:
          rnd = 0;
        }

        var pct = _status() + rnd;
        _set(pct);
      }

      function _status() {
        return status;
      }

      function _completeAnimation() {
        status = 0;
        started = false;
      }

      function _complete() {

        if (!$animate) {
          $animate = $injector.get('$animate');
        }

        $rootScope.$broadcast('cfpLoadingBar:completed');
        _set(1);

        // 中断，保持百分百
        return false;

        $timeout.cancel(completeTimeout);

        // Attempt to aggregate any start/complete calls within 500ms:
        completeTimeout = $timeout(function() {
          var promise = $animate.leave(loadingBarContainer, _completeAnimation);
          if (promise && promise.then) {
            promise.then(_completeAnimation);
          }
          $animate.leave(spinner);
        }, 500);
      }

      return {
        start            : _start,
        set              : _set,
        status           : _status,
        inc              : _inc,
        complete         : _complete,
        autoIncrement    : this.autoIncrement,
        includeSpinner   : this.includeSpinner,
        latencyThreshold : this.latencyThreshold,
        parentSelector   : this.parentSelector,
        startSize        : this.startSize
      };


    }];     //
  });       // wtf javascript. srsly
})();       //

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

/**
 * ng-breadcrumb.js - v0.4.1 - A better AngularJS service to help with
 * breadcrumb-style navigation between views.
 *
 * @author Ian Kennington Walter (http://ianvonwalter.com)
 */
(function(angular) {
  // 'use strict';
  angular
    .module('ng-breadcrumbs', [])
    .factory('breadcrumbs', [
      '$rootScope',
      '$location',
      '$route',
      function ($rootScope, $location, $route) {
        var BreadcrumbService = {
          breadcrumbs: [],
          get: function(options) {
            this.options = options || this.options;
            if (this.options) {
              for (var key in this.options) {
                if (this.options.hasOwnProperty(key)) {
                  for (var index in this.breadcrumbs) {
                    if (this.breadcrumbs.hasOwnProperty(index)) {
                      var breadcrumb = this.breadcrumbs[index];
                      if (breadcrumb.label === key) {
                        breadcrumb.label = this.options[key];
                      }
                    }
                  }
                }
              }
            }
            return this.breadcrumbs;
          },
          generateBreadcrumbs: function() {
            var routes = $route.routes,
                _this = this,
                params,
                pathElements,
                pathObj = {},
                path = '',
                originalPath = '',
                param;

            if ($route && $route.current && $route.current.originalPath) {
              this.breadcrumbs = [];
              params = $route.current.params;
              pathElements = $route.current.originalPath.trim().split('/');

              // Necessary to get rid of of duplicate empty string on root path
              if (pathElements[1] === '') {
                pathElements.splice(1, 1);
              }

              angular.forEach(pathElements, function(pathElement, index) {
                param = pathElement[0] === ':' &&
                        typeof params[pathElement
                          .slice(1, pathElement.length)] !== 'undefined' ?
                        params[pathElement.slice(1, pathElement.length)] :
                        false;

                pathObj[index] = {
                  path: param || pathElement,
                  originalPath: pathElement
                };

                path = Object
                  .keys(pathObj)
                  .map(function(k) { return pathObj[k].path;  })
                  .join('/') || '/';

                originalPath = Object
                  .keys(pathObj)
                  .map(function(k) { return pathObj[k].originalPath;  })
                  .join('/') || '/';

                if (routes[originalPath] &&
                    (routes[originalPath].label || param) &&
                    !routes[originalPath].excludeBreadcrumb) {
                  _this.breadcrumbs.push({
                    path: path,
                    originalPath: originalPath,
                    label: routes[originalPath].label || param,
                    param: param
                  });
                }
              });
            }
          }
        };

        // We want to update breadcrumbs only when a route is actually changed
        // as $location.path() will get updated immediately (even if route
        // change fails!)
        $rootScope.$on('$routeChangeSuccess', function() {
          BreadcrumbService.generateBreadcrumbs();
        });

        $rootScope.$watch(
          function() { return BreadcrumbService.options; },
          function() {
            BreadcrumbService.generateBreadcrumbs();
          }
        );

        BreadcrumbService.generateBreadcrumbs();

        return BreadcrumbService;
      }
    ]);
})(angular);

/**
* @ngdoc overview
* @name angular.bootstrap.carousel
*
* @description
* AngularJS version of an image carousel.
*
*/
angular.module('angular.bootstrap.carousel', [])
.controller('CarouselController', ['$scope', '$element', '$interval', '$animate', function($scope, $element, $interval, $animate) {
  
  // 初始化活动下标
  $scope.active_slide_index = 0;

  var self = this,
    slides = self.slides = $scope.slides = [],
    NEW_ANIMATE = angular.version.minor >= 4,
    NO_TRANSITION = 'uib-noTransition',
    SLIDE_DIRECTION = 'uib-slideDirection',
    currentIndex = -1,
    currentInterval, isPlaying;
  self.currentSlide = null;

  var destroyed = false;
  /* direction: "prev" or "next" */
  self.select = $scope.select = function(nextSlide, direction) {
    var nextIndex = $scope.indexOfSlide(nextSlide);
    //Decide direction if it's not given
    if (direction === undefined) {
      direction = nextIndex > self.getCurrentIndex() ? 'next' : 'prev';
    }
    //Prevent this user-triggered transition from occurring if there is already one in progress
    if (nextSlide && nextSlide !== self.currentSlide && !$scope.$currentTransition) {
      goNext(nextSlide, nextIndex, direction);
    }
  };

  function goNext(slide, index, direction) {
    // Scope has been destroyed, stop here.
    if (destroyed) { return; }

    angular.extend(slide, {direction: direction, active: true});
    angular.extend(self.currentSlide || {}, {direction: direction, active: false});
    if ($animate.enabled() && !$scope.noTransition && !$scope.$currentTransition &&
      slide.$element && self.slides.length > 1) {
      slide.$element.data(SLIDE_DIRECTION, slide.direction);
      if (self.currentSlide && self.currentSlide.$element) {
        self.currentSlide.$element.data(SLIDE_DIRECTION, slide.direction);
      }

      $scope.$currentTransition = true;
      if (NEW_ANIMATE) {
        $animate.on('addClass', slide.$element, function(element, phase) {
          if (phase === 'close') {
            $scope.$currentTransition = null;
            $animate.off('addClass', element);
          }
        });
      } else {
        slide.$element.one('$animate:close', function closeFn() {
          $scope.$currentTransition = null;
        });
      }
    }

    self.currentSlide = slide;
    currentIndex = index;

    // 改变活动下标
    $scope.active_slide_index = currentIndex;

    //every time you change slides, reset the timer
    restartTimer();
  }

  $scope.$on('$destroy', function() {
    destroyed = true;
  });

  function getSlideByIndex(index) {
    if (angular.isUndefined(slides[index].index)) {
      return slides[index];
    }
    var i, len = slides.length;
    for (i = 0; i < slides.length; ++i) {
      if (slides[i].index == index) {
        return slides[i];
      }
    }
  }

  self.getCurrentIndex = function() {
    if (self.currentSlide && angular.isDefined(self.currentSlide.index)) {
      return +self.currentSlide.index;
    }
    return currentIndex;
  };

  /* Allow outside people to call indexOf on slides array */
  $scope.indexOfSlide = function(slide) {
    return angular.isDefined(slide.index) ? +slide.index : slides.indexOf(slide);
  };

  $scope.next = function() {
    var newIndex = (self.getCurrentIndex() + 1) % slides.length;

    if (newIndex === 0 && $scope.noWrap()) {
      $scope.pause();
      return;
    }

    return self.select(getSlideByIndex(newIndex), 'next');
  };

  $scope.prev = function() {
    var newIndex = self.getCurrentIndex() - 1 < 0 ? slides.length - 1 : self.getCurrentIndex() - 1;

    if ($scope.noWrap() && newIndex === slides.length - 1) {
      $scope.pause();
      return;
    }

    return self.select(getSlideByIndex(newIndex), 'prev');
  };

  $scope.isActive = function(slide) {
     return self.currentSlide === slide;
  };

  $scope.$watch('interval', restartTimer);
  $scope.$on('$destroy', resetTimer);

  function restartTimer() {
    resetTimer();
    var interval = +$scope.interval;
    if (!isNaN(interval) && interval > 0) {
      currentInterval = $interval(timerFn, interval);
    }
  }

  function resetTimer() {
    if (currentInterval) {
      $interval.cancel(currentInterval);
      currentInterval = null;
    }
  }

  function timerFn() {
    var interval = +$scope.interval;
    if (isPlaying && !isNaN(interval) && interval > 0 && slides.length) {
      $scope.next();
    } else {
      $scope.pause();
    }
  }

  $scope.play = function() {
    if (!isPlaying) {
      isPlaying = true;
      restartTimer();
    }
  };
  $scope.pause = function() {
    if (!$scope.noPause) {
      isPlaying = false;
      resetTimer();
    }
  };

  self.addSlide = function(slide, element) {
    slide.$element = element;
    slides.push(slide);
    //if this is the first slide or the slide is set to active, select it
    if(slides.length === 1 || slide.active) {
      self.select(slides[slides.length - 1]);
      if (slides.length === 1) {
        $scope.play();
      }
    } else {
      slide.active = false;
    }
  };

  self.removeSlide = function(slide) {
    if (angular.isDefined(slide.index)) {
      slides.sort(function(a, b) {
        return +a.index > +b.index;
      });
    }
    //get the index of the slide inside the carousel
    var index = slides.indexOf(slide);
    slides.splice(index, 1);
    if (slides.length > 0 && slide.active) {
      if (index >= slides.length) {
        self.select(slides[index - 1]);
      } else {
        self.select(slides[index]);
      }
    } else if (currentIndex > index) {
      currentIndex--;
    }
    
    //clean the currentSlide when no more slide
    if (slides.length === 0) {
      self.currentSlide = null;
    }
  };

  $scope.$watch('noTransition', function(noTransition) {
    $element.data(NO_TRANSITION, noTransition);
  });
}])

/**
 * @ngdoc directive
 * @name ui.bootstrap.carousel.directive:carousel
 * @restrict EA
 *
 * @description
 * Carousel is the outer container for a set of image 'slides' to showcase.
 *
 * @param {number=} interval The time, in milliseconds, that it will take the carousel to go to the next slide.
 * @param {boolean=} noTransition Whether to disable transitions on the carousel.
 * @param {boolean=} noPause Whether to disable pausing on the carousel (by default, the carousel interval pauses on hover).
 *
 * @example
<example module="ui.bootstrap">
  <file name="index.html">
    <carousel>
      <slide>
        <img src="http://placekitten.com/150/150" style="margin:auto;">
        <div class="carousel-caption">
          <p>Beautiful!</p>
        </div>
      </slide>
      <slide>
        <img src="http://placekitten.com/100/150" style="margin:auto;">
        <div class="carousel-caption">
          <p>D'aww!</p>
        </div>
      </slide>
    </carousel>
  </file>
  <file name="demo.css">
    .carousel-indicators {
      top: auto;
      bottom: 15px;
    }
  </file>
</example>
 */
.directive('carousel', [function() {
  return {
    restrict: 'EA',
    transclude: true,
    replace: true,
    controller: 'CarouselController',
    controllerAs: 'carousel',
    require: 'carousel',
    templateUrl: function(element, attrs) {
      return attrs.templateUrl || 'partials/template/carousel/carousel.html';
    },
    scope: {
      interval: '=',
      noTransition: '=',
      noPause: '=',
      noWrap: '&'
    }
  };
}])

/**
 * @ngdoc directive
 * @name ui.bootstrap.carousel.directive:slide
 * @restrict EA
 *
 * @description
 * Creates a slide inside a {@link ui.bootstrap.carousel.directive:carousel carousel}.  Must be placed as a child of a carousel element.
 *
 * @param {boolean=} active Model binding, whether or not this slide is currently active.
 * @param {number=} index The index of the slide. The slides will be sorted by this parameter.
 *
 * @example
<example module="ui.bootstrap">
  <file name="index.html">
<div ng-controller="CarouselDemoCtrl">
  <carousel>
    <slide ng-repeat="slide in slides" active="slide.active" index="$index">
      <img ng-src="{{slide.image}}" style="margin:auto;">
      <div class="carousel-caption">
        <h4>Slide {{$index}}</h4>
        <p>{{slide.text}}</p>
      </div>
    </slide>
  </carousel>
  Interval, in milliseconds: <input type="number" ng-model="myInterval">
  <br />Enter a negative number to stop the interval.
</div>
  </file>
  <file name="script.js">
function CarouselDemoCtrl($scope) {
  $scope.myInterval = 5000;
}
  </file>
  <file name="demo.css">
    .carousel-indicators {
      top: auto;
      bottom: 15px;
    }
  </file>
</example>
*/

.directive('slide', function() {
  return {
    require: '^carousel',
    restrict: 'EA',
    transclude: true,
    replace: true,
    templateUrl: function(element, attrs) {
      return attrs.templateUrl || 'partials/template/carousel/slide.html';
    },
    scope: {
      active: '=?',
      actual: '=?',
      index: '=?'
    },
    link: function (scope, element, attrs, carouselCtrl) {
      carouselCtrl.addSlide(scope, element);
      //when the scope is destroyed then remove the slide from the current slides array
      scope.$on('$destroy', function() {
        carouselCtrl.removeSlide(scope);
      });

      scope.$watch('active', function(active) {
        if (active) {
          carouselCtrl.select(scope);
        }
      });
    }
  };
})

.animation('.item', ['$injector', '$animate', function ($injector, $animate) {

  var NO_TRANSITION = 'uib-noTransition',
    SLIDE_DIRECTION = 'uib-slideDirection',
    $animateCss = null;

  if ($injector.has('$animateCss')) {
    $animateCss = $injector.get('$animateCss');
  }

  function removeClass(element, className, callback) {
    element.removeClass(className);
    if (callback) {
      callback();
    }
  }

  return {
    beforeAddClass: function(element, className, done) {
      // Due to transclusion, noTransition property is on parent's scope
      if (className == 'active' && element.parent() &&
          !element.parent().data(NO_TRANSITION)) {
        var stopped = false;
        var direction = element.data(SLIDE_DIRECTION);
        var directionClass = direction == 'next' ? 'left' : 'right';
        var removeClassFn = removeClass.bind(this, element,
          directionClass + ' ' + direction, done);
        element.addClass(direction);

        if ($animateCss) {
          $animateCss(element, { addClass: directionClass })
            .start()
            .done(removeClassFn);
        } else {
          $animate.addClass(element, directionClass).then(function () {
            if (!stopped) {
              removeClassFn();
            }
            done();
          });
        }

        return function () {
          stopped = true;
        };
      }
      done();
    },
    beforeRemoveClass: function (element, className, done) {
      // Due to transclusion, noTransition property is on parent's scope
      if (className === 'active' && element.parent() &&
          !element.parent().data(NO_TRANSITION)) {
        var stopped = false;
        var direction = element.data(SLIDE_DIRECTION);
        var directionClass = direction == 'next' ? 'left' : 'right';
        var removeClassFn = removeClass.bind(this, element, directionClass, done);

        if ($animateCss) {
          $animateCss(element, { addClass: directionClass })
            .start()
            .done(removeClassFn);
        } else {
          $animate.addClass(element, directionClass).then(function() {
            if (!stopped) {
              removeClassFn();
            }
            done();
          });
        }
        return function() {
          stopped = true;
        };
      }
      done();
    }
  };
}]);

angular.module('CollapseDirective', [])

.directive('uibCollapse', ['$animate', '$injector', function($animate, $injector) {
  var $animateCss = $injector.has('$animateCss') ? $injector.get('$animateCss') : null;
  return {
    link: function(scope, element, attrs) {
      function expand() {
        element.removeClass('collapse')
          .addClass('collapsing')
          .attr('aria-expanded', true)
          .attr('aria-hidden', false);

        if ($animateCss) {
          $animateCss(element, {
            addClass: 'in',
            easing: 'ease',
            to: { height: element[0].scrollHeight + 'px' }
          }).start().done(expandDone);
        } else {
          $animate.addClass(element, 'in', {
            to: { height: element[0].scrollHeight + 'px' }
          }).then(expandDone);
        }
      }

      function expandDone() {
        element.removeClass('collapsing')
          .addClass('collapse')
          .css({height: 'auto'});
      }

      function collapse() {
        if (!element.hasClass('collapse') && !element.hasClass('in')) {
          return collapseDone();
        }

        element
          // IMPORTANT: The height must be set before adding "collapsing" class.
          // Otherwise, the browser attempts to animate from height 0 (in
          // collapsing class) to the given height here.
          .css({height: element[0].scrollHeight + 'px'})
          // initially all panel collapse have the collapse class, this removal
          // prevents the animation from jumping to collapsed state
          .removeClass('collapse')
          .addClass('collapsing')
          .attr('aria-expanded', false)
          .attr('aria-hidden', true);

        if ($animateCss) {
          $animateCss(element, {
            removeClass: 'in',
            to: {height: '0'}
          }).start().done(collapseDone);
        } else {
          $animate.removeClass(element, 'in', {
            to: {height: '0'}
          }).then(collapseDone);
        }
      }

      function collapseDone() {
        element.css({height: '0'}); // Required so that collapse works when animation is disabled
        element.removeClass('collapsing')
          .addClass('collapse');
      }

      scope.$watch(attrs.uibCollapse, function(shouldCollapse) {
        if (shouldCollapse) {
          collapse();
        } else {
          expand();
        }
      });
    }
  };
}]);

/* Deprecated collapse below */

angular.module('CollapseDirective')

.value('$collapseSuppressWarning', false)

.directive('collapse', ['$animate', '$injector', '$log', '$collapseSuppressWarning', function($animate, $injector, $log, $collapseSuppressWarning) {
  var $animateCss = $injector.has('$animateCss') ? $injector.get('$animateCss') : null;
  return {
    link: function(scope, element, attrs) {
      if (!$collapseSuppressWarning) {
        $log.warn('collapse is now deprecated. Use uib-collapse instead.');
      }

      function expand() {
        element.removeClass('collapse')
          .addClass('collapsing')
          .attr('aria-expanded', true)
          .attr('aria-hidden', false);

        if ($animateCss) {
          $animateCss(element, {
            addClass: 'in',
            easing: 'ease',
            to: { height: element[0].scrollHeight + 'px' }
          }).start().done(expandDone);
        } else {
          $animate.addClass(element, 'in', {
            to: { height: element[0].scrollHeight + 'px' }
          }).then(expandDone);
        }
      }

      function expandDone() {
        element.removeClass('collapsing')
          .addClass('collapse')
          .css({height: 'auto'});
      }

      function collapse() {
        if (!element.hasClass('collapse') && !element.hasClass('in')) {
          return collapseDone();
        }

        element
          // IMPORTANT: The height must be set before adding "collapsing" class.
          // Otherwise, the browser attempts to animate from height 0 (in
          // collapsing class) to the given height here.
          .css({height: element[0].scrollHeight + 'px'})
          // initially all panel collapse have the collapse class, this removal
          // prevents the animation from jumping to collapsed state
          .removeClass('collapse')
          .addClass('collapsing')
          .attr('aria-expanded', false)
          .attr('aria-hidden', true);

        if ($animateCss) {
          $animateCss(element, {
            removeClass: 'in',
            to: {height: '0'}
          }).start().done(collapseDone);
        } else {
          $animate.removeClass(element, 'in', {
            to: {height: '0'}
          }).then(collapseDone);
        }
      }

      function collapseDone() {
        element.css({height: '0'}); // Required so that collapse works when animation is disabled
        element.removeClass('collapsing')
          .addClass('collapse');
      }

      scope.$watch(attrs.collapse, function(shouldCollapse) {
        if (shouldCollapse) {
          collapse();
        } else {
          expand();
        }
      });
    }
  };
}]);

/*
*
* 课程列表模块 
*
* Description
*
*/

angular.module('CourseListDirective', [])

// 返回顶部
.directive('courseList', function($window) { 
  return {
    scope: { courses: '=courseList' },
    replace: true,
    restrict: 'A',
    templateUrl: 'partials/home/course/list-item.html',
    link: function (scope, element, attrs) {
      // console.log(scope);
      // console.log(element);
      // console.log(attrs);
    }
  }
})
/*
*
* 到达屏幕中心，添加指定class 
*
* FocusAddClassDirective
*
*/

angular.module('FocusAddClassDirective', [])

.directive('focusAddClass', function () {
  return {
    restrict: 'A',
    scope: {
      autoRemove: '=',
    },
    link: function (scope, element, attrs) {
      var mainFunc = function () {
        var windowHeight = $(window).height();
        var domTopGauge = element[0].getBoundingClientRect().top;
        var domHeight = element[0].clientHeight;
        var domInCenter = (0 < (domTopGauge + (domHeight / 2)) && (domTopGauge + (domHeight / 2)) < windowHeight);
        if (domInCenter) element.addClass(attrs.focusAddClass);
        if (!domInCenter && scope.autoRemove) element.removeClass(attrs.focusAddClass);
      };
      mainFunc();
      $(window).scroll(mainFunc);
    }
  };
})

.directive('autoScreenHeight', function () {
  return {
    restrict: 'A',
    link: function (scope, element, attrs) {
      // $('body').css('overflow', 'hidden');
      // console.log(element);
      var windowHeight;
      var heightPercentage = Number(attrs.heightPercentage) || 100;
      var mainFunc = function () {
        windowHeight = $(window).height();
        element.css('height', windowHeight / 100 * heightPercentage);
        if (heightPercentage != 100) element.css('marginTop', windowHeight / 100 * (( 100 - heightPercentage) / 2) + 'px');
      };
      mainFunc();
      $(window).resize(mainFunc);
      $(window).scroll(function () {
        return false;
      });
    }
  };
})
/*
*
* 加载动画模块 
*
* Description
*
*/

angular.module('LoadingDirective', [])

// 全局loading动画
.directive('loading', function() { 
  return {
    restrict: 'A',
    template: '<div></div><div></div><div></div>',
    link: function (scope, element, attrs) {
      if (!attrs.loading || attrs.loading == 'A') {
        angular.element(element).attr('class', 'loading ball-beat');
      } else if (attrs.loading == 'B') {
        angular.element(element).attr('class', 'loading line-spin-fade');
        angular.element(element).html('<div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div>');
      } else if (attrs.loading == 'C') {
        angular.element(element).attr('class', 'loading line-scale');
        angular.element(element).html('<div></div><div></div><div></div><div></div><div></div>');
      }
    }
  };
})
angular.module('PaginationDirective', [])
.controller('PaginationController', ['$scope', '$attrs', '$parse', function($scope, $attrs, $parse) {
  var self = this,
      ngModelCtrl = { $setViewValue: angular.noop }, // nullModelCtrl
      setNumPages = $attrs.numPages ? $parse($attrs.numPages).assign : angular.noop;

  this.init = function(ngModelCtrl_, config) {
    ngModelCtrl = ngModelCtrl_;
    this.config = config;

    ngModelCtrl.$render = function() {
      self.render();
    };

    if ($attrs.itemsPerPage) {
      $scope.$parent.$watch($parse($attrs.itemsPerPage), function(value) {
        self.itemsPerPage = parseInt(value, 10);
        $scope.totalPages = self.calculateTotalPages();
      });
    } else {
      this.itemsPerPage = config.itemsPerPage;
    }

    $scope.$watch('totalItems', function() {
      $scope.totalPages = self.calculateTotalPages();
    });

    $scope.$watch('totalPages', function(value) {
      setNumPages($scope.$parent, value); // Readonly variable

      if ( $scope.page > value ) {
        $scope.selectPage(value);
      } else {
        ngModelCtrl.$render();
      }
    });
  };

  this.calculateTotalPages = function() {
    var totalPages = this.itemsPerPage < 1 ? 1 : Math.ceil($scope.totalItems / this.itemsPerPage);
    return Math.max(totalPages || 0, 1);
  };

  this.render = function() {
    $scope.page = parseInt(ngModelCtrl.$viewValue, 10) || 1;
  };

  $scope.selectPage = function(page, evt) {
    if (evt) {
      evt.preventDefault();
    }

    var clickAllowed = !$scope.ngDisabled || !evt;
    if (clickAllowed && $scope.page !== page && page > 0 && page <= $scope.totalPages) {
      if (evt && evt.target) {
        evt.target.blur();
      }
      ngModelCtrl.$setViewValue(page);
      ngModelCtrl.$render();
    }
  };

  $scope.getText = function(key) {
    return $scope[key + 'Text'] || self.config[key + 'Text'];
  };

  $scope.noPrevious = function() {
    return $scope.page === 1;
  };

  $scope.noNext = function() {
    return $scope.page === $scope.totalPages;
  };
}])

.constant('paginationConfig', {
  itemsPerPage: 10,
  boundaryLinks: false,
  directionLinks: true,
  firstText: '首页',
  previousText: '上一页',
  nextText: '下一页',
  lastText: '末页',
  rotate: true
})

.directive('pagination', ['$parse', 'paginationConfig', function($parse, paginationConfig) {
  return {
    restrict: 'EA',
    scope: {
      totalItems: '=',
      firstText: '@',
      previousText: '@',
      nextText: '@',
      lastText: '@',
      ngDisabled:'='
    },
    require: ['pagination', '?ngModel'],
    controller: 'PaginationController',
    controllerAs: 'pagination',
    templateUrl: function(element, attrs) {
      return attrs.templateUrl || 'partials/template/pagination/pagination.html';
    },
    replace: true,
    link: function(scope, element, attrs, ctrls) {
      var paginationCtrl = ctrls[0], ngModelCtrl = ctrls[1];

      if (!ngModelCtrl) {
         return; // do nothing if no ng-model
      }

      // Setup configuration parameters
      var maxSize = angular.isDefined(attrs.maxSize) ? scope.$parent.$eval(attrs.maxSize) : paginationConfig.maxSize,
          rotate = angular.isDefined(attrs.rotate) ? scope.$parent.$eval(attrs.rotate) : paginationConfig.rotate;
      scope.boundaryLinks = angular.isDefined(attrs.boundaryLinks) ? scope.$parent.$eval(attrs.boundaryLinks) : paginationConfig.boundaryLinks;
      scope.directionLinks = angular.isDefined(attrs.directionLinks) ? scope.$parent.$eval(attrs.directionLinks) : paginationConfig.directionLinks;

      paginationCtrl.init(ngModelCtrl, paginationConfig);

      if (attrs.maxSize) {
        scope.$parent.$watch($parse(attrs.maxSize), function(value) {
          maxSize = parseInt(value, 10);
          paginationCtrl.render();
        });
      }

      // Create page object used in template
      function makePage(number, text, isActive) {
        return {
          number: number,
          text: text,
          active: isActive
        };
      }

      function getPages(currentPage, totalPages) {
        var pages = [];

        // Default page limits
        var startPage = 1, endPage = totalPages;
        var isMaxSized = angular.isDefined(maxSize) && maxSize < totalPages;

        // recompute if maxSize
        if (isMaxSized) {
          if (rotate) {
            // Current page is displayed in the middle of the visible ones
            startPage = Math.max(currentPage - Math.floor(maxSize/2), 1);
            endPage   = startPage + maxSize - 1;

            // Adjust if limit is exceeded
            if (endPage > totalPages) {
              endPage   = totalPages;
              startPage = endPage - maxSize + 1;
            }
          } else {
            // Visible pages are paginated with maxSize
            startPage = ((Math.ceil(currentPage / maxSize) - 1) * maxSize) + 1;

            // Adjust last page if limit is exceeded
            endPage = Math.min(startPage + maxSize - 1, totalPages);
          }
        }

        // Add page number links
        for (var number = startPage; number <= endPage; number++) {
          var page = makePage(number, number, number === currentPage);
          pages.push(page);
        }

        // Add links to move between page sets
        if (isMaxSized && ! rotate) {
          if (startPage > 1) {
            var previousPageSet = makePage(startPage - 1, '...', false);
            pages.unshift(previousPageSet);
          }

          if (endPage < totalPages) {
            var nextPageSet = makePage(endPage + 1, '...', false);
            pages.push(nextPageSet);
          }
        }

        return pages;
      }

      var originalRender = paginationCtrl.render;
      paginationCtrl.render = function() {
        originalRender();
        if (scope.page > 0 && scope.page <= scope.totalPages) {
          scope.pages = getPages(scope.page, scope.totalPages);
        }
      };
    }
  };
}])

.constant('pagerConfig', {
  itemsPerPage: 10,
  previousText: '« 上一页',
  nextText: '下一页 »',
  align: true
})

.directive('pager', ['pagerConfig', function(pagerConfig) {
  return {
    restrict: 'EA',
    scope: {
      totalItems: '=',
      previousText: '@',
      nextText: '@',
      ngDisabled: '='
    },
    require: ['pager', '?ngModel'],
    controller: 'PaginationController',
    controllerAs: 'pagination',
    templateUrl: function(element, attrs) {
      return attrs.templateUrl || 'partials/template/pagination/pager.html';
    },
    replace: true,
    link: function(scope, element, attrs, ctrls) {
      var paginationCtrl = ctrls[0], ngModelCtrl = ctrls[1];

      if (!ngModelCtrl) {
         return; // do nothing if no ng-model
      }

      scope.align = angular.isDefined(attrs.align) ? scope.$parent.$eval(attrs.align) : pagerConfig.align;
      paginationCtrl.init(ngModelCtrl, pagerConfig);
    }
  };
}]);
/**
* Qupload Module
*
* Description
*/
angular.module('Qupload', ['angular.modal', 'FileService'])

.service('$qupload', ['$http', '$q', '$localStorage',
  function ($http, $q, $localStorage) {

    function utf16to8(str) {
      var out, i, len, c;
      out = '';
      len = str.length;
      for (i = 0; i < len; i++) {
        c = str.charCodeAt(i);
        if ((c >= 0x0001) && (c <= 0x007F)) {
          out += str.charAt(i);
        } else if (c > 0x07FF) {
          out += String.fromCharCode(0xE0 | ((c >> 12) & 0x0F));
          out += String.fromCharCode(0x80 | ((c >> 6) & 0x3F));
          out += String.fromCharCode(0x80 | ((c >> 0) & 0x3F));
        } else {
          out += String.fromCharCode(0xC0 | ((c >> 6) & 0x1F));
          out += String.fromCharCode(0x80 | ((c >> 0) & 0x3F));
        }
      }
      return out;
    }

    /*
     * Interfaces:
     * b64 = base64encode(data);
     */
    var base64EncodeChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

    function base64encode(str) {
      var out, i, len;
      var c1, c2, c3;
      len = str.length;
      i = 0;
      out = '';
      while (i < len) {
        c1 = str.charCodeAt(i++) & 0xff;
        if (i == len) {
          out += base64EncodeChars.charAt(c1 >> 2);
          out += base64EncodeChars.charAt((c1 & 0x3) << 4);
          out += '==';
          break;
        }
        c2 = str.charCodeAt(i++);
        if (i == len) {
          out += base64EncodeChars.charAt(c1 >> 2);
          out += base64EncodeChars.charAt(((c1 & 0x3) << 4) | ((c2 & 0xF0) >> 4));
          out += base64EncodeChars.charAt((c2 & 0xF) << 2);
          out += '=';
          break;
        }
        c3 = str.charCodeAt(i++);
        out += base64EncodeChars.charAt(c1 >> 2);
        out += base64EncodeChars.charAt(((c1 & 0x3) << 4) | ((c2 & 0xF0) >> 4));
        out += base64EncodeChars.charAt(((c2 & 0xF) << 2) | ((c3 & 0xC0) >> 6));
        out += base64EncodeChars.charAt(c3 & 0x3F);
      }
      return out;
    }

    var uploadEndPoint = 'http://up.qiniu.com';
    // var uploadEndPoint = 'http://7xnbft.com2.z0.glb.qiniucdn.com';

    // if page loaded over HTTPS, then uploadEndPoint should be "https://up.qbox.me", see https://github.com/qiniu/js-sdk/blob/master/README.md#%E8%AF%B4%E6%98%8E
    if(window && window.location && window.location.protocol==="https:"){
      uploadEndPoint = "https://up.qbox.me";
    }

    var defaultsSetting = {
      chunkSize: 1024 * 1024 * 4,
      mkblkEndPoint: uploadEndPoint + '/mkblk/',
      mkfileEndPoint: uploadEndPoint + '/mkfile/',
      maxRetryTimes: 3
    };

    //Is support qiniu resumble upload
    this.support = (
      typeof File !== 'undefined' &&
      typeof Blob !== 'undefined' &&
      typeof FileList !== 'undefined' &&
      (!!Blob.prototype.slice || !!Blob.prototype.webkitSlice || !!Blob.prototype.mozSlice ||
        false
      )
    );
    if (!this.support) {
      return null;
    }

    var fileHashKeyFunc = function (file) {
      return file.name + file.lastModified + file.size + file.type;
    };

    this.upload = function (config) {
      var deferred = $q.defer();
      var promise = deferred.promise;

      var file = config.file;
      if (!file) {
        return;
      }

      var fileHashKey = fileHashKeyFunc(file);
      var blockRet = $localStorage.fileHashKey;
      if (!blockRet) {
        blockRet = [];
      }
      var blkCount = (file.size + ((1 << 22) - 1)) >> 22;

      var getChunck = function (file, startByte, endByte) {
        return file[(file.slice ? 'slice' : (file.mozSlice ? 'mozSlice' : (file.webkitSlice ? 'webkitSlice' : 'slice')))](startByte, endByte);
      };

      var getBlkSize = function (file, blkCount, blkIndex) {

        if (blkIndex === blkCount - 1) {
          return file.size - 4194304 * blkIndex;
        } else {
          return 4194304;
        }
      };

      var mkfile = function (file, blockRet) {
        if (blockRet.length === 0) {
          return;
        }
        var body = '';
        var b;
        for (var i = 0; i < blockRet.length - 1; i++) {
          b = angular.fromJson(blockRet[i]);
          body += (b.ctx + ',');
        }
        b = angular.fromJson(blockRet[blockRet.length - 1]);
        body += b.ctx;

        var url = defaultsSetting.mkfileEndPoint + file.size;

        if (config && config.key) {
          url += ('/key/' + base64encode(utf16to8(config.key)));
        }

        $http({
          url: url,
          method: 'POST',
          data: body,
          headers: {
            'Authorization': 'UpToken ' + config.token,
            'Content-Type': 'text/plain'
          }
        }).success(function (e) {
          deferred.resolve(e);
          $localStorage.fileHashKey = '';
        }).error(function (e) {
          deferred.reject(e);
        });
      };
      var xhr;

      var mkblk = function (file, i, retry) {
        if (i === blkCount) {
          mkfile(file, blockRet);
          return;
        }
        if (!retry) {
          deferred.reject('max retried,still failure');
          return;
        }

        var blkSize = getBlkSize(file, blkCount, i);
        var offset = i * 4194304;
        var chunck = getChunck(file, offset, offset + blkSize);

        xhr = new XMLHttpRequest();
        xhr.open('POST', defaultsSetting.mkblkEndPoint + blkSize, true);
        xhr.setRequestHeader('Authorization', 'UpToken ' + config.token);

        xhr.upload.addEventListener('progress', function (evt) {
          if (evt.lengthComputable) {
            var nevt = {
              totalSize: file.size,
              loaded: evt.loaded + offset
            };
            deferred.notify(nevt);
          }
        });

        xhr.upload.onerror = function () {
          mkblk(config.file, i, --retry);
        };

        xhr.onreadystatechange = function (response) {
          if (response && xhr.readyState === 4 && xhr.status === 200) {
            if (xhr.status === 200) {
              blockRet[i] = xhr.responseText;
              $localStorage.fileHashKey = blockRet;
              mkblk(config.file, ++i, defaultsSetting.maxRetryTimes);
            } else {
              mkblk(config.file, i, --retry);
            }
          }
        };
        xhr.send(chunck);
      };


      mkblk(config.file, blockRet.length, defaultsSetting.maxRetryTimes);

      promise.abort = function () {
        xhr.abort();
        $localStorage.fileHashKey = '';
      };

      promise.pause = function () {
        xhr.abort();
      };

      return promise;
    };
  }
])

.controller('FileController', ['$localStorage', '$rootScope', '$scope', '$attrs', '$parse', '$qupload', '$modal', 'FileService',
  function($localStorage, $rootScope, $scope, $attrs, $parse, $qupload, $modal, FileService) {
    var self = this;

    $scope.$parent.$parent.is_upload = false;
    $rootScope.uploading = false;
    $scope.select_files = [];
    $scope.is_modal = false;
    $scope.upload_precent = 0;
    $scope.file = {
      path: '',
      data: ''
    }

    // 获取uptoken
    this.getUptoken = function(type, key) {
      var result = '';
      if (type == 'file') {
        result = FileService.getFileUptoken({}).$promise;
      } else if (type == 'video') {
        if (!key || key == '') {
          return false;
        }
        result = FileService.getVideoUptoken({key: key}).$promise;
      }
      return result;
    }

    // 上传后回调处理
    this.onUploaded = function (callback) {
      if ('function' == typeof(callback)) {
        callback($scope.file.data);
      } else {
        eval(callback);
      }
    }

    // 开始上传
    this.start = function (index, uptoken, key) {
      $scope.select_files[index].progress = {
        precent: 0
      };
      $scope.select_files[index].upload = $qupload.upload({
        key: key,
        file: $scope.select_files[index].file,
        token: uptoken
      });
      $scope.select_files[index].upload.then(function (response) {
        // 上传成功后，给当前directive中的scope赋值
        if (response.code == 1) {
          // 成功后更改状态
          $scope.$parent.$parent.is_upload = false;
          $rootScope.uploading = false;
          if (!$scope.is_modal) {
            $modal.success({
              title: '操作成功',
              message: '上传成功'
            });
          } else {
            alert('上传成功');
          }
          var res = response.result;
          $scope.file.data = res;
          $scope.file.path = $rootScope.config.fileUrl + res.key;
          if ($scope.$parent.section) {
            $scope.$parent.section.status = 1;
            $scope.video_status = 1;
            $scope.videoStatusCheck();
          };
        } else {
          if ($scope.$parent.section) {
            $scope.$parent.section.status = -1;
            $scope.video_status = -1;
            $scope.videoStatusCheck();
          }
          if (!$scope.is_modal) {
            $modal.error({
              title: '上传失败',
              message: response.message
            });
          } else {
            alert('上传失败');
          }
        }
      }, function (response) {
        console.log(response);
        $rootScope.modal.closeLoading();
        // 如果上传完毕服务器端检测到异常，则更新状态，并去掉loading状态
        if (!$scope.is_modal) {
          $modal.error({
            title: '上传错误',
            message: '上传发生了未知错误，请重试'
          });
        } else {
          alert('上传失败，上传发生了未知错误，请重试');
        }
        if ($scope.$parent.section) {
          $scope.$parent.section.status = -1;
          $scope.video_status = -1;
          $scope.videoStatusCheck();
        }
      }, function (evt) {
        $scope.$parent.$parent.is_upload = true;
        $rootScope.uploading = true;
        $scope.select_files[index].progress.precent = Math.floor(100 * evt.loaded / evt.totalSize);
        $scope.upload_precent = Math.floor(100 * evt.loaded / evt.totalSize);
        if ($scope.upload_precent == 100) {
          $scope.video_text = '正在处理';
        }
      });
    };

    $scope.abort = function (index) {
      $scope.select_files[index].upload.abort();
      $scope.select_files.splice(index, 1);
    };

    $scope.pause = function (index) {
      $scope.select_files[index].upload.abort();
    }

    // 鼠标事件
    $scope.hoverEvent = function (action) {
      var value = $scope.video_status;
      if (action == 'over' && value != 0) {
        $scope.video_text = '重新上传';
      } else {
        $scope.videoStatusCheck();
      }
    }

    // 状态判断事件
    $scope.videoStatusCheck = function () {
      var value = $scope.video_status;
      switch(value)
        {
        case 0:
          $scope.video_text = '上传视频';
          break;
        case 1:
          $scope.video_text = '正在转码';
          break;
        case 2:
          $scope.video_text = '等待审核';
          break;
        case 3:
          $scope.video_text = '发布成功';
          break;
        case -1:
          $scope.video_text = '上传失败';
          break;
        case -2:
          $scope.video_text = '转码失败';
          break;
        case -3:
          $scope.video_text = '审核失败';
          break;
        default:
          $scope.video_text = '重新上传';
        }
    }

    // 状态监听
    $scope.$watch('video_status', function (video_status) {
      $scope.videoStatusCheck();
    })

    // Params:($files,type:'video'/'image'/'other',[, key],[, { max_size: 2, min_width: 80, min_height: 80 ,...}])
    $scope.onFileSelect = function ($files, type, key, default_params, is_modal) {

      $scope.is_modal = is_modal;

      // 上传方法
      var fileUpload = function () {

        // 清空fileHashKey，防止上传死循环
        $localStorage.fileHashKey = '';

        // 判断类型
        var update_type = type == 'video' ? 'video' : 'file';

        // TODO：判断section_id是否存在
        var token = self.getUptoken(update_type, key);

        token.then(function (res) {
          if (res.code == 1) {
            var offsetx = $scope.select_files.length;
            for (var i = 0; i < $files.length; i++) {
              $scope.select_files[i + offsetx] = {
                file: $files[i]
              };
              self.start(i + offsetx, res.result, key);
            }
          } else {
            $modal.error({
              title: '上传错误',
              message: res.message
            });
          }
        })
      };

      // 处理参数
      var params = {};
      if (!!default_params) {
        params = default_params;
      };

      // 如果上传的是图片类型，且没有设置允许最大尺寸，则默认限制为5M
      if (type == 'image' && !params.max_size) {
        params.max_size = 5;
      };

      // 如果点击的是取消按钮，则返回
      if ($files.length == 0) {
        return false;
      };

      // 如果设置了文件大小，判断文件大小是否合乎要求
      if (!!params.max_size) {
        if ($files[0].size > params.max_size * 1048576) {
          if (!is_modal) {
            $modal.error({
              title: '上传错误',
              message: '请上传' + params.max_size + 'M大小以内的文件！'
            });
          } else {
            alert('上传错误');
          }
          
          return false;
        }
      };

      // 判断如果是图片类型
      if (type == 'image') {

        // 判断是否符合图像类型标准
        if(($files[0].type).indexOf('image') >= 0 ) {

          // 如果设置了图片尺寸限制，则会中断，直到判断出尺寸合格才会执行上传
          if (!!params.min_height || !!params.min_width) {

            // 检测是否符合图片设置的尺寸限制
            var reader = new FileReader();
            // 执行读取
            reader.readAsDataURL($files[0]);
            // 加载完成读取
            reader.onload = function (element) {
              // 获取到转换过的地址
              var data = element.target.result;
              // 加载图片获取图片真实宽度和高度
              var image = new Image();
              // 图片加载完获取数据
              image.onload = function(){
                var img_width = image.width;
                var img_height = image.height;

                // 判断尺寸如果不合格
                if (img_height < params.min_height || img_width < params.min_width) {
                  if (!is_modal) {
                    $modal.error({
                      title: '上传错误',
                      message: '图片尺寸最小为' + params.min_width + '×' + params.min_height
                    });
                  } else {
                    alert('上传错误，' + '图片尺寸最小为' + params.min_width + '×' + params.min_height);
                  }
                  return false;
                } else {

                  // 否则，再次调用一次上传方法
                  fileUpload();
                }
              }
              // 缓存判断后赋值
              image.src = data;
            }

            // 先退出，在回调中再执行
            return false;
          }
        } else {
          if (!is_modal) {
            $modal.error({
              title: '上传错误',
              message: '请上传正确格式的图片'
            });
          } else {
            alert('上传错误，' + '请上传正确格式的图片');
          }
          return false;
        }
      }

      // 判断是否是视频类型
      if (type == 'video') {
        // 判断如果没有key则返回
        if (key == '') {
          return false;
        } else {
          // 否则，判断上传的文件是否为合格的视频格式
          if(($files[0].type).indexOf('video') < 0 ) {
            if (!is_modal) {
              $modal.error({
                title: '上传错误',
                message: '请上传正确视频格式的文件'
              });
            } else {
              alert('上传错误，' + '请上传正确视频格式的文件');
            }
            return false;
          }
        }
      };
      fileUpload();
    }
  }
])

// 文件/图片上传
.directive('ngFileSelect', ['$parse', '$timeout',
  function($parse, $timeout){
    return {
      scope: {
        onUploaded: '&uploaded',
        disabled: '=ngDisabled',
      },
      controller: 'FileController',
      restrict: 'EA',
      templateUrl: function(element, attrs) {
        return attrs.templateUrl || 'partials/template/qupload/file.html';
      },
      transclude: true,
      replace: true,
      link: function(scope, element, attrs, ctrls) {
        // 初始化
        var fileSelect = $parse(attrs['ngFileSelect']);
        var defaultFile = angular.isDefined(attrs.defaultFile) ? scope.$parent.$eval(attrs.defaultFile) : '';
        var defaultStatus = angular.isDefined(attrs.defaultStatus) ? scope.$parent.$eval(attrs.defaultStatus) : '';
        scope.video_text = '上传视频';
        scope.video_status = 0;

        // 默认赋值
        if (attrs.defaultStatus) {
          // 监听section状态值变化
          scope.$parent.$watch($parse(attrs.defaultStatus), function(value) {
            scope.video_status = value;
          });
        }

        // 默认赋值
        if (attrs.defaultFile) {
          scope.$parent.$watch($parse(attrs.defaultFile), function(value) {
            if (value) {
              scope.file.path = value;
            }
          });
        }

        // 检测禁用状态的变化
        if (scope.disabled != undefined) {
          scope.$watch('disabled', function() {
            if (!!scope.disabled) {
              element.attr('disabled', true);
              element.addClass('disabled');
              element.parent().addClass('disabled');
            } else {
              element.removeAttr('disabled');
              element.removeClass('disabled');
              element.parent().removeClass('disabled');
            }
          });
        }

        // 检测data的变化，更新回调函数
        scope.$watch('file.data', function() {
          if (attrs.uploaded) {
            scope.$parent.$watch($parse(attrs.uploaded), function(callback) {
              if (callback !== undefined) {
                ctrls.onUploaded(callback);
              }
            });
          }
        });

        // 组装上传表单
        if (element[0].tagName.toLowerCase() !== 'input' || (element.attrs('type') && element.attrs('type').toLowerCase()) !== 'file') {
          var fileElem = angular.element('<input type="file">');
          for (var i = 0; i < element[0].attributes.length; i++) {
            fileElem.attr(element[0].attributes[i].name, element[0].attributes[i].value);
          }
          element.append(fileElem);
          element = fileElem;
        }

        // 上传事件绑定
        element.bind('change', function (evt) {
          var files = [], fileList, i;
          fileList = evt.__files_ || evt.target.files;

          if (fileList !== null) {
            for (i = 0; i < fileList.length; i++) {
              files.push(fileList.item(i));
            }
          }

          $timeout(function () {
            fileSelect(scope, {
              $files: files,
              $event: evt
            });
          });
        });
      }
    };
  }
]);

/*
*
* 监听滚动至底 
*
* Description
* 适用于协议阅读状态监听
*
*/

angular.module('ScrolledDirective', [])

.directive('whenScrolled', function() {
  return function(scope, element, attrs) {
    var raw = element[0];
    // if (raw.scrollHeight <= raw.offsetHeight) eval('scope.' + attrs.whenScrolled);
    element.bind('scroll', function() {
      if (raw.scrollTop + raw.offsetHeight >= raw.scrollHeight) {
        // 滚动到底后自动回调
        scope.$apply(attrs.whenScrolled);
      } 
    }); 
  }; 
})

/**
 * @ngdoc overview
 * @name angular.bootstrap.tabs
 *
 * @description
 * AngularJS version of the tabs directive.
 */

angular.module('TabsDirective', [])

.controller('TabsetController', ['$scope', function ($scope) {
  var ctrl = this,
      tabs = ctrl.tabs = $scope.tabs = [];

  ctrl.select = function(selectedTab) {
    angular.forEach(tabs, function(tab) {
      if (tab.active && tab !== selectedTab) {
        tab.active = false;
        tab.onDeselect();
        selectedTab.selectCalled = false;
      }
    });
    selectedTab.active = true;
    // only call select if it has not already been called
    if (!selectedTab.selectCalled) {
      selectedTab.onSelect();
      selectedTab.selectCalled = true;
    }
  };

  ctrl.addTab = function addTab(tab) {
    tabs.push(tab);
    // we can't run the select function on the first tab
    // since that would select it twice
    if (tabs.length === 1 && tab.active !== false) {
      tab.active = true;
    } else if (tab.active) {
      ctrl.select(tab);
    } else {
      tab.active = false;
    }
  };

  ctrl.removeTab = function removeTab(tab) {
    var index = tabs.indexOf(tab);
    //Select a new tab if the tab to be removed is selected and not destroyed
    if (tab.active && tabs.length > 1 && !destroyed) {
      //If this is the last tab, select the previous tab. else, the next tab.
      var newActiveIndex = index == tabs.length - 1 ? index - 1 : index + 1;
      ctrl.select(tabs[newActiveIndex]);
    }
    tabs.splice(index, 1);
  };

  ctrl.changeTo = function changeTo(tab) {
    var index = tabs.indexOf(tab);
    var newActiveIndex = index;
    ctrl.select(tabs[newActiveIndex]);
  }


  var destroyed;
  $scope.$on('$destroy', function() {
    destroyed = true;
  });
}])

/**
 * @ngdoc directive
 * @name ui.bootstrap.tabs.directive:tabset
 * @restrict EA
 *
 * @description
 * Tabset is the outer container for the tabs directive
 *
 * @param {boolean=} vertical Whether or not to use vertical styling for the tabs.
 * @param {boolean=} justified Whether or not to use justified styling for the tabs.
 *
 * @example
<example module="ui.bootstrap">
  <file name="index.html">
    <tabset>
      <tab heading="Tab 1"><b>First</b> Content!</tab>
      <tab heading="Tab 2"><i>Second</i> Content!</tab>
    </tabset>
    <hr />
    <tabset vertical="true">
      <tab heading="Vertical Tab 1"><b>First</b> Vertical Content!</tab>
      <tab heading="Vertical Tab 2"><i>Second</i> Vertical Content!</tab>
    </tabset>
    <tabset justified="true">
      <tab heading="Justified Tab 1"><b>First</b> Justified Content!</tab>
      <tab heading="Justified Tab 2"><i>Second</i> Justified Content!</tab>
    </tabset>
  </file>
</example>
 */
.directive('tabset', function() {
  return {
    restrict: 'EA',
    transclude: true,
    replace: true,
    scope: {
      type: '@'
    },
    controller: 'TabsetController',
    templateUrl: 'partials/template/tabs/tabset.html',
    link: function(scope, element, attrs) {
      scope.vertical = angular.isDefined(attrs.vertical) ? scope.$parent.$eval(attrs.vertical) : false;
      scope.justified = angular.isDefined(attrs.justified) ? scope.$parent.$eval(attrs.justified) : false;
      scope.largesize = angular.isDefined(attrs.largesize) ? scope.$parent.$eval(attrs.largesize) : false;
    }
  };
})

/**
 * @ngdoc directive
 * @name ui.bootstrap.tabs.directive:tab
 * @restrict EA
 *
 * @param {string=} heading The visible heading, or title, of the tab. Set HTML headings with {@link ui.bootstrap.tabs.directive:tabHeading tabHeading}.
 * @param {string=} select An expression to evaluate when the tab is selected.
 * @param {boolean=} active A binding, telling whether or not this tab is selected.
 * @param {boolean=} disabled A binding, telling whether or not this tab is disabled.
 *
 * @description
 * Creates a tab with a heading and content. Must be placed within a {@link ui.bootstrap.tabs.directive:tabset tabset}.
 *
 * @example
<example module="ui.bootstrap">
  <file name="index.html">
    <div ng-controller="TabsDemoCtrl">
      <button class="btn btn-small" ng-click="items[0].active = true">
        Select item 1, using active binding
      </button>
      <button class="btn btn-small" ng-click="items[1].disabled = !items[1].disabled">
        Enable/disable item 2, using disabled binding
      </button>
      <br />
      <tabset>
        <tab heading="Tab 1">First Tab</tab>
        <tab select="alertMe()">
          <tab-heading><i class="icon-bell"></i> Alert me!</tab-heading>
          Second Tab, with alert callback and html heading!
        </tab>
        <tab ng-repeat="item in items"
          heading="{{item.title}}"
          disabled="item.disabled"
          active="item.active">
          {{item.content}}
        </tab>
      </tabset>
    </div>
  </file>
  <file name="script.js">
    function TabsDemoCtrl($scope) {
      $scope.items = [
        { title:"Dynamic Title 1", content:"Dynamic Item 0" },
        { title:"Dynamic Title 2", content:"Dynamic Item 1", disabled: true }
      ];

      $scope.alertMe = function() {
        setTimeout(function() {
          alert("You've selected the alert tab!");
        });
      };
    };
  </file>
</example>
 */

/**
 * @ngdoc directive
 * @name ui.bootstrap.tabs.directive:tabHeading
 * @restrict EA
 *
 * @description
 * Creates an HTML heading for a {@link ui.bootstrap.tabs.directive:tab tab}. Must be placed as a child of a tab element.
 *
 * @example
<example module="ui.bootstrap">
  <file name="index.html">
    <tabset>
      <tab>
        <tab-heading><b>HTML</b> in my titles?!</tab-heading>
        And some content, too!
      </tab>
      <tab>
        <tab-heading><i class="icon-heart"></i> Icon heading?!?</tab-heading>
        That's right.
      </tab>
    </tabset>
  </file>
</example>
 */
.directive('tab', ['$parse', function($parse) {
  return {
    require: '^tabset',
    restrict: 'EA',
    replace: true,
    templateUrl: 'partials/template/tabs/tab.html',
    transclude: true,
    scope: {
      active: '=?',
      heading: '@',
      icon: '@',
      onSelect: '&select', //This callback is called in contentHeadingTransclude
                          //once it inserts the tab's content into the dom
      onDeselect: '&deselect',
      changeTo: '&change'
    },
    controller: function() {
      //Empty controller so other directives can require being 'under' a tab
    },
    link: function(scope, elm, attrs, tabsetCtrl, transclude) {
      scope.$watch('active', function(active) {
        if (active) {
          tabsetCtrl.select(scope);
        }
      });

      scope.disabled = false;
      if (attrs.disable) {
        scope.$parent.$watch($parse(attrs.disable), function(value) {
          scope.disabled = !! value;
        });
      }

      scope.select = function() {
        if (!scope.disabled) {
          scope.active = true;
        }
      };

      tabsetCtrl.addTab(scope);
      scope.$on('$destroy', function() {
        tabsetCtrl.removeTab(scope);
      });

      //We need to transclude later, once the content container is ready.
      //when this link happens, we're inside a tab heading.
      scope.$transcludeFn = transclude;
    }
  };
}])

.directive('tabHeadingTransclude', function() {
  return {
    restrict: 'A',
    require: '^tab',
    link: function(scope, elm, attrs, tabCtrl) {
      scope.$watch('headingElement', function updateHeadingElement(heading) {
        if (heading) {
          elm.html('');
          elm.append(heading);
        }
      });
    }
  };
})

.directive('tabContentTransclude', function() {
  return {
    restrict: 'A',
    require: '^tabset',
    link: function(scope, elm, attrs) {
      var tab = scope.$eval(attrs.tabContentTransclude);

      //Now our tab is ready to be transcluded: both the tab heading area
      //and the tab content area are loaded.  Transclude 'em both.
      tab.$transcludeFn(tab.$parent, function(contents) {
        angular.forEach(contents, function(node) {
          if (isTabHeading(node)) {
            //Let tabHeadingTransclude know.
            tab.headingElement = node;
          } else {
            elm.append(node);
          }
        });
      });
    }
  };

  function isTabHeading(node) {
    return node.tagName && (
      node.hasAttribute('tab-heading') ||
      node.hasAttribute('data-tab-heading') ||
      node.hasAttribute('x-tab-heading') ||
      node.tagName.toLowerCase() === 'tab-heading' ||
      node.tagName.toLowerCase() === 'data-tab-heading' ||
      node.tagName.toLowerCase() === 'x-tab-heading'
    );
  }
});

/**
* angular.tooltip
* Author: Surmon
* site: //surmon.me
* Description:  
  可指定四个参数：(最少需要两个参数: tooltip && title内容 否则不显示)
  tooltip：[空/normal - 默认hover触发事件, focus - 支持input/dom, event - 事件触发在js中给绑定数据tooltit赋予提示内容即可]
  title: String字符串
  tooltit: Model绑定（在tooltip触发方式为event时，必须配合此属性以激活）
  toolpos : String字符串/left/right/center
*
*/
angular.module('TooltipDirective', [])
// 全局tooltip
.directive('tooltip', function($window) {
  return {
    restrict: 'A',
    scope: {
      toolpos: '@',
      tooltip: '@',
      title:   '@',
      tooltit: '='
    },
    link: function($scope, $element, $attrs) {

      // 初始化构造方法
      var tooltip = function () {

        // 绑定父对象
        var self = this;

        // 判断触发方式
        this.tigger = $scope.tooltip || 'normal';

        // 判断触发位置
        this.position = $scope.toolpos || 'center';

        // 提示内容
        this.title = $scope.tooltit || $scope.title || '';

        // 显示状态
        this.display = false;

        // 显示方法
        this.visible = function (option) {

          // 显示前更新
          self.title = $scope.tooltit || $scope.title || '';

          // 如果为空则不显示
          if (!self.title) {
            return false;
          }

          // 显示前如果存在工具，则删除此工具
          if (document.getElementById('J_tooltip')) {
            angular.element(document.getElementById('J_tooltip')).remove();
          }

          // 给当前文档以高亮显示
          $element.addClass('tooltip-active');

          // 定义工具模板
          var tooltip_template = '<div id="J_tooltip" class="tooltip tooltip-hidden">';
          tooltip_template += '<div class="tooltip-inner">';
          tooltip_template += '<span class="tooltip-text">' + self.title + '</span>';
          tooltip_template += '<span class="tooltip-sulg"></span>';
          tooltip_template += '</div></div>';

          // 向文档树添加内容
          angular.element(document.body).append(tooltip_template);
          var tool_element = angular.element(document.getElementById('J_tooltip'));
          var tool_position = function () {
            switch(self.position){
              case 'center':
                return $element[0].getBoundingClientRect().left + $element[0].offsetWidth / 2 - document.getElementById('J_tooltip').offsetWidth / 2 + 'px';
                break;
              case 'left':
                return $element[0].getBoundingClientRect().left - document.getElementById('J_tooltip').offsetWidth / 2 + 'px';
                break;
              case 'right':
                return $element[0].getBoundingClientRect().left + $element[0].offsetWidth - document.getElementById('J_tooltip').offsetWidth / 2 + 'px';
                break;
              default:
                return $element[0].getBoundingClientRect().left + $element[0].offsetWidth / 2 - document.getElementById('J_tooltip').offsetWidth / 2 + 'px';
            }
          }

          // 定位位置
          tool_element.css('left', tool_position());
          tool_element.css('top', $element[0].getBoundingClientRect().top - 40 + 'px');
          tool_element.removeClass('tooltip-hidden');
          tool_element.addClass('tooltip-display');
          self.display = true;

          // 如果设置了自动隐藏，则1秒后赋予不可见属性，随后删除
          if (!!option && option.autohide) {
            setTimeout(function () {
              $element.removeClass('tooltip-active');
              tool_element.removeClass('tooltip-display');
              tool_element.addClass('tooltip-hidden');
              $scope.tooltit = '';
            }, 600)
          }

          // 元素显示时需要绑定窗口滚动监听
          self.scroll();
          self.resize();
        }

        // 隐藏方法
        this.hidden = function () {
          $element.removeClass('tooltip-active');
          var tool_element = angular.element(document.getElementById('J_tooltip'));
          tool_element.removeClass('tooltip-display');
          tool_element.addClass('tooltip-hidden');
          setTimeout(function () {
            tool_element.remove();
          }, 500);
          self.display = false;
        }

        // hover方法
        this.hover = function () {

          // 存储属性值
          var title = $attrs.title;

          // 绑定鼠标移入事件
          $element.bind('mouseover', function() {
            if( $attrs.title == undefined || $attrs.title == '') return;
            $element.attr('title', '');
            self.visible();
          });

          // 鼠标移除事件
          $element.bind('mouseout', function() {
            $element.attr('title', title);
            self.hidden();
          });
        }

        // focus方法
        this.focus = function () {

          // 如果是input控件则绑定focus事件
          if ($element[0].tagName.toUpperCase() == 'INPUT') {

            $element.bind('focus', function () {
              self.visible();
            })
            $element.bind('blur', function () {
              self.hidden();
            })

          // 否则绑定click事件
          } else {
            $element.bind('click', function () {
              // 如果在显示则隐藏，否则反之
              if (self.display) {
                self.hidden();
              } else {
                self.visible();
              }
            })
            $element.bind('blur', function () {
              self.hidden();
            })
          }
        }

        // 监听方法
        this.event = function () {
          $scope.$watch('tooltit', function () {
            self.title = $scope.tooltit;
            self.visible({'autohide': true});
          });
        }

        // 类型绑定事件
        this.bind = function () {
          // 根据用户设置的事件触发方式来绑定不同事件
          switch (self.tigger) {
            case 'normal':
                    self.hover();
                    break;
            case 'focus':
                    self.focus();
                    break;
            case 'event':
                    self.event();
                    break;
                  default: 
                    break;
          }
        }

        // 滚动监听事件
        this.scroll = function () {
          // 绑定winodw滑动监听
          angular.element($window).bind('scroll', function() {
            // 如果在显示，则实时改变他的顶部高度
            if (angular.element(document.getElementById('J_tooltip'))) {
              self.hidden();
            }
          })
        }

        // 窗口监听事件
        this.resize = function () {
          angular.element($window).bind('resize', function() {
            // 如果在显示，暂时没什么要做的
          })
        }
      }

      // 实例化执行
      var _tooltip = new tooltip();
      _tooltip.bind(); 

    }
  }
});
/*
*
* 返回顶部模块 
*
* Description
*
*/

angular.module('TotopDirective', [])

// 返回顶部
.directive('goToTop', function($window) { 
  return {
    replace: true,
    restrict: 'A',
    template: '<a href="" class="go-to-top"><i class="icon icon-to-top"></i></a>',
    link: function (scope, element, attrs) {

      var window_height = $window.innerHeight;

      // 监听window窗口变化
      angular.element($window).bind('resize', function() {
        window_height = $window.innerHeight;
      })

      // 初次初始化
      if ($window.pageYOffset <= (window_height / 2)) {
        element.removeClass('display');
        element.addClass('none');
        element.prev().addClass('is-top');
      }

      // 绑定winodw滑动监听
      angular.element($window).bind('scroll', function() {
        if ($window.pageYOffset <= (window_height / 2)) {
          element.removeClass('display');
          element.addClass('none');
          element.prev().addClass('is-top');
        } else {
          element.removeClass('none');
          element.addClass('display');
          element.prev().removeClass('is-top');
        }
      })

      // 绑定回顶部事件
      element.bind('click', function () {
        var scrollTo = function (element, to, duration) {
        if (duration <= 0) return;
        var difference = to - element.scrollTop;
        var perTick = difference / duration * 10;
        setTimeout(function() {
          element.scrollTop = element.scrollTop + perTick;
          if (element.scrollTop == to) return;
          scrollTo(element, to, duration - 10);
        }, 10);
      };
      scrollTo(document.body, 0, 300);
      })

    }
  }
})
angular.module('ui.bootstrap.position', [])

/**
 * A set of utility methods that can be use to retrieve position of DOM elements.
 * It is meant to be used where we need to absolute-position DOM elements in
 * relation to other, existing elements (this is the case for tooltips, popovers,
 * typeahead suggestions etc.).
 */
.factory('$position', ['$document', '$window', function($document, $window) {
  function getStyle(el, cssprop) {
    if (el.currentStyle) { //IE
      return el.currentStyle[cssprop];
    } else if ($window.getComputedStyle) {
      return $window.getComputedStyle(el)[cssprop];
    }
    // finally try and get inline style
    return el.style[cssprop];
  }

  /**
   * Checks if a given element is statically positioned
   * @param element - raw DOM element
   */
  function isStaticPositioned(element) {
    return (getStyle(element, 'position') || 'static' ) === 'static';
  }

  /**
   * returns the closest, non-statically positioned parentOffset of a given element
   * @param element
   */
  var parentOffsetEl = function(element) {
    var docDomEl = $document[0];
    var offsetParent = element.offsetParent || docDomEl;
    while (offsetParent && offsetParent !== docDomEl && isStaticPositioned(offsetParent) ) {
      offsetParent = offsetParent.offsetParent;
    }
    return offsetParent || docDomEl;
  };

  return {
    /**
     * Provides read-only equivalent of jQuery's position function:
     * http://api.jquery.com/position/
     */
    position: function(element) {
      var elBCR = this.offset(element);
      var offsetParentBCR = { top: 0, left: 0 };
      var offsetParentEl = parentOffsetEl(element[0]);
      if (offsetParentEl != $document[0]) {
        offsetParentBCR = this.offset(angular.element(offsetParentEl));
        offsetParentBCR.top += offsetParentEl.clientTop - offsetParentEl.scrollTop;
        offsetParentBCR.left += offsetParentEl.clientLeft - offsetParentEl.scrollLeft;
      }

      var boundingClientRect = element[0].getBoundingClientRect();
      return {
        width: boundingClientRect.width || element.prop('offsetWidth'),
        height: boundingClientRect.height || element.prop('offsetHeight'),
        top: elBCR.top - offsetParentBCR.top,
        left: elBCR.left - offsetParentBCR.left
      };
    },

    /**
     * Provides read-only equivalent of jQuery's offset function:
     * http://api.jquery.com/offset/
     */
    offset: function(element) {
      var boundingClientRect = element[0].getBoundingClientRect();
      return {
        width: boundingClientRect.width || element.prop('offsetWidth'),
        height: boundingClientRect.height || element.prop('offsetHeight'),
        top: boundingClientRect.top + ($window.pageYOffset || $document[0].documentElement.scrollTop),
        left: boundingClientRect.left + ($window.pageXOffset || $document[0].documentElement.scrollLeft)
      };
    },

    /**
     * Provides coordinates for the targetEl in relation to hostEl
     */
    positionElements: function(hostEl, targetEl, positionStr, appendToBody) {
      var positionStrParts = positionStr.split('-');
      var pos0 = positionStrParts[0], pos1 = positionStrParts[1] || 'center';

      var hostElPos,
        targetElWidth,
        targetElHeight,
        targetElPos;

      hostElPos = appendToBody ? this.offset(hostEl) : this.position(hostEl);

      targetElWidth = targetEl.prop('offsetWidth');
      targetElHeight = targetEl.prop('offsetHeight');

      var shiftWidth = {
        center: function() {
          return hostElPos.left + hostElPos.width / 2 - targetElWidth / 2;
        },
        left: function() {
          return hostElPos.left;
        },
        right: function() {
          return hostElPos.left + hostElPos.width;
        }
      };

      var shiftHeight = {
        center: function() {
          return hostElPos.top + hostElPos.height / 2 - targetElHeight / 2;
        },
        top: function() {
          return hostElPos.top;
        },
        bottom: function() {
          return hostElPos.top + hostElPos.height;
        }
      };

      switch (pos0) {
        case 'right':
          targetElPos = {
            top: shiftHeight[pos1](),
            left: shiftWidth[pos0]()
          };
          break;
        case 'left':
          targetElPos = {
            top: shiftHeight[pos1](),
            left: hostElPos.left - targetElWidth
          };
          break;
        case 'bottom':
          targetElPos = {
            top: shiftHeight[pos0](),
            left: shiftWidth[pos1]()
          };
          break;
        default:
          targetElPos = {
            top: hostElPos.top - targetElHeight,
            left: shiftWidth[pos1]()
          };
          break;
      }

      return targetElPos;
    }
  };
}]);



angular.module('TypeaheadDirective', ['ui.bootstrap.position'])

/**
 * A helper service that can parse typeahead's syntax (string provided by users)
 * Extracted to a separate service for ease of unit testing
 */

.factory('typeaheadParser', ['$parse', function($parse) {

  // 00000111000000000000022200000000000000003333333333333330000000000044000
  var TYPEAHEAD_REGEXP = /^\s*([\s\S]+?)(?:\s+as\s+([\s\S]+?))?\s+for\s+(?:([\$\w][\$\w\d]*))\s+in\s+([\s\S]+?)$/;

  return {
    parse: function(input) {
      var match = input.match(TYPEAHEAD_REGEXP);
      if (!match) {
        throw new Error(
          'Expected typeahead specification in form of "_modelValue_ (as _label_)? for _item_ in _collection_"' +
            ' but got "' + input + '".');
      }

      return {
        itemName:match[3],
        source:$parse(match[4]),
        viewMapper:$parse(match[2] || match[1]),
        modelMapper:$parse(match[1])
      };
    }
  };
}])

.directive('typeahead', ['$compile', '$parse', '$q', '$timeout', '$document', '$window', '$rootScope', '$position', 'typeaheadParser',
  function($compile, $parse, $q, $timeout, $document, $window, $rootScope, $position, typeaheadParser) {
  var HOT_KEYS = [9, 13, 27, 38, 40];
  var eventDebounceTime = 200;

  return {
    require: ['ngModel', '^?ngModelOptions'],
    link: function(originalScope, element, attrs, ctrls) {
      var modelCtrl = ctrls[0];
      var ngModelOptions = ctrls[1];
      //SUPPORTED ATTRIBUTES (OPTIONS)

      //minimal no of characters that needs to be entered before typeahead kicks-in
      var minLength = originalScope.$eval(attrs.typeaheadMinLength);
      if (!minLength && minLength !== 0) {
        minLength = 1;
      }

      //minimal wait time after last character typed before typeahead kicks-in
      var waitTime = originalScope.$eval(attrs.typeaheadWaitMs) || 0;

      //should it restrict model values to the ones selected from the popup only?
      var isEditable = originalScope.$eval(attrs.typeaheadEditable) !== false;

      //binding to a variable that indicates if matches are being retrieved asynchronously
      var isLoadingSetter = $parse(attrs.typeaheadLoading).assign || angular.noop;

      //a callback executed when a match is selected
      var onSelectCallback = $parse(attrs.typeaheadOnSelect);

      //should it select highlighted popup value when losing focus?
      var isSelectOnBlur = angular.isDefined(attrs.typeaheadSelectOnBlur) ? originalScope.$eval(attrs.typeaheadSelectOnBlur) : false;

      //binding to a variable that indicates if there were no results after the query is completed
      var isNoResultsSetter = $parse(attrs.typeaheadNoResults).assign || angular.noop;

      var inputFormatter = attrs.typeaheadInputFormatter ? $parse(attrs.typeaheadInputFormatter) : undefined;

      var appendToBody =  attrs.typeaheadAppendToBody ? originalScope.$eval(attrs.typeaheadAppendToBody) : false;

      var focusFirst = originalScope.$eval(attrs.typeaheadFocusFirst) !== false;

      //If input matches an item of the list exactly, select it automatically
      var selectOnExact = attrs.typeaheadSelectOnExact ? originalScope.$eval(attrs.typeaheadSelectOnExact) : false;

      //INTERNAL VARIABLES

      //model setter executed upon match selection
      var parsedModel = $parse(attrs.ngModel);
      var invokeModelSetter = $parse(attrs.ngModel + '($$$p)');
      var $setModelValue = function(scope, newValue) {
        if (angular.isFunction(parsedModel(originalScope)) &&
          ngModelOptions && ngModelOptions.$options && ngModelOptions.$options.getterSetter) {
          return invokeModelSetter(scope, {$$$p: newValue});
        } else {
          return parsedModel.assign(scope, newValue);
        }
      };

      //expressions used by typeahead
      var parserResult = typeaheadParser.parse(attrs.typeahead);

      var hasFocus;

      //Used to avoid bug in iOS webview where iOS keyboard does not fire
      //mousedown & mouseup events
      //Issue #3699
      var selected;

      //create a child scope for the typeahead directive so we are not polluting original scope
      //with typeahead-specific data (matches, query etc.)
      var scope = originalScope.$new();
      var offDestroy = originalScope.$on('$destroy', function() {
		    scope.$destroy();
      });
      scope.$on('$destroy', offDestroy);

      // WAI-ARIA
      var popupId = 'typeahead-' + scope.$id + '-' + Math.floor(Math.random() * 10000);
      element.attr({
        'aria-autocomplete': 'list',
        'aria-expanded': false,
        'aria-owns': popupId
      });

      //pop-up element used to display matches
      var popUpEl = angular.element('<div typeahead-popup></div>');
      popUpEl.attr({
        id: popupId,
        matches: 'matches',
        active: 'activeIdx',
        select: 'select(activeIdx)',
        'move-in-progress': 'moveInProgress',
        query: 'query',
        position: 'position'
      });
      //custom item template
      if (angular.isDefined(attrs.typeaheadTemplateUrl)) {
        popUpEl.attr('template-url', attrs.typeaheadTemplateUrl);
      }

      if (angular.isDefined(attrs.typeaheadPopupTemplateUrl)) {
        popUpEl.attr('popup-template-url', attrs.typeaheadPopupTemplateUrl);
      }

      var resetMatches = function() {
        scope.matches = [];
        scope.activeIdx = -1;
        element.attr('aria-expanded', false);
      };

      var getMatchId = function(index) {
        return popupId + '-option-' + index;
      };

      // Indicate that the specified match is the active (pre-selected) item in the list owned by this typeahead.
      // This attribute is added or removed automatically when the `activeIdx` changes.
      scope.$watch('activeIdx', function(index) {
        if (index < 0) {
          element.removeAttr('aria-activedescendant');
        } else {
          element.attr('aria-activedescendant', getMatchId(index));
        }
      });

      var inputIsExactMatch = function(inputValue, index) {
        if (scope.matches.length > index && inputValue) {
          return inputValue.toUpperCase() === scope.matches[index].label.toUpperCase();
        }

        return false;
      };

      var getMatchesAsync = function(inputValue) {
        var locals = {$viewValue: inputValue};
        isLoadingSetter(originalScope, true);
        isNoResultsSetter(originalScope, false);
        $q.when(parserResult.source(originalScope, locals)).then(function(matches) {
          //it might happen that several async queries were in progress if a user were typing fast
          //but we are interested only in responses that correspond to the current view value
          var onCurrentRequest = (inputValue === modelCtrl.$viewValue);
          if (onCurrentRequest && hasFocus) {
            if (matches && matches.length > 0) {

              scope.activeIdx = focusFirst ? 0 : -1;
              isNoResultsSetter(originalScope, false);
              scope.matches.length = 0;

              //transform labels
              for (var i = 0; i < matches.length; i++) {
                locals[parserResult.itemName] = matches[i];
                scope.matches.push({
                  id: getMatchId(i),
                  label: parserResult.viewMapper(scope, locals),
                  model: matches[i]
                });
              }

              scope.query = inputValue;
              //position pop-up with matches - we need to re-calculate its position each time we are opening a window
              //with matches as a pop-up might be absolute-positioned and position of an input might have changed on a page
              //due to other elements being rendered
              recalculatePosition();

              element.attr('aria-expanded', true);

              //Select the single remaining option if user input matches
              if (selectOnExact && scope.matches.length === 1 && inputIsExactMatch(inputValue, 0)) {
                scope.select(0);
              }
            } else {
              resetMatches();
              isNoResultsSetter(originalScope, true);
            }
          }
          if (onCurrentRequest) {
            isLoadingSetter(originalScope, false);
          }
        }, function() {
          resetMatches();
          isLoadingSetter(originalScope, false);
          isNoResultsSetter(originalScope, true);
        });
      };

      // bind events only if appendToBody params exist - performance feature
      if (appendToBody) {
        angular.element($window).bind('resize', fireRecalculating);
        $document.find('body').bind('scroll', fireRecalculating);
      }

      // Declare the timeout promise var outside the function scope so that stacked calls can be cancelled later
      var timeoutEventPromise;

      // Default progress type
      scope.moveInProgress = false;

      function fireRecalculating() {
        if (!scope.moveInProgress) {
          scope.moveInProgress = true;
          scope.$digest();
        }

        // Cancel previous timeout
        if (timeoutEventPromise) {
          $timeout.cancel(timeoutEventPromise);
        }

        // Debounced executing recalculate after events fired
        timeoutEventPromise = $timeout(function() {
          // if popup is visible
          if (scope.matches.length) {
            recalculatePosition();
          }

          scope.moveInProgress = false;
          scope.$digest();
        }, eventDebounceTime);
      }

      // recalculate actual position and set new values to scope
      // after digest loop is popup in right position
      function recalculatePosition() {
        scope.position = appendToBody ? $position.offset(element) : $position.position(element);
        scope.position.top += element.prop('offsetHeight');
      }

      resetMatches();

      //we need to propagate user's query so we can higlight matches
      scope.query = undefined;

      //Declare the timeout promise var outside the function scope so that stacked calls can be cancelled later
      var timeoutPromise;

      var scheduleSearchWithTimeout = function(inputValue) {
        timeoutPromise = $timeout(function() {
          getMatchesAsync(inputValue);
        }, waitTime);
      };

      var cancelPreviousTimeout = function() {
        if (timeoutPromise) {
          $timeout.cancel(timeoutPromise);
        }
      };

      //plug into $parsers pipeline to open a typeahead on view changes initiated from DOM
      //$parsers kick-in on all the changes coming from the view as well as manually triggered by $setViewValue
      modelCtrl.$parsers.unshift(function(inputValue) {
        hasFocus = true;

        if (minLength === 0 || inputValue && inputValue.length >= minLength) {
          if (waitTime > 0) {
            cancelPreviousTimeout();
            scheduleSearchWithTimeout(inputValue);
          } else {
            getMatchesAsync(inputValue);
          }
        } else {
          isLoadingSetter(originalScope, false);
          cancelPreviousTimeout();
          resetMatches();
        }

        if (isEditable) {
          return inputValue;
        } else {
          if (!inputValue) {
            // Reset in case user had typed something previously.
            modelCtrl.$setValidity('editable', true);
            return null;
          } else {
            modelCtrl.$setValidity('editable', false);
            return undefined;
          }
        }
      });

      modelCtrl.$formatters.push(function(modelValue) {
        var candidateViewValue, emptyViewValue;
        var locals = {};

        // The validity may be set to false via $parsers (see above) if
        // the model is restricted to selected values. If the model
        // is set manually it is considered to be valid.
        if (!isEditable) {
          modelCtrl.$setValidity('editable', true);
        }

        if (inputFormatter) {
          locals.$model = modelValue;
          return inputFormatter(originalScope, locals);
        } else {
          //it might happen that we don't have enough info to properly render input value
          //we need to check for this situation and simply return model value if we can't apply custom formatting
          locals[parserResult.itemName] = modelValue;
          candidateViewValue = parserResult.viewMapper(originalScope, locals);
          locals[parserResult.itemName] = undefined;
          emptyViewValue = parserResult.viewMapper(originalScope, locals);

          return candidateViewValue!== emptyViewValue ? candidateViewValue : modelValue;
        }
      });

      scope.select = function(activeIdx) {
        //called from within the $digest() cycle
        var locals = {};
        var model, item;

        selected = true;
        locals[parserResult.itemName] = item = scope.matches[activeIdx].model;
        model = parserResult.modelMapper(originalScope, locals);
        $setModelValue(originalScope, model);
        modelCtrl.$setValidity('editable', true);
        modelCtrl.$setValidity('parse', true);

        onSelectCallback(originalScope, {
          $item: item,
          $model: model,
          $label: parserResult.viewMapper(originalScope, locals)
        });

        resetMatches();

        //return focus to the input element if a match was selected via a mouse click event
        // use timeout to avoid $rootScope:inprog error
        if (scope.$eval(attrs.typeaheadFocusOnSelect) !== false) {
          $timeout(function() { element[0].focus(); }, 0, false);
        }
      };

      //bind keyboard events: arrows up(38) / down(40), enter(13) and tab(9), esc(27)
      element.bind('keydown', function(evt) {
        //typeahead is open and an "interesting" key was pressed
        if (scope.matches.length === 0 || HOT_KEYS.indexOf(evt.which) === -1) {
          return;
        }

        // if there's nothing selected (i.e. focusFirst) and enter or tab is hit, clear the results
        if (scope.activeIdx === -1 && (evt.which === 9 || evt.which === 13)) {
          resetMatches();
          scope.$digest();
          return;
        }

        evt.preventDefault();

        if (evt.which === 40) {
          scope.activeIdx = (scope.activeIdx + 1) % scope.matches.length;
          scope.$digest();

        } else if (evt.which === 38) {
          scope.activeIdx = (scope.activeIdx > 0 ? scope.activeIdx : scope.matches.length) - 1;
          scope.$digest();

        } else if (evt.which === 13 || evt.which === 9) {
          scope.$apply(function () {
            scope.select(scope.activeIdx);
          });

        } else if (evt.which === 27) {
          evt.stopPropagation();

          resetMatches();
          scope.$digest();
        }
      });

      element.bind('blur', function() {
        if (isSelectOnBlur && scope.matches.length && scope.activeIdx !== -1 && !selected) {
          selected = true;
          scope.$apply(function() {
            scope.select(scope.activeIdx);
          });
        }
        hasFocus = false;
        selected = false;
      });

      // Keep reference to click handler to unbind it.
      var dismissClickHandler = function(evt) {
        // Issue #3973
        // Firefox treats right click as a click on document
        if (element[0] !== evt.target && evt.which !== 3 && scope.matches.length !== 0) {
          resetMatches();
          if (!$rootScope.$$phase) {
            scope.$digest();
          }
        }
      };

      $document.bind('click', dismissClickHandler);

      originalScope.$on('$destroy', function() {
        $document.unbind('click', dismissClickHandler);
        if (appendToBody) {
          $popup.remove();
        }
        // Prevent jQuery cache memory leak
        popUpEl.remove();
      });

      var $popup = $compile(popUpEl)(scope);

      if (appendToBody) {
        $document.find('body').append($popup);
      } else {
        element.after($popup);
      }
    }
  };
}])

.directive('typeaheadPopup', function() {
  return {
    restrict: 'EA',
    scope: {
      matches: '=',
      query: '=',
      active: '=',
      position: '&',
      moveInProgress: '=',
      select: '&'
    },
    replace: true,
    templateUrl: function(element, attrs) {
      return attrs.popupTemplateUrl || 'partials/template/typeahead/popup.html';
    },
    link: function(scope, element, attrs) {
      scope.templateUrl = attrs.templateUrl;

      scope.isOpen = function() {
        return scope.matches.length > 0;
      };

      scope.isActive = function(matchIdx) {
        return scope.active == matchIdx;
      };

      scope.selectActive = function(matchIdx) {
        scope.active = matchIdx;
      };

      scope.selectMatch = function(activeIdx) {
        scope.select({activeIdx:activeIdx});
      };
    }
  };
})

.directive('typeaheadMatch', ['$templateRequest', '$compile', '$parse', function($templateRequest, $compile, $parse) {
  return {
    restrict: 'EA',
    scope: {
      index: '=',
      match: '=',
      query: '='
    },
    link:function(scope, element, attrs) {
      var tplUrl = $parse(attrs.templateUrl)(scope.$parent) || 'partials/template/typeahead/match.html';
      $templateRequest(tplUrl).then(function(tplContent) {
        $compile(tplContent.trim())(scope, function(clonedElement) {
          element.replaceWith(clonedElement);
        });
      });
    }
  };
}])

.filter('typeaheadHighlight', ['$sce', '$injector', '$log', function($sce, $injector, $log) {
  var isSanitizePresent;
  isSanitizePresent = $injector.has('$sanitize');

  function escapeRegexp(queryToEscape) {
    // Regex: capture the whole query string and replace it with the string that will be used to match
    // the results, for example if the capture is "a" the result will be \a
    return queryToEscape.replace(/([.?*+^$[\]\\(){}|-])/g, '\\$1');
  }

  function containsHtml(matchItem) {
    return /<.*>/g.test(matchItem);
  }

  return function(matchItem, query) {
    if (!isSanitizePresent && containsHtml(matchItem)) {
      $log.warn('Unsafe use of typeahead please use ngSanitize'); // Warn the user about the danger
    }
    matchItem = query? ('' + matchItem).replace(new RegExp(escapeRegexp(query), 'gi'), '<strong>$&</strong>') : matchItem; // Replaces the capture string with a the same string inside of a "strong" tag
    if (!isSanitizePresent) {
      matchItem = $sce.trustAsHtml(matchItem); // If $sanitize is not present we pack the string in a $sce object for the ng-bind-html directive
    }
    return matchItem;
  };
}]);

/**
* Umeditor Module
*
* Description
*/
angular.module('Umeditor', [])

.directive('umeditor', ['$timeout', function ($timeout) {
  // Runs during compile
  return {
    restrict: 'EA',
    require:'ngModel',
    scope:{},
    link: function(scope, element, attrs, controller) {
      var editor_id = attrs.id ? attrs.id : "_editor" + (Date.now());
      element[0].id = editor_id;
      var umeditor = UM.getEditor(editor_id);

      if (controller) {
        umeditor.addListener('contentChange',function(){
          $timeout(function (argument) {
            scope.$apply(function(){
              controller.$setViewValue(umeditor.getContent());
            });
          }, 0);
        });

        controller.$render = function(){
          $timeout(function () {
            if (controller.$viewValue != undefined) {
              umeditor.setContent(controller.$viewValue);
            }            
          }, 100);
        }
      }
    }
  };
}]);
/**
* MainController Module
*
* Description
*/
angular.module('MainController', ['angular.modal', 'LinkModel', 'IndexModel', 'CategoryModel', 'TotopDirective', 'FeedbackModel'])
.controller('MainController', ['$rootScope', '$scope', '$stateParams', '$state', '$location', '$localStorage', '$anchorScroll', '$modal', '$window', '$timeout', 'appConfig', 'CommonProvider', 'AuthProvider', 'LinkModel', 'IndexModel', 'CategoryModel', 'CommonModel', 'FeedbackModel',
  function ($rootScope, $scope, $stateParams, $state, $location, $localStorage, $anchorScroll, $modal, $window, $timeout, appConfig, CommonProvider, AuthProvider, LinkModel, IndexModel, CategoryModel, CommonModel, FeedbackModel) {

    // 初始化
    $rootScope.config = appConfig;
    $scope.parseInt = parseInt;

    // 全局导航栏默认显示
    $rootScope.navBarHide = false;

    // 路由发生变化时，title更新
    $scope.$on('$stateChangeSuccess', function() {
      $rootScope.title = $state.current.data.title || $state.$current.parent.data.title || '';
    });

    // 全局模态弹窗模块
    $rootScope.modal = {

      // 登录
      login: function (callback) {
        $modal.custom({
          title: '登录/注册',
          template_url: '/partials/home/layout/login.html',
          callback: callback
        });
      },

      // 图片预览
      imagePreview: function (url) {
        var img_url;
        if (url.indexOf('http') >= 0) {
          img_url = url;
        } else {
          img_url = $rootScope.config.fileUrl + url;
        }
        $modal.image({
          url: img_url
        });
      },

      // 弹窗确认
      submit: function() {
        $modal.confirmSubmit();
      },

      // 弹窗取消
      cancel: function() {
        $modal.confirmCancel();
      },

      // 加载动画
      loading: function () {
        $modal.loading();
      },

      // 关闭加载动画
      closeLoading: function () {
        $modal.closeLoading();
      },

      // 关闭弹窗
      close: function() {
        $modal.closeCallback();
      },

      // 错误弹窗
      error: function (config) {
        $modal.error({
          message: config.message || 'error',
          info: config.info || ''
        });
      },

      // 反馈信息
      feedback: function () {
        $modal.custom({
          title: '反馈信息',
          template_url: '/partials/home/layout/feedback.html'
        });
      },
    };

    // 定义需要排除Loading动画的url关键字
    var exclude_api = ['partner', 'index', 'category', 'advertise', 'link', 'search/hot', 'follow', 'record'];

    // 监听加载状态
    $rootScope.$on('cfpLoadingBar:loading', function(event, data) {
      if (exclude_api.containStr(data.url)) $rootScope.modal.loading();
      if (!exclude_api.containStr(data.url)) $rootScope.modal.closeLoading();
    });

    // 监听加载完成状态
    $rootScope.$on('cfpLoadingBar:completed', function(event, data) {
      $rootScope.modal.closeLoading();
    });

    // 反馈信息
    $rootScope.postFeedback = function (feedback) {
      if (!feedback.content) return false;
      CommonProvider.promise({
        model: FeedbackModel,
        method: 'add',
        params: feedback,
        success: function(feedback){
          $rootScope.modal.close();
          $modal.success({ title: '反馈成功', message: '反馈成功，感谢你的支持' });
        },
        error: function (feedback) {
          $modal.error({ title: '反馈失败', message: feedback.message });
        }
      });
    };

    // 退出
    $scope.logout = AuthProvider.logout;

    // 锚点定位(传入元素ID)
    $rootScope.goTo = CommonProvider.goToDom;

    // 获取图片
    $rootScope.getThumbnail = CommonProvider.getThumbnail;

    // 第三方分享
    $rootScope.share = CommonProvider.share;

    // 返回顶部
    $rootScope.toTop = CommonProvider.toTop;

    // 判断登录状态：跳转、弹窗
    $rootScope.checkLogin = function (option) {
      if (!$localStorage.token) {
        if (option == 'modal') {
          $modal.custom({
            title: '登录',
            template_url: '/partials/home/layout/login.html',
          });
        } else {
          $location.path('auth/login');
        }
      }
    };

    // 获取友链
    $scope.getFriendLinks = function () {
      if (!!$localStorage.friendLinks) $scope.friendLinks = $localStorage.friendLinks;
      CommonProvider.promise({
        model: LinkModel,
        method: 'get',
        params: { 
          role: 'user',
          type: 1,
          page: 1,
          per_page: 100
        },
        success: function(links){
          $localStorage.friendLinks = links.result;
          $scope.friendLinks = links.result;
        }
      });
    };

    // 获取文章分类
    $scope.getArticleCates = function () {
      CommonProvider.promise({
        model: CategoryModel,
        method: 'get',
        params: { 
          role: 'student',
          type: 3,
          per_page: 100
        },
        success: function(articleCates){
          $scope.articleCates = articleCates.result;
        }
      });
    };

    // 请求配置信息
    $rootScope.getConfig = function (params) {
      var get_config = {};
      if (params.group) {
        get_config = {
          role: 'user',
          is_front: 1,
          per_page: 100,
          parge: 1,
          group: params.group
        };
      };
      if (params.name) {
        get_config.name = params.name;
      };
      if (!get_config.name && !get_config.group) return false;
      CommonProvider.promise({
        model: CommonModel,
        method: get_config.name ? 'configByName' : 'config',
        params: get_config,
        success: function(config){
          if (params.success) params.success(config);
        }
      });
    };

    // 全局获取当前日期
    $rootScope.date = new Date();

    // 时间器模块全局配置
    moment.locale('zh-cn', {
      relativeTime : {
        future: "%s",
        past:   "%s",
        s:  "刚刚",
        m:  "1分钟前",
        mm: "%d分钟前",
        h:  "1小时前",
        hh: "%d小时前",
        d:  "1天前",
        dd: "%d天前",
        M:  "1个月前",
        MM: "%d个月前",
        y:  "1年前",
        yy: "%d年前"
      }
    });

    $rootScope.moment = new moment();

    // 本地存储/更新token时间戳
    $rootScope.setTokenLimit = function (auto_login) {

      // 检查token有效期时间戳,如果不存在则创建(分钟)
      var token_limit = {};
      token_limit.start_time = new Date().getTime() / 1000 / 60;

      // 如果用户勾选了记住我长期登录，则时间为30天，否则为一天
      if (!!auto_login) token_limit.end_time = ($rootScope.date.getTime() / 1000 / 60) + 60*24*30;
      if (!auto_login) token_limit.end_time = ($rootScope.date.getTime() / 1000 / 60) + 60*24;

      // 若本地不存在，则创建
      if (!$localStorage.token_limit) $localStorage.token_limit = {};
      $localStorage.token_limit = token_limit;
    };

    // token检查及更新
    $rootScope.updateToken = function () {
      // 如果本地存在token,才执行此项
      if (!!$localStorage.token) {
        // 如果本地存储过数据，则读取数据判断
        if (!!$localStorage.token_limit) {
          // 如果token剩余的过期时间小于一小时
          if (($localStorage.token_limit.end_time - ($rootScope.date.getTime() / 1000 / 60)) <= 60) {
            // 且一小时内用户处于请求活跃状态
            if (($rootScope.date.getTime() / 1000 / 60) - $localStorage.token_limit.last_request < 60) {
              // 且10分钟内没有请求更新过token(或首次请求)
              if (($rootScope.date.getTime() / 1000 / 60) - $localStorage.token_limit.last_token_request > 10 || !$localStorage.token_limit.last_token_request) {
                // 则更换token
                // 首次更换请求完成后存储，防止多次请求
                $localStorage.token_limit.last_token_request = $rootScope.date.getTime() / 1000 / 60;
                Main.update_token({ token: $localStorage.token }, function (token) {
                  if (token.code == 1) {
                    $localStorage.token = token.result;
                    console.log('token就快过期，已执行了更换');
                    // 本地写入token新的起始时间
                    $localStorage.token_limit.start_time = $rootScope.date.getTime() / 1000 / 60;
                    // 新的token结束时间
                    $localStorage.token_limit.end_time = $rootScope.date.getTime() / 1000 / 60 + 60*24;
                    // 本地写入最后一次请求更新token的时间（覆盖）
                    $localStorage.token_limit.last_token_request = $rootScope.date.getTime() / 1000 / 60;
                  } else {
                    console.log(token.message);
                  }
                });
              }
            }
          }
        } else {
          // 否则创建空的
          $localStorage.token_limit = {};
        }
        // 每一次登录之后的请求向本地写入最后一次发出请求的时间
        $localStorage.token_limit.last_request = $rootScope.date.getTime() / 1000 / 60;
      };
    };

    // tab定位(传入目标tab下标)
    $rootScope.setTabActive =  CommonProvider.setTabActive;

    // 供子页面使用，在链接包含定位参数时定位文档
    $rootScope.setDomPosition = function (scope) {

      // 锚点定位
      if ($location.$$hash) {
        $rootScope.goTo($location.$$hash);
      };

      // TAB活动定位
      if ($location.$$search.tab) {
        $rootScope.setTabActive(scope, $location.$$search.tab);
      }
    };

  }
])
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
/*
* AuthController Module
*
* Auth模块，包括：用户登录、第三方用户登录、注册、找回密码
*
*/
angular.module('AuthController', ['angular.validation', 'angular.validation.rule', 'AuthModel'])
.controller('AuthController', ['$rootScope', '$scope', '$location', '$localStorage', '$state', '$timeout', '$interval', '$modal', '$window', 'AuthModel', 'CommonProvider', 'AuthProvider', 'CommonModel',
  function ($rootScope, $scope, $location, $localStorage, $state, $timeout, $interval, $modal, $window, AuthModel, CommonProvider, AuthProvider, CommonModel) {

    // 初始化
    // 获取绑定页所需的第三方用户数据
    $scope.thirdLoginInfo = $localStorage.thirdLoginInfo || false;
    $scope.verify = {
      text: '获取手机校验码',
      status: false,
      verifyed: false,
      phone: false,
      warning: false,
      message: ''
    };

    // 默认非绑定，非第三方
    $scope.auth = {
      mode: 'login',
      bind: false,
      auto: true,
      agree: true,
      success: false
    };

    $scope.user = {
      auto_login: true
    };

    // 登录 
    $scope.login = AuthProvider.login;

    // 注销
    $scope.logout = AuthProvider.logout;

    // 注册
    $scope.register = function (params) {
      CommonProvider.promise({
        model: AuthModel,
        method: 'register',
        params: $scope.user,
        success: function (auth) {
          $localStorage.token = auth.result;
          $rootScope.setTokenLimit();

          // 回调
          if (params.callback) {
            params.callback(auth);
            return false;
          };

          // 注册成功
          $modal.success({ 
            message: '注册成功',
            callback: function () {
              AuthProvider.init();
              $location.path('/user/index');
            } 
          });
        },
        error: function (auth) {
          $modal.error({ message: auth.message });
        }
      });
    };

    // 登录并绑定
    $scope.bindLogin = function (params) {
      AuthProvider.login({
        user: $scope.user,
        callback: function (token) {
          $scope.thirdBind({ bind: false, modal: params.modal || false });
        }
      });
    };

    // 注册并绑定
    $scope.bindRegister = function (params) {
      $scope.register({ 
        callback: function (token) {
          $scope.thirdBind({ bind: false, modal: params.modal || false });
        }
      });
    };

    // 找回密码
    $scope.forgot = function () {
      CommonProvider.promise({
        model: AuthModel,
        method: 'forgot',
        params: $scope.user,
        success: function (auth) {
          $scope.auth.success = true;
          $timeout(function() {
            $location.path('/auth/login');
          }, 2000);
        },
        error: function (auth) {
          $modal.error({ message: auth.message });
        }
      });
    };

    // 获取验证码
    $scope.getVerifyCode = function (config) {

      if (!$scope.user.phone) return false;
      if (!!$scope.user.phone && $scope.user.phone.length != 11) return false;
      if (!!$scope.user.phone && isNaN(parseInt($scope.user.phone))) return false;
      if (!!$scope.verify.status) return false;

      $scope.verify.seconds = 60;
      var timePromise;
      var verifyTimimg = function(){
        timePromise = $interval(function(){
          $scope.verify.seconds -= 1;
          $scope.verify.status = true;
          $scope.verify.text = $scope.verify.seconds + '秒后重新获取';
          if ($scope.verify.seconds == 0) {
            $scope.verify.status = false;
            $scope.verify.text = '重新获取校验码';
          }
        }, 1000, $scope.verify.seconds);
        return timePromise;
      };

      CommonProvider.promise({
        model: CommonModel,
        method: 'sms',
        params: {
          rule: config.type == 'exist' ? 'check_mobile_exists' : 'check_mobile_unique',
          phone: $scope.user.phone
        },
        success: function (verify) {

          if (config.modal) $scope.verify.warning = false;
          if (!config.modal) $modal.success({ message: verify.message });

          // 倒计时
          verifyTimimg();
        },
        error: function (verify) {

          if (config.modal) {
            $scope.verify.warning = true;
            $scope.verify.message = verify.message;
          } else {
            $modal.error({ message: verify.message });
          }
        }
      });
    };

    // 获取第三方账户列表
    $scope.getThirdAccounts = function () {
      CommonProvider.promise({
        model: AuthModel,
        method: 'getThirds',
        success: function(accounts){
          $scope.third_accounts = accounts.result;
        }
      });
    };

    // 第三方登录
    $scope.thirdLogin = function (config) {

      // 参数
      if (config.provider == undefined) {
        return false;
      }

      // 轮询器
      var loginCodeCheckInterval;

      // 第三方配置
      var loginProviders = {
        qq: {
          name: 'qq',
          title: 'QQ授权登录',
          author_ization_endpoint: 'https://graph.qq.com/oauth2.0/authorize',
          required_url_params: {
            response_type: 'code',
            state: 'qq',
            client_id: '101277423',
            display: 'default',
            scope: 'get_user_info',
            redirect_uri: 'http://xuetianxia.cn/partials/home/auth/relay.html'
          },
          oauth_type: '2.0',
          popup_options: { width: 700, height: 520 }
        },
        weibo: {
          name: 'weibo',
          title: '微博授权登录',
          author_ization_endpoint: 'https://api.weibo.com/oauth2/authorize',
          required_url_params: {
            state: 'weibo',
            client_id: '3912473749',
            display: 'default',
            scope: '',
            redirect_uri: 'http://xuetianxia.cn/partials/home/auth/relay.html'
          },
          oauth_type: '2.0',
          popup_options: { width: 760, height: 570 }
        },
        wechat: {
          name: 'wechat',
          title: '微信授权登录',
          author_ization_endpoint: 'https://open.weixin.qq.com/connect/qrconnect',
          required_url_params: {
            state: 'wechat',
            response_type: 'code',
            appid: 'wx0ed2dfdc25e8a274',
            scope: 'snsapi_login',
            redirect_uri: 'http://xuetianxia.cn/partials/home/auth/relay.html'
          },
          oauth_type: '2.0',
          popup_options: { width: 730, height: 530 }
        }
      }

      // 获取第三方账户判断结果
      var getLoginStatus = function (type, code) {
        CommonProvider.promise({
          model: AuthModel,
          method: 'thirdLogin',
          params: {
            type: type,
            code: code
          },
          result: function(user){

            // 用户已绑定，拿到了token和，将token存在本地
            if (user.code == 1) {

              // 如果是绑定页面，则弹出占用提示
              if (config.bind) {
                $modal.error({
                  message: '账户已被绑定',
                  info: '您的账户已和“' + user.result.name + '”绑定，请更换账户',
                  lazytime: 5
                });

              // 否则是第三方登录
              } else {

                // 存储token，并登录
                $localStorage.token = user.result;
                AuthProvider.init(function () {

                  // 如果是弹窗登录，则不再跳转，关闭弹窗并执行弹窗前事件，否则是登录页面，跳转到个人中心
                  if (config.modal) $rootScope.modal.close();
                  if (!config.modal) $location.path('user/index');
                });
              }

            // 如果用户未绑定，此时拿到UID，头像名称信息，存储到本地
            } else if (user.code == 2) {

              $localStorage.thirdLoginInfo = user.result;
              $scope.thirdLoginInfo = $localStorage.thirdLoginInfo;

              // 绑定页面，则执行绑定请求
              if (config.bind) $scope.thirdBind(config);

              // 登录页面
              if (!config.bind) {

                // 弹窗登录，更改当前弹窗的状态为绑定状态
                if (config.modal) $scope.auth.bind = true;

                // 页面登录，则跳转到绑定页面
                if (!config.modal) {
                  $location.path('auth/bind');
                }
              }

            // 参数有问题，需要重新登录
            } else {
              $modal.error({ message: '参数异常，请稍后重试' });
            }

            // 删除存储数据
            delete $localStorage.thirdLoginCode;
          }
        });
      };

      // 检查code是否获取成功
      var checkLoginCode = function () {

        // 如果找到则取消定时器
        if ($localStorage.thirdLoginCode) {
          var thirdLoginCode = $localStorage.thirdLoginCode;
          var type = loginProviders[config.provider].name;
          var code = thirdLoginCode[loginProviders[config.provider].required_url_params.state];
          // 获取用户的登录结果判断
          getLoginStatus(type, code);
          clearInterval(loginCodeCheckInterval);
        }
      };

      // 弹窗模块
      var loginPopup = function (provider_name) {
        // 弹窗配置
        var popup_config = loginProviders[provider_name];
        if (!popup_config) {
          return false;
        }
        popup_config.popup_options.top = ($window.outerHeight - popup_config.popup_options.height) / 2;
        popup_config.popup_options.left = ($window.outerWidth - popup_config.popup_options.width) / 2;
        var popup_url = [popup_config.author_ization_endpoint, query_format(popup_config.required_url_params)].join('?');
        var popup_title = popup_config.title;
        var popup_options = query_format(popup_config.popup_options, ',');
        // 弹窗
        $window.open(popup_url, popup_title, popup_options);
        // 每1秒检查一次本地code
        loginCodeCheckInterval = setInterval(checkLoginCode, 1000);
      };

      // url参数格式化
      var query_format = function(params, delimiter) {
        var delimiter = delimiter || '&';
        var str = [];
        angular.forEach(params, function(value, key) {
          str.push(encodeURIComponent(key) + '=' + value);
        });
        return str.join(delimiter);
      };

      // 执行检查
      loginPopup(config.provider);
    };

    // 第三方绑定
    $scope.thirdBind = function (config) {

      // 从本地获取第三方用户数据
      if ($localStorage.thirdLoginInfo) $scope.thirdLoginInfo = $localStorage.thirdLoginInfo;
      if (!$localStorage.thirdLoginInfo) return console.log('本地缺少用户基本信息');

      // 确定地址
      var third_type_code = $scope.thirdLoginInfo.type;
      var third_type = function () {
        switch (third_type_code) {
          case 1:
            return 'weibo';
            break;
          case 2:
            return 'qq';
            break;
          case 3:
            return 'wechat';
            break;
          default:
            return '';
            break;
        }
      }

      // 参数检查
      if (!third_type()) {
        return false;
      };

      CommonProvider.promise({
        model: AuthModel,
        method: 'thirdBind',
        params: { 
          type: third_type(),
          body: {
            open_id: $scope.thirdLoginInfo.open_id,
            randomstr: $scope.thirdLoginInfo.randomstr
          } 
        },
        success: function(account){

          // 绑定成功，删除本地的第三方用户信息
          delete $localStorage.thirdLoginInfo;

          // 如果是在第三方绑定页面，则不跳转而是刷新列表
          if (config.bind) $modal.success({ message: account.message, callback: $scope.getThirdAccounts });
          if (!config.bind) {

            // 如果是弹窗登录页，则关闭窗口，并执行弹窗前回调
            if (config.modal) {
              // console.log('总之弹窗第三方绑定成功，应该还没有登录');
              AuthProvider.init();
              $modal.closeCallback();
            };

            // 否则是单页登录，进入个人中心
            if (!config.modal) $location.path($rootScope.redirect || 'user/index');
          }
        },
        error: function (account) {

          // 第三方绑定失败
          if (config.modal) console.log(account.message);
          if (!config.modal) $modal.error({ message: account.message });
        }
      });
    };

    // 第三方解绑
    $scope.thirdUnbind = function (account) {
      $modal.confirm({
        title: '请确认操作',
        message: '您确定要解除与' + account.type_name + '用户“' + account.name + '”的绑定吗？',
        button: {
          confirm: '确定',
          cancel: '取消'
        },
        onsubmit: function () {
          CommonProvider.promise({
            model: AuthModel,
            method: 'thirdUnbind',
            params: { id: account.id },
            success: function(account){
              $modal.success({ message: account.message });
              $scope.getThirdAccounts();
            },
            error: function () {
              $modal.error({ message: account.message });
            }
          });
        }
      });
    };
    
  }
]);

/*
 * CourseController
*/
angular.module('CourseController', ['angular.bootstrap.rating', 'CategoryModel', 'CourseModel', 'SectionModel', 'CommentModel', 'FavoriteModel', 'SearchModel'])
.controller('CourseController', ['$rootScope', '$scope', '$state', '$stateParams', '$location', '$http', '$localStorage', '$window', '$timeout', '$interval', '$modal', '$filter', '$sce', 'CommonProvider', 'CategoryModel', 'CourseModel', 'SectionModel', 'CommentModel','FavoriteModel', 'SearchModel', 
  function ($rootScope, $scope, $state, $stateParams, $location, $http, $localStorage, $window, $timeout, $interval, $modal, $filter, $sce, CommonProvider, CategoryModel, CourseModel, SectionModel, CommentModel, FavoriteModel, SearchModel) {

    // 初始化
    $scope.filter = {
      sort_id: 0,
      is_live: 0
    };
    $scope.course_id = $stateParams.course_id || false;
    $scope.category_id = $stateParams.category_id || '0';
    $scope.course = {};
    $scope.course.relation = false;
    $scope.sections = {};
    $scope.sections.all = [];
    $scope.sections.free = [];
    $scope.sections.live = [];
    $scope.sections.current = 0;
    $scope.sections.current_free = 0;
    $scope.sections.last = {};
    $scope.course.btn = {
      primary: {
        text: '立即购买',
        show: true
      },
      secondary: {
        text: '免费试听',
        show: true,
        type: 'audition'
      }
    };

    // List ----------------------------------------------------

    // 获取课程分类
    $scope.getCateList = function () {
      CommonProvider.promise({
        model: CategoryModel,
        method: 'childrens',
        params: { category_id: $scope.category_id },
        success: function(categories){
          if (!!categories.result.children.length) {
            $scope.categories = categories.result;
            $rootScope.categories = categories.result;
          } else {
            $scope.categories = $rootScope.categories;
          }
        }
      });
    };

    // 获取课程列表数据
    $scope.getCourseList = function (page) {

      // 返回顶部
      $rootScope.toTop();

      // 判断是否为搜索页
      if (!!$stateParams.key) {
        $scope.getSearchList(page);
        return false;
      };

      var get_params = {
        role: 'student',
        category_id: $scope.category_id,
        sort_id: $scope.filter.sort_id || 0,
        page: page || 1,
        per_page: 12
      };

      if ($scope.filter.is_live == 1) get_params.is_live = 1;

      CommonProvider.promise({
        model: CourseModel,
        method: 'get',
        params: get_params,
        success: function(courses){
          $scope.courses = courses;
        }
      });
    };

    // 获取课程列表数据
    $scope.getSearchList = function (page) {
      $scope.keyword = $stateParams.key;

      var get_params = {
        keyword: $stateParams.key,
        detail: 1,
        only_name: 1,
        search_type: 'course',
        sort_id: $scope.filter.sort_id || 0,
        page: page || 1,
        per_page: 12
      };

      if ($scope.filter.is_live == 1) get_params.is_live = 1;

      CommonProvider.promise({
        model: SearchModel,
        method: 'get',
        params: get_params,
        success: function (courses) {
          $scope.courses = courses;
        }
      });
    };

    // 分类列表页请求
    $scope.getListInit = function () {
      $scope.getCateList();
      $scope.getCourseList();
    };

    // 排序方式改变
    $scope.sortChanged = function (sort_id) {
      $scope.filter.sort_id = sort_id;
      $scope.getCourseList();
    };

    // 直播条件改变
    $scope.isLiveChanged = function (is_live) {
      $scope.filter.is_live = Number(is_live);
      $scope.getCourseList();
    };

    // Detail ----------------------------------------------------

    // 获取课程基本信息
    $scope.getBasicInfo = function () {
      CommonProvider.promise({
        model: CourseModel,
        method: 'item',
        params: { course_id: $scope.course_id },
        success: function (course) {
          $scope.course.info = course.result;
          $rootScope.title = $scope.course.info.name;
          $rootScope.description = $scope.course.info.description;
          $rootScope.setDomPosition(angular.element('#detailTab div').scope());
          if ($localStorage.categories) {
            $scope.categories = $localStorage.categories;
          }
        },
        result: function (result) {
          if (result.status == 404) {
            $modal.error({
              message: '课程不存在',
              callback: function () { $location.path('course') }
            });
          };
        }
      });
    };

    // 请求章节信息
    $scope.getSections = function () {
      CommonProvider.promise({
        model: SectionModel,
        method: 'get',
        params: { course_id: $scope.course_id },
        success: function(chapters){
          $scope.course.chapters = chapters.result;
        }
      });
    };

    // 请求评论信息
    $scope.getComments = function (params) {
      CommonProvider.promise({
        model: CommentModel,
        method: 'get',
        params: { 
          course_id: $scope.course_id,
          per_page: 10,
          page: params ? (params.page || 1) : 1
        },
        success: function(comments){
          $scope.course.comments = comments;
        }
      });
    };

    // 请求相关课程
    $scope.getRelated = function (page) {
      CommonProvider.promise({
        model: CourseModel,
        method: 'others',
        params: { 
          page: page || 1,
          per_page: 8,
          course_id: $scope.course_id
        },
        success: function(related){
          $scope.course.related = related;
        }
      });
    };

    // 刷新相关课程
    $scope.refreshRelated = function () {
      if (!$scope.course.related) return false;
      var pagination = $scope.course.related.pagination;
      if (pagination.total > pagination.per_page) {
        if (pagination.current_page < pagination.total_page) {
          $scope.getRelated(pagination.current_page + 1);
        } else if (pagination.current_page == pagination.total_page && pagination.current_page != 1) {
          $scope.getRelated(1);
        }
      }
      return false;
    };

    // 请求同学列表
    $scope.getClassmates = function (page) {
      CommonProvider.promise({
        model: CourseModel,
        method: 'classmates',
        params: { 
          course_id: $scope.course_id,
          page: page || 1,
          per_page: 12
        },
        success: function(classmates){
          $scope.course.classmates = classmates;
        }
      });
    };

    // 刷新同学列表
    $scope.refreshClassmates = function () {
      if (!$scope.course.classmates) return false;
      var pagination = $scope.course.classmates.pagination;
      if (pagination.total > pagination.per_page) {
        if (pagination.current_page < pagination.total_page) {
          $scope.getClassmates(pagination.current_page + 1);
        } else if (pagination.current_page == pagination.total_page && pagination.current_page != 1) {
          $scope.getClassmates(1);
        }
      }
      return false;
    };

    // 按钮状态更新
    $scope.checkBtnStatus = function () {

      // 获取到关系
      if (!!$scope.course.relation) {

        // 发布者
        if (!!$scope.course.relation.author) {

          // 课程预览
          $scope.course.btn.primary.text = '课程预览';
          $scope.course.btn.secondary.show = false;
        
        // 非发布者
        } else {

          // 课程免费
          if (!!$scope.course.info && !$scope.course.info.rel_price) {
            $scope.course.btn.primary.text = '立即学习';
            $scope.course.btn.secondary.show = false;
          }

          // 立即购买，免费试听
          if ($scope.course.relation.trade_status == -1) {
            $scope.course.btn.primary.text = '立即购买';
            $scope.course.btn.secondary.text = '免费试听';
            $scope.course.btn.secondary.type = 'audition';
          }

          // 立即购买，继续试听
          if ($scope.course.relation.trade_status == 0) {
            $scope.course.btn.secondary.text = '继续试听';
            $scope.course.btn.secondary.type = 'audition';
          }

          // 立即付款，继续试听
          if ($scope.course.relation.trade_status == 1) {
            $scope.course.btn.primary.text = '立即付款';
            $scope.course.btn.secondary.text = '继续试听';
            $scope.course.btn.secondary.type = 'audition';
          }

          // 继续学习，立即评价
          if ($scope.course.relation.trade_status == 2) {
            // 如果没有学习记录
            if (!$scope.course.relation.last_study_section_id) {
              $scope.course.btn.primary.text = '开始学习';
            } else {
              $scope.course.btn.primary.text = '继续学习';
            }
            $scope.course.btn.secondary.text = '立即评价';
            $scope.course.btn.secondary.show = true;
            $scope.course.btn.secondary.type = 'evaluate';
          }

          // 再次学习
          if ($scope.course.relation.trade_status == 3) {
            $scope.course.btn.primary.text = '再次学习';
            $scope.course.btn.secondary.show = false;
          }
        }
      }
    };

    // 请求课程关系（订单状态，收藏状态...）
    $scope.getRelation = function (callback) {

      // 未登录则不请求
      if (!$localStorage.token) return false;

      CommonProvider.promise({
        model: CourseModel,
        method: 'relation',
        params: $scope.course_id,
        success: function(relation){
          $scope.course.relation = relation.result;
          $scope.checkBtnStatus();
          if (!!callback && typeof callback == 'function') {
            callback();
          }
        }
      });
    };

    // 获取课程详情
    $scope.getDetail = function () {

      // 请求基本信息
      $scope.getBasicInfo();

      // 请求章节信息
      $scope.getSections();

      // 请求评论信息
      $scope.getComments();

      // 请求相关课程
      $scope.getRelated();

      // 请求同学列表
      $scope.getClassmates();

      // 请求订单关系
      $scope.getRelation();
    };

    // 弹窗登录并获取最新信息
    $scope.loginGetRelation = function (callback) {
      $rootScope.modal.login(function () {
        if (callback) {
          $scope.getRelation(function () {
            callback();
          });
        } else {
          $scope.getRelation();
        }
      });
    };

    // 章节遍历时生成数组
    $scope.pushSections = function (section) {

      // 最后一节
      $scope.sections.last = section;

      // 所有节
      $scope.sections.all.push(section);

      // 免费节
      if (!!section.is_free) $scope.sections.free.push(section);

      // 直播节
      if (!!section.is_live) $scope.sections.live.push(section);

      if (section.id && $scope.section_id && section.id == $scope.section_id) {

        // 当前播放节
        $scope.sections.current = $scope.sections.all.length - 1;

        // 当前播放免费/节
        if (!!$scope.sections.free.length) {
          $scope.sections.current_free = $scope.sections.free.length - 1;
        };
      }

      // 没有免费课程供试听，隐藏次要按钮
      if (!$scope.sections.free.length) {
        $scope.course.btn.secondary.show = false;
      }
    };

    // 添加试听记录
    $scope.addExperience = function (section_id) {

      var section_id = section_id || $scope.sections.free[0].id;

      CommonProvider.promise({
        model: CourseModel,
        method: 'operation',
        params: { 
          method: 'experience',
          course_id: $scope.course_id 
        },
        success: function(){

          // 开始试听本课程第一节可以试听的节
          $location.path('/course/' + $scope.course_id + '/learn/' + section_id);
        }
      });
    };

    // 购买课程逻辑
    $scope.buy = function (params) {

      if (!$scope.course.chapters.length || !$scope.course.chapters[0].children) return $modal.warning({ message: '没有有效章节，无法购买' });

      if (!$scope.course.chapters[0].children.length) return $modal.warning({ message: '没有有效章节，无法购买' });

      // 预指定购买成功的跳转节为指定节或者第一节
      var section_id = params.section_id || $scope.course.chapters[0].children[0].id;
      var course_id = params.course_id || $scope.course_id;

      // 支付请求
      CommonProvider.promise({
        model: CourseModel,
        method: 'operation',
        params: { 
          method: 'buy',
          course_id: course_id
        },
        success: function(buy){
          if (!params.is_free) {

            // 课程收费，跳转到支付页面
            $location.path('/payment/' + course_id);

          } else {

            // 课程免费，则跳转至播放页，播放/指定节/第一节
            $location.path('/course/' + course_id + '/learn/' + section_id );
          }
        },
        error: function (buy) {
          $modal.error({ message: buy.message });
        }
      });
    };

    // 主按钮点击逻辑
    $scope.primaryBtnEvent = function () {

      // 已登录
      if (!!$scope.course.relation) {

        // 发布者登录
        if (!!$scope.course.relation.author) {

          // 课程预览
          if (!!$scope.sections.all.length) {
            $location.path('/course/' + $scope.course_id + '/learn/' + $scope.sections.all[0].id);
          } else {
            $modal.error({
              message: '没有有效章节'
            });
          };
          
        // 非发布者
        } else {

          // 判断订单关系
          switch ($scope.course.relation.trade_status) {

            // 无试听/已试听，执行购买
            case 0:
            case -1:
              $scope.buy({course_id: $scope.course_id, is_free: !$scope.course.info.rel_price});
              break;

            // 未付款，跳转付款
            case 1:
              $location.path('/payment/' + $scope.course_id);
              break;

            // 已付款，继续播放
            case 2:

              // 若无学习记录，则从第一节开始
              if (!$scope.course.relation.last_study_section_id) {
                $location.path('/course/' + $scope.course_id + '/learn/' + $scope.sections.all[0].id);
              } else {
                $location.path('/course/' + $scope.course_id + '/learn/' + $scope.course.relation.last_study_section_id);
              }
              break;

            // 已评价，播放第一节有效视频
            case 3:

              // 如果存在有效章节
              if (!!$scope.sections.all.length) {
                $location.path('/course/' + $scope.course_id + '/learn/' + $scope.sections.all[0].id);
              } else {
                $modal.error({
                  message: '没有有效章节'
                });
              }
              break;
            default:
              console.log('执行弹窗登录');
              // 登录成功后获取最新的关系，并执行一次点击事件
              // $scope.loginGetRelation(function () {
              //   $scope.primaryBtnEvent();
              // });
              break;
          }
        }

      // 未登录
      } else {

        // 登录成功后获取最新的关系，并执行一次点击事件
        $scope.loginGetRelation(function () {
          $scope.primaryBtnEvent();
        });
      }
    };

    // 次按钮点击逻辑
    $scope.secondaryBtnEvent = function () {

      // 如果用户登录
      if (!!$scope.course.relation) {

        // 试听
        if ($scope.course.btn.secondary.type == 'audition') {

          // 确保免费节存在
          if (!!$scope.sections.free.length) {

            // 如果无试听记录，则写入试听记录（并跳至默认第一节免费节）
            if ($scope.course.relation.trade_status < 0) {
              $scope.addExperience();
              return;

            // 否则跳至试听上一次试听记录
            } else {
              $location.path('/course/' + $scope.course_id + '/learn/' + $scope.course.relation.last_study_section_id || $scope.sections.free[0].id);
            }
          }

        // 评价
        } else {
          $rootScope.goTo('detailTab');
          $rootScope.setTabActive(angular.element('#detailTab ul').scope(), 3);
        }

      // 未登录
      } else {

        // 获取到关系后回调执行二次点击
        $scope.loginGetRelation(function () {
          $scope.secondaryBtnEvent();
        });
      }
    };

    // 目录节点击逻辑
    $scope.sectionClickEvent = function (section) {
      
      // 已登录
      if (!!$scope.course.relation) {

        // 发布者/已付款/已评价/=直接播放
        if (!!$scope.course.relation.author || $scope.course.relation.trade_status == 2 || $scope.course.relation.trade_status == 3) {
          $location.path('/course/' + $scope.course_id + '/learn/' + section.id);
          return false;
        }

        // 本节免费 = 写入试听记录 + 跳转播放
        if (!!section.is_free) {

          // 如果还未试听，则写入记录并试听，否则直接播放
          if ($scope.course.relation.trade_status < 0) {
            $scope.addExperience(section.id);
          } else {
            $location.path('/course/' + $scope.course_id + '/learn/' + section.id);
          }
          return;
        }

        // 未购买 = 购买
        if ($scope.course.relation.trade_status < 1) {

          // 课程免费=购买跳转+播放 / 课程非免费=执行购买
          $scope.buy({ course_id: $scope.course_id, is_free: !$scope.course.info.rel_price, section_id: section.id});
          return false;
        }

        // 未付款
        if ($scope.course.relation.trade_status == 1) {
          $location.path('/payment/' + $scope.course_id);
        }

      // 未登录
      } else {

        // 获取到关系后回调执行二次点击
        $scope.loginGetRelation(function () {
          $scope.sectionClickEvent(section);
        });
      }
    };

    // 收藏课程
    $scope.addFav = function (course_id) {

      var course_id = course_id || $scope.course.info.id;

      // 执行收藏
      var doAddFav = function () {
        if (!!$scope.course.relation.follow) return false;
        CommonProvider.promise({
          model: FavoriteModel,
          method: 'add',
          params: {
            type: 'course',
            target_id: course_id
          },
          success: function(fav){
            $scope.course.relation.follow = true;
            $scope.course.info.follow_count += 1;
          },
          error: function (fav) {
            $modal.error({ message: fav.message });
          }
        });
      };

      // 如果用户没有登录则弹窗
      if (!$rootScope.user) {

        // 获取到关系后回调执行二次点击
        $scope.loginGetRelation(function () {
          $scope.addFav();
        });
      } else {
        doAddFav();
      }
    };

    // 提交评论
    $scope.postComment = function (comment) {
      CommonProvider.promise({
        model: CommentModel,
        method: 'post',
        params: {
          role: 'student',
          body: {
            course_id: $scope.course_id,
            content: comment.content,
            description_score: comment.score.description,
            quality_score: comment.score.quality,
            satisfaction_score: comment.score.satisfaction
          }
        },
        success: function(_comment){
          comment.content = null;
          _comment.result.user = {};
          _comment.result.user.id = $rootScope.user.id;
          _comment.result.user.name = $rootScope.user.name;
          _comment.result.user.gravatar = $rootScope.user.gravatar;
          $scope.course.comments.result.unshift(_comment.result);
          $scope.course.comments.pagination.total += 1;
          $scope.course.relation.trade_status = 3;
        },
        error: function (_comment) {
          $modal.error({ message: _comment.message });
        }
      });
    };

  }
]);
/*
 * LearnController
*/
angular.module('LearnController', ['angular.bootstrap.rating', 'angular-video-player', 'angular-chat', 'angular-related-select', 'CategoryModel', 'CourseModel', 'SectionModel', 'CommentModel', 'FavoriteModel', 'NoteModel', 'QuestionModel', 'SearchModel'])
.controller('LearnController', ['$rootScope', '$scope', '$state', '$stateParams', '$location', '$http', '$localStorage', '$window', '$timeout', '$interval', '$modal', '$filter', '$sce', 'CommonProvider', 'CategoryModel', 'CourseModel', 'SectionModel', 'CommentModel','FavoriteModel', 'NoteModel', 'QuestionModel', 'SearchModel',
  function ($rootScope, $scope, $state, $stateParams, $location, $http, $localStorage, $window, $timeout, $interval, $modal, $filter, $sce, CommonProvider, CategoryModel, CourseModel, SectionModel, CommentModel, FavoriteModel, NoteModel, QuestionModel, SearchModel) {

    // 初始化
    $scope.course_id = $stateParams.course_id || false;
    $scope.section_id = $stateParams.section_id || false;
    $scope.player = {};
    $scope.course = {};
    $scope.course.info = {};
    $scope.course.relation = false;
    $scope.section = {};
    $scope.sections = {};
    $scope.sections.all = [];
    $scope.sections.free = [];
    $scope.sections.current = 0;
    $scope.sections.current_free = 0;
    $scope.sections.last = {};
    $scope.section.player = {};
    $scope.section.player.ended = false;
    $scope.section.player.mask = {
      show: false,
      refresh: false,
      title: '',
      btn: {
        show: false,
        text: '下一节',
        style: 1,
        click: function () {}
      }
    };

    // 获取课程基本信息
    $scope.getBasicInfo = function () {
      CommonProvider.promise({
        model: CourseModel,
        method: 'item',
        params: { course_id: $scope.course_id },
        success: function (course) {
          $scope.course.info = course.result;
          $rootScope.title = $scope.course.info.name;
          $rootScope.description = $scope.course.info.description;
          $rootScope.setDomPosition(angular.element('#detailTab div').scope());
          if ($localStorage.categories) {
            $scope.categories = $localStorage.categories;
          }
        },
        result: function (result) {
          if (result.status == 404) {
            $modal.error({
              message: '课程不存在',
              callback: function () { $location.path('course') }
            });
          };
        }
      });
    };

    // 请求章节信息
    $scope.getSections = function () {
      CommonProvider.promise({
        model: SectionModel,
        method: 'get',
        params: { course_id: $scope.course_id },
        success: function(chapters){
          $scope.course.chapters = chapters.result;
        }
      });
    };

    // 请求评论信息
    $scope.getComments = function (params) {
      CommonProvider.promise({
        model: CommentModel,
        method: 'get',
        params: {
          course_id: $scope.course_id,
          per_page: 10,
          page: params ? (params.page || 1) : 1
        },
        success: function(comments){
          $scope.course.comments = comments;
        }
      });
    };

    // 请求同学列表
    $scope.getClassmates = function (page) {
      CommonProvider.promise({
        model: CourseModel,
        method: 'classmates',
        params: {
          course_id: $scope.course_id,
          page: page || 1,
          per_page: 12
        },
        success: function(classmates){
          $scope.course.classmates = classmates;
        }
      });
    };

    // 展示直播中的同学
    $scope.initLiveRoomUsers = function () {
      // 监听聊天室用户变动
      $scope.$on('chatRoomUserChanged', function (event, uids) {
        var nowLiveUserIds = uids;
        $scope.course.info.teacher = $scope.course.info.teacher || {};
        var teacher_id = $scope.course.info.teacher.id || false;
        if(!!teacher_id) nowLiveUserIds.remove(teacher_id);
        // console.log('聊天室成员变动', nowLiveUserIds);
        // return false;
        CommonProvider.promise({
          model: CourseModel,
          method: 'getUsersInfo',
          params: { user_ids: nowLiveUserIds },
          success: function(live_users){
            // console.log(live_users);
            $scope.course.live_users = live_users.result;
          }
        });
      });
    };

    // 刷新同学列表
    $scope.refreshClassmates = function () {
      if (!$scope.course.classmates) return false;
      var pagination = $scope.course.classmates.pagination;
      if (pagination.total > pagination.per_page) {
        if (pagination.current_page < pagination.total_page) {
          $scope.getClassmates(pagination.current_page + 1);
        } else if (pagination.current_page == pagination.total_page && pagination.current_page != 1) {
          $scope.getClassmates(1);
        }
      }
      return false;
    };

    // 请求课程关系（订单状态，收藏状态...）
    $scope.getRelation = function (callback) {

      // 未登录则不请求
      if (!$localStorage.token) return false;

      CommonProvider.promise({
        model: CourseModel,
        method: 'relation',
        params: $scope.course_id,
        success: function(relation){
          $scope.course.relation = relation.result;
          if (!!callback && typeof callback == 'function') {
            callback();
          }
        }
      });
    };

    // 弹窗登录并获取最新信息
    $scope.loginGetRelation = function (callback) {
      $rootScope.modal.login(function () {
        if (callback) {
          $scope.getRelation(function () {
            callback();
          });
        } else {
          $scope.getRelation();
        }
      });
    };

    // 章节遍历时生成数组
    $scope.pushSections = function (section) {

      // 最后一节
      $scope.sections.last = section;

      // 所有节
      $scope.sections.all.push(section);

      // 免费节
      if (section.is_free) {
        $scope.sections.free.push(section);
      };

      if (section.id && $scope.section_id && section.id == $scope.section_id) {

        // 当前播放节
        $scope.sections.current = $scope.sections.all.length - 1;

        // 当前播放免费/节
        if (!!$scope.sections.free.length) {
          $scope.sections.current_free = $scope.sections.free.length - 1;
        };
      };
    };

    // 购买课程逻辑
    $scope.buy = function (params) {

      if (!$scope.course.chapters.length || !$scope.course.chapters[0].children) return $modal.warning({ message: '没有有效章节，无法购买' });

      if (!$scope.course.chapters[0].children.length) return $modal.warning({ message: '没有有效章节，无法购买' });

      // 预指定购买成功的跳转节为指定节或者第一节
      var section_id = params.section_id || $scope.course.chapters[0].children[0].id;
      var course_id = params.course_id || $scope.course_id;

      // 支付请求
      CommonProvider.promise({
        model: CourseModel,
        method: 'operation',
        params: {
          method: 'buy',
          course_id: course_id
        },
        success: function(buy){
          if (!params.is_free) {

            // 课程收费，跳转到支付页面
            $location.path('/payment/' + course_id);

          } else {

            // 课程免费，则跳转至播放页，播放/指定节/第一节
            $location.path('/course/' + course_id + '/learn/' + section_id );
          }
        },
        error: function (buy) {
          $modal.error({ message: buy.message });
        }
      });
    };

    // 收藏课程
    $scope.addFav = function (course_id) {

      var course_id = course_id || $scope.course.info.id;

      // 执行收藏
      var doAddFav = function () {
        if (!!$scope.course.relation.follow) return false;
        CommonProvider.promise({
          model: FavoriteModel,
          method: 'add',
          params: {
            type: 'course',
            target_id: course_id
          },
          success: function(fav){
            $scope.course.relation.follow = true;
            $scope.course.info.follow_count += 1;
          },
          error: function (fav) {
            $modal.error({ message: fav.message });
          }
        });
      };

      // 如果用户没有登录则弹窗
      if (!$rootScope.user) {

        // 获取到关系后回调执行二次点击
        $scope.loginGetRelation(function () {
          $scope.addFav();
        });
      } else {
        doAddFav();
      }
    };

    // 写入学习记录(时间记录)
    $scope.postStudyRecord = function () {
      if (!!$scope.section.player.current) {
        CommonProvider.promise({
          model: SectionModel,
          method: 'postStudyRecord',
          params: {
            section_id: $scope.section_id,
            record_time: $scope.section.player.current
          }
        });
      };
    };

    // 请求本节笔记
    $scope.getSectionNotes = function (params) {
      CommonProvider.promise({
        model: NoteModel,
        method: 'get',
        params: {
          role: 'student',
          section_id: $scope.section_id,
          per_page: 10,
          page: params ? (params.page || 1) : 1
        },
        success: function(notes){
          $scope.section.notes = notes;
        }
      });
    };

    // 请求本节问答
    $scope.getSectionQuestions = function (params) {
      CommonProvider.promise({
        model: QuestionModel,
        method: 'get',
        params: {
          role: 'student',
          section_id: $scope.section_id,
          per_page: 10,
          page: params ? (params.page || 1) : 1
        },
        success: function(questions){
          $scope.section.questions = questions;
        }
      });
    };

    // 获取/章节信息/问答/笔记列表
    $scope.getSectionInfo = function () {

      // 节基本信息
      CommonProvider.promise({
        model: SectionModel,
        method: 'item',
        params: {
          role: 'student',
          section_id: $scope.section_id,
        },
        success: function(section){
          $scope.section.info = section.result;
        }
      });

      // 笔记
      $scope.getSectionNotes();

      // 问答
      $scope.getSectionQuestions();
    };

    // 提交评论
    $scope.postComment = function (comment) {
      CommonProvider.promise({
        model: CommentModel,
        method: 'post',
        params: {
          role: 'student',
          body: {
            course_id: $scope.course_id,
            content: comment.content,
            description_score: comment.score.description,
            quality_score: comment.score.quality,
            satisfaction_score: comment.score.satisfaction
          }
        },
        success: function(_comment){
          comment.content = null;
          _comment.result.user = {};
          _comment.result.user.id = $rootScope.user.id;
          _comment.result.user.name = $rootScope.user.name;
          _comment.result.user.gravatar = $rootScope.user.gravatar;
          $scope.course.comments.result.unshift(_comment.result);
          $scope.course.comments.pagination.total += 1;
          $scope.course.relation.trade_status = 3;
        },
        error: function (_comment) {
          $modal.error({ message: _comment.message });
        }
      });
    };

    // 提交问题
    $scope.postQuestion = function (question) {
      CommonProvider.promise({
        model: QuestionModel,
        method: 'post',
        params: {
          section_id: Number($scope.section_id),
          content: question.content,
          pid: 0
        },
        success: function(_question){
          question.content = null;
          _question.result.user = {};
          _question.result.user.id = $rootScope.user.id;
          _question.result.user.gravatar = $rootScope.user.gravatar;
          _question.result.user.name = $rootScope.user.name;
          $scope.section.questions.result.unshift(_question.result);
          $scope.section.questions.pagination.total += 1;
        },
        error: function (_question) {
          $modal.error({ message: _question.message });
        }
      });
    };

    // 回复问题
    $scope.replyQuestion = function (params) {
      if (params.modal) {
        $rootScope.questions = $scope.section.questions;
        $rootScope.reply_question = params.question;
        $modal.custom({
          title: '添加回答',
          template_url: '/partials/home/user/question/reply-question.html',
          callback: function () {
            $rootScope.questions = null;
            delete $rootScope.reply_question;
          }
        });
      } else {
        // console.log(params, $rootScope.reply_question);
        CommonProvider.promise({
          model: QuestionModel,
          method: 'post',
          params: {
            section_id: Number($scope.section_id),
            content: params.content,
            pid: $rootScope.reply_question.id,
            to_user_id: $rootScope.reply_question.user.id
          },
          success: function(_answer){
            _answer.result.user = {};
            _answer.result.user.id = $rootScope.user.id;
            _answer.result.user.gravatar = $rootScope.user.gravatar;
            _answer.result.user.name = $rootScope.user.name;
            var replys = $rootScope.questions.result.find($rootScope.reply_question);
            replys.children = replys.children || [];
            replys.children.unshift(_answer.result);
            $rootScope.modal.close();
            $modal.success({ message: '回复成功' });
          },
          error: function (_answer) {
            $modal.error({ message: _answer.message });
          }
        });
      }
    };

    // 提交笔记
    $scope.postNote = function (note) {

      CommonProvider.promise({
        model: NoteModel,
        method: 'post',
        params: {
          // 章节ID
          section_id: $scope.section_id,
          // 内容
          content: note.content,
          // 是否公开
          is_publish: Number(note.publish),
          // 是否截屏
          is_capture: Number(note.capture),
          // 资源文件名
          key: 'c' + $scope.course_id + 's' + $scope.section_id,
          // 截图时间
          record_time: $scope.section.player.current
        },
        success: function(_note){
          _note = _note.result;
          _note.capture_url = null;
          _note.user = {};
          _note.user.gravatar = $rootScope.user.gravatar;
          _note.user.name = $rootScope.user.name;
          _note.user.id = $rootScope.user.id;
          _note.section = $scope.section.info;
          $scope.section.notes.result.unshift(_note);
          $scope.section.notes.pagination.total += 1;
          note.content = null;
        },
        error: function (_note) {
          $modal.error({ message: _note.message });
        }
      });
    };

    // 收藏课程下的笔记
    $scope.addFavNote = function (note) {

      // 执行收藏
      var doAddFav = function () {

        // if (!!$scope.course.relation.follow) return false;
        CommonProvider.promise({
          model: FavoriteModel,
          method: 'add',
          params: {
            type: 'note',
            target_id: note.id
          },
          success: function(fav){
            note.followed = true;
          },
          error: function (fav) {
            $modal.error({ message: fav.message });
          }
        });
      };

      // 如果用户没有登录则弹窗
      if (!$rootScope.user) {

        // 获取到关系后执行收藏
        $scope.loginGetRelation(function () {
          doAddFav();
        });
      } else {
        doAddFav();
      }
    };

    // 定位
    $scope.postDataFocus = function () {
      $rootScope.goTo('player-container');
      // 如果获取到焦点时视频在播放，则暂停
      if (!$scope.section.player.ended && !!$scope.playerPause) {
        $scope.playerPause();
      }
    };

    // 播放结束检查/更新提示语
    $scope.playEndedCheck = function (params) {

      var params = params || {};
      var click = params.click || false;
      var playback = params.playback || false;

      $scope.section.player.mask.show = true;
      $scope.section.player.mask.refresh = true;
      $scope.section.player.mask.btn.show = true;
      $scope.section.player.mask.btn.click = function () {
        $scope.playEndedCheck({ click: true });
      };

      // 1:试听，试听已结束或未结束
      if (!!$scope.course.relation.trade_status && $scope.course.relation.trade_status < 2) {

        // 未结束，试听下一节
        if ($scope.sections.free[$scope.sections.current_free + 1]) {
          var next_section = $scope.sections.free[$scope.sections.current_free + 1];

          // 判断来源为检查或者用户点击
          if (click) {

            // 播放下一节试听视频
            $location.path('/course/' + $scope.course_id + '/learn/' + next_section.id);

          } else {
            $scope.section.player.mask.title = '下一节课程：' + next_section.name + '（' + $filter('toHHMMSS')(next_section.duration, 'MMSS') + '）';
            $scope.section.player.mask.btn.text = '试听下一节';
            $scope.section.player.mask.btn.style = 1;
          }

        } else {
          if ($scope.course.relation.trade_status <= 0) {
            if (click) {
              $scope.buy($scope.course_id, !$scope.course.info.rel_price);
            } else {
              // 结束，未购买显示购买
              $scope.section.player.mask.title = '本课程免费章节已试听完毕，如需学习更多章节，请您购买本课程';
              $scope.section.player.mask.btn.text = '购买课程';
              $scope.section.player.mask.btn.style = 2;
            }
          } else if ($scope.course.relation.trade_status == 1) {
            if (click) {
              $location.path('/payment/' + $scope.course_id);
            } else {
              // 结束，未付款显示付款
              $scope.section.player.mask.title = '本课程免费章节已试听完毕，如需学习更多章节，请您付款';
              $scope.section.player.mask.btn.text = '立即付款';
              $scope.section.player.mask.btn.style = 2;
            }
          }
        }
      // 2:正常播放，播放已结束或未结束
      } else {

        // 未结束，播放下一节
        var next_section = $scope.sections.all[$scope.sections.current + 1];
        if (!!next_section) {

          // 判断来源为检查或者用户点击
          if (click) {

            // 播放下一节试听视频
            $location.path('/course/' + $scope.course_id + '/learn/' + next_section.id);

          } else {

            // 判断是否为回放
            if (playback) $scope.section.player.mask.title = '回放已结束，下一节课程：' + next_section.name + '（'+ $filter('toHHMMSS')(next_section.duration, 'MMSS') + '）';
            if (!playback) $scope.section.player.mask.title = '下一节课程：' + next_section.name + '（'+ $filter('toHHMMSS')(next_section.duration, 'MMSS') + '）';
            $scope.section.player.mask.btn.text = '下一节';
            $scope.section.player.mask.btn.style = 1;
          }

        // 课程已结束
        } else {

          if ($scope.course.relation.trade_status == 2) {
            if (click) {
              $rootScope.goTo('player-container');
              $rootScope.setTabActive(angular.element('#J_learn_tab ul').scope(), 3);
            } else {
              // 结束，未购买显示购买
              $scope.section.player.mask.title = '恭喜您，已完成本章课程的学习！快去评价一下吧~';
              $scope.section.player.mask.btn.text = '评价课程';
              $scope.section.player.mask.btn.style = 1;
            }
          } else if ($scope.course.relation.trade_status == 3) {

            if (click) {
              $location.path('/course/' + $scope.course_id);
            } else {
              // 结束，用户已评价
              $scope.section.player.mask.title = '恭喜您，已完成本章课程的学习！';
              $scope.section.player.mask.btn.text = '返回课程';
              $scope.section.player.mask.btn.style = 1;
            }
          }
        }
      }

      if (params.callback) params.callback();
    };

    // 判断Mask主按钮的显示
    $scope.checkNextSection = function (params) {

      var params = params || {};
      var click = params.click || false;
      var title = params.title || false;

      $scope.section.player.mask.btn.show = true;
      $scope.section.player.mask.btn.click = function () {
        $scope.checkNextSection({ click: true });
      };

      // 未结束，播放下一节
      var next_section = $scope.sections.all[$scope.sections.current + 1];

      // 如果有下一页
      if (!!next_section) {

        // 判断来源为检查或者用户点击
        if (click) {

          // 播放下一节试听视频
          $location.path('/course/' + $scope.course_id + '/learn/' + next_section.id);

        } else {

          // 如果需要设置标题
          if (title) {

            // 判断是否为回放
            if (playback) $scope.section.player.mask.title = '回放已结束，下一节课程：' + next_section.name + '（'+ $filter('toHHMMSS')(next_section.duration, 'MMSS') + '）';
            if (!playback) $scope.section.player.mask.title = '下一节课程：' + next_section.name + '（'+ $filter('toHHMMSS')(next_section.duration, 'MMSS') + '）';
          };

          $scope.section.player.mask.btn.text = '下一节';
          $scope.section.player.mask.btn.style = 1;
        }

      // 课程已结束
      } else {

        if ($scope.course.relation.trade_status == 2) {

          if (click) {
            $rootScope.goTo('player-container');
            $rootScope.setTabActive(angular.element('#J_learn_tab ul').scope(), 3);

          } else {

            // 如果需要设置标题
            if (title) {

              // 结束，未购买显示购买
              $scope.section.player.mask.title = '恭喜您，已完成本章课程的学习！快去评价一下吧~';
            };

            $scope.section.player.mask.btn.text = '评价课程';
            $scope.section.player.mask.btn.style = 1;
          }
        } else if ($scope.course.relation.trade_status == 3 || !$scope.course.relation) {

          if (click) {

            $location.path('/course/' + $scope.course_id);

          } else {

            // 如果需要设置标题
            if (title) {

              // 结束，用户已评价
              $scope.section.player.mask.title = '恭喜您，已完成本章课程的学习！';
            };

            $scope.section.player.mask.btn.text = '返回课程';
            $scope.section.player.mask.btn.style = 1;
          }
        }
      }
    };

    // Init视频和聊天
    $scope.initVideoAndChat = function () {

      // 加载时的遮罩层
      $scope.section.player.mask.show = true;
      $scope.section.player.mask.refresh = false;
      $scope.section.player.mask.title = '课程资源加载中...';
      $scope.section.player.mask.btn.show = false;

      // 视频播放器部分
      if ($scope.course_id && $scope.section_id) {

        // 获取播放器资源地址
        CommonProvider.promise({
          model: SectionModel,
          method: 'getVideos',
          params: {
            section_id: $scope.section_id,
            role: 'student'
          },
          success: function(video) {

            // 隐藏遮罩层
            $scope.section.player.mask.show = false;
            $scope.section.player.mask.refresh = false;

            // 数据整理
            var video = video.result;
            // console.log(video);

            var player = {};
            player.modal = 0;
            player.urls = video.urls;
            player.is_live = video.is_live;
            player.live_status = video.live_status;

            // 直播模式
            if (player.is_live) {
              // console.log(player);
              switch (player.live_status) {
                case 0:
                case 1:
                case 10:
                case 11:
                case 12:
                  // console.log('直播未开始，更改遮罩层内容，不创建播放器');
                  player.live_at = video.live_at;
                  $scope.section.player.mask.show = true;
                  $scope.section.player.mask.title = '本节课程直播将在 ' + player.live_at + ' 开始，请等待~';
                  $scope.checkNextSection({ title: false });
                  break;
                case 2:
                  // console.log('直播进行中，创建播放器和聊天室');
                  player.room_id = video.room_id;
                  $scope.player = player;
                  break;
                case 3:
                case 4:
                  // console.log('结束，不可回放，更改遮罩层内容，不创建播放器，聊天室请求记录接口');
                  $scope.section.player.mask.show = true;
                  $scope.section.player.mask.title = '直播已结束，暂无有效回放资源';
                  $scope.checkNextSection({ title: false });
                  break;
                case 5:
                  // console.log('结束，可回放，创建普通播放器，聊天室请求记录接口');
                  $scope.section.player.mask.show = false;
                  player.room_id = 0;
                  break;
              };
            };

            // 点播/回放模式
            if (!player.is_live || (!!player.is_live && player.live_status == 5)) {

              // 初始化当前时间为服务器返回时间
              $scope.section.player.current = video.record != null ? video.record.record_time : 0;

              // 如果本地没有播放记录，则开始创建本地记录
              $localStorage.play_record = $localStorage.play_record || {};

              // 如果本地记录不包含此用户，则开始创建此用户的记录
              $localStorage.play_record[$rootScope.user.id] = $localStorage.play_record[$rootScope.user.id] || {};

              // 计算播放器开始续播时间
              var playerStartTime = function () {

                // 如果是通过定位链接定位的，则直接返回为该定位链接的时间点
                if ($stateParams.record_time) {
                  return $stateParams.record_time;
                };

                // 否则，续接上次播放记录，先读取本地记录，如果记录上次已学完，则从0开始，如果本地记录不存在，则读取服务器继续判断，如果服务器记录不存在，则从0开始
                if ($localStorage.play_record[$rootScope.user.id][$scope.section.info.id]) {
                  if ($localStorage.play_record[$rootScope.user.id][$scope.section.info.id] == Number($scope.section.info.duration).toFixed(0)) {
                    return 0;
                  } else {
                    return $localStorage.play_record[$rootScope.user.id][$scope.section.info.id];
                  }
                } else {
                  if (video.record != null && video.record.record_time != Number($scope.section.info.duration).toFixed(0)) {
                    return video.record.record_time;
                  } else {
                    return 0;
                  }
                }
              };

              player.start = playerStartTime();
              $scope.player = player;

              // 监听时间
              $scope.$on('videoPlayerTimeUpdate', function (event, current_time) {

                if (!current_time) return false;

                // 实时时间无变化则不保存
                if ($scope.section.player.current == Number(Math.floor(current_time))) return false;

                // 保存给内存
                $scope.section.player.current = Number(Math.floor(current_time));

                // 实时时间保存给本地
                $localStorage.play_record[$rootScope.user.id][$scope.section.info.id] = Number(Math.floor(current_time));
              });

              // 监听播放
              $scope.$on('videoPlayerPlaying', function (event, playing) {
                $scope.$apply(function () {
                  $scope.section.player.mask.show = false;
                });
              });

              // 监听暂停
              $scope.$on('videoPlayerPause', function (event, pause) {
                $scope.postStudyRecord();
              });

              // 监听结束
              $scope.$on('videoPlayerEnded', function (event, ended) {

                // console.log('播放结束');

                // 写入播放记录
                $scope.postStudyRecord();
                // $scope.section.player.mask.show = true;

                // 是否为回放
                var playback = !!player.is_live;

                // 触发播放停止检查，传入是否回放参数
                $scope.playEndedCheck({ playback: playback });

              });

              // 监听预加载准备
              $scope.$on('videoPlayerLoadeddata', function (event, preload) {
                $scope.section.player.mask.show = false;
              });

              // 监听分辨率切换
              $scope.$on('videoPlayerResolution', function (event, new_src) {
                // console.log(new_src);
              });

              // 定义暂停动作
              $scope.playerPause = function (){
                $scope.$broadcast('doVideoPlayerPause', true);
              };

              // 定义播放动作
              $scope.playerPlay = function (){
                $scope.$broadcast('doVideoPlayerPlay', true);
              };

              // 定义重新播放动作
              $scope.playerRefreshPlay = function (){
                $scope.$broadcast('doVideoPlayerRefreshPlay', true);
              };
            }
          },
          error: function (video) {
            if (video.code == 600 && !$scope.course.relation.author) {
              var trade_status = $scope.course.relation.trade_status;
              // 未登录
              $modal.confirm({
                title: trade_status < 1 ? '本课程需要购买' : '本课程尚未付款',
                message: '无法播放付费课程，请前往' + ( trade_status < 1 ? '购买' : '付款' ),
                info: trade_status < 1 ? '是否购买本课程？' : '是否付款本课程？',
                button: {
                  confirm: trade_status < 1 ? '立即购买' : '立即付款',
                  cancel: trade_status < 1 ? '暂不购买' : '暂不付款'
                },
                onsubmit: function () {
                  if (trade_status < 1) $scope.buy($scope.course_id, !$scope.course.info.rel_price);
                  if (trade_status == 1) $location.path('/payment/' + $scope.course_id);
                },
                oncancel: function () {
                  $location.path('/course/' + $scope.course_id);
                },
                callback: function () {
                  // 关闭窗口后，离开本页
                  $location.path('/course/' + $scope.course_id);
                }
              });
            } else {
              $scope.section.player.mask.show = true;
              $scope.section.player.mask.title = video.message;
              $scope.checkNextSection({ title: false });
            }
          }
        });
      }
    };

    // 播放页初始化
    $scope.initLearn = function () {

      // 登录判断
      if (!$localStorage.token) {
        $modal.warning({
          message: '请先登录',
          callback: function () {
            $location.path('auth/login');
          }
        });
        return false;
      };

      // 进入播放页隐藏全局导航栏
      $rootScope.navBarHide = true;

      // 进入播放页添加样式
      $rootScope.learnActive = true;

      // 请求基本信息
      $scope.getBasicInfo();

      // 请求章节信息
      $scope.getSections();

      // 请求评论信息
      $scope.getComments();

      // 请求同学列表
      $scope.getClassmates();

      // 请求订单关系
      $scope.getRelation();

      // 请求章节/附属信息/问答/笔记列表
      $scope.getSectionInfo();

      // 监听路径的跳出
      $scope.$on('$locationChangeStart', function() {

        // console.log('跳出了');

        // 写入学习记录
        $scope.postStudyRecord();

        // 导航栏显示
        $rootScope.navBarHide = false;

        // 移除播放页样式
        $rootScope.learnActive = false;

      });

      // 监听页面/关闭/刷新/时写入学习记录
      $window.onbeforeunload = function (){
        $scope.postStudyRecord();
      };

      // 初始化视频和聊天
      $scope.initVideoAndChat();
    };

    // 监听状态的变化，用于实时改变状态
    $scope.$watch('course.relation.trade_status', function () {
      // console.log('关系发生变化');
      // $scope.playEndedCheck();
    });

  }
]);

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
/*
*
* OrganizationlController Module
*
* Description
*
*/
angular.module('OrganizationlController', ['OrganizationModel', 'CourseModel', 'CategoryModel', 'SearchModel', 'StudentModel', 'AnnouncementModel', 'AuditModel'])
.controller('OrganizationlController', ['$rootScope', '$scope', '$stateParams', '$location', '$modal', 'CommonProvider', 'OrganizationModel', 'CourseModel', 'CategoryModel', 'SearchModel', 'StudentModel', 'AnnouncementModel', 'AuditModel', 
  function ($rootScope, $scope, $stateParams, $location, $modal, CommonProvider, OrganizationModel, CourseModel, CategoryModel, SearchModel, StudentModel, AnnouncementModel, AuditModel) {

    // 初始化
    $scope.organization_id = $stateParams.organization_id || false;
    $scope.teacher_id = $stateParams.teacher_id || false;
    $scope.teacher = {};
    $scope.categorys = {};
    $scope.organization = {};
    $scope.organizations = {};
    $scope.currrent_category = {};
    $scope.organization.courses = {};
    $scope.organization.courses.sort_id = 0;
    $scope.organization.courses.is_live = 0;

    // List -------------------------------

    // 请求学校/机构分类列表
    $scope.getOrganizations = function () {
      CommonProvider.promise({
        model: CategoryModel,
        method: 'get',
        params: { 
          type: 2,
          role: 'student'
        },
        success: function(categorys){
          $scope.categorys = categorys.result;
        },
        error: function (categorys) {
          $modal.error({
            title: '请求异常',
            message: categorys.message
          });
        }
      });
    };

    // 根据id请求学校/机构列表
    $scope.getOrganizationLists = function (params) {

      CommonProvider.toTop();

      // 如果点击选项卡时此区已有内容且是请求第一页，则不请求
      if (!!$scope.organizations[params.cate.id] && !params.page) {
        return false;
      }

      // 没有参数则不请求
      if (!params.cate.id) {
        return false;
      }

      CommonProvider.promise({
        model: OrganizationModel,
        method: 'get',
        params: {
          category_id: params.cate.id,
          role: 'student',
          per_page: 20,
          page: params.page || 1
        },
        success: function(organizations){
          $scope.organizations[params.cate.id] = organizations;
        },
        error: function (organizations) {
          $modal.error({
            title: '请求异常',
            message: organizations.message
          });
        }
      });
    };

    // 获取机构搜索列表数据
    $scope.getOrganizationSearchList = function (params) {
      $rootScope.toTop();
      $scope.keyword = $stateParams.key;
      CommonProvider.promise({
        model: SearchModel,
        method: 'get',
        params: {
          keyword: $stateParams.key || '',
          detail: 1,
          only_name: 1,
          search_type: 'organization',
          per_page: 20,
          page: params.page || 1
        },
        success: function (organizations) {
          $scope.organizations = organizations;
        }
      });
    };

    // 每此切换选项后，改变面包屑数据
    $scope.changeCate = function (cate) {

      // 改变活动项
      $scope.currrent_category = cate;

      $scope.getOrganizationLists({ cate: cate });
    };

    // 主页 -------------------------------

    // 获取机构首页基本信息
    $scope.getIndex = function () {
      CommonProvider.promise({
        model: OrganizationModel,
        method: 'item',
        params: {
          organization_id: $scope.organization_id
        },
        success: function(organization){
          $scope.organization.info = organization.result;
          $rootScope.title = $scope.organization.info.name;
          $rootScope.description = $scope.organization.info.introduction;
          $scope.getIndexCourses();
          $scope.getIndexTeachers();
          $scope.getIndexAnnouncements();
        },
        error: function (organization) {
          $modal.error({
            title: '请求异常',
            message: organization.message
          });
        }
      });
    };

    // 获取机构首页精品课程
    $scope.getIndexCourses = function () {
      CommonProvider.promise({
        model: CourseModel,
        method: 'get',
        params: { 
          role: 'student',
          page: 1,
          per_page: 12,
          organization_id: $scope.organization_id
        },
        success: function(courses){
          $scope.organization.info.courses = courses.result;
        }
      });
    };

    // 获取首页老师
    $scope.getIndexTeachers = function () {
      CommonProvider.promise({
        model: OrganizationModel,
        method: 'relation',
        params: {
          per_page: 5,
          role: 'student',
          organization_role: 'teacher',
          page: 1,
          organization_id: $scope.organization_id
        },
        success: function(teachers){
          $scope.organization.info.teachers = teachers.result;
        }
      });
    };

    // 获取公告列表
    $scope.getIndexAnnouncements = function () {
      CommonProvider.promise({
        model: AnnouncementModel,
        method: 'get',
        params: {
          per_page: 10,
          role: 'student',
          type: 1,
          page: 1,
          organization_id: $scope.organization_id
        },
        success: function(announcements){
          $scope.organization.info.announcements = announcements.result;
        }
      });
    };

    // 机构首页公告弹窗
    $scope.announcementDetail = function (announcement) {
      $modal.custom({
        title: '公告详情',
        template: '<h4 class="text-center">' + announcement.title + '</h4><hr><p class="text-height">' + announcement.content + '</p>'
      });
    };

    // 机构首页简介弹窗
    $scope.descriptionDetail = function (organization, length) {
      if (organization.introduction.length <= length) return false;
      $modal.custom({
        title: organization.name + ' - 学校详情',
        template: '<p class="text-height">' + organization.introduction + '</p>'
      })
    };

    // 老师介绍弹窗
    $scope.teacherDetail = function (teacher, length) {
      if (teacher.introduction.length <= length) return false;
      $modal.custom({
        title: teacher.user.real_name + ' - 老师详情',
        template: '<p class="text-height">' + teacher.introduction + '</p>'
      })
    };

    // 获取机构所有课程列表
    $scope.getCourseLists = function (page) {

      // tab切换若有数据，则不再请求
      if (!!$scope.organization.courses.pagination && !page) return false;

      var get_params = {
        role: 'student',
        page: page || 1,
        per_page: 12,
        sort_id: $scope.organization.courses.sort_id || 0,
        organization_id: $scope.organization_id
      };
      
      if ($scope.organization.courses.is_live == 1) get_params.is_live = 1;

      CommonProvider.promise({
        model: CourseModel,
        method: 'get',
        params: get_params,
        success: function(courses){
          courses.sort_id = $scope.organization.courses.sort_id;
          courses.is_live = $scope.organization.courses.is_live;
          $scope.organization.courses = courses;
        }
      });
    };

    // 按照条件获取排序列表数据
    $scope.sortCourseLists = function (sort_id) {
      if ($scope.organization.courses.sort_id == sort_id) return false;
      $scope.organization.courses.sort_id = sort_id;
      $scope.getCourseLists(1);
    };

    // 直播过滤
    $scope.liveCourseLists = function (is_live) {
      var is_live = Number(is_live);
      if ($scope.organization.courses.is_live == is_live) return false;
      $scope.organization.courses.is_live = is_live;
      $scope.getCourseLists(1);
    };

    // 获取机构所有老师列表
    $scope.getTeacherLists = function (params) {
      if (!params.page && !!$scope.organization.teachers) return false;
      CommonProvider.promise({
        model: OrganizationModel,
        method: 'relation',
        params: {
          per_page: 10,
          role: 'student',
          organization_role: 'teacher',
          page: params.page || 1,
          organization_id: $scope.organization_id
        },
        success: function(teachers){
          $scope.organization.teachers = teachers;
        }
      });
    };

    // Teacher ------------------------------------

    // 获取老师基本数据
    $scope.getTeacherIndex = function () {
      $scope.teacher.sort_id = 0;
      $scope.teacher.is_live = 0;
      CommonProvider.promise({
        model: OrganizationModel,
        method: 'relation',
        params: { 
          role: 'student',
          organization_role: 'teacher',
          organization_id: $scope.organization_id,
          user_id: $scope.teacher_id
        },
        success: function (teacher) {
          $scope.teacher.info = teacher.result[0];
          $rootScope.title = $scope.teacher.info.user.profile.rel_name + '老师的主页';
        }
      });
    };

    // 获取老师课程数据
    $scope.getTeacherCourse = function (params) {
      var params = params || {};

      var get_params = {
        role: 'student',
        page: params.page || 1,
        per_page: 12,
        organization_id: $scope.organization_id,
        user_id: $scope.teacher_id,
        sort_id: $scope.teacher.sort_id
      };

      if ($scope.teacher.is_live == 1) get_params.is_live = 1;

      CommonProvider.promise({
        model: CourseModel,
        method: 'get',
        params: get_params,
        success: function(courses){
          $scope.teacher.courses = courses;
        }
      });
    };
    
    $scope.organizationIcon = function (cate) {
      if (!!cate) {
        switch(cate.name) {
          case '大学':
              return 'icon-university';
              break;
          case '中学':
              return 'icon-high-school';
              break;
          case '培训机构':
              return 'icon-entrance-tests';
              break;
          case '公益组织':
              return 'icon-welfare';
              break;
            default:
              break;
        };
      }
    };

  }
])
/*
*
* UserController Module
*
* Description
*
*/
angular.module('UserController', ['angular.validation', 'angular.validation.rule', 'angular.modal', 'datePicker', 'StudentModel', 'TradeModel', 'CourseModel', 'CommentModel', 'FavoriteModel', 'NoteModel', 'QuestionModel', 'MsgModel', 'ScoreModel'])
.controller('UserController', ['$rootScope', '$scope', '$state', '$stateParams', '$location', '$localStorage', '$interval', '$modal', 'dateFilter', 'QuploadProvider', 'CommonProvider', 'AuthProvider', 'StudentModel', 'TradeModel', 'CourseModel', 'CommentModel', 'CommonModel', 'FavoriteModel', 'NoteModel', 'QuestionModel', 'MsgModel', 'AuthModel', 'ScoreModel',
  function ($rootScope, $scope, $state, $stateParams, $location, $localStorage, $interval, $modal, dateFilter, QuploadProvider, CommonProvider, AuthProvider, StudentModel, TradeModel, CourseModel, CommentModel, CommonModel, FavoriteModel, NoteModel, QuestionModel, MsgModel, AuthModel, ScoreModel) {

    // 首次载入时验证登录状态
    $rootScope.checkLogin();

    // 链接产生变动时验证登录状态
    $scope.$on('$locationChangeStart', function () {
      $rootScope.checkLogin();
    });

    $scope.status = {};

    // 初始化
    $scope.user = $rootScope.user || {};

    // 链接变更成功时，更新面包屑/title
    $scope.$on('$stateChangeSuccess', function (event, next, current) {

      $scope.status.current = $state.current.data.slug || false;
      $scope.status.parent = $state.$current.parent ? ( $state.$current.parent.data ? $state.$current.parent.data.slug : false ) : false;

      // 如果路由中定义的url是空则是指当前页面
      $state.current.data.url = $state.current.data.url || $location.$$url;
      $scope.breadcrumb = $state;
      $rootScope.title = $state.current.data.title || $state.$current.parent.data.title || '';
    });

    // 请求学习记录
    $scope.getHistory = function (page) {
      CommonProvider.promise({
        model: StudentModel,
        method: 'get',
        params: {
          target_type: 'study_record',
          per_page: 10,
          page: page || 1
        },
        success: function (history) {
          $scope.history = history;
          $rootScope.toTop();
        }
      });
    };

    // 个人中心首页
    $scope.getIndex = function () {

      AuthProvider.init(function (user) {
        $scope.user = user;
      });

      $scope.getHistory();
    };

    // 我的课程初始化
    $scope.courseInit = function () {
      if (!$scope.all_courses) {
        $scope.all_courses = [
          {
            name: '全部课程',
            status: 'all',
            sort: 1
          }, {
            name: '已试听',
            status: '0',
            sort: 2
          }, {
            name: '待付款',
            status: '1',
            sort: 3
          }, {
            name: '待评价',
            status: '2',
            sort: 4
          }, {
            name: '交易成功',
            status: '3',
            sort: 5
          }, {
            name: '已关闭',
            status: '-1',
            sort: 6
          }
        ];
      };
    };

    // 我的课程
    $scope.getCourses = function (params) {
      $rootScope.toTop();

      var get_params = {
        role: 'student',
        per_page: 6,
        page: params.page || 1
      };

      if (params.status != undefined) {
        if (params.status != 'all') {
          get_params.status = params.status;
        }
      }

      CommonProvider.promise({
        model: TradeModel,
        method: 'get',
        params: get_params,
        success: function (courses) {
          $scope.all_courses.find(params.status, 'status').courses = courses;
        }
      });
    };

    // 批量状态
    $scope.batchCheck = function (params) {
      var courses = $scope.all_courses.find(params.status, 'status').courses.result;
      courses.forEach(function (course) {
        if (course.trade_status == 1) course.checked = params.check_all;
      });
    };

    // 批量付款
    $scope.batchPayment = function (status) {

      var ids = $scope.all_courses.find(status, 'status').courses.result.checked(false, 'course_id').join(',');

      // 如果没有选中课程,则弹出提醒
      if (ids == '') {
        $modal.error({ message: '请选择多个课程进行操作' });
        return false;
      }

      // 开始请求
      $location.path('payment/' + ids);
    };

    // 课程购买
    $scope.buy = function (course) {
      CommonProvider.promise({
        model: CourseModel,
        method: 'operation',
        params: { 
          method: 'buy',
          course_id: course.course_id
        },
        success: function(buy){
          if (!!course.rel_price) $location.path('/payment/' + course.course_id);
          if (!course.rel_price) $location.path('/course/' + course.course_id + '/learn/' + course.last_study_section_id);
        },
        error: function (buy) {
          $modal.error({ message: buy.message });
        }
      });
    };

    // 取消订单
    $scope.delCourseTrade = function (params) {

      var doDelCourseTrade = function () {
        var page = $scope.all_courses.find(params.status, 'status').courses.pagination.current_page;
        CommonProvider.promise({
          model: TradeModel,
          method: 'cancel',
          params: {
            trade_id: params.trade_id
          },
          success: function (result) {
            // 更新当前操作列表
            // $scope. getCourses({ status: params.status, page: page });
            // 更新‘all’ + ‘待付款’ + '已关闭'列表
            $scope.getCourses({ status: 'all', page: $scope.all_courses.find('all', 'status').courses.pagination.current_page });
            $scope.getCourses({ status: '1', page: $scope.all_courses.find('1', 'status').courses.pagination.current_page });
            $scope.getCourses({ status: '-1', page: $scope.all_courses.find('-1', 'status').courses.pagination.current_page });
          }
        });
      };

      $modal.confirm({
        message: '你真的要取消订单吗？',
        onsubmit: doDelCourseTrade
      });
    };

    // 获取课程收藏
    $scope.getFavorite = function (params) {
      $rootScope.toTop();
      AuthProvider.check(function (user) {
        CommonProvider.promise({
          model: FavoriteModel,
          method: 'get',
          params: { 
            user_id: user.id,
            type: 'course',
            page: params.page || 1,
            per_page: 12
          },
          success: function(favorites){
            $scope.favorites = favorites;
          }
        });
      });
    };

    // 删除我的收藏
    $scope.delFav = function (params) {

      var doDelFav = function () {
        CommonProvider.promise({
          model: FavoriteModel,
          method: 'del',
          params: { 
            type: 'course',
            target_id: params.id
          },
          success: function(favorites){
            $scope.getFavorite({ page: $scope.favorites.pagination.current_page });
          }
        });
      };

      $modal.confirm({
        title: '确认删除',
        message: '确定要删除本条收藏吗？',
        info: '如果删除，该操作且不可恢复',
        onsubmit: doDelFav
      });
    };

    // 获取原创笔记
    $scope.getNote = function (params) {
      var target_page = params ? params.page || 1 : 1;
      AuthProvider.check(function (user) {
        CommonProvider.promise({
          model: NoteModel,
          method: 'get',
          params: { 
            role: 'student',
            user_id: user.id,
            per_page: 10,
            page: target_page
          },
          success: function(notes){
            if (target_page == 1) {
              $scope.notes = notes;
            } else {
              $scope.notes.pagination = notes.pagination;
              $scope.notes.result = $scope.notes.result.concat(notes.result);
            }
          }
        });
      });
    };

    // 获取收藏笔记
    $scope.getFavoriteNote = function (params) {
      var target_page = params ? params.page || 1 : 1;
      AuthProvider.check(function (user) {
        CommonProvider.promise({
          model: FavoriteModel,
          method: 'get',
          params: { 
            user_id: user.id,
            type: 'note',
            page: target_page,
            per_page: 12
          },
          success: function(notes){
            if (target_page == 1) {
              $scope.fav_notes = notes;
            } else {
              $scope.fav_notes.pagination = notes.pagination;
              $scope.fav_notes.result = $scope.fav_notes.result.concat(notes.result);
            }
          }
        });
      });
    };

    // 删除原创笔记
    $scope.delNote = function (note) {

      var doDelNote = function () {
        CommonProvider.promise({
          model: NoteModel,
          method: 'del',
          params: { note_id: note.id },
          success: function(_note){
            $scope.notes.result.remove(note);
          }
        });
      };

      $modal.confirm({
        title: '确认删除',
        message: '您确定要删除该笔记？',
        info: '删除后无法恢复，请您谨慎操作。',
        onsubmit: doDelNote
      });
    };

    // 删除收藏笔记
    $scope.delFavNote = function (note) {

      var doDelFavNote = function () {
        CommonProvider.promise({
          model: FavoriteModel,
          method: 'del',
          params: {
            target_id: note.note_id,
            type: 'note'
          },
          success: function(_note){
            $scope.fav_notes.result.remove(note);
          }
        });
      };

      $modal.confirm({
        title: '确认删除',
        message: '您确定要删除该笔记收藏？',
        info: '删除后无法恢复，请谨慎操作',
        onsubmit: doDelFavNote
      });
    };

    // 编辑笔记内容
    $scope.editNote = function (note) {
      $rootScope.note_local = note;
      $rootScope.note_edit  = angular.copy(note.note);
      $modal.custom({
        title: '请在下方输入新的笔记内容',
        template_url: '/partials/home/user/note/edit.html',
        callback: function () {
          delete $rootScope.note_edit;
          $rootScope.note_local = null;
        }
      });
    };

    // 保存/更新笔记
    $scope.saveNote = function (note) {
      CommonProvider.promise({
        model: NoteModel,
        method: 'put',
        params: { 
          id: note.id,
          body: {
            section_id: note.section.id,
            content: note.content,
            is_publish: Number(note.is_publish),
            is_capture: Number(!!note.is_capture),
            record_time: note.record_time || 0
          }
        },
        success: function(_note){
          $rootScope.note_local.note = note;
          $rootScope.modal.close();
        }
      });
    };

    // 获取我的提问
    $scope.getQuestion = function (params) {
      var page = params ? ( params.page || 1 ) : 1;
      CommonProvider.promise({
        model: QuestionModel,
        method: 'get',
        params: {
          role: 'student',
          page: page,
          per_page: 10
        },
        success: function(questions){
          if (page == 1) {
            $rootScope.questions = questions;
          } else {
            $scope.questions.pagination = questions.pagination;
            $scope.questions.result = $scope.questions.result.concat(questions.result);
          }
        }
      });
    };

    // 编辑我的问题
    $scope.editQuestion = function (question) {
      $rootScope.question_local = question;
      $rootScope.question_edit  = angular.copy(question.question);
      $modal.custom({
        title: '修改问题',
        template_url: '/partials/home/user/question/edit.html',
        callback: function () {
          delete $rootScope.question_edit;
          $rootScope.question_local = null;
        }
      });
    }

    // 更新我的提问
    $scope.saveQuestion = function (question) {
      CommonProvider.promise({
        model: QuestionModel,
        method: 'put',
        params: { 
          id: question.id,
          body: {
            // section_id: question.section.id,
            content: question.content,
            pid: question.pid,
            // to_user_id: string
          }
        },
        success: function(_question){
          $rootScope.question_local.question = question;
          $rootScope.modal.close();
        }
      });
    };

    // 删除我的提问
    $scope.delQuestion = function (question) {

      var doDelQuestion = function () {
        CommonProvider.promise({
          model: QuestionModel,
          method: 'del',
          params: { question_id: question.id },
          success: function(_question){
            $scope.questions.result.remove(question);
            $scope.questions.pagination.total -= 1;
          }
        });
      };

      $modal.confirm({
        title: '确认删除',
        message: '确定要删除本条问题吗？',
        info: '如果删除，则该问题下包含的回答均会被删除，且不可恢复',
        onsubmit: doDelQuestion
      });
    };

    // 获取我的回答
    $scope.getAnswer = function (params) {
      var page = params ? ( params.page || 1 ) : 1;
      CommonProvider.promise({
        model: QuestionModel,
        method: 'get',
        params: {
          role: 'student',
          page: page,
          per_page: 10,
          type: 'answer'
        },
        success: function(answers){
          if (page == 1) {
            $rootScope.answers = answers;
          } else {
            $scope.answers.pagination = answers.pagination;
            $scope.answers.result = $scope.answers.result.concat(answers.result);
          }
        }
      });
    };

    // 删除我的回答
    $scope.delAnswer = function (answer) {
      $modal.confirm({
        title: '确认删除',
        message: '确定要删除本条回答吗？',
        info: '如果删除，则该回答将不再可见，且不可恢复',
        onsubmit: function () {
          CommonProvider.promise({
            model: QuestionModel,
            method: 'del',
            params: { 
              question_id: answer.id,
              role: 'student'
            },
            success: function(_note){
              $scope.answers.result.remove(answer);
              $scope.answers.pagination.total -= 1;
            }
          });
        }
      });
    };

    // 问答详情页-请求数据
    $scope.getQAdetail = function (params) {
      CommonProvider.promise({
        model: QuestionModel,
        method: 'item',
        params: { question_id: $stateParams.question_id },
        success: function(questionAnswer){
          $scope.questionAnswer = questionAnswer.result;
        }
      });
    };

    // 详情页加载评论
    $scope.getQuestionAnswer = function () {
      CommonProvider.promise({
        model: QuestionModel,
        method: 'get',
        params: {
          role: 'student',
          page: $scope.questionAnswer.next_page,
          type: 'answer'
        },
        success: function(answers){
          $scope.questionAnswer.answers.push(answers.result);
        }
      });
    };

    // 问答详情页回复答案弹窗
    $scope.replyAnswer = function (answer) {
      $rootScope.reply_edit = answer;
      $rootScope.questionAnswer = $scope.questionAnswer;
      $modal.custom({
        title: '回复答案',
        template_url: '/partials/home/user/question/reply-answer.html',
        callback: function () {
          delete $rootScope.reply_edit;
          $rootScope.questionAnswer = null;
        }
      });
    };

    // 问答详情页回复答案方法
    $scope.saveReplyAnswer = function (answer) {
      CommonProvider.promise({
        model: QuestionModel,
        method: 'post',
        params: {
          section_id: Number($rootScope.reply_edit.section_id),
          content: answer,
          pid: $rootScope.reply_edit.id,
          to_user_id: $rootScope.reply_edit.user.id
        },
        success: function (_answer) {
          _answer.result.user = {};
          _answer.result.user.name = $rootScope.user.name;
          _answer.result.user.id = $rootScope.user.id;
          _answer.result.user.gravatar = $rootScope.user.gravatar;
          var current = $rootScope.questionAnswer.answers.find($rootScope.reply_edit);
          current.children = current.children || [];
          current.children.unshift(_answer.result);
          $rootScope.modal.close();
        }
      });
    };

    // 获取账单明细
    $scope.getBill = function (params) {

      // 格式化日期
      $scope.bill_start_date = params.start ? dateFilter(params.start, 'yyyy-MM-dd') : $scope.bill_start_date;
      $scope.bill_end_date = params.end ? dateFilter(params.end, 'yyyy-MM-dd') : $scope.bill_end_date || dateFilter($scope.billDates.today._d, 'yyyy-MM-dd');
      if (!$scope.bill_start_date || !$scope.bill_end_date) return false;

      CommonProvider.promise({
        model: StudentModel,
        method: 'get',
        params: {
          target_type: 'bill',
          role: 'student',
          start_date: $scope.bill_start_date,
          end_date: $scope.bill_end_date,
          page: params.page || 1,
          per_page: 13
        },
        success: function(bills){
          $scope.bills = bills;
        }
      });
    };

    // 获取预定义标签获取账单列表数据
    $scope.getScopeBill = function (dateUnit) {
      $scope.getBill({ 
        start: new Date(moment().subtract(1,dateUnit)._d),
        end: $scope.billDates.today._d
      });
    };

    // 时间选择器模块配置
    $scope.billInit = function () {
      $scope.billDates = {
        // 此刻
        today: moment(),
        // 最早时间范围,3年内
        min: moment().subtract(3, 'y'),
        // 最大时间，此刻
        max: moment(),
        // 开始时间，默认今天
        start: moment().subtract(7, 'd'),
        // 结束时间，默认今天
        end: moment()
      };

      $scope.getScopeBill('w');
    };

    // 获取通知
    $scope.getMsgs = function (params) {
      $rootScope.toTop();

      var get_params = {
        role: 'user',
        per_page: 14,
        page: params.page || 1
      };

      if (params.type != undefined) {
        if (params.type != 'all') {
          get_params.type = params.type;
        }
      }

      CommonProvider.promise({
        model: MsgModel,
        method: 'get',
        params: get_params,
        success: function (messages) {
          $scope.all_msgs.find(params.type, 'type').messages = messages;
        }
      });
    };

    // 通知中心初始化
    $scope.msgInit = function () {
      if (!$scope.all_msgs) {
        $scope.all_msgs = [
          {
            name: '全部消息',
            type: 'all',
            active: true,
            sort: 1
          }, {
            name: '系统消息',
            type: '0',
            active: false,
            sort: 2
          }, {
            name: '笔记消息',
            type: '1',
            active: false,
            sort: 3
          }, {
            name: '问答消息',
            type: '2',
            active: false,
            sort: 4
          }, {
            name: '课程消息',
            type: '3',
            active: false,
            sort: 5
          }, {
            name: '机构消息',
            type: '4',
            active: false,
            sort: 6
          }
        ];
      };
    };

    // 标为已读
    $scope.postMsgRead = function (msgs) {

      var ids;
      var act;
      if (msgs.all) {
        act = $scope.all_msgs.find(true,'active');
        ids = $scope.all_msgs.find(true,'active').messages.result.ids().join(',');
      } else {
        act = msgs.msg;
        ids = msgs.msg.msg.id;
      };

      if (!ids) return false;

      CommonProvider.promise({
        model: MsgModel,
        method: 'batch',
        params: {
          role: 'user',
          act_type: 'disable',
          ids: ids
        },
        success: function (res) {
          if (msgs.all) {
            act.messages.result.setAttr('x_status', 0);
          } else {
            act.msg.x_status = 0;
          }
        }
      });
    };

    // 获取地区数据
    $scope.getAreaData = function () {
      if ($localStorage.area) {
        $scope.area = $localStorage.area;
      } else {
        CommonProvider.promise({
          model: CommonModel,
          method: 'area',
          success: function (area) {
            $scope.area = area.result;
            $localStorage.area = area.result;
          }
        });
      }
    };

    // 请求个人资料
    $scope.getUserInfo = function () {

      // 同步最新数据
      AuthProvider.init(function (user) {
        $scope.user = user;
      });

      // 初始化状态
      $scope.update_info_status = 0;

      // 判断获取地区数据
      $scope.getAreaData();
    };

    // 更新个人资料
    $scope.updateInfo = function () {
      CommonProvider.promise({
        model: StudentModel,
        method: 'put',
        params: {
          gravatar: $scope.user.gravatar,
          name: $scope.user.name,
          rel_name: $scope.user.profile.rel_name,
          gender: $scope.user.profile.gender,
          city: $scope.user.profile.city,
          province: $scope.user.profile.province,
          district: $scope.user.profile.district,
          email: $scope.user.profile.email,
          slogan: $scope.user.profile.slogan,
          id_card_pic: $scope.user.profile.id_card_pic
        },
        success: function (user) {
          $rootScope.toTop();
          $scope.user = user;
          $rootScope.user = user;
          $localStorage.user = user;
          $scope.update_info_status = 1;
        }
      });
    };

    // 返回首页
    $scope.backUp = function () {
      $location.path($state.$current.parent.url.sourcePath + '/index');
    };

    // logo上传回调
    $scope.getlogoUpload = function (data) {
      if (data) {
        $scope.user.gravatar = data.key;
      }
    };

    // 身份证上传回调
    $scope.getIdentityUpload = function (data) {
      if (data) {
        $scope.user.profile.id_card_pic = data.key;
      }
    };

    // 更改密码
    $scope.resetPassword = function (password) {
      CommonProvider.promise({
        model: AuthModel,
        method: 'reset',
        params: {
          old_password: password.old,
          password: password.new
        },
        success: function (pwd) {
          console.log(pwd);
          $scope.reset_pwd_status = 1;
        },
        error: function (pwd) {
          $modal.error({ message: pwd.message });
        }
      });
    };

    // 积分初始化
    $scope.userScoreInit = function () {

      // 初始化
      $scope.score = {};
      $scope.score.lists = {};
      $scope.score.levels = {};
      $scope.score.rules = {};

      // 获取
      $scope.getScore({});
      $scope.getScoreLevel({});
      $scope.getScoreRule({});
    };

    // 获取用户积分
    $scope.getScore = function (params) {
      CommonProvider.promise({
        model: ScoreModel,
        method: 'get',
        params: {
          role: 'user',
          per_page: 14,
          page: params.page || 1
        },
        success: function (lists) {
          $scope.score.lists = lists;
        }
      });
    };

    // 获取积分规则
    $scope.getScoreRule = function (params) {
      CommonProvider.promise({
        model: ScoreModel,
        method: 'getRules',
        params: {
          role: 'user',
          per_page: 14,
          page: params.page || 1
        },
        success: function (rules) {
          $scope.score.rules = rules;
        }
      });
    };

    // 获取积分等级
    $scope.getScoreLevel = function (params) {
      CommonProvider.promise({
        model: ScoreModel,
        method: 'getLevels',
        params: {
          role: 'user',
          per_page: 14,
          page: params.page || 1
        },
        success: function (levels) {
          $scope.score.levels = levels;
        }
      });
    };
    
  }
]);
/*
* LessonController Module
*
* Description
*/

angular.module('LessonController', ['angular.validation', 'angular.validation.rule', 'Qupload', 'Umeditor', 'angular-sortable-view', 'angular-related-select', 'SectionModel', 'CategoryModel'])
.controller('LessonController', ['$rootScope', '$scope', '$stateParams', '$location', '$localStorage', '$modal', 'CommonProvider', 'AuthProvider', 'SectionModel', 'CategoryModel', 'CourseModel', 'OrganizationModel',
  function ($rootScope, $scope, $stateParams, $location, $localStorage, $modal, CommonProvider, AuthProvider, SectionModel, CategoryModel, CourseModel, OrganizationModel) {

    // 首次载入时验证登录状态
    $rootScope.checkLogin();

    // 链接产生变动时验证登录状态
    $scope.$on('$locationChangeStart', function () {
      $rootScope.checkLogin();
    });

    // 初始化
    $scope.course = {};
    $scope.course_id = $stateParams.course_id || false;
    $scope.categories = [];
    $scope.course.category_id = 0;

    // 分类选择改变回调
    $scope.selectChange = function (select) {
      $scope.course.category_id = select.ckdSelectId;
    };

    // 窗口关闭检测
    window.onbeforeunload = function(event) {
      if ($rootScope.uploading) {
        event.returnValue = '当前存在正在上传的视频，确定要退出吗？';
      }
    };

    // 发布课程初始化
    $scope.courseInit = function () {
      AuthProvider.check(function (user) {
        $scope.user = user;
      });
    };

    // 添加/编辑课程
    $scope.editCourse = function () {

      // 编辑课程
      if ($scope.course_id) {

        // 获取课程信息
        CommonProvider.promise({
          model: CourseModel,
          method: 'item',
          params: { course_id: $scope.course_id, role: 'teacher' },
          success: function (course) {

            // 如果本课程没有存在已选机构，则置为未选择已适应表单检查
            $scope.course = course.result;
            $scope.course.organization_id = $scope.course.organization_id || undefined;

            // 请求分类数据
            $scope.getCategorys();

            // 请求机构列表
            $scope.getOrganizations();
          }
        });

      // 新增课程
      } else {

        // 表单数据初始化
        $scope.course.category_id = 0;
        $scope.course.thumb = '';

        // 请求所有分类
        $scope.getCategorys();

        // 请求机构列表
        $scope.getOrganizations();
      }
    };

    // 获取分类菜单
    $scope.getCategorys = function (callback) {
      CommonProvider.promise({
        model: CategoryModel,
        method: 'get',
        params: {
          category_id: 0,
          type: 1
        },
        success: function (categories) {
          $scope.categories = categories.result;
          if (callback && typeof callback == 'function') callback($scope.categories);
        }
      });
    };

    // 获取机构列表
    $scope.getOrganizations = function () {
      CommonProvider.promise({
        model: OrganizationModel,
        method: 'relation',
        params: {
          role: 'teacher',
          status: '2,3,4,5',
          page: 1,
          per_page: 100
        },
        success: function (organizations) {
          $scope.organizations = organizations.result;
        }
      });
    };

    // 更新/发布课程
    $scope.updateCourse = function () {

      var course = {
        name: $scope.course.name,
        thumb: $scope.course.thumb,
        rel_price: $scope.course.rel_price,
        description: $scope.course.description,
        introduction: $scope.course.introduction,
        category_id: $scope.course.category_id,
        organization_id: $scope.course.organization_id,
        role: 'teacher'
      };

      if ($scope.course_id) {
        course.id = $scope.course_id;
      }

      CommonProvider.promise({
        model: CourseModel,
        method: $scope.course_id ? 'put' : 'add',
        params: $scope.course_id ? { new: course } : course,
        success: function (course) {

          // 修改课程
          if ($scope.course_id) {
            $modal.success({
              message: '课程编辑成功',
              callback: function () {
                $location.path('teacher/course/list');
              }
            });

          // 发布课程，跳转到此课程的章节编辑页面
          } else {
            $modal.success({
              message: '课程发布成功',
              callback: function () {
                $location.path('teacher/course/section/edit/' + course.result.id );
              }
            });
          }
        },
        error: function (course) {
          $modal.error({ message: course.message });
        }
      });
    };

    // 课程缩略图上传结果回调函数
    $scope.getUploadThumb = function (data) {
      if (data) {
        $scope.course.thumb = data.key;
      }
    };

    // 已开课程初始化
    $scope.courseInit = function () {
      AuthProvider.check(function (user) {
        $scope.user = user;
        if (user.is_teacher) {
          if (!$scope.all_courses) {
            $scope.all_courses = [
              {
                name: '全部课程',
                x_status: 'all',
                sort: 1
              }, {
                name: '上架中',
                x_status: '1',
                sort: 2
              }, {
                name: '已下架',
                x_status: '0',
                sort: 3
              }
            ];
          };
        }
      });
    };

    // 获取已开课程
    $scope.getCourses = function (params) {

      $rootScope.toTop();

      var get_params = {
        role: 'teacher',
        user_id: 1,
        per_page: 6,
        sort_id: 1,
        page: params.page || 1
      };

      if (params.x_status != undefined) {
        if (params.x_status != 'all') {
          get_params.x_status = params.x_status;
        }
      }

      CommonProvider.promise({
        model: CourseModel,
        method: 'get',
        params: get_params,
        success: function (courses) {
          $scope.all_courses.find(params.x_status, 'x_status').courses = courses;
        }
      });
    };

    // 课程操作-选中值检测
    $scope.courseEvent = function (callback) {
      var ids = $scope.all_courses.find(true, 'active').courses.result.checked();
      if (!ids.length) {
        $modal.error({ message: '无有效选中课程用于操作' });
        return false;
      } else {
        callback(ids);
      }
    };

    // 课程操作，更新全部数据
    $scope.refreshCourses = function () {
      $scope.getCourses({ x_status: 'all', page: $scope.all_courses.find('all', 'x_status').courses.pagination.current_page });
      $scope.getCourses({ x_status: '0', page: $scope.all_courses.find('0', 'x_status').courses.pagination.current_page });
      $scope.getCourses({ x_status: '1', page: $scope.all_courses.find('1', 'x_status').courses.pagination.current_page });
    };

    // 课程列表-上架
    $scope.sellCourse = function () {
      $scope.courseEvent(function (ids) {
        $modal.confirm({
          title: '确认操作',
          message: '确定要上架这些课程吗？',
          onsubmit: function () {
            CommonProvider.promise({
              model: CourseModel,
              method: 'enable',
              params: ids,
              success: function (course) {
                $modal.success({ message: '成功上架' + course.result + '个课程' });
                $scope.all_courses.setAttr('check_all', false);
                $scope.refreshCourses();
              },
              error: function (course) {
                $modal.error({ message: course.message });
              }
            });
          }
        });
      });
    };

    // 课程列表-下架
    $scope.delistingCourse = function () {
      $scope.courseEvent(function (ids) {
        $modal.confirm({
          title: '确认操作',
          message: '确定要下架这些课程吗？',
          onsubmit: function () {
            CommonProvider.promise({
              model: CourseModel,
              method: 'disable',
              params: ids,
              success: function (course) {
                $modal.success({ message: '成功下架' + course.result + '个课程' });
                $scope.all_courses.setAttr('check_all', false);
                $scope.refreshCourses();
              },
              error: function (course) {
                $modal.error({ message: course.message });
              }
            });
          }
        });
      });
    };

    // 课程列表-删除
    $scope.delCourse = function () {
      $scope.courseEvent(function (ids) {
        $modal.confirm({
          title: '确认操作',
          message: '确定要删除这些课程吗？',
          info: '删除后该课程所有相关信息将不复存在',
          onsubmit: function () {
            CommonProvider.promise({
              model: CourseModel,
              method: 'delete',
              params: ids,
              success: function (course) {
                $modal.success({ message: '成功删除' + course.result + '个课程' });
                $scope.all_courses.setAttr('check_all', false);
                $scope.refreshCourses();
              },
              error: function (course) {
                $modal.error({ message: course.message });
              }
            });
          }
        });
      });
    };

    // 获取章节列表和课程信息
    $scope.editSection = function () {
      if (!$scope.course_id) {
        $modal.error({
          message: '请您选择课程添加章节'
        });
        $location.path('teacher/course/list');
        return false;
      } else {
        // 获取课程基本信息
        CommonProvider.promise({
          model: CourseModel,
          method: 'item',
          params: { course_id: $scope.course_id, role: 'teacher' },
          success: function (course) {
            $scope.course = course.result;
            if (!$scope.course.rel_price) $scope.chapters.setAttr('is_free', 1, 'children');
          }
        });
        // 获取章节信息
        CommonProvider.promise({
          model: SectionModel,
          method: 'get',
          params: {
            role: 'teacher',
            course_id: $scope.course_id
          },
          success: function (chapters) {
            // console.log(chapters);
            $scope.chapters = chapters.result;
            if (!$scope.chapters.length) {
              $scope.addChapter();
            }
          },
          error: function (chapters) {
            $modal.error({ message: chapters.message });
          }
        });
      }
    };

    // 添加章
    $scope.addChapter = function () {
      var chapter = {
        name: '',
        course_id: $scope.course_id,
        pid: 0,
        is_free: Number(!$scope.course.rel_price),
        sort: $scope.chapters.length + 1
      };
      $scope.chapters.push(chapter);
    };

    // 添加节
    $scope.addSection = function (chapter) {
      var section = {
        name: '',
        course_id: $scope.course_id,
        description: '',
        pid: chapter.chapter.id,
        is_free: !!chapter.chapter.is_free || 0,
        status: 0,
        sort: chapter.chapter.children ? chapter.chapter.children.length + 1 : 1
      };
      if (!section.pid) {
        $modal.error({ message: '请先完善该章内容' });
        return false;
      };
      chapter.chapter.children = chapter.chapter.children || [];
      chapter.chapter.children.push(section);
      chapter.chapter.open = true;
    };

     // 更新/添加章
    $scope.updateChapter = function (chapter) {
      var _chapter = {
        pid: 0,
        name: chapter.name,
        sort: chapter.sort,
        is_free: Number(chapter.is_free),
        course_id: $scope.course_id
      };
      if (chapter.id) _chapter.id = chapter.id;
      CommonProvider.promise({
        model: SectionModel,
        method: _chapter.id ? 'put' : 'add',
        params: _chapter,
        success: function (__chapter) {
          var index = $scope.chapters.indexOf(chapter);
          angular.extend($scope.chapters[index], __chapter.result);
          $scope.chapters[index].tooltit = _chapter.id ? '章节信息更新成功' : '章节添加成功';
        },
        error: function (__chapter) {
          $modal.error({ message: __chapter.message });
        }
      });
    };

    // 更新/添加节
    $scope.updateSection = function (section) {
      var _section = {
        pid: section.section.pid,
        name: section.section.name,
        sort: section.section.sort,
        is_free: section.section.is_free,
        is_live: section.section.is_live,
        course_id: $scope.course_id
      };
      if (_section.is_live) {
        _section.live_at = section.section.live_at;
        _section.live_duration = section.section.live_duration;
      };
      if (section.section.id) _section.id = section.section.id;
      // console.log(_section);
      CommonProvider.promise({
        model: SectionModel,
        method: _section.id ? 'put' : 'add',
        params: _section,
        success: function (__section) {
          var index = section.$parent.$parent.chapter.children.indexOf(section.section);
          angular.extend(section.$parent.$parent.chapter.children[index], __section.result);
          section.section.status = section.section.status || 0;
          section.section.live_status = 0;
          section.section.tooltit = _section.id ? '本节信息更新成功' : '成功添加本节';
        },
        error: function (__section) {
          $modal.error({ message: __section.message });
        }
      });
    };

    // 设置课程节免费状态
    $scope.setSectionFree = function (section) {
      if ($scope.course.rel_price <= 0) return false;
      if (!section.name || !section.id) {
        section.is_free = 0;
        $modal.error({  message: '请先完善本节内容' });
        return false;
      };
      CommonProvider.promise({
        model: SectionModel,
        method: 'put',
        params: {
          id: section.id,
          name: section.name,
          is_free: section.is_free,
        }
      });
    };

    // 设置直播查看时间情况
    $scope.setSectionLive = function (section) {
      if (!section.section.is_live) return false;
      var is_add = section.section.id == undefined;
      var live_at = section.section.live_at;
      var live_duration = section.section.live_duration;
      if (is_add && (!live_at || !live_duration || !(moment(live_at) > moment()))) {
        $scope.updateSectionLiveInfo({ modal: false, section: section });
      };
    };

    // 删除章
    $scope.delChapter = function (chapter) {
      $modal.confirm({
        title: '是否真的要删除',
        message: '确定要删除本章吗？',
        info: '如果删除，章所属课程及视频也同时将被删除',
        onsubmit: function () {
          // 如果是未保存的章
          if (!chapter.id) {
            $scope.chapters.remove(chapter);
            return false;
          }
          // 请求
          CommonProvider.promise({
            model: SectionModel,
            method: 'del',
            params: { section_id: chapter.id },
            success: function (_chapter) {
              $scope.chapters.remove(chapter);
            }
          });
        }
      });
    };

    // 删除节
    $scope.delSection = function (section) {
      $modal.confirm({
        title: '是否真的要删除',
        message: '确定要删除本节吗？',
        info: '如果删除，删除后本节视频也将会被删除',
        onsubmit: function () {
          // 如果是未保存的节
          if (!section.section.id) {
            section.$parent.$parent.chapter.children.remove(section.section);
            return false;
          }
          // 请求
          CommonProvider.promise({
            model: SectionModel,
            method: 'del',
            params: { section_id: section.section.id },
            success: function (_chapter) {
              section.$parent.$parent.chapter.children.remove(section.section);
            }
          });
        }
      });
    };

    // 视频预览
    $scope.sectionPreview = function (section) {

      // 过滤
      if (!section.id) {
        $modal.error({ message: '参数异常' });
        return false;
      }

      // 请求视频
      CommonProvider.promise({
        model: SectionModel,
        method: 'getVideos',
        params: { section_id: section.id },
        success: function (videos) {
          var video = videos.result;
          var player = {};
          player.modal = 1;
          player.urls = video.urls;
          player.is_live = video.is_live;
          player.live_status = video.live_status;

          // 启动播放器
          $rootScope.player = player;

          // 弹出播放器
          $modal.custom({
            title: '课程预览',
            template: '<style>.modal-body{overflow:hidden;}.video-player .video-js{width:100%;height:320px;}</style>' + 
                      '<div video-player data="$root.player"></div>',
            callback: function () {
              $rootScope.player = null;
              delete $rootScope.player;
            }
          });
        },
        error: function (videos) {
          $modal.warning({ message: videos.message });
        }
      });
    };

    // 更新排序
    $scope.sectionSort = function ($item, $partFrom, $partTo, $indexFrom, $indexTo) {
      var sorts = [],sort;
      for (var i = 0; i < $partTo.length; i++) {
        sort = {};
        sort.data = {};
        sort.id = $partTo[i].id;
        sort.data.sort = i;
        sorts.push(sort);
      };
      SectionModel.sort(sorts);
    };

    // 修改直播信息弹窗初始化
    $scope.updateSectionInit = function () {
      var duration = $rootScope.section_local.live_duration;
      var live_at = $rootScope.section_local.live_at;
      $scope.live = {};
      $scope.live.at = live_at ? moment(live_at) : moment();
      $scope.live.duration = {};
      $scope.live.duration.hours = parseInt(duration / 60);
      $scope.live.duration.moments = duration % 60;
      $scope.minDate = moment();
      $scope.maxDate = moment().add(30, 'days');
    };

    // 修改/完善直播（时间）信息
    $scope.updateSectionLiveInfo = function (params) {
      if (!params.modal) {
        $rootScope.section_edit = params.section;
        $rootScope.section_local = angular.copy(params.section.section);
        $modal.custom({
          title: (params.edit ? '修改' : '完善') + '直播信息 - 《' + ( params.section.section.name || '新发布课程' ) +  '》',
          template_url: '/partials/home/teacher/course/section-live-info.html',
          callback: function () {
            var section = $rootScope.section_edit;
            var is_add = section.section.id == undefined;
            var live_at = section.section.live_at;
            var live_duration = section.section.live_duration;
            if (is_add && (!live_at || !live_duration || !(moment(live_at) > moment()))) {
              $rootScope.section_edit.section.is_live = 0;
              return false; 
            };
            $rootScope.section_edit = null;
            delete $rootScope.section_local;
          }
        })
      } else {
        $rootScope.section_local.live_at = params.live.at.format('YYYY-MM-DD HH:mm:ss');
        $rootScope.section_local.live_duration = (params.live.duration.hours * 60) + params.live.duration.moments;
        if (!$rootScope.section_edit.section.id) {
          $rootScope.section_edit.section.live_at = $rootScope.section_local.live_at;
          $rootScope.section_edit.section.live_duration = $rootScope.section_local.live_duration;
          $rootScope.modal.close();
          return false;
        };
        CommonProvider.promise({
          model: SectionModel,
          method: 'put',
          params: $rootScope.section_local,
          success: function (section) {
            $rootScope.section_edit.section.live_at = $rootScope.section_local.live_at;
            $rootScope.section_edit.section.live_duration = $rootScope.section_local.live_duration;
            $rootScope.section_edit.section.live_status = 0;
            $rootScope.modal.close();
          },
          error: function (section) {
            $modal.error({ message: section.message });
          }
        });
      };
    };

    // 直播节初始化/关闭操作
    $scope.liveSectionAction = function(params) {
      var section = params.section;
      var is_init = params.init;
      var live_ok = moment(section.live_at) > moment();
      if (is_init && (!section.name || !section.id || !section.live_duration || !live_ok)) {
        return $modal.error({  message: '请先完善本节信息' });
      };
      $modal.confirm({
        title: '确认操作',
        message: is_init ? '确定要初始化本节吗？' : '确定要结束本节直播吗？',
        info: is_init ? '本操作将立即创建直播间及聊天室，且不可撤销' : '本操作将关闭直播间及聊天室，且不可撤销',
        onsubmit: function () {
          CommonProvider.promise({
            model: SectionModel,
            method: is_init ? 'initLiveSection' : 'closeLiveSection',
            params: { section_id: section.id },
            result: function (status) {
              if (status.code == 1) {
                // console.log(status);
                if (is_init) section.live_status = 1.1;
                if (!is_init) section.live_status = 3;
                $modal.success({ message: status.message });
              } else {
                $modal.error({ message: status.message });
              }
            }
          });
        }
      });
    };

    // 审核失败弹窗
    $scope.sectionVerifyFailed = function (section) {
      // console.log(section);
      $modal.custom({
        title: '《' + section.name +  '》 - ' + '审核失败',
        template: '<div>' +
                    '<div class="col-xs-offset-1 col-xs-10">' + 
                      '<h4>本节审核失败，失败原因：<span class="text-danger">' + (section.remark || '暂无') + '</span></h4>' + 
                      '<h4 class="text-muted">建议更正本节信息或重新上传视频，会重新发起审核</h4>' + 
                    '</div>' + 
                    '<div class="col-xs-12">' +
                      '<br>' +
                    '</div>' +
                  '</div>'
      });
    };

    // 跳转回放
    $scope.toLiveSectionLearn = function (section) {
      $location.path('course/' + $scope.course_id + '/learn/' + section.id);
    };

    // 节格式化
    $scope.getLiveSectionRtmp = function (section) {
      CommonProvider.promise({
        model: SectionModel,
        method: 'getLiveUpstream',
        params: { section_id: section.id },
        result: function (rtmp) {
          if (rtmp.code == 1) {
            $modal.custom({
              title: '章节 - 《' + section.name +  '》' + '推流地址',
              template: '<div>' +
                          '<div class="col-xs-12">' +
                            '<br>' + 
                          '</div>' +
                          '<div class="col-xs-12">' +
                            '<div class="col-xs-offset-1 col-xs-6">' + 
                              '<h4>推流地址：<a href="" ng-click="$root.copyLink(\'' + rtmp.result.publish_url + '\')">( 点击复制 )</a></h4>' + 
                              '<p>' + rtmp.result.publish_url + '</p>' +
                            '</div>' + 
                          '</div>' +
                          '<div class="col-xs-12">' +
                            '<div class="col-xs-offset-1 col-xs-6">' + 
                              '<h4>推流秘钥：<a href="" ng-click="$root.copyLink(\'' + rtmp.result.publish_key + '\')">( 点击复制 )</a></h4>' + 
                              '<p>' + rtmp.result.publish_key + '</p>' +
                            '</div>' + 
                          '</div>' +
                          '<div class="col-xs-12">' +
                            '<div class="col-xs-offset-1 col-xs-6">' + 
                              '<h4>RoomId：<a href="" ng-click="$root.copyLink(\'' + rtmp.result.room_id + '\')">( 点击复制 )</a></h4>' + 
                              '<p>' + rtmp.result.room_id + '</p>' +
                            '</div>' + 
                          '</div>' +
                          '<div class="col-xs-12">' +
                            '<div class="col-xs-offset-1 col-xs-6">' + 
                              '<h4 class="text-danger">推流教程：</h4>' + 
                              '<p>官方客户端：OBS</p>' +
                            '</div>' + 
                          '</div>' +
                          '<div class="col-xs-12">' +
                            '<br>' +
                          '</div>' +
                        '</div>'
            });
          } else {
            $modal.error({ message: rtmp.message });
          }
        }
      });
    };

    $rootScope.copyLink = function (link) {
      window.prompt("按下Ctrl+C, 复制地址", link);
    };

  }
]);
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
/*
*
* Teacher Module
*
* Description
*
*/
angular.module('TeacherController', ['angular.validation', 'angular.bootstrap.rating', 'angular.modal', 'TeacherModel', 'TradeModel', 'AnnouncementModel', 'CommentModel'])
.controller('TeacherController', ['$rootScope', '$scope', '$state', '$stateParams', '$location', '$timeout', '$modal', '$localStorage', 'AuthProvider', 'CommonProvider', 'TeacherModel', 'TradeModel', 'AnnouncementModel', 'CommentModel',
  function ($rootScope, $scope, $state, $stateParams, $location, $timeout, $modal, $localStorage, AuthProvider, CommonProvider, TeacherModel, TradeModel, AnnouncementModel, CommentModel) {


    // 首次载入时验证登录状态
    $rootScope.checkLogin();

    // 链接产生变动时验证登录状态
    $scope.$on('$locationChangeStart', function () {
      $rootScope.checkLogin();
    });

    // 初始化
    $scope.status = {};
    $scope.organization_id = $stateParams.organization_id;

    // 链接变更成功时，更新面包屑/title
    $scope.$on('$stateChangeSuccess', function (event, next, current) {

      $scope.status.current = $state.current.data.slug || false;
      $scope.status.parent = $state.$current.parent ? ( $state.$current.parent.data ? $state.$current.parent.data.slug : false ) : false;

      // 如果路由中定义的url是空则是指当前页面
      $state.current.data.url = $state.current.data.url || $location.$$url;
      $scope.breadcrumb = $state;
      $rootScope.title = $state.current.data.title || $state.$current.parent.data.title || '';
    });

    // 获取老师中心首页信息
    $scope.getIndex = function () {
      AuthProvider.init(function (user) {
        $scope.teacher = user;
      });
    };

    // 获取系统通知
    $scope.getNotices = function () {
      CommonProvider.promise({
        model: AnnouncementModel,
        method: 'get',
        params: {
          role: 'teacher',
          type: 2,
          page: 1,
          per_page: 5
        },
        success: function(notices){
          $scope.notices = notices;
        }
      });
    };

    // 获取代办事项
    $scope.getToDoList = function () {
      CommonProvider.promise({
        model: TeacherModel,
        method: 'get',
        params: { target_type: 'todo' },
        success: function(to_do_list){
          $scope.to_do_list = to_do_list.result;
        }
      });
    };

    // 已售课程初始化
    $scope.tradeInit = function () {
      AuthProvider.check(function (user) {
        $scope.user = user;
        if (user.is_teacher) {
          if (!$scope.all_courses) {
            $scope.all_courses = [
              {
                name: '全部课程',
                status: 'all',
                sort: 1
              }, {
                name: '待付款',
                status: '1',
                sort: 3
              }, {
                name: '交易成功',
                status: '2',
                sort: 4
              }, {
                name: '已评价',
                status: '3',
                sort: 5
              }, {
                name: '关闭的订单',
                status: '-1',
                sort: 6
              }
            ];
          };
        }
      });
    };

    // 获取已售课程
    $scope.getTrades = function (params) {

      $rootScope.toTop();

      var get_params = {
        role: 'teacher',
        per_page: 6,
        page: params.page || 1
      };

      if (params.status != undefined) {
        if (params.status != 'all') {
          get_params.status = params.status;
        }
      }

      CommonProvider.promise({
        model: TradeModel,
        method: 'get',
        params: get_params,
        success: function (courses) {
          $scope.all_courses.find(params.status, 'status').courses = courses;
        },
        result: function (courses) {
          if (!!courses.status && courses.data.code == 0) {
            var current = $scope.all_courses.find(params.status, 'status');
            current.courses = {
              pagination: {
                total: 0
              },
              result: []
            };
          }
        }
      });
    };

    // 关闭课程订单
    $scope.delCourseTrade = function (params) {

      var doDelCourseTrade = function () {
        var page = $scope.all_courses.find(params.status, 'status').courses.pagination.current_page;
        CommonProvider.promise({
          model: TradeModel,
          method: 'cancel',
          params: {
            trade_id: params.trade_id
          },
          success: function (result) {
            // 更新‘all’ + ‘待付款’ + '已关闭'列表
            $scope.getTrades({ status: 'all', page: $scope.all_courses.find('all', 'status').courses.pagination.current_page });
            $scope.getTrades({ status: '1', page: $scope.all_courses.find('1', 'status').courses.pagination.current_page });
            $scope.getTrades({ status: '-1', page: $scope.all_courses.find('-1', 'status').courses.pagination.current_page });
          }
        });
      };

      $modal.confirm({
        message: '你真的要取消订单吗？',
        onsubmit: doDelCourseTrade
      });
    };

    // 评价初始化
    $scope.rateInit = function () {
      AuthProvider.check(function (user) {
        $scope.user = user;
        if (user.is_teacher) {
          $scope.rates = $scope.rates || {};
        }
      });
    };

    // 获取评价列表
    $scope.getRates = function (params) {
      $rootScope.toTop();
      var get_params = {
        role: 'teacher',
        type: 'comment',
        per_page: 6,
        page: params.page || 1
      };

      if (!!params.x_status) {
        get_params.x_status = params.x_status;
      }

      if (!!params.is_replied) {
        get_params.is_replied = params.is_replied;
      }

      CommonProvider.promise({
        model: CommentModel,
        method: 'get',
        params: get_params,
        success: function (rates) {
          $scope.rates[params.type] = rates;
        },
        result: function (rates) {
          if (!!rates.status && rates.data.code == 0) {
            var current = $scope.rates[params.type];
            current = {
              pagination: {
                total: 0
              },
              result: []
            };
          }
        }
      });
    };

    // 回复买家弹窗
    $scope.replyRate = function (params) {
      if (params.modal) {
        $rootScope.rate_local = params.rate;
        $rootScope.rate_edit  = angular.copy(params.rate.$parent.rate);
        $modal.custom({
          title: '回复评价',
          template_url: '/partials/home/teacher/rate/reply.html',
          callback: function () {
            delete $rootScope.rate_edit;
            $rootScope.rate_local = null;
          }
        });
      } else {
        CommonProvider.promise({
          model: CommentModel,
          method: 'post',
          params: {
            role: 'teacher',
            body: {
              course_id: $rootScope.rate_edit.course_id,
              content: $rootScope.rate_edit.new_reply,
              pid: $rootScope.rate_edit.id
            }
          },
          success: function (_reply) {
            $rootScope.rate_local.$parent.rate.reply_info = _reply.result;
            $rootScope.rate_local.$parent.rate.is_replied = 1;
            $rootScope.modal.close();
            $scope.getRates({ type: 'replied', is_replied: 1 });
          },
          error: function (err) {
            $modal.error({ message: err.message });
          }
        });
      }
    };

    // 删除我对买家评价的回复
    $scope.delReply = function (comment) {
      $modal.confirm({
        title: '确认操作',
        message: '您确定要删除该回复吗？',
        info: '用户评价仅可以回复一次，删除后无法再恢复',
        button: {
          confirm: '确定',
          cancel: '取消'
        },
        onsubmit: function () {
          CommonProvider.promise({
            model: CommentModel,
            method: 'del',
            params: { comment_id: comment.rate.reply[0].id },
            success: function (rates) {
              comment.rate.reply = [];
            },
            error: function (res) {
              $modal.error({ message: res.message });
            }
          });
        }
      });
    };
  }
]);

/*
*
* SchoolController Module
*
* Description
*
*/
angular.module('SchoolController', ['angular.modal', 'TypeaheadDirective', 'ScrolledDirective', 'TeacherModel', 'AuditModel', 'CategoryModel', 'SearchModel', 'SearchService', 'StudentModel'])
.controller('SchoolController', ['$rootScope', '$scope', '$state', '$http', '$stateParams', '$location', '$timeout', '$modal', '$localStorage', 'AuthProvider', 'CommonProvider', 'AnnouncementModel', 'OrganizationModel', 'AuditModel', 'CommonModel', 'CategoryModel', 'SearchModel', 'SearchService', 'StudentModel',
  function ($rootScope, $scope, $state, $http, $stateParams, $location, $timeout, $modal, $localStorage, AuthProvider, CommonProvider, AnnouncementModel, OrganizationModel, AuditModel, CommonModel, CategoryModel, SearchModel, SearchService, StudentModel) {
    

    // 首次载入时验证登录状态
    $rootScope.checkLogin();

    // 链接产生变动时验证登录状态
    $scope.$on('$locationChangeStart', function () {
      $rootScope.checkLogin();
    });

    // 初始化
    $scope.organization = {};
    $scope.organization_id = $stateParams.organization_id || false;

    // 链接变更成功时，更新面包屑/title
    $scope.$on('$stateChangeSuccess', function (event, next, current) {

      $scope.status.current = $state.current.data.slug || false;
      $scope.status.parent = $state.$current.parent ? ( $state.$current.parent.data ? $state.$current.parent.data.slug : false ) : false;

      // 如果路由中定义的url是空则是指当前页面
      $state.current.data.url = $state.current.data.url || $location.$$url;
      $scope.breadcrumb = $state;
      $rootScope.title = $state.current.data.title || $state.$current.parent.data.title || '';
    });

    // 学校管理初始化
    $scope.schoolManageInit = function () {

      // 初始化数据
      $scope.organization.info = {};
      $scope.organization.audit = {};
      $scope.organization.theme = {};
      $scope.organization.teacher = {};
      $scope.organization.announcements = {};
      $scope.organization.info_can_edit = false;
      $scope.organization.audit_can_edit = false;

      // 获取数据
      $scope.getOrganizationInfo();
      $scope.getOrganizationAudit();
      $scope.initOrganizationTeachers();
      $scope.getAnnouncement({});
      $scope.getThemeTemplate();
    };

    // 我的学校初始化
    $scope.schoolInit = function () {
      if (!$scope.all_schools) {
        $scope.all_schools = [
          {
            name: '我创建的',
            type: 'creator',
            status: '5',
            sort: 0
          },
          {
            name: '我管理的',
            type: 'manage',
            status: '4',
            sort: 1
          }, {
            name: '我申请的',
            type: 'apply',
            status: '1,2,-2',
            from: '2',
            sort: 2
          }, {
            name: '邀请我的',
            type: 'invite',
            status: '0,-1,2',
            from: '1',
            sort: 3
          }
        ];
      };
    };

    // 机构列表-获取学校列表
    $scope.getOrganizationList = function (params) {
      if (!params.page && params.from == 1) $rootScope.setDomPosition(angular.element('#J_school_list ul').scope());
      var current_relations = $scope.all_schools.find(params.status, 'status').relations;
      if (!!current_relations && !params.page) return false;
      $rootScope.toTop();
      var get_config = {
        role: 'teacher',
        status: params.status,
        page: params.page || 1,
        per_page: 8
      };
      if (params.from) get_config.from = params.from;
      CommonProvider.promise({
        model: OrganizationModel,
        method: 'relation',
        params: get_config,
        result: function(relations){
          $scope.all_schools.find(get_config.status, 'status').relations = relations;
        }
      });
    };

    // 退出机构
    $scope.quitOrganization = function (relation) {
      $modal.confirm({
        title: '确认操作',
        message: '你确定要退出这个学校吗？',
        info: '确定要退出吗？退出后不可再次加入',
        button: {
          confirm: '确定',
          cancel: '放弃'
        },
        onsubmit: function () {
          console.log(relation);
          // return false;
          CommonProvider.promise({
            model: OrganizationModel,
            method: 'delRelation',
            params: {
              role: 'user',
              relation_id: relation.relation.id
            },
            success: function(_teacher){
              $scope.all_schools.find(relation.type, 'type').relations.result.remove(relation.relation);
              $modal.success({ message: '操作成功' });
            }
          });
        }
      });
    };

    // 同意邀请，加入机构
    $scope.agreeInviteJoin = function (relation) {
      $modal.confirm({
        title: '确认操作',
        message: '你确定要加入此机构吗？',
        info: '确定要加入吗？加入后将成为此机构老师',
        button: {
          confirm: '确定',
          cancel: '放弃'
        },
        onsubmit: function () {
          console.log(relation);
          // $scope.all_schools.find(relation.type, 'type').relations.result.find(relation.relation).status = 2;
          // return false;
          CommonProvider.promise({
            model: OrganizationModel,
            method: 'putRelation',
            params: {
              role: 'user',
              id: relation.relation.id,
              organization_role: 'teacher',
              body: { status: 2 }
            },
            success: function(_teacher){
              $modal.success({ message: '操作成功' });
              $scope.all_schools.find(relation.type, 'type').relations.result.find(relation.relation).status = 2;
            }
          });
        }
      });
    };

    // 拒绝邀请，不加入机构
    $scope.refuseInviteJoin = function (relation) {
      $modal.confirm({
        title: '确认操作',
        message: '你确定要拒绝此机构吗？',
        info: '确定要拒绝吗？拒绝后再次加入需主动申请',
        button: {
          confirm: '确定',
          cancel: '放弃'
        },
        onsubmit: function () {
          CommonProvider.promise({
            model: OrganizationModel,
            method: 'putRelation',
            params: {
              role: 'user',
              id: relation.relation.id,
              organization_role: 'teacher',
              body: { status: -1 }
            },
            success: function(_teacher){
              $modal.success({ message: '操作成功' });
              $scope.all_schools.find(relation.type, 'type').relations.result.find(relation.relation).status = -1;
            }
          });
        }
      });
    };

    // 获取机构基本信息
    $scope.getOrganizationInfo = function () {
      CommonProvider.promise({
        model: OrganizationModel,
        method: 'item',
        params: { organization_id: $scope.organization_id },
        success: function(organization){
          // console.log(organization);
          $scope.organization.info = organization.result;
          $scope.organization.audit = $scope.organization.info.audit_info;
        }
      });
    };

    // 更新机构基本信息
    $scope.updateOrganizationInfo = function () {
      CommonProvider.promise({
        model: OrganizationModel,
        method: 'put',
        params: { 
          role: 'user',
          new: $scope.organization.info
        },
        success: function(organization){
          $scope.organization.info = organization.result;
          $scope.organization.info_can_edit = false;
          $modal.success({ message: '更新成功' });
          $rootScope.toTop();
        },
        error: function (err) {
          console.log(err);
        }
      });
    };

    // 机构logo上传回调
    $scope.getLogoUpload = function (data) {
      if (data) $scope.organization.info.logo = data.key;
    };

    // Scenery
    $scope.getSceneryUpload = function (data) {
      if (data) $scope.organization.info.scenery = data.key;
    };

    // 营业执照
    $scope.getLicenseUpload = function (data) {
      if (data) $scope.organization.audit.business_license = data.key;
    };

    // 认证身份证
    $scope.getIdCardUpload = function (data) {
      if (data) $scope.organization.audit.id_card = data.key;
    };

    // 教育资质
    $scope.getQualificationUpload = function (data) {
      if (data) $scope.organization.audit.education_qualification = data.key;
    };

    // 获取机构的认证信息
    $scope.getOrganizationAudit = function () {
      CommonProvider.promise({
        model: AuditModel,
        method: 'get',
        params: { 
          role: 'teacher',
          organization_id: $scope.organization_id 
        },
        success: function(audit){
          $scope.organization.audit = audit.result;
        },
        error: function (err) {
          // console.log(err);
        }
      });
    };

    // 更新机构认证信息
    $scope.updateOrganizationAudit = function (callback) {
      CommonProvider.promise({
        model: AuditModel,
        method: 'put',
        params: { 
          role: 'user',
          organization_id: $scope.organization_id,
          body: callback ? $scope.organization : $scope.organization.audit
        },
        success: function(audit){
          if (!!callback) {
            callback(audit);
            return false;
          };
          $scope.organization.audit = audit.result;
          $scope.organization.audit.status = 0;
          $scope.organization.audit_can_edit = false;
          $modal.success({ message: '提交成功' });
          $rootScope.toTop();
        },
        error: function (err) {
          console.log(err);
        }
      });
    };

    // 机构老师初始化
    $scope.initOrganizationTeachers = function () {
      $scope.organization.teacher.types = [
        {
          name: '全部',
          sort: 0
        }, {
          name: '管理员',
          status: '4',
          sort: 1
        }, {
          name: '普通老师',
          status: '2,3',
          sort: 2
        }, {
          name: '待审核',
          status: '1',
          from: '2',
          sort: 3
        }, {
          name: '我已拒绝',
          status: '-2',
          from: '2',
          sort: 4
        }, {
          name: '已邀请',
          status: '0',
          // from: '1',
          sort: 5
        }, {
          name: '邀请失败',
          status: '-1',
          from: '1',
          sort: 6
        }
      ];
      $scope.organization.teacher.act_get = $scope.organization.teacher.types[0];
      $scope.getOrganizationTeachers($scope.organization.teacher.act_get);
    };

    // 获取机构老师
    $scope.getOrganizationTeachers = function (params) {
      $scope.organization.teacher.act_get = params;
      var get_config = {
        per_page: 8,
        role: 'teacher',
        organization_role: 'admin',
        page: params.page || 1,
        organization_id: $scope.organization_id
      };

      // 1/邀请，2/申请
      if (!!params.from) get_config.form = params.from;

      // -1/已拒绝，0/已邀请，1/已申请，2/已加入，3/已申请管理员，4/管理员
      if (params.status != undefined) get_config.status = params.status;

      CommonProvider.promise({
        model: OrganizationModel,
        method: 'relation',
        params: get_config,
        success: function(teachers){
          $scope.organization.teacher.lists = teachers;
        },
        error: function (err) {
          console.log(err);
        }
      });
    };

    // 刷新当前页老师列表
    $scope.refreshOrganizationTeachers = function () {
      $scope.getOrganizationTeachers({
        sort: $scope.organization.teacher.act_get.sort,
        form: $scope.organization.teacher.act_get.form,
        status: $scope.organization.teacher.act_get.status,
        page: $scope.organization.teacher.lists.pagination.current_page
     })
    };

    // 老师管理 - 查看资料（审核资料）
    $scope.checkTeacherInfo = function (params) {
      if (params.modal) {
        $rootScope.organization = $scope.organization;
        $rootScope.teacher_local = params.teacher;
        $rootScope.teacher_check = angular.copy(params.teacher.$parent.teacher);
        $modal.custom({
          title: '查看资料',
          template_url: '/partials/home/teacher/organization/teacher-check.html',
          callback: function () {
            $rootScope.teacher_check = null;
            delete $rootScope.organization;
            delete $rootScope.teacher_local;
          }
        });
      } else {
        CommonProvider.promise({
          model: OrganizationModel,
          method: 'putRelation',
          params: {
            role: 'user',
            id: $rootScope.teacher_check.id,
            organization_role: $rootScope.organization.info.user.id == $rootScope.user.id ? 'founder' : 'admin',
            body: {
              status: params.action ? 2 : -2,
              memo: params.action ? '' : ($rootScope.teacher_check.memo || '')
            }
          },
          success: function(_teacher){
            $rootScope.teacher_local.$parent.teacher.status = params.action ? 2 : -2;
            $rootScope.teacher_local.$parent.teacher.memo = $rootScope.teacher_check.memo;
            $rootScope.modal.close();
          }
        });
      }
    };

    // 老师管理 - 编辑资料
    $scope.editTeacherInfo = function (params) {
      if (params.modal) {
        $rootScope.organization = $scope.organization;
        $rootScope.teacher_local = params.teacher;
        $rootScope.teacher_edit = angular.copy(params.teacher.$parent.teacher);
        $modal.custom({
          title: '查看资料',
          template_url: '/partials/home/teacher/organization/teacher-edit.html',
          callback: function () {
            $rootScope.teacher_edit = null; 
            delete $rootScope.organization;
            delete $rootScope.teacher_local;
          }
        });
      } else {
        CommonProvider.promise({
          model: OrganizationModel,
          method: 'putRelation',
          params: {
            role: 'user',
            id: $rootScope.teacher_edit.id,
            organization_role: $rootScope.organization.info.user.id == $rootScope.user.id ? 'founder' : 'admin',
            body: {
              title: $rootScope.teacher_edit.title,
              introduction: $rootScope.teacher_edit.introduction
            }
          },
          success: function(teacher){
            $rootScope.teacher_local.$parent.teacher = teacher.result;
            $rootScope.modal.close();
          }
        });
      }
    };

    // 老师管理 - 设置管理员
    $scope.addTeacherAdmin = function (teacher) {
      $modal.confirm({
        title: '确认操作',
        message: '你确定要设置“'+ teacher.user.rel_name +'”为管理员吗？',
        info: '设置后“'+ teacher.user.rel_name +'”即拥有操作普通老师的权限',
        button: {
          confirm: '确定',
          cancel: '取消'
        },
        onsubmit: function () {
          CommonProvider.promise({
            model: OrganizationModel,
            method: 'putRelation',
            params: {
              role: 'user',
              id: teacher.id,
              organization_role: $scope.organization.info.user.id == $rootScope.user.id ? 'founder' : 'admin',
              body: { status: 4 }
            },
            success: function(_teacher){
              $scope.organization.teacher.lists.result.find(teacher).status = 4;
            }
          });
        }
      });
    };

    // 老师管理 - 取消管理员
    $scope.delTeacherAdmin = function (teacher) {
      $modal.confirm({
        title: '确认操作',
        message: '你确定要取消“' + teacher.user.rel_name + '”管理员吗？',
        info: '取消后“'+ teacher.user.rel_name + '”将仅拥有普通老师的身份',
        button: {
          confirm: '确定',
          cancel: '取消'
        },
        onsubmit: function () {
          CommonProvider.promise({
            model: OrganizationModel,
            method: 'putRelation',
            params: {
              role: 'user',
              id: teacher.id,
              organization_role: $scope.organization.info.user.id == $rootScope.user.id ? 'founder' : 'admin',
              body: { status: 2 }
            },
            success: function(_teacher){
              $scope.organization.teacher.lists.result.find(teacher).status = 2;
            }
          });
        }
      });
    };

    // 老师管理 - 转让创始人
    $scope.attornFounder = function (teacher) {
      $modal.confirm({
        title: '确认操作',
        message: '确定要转让身份吗？',
        info: '确定要转让创始人给“'+ teacher.user.rel_name +'”吗？转让后您将成为普通老师（无管理权限），且无法回退操作',
        button: {
          confirm: '确定',
          cancel: '放弃'
        },
        onsubmit: function () {
          CommonProvider.promise({
            model: OrganizationModel,
            method: 'putRelation',
            params: {
              role: 'user',
              id: teacher.id,
              organization_role: $scope.organization.info.user.id == $rootScope.user.id ? 'founder' : 'admin',
              body: { status: 5 }
            },
            success: function(_teacher){
              $scope.getOrganizationInfo();
              $scope.refreshOrganizationTeachers();
            }
          });
        }
      });
    };

    // 老师管理 - 删除老师
    $scope.delTeacher = function (teacher) {
      $modal.confirm({
        title: '确认操作',
        message: '你确定要删除老师吗？',
        info: '你确定要删除老师'+ teacher.user.rel_name +'吗？删除后老师即不再与本机构有任何关系',
        button: {
          confirm: '确定',
          cancel: '放弃'
        },
        onsubmit: function () {
          CommonProvider.promise({
            model: OrganizationModel,
            method: 'delRelation',
            params: {
              role: 'user',
              relation_id: teacher.id,
              organization_role: $scope.organization.info.user.id == $rootScope.user.id ? 'founder' : 'admin'
            },
            success: function(_teacher){
              $scope.refreshOrganizationTeachers();
            }
          });
        }
      });
    };

    // 机构管理 - 邀请老师
    $scope.inviteTeacher = function (params) {
      if (params.modal) {
        $rootScope.organization = $scope.organization;
        $modal.custom({
          title: '邀请老师',
          template_url: '/partials/home/teacher/organization/teacher-invite.html',
          callback: function () {
            $rootScope.organization = null;
          }
        });
      } else {
        CommonProvider.promise({
          model: OrganizationModel,
          method: 'addRelation',
          params: {
            type: 'invite',
            body: {
              organization_id: $scope.organization_id,
              phone: params.phone,
            }
          },
          success: function(_teacher){
            $rootScope.modal.close();
            $modal.success({ message: '邀请成功' });
          },
          error: function (result) {
            $rootScope.modal.close();
            $modal.error({ message: result.message });
          }
        });
      }
    };

    // 机构管理-管理员再次邀请老师
    $scope.againInviteTeacher = function (teacher) {
      $modal.confirm({
        title: '确认操作',
        message: '确定要邀请老师' + teacher.user.rel_name + '吗？',
        button: {
          confirm: '确定',
          cancel: '放弃'
        },
        onsubmit: function () {
          CommonProvider.promise({
            model: OrganizationModel,
            method: 'putRelation',
            params: {
              role: 'user',
              id: teacher.id,
              organization_role: $scope.organization.info.user.id == $rootScope.user.id ? 'founder' : 'admin',
              body: { status: 0 }
            },
            success: function(_teacher){
              $scope.organization.teacher.lists.result.find(teacher).status = 0;
            }
          });
        }
      });
    };

    // 机构管理-获取机构的所有公告
    $scope.getAnnouncement = function (params) {
      CommonProvider.promise({
        model: AnnouncementModel,
        method: 'get',
        params: {
          role: 'teacher',
          organization_id: $scope.organization_id,
          type: 1,
          per_page: 12,
          page: params.page || 1
        },
        success: function(announcements){
          $rootScope.toTop();
          $scope.organization.announcements = announcements;
        }
      });
    };

    // 机构管理 - 删除公告
    $scope.delAnnouncement = function (announcement) {
      $modal.confirm({
        title: '确认操作',
        message: '你确定要删除公告吗？',
        info: '你确定要删除公告“'+ announcement.title +'”吗？删除后不可恢复',
        button: {
          confirm: '确定',
          cancel: '放弃'
        },
        onsubmit: function () {
          CommonProvider.promise({
            model: AnnouncementModel,
            method: 'del',
            params: {
              role: 'user',
              announcement_id: announcement.id
            },
            success: function(announcements){
              $scope.organization.announcements.result.remove(announcement);
              $scope.organization.announcements.pagination.total -= 1;
            }
          });
        }
      });
    };

    // 机构管理 - 编辑公告
    $scope.editAnnouncement = function (params) {
      if (params.modal) {
        $rootScope.announcement_local = params.announcement;
        $rootScope.announcement_edit = angular.copy(params.announcement.announcement);
        $modal.custom({
          title: '编辑公告',
          template_url: '/partials/home/teacher/organization/announcement-edit.html',
          callback: function () {
            $rootScope.announcement_edit = null;
            delete $rootScope.announcement_local;
          }
        });
      } else {
        CommonProvider.promise({
          model: AnnouncementModel,
          method: 'put',
          params: {
            role: 'user',
            body: $rootScope.announcement_edit
          },
          success: function(_announcement){
            $rootScope.announcement_local.announcement = _announcement.result;
            $rootScope.modal.close();
            $modal.success({ message: '更新成功' });
          }
        });
      }
    };

    // 机构管理 - 发布公告
    $scope.addAnnouncement = function (params) {
      if (params.modal) {
        $rootScope.organization = $scope.organization;
        $rootScope.announcement_edit = {};
        $modal.custom({
          title: '编辑公告',
          template_url: '/partials/home/teacher/organization/announcement-edit.html',
          callback: function () {
            $rootScope.announcement_edit = null;
            delete $rootScope.organization;
          }
        });
      } else {
        CommonProvider.promise({
          model: AnnouncementModel,
          method: 'add',
          params: { 
            role: 'user',
            body: {
              organization_id: $scope.organization_id,
              type: 1,
              title: $rootScope.announcement_edit.title,
              content: $rootScope.announcement_edit.content
            }
          },
          success: function(_announcement){
            $rootScope.organization.announcements.result.unshift(_announcement.result);
            $rootScope.organization.announcements.pagination.total += 1;
            $rootScope.modal.close();
            $modal.success({ message: '添加成功' });
          }
        });
      }
    };

    // 机构管理-获取机构主题模板
    $scope.getThemeTemplate = function () {
      $rootScope.getConfig({
        name: 'ORGANIZATION_THEME',
        success: function(theme){
          $scope.organization.theme = theme.result;
        }
      });
    };

    // 机构管理-设置机构主题模板及banner
    $scope.setThemeTemplate = function () {
      CommonProvider.promise({
        model: OrganizationModel,
        method: 'putProfile',
        params: { 
          role: 'user',
          organization_id: $scope.organization_id,
          body: {
            index_template: $scope.organization.info.profile.index_template,
            big_banner: $scope.organization.info.profile.big_banner,
            is_blur: Number($scope.organization.info.profile.is_blur) || 0
          }
        },
        success: function(_theme){
          $modal.success({ message: '更新成功' });
        }
      });
    };

    // big_banner
    $scope.getBigBannerUpload = function (data) {
      if (data) $scope.organization.info.profile.big_banner = data.key;
    };

    // 初始化机构创建流程
    $scope.initCreateOrganization = function () {

      // 初始化
      $scope.createOrganization = {};

      // 流程
      $scope.createOrganization.step = {
        is_read: false,
        is_agree: false,
        is_submit: false,
        can_audit: 1,
        is_audit: false,
        current: 1,
        success: false
      };

      // 获取所需数据
      $scope.getLicense();
      $scope.getOrganizationCate();
    };

    // 创建机构 - 获取学校类型
    $scope.getOrganizationCate = function () {
      CommonProvider.promise({
        model: CategoryModel,
        method: 'get',
        params: {
          role: 'student',
          type: 2
        },
        success: function(cates){
          $scope.createOrganization.cates = cates.result;
        }
      });
    };

    // 创建机构-学校分类选择变化
    $scope.changeOrganizationCate = function () {
      var current_cate = $scope.createOrganization.cates.find($scope.organization.category_id, 'id');
      $scope.createOrganization.step.can_audit = current_cate.can_audit;
      if (!current_cate.can_audit) $scope.createOrganization.step.is_audit = false;
    };

    // 创建机构-获取入驻协议
    $scope.getLicense = function () {
      $rootScope.getConfig({
        name: 'CREATE_ORGANIZATION_LICENSE',
        success: function(license){
          $scope.createOrganization.license = license.result.value;
        }
      });
    };

    // 创建机构- 添加学校 [下一步] 逻辑
    $scope.createOrganizationNext = function () {
      var current_step = $scope.createOrganization.step.current;
      if (current_step == 1) {
        $scope.organization.url = 'http://';
        $scope.createOrganization.step.current = 2;
        $scope.createOrganization.step.is_agree = true;
      };
      if (current_step == 2) {
        $scope.postOrganization();
      };
    };

    // 上传图片
    // 机构logo上传回调
    $scope.addLogoUpload = function (data) {
      if (data) $scope.organization.logo = data.key;
    };

    // Scenery
    $scope.addSceneryUpload = function (data) {
      if (data) $scope.organization.scenery = data.key;
    };

    // 营业执照
    $scope.addLicenseUpload = function (data) {
      if (data) $scope.organization.business_license = data.key;
    };

    // 认证身份证
    $scope.addIdCardUpload = function (data) {
      if (data) $scope.organization.id_card = data.key;
    };

    // 老师身份证
    $scope.addIdentityUpload = function (data) {
      if (data) $scope.organization.id_card = data.key;
    };

    // 教育资质
    $scope.addQualificationUpload = function (data) {
      if (data) $scope.organization.education_qualification = data.key;
    };

    // 验证机构名称
    $scope.checkNameValid = function (name) {
      if (!name) return false;
      CommonProvider.promise({
        model: SearchModel,
        method: 'get',
        params: {
          keyword: name,
          detail: 1,
          only_name: 1,
          search_type: 'organization',
          per_page: 200,
          page: 1
        },
        success: function (organizations) {
          var orgs = organizations.result;
          if (!orgs.length) { $scope.organization.name_is_valid = true };
          if (orgs.length) { 
            $scope.organization.name_is_valid = true;
            orgs.forEach(function (org) {
              if (name == org.name) { $scope.organization.name_is_valid = false; }
            });
          };
        }
      });
    };

    // 创建机构-添加新的学校
    $scope.postOrganization = function () {
      CommonProvider.promise({
        model: OrganizationModel,
        method: 'add',
        params: $scope.organization,
        success: function(organization){
          $scope.organization_id = organization.result.id;
          var success = function () {
            $scope.createOrganization.step.is_submit = true;
            $scope.createOrganization.step.current = 3;
            $rootScope.toTop();
          };
          if (!!$scope.createOrganization.step.is_audit) {
            $scope.updateOrganizationAudit(function () {
              success();
            });
          } else {
            success();
          }
        },
        result: function (res) {
          if (res.code == 0) $modal.error({ message: err.message });
        }
      });
    };

    // 搜索机构初始化
    $scope.searchBoxInit = function () {
      $scope.organization.keyword = '';
      $scope.organization.lists = {};
    };

    // 加入机构 - 搜索格式化
    $scope.searchFormat = function (keyword) {

      // 去除非中文&空格
      $scope.organization.keyword = keyword == null ? '' : keyword.replace(/[^\u4E00-\u9FA5\uf900-\ufa2d]/g,'').replace(/\s+/g,'').replace(/(^\s+)|(\s+$)/g,'');
    }

    // 机构联想搜索
    $scope.searchSuggest = function(keyword) {
      return CommonProvider.request({
        method: 'get',
        service: new SearchService(),
        params: {
          keyword: keyword,
          only_name: 1,
          search_type: 'organization',
        }
      }).then(function(res){
        return res.result;
      });
    };

    // 机构搜索
    $scope.searchOrganiztion = function (params) {
      if (!$scope.organization.keyword) return false;
      CommonProvider.promise({
        model: SearchModel,
        method: 'get',
        params: {
          keyword: $scope.organization.keyword,
          only_name: 1,
          search_type: 'organization',
          per_page: 8,
          page: params.page || 1
        },
        success: function (orgs) {
          $scope.organization.lists = orgs;
        }
      });
    };

    // 加入机构初始化
    $scope.joinOrganizationInit = function () {
      if (!$scope.teacher) $scope.teacher = {};
      $scope.getOrganizationInfo();
      AuthProvider.init(function (user) {
        $scope.teacher.rel_name = user.profile.rel_name;
        $scope.teacher.phone = user.phone;
        $scope.teacher.id_card_pic = user.profile.id_card_pic;
      });
    };

    // 老师身份证更新
    $scope.getIdentityUpload = function (data) {
      if (data) $scope.teacher.id_card_pic = data.key;
      CommonProvider.promise({
        model: StudentModel,
        method: 'put',
        params: {
          id_card_pic: $scope.teacher.id_card_pic
        },
        success: function (user) {
          $rootScope.user.profile.id_card_pic = $scope.teacher.id_card_pic;
          $localStorage.user.profile.id_card_pic = $scope.teacher.id_card_pic;
        }
      });
    };

    // 老师操作-申请加入机构
    $scope.joinOrganization = function () {
      CommonProvider.promise({
        model: OrganizationModel,
        method: 'addRelation',
        params: {
          type: 'apply',
          body: {
            organization_id: $scope.organization_id,
            phone: $scope.teacher.phone,
            title: $scope.teacher.title,
            introduction: $scope.teacher.introduction,
            status: 1,
          }
        },
        success: function(_teacher){
          $modal.success({ message: '申请成功' });
          $location.path('teacher/organization/list').search({ 'tab': 3 });
        },
        error: function (result) {
          // $rootScope.modal.close();
          $modal.error({ message: result.message });
        }
      });
    };

  }
]);
/**
*
* AdvertiseService Module
*
* Description
*
*/
angular.module('AdvertiseService', [])
.service('AdvertiseService', ['$resource', 'appConfig',
  function($resource, appConfig){
    return $resource(appConfig.apiUrl + '/advertise', {}, {

      // item
      item: {
        method: 'GET',
        url: appConfig.apiUrl + '/advertise/:advertise_id'
      },

      // del
      del: {
        method: 'DELETE',
        url: appConfig.apiUrl + '/advertise/:advertise_id'
      },

      // put
      put: {
        method: 'PUT',
        url: appConfig.apiUrl + '/advertise/:advertise_id'
      },

    });
  }
]);
/**
*
* AnnouncementService Module
*
* Description
*
*/
angular.module('AnnouncementService', [])
.service('AnnouncementService', ['$resource', 'appConfig',
  function ($resource, appConfig) {
    return $resource(appConfig.apiUrl + '/announcement', {}, {


      put: {
        method: 'PUT',
        url: appConfig.apiUrl + '/announcement/:announcement_id'
      },

      del: {
        method: 'DELETE',
        url: appConfig.apiUrl + '/announcement/:announcement_id'
      },

    })
  }
]);
/**
*
* ArticleService Module
*
* Description
*
*/
angular.module('ArticleService', [])
.service('ArticleService', ['$resource', 'appConfig',
  function($resource, appConfig){
    return $resource(appConfig.apiUrl + '/article', {}, {

      // item
      item: {
        method: 'GET',
        url: appConfig.apiUrl + '/article/:article_id'
      },

      // put
      put: {
        method: 'PUT',
        url: appConfig.apiUrl + '/article/:article_id'
      },

      // search
      search: {
        method: 'GET',
        url: appConfig.apiUrl + '/article/search'
      },

      // 批量禁用
      disable: {
        method: 'PUT',
        url: appConfig.apiUrl + '/article/disable'
      },

      // 批量启用
      enable: {
        method: 'PUT',
        url: appConfig.apiUrl + '/article/enable'
      },

    });
  }
]);
/**
*
* AuditService Module
*
* Description
*
*/
angular.module('AuditService', [])
.service('AuditService', ['$resource', 'appConfig',
  function ($resource, appConfig) {
    return $resource(appConfig.apiUrl + '/organization/audit_infos', {}, {

      // put
      put: {
        method: 'PUT',
        url: appConfig.apiUrl + '/organization/:organization_id/audit_info'
      },

      // item
      item: {
        method: 'GET',
        url: appConfig.apiUrl + '/organization/:organization_id/audit_info'
      },

      // 修改机构认证
      put: {
        method: 'PUT',
        url: appConfig.apiUrl + '/organization/:organization_id/audit_info'
      },

    })
  }
]);
/*
*
* 会员服务模块 
*
* Description
*
*/
angular.module('AuthService', [])

.service('AuthService', ['$resource', 'appConfig',
  function ($resource, appConfig) {
    return $resource(appConfig.apiUrl + '/account/login', {}, {

      // 登录
      login: {
        method: 'POST',
        url: appConfig.apiUrl + '/account/login'
      },

      // 退出
      logout: {
        method: 'GET',
        url: appConfig.apiUrl + '/account/logout'
      },

      // 注册
      register: {
        method: 'POST',
        url: appConfig.apiUrl + '/account/register'
      },

      // 找回密码
      forgot: {
        method: 'PUT',
        url: appConfig.apiUrl + '/account/password/forget'
      },

      // 修改密码
      reset: {
        method: 'PUT',
        url: appConfig.apiUrl + '/account/password/reset'
      },

      // 检查登录
      check: {
        method: 'GET',
        url: appConfig.apiUrl + '/account/probe_login'
      },

      // 获取权限（菜单）
      menu: {
        method: 'GET',
        url: appConfig.apiUrl + '/account/menu'
      },

      // 获取账户绑定列表
      getThirds: {
        method: 'GET',
        url: appConfig.apiUrl + '/account/social'
      },

      // 第三方登录
      thirdLogin: {
        method: 'GET',
        url: appConfig.apiUrl + '/account/social/login/:type'
      },

      // 第三方绑定
      thirdBind: {
        method: 'POST',
        url: appConfig.apiUrl + '/account/social/:type'
      },

      // 第三方解绑
      thirdUnbind: {
        method: 'DELETE',
        url: appConfig.apiUrl + '/account/social/:id'
      },
      
    });
  }
]);
/**
*
* BankService Module
*
* Description
*
*/
angular.module('BankService', [])
.service('BankService', ['$resource', 'appConfig',
  function($resource, appConfig){
    return $resource(appConfig.apiUrl + '/bank_account', {}, {

      // 删除银行账户
      del: {
        method: 'DELETE',
        url: appConfig.apiUrl + '/bank_account/:bank_id'
      },

      // 获取银行信息
      getInfo: {
        method: 'GET',
        url: appConfig.apiUrl + '/card_info'
      },

    });
  }
]);
/**
* CategoryService Module
*
* Description
*/
angular.module('CategoryService', [])

.service('CategoryService', ['$resource', 'appConfig',
  function($resource, appConfig){
    return $resource(appConfig.apiUrl + '/category', {
        per_page: '@per_page',
        page: '@page',
      }, {

      // 根据id获取子分类
      getChildrens: {
        method: 'GET',
        url: appConfig.apiUrl + '/category/:category_id'
      },

      // 编辑分类
      put: {
        method: 'PUT',
        url: appConfig.apiUrl + '/category/:category_id'
      },

      // 删除分类
      del: {
        method: 'DELETE',
        url: appConfig.apiUrl + '/category/:category_id'
      },

      // 批量禁用
      disable: {
        method: 'PUT',
        url: appConfig.apiUrl + '/category/disable'
      },

      // 批量启用
      enable: {
        method: 'PUT',
        url: appConfig.apiUrl + '/category/enable'
      },

      // 批量操作
      sort: {
        method: 'PUT',
        url: appConfig.apiUrl + '/category'
      }


    });
  }
]);
/**
*
* ChatService Module
*
* Description
*
*/
angular.module('ChatService', [])
.service('ChatService', ['$resource', 'appConfig',
  function ($resource, appConfig) {
    return $resource(appConfig.apiUrl + '/chat/record/:section_id', {}, {

      // Example
      /*
      get: {
        method: 'GET',
        url: appConfig.apiUrl + '/chat_message/:type'
      }
      */
      
    });
  }
])
/**
*
* CommentService Module
*
* Description
*
*/
angular.module('CommentService', [])
.service('CommentService', ['$resource', 'appConfig',
  function ($resource, appConfig) {
    return $resource(appConfig.apiUrl + '/course_comment', {}, {

      // 删除
      del: {
        method: 'DELETE',
        url: appConfig.apiUrl + '/course_comment/:comment_id'
      },

    });
  }
])
/*
*
* 全局服务模块 
*
* Description
*
*/
angular.module('CommonService', [])

.service('CommonService', ['$resource', 'appConfig',
  function ($resource, appConfig) {
    return $resource(appConfig.apiUrl + '/', {}, {

      // 获取短信
      sms: {
        method: 'GET',
        url: appConfig.apiUrl + '/sms/verify_code/:rule/:phone'
      },

      // 获取树形地区
      area: {
        method: 'GET',
        url: appConfig.apiUrl + '/area'
      },

      // 获取配置
      config: {
        method: 'GET',
        url: appConfig.apiUrl + '/config'
      },

      // 获取配置（通过别名）
      configByName: {
        method: 'GET',
        url: appConfig.apiUrl + '/config/name/:name'
      },

      /*

      // 更新token（延时）
      update_token: {
        method: 'GET',
        url: appConfig.apiUrl + '/user/refresh_token'
      },

      // 获取一个资源
      getResource: {
        method: 'GET',
        url: appConfig.fileUrl + '/:url'
      },

      // 轮询消息提示
      get_msg_count: {
        method: 'GET',
        params: {
          token: '@token'
        },
        url: appConfig.apiUrl + '/user/unread_count'
      }

      */
      
    });
  }
]);
/*
*
* 系统服务模块 
*
* Description
*
*/
angular.module('ConfigService', [])

// 系统配置资源服务
.service('SystemService', ['$resource', 'appConfig',
  function ($resource, appConfig) {
    return $resource(appConfig.apiUrl + '/config', {}, {

      // put
      putGroup: {
        method: 'PUT',
        url: appConfig.apiUrl + '/config'
      },

      // put
      putItem: {
        method: 'PUT',
        url: appConfig.apiUrl + '/config/:config_id'
      },

      // del
      del: {
        method: 'DELETE',
        url: appConfig.apiUrl + '/config/:config_id'
      }
      
    });
  }
])

// Log资源服务
.service('LogService', ['$resource', 'appConfig',
  function ($resource, appConfig) {
    return $resource(appConfig.apiUrl + '/log', {}, {

      // 清空日志
      clear: {
        method: 'DELETE',
        url: appConfig.apiUrl + '/log/all'
      }
    });
  }
])
/**
*
* CourseService Module
*
* Description
*
*/
angular.module('CourseService', [])
.service('CourseService', ['$resource', 'appConfig',
  function ($resource, appConfig) {
    return $resource(appConfig.apiUrl + '/course', {
        per_page: '@per_page',
        page: '@page',
      }, {

      // info
      getUsersInfo: {
        method: 'POST',
        url: appConfig.apiUrl + '/user/info'
      },

      // item
      item: {
        method: 'GET',
        url: appConfig.apiUrl + '/course/:course_id'
      },

      // search
      search: {
        method: 'GET',
        url: appConfig.apiUrl + '/course/search/'
      },

      // del
      del: {
        method: 'DELETE',
        url: appConfig.apiUrl + '/course/:course_id'
      },

      // put
      put: {
        method: 'PUT',
        url: appConfig.apiUrl + '/course/:course_id'
      },

      // 批量禁用
      disable: {
        method: 'PUT',
        url: appConfig.apiUrl + '/course/disable'
      },

      // 批量启用
      enable: {
        method: 'PUT',
        url: appConfig.apiUrl + '/course/enable'
      },
      
      // 相关课程
      others: {
        method: 'GET',
        url: appConfig.apiUrl + '/course/:course_id/others'
      },

      // 同学
      classmates: {
        method: 'GET',
        url: appConfig.apiUrl + '/course/:course_id/classmates'
      },

      // 关系
      relation: {
        method: 'GET',
        url: appConfig.apiUrl + '/course/:course_id/with/user'
      },

      // 试听记录
      operation: {
        method: 'POST',
        url: appConfig.apiUrl + '/course/:course_id/operation'
      },

    });
  }
])
/**
*
* FavoriteService Module
*
* Description
*
*/
angular.module('FavoriteService', [])
.service('FavoriteService', ['$resource', 'appConfig',
  function ($resource, appConfig) {
    return $resource(appConfig.apiUrl + '/favorite/:type/:target_id', {}, {

      // 获取收藏列表
      get: {
        method: 'GET',
        url: appConfig.apiUrl + '/favorite/:type'
      },

      // 获取收藏状态
      getStatus: {
        method: 'GET',
        url: appConfig.apiUrl + '/favorite/:type/status'
      }
      
    });
  }
])
/**
*
* FeedbackService Module
*
* Description
*
*/
angular.module('FeedbackService', [])
.service('FeedbackService', ['$resource', 'appConfig',
  function ($resource, appConfig) {
    return $resource(appConfig.apiUrl + '/feedback', {}, {

      // 获取单条反馈
      item: {
        method: 'GET',
        url: appConfig.apiUrl + '/feedback/:feedback_id'
      },

      // 修改单条反馈
      put: {
        method: 'PUT',
        url: appConfig.apiUrl + '/feedback/:feedback_id'
      },

      // 删除单条反馈
      del: {
        method: 'DELETE',
        url: appConfig.apiUrl + '/feedback/:feedback_id'
      },

    })
  }
]);
/**
*
* FileService Module
*
* Description
*
*/
angular.module('FileService', [])
.service('FileService', ['$resource', 'appConfig',
  function ($resource, appConfig) {
    return $resource(appConfig.apiUrl + '/file/:type', {
        type: '@type'
      }, {

      getFileUptoken: {
        method: 'GET',
        params: {token: '@token'},
        url: appConfig.apiUrl + '/file/file_uptoken'
      },
      getVideoUptoken: {
        method: 'GET',
        params: {token: '@token'},
        url: appConfig.apiUrl + '/file/video_uptoken/:key'
      }

    });
  }
]);
/**
*
* IndexService Module
*
* Description
*/
angular.module('IndexService', [])
.service('IndexService', ['$resource', 'appConfig',
  function($resource, appConfig){
    return $resource(appConfig.apiUrl + '/index', {}, {

      // 获取合作机构
      partners: {
        method: 'GET',
        url: appConfig.apiUrl + '/partner'
      },

      // 修改配置
      put: {
        method: 'PUT',
        url: appConfig.apiUrl + '/index/:config_id'
      },


    });
  }
]);
/**
*
* LinkService Module
*
* Description
*
*/
angular.module('LinkService', [])
.service('LinkService', ['$resource', 'appConfig',
  function ($resource, appConfig) {
    return $resource(appConfig.apiUrl + '/link', {}, {

      // 获取单个链接
      item: {
        method: 'GET',
        url: appConfig.apiUrl + '/link/:link_id'
      },

      // 修改单个链接
      put: {
        method: 'PUT',
        url: appConfig.apiUrl + '/link/:link_id'
      },

      // 删除单个链接
      del: {
        method: 'DELETE',
        url: appConfig.apiUrl + '/link/:link_id'
      },

    })
  }
]);
/**
*
* MsgService Module
*
* Description
*
*/
angular.module('MsgService', [])
.service('MsgService', ['$resource', 'appConfig',
  function($resource, appConfig){
    return $resource(appConfig.apiUrl + '/message', {
        per_page: '@per_page',
        page: '@page' 
      }, {

      // 批量操作
      batch: {
        method: 'PUT',
        url: appConfig.apiUrl + '/message/:act_type'
      }

    });
  }
]);
/**
*
* NoteService Module
*
* Description
*
*/
angular.module('NoteService', [])
.service('NoteService', ['$resource', 'appConfig',
  function ($resource, appConfig) {
    return $resource(appConfig.apiUrl + '/note', {}, {

      // 获取单条笔记
      item: {
        method: 'GET',
        url: appConfig.apiUrl + '/note/:note_id'
      },

      // 搜索笔记
      search: {
        method: 'GET',
        url: appConfig.apiUrl + '/note/search'
      },

      // 删除单条笔记
      del: {
        method: 'DELETE',
        url: appConfig.apiUrl + '/note/:note_id'
      },

      // 更新单条笔记
      put: {
        method: 'PUT',
        url: appConfig.apiUrl + '/note/:note_id'
      },

    });
  }
])
/**
*
* OrganizationService Module
*
* Description
*
*/
angular.module('OrganizationService', [])
.service('OrganizationService', ['$resource', 'appConfig',
  function($resource, appConfig){
    return $resource(appConfig.apiUrl + '/organization', {
        per_page: '@per_page',
        page: '@page' 
      }, {

      // 获取老师机构关系
      relation: {
        method: 'GET',
        url: appConfig.apiUrl + '/organization_user'
      },

      // 机构教师详情
      itemRelation: {
        method: 'GET',
        url: appConfig.apiUrl + '/organization_user/:relation_id'
      },

      // 增加老师机构关系
      addRelation: {
        method: 'POST',
        url: appConfig.apiUrl + '/organization_user'
      },

      // 修改老师机构关系
      putRelation: {
        method: 'PUT',
        url: appConfig.apiUrl + '/organization_user/:relation_id'
      },

      // 删除老师机构关系
      delRelation: {
        method: 'DELETE',
        url: appConfig.apiUrl + '/organization_user/:relation_id'
      },

      // item
      item: {
        method: 'GET',
        url: appConfig.apiUrl + '/organization/:organization_id'
      },

      // search
      search: {
        method: 'GET',
        url: appConfig.apiUrl + '/organization/search'
      },

      // get profile
      getProfile: {
        method: 'GET',
        url: appConfig.apiUrl + '/organization/:organization_id/profile'
      },

      // put profile
      putProfile: {
        method: 'PUT',
        url: appConfig.apiUrl + '/organization/:organization_id/profile'
      },

      // put
      put: {
        method: 'PUT',
        url: appConfig.apiUrl + '/organization/:organization_id'
      },

      // del
      del: {
        method: 'DELETE',
        url: appConfig.apiUrl + '/organization/:organization_id'
      },

    });
  }
]);
/**
*
* PartnerService Module
*
* Description
*
*/
angular.module('PartnerService', [])
.service('PartnerService', ['$resource', 'appConfig',
  function ($resource, appConfig) {
    return $resource(appConfig.apiUrl + '/partner', {}, {

      // 修改单个入驻机构
      put: {
        method: 'PUT',
        url: appConfig.apiUrl + '/partner/:partner_id'
      },

      // 删除单个入驻机构
      del: {
        method: 'DELETE',
        url: appConfig.apiUrl + '/partner/:partner_id'
      },

    })
  }
]);
/**
* TradeService Module
*
* Description
*
*/
angular.module('PaymentService', [])

.service('PaymentService', ['$resource', 'appConfig',
  function($resource, appConfig){
    return $resource(appConfig.apiUrl + '/payment', {}, {

      // 生成支付订单
      pay: {
        method: 'POST',
        url: appConfig.apiUrl + '/payment'
      },

      // 获取支付结果
      getStatus: {
        method: 'GET',
        url: appConfig.apiUrl + '/payment/:payment_id'
      },

      // 实际支付
      payment: {
        method: 'PUT',
        url: appConfig.apiUrl + '/payment/:payment_id'
      },

      // 支付单详情
      item: {
        method: 'GET',
        url: appConfig.apiUrl + '/payment/:payment_id'
      },

      // 删除支付单
      del: {
        method: 'DELETE',
        url: appConfig.apiUrl + '/payment/:payment_id'
      },

    });
  }
]);
/**
*
* PublicService Module
*
* Description
*
*/
angular.module('PublicService', [])
.service('PublicService', ['$resource', 'appConfig',
  function ($resource, appConfig) {
    return $resource(appConfig.apiUrl + '/', {}, {

      // 清空缓存
      clearcache: {
        method: 'DELETE',
        url: appConfig.apiUrl + '/cache/:tag'
      },

    })
  }
]);
/**
*
* QuestionService Module
*
* Description
*
*/
angular.module('QuestionService', [])
.service('QuestionService', ['$resource', 'appConfig',
  function ($resource, appConfig) {
    return $resource(appConfig.apiUrl + '/question', {}, {

      // 获取单条问答
      item: {
        method: 'GET',
        url: appConfig.apiUrl + '/question/:question_id'
      },

      // 搜索问答
      search: {
        method: 'GET',
        url: appConfig.apiUrl + '/question/search'
      },

      // 删除单条问答
      del: {
        method: 'DELETE',
        url: appConfig.apiUrl + '/question/:question_id'
      },

      // 更新单条问答
      put: {
        method: 'PUT',
        url: appConfig.apiUrl + '/question/:question_id'
      },

    });
  }
])
/**
*
* ScoreService Module
*
* Description
*
*/
angular.module('ScoreService', [])
.service('ScoreService', ['$resource', 'appConfig',
  function ($resource, appConfig) {
    return $resource(appConfig.apiUrl + '/score', {}, {

      // 获取积分等级
      getLevels: {
        method: 'GET',
        url: appConfig.apiUrl + '/score_level'
      },

      // 获取积分规则
      getRules: {
        method: 'GET',
        url: appConfig.apiUrl + '/score_rule'
      },

    });
  }
]);
/**
*
* SearchService Module
*
* Description
*
*/
angular.module('SearchService', [])
.service('SearchService', ['$resource', 'appConfig',
  function ($resource, appConfig) {
    return $resource(appConfig.apiUrl + '/search/:search_type', {
      key: '@search_type'
    }, {

      // 全局搜索
      get: {
        method: 'GET',
        params: {
          page: '@page',
          detail: '@detail',
          keyword: '@keyword',
          per_page: '@per_page',
          category_id: '@category_id',
          sort_id: '@sort_id',
          labels: '@labels'
        },
        headers: { 'Content-Type': 'application/x-www-form-encoded;charset=UTF-8' }
      },

      // 获取搜索热词
      getHotWords: {
        method: 'GET',
        url: appConfig.apiUrl + '/search/hot'
      },

      // 保存搜索热词
      putHotWords: {
        method: 'PUT',
        url: appConfig.apiUrl + '/search/hot'
      },

      // 索引初始化
      searchInit: {
        method: 'GET',
        url: appConfig.apiUrl + '/search/:type/init'
      },

      // 清空索引
      searchClean: {
        method: 'GET',
        url: appConfig.apiUrl + '/search/:type/clean'
      },

    });
  }
]);
/**
*
* SectionService Module
*
* Description
*
*/
angular.module('SectionService', [])
.service('SectionService', ['$resource', 'appConfig',
  function ($resource, appConfig) {
    return $resource(appConfig.apiUrl + '/section', {}, {

      // 修改资源
      update: {
        method: 'PUT',
        url: appConfig.apiUrl + '/section'
      },

      // item
      item: {
        method: 'GET',
        url: appConfig.apiUrl + '/section/:section_id'
      },

      // 修改章节
      put: {
        method: 'PUT',
        url: appConfig.apiUrl + '/section/:section_id'
      },

      // 删除章节
      del: {
        method: 'DELETE',
        url: appConfig.apiUrl + '/section/:section_id'
      },

      // 更新学习记录
      postStudyRecord: {
        method: 'POST',
        url: appConfig.apiUrl + '/section/:section_id/study_record'
      },

      // 获取视频地址
      getVideos: {
        method: 'GET',
        url: appConfig.apiUrl + '/section/:section_id/videos'
      },

      // 获取问答列表
      getQuestions: {
        method: 'GET',
        url: appConfig.apiUrl + '/section/:section_id/questions'
      },

      // 初始化直播间
      initLiveSection: {
        method: 'GET',
        url: appConfig.apiUrl + '/section/:section_id/live_init'
      },

      // 关闭直播间
      closeLiveSection: {
        method: 'GET',
        url: appConfig.apiUrl + '/section/:section_id/live_finish'
      },

      // 获取推流地址
      getLiveUpstream: {
        method: 'GET',
        url: appConfig.apiUrl + '/section/:section_id/live_upstream'
      },

    })
  }
]);
/**
*
* SmsService Module
*
* Description
*
*/
angular.module('SmsService', [])
.service('SmsService', ['$resource', 'appConfig',
  function($resource, appConfig){
    return $resource(appConfig.apiUrl + '/sms', {}, {

      // item
      item: {
        method: 'GET',
        url: appConfig.apiUrl + '/sms/:sms_id'
      },

      // del
      del: {
        method: 'DELETE',
        url: appConfig.apiUrl + '/sms/:sms_id'
      },

    });
  }
]);
/**
*
* StudentService Module
*
* Description
*
*/
angular.module('StudentService', [])
.service('StudentService', ['$resource', 'appConfig',
  function ($resource, appConfig) {
    return $resource(appConfig.apiUrl + '/user/:target_type', {}, {

      // 修改用户
      put: {
        method: 'PUT',
        url: appConfig.apiUrl + '/account/info'
      },

    })
  }
]);
/**
*
* TeacherService Module
*
* Description
*
*/
angular.module('TeacherService', [])
.service('TeacherService', ['$resource', 'appConfig',
  function($resource, appConfig){
    return $resource(appConfig.apiUrl + '/teacher/:target_type', {}, {

      // 获取收入明细列表
      incomeDetail: {
        method: 'GET',
        url: appConfig.apiUrl + '/teacher/income/detail'
      },

      // 获取每日收入统计
      incomeDaily: {
        method: 'GET',
        url: appConfig.apiUrl + '/teacher/income/daily'
      },

      /*

      // 个人中心首页
      get_index: {
        method: 'GET',
        url: appConfig.apiUrl + '/user/index'
      },

      // 获取待办事项
      get_to_do_list: {
        method: 'GET',
        url: appConfig.apiUrl + '/user/teacher/to_do_list'
      },

      // 获取待办事项
      get_msg_list: {
        method: 'GET',
        url: appConfig.apiUrl + '/user/teacher/announcement'
      },

      // 更新基本资料
      update: { 
        method:'PUT',
        params: {
          token: '@token'
        },
        url: appConfig.apiUrl + '/organization/:organization_id'
      },

      // 已售课程
      get_trade: {
        method: 'GET',
        params: {
          token: '@token',
          status: '@status',
          is_study_finish: '@is_study_finish'
        },
        url: appConfig.apiUrl + '/trade/list/teacher'
      },

      // 获取评价列表
      get_rates: {
        method: 'GET',
        params: {
          token: '@token',
          type: '@type'
        },
        url: appConfig.apiUrl + '/course_comment/list/teacher/:user_id'
      },

      // 回复买家评价
      post_reply_rate: {
        method: 'POST',
        params: {
          token: '@token'
        },
        url: appConfig.apiUrl + '/course_comment/:comment_id/reply'
      },

      // 删除我的回复
      del_my_reply: {
        method: 'DELETE',
        params: {
          token: '@token'
        },
        url: appConfig.apiUrl + '/course_comment/:comment_id'
      },

      // 请求课程类别
      get_organization_type: {
        method: 'GET',
        url: appConfig.apiUrl + '/category?type=2'
      },

      // 添加新的学校(基础信息)
      post_new_organization: {
        method: 'POST',
        url: appConfig.apiUrl + '/organization/register'
      },

      // 添加学校认证信息
      post_audit_organization: {
        method: 'POST',
        url: appConfig.apiUrl + '/organization/:organization_id/audit'
      },

      // 更新学校认证信息
      update_audit_organization: {
        method: 'PUT',
        url: appConfig.apiUrl + '/organization/:organization_id/audit'
      },

      // 获取与我有关系的机构的列表
      get_organization_list: {
        method: 'GET',
         params: {
          token: '@token',
          type: '@type',
          per_page: '@per_page',
          page: '@per_page'
        },
        url: appConfig.apiUrl + '/organization/mylist'
      },

      // 获取我管理的学校的基本信息
      get_organization_info: {
        method: 'GET',
         params: {
          token: '@token'
        },
        url: appConfig.apiUrl + '/organization/:organization_id/info'
      },

      // 获取我管理的学校的认证信息
      get_organization_audit: {
        method: 'GET',
         params: {
          token: '@token'
        },
        url: appConfig.apiUrl + '/organization/:organization_id/audit'
      },

      // 获取我管理的学校的老师列表
      get_organization_teacher: {
        method: 'GET',
         params: {
          from: '@from',
          status: '@status',
          per_page: '@per_page',
          page: '@page'
        },
        url: appConfig.apiUrl + '/organization/:organization_id/teacher'
      },

      // 管理员修改低级别用户资料
      edit_teacher_info: {
        method: 'PUT',
         params: {
          token: '@token'
        },
        url: appConfig.apiUrl + '/organization/:organization_id/teacher/:edit_id'
      },

      // 管理员删除用户关系
      del_teacher: {
        method: 'DELETE',
         params: {
          token: '@token'
        },
        url: appConfig.apiUrl + '/organization/:organization_id/teacher/:edit_id'
      },

      // 转让创始人身份
      attorn_founder: {
        method: 'PUT',
         params: {
          token: '@token'
        },
        url: appConfig.apiUrl + '/organization/:organization_id/admin/attornFounder/:user_id'
      },

      // 最高管理员设置用户为管理员
      add_admin: {
        method: 'PUT',
         params: {
          token: '@token'
        },
        url: appConfig.apiUrl + '/organization/:organization_id/admin/setUserToAdmin/:user_id'
      },

      // 最高管理员取消管理员
      del_admin: {
        method: 'PUT',
         params: {
          token: '@token'
        },
        url: appConfig.apiUrl + '/organization/:organization_id/admin/cancelAdmin/:user_id'
      },

      // 管理员邀请老师
      post_invite_teacher: {
        method: 'POST',
         params: {
          token: '@token'
        },
        url: appConfig.apiUrl + '/organization/:organization_id/teacher/invite/:phone'
      },

      // 管理员再次邀请老师
      post_again_invite_teacher: {
        method: 'PUT',
         params: {
          token: '@token'
        },
        url: appConfig.apiUrl + '/organization/:organization_id/teacher/reinvite/:invite_id'
      },

      // 老师加入机构时搜索机构
      search_organization_join: {
        method: 'GET',
        params: {
          page: '@page',
          detail: '@detail',
          keyword: '@keyword',
          per_page: '@per_page'
        },
        url: appConfig.apiUrl + '/search/:search_type'
      },

      // 管理员接受老师申请
      agree_teacher: {
        method: 'PUT',
        params: {
          token: '@token'
        },
        url: appConfig.apiUrl + '/organization/:organization_id/teacher/agree/:user_id'
      },

      // 管理员拒绝老师申请
      refuse_teacher: {
        method: 'POST',
        params: {
          token: '@token'
        },
        url: appConfig.apiUrl + '/organization/:organization_id/teacher/refuse/:refuse_id'
      },

      // 管理员获取机构公告
      get_organization_announcement: {
        method: 'GET',
        params: {
          page: '@page',
          per_page: '@per_page'
        },
        url: appConfig.apiUrl + '/organization/:organization_id/announcement'
      },

      // 管理员发布机构公告
      add_organization_announcement: {
        method: 'POST',
        params: {
          token: '@token'
        },
        url: appConfig.apiUrl + '/organization/:organization_id/announcement'
      },

      // 管理员修改机构公告
      update_organization_announcement: {
        method: 'PUT',
        params: {
          token: '@token'
        },
        url: appConfig.apiUrl + '/organization/:organization_id/announcement/:announcement_id'
      },

      // 管理员删除机构公告
      del_organization_announcement: {
        method: 'DELETE',
        params: {
          token: '@token'
        },
        url: appConfig.apiUrl + '/organization/:organization_id/announcement/:announcement_id'
      },

      // 管理员请求主题模板
      get_theme_template: {
        method: 'GET',
        params: {
          token: '@token'
        },
        url: appConfig.apiUrl + '/organization/theme'
      },

      // 管理员设置主题模板及图片
      set_theme_template: {
        method: 'PUT',
        params: {
          token: '@token'
        },
        url: appConfig.apiUrl + '/organization/:organization_id/organizationProfile'
      },

      // 老师退出加入的机构
      quit_organization: {
        method: 'DELETE',
        params: {
          token: '@token'
        },
        url: appConfig.apiUrl + '/organization/:organization_id/teacher/quit'
      },

      // 老师同意邀请
      put_agree_invite: {
        method: 'PUT',
        params: {
          token: '@token'
        },
        url: appConfig.apiUrl + '/organization/:organization_id/teacher/agree'
      },

      // 老师拒绝邀请
      put_refuse_invite: {
        method: 'PUT',
        params: {
          token: '@token'
        },
        url: appConfig.apiUrl + '/organization/:organization_id/teacher/refuse'
      },

      // 老师申请加入机构
      join_organization: {
        method: 'POST',
        params: {
          token: '@token'
        },
        url: appConfig.apiUrl + '/organization/:organization_id/teacher/apply'
      },

      // 上架课程
      sell_lessons: {
        method: 'POST',
        params: {
          token: '@token',
          course_ids: '@course_ids'
        },
        url: appConfig.apiUrl + '/course/sell'
      },

      // 下线课程
      delisting_lessons: {
        method: 'POST',
        params: {
          token: '@token',
          course_ids: '@course_ids'
        },
        url: appConfig.apiUrl + '/course/sell/cancel'
      },

      // 删除已下线课程
      del_lessons: {
        method: 'DELETE',
        params: {
          token: '@token',
          course_ids: '@course_ids'
        },
        url: appConfig.apiUrl + '/course'
      }

      */


    });
  }
]);
/**
*
* TradeService Module
*
* Description
*
*/
angular.module('TradeService', [])
.service('TradeService', ['$resource', 'appConfig',
  function($resource, appConfig){
    return $resource(appConfig.apiUrl + '/trade', {
        per_page: '@per_page',
        page: '@page' 
      }, {

      // 订单详情
      item: {
        method: 'GET',
        url: appConfig.apiUrl + '/trade/:trade_id'
      },

      // 订单搜索
      search: {
        method: 'GET',
        url: appConfig.apiUrl + '/trade/search'
      },

      // 修改订单
      cancel: {
        method: 'PUT',
        url: appConfig.apiUrl + '/trade/:trade_id/cancel'
      },

      // 删除订单
      del: {
        method: 'DELETE',
        url: appConfig.apiUrl + '/trade/:trade_id'
      },

    });
  }
]);
/**
*
* WithdrawService Module
*
* Description
*
*/
angular.module('WithdrawService', [])
.service('WithdrawService', ['$resource', 'appConfig',
  function($resource, appConfig){
    return $resource(appConfig.apiUrl + '/withdraw', {
        per_page: '@per_page',
        page: '@page' 
      }, {

      // 提现详情
      item: {
        method: 'GET',
        url: appConfig.apiUrl + '/withdraw/:withdraw_id'
      },

      // 修改提现
      cancel: {
        method: 'PUT',
        url: appConfig.apiUrl + '/withdraw/:withdraw_id/cancel'
      },

      // 更新提现
      put: {
        method: 'PUT',
        url: appConfig.apiUrl + '/withdraw/:withdraw_id'
      },

      // 删除提现
      del: {
        method: 'DELETE',
        url: appConfig.apiUrl + '/withdraw/:withdraw_id'
      },
      
    });
  }
]);
/**
*
* AdvertiseModel Module
*
* Description
*
*/
angular.module('AdvertiseModel', ['AdvertiseService'])

// 广告数据模型
.factory('AdvertiseModel', ['AdvertiseService', 'CommonProvider',
  function(AdvertiseService, CommonProvider){

    var _advertise_list;
    var _advertise_item;
    var _advertise_model = {};

    _advertise_model = {

      // 获取广告列表
      get: function (params) {
        params.page = params.page || 1;
        params.per_page = params.per_page || 20;
        return CommonProvider.request({
          method: 'get',
          service: new AdvertiseService(),
          params: params,
          success: function (advertise_lists) {
            _advertise_list = advertise_lists;
          }
        });
      },

      // 获取单条广告详情
      item: function (params) {
        return CommonProvider.request({
          method: 'item',
          service: new AdvertiseService(),
          params: params,
          success: function (advertise_item) {
            _advertise_item = advertise_item;
          }
        });
      },

      // 新增广告
      add: function (advertise) {
        return CommonProvider.request({
          method: 'save',
          service: new AdvertiseService(advertise)
        });
      },

      // 修改广告
      put: function (advertise) {
        return CommonProvider.request({
          method: 'put',
          service: new AdvertiseService(advertise),
          params: { advertise_id: advertise.id },
          success: function (_advertise) {
            return _advertise;
          }
        });
      },


      // 删除广告
      del: function (advertise) {
        return CommonProvider.request({
          method: 'del',
          service: new AdvertiseService(),
          params: { advertise_id: advertise.id },
          success: function (_advertise) {
            _advertise_list.result.remove(advertise);
            _advertise_list.pagination.total -= 1;
          }
        });
      }
    };
    
    return _advertise_model;
  }
])
/**
*
* AnnouncementModel Module
*
* Description
*
*/
angular.module('AnnouncementModel', ['AnnouncementService'])

// 课程数据模型
.factory('AnnouncementModel', ['AnnouncementService', 'CommonProvider',
  function(AnnouncementService, CommonProvider){

    var _announcement_list;
    var _announcement_model = {

      // 获取公告列表
      get: function (params) {
        return CommonProvider.request({
          method: 'get',
          service: new AnnouncementService(),
          params: params,
          success: function (announcement_list) {
            _announcement_list = announcement_list;
          }
        });
      },

      // 删除单条公告
      del: function (params) {
        return CommonProvider.request({
          method: 'del',
          service: new AnnouncementService(),
          params: params,
          success: function (_announcement) {
            var remove_item = _announcement_list.result.find(params.announcement_id, 'id');
            _announcement_list.result.remove(remove_item);
            _announcement_list.pagination.total -= 1;
          }
        });
      },

      // 批量删除公告
      delete: function (ids) {
        return CommonProvider.request({
          method: 'delete',
          service: new AnnouncementService(),
          params: { ids: ids.join(',') },
          success: function (_feedback) {
            _announcement_model.get({ page: _announcement_list.pagination.current_page });
          }
        });
      },

      // 修改单条公告
      put: function (params) {
        return CommonProvider.request({
          method: 'put',
          service: new AnnouncementService(params.body),
          params: {
            role: params.role,
            announcement_id: params.body.id
          }
        });
      },

      // 新增单条公告
      add: function (params) {
        return CommonProvider.request({
          method: 'save',
          service: new AnnouncementService(params.body),
          params: {
            role: params.role,
          }
        });
      },

    }

    return _announcement_model;
  }
]);
/**
*
* ArticleModel Module
*
* Description
*
*/
angular.module('ArticleModel', ['ArticleService'])

// 文章数据模型
.factory('ArticleModel', ['ArticleService', 'CommonProvider',
  function(ArticleService, CommonProvider){

    var _article = {};
    var _article_list;
    var _article_item;
    var _article_model = {};

    _article_model = {

      // 获取文章列表
      get: function (params) {
        params.page = params.page || 1;
        params.per_page = params.per_page || 20;
        return CommonProvider.request({
          method: 'get',
          service: new ArticleService(),
          params: params,
          success: function (_article_lists) {
            _article_list = _article_lists;
          }
        });
      },

      // 发布文章
      add: function (article) {
        return CommonProvider.request({
          method: 'save',
          service: new ArticleService(article)
        });
      },

      // 获取单条文章详情
      item: function (params) {
        return CommonProvider.request({
          method: 'item',
          service: new ArticleService(),
          params: params,
          success: function (_article_item) {
            _article.info = _article_item;
          }
        });
      },

      // 修改文章
      put: function (article) {
        return CommonProvider.request({
          method: 'put',
          service: new ArticleService(article),
          params: { article_id: article.id },
          success: function (_article) {
            return _article;
          }
        });
      },

      // 删除文章
      del: function (article) {
        return CommonProvider.request({
          method: 'del',
          service: new ArticleService(),
          params: { article_id: article.article.id },
          success: function (_article) {
            _article_list.result.remove(article.article);
            _article_list.pagination.total -= 1;
          }
        });
      },

      // (批量)禁用文章
      disable: function (params) {
        var ids = params.length ? params.join(',') : params.article.id;
        return CommonProvider.request({
          method: 'disable',
          service: new ArticleService({ ids: ids }),
          success: function (_article) {
            if (params.length) {
              _article_model.get({ page: _article_list.pagination.current_page });
            } else {
              params.article.x_status = 0;
            }
          }
        });
      },

      // (批量)启用文章
      enable: function (params) {
        var ids = params.length ? params.join(',') : params.article.id;
        return CommonProvider.request({
          method: 'enable',
          service: new ArticleService({ ids: ids }),
          success: function (_article) {
            if (params.length) {
              _article_model.get({ page: _article_list.pagination.current_page });
            } else {
              params.article.x_status = 1;
            }
          }
        });
      },
    };
    
    return _article_model;
  }
])
/**
*
* AuditModel Module
*
* Description
*
*/
angular.module('AuditModel', ['AuditService'])

// 机构认证数据模型
.factory('AuditModel', ['AuditService', 'CommonProvider',
  function(AuditService, CommonProvider){

    var _audit_model = {

      // 获取机构认证列表
      get: function (params) {
        return CommonProvider.request({
          method: 'get',
          service: new AuditService(),
          params: params
        });
      },

      // 获取单条机构认证详情
      item: function (params) {
        return CommonProvider.request({
          method: 'item',
          service: new AuditService(),
          params: params,
        });
      },

      // 修改机构认证资料
      put: function (audit) {
        return CommonProvider.request({
          method: 'put',
          service: new AuditService(audit.body),
          params: {
            role: audit.role,
            organization_id: audit.organization_id
          }
        });
      },

    }

    return _audit_model;
  }
]);
/*
* 用户授权模型
*
* Description
*/

angular.module('AuthModel', ['AuthService'])

// 用户数据处理模块
.factory('AuthModel', ['AuthService', 'CommonProvider', '$localStorage',
  function (AuthService, CommonProvider, $localStorage) {

    // 初始化
    var _auth_model = {

    // 登录
    login: function (user) {
      return CommonProvider.request({
        method: 'login',
        service: new AuthService(user)
      });
    },

    // 退出
    logout: function (user) {
      return CommonProvider.request({
        method: 'logout',
        service: new AuthService()
      });
    },

    // 注册
    register: function (user) {
      return CommonProvider.request({
        method: 'register',
        service: new AuthService(user)
      });
    },

    // 找回密码
    forgot: function (user) {
      return CommonProvider.request({
        method: 'forgot',
        service: new AuthService(user)
      });
    },

    // 检验
    check: function () {
      return CommonProvider.request({
        method: 'check',
        service: new AuthService(),
        error: function (err) {
          if (err.status == 401) {
            delete $localStorage.user;
            delete $localStorage.token;
          }
        }
      });
    },

    // 菜单
    menu: function () {
      return CommonProvider.request({
        method: 'menu',
        service: new AuthService()
      });
    },

    // 重置密码
    reset: function (password) {
      return CommonProvider.request({
        method: 'reset',
        service: new AuthService(password)
      });
    },

    // 获取第三方账户列表
    getThirds: function () {
      return CommonProvider.request({
        method: 'getThirds',
        service: new AuthService()
      });
    },

    // 第三方登录
    thirdLogin: function (params) {
      return CommonProvider.request({
        method: 'thirdLogin',
        service: new AuthService(),
        params: params
      });
    },

    // 第三方绑定
    thirdBind: function (params) {
      return CommonProvider.request({
        method: 'thirdBind',
        service: new AuthService(params.body),
        params: { type: params.type }
      });
    },

    // 第三方解绑
    thirdUnbind: function (params) {
      return CommonProvider.request({
        method: 'thirdUnbind',
        service: new AuthService(),
        params: params
      });
    },

    };

    return _auth_model;
  }
]);

/**
*
* BankModel Module
*
* Description
*
*/
angular.module('BankModel', ['BankService'])

// 银行账户模型
.factory('BankModel', ['BankService', 'CommonProvider',
  function(BankService, CommonProvider){

    var _bank_lists;
    var _bank_model = {

      // 获取银行列表
      get: function (params) {
        return CommonProvider.request({
          method: 'get',
          service: new BankService(),
          params: params,
          success: function (_banks) {
            _bank_lists = _banks;
          }
        });
      },

      // 添加银行账户
      add: function (bank) {
        return CommonProvider.request({
          method: 'save',
          service: new BankService(bank)
        });
      },

      // 删除银行账户
      del: function (params) {
        return CommonProvider.request({
          method: 'del',
          service: new BankService(),
          params: params
        });
      },

      // 获取银行信息
      getInfo: function (params) {
        return CommonProvider.request({
          method: 'getInfo',
          service: new BankService(),
          params: params
        });
      },

    };
    
    return _bank_model;
  }
])
/**
*
* CategoryModel Module
*
* Description
*
*/
angular.module('CategoryModel', ['CategoryService'])

// 分类数据模型
.factory('CategoryModel', ['CategoryService', 'CommonProvider',
  function(CategoryService, CommonProvider){

    var _category_list;
    var _category_model = {};
    var _category_service = new CategoryService();

    _category_model = {

      // 获取分类列表
      get: function (params) {

        params.page = params.page || 1;
        params.per_page = params.per_page || 20;

        return CommonProvider.request({
          method: 'get',
          service: new CategoryService(),
          params: params,
          success: function (_lists) {
            _category_list = _lists;
          }
        });
      },

      // 根据分类ID获取下子列表
      childrens: function (params) {
        params.category_id = params.category_id || 0;
        params.children = params.children || 1;
        params.crumbs = params.crumbs || 1;

        return CommonProvider.request({
          method: 'getChildrens',
          service: _category_service,
          params: params,
          success: function (_lists) {
            _category_list = _lists;
          }
        });
      },

      // 添加分类
      add: function (category) {
        return CommonProvider.request({
          method: 'save',
          service: new CategoryService(category),
          success: function (_category) {
            _category_model.childrens({category_id: _category_list.result.id});
          }
        });
      },

      // 修改分类
      put: function (category) {
        return CommonProvider.request({
          method: 'put',
          service: new CategoryService(category.new),
          params: { category_id: category.new.id },
        });
      },

      // 删除分类
      del: function (category) {
        return CommonProvider.request({
          method: 'del',
          service: new CategoryService(),
          params: { category_id: category.category.id },
          success: function (_category) {
            _category_list.result.children.remove(category.category);
          }
        });
      },

      // 批量删除分类
      delete: function (ids) {
        return CommonProvider.request({
          method: 'delete',
          service: new CategoryService(),
          params: { ids: ids.join(',') },
          success: function (_category) {
            _category_model.childrens({category_id: _category_list.result.id});
          }
        });
      },

      // (批量)禁用课程
      disable: function (params) {
        var ids = params.length ? params.join(',') : params.category.id;
        return CommonProvider.request({
          method: 'disable',
          service: new CategoryService({ ids: ids }),
          success: function (_category) {
            if (params.length) {
              _category_model.childrens({category_id: _category_list.result.id});
            } else {
              params.category.x_status = 0;
            }
          }
        });
      },

      // (批量)启用课程
      enable: function (params) {
        var ids = params.length ? params.join(',') : params.category.id;
        return CommonProvider.request({
          method: 'enable',
          service: new CategoryService({ ids: ids }),
          success: function (_category) {
            if (params.length) {
              _category_model.childrens({category_id: _category_list.result.id});
            } else {
              params.category.x_status = 1;
            }
          }
        });
      },

      // 批量更新排序
      sort: function (params) {
        return CommonProvider.request({
          method: 'sort',
          service: new CategoryService(),
          body: { data: params },
        });
      }

    }

    return _category_model;
  }
]);
/**
*
* ChatModel Module
*
* Description
*
*/
angular.module('ChatModel', ['ChatService'])

// 收藏模型
.factory('ChatModel', ['ChatService', 'CommonProvider',
  function(ChatService, CommonProvider){

    var _chat_model = {

      // 获取收藏列表
      message: function (params) {
        return CommonProvider.request({
          method: 'get',
          service: new ChatService(),
          params: params
        });
      }
    };
    
    return _chat_model;
  }
])
/**
*
* CommentModel Module
*
* Description
*
*/
angular.module('CommentModel', ['CommentService'])

// 评价数据模型
.factory('CommentModel', ['CommentService', 'CommonProvider',
  function(CommentService, CommonProvider){
    
    var _comment_list;
    var _comment_item;
    var _comment_model = {};


    _comment_model = {
      
      // 获取课程评论列表
      get: function (config) {
        config.page = config.page || 1;
        config.per_page = config.per_page || 20;
        return CommonProvider.request({
          method: 'get',
          service: new CommentService(),
          params: config,
          success: function (_comment_lists) {
            _comment_list = _comment_lists;
          }
        });
      },

      // 添加新评论
      post: function (params) {
        return CommonProvider.request({
          method: 'save',
          service: new CommentService(params.body),
          params: { role: params.role }
        });
      },

      // 删除评论
      del: function (params) {
        return CommonProvider.request({
          method: 'del',
          service: new CommentService(),
          params: params
        });
      },

    };
    
    return _comment_model;
  }
])
/**
* GlobalModel Module
*
* Description
*
*/
angular.module('CommonModel', ['CommonService'])

// 公共模型
.factory('CommonModel', ['CommonService', 'CommonProvider',
  function(CommonService, CommonProvider){

    _common_model = {
      
      // 获取短信验证码
      sms: function (config) {
        return CommonProvider.request({
          method: 'sms',
          service: new CommonService(),
          params: config
        });
      },

      // 获取全国树形地区
      area: function () {
        return CommonProvider.request({
          method: 'area',
          service: new CommonService()
        });
      },

      // 获取全局配置
      config: function (params) {
        return CommonProvider.request({
          method: 'config',
          service: new CommonService(),
          params: params
        });
      },

      // 获取全局配置
      configByName: function (params) {
        return CommonProvider.request({
          method: 'configByName',
          service: new CommonService(),
          params: params
        });
      },

    };
    
    return _common_model;
  }
])
/*
* 系统数据模型
*
* Description
*/

angular.module('ConfigModel', ['ConfigService'])

// 用户数据处理模块
.factory('SystemModel', ['SystemService', 'CommonProvider',
  function (SystemService, CommonProvider) {

    // 初始化
    var _system_list;
    var _system_group = {};
    var _system_model = {};
    var _system_service = new SystemService();

    // 获取系统配置列表
    _system_model.get = function (params) {
      return CommonProvider.request({
        method: 'get',
        service: _system_service,
        params: params,
        success: function (config_list) {
          if (params.group != undefined) {
            _system_group[params.group] = config_list.result.toObject('name');
          } else {
            _system_list = config_list;
          }
        }
      });
    };

    // 修改分组配置
    _system_model.putGroup = function (groups) {
      for (key in groups) {
        if (typeof groups[key].value == 'object') {
          groups[key].value = groups[key].value.toString();
        }
      };
      return CommonProvider.request({
        method: 'putGroup',
        service: new SystemService({ data: Obj.toArray(groups) })
      });
    };

    // 新增配置
    _system_model.add = function (config) {
      return CommonProvider.request({
        method: 'save',
        service: new SystemService(config),
        success: function (_config) {
          _system_list.result.push(_config.result);
        }
      });
    };

    // 修改单条配置
    _system_model.put = function (config) {
      return CommonProvider.request({
        method: 'putItem',
        service: new SystemService(config.new),
        params: { config_id: config.old.config.id },
        success: function (_config) {
          config.old.config = _config.result;
        }
      });
    };

    // 删除单条配置
    _system_model.del = function (config) {
      return CommonProvider.request({
        method: 'del',
        service: new SystemService(),
        params: { config_id: config.config.id },
        success: function (_config) {
          _system_list.result.remove(config.config);
        }
      });
    };

    // 批量删除配置
    _system_model.delete = function (ids) {
      return CommonProvider.request({
        method: 'delete',
        service: _system_service,
        params: { ids: ids.join(',') },
        success: function (_config) {
          _system_model.get({ page: _system_list.pagination.current_page });
        }
      });
    };

    return _system_model;
  }
])

// Log数据模型
.factory('LogModel', ['LogService', 'CommonProvider', 
  function (LogService, CommonProvider) {

    // 初始化
    var _log_list;
    var _log_model = {};
    var _log_service = new LogService();

    // 获取log列表
    _log_model.get = function(params) {
      return CommonProvider.request({
        method: 'get',
        params: params,
        service: _log_service,
        success: function (logs) {
          _log_list = logs;
        }
      });
    };

    // （批量）删除log
    _log_model.del = function (log) {
      var ids = log.length ? log.join(',') : log.log.id;
      return CommonProvider.request({
        method: 'delete',
        service: new LogService(),
        params: { ids: ids },
        success: function (_log) {
          if (log.length) {
            _log_model.get({ page: _log_list.pagination.current_page });
          } else {
            _log_list.result.remove(log.log);
            _log_list.pagination.total -= 1;
          }
        }
      });
    };

    // 清空日志
    _log_model.clear = function (log) {
      return CommonProvider.request({
        method: 'clear',
        service: _log_service,
        success: function (_log) {
          _log_list.result = [];
          _log_list.pagination.total = 0;
        }
      });
    };

    return _log_model;
  }
])
/**
*
* CourseModel Module
*
* Description
*
*/
angular.module('CourseModel', ['CourseService'])

// 课程数据模型
.factory('CourseModel', ['CourseService', 'CommonProvider',
  function(CourseService, CommonProvider){
    
    var _course = {};
    var _course_list;
    var _course_item;
    var _course_others;
    var _course_classmates;
    var _course_model = {};
    var _course_service = new CourseService();

    _course_model = {

      // 获取多个用户的信息
      getUsersInfo: function (params) {
        return CommonProvider.request({
          method: 'getUsersInfo',
          service: new CourseService({ user_ids: params.user_ids })
        });
      },

      // 获取课程列表
      get: function (params) {
        params.page = params.page || 1;
        params.per_page = params.per_page || 20;
        return CommonProvider.request({
          method: 'get',
          service: new CourseService(),
          params: params,
          success: function (_course_lists) {
            _course_list = _course_lists;
          }
        });
      },

      // 获取单条课程详情
      item: function (params) {
        return CommonProvider.request({
          method: 'item',
          service: _course_service,
          params: params,
          success: function (_course_item) {
            _course.info = _course_item;
          }
        });
      },

      // 修改课程
      put: function (course) {
        return CommonProvider.request({
          method: 'put',
          service: new CourseService(course.new),
          params: { course_id: course.new.id },
          success: function (_course) {
            return _course;
          }
        });
      },

      // 新增课程
      add: function (course) {
        return CommonProvider.request({
          method: 'save',
          service: new CourseService(course),
          success: function (_course) {
            return _course;
          }
        });
      },

      // 删除课程
      del: function (course) {
        return CommonProvider.request({
          method: 'del',
          service: new CourseService(),
          params: { course_id: course.course.id },
          success: function (_course) {
            _course_list.result.remove(course.course);
            _course_list.pagination.total -= 1;
          }
        });
      },

      // 批量删除课程
      delete: function (ids) {
        return CommonProvider.request({
          method: 'delete',
          service: new CourseService(),
          params: { ids: ids.join(',') },
          success: function (_course) {
            _course_model.get({ page: _course_list.pagination.current_page });
          }
        });
      },

      // (批量)下架课程
      disable: function (params) {
        var ids = params.length ? params.join(',') : params.course.id;
        return CommonProvider.request({
          method: 'disable',
          service: new CourseService({ ids: ids }),
          success: function (_course) {
            if (params.length) {
              _course_model.get({ page: _course_list.pagination.current_page });
            } else {
              params.course.x_status = 0;
            }
          }
        });
      },

      enable: function (params) {
        var ids = params.length ? params.join(',') : params.course.id;
        return CommonProvider.request({
          method: 'enable',
          service: new CourseService({ ids: ids }),
          success: function (_course) {
            if (params.length) {
              _course_model.get({ page: _course_list.pagination.current_page });
            } else {
              params.course.x_status = 1;
            }
          }
        });
      },

      // 关系
      relation: function (course_id) {
        return CommonProvider.request({
          method: 'relation',
          service: new CourseService(),
          params: { course_id: course_id },
          success: function (_relation) {
            _course.relation = _relation;
          }
        });
      },

      // 相关课程
      others: function (params) {
        return CommonProvider.request({
          method: 'others',
          service: new CourseService(),
          params: params,
          success: function (_others) {
            _course.others = _others;
          }
        });
      },

      // 同学
      classmates: function (params) {
        return CommonProvider.request({
          method: 'classmates',
          service: new CourseService(),
          params: params,
          success: function (_classmates) {
            _course.classmates = _classmates;
          }
        });
      },

      // 操作课程（添加试听/购买/记录）
      operation: function (params) {
        return CommonProvider.request({
          method: 'operation',
          service: new CourseService(),
          params: { 
            method: params.method, 
            course_id: params.course_id
          }
        });
      }
    };
    
    return _course_model;
  }
])
/**
*
* FavoriteModel Module
*
* Description
*
*/
angular.module('FavoriteModel', ['FavoriteService'])

// 收藏模型
.factory('FavoriteModel', ['FavoriteService', 'CommonProvider',
  function(FavoriteService, CommonProvider){

    var _favorite_lists;
    var _favorite_model = {

      // 获取收藏列表
      get: function (params) {
        return CommonProvider.request({
          method: 'get',
          service: new FavoriteService(),
          params: params,
          success: function (_favorites) {
            _favorite_lists = _favorites;
          }
        });
      },

      // 批量获取收藏状态
      getStatus: function (params) {
        return CommonProvider.request({
          method: 'getStatus',
          service: new FavoriteService(),
          params: params
        });
      },
      
      // 收藏目标
      add: function (config) {
        return CommonProvider.request({
          method: 'save',
          service: new FavoriteService(),
          params: config
        });
      },

      // 取消收藏
      del: function (params) {
        return CommonProvider.request({
          method: 'remove',
          service: new FavoriteService(),
          params: params,
          success: function () {
            _favorite_lists.pagination.total -= 1;
          }
        });
      }
    };
    
    return _favorite_model;
  }
])
/**
*
* FeedbackModel Module
*
* Description
*
*/
angular.module('FeedbackModel', ['FeedbackService'])

// 反馈模型
.factory('FeedbackModel', ['FeedbackService', 'CommonProvider',
  function(FeedbackService, CommonProvider){

    var _feedback_list;
    var _feedback_model = {

      // 获取反馈列表
      get: function (params) {
        return CommonProvider.request({
          method: 'get',
          service: new FeedbackService(),
          params: params,
          success: function (feedback_list) {
            _feedback_list = feedback_list;
          }
        });
      },

      // 获取单条反馈
      item: function (feedback) {
        return CommonProvider.request({
          method: 'item',
          service: new FeedbackService(),
          params: feedback
        });
      },
      
      // 新增反馈
      add: function (feedback) {
        return CommonProvider.request({
          method: 'save',
          service: new FeedbackService(feedback)
        });
      },

      // 编辑反馈
      put: function (feedback) {
        return CommonProvider.request({
          method: 'put',
          service: new FeedbackService(feedback),
          params: { feedback_id: feedback.id },
        });
      },

      // 删除反馈
      del: function (feedback) {
        return CommonProvider.request({
          method: 'del',
          service: new FeedbackService(),
          params: { feedback_id: feedback.feedback.id },
          success: function (_feedback) {
            _feedback_list.result.remove(feedback.feedback);
            _feedback_list.pagination.total -= 1;
          }
        });
      },

      // 批量删除
      delete: function (ids) {
        return CommonProvider.request({
          method: 'delete',
          service: new FeedbackService(),
          params: { ids: ids.join(',') },
          success: function (_feedback) {
            _feedback_model.get({ page: _feedback_list.pagination.current_page });
          }
        });
      }

    };
    
    return _feedback_model;
  }
])
/**
*
* IndexModel Module
*
* Description
*
*/
angular.module('IndexModel', ['IndexService'])

// 课程数据模型
.factory('IndexModel', ['IndexService', 'CommonProvider',
  function(IndexService, CommonProvider){

    _index_model = {

      // 获取分类列表
      get: function (params) {
        return CommonProvider.request({
          method: 'get',
          service: new IndexService(),
          params: params
        });
      },

      // 获取合作机构
      partners: function (params) {
        return CommonProvider.request({
          method: 'partners',
          service: new IndexService(),
          params: params
        });
      },

      // 修改配置
      put: function (config) {
        console.log(config);
        return CommonProvider.request({
          method: 'put',
          service: new IndexService(config),
          params: { config_id: config.id },
          success: function (_config) {
          }
        });
      },
    }

    return _index_model;
  }
]);
/**
*
* LinkModel Module
*
* Description
*
*/
angular.module('LinkModel', ['LinkService'])

// 友链模型
.factory('LinkModel', ['LinkService', 'CommonProvider',
  function(LinkService, CommonProvider){

    var _link_list;
    var _link_model = {

      // 获取友链列表
      get: function (params) {
        return CommonProvider.request({
          method: 'get',
          service: new LinkService(),
          params: params,
          success: function (_links) {
            _link_list = _links;
          }
        });
      },
      
      // 新增友链
      add: function (link) {
        return CommonProvider.request({
          method: 'save',
          service: new LinkService(link),
          success: function (_link) {
            _link_list.result.unshift(_link.result);
            _link_list.pagination.total += 1;
          }
        });
      },

      // 编辑友链
      put: function (link) {
        return CommonProvider.request({
          method: 'put',
          service: new LinkService(link),
          params: { link_id: link.id },
        });
      },

      // 删除友链
      del: function (link) {
        return CommonProvider.request({
          method: 'del',
          service: new LinkService(),
          params: { link_id: link.link.id },
          success: function (_link) {
            _link_list.result.remove(link.link);
            _link_list.pagination.total -= 1;
          }
        });
      },

      // 批量删除
      delete: function (ids) {
        return CommonProvider.request({
          method: 'delete',
          service: new LinkService(),
          params: { ids: ids.join(',') },
          success: function (_link) {
            _link_model.get({ page: _link_list.pagination.current_page });
          }
        });
      }

    };
    
    return _link_model;
  }
])
/**
*
* MsgModel Module
*
* Description
*
*/
angular.module('MsgModel', ['MsgService'])

// 课程数据模型
.factory('MsgModel', ['MsgService', 'CommonProvider',
  function(MsgService, CommonProvider){

    var _msg_model = {

      // 获取分类列表
      get: function (params) {
        return CommonProvider.request({
          method: 'get',
          service: new MsgService(),
          params: params
        });
      },

      // 批量操作
      batch: function (params) {
        return CommonProvider.request({
          method: 'batch',
          service: new MsgService(),
          params: params
        });
      }
    }

    return _msg_model;
  }
]);
/**
*
* NoteModel Module
*
* Description
*
*/
angular.module('NoteModel', ['NoteService'])

// 笔记模型
.factory('NoteModel', ['NoteService', 'CommonProvider',
  function(NoteService, CommonProvider){

    var _note_list;
    var _note_model = {
      
      // 获取笔记
      get: function (params) {
        params.page = params.page || 1;
        params.per_page = params.per_page || 20;
        return CommonProvider.request({
          method: 'get',
          service: new NoteService(),
          params: params,
          success: function (note_list) {
            _note_list = note_list;
          }
        });
      },

      // 新增笔记
      post: function (note) {
        return CommonProvider.request({
          method: 'save',
          service: new NoteService(note),
        });
      },

      // 删除笔记
      del: function (note) {
        return CommonProvider.request({
          method: 'del',
          service: new NoteService(),
          params: { note_id: note.note.id },
          success: function (_note) {
            _note_list.result.remove(note.note);
            _note_list.pagination.total -= 1;
          }
        });
      },

      // 批量删除分类
      delete: function (ids) {
        return CommonProvider.request({
          method: 'delete',
          service: new NoteService(),
          params: { ids: ids.join(',') },
          success: function (_note) {
            _note_model.get({ page: _note_list.pagination.current_page });
          }
        });
      },

      // 获取单条笔记
      item: function (note) {
        return CommonProvider.request({
          method: 'item',
          service: new NoteService(),
          params: note
        });
      },

      // 修改单条笔记
      put: function (note) {
        return CommonProvider.request({
          method: 'put',
          service: new NoteService(note.body),
          params: { note_id: note.id },
        });
      }

    };
    
    return _note_model;
  }
])
/**
* OrganizationModel Module
*
* Description
*/
angular.module('OrganizationModel', ['OrganizationService'])

// 课程数据模型
.factory('OrganizationModel', ['OrganizationService', 'CommonProvider',
  function(OrganizationService, CommonProvider){

    var _organization_list;
    var _organization_relation;
    var _organization_model = {};

    _organization_model = {

      // 获取学校列表
      get: function (params) {
        params.page = params.page || 1;
        params.per_page = params.per_page || 20;
        return CommonProvider.request({
          method: 'get',
          service: new OrganizationService(),
          params: params,
          success: function (_organization_lists) {
            _organization_list = _organization_lists;
          }
        });
      },

      // 获取关系列表
      relation: function (params) {
        params.page = params.page || 1;
        params.per_page = params.per_page || 20;
        return CommonProvider.request({
          method: 'relation',
          service: new OrganizationService(),
          params: params,
          success: function (_organization_relations) {
            _organization_relation = _organization_relations;
          }
        });
      },

      // 获取学校老师详情
      itemRelation: function (params) {
        return CommonProvider.request({
          method: 'itemRelation',
          service: new OrganizationService(params),
          params: params
        });
      },

      // 修改用户机构关系
      putRelation: function (relation) {
        return CommonProvider.request({
          method: 'putRelation',
          service: new OrganizationService(relation.body),
          params: {
            role: relation.role,
            relation_id: relation.id,
            organization_role: relation.organization_role,
          }
        });
      },

      // 新增关系
      addRelation: function (relation) {
        return CommonProvider.request({
          method: 'addRelation',
          service: new OrganizationService(relation.body),
          params: { type: relation.type }
        });
      },

      // 删除用户机构关系
      delRelation: function (relation) {
        return CommonProvider.request({
          method: 'delRelation',
          service: new OrganizationService(),
          params: relation,
          success: function (_relation) {
            _organization_relation.result.remove(relation);
            _organization_relation.pagination.total -= 1;
          }
        });
      },

      // 获取学校基本信息
      item: function (params) {
        return CommonProvider.request({
          method: 'item',
          service: new OrganizationService(),
          params: params,
          success: function (_organization_item) {
            return _organization_item;
          }
        });
      },

      // 获取机构profile
      getProfile: function (params) {
        return CommonProvider.request({
          method: 'getProfile',
          service: new OrganizationService(params),
          params: params
        });
      },

      // 获取机构profile
      putProfile: function (params) {
        return CommonProvider.request({
          method: 'putProfile',
          service: new OrganizationService(params.body),
          params: {
            role: params.role,
            organization_id: params.organization_id,
          }
        });
      },

      // 新增学校
      add: function (organization) {
        return CommonProvider.request({
          method: 'save',
          service: new OrganizationService(organization),
          success: function (_organization) {
            return _organization;
          }
        });
      },

      // 修改学校
      put: function (organization) {
        return CommonProvider.request({
          method: 'put',
          service: new OrganizationService(organization.new),
          params: { 
            role: organization.role || 'user',
            organization_id: organization.new.id
          },
          success: function (_organization) {
            // 更新列表信息
            if (organization.old != undefined) {
              _organization_list.result[organization.old.$parent.$index] = _organization.result;
            }
          }
        });
      },

      // 删除学校
      del: function (organization) {
        return CommonProvider.request({
          method: 'del',
          service: new OrganizationService(),
          params: { organization_id: organization.organization.id },
          success: function (_organization) {
            _organization_list.result.remove(organization.organization);
            _organization_list.pagination.total -= 1;
          }
        });
      },

      // 批量删除学校
      delete: function (ids) {
        return CommonProvider.request({
          method: 'delete',
          service: new OrganizationService(),
          params: { ids: ids.join(',') },
          success: function (_organization) {
            _organization_model.get({ page: _organization_list.pagination.current_page });
          }
        });
      },

    };

    return _organization_model;
  }
]);
/**
*
* PartnerModel Module
*
* Description
*
*/
angular.module('PartnerModel', ['PartnerService'])

// 入驻机构模型
.factory('PartnerModel', ['PartnerService', 'CommonProvider',
  function(PartnerService, CommonProvider){

    var _partner_lists;
    var _partner_model = {

      // 获取友链列表
      get: function (params) {
        return CommonProvider.request({
          method: 'get',
          service: new PartnerService(),
          params: params,
          success: function (_partners) {
            _partner_lists = _partners;
          }
        });
      },
      
      // 新增友链
      add: function (partner) {
        return CommonProvider.request({
          method: 'save',
          service: new PartnerService(partner)
        });
      },

      // 删除友链
      del: function (params) {
        return CommonProvider.request({
          method: 'remove',
          service: new PartnerService(),
          params: params,
          success: function () {
            _partner_lists.pagination.total -= 1;
          }
        });
      }
    };
    
    return _partner_model;
  }
])
/**
* PaymentModel Module
*
* Description
*/
angular.module('PaymentModel', ['PaymentService'])

// 支付模型
.factory('PaymentModel', ['PaymentService', 'CommonProvider',
  function(PaymentService, CommonProvider){
    
    var _payment = {};
    var _payment_list;
    var _payment_service = new PaymentService();

    _payment_model = {

      // 生成支付订单
      pay: function (config) {
        return CommonProvider.request({
          method: 'pay',
          service: new PaymentService({ course_ids: config.course_ids }),
        });
      },

      // 获取支付状态
      getPayStatus: function (config) {
        return CommonProvider.request({
          method: 'getStatus',
          service: _payment_service,
          params: config
        });
      },

      // 实际支付
      payment: function (config) {
        return CommonProvider.request({
          method: 'payment',
          service: new PaymentService(config.body),
          params: { payment_id: config.payment_id }
        });
      },

      // 获取支付单列表
      get: function (params) {
        params.page = params.page || 1;
        params.per_page = params.per_page || 20;
        return CommonProvider.request({
          method: 'get',
          service: new PaymentService(),
          params: params,
          success: function (_payment_lists) {
            _payment_list = _payment_lists;
          }
        });
      },

      // 获取支付单详情
      item: function (params) {
        return CommonProvider.request({
          method: 'item',
          service: new PaymentService(),
          params: params,
          success: function (_payment_item) {
            _payment.info = _payment_item;
          }
        });
      },

      // 删除支付单
      del: function (payment) {
        return CommonProvider.request({
          method: 'del',
          service: new PaymentService(),
          params: { payment_id: payment.payment.id },
          success: function (_payment) {
            _payment_list.result.remove(payment.payment);
            _payment_list.pagination.total -= 1;
          }
        });
      },

      // 批量删除支付单
      delete: function (ids) {
        return CommonProvider.request({
          method: 'delete',
          service: new PaymentService(),
          params: { ids: ids.join(',') },
          success: function (_payment) {
            _payment_model.get({ page: _payment_list.pagination.current_page });
          }
        });
      },
    };
    
    return _payment_model;
  }
])
/**
*
* PublicModel Module
*
* PublicModel Description
*
*/
angular.module('PublicModel', ['PublicService'])

// 入驻机构模型
.factory('PublicModel', ['PublicService', 'CommonProvider',
  function(PublicService, CommonProvider){

    var _public_model = {

      // 缓存清理
      clearcache: function (params) {
        return CommonProvider.request({
          method: 'clearcache',
          service: new PublicService(),
          params: params,
        });
      },


      // 获取友链列表
      get: function (params) {
        return CommonProvider.request({
          method: 'get',
          service: new PublicService(),
          params: params,
          success: function (_publics) {
            _public_lists = _publics;
          }
        });
      },
      


    };
    
    return _public_model;
  }
])
/**
*
* QuestionModel Module
*
* Description
*
*/
angular.module('QuestionModel', ['QuestionService'])

// 问答模型
.factory('QuestionModel', ['QuestionService', 'CommonProvider',
  function(QuestionService, CommonProvider){

    var _question_lists;
    var _answer_lists;
    var _question_model = {
      
      // 获取问答
      get: function (params) {
        return CommonProvider.request({
          method: 'get',
          service: new QuestionService(),
          params: params
        });
      },

      // 新增问答
      post: function (question) {
        return CommonProvider.request({
          method: 'save',
          service: new QuestionService(question),
        });
      },

      // 删除问答
      del: function (params) {
        return CommonProvider.request({
          method: 'del',
          service: new QuestionService(),
          params: params,
          success: function (_question) {
            // _question_list.result.remove(question.question);
            // _question_list.pagination.total -= 1;
          }
        });
      },

      // 批量删除问答
      delete: function (ids) {
        return CommonProvider.request({
          method: 'delete',
          service: new QuestionService(),
          params: { ids: ids.join(',') },
          success: function (_question) {
            _question_model.get({ page: _question_list.pagination.current_page });
          }
        });
      },

      // 获取单条问答
      item: function (question) {
        return CommonProvider.request({
          method: 'item',
          service: new QuestionService(),
          params: question
        });
      },

      // 修改单条问答
      put: function (question) {
        return CommonProvider.request({
          method: 'put',
          service: new QuestionService(question.body),
          params: { question_id: question.id }
        });
      }

    };
    
    return _question_model;
  }
])
/**
*
* ScoreModel Module
*
* Description
*
*/
angular.module('ScoreModel', ['ScoreService'])

// 积分数据模型
.factory('ScoreModel', ['ScoreService', 'CommonProvider',
  function(ScoreService, CommonProvider){

    var _score_model = {

      // 获取我的积分
      get: function (params) {
        return CommonProvider.request({
          method: 'get',
          service: new ScoreService(),
          params: params
        });
      },

      // 获取积分等级
      getLevels: function (params) {
        return CommonProvider.request({
          method: 'getLevels',
          service: new ScoreService(),
          params: params
        });
      },

      // 获取积分规则
      getRules: function (params) {
        return CommonProvider.request({
          method: 'getRules',
          service: new ScoreService(),
          params: params
        });
      },

    };
    
    return _score_model;
  }
])
/**
*
* SearchModel Module
*
* Description
*
*/
angular.module('SearchModel', ['SearchService'])

// 章节数据模型
.factory('SearchModel', ['SearchService', 'CommonProvider',
  function(SearchService, CommonProvider){

    var _search_model = {

      // 搜索
      get: function (params) {
        return CommonProvider.request({
          method: 'get',
          service: new SearchService(),
          params: params
        });
      },

      // 获取热词
      getHotWords: function (params) {
        return CommonProvider.request({
          method: 'getHotWords',
          service: new SearchService(),
          params: params
        });
      },

      // 保存热词
      putHotWords: function (hot_words) {
        return CommonProvider.request({
          method: 'putHotWords',
          service: new SearchService(hot_words),
        });
      },

      // 索引初始化
      searchInit: function (params) {
        return CommonProvider.request({
          method: 'searchInit',
          service: new SearchService(),
          params: { type: params.type }
        });
      },

      // 清空索引
      searchClean: function (params) {
        return CommonProvider.request({
          method: 'searchClean',
          service: new SearchService(),
          params: { type: params.type }
        });
      },

    };
    
    return _search_model;
  }
])
/**
* SectionModel Module
*
* Description
*/
angular.module('SectionModel', ['SectionService'])

// 章节数据模型
.factory('SectionModel', ['SectionService', 'CommonProvider',
  function(SectionService, CommonProvider){

    var _section_list;
    var _section_item;
    var _section_model = {};

    _section_model = {

      // 获取课程列表
      get: function (params) {
        params.page = params.page || 1;
        params.per_page = params.per_page || 20;
        return CommonProvider.request({
          method: 'get',
          service: new SectionService(),
          params: params,
          success: function (_section_lists) {
            _section_list = _section_lists;
          }
        });
      },

      // 添加章节
      add: function (section) {
        return CommonProvider.request({
          method: 'save',
          service: new SectionService(section)
        });
      },

      // 修改章节
      put: function (section) {
        return CommonProvider.request({
          method: 'put',
          service: new SectionService(section),
          params: { section_id: section.id, role: section.role }
        });
      },

      // 删除章节
      del: function (params) {
        return CommonProvider.request({
          method: 'del',
          service: new SectionService(),
          params: params
        });
      },

      // 批量删除章节
      delete: function (ids) {
        return CommonProvider.request({
          method: 'delete',
          service: new SectionService(),
          params: { ids: ids.join(',') }
        });
      },

      // 获取单个课程信息
      item: function (params) {
        return CommonProvider.request({
          method: 'item',
          service: new SectionService(),
          params: params,
          success: function (section_item) {
            _section_item = section_item.result;
          }
        });
      },

      // 更新排序
      sort: function (sorts) {
        return CommonProvider.request({
          method: 'update',
          service: new SectionService(),
          body: { data: sorts }
        });
      },

      // 更新播放记录
      postStudyRecord: function (params) {
        return CommonProvider.request({
          method: 'postStudyRecord',
          service: new SectionService(),
          params: params
        });
      },

      // 获取视频地址
      getVideos: function (params) {
        return CommonProvider.request({
          method: 'getVideos',
          service: new SectionService(),
          params: params
        });
      },

      // 获取问答列表
      getQuestions: function (params) {
        return CommonProvider.request({
          method: 'getQuestions',
          service: new SectionService(),
          params: params
        });
      },

      // 初始化直播节
      initLiveSection: function (params) {
        return CommonProvider.request({
          method: 'initLiveSection',
          service: new SectionService(),
          params: params
        });
      },

      // 关闭直播节
      closeLiveSection: function (params) {
        return CommonProvider.request({
          method: 'closeLiveSection',
          service: new SectionService(),
          params: params
        });
      },

      // 获取推流地址
      getLiveUpstream: function (params) {
        return CommonProvider.request({
          method: 'getLiveUpstream',
          service: new SectionService(),
          params: params
        });
      },

    };

    return _section_model;
  }
])

/**
*
* SmsModel Module
*
* Description
*
*/
angular.module('SmsModel', ['SmsService'])

// 短信记录数据模型
.factory('SmsModel', ['SmsService', 'CommonProvider',
  function(SmsService, CommonProvider){

    var _sms_list;
    var _sms_item;
    var _sms_model = {};

    _sms_model = {

      // 获取短信记录列表
      get: function (params) {
        params.page = params.page || 1;
        params.per_page = params.per_page || 20;
        return CommonProvider.request({
          method: 'get',
          service: new SmsService(),
          params: params,
          success: function (sms_lists) {
            _sms_list = sms_lists;
          }
        });
      },

      // 获取单条短信记录详情
      item: function (params) {
        return CommonProvider.request({
          method: 'item',
          service: new SmsService(),
          params: params,
          success: function (sms_item) {
            _sms_item = sms_item;
          }
        });
      },

      // 删除短信记录
      del: function (sms) {
        return CommonProvider.request({
          method: 'del',
          service: new SmsService(),
          params: { sms_id: sms.id },
          success: function (_sms) {
            _sms_list.result.remove(sms);
            _sms_list.pagination.total -= 1;
          }
        });
      }
    };
    
    return _sms_model;
  }
])
/**
*
* StudentModel Module
*
* Description
*
*/
angular.module('StudentModel', ['StudentService'])

// 课程数据模型
.factory('StudentModel', ['StudentService', 'CommonProvider',
  function(StudentService, CommonProvider){
    
    var _student_model = {

      // 路径汇总
      get: function (params) {
        return CommonProvider.request({
          method: 'get',
          service: new StudentService(),
          params: params
        });
      },

      // 修改资料
      put: function (user) {
        return CommonProvider.request({
          method: 'put',
          service: new StudentService(user)
        });
      }
    };

    return _student_model;
  }
]);
/**
*
* TeacherModel Module
*
* Description
*
*/
angular.module('TeacherModel', ['TeacherService'])

// 课程数据模型
.factory('TeacherModel', ['TeacherService', 'CommonProvider',
  function(TeacherService, CommonProvider){

    var _teacher_model = {

      // 获取老师信息
      get: function (params) {
        return CommonProvider.request({
          method: 'get',
          service: new TeacherService(),
          params: params
        });
      },

      // 获取收入明细列表
      incomeDetail: function (params) {
        return CommonProvider.request({
          method: 'incomeDetail',
          service: new TeacherService(),
          params: params
        });
      },

      // 获取收入统计
      incomeDaily: function (params) {
        return CommonProvider.request({
          method: 'incomeDaily',
          service: new TeacherService(),
          params: params
        });
      },
    }

    return _teacher_model;
  }
]);
/**
*
* TradeModel Module
*
* Description
*
*/
angular.module('TradeModel', ['TradeService'])

// 交易数据模型
.factory('TradeModel', ['TradeService', 'CommonProvider',
  function(TradeService, CommonProvider){

    var _trade = {};
    var _trade_list;

    var _trade_model = {

      // 获取交易列表
      get: function (params) {
        params.page = params.page || 1;
        params.per_page = params.per_page || 20;
        return CommonProvider.request({
          method: 'get',
          service: new TradeService(),
          params: params,
          success: function (_trade_list) {
            _trade_list = _trade_list;
          }
        });
      },

      // 获取交易详情
      item: function (params) {
        return CommonProvider.request({
          method: 'item',
          service: new TradeService(),
          params: params,
          success: function (_trade_item) {
            return _trade_item;
          }
        });
      },

      // 取消订单
      cancel: function (trade) {
        return CommonProvider.request({
          method: 'cancel',
          service: new TradeService(),
          params: trade,
          success: function (_trade) {
            // console.log(_trade);
          }
        });
      },

      // 删除订单
      del: function (trade) {
        return CommonProvider.request({
          method: 'del',
          service: new TradeService(),
          params: { trade_id: trade.trade.id },
          success: function (_trade) {
            _trade_list.result.remove(trade.trade);
            _trade_list.pagination.total -= 1;
          }
        });
      },

      // 批量删除订单
      delete: function (ids) {
        return CommonProvider.request({
          method: 'delete',
          service: new TradeService(),
          params: { ids: ids.join(',') },
          success: function (_trade) {
            _trade_model.get({ page: _trade_list.pagination.current_page });
          }
        });
      },
    };

    return _trade_model;
  }
]);
/**
*
* WithdrawModel Module
*
* Description
*
*/
angular.module('WithdrawModel', ['WithdrawService'])

// 提现模型
.factory('WithdrawModel', ['WithdrawService', 'CommonProvider',
  function(WithdrawService, CommonProvider){

    var _withdraw_list;
    var _withdraw_model = {

      // 获取提现列表
      get: function (params) {
        params.page = params.page || 1;
        params.per_page = params.per_page || 20;
        return CommonProvider.request({
          method: 'get',
          service: new WithdrawService(),
          params: params,
          success: function (_withdraw_lists) {
            _withdraw_list = _withdraw_lists;
          }
        });
      },

      // 申请提现
      apply: function (bill) {
        return CommonProvider.request({
          method: 'save',
          service: new WithdrawService(bill)
        });
      },

      // 获取提现详情
      item: function (params) {
        return CommonProvider.request({
          method: 'item',
          service: new WithdrawService(),
          params: params,
          success: function (_withdraw_item) {
            return _withdraw_item;
          }
        });
      },

      // 取消提现
      cancel: function (withdraw) {
        return CommonProvider.request({
          method: 'cancel',
          service: new WithdrawService(),
          params: withdraw,
          success: function (_withdraw) {
          }
        });
      },

      // 修改提现
      put: function (withdraw) {
        return CommonProvider.request({
          method: 'put',
          service: new WithdrawService(withdraw.body),
          params: { withdraw_id: withdraw.id }
        });
      },

      // 删除提现订单
      del: function (withdraw) {
        return CommonProvider.request({
          method: 'del',
          service: new WithdrawService(),
          params: { withdraw_id: withdraw.withdraw.id },
          success: function (_withdraw) {
            _withdraw_list.result.remove(withdraw.withdraw);
            _withdraw_list.pagination.total -= 1;
          }
        });
      },

      // 批量删除提现订单
      delete: function (ids) {
        return CommonProvider.request({
          method: 'delete',
          service: new WithdrawService(),
          params: { ids: ids.join(',') },
          success: function (_withdraw) {
            _withdraw_model.get({ page: _withdraw_list.pagination.current_page });
          }
        });
      },

    };

    return _withdraw_model;
  }
]);

/*
*
* AuthProvider
*
* Description
*
*/

angular.module('AuthProvider', ['AuthModel'])

// 权限初始化
.factory('PermissionProvider', ['$rootScope', '$localStorage', '$location', '$state', 'CommonProvider', 'AuthModel', function ($rootScope, $localStorage, $location, $state, CommonProvider, AuthModel) {
    return {
      init: function() {
        if ($localStorage.token) {
          CommonProvider.promise({
            model: AuthModel,
            method: 'check',
            success: function (auth) {
              $localStorage.user = auth.result;
              CommonProvider.promise({
                method: 'menu',
                model: AuthModel,
                success: function (permissions) {
                  $rootScope.permissions = permissions.result;
                  $rootScope.menus = $rootScope.permissions.menus;
                  $rootScope.routes = $rootScope.permissions.grant_routes;
                  $rootScope.admin_menu_show = false;
                  $rootScope.$broadcast('permissionsChanged');
                  $rootScope.routeCheck();
                }
              });
            },
            error: function () {
              $location.path('/login');
            }
          });
        } else {
          if ($location.$$url != '/login' && $location.$$url != '/forgot' && $location.$$url != '/register') {
            $location.path('/login');
          }
        };
      }
   };
}])

// 前端初始化
.factory('AuthProvider', ['$rootScope', '$localStorage', '$location', '$state', '$window', 'CommonProvider', 'AuthModel', function ($rootScope, $localStorage, $location, $state, $window, CommonProvider, AuthModel) {
    var AuthProvider =  {

      // 自动登录以及拿到token后登录
      init: function(callback) {
        if ($localStorage.token) {
          CommonProvider.promise({
            model: AuthModel,
            method: 'check',
            success: function (auth) {
              $localStorage.user = auth.result;
              $rootScope.user = auth.result;
              if (!!callback && typeof callback == 'function') {
                callback(auth.result);
              }
            },
            error: function () {
              delete $localStorage.token;
              if ($localStorage.user) delete $localStorage.user;
            }
          });
        } else {
          if ($localStorage.user) delete $localStorage.user;
        }
      },

      // 登录获取token
      login: function (config) {
        CommonProvider.promise({
          model: AuthModel,
          method: 'login',
          params: config.user,
          success: function (auth) {
            $localStorage.token = auth.result;
            $rootScope.setTokenLimit(config.user.auto_login);
            if (config.callback) {
              config.callback(auth);
              return false;
            };
            AuthProvider.init();
            if (config.modal) {
              $rootScope.modal.close();
            } else {
              $location.path('/index');
            }
          },
          error: function (auth) {
            $rootScope.modal.close();
            $rootScope.modal.error({ message: auth.message, info: auth.result });
          }
        });
      },

      // 退出
      logout: function () {
        CommonProvider.promise({
          model: AuthModel,
          method: 'logout',
          success: function () {
            console.log('退出成功');
            delete $rootScope.user;
            delete $rootScope.token;
            delete $localStorage.user;
            delete $localStorage.token;
            $window.location.href = '/';
          }
        }); 
      },

      // 检查本地是否登录及回调
      check: function (callback) {
        var user = $rootScope.user || $localStorage.user || false;
        if (!!user) {
          callback(user);
        } else {
          $rootScope.$watch('user', function (user) {
            if (!!user) callback(user);
          });
        }
      }
    };
    return AuthProvider;
}])
/*
*
* CommonProvider
*
* Description
*
*/

angular.module('CommonProvider', [])

// 公共封装
.factory('CommonProvider', ['$q', '$rootScope', '$window', '$location', '$anchorScroll', '$modal',
  function ($q, $rootScope, $window, $location, $anchorScroll, $modal) {

    var commonProvider =  {

      // 服务请求封装
      request: function (config) {
        config.method = '$' + config.method;
        config.params = config.params || {};
        if (config.body) {
          for(var key in config.body) { 
            var name = key;
            var value = config.body[key];
            config.service[name] = config.body[key];
          }
        } else {
          config.body = {};
        };
        var deferred = $q.defer();
        var success_callback = function (result) {
          deferred.resolve(result);
          if (result.code == 1) {
            if (config.success && typeof config.success == 'function') {
              eval(config.success(result));
            }
          }
        };
        var error_callback = function (error) {
          deferred.reject(error);
          if (config.error && typeof config.error == 'function') {
            eval(config.error(error));
          }
        };
        if (!!config.service[config.method]) {
          config.service[config.method](config.params, function (result) {
            success_callback(result);
          }, function (error) { 
            error_callback(error);
          });
        };
        return deferred.promise;
      },

      // 期望请求封装
      promise: function (config) {
        config.method = config.method;
        config.params = config.params || {};
        var success_callback = function (result) {
          if (result.code == 1) {
            if (config.success && typeof config.success == 'function') {
              eval(config.success(result));
            }
          } else {
            if (config.error && typeof config.error == 'function') {
              eval(config.error(result));
            }
          }
        };
        var error_callback = function (error) {
          if (config.error && typeof config.error == 'function') {
            eval(config.error(error));
          }
        };
        var result_callback = function (result) {
          if (config.result && typeof config.result == 'function') {
            eval(config.result(result));
          }
        };
        if (!!config.model[config.method]) {
          config.model[config.method](config.params).then(function (result) {
            result_callback(result);
            success_callback(result);
          }, function (error) { 
            result_callback(error);
            // error_callback(error);
          });
        };
      },

      // 全局搜索请求封装
      search: function (config) {
        config.method = config.method;
        config.params = config.params || {};
        config.success = config.success;
        config.error = config.error;
        var params_length = config.params.length;
        var params_search = [];
        if (params_length > 0) {
          angular.forEach(config.params, function(value, key) {
            angular.forEach(value, function(v, k) {
              params_search['column['+key+']['+k+']'] = v;
            });
          });
        }
        commonProvider.request({
          service: config.service,
          method: 'search',
          params: params_search,
          success: config.success,
          error: config.error
        });
      },

      // 全局排序操作封装
      sort: function (config) {
        config.method = config.method;
        config.params = config.params || {};
        config.data = config.data || {};
        if (config.params.partTo) {
          var sorts = [];
          var sort = {};
          for (var i = 0; i < config.params.partTo.length; i++) {
            sort = {};
            sort.id = config.params.partTo[i].id;
            sort.data = {sort: i};
            sorts.push(sort);
          }
          if (!!config.model['sort']) {
            config.model['sort'](sorts).then(function (result) {
              config.data.find(config.params.item).sort = config.params.indexTo
            });
          }
        }
      },
      
      // 到顶部
      toTop: function() {
        var scrollTo = function (element, to, duration) {
          if (duration <= 0) return;
          var difference = to - element.scrollTop;
          var perTick = difference / duration * 10;
          setTimeout(function() {
            element.scrollTop = element.scrollTop + perTick;
            if (element.scrollTop == to) return;
            scrollTo(element, to, duration - 10);
          }, 10);
        };
        scrollTo(document.body, 0, 30);
      },

      // 自动回顶部
      autoTop: function () {
        $rootScope.$on('$locationChangeSuccess', function () {
          commonProvider.toTop();
        });
      },

      // 定位到某ID元素
      goToDom: function (id) {
        var old = $location.hash();
        $location.hash(id);
        $anchorScroll();
        $location.hash(old);
      },

      // 定位到某活动tab
      setTabActive: function (scope, tab_index) {

        // 确认上下文有效
        if (!scope) return false;

        // 本级域
        if (!scope.tabs || (scope.tabs && !scope.tabs.length)) return false;
        scope.tabs.setAttr('active', false);
        scope.tabs[tab_index - 1].active = true;
      },

      // 获取图片
      getThumbnail: function (key, type, params) {
        if (!key) return;
        var default_params = {
          mode: 1,
          width: 500,
          height: 300,
          format: 'jpg', // 取值范围：jpg，gif，png，webp等，缺省为原图格式。
          interlace: 1, // 取值范围：1 支持渐进显示，0不支持渐进显示(缺省为0)，适用目标格式：jpg
          quality: 100, // 取值范围是[1, 100]，默认75。
          blur: 0 // 模糊滤镜级别，0是关闭
        };
        var param = angular.extend(default_params, (params || {}));
        var blur; 
        switch (param.blur) {
          case 0:
            blur = '';
            break;
          case 1:
            blur = '|imageMogr2/blur/2x2';
            break;
          case 2:
            blur = '|imageMogr2/blur/5x5';
            break;
          case 3:
            blur = '|imageMogr2/blur/10x10';
            break;
          default:
            break;
        }
        return $rootScope.config.fileUrl + key + '?imageView2/' + param.mode + '/w/' + param.width + '/h/' + param.height + '/format/' + param.format + '/interlace/' + param.interlace + '/q/' + param.quality + blur;
      },

      // 全局分享
      share: function (type) {
        var wb_parems = 'url=' + $location.$$absUrl + '&title=' + $rootScope.title + ' - ' + $rootScope.description + '&language=zh_cn&searchPic=true';
        var qq_parems = 'url=' + $location.$$absUrl + '&title=' + $rootScope.title + '&summary=' + $rootScope.description + '&site=' + '学天下' + '&desc=' + '我发现了一个不错的学习网站哦，快来看看吧！' + '&pics=';
        var qr_parems = 'text=' + $location.$$absUrl;
        qr_parems = (qr_parems.contain('www')) ? qr_parems.replace(/www/ig, 'm') : qr_parems.add('m.', 'http://');
        switch (type) {
          case 'qq':
              $window.open('http://sns.qzone.qq.com/cgi-bin/qzshare/cgi_qzshare_onekey?' + qq_parems);
              break;
          case 'weibo':
              $window.open('http://service.weibo.com/share/share.php?' + wb_parems);
              break;
          case 'qrcode':
              $modal.image({ url: '/server/api/v1/qrcode?' + qr_parems });
              // $modal.image({ url: '/images/qrcode.png' });
              break;
            default:
              break;
        }
      },

    };
    return commonProvider;
  }
])
/**
* QuploadProvider Module
*
* Description
*/
angular.module('QuploadProvider', [])

.factory('QuploadProvider', ['$rootScope', 'appConfig',
  function($rootScope, appConfig){

    var quploadProvider = {
      /**
       * 根据图片名称获取剪裁后的图片路径
       * 图片剪裁详细说明参照：http://developer.qiniu.com/docs/v6/api/reference/fop/image/imageview2.html
       */
      getThumbnail: function (key, type, params) {
        if (!key || key == '') {
          return ;
        }
        
        var default_params = {
          mode: 1,
          width: 500,
          height: 300,
          format: 'jpg', // 取值范围：jpg，gif，png，webp等，缺省为原图格式。
          interlace: 1, // 取值范围：1 支持渐进显示，0不支持渐进显示(缺省为0)，适用目标格式：jpg
          quality: 100, // 取值范围是[1, 100]，默认75。
          blur: 0 // 模糊滤镜级别，0是关闭
        }

        if (params == undefined) {
          params = {};
        }

        var param = angular.extend(default_params, params);

        // 配置模糊
        var blur; 
        if (param.blur == 0) {
          blur = '';
        } else if (param.blur == 1) {
          blur = '|imageMogr2/blur/2x2';
        } else if (param.blur == 2) {
          blur = '|imageMogr2/blur/5x5';
        } else if (param.blur == 3) {
          blur = '|imageMogr2/blur/10x10';
        }

        var thumbnail_src = appConfig.fileUrl + key + '?imageView2/' + param.mode + '/w/' + param.width + '/h/' + param.height + '/format/' + param.format + '/interlace/' + param.interlace + '/q/' + param.quality + blur;
        return thumbnail_src;
      },

      /**
       * 获取七牛静态资源数据
       */
      getStatic: function (key, params) {
        if (!key || key == '') {
          return ;
        }
        
        var default_params = {
          mode: 1,
          width: 500,
          height: 300,
          format: 'jpg', // 取值范围：jpg，gif，png，webp等，缺省为原图格式。
          interlace: 1, // 取值范围：1 支持渐进显示，0不支持渐进显示(缺省为0)，适用目标格式：jpg
          quality: 100, // 取值范围是[1, 100]，默认75。
          blur: 0 // 模糊滤镜级别，0是关闭
        }

        if (params == undefined) {
          params = {};
        }

        // 配置参数
        var param = angular.extend(default_params, params);
        // 配置模糊
        var blur; 
        if (param.blur == 0) {
          blur = '';
        } else if (param.blur == 1) {
          blur = '|imageMogr2/blur/2x2';
        } else if (param.blur == 2) {
          blur = '|imageMogr2/blur/5x5';
        } else if (param.blur == 3) {
          blur = '|imageMogr2/blur/10x10';
        }
        var thumbnail_src = appConfig.staticUrl + key + '?imageView2/' + param.mode + '/w/' + param.width + '/h/' + param.height + '/format/' + param.format + '/interlace/' + param.interlace + '/q/' + param.quality + blur;
        return thumbnail_src;
      }
    };

    return quploadProvider;
  }
])
/*
* HTML编译输出模块 
*
* Description
*/

angular.module('HtmlFilter', [])

// html安全解析过滤器
.filter('toHtml', ['$sce', function($sce){
  return function(text) {
    return $sce.trustAsHtml(text);
  };
}])

// 文字溢出过滤器
.filter('textOverflow', ['$sce', function($sce){
  return function(text, length) {
    if (length && text && (text.length) > length ) {
      return text.substr(0, length) + '...';
    } else {
      return text;
    }
  };
}])

// 价格自动+.00
.filter('priceFormat', [function(){
  return function(text) {
    if (!isNaN(text)) {
      return (text.toFixed(2));
    } else {
      return text;
    }
  }
}])

// 查看更多
.filter('readMore',function(){
  return function(content, length, text){
    var more_btn = '...<a class="read-more">&nbsp;&nbsp;' + ( text || "查看全部" ) + '&nbsp;>></a>';
    // 如果实际内容长度小于设置的长度则输出原文
    if (content.length != 0 && content.length < length) {
      return content;
    // 否则，仅输出截取后的内容以及提示文字
    } else {
      return content.substr(0, length) + more_btn;
    }
    
  }
})
/*
*
* 时间格式化模块 
*
* Description
*
*/

angular.module('TimeFilter', [])

// ISO时间转换过滤器
.filter('dateFilter', ['dateFilter', function(dateFilter){
  return function(text) {
    return dateFilter(text, 'yyyy-MM-dd');
  };
}])

// YMDHMS时间转换过滤器
.filter('toYMD', [function(){
  return function(date) {
    return !!date ? date.toString().substr(0 ,10) : date;
  };
}])

// 转换为相对时间 2016-04-01 to 三天前/10分钟前/半年前...
.filter('relativeTime', ['$rootScope', function($rootScope){
  return function(time) {
    return $rootScope.moment.from(time, false);
  };
}])

// 秒转为小时分钟过滤器
.filter('toHHMMSS', function () {
  return function (sec, type, h_slug, m_slug, s_slug) {

    // 计算
    var sec_num = parseInt(sec, 10);
    var hours   = Math.floor( sec_num / 3600 );
    var minutes = Math.floor(( sec_num - ( hours * 3600 )) / 60 );
    var seconds = sec_num - ( hours * 3600 ) - ( minutes * 60 );

    // 低级格式化
    if (hours   < 10) { hours   = '0' + hours; }
    if (minutes < 10) { minutes = '0' + minutes; }
    if (seconds < 10) { seconds = '0' + seconds; }

    // 显示规则
    var hour_display, minute_display, second_display;
    if (type) {
      hour_display = type.indexOf("H") > -1 && hours > 0 ? true : false;
      minute_display = type.indexOf("M") > -1 ? true : false;
      second_display = type.indexOf("S") > -1 ? true : false;
    } else {
      hour_display = minute_display = second_display = true;
    }

    // 自定义格式化
    var hour_slug = h_slug != undefined ? h_slug : ':';
    var minute_slug = m_slug != undefined ? m_slug : ':';
    var second_slug = s_slug != undefined ? s_slug : '';

    var time = ( hour_display ? hours + hour_slug : '' ) + ( minute_display ? minutes + minute_slug : '' ) + ( second_display ? seconds + second_slug : '' );
    return time;
  };
})
angular.module('AppRoutes',[]).config(['$stateProvider', '$urlRouterProvider', '$httpProvider', '$locationProvider',
  function ($stateProvider, $urlRouterProvider, $httpProvider, $locationProvider) {

    // 404路径，跳转至首页
    $urlRouterProvider.otherwise('/');

    // 配置路由
    $stateProvider

      // 首页
      .state('index', {
        url: '/',
        templateUrl: '/partials/home/index/index.html',
        controller: 'IndexController',
        data: {
          title: '首页',
          url: '/'
        }
      })

      // UI-Demo
      .state('ui', {
        url: '/ui',
        templateUrl: '/partials/home/index/ui.html',
        controller: 'IndexController',
        data: {
          title: 'UI',
          url: ''
        }
      })

      // Mobile
      .state('mobile', {
        url: '/mobile',
        templateUrl: '/partials/home/index/mobile.html',
        controller: 'IndexController',
        data: {
          title: 'APP客户端下载',
          url: ''
        }
      })

      // --------------------------------

      // 授权模块
      .state('auth', {
        abstract: true,
        url: '/auth',
        template: '<div ui-view class="no-animation"></div>',
        controller: 'AuthController',
        data: {
          title: '授权模块',
          url: '/auth',
        }
      })

      // 用户登录
      .state('auth.login', {
        url: '/login',
        templateUrl: '/partials/home/auth/login.html',
        controller: 'AuthController',
        data: {
          title: '用户登录',
          url: '/auth/login'
        }
      })

      // 用户注册
      .state('auth.register', {
        url: '/register',
        templateUrl: '/partials/home/auth/register.html',
        controller: 'AuthController',
        data: {
          title: '用户注册',
          url: '/auth/register'
        }
      })

      // 公益用户登录
      .state('auth.login_welfare', {
        url: '/login/welfare',
        templateUrl: '/partials/home/auth/welfare.html',
        controller: 'AuthController',
        data: {
          title: '公益用户登录',
          url: '/auth/login/welfare'
        }
      })

      // 找回密码
      .state('auth.forgot', {
        url: '/forgot',
        templateUrl: '/partials/home/auth/forgot.html',
        controller: 'AuthController',
        data: {
          title: '找回密码',
          url: '/auth/login/forgot'
        }
      })

      // 账户绑定
      .state('auth.bind', {
        url: '/bind',
        templateUrl: '/partials/home/auth/bind.html',
        controller: 'AuthController',
        data: {
          title: '账户绑定',
          url: '/auth/bind'
        }
      })

      // --------------------------------

      // 注册协议页
      .state('article_license', {
        url: '/article/license',
        templateUrl: '/partials/home/article/license.html',
        controller: 'ArticleController',
        data: {
          title: '学天下注册协议',
          url: '/article/license',
          slug: ''
        }
      })

      // 文章页
      .state('article', {
        url: '/article/list/:category_id',
        templateUrl: '/partials/home/article/index.html',
        controller: 'ArticleController',
        data: {
          title: '文章列表',
          url: '',
          slug: ''
        }
      })
      
      // --------------------------------

      // 课程
      .state('course', {
        url: '/course',
        templateUrl: '/partials/home/course/lists.html',
        controller: 'CourseController',
        data: {
          title: '课程列表',
          url: '/course'
        }
      })

      // 课程搜索（无关键词）
      .state('course_search_error', {
        url: '/course/search',
        templateUrl: '/partials/home/course/lists.html',
        controller: 'CourseController',
        data: {
          title: '课程列表',
          url: ''
        }
      })

      // 课程搜索分类
      .state('course_search', {
        url: '/course/search/:key',
        templateUrl: '/partials/home/course/lists.html',
        controller: 'CourseController',
        data: {
          title: '课程搜索',
          url: ''
        }
      })

      // 课程分类
      .state('course_list', {
        url: '/course/list/:category_id',
        templateUrl: '/partials/home/course/lists.html',
        controller: 'CourseController',
        data: {
          title: '课程分类',
          url: ''
        }
      })

      // 课程详情
      .state('course_detail', {
        url: '/course/:course_id',
        templateUrl: '/partials/home/course/detail.html',
        controller: 'CourseController',
        data: {
          title: '课程详情',
          url: ''
        }
      })

      // 课程播放
      .state('course_learn', {
        url: '/course/:course_id/learn/:section_id',
        templateUrl: '/partials/home/course/learn.html',
        controller: 'LearnController',
        data: {
          title: '课程播放',
          url: ''
        }
      })

      // 课程播放（定点）
      .state('course_learn_from_record', {
        url: '/course/:course_id/learn/:section_id/:record_time',
        templateUrl: '/partials/home/course/learn.html',
        controller: 'LearnController',
        data: {
          title: '课程播放',
          url: ''
        }
      })

      // 课程购买
      .state('course_buy', {
        url: '/course/:course_id/buy',
        templateUrl: '/partials/home/course/detail.html',
        controller: 'CourseController',
        data: {
          title: '课程购买',
          url: ''
        }
      })

      // 支付失败
      .state('payment_error', {
        url: '/payment/error',
        templateUrl: '/partials/home/course/buy-error.html',
        controller: 'PaymentController',
        data: {
          title: '支付失败',
          url: '/payment/error'
        }
      })

      // 支付课程
      .state('payment', {
        url: '/payment/:course_ids',
        templateUrl: '/partials/home/course/payment.html',
        controller: 'PaymentController',
        data: {
          title: '课程支付',
          url: ''
        }
      })

      // 支付成功
      .state('payment_success', {
        url: '/payment/:course_ids/success',
        templateUrl: '/partials/home/course/buy-success.html',
        controller: 'PaymentController',
        data: {
          title: '支付成功',
          url: '/payment/success'
        }
      })

      // --------------------------------

      // 学校/机构列表页（简易）
      .state('organization_list', {
        url: '/organization',
        templateUrl: '/partials/home/organization/list.html',
        controller: 'OrganizationlController',
        data: {
          title: '学校列表'
        }
      })

      // 学校/机构列表页（搜索空白）
      .state('organization_search_error', {
        url: '/organization/search',
        templateUrl: '/partials/home/organization/list.html',
        controller: 'OrganizationlController',
        data: {
          title: '学校列表'
        }
      })

      // 学校/机构列表页（搜索）
      .state('organization_search', {
        url: '/organization/search/:key',
        templateUrl: '/partials/home/organization/search.html',
        controller: 'OrganizationlController',
        data: {
          title: '学校列表'
        }
      })

      // 学校/机构主页
      .state('organization', {
        url: '/organization/:organization_id',
        templateUrl: '/partials/home/organization/index.html',
        controller: 'OrganizationlController',
        data: {
          title: '机构主页'
        }
      })

      // --------------------------------

      // 学生主页
      .state('student_index', {
        url: '/space/student/:student_id',
        templateUrl: '/partials/home/student/index.html',
        controller: 'StudentController',
        data: {
          title: '学生主页',
          url: ''
        }
      })

      // 老师主页
      .state('teacher_index', {
        url: '/organization/:organization_id/teacher/:teacher_id',
        templateUrl: '/partials/home/organization/teacher.html',
        controller: 'OrganizationlController',
        data: {
          title: '老师主页',
          url: ''
        }
      })

      // --------------------------------

      // 用户中心
      .state('user', {
        abstract: true,
        url: '/user',
        templateUrl: '/partials/home/user/sidebar.html',
        controller: 'UserController',
        data: {
          title: '个人中心',
          url: '/user/index'
        }
      })

      // 首页
      .state('user.index', {
        url: '/index',
        templateUrl: '/partials/home/user/index.html',
        controller: 'UserController',
        data: {
          title: '',
          url: '',
          slug: 'index'
        }
      })

      // 我的课程
      .state('user.course', {
        url: '/course',
        templateUrl: '/partials/home/user/course.html',
        controller: 'UserController',
        data: {
          title: '我的课程',
          url: '',
          slug: 'course'
        }
      })

      // 学习记录
      .state('user.history', {
        url: '/history',
        templateUrl: '/partials/home/user/history.html',
        controller: 'UserController',
        data: {
          title: '学习记录',
          url: '',
          slug: 'history'
        }
      })

      // 我的收藏
      .state('user.favorite', {
        url: '/favorite',
        templateUrl: '/partials/home/user/favorite.html',
        controller: 'UserController',
        data: {
          title: '我的收藏',
          url: '',
          slug: 'favorite'
        }
      })

      // 我的问答
      .state('user.question', {
        url: '/question',
        templateUrl: '/partials/home/user/question/list.html',
        controller: 'UserController',
        data: {
          title: '我的问答',
          url: '',
          slug: 'question'
        }
      })

      // 问答详情
      .state('user.question_detail', {
        url: '/question/:question_id',
        templateUrl: '/partials/home/user/question/detail.html',
        controller: 'UserController',
        data: {
          title: '问答详情',
          url: '',
          slug: 'question'
        }
      })

      // 我的笔记
      .state('user.note', {
        url: '/note',
        templateUrl: '/partials/home/user/note/list.html',
        controller: 'UserController',
        data: {
          title: '我的笔记',
          url: '',
          slug: 'note'
        }
      })

      // 个人资料
      .state('user.profile', {
        url: '/profile',
        templateUrl: '/partials/home/user/profile.html',
        controller: 'UserController',
        data: {
          title: '个人资料',
          url: '',
          slug: 'profile'
        }
      })

      // 修改密码
      .state('user.password', {
        url: '/password',
        templateUrl: '/partials/home/user/password.html',
        controller: 'UserController',
        data: {
          title: '修改密码',
          url: '',
          slug: 'password'
        }
      })

      // 账户绑定
      .state('user.account', {
        url: '/account',
        templateUrl: '/partials/home/user/account.html',
        controller: 'AuthController',
        data: {
          title: '账户绑定',
          url: '',
          slug: 'account'
        }
      })

      // 账单明细
      .state('user.bill', {
        url: '/bill',
        templateUrl: '/partials/home/user/bill.html',
        controller: 'UserController',
        data: {
          title: '账单明细',
          url: '',
          slug: 'bill'
        }
      })

      // 积分明细
      .state('user.score', {
        url: '/score',
        templateUrl: '/partials/home/user/score.html',
        controller: 'UserController',
        data: {
          title: '积分明细',
          url: '',
          slug: 'score'
        }
      })

      // 通知中心
      .state('user.msg', {
        url: '/msg',
        templateUrl: '/partials/home/user/msg.html',
        controller: 'UserController',
        data: {
          title: '通知中心',
          url: '',
          slug: 'msg'
        }
      })

      // 勋章中心
      .state('user.medal', {
        url: '/medal',
        templateUrl: '/partials/home/user/medal.html',
        controller: 'UserController',
        data: {
          title: '勋章中心',
          url: '',
          slug: 'medal'
        }
      })

      // 优惠卡券
      .state('user.coupons', {
        url: '/coupons',
        templateUrl: '/partials/home/user/coupons.html',
        controller: 'UserController',
        data: {
          title: '我的卡券',
          url: '',
          slug: 'coupons'
        }
      })

      // --------------------------------

      // 教师中心
      .state('teacher', {
        abstract: true,
        url: '/teacher',
        templateUrl: '/partials/home/teacher/sidebar.html',
        controller: 'TeacherController',
        data: {
          title: '教师中心',
          url: '/teacher/index',
          slug: 'index'
        }
      })

      // 教师主页
      .state('teacher.index', {
        url: '/index',
        templateUrl: '/partials/home/teacher/index.html',
        controller: 'TeacherController',
        data: {
          title: '',
          url: '',
          slug: 'index'
        }
      })

      // 已售课程
      .state('teacher.trade', {
        url: '/trade',
        templateUrl: '/partials/home/teacher/trade.html',
        controller: 'TeacherController',
        data: {
          title: '已售课程',
          url: '/teacher/trade',
          slug: 'trade'
        }
      })

      // 评价管理
      .state('teacher.rate', {
        url: '/rate',
        templateUrl: '/partials/home/teacher/rate/list.html',
        controller: 'TeacherController',
        data: {
          title: '评价管理',
          url: '/teacher/rate',
          slug: 'rate'
        }
      })

      // 我的课程（中继）
      .state('teacher.course', {
        abstract: true,
        url: '/course',
        template: '<div class="box lesson slide-top" ui-view></div>',
        controller: 'LessonController',
        data: {
          title: '我的课程',
          url: '/teacher/course/list',
          slug: 'course'
        }
      })

      // 已开课程
      .state('teacher.course.list', {
        url: '/list',
        templateUrl: '/partials/home/teacher/course/course-list.html',
        controller: 'LessonController',
        data: {
          title: '已开课程',
          url: '',
          slug: 'course'
        }
      })

      // 发布课程
      .state('teacher.course.add', {
        url: '/add',
        templateUrl: '/partials/home/teacher/course/course-edit.html',
        controller: 'LessonController',
        data: {
          title: '发布课程',
          url: '',
          slug: 'course-add'
        }
      })

      // 编辑课程
      .state('teacher.course.edit', {
        url: '/edit/:course_id',
        templateUrl: '/partials/home/teacher/course/course-edit.html',
        controller: 'LessonController',
        data: {
          title: '编辑课程',
          url: '',
          slug: 'course'
        }
      })

      // 编辑章节
      .state('teacher.course.section_edit', {
        url: '/section/edit/:course_id',
        templateUrl: '/partials/home/teacher/course/section-edit.html',
        controller: 'LessonController',
        data: {
          title: '编辑章节',
          url: '',
          slug: 'course'
        }
      })

      // 我的学校（中继）
      .state('teacher.organization', {
        abstract: true,
        url: '/organization',
        template: '<div class="box organization slide-top" ui-view></div>',
        controller: 'SchoolController',
        data: {
          title: '我的学校',
          url: '/teacher/organization/list',
          slug: 'organization'
        }
      })

      // 个人中心-我的学校
      .state('teacher.organization.list', {
        url: '/list',
        templateUrl: '/partials/home/teacher/organization/list.html',
        controller: 'SchoolController',
        data: {
          title: '',
          url: '/teacher/organization/index',
          slug: 'organization'
        }
      })

      // 个人中心-搜索学校
      .state('teacher.organization.search', {
        url: '/search',
        templateUrl: '/partials/home/teacher/organization/search.html',
        controller: 'SchoolController',
        data: {
          title: '搜索学校',
          url: ''
        } 
      })

      // 个人中心-创建学校
      .state('teacher.organization.add', {
        url: '/add',
        templateUrl: '/partials/home/teacher/organization/add.html',
        controller: 'SchoolController',
        data: {
          title: '创建学校',
          url: ''
        } 
      })

      // 个人中心-加入学校
      .state('teacher.organization.join', {
        url: '/join/:organization_id',
        templateUrl: '/partials/home/teacher/organization/join.html',
        controller: 'SchoolController',
        data: {
          title: '加入学校',
          url: ''
        } 
      })

      // 个人中心-学校管理
      .state('teacher.organization.manage', {
        url: '/manage/:organization_id',
        templateUrl: '/partials/home/teacher/organization/manage.html',
        controller: 'SchoolController',
        data: {
          title: '学校管理',
          url: ''
        } 
      })

      // 我的收入，抽象继承
      .state('teacher.income', {
        abstract: true,
        url: '/income',
        template: '<div class="income box slide-top" ui-view></div>',
        controller: 'IncomeController',
        data: {
          title: '我的收入',
          url: '/teacher/income/index',
          slug: 'income'
        }
      })

      // 我的收入
      .state('teacher.income.index', {
        url: '/index',
        templateUrl: '/partials/home/teacher/income/index.html',
        controller: 'IncomeController',
        data: {
          title: '',
          url: '',
          slug: 'income'
        }
      })

      // 收入明细
      .state('teacher.income.details', {
        url: '/details',
        templateUrl: '/partials/home/teacher/income/details.html',
        controller: 'IncomeController',
        data: {
          title: '收入明细',
          url: ''
        }
      })

      // 申请提现
      .state('teacher.income.apply', {
        url: '/apply',
        templateUrl: '/partials/home/teacher/income/apply.html',
        controller: 'IncomeController',
        data: {
          title: '申请提现',
          url: '',
          slug: 'apply'
        }
      })

      // 提现记录
      .state('teacher.income.record', {
        url: '/record',
        templateUrl: '/partials/home/teacher/income/record.html',
        controller: 'IncomeController',
        data: {
          title: '提现记录',
          url: ''
        }
      })

      // 管理提现账户
      .state('teacher.income.account_list', {
        url: '/account-list',
        templateUrl: '/partials/home/teacher/income/account-list.html',
        controller: 'IncomeController',
        data: {
          title: '管理账户',
          url: ''
        }
      })

      // 添加提现账户
      .state('teacher.income.account_add', {
        url: '/account-add',
        templateUrl: '/partials/home/teacher/income/account-add.html',
        controller: 'IncomeController',
        data: {
          title: '添加账户',
          url: ''
        }
      })

      // 个人资料
      .state('teacher.profile', {
        url: '/profile',
        templateUrl: '/partials/home/user/profile.html',
        controller: 'UserController',
        data: {
          title: '个人资料',
          url: '',
          slug: 'profile'
        }
      })

      // 修改密码
      .state('teacher.password', {
        url: '/password',
        templateUrl: '/partials/home/user/password.html',
        controller: 'UserController',
        data: {
          title: '修改密码',
          url: '',
          slug: 'password'
        }
      })

      // 账户绑定
      .state('teacher.account', {
        url: '/account',
        templateUrl: '/partials/home/user/account.html',
        controller: 'AuthController',
        data: {
          title: '账户绑定',
          url: '',
          slug: 'account'
        }
      })

      $locationProvider.html5Mode(true);

      // 拦截器
      $httpProvider.interceptors.push(['$rootScope', '$q', '$localStorage', function ($rootScope, $q, $localStorage) {
        return {
          request: function (config) {

            // 请求站内资源时，带上token
            if (!config.url.contain('http://up.qiniu.com')) {
              config.headers = config.headers || {};
              if ($localStorage.token) {
                config.headers.Authorization = 'Bearer ' + $localStorage.token;
              };
            };

            // 每次发出请求执行token的时效性检查，保证处于最佳状态
            $rootScope.updateToken();
            
            return config;
          },
          response: function (response) {
            return $q.when(response);
          },

          responseError: function (response) {

            // 发生错误时，关闭动画
            $rootScope.modal.closeLoading();
            
            switch (response.status) {
              case 401:
                  // $rootScope.modal.error({ message: '401 ERROR!' });
                  // $location.path('/login');
                  delete $localStorage.token;
                  $rootScope.user = null;
                  break;
              case 403:
                  // $rootScope.modal.error({ message: '403! 无权访问API' });
                  // $location.path('/index');
                  break;
              case 404:
                  // $rootScope.modal.error({ message: '404 ERROR!' });
                  break;
              case 422:
                  // $rootScope.modal.error({ message: '422 ERROR!', message: response.message });
                  break;
              case 500:
                  $rootScope.modal.error({ message: '500 ERROR!' });
                  break;
               default:
                  break;
            }
            
            return $q.reject(response);
          }
        }
      }
    ])
  }
]);
// 主程序入口模块
angular.module('app', [

  // angular modules
  'ui.router',
  'ngStorage',
  'ngResource',
  'ngSanitize',
  'ngAnimate',

  // angular routes
  'AppRoutes',

  // third modules
  'angular.modal',
  'angular.loading',
  // 'angular.lazyImage',

  // angular directive
  'TabsDirective',
  'TooltipDirective',
  'PaginationDirective',
  'LoadingDirective',
  'CourseListDirective',

  // Global controller
  'MainController',
  'ArticleController',
  'HeaderController',
  'AuthController',

  // Function controller
  'IndexController',
  'CourseController',
  'LearnController',
  'PaymentController',
  'OrganizationlController',
  'UserController',
  'StudentController',
  'IncomeController',
  'LessonController',
  'TeacherController',
  'SchoolController',

  // Global Filter
  'HtmlFilter',
  'TimeFilter',

  // Global package
  'CommonProvider',
  'AuthProvider',
  'QuploadProvider',

  // Global Service
  'AuthService',
  'CommonService',

  // Global Model
  'CommonModel'
])

// 全局配置
.provider('appConfig', function() {
  var config = {
    baseUrl: 'http://xtx.com',
    fileUrl: 'http://7xnbft.com2.z0.glb.qiniucdn.com/',
    staticUrl: 'http://7xpb5v.com2.z0.glb.qiniucdn.com',
    apiUrl: '/server/api/v1'
  };
  return {
    config:config,
    $get: function() {
      return config;
    }
  }
})

// 初始化
.run(['AuthProvider', 'CommonProvider', function(AuthProvider, CommonProvider) {
  // 自动登陆
  AuthProvider.init();
  // 自动回顶
  CommonProvider.autoTop();
}])

.config(['cfpLoadingBarProvider', function(cfpLoadingBarProvider) {
  cfpLoadingBarProvider.includeSpinner = false;
  cfpLoadingBarProvider.includeBar = false;
  cfpLoadingBarProvider.latencyThreshold = 10;
}])

.config(function ($validationProvider, appConfigProvider) {
  // 表单验证配置
  angular.extend($validationProvider, {
    validCallback: function (element){
      $(element).parents('.form-group:first').removeClass('has-error').addClass('has-success');
    },
    invalidCallback: function (element) {
      $(element).parents('.form-group:first').addClass('has-error');
    }
  });

  $validationProvider.setErrorHTML(function (msg) {
    return  "<i class=\"icon icon-error\"></i>" + msg;
  });

  $validationProvider.setSuccessHTML(function (msg) {
    return  "<i class=\"icon icon-success\"></i>" + msg;
  });
});