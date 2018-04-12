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

/* global angular */
angular.module('angular.lazyImage', []);
/* global angular */
angular.module('angular.lazyImage')
    .service('afklSrcSetService', ['$window', '$timeout', function($window, $timeout) {
        'use strict';

        /**
         * For other applications wanting the srccset/best image approach it is possible to use this module only
         * Loosely based on https://raw.github.com/borismus/srcset-polyfill/master/js/srcset-info.js
         */
        var INT_REGEXP = /^[0-9]+$/;

        // SRCSET IMG OBJECT
        function ImageInfo(options) {
            this.src = options.src;
            this.w = options.w || Infinity;
            this.h = options.h || Infinity;
            this.x = options.x || 1;
        }

        /**
         * Parse srcset rules
         * @param  {string} descString Containing all srcset rules
         * @return {object}            Srcset rules
         */
        var _parseDescriptors = function (descString) {

            var descriptors = descString.split(/\s/);
            var out = {};

            for (var i = 0, l = descriptors.length; i < l; i++) {

                var desc = descriptors[i];

                if (desc.length > 0) {

                    var lastChar = desc.slice(-1);
                    var value = desc.substring(0, desc.length - 1);
                    var intVal = parseInt(value, 10);
                    var floatVal = parseFloat(value);

                    if (value.match(INT_REGEXP) && lastChar === 'w') {
                        out[lastChar] = intVal;
                    } else if (value.match(INT_REGEXP) && lastChar === 'h') {
                        out[lastChar] = intVal;
                    } else if (!isNaN(floatVal) && lastChar === 'x') {
                        out[lastChar] = floatVal;
                    }

                }
            }

            return out;

        };

        /**
         * Returns best candidate under given circumstances
         * @param  {object} images     Candidate image
         * @param  {function} criteriaFn Rule
         * @return {object}            Returns best candidate under given criteria
         */
        var _getBestCandidateIf = function (images, criteriaFn) {

            var bestCandidate = images[0];

            for (var i = 0, l = images.length; i < l; i++) {
                var candidate = images[i];
                if (criteriaFn(candidate, bestCandidate)) {
                    bestCandidate = candidate;
                }
            }

            return bestCandidate;

        };

        /**
         * Remove candidate under given circumstances
         * @param  {object} images     Candidate image
         * @param  {function} criteriaFn Rule
         * @return {object}            Removes images from global image collection (candidates)
         */
        var _removeCandidatesIf = function (images, criteriaFn) {

            for (var i = images.length - 1; i >= 0; i--) {
                var candidate = images[i];
                if (criteriaFn(candidate)) {
                    images.splice(i, 1); // remove it
                }
            }

            return images;

        };

        /**
        * Direct implementation of "processing the image candidates":
        * http://www.whatwg.org/specs/web-apps/current-work/multipage/embedded-content-1.html#processing-the-image-candidates
        *
        * @param  {array} imageCandidates (required)
        * @param  {object} view (optional)
        * @returns {ImageInfo} The best image of the possible candidates.
        */
        var getBestImage = function (imageCandidates, view) {

            if (!imageCandidates) { return; }
            if (!view) {
                view = {
                    'w' : $window.innerWidth || document.documentElement.clientWidth,
                    'h' : $window.innerHeight || document.documentElement.clientHeight,
                    'x' : $window.devicePixelRatio || 1
                };
            }

            var images = imageCandidates.slice(0);

            /* LARGEST */
            // Width
            var largestWidth = _getBestCandidateIf(images, function (a, b) { return a.w > b.w; });
            // Less than client width.
            _removeCandidatesIf(images, (function () { return function (a) { return a.w < view.w; }; })(this));
            // If none are left, keep the one with largest width.
            if (images.length === 0) { images = [largestWidth]; }


            // Height
            var largestHeight = _getBestCandidateIf(images, function (a, b) { return a.h > b.h; });
            // Less than client height.
            _removeCandidatesIf(images, (function () { return function (a) { return a.h < view.h; }; })(this));
            // If none are left, keep one with largest height.
            if (images.length === 0) { images = [largestHeight]; }

            // Pixel density.
            var largestPxDensity = _getBestCandidateIf(images, function (a, b) { return a.x > b.x; });
            // Remove all candidates with pxdensity less than client pxdensity.
            _removeCandidatesIf(images, (function () { return function (a) { return a.x < view.x; }; })(this));
            // If none are left, keep one with largest pixel density.
            if (images.length === 0) { images = [largestPxDensity]; }


            /* SMALLEST */
            // Width
            var smallestWidth = _getBestCandidateIf(images, function (a, b) { return a.w < b.w; });
            // Remove all candidates with width greater than it.
            _removeCandidatesIf(images, function (a) { return a.w > smallestWidth.w; });

            // Height
            var smallestHeight = _getBestCandidateIf(images, function (a, b) { return a.h < b.h; });
            // Remove all candidates with height greater than it.
            _removeCandidatesIf(images, function (a) { return a.h > smallestHeight.h; });

            // Pixel density
            var smallestPxDensity = _getBestCandidateIf(images, function (a, b) { return a.x < b.x; });
            // Remove all candidates with pixel density less than smallest px density.
            _removeCandidatesIf(images, function (a) { return a.x > smallestPxDensity.x; });

            return images[0];

        };



        // options {src: null/string, srcset: string}
        // options.src    normal url or null
        // options.srcset 997-s.jpg 480w, 997-m.jpg 768w, 997-xl.jpg 1x
        var getSrcset = function (options) {

            var imageCandidates = [];

            var srcValue = options.src;
            var srcsetValue = options.srcset;

            if (!srcsetValue) { return; }

            /* PUSH CANDIDATE [{src: _, x: _, w: _, h:_}, ...] */
            var _addCandidate = function (img) {

                for (var j = 0, ln = imageCandidates.length; j < ln; j++) {
                    var existingCandidate = imageCandidates[j];

                    // DUPLICATE
                    if (existingCandidate.x === img.x &&
                        existingCandidate.w === img.w &&
                        existingCandidate.h === img.h) { return; }
                }

                imageCandidates.push(img);

            };


            var _parse = function () {

                var input = srcsetValue,
                position = 0,
                rawCandidates = [],
                url,
                descriptors;

                while (input !== '') {

                    while (input.charAt(0) === ' ') {
                        input = input.slice(1);
                    }

                    position = input.indexOf(' ');

                    if (position !== -1) {

                        url = input.slice(0, position);

                        // if (url === '') { break; }

                        input = input.slice(position + 1);

                        position = input.indexOf(',');

                        if (position === -1) {
                            descriptors = input;
                            input = '';
                        } else {
                            descriptors =  input.slice(0, position);
                            input = input.slice(position + 1);
                        }

                        rawCandidates.push({
                            url: url,
                            descriptors: descriptors
                        });

                    } else {

                        rawCandidates.push({
                            url: input,
                            descriptors: ''
                        });
                        input = '';
                    }

                }

                // FROM RAW CANDIDATES PUSH IMAGES TO COMPLETE SET
                for (var i = 0, l = rawCandidates.length; i < l; i++) {

                    var candidate = rawCandidates[i],
                    desc = _parseDescriptors(candidate.descriptors);

                    _addCandidate(new ImageInfo({
                        src: candidate.url,
                        x: desc.x,
                        w: desc.w,
                        h: desc.h
                    }));

                }

                if (srcValue) {
                    _addCandidate(new ImageInfo({src: srcValue}));
                }

            };

            _parse();


            // Return best available image for current view based on our list of candidates
            var bestImage = getBestImage(imageCandidates);

            /**
             * Object returning best match at moment, and total collection of candidates (so 'image' API can be used by consumer)
             * @type {Object}
             */
            var object = {
                'best': bestImage,              // IMAGE INFORMATION WHICH FITS BEST WHEN API IS REQUESTED
                'candidates': imageCandidates   // ALL IMAGE CANDIDATES BY GIVEN SRCSET ATTRIBUTES
            };

            // empty collection
            imageCandidates = null;

            // pass best match and candidates
            return object;

        };

        // debouncer function to be used in directive
        function debounce(call, delay) {
          var preventCalls = false;

          return function() {
            if (!preventCalls) {
              call();

              preventCalls = true;

              $timeout(function() {
                preventCalls = false;
              }, delay);
            }
          };
        }


        /**
         * PUBLIC API
         */
        return {
            get: getSrcset,        // RETURNS BEST IMAGE AND IMAGE CANDIDATES
            image: getBestImage,   // RETURNS BEST IMAGE WITH GIVEN CANDIDATES
            debounce: debounce     // RETURNS A DEBOUNCER FUNCTION
        };


    }]);

/* global angular */
angular.module('angular.lazyImage')
    .directive('afklImageContainer', function () {
        'use strict';

        return {
            restrict: 'A',
            // We have to use controller instead of link here so that it will always run earlier than nested afklLazyImage directives
            controller: ['$scope', '$element', function ($scope, $element) {
                $element.data('afklImageContainer', $element);
            }]
        };
    })
    .directive('afklLazyImage', ['$rootScope', '$window', '$timeout', 'afklSrcSetService', '$parse', function ($rootScope, $window, $timeout, srcSetService, $parse) {
        'use strict';

        // Use srcSetService to find out our best available image
        var bestImage = function (images) {
            var image = srcSetService.get({srcset: images});
            var sourceUrl;
            if (image) {
                sourceUrl = image.best.src;
            }
            return sourceUrl;
        };

        return {
            restrict: 'A',
            link: function (scope, element, attrs) {

                var _concatImgAttrs = function (imgAttrs) {
                    var result = [];
                    if (!!options.imgAttrs) {
                        result = Array.prototype.map.call(imgAttrs, function(item) {
                            for (var key in item) {
                                if (item.hasOwnProperty(key)) {
                                    return String.prototype.concat.call(key, '="', item[key], '"');
                                }
                            }
                        });
                    }
                    return result.join(' ');
                };

                // CONFIGURATION VARS
                var $container = element.inheritedData('afklImageContainer');
                if (!$container) {
                    $container = angular.element(attrs.afklLazyImageContainer || $window);
                }

                var loaded = false;
                var timeout;

                var images = attrs.afklLazyImage; // srcset attributes
                var options = attrs.afklLazyImageOptions ? $parse(attrs.afklLazyImageOptions)(scope) : {}; // options (background, offset)

                var img = null; // Angular element to image which will be placed
                var currentImage = null; // current image url
                var offset = options.offset ? options.offset : 50; // default offset
                var imgAttrs = _concatImgAttrs(options.imgAttrs); // all image attributes like class, title, onerror

                var LOADING = 'afkl-lazy-image-loading';



                attrs.afklLazyImageLoaded = false;

                var _containerScrollTop = function () {
                    // See if we can use jQuery, with extra check
                    // TODO: check if number is returned
                    if ($container.scrollTop) {
                        var scrollTopPosition = $container.scrollTop();
                        if (scrollTopPosition) {
                            return scrollTopPosition;
                        }
                    }

                    var c = $container[0];
                    if (c.pageYOffset !== undefined) {
                        return c.pageYOffset;
                    }
                    else if (c.scrollTop !== undefined) {
                        return c.scrollTop;
                    }

                    return document.documentElement.scrollTop || 0;
                };

                var _containerInnerHeight = function () {
                    if ($container.innerHeight) {
                        return $container.innerHeight();
                    }

                    var c = $container[0];
                    if (c.innerHeight !== undefined) {
                        return c.innerHeight;
                    } else if (c.clientHeight !== undefined) {
                        return c.clientHeight;
                    }

                    return document.documentElement.clientHeight || 0;
                };

                // Begin with offset and update on resize
                var _elementOffset = function () {
                    if (element.offset) {
                        return element.offset().top;
                    }
                    var box = element[0].getBoundingClientRect();
                    return box.top + _containerScrollTop() - document.documentElement.clientTop;
                };


                var _elementOffsetContainer = function () {
                    if (element.offset) {
                        return element.offset().top - $container.offset().top;
                    }
                    return element[0].getBoundingClientRect().top - $container[0].getBoundingClientRect().top;
                };

                // Update url of our image
                var _setImage = function () {
                    if (options.background) {
                        element[0].style.backgroundImage = 'url("' + currentImage +'")';
                    } else if (!!img) {
                        img[0].src = currentImage;
                    }
                };

                // Append image to DOM
                var _placeImage = function () {

                    loaded = true;
                    // What is my best image available
                    var hasImage = bestImage(images);

                    if (hasImage) {
                        // we have to make an image if background is false (default)
                        if (!options.background) {

                            if (!img) {
                                element.addClass(LOADING);
                                img = angular.element('<img ' + imgAttrs + ' />');
                                img.one('load', _loaded);
                                img.one('error', _error);
                                // remove loading class when image is acually loaded
                                element.append(img);
                            }

                        }

                        // set correct src/url
                        _checkIfNewImage();
                    }

                    // Element is added to dom, no need to listen to scroll anymore
                    $container.off('scroll', _onViewChange);

                };

                // Check on resize if actually a new image is best fit, if so then apply it
                var _checkIfNewImage = function () {
                    if (loaded) {
                        var newImage = bestImage(images);
                        
                        if (newImage !== currentImage) {
                            // update current url
                            currentImage = newImage;

                            // TODO: loading state...

                            // update image url
                            _setImage();
                        }
                    }
                };

                // First update our begin offset
                _checkIfNewImage();

                var _loaded = function () {

                    attrs.$set('afklLazyImageLoaded', 'done');

                    element.removeClass(LOADING);

                };

                var _error = function () {

                    attrs.$set('afklLazyImageLoaded', 'fail');

                };

                // Check if the container is in view for the first time. Utilized by the scroll and resize events.
                var _onViewChange = function () {
                    // only do stuff when not set already
                    if (!loaded) {

                        // Config vars
                        var remaining, shouldLoad, windowBottom;

                        var height = _containerInnerHeight();
                        var scroll = _containerScrollTop();

                        var elOffset = $container[0] === $window ? _elementOffset() : _elementOffsetContainer();
                        windowBottom = $container[0] === $window ? height + scroll : height;

                        remaining = elOffset - windowBottom;

                        // Is our top of our image container in bottom of our viewport?
                        //console.log($container[0].className, _elementOffset(), _elementPosition(), height, scroll, remaining, elOffset);
                        shouldLoad = remaining <= offset;


                        // Append image first time when it comes into our view, after that only resizing can have influence
                        if (shouldLoad) {

                            _placeImage();

                        }

                    }

                };

                var _onViewChangeDebounced = srcSetService.debounce(_onViewChange, 300);

                // EVENT: RESIZE THROTTLED
                var _onResize = function () {
                    $timeout.cancel(timeout);
                    timeout = $timeout(function() {
                        _checkIfNewImage();
                        _onViewChange();
                    }, 300);
                };


                // Remove events for total destroy
                var _eventsOff = function() {

                    $timeout.cancel(timeout);

                    angular.element($window).off('resize', _onResize);
                    angular.element($window).off('scroll', _onViewChangeDebounced);

                    if ($container[0] !== $window) {
                        $container.off('resize', _onResize);
                        $container.off('scroll', _onViewChangeDebounced);
                    }

                    // remove image being placed
                    if (img) {
                        img.remove();
                    }

                    img = timeout = currentImage = undefined;
                };

                // set events for scrolling and resizing on window
                // even if container is not window it is important
                // to cover two cases:
                //  - when container size is bigger than window's size
                //  - when container's side is out of initial window border
                angular.element($window).on('resize', _onResize);
                angular.element($window).on('scroll', _onViewChangeDebounced);

                // if container is not window, set events for container as well
                if ($container[0] !== $window) {
                    $container.on('resize', _onResize);
                    $container.on('scroll', _onViewChangeDebounced);
                }

                // events for image change
                attrs.$observe('afklLazyImage', function () {
                    images = attrs.afklLazyImage;
                    if (loaded) {
                        _placeImage();
                    }
                });

                // Image should be directly placed
                if (options.nolazy) {
                    _placeImage();
                }


                scope.$on('afkl.lazyImage.destroyed', _onResize);

                // Remove all events when destroy takes place
                scope.$on('$destroy', function () {
                    // tell our other kids, i got removed
                    $rootScope.$broadcast('afkl.lazyImage.destroyed');
                    // remove our events and image
                    return _eventsOff();
                });

                return _onViewChange();

            }
        };

}]);

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
angular.module("ui.router.stateHelper",["ui.router"]).provider("stateHelper",["$stateProvider",function(e){function t(e){e.parent&&(e.name=(angular.isObject(e.parent)?e.parent.name:e.parent)+"."+e.name)}function a(e){e.children.forEach(function(e,t,a){a[t+1]&&(e.nextSibling=a[t+1].name),a[t-1]&&(e.previousSibling=a[t-1].name)})}var n=this;this.state=function(r){var i=Array.prototype.slice.apply(arguments),l={keepOriginalNames:!1,siblingTraversal:!1};return"boolean"==typeof i[1]?l.keepOriginalNames=i[1]:"object"==typeof i[1]&&angular.extend(l,i[1]),l.keepOriginalNames||t(r),e.state(r),r.children&&r.children.length&&(r.children.forEach(function(e){e.parent=r,n.state(e,l)}),l.siblingTraversal&&a(r)),n},this.setNestedState=this.state,n.$get=angular.noop}]);
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
          
          // 释放播放器
          $scope.playerDispose = function () {
            if (!!$scope.player && !!$scope.player.dispose) $scope.player.dispose();
            $scope.player = null;
          };

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
/**
 * 全局布局模块
 *
 * @description
 * AngularJS app Layout.
 */

angular.module('LayoutDirective', [])

// 头部
.directive('header', function() {
  return {
  restrict: 'E',
  templateUrl: 'partials/admin/layout/header.html'
  };
})

// 边栏
.directive('aside', function() {
  return {
  restrict: 'E',
  templateUrl: 'partials/admin/layout/sidebar.html'
  };
})

// 底部
.directive('footer', function() {
  return {
  restrict: 'E',
  templateUrl: 'partials/admin/layout/footer.html'
  };
})

