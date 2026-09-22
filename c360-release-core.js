(()=>{
'use strict';
const VERSION='2026.09.22-r100-1';
const state={version:VERSION,startedAt:Date.now(),runtimeErrors:0,unhandledRejections:0,longTasks:0,lastLongTaskMs:0,enhanced:false,lastUnhandledFingerprint:'',lastUnhandledAt:0};
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
    const run=()=>{pending=false;for(const r of records){for(const n of r.addedNodes){if(n.nodeType===1)enhance(n)}};scheduleFieldSync()};
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
function isDeviceMode(){return !!document.body?.classList.contains('device-mode')}
function fieldHome(){return document.querySelector('body.device-mode .team-home')}
function ensureFieldSyncStatus(){
  if(!isDeviceMode())return null;
  const home=fieldHome();if(!home)return null;
  let el=document.getElementById('c360FieldSyncStatus');
  if(!el){
    el=document.createElement('div');el.id='c360FieldSyncStatus';el.setAttribute('role','status');el.setAttribute('aria-live','polite');
    el.innerHTML='<div class="c360-sync-main"><span class="c360-sync-dot"></span><span class="c360-sync-label">Verificando sincronização…</span></div><span class="c360-sync-time"></span>';
  }
  const head=home.querySelector('.team-home-head');
  if(head&&el.parentElement!==home)head.insertAdjacentElement('afterend',el);
  else if(head&&head.nextElementSibling!==el)head.insertAdjacentElement('afterend',el);
  else if(!el.parentElement)home.prepend(el);
  return el;
}
function chatPendingCount(){
  let total=0;
  try{
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i)||'';
      if(!key.startsWith('c360_team_chat_queue_v1_'))continue;
      try{const value=JSON.parse(localStorage.getItem(key)||'[]');if(Array.isArray(value))total+=value.length}catch(_){}
    }
  }catch(_){}
  return total;
}
async function offlinePendingCount(){
  let total=0;
  try{
    if(typeof window.offlineQueueList==='function'){
      const q=await window.offlineQueueList();
      if(Array.isArray(q))total+=q.length;
    }else if(typeof offlineQueueList==='function'){
      const q=await offlineQueueList();
      if(Array.isArray(q))total+=q.length;
    }
  }catch(_){}
  return total+chatPendingCount();
}
let syncTimer=0,syncRunning=false;
async function refreshFieldSyncStatus(){
  if(syncRunning)return;syncRunning=true;
  try{
    const el=ensureFieldSyncStatus();if(!el)return;
    const online=navigator.onLine!==false;
    const pending=await offlinePendingCount();
    let mode='ok',label='✓ Sem pendências',detail='Online';
    if(!online){mode='offline';label=pending?`⚠ Offline • ${pending} pendente${pending===1?'':'s'}`:'⚠ Offline';detail='Salvando no celular quando disponível'}
    else if(pending){mode='pending';label=`⟳ ${pending} registro${pending===1?'':'s'} aguardando envio`;detail='Sincronização automática'}
    el.dataset.state=mode;
    const l=el.querySelector('.c360-sync-label'),t=el.querySelector('.c360-sync-time');if(l)l.textContent=label;if(t)t.textContent=detail;
  }finally{syncRunning=false}
}
function scheduleFieldSync(){clearTimeout(syncTimer);syncTimer=setTimeout(refreshFieldSyncStatus,80)}

