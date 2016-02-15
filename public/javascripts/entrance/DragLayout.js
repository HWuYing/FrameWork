/**
 * Created by Administrator on 2016/1/12.
 */
app.LoadFile([
    'package/drag/Drag_Layout.js'
], function (require) {
    var Layout = require('Drag_Layout')('argicle');
    function Test(dragLayout, target, event){
        alert('test');
    }
    Layout.regLayoutCtr('header--1','Test',Test);
    app.Event(document.querySelector('#add-layout')).addEvent('click',function(){
        Layout.addLayout(document.querySelector('#text-layout').innerHTML).regLayoutCtr('Test',Test);
    });
});