// Remove ng-include tag
.directive('includeReplace', function () {
  return {
    require: 'ngInclude',
    restrict: 'A',
    link: function (scope, element, attrs) {
      element.replaceWith(element.children());
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
* AdvertiseController Module
*
* Description
*/
angular.module('AdvertiseController', ['AdvertiseModel'])
.controller('AdvertiseController', ['$scope', '$rootScope', '$state', '$stateParams', '$location', '$modal', 'AdvertiseModel', 'CommonProvider', function($scope, $rootScope, $state, $stateParams, $location, $modal, AdvertiseModel, CommonProvider) {

    /*----------------广告管理事件----------------*/
    $scope.filter = {};
    $scope.advertise_list = {};

    $scope.advertiseAction = {

      // 广告管理首页
      getIndex: function (page) {
        var _self = this;
        // 获取广告列表
        $scope.params = {
          role: 'admin',
          page: page || 1,
        };
        _self.getLists($scope.params);
      },

      // 获取列表数据
      getLists: function (params) {
        CommonProvider.promise({
          model: AdvertiseModel,
          method: 'get',
          params: params,
          success: function (_advertise_list) {
            $scope.advertise_list = _advertise_list;
          }
        });
      },

      // 获取笔记详情
      getItem: function () {
        CommonProvider.promise({
          model: AdvertiseModel,
          method: 'item',
          params: { advertise_id: $stateParams.advertise_id },
          success: function (_advertise_item) {
            _advertise_item.result.type = _advertise_item.result.type.toString();
            $scope.advertise = _advertise_item.result;
          }
        });
      },

      // 获取配置数据
      getAdConfig: function () {
        $rootScope.getConfig({
          name: 'SITE_AD_CONFIG',
          role: 'admin',
          group: 2,
          success: function (config) {
            $scope.ad_config = config.result;
          }
        });
      },

      // 新增广告
      add: function (params) {
        CommonProvider.promise({
          model: AdvertiseModel,
          method: 'add',
          params: $scope.advertise,
          success: function (_advertise) {
            $modal.success({
              message: _advertise.message,
              callback: function () {
                $location.path('/advertise/advertise/list/index');
              }
            });
          },
          error: function (_advertise) {
            $modal.error({
              message: _advertise.message
            });
          }
        });
      },

      // 编辑广告
      edit: function (params) {
        $scope.advertise.type = Number($scope.advertise.type);
        CommonProvider.promise({
          model: AdvertiseModel,
          method: 'put',
          params: $scope.advertise,
          success: function (_advertise) {
            $modal.success({
              message: _advertise.message,
              callback: function () {
                $location.path('/article/advertise/list/index');
              }
            });
          },
          error: function (_advertise) {
            $modal.error({
              message: _advertise.message
            });
          }
        });
      },

      // 删除广告
      del: function (params) {
        if (params.batch && $scope.advertise_list.result.checked().length == 0) {
          $modal.error({ message: '至少需要选中一个广告' });
          return false;
        };
        $modal.confirm({
          title: '确认删除',
          message: params.batch ? '确定要删除选中广告吗？' : '确定要删除此广告吗？',
          info: '广告删除后可在广告回收站中查看',
          onsubmit: function () {
            CommonProvider.promise({
              model: AdvertiseModel,
              method: params.batch ? 'delete' : 'del',
              params: params.batch ? $scope.advertise_list.result.checked() : params.advertise,
              success: function (_advertise) {
                $modal.success({
                  message: _advertise.message
                });
              },
              error: function (_advertise) {
                $modal.error({
                  message: _advertise.message
                });
              }
            });
          }
        });
      },

      // 广告图片上传结果回调函数
      getUploadThumb: function (data) {
        if (data) {
          $scope.advertise.image = data.key;
        }
      },

    };
  }
]);
/**
* AnnouncementController Module
*
* Description
*/
angular.module('AnnouncementController', ['AnnouncementModel', 'OrganizationModel'])
.controller('AnnouncementController', ['$scope', '$rootScope', '$state', '$stateParams', '$modal', 'AnnouncementModel', 'OrganizationModel', 'CommonProvider', function($scope, $rootScope, $state, $stateParams, $modal, AnnouncementModel, OrganizationModel, CommonProvider) {

    /*----------------公告管理事件----------------*/
    $scope.announcement_list = {};
    $scope.filter = { 
      type: 'all',
      organization_id: null
    };

    $scope.announcementAction = {

      // 过滤条件改变
      filterChanged: function () {
        $scope.announcementAction.getLists();
      },

      // 公告管理首页
      getIndex: function (page) {
        $scope.announcementAction.getLists(page);
        $scope.announcementAction.getOrganizations();
      },

      // 获取所有机构
      getOrganizations: function () {
        CommonProvider.promise({
          model: OrganizationModel,
          method: 'get',
          params: { 
            per_page: 1000,
            role: 'admin'
          },
          success: function (_organizations) {
            $scope.organizations = _organizations.result;
          }
        });
      },

      // 获取列表数据
      getLists: function (page) {

        var get_params = {
          role: 'admin',
          page: page || 1,
        };

        var filters = $scope.filter;
        for (var key in filters) {
          if (filters[key] != 'all' && !!filters[key]) get_params[key] = filters[key];
        };

        CommonProvider.promise({
          model: AnnouncementModel,
          method: 'get',
          params: get_params,
          success: function (_announcement_list) {
            $scope.announcement_list = _announcement_list;
          }
        });
      },

      // 获取公告详情
      getItem: function () {
        CommonProvider.promise({
          model: AnnouncementModel,
          method: 'item',
          params: { announcement_id: $stateParams.announcement_id },
          success: function (announcement_item) {
            $scope.announcement = announcement_item.result;
          }
        });
      },

      // 公告详情
      item: function (params) {
        if (params.modal) {
          $rootScope.announcement_item = angular.copy(params.announcement.announcement);
          $modal.custom({
            title: '公告详情',
            template_url: '/partials/admin/article/announcement/item.html',
            callback: function () {
              delete $rootScope.announcement_item;
            }
          });
        } else {
          $rootScope.modal.close();
        }
      },

      // 添加公告
      add: function (params) {
        if (params.modal) {
          $modal.custom({
            title: '添加公告',
            template_url: '/partials/admin/organization/announcement/add.html',
          });
        } else {
          $scope.announcement.role = 'admin';
          CommonProvider.promise({
            model: AnnouncementModel,
            method: 'add',
            params: $scope.announcement,
            success: function (_announcement) {
              $rootScope.modal.close();
              $modal.success({
                message: _announcement.message,
              });
            },
            error: function (_announcement) {
              $modal.error({
                message: _announcement.message
              });
            }
          });
        }
      },

      // 编辑公告
      edit: function (params) {
        if (params.modal) {
          $rootScope.announcement_local = params.announcement;
          $rootScope.announcement_edit  = angular.copy(params.announcement.announcement);
          $rootScope.announcement_edit.type = $rootScope.announcement_edit.type.toString();
          $modal.custom({
            title: '编辑公告',
            template_url: '/partials/admin/organization/announcement/edit.html',
            callback: function () {
              delete $rootScope.announcement_edit;
            }
          });
        } else {
          CommonProvider.promise({
            model: AnnouncementModel,
            method: 'put',
            params: { body: $scope.announcement, id: $scope.announcement.id },
            success: function (_announcement) {
              $rootScope.announcement_local.$parent.announcement = _announcement.result;
              $rootScope.modal.close();
              $modal.success({
                message: _announcement.message,
                callback: function () {
                  delete $rootScope.announcement_local;
                }
              });
            },
            error: function (_announcement) {
              $modal.error({
                message: _announcement.message
              });
            }
          });
        }
      },

      // 删除公告
      del: function (params) {
        if (params.batch && $scope.announcement_list.result.checked().length == 0) {
          $modal.error({ message: '至少需要选中一条公告' });
          return false;
        };

        if (!params.batch) {
          var params_del = {
            announcement_id: params.announcement.announcement.id,
            role: 'admin'
          };
        }

        $modal.confirm({
          title: '确认删除',
          message: params.batch ? '确定要删除选中公告吗？' : '确定要删除此公告吗？',
          info: '公告删除后可在公告回收站中查看',
          onsubmit: function () {
            CommonProvider.promise({
              model: AnnouncementModel,
              method: params.batch ? 'delete' : 'del',
              params: params.batch ? $scope.announcement_list.result.checked() : params_del,
              success: function (_announcement) {
                $modal.success({
                  message: _announcement.message
                });
              },
              error: function (_announcement) {
                $modal.error({
                  message: _announcement.message
                });
              }
            });
          }
        });
      },

    };
  }
]);
/**
* ArticleController Module
*
* Description
*/
angular.module('ArticleController', ['ArticleModel', 'CategoryModel', 'ArticleService'])
.controller('ArticleController', ['$scope', '$rootScope', '$state', '$stateParams', '$location', '$modal', 'ArticleModel', 'CategoryModel', 'ArticleService', 'CommonProvider', function($scope, $rootScope, $state, $stateParams, $location, $modal, ArticleModel, CategoryModel, ArticleService, CommonProvider) {

    /*----------------文章管理事件----------------*/
    $scope.filter = {};
    $scope.params = {};
    $scope.search = {};
    $scope.article_list = {};

    $scope.articleAction = {

      // 文章管理首页
      getIndex: function (page) {
        var _self = this;
        // 获取课程列表
        $scope.params = {
          role: 'admin',
          page: page || 1,
        };
        _self.getLists($scope.params);
      },

      // 获取列表数据
      getLists: function(params) {
        CommonProvider.promise({
          model: ArticleModel,
          method: 'get',
          params: params,
          success: function (article_list) {
            $scope.article_list = article_list;
          }
        });
      },

      // 获取文章分类列表
      getCategory: function () {
        var params = {
          role: 'admin',
          type: 3
        };
        CommonProvider.promise({
          model: CategoryModel,
          method: 'get',
          params: params,
          success: function (category_list) {
            $scope.category_list = category_list.result;
          }
        });
      },

      // 获取文章详情
      getItem: function () {
        CommonProvider.promise({
          model: ArticleModel,
          method: 'item',
          params: { article_id: $stateParams.article_id },
          success: function (article_item) {
            $scope.article = article_item.result;
          }
        });
      },

      // 文章不同状态筛选
      filterChanged: function () {
        var _self = this;
        var status = $scope.filter.status;
        !status ? delete $scope.params.status : $scope.params.status = status;
        _self.getLists($scope.params);
      },

      // 文章搜索
      getSearch: function () {
        var params = [{
          field: 'title',
          operation: 'like',
          value: $scope.search.keyword
        }, {
          field: 'content',
          operation: 'like',
          value: $scope.search.keyword
        }];
        CommonProvider.search({
          service: new ArticleService(),
          method: 'search',
          params: params,
          success: function (_article_list) {
            $scope.article_list = _article_list;
          }
        });
      },

      add: function () {
        CommonProvider.promise({
          model: ArticleModel,
          method: 'add',
          params: $scope.article,
          success: function (_article) {
            $modal.success({
              message: _article.message,
              callback: function () {
                $location.path('/article/manage/list/index');
              }
            });
          },
          error: function (_article) {
            $modal.error({
              message: _article.message
            });
          }
        });
      },

      // 编辑文章
      edit: function () {
        CommonProvider.promise({
          model: ArticleModel,
          method: 'put',
          params: $scope.article,
          success: function (_article) {
            $modal.success({
              message: _article.message,
              callback: function () {
                $location.path('/article/manage/list/index');
              }
            });
          },
          error: function (_article) {
            $modal.error({
              message: _article.message
            });
          }
        });
      },

      // 删除文章
      del: function (params) {
        if (params.batch && $scope.article_list.result.checked().length == 0) {
          $modal.error({ message: '至少需要选中一篇文章' });
          return false;
        };
        $modal.confirm({
          title: '确认删除',
          message: params.batch ? '确定要删除选中文章吗？' : '确定要删除此文章吗？',
          info: '文章删除后可在文章回收站中查看',
          onsubmit: function () {
            CommonProvider.promise({
              model: ArticleModel,
              method: params.batch ? 'delete' : 'del',
              params: params.batch ? $scope.article_list.result.checked() : params.article,
              success: function (_article) {
                $modal.success({
                  message: _article.message
                });
              },
              error: function (_article) {
                $modal.error({
                  message: _article.message
                });
              }
            });
          }
        });
      },

      // 禁用文章
      disable: function (params) {
        if (params.batch && $scope.article_list.result.children.checked().length == 0) {
          $modal.error({ message: '至少需要选中一个文章' });
          return false;
        };
        $modal.confirm({
          title: '确认操作',
          message: params.batch ? '确定要禁用选中文章吗？' : '确定要禁用此文章吗？',
          info: params.batch ? '禁用后这些文章将不再前台显示' : '禁用后该文章将不再前台显示',
          onsubmit: function () {
            CommonProvider.promise({
              model: ArticleModel,
              method: 'disable',
              params: params.batch ? $scope.article_list.result.children.checked() : params.article,
              success: function (_article) {
                $modal.success({
                  message: _article.message
                });
              },
              error: function (_article) {
                $modal.error({
                  message: _article.message
                });
              }
            });
          }
        });
      },

      // 启用文章
      enable: function (params) {
        if (params.batch && $scope.article_list.result.checked().length == 0) {
          $modal.error({ message: '至少需要选中一个文章' });
          return false;
        };
        $modal.confirm({
          title: '确认操作',
          message: params.batch ? '确定要启用选中文章吗？' : '确定要启用此文章吗？',
          info: params.batch ? '启用后这些文章将不再前台显示' : '启用后该文章将不再前台显示',
          onsubmit: function () {
            CommonProvider.promise({
              model: ArticleModel,
              method: 'enable',
              params: params.batch ? $scope.article_list.result.checked() : params.article,
              success: function (_article) {
                $modal.success({
                  message: _article.message
                });
              },
              error: function (_article) {
                $modal.error({
                  message: _article.message
                });
              }
            });
          }
        });
      },

    };
  }
]);
/*
*
* AsideController Module
*
* Description 
* 
*/
angular.module('AsideController', [])
.controller('AsideController', ['$rootScope', '$scope', '$state', '$stateParams', '$location',
  function ($rootScope, $scope, $state, $stateParams, $location) {

    // 初始化
    $scope.default_active = false;

    // Active缺省
    $scope.defaultActive = function () {
      $scope.default_active = !$state.current.parent;
    };

    // 初始化自执行
    $scope.defaultActive();

    // 地址栏变更后
    $scope.$on('$stateChangeSuccess', function (event, next, current) {
      $scope.state = $state.current;
      $scope.defaultActive();
    });

  }
]);
/**
*
* AuditController Module
* 机构资质管理模块
*
* Description
*/
angular.module('AuditController', ['AuditModel'])
.controller('AuditController', ['$scope', '$rootScope', '$state', '$stateParams', '$location', '$modal', 'AuditModel', 'CommonProvider', function($scope, $rootScope, $state, $stateParams, $location, $modal, AuditModel, CommonProvider) {

    /*----------------机构资质管理事件----------------*/
    $scope.filter = { status: 'all' };

    $scope.auditAction = {

      // 机构资质不同状态筛选
      filterChanged: function () {
        $scope.auditAction.getLists();
      },

      // 获取列表数据
      getLists: function(page) {
        var get_params = {
          order_method: 'desc',
          page: page || 1
        };
        if ($scope.filter.status != 'all') get_params.status = $scope.filter.status;
        CommonProvider.promise({
          model: AuditModel,
          method: 'get',
          params: get_params,
          success: function (audit_list) {
            $scope.audit_list = audit_list;
          }
        });
      },

      // 获取机构资质详情
      getItem: function () {
        CommonProvider.promise({
          model: AuditModel,
          method: 'item',
          params: { organization_id: $stateParams.organization_id, role: 'admin' },
          success: function (audit_item) {
            $scope.audit = audit_item.result;
          }
        });
      },

      // 编辑机构资质
      edit: function (params) {
        var audit = {
          role: 'admin',
          body: $scope.audit,
          organization_id: $scope.audit.organization_id
        };
        // return console.log(audit);
        CommonProvider.promise({
          model: AuditModel,
          method: 'put',
          params: audit,
          success: function (_audit) {
            $modal.success({
              message: _audit.message,
              callback: function () {
                $location.path('/organization/manage/audit/list');
              }
            });
          },
          error: function (_audit) {
            $modal.error({
              message: _audit.message
            });
          }
        });
      },

      // 删除机构资质
      del: function (params) {
        if (params.batch && $scope.audit_list.result.checked().length == 0) {
          $modal.error({ message: '至少需要选中一个机构资质' });
          return false;
        };
        $modal.confirm({
          title: '确认删除',
          message: params.batch ? '确定要删除选中机构资质吗？' : '确定要删除此机构资质吗？',
          info: '机构资质删除后可在机构资质回收站中查看',
          onsubmit: function () {
            CommonProvider.promise({
              model: AuditModel,
              method: params.batch ? 'delete' : 'del',
              params: params.batch ? $scope.audit_list.result.checked() : params.audit,
              success: function (_audit) {
                $modal.success({
                  message: _audit.message
                });
              },
              error: function (_audit) {
                $modal.error({
                  message: _audit.message
                });
              }
            });
          }
        });
      },

    };
  }
]);
/**
* AuthController Module
*
* Description
*
*/

angular.module('AuthController', ['angular.validation', 'angular.validation.rule', 'AuthModel'])
.controller('AuthController', ['$rootScope', '$scope', '$stateParams', '$location', '$localStorage', '$modal', 'AuthModel', 'CommonProvider', 'PermissionProvider', 
  function ($rootScope, $scope, $stateParams, $location, $localStorage, $modal, AuthModel, CommonProvider, PermissionProvider) {

    // 登录 
    $scope.login = function () {
      CommonProvider.promise({
        model: AuthModel,
        method: 'login',
        params: $scope.user,
        success: function (_auth) {
          $localStorage.token = _auth.result;
          PermissionProvider.init();
          $location.path('/index');
        },
        error: function (_auth) {
          $modal.error({
            message: _auth.message,
            info: _auth.result
          });
        }
      });
    };

    // 注册
    $scope.register = function () {
      CommonProvider.promise({
        model: AuthModel,
        method: 'register',
        params: $scope.user,
        success: function (_auth) {
          $localStorage.token = _auth.result;
          $modal.success({
            message: _auth.message
          });
          PermissionProvider.init();
          $location.path('/index');
        },
        error: function (_auth) {
          $modal.error({
            message: _auth.message
          });
        }
      });
    };

    // 找回密码
    $scope.forgot = function () {
      CommonProvider.promise({
        model: AuthModel,
        method: 'forgot',
        params: $scope.user,
        success: function (_auth) {
          $modal.success({
            message: _auth.message
          });
          $location.path('/login');
        },
        error: function (_auth) {
          $modal.error({
            message: _auth.message
          });
        }
      });
    };

    // 注销
    $scope.logout = function () {
      CommonProvider.promise({
        model: AuthModel,
        method: 'logout',
        success: function (_auth) {
          delete $localStorage.token;
          delete $localStorage.user;
          $rootScope.permissions = null;
          $location.path('/login');
        },
        error: function (_auth) {
          $modal.error({
            message: _auth.message
          });
        }
      });
    };
  }
]);
/**
* CategoryController Module
*
* Description
*/
angular.module('CategoryController', ['angular.validation', 'angular.validation.rule', 'angular-sortable-view', 'Qupload', 'CategoryModel'])
.controller('CategoryController', ['$scope', '$rootScope', '$state', '$stateParams', '$location', '$modal', 'CategoryModel', 'CommonProvider', function($scope, $rootScope, $state, $stateParams, $location, $modal, CategoryModel, CommonProvider) {

    $scope.category_type = $stateParams.category_type || '1';
    $scope.category_id = $stateParams.category_id || '0';
    $scope.category_title = '';
    $scope.category_alais = '';
    $scope.category_info = {};
    switch ($scope.category_type) {
      case '1':
        $scope.category_info = {
          title: '课程分类',
          alais: 'course'
        };
        break;
      case '2':
        $scope.category_info = {
          title: '学校分类',
          alais: 'organization'
        };
        break;
      case '3':
        $scope.category_info = {
          title: '文章分类',
          alais: 'article'
        };
        break;
      default:
        break;
    }

    /*----------------分类管理事件----------------*/
    $scope.categoryAction = {

      // 获取课程分类
      getLists: function () {
        var params = {
          role: 'admin',
          category_id: $scope.category_id,
          type: $scope.category_type,
          children: 1,
        };
        CommonProvider.promise({
          model: CategoryModel,
          params: params,
          method: 'childrens',
          success: function (category_list) {
            $scope.category_list = category_list;
          }
        });
      },

      // 分类排序
      sort: function (params) {
        CommonProvider.sort({
          model: CategoryModel,
          params: params,
          data: $scope.category_list.result.children,
          method: 'sort'
        });
      },

      // 添加分类
      add: function (params) {
        if (params.modal) {
          $rootScope.category = {
            alais: $scope.category_info.alais,
            pid: params.pid || 0,
            type: $scope.category_type,
            redirect: params.redirect || false,
          };
          $modal.custom({
            title: '添加分类',
            template_url: '/partials/admin/category/manage/add.html',
            callback: function () {
              delete $rootScope.category;
            }
          });
        } else {
          $scope.category.type = $rootScope.category.type;
          $scope.category.pid = $rootScope.category.pid;
          var category_option = {
            alais: $rootScope.category.alais,
            pid: $rootScope.category.pid,
            type: $rootScope.category.type,
            redirect: $rootScope.category.redirect,
          };
          CommonProvider.promise({
            model: CategoryModel,
            method: 'add',
            params: $scope.category,
            success: function (_category) {
              $rootScope.modal.close();
              $modal.success({
                message: _category.message,
                callback: function () {
                  delete $rootScope.category;
                  if (category_option.redirect) {
                    $location.path('/' + category_option.alais + '/manage/category/list/' + category_option.type + '/' + category_option.pid);
                  }
                }
              });
            },
            error: function (_category) {
              $modal.error({
                message: _category.message
              });
            }
          });
        }
      },

      // 编辑分类
      edit: function (params) {
        if (params.modal) {
          $rootScope.category_local = params.category;
          $rootScope.category_edit  = angular.copy(params.category.category);
          $modal.custom({
            title: '编辑分类',
            template_url: '/partials/admin/category/manage/edit.html',
            callback: function () {
              delete $rootScope.category_edit;
            }
          });
        } else {
          CommonProvider.promise({
            model: CategoryModel,
            method: 'put',
            params: { new: $scope.category, old: $rootScope.category_local },
            success: function (_category) {
              $rootScope.category_local.$parent.category = _category.result;
              $rootScope.modal.close();
              $modal.success({
                message: _category.message,
                callback: function () {
                  delete $rootScope.category_local;
                }
              });
            },
            error: function (_category) {
              $modal.error({
                message: _category.message
              });
            }
          });
        }
      },

      // 图片上传回调
      getUploadThumb: function (data) {
        if (data) {
          $scope.category.icon = data.key;
        }
      },

      // 删除分类
      del: function (params) {
        if (params.batch && $scope.category_list.result.children.checked().length == 0) {
          $modal.error({ message: '至少需要选中一个分类' });
          return false;
        };
        $modal.confirm({
          title: '确认删除',
          message: params.batch ? '确定要删除选中分类吗？' : '确定要删除此分类吗？',
          info: '分类删除操作不可撤销，下级分类也将被删除',
          onsubmit: function () {
            CommonProvider.promise({
              model: CategoryModel,
              method: params.batch ? 'delete' : 'del',
              params: params.batch ? $scope.category_list.result.children.checked() : params.category,
              success: function (_category) {
                $modal.success({
                  message: _category.message
                });
              },
              error: function (_category) {
                $modal.error({
                  message: _category.message
                });
              }
            });
          }
        });
      },

      // 禁用分类
      disable: function (params) {
        if (params.batch && $scope.category_list.result.children.checked().length == 0) {
          $modal.error({ message: '至少需要选中一个分类' });
          return false;
        };
        $modal.confirm({
          title: '确认操作',
          message: params.batch ? '确定要禁用选中分类吗？' : '确定要禁用此分类吗？',
          info: params.batch ? '禁用后这些分类将不再前台显示' : '禁用后该分类将不再前台显示',
          onsubmit: function () {
            CommonProvider.promise({
              model: CategoryModel,
              method: 'disable',
              params: params.batch ? $scope.category_list.result.children.checked() : params.category,
              success: function (_category) {
                $modal.success({
                  message: _category.message
                });
              },
              error: function (_category) {
                $modal.error({
                  message: _category.message
                });
              }
            });
          }
        });
      },

      // 启用分类
      enable: function (params) {
        if (params.batch && $scope.category_list.result.children.checked().length == 0) {
          $modal.error({ message: '至少需要选中一个分类' });
          return false;
        };
        $modal.confirm({
          title: '确认操作',
          message: params.batch ? '确定要启用选中分类吗？' : '确定要启用此分类吗？',
          info: params.batch ? '启用后这些分类将不再前台显示' : '启用后该分类将不再前台显示',
          onsubmit: function () {
            CommonProvider.promise({
              model: CategoryModel,
              method: 'enable',
              params: params.batch ? $scope.category_list.result.children.checked() : params.category,
              success: function (_category) {
                $modal.success({
                  message: _category.message
                });
              },
              error: function (_category) {
                $modal.error({
                  message: _category.message
                });
              }
            });
          }
        });
      },

    };
  }
]);
/**
*
* ConfigController Module
*
* Description
*
*/
angular.module('ConfigController', ['angular-sortable-view', 'angular-related-select', 'TabsDirective', 'TypeaheadDirective', 'ConfigModel', 'IndexModel', 'SearchModel', 'PartnerModel', 'LinkModel', 'PublicModel', 'CategoryModel', 'SearchService', 'OrganizationService', 'CategoryService', 'CourseService'])
.controller('ConfigController', ['$rootScope', '$scope', '$http', '$stateParams', '$location', '$localStorage', '$modal', 'SystemModel', 'IndexModel', 'LogModel', 'PartnerModel', 'LinkModel', 'PublicModel', 'SearchModel', 'CategoryModel', 'SearchService', 'OrganizationService', 'CategoryService', 'CourseService', 'CommonProvider',
  function ($rootScope, $scope, $http, $stateParams, $location, $localStorage, $modal, SystemModel, IndexModel, LogModel, PartnerModel, LinkModel, PublicModel, SearchModel, CategoryModel, SearchService, OrganizationService, CategoryService, CourseService, CommonProvider) {

    $scope.params = {};

    /*----------------系统配置----------------*/

    $scope.systemAction = {

      all_tabs: [ '基本设置', '内容设置', '用户设置', '系统设置'],

      // 获取配置列表
      getLists: function (page) {
        CommonProvider.promise({
          model: SystemModel,
          method: 'get',
          params: { page: page || 1, role: 'admin' },
          success: function (_lists) {
            $scope.config_list = _lists;
          }
        });
      },

      // 获取配置列表（组）
      getGroup: function (group) {
        $scope.config_group = $scope.config_group || {};
        if (!!$scope.config_group[group]) return;
        if ($localStorage.config_group) {
          if ($localStorage.config_group[group]) {
            $scope.config_group[group] = angular.copy($localStorage.config_group[group]);
          }
        } else {
          $localStorage.config_group = {};
        }
        CommonProvider.promise({
          model: SystemModel,
          method: 'get',
          params: { per_page: 100, group: group + 1, role: 'admin'},
          success: function (_config_list) {
            $localStorage.config_group[group] = angular.copy(_config_list.result.toObject('name'));
            $scope.config_group[group] = _config_list.result.toObject('name');
          }
        });
      },

      // 保存配置（组）
      putGroup: function (group) {
        CommonProvider.promise({
          model: SystemModel,
          method: 'putGroup',
          params: $scope.config_group[group],
          success: function (_config_group) {
            $modal.success({
              message: _config_group.message
            });
          }
        });
      },

      // 新增配置
      add: function (params) {
        if (params.modal) {
          $modal.custom({
            title: '新增配置项',
            template_url: '/partials/admin/config/system/add.html'
          });
        } else {
          CommonProvider.promise({
            model: SystemModel,
            method: 'add',
            params: $scope.config,
            success: function (_config) {
              $scope.config = null;
              $rootScope.modal.close();
              $modal.success({
                message: _config.message
              });
            },
            error: function (_config) {
              $modal.error({
                message: _config.message
              });
            }
          });
        }
      },

      // 更新配置
      edit: function (params) {
        if (params.modal) {
          $rootScope.config_local = params.config;
          $rootScope.config_edit = angular.copy(params.config.config);
          $modal.custom({
            title: '更新配置项',
            template_url: '/partials/admin/config/system/edit.html',
            callback: function () {
              $rootScope.config_local = null;
              delete $rootScope.config_edit;
            }
          });
        } else {
          // 提交前数据转换
          $rootScope.config_edit.value = $rootScope.config_edit.value.toString();
          CommonProvider.promise({
            model: SystemModel,
            method: 'put',
            params: { old: $rootScope.config_local, new: $rootScope.config_edit },
            success: function (_config) {
              $rootScope.modal.close();
              $modal.success({
                message: _config.message
              });
            },
            error: function (_config) {
              $modal.error({
                message: _config.message
              });
            }
          });
        }
      },

      // （批量）删除配置
      del: function (params) {
        if (params.batch && $scope.config_list.result.checked().length == 0) {
          $modal.error({ message: '至少需要选中一个配置项' });
          return false;
        };
        $modal.confirm({
          title: '确认删除',
          message: params.batch ? '确定要删除选中配置项吗？' : '确定要删除此配置项吗？',
          info: '配置项删除操作不可撤销',
          onsubmit: function () {
            CommonProvider.promise({
              model: SystemModel,
              method: params.batch ? 'delete' : 'del',
              params: params.batch ? $scope.config_list.result.checked() : params.config,
              success: function (_config) {
                $modal.success({
                  message: _config.message
                });
              },
              error: function (_config) {
                $modal.error({
                  message: _config.message
                });
              }
            });
          }
        });
      }
    };

    /*----------------首页配置----------------*/

    $scope.config_list = {};
    $scope.config_data = {};
    $scope.search = {};
    $scope.indexAction = {

      // 获取配置列表
      getLists: function (page) {
        CommonProvider.promise({
          model: IndexModel,
          method: 'get',
          params: { page: page || 1, role: 'admin' },
          success: function (_config_list) {
            $scope.config_list = _config_list;
          }
        });
      },

      // 获取所有分类列表
      getCategories: function () {
        CommonProvider.promise({
          model: CategoryModel,
          method: 'get',
          params: {
            category_id: 0,
            type: 1
          },
          success: function (categories) {
            var categories = categories.result;
            $rootScope.categories = categories;
          }
        });
      },

      // 分类联动选择回调
      selectChange: function (params) {
        var disSelects = angular.copy(params.disSelects);
        var select_categories = disSelects.pop();
        $rootScope.select_categories = select_categories;
      },

      // 管理配置
      manage: function (params) {
        if (params.modal) {
          // $rootScope.categories = {};
          $rootScope.config_local = params;
          $rootScope.config_edit = params;
          // 获取配置信息
          $modal.custom({
            title: '管理配置',
            template_url: '/partials/admin/config/index/manage.html',
            callback: function () {
              delete $rootScope.config_edit;
              delete $rootScope.categories;
              delete $rootScope.select_categories;
            }
          });
        } else {
          switch (params.option) {
            case 'organization':
              $scope.config_data.organization = $scope.config.organization.ids().join(',');
              break;
            case 'category':
              $scope.config_data.sub_category = $scope.config.sub_category.ids().join(',');
              break;
            case 'course':
              $scope.config_data.course = $scope.config.course.ids().join(',');
              break;
            default:
              break;
          };
          $scope.config_data.category_id = $scope.config.category_id;
          $scope.config_data.id = $scope.config.id;

          CommonProvider.promise({
            model: IndexModel,
            method: 'put',
            params: $scope.config_data,
            success: function (_config) {
              $rootScope.config_local = _config.result[params.option];
              $rootScope.modal.close();
              $modal.success({
                message: _config.message,
                callback: function () {
                  delete $rootScope.config_local;
                  delete $rootScope.select_categories;
                }
              });
            },
            error: function (_config) {
              $modal.error({
                message: _config.message
              });
            }
          });
        }
      },

      // 移除选项
      remove: function (params) {
        switch (params.option) {
          case 'organization':
              $rootScope.config_edit.data.config.organization.remove(params.config.config);
              break;
            case 'category':
              $rootScope.config_edit.data.config.sub_category.remove(params.config.config);
              break;
            case 'course':
              $rootScope.config_edit.data.config.course.remove(params.config.config);
              break;
            default:
              break;
        };
      },

      // 搜索
      search: function (params) {
        if (params.keyword) {
          var params_search = {
            keyword: params.keyword,
            search_type: params.type,
            only_name: 1
          };
          $scope.search.keyword = params.keyword;
          return CommonProvider.request({
            method: 'get',
            service: new SearchService(),
            params: params_search
          }).then(function (res) {
            return res.result;
          });
        }
      },

      // 课程、学校推荐选择
      searchSelect: function (params) {
        $scope.search.keyword = params.label;
        // 获取item加入到列表中
        var _search_data = {
          service: {},
          params: {},
          method: '',
        };
        var _search_list = {};

        switch (params.type) {
          case 'organization':
            _search_data = {
              service: new OrganizationService(),
              params: { organization_id: params.item.id },
              method: 'item',
            };
            if ($rootScope.config_edit.data.config.organization.find(params.item.id, 'id')) {
              return false;
            }
            break;
          case 'course':
            _search_data = {
              service: new CourseService(),
              params: { course_id: params.item.id },
              method: 'item'
            };
            if ($rootScope.config_edit.data.config.course.find(params.item.id, 'id')) {
              return false;
            }
            break;
          default:
            break;
        };
        
        CommonProvider.request({
          service: _search_data.service,
          params: _search_data.params,
          method: _search_data.method,
          success: function (_data) {
            switch (params.type) {
              case 'organization':
                $rootScope.config_edit.data.config.organization.push(_data.result);
                break;
              case 'course':
                $rootScope.config_edit.data.config.course.push(_data.result);
                break;
              default:
                break;
            };
          }
        });
      },

      // 分类推荐选择
      categorySelect: function (params) {
        if (params.category.value) {
          var category = params.category.value;
          params.category.is_selected ? $rootScope.config_edit.data.config.sub_category.push(category) : $rootScope.config_edit.data.config.sub_category.remove(category);
        }
      },
    };

    /*----------------入驻机构配置----------------*/

    $scope.partner_list = {};
    $scope.partnerAction = {
      // 获取入驻机构首页数据
      getIndex: function (page) {
        var _self = this;
        $scope.params = {
          role: 'admin',
          page: page || 1,
        };
        _self.getLists($scope.params);
      },

      // 获取列表
      getLists: function (params) {
        CommonProvider.promise({
          model: PartnerModel,
          method: 'get',
          params: params,
          success: function (partner_list) {
            $scope.partner_list = partner_list;
          }
        });
      },

      // 新增入驻机构
      add: function (params) {
        if (params.modal) {
          $modal.custom({
            title: '新增入驻机构',
            template_url: '/partials/admin/config/partner/add.html'
          });
        } else {


        }
      },

    };

    /*----------------友情链接配置----------------*/

    $scope.link_list = {};
    $scope.linkAction = {
      // 获取友情链接首页数据
      getIndex: function (page) {
        var _self = this;
        $scope.params = {
          role: 'admin',
          page: page || 1,
        };
        _self.getLists($scope.params);
      },

      // 获取列表
      getLists: function (params) {
        CommonProvider.promise({
          model: LinkModel,
          method: 'get',
          params: params,
          success: function (link_list) {
            $scope.link_list = link_list;
          }
        });
      },

      // 添加友情链接
      add: function (params) {
        if (params.modal) {
          $modal.custom({
            title: '添加友情链接',
            template_url: '/partials/admin/config/link/add.html'
          });
        } else {
          CommonProvider.promise({
            model: LinkModel,
            method: 'add',
            params: $scope.link,
            success: function (_link) {
              $rootScope.modal.close();
              $modal.success({
                message: _link.message
              });
            },
            error: function (_link) {
              $modal.error({
                message: _link.message
              });
            }
          });
        }
      },

      // 编辑友情链接
      edit: function (params) {
        if (params.modal) {
          $rootScope.link_local = params.link;
          $rootScope.link_edit  = angular.copy(params.link.link);
          $modal.custom({
            title: '编辑友情链接',
            template_url: '/partials/admin/config/link/edit.html',
            callback: function () {
              delete $rootScope.link_edit;
            }
          });
        } else {
          CommonProvider.promise({
            model: LinkModel,
            method: 'put',
            params: $scope.link,
            success: function (_link) {
              $rootScope.link_local.$parent.link = _link.result;
              $rootScope.modal.close();
              $modal.success({
                message: _link.message,
                callback: function () {
                  delete $rootScope.link_local;
                }
              });
            },
            error: function (_link) {
              $modal.error({
                message: _link.message
              });
            }
          });
        }
      },

      // 删除友情链接
      del: function (params) {
        if (params.batch && $scope.link_list.result.checked().length == 0) {
          $modal.error({ message: '至少需要选中一个友情链接' });
          return false;
        };
        $modal.confirm({
          title: '确认删除',
          message: params.batch ? '确定要删除选中友情链接吗？' : '确定要删除此友情链接吗？',
          info: '友情链接删除后可在回收站中查看',
          onsubmit: function () {
            CommonProvider.promise({
              model: LinkModel,
              method: params.batch ? 'delete' : 'del',
              params: params.batch ? $scope.link_list.result.checked() : params.link,
              success: function (_link) {
                $modal.success({
                  message: _link.message
                });
              },
              error: function (_link) {
                $modal.error({
                  message: _link.message
                });
              }
            });
          }
        });
      },
    };

    /*----------------搜索管理----------------*/

    $scope.searchAction = {
      // 获取搜索热词
      getHot: function () {
        CommonProvider.promise({
          model: SearchModel,
          method: 'getHotWords',
          success: function (_search_hot) {
            $scope.search_hot = _search_hot.result;
          }
        });
      },

      // 保存搜索热词
      hot: function () {
        CommonProvider.promise({
          model: SearchModel,
          method: 'putHotWords',
          params: $scope.search_hot,
          success: function (_search_hot) {
            $modal.success({
              message: _search_hot.message,
            });
          },
          error: function (_search_hot) {
            $modal.error({
              message: _search_hot.message
            });
          }
        });
      },

      // 搜索索引初始化
      searchInit: function (params) {
        var type_text = params.type == 'course' ? '课程' : '学校';
        $modal.confirm({
          title: '确认操作',
          message: '确定要初始化'+ type_text +'搜索索引？',
          onsubmit: function () {
            CommonProvider.promise({
              model: SearchModel,
              method: 'searchInit',
              params: params,
              success: function (_search_init) {
                $modal.success({
                  message: _search_init.message
                });
                $scope.search_init_menu = false;
              },
              error: function (_search_init) {
                $modal.error({
                  message: _search_init.message
                });
              }
            });
          }
        });
      },

      // 清除历史索引
      searchClean: function (params) {
        var type_text = params.type == 'course' ? '课程' : '学校';
        $modal.confirm({
          title: '确认操作',
          message: '确定要清空'+ type_text +'搜索索引？',
          onsubmit: function () {
            CommonProvider.promise({
              model: SearchModel,
              method: 'searchClean',
              params: params,
              success: function (_search_clean) {
                $modal.success({
                  message: _search_clean.message
                });
                $scope.search_clean_menu = false;
              },
              error: function (_search_clean) {
                $modal.error({
                  message: _search_clean.message
                });
              }
            });
          }
        });
      },
    };

    /*----------------数据库管理----------------*/
    $scope.databaseAction = {

      // 获取备份的数据列表
      getExport: function () {

      },

      // 获取还原的数据列表
      getImport: function () {

      },

    };


    /*----------------操作日志----------------*/

    // 日志行为
    $scope.logAction = {

      // 日志行为首页
      getIndex: function (page) {
        var _self = this;
        // 获取列表
        $scope.params = {
          page: page || 1,
        };
        _self.getLists($scope.params);
      },

      // 获取日志列表
      getLists: function (params) {
        CommonProvider.promise({
          model: LogModel,
          method: 'get',
          params: params,
          success: function (_log_list) {
            $scope.log_list = _log_list;
          }
        });
      },

      // 删除日志
      del: function (params) {
        if (params.batch && $scope.log_list.result.checked().length == 0) {
          $modal.error({ message: '至少需要选中一条日志' });
          return false;
        };
        $modal.confirm({
          title: '确认删除',
          message: params.batch ? '确定要删除选中日志吗？' : '确定要删除此日志吗？',
          info: '日志删除操作不可撤销',
          onsubmit: function () {
            CommonProvider.promise({
              model: LogModel,
              method: 'del',
              params: params.batch ? $scope.log_list.result.checked() : params.log,
              success: function (_log) {
                $modal.success({
                  message: _log.message
                });
              },
              error: function (_log) {
                $modal.error({
                  message: _log.message
                });
              }
            });
          }
        });
      },

      // 清空日志
      clear: function () {
        $modal.confirm({
          title: '确认删除',
          message: '确定要清空所有日志吗？',
          info: '本操作不可恢复',
          onsubmit: function () {
            CommonProvider.promise({
              model: LogModel,
              method: 'clear',
              success: function (_log) {
                $modal.success({
                  message: _log.message
                });
              },
              error: function (_log) {
                $modal.error({
                  message: _log.message
                });
              }
            });
          }
        });
      }
    };

    /*----------------短信记录----------------*/
    $scope.smsAction = {

      // 短信记录首页
      getIndex: function (page) {
        var _self = this;
        // 获取列表
        $scope.params = {
          role: 'admin',
          page: page || 1,
        };
        _self.getLists($scope.params);
      },

      // 获取列表数据
      getLists: function (params) {
        CommonProvider.promise({
          model: SmsModel,
          method: 'get',
          params: params,
          success: function (_sms_list) {
            $scope.sms_list = _sms_list;
          }
        });
      },
    };
  }
]);


/**
* CourseController Module
*
* Description
*/
angular.module('CourseController', ['Umeditor', 'Qupload', 'angular-video-player', 'angular-sortable-view', 'angular-related-select', 'CourseModel', 'CategoryModel', 'SectionModel', 'CourseService'])
.controller('CourseController', ['$scope', '$rootScope', '$state', '$location', '$stateParams', '$modal', 'CourseModel', 'CategoryModel', 'SectionModel', 'CourseService', 'CommonProvider', function($scope, $rootScope, $state, $location, $stateParams, $modal, CourseModel, CategoryModel, SectionModel, CourseService, CommonProvider) {

    /*----------------课程管理事件----------------*/
    $rootScope.player = {};
    $scope.search = {};
    $scope.course = {};
    $scope.course_id = $stateParams.course_id || false;
    $scope.categories = [];
    $scope.course_section = [];
    $scope.sections = [];
    $scope.sections_filter = [];

    // 过滤条件
    $scope.filter = {
      sort_id: 'all',
      x_status: 'all',
      is_live: 'all',
      status: 'all',
      category_id: 'all'
    };

    $scope.courseAction = {

      // 课程管理首页
      getIndex: function () {
        
        // 获取课程列表
        $scope.courseAction.getLists();

        // 获取课程分类
        $scope.courseAction.getCategory();
      },

      // 课程状态、分类筛选
      filterChanged: function() {

        $scope.courseAction.getLists();
      },

      // 获取课程列表
      getLists: function (page) {

        var get_params = {
          role: 'admin',
          page: page || 1,
          per_page: 16
        };

        var filters = $scope.filter;
        for (var key in filters){
          if (filters[key] != 'all') {
            get_params[key] = filters[key];
          }
        };

        // return;
        // console.log(get_params);

        CommonProvider.promise({
          model: CourseModel,
          method: 'get',
          params: get_params,
          success: function (course_list) {
            $scope.course_list = course_list;
          }
        });
      },

      // 获取分类列表
      getCategory: function (params) {
        CommonProvider.promise({
          model: CategoryModel,
          method: 'get',
          params: {
            role: 'admin',
            type: 1,
          },
          success: function (categories) {
            var categories = categories.result;
            var cate_lists = [];
            var pushCate = function (cates, prefix) {
              var prefix = prefix || '—';
              cates.forEach(function (cate) {
                if (!!cate.pid) cate.name = prefix + cate.name;
                cate_lists.push(cate);
                if (cate.children && !!cate.children.length) {
                  pushCate(cate.children, prefix + '——');
                }
              });
            };
            pushCate(categories);
            cate_lists.forEach(function (cate) {
              cate.children = null;
            });
            $scope.categories = cate_lists;
          }
        });
      },

      // 课程详情
      getItem: function () {
        CommonProvider.promise({
          model: CourseModel,
          method: 'item',
          params: { course_id: $scope.course_id, role: 'admin' },
          success: function (course) {

            $scope.course = course.result;
            $scope.course.organization_id = $scope.course.organization_id || undefined;

            // 请求分类数据
            $scope.courseAction.getCategory({ category_id: 0, type: 1 });
          }
        });
      },

      // 课程章节
      getSection: function () {
        var params = {
          course_id: $scope.course_id,
          role: 'admin'
        };
        CommonProvider.promise({
          model: SectionModel,
          method: 'get',
          params: params,
          success: function (course_section) {
            $scope.course_section = course_section.result;
            $scope.sections = angular.copy($scope.course_section);
          }
        });
      },

      // 课程搜索
      getSearch: function () {
        var params = [{
          field: 'name',
          operation: 'like',
          value: $scope.search.keyword
        }, {
          field: 'introduction',
          operation: 'like',
          value: $scope.search.keyword
        }, {
          field: 'description',
          operation: 'like',
          value: $scope.search.keyword
        }];
        CommonProvider.search({
          service: new CourseService(),
          method: 'search',
          params: params,
          success: function (_course_list) {
            $scope.course_list = _course_list;
          }
        });
      },

      // 录播视频审核
      audit: function (params) {
        $rootScope.section_local = params.section.section;
        $scope.section = angular.copy(params.section.section);
        $scope.section.status = 3;
        $scope.section.role = 'admin';
        $modal.confirm({
          title: '确认操作',
          message: '确定要审核通过该视频吗？',
          info: '本操作不可恢复',
          onsubmit: function () {
            CommonProvider.promise({
              model: SectionModel,
              method: 'put',
              params: $scope.section,
              success: function (_section) {
                $modal.success({
                  message: _section.message,
                });
                $rootScope.section_local.status = 3;
                delete $rootScope.section_local;
              },
              error: function (_section) {
                $modal.error({
                  message: _section.message,
                });
              }
            });
          }
        });
      },

      // 录播拒绝审核
      auditRefuse: function (params) {
        var section = params.section;
        var ismodel = params.ismodel;
        if (ismodel) {
          $rootScope.section_edit = section;
          $modal.custom({
            title: '《' + section.name + '》 - 拒绝审核',
            template_url: 'partials/admin/course/manage/section/video.html',
            callback: function () {
              $rootScope.section_edit = null;
              delete $rootScope.section_edit;
            }
          });
        } else {
          // console.log(params);
          var section = angular.copy($rootScope.section_edit);
          section.status = -3;
          section.role = 'admin';
          section.remark = params.remark;
          CommonProvider.promise({
            model: SectionModel,
            method: 'put',
            params: section,
            success: function (_section) {
              $rootScope.section_edit.status = -3;
              $rootScope.section_edit.remark = section.remark;
              $rootScope.modal.close();
              $modal.success({ message: _section.message });
            },
            error: function (_section) {
              $rootScope.modal.close();
              $modal.error({
                message: _section.message,
              });
            }
          });
        }
      },

      // 直播信息审核
      liveAudit: function (params) {
        var section = params.section;
        var ismodel = params.ismodel;
        if (ismodel) {
          section.live = {};
          section.live.duration = {};
          section.live.duration.hours = parseInt(section.live_duration / 60);
          section.live.duration.moments = parseInt(section.live_duration % 60);
          $rootScope.section_edit = section;
          $modal.custom({
            title: '《' + section.name + '》 - 直播信息预览',
            template_url: 'partials/admin/course/manage/section/live.html'
          });
        } else {
          var isaudit = params.audit.pass;
          var remark  = params.audit.remark;
          section.live_status = isaudit ? 1 : -1;
          section.role = 'admin';
          if (!isaudit) section.remark = remark;
          // return console.log(section);
          CommonProvider.promise({
            model: SectionModel,
            method: 'put',
            params: section,
            success: function (_section) {
              $rootScope.modal.close();
              $modal.success({ message: '操作成功' });
            },
            error: function (_section) {
              $rootScope.modal.close();
              $modal.error({ message: _section.message });
            },
            callback: function () {
              $rootScope.section_edit = null;
            }
          });

        }
      },

      // 视频预览
      preview: function (section_id) {
        var params = {
          role: 'admin',
          section_id: section_id
        };
        // 获取视频地址
        CommonProvider.promise({
          model: SectionModel,
          method: 'getVideos',
          params: params,
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
          }
        });
      },

      // 章节状态、类型筛选
      sectionFilterChanged: function() {
        var status = $scope.filter.section_status;
        var type = $scope.filter.section_type;
        if (status == 'all' && type == 'all') return $scope.sections = $scope.course_section;
        var chapters = angular.copy($scope.course_section);
        var f_chapters = [];
        chapters.forEach(function (chapter) {
          var sections = [];
          chapter.children.forEach(function (section) {

            // 全部类型/单个当前类型
            if (type == 'all' || section.is_live == type) {

              // 全部状态
              if (status == 'all') sections.push(section);

              // 未审核
              if (status == 0) {
                if (!!section.is_live) {
                  if (section.live_status == 0) sections.push(section);
                } else { if (section.status < 3) sections.push(section) }
              }

              // 审核成功
              if (status == 1) {
                if (!!section.is_live) {
                  if (section.live_status > 0) sections.push(section);
                } else { if (section.status == 3) sections.push(section) }
              }

              // 审核失败
              if (status == -1) {
                if (!!section.is_live) {
                  if (section.live_status == -1) sections.push(section);
                } else { if (section.status == -3) sections.push(section) }
              }
            }
          });
          chapter.children = sections;
          // if (!!sections.length) 
          f_chapters.push(chapter);
        });
        $scope.sections = f_chapters;
      },

      // 编辑课程
      edit: function () {
        $scope.course.role = 'admin';
        CommonProvider.promise({
          model: CourseModel,
          method: 'put',
          params: { new: $scope.course },
          success: function (_course) {
            $modal.success({
              message: _course.message,
              callback: function () {
                // $location.path('/course/manage/list/index');
              }
            });
          },
          error: function (_course) {
            $modal.error({
              message: _course.message
            });
          }
        });
      },

      // 课程图片上传后回调
      getUploadThumb: function (data) {
        if (data) {
          $scope.course.thumb = data.key;
        }
      },

      // 分类选择改变回调
      courseCateChange: function (select) {
        $scope.course.category_id = select.ckdSelectId;
      },

      // 删除课程
      del: function (params) {
        if (params.batch && $scope.course_list.result.checked().length == 0) {
          return $modal.error({ message: '至少需要选中一门课程' });
        };
        $modal.confirm({
          title: '确认删除',
          message: params.batch ? '确定要删除选中课程吗？' : '确定要删除此课程吗？',
          info: '课程删除操作不可撤销',
          onsubmit: function () {
            CommonProvider.promise({
              model: CourseModel,
              method: params.batch ? 'delete' : 'del',
              params: params.batch ? $scope.course_list.result.checked() : params.course,
              success: function (_course) {
                $modal.success({ message: _course.message });
              },
              error: function (_course) {
                $modal.error({ message: _course.message });
              }
            });
          }
        });
      },

      // 课程下架
      disable: function (params) {
        if (params.batch && $scope.course_list.result.checked().length == 0) {
          $modal.error({ message: '至少需要选中一门课程' });
          return false;
        };
        $modal.confirm({
          title: '确认操作',
          message: params.batch ? '确定要下架选中课程吗？' : '确定要下架此课程吗？',
          info: params.batch ? '下架后这些课程将不再前台显示' : '下架后该课程将不再前台显示',
          onsubmit: function () {
            CommonProvider.promise({
              model: CourseModel,
              method: 'disable',
              params: params.batch ? $scope.course_list.result.checked() : params.course,
              success: function (_course) {
                $modal.success({
                  message: _course.message
                });
              },
              error: function (_course) {
                $modal.error({
                  message: _course.message
                });
              }
            });
          }
        });
      },

      // 课程上架
      enable: function (params) {
        if (params.batch && $scope.course_list.result.checked().length == 0) {
          $modal.error({ message: '至少需要选中一个课程' });
          return false;
        };
        $modal.confirm({
          title: '确认操作',
          message: params.batch ? '确定要上架选中课程吗？' : '确定要上架此课程吗？',
          info: params.batch ? '上架后选中课程将恢复正常购买' : '上架后该课程将恢复正常购买',
          onsubmit: function () {
            CommonProvider.promise({
              model: CourseModel,
              method: 'enable',
              params: params.batch ? $scope.course_list.result.checked() : params.course,
              success: function (_course) {
                $modal.success({ message: _course.message });
              },
              error: function (_course) {
                $modal.error({ message: _course.message });
              }
            });
          }
        });
      },

    };
  }
]);
/**
* FeedbackController Module
*
* Description
*/
angular.module('FeedbackController', ['FeedbackModel'])
.controller('FeedbackController', ['$scope', '$rootScope', '$state', '$stateParams', '$location', '$modal', 'FeedbackModel', 'CommonProvider', function($scope, $rootScope, $state, $stateParams, $location, $modal, FeedbackModel, CommonProvider) {

    /*----------------反馈管理事件----------------*/
    $scope.filter = {};
    $scope.params = {};
    $scope.feedback_list = {};

    $scope.feedbackAction = {

      // 反馈管理首页
      getIndex: function (page) {
        var _self = this;
        // 获取课程列表
        $scope.params = {
          role: 'admin',
          page: page || 1,
        };
        _self.getLists($scope.params);
      },

      // 获取列表数据
      getLists: function(params) {
        CommonProvider.promise({
          model: FeedbackModel,
          method: 'get',
          params: params,
          success: function (_feedback_list) {
            $scope.feedback_list = _feedback_list;
          }
        });
      },

      // 获取反馈详情
      getItem: function () {
        CommonProvider.promise({
          model: FeedbackModel,
          method: 'item',
          params: { feedback_id: $stateParams.feedback_id },
          success: function (_feedback_item) {
            $scope.feedback = _feedback_item.result;
          }
        });
      },

      // 删除反馈
      del: function (params) {
        if (params.batch && $scope.feedback_list.result.checked().length == 0) {
          $modal.error({ message: '至少需要选中一条反馈' });
          return false;
        };
        $modal.confirm({
          title: '确认删除',
          message: params.batch ? '确定要删除选中反馈吗？' : '确定要删除此反馈吗？',
          info: '反馈删除后可在回收站中查看',
          onsubmit: function () {
            CommonProvider.promise({
              model: FeedbackModel,
              method: params.batch ? 'delete' : 'del',
              params: params.batch ? $scope.feedback_list.result.checked() : params.feedback,
              success: function (_feedback) {
                $modal.success({
                  message: _feedback.message
                });
              },
              error: function (_feedback) {
                $modal.error({
                  message: _feedback.message
                });
              }
            });
          }
        });
      },

    };
  }
]);
/*
* HeaderController Module
*
* Description
*/

angular.module('HeaderController', [])
.controller('HeaderController', ['$rootScope', '$scope', '$state', '$stateParams', '$location',
  function ($rootScope, $scope, $state, $stateParams, $location) {

    // 更新边栏菜单
    $scope.asideMenusEvent = function () {
      if (!$rootScope.menus || !$rootScope.menus.length) return;
      if ($rootScope.menus.find) {
        $rootScope.aside_menus = $rootScope.menus.find($scope.current_slug || 'index', 'slug').children;
      } else {
        $rootScope.aside_menus = $rootScope.menus[0].children;
      };
      $scope.pagePermissionsEvent();
      
      // 如果当前在父页则跳转到第一个子页
      if (!$state.current.parent && $rootScope.aside_menus) {
        $location.path($rootScope.aside_menus[0].children[0].url);
      }
    };

    // 更新对应页面权限信息，并推送给父控
    $scope.pagePermissionsEvent = function () {
      if ($scope.current_node_slug) {
        $scope.node_permission = $rootScope.aside_menus.find($scope.current_node_slug, 'slug');
        if ($scope.node_permission && $scope.node_permission.children) {
          $rootScope.page_permission = $scope.node_permission.children.find($state.current.name, 'slug').children;
        }
      } else if ($rootScope.aside_menus && $rootScope.aside_menus[0] && $rootScope.aside_menus[0].children && $rootScope.aside_menus[0].children[0].children) {
        $rootScope.page_permission = $rootScope.aside_menus[0].children[0].children;
      }
      if ($rootScope.page_permission && $rootScope.page_permission.toObject) {
        $rootScope.page_permission = $rootScope.page_permission.toObject('slug');
        // console.log('当前页面权限信息：', $rootScope.page_permission);
      };
    };

    // 地址栏更新后
    $scope.$on('$stateChangeSuccess', function () {

      // 更新导航栏活动状态
      $scope.current_slug = ($state.current.name.indexOf('.') == -1 ) ? $state.current.data.slug : $state.current.name.substr(0, $state.current.name.indexOf('.'));
      $scope.current_node_slug = $state.current.name.substr(0, $state.current.name.indexOf('.', $state.current.name.indexOf('.') + 1 ));

      // 更新边栏菜单
      $scope.asideMenusEvent();
    });

    // 当权限数据初始化完毕时
    $scope.$on('permissionsChanged', function () {

      // 更新边栏菜单
      $scope.asideMenusEvent();
    });
  }
]);
/**
* IndexController Module
*
* Description
*/
angular.module('IndexController', ['PublicModel'])
.controller('IndexController', ['$rootScope', '$scope', '$state', '$stateParams', '$location', '$localStorage', '$modal', 'PublicModel', 'CommonProvider',
  function ($rootScope, $scope, $state, $stateParams, $location, $localStorage, $modal, PublicModel, CommonProvider) {

    $scope.dashboardAction = {

      // 缓存清理
      clearcache: function (params) {
        CommonProvider.promise({
          model: PublicModel,
          method: 'clearcache',
          params: params,
          success: function (_cache) {
            $modal.success({
              message: _cache.message
            });
          },
          error: function (_cache) {
            $modal.error({
              message: _cache.message
            });
          }
        });
      }

    };

  }
]);
/*
*
* MainController Module
*
* Description
*/

angular.module('MainController', ['angular.modal', 'AuthModel', 'CommonModel', 'cfp.loadingBar'])
.controller('MainController', ['$rootScope', '$scope', '$state', '$stateParams', '$location', '$localStorage', '$modal', 'appConfig', 'AuthModel', 'CommonModel', 'cfpLoadingBar', 'QuploadProvider', 'CommonProvider', 
  function($rootScope, $scope, $state, $stateParams, $location, $localStorage, $modal, appConfig, AuthModel, CommonModel, cfpLoadingBar, QuploadProvider, CommonProvider) {

    // 初始化
    $rootScope.config = appConfig;

    // 路由发生变化时，title更新，监听布局的更新变化
    $scope.$on('$stateChangeSuccess', function () {
      $rootScope.title = $state.current.data.title || 'Wind - Admin';
      $rootScope.full = $state.current.data.full || false;
    });

    // 弹窗模块
    $rootScope.modal = {

      // 弹窗确认
      submit: function () {
        $modal.confirmSubmit();
      },

      // 弹窗取消
      cancel: function () {
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
      close: function () {
        $modal.closeCallback();
      },

      // 错误弹窗
      error: function (config) {
        $modal.error({
          message: config.message || 'error'
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
    };

    // 监听加载状态
    $rootScope.$on('cfpLoadingBar:loading', function(event, data) {
      // $rootScope.modal.loading();
    });

    // 监听加载完成状态
    $rootScope.$on('cfpLoadingBar:completed', function(event, data) {
      // $rootScope.modal.closeLoading();
    });

    // 地址栏路由拦截
    $rootScope.routeCheck = function () {
      if ($rootScope.routes && $rootScope.routes.indexOf($state.current.name) == -1) {
        $location.path('/index');
      }
    };

    // 全局路由监听（若跳转到无权访问的路由，则拦截至首页）
    $rootScope.$on('$stateChangeStart', function (event, toState, toParams, fromState, fromParams) {
      if (toState.name == 'login' || toState.name == 'forgot' || toState.name == 'register') return;
      if (!!$rootScope.routes && $rootScope.routes.indexOf(toState.name) == -1) {
        $location.path('/index');
      }
    });

    // 七牛文件上传方法绑定
    $rootScope.getThumbnail = QuploadProvider.getThumbnail;
    $rootScope.getStatic = QuploadProvider.getStatic;

    // 获取系统配置项
    // 请求配置信息
    $rootScope.getConfig = function (params) {
      var get_config = {};
      if (params.group) {
        get_config = {
          role: 'admin',
          is_front: 1,
          per_page: 100,
          parge: 1,
          group: params.group
        };
      };
      if (params.name) {
        get_config.name = params.name;
      };
      if (!get_config.name && !get_config.group) {
        return false;
      }

      CommonProvider.promise({
        model: CommonModel,
        method: get_config.name ? 'configByName' : 'config',
        params: get_config,
        success: function (config) {
          if (params.success) {
            params.success(config);
          }
        }
      });
    };

  }
]);
/**
* NoteController Module
*
* Description
*/
angular.module('NoteController', ['NoteModel', 'NoteService'])
.controller('NoteController', ['$scope', '$rootScope', '$state', '$stateParams', '$modal', 'NoteModel', 'NoteService', 'CommonProvider', function($scope, $rootScope, $state, $stateParams, $modal, NoteModel, NoteService, CommonProvider) {

    /*----------------笔记管理事件----------------*/
    $scope.filter = {};
    $scope.params = {};
    $scope.search = {};
    $scope.note_list = {};

    $scope.noteAction = {

      // 笔记管理首页
      getIndex: function (page) {
        var _self = this;
        // 获取课程列表
        $scope.params = {
          role: 'admin',
          page: page || 1,
        };
        _self.getLists($scope.params);
      },

      // 获取列表数据
      getLists: function (params) {
        CommonProvider.promise({
          model: NoteModel,
          method: 'get',
          params: params,
          success: function (note_list) {
            $scope.note_list = note_list;
          }
        });
      },

      // 笔记搜索
      getSearch: function () {
        var params = [{
          field: 'content',
          operation: 'like',
          value: $scope.search.keyword
        }];
        CommonProvider.search({
          service: new NoteService(),
          method: 'search',
          params: params,
          success: function (_note_list) {
            $scope.note_list = _note_list;
          }
        });
      },

      // 获取笔记详情
      getItem: function () {
        CommonProvider.promise({
          model: NoteModel,
          method: 'item',
          params: { note_id: $stateParams.note_id },
          success: function (note_item) {
            $scope.note = note_item.result;
          }
        });
      },

      // 笔记详情
      item: function (params) {
        if (params.modal) {
          $rootScope.note_item = angular.copy(params.note.note);
          $modal.custom({
            title: '笔记详情',
            template_url: '/partials/admin/article/note/item.html',
            callback: function () {
              delete $rootScope.note_item;
            }
          });
        } else {
          $rootScope.modal.close();
        }
      },

      // 编辑笔记
      edit: function (params) {
        if (params.modal) {
          $rootScope.note_local = params.note;
          $rootScope.note_edit  = angular.copy(params.note.note);
          $modal.custom({
            title: '编辑分类',
            template_url: '/partials/admin/article/note/edit.html',
            callback: function () {
              delete $rootScope.note_edit;
            }
          });
        } else {
          CommonProvider.promise({
            model: NoteModel,
            method: 'put',
            params: { body: $scope.note, id: $scope.note.id },
            success: function (_note) {
              $rootScope.note_local.$parent.note = _note.result;
              $rootScope.modal.close();
              $modal.success({
                message: _note.message,
                callback: function () {
                  delete $rootScope.note_local;
                }
              });
            },
            error: function (_note) {
              $modal.error({
                message: _note.message
              });
            }
          });
        }
      },

      // 删除笔记
      del: function (params) {
        if (params.batch && $scope.note_list.result.checked().length == 0) {
          $modal.error({ message: '至少需要选中一篇笔记' });
          return false;
        };
        $modal.confirm({
          title: '确认删除',
          message: params.batch ? '确定要删除选中笔记吗？' : '确定要删除此笔记吗？',
          info: '笔记删除后可在笔记回收站中查看',
          onsubmit: function () {
            CommonProvider.promise({
              model: NoteModel,
              method: params.batch ? 'delete' : 'del',
              params: params.batch ? $scope.note_list.result.checked() : params.note,
              success: function (_note) {
                $modal.success({
                  message: _note.message
                });
              },
              error: function (_note) {
                $modal.error({
                  message: _note.message
                });
              }
            });
          }
        });
      },

    };
  }
]);
/**
* OrganizationController Module
*
* Description
*/
angular.module('OrganizationController', ['angular.validation', 'angular.validation.rule', 'OrganizationModel', 'CategoryModel', 'OrganizationService'])
.controller('OrganizationController', ['$scope', '$rootScope', '$state', '$stateParams', '$modal', '$location', 'OrganizationModel', 'CategoryModel', 'OrganizationService', 'CommonProvider', function($scope, $rootScope, $state, $stateParams, $modal, $location, OrganizationModel, CategoryModel, OrganizationService, CommonProvider) {

    /*----------------学校/机构管理事件----------------*/

    $scope.filter = {};
    $scope.params = {};
    $scope.search = {};
    $scope.organization_list = {};
    $scope.organization_user_list = {};

    $scope.organizationAction = {

      // 学校管理首页
      getIndex: function (page) {
        var _self = this;
        $scope.params = {
          role: 'admin',
          page: page || 1,
        };
        // 获取学校列表
        _self.getLists($scope.params);
        // 获取学校分类
        _self.getCategory({
          role: 'admin',
          type: 2,
        });
      },

      // 获取学校列表
      getLists: function (params) {
        CommonProvider.promise({
          model: OrganizationModel,
          method: 'get',
          params: params,
          success: function (organization_list) {
            $scope.organization_list = organization_list;
          }
        });
      },

      // 获取学校分类列表
      getCategory: function () {
        var params = {
          role: 'admin',
          type: 2
        };
        CommonProvider.promise({
          model: CategoryModel,
          method: 'get',
          params: params,
          success: function (category_list) {
            $scope.category_list = category_list.result;
          }
        });
      },

      // 学校状态、分类筛选
      filterChanged: function (option) {
        var _self = this;
        var status = '';
        var category_id = '';
        // 状态筛选
        if(option == 'status') {
          status = $scope.filter.status;
          !status ? delete $scope.params.status : $scope.params.status = status;
        }
        // 分类筛选
        if(option == 'category') {
          category_id = $scope.filter.category_id;
          !category_id ? delete $scope.params.category_id : $scope.params.category_id = category_id;
        }
        _self.getLists($scope.params);
      },

      // 学校搜索
      getSearch: function () {
        var params = [{
          field: 'name',
          operation: 'like',
          value: $scope.search.keyword
        }, {
          field: 'introduction',
          operation: 'like',
          value: $scope.search.keyword
        }];
        CommonProvider.search({
          service: new OrganizationService(),
          method: 'search',
          params: params,
          success: function (_organization_list) {
            $scope.organization_list = _organization_list;
          }
        });
      },

      // 获取学校详情
      getItem: function () {
        CommonProvider.promise({
          model: OrganizationModel,
          method: 'item',
          params: { organization_id: $stateParams.organization_id },
          success: function (organization_item) {
            $scope.organization = organization_item.result;
          }
        });
      },

      // 新增学校
      add: function () {        
        CommonProvider.promise({
          model: OrganizationModel,
          method: 'add',
          params: $scope.organization,
          success: function (_organization) {
            $modal.success({
              message: _organization.message,
              callback: function () {
                $location.path('/organization/manage/list/index');
              }
            });
          },
          error: function (_organization) {
            $modal.error({
              message: _organization.message
            });
          }
        });
      },

      // 编辑学校
      edit: function (params) {
        $scope.organization.role = 'admin';
        CommonProvider.promise({
          model: OrganizationModel,
          method: 'put',
          params: { new: $scope.organization },
          success: function (_organization) {
            $modal.success({
              message: _organization.message,
              callback: function () {
                $location.path('/organization/manage/list/index');
              }
            });
          },
          error: function (_organization) {
            $modal.error({
              message: _organization.message
            });
          }
        });
      },

      // 上传结果回调函数
      getUploadLogo: function (data) {
        if (data) {
          $scope.organization.logo = data.key;
        }
      },

      getUploadScenery: function (data) {
        if (data) {
          $scope.organization.scenery = data.key;
        }
      },

      // 删除学校
      del: function (params) {
        if (params.batch && $scope.organization_list.result.checked().length == 0) {
          $modal.error({ message: '至少需要选中一所学校' });
          return false;
        };
        $modal.confirm({
          title: '确认删除',
          message: params.batch ? '确定要删除选中学校吗？' : '确定要删除此学校吗？',
          info: '学校删除操作不可撤销',
          onsubmit: function () {
            CommonProvider.promise({
              model: OrganizationModel,
              method: params.batch ? 'delete' : 'del',
              params: params.batch ? $scope.organization_list.result.checked() : params.organization,
              success: function (_organization) {
                $modal.success({
                  message: _organization.message
                });
              },
              error: function (_organization) {
                $modal.error({
                  message: _organization.message
                });
              }
            });
          }
        });
      },

      // 审核学校
      audit: function (params) {
        if (params.modal) {
          $rootScope.organization_local = params.organization;
          $rootScope.organization_edit  = angular.copy(params.organization.organization);
          $modal.custom({
            title: '学校审核',
            template_url: '/partials/admin/organization/manage/audit.html',
            callback: function () {
              delete $rootScope.organization_edit;
            }
          });
        } else {
          $scope.organization.role = 'admin';
          CommonProvider.promise({
          model: OrganizationModel,
          method: 'put',
          params: { new: $scope.organization, old: $rootScope.organization_local },
          success: function (_organization) {
            $rootScope.modal.close();
            $modal.success({
              message: _organization.message,
              callback: function () {
                delete $rootScope.organization_local;
              }
            });
          },
          error: function (_organization) {
            $modal.error({
              message: _organization.message
            });
          }
        });
        }
      }
    };

    $scope.organizationUserAction = {

      // 老师管理首页
      getIndex: function () {
        $scope.organizationUserAction.getLists();
        $scope.organizationAction.getLists({
          per_page: 1000,
          role: 'admin'
        });
      },

      // 过滤条件变更
      filterChanged: function () {
        $scope.organizationUserAction.getLists();
      },

      // 获取老师列表
      getLists: function (page) {

        var get_params = {
          organization_role: 'admin',
          role: 'admin',
          page: page || 1,
        };

        var filters = $scope.filter;
        for (var key in filters) {
          if (filters[key] != 'all' && !!filters[key]) get_params[key] = filters[key];
        };

        // console.log(get_params);

        CommonProvider.promise({
          model: OrganizationModel,
          method: 'relation',
          params: get_params,
          success: function (_organization_user_list) {
            $scope.organization_user_list = _organization_user_list;
          }
        });
      },

      // 老师详情
      getItem: function () {
        CommonProvider.promise({
          model: OrganizationModel,
          method: 'itemRelation',
          params: { relation_id: $stateParams.organization_user_id, role: 'admin' },
          success: function (_organization_item) {
            // console.log(_organization_item);
            $scope.organization_user = _organization_item.result;
            $scope.organization_user.status = $scope.organization_user.status.toString();
          }
        });
      },

      // 删除老师
      del: function (params) {
        if (params.organization_user) {
          var relation_user = params.organization_user.organization_user;
          relation_user.relation_id = relation_user.id;
          relation_user.role = 'admin';
          $modal.confirm({
            title: '确认删除',
            message: '确定要删除此老师吗？',
            info: '老师删除后可在回收站中查看',
            onsubmit: function () {
              CommonProvider.promise({
                model: OrganizationModel,
                method: 'delRelation',
                params: relation_user,
                success: function (_organization_user) {
                  $modal.success({
                    message: _organization_user.message
                  });
                },
                error: function (_organization_user) {
                  $modal.error({
                    message: _organization_user.message
                  });
                }
              });
            }
          });
        } 
      },

      // 修改老师关系
      putItem: function () {
        var organization_user = {
          id: $scope.organization_user.id,
          body: {
            title: $scope.organization_user.title,
            introduction: $scope.organization_user.introduction,
            status: $scope.organization_user.status,
            memo: $scope.organization_user.memo
          },
          organization_role: 'admin',
          role: 'admin'
        };
        // console.log(organization_user);
        CommonProvider.promise({
          model: OrganizationModel,
          method: 'putRelation',
          params: organization_user,
          success: function (_organization_user) {
            $modal.success({ message: _organization_user.message});
            // $location.path('/organization/manage/organization_user/list');
          },
          error: function (_err) {
            $modal.error({ message: _err.message });
          }
        });
      },

      // 增加老师弹窗
      addTeacher: function () {
        $modal.custom({
          title: '增加老师',
          template_url: '/partials/admin/organization/organization_user/add.html',
          callback: function () {
            // delete $rootScope.announcement_item;
          }
        });
      },

      // 增加老师关系
      addItem: function () {
        var organization_user = {
          type: '',
          body: {
            title: $scope.organization_user.title,
            introduction: $scope.organization_user.introduction,
            status: $scope.organization_user.status,
            memo: $scope.organization_user.memo
          },
          organization_role: 'admin',
          role: 'admin'
        };
        console.log(organization_user);
        CommonProvider.promise({
          model: OrganizationModel,
          method: 'addRelation',
          params: organization_user,
          success: function (_organization_user) {
            $modal.success({ message: _organization_user.message});
            // $location.path('/organization/manage/organization_user/list');
          },
          error: function (_err) {
            $modal.error({ message: _err.message });
          }
        });
      },

    };
  }
]);
/**
* PaymentController Module
*
* Description
*/
angular.module('PaymentController', ['PaymentModel'])
.controller('PaymentController', ['$scope', '$rootScope', '$state', '$stateParams', '$modal', 'PaymentModel', 'CommonProvider', function($scope, $rootScope, $state, $stateParams, $modal, PaymentModel, CommonProvider) {

    /*----------------收款单管理事件----------------*/
    $scope.payment = {};
    $scope.payment_list = {};
    $scope.filter = {
      pay_type: 'all',
      pay_status: 'all'
    };

    $scope.paymentAction = {

      // 收款单管理首页
      getIndex: function () {
        $scope.paymentAction.getLists();
      },

      // 过滤条件变更
      filterChanged: function () {
        $scope.paymentAction.getLists();
      },

      // 获取列表数据
      getLists: function(page) {

        var get_params = {
          page: page || 1,
        };

        var filters = $scope.filter;
        for (var key in filters) {
          if (filters[key] != 'all' && !!filters[key]) get_params[key] = filters[key];
        };

        // console.log(get_params);

        CommonProvider.promise({
          model: PaymentModel,
          method: 'get',
          params: get_params,
          success: function (payment_list) {
            $scope.payment_list = payment_list;
          }
        });
      },

      // 获取收款单详情
      getItem: function () {
        CommonProvider.promise({
          model: PaymentModel,
          method: 'item',
          params: { payment_id: $stateParams.payment_id },
          success: function (payment_item) {
            $scope.payment = payment_item.result;
          }
        });
      },

      // 删除收款单
      del: function (params) {
        if (params.batch && $scope.payment_list.result.checked().length == 0) {
          $modal.error({ message: '至少需要选中一个收款单' });
          return false;
        };
        $modal.confirm({
          title: '确认删除',
          message: params.batch ? '确定要删除选中收款单吗？' : '确定要删除此收款单吗？',
          info: '收款单删除后可在收款单回收站中查看',
          onsubmit: function () {
            CommonProvider.promise({
              model: PaymentModel,
              method: params.batch ? 'delete' : 'del',
              params: params.batch ? $scope.payment_list.result.checked() : params.payment,
              success: function (_payment) {
                $modal.success({
                  message: _payment.message
                });
              },
              error: function (_payment) {
                $modal.error({
                  message: _payment.message
                });
              }
            });
          }
        });
      },
    };
  }
]);
/**
* QuestionController Module
*
* Description
*/
angular.module('QuestionController', ['QuestionModel', 'QuestionService'])
.controller('QuestionController', ['$scope', '$rootScope', '$state', '$stateParams', '$modal', 'QuestionModel', 'QuestionService', 'CommonProvider', function($scope, $rootScope, $state, $stateParams, $modal, QuestionModel, QuestionService, CommonProvider) {

    /*----------------问答管理事件----------------*/
    $scope.filter = {};
    $scope.params = {};
    $scope.search = {};
    $scope.question_list = {};

    $scope.questionAction = {

      // 问答管理首页
      getIndex: function (page) {
        var _self = this;
        // 获取课程列表
        $scope.params = {
          role: 'admin',
          page: page || 1,
        };
        _self.getLists($scope.params);
      },

      // 获取列表数据
      getLists: function(params) {
        CommonProvider.promise({
          model: QuestionModel,
          method: 'get',
          params: params,
          success: function (question_list) {
            $scope.question_list = question_list;
          }
        });
      },

      // 问答搜索
      getSearch: function () {
        var params = [{
          field: 'content',
          operation: 'like',
          value: $scope.search.keyword
        }];
        CommonProvider.search({
          service: new QuestionService(),
          method: 'search',
          params: params,
          success: function (_question_list) {
            $scope.question_list = _question_list;
          }
        });
      },

      // 获取问答详情
      getItem: function () {
        CommonProvider.promise({
          model: QuestionModel,
          method: 'item',
          params: { question_id: $stateParams.question_id },
          success: function (question_item) {
            $scope.question = question_item.result;
          }
        });
      },

      // 问答详情
      item: function (params) {
        if (params.modal) {
          $rootScope.question_item = angular.copy(params.question.question);
          $modal.custom({
            title: '问答详情',
            template_url: '/partials/admin/article/question/item.html',
            callback: function () {
              delete $rootScope.question_item;
            }
          });
        } else {
          $rootScope.modal.close();
        }
      },

      // 编辑问答
      edit: function (params) {
        if (params.modal) {
          $rootScope.question_local = params.question;
          $rootScope.question_edit  = angular.copy(params.question.question);
          $modal.custom({
            title: '编辑问答',
            template_url: '/partials/admin/article/question/edit.html',
            callback: function () {
              delete $rootScope.question_edit;
            }
          });
        } else {
          CommonProvider.promise({
            model: QuestionModel,
            method: 'put',
            params: { body: $scope.question, id: $scope.question.id },
            success: function (_question) {
              $rootScope.question_local.$parent.question = _question.result;
              $rootScope.modal.close();
              $modal.success({
                message: _question.message,
                callback: function () {
                  delete $rootScope.question_local;
                }
              });
            },
            error: function (_question) {
              $modal.error({
                message: _question.message
              });
            }
          });
        }
      },

      // 删除问答
      del: function (params) {
        if (params.batch && $scope.question_list.result.checked().length == 0) {
          $modal.error({ message: '至少需要选中一篇问答' });
          return false;
        };
        $modal.confirm({
          title: '确认删除',
          message: params.batch ? '确定要删除选中问答吗？' : '确定要删除此问答吗？',
          info: '问答删除后可在问答回收站中查看',
          onsubmit: function () {
            CommonProvider.promise({
              model: QuestionModel,
              method: params.batch ? 'delete' : 'del',
              params: params.batch ? $scope.question_list.result.checked() : params.question,
              success: function (_question) {
                $modal.success({
                  message: _question.message
                });
              },
              error: function (_question) {
                $modal.error({
                  message: _question.message
                });
              }
            });
          }
        });
      },

    };
  }
]);
/**
* SectionController Module
*
* Description
*/
angular.module('SectionController', ['SectionModel'])
.controller('SectionController', ['$scope', '$rootScope', '$modal', '$state', '$stateParams', 'SectionModel', 'CommonProvider', function($scope, $rootScope, $modal, $state, $stateParams, SectionModel, CommonProvider) {

    $scope.filter = {
      status: 'all',
      is_free: 'all',
      is_live: 'all',
      live_status: 'all',
      order_field: 'all'
    };

    /*----------------章节管理事件----------------*/
    $scope.sectionAction = {

      // 过滤条件改变
      filterChanged: function () {
        if($scope.filter.is_live == 'all') {
          $scope.filter.status = 'all';
          $scope.filter.live_status = 'all';
        };
        if ($scope.filter.is_live == '1') $scope.filter.status = 'all';
        if ($scope.filter.is_live == '0') $scope.filter.live_status = 'all';
        $scope.sectionAction.getLists();
      },

      // 获取章节列表
      getLists: function(page) {
        var get_params = {
          role: 'admin',
          out_type: 'paginate',
          page: page || 1,
          per_page: 16,
          order_method: 'desc'
        };

        var filters = $scope.filter;
        for (var key in filters){
          if (filters[key] != 'all') {
            get_params[key] = filters[key];
          }
        };

        // return console.log(get_params);
        CommonProvider.promise({
          model: SectionModel,
          method: 'get',
          params: get_params,
          success: function (section_list) {
            // console.log(section_list);
            $scope.section_list = section_list;
          }
        });
      },

      // 视频预览
      preview: function (section_id) {
        var params = {
          role: 'admin',
          section_id: section_id
        };
        // 获取视频地址
        CommonProvider.promise({
          model: SectionModel,
          method: 'getVideos',
          params: params,
          success: function (videos) {
            var video = videos.result;
            var player = {};
            player.modal = 1;
            player.urls = video.urls;
            player.is_live = video.is_live;
            player.live_status = video.live_status;
            $rootScope.player = player;
            $modal.custom({
              title: '章节预览',
              template: '<style>.modal-body{overflow:hidden;}.video-player .video-js{width:100%;height:320px;}</style>' + 
                        '<div video-player data="$root.player"></div>',
              callback: function () {
                $rootScope.player = null;
                delete $rootScope.player;
              }
            });
          },
          error: function (err) {
            $rootScope.modal.error({ message: err.message });
          }
        });
      },

      // 直播信息审核
      liveAudit: function (params) {
        var section = params.section;
        var ismodel = params.ismodel;
        if (ismodel) {
          section.live = {};
          section.live.duration = {};
          section.live.duration.hours = parseInt(section.live_duration / 60);
          section.live.duration.moments = parseInt(section.live_duration % 60);
          $rootScope.section_edit = section;
          $modal.custom({
            title: '《' + section.name + '》 - 直播信息预览',
            template_url: 'partials/admin/course/manage/section/live.html'
          });
        } else {
          var isaudit = params.audit.pass;
          var remark  = params.audit.remark;
          section.live_status = isaudit ? 1 : -1;
          section.role = 'admin';
          if (!isaudit) section.remark = remark;
          CommonProvider.promise({
            model: SectionModel,
            method: 'put',
            params: section,
            success: function (_section) {
              $rootScope.modal.close();
              $modal.success({ message: '操作成功' });
            },
            error: function (_section) {
              $rootScope.modal.close();
              $modal.error({ message: _section.message });
            },
            callback: function () {
              $rootScope.section_edit = null;
            }
          });

        }
      },

      // 批量删除章节
      del: function (params) {
        var isbatch = params.batch;
        var checked = $scope.section_list.result.checked();
        if (isbatch && checked.length == 0) {
          return $modal.error({ message: '至少需要选中一门章节' });
        };
        $modal.confirm({
          title: '确认删除',
          message: isbatch ? '确定要删除选中章节吗？' : '确定要删除此章节吗？',
          info: '章节删除操作不可撤销',
          onsubmit: function () {
            // console.log(SectionModel);
            CommonProvider.promise({
              model: SectionModel,
              method: isbatch ? 'delete' : 'del',
              params: isbatch ? checked : { section_id: params.section.id },
              success: function (_section) {
                isbatch || $scope.section_list.result.remove(params.section);
                isbatch && $scope.sectionAction.getLists($scope.section_list.pagination.current_page);
                $modal.success({ message: _section.message });
              },
              error: function (_section) {
                $modal.error({ message: _section.message });
              }
            });
          }
        });
      },

      // 录播视频审核
      audit: function (params) {
        $rootScope.section_local = params.section.section;
        $scope.section = angular.copy(params.section.section);
        $scope.section.status = 3;
        $scope.section.role = 'admin';
        $modal.confirm({
          title: '确认操作',
          message: '确定要审核通过该视频吗？',
          info: '本操作不可恢复',
          onsubmit: function () {
            CommonProvider.promise({
              model: SectionModel,
              method: 'put',
              params: $scope.section,
              success: function (_section) {
                $modal.success({
                  message: _section.message,
                });
                $rootScope.section_local.status = 3;
                delete $rootScope.section_local;
              },
              error: function (_section) {
                $modal.error({
                  message: _section.message,
                });
              }
            });
          }
        });
      },

      // 录播拒绝审核
      auditRefuse: function (params) {
        var section = params.section;
        var ismodel = params.ismodel;
        if (ismodel) {
          $rootScope.section_edit = section;
          $modal.custom({
            title: '《' + section.name + '》 - 拒绝审核',
            template_url: 'partials/admin/course/manage/section/video.html',
            callback: function () {
              $rootScope.section_edit = null;
              delete $rootScope.section_edit;
            }
          });
        } else {
          // console.log(params);
          var section = angular.copy($rootScope.section_edit);
          section.status = -3;
          section.role = 'admin';
          section.remark = params.remark;
          CommonProvider.promise({
            model: SectionModel,
            method: 'put',
            params: section,
            success: function (_section) {
              $rootScope.section_edit.status = -3;
              $rootScope.section_edit.remark = section.remark;
              $rootScope.modal.close();
              $modal.success({ message: _section.message });
            },
            error: function (_section) {
              $rootScope.modal.close();
              $modal.error({
                message: _section.message,
              });
            }
          });
        }
      },

    };
  }
]);
/**
* SmsController Module
*
* Description
*/
angular.module('SmsController', ['SmsModel', 'SmsService'])
.controller('SmsController', ['$scope', '$rootScope', '$state', '$stateParams', '$modal', 'SmsModel', 'SmsService', 'CommonProvider', function($scope, $rootScope, $state, $stateParams, $modal, SmsModel, SmsService, CommonProvider) {

    /*----------------短信管理事件----------------*/
    $scope.filter = {};
    $scope.params = {};
    $scope.search = {};
    $scope.sms_list = {};

    $scope.smsAction = {

      // 短信管理首页
      getIndex: function (page) {
        var _self = this;
        // 获取课程列表
        $scope.params = {
          role: 'admin',
          page: page || 1,
        };
        _self.getLists($scope.params);
      },

      // 获取列表数据
      getLists: function (params) {
        CommonProvider.promise({
          model: SmsModel,
          method: 'get',
          params: params,
          success: function (_sms_list) {
            $scope.sms_list = _sms_list;
          }
        });
      },

      // 获取短信详情
      getItem: function () {
        CommonProvider.promise({
          model: SmsModel,
          method: 'item',
          params: { sms_id: $stateParams.sms_id },
          success: function (sms_item) {
            $scope.sms = sms_item.result;
          }
        });
      },

      // 短信详情
      item: function (params) {
        if (params.modal) {
          $rootScope.sms_item = angular.copy(params.sms.sms);
          $modal.custom({
            title: '短信详情',
            template_url: '/partials/admin/article/sms/item.html',
            callback: function () {
              delete $rootScope.sms_item;
            }
          });
        } else {
          $rootScope.modal.close();
        }
      },

      // 删除短信
      del: function (params) {
        if (params.batch && $scope.sms_list.result.checked().length == 0) {
          $modal.error({ message: '至少需要选中一篇短信' });
          return false;
        };
        $modal.confirm({
          title: '确认删除',
          message: params.batch ? '确定要删除选中短信吗？' : '确定要删除此短信吗？',
          info: '短信删除后可在短信回收站中查看',
          onsubmit: function () {
            CommonProvider.promise({
              model: SmsModel,
              method: params.batch ? 'delete' : 'del',
              params: params.batch ? $scope.sms_list.result.checked() : params.sms,
              success: function (_sms) {
                $modal.success({
                  message: _sms.message
                });
              },
              error: function (_sms) {
                $modal.error({
                  message: _sms.message
                });
              }
            });
          }
        });
      },

    };
  }
]);
/**
* TradeController Module
*
* Description
*/
angular.module('TradeController', ['TradeModel', 'TradeService'])
.controller('TradeController', ['$scope', '$rootScope', '$state', '$stateParams', '$modal', 'TradeModel', 'TradeService', 'CommonProvider', function($scope, $rootScope, $state, $stateParams, $modal, TradeModel, TradeService, CommonProvider) {

    /*----------------订单管理事件----------------*/
    $scope.filter = {};
    $scope.params = {};
    $scope.search = {};
    $scope.trade_list = {};

    $scope.tradeAction = {

      // 订单管理首页
      getIndex: function (page) {
        var _self = this;
        // 获取课程列表
        $scope.params = {
          role: 'admin',
          page: page || 1,
        };
        _self.getLists($scope.params);
      },

      // 获取列表数据
      getLists: function(params) {
        CommonProvider.promise({
          model: TradeModel,
          method: 'get',
          params: params,
          success: function (trade_list) {
            $scope.trade_list = trade_list;
          }
        });
      },

      // 获取订单详情
      getItem: function () {
        CommonProvider.promise({
          model: TradeModel,
          method: 'item',
          params: { trade_id: $stateParams.trade_id },
          success: function (trade_item) {
            $scope.trade = trade_item.result;
          }
        });
      },

      // 订单不同状态筛选
      filterChanged: function () {
        var _self = this;
        var status = $scope.filter.status;
        !status ? delete $scope.params.status : $scope.params.status = status;
        _self.getLists($scope.params);
      },

      // 订单搜索
      getSearch: function () {
        var params = [{
          field: 'num',
          operation: 'like',
          value: $scope.search.keyword
        }];
        CommonProvider.search({
          service: new TradeService(),
          method: 'search',
          params: params,
          success: function (_trade_list) {
            $scope.trade_list = _trade_list;
          }
        });
      },

      // 删除订单
      del: function (params) {
        if (params.batch && $scope.trade_list.result.checked().length == 0) {
          $modal.error({ message: '至少需要选中一个订单' });
          return false;
        };        
        $modal.confirm({
          title: '确认删除',
          message: params.batch ? '确定要删除选中订单吗？' : '确定要删除此订单吗？',
          info: '订单删除后可在订单回收站中查看',
          onsubmit: function () {
            CommonProvider.promise({
              model: TradeModel,
              method: params.batch ? 'delete' : 'del',
              params: params.batch ? $scope.trade_list.result.checked() : params.trade,
              success: function (_trade) {
                $modal.success({
                  message: _trade.message
                });
              },
              error: function (_trade) {
                $modal.error({
                  message: _trade.message
                });
              }
            });
          }
        });
      },

      // 订单回收站
      getRecycle: function (page) {
        var _self = this;
        // 获取课程列表
        var params_recycle = {
          role: 'admin',
          x_status: 0,
          page: page || 1,
        };
        _self.getLists(params_recycle);
      },
    };
  }
]);
/**
* UserController Module
*
* Description
*
*/
angular.module('UserController', ['angular.validation', 'angular.validation.rule', 'UserModel', 'angular-sortable-view', 'UserService'])
.controller('UserController', ['$scope', '$rootScope', '$state', '$stateParams', '$modal', '$location', 'UserModel', 'RoleModel', 'PermissionModel', 'GrantApiModel', 'UserService', 'CommonProvider', 'PermissionProvider', function ($scope, $rootScope, $state, $stateParams, $modal, $location, UserModel, RoleModel, PermissionModel, GrantApiModel, UserService, CommonProvider, PermissionProvider) {

    /*----------------用户管理事件----------------*/
    $scope.filter = {};
    $scope.params = {};
    $scope.search = {};

    $scope.userAction = {

      // 获取用户首页
      getIndex: function (page) {
        var _self = this;
        $scope.params = {
          page: page || 1,
          per_page: 20,
          // role: 'admin',
        };
        // 获取课程列表
        _self.getLists($scope.params);
      },

      // 获取列表
      getLists: function (params) {
        // 获取用户列表
        CommonProvider.promise({
          model: UserModel,
          method: 'get',
          params: params,
          success: function (_user_list) {
            $scope.user_list = _user_list;
          }
        });

        // 获取角色列表
        if (!$rootScope.role_list) {
          CommonProvider.promise({
            model: RoleModel,
            method: 'get',
            params: { per_page: 100 },
            success: function (role_list) {
              $rootScope.role_list = role_list;
            }
          });
        }
      },

      // 用户不同角色筛选
      filterChanged: function () {
        var _self = this;
        var status = $scope.filter.status;
        !status ? delete $scope.params.status : $scope.params.status = status;
        _self.getLists($scope.params);
      },

      // 用户搜索
      getSearch: function () {
        var params = [{
          field: 'name',
          operation: 'like',
          value: $scope.search.keyword
        }, {
          field: 'id',
          operation: 'like',
          value: $scope.search.keyword
        }];
        CommonProvider.search({
          service: new UserService(),
          method: 'search',
          params: params,
          success: function (_user_list) {
            $scope.user_list = _user_list;
          }
        });
      },

      // 用户详情
      getItem: function () {
        CommonProvider.promise({
          model: UserModel,
          method: 'item',
          params: { user_id: $stateParams.user_id },
          success: function (user_item) {
            $scope.user = user_item.result;
          }
        });
      },

      // 创建用户
      add: function (params) {
        if (params.modal) {
          $modal.custom({
            title: '创建用户',
            template_url: '/partials/admin/user/manage/add.html'
          });
        } else {
          CommonProvider.promise({
            model: UserModel,
            method: 'add',
            params: $scope.user,
            success: function (_user) {
              CommonProvider.promise({
                model: UserModel,
                method: 'role',
                params: { user: _user.result, ids: $rootScope.role_list.result.checked(), add: true },
                success: function (_user) {
                  $rootScope.modal.close();
                  $modal.error({
                    message: _user.message
                  });
                },
                error: function (_user) {
                  $modal.error({
                    message: _user.message
                  });
                }
              });
            },
            error: function (_user) {
              $modal.error({ message: _user.message });
            }
          });
        }
      },

      // 编辑用户
      put: function (params) {
        if (params.modal) {
          $rootScope.user_local = params.user;
          $rootScope.user_edit  = angular.copy(params.user.user);
          $modal.custom({
            title: '编辑用户',
            template_url: '/partials/admin/user/manage/edit.html',
            callback: function () {
              $rootScope.user_edit = null;
            }
          });
        } else {
          CommonProvider.promise({
            model: UserModel,
            method: 'put',
            params: { new: $scope.user, old: $rootScope.user_local },
            success: function (_user) {
              $rootScope.user_local = null;
              $rootScope.modal.close();
              $modal.success({
                message: _user.message
              });
            },
            error: function (_user) {
              $modal.error({
                message: _user.message
              });
            }
          });
          CommonProvider.promise({
            model: UserModel,
            method: 'role',
            params: { user: $rootScope.user_local, ids: $rootScope.role_list.result.checked() }
          });
        }
      },

      // 更新用户角色组
      role: function (user) {
        CommonProvider.promise({
          model: UserModel,
          method: 'role',
          params: user,
          success: function (_user) {
            console.log(_user);
          }
        });
      },

      // （批量）删除用户
      del: function (params) {
        if (params.batch && $scope.user_list.result.checked().length == 0) {
          $modal.error({ message: '至少需要选中一个用户' });
          return false;
        };
        $modal.confirm({
          title: '确认删除',
          message: params.batch ? '确定要删除选中用户吗？' : '确定要删除此用户吗？',
          info: '用户删除操作不可撤销',
          onsubmit: function () {
            CommonProvider.promise({
              model: UserModel,
              method: params.batch ? 'delete' : 'del',
              params: params.batch ? $scope.user_list.result.checked() : params.user,
              success: function (_user) {
                $modal.success({
                  message: _user.message
                });
              },
              error: function (_user) {
                $modal.error({
                  message: _user.message
                });
              }
            });
          }
        });
      },

      // （批量）禁用用户
      disable: function (params) {
        if (params.batch && $scope.user_list.result.checked().length == 0) {
          $modal.error({ message: '至少需要选中一个用户' });
          return false;
        };
        $modal.confirm({
          title: '确认操作',
          message: params.batch ? '确定要禁用选中用户吗？' : '确定要禁用此用户吗？',
          info: params.batch ? '禁用后这些用户将不再可以登录及操作' : '禁用后该用户将不再可以登录及操作',
          onsubmit: function () {
            CommonProvider.promise({
              model: UserModel,
              method: 'disable',
              params: params.batch ? $scope.user_list.result.checked() : params.user,
              success: function (_user) {
                $modal.success({
                  message: _user.message
                });
              },
              error: function (_user) {
                $modal.error({
                  message: _user.message
                });
              }
            });
          }
        });
      },

      // (批量)启用用户
      enable: function (params) {
        if (params.batch && $scope.user_list.result.checked().length == 0) {
          $modal.error({ message: '至少需要选中一个用户' });
          return false;
        };
        $modal.confirm({
          title: '确认操作',
          message: params.batch ? '确定要启用选中用户吗？' : '确定要启用此用户吗？',
          info: params.batch ? '启用后选中用户将恢复正常操作权限' : '启用后该用户将恢复正常操作权限',
          onsubmit: function () {
            CommonProvider.promise({
              model: UserModel,
              method: 'enable',
              params: params.batch ? $scope.user_list.result.checked() : params.user,
              success: function (_user) {
                $modal.success({
                  message: _user.message
                });
              },
              error: function (_user) {
                $modal.error({
                  message: _user.message
                });
              }
            });
          }
        });
      },

      // 导入CSV
      csv: function () {
        $modal.custom({
          title: 'CSV',
          template: '<div class="text-center"><h1>来来来，CSV Import!</h1></div>'
        });
      }
    };

    /*----------------角色管理----------------*/

    $scope.roleAction = {

      // 请求角色列表
      getLists: function (page) {
        $rootScope.role_list = null;
        // 获取角色列表
        CommonProvider.promise({
          model: RoleModel,
          method: 'get',
          params: { page: page || 1 },
          success: function (_role_list) {
            $scope.role_list = _role_list;
          }
        });
      },

      // 添加角色
      add: function (params) {
        if (params.modal) {
          $modal.custom({
            title: '添加角色',
            template_url: '/partials/admin/user/role/add.html'
          });
        } else {
          CommonProvider.promise({
            model: RoleModel,
            method: 'add',
            params: $scope.role,
            success: function (_role) {
              $rootScope.modal.close();
              $modal.success({
                message: _role.message
              });
            },
            error: function (_role) {
              $rootScope.modal.close();
              $modal.error({
                message: _role.message
              });
            }
          });
        }
      },

      // 编辑角色
      edit: function (params) {
        if (params.modal) {
          $rootScope.role_local = params.role;
          $rootScope.role_edit  = angular.copy(params.role.role);
          $modal.custom({
            title: '编辑角色',
            template_url: '/partials/admin/user/role/edit.html',
            callback: function () {
              delete $rootScope.role_edit;
            }
          });
        } else {
          CommonProvider.promise({
            model: RoleModel,
            method: 'put',
            params: { new: $scope.role, old: $rootScope.role_local },
            success: function (_role) {
              $rootScope.role_local = null;
              $rootScope.modal.close();
              $modal.success({
                message: _role.message
              });
            },
            error: function (_role) {
              $rootScope.modal.close();
              $modal.error({
                message: _role.message
              });
            }
          });
        }
      },

      // （批量）删除角色
      del: function (params) {
        if (params.batch && $scope.role_list.result.checked().length == 0) {
          $modal.error({ message: '至少需要选中一个角色' });
          return false;
        };
        $modal.confirm({
          title: '确认删除',
          message: params.batch ? '确定要删除选中角色吗？' : '确定要删除此角色吗？',
          info: '角色删除操作不可撤销',
          onsubmit: function () {
            CommonProvider.promise({
              model: RoleModel,
              method: params.batch ? 'delete' : 'del',
              params: params.batch ? $scope.role_list.result.checked() : params.role,
              success: function (_role) {
                $modal.success({
                  message: _role.message
                });
              },
              error: function (_role) {
                $modal.error({
                  message: _role.message
                });
              }
            });
          }
        });
      },

      // （批量）禁用角色
      disable: function (params) {
        if (params.batch && $scope.role_list.result.checked().length == 0) {
          $modal.error({ message: '至少需要选中一个角色' });
          return false;
        };
        $modal.confirm({
          title: '确认操作',
          message: params.batch ? '确定要禁用选中角色吗？' : '确定要禁用此角色吗？',
          info: params.batch ? '禁用后选中角色权限将失效，成为普通用户' : '禁用后该角色权限将失效，成为普通用户',
          onsubmit: function () {
            CommonProvider.promise({
              model: RoleModel,
              method: 'disable',
              params: params.batch ? $scope.role_list.result.checked() : params.role,
              success: function (_role) {
                $modal.success({
                  message: _role.message
                });
              },
              error: function (_role) {
                $modal.error({
                  message: _role.message
                });
              }
            });
          }
        });
      },

      // (批量)启用角色
      enable: function (params) {
        if (params.batch && $scope.role_list.result.checked().length == 0) {
          $modal.error({ message: '至少需要选中一个角色' });
          return false;
        };
        $modal.confirm({
          title: '确认操作',
          message: params.batch ? '确定要启用选中角色吗？' : '确定要启用此角色吗？',
          info: params.batch ? '启用后选中角色包含用户将恢复正常操作权限' : '启用后该角色包含用户将恢复正常操作权限',
          onsubmit: function () {
            CommonProvider.promise({
              model: RoleModel,
              method: 'enable',
              params: params.batch ? $scope.role_list.result.checked() : params.role,
              success: function (_role) {
                $modal.success({
                  message: _role.message
                });
              },
              error: function (_role) {
                $modal.error({
                  message: _role.message
                });
              }
            });
          }
        });
      },

      // 查看角色权限
      permission: function (role) {
        $rootScope.current_role_permissions = role.permissions;
        $modal.custom({
          title: role.name + '所拥有的权限',
          template_url: '/partials/admin/user/role/permission.html',
          callback: function () {
            delete $rootScope.current_role_permissions;
          }
        });
      },

      // 获取单个角色资料
      getRole: function () {
        CommonProvider.promise({
          model: RoleModel,
          method: 'getRole',
          params: $stateParams.role_id,
          success: function (_role) {
            $scope.role = _role.result;
          }
        });

        // 获取权限列表
        CommonProvider.promise({
          model: PermissionModel,
          method: 'get',
          success: function (permission_list) {
            $scope.permission_list = permission_list;
          }
        });
      },

      // 编辑角色权限
      editPermissions: function () {
        CommonProvider.promise({
          model: RoleModel,
          method: 'permission',
          params: { 
            id: $scope.role.id,
            ids: $scope.permission_list.result.checked('children')
          },
          success: function (_role) {
            PermissionProvider.init();
            $modal.success({
              message: _role.message
            });
            $location.path('/user/manage/role/list');
          },
          error: function (_role) {
            $modal.error({
              message: _role.message
            });
          }
        });
      }
    };

    /*----------------权限管理----------------*/

    $scope.permissionAction = {

      // 请求权限列表
      getLists: function () {

        // 获取权限列表
        CommonProvider.promise({
          model: PermissionModel,
          method: 'get',
          success: function (permission_list) {
            $scope.permission_list = permission_list;
            $rootScope.permission_list = permission_list.result;
          }
        });

        // 获取Api列表
        if (!$rootScope.api_list) {
          CommonProvider.promise({
            model: GrantApiModel,
            method: 'get',
            params: { per_page: 400 },
            success: function (api_list) {
              $rootScope.api_list = api_list.result;
            }
          });
        };
      },

      // 权限排序监听
      sort: function ($item, $partFrom, $partTo, $indexFrom, $indexTo) {
        // 整理数据并更新
        var sorts = [],sort;
        for (var i = 0; i < $partTo.length; i++) {
          sort = {};
          sort.id = $partTo[i].id;
          sort.sort = i;
          sorts.push(sort);
        };
        PermissionModel.sort(sorts);
      },

      // 新增权限
      add: function (params) {
        if (params.modal) {
          $modal.custom({
            title: '添加权限',
            template_url: '/partials/admin/user/permission/add.html'
          });
        } else {
          CommonProvider.promise({
            model: PermissionModel,
            method: 'add',
            params: $scope.permission,
            success: function (permission) {
              $rootScope.modal.close();
              $modal.success({
                title: '添加成功'
              });
            },
            error: function (permission) {
              $modal.error({
                title: permission.message
              });
            }
          });
        }
      },

      // （批量）删除权限
      del: function (params) {
        if (params.batch && $scope.permission_list.result.checked('children').length == 0) {
          $modal.error({ message: '至少需要选中一个角色' });
          return false;
        };
        $modal.confirm({
          title: '确认删除',
          message: params.batch ? '确定要删除选中权限吗？' : '确定要删除此权限吗？',
          info: '权限删除操作不可撤销',
          onsubmit: function () {
            CommonProvider.promise({
              model: PermissionModel,
              method: params.batch ? 'delete' : 'del',
              params: params.batch ? $scope.permission_list.result.checked('children') : params.permission,
              success: function (_permission) {
                $modal.success({
                  message: _permission.message
                });
              },
              error: function (_permission) {
                $modal.error({
                  message: _permission.message
                });
              }
            });
          }
        });
      },

      // 编辑权限
      edit: function (params) {
        if (params.modal) {
          $rootScope.permission_local = params.permission;
          $rootScope.permission_edit = angular.copy(params.permission.permission);
          $modal.custom({
            title: '编辑用户',
            template_url: '/partials/admin/user/permission/edit.html',
            callback: function () {
              delete $rootScope.permission_edit;
            }
          });
        } else {
          CommonProvider.promise({
            model: PermissionModel,
            method: 'put',
            params: { new: $scope.permission, old: $rootScope.permission_local },
            success: function (_permission) {
              $rootScope.modal.close();
              $modal.success({
                message: _permission.message,
                callback: function () {
                  delete $rootScope.permission_local;
                }
              });
            },
            error: function (_permission) {
              $modal.error({
                message: _permission.message
              });
            }
          });
        }
      },

      // （批量）禁用权限
      disable: function (params) {
        if (params.batch && $scope.permission_list.result.checked('children').length == 0) {
          $modal.error({ message: '至少需要选中一个权限' });
          return false;
        };
        $modal.confirm({
          title: '确认操作',
          message: params.batch ? '确定要禁用选中权限吗？' : '确定要禁用此权限吗？',
          info: params.batch ? '禁用权限后，所有关联用户的权限将立即失效' : '禁用后该权限将失效',
          onsubmit: function () {
            CommonProvider.promise({
              model: PermissionModel,
              method: 'disable',
              params: params.batch ? $scope.permission_list.result.checked('children') : params.permission,
              success: function (_permission) {
                $modal.success({
                  message: _permission.message
                });
              },
              error: function (_permission) {
                $modal.error({
                  message: _permission.message
                });
              }
            });
          }
        });
      },

      // (批量)启用权限
      enable: function (params) {
        if (params.batch && $scope.permission_list.result.checked('children').length == 0) {
          $modal.error({ message: '至少需要选中一个权限' });
          return false;
        };
        $modal.confirm({
          title: '确认操作',
          message: params.batch ? '确定要启用选中权限吗？' : '确定要启用此权限吗？',
          info: params.batch ? '启用后选中权限包含用户将恢复正常操作权限' : '启用后该权限包含用户将恢复正常操作权限',
          onsubmit: function () {
            CommonProvider.promise({
              model: PermissionModel,
              method: 'enable',
              params: params.batch ? $scope.permission_list.result.checked('children') : params.permission,
              success: function (_permission) {
                $modal.success({
                  message: _permission.message
                });
              },
              error: function (_permission) {
                $modal.error({
                  message: _permission.message
                });
              }
            });
          }
        });
      },

      // 查看api
      api: function (apis) {
        $rootScope.current_permission_apis = apis;
        $modal.custom({
          title: 'api详情',
          template_url: '/partials/admin/user/permission/api.html',
          callback: function () {
            delete $rootScope.current_permission_apis;
          }
        });
      },

      // 获取单个权限资料
      getPermission: function () {
        $scope.permission = null;
        CommonProvider.promise({
          model: PermissionModel,
          method: 'item',
          params: $stateParams.permission_id,
          success: function (_permission) {
            $scope.permission = _permission.result;
          }
        });

        // 获取Api列表
        if (!$rootScope.api_list) {
          CommonProvider.promise({
            model: GrantApiModel,
            method: 'get',
            params: { per_page: 400 },
            success: function (api_list) {
              $rootScope.api_list = api_list.result;
            }
          });
        };

      },

      // 编辑权限API
      editApis: function (params) {
        CommonProvider.promise({
          model: PermissionModel,
          method: 'api',
          params: {
            id: $scope.permission.id,
            ids: $rootScope.api_list.checked()
          },
          success: function (_permission) {
            $modal.success({
              message: _permission.message
            });
            $location.path('/user/manage/permission/list');
          },
          error: function (_permission) {
            $modal.error({
              message: _permission.message
            });
          }
        });
      },

      // 路由转换为标识符
      toSlug: function () {
        $scope.permission.slug = !!$scope.permission.url ? $scope.permission.url.replace(/^\/|\s+$/g,'').replace(/\//g, ".") : '';
      }
    };

    /*----------------APi管理----------------*/

    $scope.apiAction = {

      // 获取api列表
      getLists: function (page) {
        CommonProvider.promise({
          model: GrantApiModel,
          method: 'get',
          params: { page: page || 1 },
          success: function (api_list) {
            $scope.api_list = api_list;
          }
        });
      },

      // 增加api
      add: function (params) {
        if (params.modal) {
          $modal.custom({
            title: '添加API',
            template_url: '/partials/admin/user/api/add.html'
          });
        } else {
          CommonProvider.promise({
            model: GrantApiModel,
            method: 'add',
            params: $scope.api,
            success: function (_api) {
              $rootScope.modal.close();
              $modal.success({
                message: _api.message
              });
            },
            error: function (_api) {
              $modal.error({
                message: _api.message
              });
            }
          });
        }
      },

      // 编辑API
      put: function (params) {
        if (params.modal) {
          $rootScope.api = angular.copy(params.api.api);
          $rootScope.api_local = params.api;
          $modal.custom({
            title: '添加API',
            template_url: '/partials/admin/user/api/edit.html',
            callback: function () {
              $rootScope.api = null;
            }
          });
        } else {
          CommonProvider.promise({
            model: GrantApiModel,
            method: 'put',
            params: { new: $scope.api, old: $rootScope.api_local },
            success: function (_api) {
              $rootScope.api_local = null;
              $rootScope.modal.close();
              $modal.success({
                message: _api.message
              });
            },
            error: function (_api) {
              $modal.error({
                message: _api.message
              });
            }
          });
        }
      },

      // （批量）删除API
      del: function (params) {
        if (params.batch && $scope.api_list.result.checked().length == 0) {
          $modal.error({ message: '至少需要选中一个API' });
          return false;
        };
        $modal.confirm({
          title: '确认删除',
          message: params.batch ? '确定要删除选中API吗？' : '确定要删除此API吗？',
          info: 'API删除操作不可撤销',
          onsubmit: function () {
            CommonProvider.promise({
              model: GrantApiModel,
              method: params.batch ? 'delete' : 'del',
              params: params.batch ? $scope.api_list.result.checked() : params.api,
              success: function (_api) {
                $modal.success({
                  message: _api.message
                });
              },
              error: function (_api) {
                $modal.error({
                  message: _api.message
                });
              }
            });
          }
        });
      }
    };
  }
]);
/**
* WithdrawController Module
*
* Description
*/
angular.module('WithdrawController', ['WithdrawModel'])
.controller('WithdrawController', ['$scope', '$rootScope', '$state', '$stateParams', '$modal', 'WithdrawModel', 'CommonProvider', function($scope, $rootScope, $state, $stateParams, $modal, WithdrawModel, CommonProvider) {

    /*----------------提现管理事件----------------*/
    $scope.filter = {};
    $scope.params = {};
    $scope.withdraw = {};
    $scope.withdraw_list = {};

    $scope.withdrawAction = {

      // 提现管理首页
      getIndex: function (page) {
        var _self = this;
        // 获取提现列表
        $scope.params = {
          page: page || 1,
        };
        _self.getLists($scope.params);
      },

      // 获取列表数据
      getLists: function(params) {
        CommonProvider.promise({
          model: WithdrawModel,
          method: 'get',
          params: params,
          success: function (_withdraw_list) {
            // console.log(_withdraw_list);
            $scope.withdraw_list = _withdraw_list;
          }
        });
      },

      // 获取提现详情
      getItem: function () {
        CommonProvider.promise({
          model: WithdrawModel,
          method: 'item',
          params: { withdraw_id: $stateParams.withdraw_id },
          success: function (_withdraw_item) {
            $scope.withdraw = _withdraw_item.result;
          }
        });
      },

      // 支付单不同支付方式筛选
      filterChanged: function () {
        var _self = this;
        var status = $scope.filter.status;
        !status ? delete $scope.params.status : $scope.params.status = status;
        _self.getLists($scope.params);
      },

      // 处理提现
      edit: function (params) {
        if (params.modal) {
          $rootScope.withdraw_local = params.withdraw;
          $rootScope.withdraw_edit  = angular.copy(params.withdraw.withdraw);
          $modal.custom({
            title: '处理提现',
            template_url: '/partials/admin/trade/withdraw/edit.html',
            callback: function () {
              delete $rootScope.withdraw_edit;
            }
          });
        } else {
          CommonProvider.promise({
            model: WithdrawModel,
            method: 'put',
            params: { body: $scope.withdraw, id: $scope.withdraw.id },
            success: function (_withdraw) {
              $rootScope.withdraw_local.$parent.withdraw = _withdraw.result;
              $rootScope.modal.close();
              $modal.success({
                message: _withdraw.message,
                callback: function () {
                  delete $rootScope.withdraw_local;
                }
              });
            },
            error: function (_withdraw) {
              $modal.error({
                message: _withdraw.message
              });
            }
          });
        }
      },

      // 删除提现
      del: function (params) {
        if (params.batch && $scope.withdraw_list.result.checked().length == 0) {
          return $modal.error({ message: '至少需要选中一个提现单' });
        };
        $modal.confirm({
          title: '确认删除',
          message: params.batch ? '确定要删除选中提现单吗？' : '确定要删除此提现单吗？',
          info: '提现单删除后可在回收站中查看',
          onsubmit: function () {
            CommonProvider.promise({
              model: WithdrawModel,
              method: params.batch ? 'delete' : 'del',
              params: params.batch ? $scope.withdraw_list.result.checked() : params.withdraw,
              success: function (_withdraw) {
                $modal.success({
                  message: _withdraw.message
                });
              },
              error: function (_withdraw) {
                $modal.error({
                  message: _withdraw.message
                });
              }
            });
          }
        });
      },
    };
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
/*
*
* 用户数据请求模块 
*
* Description
*
*/
angular.module('UserService', [])

// 用户数据资源服务
.service('UserService', ['$resource', 'appConfig',
  function ($resource, appConfig) {
    return $resource(appConfig.apiUrl + '/user', {
        per_page: '@per_page',
        page: '@page' 
      }, {

      // item
      item: {
        method: 'GET',
        url: appConfig.apiUrl + '/user/:user_id'
      },

      // search
      search: {
        method: 'GET',
        url: appConfig.apiUrl + '/user/search'
      },
      
      // del
      del: {
        method: 'DELETE',
        url: appConfig.apiUrl + '/user/:user_id'
      },

      // put
      put: {
        method: 'PUT',
        url: appConfig.apiUrl + '/user/:user_id'
      },

      // 批量禁用
      disable: {
        method: 'PUT',
        url: appConfig.apiUrl + '/user/disable'
      },

      // 批量启用
      enable: {
        method: 'PUT',
        url: appConfig.apiUrl + '/user/enable'
      },

      // 更新用户角色
      role: {
        method: 'POST',
        url: appConfig.apiUrl + '/user/:user_id/role'
      }

    });
  }
])

// 角色组数据资源服务
.service('RoleService', ['$resource', 'appConfig',
  function ($resource, appConfig) {
    return $resource(appConfig.apiUrl + '/role', {
        per_page: '@per_page',
        page: '@page' 
      }, {

      // 获取单个角色
      getRole: {
        method: 'GET',
        url: appConfig.apiUrl + '/role/:role_id'
      },

      // del
      del: {
        method: 'DELETE',
        url: appConfig.apiUrl + '/role/:role_id'
      },

      // put
      put: {
        method: 'PUT',
        url: appConfig.apiUrl + '/role/:role_id'
      },

      // 批量禁用
      disable: {
        method: 'PUT',
        url: appConfig.apiUrl + '/role/disable'
      },

      // 批量启用
      enable: {
        method: 'PUT',
        url: appConfig.apiUrl + '/role/enable'
      },

      // 更新角色权限
      permission: {
        method: 'POST',
        url: appConfig.apiUrl + '/role/:role_id/permission'
      }

    });
  }
])

// 权限数据资源服务
.service('PermissionService', ['$resource', 'appConfig',
  function ($resource, appConfig) {
    return $resource(appConfig.apiUrl + '/permission', {}, {

      // get_item
      item: {
        method: 'GET',
        url: appConfig.apiUrl + '/permission/:permission_id'
      },

      // del
      del: {
        method: 'DELETE',
        url: appConfig.apiUrl + '/permission/:permission_id'
      },

      // put
      put: {
        method: 'PUT',
        url: appConfig.apiUrl + '/permission/:permission_id'
      },

      // 批量禁用
      disable: {
        method: 'PUT',
        url: appConfig.apiUrl + '/permission/disable'
      },

      // 批量启用
      enable: {
        method: 'PUT',
        url: appConfig.apiUrl + '/permission/enable'
      },

      // api关系更新
      api: {
        method: 'POST',
        url: appConfig.apiUrl + '/permission/:permission_id/api'
      },

      // 更新排序
      sort: {
        method: 'POST',
        url: appConfig.apiUrl + '/permission/update_sort'
      }
    });
  }
])

// API资源服务
.service('GrantApiService', ['$resource', 'appConfig',
  function ($resource, appConfig) {
    return $resource(appConfig.apiUrl + '/api', {
        per_page: '@per_page',
        page: '@page' 
      }, {

      // del
      del: {
        method: 'DELETE',
        url: appConfig.apiUrl + '/api/:api_id'
      },

      // put
      put: {
        method: 'PUT',
        url: appConfig.apiUrl + '/api/:api_id'
      }
    });
  }
])
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
/*
*
* User 数据模型
*
* Description
*
*/
angular.module('UserModel', ['UserService'])

// 用户数据模型
.factory('UserModel', ['UserService', 'CommonProvider',
  function (UserService, CommonProvider) {

    // 初始化
    var _user;
    var _user_list;
    var _user_service = new UserService();

    var _user_model = {

      // 获取用户列表
      get: function (params) {
        return CommonProvider.request({
          method: 'get',
          service: _user_service,
          params: params,
          success: function (_user_lists) {
            _user_list = _user_lists;
          }
        });
      },

      // 获取单个用户
      item: function (params) {
        return CommonProvider.request({
          method: 'item',
          service: new UserService(),
          params: params,
          success: function (user) {
            _user = user;
          }
        });
      },

      // 增加用户
      add: function (user) {
        return CommonProvider.request({
          method: 'save',
          service: new UserService(user),
          success: function (_user) {
            _user_list.result.unshift(_user.result);
            _user_list.pagination.total += 1;
          }
        });
      },

      // 删除用户
      del: function (user) {
        return CommonProvider.request({
          method: 'del',
          service: new UserService(),
          params: { user_id: user.user.id },
          success: function (_user) {
            _user_list.result.remove(user.user);
            _user_list.pagination.total -= 1;
          }
        });
      },

      // 修改用户
      put: function (user) {
        return CommonProvider.request({
          method: 'put',
          service: new UserService(user.new),
          params: { user_id: user.new.id },
          success: function (_user) {
            var roles = angular.copy(user.old.user.roles);
            _user_list.result[user.old.$parent.$index] = _user.result;
            _user_list.result[user.old.$parent.$index].roles = roles;
          }
        });
      },

      // (批量)禁用用户
      disable: function (params) {
        var ids = params.length ? params.join(',') : params.user.id;
        return CommonProvider.request({
          method: 'disable',
          service: new UserService({ ids: ids }),
          success: function (_user) {
            if (params.length) {
              _user_model.get({ page: _user_list.pagination.current_page });
            } else {
              params.user.x_status = 0;
            }
          }
        });
      },

      // (批量)启用用户
      enable: function (params) {
        var ids = params.length ? params.join(',') : params.user.id;
        return CommonProvider.request({
          method: 'enable',
          service: new UserService({ ids: ids }),
          success: function (_user) {
            if (params.length) {
              _user_model.get({ page: _user_list.pagination.current_page });
            } else {
              params.user.x_status = 1;
            }
          }
        });
      },

      // 批量删除用户
      delete: function (ids) {
        return CommonProvider.request({
          method: 'delete',
          service: new UserService(),
          params: { ids: ids.join(',') },
          success: function (_user) {
            _user_model.get({ page: _user_list.pagination.current_page });
          }
        });
      },

      // 更新用户所属角色组
      role: function (params) {
        return CommonProvider.request({
          method: 'role',
          service: new UserService({ ids: params.ids.join(',') }),
          params: { user_id: params.add ? params.user.id : params.user.user.id },
          success: function (_user) {
            if (params.add) {
              _user_list.result[0].roles = _user.result.roles;
            } else {
              _user_list.result[params.user.$parent.$index].roles = _user.result.roles;
            }
          }
        });
      },

    };

    return _user_model;
  }
])

// 角色组数据模型
.factory('RoleModel', ['RoleService', 'CommonProvider',
  function (RoleService,  CommonProvider) {

    // 初始化
    var _role_item;
    var _role_list;
    var _role_model = {};
    var _role_service = new RoleService();

    // 获取角色列表
    _role_model.get = function(config) {

      var get_config = {
        page: config ? config.page : 1,
        per_page: config ? config.per_page : 20
      };

      return CommonProvider.request({
        method: 'get',
        service: _role_service,
        params: get_config,
        success: function (roles) {
          _role_list = roles;
        }
      });
    };

    // 增加角色
    _role_model.add = function (role) {
      return CommonProvider.request({
        method: 'save',
        service: new RoleService(role),
        success: function (_role) {
          _role_list.result.unshift(_role.result);
          _role_list.pagination.total += 1;
        }
      });
    };

    // 删除角色
    _role_model.del = function (role) {
      return CommonProvider.request({
        method: 'del',
        service: new RoleService(),
        params: { role_id: role.role.id },
        success: function (_role) {
          _role_list.result.splice(role.$index, 1);
          _role_list.pagination.total -= 1;
        }
      });
    };

    // 修改角色
    _role_model.put = function (role) {
      return CommonProvider.request({
        method: 'put',
        service: new RoleService(role.new),
        params: { role_id: role.new.id },
        success: function (_role) {
          role.old.role = _role.result;
        }
      });
    };

    // 批量删除角色
    _role_model.delete = function (ids) {
      return CommonProvider.request({
        method: 'delete',
        service: new RoleService(),
        params: { ids: ids.join(',') },
        success: function (_user) {
          _role_model.get({ page: _role_list.pagination.current_page });
        }
      });
    };

    // (批量)禁用角色
    _role_model.disable = function (params) {
      var ids = params.length ? params.join(',') : params.role.id;
      return CommonProvider.request({
        method: 'disable',
        service: new RoleService({ ids: ids }),
        success: function (_role) {
          if (params.length) {
            _role_model.get({ page: _role_list.pagination.current_page });
          } else {
            params.role.x_status = 0;
          }
        }
      });
    };

    // (批量)启用角色
    _role_model.enable = function (params) {
      var ids = params.length ? params.join(',') : params.role.id;
      return CommonProvider.request({
        method: 'enable',
        service: new RoleService({ ids: ids }),
        success: function (_role) {
          if (params.length) {
            _role_model.get({ page: _role_list.pagination.current_page });
          } else {
            params.role.x_status = 1;
          }
        }
      });
    };

    // 修改（添加）角色权限
    _role_model.permission = function (role) {
      return CommonProvider.request({
        method: 'permission',
        service: new RoleService({ ids: role.ids.join(',') }),
        params: { role_id: role.id }
      });
    };

    // 获取单个用户资料
    _role_model.getRole = function (role_id) {
      return CommonProvider.request({
        method: 'getRole',
        service: _role_service,
        params: { role_id: role_id },
        success: function (_role) {
          _role_item = _role.result;
        }
      });
    };

    return _role_model;
  }
])

// 权限数据模型
.factory('PermissionModel', ['PermissionService', 'CommonProvider',
  function (PermissionService, CommonProvider) {

    // 初始化
    var _permission_item;
    var _permission_list;
    var _permission_model = {};
    var _permission_service = new PermissionService();

    // 获取权限列表
    _permission_model.get = function () {
      return CommonProvider.request({
        method: 'get',
        service: _permission_service,
        success: function (permission_list) {
          _permission_list = permission_list.result;
        }
      });
    };

    // 增加权限
    _permission_model.add = function (permission) {

      // 格式化数据，确定回调所需参数
      permission.type = Number(permission.type) || 0;

      var root_index = permission.belong.root ? Number(permission.belong.root.index) : 0;
      var node_index = permission.belong.node ? Number(permission.belong.node.index) : 0;
      var page_index = permission.belong.page ? Number(permission.belong.page.index) : 0;
      
      // 添加菜单
      var add_menu = function (_permission) {
        _permission_list.push(_permission);
      };

      // 添加节点
      var add_node = function (_permission) {
        if (!!_permission_list[root_index].children) {
          _permission_list[root_index].children.push(_permission);
        } else {
          _permission_list[root_index].children = [];
          _permission_list[root_index].children.push(_permission);
        }
      };

      // 添加页面
      var add_page = function (_permission) {
        if(!!_permission_list[root_index]) {
          if(!!_permission_list[root_index].children[node_index]) {
            if (!!_permission_list[root_index].children[node_index].children) {
              _permission_list[root_index].children[node_index].children.push(_permission);
            } else {
              _permission_list[root_index].children[node_index].children = [];
              _permission_list[root_index].children[node_index].children.push(_permission);
            }
          }
        }
      };

      // 添加功能
      var add_func = function (_permission) {
        if(!!_permission_list[root_index]) {
          if(!!_permission_list[root_index].children[node_index]) {
            if(!!_permission_list[root_index].children[node_index].children[page_index]) {
              if (!!_permission_list[root_index].children[node_index].children[page_index].children) {
                _permission_list[root_index].children[node_index].children[page_index].children.push(_permission);
              } else {
                _permission_list[root_index].children[node_index].children[page_index].children = [];
                _permission_list[root_index].children[node_index].children[page_index].children.push(_permission);
              }
            }
          }
        }
      };

      // 请求前格式化格式
      var add_check = function () {
        switch(permission.type) {
          case 1:
            permission.pid = 0;
            break;
          case 2:
            permission.pid = permission.belong.root.id;
            break;
          case 3:
            permission.pid = permission.belong.node.id;
            break;
          case 4:
            permission.pid = permission.belong.page.id;
            break;
          default:
            console.log('类型参数不正确');
            break;
        };
      };

      add_check();
      return CommonProvider.request({
        method: 'save',
        service: new PermissionService(permission),
        success: function (_permission) {
          _permission.result.x_status = _permission.x_status || 1;
          switch(permission.type) {
            case 1:
              add_menu(_permission.result);
              break;
            case 2:
              add_node(_permission.result);
              break;
            case 3:
              add_page(_permission.result);
              break;
            case 4:
              add_func(_permission.result);
              break;
            default:
              console.log('类型参数不正确');
              break;
          };
        }
      });
    };

    // 删除权限
    _permission_model.del = function (permission) {
      return CommonProvider.request({
        method: 'del',
        service: new PermissionService(),
        params: { permission_id: permission.permission.id },
        success: function (_permission) {
          if (permission.permission.type == 1) {
            _permission_list.splice(permission.$index, 1);
          } else {
            permission.$parent.$parent.permission.children.splice(permission.$index, 1);
          }
        }
      });
    };

    // 修改权限
    _permission_model.put = function (permission) {
      return CommonProvider.request({
        method: 'put',
        service: new PermissionService(permission.new),
        params: { permission_id: permission.new.id },
        success: function (_permission) {
          permission.old.permission = permission.new;
        }
      });
    };

    // （批量）禁用权限
    _permission_model.disable = function (params) {
      var ids = params.length ? params.join(',') : params.permission.id;
      return CommonProvider.request({
        method: 'disable',
        service: new PermissionService({ ids: ids }),
        success: function (_permission) {
          if (params.length) {
            _permission_model.get();
          } else {
            params.permission.x_status = 0;
          }
        }
      });
    };

    // （批量）启用权限
    _permission_model.enable = function (params) {
      var ids = params.length ? params.join(',') : params.permission.id;
      return CommonProvider.request({
        method: 'enable',
        service: new PermissionService({ ids: ids }),
        success: function (_permission) {
          if (params.length) {
            _permission_model.get();
          } else {
            params.permission.x_status = 1;
          }
        }
      });
    };

    // 批量删除权限
    _permission_model.delete = function (ids) {
      return CommonProvider.request({
        method: 'delete',
        service: new PermissionService(),
        params: { ids: ids.join(',') },
        success: function (_permission) {
          _permission_model.get();
        }
      });
    };

    // 获取单个权限
    _permission_model.item = function (id) {
      return CommonProvider.request({
        method: 'item',
        service: new PermissionService(),
        params: { permission_id: id },
        success: function (_permission) {
          _permission_item = _permission.result;
        }
      });
    };

    // 修改/增加api
    _permission_model.api = function (params) {
      return CommonProvider.request({
        method: 'api',
        service: new PermissionService({ ids: params.ids.join(',') }),
        params: { permission_id: params.id }
      });
    };

    // 重新排序
    _permission_model.sort = function (sorts) {
      return CommonProvider.request({
        method: 'sort',
        service: new PermissionService(),
        body: { data: sorts }
      });
    };

    return _permission_model;
  }
])

// API数据模型
.factory('GrantApiModel', ['GrantApiService', 'CommonProvider', 
  function (GrantApiService, CommonProvider) {

    // 初始化
    var _api_list;
    var _api_model = {};
    var _api_service = new GrantApiService();

    // 获取API列表
    _api_model.get = function(params) {
      return CommonProvider.request({
        method: 'get',
        params: params,
        service: _api_service,
        success: function (apis) {
          _api_list = apis;
        }
      });
    };

    // 增加API
    _api_model.add = function (api) {
      return CommonProvider.request({
        method: 'save',
        service: new GrantApiService(api),
        success: function (_api) {
          _api_list.result.unshift(_api.result);
          _api_list.pagination.total += 1;
        }
      });
    };

    // 删除API
    _api_model.del = function (api) {
      return CommonProvider.request({
        method: 'del',
        service: new GrantApiService(),
        params: { api_id: api.api.id },
        success: function (_api) {
          _api_list.result.splice(api.$index, 1);
          _api_list.pagination.total -= 1;
        }
      });
    };

    // 修改API
    _api_model.put = function (api) {
      return CommonProvider.request({
        method: 'put',
        service: new GrantApiService(api.new),
        params: { api_id: api.new.id },
        success: function (_api) {
          api.old.api = _api.result;
        }
      });
    };

    // 批量删除API
    _api_model.delete = function (ids) {
      return CommonProvider.request({
        method: 'delete',
        service: new GrantApiService(),
        params: { ids: ids.join(',') },
        success: function (_user) {
          _api_model.get({ page: _api_list.pagination.current_page });
        }
      });
    };

    return _api_model;
  }
])
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

angular.module('AppRoutes',['ui.router.stateHelper']).config(['$stateProvider', '$urlRouterProvider', 'stateHelperProvider', '$httpProvider', '$locationProvider',
  function ($stateProvider, $urlRouterProvider, stateHelperProvider, $httpProvider, $locationProvider) {

    // 404路径，跳转至首页
    $urlRouterProvider.otherwise('/index');

    // 定义树形路由
    stateHelperProvider

    // 首页
    .state({
      name: 'index',
      url: '/index',
      templateUrl: 'partials/admin/index/index.html',
      controller: 'IndexController',
      data: {
        title: '首页',
        url: '/index',
        slug: 'index'
      },
      children: [{
        // 常用操作（抽象）
        abstract: true,
        name: 'action',
        url: '/action',
        template: '<div ui-view class="view-box slide-top"></div>',
        controller: 'IndexController',
        data: {
          title: '常用操作',
          url: '/index/action',
          slug: 'action'
        },
        children: [{
          // 快速开始
          name: 'dashboard',
          url: '/dashboard',
          templateUrl: 'partials/admin/index/dashboard.html',
          controller: 'IndexController',
          data: {
            title: '快速开始',
            url: '/index/action/dashboard',
            slug: 'dashboard'
          }
        }, {
          // 缓存清理
          name: 'clearcache',
          url: '/clearcache',
          templateUrl: 'partials/admin/index/clearcache.html',
          controller: 'IndexController',
          data: {
            title: '缓存清理',
            url: '/index/action/clearcache',
            slug: 'clearcache'
          }
        }]
      }]
    })

    // 课程
    .state({
      name: 'course',
      url: '/course',
      templateUrl: 'partials/admin/course/index.html',
      controller: 'CourseController',
      data: {
        title: '课程',
        slug: 'course'
      },
      children: [{
        // 课程管理（抽象）
        abstract: true,
        name: 'manage',
        url: '/manage',
        template: '<div ui-view class="view-box slide-top"></div>',
        controller: 'CourseController',
        data: {
          title: '课程管理',
          slug: 'manage'
        },
        children: [{
          // 课程列表
          abstract: true,
          name: 'list',
          url: '/list',
          template: '<div ui-view class="view-box slide-top"></div>',
          controller: 'CourseController',
          data: {
            title: '课程列表',
            slug: 'list',
          },
          children: [{
            // 课程列表
            name: 'index',
            url: '/index',
            templateUrl: 'partials/admin/course/manage/list.html',
            controller: 'CourseController',
            data: {
              title: '课程列表',
              slug: 'list',
            },
          }, {
            // 课程编辑
            name: 'edit',
            url: '/:course_id',
            templateUrl: 'partials/admin/course/manage/edit.html',
            controller: 'CourseController',
            data: {
              title: '课程编辑',
              slug: 'list',
              name: 'course.manage.list.index'
            }
          }, {
            // 课程章节
            name: 'section',
            url: '/section/:course_id',
            templateUrl: 'partials/admin/course/manage/section/list.html',
            controller: 'CourseController',
            data: {
              title: '课程章节',
              slug: 'list',
              name: 'course.manage.list.index'
            }
          }]
        }, {
          // 课程分类
          abstract: true,
          name: 'category',
          url: '/category',
          template: '<div ui-view class="view-box slide-top"></div>',
          controller: 'CategoryController',
          data: {
            title: '课程分类',
            slug: 'category',
          },
          children: [{
            // 课程分类
            name: 'list',
            url: '/list/:category_type/:category_id',
            templateUrl: 'partials/admin/category/manage/list.html',
            controller: 'CategoryController',
            data: {
              title: '课程分类',
              slug: 'list',
              name: 'course.manage.category.index'
            }
          }, {
            // 新增分类
            name: 'add',
            url: '/add',
            templateUrl: 'partials/admin/category/manage/add.html',
            controller: 'CategoryController',
            data: {
              title: '新增分类',
              slug: 'list',
              name: 'course.manage.category.index'
            }
          }, {
            // 编辑分类
            name: 'edit',
            url: '/edit',
            templateUrl: 'partials/admin/category/manage/edit.html',
            controller: 'CategoryController',
            data: {
              title: '编辑分类',
              slug: 'list',
              name: 'course.manage.category.index'
            }
          }]
        }, {
          // 课程分类
          abstract: true,
          name: 'section',
          url: '/section',
          template: '<div ui-view class="view-box slide-top"></div>',
          controller: 'SectionController',
          data: {
            title: '章节列表',
            slug: 'section',
          },
          children: [{
            // 章节列表
            name: 'index',
            url: '/index',
            templateUrl: 'partials/admin/course/manage/section/index.html',
            controller: 'SectionController',
            data: {
              title: '章节列表',
              slug: 'index',
              name: 'course.manage.section.index'
            }
          }]
        }]
      }]
    })

    // 订单
    .state({
      name: 'trade',
      url: '/trade',
      templateUrl: 'partials/admin/trade/index.html',
      controller: 'TradeController',
      data: {
        title: '订单',
        slug: 'trade'
      },
      children: [{
        // 订单管理（抽象）
        abstract: true,
        name: 'manage',
        url: '/manage',
        template: '<div ui-view class="view-box slide-top"></div>',
        controller: 'TradeController',
        data: {
          title: '订单管理',
          slug: 'manage'
        },
        children: [{
          // 订单管理
          abstract: true,
          name: 'list',
          url: '/list',
          template: '<div ui-view class="view-box slide-top"></div>',
          controller: 'TradeController',
          data: {
            title: '订单管理',
            slug: 'list',
          },
          children: [{
            // 订单管理
            name: 'index',
            url: '/index',
            templateUrl: 'partials/admin/trade/manage/list.html',
            controller: 'TradeController',
            data: {
              title: '订单列表',
              slug: 'list'
            }
          }, {
            // 订单详情
            name: 'item',
            url: '/:trade_id',
            templateUrl: 'partials/admin/trade/manage/item.html',
            controller: 'TradeController',
            data: {
              title: '订单详情',
              slug: 'list',
              name: 'trade.manage.list.index'
            }
          }]
        }, {
          // 收款单
          abstract: true,
          name: 'payment',
          url: '/payment',
          template: '<div ui-view class="view-box slide-top"></div>',
          controller: 'PaymentController',
          data: {
            title: '收款单',
            slug: 'list',
          },
          children: [{
            // 收款单管理
            name: 'list',
            url: '/list',
            templateUrl: 'partials/admin/trade/payment/list.html',
            controller: 'PaymentController',
            data: {
              title: '收款单管理',
              slug: 'list'
            }
          }, {
            // 收款单详情
            name: 'item',
            url: '/:payment_id',
            templateUrl: 'partials/admin/trade/payment/item.html',
            controller: 'PaymentController',
            data: {
              title: '收款单详情',
              slug: 'list',
              name: 'trade.manage.payment.list'
            }
          }]
        }]
      }, {
        // 提现管理
        abstract: true,
        name: 'withdraw',
        url: '/withdraw',
        template: '<div ui-view class="view-box slide-top"></div>',
        controller: 'TradeController',
        data: {
          title: '订单管理',
          slug: 'withdraw'
        },
        children: [{
          // 提现列表
          name: 'list',
          url: '/list',
          templateUrl: 'partials/admin/trade/withdraw/list.html',
          controller: 'WithdrawController',
          data: {
            title: '提现列表',
            slug: 'list'
          }
        }]
      }]
    })

    // 学校
    .state({
      name: 'organization',
      url: '/organization',
      templateUrl: 'partials/admin/organization/index.html',
      controller: 'OrganizationController',
      data: {
        title: '学校',
        slug: 'organization'
      },
      children: [{
        // 学校管理（抽象）
        abstract: true,
        name: 'manage',
        url: '/manage',
        template: '<div ui-view class="view-box slide-top"></div>',
        controller: 'OrganizationController',
        data: {
          title: '学校管理',
          slug: 'manage'
        },
        children: [{
          // 学校管理
          abstract: true,
          name: 'list',
          url: '/list',
          template: '<div ui-view class="view-box slide-top"></div>',
          controller: 'OrganizationController',
          data: {
            title: '学校管理',
            slug: 'list',
          },
          children: [{
            // 学校列表
            name: 'index',
            url: '/index',
            templateUrl: 'partials/admin/organization/manage/list.html',
            controller: 'OrganizationController',
            data: {
              title: '学校列表',
              slug: 'list'
            }
          }, {
            // 新增学校
            name: 'add',
            url: '/add',
            templateUrl: 'partials/admin/organization/manage/add.html',
            controller: 'OrganizationController',
            data: {
              title: '新增学校',
              slug: 'list',
              name: 'organization.manage.list.index'
            }
          }, {
            // 编辑学校
            name: 'edit',
            url: '/:organization_id',
            templateUrl: 'partials/admin/organization/manage/edit.html',
            controller: 'OrganizationController',
            data: {
              title: '编辑学校',
              slug: 'list',
              name: 'organization.manage.list.index'
            }
          }]
        }, {
          // 学校分类
          abstract: true,
          name: 'category',
          url: '/category',
          template: '<div ui-view class="view-box slide-top"></div>',
          controller: 'CategoryController',
          data: {
            title: '学校分类',
            slug: 'category',
          },
          children: [{
            // 学校分类
            name: 'list',
            url: '/list/:category_type/:category_id',
            templateUrl: 'partials/admin/category/manage/list.html',
            controller: 'CategoryController',
            data: {
              title: '学校分类',
              slug: 'list',
              name: 'course.manage.category.index'
            }
          }, {
            // 新增分类
            name: 'add',
            url: '/add',
            templateUrl: 'partials/admin/category/manage/add.html',
            controller: 'CategoryController',
            data: {
              title: '新增分类',
              slug: 'list',
              name: 'course.manage.category.index'
            }
          }, {
            // 编辑分类
            name: 'edit',
            url: '/edit',
            templateUrl: 'partials/admin/category/manage/edit.html',
            controller: 'CategoryController',
            data: {
              title: '编辑分类',
              slug: 'list',
              name: 'course.manage.category.index'
            }
          }]
        }, {
          // 机构资质
          abstract: true,
          name: 'audit',
          url: '/audit',
          template: '<div ui-view class="view-box slide-top"></div>',
          controller: 'AuditController',
          data: {
            title: '机构资质',
            slug: 'audit',
          },
          children: [{
            // 机构资质列表
            name: 'list',
            url: '/list',
            templateUrl: 'partials/admin/organization/audit/list.html',
            controller: 'AuditController',
            data: {
              title: '机构资质列表',
              slug: 'list',
              name: 'organization.manage.audit.list'
            }
          }, {
            // 机构资质详情
            name: 'edit',
            url: '/:organization_id',
            templateUrl: 'partials/admin/organization/audit/edit.html',
            controller: 'AuditController',
            data: {
              title: '机构资质详情',
              slug: 'list',
              name: 'organization.manage.audit.list'
            }
          }]
        }, {
          // 老师列表
          abstract: true,
          name: 'organization_user',
          url: '/organization_user',
          template: '<div ui-view class="view-box slide-top"></div>',
          controller: 'OrganizationController',
          data: {
            title: '老师列表',
            slug: 'organization_user',
          },
          children: [{
            // 老师列表
            name: 'list',
            url: '/list',
            templateUrl: 'partials/admin/organization/organization_user/list.html',
            controller: 'OrganizationController',
            data: {
              title: '老师列表',
              slug: 'list',
              name: 'organization.manage.organization_user.list'
            }
          }, {
            // 老师详情
            name: 'item',
            url: '/:organization_user_id',
            templateUrl: 'partials/admin/organization/organization_user/item.html',
            controller: 'OrganizationController',
            data: {
              title: '老师详情',
              slug: 'list',
              name: 'organization.manage.organization_user.list'
            }
          }]
        }, {
          // 公告列表
          abstract: true,
          name: 'announcement',
          url: '/announcement',
          template: '<div ui-view class="view-box slide-top"></div>',
          controller: 'AnnouncementController',
          data: {
            title: '公告列表',
            slug: 'announcement',
          },
          children: [{
            // 公告列表
            name: 'list',
            url: '/list',
            templateUrl: 'partials/admin/organization/announcement/list.html',
            controller: 'AnnouncementController',
            data: {
              title: '公告列表',
              slug: 'list',
              name: 'organization.manage.announcement.list'
            }
          }, {
            // 编辑公告
            name: 'edit',
            url: '/:announcement_id',
            templateUrl: 'partials/admin/organization/announcement/edit.html',
            controller: 'AnnouncementController',
            data: {
              title: '编辑公告',
              slug: 'list',
              name: 'organization.manage.announcement.list'
            }
          }, {
            // 公告详情
            name: 'item',
            url: '/:announcement_id',
            templateUrl: 'partials/admin/organization/announcement/item.html',
            controller: 'AnnouncementController',
            data: {
              title: '公告详情',
              slug: 'list',
              name: 'organization.manage.announcement.list'
            }
          }]
        }]
      }]
    })

    // 内容
    .state({
      name: 'article',
      url: '/article',
      templateUrl: 'partials/admin/article/index.html',
      controller: 'ArticleController',
      data: {
        title: '内容',
        slug: 'article'
      },
      children: [{
        // 内容管理（抽象）
        abstract: true,
        name: 'manage',
        url: '/manage',
        template: '<div ui-view class="view-box slide-top"></div>',
        controller: 'ArticleController',
        data: {
          title: '内容管理',
          slug: 'manage'
        },
        children: [{
          // 文章管理
          abstract: true,
          name: 'list',
          url: '/list',
          template: '<div ui-view class="view-box slide-top"></div>',
          controller: 'ArticleController',
          data: {
            title: '文章管理',
            slug: 'list',
          },
          children: [{
            // 文章列表
            name: 'index',
            url: '/index',
            templateUrl: 'partials/admin/article/manage/list.html',
            controller: 'ArticleController',
            data: {
              title: '文章列表',
              slug: 'index'
            }
          }, {
            // 新增文章
            name: 'add',
            url: '/add',
            templateUrl: 'partials/admin/article/manage/add.html',
            controller: 'ArticleController',
            data: {
              title: '新增文章',
              slug: 'list',
              name: 'article.manage.list.index'
            }
          }, {
            // 编辑文章
            name: 'edit',
            url: '/:article_id',
            templateUrl: 'partials/admin/article/manage/edit.html',
            controller: 'ArticleController',
            data: {
              title: '编辑文章',
              slug: 'list',
              name: 'article.manage.list.index'
            }
          }]
        }, {
          // 文章分类
          abstract: true,
          name: 'category',
          url: '/category',
          template: '<div ui-view class="view-box slide-top"></div>',
          controller: 'CategoryController',
          data: {
            title: '文章分类',
            slug: 'category',
          },
          children: [{
            // 文章分类
            name: 'list',
            url: '/list/:category_type/:category_id',
            templateUrl: 'partials/admin/category/manage/list.html',
            controller: 'CategoryController',
            data: {
              title: '文章分类',
              slug: 'list',
              name: 'article.manage.category.index'
            }
          }, {
            // 新增分类
            name: 'add',
            url: '/add',
            templateUrl: 'partials/admin/category/manage/add.html',
            controller: 'CategoryController',
            data: {
              title: '新增分类',
              slug: 'list',
              name: 'article.manage.category.index'
            }
          }, {
            // 编辑分类
            name: 'edit',
            url: '/edit',
            templateUrl: 'partials/admin/category/manage/edit.html',
            controller: 'CategoryController',
            data: {
              title: '编辑分类',
              slug: 'list',
              name: 'article.manage.category.index'
            }
          }]
        }]
      }, {
        // 笔记管理
        abstract: true,
        name: 'note',
        url: '/note',
        template: '<div ui-view class="view-box slide-top"></div>',
        controller: 'NoteController',
        data: {
          title: '笔记管理',
          slug: 'note',
        },
        children: [{
          // 笔记列表
          name: 'list',
          url: '/list',
          templateUrl: 'partials/admin/article/note/list.html',
          controller: 'NoteController',
          data: {
            title: '笔记列表',
            slug: 'note',
            name: 'article.manage.note.list'
          }
        }, {
          // 笔记详情
          name: 'item',
          url: '/item',
          templateUrl: 'partials/admin/article/note/item.html',
          controller: 'NoteController',
          data: {
            title: '笔记详情',
            slug: 'note',
            name: 'article.manage.note.item'
          }
        }]
      }, {
        // 问答管理
        abstract: true,
        name: 'question',
        url: '/question',
        template: '<div ui-view class="view-box slide-top"></div>',
        controller: 'QuestionController',
        data: {
          title: '问答管理',
          slug: 'question',
        },
        children: [{
          // 问答列表
          name: 'list',
          url: '/list',
          templateUrl: 'partials/admin/article/question/list.html',
          controller: 'QuestionController',
          data: {
            title: '问答列表',
            slug: 'question',
            name: 'article.question.list'
          }
        }, {
          // 问答详情
          name: 'item',
          url: '/:article_id',
          templateUrl: 'partials/admin/article/question/item.html',
          controller: 'QuestionController',
          data: {
            title: '问答详情',
            slug: 'index',
            name: 'article.question.item'
          }
        }]
      }, {
        // 广告管理（抽象）
        abstract: true,
        name: 'advertise',
        url: '/advertise',
        template: '<div ui-view class="view-box slide-top"></div>',
        controller: 'ArticleController',
        data: {
          title: '内容管理',
          slug: 'advertise'
        },
        children: [{
          // 广告管理
          abstract: true,
          name: 'list',
          url: '/list',
          template: '<div ui-view class="view-box slide-top"></div>',
          controller: 'ArticleController',
          data: {
            title: '广告管理',
            slug: 'list',
          },
          children: [{
            // 广告列表
            name: 'index',
            url: '/index',
            templateUrl: 'partials/admin/article/advertise/list.html',
            controller: 'AdvertiseController',
            data: {
              title: '广告列表',
              slug: 'index'
            }
          }, {
            // 新增广告
            name: 'add',
            url: '/add',
            templateUrl: 'partials/admin/article/advertise/add.html',
            controller: 'AdvertiseController',
            data: {
              title: '新增广告',
              slug: 'list',
              name: 'article.advertise.list.index'
            }
          }, {
            // 编辑广告
            name: 'edit',
            url: '/:advertise_id',
            templateUrl: 'partials/admin/article/advertise/edit.html',
            controller: 'AdvertiseController',
            data: {
              title: '编辑广告',
              slug: 'list',
              name: 'article.advertise.list.index'
            }
          }]
        }]
      }, {
        // 反馈管理（抽象）
        abstract: true,
        name: 'feedback',
        url: '/feedback',
        template: '<div ui-view class="view-box slide-top"></div>',
        controller: 'ArticleController',
        data: {
          title: '内容管理',
          slug: 'feedback'
        },
        children: [{
          // 反馈管理
          abstract: true,
          name: 'list',
          url: '/list',
          template: '<div ui-view class="view-box slide-top"></div>',
          controller: 'ArticleController',
          data: {
            title: '反馈管理',
            slug: 'list',
          },
          children: [{
            // 反馈管理列表
            name: 'index',
            url: '/index',
            templateUrl: 'partials/admin/article/feedback/list.html',
            controller: 'FeedbackController',
            data: {
              title: '反馈列表',
              slug: 'index'
            }
          }, {
            // 反馈详情
            name: 'item',
            url: '/:feedback_id',
            templateUrl: 'partials/admin/article/feedback/item.html',
            controller: 'FeedbackController',
            data: {
              title: '反馈详情',
              slug: 'list',
              name: 'article.feedback.list.index'
            }
          }]
        }]
      }]
    })

    // 用户
    .state({
      name: 'user',
      url: '/user',
      templateUrl: 'partials/admin/user/index.html',
      controller: 'UserController',
      data: {
        title: '用户',
        url: '/user',
        slug: 'user'
      },
      children: [{
        // 用户管理（抽象）
        abstract: true,
        name: 'manage',
        url: '/manage',
        template: '<div ui-view class="view-box slide-top"></div>',
        controller: 'UserController',
        data: {
          title: '用户管理',
          slug: 'manage'
        },
        children: [{
          // 用户管理
          name: 'list',
          url: '/list',
          abstract: true,
          template: '<div ui-view class="view-box slide-top"></div>',
          controller: 'UserController',
          data: {
            title: '用户管理',
            slug: 'list'
          },
          children: [{
            // 用户管理
            name: 'index',
            url: '/index',
            templateUrl: 'partials/admin/user/manage/list.html',
            controller: 'UserController',
            data: {
              title: '用户列表',
              slug: 'index'
            },
            children: [
            ]
          }, {
            // 用户详情
            name: 'item',
            url: '/:user_id',
            templateUrl: 'partials/admin/user/manage/item.html',
            controller: 'UserController',
            data: {
              title: '用户详情',
              slug: 'item',
              name: 'user.manage.list.index'
            }
          }]
        }, {
          // 角色管理
          name: 'role',
          url: '/role',
          abstract: true,
          template: '<div ui-view class="view-box slide-top"></div>',
          controller: 'UserController',
          data: {
            title: '角色管理',
            url: '/user/manage/role',
            slug: 'role'
          },
          children: [{
            // 角色列表
            name: 'list',
            url: '/list',
            templateUrl: 'partials/admin/user/role/list.html',
            controller: 'UserController',
            data: {
              title: '角色管理',
              url: '/user/manage/role/list',
              slug: 'list'
            }
          }, {
            // 角色权限编辑
            name: 'edit',
            url: '/:role_id',
            templateUrl: 'partials/admin/user/role/permission-edit.html',
            controller: 'UserController',
            data: {
              title: '角色权限管理',
              url: '/user/manage/role/:role_id',
              slug: 'edit',
              name: 'user.manage.role.list'
            }
          }]
        }, {
          // 权限管理
          name: 'permission',
          url: '/permission',
          abstract: true,
          template: '<div ui-view class="view-box slide-top"></div>',
          controller: 'UserController',
          data: {
            title: '权限管理',
            url: '/user/manage/permission',
            slug: 'permission'
          },
          children: [{
            // 权限列表
            name: 'list',
            url: '/list',
            templateUrl: 'partials/admin/user/permission/list.html',
            controller: 'UserController',
            data: {
              title: '权限管理',
              url: '/user/manage/permission/list',
              slug: 'list'
            }
          }, {
            // 权限API编辑
            name: 'edit',
            url: '/:permission_id',
            templateUrl: 'partials/admin/user/permission/api-edit.html',
            controller: 'UserController',
            data: {
              title: '权限API编辑',
              url: '/user/manage/permission/:permission_id',
              slug: 'edit',
              name: 'user.manage.permission.list'
            }
          }]
        }, {
          // API管理
          name: 'api',
          url: '/api',
          abstract: true,
          template: '<div ui-view class="view-box slide-top"></div>',
          controller: 'UserController',
          data: {
            title: 'API管理',
            url: '/user/manage/api',
            slug: 'api'
          },
          children: [{
            // api管理
            name: 'list',
            url: '/list',
            templateUrl: 'partials/admin/user/api/list.html',
            controller: 'UserController',
            data: {
              title: 'api管理',
              url: '/user/manage/api/list',
              slug: 'list'
            }
          }]
        }]
      }]
    })

    // 系统
    .state({
      name: 'config',
      url: '/config',
      templateUrl: 'partials/admin/config/index.html',
      controller: 'ConfigController',
      data: {
        title: '系统',
        url: '/config',
        slug: 'config'
      },
      children: [{
        // 系统配置
        abstract: true,
        name: 'system',
        url: '/system',
        template: '<div ui-view class="view-box slide-top"></div>',
        controller: 'ConfigController',
        data: {
          title: '系统配置',
          url: '/config/system',
          slug: 'system'
        },
        children: [{
          // 系统配置
          name: 'group',
          url: '/group',
          templateUrl: 'partials/admin/config/system/group.html',
          controller: 'ConfigController',
          data: {
            title: '系统配置',
            url: '/config/system/group',
            slug: 'group'
          }
        }, {
          // 配置管理
          name: 'manage',
          url: '/manage',
          templateUrl: 'partials/admin/config/system/list.html',
          controller: 'ConfigController',
          data: {
            title: '配置管理',
            url: '/config/system/manage',
            slug: 'manage'
          }
        }]
      }, {
        // 常用配置
        abstract: true,
        name: 'usual',
        url: '/usual',
        template: '<div ui-view class="view-box slide-top"></div>',
        controller: 'ConfigController',
        data: {
          title: '常用配置',
          url: '/config/usual',
          slug: 'usual'
        },
        children: [{
          // 首页配置
          name: 'index',
          url: '/index',
          templateUrl: 'partials/admin/config/index/index.html',
          controller: 'ConfigController',
          data: {
            title: '首页配置',
            url: '/config/usual/index',
            slug: 'index'
          }
        }, {
          // 友情链接配置
          name: 'link',
          url: '/link',
          templateUrl: 'partials/admin/config/link/index.html',
          controller: 'ConfigController',
          data: {
            title: '友情链接配置',
            url: '/config/usual/link',
            slug: 'link'
          }
        }, {
          // 入驻机构管理
          name: 'partner',
          url: '/partner',
          templateUrl: 'partials/admin/config/partner/index.html',
          controller: 'ConfigController',
          data: {
            title: '入驻机构管理',
            url: '/config/usual/partner',
            slug: 'partner'
          }
        }, {
          // 搜索管理
          name: 'search',
          url: '/search',
          templateUrl: 'partials/admin/config/search/index.html',
          controller: 'ConfigController',
          data: {
            title: '搜索管理',
            url: '/config/usual/search',
            slug: 'search'
          }
        }]
      }, {
        // 数据库管理（抽象）
        abstract: true,
        name: 'database',
        url: '/database',
        template: '<div ui-view class="view-box slide-top"></div>',
        controller: 'ConfigController',
        data: {
          title: '数据库管理',
          url: '/config/database',
          slug: 'database'
        },
        children: [{
          // 数据库备份
          name: 'export',
          url: '/export',
          templateUrl: 'partials/admin/config/database/export.html',
          controller: 'ConfigController',
          data: {
            title: '数据库备份',
            url: '/config/database/export',
            slug: 'export'
          }
        }, {
          // 数据库还原
          name: 'import',
          url: '/import',
          templateUrl: 'partials/admin/config/database/import.html',
          controller: 'ConfigController',
          data: {
            title: '数据库还原',
            url: '/config/database/import',
            slug: 'import'
          }
        }]
      }, {
        // 系统日志
        abstract: true,
        name: 'log',
        url: '/log',
        template: '<div ui-view class="view-box slide-top"></div>',
        controller: 'ConfigController',
        data: {
          title: '系统日志',
          url: '/config/log',
          slug: 'log'
        },
        children: [{
          // 操作日志
          name: 'action',
          url: '/action',
          templateUrl: 'partials/admin/config/log/action.html',
          controller: 'ConfigController',
          data: {
            title: '操作日志',
            url: '/config/log/action',
            slug: 'action'
          }
        }, {
          // 短信记录
          name: 'sms',
          url: '/sms',
          templateUrl: 'partials/admin/config/log/sms.html',
          controller: 'SmsController',
          data: {
            title: '短信记录',
            url: '/config/log/sms',
            slug: 'sms'
          }
        }]
      }]
    })

    // 登录
    .state({
      name: 'login',
      url: '/login',
      views: {
       'auth': { templateUrl: 'partials/admin/auth/login.html' }
      },
      controller: 'AuthController',
      data: {
        title: '登录',
        url: '/login',
        slug: 'login',
        full: true
      }
    })

    // 注册
    .state({
      name: 'register',
      url: '/register',
      views: {
       'auth': { templateUrl: 'partials/admin/auth/register.html' }
      },
      controller: 'AuthController',
      data: {
        title: '注册',
        url: '/register',
        slug: 'register',
        full: true
      }
    })

    // 找回密码
    .state({
      name: 'forgot',
      url: '/forgot',
      views: {
       'auth': { templateUrl: 'partials/admin/auth/forgot.html' }
      },
      controller: 'AuthController',
      data: {
        title: '找回密码',
        url: '/forgot',
        slug: 'forgot',
        full: true
      }
    })

    // UI-Demo
    .state({
      name: 'UI',
      url: '/ui',
      templateUrl: 'partials/admin/index/ui.html',
      controller: 'IndexController',
      data: {
        title: 'UI-Demo',
        url: '/ui'
      }
    })

    $locationProvider.html5Mode(true);

    // 拦截器
    $httpProvider.interceptors.push(['$rootScope', '$q', '$localStorage', '$location', function ($rootScope, $q, $localStorage, $location) {
      return {
        request: function (config) {

          // 请求站内资源时，带上token
          if (!config.url.contain('http://up.qiniu.com')) {
            config.headers = config.headers || {};
            if ($localStorage.token) {
              config.headers.Authorization = 'Bearer ' + $localStorage.token;
            };
          };

          return config;
        },

        response: function (response) {

          if (response.status == 200) {
            // console.log('do something...');
          }
          return response || $q.when(response);
        },

        responseError: function (response) {

          // 关闭动画
          $rootScope.modal.closeLoading();
          $rootScope.modal.close();
          
          switch (response.status) {
            case 401:
                // $rootScope.modal.error({ message: '401 ERROR!' });
                $location.path('/login');
                break;
            case 403:
                $rootScope.modal.error({ message: '403! 无权访问API' });
                // $location.path('/index');
                break;
            case 404:
                $rootScope.modal.error({ message: '404 ERROR!' });
                break;
            case 422:
                $rootScope.modal.error({ message: '422 ERROR!', message: response.message });
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
    }])
  }
]);

var app = angular.module('app', [

  // angular modules
  'ui.router',
  'ngStorage',
  'ngResource',
  'ngAnimate',

  // third modules
  'angular.modal',
  'angular.loading',

  // angular routes
  'AppRoutes',

  // angular directive
  'LayoutDirective',
  'TotopDirective',
  'TabsDirective',
  'LoadingDirective',
  'CollapseDirective',
  'PaginationDirective',

  // Global controller
  'MainController',
  'HeaderController',
  'AsideController',
  'AuthController',

  // Function controller
  'IndexController',
  'UserController',
  'ConfigController',
  'CategoryController',
  'CourseController',
  'SectionController',
  'TradeController',
  'PaymentController',
  'WithdrawController',
  'OrganizationController',
  'AnnouncementController',
  'AuditController',
  'ArticleController',
  'NoteController',
  'QuestionController',
  'AdvertiseController',
  'SmsController',
  'FeedbackController',

  // Global package
  'CommonProvider',
  'AuthProvider',
  'QuploadProvider',

  // Global Service
  'AuthService',

  // Global Filter
  'TimeFilter',
  'HtmlFilter',
])

// 全局配置
.provider('appConfig', function() {
  var config = {
    baseUrl: 'http://admin.xtx.com',
    apiUrl: '/server/api/v1',
    fileUrl: 'http://7xnbft.com2.z0.glb.qiniucdn.com/',
    staticUrl: 'http://7xpb5v.com2.z0.glb.qiniucdn.com',
  };
  return {
    config:config,
    $get: function() {
      return config;
    }
  }
})

// 表单配置
.config(function ($validationProvider, appConfigProvider) {
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
})

.config(['cfpLoadingBarProvider', function(cfpLoadingBarProvider) {
  cfpLoadingBarProvider.includeSpinner = false;
  cfpLoadingBarProvider.latencyThreshold = 10;
}])

// 程序初始化
.run(['PermissionProvider', 'CommonProvider', function(PermissionProvider, CommonProvider) {
  PermissionProvider.init();
  CommonProvider.autoTop();
}]);
