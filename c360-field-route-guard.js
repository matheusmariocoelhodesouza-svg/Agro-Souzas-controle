(()=>{
'use strict';
const VERSION='2026.09.17-field-route-guard3';
const ALWAYS_FORBIDDEN=new Set(['financeiro','frota','rastreamento','funcionarios','equipes','documentosrh','configuracoes','integracoes','ia','alertas','fiscal']);
const ROUTE_PERMISSION={
 ponto:'ponto',
 operacoes:'apanha',
 combustivel:'abastecimento',
 relatorios:'relatorio',
 manutencoes:'manutencao',
 insumos:'insumos'
};
const DEFAULTS={ponto:true,apanha:true,abastecimento:true,relatorio:true,manutencao:false,insumos:false,impressao:true,chat:true};
function isDevice(){
 try{return !!(typeof deviceMode!=='undefined'&&deviceMode)||document.body.classList.contains('device-mode')}
 catch(_){return document.body.classList.contains('device-mode')}
}
function permissions(){
 try{
  const live=window.__c360DevicePermissions||null;
  const linked=(typeof deviceAccess!=='undefined'&&deviceAccess&&deviceAccess.permissions)||{};
  return {...DEFAULTS,...linked,...(live||{})};
 }catch(_){return {...DEFAULTS}}
}
function allowed(target){
 if(!isDevice())return true;
 const t=String(target||'');
 if(t==='equipehome'||t==='inicio')return true;
 const p=permissions();
 if(p._locked||p._lost_mode)return false;
 if(ALWAYS_FORBIDDEN.has(t))return false;
 const key=ROUTE_PERMISSION[t];
 return key?p[key]!==false:true;
}
function syncVisibleActions(){
 if(!isDevice())return;
 const p=permissions();
 document.querySelectorAll('[data-teamtab]').forEach(el=>{
  const t=String(el.getAttribute('data-teamtab')||'');
  const key=ROUTE_PERMISSION[t];
  if(key)el.hidden=p[key]===false;
  else if(ALWAYS_FORBIDDEN.has(t))el.hidden=true;
 });
}
function install(){
 if(window.__c360FieldRouteGuardInstalledV2)return;
 const old=window.v2Go;
 if(typeof old!=='function')return;
 const next=async function(tab){
  const target=String(tab||'');
  if(!allowed(target)){
   try{if(typeof c360Toast==='function')c360Toast('Acesso bloqueado','Este celular não tem permissão para abrir esse módulo.','error')}catch(_){}
   return await old('equipehome');
  }
  const out=await old(tab);
  queueMicrotask(syncVisibleActions);
  return out;
 };
 next.__c360FieldRouteGuard=true;
 window.v2Go=next;
 window.__c360FieldRouteGuardInstalledV2=true;
 window.C360FieldRouteGuard={version:VERSION,forbidden:[...ALWAYS_FORBIDDEN],routePermission:{...ROUTE_PERMISSION},sync:syncVisibleActions,allowed};
 syncVisibleActions();
 document.addEventListener('c360:device-permissions',syncVisibleActions);
 const observer=new MutationObserver(()=>syncVisibleActions());
 observer.observe(document.documentElement,{subtree:true,childList:true});
}
install();
})();