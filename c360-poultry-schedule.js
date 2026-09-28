(()=>{
'use strict';
const VERSION='2026.09.28-2';
const DEFAULT_ARRIVAL_EARLY_MIN=60;
const DEFAULT_VEHICLE_MARGIN_MIN=20;
const DEFAULT_FULL_RELEASE_MIN=60;
const PLAN_TABLE='v2_poultry_truck_plans';
const CACHE_NS='c360:poultry:schedule:v1';
const state={plansByLoading:new Map(),activePlan:null,activePlanSet:[],activeLoadingId:null,activeSequence:0,restWrapped:false,queueWrapped:false,truckWrapped:false,refreshTimer:null};

const id=x=>document.getElementById(x);
const num=v=>{const n=Number(String(v??'').replace(',','.'));return Number.isFinite(n)?n:0};
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const isDevice=()=>document.body?.classList.contains('device-mode')||(typeof deviceMode!=='undefined'&&!!deviceMode);
const getCompany=()=>typeof companyId!=='undefined'?companyId:null;
const getTeam=()=>{
 try{return (typeof deviceAccess!=='undefined'&&deviceAccess?.team_id)||(typeof deviceTeam!=='undefined'&&deviceTeam?.id)||null}catch(_){return null}
};
const hasApi=()=>typeof rest==='function'&&!!getCompany();
const todayLocal=()=>{const d=new Date();d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,10)};
const localInput=(d)=>{const x=new Date(d);x.setMinutes(x.getMinutes()-x.getTimezoneOffset());return x.toISOString().slice(0,16)};
const fmtDateTime=v=>v?new Date(v).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'—';
const fmtInt=v=>Number(v||0).toLocaleString('pt-BR');
const cacheKey=()=>`${CACHE_NS}:${getCompany()||'none'}:${getTeam()||'admin'}`;
const nextDay=()=>{const d=new Date();d.setDate(d.getDate()+1);d.setHours(2,0,0,0);return d};
function scheduleCacheRead(){try{return JSON.parse(localStorage.getItem(cacheKey())||'{}')}catch(_){return {}}}
function scheduleCacheWrite(patch){try{localStorage.setItem(cacheKey(),JSON.stringify({...scheduleCacheRead(),...patch,updated_at:new Date().toISOString()}))}catch(_){}}
function planIndex(plans){const out={};for(const p of plans||[]){(out[p.loading_id]??=[]).push(p)};for(const arr of Object.values(out))arr.sort((a,b)=>Number(a.truck_sequence)-Number(b.truck_sequence));return out}
function putPlans(plans){for(const [loading,arr] of Object.entries(planIndex(plans))){state.plansByLoading.set(loading,arr)}const all=[...state.plansByLoading.values()].flat();scheduleCacheWrite({plans:all})}
function cachedPlans(loadingId){const live=state.plansByLoading.get(loadingId);if(live)return live;const rows=(scheduleCacheRead().plans||[]).filter(p=>p.loading_id===loadingId).sort((a,b)=>Number(a.truck_sequence)-Number(b.truck_sequence));if(rows.length)state.plansByLoading.set(loadingId,rows);return rows}

function injectStyleFallback(){
 if(id('c360PoultryScheduleStyle'))return;
 const l=document.createElement('link');l.id='c360PoultryScheduleStyle';l.rel='stylesheet';l.href='./c360-poultry-schedule.css?v='+encodeURIComponent(VERSION);document.head.appendChild(l);
}

async function fetchPlansForLoading(loadingId){
 if(!loadingId)return [];
 if(!navigator.onLine||!hasApi())return cachedPlans(loadingId);
 try{
  const rows=await rest(PLAN_TABLE,'select=*&company_id=eq.'+encodeURIComponent(getCompany())+'&loading_id=eq.'+encodeURIComponent(loadingId)+'&order=truck_sequence.asc')||[];
  state.plansByLoading.set(loadingId,rows);putPlans(rows);return rows;
 }catch(e){console.warn('Programação: falha ao carregar planos',e);return cachedPlans(loadingId)}
}

async function loadScheduleWindow(){
 if(!hasApi())return scheduleCacheRead().window||{ops:[],loadings:[],plans:[],farms:[],teams:[],trucks:[]};
 const now=new Date();now.setHours(0,0,0,0);const until=new Date(now);until.setDate(until.getDate()+4);
 const teamId=isDevice()?getTeam():null;
 let q='select=id,title,customer_name,location_name,location_address,latitude,longitude,scheduled_start,scheduled_end,status,planned_birds,actual_birds,team_id,notes,metadata&company_id=eq.'+encodeURIComponent(getCompany())+'&operation_type=eq.poultry_catching&scheduled_start=gte.'+encodeURIComponent(now.toISOString())+'&scheduled_start=lt.'+encodeURIComponent(until.toISOString())+'&order=scheduled_start.asc';
 if(teamId)q+='&team_id=eq.'+encodeURIComponent(teamId);
 try{
  const ops=await rest('v2_operations',q)||[];
  if(!ops.length){const empty={ops:[],loadings:[],plans:[],farms:[],teams:[],trucks:[]};scheduleCacheWrite({window:empty});return empty}
  const opIds=ops.map(x=>x.id).join(',');
  const loadings=await rest('v2_poultry_loadings','select=id,operation_id,farm_id,team_id,planned_birds,reported_birds,planned_trucks,reported_trucks,status,metadata,schedule_acknowledged_at,schedule_acknowledged_by&company_id=eq.'+encodeURIComponent(getCompany())+'&operation_id=in.('+opIds+')')||[];
  const loadingIds=loadings.map(x=>x.id).filter(Boolean);
  const farmIds=[...new Set(loadings.map(x=>x.farm_id).filter(Boolean))];
  const teamIds=[...new Set(ops.map(x=>x.team_id).filter(Boolean))];
  const [plans,farms,teams,trucks]=await Promise.all([
   loadingIds.length?rest(PLAN_TABLE,'select=*&company_id=eq.'+encodeURIComponent(getCompany())+'&loading_id=in.('+loadingIds.join(',')+')&order=truck_sequence.asc'):Promise.resolve([]),
   farmIds.length?rest('v2_poultry_farms','select=id,producer_name,farm_name,city,address,latitude,longitude,integrator_id,metadata&company_id=eq.'+encodeURIComponent(getCompany())+'&id=in.('+farmIds.join(',')+')'):Promise.resolve([]),
   teamIds.length?rest('v2_teams','select=id,name,code,metadata&company_id=eq.'+encodeURIComponent(getCompany())+'&id=in.('+teamIds.join(',')+')'):Promise.resolve([]),
   loadingIds.length?rest('v2_poultry_truck_loads','select=id,loading_id,truck_sequence,truck_plate,driver_name,birds,planned_birds,variance_birds,divergence_reason,plan_id,metadata&company_id=eq.'+encodeURIComponent(getCompany())+'&loading_id=in.('+loadingIds.join(',')+')&order=truck_sequence.asc'):Promise.resolve([])
  ]);
  putPlans(plans||[]);
  const data={ops,loadings,plans:plans||[],farms:farms||[],teams:teams||[],trucks:trucks||[]};scheduleCacheWrite({window:data});return data;
 }catch(e){console.warn('Programação: usando cache',e);return scheduleCacheRead().window||{ops:[],loadings:[],plans:[],farms:[],teams:[],trucks:[]}}
}

function routeUrl(op,farm){
 const custom=op?.metadata?.schedule_location_url;
 if(custom)return custom;
 const lat=op?.latitude??farm?.latitude,long=op?.longitude??farm?.longitude;
 if(lat!=null&&long!=null)return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(lat+','+long)}`;
 const addr=farm?.address?.formatted||farm?.address?.address||op?.location_name||op?.customer_name;
 return addr?`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr)}`:'';
}
function scheduleMeta(op){return op?.metadata||{}}
function fullReleaseAt(op){const m=scheduleMeta(op),mins=Number(m.full_release_minutes??DEFAULT_FULL_RELEASE_MIN);return new Date(new Date(op.scheduled_start).getTime()-mins*60000)}
function isFullReleased(op){return !isDevice()||Date.now()>=fullReleaseAt(op).getTime()}
function publicScheduleHtml(op,farm,m,route){const integrated=m.integrated_name||farm?.producer_name||op.customer_name||'—',shed=m.shed_name||farm?.farm_name||op.location_name||'—',city=m.city||farm?.city||'—';return `<div class="c360-schedule-instructions"><b>Informações para organização</b><div><b>Integrado:</b> ${safe(integrated)}<br><b>Galpão/granja:</b> ${safe(shed)}<br><b>Cidade:</b> ${safe(city)}<br><b>Início:</b> ${fmtDateTime(op.scheduled_start)}${m.recommended_departure?`<br><b>Saída sugerida:</b> ${fmtDateTime(m.recommended_departure)}`:''}</div></div>${route?`<div class="c360-schedule-actions"><button type="button" class="btn soft c360-open-route" data-url="${safe(route)}">📍 Abrir localização</button></div>`:''}`}
function loadingFor(data,op){return data.loadings.find(x=>x.operation_id===op.id)}
function plansFor(data,loading){return loading?data.plans.filter(x=>x.loading_id===loading.id).sort((a,b)=>Number(a.truck_sequence)-Number(b.truck_sequence)):[]}
function trucksFor(data,loading){return loading?data.trucks.filter(x=>x.loading_id===loading.id).sort((a,b)=>Number(a.truck_sequence)-Number(b.truck_sequence)):[]}
function compareClass(diff){if(diff===0)return 'ok';const a=Math.abs(diff);return a<=50?'warn':'danger'}
function truckCompareRows(plans,trucks){
 if(!plans.length&&!trucks.length)return '<div class="c360-schedule-empty">Sem divisão por caminhão.</div>';
 const seqs=[...new Set([...plans.map(x=>Number(x.truck_sequence)),...trucks.map(x=>Number(x.truck_sequence))])].sort((a,b)=>a-b);
 return `<div class="c360-compare-list">${seqs.map(seq=>{const p=plans.find(x=>Number(x.truck_sequence)===seq),t=trucks.find(x=>Number(x.truck_sequence)===seq);const planned=p?Number(p.planned_birds||0):null,actual=t?Number(t.birds||0):null,diff=planned!=null&&actual!=null?actual-planned:null;return `<div class="c360-compare-row ${diff==null?'':compareClass(diff)}"><div><b>Caminhão ${seq}</b><small>${p?.planned_barn?'Aviário '+safe(p.planned_barn):''}</small></div><div><span>Programado</span><b>${planned==null?'—':fmtInt(planned)}</b></div><div><span>Real</span><b>${actual==null?'Aguardando':fmtInt(actual)}</b></div><div><span>Dif.</span><b>${diff==null?'—':(diff>0?'+':'')+fmtInt(diff)}</b></div></div>`}).join('')}</div>`
}
function scheduleCard(op,data,compact=false){
 const loading=loadingFor(data,op),farm=data.farms.find(x=>x.id===loading?.farm_id),team=data.teams.find(x=>x.id===op.team_id),plans=plansFor(data,loading),trucks=trucksFor(data,loading),m=scheduleMeta(op);
 const route=routeUrl(op,farm),total=loading?.planned_birds??op.planned_birds??plans.reduce((a,p)=>a+Number(p.planned_birds||0),0);
 const acknowledged=!!loading?.schedule_acknowledged_at,full=isFullReleased(op);
 const publicInfo=publicScheduleHtml(op,farm,m,route);
 const locked=isDevice()&&!full;
 return `<article class="c360-schedule-card" data-op="${safe(op.id)}" data-loading="${safe(loading?.id||'')}">
  <div class="c360-schedule-card-head"><div><div class="c360-schedule-eyebrow">${compact?'PRÓXIMA APANHA':'PROGRAMAÇÃO'}</div><h3>${safe(farm?.farm_name||farm?.producer_name||op.location_name||op.customer_name||'Apanha')}</h3><p>${safe(team?.name||'Equipe')} • ${fmtDateTime(op.scheduled_start)}</p></div><span class="c360-schedule-status ${op.status==='completed'?'done':''}">${op.status==='completed'?'Concluída':op.status==='in_progress'?'Em andamento':'Programada'}</span></div>
  ${publicInfo}
  ${locked?`<div class="c360-schedule-callout">🔒 Fax completo será liberado às <b>${fmtDateTime(fullReleaseAt(op))}</b> (1 hora antes).</div>`:`<div class="c360-schedule-kpis"><div><span>Aves previstas</span><b>${fmtInt(total)}</b></div><div><span>Caminhões</span><b>${plans.length||loading?.planned_trucks||'—'}</b></div><div><span>Distância</span><b>${m.distance_km?safe(m.distance_km)+' km':'—'}</b></div><div><span>Viagem</span><b>${m.travel_minutes?safe(m.travel_minutes)+' min':'—'}</b></div></div>
  ${m.loading_instructions?`<div class="c360-schedule-instructions"><b>Como será o carregamento</b><div>${safe(m.loading_instructions)}</div></div>`:''}
  ${m.fax_reference||m.fax_file_path?`<div class="c360-schedule-source">📄 Fax/programação: <b>${safe(m.fax_reference||'anexo recebido')}</b>${m.fax_file_path?` <button type="button" class="c360-link-btn c360-open-fax" data-path="${safe(m.fax_file_path)}">Ver anexo</button>`:''}</div>`:''}
  ${truckCompareRows(plans,trucks)}`}
  <div class="c360-schedule-actions">${isDevice()&&loading&&op.status!=='completed'?`<button type="button" class="btn ${acknowledged?'soft':'primary'} c360-ack-schedule" data-loading="${loading.id}" ${acknowledged?'disabled':''}>${acknowledged?'✓ Programação confirmada':'Confirmar programação'}</button>`:''}</div>
 </article>`
}

async function refreshPanels(){
 clearTimeout(state.refreshTimer);
 state.refreshTimer=setTimeout(async()=>{
  const data=await loadScheduleWindow();
  renderOperationsPanel(data);renderHomePanel(data);
 },40);
}
function renderOperationsPanel(data){
 const host=id('c360ScheduleList');if(!host)return;
 const relevant=data.ops.filter(o=>o.status!=='cancelled');
 host.innerHTML=relevant.length?relevant.map(o=>scheduleCard(o,data,false)).join(''):'<div class="c360-schedule-empty">Nenhuma programação cadastrada para os próximos dias.</div>';
}
function renderHomePanel(data){
 const host=id('c360TomorrowHomeList');if(!host)return;
 const tomorrow=todayLocal();const td=new Date(tomorrow+'T12:00:00');td.setDate(td.getDate()+1);const key=localInput(td).slice(0,10);
 const ops=data.ops.filter(o=>String(o.scheduled_start||'').slice(0,10)===key&&o.status!=='cancelled');
 host.innerHTML=ops.length?ops.map(o=>scheduleCard(o,data,true)).join(''):'<div class="c360-schedule-empty">Sem programação para amanhã.</div>';
}

function ensureHomePanel(){
 const sec=id('inicio');if(!sec||id('c360TomorrowHome'))return;
 const card=document.createElement('div');card.id='c360TomorrowHome';card.className='c360-schedule-home';card.innerHTML='<div class="c360-schedule-section-head"><div><span class="c360-schedule-eyebrow">AMANHÃ</span><h2>Programação do próximo dia</h2></div><button type="button" class="btn soft" id="c360RefreshTomorrow">Atualizar</button></div><div id="c360TomorrowHomeList"><div class="c360-schedule-empty">Carregando...</div></div>';
 const anchor=sec.querySelector('.v2hero')||sec.firstElementChild;anchor?.insertAdjacentElement('afterend',card);
}
function ensureOperationsPanel(){
 const sec=id('operacoes');if(!sec)return;
 const hero=sec.querySelector('.v2hero');
 if(hero&&!id('c360ScheduleBtn')&&!isDevice()){
  const b=document.createElement('button');b.type='button';b.id='c360ScheduleBtn';b.className='btn soft';b.textContent='📅 Programar dia seguinte';
  const existing=id('newPoultryOp');existing?.insertAdjacentElement('afterend',b);
 }
 if(!id('c360SchedulePanel')){
  const panel=document.createElement('div');panel.id='c360SchedulePanel';panel.className='c360-schedule-panel';panel.innerHTML='<div class="c360-schedule-section-head"><div><span class="c360-schedule-eyebrow">PLANEJADO × REAL</span><h2>Programações das apanhas</h2><p>O que veio no fax e o que realmente saiu em cada caminhão.</p></div><button type="button" class="btn soft" id="c360RefreshSchedules">Atualizar</button></div><div id="c360ScheduleList"><div class="c360-schedule-empty">Carregando...</div></div>';
  (hero||sec.firstElementChild)?.insertAdjacentElement('afterend',panel);
 }
 if(!isDevice()&&!id('c360ScheduleForm'))ensureScheduleForm(sec);
}

function ensureScheduleForm(sec){
 const form=document.createElement('div');form.id='c360ScheduleForm';form.className='card c360-program-form hidden';
 form.innerHTML=`<div class="c360-schedule-section-head"><div><span class="c360-schedule-eyebrow">NOVA PROGRAMAÇÃO</span><h2>Programar apanha</h2><p>Cadastre exatamente o que veio no fax. A equipe verá isso antes de sair.</p></div><button type="button" class="btn soft" id="c360ScheduleClose">Fechar</button></div>
 <div class="c360-program-grid">
  <label>Data e horário<input id="c360ScheduleStart" type="datetime-local"></label>
  <label>Equipe<select id="c360ScheduleTeam"><option value="">Selecione...</option></select></label>
  <label>Granja<select id="c360ScheduleFarm"><option value="">Selecione...</option></select></label>
  <label>Distância até a granja (km)<input id="c360ScheduleDistance" type="number" min="0" step="0.1" placeholder="Ex.: 82"></label>
  <label>Tempo do Maps (min)<input id="c360ScheduleTravel" type="number" min="0" step="1" placeholder="Ex.: 80"></label>
  <label>Margem da condução (min)<input id="c360ScheduleVehicleMargin" type="number" min="0" step="1" value="20"></label>
  <label>Chegar antes (min)<input id="c360ScheduleArrivalEarly" type="number" min="0" step="1" value="60"></label>
  <label>Saída recomendada<input id="c360ScheduleDeparture" type="datetime-local" readonly></label>
  <label class="span2">Link/localização para rota<input id="c360ScheduleLocationUrl" placeholder="Cole o link da localização, se quiser"></label>
  <label class="span2">Referência do fax/programação<input id="c360ScheduleFaxRef" placeholder="Ex.: Fax Zanchetta 28/09 - lote 123"></label>
  <label class="span2">Foto do fax/programação<input id="c360ScheduleFaxFile" type="file" accept="image/jpeg,image/png,image/webp"></label>
  <label class="span2">Como será o carregamento<textarea id="c360ScheduleInstructions" placeholder="Ex.: 1º caminhão 4.200; aviário 2; começar pelo lado direito..."></textarea></label>
 </div>
 <div class="c360-plan-head"><div><h3>Caminhão por caminhão</h3><p>O previsto ficará visível no momento do lançamento real.</p></div><button type="button" class="btn soft" id="c360AddPlanTruck">+ Caminhão</button></div>
 <div id="c360PlanTruckRows"></div>
 <div class="c360-plan-total"><span>Total programado</span><b id="c360PlanTotal">0 aves</b></div>
 <div class="c360-schedule-actions"><button type="button" class="btn primary" id="c360SaveSchedule">Salvar programação</button><span id="c360ScheduleMsg" class="muted"></span></div>`;
 const panel=id('c360SchedulePanel');panel?.insertAdjacentElement('beforebegin',form);
 resetScheduleForm();
}
function truckPlanRow(seq,data={}){
 const w=document.createElement('div');w.className='c360-plan-row';w.dataset.seq=seq;
 w.innerHTML=`<div class="c360-plan-row-title"><b>Caminhão ${seq}</b><button type="button" class="c360-plan-remove" title="Remover">×</button></div><label>Aves previstas<input class="c360-plan-birds" type="number" min="1" step="1" value="${safe(data.planned_birds||'')}"></label><label>Caixas<input class="c360-plan-boxes" type="number" min="0" step="1" value="${safe(data.planned_boxes||'')}"></label><label>Aves/caixa<input class="c360-plan-per" type="number" min="0" step="0.01" value="${safe(data.planned_birds_per_box||'')}"></label><label>Aviário<input class="c360-plan-barn" value="${safe(data.planned_barn||'')}" placeholder="Ex.: 2"></label><label class="span2">Observação<input class="c360-plan-note" value="${safe(data.notes||'')}" placeholder="Orientação específica deste caminhão"></label><div class="c360-plan-check"></div>`;
 return w;
}
function renumberPlanRows(){[...document.querySelectorAll('#c360PlanTruckRows .c360-plan-row')].forEach((r,i)=>{r.dataset.seq=i+1;r.querySelector('.c360-plan-row-title b').textContent='Caminhão '+(i+1)});updatePlanTotal()}
function addPlanTruck(data={}){const host=id('c360PlanTruckRows');if(!host)return;host.appendChild(truckPlanRow(host.children.length+1,data));updatePlanTotal()}
function updatePlanTotal(){
 let total=0;document.querySelectorAll('#c360PlanTruckRows .c360-plan-row').forEach(r=>{
  const birds=r.querySelector('.c360-plan-birds'),boxes=num(r.querySelector('.c360-plan-boxes')?.value),per=num(r.querySelector('.c360-plan-per')?.value),check=r.querySelector('.c360-plan-check');
  if(!num(birds?.value)&&boxes>0&&per>0)birds.value=Math.round(boxes*per);
  const b=num(birds?.value);total+=b;
  if(boxes>0&&per>0){const calc=Math.round(boxes*per),diff=b-calc;check.textContent=diff===0?'✓ Caixas conferem':`Atenção: caixas × aves = ${fmtInt(calc)} (${diff>0?'+':''}${fmtInt(diff)})`;check.className='c360-plan-check '+(diff===0?'ok':'warn')}else{check.textContent='';check.className='c360-plan-check'}
 });
 if(id('c360PlanTotal'))id('c360PlanTotal').textContent=fmtInt(total)+' aves';
}
function resetScheduleForm(){
 if(!id('c360ScheduleForm'))return;
 id('c360ScheduleStart').value=localInput(nextDay());id('c360ScheduleDistance').value='';id('c360ScheduleTravel').value='';id('c360ScheduleVehicleMargin').value=DEFAULT_VEHICLE_MARGIN_MIN;id('c360ScheduleArrivalEarly').value=DEFAULT_ARRIVAL_EARLY_MIN;id('c360ScheduleDeparture').value='';id('c360ScheduleLocationUrl').value='';id('c360ScheduleFaxRef').value='';id('c360ScheduleInstructions').value='';id('c360ScheduleFaxFile').value='';id('c360ScheduleMsg').textContent='';id('c360PlanTruckRows').innerHTML='';addPlanTruck();recalcDeparture();
}
function recalcDeparture(){const start=id('c360ScheduleStart')?.value,travel=num(id('c360ScheduleTravel')?.value),margin=num(id('c360ScheduleVehicleMargin')?.value),early=num(id('c360ScheduleArrivalEarly')?.value);if(!start)return;const d=new Date(start);d.setMinutes(d.getMinutes()-(travel+margin+early));id('c360ScheduleDeparture').value=localInput(d)}
async function populateScheduleSelectors(){
 if(!hasApi()||isDevice())return;
 try{
  const [teams,farms]=await Promise.all([
   rest('v2_teams','select=id,name,code,status&company_id=eq.'+encodeURIComponent(getCompany())+'&status=eq.active&order=name.asc'),
   rest('v2_poultry_farms','select=id,producer_name,farm_name,city,address,latitude,longitude,integrator_id,metadata&company_id=eq.'+encodeURIComponent(getCompany())+'&status=eq.active&order=producer_name.asc')
  ]);
  window.__c360ScheduleTeams=teams||[];window.__c360ScheduleFarms=farms||[];
  id('c360ScheduleTeam').innerHTML='<option value="">Selecione...</option>'+(teams||[]).map(t=>`<option value="${t.id}">${safe(t.name)}</option>`).join('');
  id('c360ScheduleFarm').innerHTML='<option value="">Selecione...</option>'+(farms||[]).map(f=>`<option value="${f.id}">${safe(f.farm_name||f.producer_name)}${f.city?' • '+safe(f.city):''}</option>`).join('');
 }catch(e){id('c360ScheduleMsg').textContent=e.message||String(e)}
}
function selectedPlansFromForm(){return [...document.querySelectorAll('#c360PlanTruckRows .c360-plan-row')].map((r,i)=>({truck_sequence:i+1,planned_birds:Math.round(num(r.querySelector('.c360-plan-birds')?.value)),planned_boxes:r.querySelector('.c360-plan-boxes')?.value?Math.round(num(r.querySelector('.c360-plan-boxes').value)):null,planned_birds_per_box:r.querySelector('.c360-plan-per')?.value?num(r.querySelector('.c360-plan-per').value):null,planned_barn:r.querySelector('.c360-plan-barn')?.value.trim()||null,notes:r.querySelector('.c360-plan-note')?.value.trim()||null}))}
async function saveSchedule(){
 const msg=id('c360ScheduleMsg');if(!hasApi())return msg.textContent='Conexão indisponível para criar a programação.';
 const start=id('c360ScheduleStart').value,teamId=id('c360ScheduleTeam').value,farmId=id('c360ScheduleFarm').value,plans=selectedPlansFromForm();
 const farm=(window.__c360ScheduleFarms||[]).find(x=>x.id===farmId),team=(window.__c360ScheduleTeams||[]).find(x=>x.id===teamId);
 if(!start||!teamId||!farmId)return msg.textContent='Informe data, equipe e granja.';
 if(!plans.length||plans.some(p=>p.planned_birds<=0))return msg.textContent='Informe a quantidade prevista de aves em todos os caminhões.';
 const total=plans.reduce((a,p)=>a+p.planned_birds,0),travel=Math.round(num(id('c360ScheduleTravel').value)),distance=num(id('c360ScheduleDistance').value),departure=id('c360ScheduleDeparture').value,vehicleMargin=Math.round(num(id('c360ScheduleVehicleMargin').value)),arrivalEarly=Math.round(num(id('c360ScheduleArrivalEarly').value));
 msg.textContent='Salvando programação...';id('c360SaveSchedule').disabled=true;
 let opId=null,loadingId=null;
 try{
  let faxPath=null;const fax=id('c360ScheduleFaxFile')?.files?.[0];if(fax){if(typeof uploadPoultrySheet!=='function')throw new Error('Upload do fax ainda não está disponível nesta sessão.');faxPath=await uploadPoultrySheet(fax,'schedule-'+Date.now())}
  const metadata={source:'admin_schedule',schedule_version:2,distance_km:distance||null,travel_minutes:travel||null,vehicle_margin_minutes:vehicleMargin,arrival_early_minutes:arrivalEarly,full_release_minutes:DEFAULT_FULL_RELEASE_MIN,recommended_departure:departure?new Date(departure).toISOString():null,loading_instructions:id('c360ScheduleInstructions').value.trim()||null,fax_reference:id('c360ScheduleFaxRef').value.trim()||null,fax_file_path:faxPath||null,schedule_location_url:id('c360ScheduleLocationUrl').value.trim()||null,team_name:team?.name||null,farm_id:farmId,city:farm?.city||null,integrated_name:farm?.producer_name||null};
  const opRows=await rest('v2_operations','','POST',{company_id:getCompany(),operation_type:'poultry_catching',title:'Apanha • '+(farm?.farm_name||farm?.producer_name||'Programada'),customer_name:farm?.producer_name||null,location_name:farm?.farm_name||farm?.producer_name||null,location_address:farm?.address||{},latitude:farm?.latitude||null,longitude:farm?.longitude||null,scheduled_start:new Date(start).toISOString(),status:'planned',team_id:teamId,planned_birds:total,notes:metadata.loading_instructions,metadata});
  opId=opRows?.[0]?.id;if(!opId)throw new Error('Não foi possível criar a operação programada.');
  const loadingRows=await rest('v2_poultry_loadings','','POST',{company_id:getCompany(),operation_id:opId,integrator_id:farm.integrator_id,farm_id:farmId,loading_date:start.slice(0,10),catching_method:'back',planned_birds:total,reported_birds:0,planned_trucks:plans.length,reported_trucks:0,status:'planned',team_id:teamId,metadata:{source:'admin_schedule',schedule_version:1,fax_reference:metadata.fax_reference,fax_file_path:faxPath}});
  loadingId=loadingRows?.[0]?.id;if(!loadingId)throw new Error('Não foi possível criar o carregamento programado.');
  const rows=plans.map(p=>({company_id:getCompany(),operation_id:opId,loading_id:loadingId,team_id:teamId,...p,source_reference:metadata.fax_reference,source_file_path:faxPath}));
  await rest(PLAN_TABLE,'','POST',rows);
  putPlans(rows.map((p,i)=>({...p,id:'pending-'+i})));
  msg.textContent='Programação salva ✓ A equipe já poderá visualizar o dia seguinte.';msg.className='okmsg';
  await refreshPanels();setTimeout(()=>{id('c360ScheduleForm')?.classList.add('hidden');resetScheduleForm()},700);
 }catch(e){
  msg.className='error';msg.textContent=e.message||String(e);
  try{if(loadingId)await rest('v2_poultry_loadings','id=eq.'+loadingId,'DELETE');if(opId)await rest('v2_operations','id=eq.'+opId,'DELETE')}catch(_){ }
 }finally{id('c360SaveSchedule').disabled=false}
}

function compareBannerHtml(plan,extra=false){
 const planned=plan?Number(plan.planned_birds||0):null;
 return `<div id="c360TruckPlanCompare" class="c360-truck-plan ${extra?'extra':''}"><div class="c360-truck-plan-head"><div><span class="c360-schedule-eyebrow">${extra?'FORA DA PROGRAMAÇÃO':'PROGRAMADO NO FAX'}</span><b>${extra?'Caminhão extra':fmtInt(planned)+' aves'}</b></div><div id="c360TruckPlanBadge" class="c360-diff-badge">Aguardando real</div></div>${plan?`<div class="c360-truck-plan-meta">${plan.planned_boxes?fmtInt(plan.planned_boxes)+' caixas':''}${plan.planned_birds_per_box?' × '+plan.planned_birds_per_box+' aves/caixa':''}${plan.planned_barn?' • Aviário '+safe(plan.planned_barn):''}</div>`:'<div class="c360-truck-plan-meta">Este caminhão não consta na programação recebida.</div>'}<div id="c360TruckActualLine" class="c360-truck-actual">Real informado: —</div><div id="c360DivergenceWrap" class="c360-divergence hidden"><label>Motivo da diferença<select id="c360DivergenceReason"><option value="">Selecione...</option><option>Caixas vazias</option><option>Quantidade alterada pelo produtor/cliente</option><option>Mortalidade</option><option>Falta de aves</option><option>Mudança no carregamento</option><option>Erro na programação/fax</option><option>Caminhão extra</option><option>Outro</option></select></label><label>Detalhe<input id="c360DivergenceDetail" placeholder="Explique rapidamente o que aconteceu"></label></div></div>`
}
function actualBirdsFromTruckForm(){
 try{if(id('poTruckCata')?.checked&&typeof selectedTruckBarnBreakdown==='function')return selectedTruckBarnBreakdown().reduce((a,x)=>a+num(x.birds),0)}catch(_){ }
 return Math.round(num(id('poTruckBirds')?.value));
}
function divergenceReason(){const reason=id('c360DivergenceReason')?.value?.trim()||'',detail=id('c360DivergenceDetail')?.value?.trim()||'';return reason?(detail?reason+' — '+detail:reason):''}
function updateTruckComparison(){
 const box=id('c360TruckPlanCompare');if(!box)return;
 const actual=actualBirdsFromTruckForm(),plan=state.activePlan,extra=!!box.classList.contains('extra'),badge=id('c360TruckPlanBadge'),line=id('c360TruckActualLine'),wrap=id('c360DivergenceWrap');
 if(!actual){badge.textContent='Aguardando real';badge.className='c360-diff-badge';line.textContent='Real informado: —';wrap?.classList.add('hidden');return}
 if(extra){badge.textContent='Caminhão extra';badge.className='c360-diff-badge danger';line.textContent='Real informado: '+fmtInt(actual)+' aves';wrap?.classList.remove('hidden');if(id('c360DivergenceReason')&&!id('c360DivergenceReason').value)id('c360DivergenceReason').value='Caminhão extra';return}
 const planned=Number(plan?.planned_birds||0),diff=actual-planned;line.textContent=`Real informado: ${fmtInt(actual)} aves • Diferença: ${diff>0?'+':''}${fmtInt(diff)}`;
 badge.textContent=diff===0?'✓ Certo com o fax':(diff>0?'+':'')+fmtInt(diff)+' aves';badge.className='c360-diff-badge '+compareClass(diff);wrap?.classList.toggle('hidden',diff===0);
}
async function enhanceTruckForm(opts){
 const loadingId=opts?.loadingId||id('poTruckLoadingId')?.value,seq=Number(opts?.sequence||id('poTruckSequence')?.value||1);if(!loadingId||String(loadingId).startsWith('offline:'))return;
 const plans=await fetchPlansForLoading(loadingId);state.activePlanSet=plans;state.activeLoadingId=loadingId;state.activeSequence=seq;
 const plan=plans.find(p=>Number(p.truck_sequence)===seq)||null;state.activePlan=plan;
 id('c360TruckPlanCompare')?.remove();
 if(!plans.length)return;
 const extra=!plan;const wrap=document.createElement('div');wrap.innerHTML=compareBannerHtml(plan,extra);const node=wrap.firstElementChild;
 const card=id('poTruckCard'),firstSection=card?.querySelector('.field-section');if(firstSection)firstSection.insertAdjacentElement('beforebegin',node);else card?.prepend(node);
 updateTruckComparison();
}
function installTruckHook(){
 if(state.truckWrapped||typeof openNextTruckForm!=='function')return;
 const base=openNextTruckForm;
 openNextTruckForm=function(args){const r=base.apply(this,arguments);setTimeout(()=>enhanceTruckForm(args).catch(console.warn),0);return r};
 state.truckWrapped=true;
}
function installRestHook(){
 if(state.restWrapped||typeof rest!=='function')return;
 const base=rest;
 rest=async function(table,query='',method='GET',body=null){
  let enriched=body;
  if(table==='v2_poultry_truck_loads'&&String(method).toUpperCase()==='POST'&&body&&!Array.isArray(body)){
   const plans=state.activePlanSet||[],sameLoading=String(body.loading_id||'')===String(state.activeLoadingId||''),seq=Number(body.truck_sequence||0),plan=sameLoading?plans.find(p=>Number(p.truck_sequence)===seq):null,hasSchedule=sameLoading&&plans.length>0;
   if(plan||hasSchedule){const actual=Number(body.birds||0),planned=plan?Number(plan.planned_birds||0):null,reason=(plan&&actual===planned)?null:divergenceReason();enriched={...body,plan_id:plan?.id||null,planned_birds:planned,variance_birds:planned==null?null:actual-planned,divergence_reason:reason||null,metadata:{...(body.metadata||{}),planned_vs_actual:{schedule_version:1,plan_id:plan?.id||null,planned_birds:planned,actual_birds:actual,variance_birds:planned==null?null:actual-planned,divergence_reason:reason||null}}}}
  }
  const out=await base(table,query,method,enriched);
  if(table==='v2_poultry_truck_loads'&&String(method).toUpperCase()==='POST')setTimeout(refreshPanels,80);
  return out;
 };
 rest.__c360ScheduleWrapped=true;state.restWrapped=true;
}
function installOfflineQueueHook(){
 if(state.queueWrapped||typeof offlineQueueAdd!=='function')return;
 const base=offlineQueueAdd;
 offlineQueueAdd=async function(item){
  if(item?.type==='poultry_truck'&&state.activePlanSet?.length){const seq=Number(item?.payload?.truck_sequence||state.activeSequence||0),plan=state.activePlanSet.find(p=>Number(p.truck_sequence)===seq),actual=Number(item?.payload?.birds||0),planned=plan?Number(plan.planned_birds||0):null,reason=(plan&&actual===planned)?null:divergenceReason();item={...item,payload:{...(item.payload||{}),plan_id:plan?.id||null,planned_birds:planned,variance_birds:planned==null?null:actual-planned,divergence_reason:reason||null,metadata:{...(item.payload?.metadata||{}),planned_vs_actual:{plan_id:plan?.id||null,planned_birds:planned,actual_birds:actual,variance_birds:planned==null?null:actual-planned,divergence_reason:reason||null}}}}}
  return base(item);
 };
 state.queueWrapped=true;
}
function validatePlannedTruckSave(e){
 const btn=e.target.closest?.('#poTruckSave,#poTruckSaveClose');if(!btn||!state.activePlanSet?.length)return;
 const actual=actualBirdsFromTruckForm();if(!actual)return;
 const plan=state.activePlanSet.find(p=>Number(p.truck_sequence)===Number(id('poTruckSequence')?.value||state.activeSequence||0));const diff=plan?actual-Number(plan.planned_birds||0):null;
 if((!plan||diff!==0)&&!divergenceReason()){
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();id('c360DivergenceWrap')?.classList.remove('hidden');id('c360DivergenceReason')?.focus();const m=id('poTruckMsg');if(m){m.className='error';m.textContent=!plan?'Este caminhão não estava no fax. Informe o motivo antes de salvar.':`Diferença de ${diff>0?'+':''}${fmtInt(diff)} aves. Informe o motivo antes de salvar.`}return false;
 }
}

async function acknowledgeSchedule(loadingId,btn){
 if(!loadingId||!hasApi())return;
 try{btn.disabled=true;btn.textContent='Confirmando...';let uid=null;try{uid=typeof session==='function'?session()?.user?.id:null}catch(_){ }
 await rest('v2_poultry_loadings','id=eq.'+encodeURIComponent(loadingId),'PATCH',{schedule_acknowledged_at:new Date().toISOString(),schedule_acknowledged_by:uid});btn.textContent='✓ Programação confirmada';btn.classList.remove('primary');btn.classList.add('soft');await refreshPanels()}catch(e){btn.disabled=false;btn.textContent='Confirmar programação';alert(e.message||String(e))}
}
async function openFax(path){
 if(!path)return;try{const s=typeof session==='function'?session():null;if(!s?.access_token)throw new Error('Sessão expirada.');const enc=String(path).split('/').map(encodeURIComponent).join('/');const r=await fetch((typeof API_URL!=='undefined'?API_URL:'')+'/storage/v1/object/authenticated/v2-poultry-sheets/'+enc,{headers:{apikey:typeof KEY!=='undefined'?KEY:'',Authorization:'Bearer '+s.access_token}});if(!r.ok)throw new Error('Não foi possível abrir o anexo.');const blob=await r.blob(),u=URL.createObjectURL(blob);window.open(u,'_blank','noopener');setTimeout(()=>URL.revokeObjectURL(u),60000)}catch(e){alert(e.message||String(e))}
}

function bindEvents(){
 document.addEventListener('click',async e=>{
  if(e.target.closest('#c360ScheduleBtn')){id('c360ScheduleForm')?.classList.remove('hidden');await populateScheduleSelectors();id('c360ScheduleForm')?.scrollIntoView({behavior:'smooth',block:'start'});return}
  if(e.target.closest('#c360ScheduleClose')){id('c360ScheduleForm')?.classList.add('hidden');return}
  if(e.target.closest('#c360AddPlanTruck')){addPlanTruck();return}
  const rm=e.target.closest('.c360-plan-remove');if(rm){rm.closest('.c360-plan-row')?.remove();if(!document.querySelector('#c360PlanTruckRows .c360-plan-row'))addPlanTruck();renumberPlanRows();return}
  if(e.target.closest('#c360SaveSchedule')){await saveSchedule();return}
  if(e.target.closest('#c360RefreshSchedules,#c360RefreshTomorrow')){await refreshPanels();return}
  const route=e.target.closest('.c360-open-route');if(route){window.open(route.dataset.url,'_blank','noopener');return}
  const ack=e.target.closest('.c360-ack-schedule');if(ack){await acknowledgeSchedule(ack.dataset.loading,ack);return}
  const fax=e.target.closest('.c360-open-fax');if(fax){await openFax(fax.dataset.path);return}
 },true);
 document.addEventListener('click',validatePlannedTruckSave,true);
 document.addEventListener('input',e=>{
  if(e.target.closest('#c360PlanTruckRows'))updatePlanTotal();
  if(['c360ScheduleTravel','c360ScheduleStart','c360ScheduleVehicleMargin','c360ScheduleArrivalEarly'].includes(e.target.id))recalcDeparture();
  if(e.target.closest('#poTruckCard'))updateTruckComparison();
 },true);
 document.addEventListener('change',e=>{
  if(e.target.id==='c360ScheduleFarm'){const f=(window.__c360ScheduleFarms||[]).find(x=>x.id===e.target.value);if(f&&id('c360ScheduleLocationUrl')&&!id('c360ScheduleLocationUrl').value&&f.latitude!=null&&f.longitude!=null)id('c360ScheduleLocationUrl').value=`https://www.google.com/maps/dir/?api=1&destination=${f.latitude},${f.longitude}`}
  if(e.target.closest('#poTruckCard'))updateTruckComparison();
 },true);
 document.addEventListener('c360:screen-changed',()=>setTimeout(mount,30));
 document.addEventListener('c360:interactive-ready',()=>setTimeout(mount,30));
 window.addEventListener('online',()=>refreshPanels());
}

function mount(){
 injectStyleFallback();installRestHook();installTruckHook();installOfflineQueueHook();ensureHomePanel();ensureOperationsPanel();refreshPanels();
}

bindEvents();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(mount,0));else setTimeout(mount,0);
window.__c360PoultrySchedule={version:VERSION,refresh:refreshPanels};
})();
