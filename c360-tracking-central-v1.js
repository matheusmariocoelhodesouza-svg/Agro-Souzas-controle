(()=>{
'use strict';

const VERSION='2026.09.23-gps1';
const ONLINE_MS=2*60*1000;
const WARM_MS=15*60*1000;
const REFRESH_MS=30000;
let rows=[];
let faults=[];
let trips=[];
let selectedId=null;
let loading=false;
let pollTimer=null;
let lastLoadAt=0;

window.__c360TrackingCentralVersion=VERSION;

const escHtml=(v)=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=(v)=>{const n=Number(v);return Number.isFinite(n)?n:null};
const dt=(v)=>{const d=v?new Date(v):null;return d&&Number.isFinite(d.getTime())?d:null};
const ageMs=(v)=>{const d=dt(v);return d?Math.max(0,Date.now()-d.getTime()):Infinity};
const fmt=(v)=>{const d=dt(v);return d?d.toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'—'};
const ago=(v)=>{const ms=ageMs(v);if(!Number.isFinite(ms))return 'sem sinal';const m=Math.floor(ms/60000);if(m<1)return 'agora';if(m<60)return `há ${m} min`;const h=Math.floor(m/60);if(h<24)return `há ${h} h`;return `há ${Math.floor(h/24)} d`};
const formatNum=(v,d=0)=>{const n=num(v);return n==null?'—':n.toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d})};
function getCompanyId(){try{return typeof companyId!=='undefined'?companyId:null}catch(_){return null}}
function apiFetch(){try{return typeof authFetch==='function'?authFetch:null}catch(_){return null}}
async function parseApi(r){try{if(typeof parseResponse==='function')return await parseResponse(r)}catch(_){}const txt=await r.text();let data=null;try{data=txt?JSON.parse(txt):null}catch(_){data=txt}if(!r.ok)throw new Error(data?.message||data?.error||txt||('HTTP '+r.status));return data}
async function rest(path){const f=apiFetch();if(!f)throw new Error('Sessão do Comando 360 ainda não está pronta.');const r=await f('/rest/v1/'+path,{headers:{Accept:'application/json'}},true);return await parseApi(r)}
function stateOf(source){if(!source?.recorded_at)return{key:'off',label:'Sem sinal'};const a=ageMs(source.recorded_at);if(a<=ONLINE_MS)return{key:'ok',label:'Online'};if(a<=WARM_MS)return{key:'warn',label:'Atrasado'};return{key:'bad',label:'Desatualizado'}}
function bestGps(v){return v?.comando_gps||v?.movit_gps||null}
function vehicleMoving(v){const g=bestGps(v);return Number(g?.speed_kmh||0)>3||g?.motion===true}
function haversineKm(aLat,aLon,bLat,bLon){const a=[num(aLat),num(aLon),num(bLat),num(bLon)];if(a.some(x=>x==null))return null;const [lat1,lon1,lat2,lon2]=a;const R=6371,rad=x=>x*Math.PI/180;const dLat=rad(lat2-lat1),dLon=rad(lon2-lon1);const h=Math.sin(dLat/2)**2+Math.cos(rad(lat1))*Math.cos(rad(lat2))*Math.sin(dLon/2)**2;return 2*R*Math.asin(Math.sqrt(h))}
function sourceText(src){const s=stateOf(src);return `<span><i class="c360tc-dot ${s.key}"></i>${escHtml(s.label)}</span><span>${escHtml(ago(src?.recorded_at))}</span>`}

function ensureCss(){if(document.querySelector('link[data-c360-tracking-central]'))return;const l=document.createElement('link');l.rel='stylesheet';l.href='./c360-tracking-central-v1.css?v='+encodeURIComponent(VERSION);l.dataset.c360TrackingCentral='1';document.head.appendChild(l)}
function trackingScreen(){return document.querySelector('[data-screen="rastreamento"]')||document.getElementById('rastreamento')}
function isTrackingVisible(){const host=document.getElementById('screenHost');return !!host?.querySelector('[data-screen="rastreamento"]')}

