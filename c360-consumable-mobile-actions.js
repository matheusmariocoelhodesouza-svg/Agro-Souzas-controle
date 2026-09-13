(()=>{
'use strict';
const VERSION='2026.09.13-m1';
let timer=null;
function q(s,r=document){return r.querySelector(s)}
function norm(v){return String(v??'').trim().toLocaleLowerCase('pt-BR')}
function ensureStyles(){
 if(q('#c360ConsumableMobileActionStyles'))return;
 const s=document.createElement('style');s.id='c360ConsumableMobileActionStyles';s.textContent=`
 #insumos .c360-consumable-actions-head,#insumos .c360-consumable-actions-cell{display:none!important}
 #insumos td:first-child .c360-consumable-inline-actions{display:flex!important;align-items:center!important;justify-content:flex-start!important;gap:6px!important;flex-wrap:wrap!important;margin-top:8px!important;min-width:0!important}
 #insumos td:first-child .c360-consumable-inline-actions .c360-consumable-edit-btn,
 #insumos td:first-child .c360-consumable-inline-actions .c360-consumable-delete-btn{min-height:31px!important;padding:6px 8px!important;font-size:10px!important}
 @media(max-width:700px){
  #insumos td:first-child{min-width:112px!important;vertical-align:top!important}
  #insumos td:first-child .c360-consumable-inline-actions{display:grid!important;grid-template-columns:1fr!important;width:88px!important;gap:5px!important}
  #insumos td:first-child .c360-consumable-inline-actions .c360-consumable-edit-btn,
  #insumos td:first-child .c360-consumable-inline-actions .c360-consumable-delete-btn{width:100%!important;min-height:30px!important;padding:6px 7px!important;font-size:10px!important}
 }
 `;document.head.appendChild(s);
}
function createActions(item){
 const id=String(item?.id||'');if(!id)return null;
 const wrap=document.createElement('div');wrap.className='c360-consumable-actions c360-consumable-inline-actions';wrap.dataset.itemId=id;wrap.dataset.mobileActions=VERSION;
 const edit=document.createElement('button');edit.type='button';edit.className='c360-consumable-edit-btn';edit.dataset.itemId=id;edit.textContent='✏️ Editar';edit.setAttribute('aria-label','Editar '+String(item?.name||'insumo'));
 const del=document.createElement('button');del.type='button';del.className='c360-consumable-delete-btn';del.dataset.itemId=id;del.textContent='🗑 Excluir';del.setAttribute('aria-label','Excluir '+String(item?.name||'insumo'));
 wrap.append(edit,del);return wrap;
}
function findItemForRow(row){
 try{
  if(typeof consumablesItems==='undefined'||!Array.isArray(consumablesItems))return null;
  const name=norm(row?.cells?.[0]?.querySelector('b')?.textContent||row?.cells?.[0]?.textContent||'');
  return consumablesItems.find(x=>norm(x?.name)===name)||null;
 }catch(_){return null}
}
function placeActions(){
 ensureStyles();
 const host=q('#consumablesStockList');if(!host)return;
 const table=host.querySelector('table');if(!table)return;
 const rows=[...table.rows].slice(1);
 for(const row of rows){
  const first=row.cells?.[0];if(!first)continue;
  let actions=row.querySelector('.c360-consumable-actions');
  if(!actions){const item=findItemForRow(row);if(item)actions=createActions(item)}
  if(!actions)continue;
  actions.classList.add('c360-consumable-inline-actions');
  if(actions.parentElement!==first)first.appendChild(actions);
 }
}
function schedule(delay=90){clearTimeout(timer);timer=setTimeout(placeActions,delay)}
function install(){
 ensureStyles();
 const host=q('#consumablesStockList');
 if(host)new MutationObserver(()=>schedule(60)).observe(host,{childList:true,subtree:true});
 schedule(0);setTimeout(placeActions,250);setTimeout(placeActions,700);setTimeout(placeActions,1400);
 document.addEventListener('c360:screen-changed',e=>{if(e.detail?.id==='insumos')schedule(100)});
 document.addEventListener('c360:tabchange',()=>schedule(120));
 document.addEventListener('click',e=>{if(e.target.closest('#refreshConsumables'))schedule(350)},true);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
