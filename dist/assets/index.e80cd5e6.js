import{b as u,m as r,p as h,f,s as q,a as w,g as L}from"./vendor.91a92236.js";const k=function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const t of document.querySelectorAll('link[rel="modulepreload"]'))l(t);new MutationObserver(t=>{for(const s of t)if(s.type==="childList")for(const d of s.addedNodes)d.tagName==="LINK"&&d.rel==="modulepreload"&&l(d)}).observe(document,{childList:!0,subtree:!0});function o(t){const s={};return t.integrity&&(s.integrity=t.integrity),t.referrerpolicy&&(s.referrerPolicy=t.referrerpolicy),t.crossorigin==="use-credentials"?s.credentials="include":t.crossorigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function l(t){if(t.ep)return;t.ep=!0;const s=o(t);fetch(t.href,s)}};k();const E=()=>{let n=u({height:"100%",width:"100%"}).class,e=u({display:"grid","grid-template-columns":"1fr 1fr 1fr 1fr","overflow-y":"auto",height:"100%"}).class,o=u({"margin-left":"0.25em"}),l=u({"margin-left":"0.5em"});u({"grid-column":"1 / -1","background-color":"lightgrey"}),document.body.classList.add(n);let t=1,s=new Date().getMonth();return{view:({attrs:{nestedData:d}})=>r(`div.${e}`,Object.keys(d).map((m,N)=>{let y=h(m).getMonth(),v=u({"background-color":r.cls({lightgrey:y!==s,palegreen:y===s}),"grid-area":`${t}/1/${t+1}/-1`,position:"sticky",top:0,left:0});t++;let b=Object.keys(d[m]).flatMap(j=>d[m][j].map((p,O)=>{let g=u({"font-size":"0.85em","grid-row":`${t}/${t+1}`});return t++,[!(O>0)&&r(`div.${g}`,{style:"grid-column:1/2"},r(`span.${l}`,f(p.date,"EEE, do"))),r(`div.${g}`,{style:"grid-column:2/3"},p.series),r(`div.${g}`,{style:"grid-column:3/5"},p.track)]}));return[r(`div.${v}`,r(`span.${o}`,f(h(m),"MMMM YYY")))].concat(b)}))}};function $(n,e){if(!e.length)return n;var o=e[0],l=e.slice(1);return w(L(n,o),function(t){return $(t,l)})}let c=[],a={background:!0},i="https://one-site.github.io",M={};Promise.all([r.request(`${i}/data/ertm.json`,a),r.request(`${i}/data/mrs.json`,a),r.request(`${i}/data/mvshofs.json`,a),r.request(`${i}/data/nwmt.json`,a),r.request(`${i}/data/nyirp.json`,a),r.request(`${i}/data/opnm.json`,a).then(n=>n.map(e=>Object.assign(e,{series:"OPNM"}))),r.request(`${i}/data/roc.json`,a).then(n=>n.map(e=>Object.assign(e,{series:"ROC"}))),r.request(`${i}/data/smart.json`,a),r.request(`${i}/data/ttom.json`,a).then(n=>n.map(e=>Object.assign(e,{series:"TTOM"})))]).then(n=>{c=n.flatMap(e=>e),c.reduce((e,o,l)=>(o.date=h(o.date),o.id=l,e),c),c=c.sort((e,o)=>e.date-o.date),M=$(c.map(e=>(e.m=f(q(e.date),"yyyy-MM-dd"),e.dt=f(e.date,"dd-MMM-yyyy"),e)),["m","dt"]),r.redraw()});r.mount(document.body,{view:()=>r(E,{nestedData:M})});