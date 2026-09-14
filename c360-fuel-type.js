(()=>{
'use strict';
const VERSION='2026.09.14-fueltype1';
const LABELS={s500:'Diesel S500',s10:'Diesel S10',unknown:'Não informado'};
let selectedFuelType='';

const norm=v=>{
 const s=String(v||'').trim().toLowerCase().replace(/diesel/g,'').replace(/[\s_-]/g,'');
 if(s==='s500'||s==='500')return 's500';
 if(s==='s10'||s==='10')return 's10';
 return '';
};
const label=v=>LABELS[norm(v)]||LABELS.unknown;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const liters=v=>Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:2})+' L';

function ensureStyle(){
 if(document.getElementById('c360FuelTypeStyle'))return;
 const s=document.createElement('style');s.id='c360FuelTypeStyle';s.textContent=`
  .c360-fuel-type-badge{display:inline-flex;align-items:center;gap:5px;padding:4px 8px;border-radius:999px;font-size:10px;font-weight:900;letter-spacing:.25px;border:1px solid #d8e5f3;background:#edf5ff;color:#155fa8}.c360-fuel-type-badge.s10{background:#eafaf1;border-color:#cdeedb;color:#167047}.c360-fuel-type-badge.unknown{background:#f3f4f6;border-color:#e5e7eb;color:#687386}
  .c360-fuel-type-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;padding:10px 12px 0}.c360-fuel-type-box{border:1px solid #e2e9f1;border-radius:10px;padding:8px 9px;background:#fbfcfe}.c360-fuel-type-box span{display:block;font-size:9px;color:#71849a;font-weight:900}.c360-fuel-type-box b{display:block;margin-top:3px;font-size:12px;color:#183452}.c360-fuel-type-box small{display:block;margin-top:2px;color:#788a9d;font-size:9.5px}
  #reportsFuelType{max-width:170px}.darkmode .c360-fuel-type-box{background:#0d1828;border-color:#26374b}.darkmode .c360-fuel-type-box b{color:#e8f0fa}.darkmode .c360-fuel-type-badge{background:#10243b;border-color:#294660;color:#8fc9ff}.darkmode .c360-fuel-type-badge.s10{background:#102d25;border-color:#255341;color:#8ce1b7}.darkmode .c360-fuel-type-badge.unknown{background:#1a2432;border-color:#334155;color:#a8b5c5}
  @media(max-width:700px){.c360-fuel-type-summary{grid-template-columns:1fr 1fr}.c360-fuel-type-summary .c360-fuel-type-box.unknown{grid-column:1/-1}#reportsFuelType{max-width:none;width:100%}}
 `;document.head.appendChild(s);
}

function ensureFuelTypeField(){
 ensureStyle();
 const card=document.getElementById('fuelEditCard');
 if(!card)return null;
 let sel=document.getElementById('fuelType');
 if(sel)return sel;
 const station=document.getElementById('fuelStation');
 const row=station?.closest('.row');
 if(!row)return null;
 const box=document.createElement('div');box.id='fuelTypeBox';box.innerHTML='<label>Tipo de combustível</label><select id="fuelType" required><option value="">Selecione...</option><option value="s500">Diesel S500</option><option value="s10">Diesel S10</option></select><div class="muted" style="margin-top:5px">Obrigatório para separar consumo e custo nos relatórios.</div>';
 row.insertBefore(box,station.closest('div'));
 sel=box.querySelector('#fuelType');
 sel.addEventListener('change',()=>{selectedFuelType=norm(sel.value)});
 return sel;
}

function ensureReportFuelFilter(){
 ensureStyle();
 const vehicle=document.getElementById('reportsFuelVehicle');
 if(!vehicle||document.getElementById('reportsFuelType'))return;
 const sel=document.createElement('select');sel.id='reportsFuelType';sel.setAttribute('aria-label','Filtrar relatório por tipo de combustível');sel.innerHTML='<option value="all">Todos combustíveis</option><option value="s500">Diesel S500</option><option value="s10">Diesel S10</option><option value="unknown">Não informado</option>';
 vehicle.insertAdjacentElement('afterend',sel);
 sel.addEventListener('change',()=>vehicle.dispatchEvent(new Event('change',{bubbles:true})));
}

