(()=>{
'use strict';

const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const arr=v=>Array.isArray(v)?v:[];
const state={
  client:null,vehicle:null,profile:null,links:[],components:[],groups:[],views:[],items:[],componentMap:new Map(),
  catalogByGroup:new Map(),itemsByView:new Map(),search:'',loadToken:0
};

function jsonText(v){
  if(v===null||v===undefined||v==='')return '—';
  if(Array.isArray(v))return v.map(x=>typeof x==='string'?x:JSON.stringify(x)).join(' • ');
  if(typeof v==='object')return Object.entries(v).map(([k,x])=>`${k}: ${typeof x==='object'?JSON.stringify(x):x}`).join(' • ');
  return String(v);
}
async function chunks(table,ids,field='id',select='*'){
  const uniq=[...new Set((ids||[]).filter(Boolean))],out=[];
  for(let i=0;i<uniq.length;i+=80){
    const r=await state.client.from(table).select(select).in(field,uniq.slice(i,i+80));
    if(r.error)throw r.error;
    out.push(...(r.data||[]));
  }
  return out;
}
async function client(){
  if(state.client)return state.client;
  if(!window.supabase||!window.SUPABASE_URL||!window.SUPABASE_PUBLISHABLE_KEY)return null;
  state.client=window.supabase.createClient(window.SUPABASE_URL,window.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  return state.client;
}
function fit(s){return s==='verified'?['Confirmada','ok']:s==='not_applicable'?['Não aplicável','danger']:['A confirmar','warn']}
function status(s){return s==='verified'?['Confirmada','ok']:s==='estimated'?['Referência','warn']:['A confirmar','neutral']}
function list(label,v){const a=arr(v);return a.length?`<div class="o360-tech-line"><b>${esc(label)}</b><ul>${a.map(x=>`<li>${esc(typeof x==='string'?x:jsonText(x))}</li>`).join('')}</ul></div>`:''}
function groupName(code){return state.groups.find(g=>g.code===code)?.name||code||'Outros'}

function addStyle(){
  if($('#o360DeepCatalogStyle'))return;
  const s=document.createElement('style');
  s.id='o360DeepCatalogStyle';
  s.textContent=`
  .o360-catalog-stats{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 12px}.o360-stat{border:1px solid #dfe7f0;border-radius:999px;padding:7px 11px;font-size:12px;background:#f8fafc;color:#475467}.o360-stat b{color:#101828}
  .o360-deep-groups{display:grid;gap:12px}.o360-deep-group{border:1px solid #dfe7f0;border-radius:14px;background:var(--surface,#fff);overflow:hidden}.o360-deep-group>summary{cursor:pointer;padding:15px 16px;font-weight:800;display:flex;justify-content:space-between;gap:12px;align-items:center}.o360-deep-group[open]>summary{border-bottom:1px solid #e7edf4}.o360-deep-parts{display:grid}.o360-group-loading{padding:18px;color:#667085;font-size:13px}.o360-deep-part{border-bottom:1px solid #edf2f7}.o360-deep-part:last-child{border-bottom:0}.o360-deep-part>summary{cursor:pointer;padding:13px 16px;display:grid;grid-template-columns:minmax(180px,1fr) minmax(160px,.7fr) auto;gap:12px;align-items:center}.o360-deep-body{padding:0 16px 16px;display:grid;gap:8px}.o360-tech-line{font-size:13px;color:#52606d}.o360-tech-line>b{color:#1d2939}.o360-tech-line ul{margin:5px 0 0;padding-left:20px}.o360-tech-kv{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.o360-tech-kv>div{border:1px solid #e8edf3;border-radius:10px;padding:9px}.o360-tech-kv span{display:block;font-size:11px;color:#7b8794}.o360-tech-kv b{font-size:13px;word-break:break-word}
  .o360-view-full{border:1px solid #dfe7f0;border-radius:15px;background:var(--surface,#fff);overflow:hidden}.o360-view-full>summary{cursor:pointer;padding:15px;display:flex;justify-content:space-between;gap:12px;align-items:center}.o360-view-full[open]>summary{border-bottom:1px solid #e7edf4}.o360-view-content{padding:15px}.o360-view-source{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0 12px}.o360-view-source a{font-size:12px}.o360-view-table{width:100%;border-collapse:collapse;font-size:12px}.o360-view-table th,.o360-view-table td{text-align:left;padding:8px;border-bottom:1px solid #edf1f5;vertical-align:top}.o360-view-table th{position:sticky;top:0;background:#f8fafc;z-index:1}.o360-view-img{max-width:100%;max-height:420px;object-fit:contain;border:1px solid #e5eaf0;border-radius:10px;background:#fff}.o360-view-note{font-size:12px;color:#667085;margin:8px 0}.o360-empty-tech{padding:18px;border:1px dashed #cbd5e1;border-radius:12px;color:#64748b}.o360-search-hit{font-size:11px;color:#667085;font-weight:500}.o360-show-more{display:flex;justify-content:center;padding:12px}.o360-show-more .btn{min-width:180px}
  @media(max-width:760px){.o360-deep-part>summary{grid-template-columns:1fr}.o360-tech-kv{grid-template-columns:1fr}.o360-view-table{font-size:11px}.o360-view-table th:nth-child(4),.o360-view-table td:nth-child(4){display:none}.o360-catalog-stats{overflow:auto;flex-wrap:nowrap;padding-bottom:3px}.o360-stat{white-space:nowrap}}
  `;
  document.head.appendChild(s);
}

function buildIndexes(){
  state.catalogByGroup=new Map();
  for(const l of state.links){
    const c=state.componentMap.get(l.component_id);if(!c)continue;
    if(!state.catalogByGroup.has(c.group_code))state.catalogByGroup.set(c.group_code,[]);
    state.catalogByGroup.get(c.group_code).push({l,c});
  }
  state.itemsByView=new Map();
  for(const it of state.items){
    if(!state.itemsByView.has(it.exploded_view_id))state.itemsByView.set(it.exploded_view_id,[]);
    state.itemsByView.get(it.exploded_view_id).push(it);
  }
  for(const rows of state.catalogByGroup.values())rows.sort((a,b)=>String(a.c.name||'').localeCompare(String(b.c.name||''),'pt-BR'));
  for(const rows of state.itemsByView.values())rows.sort((a,b)=>String(a.item_number||'').localeCompare(String(b.item_number||''),undefined,{numeric:true}));
}

async function load(){
  const token=++state.loadToken;
  const c=await client();if(!c)return;
  const id=$('#vehiclePicker')?.value||new URLSearchParams(location.search).get('vehicle');if(!id)return;
  const [vr,pr,lr,gr]=await Promise.all([
    c.from('v2_vehicles').select('id,company_id,plate,description').eq('id',id).maybeSingle(),
    c.from('v2_vehicle_technical_profiles').select('*').eq('vehicle_id',id).maybeSingle(),
    c.from('v2_vehicle_component_links').select('*').eq('vehicle_id',id),
    c.from('v2_vehicle_component_groups').select('*').order('sort_order')
  ]);
  if(token!==state.loadToken)return;
  state.vehicle=vr.data||null;state.profile=pr.data||null;state.links=lr.data||[];state.groups=gr.data||[];
  state.components=await chunks('v2_vehicle_components',state.links.map(x=>x.component_id));
  if(token!==state.loadToken)return;
  state.componentMap=new Map(state.components.map(x=>[x.id,x]));
  const viewsR=await c.from('v2_vehicle_exploded_views').select('*').order('group_code').order('title');
  if(viewsR.error)throw viewsR.error;
  state.views=(viewsR.data||[]).filter(v=>(!v.chassis_family||v.chassis_family===state.profile?.chassis_family)&&(!v.chassis_variant||v.chassis_variant===state.profile?.chassis_variant)&&(!v.engine_code||v.engine_code===state.profile?.engine_code));
  state.items=await chunks('v2_vehicle_exploded_view_items',state.views.map(v=>v.id),'exploded_view_id');
  if(token!==state.loadToken)return;
  const extra=await chunks('v2_vehicle_components',state.items.map(x=>x.component_id).filter(x=>!state.componentMap.has(x)));
  extra.forEach(x=>state.componentMap.set(x.id,x));
  buildIndexes();
  renderCatalog();renderViews();renderStats();
}

function matches(c,needle){
  if(!needle)return true;
  const hay=[c.name,c.generic_name,c.oem_part_number,c.manufacturer_part_number,c.component_type,c.location_description,c.function_description,jsonText(c.failure_symptoms),jsonText(c.diagnostic_notes),jsonText(c.required_tools),jsonText(c.torque_spec),jsonText(c.thread_spec),jsonText(c.dimensions_spec)].join(' ').toLocaleLowerCase('pt-BR');
  return hay.includes(needle);
}
function filteredGroupRows(code){
  const rows=state.catalogByGroup.get(code)||[];
  return state.search?rows.filter(({c})=>matches(c,state.search)):rows;
}

function renderStats(){
  const host=$('#catalogNotice');if(!host)return;
  const existing=$('#o360CatalogStats');if(existing)existing.remove();
  const verified=state.links.filter(x=>x.fitment_status==='verified').length;
  const micros=state.items.filter(x=>['bolt','screw','nut','washer','o_ring','gasket','seal','clip','stud','bushing','bearing'].includes(String(x.component_type||''))).length;
  const box=document.createElement('div');box.id='o360CatalogStats';box.className='o360-catalog-stats';
  box.innerHTML=`<span class="o360-stat"><b>${state.links.length.toLocaleString('pt-BR')}</b> componentes ligados</span><span class="o360-stat"><b>${verified.toLocaleString('pt-BR')}</b> aplicações confirmadas</span><span class="o360-stat"><b>${state.views.length.toLocaleString('pt-BR')}</b> vistas</span><span class="o360-stat"><b>${state.items.length.toLocaleString('pt-BR')}</b> posições</span><span class="o360-stat"><b>${micros.toLocaleString('pt-BR')}</b> fixadores/vedações/micropartes</span>`;
  host.insertAdjacentElement('afterend',box);
}

function renderCatalog(){
  const host=$('#catalogGroups');if(!host)return;
  state.search=String($('#catalogSearch')?.value||'').trim().toLocaleLowerCase('pt-BR');
  const ordered=state.groups.filter(g=>filteredGroupRows(g.code).length);
  host.className='o360-deep-groups';
  host.innerHTML=ordered.map((g,gi)=>{
    const count=filteredGroupRows(g.code).length;
    return `<details class="o360-deep-group" data-o360-group="${esc(g.code)}" ${state.search&&gi===0?'open':''}><summary><span>${esc(g.name)}${state.search?` <small class="o360-search-hit">resultado da busca</small>`:''}</span><span>${count.toLocaleString('pt-BR')} itens</span></summary><div class="o360-deep-parts"><div class="o360-group-loading">Abra o sistema para carregar as peças.</div></div></details>`;
  }).join('')||'<div class="o360-empty-tech">Nenhum item encontrado.</div>';
  host.querySelectorAll('details[open][data-o360-group]').forEach(renderGroupBody);
}

function renderGroupBody(details){
  if(!details||details.dataset.renderedFor===state.search)return;
  const code=details.dataset.o360Group;
  const rows=filteredGroupRows(code);
  const body=details.querySelector('.o360-deep-parts');if(!body)return;
  body.innerHTML=rows.map(({l,c})=>part(c,l)).join('')||'<div class="o360-group-loading">Nenhuma peça neste sistema.</div>';
  details.dataset.renderedFor=state.search;
}

function part(c,l){
  const f=fit(l.fitment_status),s=status(c.data_status);
  return `<details class="o360-deep-part"><summary><div><b>${esc(c.name)}</b><br><small>${esc(c.component_type||c.generic_name||'componente')}</small></div><div><b>${c.oem_part_number?'OEM '+esc(c.oem_part_number):'OEM a confirmar'}</b><br><small>${esc(c.manufacturer_part_number||'')}</small></div><div><span class="chip ${f[1]}">${f[0]}</span></div></summary><div class="o360-deep-body"><div class="o360-tech-kv"><div><span>Status do dado</span><b>${s[0]}</b></div><div><span>Localização</span><b>${esc(c.location_description||'A confirmar')}</b></div><div><span>Função</span><b>${esc(c.function_description||'A confirmar')}</b></div><div><span>Vista explodida</span><b>${esc(c.exploded_view_reference||'Ver conjuntos relacionados')}</b></div><div><span>Torque</span><b>${esc(jsonText(c.torque_spec))}</b></div><div><span>Conector</span><b>${esc(jsonText(c.connector_spec))}</b></div><div><span>Medidas</span><b>${esc(jsonText(c.dimensions_spec))}</b></div><div><span>Rosca/material</span><b>${esc([jsonText(c.thread_spec),jsonText(c.material_spec)].filter(x=>x!=='—').join(' • ')||'—')}</b></div></div>${list('Sintomas possíveis',c.failure_symptoms)}${list('Testes sugeridos',c.diagnostic_notes)}${list('Ferramentas necessárias',c.required_tools)}${list('Notas de substituição',c.replacement_notes)}${l.notes?`<div class="o360-tech-line"><b>Aplicação nesta condução:</b> ${esc(l.notes)}</div>`:''}</div></details>`;
}

function renderViews(){
  const host=$('#explodedViews');if(!host)return;
  host.className='o360-deep-groups';
  if(!state.views.length){host.innerHTML='<div class="o360-empty-tech">Nenhuma vista correspondente à identificação técnica.</div>';return}
  host.innerHTML=state.views.map(v=>{
    const items=state.itemsByView.get(v.id)||[];const st=status(v.verification_status);
    return `<details class="o360-view-full" data-o360-view="${esc(v.id)}"><summary><div><b>${esc(v.title)}</b><br><small>${esc(v.assembly_code||'')} • ${items.length.toLocaleString('pt-BR')} posições • ${esc(groupName(v.group_code))}</small></div><span class="chip ${st[1]}">${st[0]}</span></summary><div class="o360-view-content"><div class="o360-group-loading">Abra a vista para carregar posições, quantidades e OEM.</div></div></details>`;
  }).join('');
}

function renderViewBody(details){
  if(!details||details.dataset.rendered==='1')return;
  const id=details.dataset.o360View;const v=state.views.find(x=>x.id===id);if(!v)return;
  const items=state.itemsByView.get(id)||[];const body=details.querySelector('.o360-view-content');if(!body)return;
  body.innerHTML=`${v.image_reference?`<img class="o360-view-img" loading="lazy" src="${esc(v.image_reference)}" alt="${esc(v.title)}">`:`<div class="o360-view-note">A imagem EPC não é copiada quando a licença não autoriza armazenamento. A numeração, quantidade e peças ficam no Oficina 360; a fonte original pode ser aberta abaixo.</div>`}<div class="o360-view-source">${v.source_url?`<a class="btn soft" target="_blank" rel="noopener" href="${esc(v.source_url)}">Abrir diagrama/fonte original</a>`:''}<span class="chip neutral">${esc(v.source_name||'Fonte técnica')}</span></div><div style="overflow:auto;max-height:70vh"><table class="o360-view-table"><thead><tr><th>Item</th><th>Peça</th><th>Qtd.</th><th>Tipo</th><th>OEM</th><th>Exatidão</th></tr></thead><tbody>${items.map(it=>{const c=state.componentMap.get(it.component_id);return `<tr><td><b>${esc(it.item_number||'—')}</b>${it.parent_item_number?`<br><small>pai ${esc(it.parent_item_number)}</small>`:''}</td><td>${esc(c?.name||'Componente')}<br><small>${esc(it.position_note||c?.location_description||'')}</small></td><td>${esc(it.quantity??'—')}</td><td>${esc(it.component_type||c?.component_type||'—')}</td><td>${esc(c?.oem_part_number||'a confirmar')}</td><td>${esc(it.exactness_status||'a confirmar')}</td></tr>`}).join('')}</tbody></table></div>`;
  details.dataset.rendered='1';
}

function bind(){
  addStyle();
  const search=$('#catalogSearch');
  let timer=null;
  search?.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(renderCatalog,120)});
  const picker=$('#vehiclePicker');picker?.addEventListener('change',()=>setTimeout(()=>load().catch(console.error),180));
  document.addEventListener('toggle',e=>{
    const d=e.target;if(!(d instanceof HTMLDetailsElement)||!d.open)return;
    if(d.matches('[data-o360-group]'))renderGroupBody(d);
    if(d.matches('[data-o360-view]'))renderViewBody(d);
  },true);
}

document.addEventListener('DOMContentLoaded',()=>{bind();setTimeout(()=>load().catch(console.error),400)},{once:true});
window.O360DeepCatalog={reload:()=>load(),getCounts:()=>({components:state.links.length,views:state.views.length,positions:state.items.length})};
})();
