(()=>{
'use strict';
const VERSION='2026.09.22-locui2';
if(document.getElementById('c360FieldLocationUiHotfix'))return;
const style=document.createElement('style');
style.id='c360FieldLocationUiHotfix';
style.textContent=`
 html body.device-mode #c360LocationPermissionCard{
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
   margin:0 0 11px!important;
   padding:10px 12px!important;
   overflow:visible!important;
   z-index:1!important;
   pointer-events:auto!important;
   display:grid!important;
   grid-template-columns:minmax(0,1fr) auto!important;
   grid-template-areas:"title action" "text action"!important;
   column-gap:12px!important;
   align-items:center!important;
   border-radius:14px!important;
   border:1px solid rgba(245,158,11,.48)!important;
   background:linear-gradient(135deg,#fffaf0 0%,#fff 100%)!important;
   color:#6b3f00!important;
   box-shadow:0 5px 16px rgba(15,23,42,.07)!important;
 }
 html body.device-mode #c360LocationPermissionCard strong{
   grid-area:title!important;
   display:block!important;
   margin:0!important;
   color:#7c4700!important;
   font-size:12.5px!important;
   line-height:1.2!important;
   font-weight:950!important;
 }
 html body.device-mode #c360LocationPermissionCard p{
   grid-area:text!important;
   margin:3px 0 0!important;
   color:#7c6547!important;
   font-size:10.8px!important;
   line-height:1.3!important;
 }
 html body.device-mode #c360LocationPermissionCard .toolbar{
   grid-area:action!important;
   display:flex!important;
   justify-content:flex-end!important;
   margin:0!important;
   padding:0!important;
 }
 html body.device-mode #c360LocationPermissionCard .btn,
 html body.device-mode #c360LocationPermissionCard button{
   min-height:40px!important;
   padding:8px 11px!important;
   border-radius:11px!important;
   font-size:10px!important;
   white-space:nowrap!important;
 }
 html body.device-mode.darkmode #c360LocationPermissionCard,
 html body.darkmode.device-mode #c360LocationPermissionCard{
   background:linear-gradient(135deg,#2a2114,#142033)!important;
   border-color:#735727!important;
   color:#ffe4ad!important;
 }
 html body.device-mode.darkmode #c360LocationPermissionCard strong,
 html body.darkmode.device-mode #c360LocationPermissionCard strong{color:#ffd98d!important}
 html body.device-mode.darkmode #c360LocationPermissionCard p,
 html body.darkmode.device-mode #c360LocationPermissionCard p{color:#d6c5a8!important}
 @media(max-width:560px){
   html body.device-mode #c360LocationPermissionCard{
     grid-template-columns:1fr!important;
     grid-template-areas:"title" "text" "action"!important;
     row-gap:6px!important;
     margin-bottom:9px!important;
     padding:9px 10px!important;
   }
   html body.device-mode #c360LocationPermissionCard p{font-size:10.4px!important;line-height:1.25!important}
   html body.device-mode #c360LocationPermissionCard .toolbar{justify-content:stretch!important}
   html body.device-mode #c360LocationPermissionCard .btn,
   html body.device-mode #c360LocationPermissionCard button{width:100%!important;min-height:40px!important}
 }
`;
(document.head||document.documentElement).appendChild(style);

function placeCard(){
 const card=document.getElementById('c360LocationPermissionCard');
 if(!card)return false;
 card.setAttribute('role','status');
 card.setAttribute('aria-live','polite');
 card.dataset.c360FlowLocation='1';
 const home=document.querySelector('body.device-mode .team-home');
 const grid=home?.querySelector('.team-home-grid');
 if(home&&grid&&card.parentElement!==home){home.insertBefore(card,grid);return true}
 if(home&&grid&&card.nextElementSibling!==grid){home.insertBefore(card,grid);return true}
 return false;
}

let scheduled=false;
function schedulePlace(){
 if(scheduled)return;
 scheduled=true;
 requestAnimationFrame(()=>{scheduled=false;placeCard()});
}
function start(){
 placeCard();
 if('MutationObserver'in window){
   new MutationObserver(schedulePlace).observe(document.body,{childList:true,subtree:true});
 }
 document.addEventListener('c360:screen-changed',schedulePlace);
 document.addEventListener('c360:bootstrap-ready',schedulePlace);
 window.addEventListener('pageshow',schedulePlace);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.C360_FIELD_LOCATION_UI_HOTFIX=VERSION;
})();