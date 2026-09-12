(function(){
 'use strict';
 const SESSION_KEY='controla_beta_session';
 const API='https://aycbrqziusxtxhsdfqjk.supabase.co';
 let deviceSession=false;
 let reachable=false;
 let lastProbeAt=0;
 let probing=null;

 function nativeOnline(){
  try{return window.navigator.onLine!==false}catch(_){return true}
 }
 function isDeviceSession(){
  try{
   const s=JSON.parse(localStorage.getItem(SESSION_KEY)||'null');
   const u=s&&s.user;
   if(!u)return false;
   const email=String(u.email||'').toLowerCase();
   return !!(
    u.is_anonymous===true||
    u.app_metadata?.comando360_device===true||
    u.user_metadata?.comando360_device===true||
    u.user_metadata?.controla_device===true||
    email.startsWith('device-')
   );
  }catch(_){return false}
 }
 function stripStalePairingParamIfPaired(){
  try{
   if(!isDeviceSession())return;
   const u=new URL(location.href);
   if(!u.searchParams.has('campo'))return;
   u.searchParams.delete('campo');
   history.replaceState({},'',u.pathname+(u.searchParams.toString()?'?'+u.searchParams.toString():'')+u.hash);
  }catch(_){}
 }
 function effectiveOnline(){
  if(!deviceSession)return nativeOnline();
  if(!nativeOnline())return false;
  if(Date.now()-lastProbeAt>15000)return false;
  return reachable;
 }
 function emitState(next){
  const prev=reachable;
  reachable=!!next;
  lastProbeAt=Date.now();
  document.documentElement.dataset.c360Network=effectiveOnline()?'online':'offline';
  if(prev!==reachable){
   try{window.dispatchEvent(new Event(effectiveOnline()?'online':'offline'))}catch(_){}
  }
 }
 async function probe(){
  if(!deviceSession){reachable=nativeOnline();lastProbeAt=Date.now();return reachable}
  if(probing)return probing;
  probing=(async()=>{
   if(!nativeOnline()){emitState(false);return false}
   const controller=new AbortController();
   const timer=setTimeout(()=>controller.abort(),1800);
   try{
    await fetch(API+'/auth/v1/health?c360='+Date.now(),{method:'GET',cache:'no-store',signal:controller.signal});
    emitState(true);
    return true;
   }catch(_){
    emitState(false);
    return false;
   }finally{
    clearTimeout(timer);
   }
  })();
  try{return await probing}finally{probing=null}
 }

 // Se este aparelho já está pareado, um link antigo ?campo=... nunca deve
 // apagar a sessão local nem tentar reutilizar um código de ativação já consumido.
 stripStalePairingParamIfPaired();
 deviceSession=isDeviceSession();
 reachable=deviceSession?false:nativeOnline();
 lastProbeAt=deviceSession?0:Date.now();
 window.c360NetOnline=effectiveOnline;
 window.c360ProbeNetwork=probe;

 if(deviceSession){
  setTimeout(()=>probe().then(ok=>{
   if(ok){
    try{window.warmDeviceOfflineData?.()}catch(_){}
    try{window.syncOfflineQueue?.()}catch(_){}
   }
  }),450);
  setInterval(()=>probe().then(ok=>{
   if(ok){
    try{window.syncOfflineQueue?.()}catch(_){}
   }
  }),8000);
 }
})();

(function(){
 try{
  if(document.querySelector('script[data-c360-team-chat]'))return;
  const s=document.createElement('script');
  s.src='./c360-team-chat.js?v=20260912c1';
  s.dataset.c360TeamChat='1';
  document.head.appendChild(s);
 }catch(_){ }
})();