function ensureUi(){
 ensureCss();
 const screen=trackingScreen();if(!screen)return null;
 let root=document.getElementById('trackingCentralV1');if(root)return root;
 root=document.createElement('div');root.id='trackingCentralV1';root.className='c360tc';
 root.innerHTML=`
  <div class="c360tc-hero">
   <div><div class="c360tc-eyebrow">GPS COMANDO 360 + TELEMETRIA</div><h2>Central de Rastreamento</h2><p>Veículo, celular da equipe, MOVIT, motor, viagens e falhas no mesmo lugar.</p></div>
   <div class="c360tc-actions"><span class="c360tc-live" id="c360tcLive">aguardando dados</span><button class="btn soft" id="c360tcRefresh" type="button">↻ ATUALIZAR</button></div>
  </div>
  <div class="c360tc-kpis">
   <div class="c360tc-kpi"><span>GPS Comando online</span><strong id="c360tcKpiGps">0</strong></div>
   <div class="c360tc-kpi"><span>Celulares online</span><strong id="c360tcKpiPhones">0</strong></div>
   <div class="c360tc-kpi"><span>Falhas ativas</span><strong id="c360tcKpiFaults">0</strong></div>
   <div class="c360tc-kpi"><span>Viagens em andamento</span><strong id="c360tcKpiTrips">0</strong></div>
  </div>
  <div class="c360tc-layout">
   <div class="c360tc-panel"><div class="c360tc-panel-head"><h3>Conduções</h3><span class="muted" id="c360tcVehicleCount">0</span></div><div class="c360tc-vehicles" id="c360tcVehicles"><div class="c360tc-empty">Carregando...</div></div></div>
   <div class="c360tc-panel"><div id="c360tcDetail" class="c360tc-detail"><div class="c360tc-empty">Selecione uma condução.</div></div></div>
  </div>`;
 screen.insertBefore(root,screen.firstChild);
 root.addEventListener('click',onClick);
 installMapLegend();
 return root;
}

function faultsFor(id){return faults.filter(f=>f.vehicle_id===id&&f.status==='active')}
function tripsFor(id){return trips.filter(t=>t.vehicle_id===id)}
function render(){
 const root=ensureUi();if(!root)return;
 const gpsOnline=rows.filter(v=>stateOf(v.comando_gps).key==='ok').length;
 const phoneOnline=rows.filter(v=>stateOf(v.phone_json).key==='ok').length;
 setText('c360tcKpiGps',gpsOnline);setText('c360tcKpiPhones',phoneOnline);setText('c360tcKpiFaults',faults.filter(f=>f.status==='active').length);setText('c360tcKpiTrips',trips.filter(t=>t.status==='active').length);setText('c360tcVehicleCount',rows.length+' veículo(s)');
 const live=document.getElementById('c360tcLive');if(live)live.textContent=lastLoadAt?'atualizado '+new Date(lastLoadAt).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}):'aguardando dados';
 const list=document.getElementById('c360tcVehicles');
 if(list){list.innerHTML=rows.length?rows.map(v=>{const g=bestGps(v),s=stateOf(g),own=stateOf(v.comando_gps),phone=stateOf(v.phone_json);return `<button class="c360tc-vehicle ${v.vehicle_id===selectedId?'active':''}" type="button" data-tc-vehicle="${escHtml(v.vehicle_id)}"><div class="c360tc-vtop"><strong>${escHtml(v.vehicle_name||v.model||'Veículo')}</strong><span class="c360tc-plate">${escHtml(v.plate||'SEM PLACA')}</span></div><div class="c360tc-vmeta"><span><i class="c360tc-dot ${s.key}"></i>${escHtml(s.label)}</span><span>GPS próprio: ${escHtml(own.label)}</span><span>Celular: ${escHtml(phone.label)}</span></div></button>`}).join(''):'<div class="c360tc-empty">Nenhuma condução encontrada.</div>'}
 if(!selectedId||!rows.some(v=>v.vehicle_id===selectedId))selectedId=rows[0]?.vehicle_id||null;
 const v=rows.find(x=>x.vehicle_id===selectedId);renderDetail(v);
 augmentMap();
}
function setText(id,v){const el=document.getElementById(id);if(el)el.textContent=String(v)}

