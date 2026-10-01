(()=>{
'use strict';
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const n=v=>Number(v||0);
const money=v=>'R$ '+n(v).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
const qty=(v,d=0)=>n(v).toLocaleString('pt-BR',{maximumFractionDigits:d});
const when=v=>v?new Date(v).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}):'—';
const sameDay=(a,b=new Date())=>a&&new Date(a).toDateString()===b.toDateString();
const classLabel={van:'Van / Sprinter',microbus:'Micro-ônibus',bus:'Ônibus',truck:'Caminhão',pickup:'Pickup',car:'Carro',machine:'Máquina',other:'Outro',any:'Qualquer'};
const statusLabel={scheduled:'Agendada',in_progress:'Em andamento',completed:'Concluída',cancelled:'Cancelada'};
const severityLabel={info:'Informação',attention:'Atenção',urgent:'Urgente'};
const stageLabel={waiting:'Aguardando',prewash:'Pré-lavagem',washing:'Lavagem',finishing:'Acabamento',inspection:'Inspeção',ready:'Pronto',delivered:'Entregue'};
const stageFlow=['waiting','prewash','washing','finishing','inspection','ready','delivered'];
const state={client:null,session:null,company:null,canManage:false,vehicles:[],customers:[],externalVehicles:[],services:[],products:[],orders:[],findings:[],settings:null,usageCart:[],detailOrder:null,detailChecklist:[],detailPhotos:[],detailStages:[]};

function toast(message,type='ok'){
  const el=$('#toast');if(!el)return;
  el.textContent=message;el.className='toast show '+type;
  clearTimeout(window.__l360Toast);window.__l360Toast=setTimeout(()=>el.className='toast',2800);
}
function query(result,label){if(result?.error)throw new Error(label+': '+result.error.message);return result?.data??[]}
function showGate(message='Entre no Lavador 360 para continuar.'){$('#appShell')?.classList.add('hidden');$('#sessionGate')?.classList.remove('hidden');const p=$('#sessionGate p');if(p)p.textContent=message}

