(()=>{
'use strict';
const VERSION='2026.09.24-o4';
function installStyles(){
 if(!document.getElementById('c360MobileRescueCss')){
  const link=document.createElement('link');
  link.id='c360MobileRescueCss';
  link.rel='stylesheet';
  link.href='./c360-mobile-rescue.css?v=20260924-2';
  (document.head||document.documentElement).appendChild(link);
 }
 if(!document.getElementById('c360SignatureUiCss')){
  const link=document.createElement('link');
  link.id='c360SignatureUiCss';
  link.rel='stylesheet';
  link.href='./c360-signature-ui.css?v=20260924-1';
  (document.head||document.documentElement).appendChild(link);
 }
 if(!document.getElementById('c360SignatureIconsCss')){
  const link=document.createElement('link');
  link.id='c360SignatureIconsCss';
  link.rel='stylesheet';
  link.href='./c360-signature-icons.css?v=20260924-1';
  (document.head||document.documentElement).appendChild(link);
 }
}
function installSignatureScript(){
 if(document.getElementById('c360SignatureUiJs')||window.__c360SignatureUi)return;
 const script=document.createElement('script');
 script.id='c360SignatureUiJs';
 script.src='./c360-signature-ui.js?v=20260924-2';
 script.async=true;
 (document.head||document.documentElement).appendChild(script);
}
function installEntry(){
 const login=document.getElementById('login');
 if(!login||document.getElementById('c360NewCompanyEntry'))return;
 const host=login.querySelector('.card')||login.querySelector('.login')||login;
 const wrap=document.createElement('div');
 wrap.id='c360NewCompanyEntry';
 wrap.style.cssText='margin-top:14px;padding-top:14px;border-top:1px solid #e2e8f0;text-align:center';
 wrap.innerHTML='<div style="font-size:12px;color:#64748b;margin-bottom:8px">Sua empresa ainda não usa o Comando 360?</div><a href="./cadastro.html" style="display:inline-flex;align-items:center;justify-content:center;min-height:42px;padding:0 15px;border-radius:11px;background:#eef5fd;color:#185bac;font-size:12px;font-weight:900;text-decoration:none">+ CRIAR NOVA EMPRESA</a>';
 host.appendChild(wrap);
}
function boot(){installStyles();installSignatureScript();installEntry()}
installStyles();installSignatureScript();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
document.addEventListener('c360:bootstrap-ready',boot);
window.__c360OnboardingEntryVersion=VERSION;
})();