(()=>{
'use strict';
const VERSION='2026.09.20-native-live3';
let busy=false;
let loading=false;
let liveTimer=null;

function isDeviceMode(){try{return !!deviceMode}catch(_){return document.body?.classList.contains('device-mode')||false}}
function currentCompany(){try{return companyId||null}catch(_){return null}}
function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function toast(title,msg,type='success'){
 try{if(typeof c360Toast==='function')return c360Toast(title,msg,type)}catch(_){}
 console.log(title,msg);
}
function clearLiveTimer(){if(liveTimer){clearInterval(liveTimer);liveTimer=null}}
function closeModal(){clearLiveTimer();document.getElementById('c360NativeTrackerModal')?.remove()}
function formatExpiry(v){try{return new Date(v).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}catch(_){return String(v||'')}}
function formatDate(v){if(!v)return'—';try{return new Date(v).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'})}catch(_){return String(v)}}
function ageSeconds(v){if(!v)return Infinity;const n=(Date.now()-new Date(v).getTime())/1000;return Number.isFinite(n)?Math.max(0,n):Infinity}
function ageLabel(v){const s=ageSeconds(v);if(!Number.isFinite(s))return'Sem sinal';if(s<15)return'agora';if(s<60)return`${Math.round(s)} s atrás`;if(s<3600)return`${Math.round(s/60)} min atrás`;return`${Math.round(s/3600)} h atrás`}
function num(v,d=0){const n=Number(v);return Number.isFinite(n)?n.toFixed(d):'—'}
function boolValue(v){return v===true||v==='true'}
function firstNotNull(...values){for(const v of values)if(v!==null&&v!==undefined&&v!=='')return v;return null}
function ensureStyle(){
 if(document.getElementById('c360NativeTrackerAdminStyle'))return;
 const s=document.createElement('style');s.id='c360NativeTrackerAdminStyle';
 s.textContent=`
 #c360NativeTrackerQuick{position:fixed;right:14px;bottom:76px;z-index:9500;border:0;border-radius:999px;background:#0f2747;color:#fff;padding:10px 14px;font:800 12px system-ui;box-shadow:0 12px 30px rgba(15,39,71,.28);cursor:pointer}
 #c360NativeTrackerQuick:hover{transform:translateY(-1px)}
 .c360-native-modal{position:fixed;inset:0;z-index:22000;background:rgba(2,8,23,.68);display:grid;place-items:center;padding:16px}
 .c360-native-box{width:min(760px,100%);max-height:90vh;overflow:auto;background:#fff;color:#172033;border-radius:20px;padding:20px;box-shadow:0 28px 80px rgba(0,0,0,.36)}
 .c360-native-device{border:1px solid #e2e8f0;border-radius:14px;padding:12px;margin-top:9px;display:flex;justify-content:space-between;gap:12px;align-items:center}
 .c360-native-device b{display:block}.c360-native-device small{color:#64748b}.c360-native-ok{color:#15803d;font-weight:900}.c360-native-warn{color:#9a6700;font-weight:900}.c360-native-off{color:#b91c1c;font-weight:900}
 .c360-native-actions{display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end}
 .c360-live-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:12px}
 .c360-live-status{display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:5px 9px;font-size:11px;font-weight:900;background:#ecfdf5;color:#166534}
 .c360-live-status.warn{background:#fffbeb;color:#92400e}.c360-live-status.off{background:#fef2f2;color:#991b1b}
 .c360-live-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:12px 0}
 .c360-live-kpi{border:1px solid #e2e8f0;background:#f8fafc;border-radius:14px;padding:12px;min-width:0}
 .c360-live-kpi span{display:block;font-size:10px;color:#64748b;font-weight:800;text-transform:uppercase;letter-spacing:.45px}.c360-live-kpi b{display:block;font-size:22px;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
 .c360-battery{height:8px;border-radius:999px;background:#e2e8f0;overflow:hidden;margin-top:8px}.c360-battery>i{display:block;height:100%;background:#16a34a;border-radius:999px}
 .c360-live-map{border:1px solid #dbe3ee;border-radius:16px;overflow:hidden;background:#eef2f7;min-height:280px}.c360-live-map iframe{display:block;width:100%;height:300px;border:0}
 .c360-live-map-empty{display:grid;place-items:center;min-height:280px;padding:24px;text-align:center;color:#64748b}
 .c360-live-meta{display:flex;justify-content:space-between;gap:8px;align-items:center;flex-wrap:wrap;font-size:11px;color:#64748b;margin:9px 0 12px}
 .c360-live-links{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
 body.darkmode .c360-native-box{background:#101a2a;color:#f8fafc}.darkmode .c360-native-device,.darkmode .c360-live-kpi,.darkmode .c360-live-map{border-color:#2a3d55;background:#132033}.darkmode .c360-native-device small,.darkmode .c360-live-kpi span,.darkmode .c360-live-meta{color:#aebed1}
 @media(max-width:720px){#c360NativeTrackerQuick{right:10px;bottom:72px}.c360-native-device{align-items:flex-start;flex-direction:column}.c360-native-actions,.c360-native-device button{width:100%}.c360-live-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.c360-live-map iframe{height:250px}}
 `;
 document.head.appendChild(s);
}
function baseModal(inner){
 closeModal();ensureStyle();
 const modal=document.createElement('div');modal.id='c360NativeTrackerModal';modal.className='c360-native-modal';
 modal.innerHTML=`<div class="c360-native-box">${inner}</div>`;
 document.body.appendChild(modal);
 modal.addEventListener('click',e=>{if(e.target===modal||e.target.closest('[data-c360-native-close]'))closeModal()});
 return modal;
}
function showCode(code,expiresAt,deviceId){
 const modal=baseModal(`
  <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start"><div><div style="font-size:11px;font-weight:900;letter-spacing:.8px;color:#64748b">RASTREADOR ANDROID 24H</div><h3 style="margin:5px 0 4px">Código de ativação</h3><div style="font-size:12px;color:#64748b">Use este código no aplicativo Rastreador Comando 360 deste celular.</div></div><button type="button" data-c360-native-close class="btn soft">Fechar</button></div>
  <div style="margin:18px 0 10px;border:2px dashed #1976d2;border-radius:16px;padding:18px;text-align:center;background:#eff6ff"><div style="font:900 30px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:4px;color:#0f3d78">${esc(code)}</div><div style="font-size:11px;color:#5c7189;margin-top:8px">Válido até ${esc(formatExpiry(expiresAt))}</div></div>
  <div style="font-size:12px;line-height:1.55;color:#475569">1. Instale/abra o <b>Rastreador Comando 360</b> no aparelho da equipe.<br>2. Digite o código acima.<br>3. Autorize localização em segundo plano e bateria sem restrição.<br>4. Depois do primeiro envio, o painel passa a mostrar posição, velocidade, bateria e heartbeat mesmo com o PWA fechado.</div>
  <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px"><button type="button" data-c360-native-copy class="btn soft">Copiar código</button><button type="button" data-c360-native-new="${esc(deviceId)}" class="btn primary">Gerar outro código</button></div>`);
 modal.querySelector('[data-c360-native-copy]')?.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(code);toast('Código copiado','Cole no Rastreador Comando 360.')}catch(_){toast('Código','Código: '+code,'warn')}});
 modal.querySelector('[data-c360-native-new]')?.addEventListener('click',()=>generateCode(deviceId));
}
async function generateCode(deviceId){
 if(busy)return;
 if(typeof rpc!=='function'){toast('Rastreador 24h','RPC ainda não está disponível.','warn');return}
 busy=true;
 try{
  const rows=await rpc('v2_create_native_tracker_pairing_code',{p_device_access_id:deviceId});
  const row=Array.isArray(rows)?rows[0]:rows;
  if(!row?.code)throw new Error('Não foi possível gerar o código.');
  showCode(String(row.code).trim().toUpperCase(),row.expires_at,deviceId);
 }catch(e){toast('Rastreador 24h',e?.message||String(e),'error')}
 finally{busy=false}
}
function liveStatus(info,lastSeen){
 const heartbeat=info?.native_tracker_heartbeat_at||lastSeen;
 const age=ageSeconds(heartbeat);
 const service=boolValue(info?.native_service_running)||boolValue(info?.service_running);
 if(service&&age<=120)return{label:'● ONLINE',cls:'',heartbeat};
 if(age<=600)return{label:'● SINAL ATRASADO',cls:'warn',heartbeat};
 return{label:'● OFFLINE / SEM SINAL',cls:'off',heartbeat};
}
function mapEmbed(lat,lng){
 const d=.008;const left=lng-d,right=lng+d,bottom=lat-d,top=lat+d;
 return `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${lat}%2C${lng}`;
}
async function fetchLive(deviceId){
 const cid=currentCompany();if(!cid||typeof rest!=='function')throw new Error('Empresa não carregada.');
 const [devices,locations]=await Promise.all([
  rest('v2_device_access','select=id,team_id,device_name,device_info,native_user_id,active,last_seen_at&company_id=eq.'+encodeURIComponent(cid)+'&id=eq.'+encodeURIComponent(deviceId)+'&limit=1'),
  rest('v2_device_location_current','select=device_access_id,latitude,longitude,accuracy_m,speed_kmh,heading_deg,battery_percent,charging,recorded_at,updated_at&company_id=eq.'+encodeURIComponent(cid)+'&device_access_id=eq.'+encodeURIComponent(deviceId)+'&limit=1')
 ]);
 return{device:(devices||[])[0]||null,location:(locations||[])[0]||null};
}
async function refreshLive(deviceId,teamName){
 const host=document.getElementById('c360NativeLiveContent');if(!host)return;
 try{
  const {device,location}=await fetchLive(deviceId);if(!device)throw new Error('Celular não encontrado.');
  const info=device.device_info||{};const st=liveStatus(info,device.last_seen_at);
  const batteryRaw=firstNotNull(info.native_battery_percent,location?.battery_percent);
  const battery=batteryRaw===null?null:Math.max(0,Math.min(100,Number(batteryRaw)));
  const charging=boolValue(firstNotNull(info.native_charging,location?.charging));
  const speed=location?.speed_kmh==null?null:Math.max(0,Number(location.speed_kmh));
  const lat=Number(location?.latitude),lng=Number(location?.longitude);const hasPos=Number.isFinite(lat)&&Number.isFinite(lng);
  const recorded=location?.recorded_at||location?.updated_at;
  const maps=hasPos?`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`:'#';
  const waze=hasPos?`https://www.waze.com/ul?ll=${lat}%2C${lng}&navigate=yes`:'#';
  host.innerHTML=`
   <div class="c360-live-head"><div><div style="font-size:11px;font-weight:900;color:#64748b;letter-spacing:.7px">RASTREAMENTO AO VIVO</div><h3 style="margin:4px 0">${esc(teamName||'Equipe')} — ${esc(device.device_name||'Celular')}</h3><span class="c360-live-status ${esc(st.cls)}">${esc(st.label)}</span></div><button type="button" data-c360-native-close class="btn soft">Fechar</button></div>
   <div class="c360-live-grid">
    <div class="c360-live-kpi"><span>Bateria</span><b>${battery===null?'—':Math.round(battery)+'%'}${charging?' ⚡':''}</b><div class="c360-battery"><i style="width:${battery===null?0:battery}%"></i></div></div>
    <div class="c360-live-kpi"><span>Velocidade</span><b>${speed===null?'—':num(speed,0)+' km/h'}</b></div>
    <div class="c360-live-kpi"><span>Precisão GPS</span><b>${location?.accuracy_m==null?'—':'± '+num(location.accuracy_m,0)+' m'}</b></div>
    <div class="c360-live-kpi"><span>Última posição</span><b style="font-size:16px">${esc(ageLabel(recorded))}</b></div>
   </div>
   <div class="c360-live-meta"><span>Heartbeat: <b>${esc(ageLabel(st.heartbeat))}</b> • versão ${esc(info.native_tracker_version||'—')}</span><span>Atualização automática do painel: 10 s</span></div>
   <div class="c360-live-map">${hasPos?`<iframe loading="eager" referrerpolicy="no-referrer" src="${esc(mapEmbed(lat,lng))}" title="Localização ao vivo"></iframe>`:`<div class="c360-live-map-empty"><div><b>Aguardando a primeira posição GPS</b><br><small>O status e a bateria podem atualizar antes da coordenada.</small></div></div>`}</div>
   ${hasPos?`<div class="c360-live-links"><a class="btn soft" target="_blank" rel="noopener noreferrer" href="${esc(maps)}">📍 Abrir no Google Maps</a><a class="btn soft" target="_blank" rel="noopener noreferrer" href="${esc(waze)}">🚗 Abrir no Waze</a><span class="muted" style="align-self:center">${num(lat,6)}, ${num(lng,6)} • ${esc(formatDate(recorded))}</span></div>`:''}`;
  host.querySelector('[data-c360-native-close]')?.addEventListener('click',closeModal);
 }catch(e){host.innerHTML=`<div class="c360-live-head"><h3 style="margin:0">Rastreador ao vivo</h3><button type="button" data-c360-native-close class="btn soft">Fechar</button></div><p class="error">${esc(e?.message||String(e))}</p>`;host.querySelector('[data-c360-native-close]')?.addEventListener('click',closeModal)}
}
function openLive(deviceId,teamName){
 const modal=baseModal('<div id="c360NativeLiveContent"><div style="padding:24px;text-align:center">Carregando rastreador ao vivo...</div></div>');
 refreshLive(deviceId,teamName);
 liveTimer=setInterval(()=>refreshLive(deviceId,teamName),10_000);
 return modal;
}
async function loadDevices(){
 if(loading)return;loading=true;
 try{
  const cid=currentCompany();
  if(!cid||typeof rest!=='function')throw new Error('A empresa ainda não foi carregada.');
  const [devices,teams,locations]=await Promise.all([
   rest('v2_device_access','select=id,team_id,device_name,device_info,native_user_id,active,last_seen_at&company_id=eq.'+encodeURIComponent(cid)+'&active=eq.true&order=paired_at.desc'),
   rest('v2_teams','select=id,name,code&company_id=eq.'+encodeURIComponent(cid)+'&status=eq.active'),
   rest('v2_device_location_current','select=device_access_id,battery_percent,charging,speed_kmh,recorded_at,updated_at&company_id=eq.'+encodeURIComponent(cid))
  ]);
  const tm=new Map((teams||[]).map(t=>[t.id,t.name||t.code||'Equipe']));
  const lm=new Map((locations||[]).map(l=>[l.device_access_id,l]));
  const rows=(devices||[]).map(d=>{
   const native=!!d.native_user_id||!!d.device_info?.native_tracker;const info=d.device_info||{};const st=liveStatus(info,d.last_seen_at);const loc=lm.get(d.id);
   const battery=firstNotNull(info.native_battery_percent,loc?.battery_percent);const speed=loc?.speed_kmh;
   const status=native?`<span class="${st.cls==='off'?'c360-native-off':st.cls==='warn'?'c360-native-warn':'c360-native-ok'}">${esc(st.label)}</span>`:'<span class="c360-native-warn">● AINDA NÃO PAREADO</span>';
   const preview=native?`<small>${status}<br>${battery==null?'Bateria —':'Bateria '+Math.round(Number(battery))+'%'} • ${speed==null?'Velocidade —':Math.round(Number(speed))+' km/h'} • ${esc(ageLabel(loc?.recorded_at||loc?.updated_at))}</small>`:`<small>${status}</small>`;
   const team=tm.get(d.team_id)||'Equipe';
   return `<div class="c360-native-device"><div><b>${esc(team)} — ${esc(d.device_name||'Celular')}</b>${preview}</div><div class="c360-native-actions">${native?`<button type="button" class="btn primary" data-c360-native-live="${esc(d.id)}" data-c360-native-team="${esc(team)}">📍 AO VIVO</button>`:''}<button type="button" class="btn ${native?'soft':'primary'}" data-c360-native-device="${esc(d.id)}">${native?'Gerar novo código':'Ativar rastreador 24h'}</button></div></div>`;
  }).join('')||'<div style="padding:18px;color:#64748b">Nenhum celular de equipe ativo foi encontrado.</div>';
  const modal=baseModal(`<div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start"><div><div style="font-size:11px;font-weight:900;color:#64748b;letter-spacing:.7px">COMANDO 360</div><h3 style="margin:4px 0">Rastreadores 24h</h3><div style="font-size:12px;color:#64748b">Localização, bateria e velocidade dos celulares das equipes.</div></div><button type="button" data-c360-native-close class="btn soft">Fechar</button></div><div style="margin-top:12px">${rows}</div>`);
  modal.querySelectorAll('[data-c360-native-device]').forEach(btn=>btn.addEventListener('click',()=>generateCode(btn.dataset.c360NativeDevice)));
  modal.querySelectorAll('[data-c360-native-live]').forEach(btn=>btn.addEventListener('click',()=>openLive(btn.dataset.c360NativeLive,btn.dataset.c360NativeTeam)));
 }catch(e){baseModal(`<div style="display:flex;justify-content:space-between"><h3 style="margin:0">Rastreador 24h</h3><button type="button" data-c360-native-close class="btn soft">Fechar</button></div><p>${esc(e?.message||String(e))}</p>`)}
 finally{loading=false}
}
function decorateExistingCards(){
 document.querySelectorAll('[data-c360-device-controls]').forEach(box=>{
  if(box.querySelector('[data-c360-native-pair]'))return;
  const id=box.dataset.c360DeviceControls;if(!id)return;
  const actions=box.querySelector('.c360-device-actions')||box;
  const btn=document.createElement('button');btn.type='button';btn.className='btn soft';btn.dataset.c360NativePair=id;btn.textContent='📡 Rastreador 24h';btn.addEventListener('click',()=>generateCode(id));actions.appendChild(btn);
 });
}
function ensureQuickButton(){
 if(isDeviceMode()||!document.body?.classList.contains('app-ready')||!currentCompany())return;
 ensureStyle();
 let btn=document.getElementById('c360NativeTrackerQuick');
 if(!btn){btn=document.createElement('button');btn.id='c360NativeTrackerQuick';btn.type='button';btn.textContent='📍 Rastreadores ao vivo';btn.addEventListener('click',loadDevices);document.body.appendChild(btn)}
 decorateExistingCards();
}
function init(){
 if(isDeviceMode())return;
 ensureQuickButton();
 const obs=new MutationObserver(ensureQuickButton);obs.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
 setInterval(ensureQuickButton,4000);
 window.C360NativeTrackerAdmin={version:VERSION,generateCode,open:loadDevices,live:openLive};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
