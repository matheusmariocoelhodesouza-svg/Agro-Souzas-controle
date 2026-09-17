(()=>{
'use strict';
const VERSION='2026.09.17-device-permission-guard2';
const ROUTE_PERMISSION={ponto:'ponto',operacoes:'apanha',combustivel:'abastecimento',relatorios:'relatorio'};
const SUPPORTED=new Set(Object.values(ROUTE_PERMISSION));
const DEFAULTS={ponto:true,apanha:true,abastecimento:true,relatorio:true};
function isDevice(){try{return !!(typeof deviceMode!=='undefined'&&deviceMode)||document.body.classList.contains('device-mode')}catch(_){return document.body.classList.contains('device-mode')}}
function permissions(){try{return {...DEFAULTS,...((typeof deviceAccess!=='undefined'&&deviceAccess?.permissions)||{}),...(window.__c360DevicePermissions||{})}}catch(_){return {...DEFAULTS}}}
function allowed(tab){if(!isDevice())return true;const key=ROUTE_PERMISSION[String(tab||'')];return !key||permissions()[key]!==false}
function applyVisibility(){if(!isDevice())return;const p=permissions();document.querySelectorAll('[data-teamtab],[data-tab]').forEach(el=>{const tab=el.dataset.teamtab||el.dataset.tab,key=ROUTE_PERMISSION[tab];if(key)el.classList.toggle('hidden',p[key]===false)})}
function prunePermissionModal(){const modal=document.getElementById('c360ControlModal');if(!modal)return;modal.querySelectorAll('[data-c360-permission]').forEach(input=>{if(!SUPPORTED.has(input.dataset.c360Permission))input.closest('.c360-control-option')?.remove()})}
function install(){if(window.__c360DevicePermissionGuardInstalled)return;const old=window.v2Go;if(typeof old!=='function')return;const next=async function(tab){if(isDevice()&&!allowed(tab))return await old('equipehome');return await old(tab)};window.v2Go=next;window.__c360DevicePermissionGuardInstalled=true;window.C360DevicePermissionGuard={version:VERSION,allowed,permissions,applyVisibility};applyVisibility()}
const obs=new MutationObserver(()=>prunePermissionModal());obs.observe(document.documentElement,{childList:true,subtree:true});
document.addEventListener('c360:device-permissions',()=>{applyVisibility();try{const active=document.querySelector('.section.active')?.id;if(active&&!allowed(active))window.v2Go?.('equipehome')}catch(_){}});
document.addEventListener('c360:bootstrap-ready',()=>{install();setTimeout(applyVisibility,100)});
install();
})();