function typeFromEntry(x){return norm(x?.metadata?.fuel_type||x?.metadata?.diesel_type||x?.fuel_type)}
function matchesType(x,filter){const t=typeFromEntry(x);return filter==='all'||(filter==='unknown'&&!t)||t===filter}
function recalcGroup(g,filter){
 const entries=(g.entries||[]).filter(x=>matchesType(x,filter));
 return {...g,entries,logs:entries.length,liters:entries.reduce((s,x)=>s+Number(x.liters||0),0),cost:entries.reduce((s,x)=>s+Number(x.total_amount||0),0)};
}
function typeSummary(entries=[]){
 const buckets={s500:{liters:0,cost:0,count:0},s10:{liters:0,cost:0,count:0},unknown:{liters:0,cost:0,count:0}};
 for(const x of entries){const k=typeFromEntry(x)||'unknown';buckets[k].liters+=Number(x.liters||0);buckets[k].cost+=Number(x.total_amount||0);buckets[k].count++}
 return buckets;
}
function decorateReport(groups=[]){
 const cards=[...document.querySelectorAll('#reportsFuel .fuel-report-vehicle')];
 cards.forEach((card,i)=>{
  const g=groups[i];if(!g)return;
  card.querySelector('.c360-fuel-type-summary')?.remove();
  const b=typeSummary(g.entries||[]);
  const html=['s500','s10','unknown'].filter(k=>b[k].count>0).map(k=>'<div class="c360-fuel-type-box '+k+'"><span>'+esc(LABELS[k].toUpperCase())+'</span><b>'+esc(liters(b[k].liters))+'</b><small>'+b[k].count+' abastecimento(s) • '+esc(money(b[k].cost))+'</small></div>').join('');
  if(html)card.querySelector('.fuel-report-head')?.insertAdjacentHTML('afterend','<div class="c360-fuel-type-summary">'+html+'</div>');
  const table=card.querySelector('.fuel-report-table');if(!table)return;
  const head=table.querySelector('thead tr');if(head&&!head.querySelector('[data-c360-fuel-type-head]')){
   const th=document.createElement('th');th.dataset.c360FuelTypeHead='1';th.textContent='Combustível';const posto=head.children[1];posto?.insertAdjacentElement('afterend',th);
  }
  [...table.querySelectorAll('tbody tr')].forEach((tr,j)=>{
   if(tr.querySelector('[data-c360-fuel-type-cell]'))return;
   const e=(g.entries||[])[j];const t=typeFromEntry(e);const td=document.createElement('td');td.dataset.c360FuelTypeCell='1';td.innerHTML='<span class="c360-fuel-type-badge '+(t||'unknown')+'">'+esc(label(t))+'</span>';tr.children[1]?.insertAdjacentElement('afterend',td);
  });
 });
}

function wrapReports(){
 const original=window.renderFuelReportByVehicle;
 if(typeof original!=='function'||original.__c360FuelTypeWrapped)return;
 const wrapped=function(fuels=[],vehicleFilter='all'){
  ensureReportFuelFilter();
  const filter=document.getElementById('reportsFuelType')?.value||'all';
  const adjusted=(fuels||[]).map(g=>recalcGroup(g,filter)).filter(g=>g.logs>0);
  const visible=vehicleFilter==='all'?adjusted:adjusted.filter(g=>String(g.vehicle_id||'sem-veiculo')===String(vehicleFilter));
  const out=original.call(this,adjusted,vehicleFilter);
  decorateReport(visible);
  return out;
 };
 wrapped.__c360FuelTypeWrapped=true;window.renderFuelReportByVehicle=wrapped;
}

