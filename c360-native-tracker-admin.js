(()=>{
'use strict';
const VERSION='2026.09.19-native-admin2';
let busy=false;
let loading=false;

function isDeviceMode(){try{return !!deviceMode}catch(_){return document.body?.classList.contains('device-mode')||false}}
function currentCompany(){try{return companyId||null}catch(_){return null}}
function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function toast(title,msg,type='success'){
 try{if(typeof c360Toast==='function')return c360Toast(title,msg,type)}catch(_){}
 console.log(title,msg);
}
function closeModal(){document.getElementById('c360NativeTrackerModal')?.remove()}
function formatExpiry(v){try{return new Date(v).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}catch(_){return String(v||'')}}
function ensureStyle(){
 if(document.getElementById('c360NativeTrackerAdminStyle'))return;
 const s=document.createElement('style');s.id='c360NativeTrackerAdminStyle';
 s.textContent=`
 #c360NativeTrackerQuick{position:fixed;right:14px;bottom:76px;z-index:9500;border:0;border-radius:999px;background:#0f2747;color:#fff;padding:10px 14px;font:800 12px system-ui;box-shadow:0 12px 30px rgba(15,39,71,.28);cursor:pointer}
 #c360NativeTrackerQuick:hover{transform:translateY(-1px)}
 .c360-native-modal{position:fixed;inset:0;z-index:22000;background:rgba(2,8,23,.68);display:grid;place-items:center;padding:16px}
 .c360-native-box{width:min(650px,100%);max-height:88vh;overflow:auto;background:#fff;color:#172033;border-radius:20px;padding:20px;box-shadow:0 28px 80px rgba(0,0,0,.36)}
 .c360-native-device{border:1px solid #e2e8f0;border-radius:14px;padding:12px;margin-top:9px;display:flex;justify-content:space-between;gap:12px;align-items:center}
 .c360-native-device b{display:block}.c360-native-device small{color:#64748b}.c360-native-ok{color:#15803d;font-weight:900}.c360-native-warn{color:#9a6700;font-weight:900}
 @media(max-width:640px){#c360NativeTrackerQuick{right:10px;bottom:72px}.c360-native-device{align-items:flex-start;flex-direction:column}.c360-native-device button{width:100%}}
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
  <div style="font-size:12px;line-height:1.55;color:#475569">1. Instale/abra o <b>Rastreador Comando 360</b> no aparelho da equipe.<br>2. Digite o código acima.<br>3. Autorize localização em segundo plano e bateria sem restrição.<br>4. Depois do primeiro envio, o painel passa a mostrar posição e heartbeat mesmo com o PWA fechado.</div>
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
async function loadDevices(){
 if(loading)return;loading=true;
 try{
  const cid=currentCompany();
  if(!cid||typeof rest!=='function')throw new Error('A empresa ainda não foi carregada.');
  const [devices,teams]=await Promise.all([
   rest('v2_device_access','select=id,team_id,device_name,device_info,native_user_id,active,last_seen_at&company_id=eq.'+encodeURIComponent(cid)+'&active=eq.true&order=paired_at.desc'),
   rest('v2_teams','select=id,name,code&company_id=eq.'+encodeURIComponent(cid)+'&status=eq.active')
  ]);
  const tm=new Map((teams||[]).map(t=>[t.id,t.name||t.code||'Equipe']));
  const rows=(devices||[]).map(d=>{
   const native=!!d.native_user_id||!!d.device_info?.native_tracker;
   const service=!!d.device_info?.native_service_running||!!d.device_info?.service_running;
   const status=native?(service?'<span class="c360-native-ok">● RASTREADOR ATIVO</span>':'<span class="c360-native-warn">● PAREADO / AGUARDANDO SERVIÇO</span>'):'<span class="c360-native-warn">● AINDA NÃO PAREADO</span>';
   return `<div class="c360-native-device"><div><b>${esc(tm.get(d.team_id)||'Equipe')} — ${esc(d.device_name||'Celular')}</b><small>${status}</small></div><button type="button" class="btn ${native?'soft':'primary'}" data-c360-native-device="${esc(d.id)}">${native?'Gerar novo código':'Ativar rastreador 24h'}</button></div>`;
  }).join('')||'<div style="padding:18px;color:#64748b">Nenhum celular de equipe ativo foi encontrado.</div>';
  const modal=baseModal(`<div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start"><div><div style="font-size:11px;font-weight:900;color:#64748b;letter-spacing:.7px">COMANDO 360</div><h3 style="margin:4px 0">Rastreadores 24h</h3><div style="font-size:12px;color:#64748b">Ative o módulo Android nos celulares que precisam continuar enviando localização com o PWA fechado.</div></div><button type="button" data-c360-native-close class="btn soft">Fechar</button></div><div style="margin-top:12px">${rows}</div>`);
  modal.querySelectorAll('[data-c360-native-device]').forEach(btn=>btn.addEventListener('click',()=>generateCode(btn.dataset.c360NativeDevice)));
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
 if(!btn){btn=document.createElement('button');btn.id='c360NativeTrackerQuick';btn.type='button';btn.textContent='📡 Rastreador 24h';btn.addEventListener('click',loadDevices);document.body.appendChild(btn)}
 decorateExistingCards();
}
function init(){
 if(isDeviceMode())return;
 ensureQuickButton();
 const obs=new MutationObserver(ensureQuickButton);obs.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
 setInterval(ensureQuickButton,4000);
 window.C360NativeTrackerAdmin={version:VERSION,generateCode,open:loadDevices};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
