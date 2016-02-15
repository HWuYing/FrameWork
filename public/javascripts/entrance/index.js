/**
 * Created by Administrator on 2016/1/12.
 */
var menuList =  [
    {
        name: 'DASHBOARD',
        icon: '&#xe60b;',
        address: '#',
        active:true
    },
    {
        name: 'UI ELEMENTS',
        icon: '&#xe60e;',
        childList: [
            {
                name: 'Flot Chart',
                address: '#'
            },
            {
                name: 'Flot Chart',
                childList: [
                    {
                        name: 'Flot Chart',
                        address: '#'
                    },
                    {
                        name: 'Flot Chart',
                        address: '#'
                    }
                ]
            },
            {
                name: 'Flot Chart',
                address: '#'
            }
        ]
    },
    {
        name: 'TABLES',
        icon: '&#xe60d;',
        childList: []
    },{
        name: 'MAIL',
        icon: '&#xe611;',
        childList: []
    },{
        name: 'PAGES',
        icon: '&#xe60f;',
        childList: []
    },{
        name: 'FOUR LEVEL DROP DOWN',
        icon: '&#xe612;',
        childList: []
    }
];


app.LoadFile(['package/menu/menu.js'], function (require) {
    var frame = document.querySelector('#main-frame'),menu = require('menu')({
        container: document.querySelector('#menu'),
        JumpCallBack:function(target , href){

        }
    },menuList);
    console.log(menu);
});