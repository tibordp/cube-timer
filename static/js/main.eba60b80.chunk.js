(this["webpackJsonpcube-timer"]=this["webpackJsonpcube-timer"]||[]).push([[0],{104:function(e,t,n){"use strict";n.r(t);var r,a=n(2),c=n(0),i=n.n(c),s=n(15),o=n.n(s),u=(n(76),n(10)),l=n(35),d=n.n(l),j=(n(77),n(12)),v=n.n(j),f=n(27),O="eb0e77c3-af14-4b7f-ac80-d3631dc386ac";!function(e){e[e.NOT_CONNECTED=0]="NOT_CONNECTED",e[e.CONNECTING=1]="CONNECTING",e[e.CONNECTED=2]="CONNECTED",e[e.FAILED=3]="FAILED"}(r||(r={}));var b=n(54);function h(e,t){switch(t.action){case"push":if(e[t.timerState.epoch]===t.timerState.duration)return e;var n=Object(b.a)({},e);return 0!==t.timerState.duration?n[t.timerState.epoch]=t.timerState.duration:delete n[t.timerState.epoch],n;case"delete":var r=Object(b.a)({},e);return delete r[t.epoch],r;case"clear":return{};case"initialize":return t.initialData}}function N(e){var t=i.a.useReducer(h,{}),n=Object(u.a)(t,2),r=n[0],a=n[1];i.a.useEffect((function(){a({action:"push",timerState:e})}),[e]);var c=i.a.useMemo((function(){return function(e){var t=Object.entries(e).map((function(e){var t=Object(u.a)(e,2),n=t[0],r=t[1];return[parseInt(n),r]})).sort((function(e,t){return t[0]-e[0]})),n=t.map((function(e){var t=Object(u.a)(e,2),n=(t[0],t[1]);return-1===n?1/0:n})),r=n.length>0?n.reduce((function(e,t){return Math.min(e,t)}),1/0):void 0,a=n.slice(0,5).sort((function(e,t){return e-t})),c=5===a.length?a.slice(1,4).reduce((function(e,t){return e+t}),0)/3:void 0,i=n.slice(0,12).sort((function(e,t){return e-t})),s=12===i.length?i.slice(1,11).reduce((function(e,t){return e+t}),0)/10:void 0;return{orderedHistory:t,best:r===1/0?-1:r,avg5:c===1/0?-1:c,avg12:s===1/0?-1:s}}(r)}),[r]);return i.a.useEffect((function(){a({action:"initialize",initialData:JSON.parse(window.localStorage.getItem("history")||"{}")})}),[]),i.a.useEffect((function(){console.log(r),window.localStorage.setItem("history",JSON.stringify(r))}),[r]),[c,a]}var m=n(121),p=n(124),x=n(122),C=n(125),E=n(123),g=n(67),S=n.n(g),k=n(45),T=n.n(k),y=n(68),D=n.n(y),I=n(66),w=n.n(I);function F(e){return-1===e?"DNF":new Date(Math.max(0,e)).toISOString().substr(14,9).replace(/^[0:]+(?!\.)/,"")}function A(){var e=i.a.useState(0),t=Object(u.a)(e,2),n=t[0],r=t[1],c=i.a.useRef(),s=i.a.useRef(),o=i.a.useCallback((function(e){if(void 0!==s.current){var t=e-s.current;r((function(e){return e+t}))}s.current=e,c.current=requestAnimationFrame(o)}),[]);return i.a.useEffect((function(){return c.current=requestAnimationFrame(o),function(){return cancelAnimationFrame(c.current)}}),[o]),Object(a.jsx)("span",{className:"running",children:F(n)})}function L(e){var t=e.timerState,n=t.state,r=t.duration,c=n>=20&&n<30,i=n>=10&&n<20,s=!c&&!i;return Object(a.jsxs)(a.Fragment,{children:[s&&0!==r&&Object(a.jsx)(a.Fragment,{children:F(r)}),s&&0===r&&Object(a.jsx)(a.Fragment,{children:"Ready!"}),c&&Object(a.jsx)(A,{}),i&&Object(a.jsx)("span",{className:"inspection",children:"Inspection"})]})}var G=function(){var e,t=function(){var e=i.a.useState(r.NOT_CONNECTED),t=Object(u.a)(e,2),n=t[0],a=t[1],c=i.a.useState(null),s=Object(u.a)(c,2),o=s[0],l=s[1],d=i.a.useState({state:0,epoch:0,duration:0}),j=Object(u.a)(d,2),b=j[0],h=j[1],N=i.a.useCallback(Object(f.a)(v.a.mark((function e(){var t;return v.a.wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return a(r.CONNECTING),e.prev=1,e.next=4,navigator.bluetooth.requestDevice({filters:[{services:[O]}]});case 4:t=e.sent,l(t),e.next=11;break;case 8:e.prev=8,e.t0=e.catch(1),a(r.NOT_CONNECTED);case 11:case"end":return e.stop()}}),e,null,[[1,8]])}))),[]),m=i.a.useCallback(Object(f.a)(v.a.mark((function e(){var t,n,c,i;return v.a.wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return e.prev=0,a(r.CONNECTING),e.next=4,null===(t=o.gatt)||void 0===t?void 0:t.connect();case 4:return e.next=6,null===(n=o.gatt)||void 0===n?void 0:n.getPrimaryService(O);case 6:return c=e.sent,e.next=9,null===c||void 0===c?void 0:c.getCharacteristic("eb0e77c3-af14-4b7f-ac80-d3631dc386ad");case 9:return(i=e.sent).oncharacteristicvaluechanged=function(){var e=i.value.getUint32(0,!0),t=i.value.getUint32(4,!0),n=i.value.byteLength>4?i.value.getInt32(8,!0):0;h({state:e,epoch:t,duration:n})},e.next=13,null===i||void 0===i?void 0:i.readValue();case 13:null===i||void 0===i||i.startNotifications(),a(r.CONNECTED),e.next=21;break;case 17:e.prev=17,e.t0=e.catch(0),console.error(e.t0),a(r.FAILED);case 21:case"end":return e.stop()}}),e,null,[[0,17]])}))),[o]),p=function(){var e=Object(f.a)(v.a.mark((function e(){return v.a.wrap((function(e){for(;;)switch(e.prev=e.next){case 0:l(null);case 1:case"end":return e.stop()}}),e)})));return function(){return e.apply(this,arguments)}}();return i.a.useEffect((function(){return o?(m().then((function(){return o.addEventListener("gattserverdisconnected",m)})),function(){var e;o.removeEventListener("gattserverdisconnected",m),null===(e=o.gatt)||void 0===e||e.disconnect()}):(a(r.NOT_CONNECTED),function(){})}),[m]),{connect:N,disconnect:p,connectionState:n,timerState:b}}(),n=t.connect,c=t.disconnect,s=t.connectionState,o=t.timerState,l=N(o),j=Object(u.a)(l,2),b=j[0],h=b.orderedHistory,g=b.best,k=b.avg5,y=b.avg12,I=j[1];return e=s===r.CONNECTED||s===r.CONNECTING,i.a.useEffect((function(){return e?(function(){var e=Object(f.a)(v.a.mark((function e(){return v.a.wrap((function(e){for(;;)switch(e.prev=e.next){case 0:return e.prev=0,e.next=3,navigator.wakeLock.request("screen");case 3:t=e.sent,console.info("We have the wake lock."),t.addEventListener("release",(function(){console.info("We no longer have the wake lock.")})),e.next=11;break;case 8:e.prev=8,e.t0=e.catch(0),console.error(e.t0);case 11:case"end":return e.stop()}}),e,null,[[0,8]])})));return function(){return e.apply(this,arguments)}}()(),function(){var e;null===(e=t)||void 0===e||e.release()}):function(){};var t}),[e]),Object(a.jsxs)(a.Fragment,{children:[Object(a.jsx)("div",{className:"statusDisplay",children:s===r.CONNECTED&&Object(a.jsx)(L,{timerState:o})}),Object(a.jsxs)(w.a,{className:"card",children:[Object(a.jsxs)(m.a,{className:"stats",children:[Object(a.jsx)(p.a,{dense:!0,children:Object(a.jsx)(C.a,{primary:"Best",secondary:void 0!==g?F(g):"-"})}),Object(a.jsx)(p.a,{dense:!0,children:Object(a.jsx)(C.a,{primary:"Avg 5",secondary:void 0!==k?F(k):"-"})}),Object(a.jsx)(p.a,{dense:!0,children:Object(a.jsx)(C.a,{primary:"Avg 12",secondary:void 0!==y?F(y):"-"})})]}),Object(a.jsxs)(m.a,{className:"results",children:[h.map((function(e){var t=Object(u.a)(e,2),n=t[0],r=t[1],c="list-label-".concat(n);return Object(a.jsxs)(p.a,{role:void 0,dense:!0,children:[Object(a.jsx)(C.a,{id:c,primary:F(r)}),Object(a.jsx)(x.a,{children:Object(a.jsx)(E.a,{edge:"end","aria-label":"comments",children:Object(a.jsx)(S.a,{onClick:function(){return I({action:"delete",epoch:n})}})})})]},n)})),Object(a.jsx)(p.a,{role:void 0,dense:!0,disabled:0===h.length,onClick:function(){return I({action:"clear"})},button:!0,children:Object(a.jsx)(C.a,{primary:"Clear history"})})]})]}),s===r.FAILED&&Object(a.jsx)(a.Fragment,{children:Object(a.jsx)(d.a,{startIcon:Object(a.jsx)(T.a,{}),onClick:n,children:"Connect"})}),s===r.NOT_CONNECTED&&Object(a.jsx)(a.Fragment,{children:Object(a.jsx)(d.a,{startIcon:Object(a.jsx)(T.a,{}),variant:"contained",color:"primary",onClick:n,children:"Connect"})}),s===r.CONNECTING&&Object(a.jsx)(a.Fragment,{children:Object(a.jsx)(d.a,{startIcon:Object(a.jsx)(T.a,{}),variant:"contained",disabled:!0,color:"primary",onClick:n,children:"Connecting..."})}),s===r.CONNECTED&&Object(a.jsx)(d.a,{startIcon:Object(a.jsx)(D.a,{}),variant:"contained",color:"default",onClick:c,children:"Disconnect"})]})};o.a.render(Object(a.jsx)(i.a.StrictMode,{children:Object(a.jsx)(G,{})}),document.getElementById("root"))},76:function(e,t,n){},77:function(e,t,n){}},[[104,1,2]]]);
//# sourceMappingURL=main.eba60b80.chunk.js.map