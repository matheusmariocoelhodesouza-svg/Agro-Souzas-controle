(function(){
 'use strict';
 const VERSION='2026.09.26-v1';
 let modal=null;
 let currentVehicleId=null;
 let catalogCache=new Map();

 function h(value){
  if(typeof window.esc==='function')return window.esc(value==null?'':String(value));
  return String(value==null?'':value).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
 }
 function fmt(value,fallback='—'){return value===null||value===undefined||value===''?fallback:String(value)}
 function statusLabel(value){return value==='verified'?'Confirmado':value==='not_applicable'?'Não aplicável':'A confirmar'}
 function componentStatus(c){return c?.data_status==='verified'?'Confirmado':c?.oem_part_number?'Referência cadastrada':'OEM pendente'}
 function canUse(){return typeof window.rest==='function'&&window.companyId}

 function installStyle(){
  if(document.getElementById('c360VehicleTechStyle'))return;
  const style=document.createElement('style');
  style.id='c360VehicleTechStyle';
  style.textContent=`
   .fleet-tech-btn{background:#e9f7ef!important;color:#17653f!important;border:1px solid #cfead9!important}
   .c360-tech-backdrop{position:fixed;inset:0;background:rgba(9,19,35,.58);z-index:2147483000;display:flex;align-items:stretch;justify-content:flex-end;backdrop-filter:blur(3px)}
   .c360-tech-drawer{width:min(920px,96vw);height:100%;background:#f5f7fb;box-shadow:-24px 0 60px rgba(8,25,47,.22);overflow:auto;color:#172033}
   .c360-tech-head{position:sticky;top:0;z-index:4;background:#fff;border-bottom:1px solid #e4eaf2;padding:16px 18px;display:flex;gap:14px;align-items:center;justify-content:space-between}
   .c360-tech-title{min-width:0}.c360-tech-title h2{font-size:20px;margin:0;color:#10233f}.c360-tech-title p{font-size:12px;color:#6b7d95;margin:4px 0 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
   .c360-tech-close{border:1px solid #d9e2ed;background:#fff;width:40px;height:40px;border-radius:12px;font-size:20px;cursor:pointer}
   .c360-tech-body{padding:16px}.c360-tech-profile{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin-bottom:14px}
   .c360-tech-kpi{background:#fff;border:1px solid #e3eaf3;border-radius:14px;padding:12px;min-height:75px}.c360-tech-kpi span{display:block;color:#71839a;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.4px}.c360-tech-kpi b{display:block;margin-top:5px;font-size:13px;color:#142641;overflow-wrap:anywhere}
   .c360-tech-note{background:#fff8e6;border:1px solid #f2e1ae;color:#755216;border-radius:13px;padding:11px 13px;font-size:12px;line-height:1.45;margin-bottom:14px}
   .c360-tech-toolbar{display:flex;gap:8px;align-items:center;margin-bottom:12px;position:sticky;top:74px;z-index:3;background:#f5f7fb;padding:5px 0}
   .c360-tech-search{flex:1;min-width:0;height:42px;border:1px solid #d9e2ed;border-radius:11px;background:#fff;padding:0 13px;font:inherit;font-size:12px}
   .c360-tech-count{font-size:11px;color:#60748d;white-space:nowrap}
   .c360-tech-group{background:#fff;border:1px solid #e3eaf3;border-radius:15px;margin-bottom:10px;overflow:hidden}.c360-tech-group summary{list-style:none;cursor:pointer;padding:13px 14px;font-weight:900;color:#173251;display:flex;align-items:center;justify-content:space-between}.c360-tech-group summary::-webkit-details-marker{display:none}.c360-tech-group summary small{font-weight:700;color:#7a8ca3}
   .c360-tech-items{border-top:1px solid #edf1f6}.c360-tech-item{padding:13px 14px;border-bottom:1px solid #edf1f6}.c360-tech-item:last-child{border-bottom:0}.c360-tech-item-head{display:flex;gap:10px;justify-content:space-between;align-items:flex-start}.c360-tech-item-name{font-weight:850;color:#193654;font-size:13px}.c360-tech-chip{display:inline-flex;border-radius:999px;padding:4px 8px;font-size:10px;font-weight:850;background:#eef4fb;color:#34516f;white-space:nowrap}.c360-tech-chip.ok{background:#e6f8ef;color:#17653f}.c360-tech-chip.warn{background:#fff5df;color:#8a5a00}
   .c360-tech-oem{margin-top:5px;font:800 12px ui-monospace,SFMono-Regular,Menlo,monospace;color:#0f2747}.c360-tech-meta{margin-top:7px;color:#6b7d95;font-size:11px;line-height:1.45}.c360-tech-meta b{color:#455c76}.c360-tech-empty{background:#fff;border:1px dashed #cfd9e5;border-radius:14px;padding:28px;text-align:center;color:#70839b}
   .c360-tech-loading{padding:50px 20px;text-align:center;color:#64748b;font-weight:700}
   @media(max-width:760px){.c360-tech-drawer{width:100vw}.c360-tech-profile{grid-template-columns:repeat(2,minmax(0,1fr))}.c360-tech-body{padding:11px}.c360-tech-head{padding:12px}.c360-tech-toolbar{top:65px}.c360-tech-item-head{flex-direction:column}.c360-tech-chip{align-self:flex-start}}
  `;
  document.head.appendChild(style);
 }

 function ensureModal(){
  if(modal)return modal;
  modal=document.createElement('div');
  modal.className='c360-tech-backdrop';
  modal.id='c360VehicleTechModal';
  modal.hidden=true;
  modal.innerHTML='<section class="c360-tech-drawer" role="dialog" aria-modal="true" aria-labelledby="c360TechTitle"><header class="c360-tech-head"><div class="c360-tech-title"><h2 id="c360TechTitle">Catálogo técnico</h2><p id="c360TechSubtitle">Carregando veículo...</p></div><button class="c360-tech-close" type="button" aria-label="Fechar">×</button></header><div class="c360-tech-body" id="c360TechBody"><div class="c360-tech-loading">Carregando ficha técnica...</div></div></section>';
  modal.addEventListener('click',e=>{if(e.target===modal)closeModal()});
  modal.querySelector('.c360-tech-close').addEventListener('click',closeModal);
  document.body.appendChild(modal);
  return modal;
 }
 function closeModal(){if(modal)modal.hidden=true;document.body.style.removeProperty('overflow');currentVehicleId=null}

 async function loadCatalog(vehicleId,force=false){
  if(!canUse())throw new Error('Sessão administrativa ainda não está pronta.');
  if(!force&&catalogCache.has(vehicleId))return catalogCache.get(vehicleId);
  const cid=encodeURIComponent(window.companyId);
  const vid=encodeURIComponent(vehicleId);
  const [profiles,links,groups]=await Promise.all([
   window.rest('v2_vehicle_technical_profiles','select=*&company_id=eq.'+cid+'&vehicle_id=eq.'+vid+'&limit=1'),
   window.rest('v2_vehicle_component_links','select=id,component_id,fitment_status,installed_part_number,installed_brand,installed_at,notes&company_id=eq.'+cid+'&vehicle_id=eq.'+vid+'&order=created_at.asc'),
   window.rest('v2_vehicle_component_groups','select=code,name,parent_code,sort_order&order=sort_order.asc')
  ]);
  const ids=[...new Set((links||[]).map(x=>x.component_id).filter(Boolean))];
  let components=[];
  if(ids.length){
   const encoded='('+ids.join(',')+')';
   components=await window.rest('v2_vehicle_components','select=*&id=in.'+encodeURIComponent(encoded));
  }
  const map=new Map((components||[]).map(c=>[c.id,c]));
  const data={profile:profiles?.[0]||null,links:links||[],groups:groups||[],components:map};
  catalogCache.set(vehicleId,data);
  return data;
 }

 function vehicleById(id){return (window.__fleetVehicles||[]).find(v=>String(v.id)===String(id))||{id}}
 function profileHtml(v,p){
  const items=[
   ['Veículo',fmt(v.description||v.model)],['Placa',fmt(v.plate)],['Ano fab./modelo',p?fmt(p.production_year)+' / '+fmt(p.model_year):fmt(v.model_year)],['Chassi',p?fmt(p.chassis_variant):'—'],
   ['Motor',p?fmt(p.engine_code):'—'],['Nº motor',p?fmt(p.engine_serial):'—'],['Potência',p?.power_cv?fmt(p.power_cv)+' cv':'—'],['Combustível',p?fmt(p.fuel_type):'—'],
   ['VIN / chassi completo',p?fmt(p.vin):'—'],['PBT',p?.gross_vehicle_weight_t?fmt(p.gross_vehicle_weight_t)+' t':'—'],['CMT',p?.gross_combination_weight_t?fmt(p.gross_combination_weight_t)+' t':'—'],['Lotação',p?.seats?fmt(p.seats)+' pessoas':'—']
  ];
  return '<div class="c360-tech-profile">'+items.map(x=>'<div class="c360-tech-kpi"><span>'+h(x[0])+'</span><b>'+h(x[1])+'</b></div>').join('')+'</div>';
 }
 function grouped(data,query=''){
  const needle=String(query||'').trim().toLocaleLowerCase('pt-BR');
  const byGroup=new Map();
  for(const link of data.links){
   const c=data.components.get(link.component_id);if(!c)continue;
   const text=[c.name,c.generic_name,c.oem_part_number,c.manufacturer_part_number,c.location_description,c.function_description].filter(Boolean).join(' ').toLocaleLowerCase('pt-BR');
   if(needle&&!text.includes(needle))continue;
   if(!byGroup.has(c.group_code))byGroup.set(c.group_code,[]);
   byGroup.get(c.group_code).push({link,c});
  }
  return byGroup;
 }
 function catalogHtml(data,query=''){
  const byGroup=grouped(data,query);
  const groups=[...data.groups].filter(g=>byGroup.has(g.code));
  if(!groups.length)return '<div class="c360-tech-empty"><strong>Nenhuma peça encontrada.</strong><div style="margin-top:6px">Tente outro termo de busca.</div></div>';
  return groups.map((g,gi)=>{
   const rows=byGroup.get(g.code)||[];
   return '<details class="c360-tech-group" '+(gi<4?'open':'')+'><summary><span>'+h(g.name)+'</span><small>'+rows.length+' item(ns)</small></summary><div class="c360-tech-items">'+rows.map(({link,c})=>{
    const verified=c.data_status==='verified'||link.fitment_status==='verified';
    const code=c.oem_part_number||c.manufacturer_part_number||'';
    const view=c.exploded_view_reference||'';
    return '<article class="c360-tech-item">'+
     '<div class="c360-tech-item-head"><div><div class="c360-tech-item-name">'+h(c.name)+'</div><div class="c360-tech-oem">'+(code?'OEM '+h(code):'OEM: aguardando validação no EPC')+'</div></div><span class="c360-tech-chip '+(verified?'ok':'warn')+'">'+h(verified?'Confirmado':componentStatus(c))+'</span></div>'+
     '<div class="c360-tech-meta">'+(c.location_description?'<div><b>Local:</b> '+h(c.location_description)+'</div>':'')+(c.function_description?'<div><b>Função:</b> '+h(c.function_description)+'</div>':'')+'<div><b>Aplicação:</b> '+h(statusLabel(link.fitment_status))+'</div>'+(view?'<div><b>Vista explodida:</b> '+h(view)+'</div>':'<div><b>Vista explodida:</b> aguardando referência EPC</div>')+(link.notes?'<div><b>Nota:</b> '+h(link.notes)+'</div>':'')+'</div>'+
    '</article>';
   }).join('')+'</div></details>';
  }).join('');
 }

 async function openVehicleTech(vehicleId){
  installStyle();ensureModal();currentVehicleId=vehicleId;modal.hidden=false;document.body.style.overflow='hidden';
  const v=vehicleById(vehicleId);
  modal.querySelector('#c360TechTitle').textContent='Ficha técnica • '+(v.description||v.model||'Veículo');
  modal.querySelector('#c360TechSubtitle').textContent=[v.make,v.model,v.plate].filter(Boolean).join(' • ');
  const body=modal.querySelector('#c360TechBody');
  body.innerHTML='<div class="c360-tech-loading">Carregando catálogo técnico...</div>';
  try{
   const data=await loadCatalog(vehicleId);
   if(currentVehicleId!==vehicleId)return;
   const p=data.profile;
   if(!p){body.innerHTML='<div class="c360-tech-empty"><strong>Ficha técnica ainda não cadastrada.</strong><div style="margin-top:6px">Cadastre o perfil técnico deste veículo antes de vincular peças.</div></div>';return}
   body.innerHTML=profileHtml(v,p)+
    '<div class="c360-tech-note"><b>Controle de precisão:</b> código OEM e vista explodida só aparecem como confirmados quando a referência foi validada. Itens pendentes não devem ser usados como confirmação de compra.</div>'+
    '<div class="c360-tech-toolbar"><input class="c360-tech-search" id="c360TechSearch" placeholder="Buscar peça, sensor, turbo, rail, código OEM..."/><span class="c360-tech-count">'+data.links.length+' itens</span></div><div id="c360TechCatalog">'+catalogHtml(data)+'</div>';
   const search=body.querySelector('#c360TechSearch'),host=body.querySelector('#c360TechCatalog');
   search.addEventListener('input',()=>{host.innerHTML=catalogHtml(data,search.value)});
  }catch(err){body.innerHTML='<div class="c360-tech-empty"><strong>Não foi possível abrir o catálogo.</strong><div style="margin-top:6px">'+h(err?.message||err)+'</div></div>'}
 }

 function decorateFleet(){
  const root=document.getElementById('frota');if(!root)return;
  root.querySelectorAll('.fleet-card[data-fleet-vehicle]').forEach(card=>{
   const actions=card.querySelector('.fleet-actions');if(!actions||actions.querySelector('.fleet-tech-btn'))return;
   const id=card.getAttribute('data-fleet-vehicle');
   const btn=document.createElement('button');btn.type='button';btn.className='btn fleet-tech-btn';btn.textContent='🔧 Catálogo técnico';btn.addEventListener('click',()=>openVehicleTech(id));
   actions.prepend(btn);
  });
 }
 function observe(){
  installStyle();decorateFleet();
  const obs=new MutationObserver(()=>decorateFleet());obs.observe(document.body,{childList:true,subtree:true});
  window.c360OpenVehicleTech=openVehicleTech;
  window.c360ReloadVehicleTech=id=>{catalogCache.delete(id);return openVehicleTech(id)};
  window.C360_VEHICLE_TECH_VERSION=VERSION;
 }
 function boot(){
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',observe,{once:true});else observe();
 }
 boot();
})();
