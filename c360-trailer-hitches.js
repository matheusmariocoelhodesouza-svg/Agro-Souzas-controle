(()=>{
'use strict';
const VERSION='2026.09.13-hitch1';
let busy=false,lastLoad=0,data={vehicles:[],hitches:[],tracking:[]};
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const fmtKm=v=>Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:0,maximumFractionDigits:1})+' km';
const fmtDate=v=>{if(!v)return '—';try{return new Date(v).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}catch{return String(v)}};
function cid(){try{return typeof companyId!=='undefined'&&companyId?companyId:null}catch{return null}}
function restFn(){try{return typeof v2Rest==='function'?v2Rest:(typeof rest==='function'?rest:null)}catch{return null}}
function rpcFn(){try{return typeof rpc==='function'?rpc:null}catch{return null}}
function vehicleName(v){return v?(v.description||v.model||v.plate||'Veículo'):'Veículo'}
function isTrailer(v){const s=[v?.description,v?.model,v?.make,v?.metadata?.crlv?.species_type,v?.metadata?.vehicle_kind].filter(Boolean).join(' ').toLowerCase();return /(carret|reboq|trailer)/.test(s)}
function byId(id){return data.vehicles.find(v=>v.id===id)||null}
function activeForTrailer(id){return data.hitches.find(h=>h.trailer_vehicle_id===id&&!h.unhitched_at)||null}
function activeForTow(id){return data.hitches.find(h=>h.tow_vehicle_id===id&&!h.unhitched_at)||null}
function trailerIds(){return new Set(data.hitches.map(h=>h.trailer_vehicle_id).filter(Boolean))}
function detectedTrailers(){const used=trailerIds();return data.vehicles.filter(v=>isTrailer(v)||used.has(v.id)).sort((a,b)=>vehicleName(a).localeCompare(vehicleName(b),'pt-BR'))}
function towVehicles(trailerId){return data.vehicles.filter(v=>v.id!==trailerId&&!isTrailer(v)).sort((a,b)=>vehicleName(a).localeCompare(vehicleName(b),'pt-BR'))}
function showMsg(text,kind=''){const el=$('#c360HitchMsg');if(!el)return;el.className='c360-hitch-msg '+kind;el.textContent=text||''}
function ensurePanel(){
 const fleet=$('#frota'),list=$('#vehiclesList');
 if(!fleet||!list)return null;
 let panel=$('#c360TrailerPanel');if(panel)return panel;
 panel=document.createElement('section');panel.id='c360TrailerPanel';panel.className='c360-hitch-panel';
 panel.innerHTML=`<div class="c360-hitch-head"><div><div class="c360-hitch-eyebrow">FROTA CONECTADA</div><h3>🛻 Carretinhas e engates</h3><p>Vincule a carretinha à condução para acumular automaticamente o KM enquanto estiver engatada.</p></div><button class="btn soft" id="c360HitchRefresh" type="button">↻ Atualizar</button></div>
 <div class="c360-hitch-kpis" id="c360HitchKpis"></div>
 <div class="c360-hitch-form">
  <div><label>Carretinha</label><select id="c360HitchTrailer"></select></div>
  <div><label>Condução que está puxando</label><select id="c360HitchTow"></select></div>
  <div><label>Observação <span>(opcional)</span></label><input id="c360HitchNote" maxlength="180" placeholder="Ex.: equipe 2, viagem, troca temporária"></div>
  <button class="btn primary" id="c360HitchSave" type="button">🔗 Engatar / trocar</button>
 </div>
 <div id="c360HitchMsg" class="c360-hitch-msg"></div>
 <div class="c360-hitch-list" id="c360HitchList"></div>
 <div class="c360-hitch-history" id="c360HitchHistory"></div>`;
 const meta=$('#fleetResultCount')?.parentElement;
 list.parentElement.insertBefore(panel,meta||list);
 bindPanel();return panel;
}
function bindPanel(){
 $('#c360HitchRefresh')?.addEventListener('click',()=>load(true));
 $('#c360HitchTrailer')?.addEventListener('change',()=>renderTowOptions());
 $('#c360HitchSave')?.addEventListener('click',saveHitch);
 $('#c360HitchList')?.addEventListener('click',async e=>{
  const b=e.target.closest('button[data-hitch-action]');if(!b)return;
  const id=b.dataset.trailerId,action=b.dataset.hitchAction;
  if(action==='unhitch')return unhitch(id);
  if(action==='change')return prepareChange(id);
  if(action==='history')return renderHistory(id,true);
  if(action==='hitch')return prepareChange(id,true);
 });
}
function renderSelectors(){
 const sel=$('#c360HitchTrailer');if(!sel)return;
 const trailers=detectedTrailers();const known=new Set(trailers.map(v=>v.id));
 const others=data.vehicles.filter(v=>!known.has(v.id)).sort((a,b)=>vehicleName(a).localeCompare(vehicleName(b),'pt-BR'));
 const current=sel.value;
 sel.innerHTML='<option value="">Selecione a carretinha</option>'+
  (trailers.length?'<optgroup label="Carretinhas">'+trailers.map(v=>`<option value="${v.id}">${esc(vehicleName(v))} • ${esc(v.plate||'sem placa')}</option>`).join('')+'</optgroup>':'')+
  '<optgroup label="Outros veículos (se necessário)">'+others.map(v=>`<option value="${v.id}">${esc(vehicleName(v))} • ${esc(v.plate||'sem placa')}</option>`).join('')+'</optgroup>';
 if([...sel.options].some(o=>o.value===current))sel.value=current;
 renderTowOptions();
}
function renderTowOptions(preferred=''){
 const trailerId=$('#c360HitchTrailer')?.value||'';const sel=$('#c360HitchTow');if(!sel)return;
 const active=trailerId?activeForTrailer(trailerId):null;const current=preferred||active?.tow_vehicle_id||sel.value;
 const rows=towVehicles(trailerId);
 sel.innerHTML='<option value="">Selecione a condução</option>'+rows.map(v=>{const occupied=activeForTow(v.id);const suffix=occupied&&occupied.trailer_vehicle_id!==trailerId?' • já puxa outra carreta':'';return `<option value="${v.id}">${esc(vehicleName(v))} • ${esc(v.plate||'sem placa')}${esc(suffix)}</option>`}).join('');
 if(rows.some(v=>v.id===current))sel.value=current;
}
function renderKpis(){
 const el=$('#c360HitchKpis');if(!el)return;const trailers=detectedTrailers(),active=data.hitches.filter(h=>!h.unhitched_at);
 const totalKm=trailers.reduce((n,v)=>n+Number(v.current_odometer_km||0),0);
 el.innerHTML=`<div><span>Carretinhas</span><b>${trailers.length}</b></div><div><span>Engatadas agora</span><b>${active.length}</b></div><div><span>Sem condução</span><b>${Math.max(trailers.length-active.length,0)}</b></div><div><span>KM acumulado</span><b>${fmtKm(totalKm)}</b></div>`;
}
function renderList(){
 const el=$('#c360HitchList');if(!el)return;const trailers=detectedTrailers();
 if(!trailers.length){el.innerHTML='<div class="c360-hitch-empty">Nenhuma carretinha foi identificada. Cadastre a carreta na Frota com nome ou modelo contendo “Carretinha” ou “Reboque”.</div>';return}
 el.innerHTML=trailers.map(t=>{
  const h=activeForTrailer(t.id),tow=h?byId(h.tow_vehicle_id):null;
  const total=Number(t.current_odometer_km||0),period=Number(h?.distance_km||0);
  return `<article class="c360-hitch-card ${h?'active':''}">
   <div class="c360-hitch-main"><div class="c360-hitch-icon">🛻</div><div><strong>${esc(vehicleName(t))}</strong><small>${esc(t.plate||'Sem placa')} • KM acumulado: <b>${fmtKm(total)}</b></small></div></div>
   <div class="c360-hitch-state">${h?`<span class="pill ok">ENGATADA</span><strong>🚍 ${esc(vehicleName(tow))}</strong><small>${esc(tow?.plate||'')} • desde ${fmtDate(h.hitched_at)}</small><small>KM neste engate: <b>${fmtKm(period)}</b></small>`:`<span class="pill warn">SEM CONDUÇÃO</span><strong>Carretinha parada</strong><small>O KM volta a contar quando você fizer um novo engate.</small>`}</div>
   <div class="c360-hitch-actions">${h?`<button class="btn soft" data-hitch-action="change" data-trailer-id="${t.id}">⇄ Trocar condução</button><button class="btn soft" data-hitch-action="unhitch" data-trailer-id="${t.id}">⛓ Desengatar</button>`:`<button class="btn primary" data-hitch-action="hitch" data-trailer-id="${t.id}">🔗 Engatar</button>`}<button class="btn soft" data-hitch-action="history" data-trailer-id="${t.id}">🕘 Histórico</button></div>
  </article>`;
 }).join('');
}
function renderHistory(trailerId,scroll=false){
 const host=$('#c360HitchHistory');if(!host)return;const t=byId(trailerId);if(!t){host.innerHTML='';return}
 const rows=data.hitches.filter(h=>h.trailer_vehicle_id===trailerId);
 host.innerHTML=`<div class="c360-hitch-history-head"><div><b>Histórico • ${esc(vehicleName(t))}</b><small>${esc(t.plate||'')} • ${rows.length} engate(s)</small></div><button class="btn soft" type="button" id="c360HitchHistoryClose">Fechar</button></div>`+
  (rows.length?'<div class="c360-hitch-history-list">'+rows.map(h=>{const tow=byId(h.tow_vehicle_id);return `<div class="c360-hitch-history-row"><div><strong>${esc(vehicleName(tow))}</strong><small>${esc(tow?.plate||'')}</small></div><div><span>${h.unhitched_at?'Período encerrado':'Engatada agora'}</span><small>${fmtDate(h.hitched_at)} → ${h.unhitched_at?fmtDate(h.unhitched_at):'agora'}</small></div><div><span>KM rodado</span><b>${fmtKm(h.distance_km)}</b></div></div>`}).join('')+'</div>':'<div class="c360-hitch-empty">Ainda não há histórico para esta carretinha.</div>');
 $('#c360HitchHistoryClose')?.addEventListener('click',()=>{host.innerHTML=''});if(scroll)host.scrollIntoView({behavior:'smooth',block:'nearest'});
}
function render(){renderSelectors();renderKpis();renderList()}
async function load(force=false){
 const company=cid(),rf=restFn();if(!company||!rf||busy)return;if(!force&&Date.now()-lastLoad<15000)return;
 busy=true;showMsg(force?'Atualizando engates…':'');
 try{
  const rp=rpcFn();if(rp){try{await rp('v2_sync_active_trailer_odometer',{p_company_id:company})}catch(_){}}
  const enc=encodeURIComponent(company);
  const [vehicles,hitches,tracking]=await Promise.all([
   rf('v2_vehicles','select=id,description,plate,make,model,current_odometer_km,status,metadata&company_id=eq.'+enc+'&order=description.asc'),
   rf('v2_trailer_hitches','select=id,trailer_vehicle_id,tow_vehicle_id,hitched_at,unhitched_at,tow_odometer_start_km,tow_odometer_end_km,trailer_odometer_start_km,distance_km,notes&company_id=eq.'+enc+'&order=hitched_at.desc&limit=500'),
   rf('v2_vehicle_tracking_current','select=vehicle_id,odometer_km,recorded_at&company_id=eq.'+enc)
  ]);
  data={vehicles:vehicles||[],hitches:hitches||[],tracking:tracking||[]};lastLoad=Date.now();render();showMsg('');
 }catch(e){showMsg('Não foi possível carregar os engates: '+(e?.message||e),'error')}finally{busy=false}
}
async function saveHitch(){
 const company=cid(),rp=rpcFn(),trailer=$('#c360HitchTrailer')?.value,tow=$('#c360HitchTow')?.value,note=$('#c360HitchNote')?.value?.trim()||null;
 if(!company||!rp)return showMsg('Sessão da frota ainda não está pronta.','error');
 if(!trailer||!tow)return showMsg('Selecione a carretinha e a condução.','error');
 const t=byId(trailer),v=byId(tow),old=activeForTrailer(trailer),occupied=activeForTow(tow);
 let msg=`Engatar ${vehicleName(t)} em ${vehicleName(v)}?`;
 if(old&&old.tow_vehicle_id!==tow)msg+=' O engate atual desta carretinha será encerrado automaticamente.';
 if(occupied&&occupied.trailer_vehicle_id!==trailer)msg+=' A carretinha que está nesse ônibus será desengatada automaticamente.';
 if(!confirm(msg))return;
 busy=true;showMsg('Salvando engate…');
 try{await rp('v2_hitch_trailer',{p_company_id:company,p_trailer_vehicle_id:trailer,p_tow_vehicle_id:tow,p_notes:note,p_at:new Date().toISOString()});if($('#c360HitchNote'))$('#c360HitchNote').value='';lastLoad=0;await load(true);showMsg('Engate salvo. O KM da carretinha passa a acompanhar esta condução.','success')}
 catch(e){showMsg(e?.message||'Não foi possível salvar o engate.','error')}finally{busy=false}
}
async function unhitch(trailerId){
 const company=cid(),rp=rpcFn(),t=byId(trailerId),h=activeForTrailer(trailerId);if(!company||!rp||!h)return;
 if(!confirm(`Desengatar ${vehicleName(t)} de ${vehicleName(byId(h.tow_vehicle_id))}? O KM deste período será fechado e preservado no histórico.`))return;
 busy=true;showMsg('Encerrando engate…');
 try{await rp('v2_unhitch_trailer',{p_company_id:company,p_trailer_vehicle_id:trailerId,p_at:new Date().toISOString()});lastLoad=0;await load(true);showMsg('Carretinha desengatada. Histórico e KM preservados.','success')}
 catch(e){showMsg(e?.message||'Não foi possível desengatar.','error')}finally{busy=false}
}
function prepareChange(trailerId,blankTow=false){
 const trailer=$('#c360HitchTrailer');if(!trailer)return;trailer.value=trailerId;const active=activeForTrailer(trailerId);renderTowOptions(blankTow?'':active?.tow_vehicle_id||'');if(blankTow&&$('#c360HitchTow'))$('#c360HitchTow').value='';trailer.scrollIntoView({behavior:'smooth',block:'center'});$('#c360HitchTow')?.focus();
}
let timer=null;function schedule(){clearTimeout(timer);timer=setTimeout(()=>{const p=ensurePanel();if(p)load(false)},120)}
document.addEventListener('c360:bootstrap-ready',schedule);
document.addEventListener('click',schedule,true);
document.addEventListener('change',e=>{if(e.target?.id==='fleetStatusFilter'||e.target?.id==='fleetSort')schedule()});
new MutationObserver(schedule).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
setInterval(()=>{if($('#frota')?.classList.contains('active'))schedule()},30000);
schedule();window.__c360TrailerHitches={version:VERSION,refresh:()=>load(true)};
})();
