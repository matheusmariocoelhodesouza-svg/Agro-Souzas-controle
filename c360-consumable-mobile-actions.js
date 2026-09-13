(()=>{
'use strict';
const VERSION='2026.09.13-mobile3';
let timer=null,busy=false,cache=[],cacheAt=0,lastStockSig='',lastHistorySig='';
function q(s,r=document){return r.querySelector(s)}
function norm(v){return String(v??'').trim().toLocaleLowerCase('pt-BR')}
function clean(v){return String(v??'').replace(/\s+/g,' ').trim()}
function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function ensureStyles(){
 const old=q('#c360ConsumableMobileActionStyles');if(old)old.remove();
 if(q('#c360ConsumablesMobileUiStyles'))return;
 const s=document.createElement('style');s.id='c360ConsumablesMobileUiStyles';s.textContent=`
 #insumos .c360-consumables-mobile-stock,#insumos .c360-consumables-mobile-history{display:none}
 @media(max-width:900px){
  #insumos{padding-bottom:105px}
  #insumos .v2-kpis{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:10px!important;margin-bottom:12px!important}
  #insumos .v2kpi{min-height:92px!important;padding:12px 13px!important;border-radius:15px!important}
  #insumos .v2kpi .v{font-size:23px!important;margin-top:5px!important;line-height:1.05!important}
  #insumos .v2kpi .t{font-size:9px!important;line-height:1.25!important}
  #insumos .v2kpi .s{font-size:10px!important;line-height:1.3!important;margin-top:5px!important}
  #insumos .c360-stock-section-card,#insumos .c360-history-section-card{padding:14px!important;border-radius:18px!important;margin-bottom:12px!important;overflow:hidden!important}
  #insumos .c360-stock-section-card> .toolbar.c360-consumable-filterhead{display:block!important}
  #insumos .c360-stock-section-card h3,#insumos .c360-history-section-card h3{font-size:20px!important;line-height:1.15!important;margin:0!important}
  #insumos .c360-stock-section-card .muted,#insumos .c360-history-section-card .muted{font-size:12px!important;line-height:1.45!important;margin-top:4px!important}
  #insumos .c360-consumable-filterbar{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;gap:8px!important;width:100%!important;margin-top:13px!important;align-items:center!important}
  #insumos .c360-consumable-filterbar input{width:100%!important;min-width:0!important;height:45px!important;margin:0!important;padding:0 11px!important;border-radius:12px!important;font-size:13px!important}
  #insumos .c360-consumable-filterbar #refreshConsumables{grid-column:1/-1!important;width:100%!important;height:42px!important;margin:0!important;border-radius:12px!important;padding:0 12px!important}
  #insumos #consumablesStockList{margin-top:12px!important}
  #insumos #consumablesStockList>.tablewrap,#insumos #consumablesHistory>.tablewrap{display:none!important}
  #insumos .c360-consumables-mobile-stock,#insumos .c360-consumables-mobile-history{display:grid!important;gap:10px!important;width:100%!important}
  #insumos .c360-mobile-product-card{background:var(--card,#fff);color:var(--ink,#0f172a);border:1px solid var(--line,#e2e8f0);border-radius:16px;padding:13px;box-shadow:0 4px 14px rgba(15,23,42,.05);min-width:0}
  #insumos .c360-mobile-product-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding-bottom:11px;border-bottom:1px solid var(--line,#e2e8f0)}
  #insumos .c360-mobile-eyebrow{display:block;font-size:9px;letter-spacing:.8px;text-transform:uppercase;color:var(--muted,#64748b);font-weight:850;margin-bottom:3px}
  #insumos .c360-mobile-product-name{font-size:18px;line-height:1.15;font-weight:900;margin:0;color:var(--ink,#0f172a);word-break:break-word}
  #insumos .c360-mobile-stock-hero{text-align:right;flex:0 0 auto}
  #insumos .c360-mobile-stock-hero b{display:block;font-size:21px;line-height:1.05;color:var(--ink,#0f172a)}
  #insumos .c360-mobile-stock-hero span{display:block;font-size:9px;text-transform:uppercase;letter-spacing:.6px;color:var(--muted,#64748b);font-weight:800;margin-top:3px}
  #insumos .c360-mobile-product-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px 12px;padding:12px 0 2px}
  #insumos .c360-mobile-metric{min-width:0}
  #insumos .c360-mobile-metric span{display:block;font-size:9px;line-height:1.2;text-transform:uppercase;letter-spacing:.55px;color:var(--muted,#64748b);font-weight:800;margin-bottom:3px}
  #insumos .c360-mobile-metric b{display:block;font-size:14px;line-height:1.25;color:var(--ink,#0f172a);overflow-wrap:anywhere}
  #insumos .c360-mobile-product-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:11px;padding-top:11px;border-top:1px solid var(--line,#e2e8f0)}
  #insumos .c360-mobile-product-actions .c360-consumable-edit-btn,#insumos .c360-mobile-product-actions .c360-consumable-delete-btn{width:100%!important;min-height:39px!important;border-radius:11px!important;font-size:11px!important;padding:7px 9px!important}
  #insumos .c360-mobile-history-card{background:var(--card,#fff);color:var(--ink,#0f172a);border:1px solid var(--line,#e2e8f0);border-radius:15px;padding:12px 13px;min-width:0}
  #insumos .c360-mobile-history-top{display:flex;align-items:center;justify-content:space-between;gap:9px;margin-bottom:9px}
  #insumos .c360-mobile-history-date{font-size:11px;color:var(--muted,#64748b);font-weight:750;line-height:1.25}
  #insumos .c360-mobile-history-badge{display:inline-flex;align-items:center;justify-content:center;border-radius:999px;padding:5px 9px;font-size:9px;font-weight:900;letter-spacing:.45px;text-transform:uppercase;background:#e2e8f0;color:#334155;white-space:nowrap}
  #insumos .c360-mobile-history-badge.in{background:#dcfce7;color:#166534}
  #insumos .c360-mobile-history-badge.out{background:#fee2e2;color:#991b1b}
  #insumos .c360-mobile-history-product{font-size:16px;font-weight:900;line-height:1.2;margin-bottom:9px;color:var(--ink,#0f172a)}
  #insumos .c360-mobile-history-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 12px}
  #insumos .c360-mobile-history-field{min-width:0}
  #insumos .c360-mobile-history-field span{display:block;font-size:9px;line-height:1.2;text-transform:uppercase;letter-spacing:.5px;color:var(--muted,#64748b);font-weight:800;margin-bottom:2px}
  #insumos .c360-mobile-history-field b{display:block;font-size:13px;line-height:1.3;color:var(--ink,#0f172a);overflow-wrap:anywhere}
  .darkmode #insumos .c360-mobile-product-card,.darkmode #insumos .c360-mobile-history-card{background:#102034;border-color:#263a54;color:#e7eef9;box-shadow:none}
  .darkmode #insumos .c360-mobile-product-name,.darkmode #insumos .c360-mobile-stock-hero b,.darkmode #insumos .c360-mobile-metric b,.darkmode #insumos .c360-mobile-history-product,.darkmode #insumos .c360-mobile-history-field b{color:#eef5ff}
  .darkmode #insumos .c360-mobile-product-head,.darkmode #insumos .c360-mobile-product-actions{border-color:#263a54}
 }
 `;document.head.appendChild(s);
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
function createActions(item){
 const id=String(item?.id||'');if(!id)return '';
 return '<div class="c360-mobile-product-actions"><button type="button" class="c360-consumable-edit-btn" data-item-id="'+esc(id)+'" aria-label="Editar '+esc(item?.name||'insumo')+'">✏️ Editar</button><button type="button" class="c360-consumable-delete-btn" data-item-id="'+esc(id)+'" aria-label="Excluir '+esc(item?.name||'insumo')+'">🗑 Excluir</button></div>';
}
function itemFor(items,name){const n=norm(name);return items.find(x=>norm(x?.name)===n)||null}
function markLayout(){
 const start=q('#consumablesStart');if(start?.parentElement){start.parentElement.classList.add('c360-consumable-filterbar');start.parentElement.parentElement?.classList.add('c360-consumable-filterhead');start.closest('.card')?.classList.add('c360-stock-section-card')}
 q('#consumablesHistory')?.closest('.card')?.classList.add('c360-history-section-card');
}
function renderStock(items){
 const host=q('#consumablesStockList');if(!host)return;
 const table=host.querySelector('table');if(!table){host.querySelector('.c360-consumables-mobile-stock')?.remove();lastStockSig='';return}
 const rows=[...table.rows].slice(1);
 const sig=rows.map(r=>clean(r.innerText)).join('|')+'#'+items.map(x=>String(x.id)+':'+String(x.name)).join('|');
 const existing=host.querySelector('.c360-consumables-mobile-stock');if(existing&&sig===lastStockSig)return;
 const grid=document.createElement('div');grid.className='c360-consumables-mobile-stock';grid.dataset.version=VERSION;
 for(const row of rows){
  const cells=[...row.cells];if(cells.length<6)continue;
  const name=clean(cells[0]?.querySelector('b')?.textContent||cells[0]?.textContent||'Insumo');
  const item=itemFor(items,name);
  const stock=clean(cells[1]?.textContent||'—'),avg=clean(cells[2]?.textContent||'—'),value=clean(cells[3]?.textContent||'—'),used=clean(cells[4]?.textContent||'—'),usedCost=clean(cells[5]?.textContent||'—');
  const card=document.createElement('article');card.className='c360-mobile-product-card';
  card.innerHTML='<div class="c360-mobile-product-head"><div><span class="c360-mobile-eyebrow">Produto</span><h4 class="c360-mobile-product-name">'+esc(name)+'</h4></div><div class="c360-mobile-stock-hero"><b>'+esc(stock)+'</b><span>Estoque atual</span></div></div><div class="c360-mobile-product-grid"><div class="c360-mobile-metric"><span>Custo médio</span><b>'+esc(avg)+'</b></div><div class="c360-mobile-metric"><span>Valor em estoque</span><b>'+esc(value)+'</b></div><div class="c360-mobile-metric"><span>Consumido no período</span><b>'+esc(used)+'</b></div><div class="c360-mobile-metric"><span>Custo consumido</span><b>'+esc(usedCost)+'</b></div></div>'+createActions(item);
  grid.appendChild(card);
 }
 if(existing)existing.replaceWith(grid);else host.appendChild(grid);lastStockSig=sig;
}
function movementClass(v){const n=norm(v);if(n.includes('entrada')||n.includes('compra'))return'in';if(n.includes('saída')||n.includes('saida')||n.includes('consumo')||n.includes('uso'))return'out';return''}
function findHeader(headers,terms,fallback){for(let i=0;i<headers.length;i++){if(terms.some(t=>headers[i].includes(t)))return i}return fallback}
function renderHistory(){
 const host=q('#consumablesHistory');if(!host)return;
 const table=host.querySelector('table');if(!table){host.querySelector('.c360-consumables-mobile-history')?.remove();lastHistorySig='';return}
 const rows=[...table.rows];if(rows.length<2)return;
 const headers=[...rows[0].cells].map(c=>norm(c.textContent));
 const sig=rows.slice(1).map(r=>clean(r.innerText)).join('|')+'#'+headers.join('|');
 const existing=host.querySelector('.c360-consumables-mobile-history');if(existing&&sig===lastHistorySig)return;
 const dateIdx=findHeader(headers,['data','hora'],0),moveIdx=findHeader(headers,['movimento','tipo'],1),productIdx=findHeader(headers,['produto','insumo'],2);
 const grid=document.createElement('div');grid.className='c360-consumables-mobile-history';grid.dataset.version=VERSION;
 for(const row of rows.slice(1)){
  const cells=[...row.cells];if(!cells.length)continue;
  const date=clean(cells[dateIdx]?.textContent||''),movement=clean(cells[moveIdx]?.textContent||''),product=clean(cells[productIdx]?.textContent||'Movimentação');
  const fields=[];
  for(let i=0;i<Math.min(headers.length,cells.length);i++){
   if(i===dateIdx||i===moveIdx||i===productIdx)continue;
   const value=clean(cells[i]?.textContent||'');if(!value)continue;
   const label=clean(rows[0].cells[i]?.textContent||'Detalhe');fields.push('<div class="c360-mobile-history-field"><span>'+esc(label)+'</span><b>'+esc(value)+'</b></div>');
  }
  const card=document.createElement('article');card.className='c360-mobile-history-card';
  card.innerHTML='<div class="c360-mobile-history-top"><div class="c360-mobile-history-date">'+esc(date)+'</div><span class="c360-mobile-history-badge '+movementClass(movement)+'">'+esc(movement||'Movimentação')+'</span></div><div class="c360-mobile-history-product">'+esc(product)+'</div><div class="c360-mobile-history-grid">'+fields.join('')+'</div>';
  grid.appendChild(card);
 }
 if(existing)existing.replaceWith(grid);else host.appendChild(grid);lastHistorySig=sig;
}
async function render(force=false){
 if(busy)return;busy=true;
 try{ensureStyles();markLayout();const items=await fetchItems(force);renderStock(items);renderHistory()}catch(e){console.warn('c360 consumables mobile ui',e)}finally{busy=false}
}
function schedule(delay=90,force=false){clearTimeout(timer);timer=setTimeout(()=>render(force),delay)}
function observeHost(sel){const host=q(sel);if(!host)return;new MutationObserver(()=>{if(!busy)schedule(70,false)}).observe(host,{childList:true,subtree:true,characterData:true})}
function install(){
 ensureStyles();markLayout();observeHost('#consumablesStockList');observeHost('#consumablesHistory');
 schedule(0,true);setTimeout(()=>render(true),300);setTimeout(()=>render(true),900);setTimeout(()=>render(true),1800);
 document.addEventListener('c360:screen-changed',e=>{if(e.detail?.id==='insumos')schedule(100,true)});
 document.addEventListener('c360:tabchange',()=>schedule(120,true));
 document.addEventListener('click',e=>{if(e.target.closest('#refreshConsumables'))schedule(350,true)},true);
 window.addEventListener('resize',()=>schedule(140,false));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
