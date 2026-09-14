(()=>{
'use strict';
const VERSION='2026.09.14-field-route-guard1';
const FORBIDDEN=new Set(['financeiro','frota','rastreamento','manutencoes','insumos','funcionarios','equipes','documentosrh','configuracoes','integracoes','ia','alertas','fiscal']);
function isDevice(){
 try{return !!(typeof deviceMode!=='undefined'&&deviceMode)||document.body.classList.contains('device-mode')}
 catch(_){return document.body.classList.contains('device-mode')}
}
function install(){
 if(window.__c360FieldRouteGuardInstalled)return;
 const old=window.v2Go;
 if(typeof old!=='function')return;
 const next=async function(tab){
  const target=String(tab||'');
  if(isDevice()&&FORBIDDEN.has(target))return await old('equipehome');
  return await old(tab);
 };
 next.__c360FieldRouteGuard=true;
 window.v2Go=next;
 window.__c360FieldRouteGuardInstalled=true;
 window.C360FieldRouteGuard={version:VERSION,forbidden:[...FORBIDDEN]};
}
install();
})();