const RAPID_ACTION_MS=1800;
function isCriticalAction(btn){
  if(!btn||btn.disabled)return false;
  if(btn.closest('#c360ChatOverlay')||btn.id==='c360ChatSend'||btn.matches('[data-c360-enable-location]'))return false;
  const id=String(btn.id||'').toLowerCase();
  const text=String(btn.textContent||'').trim().toLowerCase();
  const data=[...btn.attributes].map(a=>a.name).join(' ').toLowerCase();
  if(/savepoultry|savefuel|savefin|saveattendance|finish|finalize|confirm/.test(id))return true;
  if(/data-c360-save|data-save|data-confirm/.test(data))return true;
  return /^(salvar|finalizar|registrar|confirmar|concluir)(\b|\s)/.test(text);
}
function installRapidActionGuard(){
  document.addEventListener('click',event=>{
    const btn=event.target?.closest?.('button,.btn');if(!isCriticalAction(btn))return;
    const now=Date.now(),until=Number(btn.dataset.c360RapidUntil||0);
    if(until>now){
      event.preventDefault();event.stopImmediatePropagation();
      announce('A ação já foi enviada. Aguarde a conclusão.');
      return;
    }
    btn.dataset.c360RapidUntil=String(now+RAPID_ACTION_MS);
    setTimeout(()=>{if(Number(btn.dataset.c360RapidUntil||0)<=Date.now())delete btn.dataset.c360RapidUntil},RAPID_ACTION_MS+80);
  },true);
}
function visible(el){
  if(!el)return false;
  try{const s=getComputedStyle(el);return s.display!=='none'&&s.visibility!=='hidden'&&el.getClientRects().length>0}catch(_){return false}
}
function currentRoute(){
  try{
    const explicit=String(
      document.body?.dataset?.screen||
      document.body?.dataset?.route||
      document.documentElement?.dataset?.screen||
      document.documentElement?.dataset?.route||
      window.currentScreen||window.currentRoute||''
    ).replace(/^#/,'').trim();
    if(explicit)return explicit;

    // Relatórios recebe tratamento especial porque já houve rejeição real capturada em produção.
    const reports=document.getElementById('relatorios');
    if(reports?.classList.contains('active')&&visible(reports))return 'relatorios';

    const active=[...document.querySelectorAll('[data-screen].active,.screen.active,.section.active,main [id].active')]
      .find(el=>visible(el)&&!el.matches('button,a,[role="button"]'));
    if(active?.dataset?.screen)return String(active.dataset.screen).replace(/^#/,'');
    if(active?.id)return active.id;

    const nav=document.querySelector('[aria-current="page"][data-screen],[aria-current="page"][data-go],[aria-current="page"][href^="#"]');
    if(nav?.dataset?.screen)return nav.dataset.screen;
    if(nav?.dataset?.go)return nav.dataset.go;
    return String(nav?.getAttribute('href')||'').replace(/^#/,'');
  }catch(_){return''}
}
function errorFingerprint(reason,route){
  const raw=String(reason?.message||reason||'erro').slice(0,240);let h=2166136261;
  for(const ch of route+'|'+raw){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}
  return (h>>>0).toString(36);
}
function notifyRuntimeFailure(reason,route){
  const fp=errorFingerprint(reason,route),now=Date.now();
  if(state.lastUnhandledFingerprint===fp&&now-state.lastUnhandledAt<8000)return;
  state.lastUnhandledFingerprint=fp;state.lastUnhandledAt=now;
  const title=route==='relatorios'?'Relatório não concluído':'O Comando 360 encontrou uma falha';
  const msg=route==='relatorios'?'A tela continua disponível. Tente novamente; se persistir, atualize o relatório.':'A tela continua disponível. Tente novamente.';
  try{if(typeof window.c360Toast==='function')window.c360Toast(title,msg,'error')}catch(_){}
  announce(title+'. '+msg);
}

window.addEventListener('error',()=>{state.runtimeErrors++});
window.addEventListener('unhandledrejection',event=>{state.unhandledRejections++;notifyRuntimeFailure(event.reason,currentRoute())});
window.addEventListener('online',scheduleFieldSync);
window.addEventListener('offline',scheduleFieldSync);
window.addEventListener('storage',scheduleFieldSync);
document.addEventListener('c360:screen-changed',scheduleFieldSync);
document.addEventListener('c360:bootstrap-ready',scheduleFieldSync);
window.C360Release={version:VERSION,state,announce,enhance,refreshFieldSyncStatus,offlinePendingCount,currentRoute};

function start(){ensureLiveRegion();scheduleEnhance();observeDom();installRapidActionGuard();scheduleFieldSync();setInterval(scheduleFieldSync,12000)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
observePerformance();
})();