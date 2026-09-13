(()=>{
'use strict';

const RECOVERY_VERSION='2026.09.13-ar1';
const EVENTS_KEY='c360_autorecovery_events_v1';
const STATE_KEY='c360_autorecovery_state_v1';
const SAFE_KEY='c360_autorecovery_safe_mode_v1';
const DRAFT_KEY='c360_autorecovery_draft_v1';
const RELOAD_GUARD_KEY='c360_autorecovery_reload_guard_v1';
const MAX_EVENTS=80;
const REPEAT_WINDOW_MS=90*1000;
const RECOVERY_WINDOW_MS=10*60*1000;
const RELOAD_GUARD_MS=20*1000;
const SAFE_MODE_MS=30*60*1000;
const startedAt=Date.now();
let recoveryInFlight=false;
let criticalSinceBoot=false;
let pendingRecoveryReason='';
let flushTimer=null;

function readJson(storage,key,fallback){
 try{
  const raw=storage.getItem(key);
  if(!raw)return fallback;
  const value=JSON.parse(raw);
  return value==null?fallback:value;
 }catch(_){return fallback}
}
function writeJson(storage,key,value){try{storage.setItem(key,JSON.stringify(value));return true}catch(_){return false}}
function clip(value,max=1800){return String(value==null?'':value).slice(0,max)}
function sanitizeText(value,max=1800){
 let s=clip(value,max);
 s=s.replace(/Bearer\s+[A-Za-z0-9._~+\/-]{20,}/gi,'Bearer [redacted]');
 s=s.replace(/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/g,'[jwt-redacted]');
 s=s.replace(/([?&](?:token|apikey|key|access_token|refresh_token|code)=)[^&#\s]+/gi,'$1[redacted]');
 return s;
}
function hashText(text){
 let h=2166136261;
 const s=String(text||'');
 for(let i=0;i<s.length;i++){
  h^=s.charCodeAt(i);
  h=Math.imul(h,16777619);
 }
 return (h>>>0).toString(36);
}
function getBuild(){
 try{return document.getElementById('buildBadge')?.textContent?.trim()||document.querySelector('title')?.textContent?.trim()||'v7.02'}catch(_){return 'v7.02'}
}
function getMode(){
 try{
  if(document.body?.classList.contains('device-mode'))return 'field';
  if(document.body?.classList.contains('app-ready'))return 'admin';
  if(document.getElementById('login'))return 'entry';
 }catch(_){}
 return 'unknown';
}
function getRoute(){
 try{
  return document.querySelector('#screenHost .section.active')?.id||document.querySelector('.section.active')?.id||document.getElementById('headerModuleTitle')?.textContent?.trim()||location.pathname;
 }catch(_){return location.pathname}
}
function isSafeMode(){
 const saved=readJson(localStorage,SAFE_KEY,null);
 if(saved&&Number(saved.until||0)>Date.now())return true;
 const p=new URLSearchParams(location.search);
 return p.get('c360_safe')==='1';
}
window.__c360SafeMode=isSafeMode();
window.__c360RecoveryVersion=RECOVERY_VERSION;

function runtimeIdentity(){
 let cid=null,tid=null,did=null;
 try{if(typeof companyId!=='undefined'&&companyId)cid=companyId}catch(_){}
 try{
  if(typeof deviceAccess!=='undefined'&&deviceAccess){
   tid=deviceAccess.team_id||null;
   did=deviceAccess.id||null;
   cid=cid||deviceAccess.company_id||null;
  }
 }catch(_){}
 return {company_id:cid,team_id:tid,device_access_id:did};
}
function context(extra={}){
 return {
  path:location.pathname,
  route:getRoute(),
  mode:getMode(),
  online:navigator.onLine!==false,
  visibility:document.visibilityState||'unknown',
  build:getBuild(),
  bootstrap:window.__c360Bootstrap?.version||null,
  safe_mode:!!window.__c360SafeMode,
  platform:clip(navigator.userAgent,240),
  ...extra
 };
}
function eventFingerprint(kind,message,source,line){
 return hashText([kind,sanitizeText(message,500),sanitizeText(source,260),line||0].join('|'));
}
function loadEvents(){const rows=readJson(localStorage,EVENTS_KEY,[]);return Array.isArray(rows)?rows:[]}
function saveEvents(rows){writeJson(localStorage,EVENTS_KEY,(rows||[]).slice(-MAX_EVENTS))}
function queueEvent(evt){
 const rows=loadEvents();
 rows.push(evt);
 saveEvents(rows);
 scheduleFlush();
 return evt;
}
function updateEvent(id,patch){
 const rows=loadEvents();
 const i=rows.findIndex(x=>x.id===id);
 if(i>=0){rows[i]={...rows[i],...patch};saveEvents(rows)}
}
function countRecentFingerprint(fp){
 const min=Date.now()-REPEAT_WINDOW_MS;
 return loadEvents().filter(x=>x.fingerprint===fp&&Number(x.ts||0)>=min).length;
}
function record(kind,error,meta={}){
 const err=error instanceof Error?error:null;
 const message=sanitizeText(meta.message||err?.message||error||kind);
 const source=sanitizeText(meta.source||err?.fileName||'',360);
 const line=Number(meta.line||err?.lineNumber||0)||0;
 const fp=eventFingerprint(kind,message,source,line);
 const evt={
  id:'ar-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8),
  ts:Date.now(),
  reported_at:new Date().toISOString(),
  kind,
  severity:meta.severity||'error',
  fingerprint:fp,
  message,
  source,
  line,
  column:Number(meta.column||0)||0,
  stack:sanitizeText(meta.stack||err?.stack||'',4200),
  recovery_action:meta.recovery_action||null,
  recovered:meta.recovered??null,
  sent_at:null,
  context:context(meta.context||{})
 };
 queueEvent(evt);
 if(evt.severity==='critical')criticalSinceBoot=true;
 return evt;
}

function toRemotePayload(evt){
 const id=runtimeIdentity();
 if(!id.company_id)return null;
 return {
  company_id:id.company_id,
  team_id:id.team_id,
  device_access_id:id.device_access_id,
  reported_at:evt.reported_at,
  app_version:getBuild(),
  recovery_version:RECOVERY_VERSION,
  mode:evt.context?.mode||getMode(),
  route:clip(evt.context?.route||getRoute(),180),
  kind:clip(evt.kind,80),
  severity:['info','warning','error','critical'].includes(evt.severity)?evt.severity:'error',
  fingerprint:clip(evt.fingerprint,100),
  message:sanitizeText(evt.message,1800),
  stack:sanitizeText(evt.stack,3800),
  recovery_action:clip(evt.recovery_action||'',120)||null,
  recovered:typeof evt.recovered==='boolean'?evt.recovered:null,
  context:{...(evt.context||{}),source:clip(evt.source,240),line:evt.line||0,column:evt.column||0}
 };
}
async function flushRemote(){
 if(navigator.onLine===false)return false;
 if(typeof restInsert!=='function')return false;
 const rows=loadEvents();
 let changed=false;
 for(const evt of rows.filter(x=>!x.sent_at).slice(0,12)){
  const payload=toRemotePayload(evt);
  if(!payload)break;
  try{
   await restInsert('v2_client_health_events',payload);
   evt.sent_at=new Date().toISOString();
   changed=true;
  }catch(_){break}
 }
 if(changed)saveEvents(rows.filter(x=>!x.sent_at||Date.now()-new Date(x.sent_at).getTime()<24*60*60*1000));
 return changed;
}
function scheduleFlush(delay=4000){
 clearTimeout(flushTimer);
 flushTimer=setTimeout(()=>flushRemote().catch(()=>{}),delay);
}

function swTarget(){
 return navigator.serviceWorker?.controller||null;
}
async function postToSW(type,payload={},timeout=4500){
 if(!('serviceWorker' in navigator))return {ok:false,reason:'unsupported'};
 let target=swTarget();
 if(!target){
  try{const reg=await navigator.serviceWorker.ready;target=reg.active||reg.waiting||reg.installing}catch(_){}
 }
 if(!target)return {ok:false,reason:'no-worker'};
 return await new Promise(resolve=>{
  const channel=new MessageChannel();
  let done=false;
  const finish=v=>{if(done)return;done=true;clearTimeout(timer);resolve(v||{ok:false})};
  const timer=setTimeout(()=>finish({ok:false,reason:'timeout'}),timeout);
  channel.port1.onmessage=e=>finish(e.data||{ok:true});
  try{target.postMessage({type,...payload},[channel.port2])}catch(e){finish({ok:false,reason:e?.message||String(e)})}
 });
}

function recoveryState(){
 const s=readJson(localStorage,STATE_KEY,{attempts:[],pending:null});
 s.attempts=Array.isArray(s.attempts)?s.attempts:[];
 s.attempts=s.attempts.filter(t=>Date.now()-Number(t||0)<RECOVERY_WINDOW_MS);
 return s;
}
function saveRecoveryState(s){writeJson(localStorage,STATE_KEY,s)}
function markRecoveryAttempt(action,reason){
 const s=recoveryState();
 s.attempts.push(Date.now());
 s.last_action=action;
 s.last_reason=clip(reason,240);
 s.last_at=Date.now();
 saveRecoveryState(s);
 return s.attempts.length;
}
function guardedReload(action){
 const last=Number(sessionStorage.getItem(RELOAD_GUARD_KEY)||0);
 if(Date.now()-last<RELOAD_GUARD_MS)return false;
 sessionStorage.setItem(RELOAD_GUARD_KEY,String(Date.now()));
 const u=new URL(location.href);
 u.searchParams.set('c360_recovery',action);
 u.searchParams.set('c360_rt',String(Date.now()));
 if(window.__c360SafeMode)u.searchParams.set('c360_safe','1');
 location.replace(u.toString());
 return true;
}

function snapshotDraft(){
 try{
  const fields=[...document.querySelectorAll('input,select,textarea')].slice(0,250);
  const data=[];
  for(const el of fields){
   if(!el.id&&!el.name)continue;
   const type=(el.type||'').toLowerCase();
   const key=(el.id||el.name||'').toLowerCase();
   if(['password','file','submit','button','image','reset'].includes(type))continue;
   if(/password|secret|token|apikey|access.?key|refresh/.test(key))continue;
   const item={id:el.id||null,name:el.name||null,type,value:el.value};
   if(type==='checkbox'||type==='radio')item.checked=!!el.checked;
   data.push(item);
  }
  writeJson(sessionStorage,DRAFT_KEY,{ts:Date.now(),path:location.pathname,data});
 }catch(_){}
}
function restoreDraft(){
 const draft=readJson(sessionStorage,DRAFT_KEY,null);
 if(!draft||draft.path!==location.pathname||Date.now()-Number(draft.ts||0)>15*60*1000)return;
 try{
  for(const item of draft.data||[]){
   let el=item.id?document.getElementById(item.id):null;
   if(!el&&item.name)el=document.querySelector('[name="'+CSS.escape(item.name)+'"]');
   if(!el)continue;
   const type=(el.type||'').toLowerCase();
   if(type==='checkbox'||type==='radio')el.checked=!!item.checked;
   else if(!el.value)el.value=item.value??'';
  }
  sessionStorage.removeItem(DRAFT_KEY);
 }catch(_){}
}

async function healCore(reason){
 const evt=record('recovery_heal_requested',reason,{severity:'warning',recovery_action:'heal_core'});
 const result=await postToSW('C360_HEAL_CORE',{reason:clip(reason,240)});
 updateEvent(evt.id,{recovered:!!result?.ok,recovery_action:result?.ok?'heal_core_ok':'heal_core_failed'});
 return !!result?.ok;
}
async function rollbackStable(reason){
 const evt=record('recovery_rollback_requested',reason,{severity:'critical',recovery_action:'rollback_stable'});
 const result=await postToSW('C360_ROLLBACK_TO_STABLE',{reason:clip(reason,240)});
 updateEvent(evt.id,{recovered:!!result?.ok,recovery_action:result?.ok?'rollback_stable_ok':'rollback_stable_failed'});
 if(result?.ok){
  window.__c360SafeMode=true;
  writeJson(localStorage,SAFE_KEY,{since:Date.now(),until:Date.now()+SAFE_MODE_MS,reason:clip(reason,240)});
 }
 return !!result?.ok;
}
async function recoverCritical(reason){
 if(recoveryInFlight)return false;
 recoveryInFlight=true;
 criticalSinceBoot=true;
 try{
  if(document.visibilityState==='hidden')return false;
  snapshotDraft();
  const state=recoveryState();
  const attempts=state.attempts.length;

  if(navigator.onLine===false){
   const rolled=await rollbackStable('offline:'+reason);
   if(rolled){markRecoveryAttempt('rollback-offline',reason);return guardedReload('rollback-offline')}
   pendingRecoveryReason=reason;
   state.pending=reason;saveRecoveryState(state);
   return false;
  }

  if(attempts>=2){
   const rolled=await rollbackStable(reason);
   markRecoveryAttempt(rolled?'rollback':'rollback-failed',reason);
   if(rolled)return guardedReload('rollback');
  }

  const healed=await healCore(reason);
  markRecoveryAttempt(healed?'heal':'heal-failed',reason);
  if(healed)return guardedReload('heal');

  const rolled=await rollbackStable('heal-failed:'+reason);
  markRecoveryAttempt(rolled?'rollback-after-heal':'rollback-after-heal-failed',reason);
  if(rolled)return guardedReload('rollback');
  return false;
 }finally{
  setTimeout(()=>{recoveryInFlight=false},2500);
 }
}

function looksLikeSourceLeak(){
 try{
  const text=(document.body?.innerText||'').slice(-28000);
  let hits=0;
  for(const marker of ['function setTextSafe','async function loadTeamPoint','document.getElementById(','payload.event_type','offlineQueueList()'])if(text.includes(marker))hits++;
  return hits>=2;
 }catch(_){return false}
}
function checkSourceLeak(){
 if(!document.body)return;
 if(!looksLikeSourceLeak())return;
 const evt=record('source_leak','Código interno apareceu na interface.',{severity:'critical',context:{detector:'dom-text'}});
 updateEvent(evt.id,{recovery_action:'auto_recover'});
 recoverCritical('source-leak').catch(()=>{});
}
function maybeRecoverRepeated(evt,force=false){
 if(navigator.onLine===false&&!force)return;
 const count=countRecentFingerprint(evt.fingerprint);
 if(force||count>=3)recoverCritical(evt.kind+':'+evt.fingerprint).catch(()=>{});
}

window.addEventListener('error',event=>{
 try{
  const target=event.target;
  if(target&&target!==window&&(target.tagName==='SCRIPT'||target.tagName==='LINK')){
   const src=target.src||target.href||'';
   const evt=record('asset_error','Falha ao carregar recurso do aplicativo.',{severity:'critical',source:src,context:{tag:target.tagName}});
   maybeRecoverRepeated(evt,true);
   return;
  }
  const msg=event.message||event.error?.message||'Erro JavaScript';
  const severe=/SyntaxError|Unexpected token|is not defined|Cannot read properties|Failed to execute/i.test(String(msg));
  const evt=record('javascript_error',event.error||msg,{severity:severe?'error':'warning',source:event.filename,line:event.lineno,column:event.colno});
  maybeRecoverRepeated(evt,/SyntaxError|Unexpected token/i.test(String(msg)));
 }catch(_){}
},true);

window.addEventListener('unhandledrejection',event=>{
 try{
  const reason=event.reason instanceof Error?event.reason:new Error(typeof event.reason==='string'?event.reason:'Promise rejeitada sem tratamento');
  const evt=record('unhandled_rejection',reason,{severity:'error'});
  maybeRecoverRepeated(evt,false);
 }catch(_){}
});

document.addEventListener('c360:bootstrap-ready',event=>{
 const detail=event.detail||{};
 if(Array.isArray(detail.errors)&&detail.errors.length){
  const evt=record('bootstrap_error',detail.errors.join(' | '),{severity:'critical',context:{bootstrap:detail.version||null}});
  maybeRecoverRepeated(evt,true);
 }else{
  scheduleFlush(1200);
 }
});

window.addEventListener('offline',()=>record('network_offline','Conexão indisponível.',{severity:'info'}));
window.addEventListener('online',()=>{
 record('network_online','Conexão restabelecida.',{severity:'info'});
 scheduleFlush(500);
 const state=recoveryState();
 const reason=pendingRecoveryReason||state.pending;
 if(reason){
  pendingRecoveryReason='';state.pending=null;saveRecoveryState(state);
  setTimeout(()=>recoverCritical('online-resume:'+reason).catch(()=>{}),900);
 }
});

document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')scheduleFlush(600)});

async function markHealthy(){
 if(criticalSinceBoot)return;
 const bootstrap=window.__c360Bootstrap;
 if(bootstrap&&bootstrap.ready===false)return;
 const status=await postToSW('C360_STATUS',{},2500).catch(()=>({ok:false}));
 if(status?.rollback)return;
 await postToSW('C360_MARK_HEALTHY',{recovery_version:RECOVERY_VERSION,build:getBuild()},2500).catch(()=>{});
 const state=recoveryState();
 state.attempts=[];state.pending=null;state.last_healthy_at=Date.now();saveRecoveryState(state);
 if(window.__c360SafeMode){
  const safe=readJson(localStorage,SAFE_KEY,null);
  if(safe&&Date.now()-startedAt>2*60*1000)localStorage.removeItem(SAFE_KEY);
 }
 scheduleFlush(300);
}

function init(){
 if(window.__c360SafeMode)document.documentElement.classList.add('c360-safe-mode');
 restoreDraft();
 setTimeout(checkSourceLeak,1800);
 setTimeout(checkSourceLeak,7000);
 setInterval(checkSourceLeak,20000);
 setTimeout(()=>{
  if(window.__c360Bootstrap&&window.__c360Bootstrap.ready===false){
   const evt=record('bootstrap_watchdog','Bootstrap não ficou pronto.',{severity:'critical'});
   maybeRecoverRepeated(evt,true);
  }
 },15000);
 setTimeout(()=>markHealthy().catch(()=>{}),30000);
 scheduleFlush(6500);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();

window.__c360AutoRecovery={
 version:RECOVERY_VERSION,
 record,
 flush:()=>flushRemote(),
 heal:(reason='manual')=>healCore(reason),
 rollback:(reason='manual')=>rollbackStable(reason),
 recover:(reason='manual')=>recoverCritical(reason),
 status:async()=>({version:RECOVERY_VERSION,safeMode:!!window.__c360SafeMode,events:loadEvents().slice(-20),state:recoveryState(),worker:await postToSW('C360_STATUS',{},2500).catch(()=>null)})
};
})();
