import{b as c,m as o,f,p as h,s as M,a as w,g as q}from"./vendor.060c2f12.js";const E=function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const t of document.querySelectorAll('link[rel="modulepreload"]'))n(t);new MutationObserver(t=>{for(const a of t)if(a.type==="childList")for(const u of a.addedNodes)u.tagName==="LINK"&&u.rel==="modulepreload"&&n(u)}).observe(document,{childList:!0,subtree:!0});function r(t){const a={};return t.integrity&&(a.integrity=t.integrity),t.referrerpolicy&&(a.referrerPolicy=t.referrerpolicy),t.crossorigin==="use-credentials"?a.credentials="include":t.crossorigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function n(t){if(t.ep)return;t.ep=!0;const a=r(t);fetch(t.href,a)}};E();function v(s,e=0){let r=e;return Array.isArray(s)?s.length:(Object.values(s).forEach(n=>{r+=v(n)}),r)}const L=()=>{let s=c({height:"100%",width:"100%","overflow-y":"auto"}).class,e=c({display:"grid","grid-template-columns":"1fr 1fr 1fr 1fr"}).class;c({"grid-column":"1 / -1","background-color":"lightgrey"}),document.body.classList.add(s);let r=1;return{_view:()=>o("div","Grouped"),view:({attrs:{nestedData:n}})=>o(`div.${e}`,Object.keys(n).map((t,a)=>{let u=c({"background-color":"lightgrey","grid-area":`${r}/1/${r+1}/-1`,position:"sticky",top:0,left:0});r++;let b=Object.keys(n[t]).flatMap(O=>{let y=n[t][O];return y.map((m,j)=>{console.log("mtfunc",v(y));let p=c({"font-size":"0.85em","grid-row":`${r}/${r+1}`});return r++,[!(j>0)&&o(`div.${p}`,{style:"grid-column:1/2"},f(m.date,"EEE, do")),o(`div.${p}`,{style:"grid-column:2/3"},m.series),o(`div.${p}`,{style:"grid-column:3/5"},m.track)]})});return[o(`div.${u}`,f(h(t),"MMMM YYY"))].concat(b)}))}};console.log("Hello world from App.js");function $(s,e){if(!e.length)return s;var r=e[0],n=e.slice(1);return w(q(s,r),function(t){return $(t,n)})}let d=[],l={background:!0},i="https://one-site.github.io",g={};Promise.all([o.request(`${i}/data/ertm.json`,l),o.request(`${i}/data/mrs.json`,l),o.request(`${i}/data/mvshofs.json`,l),o.request(`${i}/data/nwmt.json`,l),o.request(`${i}/data/nyirp.json`,l),o.request(`${i}/data/opnm.json`,l).then(s=>s.map(e=>Object.assign(e,{series:"OPNM"}))),o.request(`${i}/data/roc.json`,l).then(s=>s.map(e=>Object.assign(e,{series:"ROC"}))),o.request(`${i}/data/smart.json`,l),o.request(`${i}/data/ttom.json`,l).then(s=>s.map(e=>Object.assign(e,{series:"TTOM"})))]).then(s=>{console.log("promise all: ",s),d=s.flatMap(e=>e),d.reduce((e,r,n)=>(r.date=h(r.date),r.id=n,e),d),d=d.sort((e,r)=>e.date-r.date),g=$(d.map(e=>(e.m=f(M(e.date),"yyyy-MM-dd"),e.dt=f(e.date,"dd-MMM-yyyy"),e)),["m","dt"]),o.redraw()});o.mount(document.body,{view:()=>(console.log("allEvents",d,g),o(L,{nestedData:g}))});window.DEBUG={m:o};
