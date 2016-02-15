/**
 * Created by Administrator on 2016/1/19.
 */
app.LoadFile({
    key: 'UtilTools',
    fileList: document.querySelectorAll ? [] : ['package/jquery/sizzle.js']
}, function (require, exports) {
    var ElementMethod = exports.ElementMethod = {
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
        isElement:function(ele){
            return ele.nodeType == 1 || ele.nodeType == 9;
        }
    };


    var Position = exports.Position = {
        PositionedOffset: function (ele) {
            var valueT = 0 , valueL = 0 , p;
            do {
                valueT += ele.offsetTop || 0;
                valueL += ele.offsetLeft || 0;
                ele = ele.offsetParent;
                if (ele) {
                    if (ele.target == 'BODY') break;
                    p = ElementMethod.getStyle(ele, 'position');
                    if (p == 'relative' || p == 'absolute') break;
                }
            } while (ele);
            return [valueL, valueT];
        },
        cumulativeOffset:function(ele){
            var valueT = 0 , valueL = 0 , p;
            do {
                valueT += ele.offsetTop || 0;
                valueL += ele.offsetLeft || 0;
                ele = ele.offsetParent;
            } while (ele);
            return [valueL, valueT];
        }
    };
});