/**
 * Created by Administrator on 2016/1/11.
 */
"use strict";
(function (app) {
    function type(obj) {
        return Object.prototype.toString.call(obj).replace(/\[object\s{1}([a-zA-Z_0-9]+)\]$/ig, "$1");
    }

    function isFunction(fn) {
        return type(fn) == "Function";
    }

    function isObj(obj) {
        return type(obj) == "Object";
    }

    function isString(str) {
        return type(str) == 'String';
    }

    function isBoolean(b) {
        return type(b) == 'Boolean';
    }

    var isArray = Array.isArray || function (arr) {
        return type(arr) == 'Array';
    };

    function forEach(dts, fn, _self) {
        var key , length , _self = _self || dts;
        if (isFunction(dts)) {
            for (key in dts) {
                if (key != 'name' && key != "length" && key != 'constructor' && (!dts.hasOwnProperty || !dts.hasOwnProperty(key))) {
                    fn.call(_self, dts[key], key);
                }
            }
        } else if (isArray(dts)) {
            for (key = 0 , length = dts.length; key < length; key++) {
                fn.call(_self, dts[key], key);
            }
        } else {
            for (key in dts) {
                fn.call(_self, dts[key], key);
            }
        }
        return dts;
    }

    Function.prototype.extend = function(superFn){
        if(!isFunction(superFn)) throw new Error('super is not function');
        if(this instanceof superFn) return this;
        var prototype = new Function() , subFnPrototype = this.prototype;
        prototype.prototype = superFn.prototype;
        this.prototype = new prototype();
        forEach(subFnPrototype , function(fn , name){
            this.prototype[name] = fn;
        },this);
        this.prototype.constructor = this;
        return this;
    };

    function cache() {
    }

    cache.prototype.get = function (key) {
        return this[key];
    };
    cache.prototype.regiest = function (key, value) {
        if (!this.hasOwnProperty(key)) this[key] = value;
        return value;
    };
    cache.prototype.remove = function (key) {
        var value = this[key];
        if (this.hasOwnProperty(key)) delete this[key];
        return value;
    };
    cache.prototype.each = function (fn) {
        forEach(this, fn);
        return this;
    };
    var regFnCache = new cache();
    /**
     *  用法传递一个key 函数名称 已经fn 函数引用
     *  场景 用于注册一个函数 方便在加载文件时 需要从其他已经加载的文件中获取函数引用
     *       不污染全局变量
     *  app.regFn('han' , function(require,exports){
     *
     *   });
     */
    app.regFn = function (key, fn) {
        regFnCache.regiest.apply(regFnCache, arguments);
    };

    app.Event = app.Event || function () {
        var guid = 0 , origFns = {};

        function isNode(element) {
            return element.nodeType == 1 || element.nodeType == 9;
        }

        function addHandler(element, type, fn) {
            if (element.addEventListener) {
                element.addEventListener(type, fn, false);
            } else if (element.attachEvent) {
                element.attachEvent('on' + type, fn);
            } else element['on' + type] = fn;
        }

        function removeHandler(element, type, fn) {
            if (element.removeEventListener) {
                element.removeEventListener(type, fn, false);
            } else if (element.detachEvent) {
                element.detachEvent('on' + type, fn);
            } else element['on' + type] = null;
        }

        function getEvent(event) {
            return event ? event : window.event;
        }

        function handler(element, fn) {
            if (fn.guid) return origFns[fn.guid];
            var origFn = fn;
            fn = function (event) {
                event = event || window.event;
                return origFn.apply(this, [getEvent(event)]);
            };
            origFn.guid = guid++;
            origFns[origFn.guid] = fn;
            return fn;
        }

        function event(element) {
            var nodeList;
            if (isNode(element)) nodeList = [element];
            else if (isArray(element)) nodeList = element;
            else throw new Error('Incorrect parameter type');
            for (var key = 0 , l = nodeList.length; key < l; key++) {
                this[key] = element;
            }
            this.length = l;
        }

        event.prototype.addEvent = function (type, fn) {
            var typeArr;
            if (isString(type)) {
                typeArr = type.split(" ");
                if (isFunction(fn)) forEach(typeArr, function (t) {
                    this.each(function (node, key) {
                        addHandler(node, t, handler(node, fn));
                    });
                }, this);
                else throw  new Error('param is not function');
            } else if (isObj(type)) {
                forEach(type, function (fn, key) {
                    this.addEvent(key, fn);
                }, this);
            }
            return this;
        };
        event.prototype.removeEvent = function (type, fn) {
            var orgFn = origFns[fn.guid];
            if (!orgFn) throw new Error('element not AddEvent function');
            this.each(function (node, key) {
                removeHandler(node, type, orgFn);
            });
            return this;
        };
        event.prototype.each = function (fn) {
            for (var i = 0 , len = this.length; i < len; i++) {
                fn.call(this[i], this[i], i);
            }
            return this;
        };
        return function Event(element) {
            return new event(element);
        };
    }();
    /*
     app.runFn = function (key) {
     var self = arguments[1] || window  , arg = arguments[2] || [] , fn;
     if (arguments.length == 0) throw new Error('Incorrect number of parameters or type');
     if (isString(key)) {
     fn = regFnCache.get(key);
     if (!isFunction(fn)) throw new Error('app.regFn not registration name is ' + fn + ' function');
     } else throw new Error(key + 'not is String');
     return fn.apply(self, arg);
     };
     */

    /**
     * 用法 1 // 第一个参数是数组 需要加载文件集合 第二个参数是通过app.regiestFn注册的函数名 ， 第3个参数是加载方式
     * 场景 通常用于js执行的入口函数 不需要其他文件进行引用
     * app.LoadFile(['test.js'],'han',false);
     * app.regiestFn('han' , function(require,exports){
     *     setTimeout(function(){
     *          app.LoadFile(['test3.js'],function(require,exports){
     *               console.log(require('test3.js'));
     *           }); ,2000);
     *       });
     *  }
     *
     *  用法2 第一个参数是一个对象 key代表与文件对应的名称 fileList代表加载文件 第2个参数代表加载完成执行函数 第3个参数代表加载方式
     *  场景 作为一个模块 用于其他模块或者入口函数引用 引用方式 require(key + '.js')
     *
     *  函数内部同样可以加载文件 注意：加载文件只能作为一个入口函数 不能定义为模块 也就是不能出现key 否则出现不可预知错误
     *  app.LoadFile({
     *       key: 'test',
     *       fileList: ['test1.js', 'test3.js']
     *   }, function (require, exports) {
     *       exports.name = require('test1.js').test;
     *       app.LoadFile(['test1.js'],function(require , exports){
     *           exports.test = {name:"test"};
     *       },false);
     *   }, false);
     *
     *
     *   用法3 第一个参数是代表这个模块科被其他文件引用 引用方式同用法2 后两个参数同用法1 用法2
     *   场景 作为一个最基本的模块 不包含其他引用文件
     *   app.LoadFile('test3',function(require , exports){
     *       exports.test = {name:"test"};
     *   },false);
     *
     *   注意事项 模块直接不能相互引用  否则会造成死锁现象
     *   如：
     *   app.LoadFile({
     *       key: 'test',
     *       fileList: ['test1.js']
     *   },'han1',false);
     *   app.LoadFile({
     *       key: 'test1',
     *       fileList: ['test.js']
     *   },'han2',false);
     *
     *   注意事项 加载完成后执行的函数 也就是第二个参数 如果返回值将对该模块的exports值改变
     */
    app.LoadFile = app.LoadFile || function () {
        var host = document.getElementById('app').src.replace(/app\.js$/gi, "");

        /**
         * @param url 加载文件的url
         * @param callBack 加载完成回调函数
         */
        function loadJfILEs(url, callBack) {
            var _this = this , fileNode = document.createElement('script'),
                fun = function () {
                    document.body.removeChild(fileNode);
                    callBack && callBack.call(_this, url);
                },
                funErr = function () {
                    callBack && callBack.call(_this, url);
                };
            if (fileNode.readyState)
                fileNode.onreadystatechange = function () {
                    if (fileNode.readyState == "loaded" || fileNode.readyState == "complete") {
                        fileNode.onreadystatechange = null;
                        fun();
                    }
                };
            else fileNode.onload = fun , fileNode.onerror = funErr;
            fileNode.src = url;
            document.body.appendChild(fileNode);
        }

        function FileCache() {
        }

        FileCache.prototype = new cache();
        FileCache.prototype.getExports = function (key) {
            key = /\.js/gi.test(key) ? key : key + '.js';
            return File.FileCache.get(File.FormatUrl(key)).exports;
        };

        function File(url) {
            this.url = url; //文件url
            this.loadCallBacks = []; //加载完成时 通知队列
            this.runCallBacks = []; //执行完成时 通知队列
            this.fitness = 0; //未加载 1 正在加载 2 正在执行 3 执行完成 4加载完成
            this.exports = {}; //文件中的对象{}
            this.fileManage = null; // 关联的manage对象
        }

        /**
         * 所有文件缓存
         */
        File.FileCache = new FileCache();
//        Object.defineProperty(File, 'FileCache', {
//            value: new FileCache(),
//            configurable: true,
//            writable: true
//        });
        /**
         * 格式化文件url
         */
        File.FormatUrl = function (url) {
            url = /http:\/\/|https:\/\//ig.test(url) ? url : host + url;
            return url;
        };
        /**
         * 添加加载完成通知函数
         * @param fn
         * @returns {File}
         * @constructor
         */
        File.prototype.AddLoadCallBack = function (fn) {
            for (var key = 0 , len = this.loadCallBacks.length; key < len; key++) {
                if (this.loadCallBacks[key].fn == fn) return this;
            }
            this.loadCallBacks.push({
                fitness: 0, // 0为通知未加载完成 1完成
                fn: fn
            });
        };
        /**
         * 添加执行完成通知函数
         * @param fn
         * @returns {File}
         * @constructor
         */
        File.prototype.AddRunCallBack = function (fn) {
            for (var key = 0 , len = this.runCallBacks.length; key < len; key++) {
                if (this.runCallBacks[key].fn == fn) return this;
            }
            this.runCallBacks.push({
                fitness: 0, // 0为通知未执行完成 1完成
                fn: fn
            });
        };
        /**
         * 执行fn函数
         * @param fn
         */
        File.prototype.runCallBackFn = function (fn) {
            if (fn.fitness == 0) {
                fn.fn(this.url, this);
                fn.fitness = 1;
            }
        };
        /**
         * 遍历fnList中的fn对象
         * @param fnList
         */
        File.prototype.each = function (fnList) {
            forEach(fnList, function (fn) {
                this.runCallBackFn(fn);
            }, this);
            return [];
        };
        /**
         * 加载完成时 通知对应的manage 告诉他我加载完成了
         * @constructor
         */
        File.prototype.RunDefine = function () {
            this.loadCallBacks = this.each(this.loadCallBacks);
            if (this.fileManage && this.fileManage.defineFitness) {
                this.fileManage.rCB();
                this.fileManage = null;
            }
            else this.run();
        };
        /**
         * 加载当前文件
         * @constructor
         */
        File.prototype.Load = function () {
            if (this.fitness == 0) {
                this.fitness = 1;
                loadJfILEs.call(this, this.url, function () {
                    this.RunDefine();
                    this.fitness = 4;
                });
            } else if (this.fitness >= 2) {
                this.RunDefine();
            }
        };
        /**
         * 执行运行完成通知
         */
        File.prototype.run = function () {
            if (this.fitness == 1) {
                this.fitness = 2;
                this.runCallBacks = this.each(this.runCallBacks);
                this.fitness = 3;
            } else if (this.fitness == 4) {
                this.runCallBacks = this.each(this.runCallBacks);
            }
        };

        /**
         * 文件管理类
         * @param define
         * @param file
         * @param fitness
         * @constructor
         */
        function FileManage(define, file, fitness) {
            this.fileList = {}; //文件列表
            this.count = 0; // 关联个数
            this.lnumber = 0; //加载完成个数
            this.rnumber = 0;// 执行完成个数
            this.define = define; // 依赖执行完成 回调函数
            this.file = file; //属于哪一个文件
            this.fitness = fitness == void(0) || fitness == true; // 同步 或者异步
            this.defineFitness = true; //当前文件依赖回调是否已经执行
        }

        forEach({
            AddFile: function (url, key, file) { //添加文件到对象
                if (this.fitness) key = url; //异步方式 添加文件列表 key值为url
                if (this.fileList.hasOwnProperty(key)) return; //同步方式 key值为列表顺序
                this.fileList[key] = file;
                this.count++;
            },
            RunDefine: function (fn) { //执行依赖完成后函数
                var exports = null , fn = fn || this.define; //函数后获得返回值
                if (this.defineFitness && fn) { //加载完成后 存在依赖函数时执行
                    //如果依赖是一个函数 直接执行
                    if (isFunction(fn)) exports = fn.apply(window, [File.FileCache.getExports , (this.file && (this.file.exports || {})) || {}]);
                    else if (isArray(fn)) { //依赖为数组 迭代数组
                        forEach(fn, function (fnArr, key) {
                            //得到值 递归执行函数
                            exports = this.RunDefine(fnArr);
                        }, this);
                    } else if (isString(fn)) { //如果是字符串 通过获取缓存中的函数
                        var defineFn = regFnCache.get(fn);
                        if (!isFunction(defineFn)) throw  new Error('app.regFn not registration name is ' + fn + ' function');
                        return this.RunDefine(defineFn);
                    }
                }
                return exports;
            },
            LoadCallBack: function () {
                var _this = this;
                // 通过工厂函数 获取文件加载完成后的回调函数
                return function (url, file) {
                    _this.lnumber++;
                    //如果同步加载的话 当获取完成回调也后执行同步加载函数
                    if (!_this.fitness) _this.Synchronization();
                }
            },
            RunCallBack: function () { // 执行完成后 得到返回消息
                var _this = this;
                _this.rCB = function (url, file) {
                    var exports;
                    if (!!url || !!file) _this.rnumber++;
                    if (_this.rnumber == _this.count) {
                        exports = _this.RunDefine();
                        exports !== _this && _this.file && (_this.file.exports = exports);
                        _this.defineFitness = false;
                        if (_this.file) _this.file.run();
                        _this.file = null;
                    }
                };
                return _this.rCB;
            },
            CreateSynchronization: function (loadCallBack, runCallBack) {//同步加载
                var loadCallBack = loadCallBack , runCallBack = runCallBack , _this = this;
                this.Synchronization = function () {
                    var file;
                    if (_this.lnumber < _this.count) {
                        file = _this.fileList[_this.lnumber];
                        file.AddLoadCallBack(loadCallBack);//给文件添加加载完成后通知队列
                        file.AddRunCallBack(runCallBack);//给文件添加执行完成后通知队列
                        file.Load(); // 加载文件
                    } else if (_this.lnumber == _this.count && !this.file) {
                        runCallBack();
                    }
                };
                return this.Synchronization;
            },
            Asynchronous: function (loadCallBack, runCallBack) {//异步加载
                var status = true;
                forEach(this.fileList, function (file, url) {
                    status = false;
                    file.AddLoadCallBack(loadCallBack);
                    file.AddRunCallBack(runCallBack);
                    file.Load();
                }, this);
                if (status && this.lnumber == this.count && !this.file)  runCallBack();
            },
            Load: function () { //加载所以依赖
                var loadCallBack = this.LoadCallBack() , runCallBack = this.RunCallBack();
                if (this.fitness) {
                    this.Asynchronous(loadCallBack, runCallBack);
                } else {
                    this.CreateSynchronization(loadCallBack, runCallBack)();
                }
            }
        }, function (fn, name) {
            this[name] = function () {
                var returnValue = fn.apply(this, arguments);
                return returnValue == void(0) ? this : returnValue;
            }
        }, FileManage.prototype);

        /**
         * 处理获取到的参数
         * @param options
         * @returns {{fileList: *, key: *}}
         * @constructor
         */
        function ProcessingLoadFileArgument(options) {
            var fileList , key;
            if (isObj(options)) {
                if (isString(options.key) && options.key != '') key = /.js$/ig.test(options.key) ? options.key : options.key + '.js';
                if (isArray(options.fileList)) fileList = options.fileList;
                else if (isString(options.fileList)) fileList = [options.fileList];
                else fileList = [];
            } else if (isArray(options)) {
                fileList = options;
            } else if (isString(options) && options != '') {
                /.js$/ig.test(options) ? fileList = [options] : key = options + '.js' , fileList = [];
            } else fileList = [];
            return {
                fileList: fileList,
                key: key
            }
        }

        /**
         * 处理fileManage 与 file直接的关联 完成后加载fileManage
         * 一个fileManage对应保护零到多个模块 ， 如果key存在的话 对应所在文件的文件对象 File
         * 一个File对应对应一个fileManage 通过fileManage的key值关联
         * key值不存在 则这个fileManage作为一个入口函数 key存在则作为一个模块 可以被外部引用
         * @param options
         * @param define
         * @param status
         */
        function loadFile(options, define, status) {
            var fileCache = File.FileCache , formatUrl = File.FormatUrl , fileManage , AssociatedFile;
            AssociatedFile = fileCache.get(formatUrl(options.key));
            fileManage = new FileManage(define, AssociatedFile, status);
            fileManage.file && (fileManage.file.fileManage = fileManage);
            forEach(options.fileList, function (url, key) {
                var fileName = url.split('/').pop().split('.').shift() + '.js' , pathUrl = formatUrl(url);
//                var fileName = url;
                var fileCacheFileName = formatUrl(fileName),
                    file = fileCache.get(fileCacheFileName) || fileCache.regiest(fileCacheFileName, new File(pathUrl));
                if (file.url != pathUrl) throw new Error('path: ' + pathUrl);
                fileManage.AddFile(fileCacheFileName, key, file);
            });
            fileManage.Load();
        }

        return function LoadFile(options, define, status) {
            if(arguments.length == 1 && isFunction(options)){
                define = options;
                options = null;
            }else if (arguments.length == 2 && isBoolean(arguments[1])) throw  new Error('Incorrect number of parameters or type');
            loadFile(ProcessingLoadFileArgument(options), define, status);
        };
    }();
})(window.app || (window.app = {}));