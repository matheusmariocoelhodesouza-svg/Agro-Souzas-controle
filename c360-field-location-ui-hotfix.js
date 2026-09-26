(()=>{
'use strict';
if(document.getElementById('c360FieldLocationUiHotfix'))return;
const VERSION='2026.09.22-locui2';
const style=document.createElement('style');
style.id='c360FieldLocationUiHotfix';
style.textContent=`
 body.device-mode #c360LocationPermissionCard{
   position:relative!important;
   inset:auto!important;
   left:auto!important;
   right:auto!important;
   top:auto!important;
   bottom:auto!important;
   transform:none!important;
   width:100%!important;
   max-width:none!important;
   max-height:none!important;
   overflow:visible!important;
   z-index:1!important;
   margin:0 0 8px!important;
   padding:9px 11px!important;
   border-radius:13px!important;
   box-sizing:border-box!important;
   pointer-events:auto!important;
   box-shadow:0 3px 12px rgba(15,23,42,.08)!important;
 }
 body.device-mode #c360LocationPermissionCard h1,
 body.device-mode #c360LocationPermissionCard h2,
 body.device-mode #c360LocationPermissionCard h3{font-size:12.5px!important;line-height:1.2!important;margin:0 0 3px!important}
 body.device-mode #c360LocationPermissionCard p{font-size:10.8px!important;line-height:1.3!important;margin:1px 0 6px!important}
 body.device-mode #c360LocationPermissionCard .muted{font-size:10px!important;line-height:1.25!important;margin:0 0 5px!important}
 body.device-mode #c360LocationPermissionCard .toolbar{display:flex!important;gap:6px!important;align-items:center!important;flex-wrap:wrap!important}
 body.device-mode #c360LocationPermissionCard button,
 body.device-mode #c360LocationPermissionCard .btn,
 body.device-mode #c360LocationPermissionCard a{min-height:40px!important;padding:8px 10px!important;font-size:10.8px!important;white-space:normal!important}
 body.device-mode #c360FieldLocationSlot{width:100%;margin:0;padding:0;order:-100}
 body.device-mode .team-home-grid{gap:10px!important;margin-top:0!important}
 body.device-mode .team-home-grid .team-tile{min-height:88px}
 @media(max-width:640px){
   body.device-mode #c360LocationPermissionCard{margin-bottom:6px!important;padding:8px 9px!important;border-radius:11px!important}
   body.device-mode #c360LocationPermissionCard p{
     margin:1px 0 5px!important;
     display:-webkit-box!important;
     -webkit-line-clamp:2!important;
     -webkit-box-orient:vertical!important;
     overflow:hidden!important;
   }
   body.device-mode #c360LocationPermissionCard .muted{display:none!important}
   body.device-mode #c360LocationPermissionCard button,
   body.device-mode #c360LocationPermissionCard .btn{width:100%!important;max-width:100%!important;min-height:40px!important}
 }
`;
(document.head||document.documentElement).appendChild(style);

function fieldHost(){
 return document.querySelector('.team-home-grid')?.parentElement||document.querySelector('.team-home')||document.querySelector('#app');
}
function placeCard(){
 if(!document.body?.classList.contains('device-mode'))return false;
 const card=document.getElementById('c360LocationPermissionCard');
 const grid=document.querySelector('.team-home-grid');
 const host=fieldHost();
 if(!card||!host)return false;
 let slot=document.getElementById('c360FieldLocationSlot');
 if(!slot){
   slot=document.createElement('div');
   slot.id='c360FieldLocationSlot';
   slot.setAttribute('aria-live','polite');
   if(grid&&grid.parentElement===host)host.insertBefore(slot,grid);else host.prepend(slot);
 }
 if(card.parentElement!==slot)slot.appendChild(card);
 return true;
}
function schedule(){
 requestAnimationFrame(()=>placeCard());
 clearTimeout(schedule.retry);
 schedule.retry=setTimeout(placeCard,120);
}
function observeField(){
 const root=document.getElementById('app')||document.body||document.documentElement;
 const observer=new MutationObserver(records=>{
   if(records.some(r=>r.addedNodes.length||r.removedNodes.length))schedule();
 });
 observer.observe(root,{subtree:true,childList:true});
}
function boot(){schedule();observeField()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
document.addEventListener('c360:screen-changed',schedule);
document.addEventListener('c360:bootstrap-ready',schedule);
window.addEventListener('pageshow',schedule);
window.addEventListener('online',schedule);
window.C360_FIELD_LOCATION_UI_HOTFIX=VERSION;
})();