async function boot(){
  if(!window.supabase||!window.SUPABASE_URL||!window.SUPABASE_PUBLISHABLE_KEY){showGate('Configuração do sistema não carregou.');return;}
  state.client=window.supabase.createClient(window.SUPABASE_URL,window.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const {data:{session}}=await state.client.auth.getSession();state.session=session;
  if(!session){showGate();return;}
  try{
    const memberR=await state.client.from('v2_company_members').select('company_id,status').eq('user_id',session.user.id).eq('status','active').limit(1).maybeSingle();
    if(memberR.error)throw memberR.error;
    if(!memberR.data?.company_id){showGate('Sua conta ainda não está vinculada a uma empresa do ecossistema 360.');return;}
    const companyR=await state.client.from('v2_companies').select('id,trade_name,legal_name').eq('id',memberR.data.company_id).maybeSingle();
    if(companyR.error)throw companyR.error;
    if(!companyR.data){showGate('Empresa do ecossistema 360 não encontrada.');return;}
    state.company=companyR.data;
    const permissionR=await state.client.rpc('v2_has_permission',{p_company_id:state.company.id,p_permission_code:'wash.manage'});
    if(permissionR.error)throw new Error('Não foi possível validar sua permissão no Lavador 360: '+permissionR.error.message);
    state.canManage=Boolean(permissionR.data);
    $('#sessionGate').classList.add('hidden');$('#appShell').classList.remove('hidden');
    bindUi();await loadData();
  }catch(err){console.error(err);showGate(err.message||'Não foi possível abrir o Lavador 360.');}
}

function bindUi(){
  $$('.side-nav button[data-tab]').forEach(btn=>btn.addEventListener('click',()=>openTab(btn.dataset.tab)));
  $('[data-open-tab]').forEach(btn=>btn.addEventListener('click',()=>openTab(btn.dataset.openTab)));
  $('#washPhotoInput')?.addEventListener('change',uploadWashPhoto);
  $('#deliverWashBtn')?.addEventListener('click',deliverCurrentWash);
  $('#refreshBtn')?.addEventListener('click',loadData);
  $('#logoutBtn')?.addEventListener('click',logout);
  $('#washOwnership')?.addEventListener('change',()=>{syncOwnership();applyVehicleClass();renderServiceOptions();applyServiceDefaults();updateLiveEstimate();});
  $('#washVehicle')?.addEventListener('change',()=>{applyVehicleClass();renderServiceOptions();applyServiceDefaults();updateLiveEstimate();});
  $('#washExternalVehicle')?.addEventListener('change',()=>{applyVehicleClass();renderServiceOptions();applyServiceDefaults();updateLiveEstimate();});
  $('#washVehicleClass')?.addEventListener('change',()=>{renderServiceOptions();applyServiceDefaults();updateLiveEstimate();});
  $('#washService')?.addEventListener('change',()=>{applyServiceDefaults();updateLiveEstimate();});
  ['washSalePrice','washReferencePrice','washWaterLiters','washEnergyKwh','washLaborMinutes','washConsumables','washEquipment'].forEach(id=>$('#'+id)?.addEventListener('input',updateLiveEstimate));
  $('#usageProduct')?.addEventListener('change',prefillUsageRatio);
  $('#usageSolution')?.addEventListener('input',updateUsagePreview);
  $('#usageRatio')?.addEventListener('input',updateUsagePreview);
  $('#addUsageBtn')?.addEventListener('click',addUsage);
  $('#usageCart')?.addEventListener('click',e=>{const b=e.target.closest('[data-remove-usage]');if(b){state.usageCart.splice(Number(b.dataset.removeUsage),1);renderUsageCart();updateLiveEstimate();}});
  $('#washForm')?.addEventListener('submit',submitWash);
  $('#customerForm')?.addEventListener('submit',submitCustomer);
  $('#externalVehicleForm')?.addEventListener('submit',submitExternalVehicle);
  $('#productForm')?.addEventListener('submit',submitProduct);
  $('#findingForm')?.addEventListener('submit',submitFinding);
  $('#settingsForm')?.addEventListener('submit',submitSettings);
  $('#savePricesBtn')?.addEventListener('click',savePrices);
  $('#washSearch')?.addEventListener('input',renderWashes);
  $('#washStatusFilter')?.addEventListener('change',renderWashes);
  document.addEventListener('click',handleActions);
}

async function logout(){
  try{await state.client.auth.signOut()}catch(_){ }
  try{localStorage.removeItem('controla_beta_session')}catch(_){ }
  location.reload();
}

function openTab(tab){
  $$('.side-nav button[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
  $$('.tab').forEach(x=>x.classList.toggle('active',x.id==='tab-'+tab));
  const names={dashboard:'Visão geral',patio:'Pátio','new-wash':'Nova lavagem',washes:'Lavagens',customers:'Clientes',products:'Produtos & estoque',findings:'Inspeções',settings:'Custos & preços','wash-detail':'Detalhes da lavagem'};
  $('#pageTitle').textContent=names[tab]||'Lavador 360';
  window.scrollTo({top:0,behavior:'smooth'});
}

async function loadData(){
  $('#syncState').textContent='● Sincronizando';
  $('#refreshBtn').disabled=true;
  try{
    const cid=state.company.id;
    const [vehiclesR,customersR,externalR,servicesR,productsR,ordersR,findingsR,settingsR]=await Promise.all([
      state.client.from('v2_vehicles').select('id,company_id,plate,description,make,model,model_year,current_odometer_km,status,metadata').eq('company_id',cid).order('description'),
      state.client.from('v2_wash_customers').select('*').eq('company_id',cid).order('name'),
      state.client.from('v2_wash_customer_vehicles').select('*').eq('company_id',cid).order('description'),
      state.client.from('v2_wash_service_catalog').select('*').eq('company_id',cid).eq('active',true).order('vehicle_class').order('name'),
      state.client.from('v2_wash_products').select('*').eq('company_id',cid).eq('active',true).order('name'),
      state.client.from('v2_wash_orders').select('*').eq('company_id',cid).order('created_at',{ascending:false}).limit(250),
      state.client.from('v2_wash_findings').select('*').eq('company_id',cid).order('created_at',{ascending:false}).limit(150),
      state.client.from('v2_wash_settings').select('*').eq('company_id',cid).maybeSingle()
    ]);
    state.vehicles=query(vehiclesR,'Frota');state.customers=query(customersR,'Clientes');state.externalVehicles=query(externalR,'Veículos externos');state.services=query(servicesR,'Serviços');state.products=query(productsR,'Produtos');state.orders=query(ordersR,'Lavagens');state.findings=query(findingsR,'Inspeções');
    if(settingsR.error)throw settingsR.error;
    state.settings=settingsR.data||{company_id:cid,water_cost_per_liter:0,energy_cost_per_kwh:0,labor_cost_per_hour:0,equipment_cost_per_wash:0,consumables_cost_per_wash:0};
    renderAll();$('#syncState').textContent='● Sincronizado agora';
  }catch(err){console.error(err);toast(err.message||'Falha ao atualizar dados.','error');$('#syncState').textContent='● Falha de sincronização';}
  finally{$('#refreshBtn').disabled=false;}
}

function renderAll(){
  $('#companyName').textContent=state.company.trade_name||state.company.legal_name||'Empresa 360';
  renderSelectors();renderDashboard();renderPatio();renderWashes();renderCustomers();renderProducts();renderFindings();renderSettings();syncOwnership();applyVehicleClass();renderServiceOptions();renderUsageCart();updateLiveEstimate();applyManageState();
}

function renderSelectors(){
  const vehicle=$('#washVehicle');if(vehicle)vehicle.innerHTML=state.vehicles.map(v=>`<option value="${esc(v.id)}">${esc((v.description||v.model||'Condução')+(v.plate?' • '+v.plate:''))}</option>`).join('')||'<option value="">Nenhuma condução disponível</option>';
  const ext=$('#washExternalVehicle');if(ext)ext.innerHTML=state.externalVehicles.map(v=>{const c=state.customers.find(x=>x.id===v.customer_id);return `<option value="${esc(v.id)}">${esc(v.description+(v.plate?' • '+v.plate:'')+(c?' • '+c.name:''))}</option>`}).join('')||'<option value="">Cadastre um veículo de cliente</option>';
  const customer=$('#externalVehicleCustomer');if(customer)customer.innerHTML='<option value="">Selecione...</option>'+state.customers.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');
  const usage=$('#usageProduct');if(usage)usage.innerHTML='<option value="">Selecione...</option>'+state.products.map(p=>`<option value="${esc(p.id)}">${esc(p.name+(p.brand?' • '+p.brand:''))} • ${qty(p.stock_ml/1000,2)} L</option>`).join('');
  const finding=$('#findingWash');if(finding)finding.innerHTML='<option value="">Selecione...</option>'+state.orders.filter(o=>o.status!=='cancelled').slice(0,80).map(o=>`<option value="${esc(o.id)}">#${o.wash_number} • ${esc(o.vehicle_label)} • ${esc(o.service_name)}</option>`).join('');
  prefillUsageRatio();
}

function inferClass(v){
  const s=[v?.description,v?.make,v?.model].filter(Boolean).join(' ').toLocaleLowerCase('pt-BR');
  if(/sprinter|\bvan\b|ducato|master|boxer|jumper/.test(s))return 'van';
  if(/volare|micro[ -]?onibus|micro[ -]?ônibus/.test(s))return 'microbus';
  if(/comil|ônibus|onibus|pia o|piá o/.test(s))return 'bus';
  if(/608|caminh|truck/.test(s))return 'truck';
  return v?.vehicle_class||'other';
}
function selectedOwnership(){return $('#washOwnership')?.value||'internal'}
function selectedVehicle(){return state.vehicles.find(v=>v.id===$('#washVehicle')?.value)}
function selectedExternal(){return state.externalVehicles.find(v=>v.id===$('#washExternalVehicle')?.value)}
function syncOwnership(){const external=selectedOwnership()==='external';$('#ownVehicleField')?.classList.toggle('hidden',external);$('#externalVehicleField')?.classList.toggle('hidden',!external);const label=$('#liveResultLabel');if(label)label.textContent=external?'Margem estimada':'Economia estimada'}
function applyVehicleClass(){const item=selectedOwnership()==='external'?selectedExternal():selectedVehicle();if(item&&$('#washVehicleClass'))$('#washVehicleClass').value=inferClass(item)}
function renderServiceOptions(){
  const select=$('#washService');if(!select)return;
  const cls=$('#washVehicleClass')?.value||'other',current=select.value;
  const list=state.services.filter(s=>s.vehicle_class===cls||s.vehicle_class==='any');
  select.innerHTML=list.map(s=>`<option value="${esc(s.id)}">${esc(s.name)} • ${classLabel[s.vehicle_class]||s.vehicle_class}</option>`).join('')||'<option value="">Nenhum serviço cadastrado</option>';
  if(list.some(s=>s.id===current))select.value=current;
}
function selectedService(){return state.services.find(s=>s.id===$('#washService')?.value)}
function applyServiceDefaults(){
  const s=selectedService();if(!s)return;
  $('#washSalePrice').value=selectedOwnership()==='external'?n(s.sale_price).toFixed(2):'0.00';
  $('#washReferencePrice').value=n(s.outsourced_reference_price||s.sale_price).toFixed(2);
  updateLiveEstimate();
}

function productCost(){return state.usageCart.reduce((sum,x)=>sum+n(x.cost),0)}
function estimate(){
  const s=state.settings||{};
  const water=n($('#washWaterLiters')?.value)*n(s.water_cost_per_liter);
  const energy=n($('#washEnergyKwh')?.value)*n(s.energy_cost_per_kwh);
  const labor=n($('#washLaborMinutes')?.value)/60*n(s.labor_cost_per_hour);
  const consum=n($('#washConsumables')?.value),equipment=n($('#washEquipment')?.value),products=productCost();
  const cost=water+energy+labor+consum+equipment+products;
  const external=selectedOwnership()==='external';
  const result=external?n($('#washSalePrice')?.value)-cost:Math.max(n($('#washReferencePrice')?.value)-cost,0);
  return {cost,result};
}
function updateLiveEstimate(){const e=estimate();if($('#liveCost'))$('#liveCost').textContent=money(e.cost);if($('#liveResult'))$('#liveResult').textContent=money(e.result)}
function prefillUsageRatio(){const p=state.products.find(x=>x.id===$('#usageProduct')?.value);if(p&&$('#usageRatio'))$('#usageRatio').value=p.default_dilution_ratio??'';updateUsagePreview()}
function updateUsagePreview(){const b=$('#addUsageBtn');if(!b)return;const sol=n($('#usageSolution')?.value),ratio=n($('#usageRatio')?.value),p=state.products.find(x=>x.id===$('#usageProduct')?.value);if(!p||!sol){b.textContent='Adicionar';return}const concentrate=sol/(ratio+1);b.textContent=`Adicionar • ${qty(concentrate,0)} ml`}
function addUsage(){
  const p=state.products.find(x=>x.id===$('#usageProduct')?.value),solution=n($('#usageSolution')?.value),ratio=n($('#usageRatio')?.value);
  if(!p||solution<=0){toast('Escolha o produto e informe a quantidade preparada.','error');return;}
  const concentrate=solution/(ratio+1),cost=concentrate*n(p.unit_cost_per_ml);
  if(concentrate>n(p.stock_ml)){toast(`Estoque insuficiente de ${p.name}.`,'error');return;}
  state.usageCart.push({product_id:p.id,name:p.name,solution_ml:solution,dilution_ratio:ratio,concentrate_ml:concentrate,cost});
  $('#usageSolution').value='';renderUsageCart();updateLiveEstimate();updateUsagePreview();
}
function renderUsageCart(){
  const el=$('#usageCart');if(!el)return;
  el.innerHTML=state.usageCart.length?state.usageCart.map((x,i)=>`<div class="usage-item"><b>${esc(x.name)}</b><span>Solução ${qty(x.solution_ml,0)} ml</span><span>1:${qty(x.dilution_ratio,1)}</span><span>${qty(x.concentrate_ml,0)} ml • ${money(x.cost)}</span><button type="button" class="usage-remove" data-remove-usage="${i}">×</button></div>`).join(''):'<div class="empty">Nenhum produto adicionado nesta lavagem.</div>';
}

function renderDashboard(){
  const today=state.orders.filter(o=>sameDay(o.created_at)&&o.status==='completed');
  const revenue=today.filter(o=>o.ownership==='external').reduce((s,o)=>s+n(o.sale_price),0);
  const cost=today.reduce((s,o)=>s+n(o.total_cost),0);
  const savings=today.filter(o=>o.ownership==='internal').reduce((s,o)=>s+n(o.estimated_savings),0);
  $('#dashboardKpis').innerHTML=[['LAVAGENS HOJE',today.length,'concluídas'],['FATURAMENTO HOJE',money(revenue),'clientes externos'],['CUSTO HOJE',money(cost),'produtos + operação'],['ECONOMIA INTERNA',money(savings),'vs. terceirização']].map(x=>`<div class="kpi-card"><div class="kpi-label">${x[0]}</div><div class="kpi-value">${x[1]}</div><div class="kpi-note">${x[2]}</div></div>`).join('');
  const active=state.orders.filter(o=>['in_progress','scheduled'].includes(o.status)).slice(0,8);
  $('#activeWashes').innerHTML=active.length?active.map(o=>miniWash(o)).join(''):'<div class="empty">Nenhuma lavagem em andamento.</div>';
  const low=state.products.filter(p=>n(p.stock_ml)<=n(p.minimum_stock_ml));
  $('#stockAlerts').innerHTML=low.length?low.slice(0,8).map(p=>`<div class="list-row"><div class="main-copy"><strong>${esc(p.name)}</strong><small>${qty(p.stock_ml/1000,2)} L restantes • mínimo ${qty(p.minimum_stock_ml/1000,2)} L</small></div><span class="chip warn">REPOR</span></div>`).join(''):'<div class="empty">Estoque sem alertas.</div>';
  $('#recentWashes').innerHTML=state.orders.length?state.orders.slice(0,7).map(o=>miniWash(o)).join(''):'<div class="empty">A primeira lavagem registrada aparecerá aqui.</div>';
}
function miniWash(o){const result=o.ownership==='external'?`Margem ${money(o.margin_value)}`:`Economia ${money(o.estimated_savings)}`;return `<div class="list-row"><div class="main-copy"><strong>#${o.wash_number} • ${esc(o.vehicle_label)}</strong><small>${esc(o.service_name)} • ${when(o.created_at)}</small></div><div class="right"><span class="chip ${statusClass(o.status)}">${statusLabel[o.status]||o.status}</span><small>${money(o.total_cost)} • ${result}</small></div></div>`}
function statusClass(s){return s==='completed'?'ok':s==='in_progress'?'brand':s==='scheduled'?'warn':'neutral'}

function filteredOrders(){const search=String($('#washSearch')?.value||'').trim().toLocaleLowerCase('pt-BR'),status=$('#washStatusFilter')?.value||'';return state.orders.filter(o=>(!status||o.status===status)&&(!search||[o.vehicle_label,o.plate_snapshot,o.service_name,o.responsible_name].filter(Boolean).join(' ').toLocaleLowerCase('pt-BR').includes(search)))}
function renderPatio(){
  const board=$('#patioBoard'),kpis=$('#patioKpis');if(!board)return;
  const active=state.orders.filter(o=>o.status!=='cancelled'&&o.status!=='completed'&&(o.operation_stage||'waiting')!=='delivered');
  if(kpis)kpis.innerHTML='<article class="kpi"><span>No pátio</span><strong>'+active.length+'</strong></article><article class="kpi"><span>Lavando</span><strong>'+active.filter(o=>o.operation_stage==='washing').length+'</strong></article><article class="kpi"><span>Inspeção</span><strong>'+active.filter(o=>o.operation_stage==='inspection').length+'</strong></article><article class="kpi"><span>Prontos</span><strong>'+active.filter(o=>o.operation_stage==='ready').length+'</strong></article>';
  board.innerHTML=stageFlow.slice(0,6).map(stage=>{
    const list=active.filter(o=>(o.operation_stage||'waiting')===stage);
    const cards=list.map(o=>{
      const next=stageFlow[stageFlow.indexOf(stage)+1];
      let actions='<button class="btn soft small" data-action="open-wash" data-id="'+esc(o.id)+'">Abrir</button>'+(next?'<button class="btn soft small" data-action="advance-stage" data-id="'+esc(o.id)+'" data-stage="'+next+'">→ '+stageLabel[next]+'</button>':'');
      if(stage==='inspection')actions+='<button class="btn soft small" data-action="qa-approve" data-id="'+esc(o.id)+'">✓ Aprovar</button><button class="btn soft small" data-action="qa-rework" data-id="'+esc(o.id)+'">↺ Refazer</button>';
      return '<article class="patio-card"><strong>#'+o.wash_number+' • '+esc(o.vehicle_label)+'</strong><small>'+esc(o.plate_snapshot||'Sem placa')+' • '+esc(o.service_name)+'</small><small>Responsável: '+esc(o.responsible_name||'Não informado')+'</small>'+(o.odometer_km?'<small>Entrada: '+qty(o.odometer_km,1)+' km</small>':'')+(o.qa_status==='rework'?'<span class="badge danger">Refazer</span>':'')+'<div class="card-actions">'+actions+'</div></article>';
    }).join('');
    return '<section class="patio-column"><div class="patio-column-head"><strong>'+stageLabel[stage]+'</strong><span>'+list.length+'</span></div><div class="patio-cards">'+(cards||'<div class="empty-state">Nenhum veículo</div>')+'</div></section>';
  }).join('');
}

function renderWashes(){const list=filteredOrders();$('#washList').innerHTML=list.length?list.map(washCard).join(''):'<div class="empty">Nenhuma lavagem encontrada.</div>'}
function washCard(o){
  const external=o.ownership==='external',result=external?o.margin_value:o.estimated_savings;
  return `<div class="wash-card"><div class="wash-card-head"><div><h4>#${o.wash_number} • ${esc(o.vehicle_label)} ${o.plate_snapshot?'• '+esc(o.plate_snapshot):''}</h4><p>${esc(o.service_name)} • ${classLabel[o.vehicle_class]||o.vehicle_class} • ${when(o.created_at)}${o.responsible_name?' • '+esc(o.responsible_name):''}</p></div><div><span class="chip ${external?'neutral':'brand'}">${external?'CLIENTE':'FROTA PRÓPRIA'}</span> <span class="chip ${statusClass(o.status)}">${statusLabel[o.status]||o.status}</span></div></div><div class="wash-metrics"><div class="wash-metric"><span>${external?'COBRADO':'REFERÊNCIA'}</span><b>${money(external?o.sale_price:o.outsourced_reference_price)}</b></div><div class="wash-metric"><span>CUSTO REAL</span><b>${money(o.total_cost)}</b></div><div class="wash-metric"><span>PRODUTOS</span><b>${money(o.products_cost)}</b></div><div class="wash-metric"><span>${external?'MARGEM':'ECONOMIA'}</span><b>${money(result)}</b></div></div><div class="wash-actions">${o.status==='in_progress'&&state.canManage?`<button class="btn soft small" data-action="complete-wash" data-id="${o.id}">✓ Concluir</button>`:''}<button class="btn soft small" data-action="inspect-wash" data-id="${o.id}">⚠ Inspeção</button></div></div>`;
}

function renderCustomers(){
  $('#customerList').innerHTML=state.customers.length?state.customers.map(c=>{const vs=state.externalVehicles.filter(v=>v.customer_id===c.id),w=state.orders.filter(o=>o.customer_id===c.id);return `<div class="list-row"><div class="main-copy"><strong>${esc(c.name)}</strong><small>${esc(c.phone||c.email||c.document||'Sem contato informado')} • ${vs.length} veículo(s) • ${w.length} lavagem(ns)</small>${vs.length?`<small>${vs.map(v=>esc((v.plate?v.plate+' • ':'')+v.description)).join(' · ')}</small>`:''}</div><span class="chip neutral">CLIENTE</span></div>`}).join(''):'<div class="empty">Nenhum cliente externo cadastrado.</div>';
}

function renderProducts(){
  let inventory=0;
  $('#productList').innerHTML=state.products.length?state.products.map(p=>{const low=n(p.stock_ml)<=n(p.minimum_stock_ml),value=n(p.stock_ml)*n(p.unit_cost_per_ml);inventory+=value;return `<div class="product-card ${low?'low':''}"><div class="product-top"><div><h4>${esc(p.name)}</h4><p>${esc(p.brand||'Sem marca')} • embalagem ${qty(p.package_size_ml/1000,2)} L</p></div><span class="chip ${low?'warn':'ok'}">${low?'REPOR':'OK'}</span></div><div class="product-stats"><div class="product-stat"><span>ESTOQUE</span><b>${qty(p.stock_ml/1000,2)} L</b></div><div class="product-stat"><span>CUSTO / L</span><b>${money(n(p.unit_cost_per_ml)*1000)}</b></div><div class="product-stat"><span>DILUIÇÃO</span><b>${p.default_dilution_ratio!==null?'1:'+qty(p.default_dilution_ratio,1):'—'}</b></div><div class="product-stat"><span>VALOR ESTOQUE</span><b>${money(value)}</b></div></div>${state.canManage?`<div class="wash-actions"><button class="btn soft small" data-action="restock" data-id="${p.id}">+ Repor estoque</button></div>`:''}</div>`}).join(''):'<div class="empty">Cadastre seus produtos para calcular o custo real das lavagens.</div>';
  $('#inventoryValue').textContent=money(inventory);
}

function renderFindings(){
  $('#findingList').innerHTML=state.findings.length?state.findings.map(f=>{const o=state.orders.find(x=>x.id===f.wash_order_id),cls=f.severity==='urgent'?'danger':f.severity==='attention'?'warn':'neutral';return `<div class="list-row"><div class="main-copy"><strong>${esc(o?.vehicle_label||'Veículo')} • ${esc(f.description)}</strong><small>${esc(f.category)} • ${when(f.created_at)}${f.sent_to_workshop?' • enviado ao Oficina 360':''}</small></div><div class="right"><span class="chip ${cls}">${severityLabel[f.severity]||f.severity}</span>${f.vehicle_id&&!f.sent_to_workshop&&state.canManage?`<button class="btn soft small" data-action="send-workshop" data-id="${f.id}">Enviar ao Oficina</button>`:''}${f.workshop_order_id?`<a class="btn soft small" href="./oficina360.html?vehicle=${encodeURIComponent(f.vehicle_id)}">Abrir Oficina</a>`:''}</div></div>`}).join(''):'<div class="empty">Nenhum problema encontrado nas lavagens.</div>';
}

function renderSettings(){
  const f=$('#settingsForm'),s=state.settings||{};if(f){['water_cost_per_liter','energy_cost_per_kwh','labor_cost_per_hour','equipment_cost_per_wash','consumables_cost_per_wash'].forEach(k=>{if(f.elements[k])f.elements[k].value=n(s[k])});}
  $('#washConsumables').value=n(s.consumables_cost_per_wash).toFixed(2);$('#washEquipment').value=n(s.equipment_cost_per_wash).toFixed(2);
  $('#servicePriceList').innerHTML=state.services.map(s=>`<div class="price-row" data-service-row="${s.id}"><div><strong>${esc(s.name)}</strong><small>${classLabel[s.vehicle_class]||s.vehicle_class}</small></div><label>Venda (R$)<input data-price="sale" type="number" min="0" step="0.01" value="${n(s.sale_price).toFixed(2)}"></label><label>Referência (R$)<input data-price="reference" type="number" min="0" step="0.01" value="${n(s.outsourced_reference_price).toFixed(2)}"></label></div>`).join('');
}
function applyManageState(){
  const editable=['washForm','customerForm','externalVehicleForm','productForm','findingForm','settingsForm'];
  editable.forEach(id=>$('#'+id)?.querySelectorAll('input,select,textarea,button').forEach(x=>x.disabled=!state.canManage));
  $('#servicePriceList input').forEach(x=>x.disabled=!state.canManage);
  if($('#savePricesBtn'))$('#savePricesBtn').disabled=!state.canManage;
}

async function submitWash(event){
  event.preventDefault();if(!state.canManage)return;
  const form=event.currentTarget,ownership=selectedOwnership(),own=selectedVehicle(),ext=selectedExternal(),service=selectedService();
  if(!service){toast('Escolha um serviço.','error');return;}
  if(ownership==='internal'&&!own){toast('Escolha uma condução da frota.','error');return;}
  if(ownership==='external'&&!ext){toast('Cadastre e escolha o veículo do cliente.','error');return;}
  const status=form.elements.status.value,now=new Date().toISOString(),item=ownership==='internal'?own:ext;
  const payload={company_id:state.company.id,ownership,customer_id:ownership==='external'?ext.customer_id:null,vehicle_id:ownership==='internal'?own.id:null,customer_vehicle_id:ownership==='external'?ext.id:null,plate_snapshot:item.plate||null,vehicle_label:item.description||item.model||item.plate||'Veículo',vehicle_class:form.elements.vehicle_class.value,service_code:service.code,service_name:service.name,status,scheduled_for:status==='scheduled'?now:null,started_at:status!=='scheduled'?now:null,finished_at:status==='completed'?now:null,responsible_name:form.elements.responsible_name.value.trim()||null,operation_stage:status==='completed'?'ready':'waiting',odometer_km:form.elements.odometer_km.value===''?null:n(form.elements.odometer_km.value),fuel_level:form.elements.fuel_level.value||null,checkin_notes:form.elements.checkin_notes.value.trim()||null,qa_status:status==='completed'?'approved':'pending',sale_price:n(form.elements.sale_price.value),outsourced_reference_price:n(form.elements.outsourced_reference_price.value),water_liters:n(form.elements.water_liters.value),water_cost_per_liter:n(state.settings.water_cost_per_liter),energy_kwh:n(form.elements.energy_kwh.value),energy_cost_per_kwh:n(state.settings.energy_cost_per_kwh),labor_minutes:Math.round(n(form.elements.labor_minutes.value)),labor_cost_per_hour:n(state.settings.labor_cost_per_hour),consumables_cost:n(form.elements.consumables_cost.value),equipment_cost:n(form.elements.equipment_cost.value),notes:form.elements.notes.value.trim()||null};
  const btn=$('#saveWashBtn');btn.disabled=true;btn.textContent='Salvando...';let orderId=null;
  try{
    const orderR=await state.client.from('v2_wash_orders').insert(payload).select('id,wash_number').single();if(orderR.error)throw orderR.error;orderId=orderR.data.id;
    if(state.usageCart.length){const rows=state.usageCart.map(x=>({company_id:state.company.id,wash_order_id:orderId,product_id:x.product_id,concentrate_ml:Number(x.concentrate_ml.toFixed(2)),solution_ml:Number(x.solution_ml.toFixed(2)),dilution_ratio:Number(x.dilution_ratio.toFixed(2))}));const usageR=await state.client.from('v2_wash_order_products').insert(rows);if(usageR.error)throw usageR.error;}
    toast(`Lavagem #${orderR.data.wash_number} registrada.`);state.usageCart=[];form.reset();$('#washOwnership').value='internal';await loadData();openTab('washes');
  }catch(err){console.error(err);if(orderId){try{await state.client.from('v2_wash_orders').delete().eq('id',orderId)}catch(_){ }}toast(err.message||'Não foi possível salvar a lavagem.','error');}
  finally{btn.disabled=false;btn.textContent='Salvar lavagem';}
}

async function submitCustomer(event){event.preventDefault();if(!state.canManage)return;const f=event.currentTarget,p={company_id:state.company.id,name:f.elements.name.value.trim(),phone:f.elements.phone.value.trim()||null,document:f.elements.document.value.trim()||null,email:f.elements.email.value.trim()||null};try{const r=await state.client.from('v2_wash_customers').insert(p);if(r.error)throw r.error;f.reset();toast('Cliente cadastrado.');await loadData()}catch(err){toast(err.message,'error')}}
async function submitExternalVehicle(event){event.preventDefault();if(!state.canManage)return;const f=event.currentTarget,p={company_id:state.company.id,customer_id:f.elements.customer_id.value,plate:f.elements.plate.value.trim().toUpperCase()||null,description:f.elements.description.value.trim(),vehicle_class:f.elements.vehicle_class.value};if(!p.customer_id){toast('Selecione o cliente.','error');return}try{const r=await state.client.from('v2_wash_customer_vehicles').insert(p);if(r.error)throw r.error;f.reset();toast('Veículo do cliente cadastrado.');await loadData()}catch(err){toast(err.message,'error')}}
async function submitProduct(event){event.preventDefault();if(!state.canManage)return;const f=event.currentTarget,p={company_id:state.company.id,name:f.elements.name.value.trim(),brand:f.elements.brand.value.trim()||null,package_size_ml:n(f.elements.package_size_ml.value),purchase_price:n(f.elements.purchase_price.value),stock_ml:n(f.elements.stock_ml.value),minimum_stock_ml:n(f.elements.minimum_stock_ml.value),default_dilution_ratio:f.elements.default_dilution_ratio.value===''?null:n(f.elements.default_dilution_ratio.value)};try{const r=await state.client.from('v2_wash_products').insert(p).select('*').single();if(r.error)throw r.error;state.products=[r.data,...state.products.filter(x=>x.id!==r.data.id)].sort((a,b)=>(a.name||'').localeCompare(b.name||''));f.reset();f.elements.package_size_ml.value=5000;f.elements.stock_ml.value=5000;f.elements.minimum_stock_ml.value=1000;renderSelectors();renderProducts();updateLiveEstimate();toast('Produto cadastrado com sucesso.')}catch(err){console.error('Falha ao cadastrar produto',err);toast(err?.message||'Não foi possível cadastrar o produto.','error')}}
async function submitFinding(event){event.preventDefault();if(!state.canManage)return;const f=event.currentTarget,o=state.orders.find(x=>x.id===f.elements.wash_order_id.value);if(!o){toast('Escolha uma lavagem.','error');return}const p={company_id:state.company.id,wash_order_id:o.id,vehicle_id:o.vehicle_id||null,category:f.elements.category.value,severity:f.elements.severity.value,description:f.elements.description.value.trim()};try{const r=await state.client.from('v2_wash_findings').insert(p);if(r.error)throw r.error;f.reset();toast('Inspeção registrada.');await loadData()}catch(err){toast(err.message,'error')}}
async function submitSettings(event){event.preventDefault();if(!state.canManage)return;const f=event.currentTarget,p={company_id:state.company.id,water_cost_per_liter:n(f.elements.water_cost_per_liter.value),energy_cost_per_kwh:n(f.elements.energy_cost_per_kwh.value),labor_cost_per_hour:n(f.elements.labor_cost_per_hour.value),equipment_cost_per_wash:n(f.elements.equipment_cost_per_wash.value),consumables_cost_per_wash:n(f.elements.consumables_cost_per_wash.value),updated_at:new Date().toISOString()};try{const r=await state.client.from('v2_wash_settings').upsert(p,{onConflict:'company_id'});if(r.error)throw r.error;toast('Custos padrão atualizados.');await loadData()}catch(err){toast(err.message,'error')}}
async function savePrices(){if(!state.canManage)return;const rows=$$('[data-service-row]');const btn=$('#savePricesBtn');btn.disabled=true;try{for(const row of rows){const id=row.dataset.serviceRow,sale=n(row.querySelector('[data-price="sale"]').value),ref=n(row.querySelector('[data-price="reference"]').value);const r=await state.client.from('v2_wash_service_catalog').update({sale_price:sale,outsourced_reference_price:ref,updated_at:new Date().toISOString()}).eq('id',id).eq('company_id',state.company.id);if(r.error)throw r.error}toast('Tabela de preços atualizada.');await loadData()}catch(err){toast(err.message,'error')}finally{btn.disabled=false}}

async function handleActions(event){
  const b=event.target.closest('[data-action]');if(!b)return;
  const id=b.dataset.id,action=b.dataset.action;
  if(action==='complete-wash')await completeWash(id);
  if(action==='inspect-wash'){if($('#findingWash'))$('#findingWash').value=id;openTab('findings');$('#findingForm')?.scrollIntoView({behavior:'smooth',block:'start'});}
  if(action==='send-workshop')await sendToWorkshop(id);
  if(action==='restock')await restock(id);
  if(action==='advance-stage')await advanceStage(id,b.dataset.stage);
  if(action==='qa-approve')await qaDecision(id,'approved');
  if(action==='qa-rework')await qaDecision(id,'rework');
  if(action==='open-wash')await openWashDetail(id);
  if(action==='check-result')await setChecklistResult(id,b.dataset.phase,b.dataset.code,b.dataset.label,b.dataset.result);
}
const washChecklistTemplate=[
 ['checkin','body','Carroceria e avarias'],['checkin','glass','Vidros e espelhos'],['checkin','lights','Faróis e lanternas'],['checkin','tires','Rodas e pneus'],['checkin','leaks','Vazamentos aparentes'],
 ['wash','prewash','Pré-lavagem completa'],['wash','wheels_wash','Rodas e caixas de roda'],['wash','body_wash','Carroceria externa'],['wash','cab_wash','Cabine/interior contratado'],['wash','chassis_wash','Chassi/parte inferior contratado'],
 ['qa','body_qa','Carroceria sem resíduos'],['qa','glass_qa','Vidros sem manchas'],['qa','wheels_qa','Rodas finalizadas'],['qa','cab_qa','Cabine finalizada'],['qa','details_qa','Detalhes e cantos conferidos'],['qa','leak_qa','Sem nova anormalidade visível']
];
async function openWashDetail(id){
  const o=state.orders.find(x=>x.id===id);if(!o)return;state.detailOrder=o;
  try{
    const [cr,pr,sr]=await Promise.all([state.client.from('v2_wash_checklist_items').select('*').eq('wash_order_id',id).order('created_at'),state.client.from('v2_wash_photos').select('*').eq('wash_order_id',id).order('created_at'),state.client.from('v2_wash_stage_events').select('*').eq('wash_order_id',id).order('created_at')]);
    state.detailChecklist=query(cr,'Checklist');state.detailPhotos=query(pr,'Fotos');state.detailStages=query(sr,'Tempos');renderWashDetail();openTab('wash-detail');
  }catch(err){toast(err.message||'Falha ao abrir detalhes.','error')}
}
function renderWashDetail(){
  const o=state.detailOrder;if(!o)return;
  $('#detailTitle').textContent='#'+o.wash_number+' • '+o.vehicle_label;$('#detailSubtitle').textContent=(o.plate_snapshot||'Sem placa')+' • '+o.service_name+' • '+stageLabel[o.operation_stage||'waiting'];
  const elapsed=o.started_at?Math.max(0,Math.round(((o.finished_at?new Date(o.finished_at):new Date())-new Date(o.started_at))/60000)):0;
  $('#detailSummary').innerHTML='<article class="kpi"><span>Etapa</span><strong>'+stageLabel[o.operation_stage||'waiting']+'</strong></article><article class="kpi"><span>Tempo</span><strong>'+elapsed+' min</strong></article><article class="kpi"><span>Custo</span><strong>'+money(o.total_cost)+'</strong></article><article class="kpi"><span>Economia</span><strong>'+money(o.estimated_savings)+'</strong></article>';
  $('#washChecklist').innerHTML=washChecklistTemplate.map(x=>{const r=state.detailChecklist.find(i=>i.phase===x[0]&&i.item_code===x[1]);const val=r?.result||'pending';return '<div class="check-row"><div><strong>'+esc(x[2])+'</strong><small>'+x[0].toUpperCase()+'</small></div><div class="check-actions">'+['ok','fail','na'].map(v=>'<button class="check-btn '+(val===v?'active '+v:'')+'" data-action="check-result" data-id="'+o.id+'" data-phase="'+x[0]+'" data-code="'+x[1]+'" data-label="'+esc(x[2])+'" data-result="'+v+'">'+(v==='ok'?'✓ OK':v==='fail'?'! Falha':'N/A')+'</button>').join('')+'</div></div>'}).join('');
  renderWashPhotos();renderVehicleHistory();renderStageTimeline();renderDeliveryGate();
}
async function setChecklistResult(orderId,phase,code,label,result){
  if(!state.canManage)return;let notes=null;if(result==='fail')notes=prompt('Descreva a falha encontrada:','')||null;
  try{const row={company_id:state.company.id,wash_order_id:orderId,phase,item_code:code,item_label:label,result,notes,updated_at:new Date().toISOString()};const r=await state.client.from('v2_wash_checklist_items').upsert(row,{onConflict:'wash_order_id,phase,item_code'}).select().single();if(r.error)throw r.error;state.detailChecklist=state.detailChecklist.filter(x=>!(x.phase===phase&&x.item_code===code));state.detailChecklist.push(r.data);renderWashDetail();if(result==='fail')toast('Falha registrada.','error')}catch(err){toast(err.message||'Falha ao salvar checklist.','error')}
}
async function uploadWashPhoto(event){
  const file=event.target.files?.[0],o=state.detailOrder;if(!file||!o)return;if(file.size>8388608){toast('Foto acima de 8 MB.','error');event.target.value='';return}
  const phase=$('#photoPhase').value,angle=$('#photoAngle').value,ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'')||'jpg',path=state.company.id+'/'+o.id+'/'+phase+'/'+Date.now()+'-'+angle+'.'+ext;
  try{toast('Enviando foto...');const up=await state.client.storage.from('v2-wash-photos').upload(path,file,{contentType:file.type||'image/jpeg'});if(up.error)throw up.error;const r=await state.client.from('v2_wash_photos').insert({company_id:state.company.id,wash_order_id:o.id,phase,angle_code:angle,storage_path:path}).select().single();if(r.error)throw r.error;state.detailPhotos.push(r.data);renderWashPhotos();toast('Foto salva.')}catch(err){toast(err.message||'Falha ao enviar foto.','error')}finally{event.target.value=''}
}
async function renderWashPhotos(){
  const grid=$('#washPhotoGrid');if(!grid)return;const cards=await Promise.all(state.detailPhotos.map(async p=>{const s=await state.client.storage.from('v2-wash-photos').createSignedUrl(p.storage_path,3600);return '<figure><img src="'+esc(s.data?.signedUrl||'')+'" alt="'+esc(p.angle_code)+'"><figcaption>'+esc(p.phase==='before'?'Antes':'Depois')+' • '+esc(p.angle_code)+'</figcaption></figure>'}));grid.innerHTML=cards.join('')||'<div class="empty-state">Nenhuma foto ainda.</div>';
}
function renderStageTimeline(){
 const el=$('#washStageTimeline');if(!el)return;const rows=state.detailStages;
 el.innerHTML=rows.map((e,i)=>{const next=rows[i+1];const mins=next?Math.max(0,Math.round((new Date(next.created_at)-new Date(e.created_at))/60000)):null;return '<div class="list-row"><div><strong>'+esc(stageLabel[e.stage]||e.stage)+'</strong><small>'+when(e.created_at)+(e.notes?' • '+esc(e.notes):'')+'</small></div><div><strong>'+(mins===null?'Em andamento':mins+' min')+'</strong></div></div>'}).join('')||'<div class="empty-state">Os tempos começam a ser registrados ao avançar as etapas.</div>';
}
function deliveryReady(){
 const o=state.detailOrder;if(!o)return false;const after=state.detailPhotos.some(p=>p.phase==='after');const qa=state.detailChecklist.filter(x=>x.phase==='qa');const qaDone=washChecklistTemplate.filter(x=>x[0]==='qa').every(x=>qa.some(r=>r.item_code===x[1]&&r.result!=='pending'));
 return o.qa_status==='approved'&&after&&qaDone;
}
function renderDeliveryGate(){
 const o=state.detailOrder,btn=$('#deliverWashBtn'),msg=$('#deliveryGate');if(!o||!btn||!msg)return;const ready=deliveryReady();btn.disabled=!state.canManage||!ready||o.status==='completed';msg.textContent=o.status==='completed'?'Veículo já liberado.':ready?'Tudo conferido. Veículo pronto para liberação.':'Para liberar: QA aprovado + checklist de inspeção completo + ao menos 1 foto Depois.';
 if($('#checkoutOdometer'))$('#checkoutOdometer').value=o.checkout_odometer_km||'';if($('#checkoutFuel'))$('#checkoutFuel').value=o.checkout_fuel_level||'';
}
async function deliverCurrentWash(){
 const o=state.detailOrder;if(!o||!deliveryReady())return toast('Finalize QA, checklist e foto Depois antes da entrega.','error');
 const km=Number($('#checkoutOdometer').value||0),fuel=$('#checkoutFuel').value;if(km&&o.odometer_km&&km<Number(o.odometer_km))return toast('Hodômetro de saída não pode ser menor que o de entrada.','error');
 const now=new Date().toISOString(),duration=o.started_at?Math.max(0,Math.round((new Date(now)-new Date(o.started_at))/60000)):null;
 try{const r=await state.client.from('v2_wash_orders').update({operation_stage:'delivered',status:'completed',finished_at:now,delivered_at:now,checkout_odometer_km:km||null,checkout_fuel_level:fuel||null,actual_duration_minutes:duration}).eq('id',o.id).eq('company_id',state.company.id);if(r.error)throw r.error;await state.client.from('v2_wash_stage_events').insert({company_id:state.company.id,wash_order_id:o.id,stage:'delivered',event_type:'enter'});toast('Veículo liberado e lavagem encerrada.');await loadData();openTab('patio')}catch(err){toast(err.message||'Falha ao liberar veículo.','error')}
}
function renderVehicleHistory(){
  const o=state.detailOrder;if(!o)return;const list=state.orders.filter(x=>x.id!==o.id&&((o.vehicle_id&&x.vehicle_id===o.vehicle_id)||(o.customer_vehicle_id&&x.customer_vehicle_id===o.customer_vehicle_id))).slice(0,20);
  $('#vehicleWashHistory').innerHTML=list.map(x=>'<div class="list-row"><div><strong>#'+x.wash_number+' • '+esc(x.service_name)+'</strong><small>'+when(x.created_at)+' • '+statusLabel[x.status]+'</small></div><div><strong>'+money(x.total_cost)+'</strong><small>'+qty(x.water_liters,1)+' L água</small></div></div>').join('')||'<div class="empty-state">Primeira lavagem registrada desta condução.</div>';
}

async function advanceStage(id,stage){if(!state.canManage||!stageFlow.includes(stage))return;const o=state.orders.find(x=>x.id===id);if(!o)return;if(stage==='delivered')return openWashDetail(id);try{const patch={operation_stage:stage};if(stage==='washing'&&!o.started_at)patch.started_at=new Date().toISOString();if(stage==='inspection')patch.qa_status='pending';const r=await state.client.from('v2_wash_orders').update(patch).eq('id',id).eq('company_id',state.company.id);if(r.error)throw r.error;const ev=await state.client.from('v2_wash_stage_events').insert({company_id:state.company.id,wash_order_id:id,stage,event_type:'enter'});if(ev.error)throw ev.error;toast('Etapa atualizada: '+stageLabel[stage]+'.');await loadData()}catch(err){toast(err.message||'Não foi possível avançar a etapa.','error')}}
async function qaDecision(id,status){if(!state.canManage)return;const notes=status==='rework'?(prompt('O que precisa ser refeito?','')||null):null;try{const patch={qa_status:status,qa_notes:notes,qa_checked_at:new Date().toISOString(),operation_stage:status==='approved'?'ready':'washing'};if(status==='rework')patch.rework_count=(Number(state.orders.find(x=>x.id===id)?.rework_count)||0)+1;const r=await state.client.from('v2_wash_orders').update(patch).eq('id',id).eq('company_id',state.company.id);if(r.error)throw r.error;const ev=await state.client.from('v2_wash_stage_events').insert({company_id:state.company.id,wash_order_id:id,stage:status==='approved'?'ready':'washing',event_type:status==='approved'?'qa_approved':'rework',notes});if(ev.error)throw ev.error;toast(status==='approved'?'Qualidade aprovada.':'Veículo voltou para lavagem.');await loadData()}catch(err){toast(err.message||'Falha no controle de qualidade.','error')}}
async function completeWash(id){if(!state.canManage)return;try{const r=await state.client.from('v2_wash_orders').update({status:'completed',finished_at:new Date().toISOString()}).eq('id',id).eq('company_id',state.company.id);if(r.error)throw r.error;toast('Lavagem concluída.');await loadData()}catch(err){toast(err.message,'error')}}
async function sendToWorkshop(id){if(!state.canManage)return;try{const r=await state.client.rpc('v2_wash_send_finding_to_workshop',{p_finding_id:id});if(r.error)throw r.error;toast('OS criada no Oficina 360.');await loadData()}catch(err){toast(err.message,'error')}}
async function restock(id){if(!state.canManage)return;const p=state.products.find(x=>x.id===id);if(!p)return;const raw=prompt(`Quantos litros deseja adicionar ao estoque de ${p.name}?`,'5');if(raw===null)return;const liters=Number(String(raw).replace(',','.'));if(!Number.isFinite(liters)||liters<=0){toast('Informe uma quantidade válida.','error');return}try{const r=await state.client.from('v2_wash_products').update({stock_ml:n(p.stock_ml)+liters*1000,updated_at:new Date().toISOString()}).eq('id',id).eq('company_id',state.company.id);if(r.error)throw r.error;toast('Estoque atualizado.');await loadData()}catch(err){toast(err.message,'error')}}

document.addEventListener('DOMContentLoaded',boot,{once:true});
})();