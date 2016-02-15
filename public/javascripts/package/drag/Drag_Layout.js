/**
 * Created by Administrator on 2016/1/19.
 */

/**
 * 每个布局可拖拽整体data-drag-key 设置获取对象的key值
 * <div data-drag="layout" data-drag-key="header--1">
 *  <header data-layout="head">
 *      <div class="jarviswidget-ctrls" data-drag-head="no-move">
 *          <a href="javascript:void(0)"><i class="iconfont">&#xe600;</i></a> 设置
 *          <a href="javascript:void(0)" data-original-title="Collapse"><i class="iconfont">&#xe602;</i></a> 收缩
 *          <a href="javascript:void(0)" data-original-title="Fullscreen"><i class="iconfont">&#xe603;</i></a> 全屏
 *          <a href="javascript:void(0)" data-original-title="Delete"><i class="iconfont">&#xe604;</i></a> 删除
 *      </div>
 *      <span class="widget">
 *          <i class="iconfont">&#xe601;</i>
 *      </span>
 *      <h2>header</h2>
 *  </header>
 *  <div data-layout="content"></div>
 *  </div>
 */
app.LoadFile('Drag_Layout', function () {
        var UtilTools = {
            ElementMethod: {
                getStyle: function (_obj, _name) {
                    var result;
                    //转换成小写
                    _name = _name.toLowerCase();
                    //获取样式值
                    if (_name && typeof value === 'undefined') {
                        //如果该属性存在于style[]中 （操作获取内联样式表 inline style sheets）
                        if (_obj.style && _obj.style[_name]) {
                            result = _obj.style[_name];
                        }
                        //操作嵌入样式表或外部样式表 embedded style sheets and linked style sheets
                        else if (_obj.currentStyle) {
                            // 否则 尝试IE的currentStyle
                            _name = _name.replace(/\-([a-z])([a-z]?)/ig, function (s, a, b) {
                                return a.toUpperCase() + b.toLowerCase();
                            });
                            result = _obj.currentStyle[_name];
                        }
                        //或者W3C的方法 如果存在的话 Firefox,Opera,safari
                        else if (document.defaultView && document.defaultView.getComputedStyle) {
                            //获取Style属性的值，如果存在
                            var w3cStyle = document.defaultView.getComputedStyle(_obj, null);
                            result = w3cStyle.getPropertyValue(_name);
                        }
                        if (result.indexOf('px') != -1) result = result.replace(/(px)/i, '');
                        return result;
                    }
                },
                isElement: function (ele) {
                    return ele.nodeType == 1 || ele.nodeType == 9;
                },
                setStyle: function (elem) {
                    var arg = arguments;
                    if (arg.length == 2 && typeof arg[1] == 'object') {
                        for (var att in arg[1]) {
                            elem.style[att] = arg[1][att];
                        }
                    } else if (arg.length == 3) {
                        elem.style[arg[1]] = arg[2];
                    }
                }
            },
            Position: {
                PositionedOffset: function (ele) {
                    var valueT = 0 , valueL = 0 , p;
                    do {
                        valueT += ele.offsetTop || 0;
                        valueL += ele.offsetLeft || 0;
                        ele = ele.offsetParent;
                        if (ele) {
                            if (ele.target == 'BODY') break;
                            p = UtilTools.ElementMethod.getStyle(ele, 'position');
                            if (p == 'relative' || p == 'absolute') break;
                        }
                    } while (ele);
                    return [valueL, valueT];
                },
                cumulativeOffset: function (ele) {
                    var valueT = 0 , valueL = 0;
                    do {
                        valueT += ele.offsetTop || 0;
                        valueL += ele.offsetLeft || 0;
                        ele = ele.offsetParent;
                    } while (ele);
                    return [valueL, valueT];
                }
            }
        };
        var bodyMove = false , DragElement = null , ghostElement = null , fullScreenParent, DragLayoutCache = {} , noKeyCount = 0, bodyEvent = null ,
            EndAnimation = null , LayoutNullCache = [];

        function DragLayout(element, elementHead) {
            this.elem = element;
            this.elemH = elementHead;
            this.position = null;
            this.cumulative = null;
            this.status = false;
            this.mouseOffset = [];
            this.ctrsFn = {};
        }

        DragLayout.bodyDragEvent = function () {
            if (!bodyEvent)bodyEvent = app.Event(document.body);
            bodyEvent.addEvent({
                'mousemove': DragLayout.drag,
                'mouseup': DragLayout.end
            });
            bodyMove = true;
        };

        /**
         * 获取距离当前正在拖拽的位置最近的layout对象
         * @param _distances
         * @param minDistances
         * @returns {*}
         */
        DragLayout.minDistances = function (_distances, minDistances) {
            var ite , minElement , iteDistances;
            for (var key in DragLayoutCache) {
                if (DragLayoutCache[key] === DragElement) continue;
                ite = DragLayoutCache[key];
                iteDistances = Math.sqrt(Math.pow(ite.position[0] - _distances[0], 2) +
                    Math.pow(ite.position[1] - _distances[1], 2));
                if (iteDistances < minDistances) {
                    minDistances = iteDistances;
                    minElement = ite;
                }
            }

            for (var i = 0 , ii = LayoutNullCache.length; i < ii; i++) {
                ite = LayoutNullCache[i];
                iteDistances = Math.sqrt(Math.pow(ite.position[0] - _distances[0], 2) +
                    Math.pow(ite.position[1] - _distances[1], 2));
                if (iteDistances <= minDistances) {
                    minDistances = iteDistances;
                    minElement = ite;
                    if (ite.elem.parentNode.children.length == 1)break;
                }
            }
            return minElement;
        };
        /**
         * 不能自身添加到自身
         * @param minElement
         */
        DragLayout.appendLayout = function(minElement){
            var e = minElement.elem , e1 = DragElement.elem;
            do{
                if(e === e1) return false;
                if(e.target == 'BODY') break;
                e = e.parentNode;
            }while(e);
            return true;
        };
        /**
         * 每次判断拖拽对象可放置位置
         * @param _distances
         */
        DragLayout.when_Drag = function (_distances) {
            var _ghostElement = DragLayout.getGhostElement() , _ghostElementPosition = UtilTools.Position.PositionedOffset(_ghostElement),
                minElement , parentNode;
            if ((minElement = DragLayout.minDistances(_distances, Math.sqrt(Math.pow(_ghostElementPosition[0] - _distances[0], 2) +
                Math.pow(_ghostElementPosition[1] - _distances[1], 2))))
                && DragLayout.appendLayout(minElement)
                && (parentNode = minElement.elem.parentNode)) {
                if (Math.abs(minElement.position[1] - _distances[1]) <= (minElement.elem.offsetHeight / 2)) {
                    parentNode.insertBefore(_ghostElement, minElement.elem);
                } else {
                    parentNode.replaceChild(_ghostElement, minElement.elem);
                    parentNode.insertBefore(minElement.elem, _ghostElement);
                }
                DragLayout.ResizeCount();
            }
        };
        /**
         * 重新设置所有layout位置
         * @constructor
         */
        DragLayout.ResizeCount = function () {
            for (var key in DragLayoutCache) {
                DragLayoutCache[key].resize();
            }
            for (var i = 0 , ii = LayoutNullCache.length; i < ii; i++) {
                LayoutNullCache[i].resize();
            }
        };
        /**
         * 点击layout的header时 触发该函数
         * @param event
         */
        DragLayout.start = function (event) {
            var _ghostElement, parent;
            if (EndAnimation != null) return;
            var dragLayout = DragElement = this.DragLayout; //layout的header中保存里他所属的laout对象
            if (DragElement.noDragHead(event.target || event.srcElement, event)) { //header中 某些标签点击时是不能被拖拽的 调用判断
                if (!bodyMove) DragLayout.bodyDragEvent(); //添加body的移动事件 以及鼠标弹起事件
                DragLayout.ResizeCount();
                _ghostElement = DragLayout.getGhostElement(dragLayout.elem) , parent = dragLayout.elem.parentNode;
                dragLayout.status = true;  //设置状态 为true时 鼠标移动 layout同样移动
                dragLayout.dragStart(event);  // 设置latyou中 自己的点击后操作
                parent.insertBefore(_ghostElement, dragLayout.elem); //将定位模块加入到layout前面
            }
        };
        /**
         * 移除完成后 重置layout信息
         * @param event
         */
        DragLayout.end = function (event) {
            if (!DragElement) return;
            DragElement.status = false;
            bodyEvent.removeEvent('mousemove', DragLayout.drag);
            bodyEvent.removeEvent('mouseup', DragLayout.end);
            DragElement.end(event);
            DragElement = null;
            bodyMove = false;
        };
        /**
         * 鼠标移动时调用函数
         * @param event
         * @returns {boolean}
         */
        DragLayout.drag = function (event) {
            var dragLayout = DragElement;
            if (!dragLayout || !dragLayout.status) return;
            DragLayout.when_Drag(dragLayout.drag(event.pageX, event.pageY)); // 每次移动调用函数
            event.preventDefault ? event.preventDefault() : event.returnValue = false; //阻止默认事件
            event.stopPropagation ? event.stopPropagation() : event.cancelBubble = true; //阻止事件冒泡
            return false;
        };
        /**
         * 获取定位layout位置的元素
         * @param ele
         * @returns {*}
         */
        DragLayout.getGhostElement = function (ele) {
            if (!ghostElement) {
                ghostElement = document.createElement('div');
                UtilTools.ElementMethod.setStyle(ghostElement, {
                    border: "1px dashed #666",
                    background: "rgb(252, 252, 203)",
                    margin: UtilTools.ElementMethod.getStyle(ele, 'margin')
                });
                ghostElement.innerHTML = "&nbsp;";
            }
            if (ele) ghostElement.style.height = ele.offsetHeight - 2 + 'px';
            return ghostElement;
        };
        DragLayout.removeLayout = function(key){
            if(key instanceof DragLayout){
                for(var att in DragLayoutCache){
                    if(DragLayoutCache[att] == key){
                        delete DragLayoutCache[att];
                        break;
                    }
                }
            }else if(typeof key == 'string' && DragLayout.hasOwnProperty(key)){
                delete DragLayoutCache[key];
            }else throw new Error('not found');
        };
        /**
         * 设置全屏时 创建外围包围的div标签 为固定定位
         * @returns {*}
         */
        DragLayout.getFullScreenParent = function () {
            if (!fullScreenParent) {
                fullScreenParent = document.createElement('div');
                fullScreenParent.id = 'jarviswidget-fullscreen-mode';
            }
            return fullScreenParent;
        };
        /**
         * 头部控制按钮对应事件 调用方式  标签中加入 data-original-title="Collapse"
         * @type {{Collapse: Collapse, Fullscreen: Fullscreen, Delete: Delete}}
         */
        DragLayout.originalFns = {
            Collapse: function (dragLayout, target, event) { //收缩
                var content = dragLayout.elem.querySelector('[data-layout="content"]');
                if (content) {
                    if (content.style.display != 'none'){
                        content.style.display = 'none';
                        target.innerHTML = '<i class="iconfont">&#xe613;</i>';
                    }
                    else {
                        content.style.display = 'block';
                        target.innerHTML = '<i class="iconfont">&#xe602;</i>';
                    }
                }
            },
            Fullscreen: function (dragLayout, target, event) { // 全屏
                var _fullScreenParent = DragLayout.getFullScreenParent() ,
                    fullStatus = target.fullStatus, ctrList = target.parentNode.children,
                    windowHeight = window.innerHeight || document.documentElement.clientHeight,
                    content = dragLayout.elem.querySelector('[data-layout="content"]'), parent;
                if (!fullStatus || fullStatus == void(0)) {
                    parent = dragLayout.elem.parentNode;
                    UtilTools.ElementMethod.setStyle(content, {
                        height: windowHeight - 34 + 'px',
                        display: 'block'
                    });
                    parent.replaceChild(_fullScreenParent, dragLayout.elem);
                    document.body.style.overflowY = 'hidden';
                    _fullScreenParent.appendChild(dragLayout.elem);
                    dragLayout.elemH.setAttribute('data-drag-head', "no-move");
                    target.fullStatus = true;
                    for (var i = 0 , len = ctrList.length; i < len; i++) {
                        if (ctrList[i] === target) continue;
                        ctrList[i].style.display = 'none';
                    }
                } else {
                    parent = _fullScreenParent.parentNode;
                    parent.replaceChild(dragLayout.elem, _fullScreenParent);
                    UtilTools.ElementMethod.setStyle(content, 'height', '');
                    UtilTools.ElementMethod.setStyle(document.body, 'overflowY', '');
                    target.fullStatus = false;
                    dragLayout.elemH.removeAttribute('data-drag-head');
                    for (var i = 0 , len = ctrList.length; i < len; i++) {
                        if (ctrList[i] === target) continue;
                        ctrList[i].style.display = '';
                    }
                }
            },
            Delete: function (dragLayout, target, event) { //删除
                dragLayout.elem.parentNode.removeChild(dragLayout.elem);
                DragLayout.removeLayout(dragLayout);
            }
        };
        /**
         * 初始化拖拽对象
         * @returns {DragLayout}
         * @private
         */
        DragLayout.prototype.__init__ = function () {
            var cumulative;
            this.__initHead__();
            cumulative = UtilTools.Position.cumulativeOffset(this.elem);
            this.position = UtilTools.Position.PositionedOffset(this.elem);
            this.cumulative = [ cumulative[0] - this.position[0]  , cumulative[1] - this.position[1]];
            return this;
        };
        /**
         * 头部点击时调用 返回false时 不可拖动
         * @param target
         * @param event
         * @returns {boolean}
         */
        DragLayout.prototype.noDragHead = function (target, event) {
            var originalFn;
            do {
                if (target == this.elemH.parentNode) return true;
                if (target.getAttribute('data-drag-head') == 'no-move') break;
                if ((originalFn = target.getAttribute('data-original-title')) != null) {
                    if (this.ctrsFn.hasOwnProperty(originalFn)) {
                        this.ctrsFn[originalFn].apply(target, [this, target, event]);
                    } else if (DragLayout.originalFns.hasOwnProperty(originalFn)) {
                        DragLayout.originalFns[originalFn].apply(target, [this, target, event]);
                    }
                }
                target = target.parentNode;
            } while (target);
            return false;
        };
        /**
         * 初始化head头信息
         * @private
         */
        DragLayout.prototype.__initHead__ = function () {
            if (!this.elemH || !UtilTools.ElementMethod.isElement(this.elemH)) return;
            this.elemH.style.cursor = 'move';
            this.elemH.DragLayout = this;
            this.elemH.onmousedown = DragLayout.start;
        };
        /**
         * 拖拽时调用 设置当前自己的信息
         * @param event
         */
        DragLayout.prototype.dragStart = function (event) {
            this.mouseOffset[0] = event.offsetX;
            this.mouseOffset[1] = event.offsetY;
            UtilTools.ElementMethod.setStyle(this.elem, {
                width: this.elem.offsetWidth + 'px',
                height: this.elem.offsetHeight + 'px',
                position: 'absolute',
                top: this.position[1] + 'px',
                left: this.position[0] + 'px'
            });
            this.elem.classList.add('position');
        };
        /**
         * 拖拽时调用 设置element的位置
         * @param pageX
         * @param pageY
         * @returns {*[]}
         */
        DragLayout.prototype.drag = function (pageX, pageY) {
            var top = pageY - this.mouseOffset[1] - this.cumulative[1] ,
                left = pageX - this.mouseOffset[0] - this.cumulative[0];
            UtilTools.ElementMethod.setStyle(this.elem, {
                top: top + 'px',
                left: left + 'px'
            });
            return [left , top];
        };
        /**
         * 重置对象
         * @returns {DragLayout}
         */
        DragLayout.prototype.resize = function () {
            var cumulative = UtilTools.Position.cumulativeOffset(this.elem);
            this.position = UtilTools.Position.PositionedOffset(this.elem);
            this.cumulative = [ cumulative[0] - this.position[0] , cumulative[1] - this.position[1]];
            return this;
        };
        /**
         * 拖拽完成后 设置位置
         */
        DragLayout.prototype.moveEnd = function () {
            var _ghostElement = DragLayout.getGhostElement();
            _ghostElement.parentNode.replaceChild(this.elem, _ghostElement);
            UtilTools.ElementMethod.setStyle(this.elem, {
                width: '',
                height: '',
                position: '',
                top: '',
                left: ''
            });
            this.elem.classList.remove('position');
            this.resize();
        };
        /**
         * 拖拽完成后动画效果
         */
        DragLayout.prototype.end = function () {
            var elem = this.elem , _ghostElement = DragLayout.getGhostElement(),
                _ghostElementPosition = UtilTools.Position.PositionedOffset(_ghostElement) ,
                EndLeft = _ghostElementPosition[0], EndTop = _ghostElementPosition[1] ,
                startLeft = parseInt(elem.style.left) , startTop = parseInt(elem.style.top),
                addLeft = (EndLeft - startLeft) / 20 , addTop = (EndTop - startTop) / 20 ,
                _this = this;
            EndAnimation = setInterval(function () {
                startLeft += addLeft;
                startTop += addTop;
                elem.style.left = startLeft + 'px';
                elem.style.top = startTop + 'px';
                if (Math.abs(EndLeft - startLeft) <= Math.abs(addLeft) * 2) {
                    clearInterval(EndAnimation);
                    EndAnimation = null;
                    _this.moveEnd();
                }
            }, 15);
        };
        DragLayout.prototype.regLayoutCtr = function (name, fn) {
            this.ctrsFn[name] = fn;
        };
        /**
         * 每个布局元素中添加的标签 防止布局元素中没有可拖动对象时 能够添加拖拽对象进布局
         * @returns {HTMLElement}
         */
        function createDataLayoutNoBlock() {
            var e = document.createElement('b');
            e.setAttribute('data-drag', 'layout');
            e.setAttribute('data-layout', 'no-block');
            e.style.display = 'inline';
            e.innerHTML = '';
            return e;
        }

        function addLayout(element) {
            var key = element.getAttribute('data-drag-key') , layout ,
                header = element.querySelector('header[data-layout="head"]'),
                nodeBlock = element.getAttribute('data-layout');
            if (nodeBlock == 'no-block') {
                LayoutNullCache.push(new DragLayout(element, header).__init__());
            } else {
                if (!header || !key) key = 'noKey_' + (noKeyCount++);
                if (!DragLayoutCache.hasOwnProperty(key))
                    DragLayoutCache[key] = layout = new DragLayout(element, header).__init__();
            }
            return layout;
        }

        /**
         * 暴露外部调用方法
         * @param selctor 外围的查找css类
         * @returns {{getDragLayouts: getDragLayouts, regOriginal: regOriginal, regLayoutCtr: regLayoutCtr, addLayout: addLayout}}
         * @private
         */
        return function _init_DragLayout(selctor) {
            var noBlock , LayoutArr, Argicle = document.querySelectorAll(selctor) , addArgicle;
            for (var k = 0 , kk = Argicle.length; k < kk; k++) {
                k == 0 && (addArgicle = Argicle[k]);
                if (Argicle[k].querySelectorAll('[data-layout="no-block"]').length == 0) {
                    noBlock = createDataLayoutNoBlock();
                    if (Argicle[k].children.length > 0) Argicle[k].insertBefore(noBlock, Argicle[k].firstElementChild || Argicle[k].firstChild);
                    else Argicle[k].appendChild(noBlock);
                }
            }
            LayoutArr = document.querySelectorAll(selctor + ' > [data-drag="layout"]');
            for (var i = 0 , ii = LayoutArr.length; i < ii; i++) addLayout(LayoutArr[i]);
            return {
                getDragLayouts: function () { //获取所有可拖拽对象
                    return DragLayoutCache;
                },
                regOriginal: function (name, fn) { //设置拖拽对象均可执行的方法 ctrs区域
                    DragLayout.regOriginal(name, fn);
                },
                regLayoutCtr: function (key, name, fn) { //注册单独的可拖拽 的按钮事件
                    if (DragLayoutCache.hasOwnProperty(key)) DragLayoutCache[key].regLayoutCtr(name, fn);
                },
                addLayout: function (element) { // 添加一个layout
                    var div;
                    if(typeof element == 'string'){
                        div = document.createElement('div');
                        div.innerHTML = element;
                        element = div.firstElementChild || div.firstChild;
                    }
                    if(UtilTools.ElementMethod.isElement(element)) {
                        var children = addArgicle.children , noBlock;
                        if (children.length == 0 || children.length == 1)addArgicle.appendChild(element);
                        else addArgicle.insertBefore(element, children[1]);
                        return addLayout(element);
                    }else throw  new Error('not is node or string');
                }
            }
        }
    }
);