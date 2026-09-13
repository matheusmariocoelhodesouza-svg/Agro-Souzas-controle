(()=>{
'use strict';

const HEALTH_VERSION='2026.09.13-h1';
const RECENT_MS=15*60*1000;
const WARM_MS=2*60*60*1000;
const STALE_MS=24*60*60*1000;
const DAY_MS=24*60*60*1000;
const WEEK_MS=7*DAY_MS;
const HEARTBEAT_MS=5*60*1000;
let cache={devices:[],teams:[],events:[],loadedAt:0};
let healthLoading=false;
let filterMode='all';
let searchTerm='';

window.__c360SystemHealthVersion=HEALTH_VERSION;

function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function num(v){const n=Number(v);return Number.isFinite(n)?n:0}
function dt(v){const d=v?new Date(v):null;return d&&Number.isFinite(d.getTime())?d:null}
function ageMs(v){const d=dt(v);return d?Math.max(0,Date.now()-d.getTime()):Infinity}
function fmtDate(v){const d=dt(v);if(!d)return 'Sem registro';return d.toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}
function ago(v){
 const ms=ageMs(v);if(!Number.isFinite(ms))return 'Nunca';
 const min=Math.floor(ms/60000);if(min<1)return 'agora';if(min<60)return `há ${min} min`;
 const h=Math.floor(min/60);if(h<24)return `há ${h} h`;
 const d=Math.floor(h/24);if(d<30)return `há ${d} dia${d===1?'':'s'}`;
 return fmtDate(v);
}
function getCompanyId(){try{return typeof companyId!=='undefined'?companyId:null}catch(_){return null}}
function getRoute(){try{return document.getElementById('headerModuleTitle')?.textContent?.trim()||location.pathname}catch(_){return location.pathname}}
function pendingSyncCount(){
 const badge=document.getElementById('offlineQueueBadge');
 const m=String(badge?.textContent||'').match(/(\d+)/);return m?num(m[1]):0;
}
function isDeviceMode(){try{return !!(typeof deviceMode!=='undefined'&&deviceMode)||document.body?.classList.contains('device-mode')}catch(_){return document.body?.classList.contains('device-mode')||false}}
function currentBuild(){return document.getElementById('buildBadge')?.textContent?.trim()||'v7.02'}

function ensureCss(){
 if(document.querySelector('link[data-c360-system-health]'))return;
 const l=document.createElement('link');l.rel='stylesheet';l.href='./c360-system-health.css?v='+encodeURIComponent(HEALTH_VERSION);l.dataset.c360SystemHealth='1';document.head.appendChild(l);
}

function makeSection(){
 let section=document.getElementById('saudesistema');
 if(section)return section;
 section=document.createElement('div');
 section.className='section';section.id='saudesistema';section.dataset.screen='saudesistema';section.hidden=true;
 section.innerHTML=`
  <div class="health-hero">
   <div><div class="health-eyebrow">MONITORAMENTO E CONFIABILIDADE</div><h1>Saúde do Sistema</h1><p>Celulares, sincronização, versões, falhas e recuperações automáticas em um só lugar.</p></div>
   <div class="health-actions"><span class="health-auto">↻ atualização automática a cada 60 s</span><button class="btn primary" id="healthRefreshBtn" type="button">ATUALIZAR AGORA</button></div>
  </div>
  <div class="health-summary" id="healthSummary"><div class="health-score" id="healthScore">—</div><div><h3 id="healthSummaryTitle">Verificando o sistema...</h3><p id="healthSummaryText">Aguarde enquanto o Comando 360 confere os aparelhos e diagnósticos.</p></div></div>
  <div class="health-kpis">
   <div class="health-kpi"><div class="t">Aparelhos ativos</div><div class="v" id="healthKpiActive">—</div><div class="s">Vínculos atualmente autorizados</div></div>
   <div class="health-kpi ok"><div class="t">Online agora</div><div class="v" id="healthKpiOnline">—</div><div class="s">Contato nos últimos 15 minutos</div></div>
   <div class="health-kpi warn"><div class="t">Sem contato +24h</div><div class="v" id="healthKpiOffline">—</div><div class="s">Aparelhos ativos sem heartbeat recente</div></div>
   <div class="health-kpi bad"><div class="t">Falhas 24h</div><div class="v" id="healthKpiErrors">—</div><div class="s">Erros e críticos não ignorados</div></div>
   <div class="health-kpi ok"><div class="t">Recuperadas 7d</div><div class="v" id="healthKpiRecovered">—</div><div class="s">Falhas resolvidas pelo AutoRecovery</div></div>
  </div>
  <div class="health-layout">
   <div class="health-panel">
    <div class="health-panel-head"><div><h3>Celulares e dispositivos</h3><div class="muted">Último contato, versão instalada e estado do AutoRecovery.</div></div><span class="muted" id="healthUpdatedAt">—</span></div>
    <div class="health-filters"><input id="healthSearch" type="search" placeholder="Buscar equipe, celular ou modelo..."/><select id="healthFilter"><option value="all">Todos os aparelhos</option><option value="attention">Precisa de atenção</option><option value="online">Online agora</option><option value="offline">Sem contato</option><option value="inactive">Desvinculados</option></select></div>
    <div class="health-device-list" id="healthDeviceList"><div class="health-empty">Carregando aparelhos...</div></div>
   </div>
   <div>
    <div class="health-panel"><div class="health-panel-head"><div><h3>Atenções automáticas</h3><div class="muted">O que merece sua atenção primeiro.</div></div></div><div id="healthAttentionList"><div class="health-empty">Analisando...</div></div></div>
    <div class="health-panel"><div class="health-panel-head"><div><h3>Falhas recentes</h3><div class="muted">Últimos diagnósticos recebidos.</div></div></div><div id="healthEventList"><div class="health-empty">Nenhuma falha carregada.</div></div></div>
   </div>
  </div>`;
 const app=document.getElementById('app');if(app)app.appendChild(section);
 try{if(typeof v2ScreenStore!=='undefined')v2ScreenStore.saudesistema=section}catch(_){}
 try{if(typeof C360_MODULES!=='undefined')C360_MODULES.saudesistema=['Saúde do Sistema','Dispositivos, falhas e recuperação automática']}catch(_){}
 return section;
}

function installNav(){
 if(document.querySelector('.v2navbtn[data-v2tab="saudesistema"]'))return;
 const alerts=document.querySelector('.v2navbtn[data-v2tab="alertas"]');
 if(!alerts)return;
 const b=document.createElement('button');b.type='button';b.className='v2navbtn';b.dataset.v2tab='saudesistema';b.innerHTML='🩺 &nbsp; Saúde do Sistema <span class="health-nav-dot"></span>';
 alerts.parentNode.insertBefore(b,alerts);
}

function ensureUi(){ensureCss();makeSection();installNav()}

function teamMap(){return new Map((cache.teams||[]).map(t=>[t.id,t.name||t.code||'Equipe']))}
function eventMap(){
 const byDevice=new Map();
 for(const e of cache.events||[]){
  const key=e.device_access_id||('team:'+String(e.team_id||''));
  if(!byDevice.has(key))byDevice.set(key,[]);byDevice.get(key).push(e);
 }
 return byDevice;
}
function deviceEvents(device,byDevice){return byDevice.get(device.id)||byDevice.get('team:'+String(device.team_id||''))||[]}
function isBadEvent(e){return ['error','critical'].includes(String(e.severity||'').toLowerCase())}
function recentErrors(events,windowMs=DAY_MS){return events.filter(e=>isBadEvent(e)&&ageMs(e.reported_at)<=windowMs)}
function recoveredEvents(events,windowMs=WEEK_MS){return events.filter(e=>e.recovered===true&&ageMs(e.reported_at)<=windowMs)}

function deviceStatus(d,events){
 if(!d.active)return {key:'inactive',label:'Desvinculado',className:'inactive',rank:5};
 const age=ageMs(d.last_seen_at);
 const safe=!!d.device_info?.safe_mode;
 const err24=recentErrors(events).filter(e=>e.recovered!==true).length;
 if(safe||err24>=3)return {key:'attention',label:safe?'Modo seguro':'Falhas recentes',className:'offline',rank:0};
 if(age<=RECENT_MS)return {key:'online',label:'Online',className:'online',rank:1};
 if(age<=WARM_MS)return {key:'recent',label:'Recente',className:'recent',rank:2};
 if(age<=STALE_MS)return {key:'away',label:'Sem contato',className:'warn',rank:3};
 return {key:'offline',label:'Sem contato +24h',className:'offline',rank:4};
}

function latestVersion(d,events,key){
 const info=d.device_info||{};
 if(info[key])return info[key];
 const field=key==='app_version'?'app_version':'recovery_version';
 const e=events.find(x=>x[field]);return e?.[field]||'Aguardando atualização';
}
function latestProblem(events){return events.find(isBadEvent)||null}

function compute(){
 const active=cache.devices.filter(d=>d.active);
 const byDevice=eventMap();
 const online=active.filter(d=>ageMs(d.last_seen_at)<=RECENT_MS).length;
 const stale=active.filter(d=>ageMs(d.last_seen_at)>STALE_MS).length;
 const allErrors24=(cache.events||[]).filter(e=>isBadEvent(e)&&ageMs(e.reported_at)<=DAY_MS);
 const unrecovered24=allErrors24.filter(e=>e.recovered!==true);
 const recovered7=recoveredEvents(cache.events||[]).length;
 const safeCount=active.filter(d=>d.device_info?.safe_mode===true).length;
 const pending=active.reduce((s,d)=>s+num(d.device_info?.pending_sync),0);
 let score=100-stale*10-unrecovered24.length*6-safeCount*20-Math.min(pending,10)*2;
 score=Math.max(0,Math.min(100,score));
 return {active,byDevice,online,stale,errors24:allErrors24.length,unrecovered24,recovered7,safeCount,pending,score};
}

function summaryState(stats){
 if(stats.score>=90&&stats.stale===0&&stats.safeCount===0)return {cls:'good',title:'Sistema saudável',text:'Os aparelhos que estão em uso estão respondendo normalmente e não há sinal crítico ativo.'};
 if(stats.score>=65)return {cls:'warn',title:'Sistema com pontos de atenção',text:'O Comando 360 está funcionando, mas existem aparelhos sem contato, pendências ou falhas recentes para conferir.'};
 return {cls:'bad',title:'Atenção necessária',text:'Existem sinais relevantes de falha, modo seguro ou dispositivos ativos há muito tempo sem contato.'};
}
function updateNav(stats){
 const b=document.querySelector('.v2navbtn[data-v2tab="saudesistema"]');if(!b)return;
 b.classList.remove('health-nav-ok','health-nav-warn','health-nav-bad');
 b.classList.add(stats.score>=90?'health-nav-ok':stats.score>=65?'health-nav-warn':'health-nav-bad');
}

function renderKpis(stats){
 const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=String(v)};
 set('healthKpiActive',stats.active.length);set('healthKpiOnline',stats.online);set('healthKpiOffline',stats.stale);set('healthKpiErrors',stats.errors24);set('healthKpiRecovered',stats.recovered7);
 const box=document.getElementById('healthSummary'),score=document.getElementById('healthScore'),title=document.getElementById('healthSummaryTitle'),text=document.getElementById('healthSummaryText');
 const s=summaryState(stats);
 if(box){box.className='health-summary '+s.cls}if(score)score.textContent=String(Math.round(stats.score));if(title)title.textContent=s.title;if(text)text.textContent=s.text;
 const at=document.getElementById('healthUpdatedAt');if(at)at.textContent='Atualizado '+new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
 updateNav(stats);
}

function renderDevices(stats){
 const list=document.getElementById('healthDeviceList');if(!list)return;
 const tm=teamMap();
 const q=searchTerm.trim().toLowerCase();
 let rows=(cache.devices||[]).map(d=>{
  const events=deviceEvents(d,stats.byDevice);const status=deviceStatus(d,events);
  return {d,events,status,team:tm.get(d.team_id)||'Equipe'};
 }).filter(x=>{
  const bag=[x.team,x.d.device_name,x.d.device_info?.model,x.d.device_info?.device_code,x.d.device_info?.platform].join(' ').toLowerCase();
  if(q&&!bag.includes(q))return false;
  if(filterMode==='all')return true;
  if(filterMode==='attention')return x.status.key==='attention'||x.status.key==='offline'||recentErrors(x.events).some(e=>e.recovered!==true)||x.d.device_info?.safe_mode===true||num(x.d.device_info?.pending_sync)>0;
  if(filterMode==='online')return x.status.key==='online';
  if(filterMode==='offline')return x.d.active&&ageMs(x.d.last_seen_at)>WARM_MS;
  if(filterMode==='inactive')return !x.d.active;
  return true;
 }).sort((a,b)=>a.status.rank-b.status.rank||ageMs(a.d.last_seen_at)-ageMs(b.d.last_seen_at));
 if(!rows.length){list.innerHTML='<div class="health-empty">Nenhum aparelho encontrado com este filtro.</div>';return}
 list.innerHTML=rows.map(({d,events,status,team})=>{
  const info=d.device_info||{};const errs=recentErrors(events).filter(e=>e.recovered!==true).length;const rec=recoveredEvents(events).length;const problem=latestProblem(events);
  const rowClass=status.key==='attention'?'critical':(status.key==='offline'||errs>0||num(info.pending_sync)>0)?'attention':'';
  const model=info.model||info.platform||'Aparelho';const browser=[info.browser,info.browser_version].filter(Boolean).join(' ');
  const appV=latestVersion(d,events,'app_version');const recV=latestVersion(d,events,'recovery_version');
  return `<div class="health-device ${rowClass}" data-health-device="${esc(d.id)}">
   <div class="health-device-main"><div class="health-device-name"><span class="health-pill ${status.className}">${esc(status.label)}</span><strong title="${esc(d.device_name||model)}">${esc(d.device_name||model)}</strong></div><div class="health-device-meta">${esc(team)} • ${esc(model)}${browser?' • '+esc(browser):''}</div></div>
   <div><div class="health-cell-label">Último contato</div><div class="health-cell-value">${esc(ago(d.last_seen_at))}<br><span class="muted">${esc(fmtDate(d.last_seen_at))}</span></div></div>
   <div><div class="health-cell-label">Versão / Recovery</div><div class="health-cell-value">${esc(appV)}<br><span class="muted">${esc(recV)}</span></div></div>
   <div><div class="health-cell-label">Diagnóstico 7d</div><div class="health-cell-value">${errs?'<span style="color:#b5323b">'+errs+' falha(s)</span>':'Sem falha ativa'}<br><span class="muted">${rec} recuperada(s)${num(info.pending_sync)?' • '+num(info.pending_sync)+' pendente(s)':''}</span></div></div>
   ${problem?`<div style="grid-column:1/-1" class="health-device-meta">Último erro: ${esc(problem.message||problem.kind||'Falha registrada')} • ${esc(ago(problem.reported_at))}</div>`:''}
  </div>`;
 }).join('');
}

function renderAttention(stats){
 const box=document.getElementById('healthAttentionList');if(!box)return;
 const tm=teamMap();const items=[];
 for(const d of stats.active){
  const team=tm.get(d.team_id)||'Equipe';const events=deviceEvents(d,stats.byDevice);const errs=recentErrors(events).filter(e=>e.recovered!==true).length;const info=d.device_info||{};
  if(info.safe_mode===true)items.push({rank:0,cls:'bad',title:`${team}: modo seguro ativo`,text:'O aparelho entrou em proteção após falhas repetidas. O AutoRecovery prioriza a última versão estável.'});
  if(errs>=1)items.push({rank:1,cls:errs>=3?'bad':'warn',title:`${team}: ${errs} falha(s) nas últimas 24h`,text:'Abra o histórico de falhas abaixo para conferir se o problema voltou a acontecer.'});
  if(ageMs(d.last_seen_at)>STALE_MS)items.push({rank:2,cls:'warn',title:`${team}: sem contato há mais de 24h`,text:`Último contato ${ago(d.last_seen_at)}. Quando o celular abrir com internet, o heartbeat será atualizado.`});
  if(num(info.pending_sync)>0)items.push({rank:2,cls:'warn',title:`${team}: ${num(info.pending_sync)} registro(s) pendente(s)`,text:'Existem dados locais aguardando sincronização com o servidor.'});
  if(d.active&&!info.recovery_version)items.push({rank:3,cls:'',title:`${team}: aguardando telemetria nova`,text:'Este aparelho ainda não abriu uma vez com a versão que envia saúde e versão automaticamente.'});
 }
 if(!items.length){box.innerHTML='<div class="health-alert"><strong>✓ Nenhuma atenção crítica agora</strong><p>O painel não encontrou aparelho ativo em modo seguro, com falhas recentes ou sincronização pendente.</p></div>';return}
 box.innerHTML=items.sort((a,b)=>a.rank-b.rank).slice(0,10).map(i=>`<div class="health-alert ${i.cls}"><strong>${esc(i.title)}</strong><p>${esc(i.text)}</p></div>`).join('');
}

function eventLabel(e){
 const map={javascript_error:'Erro JavaScript',unhandled_rejection:'Erro assíncrono',asset_error:'Falha de arquivo',source_leak:'Código apareceu na tela',bootstrap_error:'Falha ao iniciar',bootstrap_watchdog:'Inicialização travada',recovery_heal_requested:'Reparo automático',recovery_rollback_requested:'Rollback automático'};
 return map[e.kind]||String(e.kind||'Diagnóstico').replaceAll('_',' ');
}
function renderEvents(stats){
 const box=document.getElementById('healthEventList');if(!box)return;
 const tm=teamMap();
 const events=(cache.events||[]).filter(isBadEvent).slice(0,12);
 if(!events.length){box.innerHTML='<div class="health-empty">Nenhuma falha registrada. Os aparelhos começarão a alimentar esta área quando abrirem a versão nova.</div>';return}
 box.innerHTML=events.map(e=>{
  const team=e.team_id?tm.get(e.team_id):null;const who=team||((e.mode==='admin')?'Administrador':'Sistema');const cls=e.severity==='critical'?'offline':e.recovered===true?'online':'warn';
  return `<div class="health-event"><div class="health-event-top"><strong>${esc(eventLabel(e))} • ${esc(who)}</strong><span class="health-pill ${cls}">${e.recovered===true?'Recuperada':esc(e.severity||'erro')}</span></div><p>${esc(e.message||'Falha registrada')} • ${esc(ago(e.reported_at))}${e.route?' • '+esc(e.route):''}</p></div>`;
 }).join('');
}
function render(){const stats=compute();renderKpis(stats);renderDevices(stats);renderAttention(stats);renderEvents(stats)}

async function loadHealth(silent=false){
 if(healthLoading)return;
 const cid=getCompanyId();if(!cid||typeof rest!=='function'||isDeviceMode())return;
 healthLoading=true;
 const section=document.getElementById('saudesistema');if(section&&!silent)section.classList.add('health-loading');
 try{
  const since=new Date(Date.now()-WEEK_MS).toISOString();
  const [devices,teams,events]=await Promise.all([
   rest('v2_device_access','select=id,team_id,device_name,device_info,active,paired_at,last_seen_at&company_id=eq.'+encodeURIComponent(cid)+'&order=last_seen_at.desc.nullslast'),
   rest('v2_teams','select=id,name,code,status&company_id=eq.'+encodeURIComponent(cid)+'&order=name.asc'),
   rest('v2_client_health_events','select=id,team_id,device_access_id,reported_at,app_version,recovery_version,mode,route,kind,severity,fingerprint,message,recovery_action,recovered,context&company_id=eq.'+encodeURIComponent(cid)+'&reported_at=gte.'+encodeURIComponent(since)+'&order=reported_at.desc&limit=500')
  ]);
  cache={devices:Array.isArray(devices)?devices:[],teams:Array.isArray(teams)?teams:[],events:Array.isArray(events)?events:[],loadedAt:Date.now()};
  render();
 }catch(e){
  console.warn('Saúde do Sistema',e);
  const box=document.getElementById('healthDeviceList');if(box&&!silent)box.innerHTML='<div class="health-empty">Não foi possível carregar a saúde do sistema. Tente atualizar novamente.</div>';
  try{if(typeof c360Toast==='function'&&!silent)c360Toast('Saúde do Sistema','Não foi possível atualizar os diagnósticos.','error')}catch(_){}
 }finally{healthLoading=false;if(section)section.classList.remove('health-loading')}
}

async function sendHeartbeat(){
 if(!isDeviceMode()||navigator.onLine===false||typeof rpc!=='function')return false;
 try{
  await rpc('v2_device_health_heartbeat',{
   p_app_version:currentBuild(),
   p_recovery_version:window.__c360RecoveryVersion||null,
   p_bootstrap_version:window.__c360Bootstrap?.version||null,
   p_safe_mode:!!window.__c360SafeMode,
   p_route:getRoute(),
   p_pending_sync:pendingSyncCount()
  });
  return true;
 }catch(_){return false}
}

function bind(){
 document.addEventListener('click',e=>{
  if(e.target.closest('#healthRefreshBtn')){e.preventDefault();loadHealth(false);return}
  if(e.target.closest('[data-v2tab="saudesistema"],[data-jump="saudesistema"]'))setTimeout(()=>loadHealth(false),60);
 });
 document.addEventListener('input',e=>{if(e.target?.id==='healthSearch'){searchTerm=e.target.value||'';render()}});
 document.addEventListener('change',e=>{if(e.target?.id==='healthFilter'){filterMode=e.target.value||'all';render()}});
 window.addEventListener('online',()=>setTimeout(sendHeartbeat,1200));
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')sendHeartbeat()});
}

function init(){
 ensureUi();bind();
 setTimeout(sendHeartbeat,4500);
 setInterval(sendHeartbeat,HEARTBEAT_MS);
 setTimeout(()=>{if(document.body?.classList.contains('app-ready')&&!isDeviceMode())loadHealth(true)},8500);
 setInterval(()=>{if(document.querySelector('#screenHost #saudesistema'))loadHealth(true)},60000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();

window.__c360SystemHealth={version:HEALTH_VERSION,refresh:()=>loadHealth(false),heartbeat:sendHeartbeat,getCache:()=>cache};
})();
