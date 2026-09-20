(()=>{
'use strict';
const VERSION='2026.09.19-native-admin1';
let busy=false;

function isDeviceMode(){try{return !!deviceMode}catch(_){return document.body?.classList.contains('device-mode')||false}}
function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function toast(title,msg,type='success'){
 try{if(typeof c360Toast==='function')return c360Toast(title,msg,type)}catch(_){}
 console.log(title,msg);
}
function closeModal(){document.getElementById('c360NativeTrackerModal')?.remove()}
function formatExpiry(v){
 try{return new Date(v).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}catch(_){return String(v||'')}
}
function showCode(code,expiresAt,deviceId){
 closeModal();
 const modal=document.createElement('div');
 modal.id='c360NativeTrackerModal';
 modal.style.cssText='position:fixed;inset:0;z-index:22000;background:rgba(2,8,23,.68);display:grid;place-items:center;padding:16px';
 modal.innerHTML=`<div style="width:min(520px,100%);background:#fff;color:#172033;border-radius:20px;padding:20px;box-shadow:0 28px 80px rgba(0,0,0,.36)">
  <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start"><div><div style="font-size:11px;font-weight:900;letter-spacing:.8px;color:#64748b">RASTREADOR ANDROID 24H</div><h3 style="margin:5px 0 4px">Código de ativação</h3><div style="font-size:12px;color:#64748b">Use este código no aplicativo Rastreador Comando 360 deste celular.</div></div><button type="button" data-c360-native-close style="border:0;background:#e2e8f0;border-radius:10px;padding:8px 10px;font-weight:800;cursor:pointer">Fechar</button></div>
  <div style="margin:18px 0 10px;border:2px dashed #1976d2;border-radius:16px;padding:18px;text-align:center;background:#eff6ff"><div data-c360-native-code style="font:900 30px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:4px;color:#0f3d78">${esc(code)}</div><div style="font-size:11px;color:#5c7189;margin-top:8px">Válido até ${esc(formatExpiry(expiresAt))}</div></div>
  <div style="font-size:12px;line-height:1.55;color:#475569">1. Instale/abra o <b>Rastreador Comando 360</b> no aparelho da equipe.<br>2. Digite o código acima.<br>3. Autorize localização em segundo plano e bateria sem restrição.<br>4. Depois do primeiro envio, o painel passa a mostrar posição e heartbeat mesmo com o PWA fechado.</div>
  <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px"><button type="button" data-c360-native-copy class="btn soft">Copiar código</button><button type="button" data-c360-native-new="${esc(deviceId)}" class="btn primary">Gerar outro código</button></div>
 </div>`;
 document.body.appendChild(modal);
 modal.querySelector('[data-c360-native-close]')?.addEventListener('click',closeModal);
 modal.addEventListener('click',e=>{if(e.target===modal)closeModal()});
 modal.querySelector('[data-c360-native-copy]')?.addEventListener('click',async()=>{
  try{await navigator.clipboard.writeText(code);toast('Código copiado','Cole no Rastreador Comando 360.')}catch(_){toast('Código','Código: '+code,'warn')}
 });
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
function decorate(){
 if(isDeviceMode())return;
 document.querySelectorAll('[data-c360-device-controls]').forEach(box=>{
  if(box.querySelector('[data-c360-native-pair]'))return;
  const id=box.dataset.c360DeviceControls;
  if(!id)return;
  const actions=box.querySelector('.c360-device-actions')||box;
  const btn=document.createElement('button');
  btn.type='button';btn.className='btn soft';btn.dataset.c360NativePair=id;
  btn.textContent='📡 Rastreador 24h';
  btn.title='Gerar código para o rastreador Android que continua funcionando com o PWA fechado';
  btn.addEventListener('click',()=>generateCode(id));
  actions.appendChild(btn);
 });
}
function init(){
 if(isDeviceMode())return;
 decorate();
 const obs=new MutationObserver(decorate);
 obs.observe(document.documentElement,{subtree:true,childList:true});
 setInterval(decorate,5000);
 window.C360NativeTrackerAdmin={version:VERSION,generateCode};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
