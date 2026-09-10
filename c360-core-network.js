(function(){
'use strict';
const API='https://aycbrqziusxtxhsdfqjk.supabase.co';
const SESSION_KEY='controla_beta_session';
let reachable=navigator.onLine!==false;
let lastProbeAt=0;
let probing=null;
let deviceSession=false;

function nativeOnline(){try{return navigator.onLine!==false}catch(_){return true}}
function readSession(){try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'null')}catch(_){return null}}
function detectDeviceSession(){
  const u=readSession()?.user;
  if(!u)return false;
  const email=String(u.email||'').toLowerCase();
  return !!(u.is_anonymous===true||u.app_metadata?.comando360_device===true||u.user_metadata?.comando360_device===true||u.user_metadata?.controla_device===true||email.startsWith('device-'));
}
function effectiveOnline(){
  if(!nativeOnline())return false;
  if(!deviceSession)return true;
  if(!lastProbeAt || Date.now()-lastProbeAt>20000)return false;
  return reachable;
}
function publish(){
  const online=effectiveOnline();
  document.documentElement.dataset.c360Network=online?'online':'offline';
  window.dispatchEvent(new CustomEvent('c360:network',{detail:{online,reachable,native:nativeOnline(),checkedAt:lastProbeAt}}));
  return online;
}
async function probe(){
  deviceSession=detectDeviceSession();
  if(!nativeOnline()){
    reachable=false;lastProbeAt=Date.now();publish();return false;
  }
  if(!deviceSession){
    reachable=true;lastProbeAt=Date.now();publish();return true;
  }
  if(probing)return probing;
  probing=(async()=>{
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),2500);
    try{
      const r=await fetch(API+'/auth/v1/health?c360='+Date.now(),{method:'GET',cache:'no-store',signal:controller.signal});
      reachable=!!r;
    }catch(_){reachable=false}
    finally{clearTimeout(timer);lastProbeAt=Date.now();publish()}
    return effectiveOnline();
  })();
  try{return await probing}finally{probing=null}
}
function onBrowserNetworkChange(){probe().then(ok=>{
  if(ok){try{window.warmDeviceOfflineData?.()}catch(_){} try{window.syncOfflineQueue?.()}catch(_){}}
}).catch(()=>publish())}

window.c360Network={online:effectiveOnline,probe,state:()=>({online:effectiveOnline(),reachable,native:nativeOnline(),checkedAt:lastProbeAt,deviceSession})};
window.c360NetOnline=effectiveOnline;
window.c360ProbeNetwork=probe;

deviceSession=detectDeviceSession();
window.addEventListener('online',onBrowserNetworkChange);
window.addEventListener('offline',onBrowserNetworkChange);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)probe().catch(()=>{})});
setTimeout(()=>probe().catch(()=>{}),300);
setInterval(()=>probe().then(ok=>{if(ok&&deviceSession){try{window.syncOfflineQueue?.()}catch(_){}}}).catch(()=>{}),deviceSession?10000:30000);
})();
