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
 try{
  const base=String(src).split('?')[0];
  if([...document.scripts].some(s=>{try{return new URL(s.src,location.href).pathname.endsWith(base.replace(/^\.\//,''))}catch(_){return false}}))return;
  const el=document.createElement('script');el.src=src+(src.includes('?')?'&':'?')+'v=20260917-2';el.async=false;document.head.appendChild(el);
 }catch(e){console.warn('Comando 360 módulo complementar',e)}
}
load('./c360-device-control.js');
load('./c360-device-permission-guard.js');
load('./c360-team-report-recovery.js');
})();
