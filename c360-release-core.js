(()=>{
'use strict';
const VERSION='2026.09.20-r97-1';
const state={version:VERSION,startedAt:Date.now(),runtimeErrors:0,unhandledRejections:0,longTasks:0,lastLongTaskMs:0,enhanced:false};
window.__c360ReleaseHealth=state;

function ensureLiveRegion(){
  let el=document.getElementById('c360-release-live');
  if(el)return el;
  el=document.createElement('div');
  el.id='c360-release-live';
  el.setAttribute('role','status');
  el.setAttribute('aria-live','polite');
  el.setAttribute('aria-atomic','true');
  document.body.appendChild(el);
  return el;
}
function announce(text){const el=ensureLiveRegion();el.textContent='';requestAnimationFrame(()=>{el.textContent=String(text||'').slice(0,500)})}
function enhance(root=document){
  if(!root?.querySelectorAll)return;
  root.querySelectorAll('img').forEach((img,i)=>{
    if(!img.hasAttribute('decoding'))img.decoding='async';
    if(i>0&&!img.hasAttribute('loading'))img.loading='lazy';
    if(!img.hasAttribute('alt'))img.alt='';
  });
  root.querySelectorAll('a[target="_blank"]').forEach(a=>{
    const rel=new Set(String(a.rel||'').split(/\s+/).filter(Boolean));rel.add('noopener');rel.add('noreferrer');a.rel=[...rel].join(' ');
  });
  root.querySelectorAll('button:not([type])').forEach(b=>b.type='button');
  root.querySelectorAll('[aria-busy="true"]').forEach(el=>el.classList.add('c360-loading'));
  state.enhanced=true;
}
function scheduleEnhance(){
  const run=()=>enhance(document);
  if('requestIdleCallback'in window)requestIdleCallback(run,{timeout:900});else setTimeout(run,0);
}
function observeDom(){
  if(!('MutationObserver'in window))return;
  let pending=false;
  const obs=new MutationObserver(records=>{
    if(pending)return;pending=true;
    const run=()=>{pending=false;for(const r of records){for(const n of r.addedNodes){if(n.nodeType===1)enhance(n)}}};
    if('requestIdleCallback'in window)requestIdleCallback(run,{timeout:700});else setTimeout(run,50);
  });
  obs.observe(document.documentElement,{childList:true,subtree:true});
}
function observePerformance(){
  try{
    if('PerformanceObserver'in window&&PerformanceObserver.supportedEntryTypes?.includes('longtask')){
      const po=new PerformanceObserver(list=>{for(const e of list.getEntries()){state.longTasks++;state.lastLongTaskMs=Math.max(state.lastLongTaskMs,Math.round(e.duration))}});
      po.observe({type:'longtask',buffered:true});
    }
  }catch(_){}
  window.addEventListener('load',()=>{
    requestAnimationFrame(()=>{
      state.loadedAt=Date.now();
      state.interactiveMs=Math.max(0,state.loadedAt-state.startedAt);
      try{
        const nav=performance.getEntriesByType('navigation')[0];
        if(nav){state.domContentLoadedMs=Math.round(nav.domContentLoadedEventEnd);state.loadEventMs=Math.round(nav.loadEventEnd);state.transferBytes=nav.transferSize||0}
      }catch(_){}
    });
  },{once:true});
}
window.addEventListener('error',()=>{state.runtimeErrors++});
window.addEventListener('unhandledrejection',()=>{state.unhandledRejections++});
window.C360Release={version:VERSION,state,announce,enhance};

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{ensureLiveRegion();scheduleEnhance();observeDom()},{once:true});
else{ensureLiveRegion();scheduleEnhance();observeDom()}
observePerformance();
})();
