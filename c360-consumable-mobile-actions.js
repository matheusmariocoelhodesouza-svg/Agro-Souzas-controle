(()=>{
'use strict';
const VERSION='2026.09.13-m2';
let timer=null,busy=false,cache=[],cacheAt=0;
function q(s,r=document){return r.querySelector(s)}
function norm(v){return String(v??'').trim().toLocaleLowerCase('pt-BR')}
function mobile(){return window.matchMedia('(max-width:900px)').matches}
function ensureStyles(){
 if(q('#c360ConsumableMobileActionStyles'))return;
 const s=document.createElement('style');s.id='c360ConsumableMobileActionStyles';s.textContent=`
 #insumos td:first-child .c360-consumable-inline-actions{display:flex!important;align-items:center!important;justify-content:flex-start!important;gap:6px!important;flex-wrap:wrap!important;margin-top:8px!important;min-width:0!important}
 #insumos td:first-child .c360-consumable-inline-actions .c360-consumable-edit-btn,
 #insumos td:first-child .c360-consumable-inline-actions .c360-consumable-delete-btn{min-height:31px!important;padding:6px 8px!important;font-size:10px!important}
 @media(max-width:900px){
  #insumos td:first-child{min-width:116px!important;vertical-align:top!important}
  #insumos td:first-child .c360-consumable-inline-actions{display:grid!important;grid-template-columns:1fr!important;width:92px!important;gap:5px!important}
  #insumos td:first-child .c360-consumable-inline-actions .c360-consumable-edit-btn,
  #insumos td:first-child .c360-consumable-inline-actions .c360-consumable-delete-btn{width:100%!important;min-height:31px!important;padding:6px 7px!important;font-size:10px!important}
  #insumos .c360-mobile-actions-hidden{display:none!important}
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
async function fetchItems(force=false){
 if(!force&&cache.length&&Date.now()-cacheAt<5000)return cache;
 try{
  if(typeof rest!=='function'||typeof companyId==='undefined'||!companyId)return cache;
  cache=await rest('v2_inventory_items','select=id,name,unit,status&company_id=eq.'+encodeURIComponent(companyId)+'&category=eq.insumo&status=eq.active&order=name.asc')||[];
  cacheAt=Date.now();
 }catch(e){console.warn('c360 mobile consumable items',e)}
 return cache;
}
function rowName(row){return norm(row?.cells?.[0]?.querySelector('b')?.textContent||row?.cells?.[0]?.textContent||'')}
function findItem(items,row){const name=rowName(row);return items.find(x=>norm(x?.name)===name)||null}
async function placeActions(force=false){
 if(busy||!mobile())return;
 const host=q('#consumablesStockList');if(!host)return;
 const table=host.querySelector('table');if(!table)return;
 busy=true;
 try{
  const items=await fetchItems(force);
  const rows=[...table.rows].slice(1);
  let placed=0;
  for(const row of rows){
   const first=row.cells?.[0];if(!first)continue;
   let actions=first.querySelector('.c360-consumable-inline-actions');
   if(!actions){
    actions=row.querySelector('.c360-consumable-actions');
    if(actions&&actions.parentElement!==first)first.appendChild(actions);
   }
   if(!actions){
    const item=findItem(items,row);
    if(item){actions=createActions(item);if(actions)first.appendChild(actions)}
   }
   if(!actions)continue;
   actions.classList.add('c360-consumable-inline-actions');
   actions.dataset.mobileActions=VERSION;
   placed++;
   [...row.cells].slice(1).forEach(td=>{if(td.querySelector('.c360-consumable-actions'))td.classList.add('c360-mobile-actions-hidden')});
  }
  if(placed){
   const head=table.rows?.[0];
   if(head){[...head.cells].forEach(th=>{if(norm(th.textContent)==='ações'||norm(th.textContent)==='acoes')th.classList.add('c360-mobile-actions-hidden')})}
  }
 }finally{busy=false}
}
function schedule(delay=100,force=false){clearTimeout(timer);timer=setTimeout(()=>placeActions(force),delay)}
function install(){
 ensureStyles();
 const host=q('#consumablesStockList');
 if(host)new MutationObserver(()=>{if(!busy)schedule(80,false)}).observe(host,{childList:true,subtree:true});
 schedule(0,true);setTimeout(()=>placeActions(true),300);setTimeout(()=>placeActions(true),900);setTimeout(()=>placeActions(true),1800);
 document.addEventListener('c360:screen-changed',e=>{if(e.detail?.id==='insumos')schedule(120,true)});
 document.addEventListener('c360:tabchange',()=>schedule(150,true));
 document.addEventListener('click',e=>{if(e.target.closest('#refreshConsumables'))schedule(400,true)},true);
 window.addEventListener('resize',()=>schedule(150,false));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
