(()=>{
'use strict';
const VERSION='2026.09.15-field-stability1';
const STYLE_ID='c360FieldStabilityStyles';
const DEVICE_HINT_KEY='c360_field_device_hint';

function sessionLooksLikeDevice(){
  try{
    const s=JSON.parse(localStorage.getItem('controla_beta_session')||'null');
    const u=s?.user;
    return !!(u&&(u.is_anonymous===true||u.app_metadata?.comando360_device===true||u.user_metadata?.comando360_device===true||u.user_metadata?.controla_device===true));
  }catch(_){return false}
}
function isDevice(){
  try{return document.body?.classList.contains('device-mode')||sessionLooksLikeDevice()||localStorage.getItem(DEVICE_HINT_KEY)==='1'}catch(_){return !!document.body?.classList.contains('device-mode')}
}
function overlayActuallyOpen(){
  const selectors=['.c360-chat-overlay.open','.c360-dda-overlay.open','.offline-sync-panel:not(.hidden)','.global-search-overlay.open','.route-choice-backdrop.open'];
  for(const selector of selectors){
    for(const el of document.querySelectorAll(selector)){
      try{const s=getComputedStyle(el);if(s.display!=='none'&&s.visibility!=='hidden'&&el.getClientRects().length)return true}catch(_){ }
    }
  }
  return false;
}
function installStyles(){
  if(document.getElementById(STYLE_ID))return;
  const style=document.createElement('style');
  style.id=STYLE_ID;
  style.textContent=`
  html.c360-field-active{height:auto!important;min-height:100%!important;max-height:none!important;overflow-x:hidden!important;overflow-y:auto!important;overscroll-behavior-y:auto!important}
  body.device-mode{position:relative!important;height:auto!important;min-height:100dvh!important;max-height:none!important;overflow-x:hidden!important;overflow-y:auto!important;overscroll-behavior-y:auto!important;touch-action:auto!important;-webkit-overflow-scrolling:touch!important}
  body.device-mode #app,body.device-mode main.wrap,body.device-mode #screenHost,body.device-mode #screenHost>.section,body.device-mode #screenHost>[data-screen]{position:relative!important;height:auto!important;min-height:0!important;max-height:none!important;overflow:visible!important;touch-action:auto!important}
  body.device-mode #poultryForm,body.device-mode .field-poultry-form,body.device-mode .field-truck-form{height:auto!important;max-height:none!important;overflow:visible!important;touch-action:auto!important}
  body.device-mode .field-section,body.device-mode .field-form-head,body.device-mode .po-field-grid,body.device-mode .po-operation-grid,body.device-mode .po-truck-driver-grid{touch-action:auto!important}
  `;
  document.head.appendChild(style);
}
function unlock(){
  if(!document.body||!isDevice())return;
  try{localStorage.setItem(DEVICE_HINT_KEY,'1')}catch(_){ }
  document.documentElement.classList.add('c360-field-active');
  document.body.classList.remove('mobile-menu-open');
  if(overlayActuallyOpen())return;
  try{
    const html=document.documentElement,body=document.body;
    for(const el of [html,body]){
      const inline=el.style;
      if(inline.getPropertyValue('overflow')==='hidden')inline.removeProperty('overflow');
      if(inline.getPropertyValue('overflow-y')==='hidden')inline.removeProperty('overflow-y');
      if(inline.getPropertyValue('height')==='100vh'||inline.getPropertyValue('height')==='100dvh')inline.removeProperty('height');
      if(inline.getPropertyValue('position')==='fixed')inline.removeProperty('position');
    }
    window.requestAnimationFrame(()=>{
      const y=window.scrollY;
      window.scrollTo(0,y);
    });
  }catch(_){ }
}
let timer=0;
function schedule(){clearTimeout(timer);timer=setTimeout(unlock,30)}
function start(){
  installStyles();
  schedule();
  if(document.body){
    new MutationObserver(schedule).observe(document.body,{attributes:true,attributeFilter:['class','style']});
  }
  document.addEventListener('c360:screen-changed',schedule);
  document.addEventListener('click',schedule,true);
  window.addEventListener('pageshow',schedule);
  window.addEventListener('resize',schedule);
  window.addEventListener('online',schedule);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.C360FieldStability={version:VERSION,unlock};
})();
