// Array方法扩展

// 获取元素下标
Array.prototype.indexOf = function(item) {
  for (var i = 0; i < this.length; i++) {
    if (this[i] == item) return i;
  }
  return -1;
};

// 删除数组中某元素
Array.prototype.remove = function(item) {
  var index = this.indexOf(item);
  if (index > -1) {
    this.splice(index, 1);
  }
};

// 返回数组第一个元素
Array.prototype.first = function() {
  return this[0];
};

// 返回数组最后一个元素
Array.prototype.last = function() {
  return this[this.length - 1];
};

// 找到子元素则返回子元素本身，否则返回false
Array.prototype.find = function (value, key, children) {

  // 数组对象
  if (arguments.length > 1) {

    var childed = false;

    var find_child = function (main) {
      for (var i = 0; i < main.length; i++) {
        if (main[i][key] == value) {
          childed = main[i];
          return;
        } else if (children && main[i][children]) {
          find_child(main[i][children]);
        }
      }
    };

    find_child(this);

    return childed;
  }

  // 普通数组
  if (arguments.length == 1) {
    for (var i = 0; i < this.length; i++) {
      if (this[i] == value) return this[i];
    }
    return false;
  }
};

// 找到子元素的父元素，否则返回false
Array.prototype.parent = function (value, key, children) {

  var obj = {
    id: 0,
    children: this
  }

  // 数组对象
  var parent = false;

  var find_parent = function (main) {
    for (var i = 0; i < main.children.length; i++) {
      if (main.children[i][key] == value) {
        parent = main;
        return;
      } else if (children && main.children[i][children]) {
        find_parent(main.children[i]);
      }
    }
  };

  find_parent(obj);

  return parent;

};

// 将元素中所有子元素的指定（id）打包为一个数组
Array.prototype.ids = function (id_key) {

  var ids = [];

  var id_key = id_key || 'id';

  for (var i = 0; i < this.length; i++) {
    if (this[i][id_key]) {
      ids.push(this[i][id_key]);
    }
  }

  // console.log(ids);
  return ids;
};

// 将元素中所有级别子元素中被选中的元素的id打包为一个数组
Array.prototype.checked = function (children, id_key) {

  var ids = [];
  var find_check;

  if (arguments.length < 2) {
    find_check = function (main) {
      for (var i = 0; i < main.length; i++) {
        if (main[i].checked) {
          ids.push(main[i].id);
        };
        if (!!children && main[i][children]) {
          find_check(main[i][children]);
        }
      }
    };
  } else {
    find_check = function (main) {
      for (var i = 0; i < main.length; i++) {
        if (main[i].checked) {
          ids.push(main[i][id_key]);
        };
        if (!!children && main[i][children]) {
          find_check(main[i][children]);
        }
      }
    };
  };

  find_check(this);
  return ids;
};

// 设置元素及子元素的属性值
Array.prototype.setAttr = function (key, value) {
  var set_check = function (main) {
    for (var i = 0; i < main.length; i++) {
      main[i][key] = value;
    }
  };
  set_check(this);
};

// 设置元素及子元素的选择状态（可关联自身所有子级）
Array.prototype.setCheck = function (value, children) {
  var set_check = function (main) {
    for (var i = 0; i < main.length; i++) {
      main[i].checked = value;
      if (children && main[i][children]) {
        set_check(main[i][children]);
      }
    }
  };
  set_check(this);
};

// 检查数组对象中是否包含某元素
Array.prototype.contain = function (value, key) {

  // 深度查数组对象
  if (arguments.length == 2) {
    var find_key = function (main) {
      for (var i = 0; i < main.length; i++) {
        if (main[i][key] == value) {
          // break;
          return true;
        } else if (main[i].children) {
          find_key(main[i].children);
        }
      }
      return false;
    };
    return find_key(this);
  }

  // 查单数组
  if (arguments.length == 1) {
    for (var i = 0; i < this.length; i++) {
      if (this[i] == value) return true;
    }
    return false;
  }
  
};

// 检查数组对象中是否包含某字符串
Array.prototype.containStr = function (value) {
  for (var i = 0; i < this.length; i++) {
    if (value.contain(this[i])) return true;
  }
  return false;
};

