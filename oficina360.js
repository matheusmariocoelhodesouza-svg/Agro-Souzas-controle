(()=>{
'use strict';

const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const fmt=(v,fallback='—')=>v===null||v===undefined||v===''?fallback:String(v);
const num=(v,d=0)=>Number(v||0).toLocaleString('pt-BR',{maximumFractionDigits:d});
const date=v=>v?new Date(String(v).length===10?v+'T12:00:00':v).toLocaleDateString('pt-BR'):'—';
const money=v=>'R$ '+Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});

const state={
  client:null,session:null,vehicles:[],vehicle:null,profile:null,links:[],components:new Map(),groups:[],views:[],viewItems:[],maintenance:[],orders:[],faults:[]
};

function toast(message){
  const el=$('#toast'); if(!el)return;
  el.textContent=message; el.classList.add('show');
  clearTimeout(window.__o360Toast); window.__o360Toast=setTimeout(()=>el.classList.remove('show'),2600);
}
function statusText(s){return ({ready:'Catálogo pronto',matching:'Casando catálogo',pending_identity:'Identidade pendente',needs_review:'Revisão necessária'})[s]||'Identidade parcial'}
function identityText(s){return ({exact:'Identificação exata',vin_received:'VIN recebido',partial:'Identificação parcial'})[s]||'Identificação parcial'}
function statusClass(s){return s==='ready'?'ok':s==='matching'||s==='needs_review'?'warn':'neutral'}
function fitmentText(s){return s==='verified'?'Aplicação confirmada':s==='not_applicable'?'Não aplicável':'Aplicação candidata'}
function fitmentClass(s){return s==='verified'?'ok':s==='not_applicable'?'danger':'warn'}
function groupName(code){return state.groups.find(g=>g.code===code)?.name||code||'Outros'}
function qError(result,label){if(result?.error)throw new Error(label+': '+result.error.message);return result?.data??[]}

async function chunks(table,ids,select='*',field='id'){
  if(!ids?.length)return [];
  const uniq=[...new Set(ids.filter(Boolean))],out=[];
  for(let i=0;i<uniq.length;i+=70){
    const r=await state.client.from(table).select(select).in(field,uniq.slice(i,i+70));
    out.push(...qError(r,'Falha ao carregar '+table));
  }
  return out;
}

