(()=>{
'use strict';
if(window.C360_OPERATIONAL_HARDENING_VERSION)return;
const VERSION='2026.10.01-r1';
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const num=v=>Number(String(v??'').replace(/\./g,'').replace(',','.'));
const q=s=>document.querySelector(s);
function toast(title,msg){
 if(typeof window.c360Toast==='function')return window.c360Toast(title,msg,'warning');
 alert(title+'\n\n'+msg);
}
function fuelGuard(e){
 const b=e.target?.closest?.('#saveFuel,[data-action="save-fuel"],[data-c360-save="fuel"]');if(!b)return;
 const km=q('#fuelKm,#fuelOdometer,[name="odometer_km"]'),lit=q('#fuelLiters,[name="liters"]'),tot=q('#fuelTotal,[name="total_value"]'),veh=q('#fuelVehicle,[name="vehicle_id"]');
 if(!km&&!lit)return;
 const k=num(km?.value),l=num(lit?.value),t=num(tot?.value);
 const errors=[];
 if(!veh?.value)errors.push('Selecione a condução.');
 if(!Number.isFinite(k)||k<=0)errors.push('Hodômetro inválido.');
 if(!Number.isFinite(l)||l<=0||l>1000)errors.push('Litros fora do intervalo esperado (0–1.000 L).');
 if(tot&&(!Number.isFinite(t)||t<=0))errors.push('Valor total inválido.');
 if(Number.isFinite(l)&&l>0&&Number.isFinite(t)&&t>0){const p=t/l;if(p<2||p>15)errors.push('Preço por litro fora do intervalo de segurança (R$ 2–15/L).');}
 if(errors.length){e.preventDefault();e.stopImmediatePropagation();toast('Confira o abastecimento',errors.join('\n'));return false}
 const sig=[veh?.value,k,l,t].join('|'),now=Date.now(),last=window.__c360FuelSubmit;
 if(last&&last.sig===sig&&now-last.at<15000){e.preventDefault();e.stopImmediatePropagation();toast('Lançamento já enviado','A mesma informação foi enviada há poucos segundos. Aguarde a confirmação para evitar duplicidade.');return false}
 window.__c360FuelSubmit={sig,at:now};
}
document.addEventListener('click',fuelGuard,true);

function installSubmitLocks(){
 document.addEventListener('click',e=>{
  const b=e.target?.closest?.('button');if(!b||b.disabled)return;
  const text=norm(b.textContent);
  if(!/(salvar|registrar|confirmar|concluir|enviar)/.test(text))return;
  const key='c360_lock_'+(b.id||b.dataset.action||text.slice(0,30));
  const now=Date.now(),last=Number(sessionStorage.getItem(key)||0);
  if(last&&now-last<1200){e.preventDefault();e.stopImmediatePropagation();return}
  sessionStorage.setItem(key,String(now));
 },true);
}

function pendingCount(){
 let n=0;
 try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i)||'';if(/c360.*(queue|pending|offline)/i.test(k)){const v=JSON.parse(localStorage.getItem(k)||'null');if(Array.isArray(v))n+=v.length;else if(v&&typeof v==='object')n+=Number(v.pending_count||0)}}}catch(_){}
 return n;
}
function healthState(){
 const online=navigator.onLine!==false,pending=pendingCount();
 const session=(()=>{try{return JSON.parse(localStorage.getItem('controla_beta_session')||'null')}catch{return null}})();
 return {online,pending,session:!!session?.access_token,last:new Date().toISOString()};
}
function renderHealth(){
 if(document.body?.classList.contains('device-mode'))return;
 let box=q('#c360OperationalHealth');if(!box){box=document.createElement('div');box.id='c360OperationalHealth';box.style.cssText='position:fixed;right:16px;bottom:76px;z-index:9997;background:#111827;color:#fff;border:1px solid #374151;border-radius:14px;padding:10px 12px;box-shadow:0 12px 30px #0005;font:12px system-ui;max-width:280px';document.body.appendChild(box)}
 const s=healthState(),ok=s.online&&s.pending===0;
 box.innerHTML='<b>'+(ok?'🟢':'🟡')+' Saúde da operação</b><div style="margin-top:5px">Internet: '+(s.online?'online':'offline')+' • Pendentes: '+s.pending+'</div><small style="opacity:.75">Atualizado '+new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})+'</small>';
 box.title='Indicador local. A homologação completa depende dos testes físicos de ponto, Bluetooth e uso simultâneo.';
}
window.addEventListener('online',renderHealth);window.addEventListener('offline',renderHealth);
document.addEventListener('c360:bootstrap-ready',renderHealth);
setInterval(renderHealth,30000);

function markAssistantConfirmation(){
 const root=q('#assistant360,#c360Assistant360,[data-c360-assistant]');if(!root)return;
 root.querySelectorAll('button').forEach(b=>{const t=norm(b.textContent);if(/(salvar|registrar|lançar|lancar)/.test(t)&&!b.dataset.c360Confirm){b.dataset.c360Confirm='1';b.title='Confira os dados extraídos antes de gravar.'}});
}
const obs=new MutationObserver(()=>{markAssistantConfirmation();renderHealth()});
function init(){installSubmitLocks();markAssistantConfirmation();renderHealth();obs.observe(document.body,{childList:true,subtree:true});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.C360_OPERATIONAL_HARDENING_VERSION=VERSION;
window.C360OperationalHardening={version:VERSION,health:healthState,refresh:renderHealth};
})();