function sourceCard(title,src,kind){const s=stateOf(src);if(!src)return `<div class="c360tc-source"><div class="t">${escHtml(title)}</div><div class="v"><i class="c360tc-dot off"></i>Não disponível</div><div class="s">${kind==='own'?'Vincule o IMEI do rastreador ao veículo.':'Sem posição atual.'}</div></div>`;const speed=formatNum(src.speed_kmh,0),km=formatNum(src.odometer_km,1);const extra=kind==='phone'?`Bateria: ${src.battery_percent==null?'—':escHtml(src.battery_percent+'%')} • ${src.team_name?escHtml(src.team_name):'equipe'}`:`Velocidade: ${speed} km/h • Ignição: ${src.ignition===true?'ligada':src.ignition===false?'desligada':'—'}${src.odometer_km!=null?' • '+km+' km':''}`;return `<div class="c360tc-source"><div class="t">${escHtml(title)}</div><div class="v"><i class="c360tc-dot ${s.key}"></i>${escHtml(s.label)}</div><div class="s">${extra}<br>${escHtml(ago(src.recorded_at))} • ${escHtml(fmt(src.recorded_at))}</div></div>`}
function metric(label,value,unit=''){return `<div class="c360tc-metric"><div class="l">${escHtml(label)}</div><div class="n">${escHtml(value)}${unit?'<small> '+escHtml(unit)+'</small>':''}</div></div>`}
function renderDetail(v){
 const el=document.getElementById('c360tcDetail');if(!el)return;if(!v){el.innerHTML='<div class="c360tc-empty">Nenhuma condução disponível.</div>';return}
 const t=v.telemetry||{},own=v.comando_gps,phone=v.phone_json,movit=v.movit_gps;
 const distance=haversineKm(own?.latitude,own?.longitude,phone?.latitude,phone?.longitude);
 const separation=distance!=null&&distance>.5&&stateOf(own).key==='ok'&&stateOf(phone).key==='ok'&&vehicleMoving(v);
 const vf=faultsFor(v.vehicle_id),vt=tripsFor(v.vehicle_id).slice(0,5),active=vt.find(x=>x.status==='active')||v.active_trip;
 const faultHtml=vf.length?vf.slice(0,8).map(f=>`<div class="c360tc-item"><strong>${f.spn!=null?'SPN '+escHtml(f.spn)+(f.fmi!=null?' / FMI '+escHtml(f.fmi):''):escHtml(f.code||'Falha')}</strong><br>${escHtml(f.description||'Falha J1939 recebida do veículo')}<br>${escHtml(ago(f.last_seen_at))}</div>`).join(''):'<div class="c360tc-empty">Nenhuma falha ativa.</div>';
 const tripHtml=vt.length?vt.map(x=>`<div class="c360tc-item"><strong>${x.status==='active'?'Em andamento':'Viagem finalizada'}</strong><br>${escHtml(fmt(x.started_at))}${x.ended_at?' → '+escHtml(fmt(x.ended_at)):''}<br>${formatNum(x.distance_km,1)} km • máx. ${formatNum(x.max_speed_kmh,0)} km/h</div>`).join(''):'<div class="c360tc-empty">Nenhuma viagem registrada pelo GPS próprio.</div>';
 const activeText=active?`Viagem iniciada ${ago(active.started_at)} • ${formatNum(active.distance_km,1)} km • máxima ${formatNum(active.max_speed_kmh,0)} km/h`:null;
 el.innerHTML=`
  <div class="c360tc-title-row"><div><h3>${escHtml(v.vehicle_name||v.model||'Veículo')} <span class="c360tc-plate">${escHtml(v.plate||'')}</span></h3><div class="muted">${escHtml([v.make,v.model].filter(Boolean).join(' ')||'Condução cadastrada')}</div></div><div class="toolbar"><button class="btn soft" type="button" data-tc-focus="${escHtml(v.vehicle_id)}">◎ VER NO MAPA</button>${vf.length?'<button class="btn soft" type="button" data-tc-maintenance="1">🔧 MANUTENÇÃO</button>':''}</div></div>
  <div class="c360tc-source-grid">${sourceCard('GPS COMANDO 360',own,'own')}${sourceCard('MOVIT / BACKUP',movit,'movit')}${sourceCard('CELULAR DA EQUIPE',phone,'phone')}</div>
  ${separation?`<div class="c360tc-alert bad">⚠ Equipe separada da condução: celular está a aproximadamente <b>${formatNum(distance,1)} km</b> do GPS do veículo enquanto a condução está em movimento.</div>`:distance!=null&&stateOf(own).key==='ok'&&stateOf(phone).key==='ok'?`<div class="c360tc-alert warn">Veículo × celular: distância atual aproximada de <b>${distance<1?formatNum(distance*1000,0)+' m':formatNum(distance,1)+' km'}</b>.</div>`:''}
  ${activeText?`<div class="c360tc-alert warn">▶ ${escHtml(activeText)}</div>`:''}
  <div class="c360tc-metrics">
   ${metric('Velocidade GPS',formatNum(own?.speed_kmh??movit?.speed_kmh,0),'km/h')}
   ${metric('RPM motor',formatNum(t.engine_rpm,0),'rpm')}
   ${metric('Temp. motor',formatNum(t.coolant_temp_c,0),'°C')}
   ${metric('Combustível',formatNum(t.fuel_percent,0),'%')}
   ${metric('Tensão veículo',formatNum(t.external_voltage??t.battery_voltage,1),'V')}
   ${metric('Horas motor',formatNum(t.engine_hours,1),'h')}
   ${metric('Hodômetro',formatNum(own?.odometer_km??movit?.odometer_km??v.current_odometer_km,1),'km')}
   ${metric('Satélites',formatNum(own?.satellites,0),'')}
  </div>
  <div class="c360tc-subgrid"><div class="c360tc-list"><h4>Falhas J1939 ativas (${vf.length})</h4><div class="c360tc-list-body">${faultHtml}</div></div><div class="c360tc-list"><h4>Viagens recentes</h4><div class="c360tc-list-body">${tripHtml}</div></div></div>`;
}

