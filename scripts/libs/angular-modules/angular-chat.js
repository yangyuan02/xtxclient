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
