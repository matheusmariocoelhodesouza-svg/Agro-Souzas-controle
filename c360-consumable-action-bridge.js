(()=>{
'use strict';
const VERSION='2026.09.13-action-bridge1';
let busy=false,timer=0;
const norm=v=>String(v??'').replace(/\s+/g,' ').trim().toLocaleLowerCase('pt-BR');
function schedule(delay=20){clearTimeout(timer);timer=setTimeout(ensureActions,delay)}
async function ensureActions(){
  if(busy)return;
  const host=document.querySelector('#consumablesStockList');
  if(!host||typeof rest!=='function'||typeof companyId==='undefined'||!companyId)return;
  const table=host.querySelector('table');
  if(!table)return;
  const rows=[...table.rows].slice(1);
  if(!rows.length)return;
  busy=true;
  try{
    const items=await rest('v2_inventory_items','select=id,name,unit,status&company_id=eq.'+encodeURIComponent(companyId)+'&category=eq.insumo&status=eq.active&order=name.asc')||[];
    for(const row of rows){
      if(row.querySelector('.c360-consumable-edit-btn'))continue;
      const productCell=row.cells?.[0];if(!productCell)continue;
      const name=norm(productCell.querySelector('b')?.textContent||productCell.textContent);
      const item=items.find(x=>norm(x?.name)===name)||items.find(x=>name.includes(norm(x?.name))||norm(x?.name).includes(name));
      if(!item?.id)continue;
      let actions=productCell.querySelector('.c360-consumable-actions.c360-consumable-actions-inline');
      if(!actions){
        actions=document.createElement('div');actions.className='c360-consumable-actions c360-consumable-actions-inline';actions.dataset.itemId=String(item.id);
        actions.style.cssText='display:flex;gap:6px;flex-wrap:wrap;margin-top:8px';
        productCell.appendChild(actions);
      }
      if(!actions.querySelector('.c360-consumable-edit-btn')){
        const edit=document.createElement('button');edit.type='button';edit.className='c360-consumable-edit-btn';edit.dataset.itemId=String(item.id);edit.textContent='✏️ Editar';edit.setAttribute('aria-label','Editar '+String(item.name||'insumo'));actions.appendChild(edit);
      }
      if(!actions.querySelector('.c360-consumable-delete-btn')){
        const del=document.createElement('button');del.type='button';del.className='c360-consumable-delete-btn';del.dataset.itemId=String(item.id);del.textContent='🗑 Excluir';del.setAttribute('aria-label','Excluir '+String(item.name||'insumo'));actions.appendChild(del);
      }
    }
    document.documentElement.dataset.c360ConsumableActionBridge=VERSION;
  }catch(e){console.warn('c360 consumable action bridge',e)}finally{busy=false}
}
function install(){
  const watch=()=>{
    const host=document.querySelector('#consumablesStockList');
    if(host&&!host.dataset.c360ActionBridgeObserved){host.dataset.c360ActionBridgeObserved='1';new MutationObserver(()=>schedule(10)).observe(host,{childList:true,subtree:true})}
    schedule(0);
  };
  watch();setTimeout(watch,100);setTimeout(watch,250);setTimeout(watch,500);
  document.addEventListener('c360:screen-changed',e=>{if(e.detail?.id==='insumos')watch()});
  document.addEventListener('c360:tabchange',watch);
  document.addEventListener('click',e=>{if(e.target.closest('#refreshConsumables,#newConsumableItemBtn,#cancelConsumableItem'))setTimeout(watch,30)},true);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
