(()=>{
'use strict';
if(typeof window.rpc!=='function'){
 window.rpc=async function c360Rpc(name,body={}){
  if(typeof v2Rest!=='function')throw new Error('API do Comando 360 ainda não está pronta.');
  const fn=String(name||'').trim();
  if(!/^[a-zA-Z0-9_]+$/.test(fn))throw new Error('Função inválida.');
  return await v2Rest('rpc/'+fn,'','POST',body||{});
 };
}
function load(src){
 return new Promise(resolve=>{
  try{
   const base=String(src).split('?')[0];
   const found=[...document.scripts].find(s=>{try{return new URL(s.src,location.href).pathname.endsWith(base.replace(/^\.\//,''))}catch(_){return false}});
   if(found){if(found.dataset.c360Loaded==='1'||document.readyState!=='loading')return resolve(true);found.addEventListener('load',()=>resolve(true),{once:true});found.addEventListener('error',()=>resolve(false),{once:true});return}
   const el=document.createElement('script');el.src=src+(src.includes('?')?'&':'?')+'v=20260927-3';el.async=false;el.onload=()=>{el.dataset.c360Loaded='1';resolve(true)};el.onerror=()=>resolve(false);document.head.appendChild(el);
  }catch(e){console.warn('Comando 360 módulo complementar',e);resolve(false)}
 });
}
function stabilizeToasts(){
 try{
  if(document.getElementById('c360NonBlockingToastFix'))return;
  const style=document.createElement('style');
  style.id='c360NonBlockingToastFix';
  style.textContent='.c360-toast-stack,.c360-toast{pointer-events:none!important}';
  document.head.appendChild(style);
 }catch(_){ }
}
function isFieldMode(){
 try{return document.body?.classList.contains('device-mode')||(typeof deviceMode!=='undefined'&&!!deviceMode)}catch(_){return false}
}
function installFiscalOnDemand(){
 const baseGo=window.v2Go;
 if(typeof baseGo!=='function'||baseGo.__c360FiscalDemandGuard)return;
 const guarded=async function(tab){
  if(tab==='fiscal'){
   if(isFieldMode())return baseGo.call(this,'equipehome');
   if(!window.__c360FiscalInstalled){
    const ok=await load('./c360-fiscal.js');
    if(ok&&window.v2Go!==guarded)return window.v2Go.call(this,'fiscal');
   }
  }
  return baseGo.apply(this,arguments);
 };
 guarded.__c360FiscalDemandGuard=true;
 window.v2Go=guarded;
}
stabilizeToasts();
load('./c360-device-control.js');
load('./c360-device-permission-guard.js');
load('./c360-team-report-recovery.js');
load('./c360-poultry-schedule.js');
installFiscalOnDemand();
document.addEventListener('c360:interactive-ready',()=>setTimeout(installFiscalOnDemand,0));
document.addEventListener('c360:lazy-feature-ready',()=>setTimeout(installFiscalOnDemand,0));
})();
