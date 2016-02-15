/**
 * Created by Administrator on 2016/1/25.
 */
app.LoadFile('menu', function () {
    function type(obj) {
        return Object.prototype.toString.call(obj).replace(/\[object\s{1}([a-zA-Z_0-9]+)\]$/ig, "$1");
    }

    function isElement(ele) {
        return ele.nodeType == 1 || ele.nodeType == 9;
    }

    function createElement(target, className, info) {
        target = document.createElement(target);
        if (type(className) == 'String')target.className = className;
        if (info) {
            if (type(info) == 'String') target.innerHTML = info;
            else if (isElement(info)) target.appendChild(info);
        }
        return target;
    }

    function Menu(options, data) {
        this.container = options.container;
        this.data = data;
        this.JumpCallBack = options.JumpCallBack;
        this.active = null;
    }

    function createMenuIcon(info) {
        return createElement('i', 'iconfont', info);
    }

    function createMenuChildIcon(info) {
        var icon = createElement('b', 'iconfont', info);
        if (!icon.hasOwnProperty('data')) icon.data = {};
        icon.data.target = 'icon';
        return icon;
    }

    function createMenuA(name, address, icon, status, attrs) {
        var a = createElement('a', '', '<span>' + name + '</span>');
        a.href = 'javascript:void(0)';
        if (icon && icon != '') a.insertBefore(createMenuIcon(icon), a.lastChild);
        if (status) {
            a.appendChild(createMenuChildIcon('&#xe608;'));
            if (!a.hasOwnProperty('data')) a.data = {};
            a.data.openStatus = false;
            a.data.jumpStatus = true;
        } else if (address) a.setAttribute('data-href', address);
        if (attrs) {
            for (var key in attrs) {
                a.setAttribute(key, attrs[key]);
            }
        }
        return a;
    }

    function openMenu(li, a, status) {
        var icon = a.lastElementChild || a.lastChild;
        if (!status) {
            li.className = li.className + ' open';
            if (icon.data && icon.data.target == 'icon') icon.innerHTML = '&#xe609;';
        }
        else if (status) {
            li.className = li.className.replace(/\s{1}open$/, '');
            if (icon.data && icon.data.target == 'icon') icon.innerHTML = '&#xe608;';
        }
        a.data.openStatus = !a.data.openStatus;
    }

    function JumpFn() {
        var _this = this;
        return function (event) {
            var target = event.target || event.srcElement;
            do {
                if (target.tagName == 'A') break;
                else if (target == _this.container) return;
                target = target.parentNode;
            } while (target);
            if (target.data && target.data.jumpStatus) {
                openMenu(target.parentNode, target, target.data.openStatus);
            } else {
                if(!!_this.JumpCallBack){
                    _this.JumpCallBack(target, target.getAttribute('data-href'), event);
                }
                if (_this.active) _this.active.className = _this.active.className.replace(/\s{1}active$/, '');
                target.parentNode.className += ' active';
                _this.active = target.parentNode;
            }
        };
    }

    function DataIsArr(el, data) {
        for (var i = 0 , len = data.length; i < len; i++) {
            if (type(data[i] == 'Object')) {
                el.appendChild(DataIsObj.call(this, createElement('li'), data[i]));
            }
        }
    }

    function DataIsObj(el, data) {
        var status , listUl;
        if (data.childList) status = true;
        el.appendChild(createMenuA(data.name, data.address, data.icon, status, data.attrs));
        if (status) {
            listUl = createElement('ul');
            AnalyticalData.call(this , listUl, data.childList);
            el.appendChild(listUl);
        } else if (data.active && this.active == null) {
            el.className = ' active';
            this.active = el;
        }
        return el;
    }

    function AnalyticalData(el, data){
        if (data == void(0)) {
            data = this.data;
            el = createElement('ul');
        }
        if (type(data) == 'Array') DataIsArr.call(this, el, data);
        return el;
    }

    Menu.prototype.__init__ = function () {
        var a;
        this.container.appendChild(AnalyticalData.call(this));
        if (this.active != null) {
            a = this.active;
            do {
                a = a.parentNode;
                if (a == this.container) break;
                else if (a.tagName == 'LI') {
                    openMenu(a, a.firstElementChild || a.firstChild, false);
                }
            } while (a);
        }
        app.Event(this.container).addEvent('click', JumpFn.call(this));
        return this;
    };
    return function menu(options, data) {
        return new Menu(options, data).__init__();
    };
});