function onClick(e){const vehicle=e.target.closest('[data-tc-vehicle]');if(vehicle){selectedId=vehicle.dataset.tcVehicle;render();return}if(e.target.closest('#c360tcRefresh')){load(true);return}const focus=e.target.closest('[data-tc-focus]');if(focus){selectedId=focus.dataset.tcFocus;focusMap(selectedId);render();return}if(e.target.closest('[data-tc-maintenance]')){try{if(typeof v2Go==='function')v2Go('manutencoes')}catch(_){}return}}

async function load(force=false){
 const cid=getCompanyId();if(!cid||loading)return;if(!force&&Date.now()-lastLoadAt<10000)return;loading=true;
 const live=document.getElementById('c360tcLive');if(live)live.textContent='atualizando...';
 try{
  const q=encodeURIComponent(cid);
  const [central,faultRows,tripRows]=await Promise.all([
   rest(`v2_tracking_central?company_id=eq.${q}&order=vehicle_name.asc`),
   rest(`v2_vehicle_faults?company_id=eq.${q}&status=eq.active&order=last_seen_at.desc&limit=150`),
   rest(`v2_vehicle_trips?company_id=eq.${q}&order=started_at.desc&limit=150`)
  ]);
  rows=Array.isArray(central)?central:[];faults=Array.isArray(faultRows)?faultRows:[];trips=Array.isArray(tripRows)?tripRows:[];lastLoadAt=Date.now();if(!selectedId)selectedId=rows[0]?.vehicle_id||null;render();
 }catch(err){console.warn('Comando 360: Central de Rastreamento',err);if(live)live.textContent='falha ao atualizar';const root=ensureUi();if(root&&!rows.length){const d=document.getElementById('c360tcDetail');if(d)d.innerHTML='<div class="c360tc-empty">Não foi possível carregar GPS e telemetria agora.<br>'+escHtml(err?.message||String(err))+'</div>'}}
 finally{loading=false}
}

