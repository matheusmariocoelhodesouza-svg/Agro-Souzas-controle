(()=>{
'use strict';
if(window.C360Platform)return;

const VERSION='2026.09.13-platform1';
const doc=document;

function safeStorage(storage){
 return {
  get(key,fallback=null){try{const raw=storage.getItem(key);return raw==null?fallback:JSON.parse(raw)}catch(_){return fallback}},
  set(key,value){try{storage.setItem(key,JSON.stringify(value));return true}catch(_){return false}},
  remove(key){try{storage.removeItem(key);return true}catch(_){return false}}
 };
}
function escapeHtml(value){
 return String(value??'').replace(/[&<>'"]/g,ch=>({
  '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
 }[ch]));
}
function debounce(fn,wait=120){
 let timer;
 return (...args)=>{clearTimeout(timer);timer=setTimeout(()=>fn(...args),wait)};
}
function throttle(fn,wait=120){
 let last=0,timer=null,pendingArgs=null;
 return (...args)=>{
  const now=Date.now();
  const run=()=>{last=Date.now();timer=null;fn(...(pendingArgs||args));pendingArgs=null};
  if(now-last>=wait){pendingArgs=args;run();return}
  pendingArgs=args;
  if(!timer)timer=setTimeout(run,wait-(now-last));
 };
}
function emit(name,detail={}){doc.dispatchEvent(new CustomEvent(name,{detail}))}
function on(name,handler,options){doc.addEventListener(name,handler,options);return()=>doc.removeEventListener(name,handler,options)}
function once(name,handler){return on(name,handler,{once:true})}
function uid(prefix='c360'){return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`}
function formatCurrency(value){
 const n=Number(value||0);
 try{return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number.isFinite(n)?n:0)}catch(_){return `R$ ${n.toFixed(2).replace('.',',')}`}
}
function formatNumber(value,decimals=0){
 const n=Number(value||0);
 try{return new Intl.NumberFormat('pt-BR',{minimumFractionDigits:decimals,maximumFractionDigits:decimals}).format(Number.isFinite(n)?n:0)}catch(_){return String(n)}
}
function formatDateTime(value,options={}){
 if(!value)return '—';
 const d=value instanceof Date?value:new Date(value);
 if(Number.isNaN(d.getTime()))return '—';
 try{return new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short',...options}).format(d)}catch(_){return d.toLocaleString('pt-BR')}
}
function wait(ms){return new Promise(resolve=>setTimeout(resolve,ms))}
async function withBusy(control,task,label='Processando…'){
 const el=typeof control==='string'?doc.querySelector(control):control;
 const originalText=el?.textContent;
 const originalDisabled=el?.disabled;
 if(el){el.disabled=true;el.setAttribute('aria-busy','true');if(label)el.textContent=label}
 try{return await task()}
 finally{
  if(el){el.disabled=!!originalDisabled;el.removeAttribute('aria-busy');if(originalText!=null)el.textContent=originalText}
 }
}
function networkState(){return navigator.onLine===false?'offline':'online'}
function activeScreen(){return doc.querySelector('#screenHost .section.active,#screenHost [data-screen].active,.section.active:not([hidden])')?.id||null}
function mark(name){try{performance.mark(name)}catch(_){}}
function measure(name,start,end){try{performance.measure(name,start,end);return performance.getEntriesByName(name).at(-1)?.duration||0}catch(_){return 0}}

const api={
 version:VERSION,
 local:safeStorage(localStorage),
 session:safeStorage(sessionStorage),
 escapeHtml,debounce,throttle,emit,on,once,uid,
 formatCurrency,formatNumber,formatDateTime,wait,withBusy,
 networkState,activeScreen,mark,measure
};
Object.freeze(api);
window.C360Platform=api;
emit('c360:platform-ready',{version:VERSION});
})();
