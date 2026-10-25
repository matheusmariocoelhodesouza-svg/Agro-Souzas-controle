(()=>{
'use strict';
const controllers=new WeakMap();
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labels={finding:'Achado relatado',disassembly:'Desmontagem',work_done:'Trabalho relatado',part:'Peça mencionada',measurement:'Medição relatada',test_result:'Resultado relatado',hypothesis:'Hipótese',plan:'Planejado',note:'Anotação',attachment:'Anexos'};
const style=document.createElement('style');style.textContent=`.ai360-workshop{border:1px solid #cbdcec;border-radius:14px;padding:12px;margin:10px 0;background:#f5f9fd;color:#12324e}.ai360-workshop-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}.ai360-workshop-head strong{display:block;font-size:14px}.ai360-workshop small{display:block;font-size:12px;line-height:1.5;color:#536b82}.ai360-workshop .ai360-workshop-active{color:#176340;font-weight:700}.ai360-workshop-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}.ai360-workshop button{min-height:40px}.ai360-workshop-form{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px}.ai360-workshop-form label{display:grid;gap:5px;font-size:12px;font-weight:700}.ai360-workshop select,.ai360-workshop input,.ai360-workshop textarea{box-sizing:border-box;width:100%;min-height:44px;min-width:0;border:1px solid #cbd5e1;border-radius:9px;padding:9px;color:#102a4c;background:#fff;font:inherit}.ai360-workshop-form .wide{grid-column:1/-1}.ai360-workshop-log{display:grid;gap:8px;margin-top:12px;max-height:48dvh;overflow:auto}.ai360-workshop-entry{background:#fff;border:1px solid #dce5ee;border-radius:10px;padding:10px;overflow-wrap:anywhere}.ai360-workshop-entry b{font-size:12px}.ai360-workshop-entry p{margin:6px 0;white-space:pre-wrap;font-size:13px;line-height:1.5}.ai360-workshop-entry q{display:block;color:#65778a;font-size:11px;white-space:pre-wrap}.ai360-journal-receipt{display:block;margin-top:7px;font-size:11px;color:#18734b}.ai360-workshop-finish{display:grid;gap:8px;margin-top:12px}.ai360-workshop-finish textarea{min-height:85px}.ai360-workshop .btn{border:1px solid #bacde0;border-radius:9px;padding:8px 10px;background:#fff;color:#14395d;cursor:pointer;font-size:12px}.ai360-workshop .btn.primary{background:#164d7d;color:#fff}.ai360-workshop [hidden]{display:none!important}@media(max-width:640px){.ai360-workshop-form{grid-template-columns:1fr}.ai360-workshop-head{gap:7px}.ai360-workshop{padding:10px}.ai360-workshop-actions .btn{flex:1;white-space:nowrap}}`;
document.head.appendChild(style);
function requestId(){if(crypto.randomUUID)return crypto.randomUUID();const bytes=crypto.getRandomValues(new Uint8Array(16));bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;const h=[...bytes].map(b=>b.toString(16).padStart(2,'0')).join('');return [h.slice(0,8),h.slice(8,12),h.slice(12,16),h.slice(16,20),h.slice(20)].join('-')}
window.C360WorkshopChat={mount(root,api){
 if(controllers.has(root))return controllers.get(root);
 const host=document.createElement('section');host.className='ai360-workshop';host.setAttribute('aria-label','Acompanhamento do serviço');
 const chat=root.querySelector('#chatbox,#aiThread,.ai-thread');if(chat)chat.insertAdjacentElement('beforebegin',host);else root.appendChild(host);
 const S={workshop:null,options:null,form:false,diary:false,finish:false,pendingStart:null};
 const $=s=>host.querySelector(s);
 function safe(){return {epoch:api.epoch(),company:api.company()}}
 function current(token){return token.epoch===api.epoch()&&token.company===api.company()}
 async function options(){
  const token=safe();api.setBusy(true,'Abrindo…');
  try{const data=await api.request({mode:'workshop_options',company_id:token.company});if(!current(token))return;S.options=data;if(!data.can_start){api.notify('Sua conta precisa de permissão para acompanhar serviços.');return}S.form=true;S.finish=false;render()}
  catch(e){if(current(token))api.notify(e.message||'Não consegui abrir os serviços.')}
  finally{if(current(token))api.setBusy(false)}
 }
 function fillOrders(){
  const vehicle=$('.ai360-workshop-vehicle')?.value,select=$('.ai360-workshop-order');if(!select)return;
  const orders=(S.options?.orders||[]).filter(o=>o.vehicle_id===vehicle);
  select.replaceChildren(new Option('Abrir novo serviço',''));
  orders.forEach(o=>select.add(new Option(`OS #${o.work_order_number} — ${o.title}`,o.id)));
  const previous=S.workshop?.vehicle_id===vehicle?S.workshop.work_order_id:null;
  select.value=orders.find(o=>o.id===previous)?.id||(orders.length===1?orders[0].id:'');
  const title=$('.ai360-workshop-title');if(title)title.closest('label').hidden=!!select.value;
 }
 async function start(){
  if(api.busy())return;
  const vehicle=$('.ai360-workshop-vehicle')?.value,order=$('.ai360-workshop-order')?.value||null,title=$('.ai360-workshop-title')?.value.trim()||'Serviço em andamento';
  if(!vehicle){api.notify('Escolha a condução para acompanhar o serviço.');return}
  const signature=[vehicle,order,title,api.conversation()].join('|');if(S.pendingStart?.signature!==signature)S.pendingStart={signature,id:requestId()};
  const token=safe();api.setBusy(true,'Iniciando…');
  try{const data=await api.request({mode:'workshop_start',company_id:token.company,vehicle_id:vehicle,work_order_id:order,title,conversation_id:S.workshop?.vehicle_id&&S.workshop.vehicle_id!==vehicle?null:api.conversation(),client_request_id:S.pendingStart.id});
   if(!current(token))return;api.setConversation(data.conversation_id,`${data.workshop.vehicle_name} — ${data.workshop.title}`);api.setWorkshop(data.workshop);S.form=false;S.pendingStart=null;render();api.addMessage(data.message||'Pode me contar o que está fazendo.');
  }catch(e){if(current(token))api.notify(e.message||'Não consegui iniciar o serviço.')}
  finally{if(current(token))api.setBusy(false)}
 }
 async function control(operation){
  if(api.busy())return;const result=operation==='finish'?$('.ai360-workshop-result')?.value.trim():null;
  if(operation==='finish'&&!result){api.notify('Conte o resultado do serviço antes de concluir.');$('.ai360-workshop-result')?.focus();return}
  const token=safe();api.setBusy(true,operation==='finish'?'Concluindo…':'Pausando…');
  try{const data=await api.request({mode:'workshop_control',company_id:token.company,conversation_id:api.conversation(),operation,result});if(!current(token))return;S.finish=false;api.setWorkshop(data.workshop);render();api.addMessage(data.message);document.dispatchEvent(new CustomEvent('c360:workshop-journal-updated',{detail:{workshop:data.workshop}}))}
  catch(e){if(current(token))api.notify(e.message||'Não consegui atualizar o serviço.')}
  finally{if(current(token))api.setBusy(false)}
 }
 async function diary(){
  if(api.busy()||!api.conversation())return;const token=safe();api.setBusy(true,'Abrindo diário…');
  try{const data=await api.request({mode:'workshop_timeline',company_id:token.company,conversation_id:api.conversation()});if(!current(token))return;api.setWorkshop(data.workshop);S.diary=true;render()}
  catch(e){if(current(token))api.notify(e.message||'Não consegui recuperar o diário.')}
  finally{if(current(token))api.setBusy(false)}
 }
 function render(){
  const w=S.workshop;
  host.innerHTML=`<div class="ai360-workshop-head"><div><strong>${w?`${esc(w.vehicle_name)} • OS #${esc(w.work_order_number)}`:'Converse enquanto faz o serviço'}</strong><small class="${w?.active?'ai360-workshop-active':''}">${w?`${esc(w.title)} • ${w.active?'relatos sendo registrados':'acompanhamento pausado ou encerrado'}`:'Vincule o ônibus e a OS uma vez para registrar o andamento.'}</small></div><button class="btn ai360-workshop-open" type="button">${w?.active?'Trocar serviço':'Acompanhar serviço'}</button></div>${w?`<div class="ai360-workshop-actions"><button class="btn ai360-workshop-diary" type="button">${S.diary?'Fechar diário':'Ver diário'}</button><button class="btn ai360-workshop-summary" type="button">Resumo</button>${w.active?'<button class="btn ai360-workshop-pause" type="button">Pausar</button><button class="btn ai360-workshop-complete" type="button">Concluir serviço</button>':''}</div>`:''}`;
  $('.ai360-workshop-open').onclick=()=>{if(!api.busy())options()};
  $('.ai360-workshop-diary')?.addEventListener('click',()=>{if(S.diary){S.diary=false;render()}else diary()});
  $('.ai360-workshop-summary')?.addEventListener('click',()=>api.draft('Resuma o que já fiz neste serviço, as peças citadas, as hipóteses e o que ainda falta conferir.'));
  $('.ai360-workshop-pause')?.addEventListener('click',()=>control('pause'));
  $('.ai360-workshop-complete')?.addEventListener('click',()=>{S.finish=!S.finish;S.form=false;render();$('.ai360-workshop-result')?.focus()});
  if(S.form&&S.options){
   const form=document.createElement('div');form.className='ai360-workshop-form';form.innerHTML='<label>Condução<select class="ai360-workshop-vehicle" aria-label="Condução do serviço"></select></label><label>Serviço<select class="ai360-workshop-order" aria-label="Ordem de serviço"></select></label><label class="wide">O que está fazendo? <input class="ai360-workshop-title" maxlength="180" placeholder="Ex.: reparo no motor"></label><small class="wide">Após iniciar, seus relatos e anexos ficam no diário desta OS. As sugestões da IA não contam como trabalho realizado.</small><div class="wide"><button class="btn primary ai360-workshop-start" type="button">Iniciar acompanhamento</button> <button class="btn ai360-workshop-cancel" type="button">Cancelar</button></div>';
   host.appendChild(form);const select=$('.ai360-workshop-vehicle');(S.options.vehicles||[]).filter(v=>!api.vehicleFocus()||v.id===api.vehicleFocus()).forEach(v=>select.add(new Option(`${v.description}${v.plate?' • '+v.plate:''}`,v.id)));
   const focus=api.vehicleFocus()||w?.vehicle_id;if(focus&&(S.options.vehicles||[]).some(v=>v.id===focus))select.value=focus;
   select.onchange=fillOrders;fillOrders();$('.ai360-workshop-order').onchange=()=>{$('.ai360-workshop-title').closest('label').hidden=!!$('.ai360-workshop-order').value};$('.ai360-workshop-start').onclick=start;$('.ai360-workshop-cancel').onclick=()=>{S.form=false;render()};
  }
  if(S.finish){const box=document.createElement('div');box.className='ai360-workshop-finish';box.innerHTML='<label>Como terminou o serviço?<textarea class="ai360-workshop-result" aria-label="Resultado do serviço" maxlength="4000" placeholder="Relate o que foi feito e o resultado que você conferiu."></textarea></label><small>A conclusão muda o status da OS. Gastos, estoque e diagnóstico não serão alterados.</small><div><button class="btn primary ai360-workshop-finish-save" type="button">Confirmar conclusão</button> <button class="btn ai360-workshop-finish-cancel" type="button">Continuar trabalhando</button></div>';host.appendChild(box);$('.ai360-workshop-finish-save').onclick=()=>control('finish');$('.ai360-workshop-finish-cancel').onclick=()=>{S.finish=false;render()}}
  if(S.diary&&w){
   const log=document.createElement('div');log.className='ai360-workshop-log';log.setAttribute('aria-label','Diário do serviço');
   if(!w.timeline?.length)log.textContent='Ainda não há etapas anotadas. Os relatos aparecem aqui depois de enviados na conversa.';
   if(w.has_more){const note=document.createElement('small');note.textContent='Mostrando as 200 anotações mais recentes. As anteriores continuam preservadas no histórico.';log.appendChild(note)}
   (w.timeline||[]).forEach(e=>{const row=document.createElement('article');row.className='ai360-workshop-entry';row.innerHTML=`<b>${esc(labels[e.kind]||'Anotação')} • ${esc(new Date(e.recorded_at).toLocaleString('pt-BR'))}</b><p>${esc(e.description)}</p>${e.source_quote?`<q>${esc(e.source_quote)}</q>`:''}`;api.attachments(row,e.attachments||[]);log.appendChild(row)});host.appendChild(log);
  }
 }
 const controller={hydrate(workshop){S.workshop=workshop||null;S.form=false;S.finish=false;S.diary=false;render()},reset(){S.workshop=null;S.options=null;S.form=false;S.finish=false;S.diary=false;S.pendingStart=null;render()},receipt(message,workshop){if(!message||!(workshop?.entries_written>0))return;const note=document.createElement('small');note.className='ai360-journal-receipt';note.textContent=`✓ ${workshop.entries_written} anotação(ões) registrada(s) na OS #${workshop.work_order_number}`;message.appendChild(note)}};
 controllers.set(root,controller);render();return controller;
}};
document.dispatchEvent(new CustomEvent('c360:workshop-chat-ready'));
})();