// 将数组转换为对象，对象key为指定key
Array.prototype.toObject = function (key, val) {

  // 按照指定key,value组合对象
  var toObject = function (arr) {
    var obj = {};
    for (var i = 0; i < arr.length; i++) {
      if (arguments.length == 1) obj[arr[i][key]] = arr[i];
      if (!!val) obj[arr[i][key]] = arr[i][val];
    }
    return obj;
  }
  return toObject(this);

};

// 对象方法扩展
var objExtend = function () {

  // 转为数组
  this.toArray = function (obj, isDefault) {
    var data = [];
    var currentData = {};
    for (var key in obj){
      if (obj.hasOwnProperty(key)) {
        isDefault || data.push({ id: obj[key].id, data: obj[key] });
        if (isDefault) {
          currentData = {};
          currentData[key] = obj[key];
          data.push(currentData)
        }
      }
    };
    return data;
  };

  // 判断对象是否为空 Not Null Object
  this.isNotNull = function (obj) {
    for(var i in obj){
      if(obj.hasOwnProperty(i)){
        return true;
      }
    }
    return false;
  };

};
var Obj = new objExtend();

// 制定字符串位置
String.prototype.find = function (str) {
  if(this.indexOf(str) > -1){
    return this.indexOf(str) + str.length;
  } else {
    return false;
  }
};

// 是否包含某字符
String.prototype.contain = function (str) {
  if(this.indexOf(str) > -1){
    return true;
  } else {
    return false;
  }
};

// 添加字符（在某字符之后）
String.prototype.add = function (str, after) {
  return this.contain(after) ? this.replace(after, after + str) : this;
};

// 获取字符数组 
String.prototype.toCharArray = function() {
    return this.split("");
};

// 获取N个相同的字符串 
String.prototype.repeat = function(num) {
    var tmpArr = [];
    for ( var i = 0; i < num; i++)
        tmpArr.push(this);
    return tmpArr.join("");
};

// 逆序 
String.prototype.reverse = function() {
    return this.split("").reverse().join("");
};

// 测试是否是数字 
String.prototype.isNumeric = function() {
    var tmpFloat = parseFloat(this);
    if (isNaN(tmpFloat))
        return false;
    var tmpLen = this.length - tmpFloat.toString().length;
    return tmpFloat + "0".Repeat(tmpLen) == this;
};

// 测试是否是整数 
String.prototype.isInt = function() {
  if (this == "NaN") return false;
  return this == parseInt(this).toString();
};

// 合并多个空白为一个空白 
String.prototype.resetBlank = function() {
  return this.replace(/s+/g, " ");
};

// 除去左边空白 
String.prototype.LTrim = function() {
  return this.replace(/^s+/g, "");
};

// 除去右边空白 
String.prototype.RTrim = function() {
  return this.replace(/s+$/g, "");
};

// 保留数字 
String.prototype.getNum = function() {
  return this.replace(/[^d]/g, "");
};

// 保留字母 
String.prototype.getEn = function() {
  return this.replace(/[^A-Za-z]/g, "");
};

// 保留中文 
String.prototype.getCn = function() {
  return this.replace(/[^u4e00-u9fa5uf900-ufa2d]/g, "");
};

// 得到字节长度 
String.prototype.getRealLength = function() {
  return this.replace(/[^x00-xff]/g, "--").length;
};

// 从左截取指定长度的字串 
String.prototype.left = function(n) {
  return this.slice(0, n);
};

// 从右截取指定长度的字串 
String.prototype.right = function(n) {
  return this.slice(this.length - n);
};

// HTML编码 
String.prototype.HTMLEncode = function() {
  var re = this;
  var q1 = [ /x26/g, /x3C/g, /x3E/g, /x20/g ];
  var q2 = [ "&", "<", ">", " " ];
  for ( var i = 0; i < q1.length; i++)
    re = re.replace(q1[i], q2[i]);
  return re;
};

// Unicode转化 
String.prototype.ascW = function() {
  var strText = "";
  for ( var i = 0; i < this.length; i++)
    strText += "&#" + this.charCodeAt(i) + ";";
  return strText;
};