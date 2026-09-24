(()=>{
'use strict';
const VERSION='2026.09.24-o5';
function addCss(id,href){
 if(document.getElementById(id))return;
 const link=document.createElement('link');
 link.id=id;link.rel='stylesheet';link.href=href;
 (document.head||document.documentElement).appendChild(link);
}
function addJs(id,src,guard){
 if(document.getElementById(id)||(guard&&window[guard]))return;
 const script=document.createElement('script');
 script.id=id;script.src=src;script.async=true;
 (document.head||document.documentElement).appendChild(script);
}
function installStyles(){
 addCss('c360MobileRescueCss','./c360-mobile-rescue.css?v=20260924-2');
 addCss('c360SignatureUiCss','./c360-signature-ui.css?v=20260924-2');
 addCss('c360SignatureIconsCss','./c360-signature-icons.css?v=20260924-1');
 /* Carregado por último para resolver os conflitos vistos nos aparelhos reais. */
 addCss('c360ProfessionalPassCss','./c360-professional-pass.css?v=20260924-1');
}
function installScripts(){
 addJs('c360SignatureUiJs','./c360-signature-ui.js?v=20260924-2','__c360SignatureUi');
 addJs('c360ProfessionalPassJs','./c360-professional-pass.js?v=20260924-1','__c360ProfessionalPass');
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
function boot(){installStyles();installScripts();installEntry()}
installStyles();installScripts();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
document.addEventListener('c360:bootstrap-ready',boot);
window.__c360OnboardingEntryVersion=VERSION;
})();