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