async function loadTypeForEdit(id){
 const sel=ensureFuelTypeField();if(!sel||!id)return;
 try{
  const rows=await window.rest('v2_fuel_logs','select=id,metadata&id=eq.'+encodeURIComponent(id)+'&limit=1');
  const t=typeFromEntry(rows?.[0]);sel.value=t||'';selectedFuelType=t||'';
 }catch(_){sel.value='';selectedFuelType=''}
}

function wrapLoadFuel(){
 const original=window.loadFuel;if(typeof original!=='function'||original.__c360FuelTypeWrapped)return;
 const wrapped=async function(...args){const out=await original.apply(this,args);ensureFuelTypeField();return out};wrapped.__c360FuelTypeWrapped=true;window.loadFuel=wrapped;
}

function wrapPersistence(){
 const originalRest=window.rest;
 if(typeof originalRest==='function'&&!originalRest.__c360FuelTypeWrapped){
  const wrapped=async function(...args){
   const table=args[0],method=String(args[2]||'GET').toUpperCase();
   if(table==='v2_fuel_logs'&&['POST','PATCH','PUT'].includes(method)&&args[3]&&typeof args[3]==='object'){
    const body=args[3],current=typeFromEntry(body),t=selectedFuelType||norm(document.getElementById('fuelType')?.value)||current;
    if(t)args[3]={...body,metadata:{...(body.metadata||{}),fuel_type:t,fuel_type_label:LABELS[t]}};
   }
   return originalRest.apply(this,args);
  };wrapped.__c360FuelTypeWrapped=true;wrapped.__c360FuelTypeOriginal=originalRest;window.rest=wrapped;
 }
 const originalOffline=window.offlineQueueAdd;
 if(typeof originalOffline==='function'&&!originalOffline.__c360FuelTypeWrapped){
  const wrapped=async function(item){
   if(item?.type==='fuel'&&item.payload){const t=selectedFuelType||norm(document.getElementById('fuelType')?.value)||typeFromEntry(item.payload);if(t)item={...item,payload:{...item.payload,metadata:{...(item.payload.metadata||{}),fuel_type:t,fuel_type_label:LABELS[t]}}}}
   return originalOffline.call(this,item);
  };wrapped.__c360FuelTypeWrapped=true;window.offlineQueueAdd=wrapped;
 }
}

function bind(){
 document.addEventListener('click',e=>{
  const save=e.target.closest?.('#saveFuelBtn');
  if(save){const sel=ensureFuelTypeField(),t=norm(sel?.value);if(!t){e.preventDefault();e.stopImmediatePropagation();const m=document.getElementById('fuelMsg');if(m){m.className='error';m.textContent='Selecione Diesel S500 ou Diesel S10 antes de salvar.'}sel?.focus();return}selectedFuelType=t}
 },true);
 document.addEventListener('click',e=>{
  if(e.target.closest?.('#newFuelBtn')){const sel=ensureFuelTypeField();if(sel){sel.value='';selectedFuelType=''}}
  const edit=e.target.closest?.('.editFuelBtn');if(edit)setTimeout(()=>loadTypeForEdit(edit.dataset.id),0);
 },false);
 document.addEventListener('change',e=>{if(e.target?.id==='fuelType')selectedFuelType=norm(e.target.value)});
}

function install(){
 if(window.__c360FuelTypeInstalled)return;window.__c360FuelTypeInstalled=true;
 ensureStyle();ensureFuelTypeField();ensureReportFuelFilter();wrapPersistence();wrapReports();wrapLoadFuel();bind();
 const host=document.getElementById('screenHost');if(host)new MutationObserver(()=>{ensureFuelTypeField();ensureReportFuelFilter();wrapPersistence();wrapReports();wrapLoadFuel()}).observe(host,{childList:true,subtree:true});
 window.c360FuelType={version:VERSION,normalize:norm,label};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
