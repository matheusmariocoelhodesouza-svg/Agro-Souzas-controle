(()=>{
'use strict';
const VERSION='2026.09.13-e3';
const state={items:[],loadedAt:0,decorating:false,timer:null,retryTimer:null,busyDelete:new Set()};

function q(sel,root=document){return root.querySelector(sel)}
function norm(v){return String(v??'').trim().toLocaleLowerCase('pt-BR')}
function num(v){const n=Number(v??0);return Number.isFinite(n)?n:0}
function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}

function ensureStyles(){
 if(q('#c360ConsumableEditStyles'))return;
 const s=document.createElement('style');s.id='c360ConsumableEditStyles';s.textContent=`
 #insumos .c360-consumable-actions{display:flex;align-items:center;justify-content:flex-end;gap:6px;flex-wrap:wrap}
 #insumos .c360-consumable-edit-btn,#insumos .c360-consumable-delete-btn{border:1px solid #cbd5e1;background:#fff;color:#17324f;border-radius:9px;padding:7px 10px;font:inherit;font-size:11px;font-weight:850;cursor:pointer;white-space:nowrap;min-height:34px}
 #insumos .c360-consumable-edit-btn:hover{background:#eef5ff;border-color:#9ebfe7}
 #insumos .c360-consumable-delete-btn{border-color:#fecaca;color:#b42318;background:#fff8f8}
 #insumos .c360-consumable-delete-btn:hover{background:#fee2e2;border-color:#fca5a5}
 #insumos .c360-consumable-edit-btn:disabled,#insumos .c360-consumable-delete-btn:disabled{opacity:.55;cursor:not-allowed}
 #insumos .c360-consumable-edit-cost-note{font-size:10px;color:#64748b;margin-top:5px;line-height:1.35}
 #insumos .c360-consumable-fallback-actions{justify-content:flex-end;margin:0 0 8px}
 #insumos .c360-consumable-actions-head,#insumos .c360-consumable-actions-cell{position:sticky;right:0;z-index:2;background:var(--card,#fff);min-width:164px;box-shadow:-8px 0 12px -12px rgba(15,23,42,.35)}
 #insumos .c360-consumable-actions-head{z-index:3}
 .darkmode #insumos .c360-consumable-edit-btn{background:#122033;color:#e7eef9;border-color:#314158}
 .darkmode #insumos .c360-consumable-delete-btn{background:#26171a;color:#fecaca;border-color:#5f2d34}
 .darkmode #insumos .c360-consumable-actions-head,.darkmode #insumos .c360-consumable-actions-cell{background:#102034}
 @media(max-width:700px){
  #insumos .c360-consumable-actions-head,#insumos .c360-consumable-actions-cell{min-width:142px}
  #insumos .c360-consumable-edit-btn,#insumos .c360-consumable-delete-btn{padding:7px 8px;font-size:10px}
 }
 `;document.head.appendChild(s);
}

function ensureCostField(){
 const grid=q('#consumableItemForm .consumables-grid');if(!grid||q('#c360ConsumableCostWrap'))return;
 const wrap=document.createElement('div');wrap.id='c360ConsumableCostWrap';wrap.hidden=true;
 wrap.innerHTML='<label>Custo médio atual (R$)</label><input id="consumableAvgCost" type="number" min="0" step="0.0001"/><div class="c360-consumable-edit-cost-note">A alteração vale para o estoque atual e consumos futuros; o histórico já lançado não é reescrito.</div>';
 grid.appendChild(wrap);
}

function formText(editing){
 const form=q('#consumableItemForm');if(!form)return;
 const title=form.querySelector('h3'),sub=title?.parentElement?.querySelector('.muted'),save=q('#saveConsumableItem');
 if(title)title.textContent=editing?'Editar insumo':'Cadastrar insumo';
 if(sub)sub.textContent=editing?'Altere os dados do produto. O histórico de entradas e consumos será preservado.':'Cadastre óleo, sabão ou qualquer produto que queira acompanhar.';
 if(save)save.textContent=editing?'SALVAR ALTERAÇÕES':'SALVAR INSUMO';
 const cost=q('#c360ConsumableCostWrap');if(cost)cost.hidden=!editing;
}

function resetEditor(clear=false){
 const form=q('#consumableItemForm');if(!form)return;
 delete form.dataset.editId;delete form.dataset.originalUnit;delete form.dataset.hasHistory;
 formText(false);
 if(clear){
  ['consumableName','consumableMinStock','consumableItemNote','consumableAvgCost'].forEach(id=>{const el=q('#'+id);if(el)el.value=''});
  const u=q('#consumableUnit');if(u)u.value='L';
 }
 const msg=q('#consumableItemMsg');if(msg){msg.className='muted';msg.textContent=''}
}

async function fetchItems(force=false){
 if(!force&&state.items.length&&Date.now()-state.loadedAt<4000)return state.items;
 if(typeof rest!=='function'||typeof companyId==='undefined'||!companyId)return [];
 state.items=await rest('v2_inventory_items','select=id,name,unit,minimum_stock,current_avg_cost,metadata,status&company_id=eq.'+encodeURIComponent(companyId)+'&category=eq.insumo&status=eq.active&order=name.asc')||[];
 state.loadedAt=Date.now();return state.items;
}

function editButton(item){
 const b=document.createElement('button');b.type='button';b.className='c360-consumable-edit-btn';b.dataset.itemId=String(item.id||'');b.textContent='✏️ Editar';b.setAttribute('aria-label','Editar '+String(item.name||'insumo'));return b;
}
function deleteButton(item){
 const b=document.createElement('button');b.type='button';b.className='c360-consumable-delete-btn';b.dataset.itemId=String(item.id||'');b.textContent='🗑 Excluir';b.setAttribute('aria-label','Excluir '+String(item.name||'insumo'));return b;
}
function actionButtons(item){
 const wrap=document.createElement('div');wrap.className='c360-consumable-actions';wrap.dataset.itemId=String(item.id||'');wrap.append(editButton(item),deleteButton(item));return wrap;
}
function matchItem(items,node,used){
 const text=norm(node?.textContent||'');
 let item=items.find(x=>!used.has(String(x.id))&&norm(x.name)===norm(node?.cells?.[0]?.textContent||''));
 if(!item)item=items.find(x=>!used.has(String(x.id))&&norm(x.name)&&text.includes(norm(x.name)));
 return item||null;
}

async function decorateStock(force=false){
 if(state.decorating)return;
 const host=q('#consumablesStockList');if(!host)return;
 state.decorating=true;
 try{
  const items=await fetchItems(force);if(!items.length)return;
  const used=new Set();
  const table=host.querySelector('table');
  if(table){
   const rows=[...table.rows];
   if(rows.length){
    const head=rows[0];if(!head.querySelector('.c360-consumable-actions-head')){const th=document.createElement('th');th.className='c360-consumable-actions-head';th.textContent='Ações';head.appendChild(th)}
    for(const row of rows.slice(1)){
     const existing=row.querySelector('.c360-consumable-actions');if(existing){used.add(String(existing.dataset.itemId||''));continue}
     const item=matchItem(items,row,used);if(!item)continue;
     const td=document.createElement('td');td.className='c360-consumable-actions-cell';td.appendChild(actionButtons(item));row.appendChild(td);used.add(String(item.id));
    }
   }
  }

  const cards=[...host.querySelectorAll('.item,.card')].filter(x=>!x.closest('table'));
  for(const card of cards){
   const existing=card.querySelector('.c360-consumable-actions');if(existing){used.add(String(existing.dataset.itemId||''));continue}
   const item=matchItem(items,card,used);if(!item)continue;
   let actions=[...card.querySelectorAll('.toolbar')].pop();
   if(!actions){actions=document.createElement('div');actions.className='toolbar c360-consumable-card-actions';card.appendChild(actions)}
   actions.appendChild(actionButtons(item));used.add(String(item.id));
  }

  if(!host.querySelector('.c360-consumable-actions')&&items.length===1){
   const bar=document.createElement('div');bar.className='toolbar c360-consumable-fallback-actions';bar.appendChild(actionButtons(items[0]));host.prepend(bar);
  }
 }catch(e){console.warn('c360 consumable actions decorate',e)}finally{
  state.decorating=false;
  clearTimeout(state.retryTimer);
  if(!q('#consumablesStockList .c360-consumable-actions')&&q('#consumablesStockList'))state.retryTimer=setTimeout(()=>decorateStock(false),350);
 }
}

function scheduleDecorate(force=false){
 clearTimeout(state.timer);state.timer=setTimeout(()=>decorateStock(force),120);
}

async function itemUsage(id){
 const [movs,parts]=await Promise.all([
  rest('v2_inventory_movements','select=id&company_id=eq.'+encodeURIComponent(companyId)+'&item_id=eq.'+encodeURIComponent(id)+'&limit=1'),
  rest('v2_work_order_parts','select=id&company_id=eq.'+encodeURIComponent(companyId)+'&item_id=eq.'+encodeURIComponent(id)+'&limit=1').catch(()=>[])
 ]);
 return {hasMovements:!!movs?.length,hasWorkOrders:!!parts?.length,hasLinks:!!(movs?.length||parts?.length)};
}

async function openEditor(id){
 ensureCostField();
 const form=q('#consumableItemForm'),msg=q('#consumableItemMsg');if(!form)return;
 try{
  if(msg){msg.className='muted';msg.textContent='Carregando insumo...'}
  let item=(await fetchItems()).find(x=>String(x.id)===String(id));
  if(!item){const rows=await rest('v2_inventory_items','select=id,name,unit,minimum_stock,current_avg_cost,metadata,status&company_id=eq.'+encodeURIComponent(companyId)+'&id=eq.'+encodeURIComponent(id)+'&limit=1');item=rows?.[0]}
  if(!item)throw new Error('Insumo não encontrado.');
  const hist=await rest('v2_inventory_movements','select=id&company_id=eq.'+encodeURIComponent(companyId)+'&item_id=eq.'+encodeURIComponent(id)+'&limit=1');
  form.dataset.editId=item.id;form.dataset.originalUnit=item.unit||'un';form.dataset.hasHistory=hist?.length?'1':'0';
  q('#consumableName').value=item.name||'';q('#consumableUnit').value=item.unit||'un';q('#consumableMinStock').value=item.minimum_stock??'';q('#consumableItemNote').value=item.metadata?.note||'';q('#consumableAvgCost').value=num(item.current_avg_cost)||'';
  formText(true);form.classList.add('open');
  if(msg){msg.className='muted';msg.textContent=hist?.length?'Este insumo já possui movimentações. Nome, estoque mínimo, observação e custo podem ser corrigidos; a unidade fica protegida para não alterar o histórico.':''}
  form.scrollIntoView({behavior:'smooth',block:'start'});setTimeout(()=>q('#consumableName')?.focus(),250);
 }catch(e){if(msg){msg.className='error';msg.textContent=e.message||String(e)}}
}

async function saveEdit(){
 const form=q('#consumableItemForm'),msg=q('#consumableItemMsg'),btn=q('#saveConsumableItem');if(!form?.dataset.editId)return;
 const id=form.dataset.editId,name=q('#consumableName')?.value.trim()||'',unit=q('#consumableUnit')?.value||'un',originalUnit=form.dataset.originalUnit||unit;
 if(!name){msg.className='error';msg.textContent='Informe o nome do produto.';return}
 if(form.dataset.hasHistory==='1'&&unit!==originalUnit){msg.className='error';msg.textContent='A unidade não pode ser alterada porque este insumo já possui entradas/consumos. Isso preserva o histórico corretamente.';q('#consumableUnit').value=originalUnit;return}
 try{
  if(btn)btn.disabled=true;if(msg){msg.className='muted';msg.textContent='Salvando alterações...'}
  const items=await fetchItems(true);if(items.some(x=>String(x.id)!==String(id)&&norm(x.name)===norm(name)))throw new Error('Já existe outro insumo com este nome.');
  const current=items.find(x=>String(x.id)===String(id))||{};
  const avg=Math.max(0,num(q('#consumableAvgCost')?.value));
  const metadata={...(current.metadata||{}),source:current.metadata?.source||'insumos',note:q('#consumableItemNote')?.value.trim()||'',last_edited_at:new Date().toISOString(),last_edited_via:'consumable_editor',editor_version:VERSION};
  await rest('v2_inventory_items','id=eq.'+encodeURIComponent(id)+'&company_id=eq.'+encodeURIComponent(companyId),'PATCH',{name,unit,minimum_stock:Math.max(0,num(q('#consumableMinStock')?.value)),current_avg_cost:avg,metadata});
  state.loadedAt=0;
  form.classList.remove('open');resetEditor(true);
  if(typeof loadConsumables==='function')await loadConsumables();else scheduleDecorate(true);
  if(typeof c360Toast==='function')c360Toast('Insumo atualizado','As alterações foram salvas sem apagar o histórico.','success');
 }catch(e){if(msg){msg.className='error';msg.textContent=e.message||String(e)}}finally{if(btn)btn.disabled=false}
}

async function deleteItem(id,button){
 if(!id||state.busyDelete.has(String(id)))return;
 state.busyDelete.add(String(id));
 const buttons=[...document.querySelectorAll('.c360-consumable-delete-btn')].filter(b=>String(b.dataset.itemId)===String(id));
 try{
  buttons.forEach(b=>{b.disabled=true;b.textContent='Verificando...'});
  let item=(await fetchItems(true)).find(x=>String(x.id)===String(id));
  if(!item){const rows=await rest('v2_inventory_items','select=id,name,metadata,status&company_id=eq.'+encodeURIComponent(companyId)+'&id=eq.'+encodeURIComponent(id)+'&limit=1');item=rows?.[0]}
  if(!item)throw new Error('Insumo não encontrado.');
  const usage=await itemUsage(id);
  const prompt=usage.hasLinks
   ?'O insumo “'+item.name+'” já possui histórico vinculado. Ele será removido da lista de insumos ativos, mas entradas, consumos e manutenções antigas serão preservados. Deseja continuar?'
   :'Excluir o insumo “'+item.name+'”? Como ele não possui histórico vinculado, o cadastro será removido definitivamente.';
  if(!window.confirm(prompt))return;
  buttons.forEach(b=>{b.textContent='Excluindo...'});
  if(usage.hasLinks){
   const metadata={...(item.metadata||{}),archived_at:new Date().toISOString(),archived_via:'consumable_editor',archived_reason:'user_delete',editor_version:VERSION};
   await rest('v2_inventory_items','id=eq.'+encodeURIComponent(id)+'&company_id=eq.'+encodeURIComponent(companyId),'PATCH',{status:'inactive',metadata});
  }else{
   await rest('v2_inventory_items','id=eq.'+encodeURIComponent(id)+'&company_id=eq.'+encodeURIComponent(companyId),'DELETE');
  }
  state.items=state.items.filter(x=>String(x.id)!==String(id));state.loadedAt=0;
  const form=q('#consumableItemForm');if(form?.dataset.editId===String(id)){form.classList.remove('open');resetEditor(true)}
  if(typeof loadConsumables==='function')await loadConsumables();else scheduleDecorate(true);
  if(typeof c360Toast==='function')c360Toast(usage.hasLinks?'Insumo removido':'Insumo excluído',usage.hasLinks?'O cadastro saiu da lista ativa e o histórico foi preservado.':'O cadastro foi excluído.','success');
 }catch(e){
  console.error('c360 consumable delete',e);
  if(typeof c360Toast==='function')c360Toast('Não foi possível excluir',e.message||String(e),'error');
  else window.alert('Não foi possível excluir o insumo: '+(e.message||String(e)));
 }finally{
  state.busyDelete.delete(String(id));
  buttons.forEach(b=>{b.disabled=false;b.textContent='🗑 Excluir'});
  if(button&&document.contains(button))button.focus();
 }
}

function install(){
 ensureStyles();ensureCostField();
 const host=q('#consumablesStockList');if(host){new MutationObserver(()=>scheduleDecorate(false)).observe(host,{childList:true,subtree:true});scheduleDecorate(true)}
 document.addEventListener('click',e=>{
  const edit=e.target.closest('.c360-consumable-edit-btn');if(edit){e.preventDefault();e.stopImmediatePropagation();openEditor(edit.dataset.itemId);return}
  const del=e.target.closest('.c360-consumable-delete-btn');if(del){e.preventDefault();e.stopImmediatePropagation();deleteItem(del.dataset.itemId,del);return}
  if(e.target.closest('#newConsumableItemBtn')){resetEditor(true);return}
  if(e.target.closest('#cancelConsumableItem')){resetEditor(false);return}
  const save=e.target.closest('#saveConsumableItem');if(save&&q('#consumableItemForm')?.dataset.editId){e.preventDefault();e.stopImmediatePropagation();saveEdit();return}
  if(e.target.closest('#refreshConsumables'))setTimeout(()=>scheduleDecorate(true),300);
 },true);
 document.addEventListener('c360:tabchange',()=>setTimeout(()=>scheduleDecorate(true),250));
 document.addEventListener('c360:screen-changed',e=>{if(e.detail?.id==='insumos')setTimeout(()=>scheduleDecorate(true),180)});
 const section=q('#insumos');if(section)new MutationObserver(()=>{if(!section.hidden)scheduleDecorate(false)}).observe(section,{attributes:true,attributeFilter:['hidden','class']});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
