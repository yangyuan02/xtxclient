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