async function boot(){
  if(!window.supabase||!window.SUPABASE_URL||!window.SUPABASE_PUBLISHABLE_KEY){
    showGate('Configuração do sistema não carregou.'); return;
  }
  state.client=window.supabase.createClient(window.SUPABASE_URL,window.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const {data:{session}}=await state.client.auth.getSession();
  state.session=session;
  if(!session){showGate();return}
  $('#appShell').classList.remove('hidden');
  bindUi();
  await loadVehicles();
}

function showGate(message='Sua sessão do Comando 360 não está ativa neste navegador.'){
  $('#appShell')?.classList.add('hidden');
  $('#sessionGate')?.classList.remove('hidden');
  const p=$('#sessionGate p'); if(p&&message)p.textContent=message;
}

function bindUi(){
  $$('.side-nav button[data-tab]').forEach(btn=>btn.addEventListener('click',()=>openTab(btn.dataset.tab)));
  $('#vehiclePicker').addEventListener('change',()=>selectVehicle($('#vehiclePicker').value));
  $('#refreshBtn').addEventListener('click',()=>selectVehicle(state.vehicle?.id,true));
  $('#catalogSearch').addEventListener('input',renderCatalog);
}

function openTab(tab){
  $$('.side-nav button[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
  $$('.tab').forEach(x=>x.classList.toggle('active',x.id==='tab-'+tab));
  const names={overview:'Visão geral',catalog:'Catálogo de peças',exploded:'Vistas explodidas',maintenance:'Manutenção',orders:'Ordens de serviço',diagnostics:'Scanner & falhas'};
  $('#pageTitle').textContent=names[tab]||'Oficina 360';
}

async function loadVehicles(){
  try{
    const r=await state.client.from('v2_vehicles').select('id,company_id,plate,description,make,model,model_year,renavam,current_odometer_km,status,metadata').order('description');
    state.vehicles=qError(r,'Falha ao carregar frota');
    if(!state.vehicles.length){
      $('#vehiclePicker').innerHTML='<option>Nenhuma condução disponível</option>';
      toast('Nenhuma condução disponível para esta conta.');return;
    }
    $('#vehiclePicker').innerHTML=state.vehicles.map(v=>'<option value="'+esc(v.id)+'">'+esc((v.description||v.model||'Condução')+(v.plate?' • '+v.plate:''))+'</option>').join('');
    const requested=new URLSearchParams(location.search).get('vehicle');
    const chosen=state.vehicles.find(v=>v.id===requested)||state.vehicles[0];
    $('#vehiclePicker').value=chosen.id;
    await selectVehicle(chosen.id);
  }catch(e){console.error(e);showGate(e.message)}
}

async function selectVehicle(id,force=false){
  const v=state.vehicles.find(x=>x.id===id); if(!v)return;
  if(!force&&state.vehicle?.id===id&&state.profile)return;
  state.vehicle=v;
  history.replaceState(null,'',location.pathname+'?vehicle='+encodeURIComponent(id));
  setLoading(true);
  try{
    const cid=v.company_id;
    const [profileR,linksR,groupsR,viewsR,maintR,ordersR,faultsR]=await Promise.all([
      state.client.from('v2_vehicle_technical_profiles').select('*').eq('company_id',cid).eq('vehicle_id',id).maybeSingle(),
      state.client.from('v2_vehicle_component_links').select('*').eq('company_id',cid).eq('vehicle_id',id).order('created_at'),
      state.client.from('v2_vehicle_component_groups').select('*').order('sort_order'),
      state.client.from('v2_vehicle_exploded_views').select('*').order('group_code').order('title'),
      state.client.from('v2_maintenance_plans').select('*').eq('company_id',cid).eq('vehicle_id',id).order('created_at',{ascending:false}),
      state.client.from('v2_work_orders').select('*').eq('company_id',cid).eq('vehicle_id',id).order('opened_at',{ascending:false}),
      state.client.from('v2_vehicle_faults').select('*').eq('company_id',cid).eq('vehicle_id',id).order('last_seen_at',{ascending:false})
    ]);
    if(profileR.error)throw profileR.error;
    state.profile=profileR.data||null;
    state.links=qError(linksR,'Falha no catálogo');
    state.groups=qError(groupsR,'Falha nos grupos');
    state.maintenance=qError(maintR,'Falha na manutenção');
    state.orders=qError(ordersR,'Falha nas ordens');
    state.faults=qError(faultsR,'Falha nas falhas');
    const allViews=qError(viewsR,'Falha nas vistas explodidas');

    const componentIds=state.links.map(x=>x.component_id);
    const components=await chunks('v2_vehicle_components',componentIds);
    state.components=new Map(components.map(c=>[c.id,c]));

    const p=state.profile;
    state.views=allViews.filter(x=>{
      if(x.chassis_family&&(!p?.chassis_family||String(x.chassis_family).toLowerCase()!==String(p.chassis_family).toLowerCase()))return false;
      if(x.chassis_variant&&(!p?.chassis_variant||String(x.chassis_variant).toLowerCase()!==String(p.chassis_variant).toLowerCase()))return false;
      if(x.engine_code&&(!p?.engine_code||String(x.engine_code).toLowerCase()!==String(p.engine_code).toLowerCase()))return false;
      return true;
    });
    state.viewItems=await chunks('v2_vehicle_exploded_view_items',state.views.map(x=>x.id),'*','exploded_view_id');
    const extraIds=state.viewItems.map(x=>x.component_id).filter(x=>!state.components.has(x));
    if(extraIds.length){
      const extra=await chunks('v2_vehicle_components',extraIds);
      extra.forEach(c=>state.components.set(c.id,c));
    }
    renderAll();
    $('#syncState').textContent='● Sincronizado agora';
  }catch(e){
    console.error(e); toast(e.message||'Não foi possível carregar a condução.');
    $('#syncState').textContent='● Falha de sincronização';
  }finally{setLoading(false)}
}

function setLoading(on){
  $('#refreshBtn').disabled=on;
  $('#syncState').textContent=on?'● Sincronizando...':'● Sincronizado';
  if(on)$('#vehicleHero').innerHTML='Carregando condução e inteligência técnica...';
}

function renderAll(){
  renderBadge(); renderHero(); renderOverview(); renderCatalog(); renderViews(); renderMaintenance(); renderOrders(); renderFaults();
}

function renderBadge(){
  const p=state.profile,b=$('#vehicleIdentityBadge');
  if(!p){b.className='identity-badge pending';b.textContent='Ficha técnica pendente';return}
  b.textContent=statusText(p.catalog_status);
  b.className='identity-badge '+(p.catalog_status==='ready'?'ready':p.catalog_status==='matching'||p.catalog_status==='needs_review'?'matching':'pending');
}

function renderHero(){
  const v=state.vehicle,p=state.profile;
  $('#vehicleHero').classList.remove('loading-block');
  $('#vehicleHero').innerHTML='<div class="title"><div class="vehicle-icon">🚐</div><div><span class="eyebrow" style="color:#88a6c7">CONDUÇÃO SINCRONIZADA</span><h2>'+esc(v.description||v.model||'Condução')+'</h2><p>'+esc([v.make,v.model,v.model_year].filter(Boolean).join(' • ')||'Modelo a identificar')+'</p></div></div><div class="hero-meta"><span class="hero-pill">Placa '+esc(v.plate||'—')+'</span><span class="hero-pill">'+num(v.current_odometer_km,0)+' km</span><span class="hero-pill">'+esc(p?.engine_code||'Motor a identificar')+'</span></div>';
}

function renderOverview(){
  const v=state.vehicle,p=state.profile;
  const verified=state.links.filter(x=>x.fitment_status==='verified').length;
  const openOrders=state.orders.filter(x=>!['completed','closed','cancelled'].includes(String(x.status||'').toLowerCase())).length;
  const activeFaults=state.faults.filter(x=>String(x.status||'active').toLowerCase()==='active').length;
  $('#overviewKpis').innerHTML=[
    ['HODÔMETRO',num(v.current_odometer_km,0)+' km','Atualizado pelo Comando 360'],
    ['PEÇAS VINCULADAS',num(state.links.length),verified+' confirmadas'],
    ['VISTAS TÉCNICAS',num(state.views.length),state.viewItems.length+' posições cadastradas'],
    ['OFICINA',openOrders+' OS aberta(s)',activeFaults+' falha(s) ativa(s)']
  ].map(x=>'<div class="kpi-card"><div class="kpi-label">'+x[0]+'</div><div class="kpi-value">'+x[1]+'</div><div class="kpi-note">'+x[2]+'</div></div>').join('');

  const values=[
    ['VIN / chassi',p?.vin],['Família chassi',p?.chassis_family],['Variante',p?.chassis_variant],['Motor',p?.engine_code],['Nº motor',p?.engine_serial],['Ano fab./modelo',(p?.production_year||'—')+' / '+(p?.model_year||v.model_year||'—')],['Potência',p?.power_cv?p.power_cv+' cv':null],['Combustível',p?.fuel_type],['PBT',p?.gross_vehicle_weight_t?p.gross_vehicle_weight_t+' t':null]
  ];
  $('#technicalProfile').innerHTML=values.map(x=>'<div class="detail"><span>'+esc(x[0])+'</span><b>'+esc(fmt(x[1]))+'</b></div>').join('');
  const chip=$('#profileStatusChip'); chip.className='chip '+statusClass(p?.catalog_status);chip.textContent=p?identityText(p.identity_status)+' • '+statusText(p.catalog_status):'Ficha pendente';

  const actions=[];
  if(!p||p.identity_status==='partial')actions.push(['Identidade técnica incompleta','O CRLV criou a ficha, mas ainda faltam VIN/chassi ou dados suficientes para identificar a configuração exata.','warn']);
  else if(p.identity_status==='vin_received')actions.push(['VIN recebido','O Oficina já recebeu o chassi e está pronto para o próximo estágio de identificação de motor/variante.','warn']);
  else actions.push(['Configuração identificada','VIN, variante de chassi e motor estão definidos. O catálogo compatível pode ser usado respeitando o status de cada peça.','ok']);
  if(state.links.some(x=>x.fitment_status==='candidate'))actions.push(['Existem aplicações candidatas','Itens marcados como candidatos precisam de confirmação antes da compra.','warn']);
  const overdue=state.maintenance.filter(isMaintenanceOverdue);
  if(overdue.length)actions.push(['Manutenção vencida',overdue.length+' registro(s) com vencimento por data ou quilometragem.','danger']);
  if(activeFaults)actions.push(['Falhas ativas',activeFaults+' falha(s) registrada(s) pelo diagnóstico.','danger']);
  $('#attentionList').innerHTML=actions.map(x=>'<div class="list-row"><div class="main-copy"><strong>'+esc(x[0])+'</strong><small>'+esc(x[1])+'</small></div><span class="chip '+x[2]+'">'+(x[2]==='ok'?'OK':'ATENÇÃO')+'</span></div>').join('')||'<div class="empty">Nenhuma ação pendente.</div>';

  const history=[];
  state.orders.slice(0,4).forEach(o=>history.push({when:o.completed_at||o.opened_at,title:o.title||'Ordem de serviço',text:o.service_performed||o.diagnosis||o.reported_issue||'OS registrada',tag:'OS'}));
  state.maintenance.slice(0,4).forEach(m=>history.push({when:m.last_done_at||m.created_at,title:m.name,text:m.metadata?.parts||m.metadata?.notes||'Manutenção registrada',tag:'MANUTENÇÃO'}));
  history.sort((a,b)=>new Date(b.when||0)-new Date(a.when||0));
  $('#recentHistory').innerHTML=history.slice(0,6).map(x=>'<div class="list-row"><div class="main-copy"><strong>'+esc(x.title)+'</strong><small>'+esc(x.text)+'</small></div><div class="right"><span class="chip neutral">'+x.tag+'</span><small>'+date(x.when)+'</small></div></div>').join('')||'<div class="empty">O histórico deste veículo aparecerá aqui.</div>';
}

function filteredCatalog(){
  const needle=String($('#catalogSearch')?.value||'').trim().toLocaleLowerCase('pt-BR');
  const by=new Map();
  for(const link of state.links){
    const c=state.components.get(link.component_id); if(!c)continue;
    const text=[c.name,c.generic_name,c.oem_part_number,c.manufacturer_part_number,c.location_description,c.function_description].filter(Boolean).join(' ').toLocaleLowerCase('pt-BR');
    if(needle&&!text.includes(needle))continue;
    if(!by.has(c.group_code))by.set(c.group_code,[]);
    by.get(c.group_code).push({link,c});
  }
  return by;
}

function renderCatalog(){
  const p=state.profile,notice=$('#catalogNotice');
  if(!p){notice.className='notice warn';notice.textContent='A ficha técnica ainda não foi criada.'}
  else if(p.catalog_status==='ready'){notice.className='notice ok';notice.innerHTML='<b>Catálogo vinculado à configuração técnica.</b> Peças “confirmadas” têm aplicação validada; peças “candidatas” continuam exigindo conferência antes da compra.'}
  else{notice.className='notice warn';notice.innerHTML='<b>'+esc(statusText(p.catalog_status))+'.</b> O Oficina não transforma marca/modelo/ano em compatibilidade exata sem evidência de chassi/motor.'}
  const by=filteredCatalog(),ordered=state.groups.filter(g=>by.has(g.code));
  $('#catalogGroups').innerHTML=ordered.map((g,i)=>{
    const rows=by.get(g.code)||[];
    return '<details class="catalog-group" '+(i<4?'open':'')+'><summary><span>'+esc(g.name)+'</span><span class="catalog-count">'+rows.length+' item(ns)</span></summary><div class="part-list">'+rows.map(({link,c})=>'<div class="part-row"><div><div class="part-name">'+esc(c.name)+'</div><div class="part-meta">'+(c.location_description?'<b>Local:</b> '+esc(c.location_description)+'<br>':'')+(c.function_description?'<b>Função:</b> '+esc(c.function_description):'')+'</div></div><div><div class="part-oem">'+(c.oem_part_number?'OEM '+esc(c.oem_part_number):'OEM pendente')+'</div><div class="part-meta">'+(c.manufacturer_part_number?'Fabricante '+esc(c.manufacturer_part_number):'')+'</div></div><div class="part-status"><span class="chip '+fitmentClass(link.fitment_status)+'">'+fitmentText(link.fitment_status)+'</span></div></div>').join('')+'</div></details>';
  }).join('')||'<div class="empty">Nenhuma peça vinculada para esta configuração ainda.</div>';
}

function renderViews(){
  const host=$('#explodedViews');
  if(!state.views.length){host.innerHTML='<div class="empty">Ainda não há vistas técnicas correspondentes à configuração identificada deste veículo.</div>';return}
  host.innerHTML=state.views.map(v=>{
    const items=state.viewItems.filter(x=>x.exploded_view_id===v.id).sort((a,b)=>String(a.item_number||'').localeCompare(String(b.item_number||''),undefined,{numeric:true}));
    const verified=v.verification_status==='verified';
    return '<article class="view-card"><div class="view-icon">'+(v.image_reference?'<img src="'+esc(v.image_reference)+'" alt="'+esc(v.title)+'" style="max-width:100%;max-height:100%;object-fit:contain">':'<div><b>VISTA '+esc(v.source_diagram_key||v.assembly_code||'TÉCNICA')+'</b><br>Itens e referências carregados.<br>Imagem EPC não armazenada quando a licença é somente referência.</div>')+'</div><h3>'+esc(v.title)+'</h3><p>'+esc([groupName(v.group_code),v.source_name,verified?'Referência validada':'Referência em validação'].filter(Boolean).join(' • '))+'</p><div class="view-parts">'+items.slice(0,8).map(it=>{const c=state.components.get(it.component_id);return '<div class="view-part"><b>'+esc(it.item_number||'•')+'</b><span>'+esc(c?.name||'Componente')+(c?.oem_part_number?' • '+esc(c.oem_part_number):'')+'</span></div>'}).join('')+(items.length>8?'<div class="view-part"><b>+</b><span>'+ (items.length-8)+' itens adicionais</span></div>':'')+'</div></article>';
  }).join('');
}

function isMaintenanceOverdue(m){
  const km=Number(state.vehicle?.current_odometer_km||0),dueKm=Number(m.next_due_odometer_km||0);
  if(dueKm>0&&km>=dueKm)return true;
  if(m.next_due_at){const d=new Date(m.next_due_at+'T23:59:59');if(d<Date.now())return true}
  return false;
}
function maintenanceState(m){
  if(isMaintenanceOverdue(m))return ['VENCIDA','danger'];
  const km=Number(state.vehicle?.current_odometer_km||0),dueKm=Number(m.next_due_odometer_km||0);
  if(dueKm>0&&dueKm-km<=1000)return ['PRÓXIMA','warn'];
  if(m.next_due_at){const days=Math.ceil((new Date(m.next_due_at+'T12:00:00')-Date.now())/86400000);if(days<=30)return ['PRÓXIMA','warn']}
  return [m.active===false?'INATIVA':'REGISTRADA',m.active===false?'neutral':'ok'];
}
function renderMaintenance(){
  const overdue=state.maintenance.filter(isMaintenanceOverdue).length;
  const scheduled=state.maintenance.filter(x=>x.next_due_at||x.next_due_odometer_km).length;
  const cost=state.maintenance.reduce((s,x)=>s+Number(x.metadata?.labor_cost||0)+Number(x.metadata?.parts_cost||0),0);
  $('#maintenanceSummary').innerHTML=[['REGISTROS',state.maintenance.length,'Histórico ligado à condução'],['COM VENCIMENTO',scheduled,overdue+' vencida(s)'],['CUSTO REGISTRADO',money(cost),'Peças + mão de obra informadas']].map(x=>'<div class="kpi-card"><div class="kpi-label">'+x[0]+'</div><div class="kpi-value">'+x[1]+'</div><div class="kpi-note">'+x[2]+'</div></div>').join('');
  $('#maintenanceList').innerHTML=state.maintenance.map(m=>{const st=maintenanceState(m),parts=m.metadata?.parts_items?.length?m.metadata.parts_items.map(x=>x.description).filter(Boolean).join(', '):m.metadata?.parts;return '<div class="list-row"><div class="main-copy"><strong>'+esc(m.name)+'</strong><small>'+esc([m.asset_name,parts,m.metadata?.workshop].filter(Boolean).join(' • ')||'Registro de manutenção')+'</small><small>Última execução: '+date(m.last_done_at||m.created_at)+(m.last_done_odometer_km?' • '+num(m.last_done_odometer_km,0)+' km':'')+'</small></div><div class="right"><span class="chip '+st[1]+'">'+st[0]+'</span><small>'+(m.next_due_odometer_km?'Próx. '+num(m.next_due_odometer_km,0)+' km':m.next_due_at?'Próx. '+date(m.next_due_at):'Sem próximo vencimento')+'</small></div></div>'}).join('')||'<div class="empty">Ainda não há manutenção registrada para esta condução.</div>';
}

function renderOrders(){
  $('#workOrders').innerHTML=state.orders.map(o=>'<div class="list-row"><div class="main-copy"><strong>OS '+esc(o.work_order_number||'—')+' • '+esc(o.title)+'</strong><small>'+esc(o.reported_issue||o.diagnosis||o.service_performed||'Sem descrição técnica')+'</small><small>'+date(o.opened_at)+(o.odometer_km?' • '+num(o.odometer_km,0)+' km':'')+'</small></div><div class="right"><span class="chip '+(String(o.status).toLowerCase()==='completed'?'ok':'warn')+'">'+esc(String(o.status||'open').toUpperCase())+'</span><small>'+money(o.total_amount)+'</small></div></div>').join('')||'<div class="empty">Nenhuma ordem de serviço aberta ou concluída neste veículo.</div>';
}

function renderFaults(){
  $('#faultsList').innerHTML=state.faults.map(f=>'<div class="list-row"><div class="main-copy"><strong>'+esc(f.code||((f.spn!=null?'SPN '+f.spn:'')+(f.fmi!=null?' / FMI '+f.fmi:''))||'Falha sem código')+'</strong><small>'+esc(f.description||'Descrição ainda não interpretada')+'</small><small>Protocolo '+esc((f.protocol||'').toUpperCase())+' • Última ocorrência '+date(f.last_seen_at)+'</small></div><div class="right"><span class="chip '+(String(f.status).toLowerCase()==='active'?'danger':'ok')+'">'+esc(String(f.status||'active').toUpperCase())+'</span><small>'+(f.occurrence_count?f.occurrence_count+' ocorrência(s)':'')+'</small></div></div>').join('')||'<div class="empty">Nenhuma falha de scanner registrada para esta condução. A base já está pronta para receber dados de diagnóstico.</div>';
}

document.addEventListener('DOMContentLoaded',()=>boot().catch(e=>{console.error(e);showGate(e.message)}),{once:true});
})();
