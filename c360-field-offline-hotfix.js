(function(){
 'use strict';
 const REPAIR_VERSION='2026.09.12-r3';
 const RECOVERY_KEY='c360_source_leak_recovery_'+REPAIR_VERSION;
 const SW_URL='./sw-v7-02.js';
 let registrationPromise=null;
 let recovering=false;

 // Fonte única para o estado de rede. O restante do app chama c360NetOnline().
 if(typeof window.c360NetOnline!=='function'){
  window.c360NetOnline=function(){return navigator.onLine!==false};
 }

 function registerServiceWorkerEarly(){
  if(!('serviceWorker' in navigator))return Promise.resolve(null);
  if(registrationPromise)return registrationPromise;
  registrationPromise=navigator.serviceWorker.register(SW_URL,{scope:'./',updateViaCache:'none'})
   .then(reg=>{
    try{reg.update().catch(()=>{})}catch(_){}
    return reg;
   })
   .catch(err=>{console.warn('Comando 360: falha ao preparar atualização offline',err);return null});
  return registrationPromise;
 }

 function excludedTextNode(node){
  const p=node&&node.parentElement;
  return !p||!!p.closest('script,style,noscript,textarea,pre,code,option');
 }

 function looksLikeLeakedSource(value){
  const text=String(value||'').trim();
  if(text.length<35)return false;
  const markers=['document.','querySelector','getElementById','addEventListener','function ','const ','let ','=>','setTimeout','window.','try{','catch(','innerHTML','employees.map','events.filter','Object.fromEntries','currentEmployees'];
  let hits=0;
  for(const marker of markers)if(text.includes(marker)&&++hits>=2)return true;
  return false;
 }

 function pageLooksLeaked(){
  if(!document.body)return false;
  const text=String(document.body.innerText||document.body.textContent||'');
  const activation=!!document.getElementById('deviceSetupCard')||text.includes('Configurar celular da equipe');
  if(!activation)return false;
  const markers=['employees.map','events.filter','Object.fromEntries','currentEmployees','innerHTML','document.getElementById','addEventListener','function ','const ','=>'];
  let hits=0;
  for(const marker of markers)if(text.includes(marker)&&++hits>=4)return true;
  return false;
 }

 function leakedTextNodes(){
  if(!document.body||!document.createTreeWalker)return [];
  const out=[];
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  let node;
  while((node=walker.nextNode())){
   if(excludedTextNode(node))continue;
   if(looksLikeLeakedSource(node.nodeValue))out.push(node);
  }
  return out;
 }

 function removeVisibleLeak(nodes){
  for(const node of nodes){
   try{node.nodeValue=''}catch(_){}
  }
  try{
   const setup=document.getElementById('deviceSetupCard');
   if(setup){
    const login=document.getElementById('login');
    if(login){
     [...login.children].forEach(el=>{if(el!==setup&&el.id!=='adminLoginCard')el.style.display='none'});
    }
   }
  }catch(_){}
 }

 function showRepairing(){
  try{
   let box=document.getElementById('c360RepairingNotice');
   if(!box){
    box=document.createElement('div');
    box.id='c360RepairingNotice';
    box.setAttribute('role','status');
    box.style.cssText='position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:2147483647;max-width:92vw;background:#0f172a;color:#fff;padding:12px 16px;border-radius:12px;font:700 13px system-ui;box-shadow:0 10px 30px rgba(15,23,42,.28);text-align:center';
    document.body.appendChild(box);
   }
   box.textContent=c360NetOnline()?'Atualizando o Comando 360…':'Conecte este celular à internet para concluir a atualização.';
  }catch(_){}
 }

 function goToHardRepair(){
  if(!c360NetOnline())return false;
  try{
   const url=new URL('./reparar.html',location.href);
   url.searchParams.set('auto','1');
   url.searchParams.set('v',REPAIR_VERSION);
   url.searchParams.set('t',String(Date.now()));
   location.replace(url.href);
   return true;
  }catch(_){return false}
 }

 async function recoverLeakedSource(){
  if(recovering)return;
  const leaked=leakedTextNodes();
  const pageLeak=pageLooksLeaked();
  if(!leaked.length&&!pageLeak){
   try{sessionStorage.removeItem(RECOVERY_KEY)}catch(_){}
   return;
  }
  recovering=true;
  document.documentElement.dataset.c360SourceLeak='detected';
  removeVisibleLeak(leaked);
  showRepairing();

  let alreadyTried=false;
  try{alreadyTried=sessionStorage.getItem(RECOVERY_KEY)==='1'}catch(_){}
  if(!alreadyTried){
   try{sessionStorage.setItem(RECOVERY_KEY,'1')}catch(_){}
   if(goToHardRepair())return;
  }

  if(!c360NetOnline()){
   window.addEventListener('online',()=>goToHardRepair(),{once:true});
   return;
  }

  const reload=()=>{
   if(document.documentElement.dataset.c360SourceLeak==='reloading')return;
   document.documentElement.dataset.c360SourceLeak='reloading';
   location.reload();
  };

  if(!('serviceWorker' in navigator)){reload();return}
  try{navigator.serviceWorker.addEventListener('controllerchange',reload,{once:true})}catch(_){}
  const reg=await registerServiceWorkerEarly();
  if(!reg){goToHardRepair();return}
  try{
   await navigator.serviceWorker.ready;
   if(navigator.serviceWorker.controller)reload();
  }catch(_){goToHardRepair()}
 }

 registerServiceWorkerEarly();
 if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',()=>setTimeout(recoverLeakedSource,0),{once:true});
 }else{
  setTimeout(recoverLeakedSource,0);
 }
 window.c360RecoverLeakedSource=recoverLeakedSource;
 window.C360_FIELD_BOOT_REPAIR_VERSION=REPAIR_VERSION;
})();
