(()=>{
'use strict';
const VERSION='2026.09.17-device-control3';
const DEFAULT_PERMISSIONS={ponto:true,apanha:true,abastecimento:true,relatorio:true,impressao:true,manutencao:false,insumos:false,frota:false};
const PERMISSION_LABELS={
  ponto:'Ponto e reconhecimento facial',
  apanha:'Apanha / operações',
  abastecimento:'Abastecimento e KM',
  manutencao:'Manutenções',
  insumos:'Insumos',
  frota:'Visualização de frota',
  relatorio:'Relatórios da equipe',
  impressao:'Impressão de comprovantes'
};
let adminDevices=new Map();
let ringTimer=null,ringCtx=null;
let lastLocationAt=0;
let locationWatchId=null;
let locationPermissionState='unknown';
let lastLocationStatusKey='';
let polling=false;
let adminDecorating=false;

function isDeviceMode(){try{return !!deviceMode}catch(_){return document.body.classList.contains('device-mode')}}
function currentAccess(){try{return deviceAccess||null}catch(_){return null}}
function currentCompany(){try{return companyId||null}catch(_){return null}}
function currentTeam(){try{return deviceTeam||null}catch(_){return null}}
function toast(title,msg,type='success'){try{if(typeof c360Toast==='function')return c360Toast(title,msg,type)}catch(_){};console.log(title,msg)}
function nowIso(){return new Date().toISOString()}
function mergedPermissions(p){return {...DEFAULT_PERMISSIONS,...(p||{})}}
function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}

function injectStyles(){
 if(document.getElementById('c360DeviceControlStyle'))return;
 const s=document.createElement('style');s.id='c360DeviceControlStyle';s.textContent=`
 .c360-device-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px;padding-top:10px;border-top:1px solid #e7edf5}
 .c360-device-actions .btn{font-size:11px;padding:8px 10px}
 .c360-device-loc{margin-top:8px;padding:9px 10px;border:1px solid #e4ebf3;border-radius:10px;background:#f8fafc;font-size:11px;color:#53657b}
 .c360-device-state{font-weight:900}.c360-device-state.lost{color:#b91c1c}.c360-device-state.locked{color:#9a6700}
 .c360-control-modal{position:fixed;inset:0;z-index:10050;background:rgba(15,23,42,.64);display:grid;place-items:center;padding:16px}
 .c360-control-box{width:min(560px,100%);max-height:90vh;overflow:auto;background:#fff;border-radius:18px;padding:18px;box-shadow:0 25px 70px rgba(2,8,23,.34)}
 .c360-control-grid{display:grid;gap:8px;margin:14px 0}.c360-control-option{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:11px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc}
 .c360-control-option input{width:20px;height:20px}
 #c360DeviceLockOverlay{position:fixed;inset:0;z-index:20000;background:#07111f;color:#fff;display:grid;place-items:center;padding:24px;text-align:center}
 #c360DeviceLockOverlay .box{width:min(520px,100%);padding:28px;border:1px solid rgba(255,255,255,.14);border-radius:24px;background:#0f1f34;box-shadow:0 24px 80px rgba(0,0,0,.45)}
 #c360DeviceLockOverlay .ico{font-size:58px;margin-bottom:8px}#c360DeviceLockOverlay h2{font-size:27px;margin:6px 0}#c360DeviceLockOverlay p{color:#cbd5e1;line-height:1.5}
 #c360RingOverlay{position:fixed;left:14px;right:14px;bottom:18px;z-index:20020;background:#b91c1c;color:white;border-radius:16px;padding:14px;box-shadow:0 16px 40px rgba(127,29,29,.35);display:flex;justify-content:space-between;align-items:center;gap:12px}
 #c360LocationPermissionCard{position:fixed;left:12px;right:12px;bottom:14px;z-index:19000;background:#fff;border:1px solid #d9e5f1;border-radius:16px;padding:13px 14px;box-shadow:0 16px 44px rgba(15,23,42,.20);color:#173451}
 #c360LocationPermissionCard strong{display:block;font-size:14px}#c360LocationPermissionCard p{font-size:11.5px;line-height:1.45;color:#60758c;margin:5px 0 10px}
 #c360LocationPermissionCard .toolbar{justify-content:flex-end}.darkmode #c360LocationPermissionCard{background:#0f1d2e;border-color:#26394f;color:#e8f0fa}.darkmode #c360LocationPermissionCard p{color:#9fb3cb}
 `;document.head.appendChild(s);
}

async function fetchAdminDeviceState(){
 const cid=currentCompany();if(!cid||isDeviceMode())return {devices:[],locations:[]};
 try{
   const [devices,locations]=await Promise.all([
     rest('v2_device_access','select=id,team_id,device_name,device_info,permissions,active,paired_at,last_seen_at,control_state,control_message,lost_mode&company_id=eq.'+encodeURIComponent(cid)+'&order=paired_at.desc'),
     rest('v2_device_location_current','select=device_access_id,latitude,longitude,accuracy_m,speed_kmh,battery_percent,charging,recorded_at&company_id=eq.'+encodeURIComponent(cid)+'&order=recorded_at.desc')
   ]);
   adminDevices=new Map((devices||[]).map(d=>[d.id,d]));
   return {devices:devices||[],locations:locations||[]};
 }catch(e){console.warn('C360 device admin state',e);return {devices:[],locations:[]}}
}

function stateLabel(d){
 const st=d?.control_state||'active';
 if(st==='lost'||d?.lost_mode)return '<span class="c360-device-state lost">● MODO PERDIDO</span>';
 if(st==='app_locked')return '<span class="c360-device-state locked">● APP BLOQUEADO</span>';
 return '<span class="c360-device-state">● LIBERADO</span>';
}
function locationPermissionLabel(d){
 const p=String(d?.device_info?.location_permission||'unknown');
 const err=String(d?.device_info?.location_error||'').trim();
 if(p==='granted')return '<span style="color:#15803d;font-weight:900">● GPS LIBERADO</span>';
 if(p==='denied')return '<span style="color:#b91c1c;font-weight:900">● GPS BLOQUEADO</span>'+(err?'<div class="muted" style="margin-top:3px">'+escapeHtml(err)+'</div>':'');
 if(p==='prompt')return '<span style="color:#9a6700;font-weight:900">● AGUARDANDO PERMISSÃO DE GPS</span>';
 if(p==='unavailable')return '<span style="color:#b91c1c;font-weight:900">● GPS INDISPONÍVEL</span>';
 return '<span class="muted">● GPS AINDA NÃO CONFIGURADO</span>';
}
function locationLabel(loc){
 if(!loc)return '📍 Localização ainda não recebida.';
 const at=loc.recorded_at?new Date(loc.recorded_at).toLocaleString('pt-BR'):'sem horário';
 const batt=Number.isFinite(Number(loc.battery_percent))?' • 🔋 '+Number(loc.battery_percent)+'%':'';
 const speed=Number(loc.speed_kmh||0)>1?' • '+Math.round(Number(loc.speed_kmh))+' km/h':'';
 return `📍 ${Number(loc.latitude).toFixed(5)}, ${Number(loc.longitude).toFixed(5)} • ${escapeHtml(at)}${batt}${speed}`;
}
async function decorateAdminCards(){
 if(adminDecorating||isDeviceMode())return;
 const list=document.getElementById('teamDevicesList');if(!list)return;
 adminDecorating=true;
 try{
   const state=await fetchAdminDeviceState();
   const locMap=new Map(state.locations.map(x=>[x.device_access_id,x]));
   const cards=[...list.querySelectorAll('.device-admin-card')];
   state.devices.forEach((d,i)=>{
     const card=cards[i];if(!card||card.querySelector('[data-c360-device-controls]'))return;
     const nativeManaged=!!d.device_info?.native_managed;
     const loc=locMap.get(d.id);
     const box=document.createElement('div');box.dataset.c360DeviceControls=d.id;
     const mapButton=loc?`<button class="btn soft" type="button" data-c360-device-action="map" data-id="${d.id}" data-lat="${loc.latitude}" data-lon="${loc.longitude}">🗺️ Abrir mapa</button>`:'';
     box.innerHTML=`<div class="c360-device-loc">${stateLabel(d)}<br>${locationPermissionLabel(d)}<br>${locationLabel(loc)}</div><div class="c360-device-actions">
       <button class="btn soft" type="button" data-c360-device-action="permissions" data-id="${d.id}">⚙️ Permissões</button>
       ${mapButton}
       <button class="btn soft" type="button" data-c360-device-action="ring" data-id="${d.id}">🔊 Tocar</button>
       <button class="btn soft" type="button" data-c360-device-action="locate" data-id="${d.id}">📍 Localizar</button>
       <button class="btn soft" type="button" data-c360-device-action="lockapp" data-id="${d.id}">🔒 Bloquear app</button>
       <button class="btn danger" type="button" data-c360-device-action="lost" data-id="${d.id}">🚨 Modo perdido</button>
       <button class="btn soft" type="button" data-c360-device-action="unlock" data-id="${d.id}">🔓 Liberar</button>
       <button class="btn soft" type="button" data-c360-device-action="lockdevice" data-id="${d.id}" ${nativeManaged?'':'disabled title="Disponível quando este aparelho estiver no modo Android gerenciado"'}>📵 Bloquear celular</button>
     </div>`;
     card.appendChild(box);
   });
 }finally{adminDecorating=false}
}

function openPermissions(deviceId){
 const d=adminDevices.get(deviceId);if(!d)return;
 document.getElementById('c360ControlModal')?.remove();
 const p=mergedPermissions(d.permissions);
 const modal=document.createElement('div');modal.id='c360ControlModal';modal.className='c360-control-modal';
 modal.innerHTML=`<div class="c360-control-box"><div class="toolbar" style="justify-content:space-between"><div><h3 style="margin:0">Controle de acesso</h3><div class="muted">${escapeHtml(d.device_name||'Celular da equipe')}</div></div><button class="btn soft" data-c360-close-modal type="button">Fechar</button></div><div class="c360-control-grid">${Object.entries(PERMISSION_LABELS).map(([k,label])=>`<label class="c360-control-option"><span><b>${escapeHtml(label)}</b><div class="muted">${p[k]?'Permitido':'Bloqueado'}</div></span><input type="checkbox" data-c360-permission="${k}" ${p[k]?'checked':''}></label>`).join('')}</div><div class="muted" style="margin-bottom:12px">Financeiro, RH, configurações, integrações e administração continuam bloqueados nos celulares de campo.</div><div class="toolbar" style="justify-content:flex-end"><button class="btn primary" type="button" data-c360-save-permissions="${deviceId}">Salvar permissões</button></div></div>`;
 document.body.appendChild(modal);
}
async function savePermissions(deviceId){
 const d=adminDevices.get(deviceId);if(!d)return;
 const modal=document.getElementById('c360ControlModal');if(!modal)return;
 const next={...mergedPermissions(d.permissions)};
 modal.querySelectorAll('[data-c360-permission]').forEach(el=>{next[el.dataset.c360Permission]=!!el.checked});
 await rest('v2_device_access','id=eq.'+encodeURIComponent(deviceId),'PATCH',{permissions:next});
 d.permissions=next;window.__c360DevicePermissions=next;
 modal.remove();toast('Permissões atualizadas','O celular vai receber as novas regras automaticamente.');
 try{await loadTeams()}catch(_){}
}

async function issueCommand(deviceId,command,payload={}){
 const d=adminDevices.get(deviceId);if(!d)throw new Error('Aparelho não encontrado');
 await restInsert('v2_device_commands',{company_id:currentCompany(),device_access_id:deviceId,command,payload,status:'pending'});
}
async function setDeviceState(deviceId,state,message=null){
 await rest('v2_device_access','id=eq.'+encodeURIComponent(deviceId),'PATCH',{control_state:state,lost_mode:state==='lost',control_message:message});
 const d=adminDevices.get(deviceId);if(d){d.control_state=state;d.lost_mode=state==='lost';d.control_message=message}
}
async function adminAction(action,id){
 const d=adminDevices.get(id);if(!d)return;
 if(action==='permissions')return openPermissions(id);
 if(action==='map'){
   const btn=document.querySelector('[data-c360-device-action="map"][data-id="'+CSS.escape(id)+'"]');
   const lat=Number(btn?.dataset?.lat),lon=Number(btn?.dataset?.lon);
   if(Number.isFinite(lat)&&Number.isFinite(lon))window.open('https://www.google.com/maps?q='+encodeURIComponent(lat+','+lon),'_blank','noopener,noreferrer');
   return;
 }
 if(action==='ring'){await issueCommand(id,'ring',{repeat:true});toast('Alarme enviado','O aparelho tocará assim que receber o comando.');return}
 if(action==='locate'){await issueCommand(id,'locate_now',{});toast('Localização solicitada','O aparelho enviará uma nova posição assim que puder.');return}
 if(action==='lockapp'){await setDeviceState(id,'app_locked','Uso bloqueado pela administração.');await issueCommand(id,'lock_app',{});toast('Comando 360 bloqueado','O aparelho ficará preso na tela de bloqueio do sistema.','success');return}
 if(action==='lost'){
   const msg=prompt('Mensagem para aparecer no celular perdido:','Este aparelho pertence à empresa. Entre em contato com a administração.');
   if(msg===null)return;
   await setDeviceState(id,'lost',msg||'Este aparelho pertence à empresa. Entre em contato com a administração.');
   await issueCommand(id,'lost_mode_on',{message:msg||''});await issueCommand(id,'locate_now',{});await issueCommand(id,'ring',{repeat:true});
   toast('Modo perdido ativado','Bloqueio do app, localização e alarme foram solicitados.');return;
 }
 if(action==='unlock'){await setDeviceState(id,'active',null);await issueCommand(id,'stop_ring',{});await issueCommand(id,'unlock_app',{});toast('Aparelho liberado','O Comando 360 voltou ao modo normal.');return}
 if(action==='lockdevice'){
   if(!d.device_info?.native_managed){toast('Android gerenciado necessário','Este celular ainda não está preparado para bloqueio total do sistema.','warn');return}
   await issueCommand(id,'lock_device',{});toast('Bloqueio do celular solicitado','O Android gerenciado receberá o comando.');return;
 }
}

function showLockOverlay(control){
 const state=control?.control_state||'active';
 if(state==='active'&&!control?.lost_mode){document.getElementById('c360DeviceLockOverlay')?.remove();return}
 let ov=document.getElementById('c360DeviceLockOverlay');if(!ov){ov=document.createElement('div');ov.id='c360DeviceLockOverlay';document.body.appendChild(ov)}
 const lost=state==='lost'||control?.lost_mode;
 ov.innerHTML=`<div class="box"><div class="ico">${lost?'📍':'🔒'}</div><h2>${lost?'Modo perdido ativo':'Aparelho bloqueado'}</h2><p>${escapeHtml(control?.control_message||(lost?'Este aparelho foi marcado como perdido pela administração.':'O uso deste aparelho foi bloqueado pela administração.'))}</p><div class="muted" style="color:#94a3b8">Comando 360 • controle empresarial</div></div>`;
}

async function deviceControlRow(){
 const access=currentAccess();if(!access?.id)return null;
 try{
   const rows=await rest('v2_device_access','select=id,permissions,control_state,control_message,lost_mode,active&id=eq.'+encodeURIComponent(access.id)+'&limit=1');
   return rows?.[0]||null;
 }catch(e){console.warn('C360 control row',e);return null}
}
async function batteryInfo(){
 try{if(navigator.getBattery){const b=await navigator.getBattery();return {battery_percent:Math.round(b.level*100),charging:!!b.charging}}}catch(_){}
 return {battery_percent:null,charging:null};
}
function geolocationErrorText(e){
 const code=Number(e?.code||0);
 if(code===1)return 'Permissão de localização negada no Android/Chrome.';
 if(code===2)return 'O celular não conseguiu obter uma posição GPS.';
 if(code===3)return 'Tempo esgotado ao tentar obter a localização.';
 return String(e?.message||'Falha ao obter localização.');
}
async function reportLocationStatus(permission,error=''){
 const available=!!navigator.geolocation;
 const key=[permission,error,available].join('|');
 if(key===lastLocationStatusKey)return;
 lastLocationStatusKey=key;locationPermissionState=permission||'unknown';
 try{if(typeof rpc==='function')await rpc('v2_device_location_status',{p_permission:locationPermissionState,p_error:error||null,p_available:available})}catch(e){console.warn('C360 location status',e)}
}
function removeLocationPermissionCard(){document.getElementById('c360LocationPermissionCard')?.remove()}
function showLocationPermissionCard(permission,error=''){
 if(!isDeviceMode())return;
 if(permission==='granted'){removeLocationPermissionCard();return}
 let card=document.getElementById('c360LocationPermissionCard');
 if(!card){card=document.createElement('div');card.id='c360LocationPermissionCard';document.body.appendChild(card)}
 const denied=permission==='denied';
 card.innerHTML='<strong>📍 '+(denied?'Localização bloqueada':'Ativar rastreamento deste celular')+'</strong>'+
   '<p>'+(denied?'Abra as permissões do Chrome/Comando 360 no Android e permita Localização. Depois toque em TENTAR NOVAMENTE.':'O Comando 360 precisa da localização para o administrador enxergar onde está o celular da equipe.')+(error?'<br><b>'+escapeHtml(error)+'</b>':'')+'</p>'+
   '<div class="toolbar"><button class="btn primary" type="button" data-c360-enable-location>'+(denied?'TENTAR NOVAMENTE':'ATIVAR LOCALIZAÇÃO')+'</button></div>';
}
async function readLocationPermission(){
 if(!navigator.geolocation){await reportLocationStatus('unavailable','Geolocalização não disponível neste aparelho.');showLocationPermissionCard('unavailable');return 'unavailable'}
 try{
   if(navigator.permissions?.query){
     const p=await navigator.permissions.query({name:'geolocation'});
     const state=String(p.state||'unknown');
     await reportLocationStatus(state,'');
     showLocationPermissionCard(state);
     p.onchange=()=>{readLocationPermission().then(s=>{if(s==='granted')startLocationWatch()})};
     return state;
   }
 }catch(_){}
 await reportLocationStatus('unknown','');
 showLocationPermissionCard('unknown');
 return 'unknown';
}
async function persistPosition(pos){
 const access=currentAccess(),team=currentTeam();if(!access?.id)return false;
 try{
   const b=await batteryInfo(),c=pos.coords,recorded=nowIso();
   const payload={company_id:access.company_id,team_id:access.team_id||team?.id||null,device_access_id:access.id,latitude:Number(c.latitude),longitude:Number(c.longitude),accuracy_m:Number(c.accuracy||0)||null,speed_kmh:c.speed==null?null:Math.max(0,Number(c.speed)*3.6),heading_deg:c.heading==null?null:Number(c.heading),battery_percent:b.battery_percent,charging:b.charging,recorded_at:recorded};
   await restInsert('v2_device_location_history',payload);
   await restUpsert('v2_device_location_current',{...payload,updated_at:recorded},'device_access_id');
   lastLocationAt=Date.now();
   await reportLocationStatus('granted','');
   removeLocationPermissionCard();
   return true;
 }catch(e){console.warn('C360 persist location',e);return false}
}
async function reportLocation(force=false){
 const access=currentAccess();if(!access?.id||!navigator.geolocation){await reportLocationStatus('unavailable','Geolocalização não disponível neste aparelho.');return false}
 if(!force&&Date.now()-lastLocationAt<55000)return false;
 return await new Promise(resolve=>{
   navigator.geolocation.getCurrentPosition(async pos=>resolve(await persistPosition(pos)),async e=>{
     const msg=geolocationErrorText(e),permission=Number(e?.code||0)===1?'denied':locationPermissionState;
     console.warn('C360 geolocation',msg);await reportLocationStatus(permission||'unknown',msg);showLocationPermissionCard(permission||'unknown',msg);resolve(false);
   },{enableHighAccuracy:true,timeout:15000,maximumAge:20000});
 });
}
function startLocationWatch(){
 if(!isDeviceMode()||!navigator.geolocation||locationWatchId!=null)return;
 try{
   locationWatchId=navigator.geolocation.watchPosition(pos=>{
     if(Date.now()-lastLocationAt>=45000)persistPosition(pos).catch(()=>{});
   },async e=>{
     const msg=geolocationErrorText(e),permission=Number(e?.code||0)===1?'denied':locationPermissionState;
     await reportLocationStatus(permission||'unknown',msg);showLocationPermissionCard(permission||'unknown',msg);
   },{enableHighAccuracy:true,maximumAge:20000,timeout:20000});
 }catch(e){console.warn('C360 watch location',e)}
}
async function initializeLocationTracking(){
 if(!isDeviceMode())return;
 const state=await readLocationPermission();
 if(state==='granted'){
   startLocationWatch();
   await reportLocation(true);
   return;
 }
 if(state==='prompt'||state==='unknown'){
   // Tenta imediatamente. No Chrome/Android isso abre a permissão do sistema
   // sem depender do botão interno do Comando 360.
   const ok=await reportLocation(true);
   if(ok)startLocationWatch();
 }
}

function ringOverlay(){
 if(document.getElementById('c360RingOverlay'))return;
 const el=document.createElement('div');el.id='c360RingOverlay';el.innerHTML='<div><b>🔊 Localizar aparelho</b><div style="font-size:12px;opacity:.9">Alarme solicitado pela administração.</div></div><button class="btn soft" type="button" data-c360-stop-local-ring>Parar</button>';document.body.appendChild(el);
}
function beep(){
 try{
   ringCtx=ringCtx||new (window.AudioContext||window.webkitAudioContext)();
   if(ringCtx.state==='suspended')ringCtx.resume().catch(()=>{});
   const o=ringCtx.createOscillator(),g=ringCtx.createGain();o.frequency.value=980;g.gain.setValueAtTime(.9,ringCtx.currentTime);g.gain.exponentialRampToValueAtTime(.02,ringCtx.currentTime+.55);o.connect(g);g.connect(ringCtx.destination);o.start();o.stop(ringCtx.currentTime+.58);
 }catch(_){}
 try{navigator.vibrate?.([650,180,650,180,650])}catch(_){}
}
function startRing(){if(ringTimer)return;ringOverlay();beep();ringTimer=setInterval(beep,950)}
function stopRing(){if(ringTimer){clearInterval(ringTimer);ringTimer=null}try{navigator.vibrate?.(0)}catch(_){};document.getElementById('c360RingOverlay')?.remove()}

async function ackCommand(id,status,result={}){
 try{await rest('v2_device_commands','id=eq.'+encodeURIComponent(id),'PATCH',{status,result,delivered_at:nowIso(),acknowledged_at:nowIso()})}catch(e){console.warn('C360 ack command',e)}
}
async function executeCommand(cmd){
 try{
   if(cmd.command==='ring'){startRing();return ackCommand(cmd.id,'completed',{channel:'web_app'})}
   if(cmd.command==='stop_ring'){stopRing();return ackCommand(cmd.id,'completed',{})}
   if(cmd.command==='locate_now'){const ok=await reportLocation(true);return ackCommand(cmd.id,ok?'completed':'failed',{location_sent:ok})}
   if(cmd.command==='lost_mode_on'){startRing();await reportLocation(true);return ackCommand(cmd.id,'completed',{web_lock:true})}
   if(cmd.command==='lost_mode_off'||cmd.command==='unlock_app'){stopRing();return ackCommand(cmd.id,'completed',{})}
   if(cmd.command==='lock_app')return ackCommand(cmd.id,'completed',{web_lock:true});
   if(cmd.command==='lock_device'){
     if(window.Comando360Native?.lockDevice){await window.Comando360Native.lockDevice();return ackCommand(cmd.id,'completed',{native:true})}
     return ackCommand(cmd.id,'failed',{reason:'android_managed_client_required'});
   }
 }catch(e){return ackCommand(cmd.id,'failed',{error:String(e?.message||e)})}
}
async function pollDevice(){
 if(polling||!isDeviceMode())return;const access=currentAccess();if(!access?.id)return;
 polling=true;
 try{
   const control=await deviceControlRow();
   if(control){window.__c360DevicePermissions=mergedPermissions(control.permissions);showLockOverlay(control);document.dispatchEvent(new CustomEvent('c360:device-permissions',{detail:window.__c360DevicePermissions}))}
   const q='select=id,command,payload,status,created_at,expires_at&device_access_id=eq.'+encodeURIComponent(access.id)+'&status=in.(pending,delivered)&expires_at=gt.'+encodeURIComponent(nowIso())+'&order=created_at.asc&limit=20';
   const commands=await rest('v2_device_commands',q);
   for(const cmd of commands||[])await executeCommand(cmd);
   await reportLocation(false);
 }catch(e){console.warn('C360 device poll',e)}finally{polling=false}
}

function installAdminHook(){
 const old=window.renderTeamDevices;if(typeof old!=='function'||old.__c360DeviceControlWrapped)return;
 const next=function(devices,teams){const out=old.apply(this,arguments);setTimeout(decorateAdminCards,0);return out};next.__c360DeviceControlWrapped=true;window.renderTeamDevices=next;
 setTimeout(decorateAdminCards,300);
}

document.addEventListener('click',async e=>{
 const action=e.target.closest('[data-c360-device-action]');if(action){e.preventDefault();try{await adminAction(action.dataset.c360DeviceAction,action.dataset.id);setTimeout(decorateAdminCards,150)}catch(err){alert('Não foi possível concluir: '+(err?.message||err))}return}
 const close=e.target.closest('[data-c360-close-modal]');if(close){document.getElementById('c360ControlModal')?.remove();return}
 const save=e.target.closest('[data-c360-save-permissions]');if(save){try{await savePermissions(save.dataset.c360SavePermissions)}catch(err){alert('Não foi possível salvar as permissões: '+(err?.message||err))}return}
 if(e.target.closest('[data-c360-stop-local-ring]')){stopRing();return}
 if(e.target.closest('[data-c360-enable-location]')){e.preventDefault();const ok=await reportLocation(true);if(ok){startLocationWatch();toast('Localização ativada','Este celular já está enviando a posição para o Comando 360.','success')}return}
});

document.addEventListener('c360:bootstrap-ready',()=>{installAdminHook();pollDevice();setTimeout(initializeLocationTracking,600)});
document.addEventListener('c360:device-activated',()=>setTimeout(()=>{pollDevice();initializeLocationTracking()},400));
document.addEventListener('visibilitychange',()=>{if(!document.hidden){pollDevice();initializeLocationTracking()}});
window.addEventListener('online',()=>{pollDevice();initializeLocationTracking()});
injectStyles();installAdminHook();setInterval(pollDevice,15000);setInterval(()=>{if(!isDeviceMode())decorateAdminCards()},30000);setTimeout(()=>{pollDevice();initializeLocationTracking()},1200);
window.C360DeviceControl={version:VERSION,defaults:DEFAULT_PERMISSIONS,permissions:mergedPermissions,startRing,stopRing,reportLocation,initializeLocationTracking,decorateAdminCards};
})();