function installMapLegend(){const legend=document.querySelector('.tracking-map-legend');if(!legend||legend.querySelector('[data-c360tc-legend]'))return;const x=document.createElement('span');x.dataset.c360tcLegend='1';x.innerHTML='<i style="background:#6d28d9"></i>GPS Comando';legend.appendChild(x);const y=document.createElement('span');y.dataset.c360tcLegend='1';y.innerHTML='<i style="background:#e11d48"></i>Celular';legend.appendChild(y)}
function canProjectMap(){try{return typeof googleMercatorPoint==='function'&&typeof movitGoogleView!=='undefined'}catch(_){return false}}
function augmentMap(){
 installMapLegend();const overlay=document.getElementById('movitGoogleOverlay'),map=document.getElementById('movitMap');if(!overlay||!map||!canProjectMap())return;overlay.querySelectorAll('.c360tc-map-marker').forEach(x=>x.remove());
 let view;try{view=movitGoogleView}catch(_){return}if(!view)return;
 const center=googleMercatorPoint(view.lat,view.lon,view.zoom),w=map.clientWidth||900,h=map.clientHeight||430;
 const marker=(v,src,kind,label)=>{const lat=num(src?.latitude),lon=num(src?.longitude);if(lat==null||lon==null)return;const pt=googleMercatorPoint(lat,lon,view.zoom),x=w/2+(pt.x-center.x),y=h/2+(pt.y-center.y);if(x<-80||x>w+80||y<-50||y>h+50)return;const b=document.createElement('button');b.type='button';b.className='c360tc-map-marker '+kind;b.style.left=x.toFixed(1)+'px';b.style.top=y.toFixed(1)+'px';b.dataset.tcMapVehicle=v.vehicle_id;b.title=label+' • '+(v.vehicle_name||v.plate||'Veículo');b.innerHTML='<span class="pin"></span><span class="label">'+escHtml(label)+' • '+escHtml(v.plate||v.vehicle_name||'')+'</span>';overlay.appendChild(b)};
 for(const v of rows){marker(v,v.comando_gps,'own','GPS');marker(v,v.phone_json,'phone','Celular')}
}
function focusMap(id){const v=rows.find(x=>x.vehicle_id===id);const src=v?.comando_gps||v?.movit_gps||v?.phone_json;if(!src)return;try{if(typeof movitGoogleView!=='undefined'){movitGoogleView={lat:Number(src.latitude),lon:Number(src.longitude),zoom:16};movitMapHasFit=true}if(typeof renderMovitMap==='function')renderMovitMap(false);setTimeout(augmentMap,30)}catch(_){}const map=document.getElementById('movitMap');map?.scrollIntoView({behavior:'smooth',block:'center'})}
function patchMap(){try{const original=window.renderMovitMap;if(typeof original!=='function'||original.__c360tcPatched)return;const wrapped=function(){const out=original.apply(this,arguments);setTimeout(augmentMap,0);return out};wrapped.__c360tcPatched=true;wrapped.__c360tcOriginal=original;window.renderMovitMap=wrapped}catch(_){}document.addEventListener('click',e=>{const m=e.target.closest('.c360tc-map-marker[data-tc-map-vehicle]');if(!m)return;e.preventDefault();selectedId=m.dataset.tcMapVehicle;render();document.getElementById('trackingCentralV1')?.scrollIntoView({behavior:'smooth',block:'start'})})}
function installRefreshHook(){try{const original=window.loadMovitTracking;if(typeof original!=='function'||original.__c360tcPatched)return;const wrapped=async function(){const out=await original.apply(this,arguments);load(false).catch(()=>{});return out};wrapped.__c360tcPatched=true;window.loadMovitTracking=wrapped}catch(_){}}
function startPolling(){if(pollTimer)return;pollTimer=setInterval(()=>{if(isTrackingVisible())load(false).catch(()=>{})},REFRESH_MS)}
function boot(){ensureUi();patchMap();installRefreshHook();startPolling();if(isTrackingVisible())load(true).catch(()=>{});setInterval(()=>{ensureUi();installMapLegend();if(isTrackingVisible()&&!lastLoadAt)load(true).catch(()=>{})},2500)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,200),{once:true});else setTimeout(boot,200);
})();
