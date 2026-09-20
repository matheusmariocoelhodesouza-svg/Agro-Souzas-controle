(()=>{
'use strict';
if(document.getElementById('c360FieldLocationUiHotfix'))return;
const style=document.createElement('style');
style.id='c360FieldLocationUiHotfix';
style.textContent=`
 body.device-mode #c360LocationPermissionCard{
   left:50%!important;
   right:auto!important;
   top:calc(72px + env(safe-area-inset-top,0px))!important;
   bottom:auto!important;
   transform:translateX(-50%)!important;
   width:min(460px,calc(100% - 24px))!important;
   max-height:42vh!important;
   overflow:auto!important;
   z-index:19000!important;
   pointer-events:none!important;
 }
 body.device-mode #c360LocationPermissionCard .toolbar,
 body.device-mode #c360LocationPermissionCard button,
 body.device-mode #c360LocationPermissionCard a{
   pointer-events:auto!important;
 }
 @media(max-width:640px){
   body.device-mode #c360LocationPermissionCard{
     top:calc(64px + env(safe-area-inset-top,0px))!important;
     width:calc(100% - 18px)!important;
     padding:10px 12px!important;
   }
   body.device-mode #c360LocationPermissionCard p{margin:3px 0 7px!important;line-height:1.3!important}
   body.device-mode #c360LocationPermissionCard .btn{padding:8px 10px!important;font-size:11px!important}
 }
`;
(document.head||document.documentElement).appendChild(style);
window.C360_FIELD_LOCATION_UI_HOTFIX='2026.09.19-locui1';
})();
