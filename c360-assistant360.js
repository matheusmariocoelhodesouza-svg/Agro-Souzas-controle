(()=>{
'use strict';
const VERSION='2026.10.25-professional-chat-7';
if(window.__c360Assistant360Version===VERSION)return;
window.__c360Assistant360Version=VERSION;

const style=document.createElement('style');style.id='c360-assistant360-style';style.textContent=`
.assistant360-ready .chatbox,.assistant360-ready .ai-thread{min-height:360px;max-height:58vh;overflow:auto}.ai360-shell-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap}.ai360-brand{display:flex;align-items:center;gap:10px}.ai360-brand-mark{width:42px;height:42px;border-radius:13px;background:#102a4c;color:#fff;display:grid;place-items:center;font-weight:950;font-size:18px}.ai360-brand-copy h3{margin:0}.ai360-brand-copy p{margin:3px 0 0;color:#64748b;font-size:12px}.ai360-capabilities{display:flex;gap:6px;flex-wrap:wrap;margin:10px 0}.ai360-capabilities span{font-size:10px;font-weight:850;padding:5px 8px;border-radius:999px;background:#eef4fb;color:#31516f}.ai360-tools{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:10px 0}.ai360-tools-hint{font-size:11px;color:#64748b;flex:1;min-width:220px}.ai360-tool.recording{background:#fee2e2!important;color:#991b1b!important;border-color:#fecaca!important}.ai360-attachment{margin:8px 0 10px}.ai360-thumb-wrap{display:flex;align-items:center;gap:10px;padding:9px;border:1px solid #dbe4ef;background:#f8fafc;border-radius:13px}.ai360-thumb{width:58px;height:58px;border-radius:10px;object-fit:cover;background:#e2e8f0}.ai360-thumb-wrap>div{min-width:0;flex:1}.ai360-thumb-wrap b{font-size:12px;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ai360-thumb-wrap small,.ai360-msgmeta{display:block;color:#64748b;font-size:10px;margin-top:3px}.ai360-remove{border:0;background:#e2e8f0;border-radius:999px;width:30px;height:30px;font-size:20px;cursor:pointer}.ai360-actions{display:grid;gap:10px;margin:12px 0}.ai360-action-card{border:1px solid #dce6f2;border-radius:16px;padding:14px;background:#fff;box-shadow:0 5px 18px rgba(15,23,42,.05)}.ai360-action-card.saved{border-color:#bbf7d0;background:#f8fff9}.ai360-action-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.ai360-action-head>div{display:grid;gap:4px}.ai360-action-kind{font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.6px;color:#1976d2}.ai360-action-head strong{font-size:14px}.ai360-confidence{font-size:11px;font-weight:900;padding:5px 8px;border-radius:999px;background:#eef5ff;color:#1859a8}.ai360-review-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin:12px 0}.ai360-review-grid>div{padding:9px 10px;border:1px solid #edf1f6;border-radius:11px;background:#f8fafc;min-width:0}.ai360-review-grid span{display:block;color:#64748b;font-size:10px}.ai360-review-grid b{display:block;margin-top:2px;font-size:12px;overflow-wrap:anywhere}.ai360-ready,.ai360-missing{font-size:11px;font-weight:800;padding:8px 10px;border-radius:10px;margin-top:6px}.ai360-ready{background:#ecfdf3;color:#166534}.ai360-missing{background:#fff7ed;color:#9a3412}.ai360-action-buttons{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.ai360-action-buttons button:disabled{opacity:.5;cursor:not-allowed}.ai360-saved{font-size:12px;font-weight:900;color:#166534;padding:8px 0}@media(max-width:640px){.ai360-tools{display:grid;grid-template-columns:1fr 1fr}.ai360-tools-hint{grid-column:1/-1;min-width:0}.ai360-review-grid{grid-template-columns:1fr}.ai360-action-buttons{display:grid;grid-template-columns:1fr}.ai360-action-buttons button{width:100%}}
.ai360-thumb-wrap{color:#0f172a}.ai360-remove{flex:none;min-width:40px;min-height:40px}.ai360-attachment-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;font-size:12px}.ai360-attachment-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;max-height:280px;overflow:auto}.ai360-clear{border:0;border-radius:8px;padding:7px 10px;cursor:pointer}.ai360-remove:disabled,.ai360-clear:disabled{opacity:.5;cursor:wait}.ai360-message-images{display:flex;gap:6px;overflow:auto;margin-top:8px;max-width:100%}.ai360-message-images img{width:64px;height:64px;object-fit:cover;border-radius:8px;flex:none}@media(max-width:640px){.ai360-attachment-list{grid-template-columns:1fr}}
`;if(!document.getElementById(style.id))document.head.appendChild(style);

const SHARE_CACHE='comando360-share-inbox-v1';
const SHARE_KEY='./__assistant360_shared_image__';
const MAX_IMAGES=10,MAX_VISION_BYTES=12*1024*1024;
const DOCUMENT_TYPES={pdf:'application/pdf',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation',csv:'text/csv',txt:'text/plain',md:'text/markdown',json:'application/json',rtf:'application/rtf',odt:'application/vnd.oasis.opendocument.text'};
const FILE_ACCEPT='image/*,'+Object.keys(DOCUMENT_TYPES).map(ext=>'.'+ext).join(',');
const state={conversationId:null,attachments:[],busy:false,recognition:null,installed:new WeakSet(),shareHandled:false,scope:null,epoch:0,conversations:[],workshop:null,pendingTurn:null,controllers:new WeakMap(),handsFree:false,voiceTimer:null};
const dialogueStyle=document.createElement('style');dialogueStyle.textContent=`
.assistant360-ready .chatbox,.assistant360-ready .ai-thread{min-height:36vh;max-height:58dvh;overscroll-behavior:contain;padding:14px}.assistant360-ready .msg,.assistant360-ready .ai-msg span{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.6}.assistant360-ready .toolbar{align-items:flex-end}.assistant360-ready textarea.ai360-composer{resize:none;box-sizing:border-box;min-height:48px;max-height:180px;flex:1;min-width:0;width:100%;font:inherit;line-height:1.5;padding:12px;border:1px solid #cbd5e1;border-radius:14px;margin:0;color:#102a4c;background:#fff}.ai360-conversations{display:flex;align-items:center;gap:8px;margin:14px 0}.ai360-conversations select{flex:1;min-width:0;max-width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:10px;color:#102a4c;background:#fff}.ai360-conversations button{flex:none;min-height:44px}.ai360-thinking{color:#46617d;font-size:13px;padding:12px;line-height:1.5}.ai360-thinking:before{content:'●';display:inline-block;margin-right:8px;animation:ai360-pulse 1s infinite alternate}@keyframes ai360-pulse{to{opacity:.25}}.ai360-message-images img{width:100px;height:100px;cursor:zoom-in}.ai360-preview{padding:0;border:0;border-radius:16px;background:#0b1727;color:#fff;max-width:96vw;max-height:94dvh;width:min(980px,96vw)}.ai360-preview::backdrop{background:rgba(0,0,0,.85)}.ai360-preview header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px}.ai360-preview header span{overflow-wrap:anywhere}.ai360-preview button{min-width:44px;min-height:44px;border:0;border-radius:10px;cursor:pointer}.ai360-preview img{display:block;max-width:100%;height:auto;max-height:78dvh;object-fit:contain;margin:auto}.ai360-document{display:inline-flex;align-items:center;gap:6px;padding:10px;margin:6px 6px 0 0;border-radius:10px;background:#eaf1fa;color:#173d66;text-decoration:underline;overflow-wrap:anywhere;font-size:13px}.ai360-file-icon{display:grid;place-items:center;width:58px;height:58px;border-radius:10px;background:#dbeafe;color:#173d66;font-size:14px;font-weight:800;flex:none}#c360AiFab{position:fixed;right:18px;bottom:calc(100px + env(safe-area-inset-bottom,0px));z-index:900;display:flex;align-items:center;gap:8px;min-height:48px;padding:12px 18px;border:1px solid #86a6d3;border-radius:999px;background:#123d6c;color:#fff;font:700 14px system-ui;box-shadow:0 6px 24px #102a4c40;cursor:pointer}#c360AiFab[hidden]{display:none}@media(max-width:640px){#c360AiFab{right:12px;bottom:calc(150px + env(safe-area-inset-bottom,0px))}.ai360-conversations{flex-wrap:wrap}.ai360-conversations select{flex-basis:100%}.assistant360-ready .chatbox,.assistant360-ready .ai-thread{max-height:52dvh;padding:10px}.assistant360-ready .ai360-tools{grid-template-columns:repeat(3,minmax(0,1fr))}.ai360-tools .btn{min-width:0;padding:10px 5px;font-size:12px}.ai360-message-images img{width:88px;height:88px}}`;
dialogueStyle.textContent+='@media(max-width:640px){.assistant360-ready .ai360-capabilities,.assistant360-ready .ai360-intro,.assistant360-ready .ai360-brand-copy p{display:none}.assistant360-ready .ai360-conversations{flex-wrap:nowrap}.assistant360-ready .ai360-conversations select{flex-basis:auto}.assistant360-ready .ai360-conversations button{font-size:12px;padding:10px 8px}.assistant360-ready .chatbox,.assistant360-ready .ai-thread{min-height:220px;max-height:42dvh}}';
document.head.appendChild(dialogueStyle);
let healthBusy=false,healthCompany='',healthAt=0;
const $=(sel,root=document)=>root.querySelector(sel);
const $$=(sel,root=document)=>[...root.querySelectorAll(sel)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function requestId(){if(crypto.randomUUID)return crypto.randomUUID();const b=crypto.getRandomValues(new Uint8Array(16));b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;const h=[...b].map(n=>n.toString(16).padStart(2,'0')).join('');return [h.slice(0,8),h.slice(8,12),h.slice(12,16),h.slice(16,20),h.slice(20)].join('-')}
function adapter(){return window.C360AssistantAdapter||null}
function assistantName(){return adapter()?.label||'Comando IA'}
function vehicleFocus(){return adapter()?.vehicleId?.()||null}
function apiBase(){if(adapter()?.apiBase)return adapter().apiBase;try{return (typeof API_URL!=='undefined'&&API_URL)?API_URL:'https://aycbrqziusxtxhsdfqjk.supabase.co'}catch{return 'https://aycbrqziusxtxhsdfqjk.supabase.co'}}
function apiKey(){if(adapter()?.apiKey)return adapter().apiKey;try{return (typeof KEY!=='undefined'&&KEY)?KEY:''}catch{return ''}}
function company(){if(adapter()?.company)return adapter().company()||'';try{return (typeof companyId!=='undefined'&&companyId)?companyId:(window.companyId||'')}catch{return window.companyId||''}}
function authSession(){if(adapter()?.session)return adapter().session();try{return (typeof session==='function')?session():null}catch{return null}}
function globalFn(name){const fn=window[name];return typeof fn==='function'?fn:null}
function sessionScope(){
 const s=authSession();if(!s?.access_token||!company())return '';
 let id=s.user?.id||s.user_id||'';
 if(!id){try{id=JSON.parse(atob(s.access_token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).sub||''}catch{}}
 // Invalid synthetic sessions are never persisted across reloads.
 return company()+':'+(id||'temporary')+(vehicleFocus()?':vehicle:'+vehicleFocus():'');
}
function storedConversation(value){
 const key='c360-ai-conversation:'+state.scope;
 if(!state.scope||state.scope.includes(':temporary'))return null;
 try{if(arguments.length)localStorage.setItem(key,value||'new');return localStorage.getItem(key)}catch{return null}
}
function welcome(root){addMessage(root,'Olá! Pode falar comigo do seu jeito. O que vamos resolver hoje?','ai')?.classList.add('ai360-welcome')}
function updateConversationOptions(root){
 const select=$('.ai360-conversation-select',root);if(!select)return;
 select.replaceChildren(new Option('Nova conversa',''));
 state.conversations.forEach(c=>select.add(new Option(c.title||'Conversa sem título',c.id)));
 select.value=state.conversationId||'';window.C360ChatExperience?.refresh(root);
}
function newConversation(root){
 if(state.busy)return;stopHandsFree(root);state.epoch++;state.conversationId=null;state.attachments=[];state.pendingTurn=null;setWorkshop(root,null);storedConversation('new');
 const box=chatBox(root);if(box)box.replaceChildren();const input=inputEl(root);if(input)input.value='';
 renderActions(root,[]);renderAttachment(root);updateConversationOptions(root);welcome(root);input?.focus();
}
function previewImage(url,name){
 let dialog=document.getElementById('ai360-image-preview');
 if(!dialog){dialog=document.createElement('dialog');dialog.id='ai360-image-preview';dialog.className='ai360-preview';dialog.setAttribute('aria-label','Visualização do anexo');dialog.innerHTML='<header><span></span><button type="button" aria-label="Fechar imagem">✕</button></header><img alt="">';dialog.querySelector('button').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});document.body.appendChild(dialog)}
 $('header span',dialog).textContent=name||'Imagem';$('img',dialog).src=url;$('img',dialog).alt=name||'Imagem anexada';
 if(!dialog.open)dialog.showModal();
}
function messageAttachments(message,attachments){
 if(!message||!attachments?.length)return;
 const host=document.createElement('div');host.className='ai360-message-images';
 attachments.forEach((a,i)=>{
  const name=a.file?.name||a.original_name||`Anexo ${i+1}`,mime=a.file?.type||a.mime_type||'',url=a.imageDataUrl||a.url;
  if(mime.startsWith('image/')&&url){const img=document.createElement('img');img.src=url;img.alt=name;img.tabIndex=0;img.setAttribute('role','button');img.setAttribute('aria-label','Ampliar '+name);img.addEventListener('click',()=>previewImage(url,name));img.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();previewImage(url,name)}});host.appendChild(img)}
  else{const link=document.createElement(url||a.file?'a':'span');link.className='ai360-document';link.textContent='📄 '+name;if(url||a.file){link.href=url||URL.createObjectURL(a.file);link.target='_blank';link.rel='noopener noreferrer'}host.appendChild(link)}
 });message.appendChild(host);
}
async function openConversation(root,id){
 stopHandsFree(root);
 const epoch=++state.epoch,scope=state.scope,cid=company();setBusy(root,true,'Abrindo…');
 try{
  const data=await callAssistant({mode:'history',company_id:cid,conversation_id:id});if(state.epoch!==epoch||state.scope!==scope||company()!==cid)return;
  const box=chatBox(root);if(box)box.replaceChildren();state.conversationId=id;state.attachments=[];storedConversation(id);
  (data.messages||[]).forEach(m=>{const message=addMessage(root,m.content,m.role==='user'?'user':'ai');messageAttachments(message,m.attachments);state.controllers.get(root)?.receipt(message,m.workshop)});state.pendingTurn=null;setWorkshop(root,data.workshop);
  if(!data.messages?.length)welcome(root);renderActions(root,data.actions||[]);renderAttachment(root);updateConversationOptions(root);
 }catch(e){if(state.epoch===epoch){updateConversationOptions(root);notify(e?.message||'Não consegui recuperar esta conversa.','error')}}
 finally{if(state.epoch===epoch)setBusy(root,false)}
}
async function syncConversation(root){
 const scope=sessionScope();if(scope===state.scope)return;
 stopHandsFree(root);state.scope=scope;const epoch=++state.epoch;state.conversationId=null;state.conversations=[];state.attachments=[];state.pendingTurn=null;setWorkshop(root,null);
 try{state.recognition?.stop()}catch{}state.recognition=null;
 const box=chatBox(root);if(box)box.replaceChildren();const input=inputEl(root);if(input)input.value='';
 renderActions(root,[]);renderAttachment(root);updateConversationOptions(root);welcome(root);
 document.getElementById('ai360-image-preview')?.close();
 if(!scope){setBusy(root,false);return}
 setBusy(root,true,'Abrindo…');
 try{
  const data=await callAssistant({mode:'conversations',company_id:company(),vehicle_context_id:vehicleFocus()});if(state.scope!==scope||state.epoch!==epoch)return;
  state.conversations=data.conversations||[];updateConversationOptions(root);
  const saved=storedConversation(),id=saved==='new'?null:(state.conversations.find(c=>c.id===saved)?.id||state.conversations[0]?.id);
  if(id){setBusy(root,false);await openConversation(root,id)}
 }catch(e){if(state.scope===scope&&state.epoch===epoch)notify(e?.message||'Histórico indisponível. Você pode iniciar uma nova conversa.','error')}
 finally{if(state.scope===scope&&(state.epoch===epoch||!state.busy))setBusy(root,false)}
}
function headers(extra={}){const s=authSession();return {apikey:apiKey(),Authorization:`Bearer ${s?.access_token||''}`,...extra}}
async function checkHealth(root,force=false){
 const companyId=company();if(!companyId||!authSession()?.access_token||healthBusy||(!force&&healthCompany===companyId&&Date.now()-healthAt<60000))return;
 let status=root.querySelector('[data-ai-health]');
 if(!status){status=document.createElement('div');status.dataset.aiHealth='1';status.className='ai360-missing';status.setAttribute('role','status');root.querySelector('.ai360-capabilities')?.insertAdjacentElement('afterend',status);if(!status.isConnected)root.prepend(status)}
 healthBusy=true;healthCompany=companyId;healthAt=Date.now();status.textContent='Verificando disponibilidade da IA…';
 try{
  const response=await assistantRequest('/functions/v1/controla-ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({company_id:companyId,mode:'health'})},10000);
  const result=await response.json();if(company()!==companyId)return;
  if(!response.ok)throw new Error('Não foi possível verificar a disponibilidade.');
  const configured=result.status==='configured'&&result.configured===true;
  status.hidden=configured;
  status.className=configured?'ai360-ready':'ai360-missing';status.textContent=configured?'Configuração da IA presente. Envie uma consulta para validar a resposta.':'IA aguardando ativação. Leitura de fotos e respostas inteligentes precisam da configuração do serviço.';
 }catch(e){if(company()===companyId){status.hidden=false;status.className='ai360-missing';status.textContent='Disponibilidade da IA não verificada. Confira a conexão e tente novamente.'}}
 finally{healthBusy=false;if(company()===companyId&&!status.hidden){const button=document.createElement('button');button.type='button';button.className='btn soft';button.textContent='Verificar novamente';button.addEventListener('click',()=>checkHealth(root,true));status.append(' ',button)}}
}
function activeRoot(){
 if(adapter()?.root)return adapter().root();
 const roots=$$('[data-screen="ia"],#ia');
 return roots.find(r=>!r.hidden&&getComputedStyle(r).display!=='none')||roots[0]||null;
}
function chatBox(root){return $('#chatbox',root)||$('#aiThread',root)||$('.ai-thread',root)}
function inputEl(root){return $('#question',root)||$('#aiInput',root)||$('.ai-input input',root)}
function sendBtn(root){return $('#sendAI',root)||$('.ai-input button',root)||$('.toolbar button.primary',root)}
function appendLinkedText(el,text){
 const value=String(text??'');let offset=0;
 for(const match of value.matchAll(/https:\/\/[^\s<>"']+/g)){
  el.appendChild(document.createTextNode(value.slice(offset,match.index)));
  const url=match[0].replace(/[),.;!?]+$/,'');
  const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=url;el.appendChild(a);
  el.appendChild(document.createTextNode(match[0].slice(url.length)));offset=match.index+match[0].length;
 }
 el.appendChild(document.createTextNode(value.slice(offset)));
}
function addMessage(root,text,role='ai',meta=''){
 const box=chatBox(root);if(!box)return;
 const modern=box.classList.contains('ai-thread');
 const d=document.createElement('div');
 if(modern){
  d.className='ai-msg '+(role==='user'?'user':'bot');
  const strong=document.createElement('strong');strong.textContent=role==='user'?'Você':'Assistente 360';
  const span=document.createElement('span');span.className='ai-msg-text';if(window.C360ChatExperience)window.C360ChatExperience.renderText(span,text,role);else appendLinkedText(span,text);
  d.append(strong,span);
  if(meta){const small=document.createElement('small');small.className='ai360-msgmeta';small.textContent=meta;d.appendChild(small)}
 }else{
  d.className='msg '+(role==='user'?'user':'ai');
  const content=document.createElement('div');content.className='ai-msg-text';if(window.C360ChatExperience)window.C360ChatExperience.renderText(content,text,role);else appendLinkedText(content,text);d.appendChild(content);
  if(meta){const small=document.createElement('div');small.className='ai360-msgmeta';small.textContent=meta;d.appendChild(small)}
 }
 box.appendChild(d);const scroll=box.closest('.ai360-chat-scroll')||box;if(role==='user')scroll.dataset.follow='true';if(scroll.dataset.follow!=='false')scroll.scrollTop=scroll.scrollHeight;return d;
}
function notify(text,type='info'){
 if(adapter()?.notify){adapter().notify(text);return}
 const toast=globalFn('showToast');if(typeof toast==='function'){try{toast(text);return}catch{}}
 if(type==='error')console.error(text);else console.log(text);
}
function formatMoney(v){const n=Number(v);return Number.isFinite(n)?n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}):'—'}
function formatNumber(v,suffix=''){const n=Number(v);return Number.isFinite(n)?n.toLocaleString('pt-BR')+suffix:'—'}
const labels={
 fuel_log:'Abastecimento',poultry_schedule:'Fax / programação de apanha',maintenance:'Manutenção',odometer:'Quilometragem'
};
function payloadRows(a){
 const p=a.payload||{}; const rows=[];
 if(a.action_type==='fuel_log')rows.push(['Veículo',[p.vehicle_name,p.plate].filter(Boolean).join(' • ')],['Motorista',p.driver],['Data',p.date],['Hodômetro',p.odometer_km!=null?formatNumber(p.odometer_km,' km'):null],['Litros',p.liters!=null?formatNumber(p.liters,' L'):null],['Valor',p.total_amount!=null?formatMoney(p.total_amount):null],['Posto',p.station_name],['Tanque completo',p.full_tank==null?'Não informado':p.full_tank?'Sim':'Não']);
 if(a.action_type==='poultry_schedule')rows.push(['Equipe',p.team_name],['Integrado',p.integrator_name],['Granja / produtor',p.farm_name||p.producer],['Cidade',p.city],['Programação',p.scheduled_start],['Aves previstas',p.planned_birds!=null?formatNumber(p.planned_birds):null]);
 if(a.action_type==='maintenance')rows.push(['Veículo',[p.vehicle_name,p.plate].filter(Boolean).join(' • ')],['Tipo',p.maintenance_type],['Título',p.title],['Problema',p.reported_issue],['Serviço',p.service_performed],['Hodômetro',p.odometer_km!=null?formatNumber(p.odometer_km,' km'):null],['Mão de obra',p.labor_amount!=null?formatMoney(p.labor_amount):null]);
 if(a.action_type==='odometer')rows.push(['Veículo',[p.vehicle_name,p.plate].filter(Boolean).join(' • ')],['Data',p.date],['Hodômetro',p.odometer_km!=null?formatNumber(p.odometer_km,' km'):null]);
 if(p.source_image_indices?.length)rows.push(['Imagens de origem',p.source_image_indices.join(', ')]);
 return rows.filter(([,v])=>v!==null&&v!==undefined&&v!=='');
}
function actionsHost(root){
 let host=$('.ai360-actions',root);if(host)return host;
 host=document.createElement('div');host.className='ai360-actions';
 const box=chatBox(root);if(box)box.insertAdjacentElement('afterend',host);else root.appendChild(host);
 return host;
}
function renderActions(root,actions=[]){
 const host=actionsHost(root);host.innerHTML='';
 if(!actions.length)return;
 actions.forEach(a=>{
  const card=document.createElement('section');card.className='ai360-action-card';card.dataset.actionId=a.id||'';
  const missing=a.missing_fields||[];
  card.innerHTML=`<div class="ai360-action-head"><div><span class="ai360-action-kind">${esc(labels[a.action_type]||a.action_type)}</span><strong>${esc(a.summary||'Lançamento identificado')}</strong></div><span class="ai360-confidence">${Math.round(Number(a.confidence||0)*100)}%</span></div><div class="ai360-review-grid">${payloadRows(a).map(([k,v])=>`<div><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('')}</div>${missing.length?`<div class="ai360-missing">⚠ Falta confirmar: ${esc(missing.join(', '))}</div>`:'<div class="ai360-ready">✓ Dados prontos para confirmação</div>'}<div class="ai360-action-buttons"><button type="button" class="btn primary ai360-confirm" ${missing.length?'disabled':''}>✓ Confirmar e salvar</button><button type="button" class="btn soft ai360-correct">✎ Corrigir pelo chat</button></div>`;
  $('.ai360-confirm',card)?.addEventListener('click',()=>confirmAction(root,a,card));
  if(a.status&&a.status!=='proposed'){
   card.classList.toggle('saved',a.status==='executed');
   const buttons=$('.ai360-action-buttons',card);buttons.replaceChildren();const label=document.createElement('span');label.className='ai360-saved';label.textContent=a.status==='executed'?'✓ Salvo no Comando 360':'Proposta encerrada';buttons.appendChild(label);
  }
  $('.ai360-correct',card)?.addEventListener('click',()=>{
    const input=inputEl(root);if(!input)return;
    input.value=`Corrija o lançamento de ${labels[a.action_type]||a.action_type}: `;input.focus();
    input.scrollIntoView({behavior:'smooth',block:'center'});
  });
  host.appendChild(card);
 });
}
function attachmentHost(root){
 let el=$('.ai360-attachment',root);if(el)return el;
 el=document.createElement('div');el.className='ai360-attachment';el.hidden=true;
 const composer=$('.ai360-tools',root);composer?.insertAdjacentElement('afterend',el);return el;
}
function renderAttachment(root){
 const el=attachmentHost(root);if(!state.attachments.length){el.hidden=true;el.innerHTML='';return}
 el.hidden=false;el.innerHTML=`<div class="ai360-attachment-head"><b>${state.attachments.length} de ${MAX_IMAGES} anexos selecionados</b><button type="button" class="btn soft ai360-clear">Limpar todos</button></div><div class="ai360-attachment-list"></div>`;
 const list=$('.ai360-attachment-list',el);
 state.attachments.forEach((attachment,index)=>{
  const row=document.createElement('div');row.className='ai360-thumb-wrap';
  row.innerHTML=`${attachment.imageDataUrl?`<img alt="Prévia da imagem ${index+1}" class="ai360-thumb"/>`:`<span class="ai360-file-icon">${esc(attachment.file.name.split('.').pop().toUpperCase())}</span>`}<div><b>${index+1}. ${esc(attachment.file.name)}</b><small>${(attachment.file.size/1024/1024).toFixed(1)} MB • original será arquivado</small></div><button type="button" class="ai360-remove" aria-label="Remover anexo ${index+1}: ${esc(attachment.file.name)}">×</button>`;
  const thumb=$('img',row);if(thumb){thumb.src=attachment.imageDataUrl;thumb.style.cursor='zoom-in';thumb.addEventListener('click',()=>previewImage(attachment.imageDataUrl,attachment.file.name))}
  $('.ai360-remove',row).disabled=state.busy;
  $('.ai360-remove',row).addEventListener('click',()=>{if(state.busy)return;state.attachments=state.attachments.filter(a=>a!==attachment);renderAttachment(root)});
  list.appendChild(row);
 });
 $('.ai360-clear',el).disabled=state.busy;
 $('.ai360-clear',el).addEventListener('click',()=>{if(state.busy)return;state.attachments=[];renderAttachment(root)});
}
function safeFileName(name){return String(name||'foto.jpg').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9._-]+/g,'-').slice(-120)}
async function compressForVision(file){
 const raw=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file)});
 const img=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=raw});
 const max=1600,scale=Math.min(1,max/Math.max(img.width,img.height));
 const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));
 canvas.getContext('2d',{alpha:false}).drawImage(img,0,0,canvas.width,canvas.height);
 const result=canvas.toDataURL('image/jpeg',.84);img.src='';canvas.width=canvas.height=1;return result;
}
async function uploadOriginal(file,cid){
 const s=authSession();if(!cid||company()!==cid||!s?.access_token)throw new Error('Sessão inválida para arquivar a foto.');
 const day=new Date().toISOString().slice(0,10);const uid=(crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random().toString(16).slice(2)}`);
 const path=`${cid}/assistant360/${day}/${uid}-${safeFileName(file.name)}`;
 const endpoint=`/storage/v1/object/company-documents/${path.split('/').map(encodeURIComponent).join('/')}`;
 const r=await assistantRequest(endpoint,{method:'POST',headers:{'Content-Type':file.type||'application/octet-stream','x-upsert':'false'},body:file});
 if(!r.ok){let msg='';try{msg=(await r.json())?.message||''}catch{}throw new Error(msg||'Não foi possível arquivar o anexo original.');}
 return {bucket:'company-documents',path,original_name:file.name,mime_type:file.type||null,size_bytes:file.size};
}
async function prepareImages(root,files){
 if(state.busy)return false;
 const fingerprint=file=>[file.name,file.size,file.lastModified,file.type].join('|');
 const seen=new Set(state.attachments.map(a=>fingerprint(a.file))),selected=[];
 for(const file of Array.from(files||[])){const id=fingerprint(file);if(!seen.has(id)){selected.push(file);seen.add(id)}}
 if(!selected.length)return false;
 if(state.attachments.length+selected.length>MAX_IMAGES){notify(`Selecione até ${MAX_IMAGES} anexos por mensagem.`,'error');return false}
 if(selected.some(file=>!String(file.type||'').startsWith('image/')&&!DOCUMENT_TYPES[file.name.split('.').pop().toLowerCase()])){notify('Use fotos, PDF, Word, Excel, PowerPoint ou arquivos de texto.','error');return false}
 if(selected.some(file=>file.size>(String(file.type).startsWith('image/')?15:10)*1024*1024)){notify('Cada foto deve ter até 15 MB e cada documento até 10 MB.','error');return false}
 const epoch=state.epoch,scope=state.scope;setBusy(root,true,'Preparando anexos…');
 try{
  const prepared=[];
  for(const original of selected){
   const image=String(original.type).startsWith('image/'),mime=image?original.type:DOCUMENT_TYPES[original.name.split('.').pop().toLowerCase()];
   const file=original.type===mime?original:new File([original],original.name,{type:mime,lastModified:original.lastModified});
   const fileData=image?null:await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file)});
   prepared.push({file,imageDataUrl:image?await compressForVision(file):null,fileData,sourceAttachment:null});
  }
  if(state.epoch!==epoch||sessionScope()!==scope){scan();return false}
  if([...state.attachments,...prepared].reduce((n,a)=>n+(a.imageDataUrl?.length||0),0)>MAX_VISION_BYTES)throw new Error('As imagens ficaram muito grandes juntas. Envie menos fotos por mensagem.');
  if([...state.attachments,...prepared].reduce((n,a)=>n+(a.fileData?.length||0),0)>16*1024*1024)throw new Error('Os documentos ficaram muito grandes juntos. Envie menos arquivos por mensagem.');
  state.attachments.push(...prepared);renderAttachment(root);return true;
 }catch(e){if(state.epoch===epoch)notify(e?.message||'Não consegui preparar esses anexos.','error');return false}
 finally{if(state.epoch===epoch)setBusy(root,false)}
}
function ensureFileInput(root){
 let input=$('.ai360-file-input',root);
 if(input)return input;
 input=document.createElement('input');input.className='ai360-file-input';input.type='file';input.accept=FILE_ACCEPT;input.multiple=true;input.hidden=true;root.appendChild(input);
 input.addEventListener('change',async()=>{await prepareImages(root,input.files);input.value=''});
 return input;
}
function selectPhoto(root,source='camera'){
 if(state.busy)return;
 const input=ensureFileInput(root);input.accept=source==='camera'?'image/*':FILE_ACCEPT;
 input.multiple=source!=='camera';
 if(source==='camera')input.setAttribute('capture','environment');else input.removeAttribute('capture');
 input.value='';input.click();
}
function speechCtor(){return window.SpeechRecognition||window.webkitSpeechRecognition||null}
function startVoice(root,btn){
 if(state.handsFree){stopHandsFree(root);return}
 const C=speechCtor();if(!C){notify('O navegador deste aparelho não oferece ditado por voz.','error');return}
 if(state.recognition){try{state.recognition.stop()}catch{}state.recognition=null;btn.classList.remove('recording');return}
 const rec=new C();state.recognition=rec;rec.lang='pt-BR';rec.interimResults=true;rec.continuous=false;
 const input=inputEl(root);const base=input?.value||'';btn.classList.add('recording');btn.textContent='■ Ouvindo';
 rec.onresult=e=>{let final='',interim='';for(let i=e.resultIndex;i<e.results.length;i++){const t=e.results[i][0].transcript;if(e.results[i].isFinal)final+=t;else interim+=t}if(input)input.value=[base,final||interim].filter(Boolean).join(base?' ':'')};
 rec.onerror=()=>notify('Não consegui ouvir. Você pode digitar normalmente.','error');
 rec.onend=()=>{state.recognition=null;btn.classList.remove('recording');btn.textContent='🎤 Falar'};rec.start();
}

function voiceStatus(root,text){const status=$('.ai360-voice-status',root);if(status){status.textContent=text;status.hidden=!text}}
function stopHandsFree(root){
 state.handsFree=false;clearTimeout(state.voiceTimer);state.voiceTimer=null;const rec=state.recognition;state.recognition=null;try{rec?.abort()}catch{}try{window.speechSynthesis?.cancel()}catch{}
 const b=$('.ai360-handsfree',root);if(b){b.textContent='🗣 Conversar por voz';b.classList.remove('recording');b.setAttribute('aria-pressed','false');b.disabled=state.busy}const d=$('.ai360-voice',root);if(d){d.classList.remove('recording');d.textContent='🎤 Falar'}voiceStatus(root,'');
}
function listenHandsFree(root){
 if(!state.handsFree||document.hidden)return;if(state.busy){state.voiceTimer=setTimeout(()=>listenHandsFree(root),250);return}
 const C=speechCtor();if(!C){stopHandsFree(root);notify('Este navegador não oferece conversa por voz. Use o microfone do teclado.');return}
 const input=inputEl(root),epoch=state.epoch,rec=new C();let transcript='';state.recognition=rec;rec.lang='pt-BR';rec.interimResults=true;rec.continuous=false;voiceStatus(root,'Ouvindo… Uma pausa envia sua mensagem. Toque em Parar voz para encerrar.');
 rec.onresult=e=>{transcript=Array.from(e.results).map(r=>r[0].transcript).join(' ').trim();if(input)input.value=transcript};
 rec.onerror=e=>{if(!state.handsFree||state.epoch!==epoch)return;stopHandsFree(root);notify(e.error==='not-allowed'?'Autorize o microfone para conversar por voz.':'O modo de voz foi pausado. Sua fala permanece no campo para conferir.')};
 rec.onend=()=>{if(state.recognition===rec)state.recognition=null;if(!state.handsFree||state.epoch!==epoch)return;if(transcript){voiceStatus(root,'Mensagem enviada. Aguardando a resposta…');analyze(root)}else{stopHandsFree(root);notify('O modo de voz foi pausado porque não ouvi uma fala.')}};
 try{rec.start()}catch{stopHandsFree(root);notify('Não consegui iniciar o microfone. Tente novamente.')}
}
function speakAnswer(root,answer){
 if(!state.handsFree)return;const epoch=state.epoch;const resume=()=>{if(state.handsFree&&state.epoch===epoch)state.voiceTimer=setTimeout(()=>listenHandsFree(root),350)};
 if(!window.speechSynthesis||!window.SpeechSynthesisUtterance){resume();return}voiceStatus(root,'Lendo a resposta… Toque em Parar voz quando quiser.');
 try{const u=new SpeechSynthesisUtterance(String(answer).slice(0,3500));u.lang='pt-BR';u.rate=1.05;u.onend=resume;u.onerror=()=>{if(state.handsFree){stopHandsFree(root);notify('A leitura em voz foi pausada. A resposta está na conversa.')}};window.speechSynthesis.speak(u)}catch{stopHandsFree(root);notify('A leitura em voz foi pausada. A resposta e o registro continuam na conversa.')}
}
function toggleHandsFree(root){
 if(state.handsFree){stopHandsFree(root);return}if(state.busy)return;if(!speechCtor()){notify('Este navegador não oferece conversa por voz. Use o microfone do teclado.');return}if(inputEl(root)?.value.trim()||state.attachments.length){notify('Envie ou limpe a mensagem atual antes de iniciar a conversa por voz.');return}
 try{state.recognition?.abort()}catch{}state.recognition=null;state.handsFree=true;const b=$('.ai360-handsfree',root);b.textContent='■ Parar voz';b.classList.add('recording');b.setAttribute('aria-pressed','true');listenHandsFree(root);
}

async function assistantRequest(endpoint,opts,timeoutMs=45000){
 const authenticated=globalFn('authFetch');
 if(authenticated)return await authenticated(endpoint,opts,true,timeoutMs);
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
 try{return await fetch(apiBase()+endpoint,{...opts,headers:headers(opts.headers||{}),signal:controller.signal})}
 finally{clearTimeout(timer)}
}
async function callAssistant(body,onEvent){
 if(onEvent&&window.C360ChatStream)body={...body,stream:true};
 const s=authSession();if(!s?.access_token)throw new Error('Sua sessão expirou. Entre novamente.');
 const r=await assistantRequest('/functions/v1/controla-ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)},body.images?.length>1||body.documents?.length?65000:45000);
 let data={};if(r.ok&&body.stream&&window.C360ChatStream)data=await window.C360ChatStream.read(r,onEvent);else{try{data=await r.json()}catch{}}
 if(!r.ok){const error=new Error(data?.message||data?.detail||data?.error||`Falha na IA (${r.status})`);error.conversationId=data.conversation_id;throw error}return data;
}
function setBusy(root,busy,label='Respondendo…'){state.busy=busy;const btn=sendBtn(root),input=inputEl(root);if(btn){btn.disabled=busy;btn.dataset.oldText=btn.dataset.oldText||btn.textContent;btn.textContent=btn.dataset.iconSend==='true'?(busy?'⋯':'↑'):(busy?label:(btn.dataset.oldText||'Enviar'));if(btn.dataset.iconSend==='true')btn.setAttribute('aria-label',busy?label:'Enviar mensagem')}if(input)input.disabled=busy;$$('.ai360-tool,.ai360-remove,.ai360-clear,.ai360-file-input,.ai360-conversations button,.ai360-conversations select,.ai360-workshop button,.ai360-workshop select,.ai360-workshop input,.ai360-workshop textarea,.ai360-thread,.ai360-sidebar-new',root).forEach(b=>b.disabled=busy);const voice=$('.ai360-handsfree',root);if(voice)voice.disabled=busy&&!state.handsFree;root.setAttribute('aria-busy',String(busy));window.C360ChatExperience?.refresh(root)}
function setWorkshop(root,workshop){state.workshop=workshop||null;state.controllers.get(root)?.hydrate(state.workshop)}
function mountWorkshop(root){
 if(!window.C360WorkshopChat||state.controllers.has(root))return;
 const c=window.C360WorkshopChat.mount(root,{company,epoch:()=>state.epoch,busy:()=>state.busy,request:callAssistant,setBusy:(busy,label)=>setBusy(root,busy,label),conversation:()=>state.conversationId,vehicleFocus,
 setConversation(id,title){if(state.conversationId!==id)chatBox(root)?.replaceChildren();renderActions(root,[]);state.conversationId=id;state.pendingTurn=null;storedConversation(id);if(!state.conversations.some(c=>c.id===id))state.conversations.unshift({id,title});updateConversationOptions(root)},setWorkshop:w=>setWorkshop(root,w),addMessage:t=>addMessage(root,t,'ai'),notify,draft(t){const i=inputEl(root);if(i&&!state.busy){i.value=t;i.focus()}},attachments:messageAttachments});state.controllers.set(root,c);c.hydrate(state.workshop);
}
async function analyze(root){
 if(state.busy)return;
 if(state.scope!==sessionScope()){syncConversation(root);return}
 const input=inputEl(root);const q=(input?.value||'').trim(),cid=company();if(!q&&!state.attachments.length)return;
 const attachments=[...state.attachments],epoch=state.epoch;
 const signature=JSON.stringify([q,attachments.map(a=>[a.file.name,a.file.size,a.file.lastModified])]);if(state.pendingTurn?.signature!==signature)state.pendingTurn={signature,id:requestId()};
 setBusy(root,true);
 let thinking,streamMessage;
 try{
   for(const attachment of attachments){
    if(company()!==cid||state.epoch!==epoch)throw new Error('A conversa mudou durante o envio.');
    if(!attachment.sourceAttachment)attachment.sourceAttachment=await uploadOriginal(attachment.file,cid);
   }
   if(company()!==cid||state.epoch!==epoch||attachments.some(a=>!a.sourceAttachment.path.startsWith(cid+'/assistant360/')))throw new Error('Confira a empresa antes de enviar os anexos.');
   const userText=q||'Analise estes anexos e me ajude a entender o conteúdo. Se houver um lançamento a preparar, mostre para conferência.';
   const message=addMessage(root,userText,'user',attachments.map((a,i)=>`📎 ${i+1}. ${a.file.name}`).join(' • '));
   messageAttachments(message,attachments);
   if(input)input.value='';
   const body={mode:'analyze',company_id:cid,question:userText,client_request_id:state.pendingTurn.id,vehicle_context_id:vehicleFocus(),images:attachments.filter(a=>a.imageDataUrl).map(a=>({image_data_url:a.imageDataUrl,source_attachment:a.sourceAttachment})),documents:attachments.filter(a=>a.fileData).map(a=>({filename:a.file.name,file_data:a.fileData,source_attachment:a.sourceAttachment}))};
   if(state.conversationId)body.conversation_id=state.conversationId;
   thinking=document.createElement('div');thinking.className='ai360-thinking';thinking.setAttribute('role','status');thinking.textContent=assistantName()+' está respondendo…';chatBox(root)?.appendChild(thinking);thinking.scrollIntoView({block:'nearest'});
   const data=await callAssistant(body,(event,value)=>{
    if(company()!==cid||state.epoch!==epoch)return;
    if(event==='session'&&value.conversation_id){state.conversationId=value.conversation_id;storedConversation(value.conversation_id)}
    if(event==='answer'&&value.text){thinking?.remove();if(!streamMessage)streamMessage=addMessage(root,'','ai');const target=streamMessage.querySelector('.ai-msg-text')||streamMessage.querySelector('span')||streamMessage;target.textContent=value.text;streamMessage.classList.add('ai360-streaming');const box=chatBox(root);if(box){const scroll=box.closest('.ai360-chat-scroll')||box;if(scroll.dataset.follow!=='false')scroll.scrollTop=scroll.scrollHeight}}
   });if(company()!==cid||state.epoch!==epoch)return;if(data.conversation_id){state.conversationId=data.conversation_id;storedConversation(data.conversation_id);if(!state.conversations.some(c=>c.id===data.conversation_id))state.conversations.unshift({id:data.conversation_id,title:userText.slice(0,80)});updateConversationOptions(root)}
   thinking.remove();
   const answer=data.answer||data.message||'Solicitação analisada.';const reply=streamMessage||addMessage(root,answer,'ai');if(streamMessage){streamMessage.classList.remove('ai360-streaming');const target=streamMessage.querySelector('.ai-msg-text')||streamMessage.querySelector('span')||streamMessage;target.replaceChildren();if(window.C360ChatExperience)window.C360ChatExperience.renderText(target,answer,'ai');else appendLinkedText(target,answer)}setWorkshop(root,data.workshop);state.controllers.get(root)?.receipt(reply,data.workshop);renderActions(root,data.actions||[]);
   state.pendingTurn=null;state.attachments=[];renderAttachment(root);if(data.workshop?.entries_written>0)document.dispatchEvent(new CustomEvent('c360:workshop-journal-updated',{detail:{workshop:data.workshop}}));if(state.handsFree)speakAnswer(root,answer);
 }catch(e){if(company()===cid&&state.epoch===epoch){stopHandsFree(root);streamMessage?.remove();if(e.conversationId){state.conversationId=e.conversationId;storedConversation(e.conversationId)}if(input&&!input.value)input.value=q;addMessage(root,e?.message||'Falha ao consultar o Assistente 360.','ai');}}
 finally{thinking?.remove();if(company()===cid&&state.epoch===epoch){setBusy(root,false);input?.focus()}else if(state.epoch===epoch)scan()}
}
async function confirmAction(root,a,card){
 const btn=$('.ai360-confirm',card);if(!a.id||btn?.disabled)return;
 if(state.scope!==sessionScope()){syncConversation(root);return}
 const cid=company(),epoch=state.epoch;
 const old=btn.textContent;btn.disabled=true;btn.textContent='Salvando…';
 try{
   const data=await callAssistant({mode:'execute',company_id:cid,action_request_id:a.id});if(company()!==cid||state.epoch!==epoch)return;
   card.classList.add('saved');const box=$('.ai360-action-buttons',card);if(box)box.innerHTML='<span class="ai360-saved">✓ Salvo no Comando 360</span>';
   addMessage(root,data?.result?.message||'Lançamento salvo com sucesso.','ai');
   document.dispatchEvent(new CustomEvent('c360:assistant-action-executed',{detail:{action:a,result:data?.result}}));
   ['loadDashboard','loadPoultryDashboard','loadFuel','loadVehicles','loadMaintenances'].forEach(name=>{const fn=globalFn(name);if(typeof fn==='function'){try{Promise.resolve(fn()).catch(e=>console.warn('Atualização após lançamento da IA',e?.message||e))}catch(e){console.warn('Atualização após lançamento da IA',e?.message||e)}}});
 }catch(e){if(company()===cid&&state.epoch===epoch){btn.disabled=false;btn.textContent=old;addMessage(root,e?.message||'Não consegui salvar o lançamento.','ai')}}
}
function tools(root){
 let bar=$('.ai360-tools',root);if(bar)return bar;
 bar=document.createElement('div');bar.className='ai360-tools';bar.innerHTML='<button type="button" class="btn soft ai360-tool ai360-camera">📷 Câmera</button><button type="button" class="btn soft ai360-tool ai360-gallery">📎 Anexar</button><button type="button" class="btn soft ai360-tool ai360-voice">🎤 Falar</button><button type="button" class="btn soft ai360-handsfree" aria-pressed="false">🗣 Conversar por voz</button><span class="ai360-tools-hint">Fotos, PDF, Word, Excel e texto. Até 10 anexos por mensagem.</span><span class="ai360-voice-status ai360-tools-hint" role="status" aria-live="polite" hidden></span>';
 const input=inputEl(root),composer=input?.parentElement||null;
 if(composer&&composer!==root)composer.insertAdjacentElement('beforebegin',bar);else (chatBox(root)?.parentElement||root).appendChild(bar);
 $('.ai360-camera',bar)?.addEventListener('click',()=>selectPhoto(root,'camera'));
 $('.ai360-gallery',bar)?.addEventListener('click',()=>selectPhoto(root,'gallery'));
 const voice=$('.ai360-voice',bar);voice?.addEventListener('click',()=>startVoice(root,voice));$('.ai360-handsfree',bar).addEventListener('click',()=>toggleHandsFree(root));return bar;
}
function mountExperience(root){window.C360ChatExperience?.mount(root,{busy:()=>state.busy,conversations:()=>state.conversations,conversation:()=>state.conversationId,newConversation:()=>newConversation(root),openConversation:id=>openConversation(root,id),draft(text){const input=inputEl(root);if(input&&!state.busy){input.value=text;input.focus()}}})}
function install(root){
 if(!root||state.installed.has(root))return;state.installed.add(root);root.classList.add('assistant360-ready');
 const card=$('.card',root)||root;
 const h=$('h1',root)||$('h3',root);
 const intro=$('.muted',root)||$('p',root);
 if(intro)intro.classList.add('ai360-intro');
 const original=inputEl(root);
 if(original&&original.tagName!=='TEXTAREA'){
  const textarea=document.createElement('textarea');textarea.id=original.id;textarea.className=original.className;textarea.value=original.value;textarea.rows=2;textarea.maxLength=10000;textarea.setAttribute('aria-label','Mensagem para o Comando IA');original.replaceWith(textarea);
 }
 inputEl(root)?.classList.add('ai360-composer');
 if(h){
   h.textContent=assistantName();
   const head=document.createElement('div');head.className='ai360-shell-head';
   const brand=document.createElement('div');brand.className='ai360-brand';
   brand.innerHTML='<div class="ai360-brand-mark">IA</div><div class="ai360-brand-copy"><h3>'+esc(assistantName())+'</h3><p>Seu trabalho, em uma conversa.</p></div>';
   head.appendChild(brand);h.replaceWith(head);
 }
 if(intro)intro.textContent='Comece do seu jeito e continue de onde parou. Envie fotos e documentos quando precisar.';
 const controls=document.createElement('div');controls.className='ai360-conversations';controls.innerHTML='<select class="ai360-conversation-select" aria-label="Suas conversas"><option value="">Nova conversa</option></select><button type="button" class="btn soft ai360-new">＋ Nova conversa</button>';
 ($('.ai360-shell-head',root)||card).insertAdjacentElement('afterend',controls);
 $('.ai360-new',controls).addEventListener('click',()=>newConversation(root));
 $('.ai360-conversation-select',controls).addEventListener('change',e=>{if(e.target.value)openConversation(root,e.target.value);else newConversation(root)});
 if(card&&!$('.ai360-capabilities',card)){
   const caps=document.createElement('div');caps.className='ai360-capabilities';caps.innerHTML='<span>Conversa contínua</span><span>Fotos e documentos</span><span>Dados da sua operação</span>';
   if(intro)intro.insertAdjacentElement('afterend',caps);else card.appendChild(caps);
 }
 tools(root);ensureFileInput(root);attachmentHost(root);actionsHost(root);mountWorkshop(root);checkHealth(root);
 const btn=sendBtn(root);if(btn){btn.removeAttribute('onclick');btn.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();analyze(root)},true)}
 const input=inputEl(root);if(input){input.placeholder='Pode falar comigo. O que vamos resolver?';input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();e.stopImmediatePropagation();analyze(root)}},true);input.addEventListener('input',()=>{input.style.height='auto';input.style.height=Math.min(input.scrollHeight,180)+'px'});input.addEventListener('paste',e=>{if(e.clipboardData?.files.length){e.preventDefault();prepareImages(root,e.clipboardData.files)}})}
}
function openIaScreen(){
 if(adapter()?.open){adapter().open();setTimeout(scan,0);return}
 const candidates=['v2Go','showScreen','openScreen','navigateTo','goToScreen'];for(const name of candidates){const fn=globalFn(name);if(fn){try{Promise.resolve(fn('ia')).catch(()=>notify('Não consegui abrir o Comando IA.','error'));return}catch{}}}
 const target=document.querySelector('[data-jump="ia"],[data-v2tab="ia"],[data-screen="ia"]');if(target){try{target.click();return}catch{}}
 try{location.hash='ia'}catch{}
 document.dispatchEvent(new CustomEvent('c360:screen-changed',{detail:{screen:'ia',id:'ia',source:'share-target'}}));
}
function clearShareQuery(){
 try{const u=new URL(location.href);u.searchParams.delete('c360_share');history.replaceState(history.state,'',u.pathname+(u.searchParams.toString()?`?${u.searchParams.toString()}`:'')+u.hash)}catch{}
}
async function hydrateSharedImage(){
 if(state.shareHandled)return;
 let mode='';try{mode=new URL(location.href).searchParams.get('c360_share')||''}catch{}
 if(!mode)return;
 state.shareHandled=true;
 if(mode!=='1'){clearShareQuery();notify(mode==='too-large'?'A imagem compartilhada é maior que 15 MB.':'Não consegui receber essa imagem do compartilhamento.','error');return}
 if(!('caches'in window)){clearShareQuery();notify('Este navegador não conseguiu abrir a imagem compartilhada.','error');return}
 openIaScreen();
 let root=activeRoot();for(let i=0;!root&&i<30;i++){await new Promise(r=>setTimeout(r,100));root=activeRoot()}
 if(!root){clearShareQuery();notify('Não consegui abrir a tela da IA para receber a imagem.','error');return}
 install(root);
 try{
   const cache=await caches.open(SHARE_CACHE);const response=await cache.match(SHARE_KEY)||await caches.match(SHARE_KEY);
   if(!response)throw new Error('Imagem compartilhada não encontrada.');
   const blob=await response.blob();let name='imagem-compartilhada.jpg';try{name=decodeURIComponent(response.headers.get('X-C360-File-Name')||name)}catch{}
   const file=new File([blob],name,{type:blob.type||response.headers.get('Content-Type')||'image/jpeg'});
   if(await prepareImages(root,[file]))addMessage(root,'Imagem recebida do WhatsApp/compartilhamento. Agora diga o que você quer que eu faça com ela.','ai',`📎 ${file.name}`);
   await cache.delete(SHARE_KEY);
 }catch(e){notify(e?.message||'Não consegui carregar a imagem compartilhada.','error')}
 finally{clearShareQuery()}
}
function floatingButton(root){
 let button=document.getElementById('c360AiFab');
 if(!button){button=document.createElement('button');button.id='c360AiFab';button.type='button';button.textContent='✦ '+assistantName();button.setAttribute('aria-label','Abrir conversa com '+assistantName());button.addEventListener('click',openIaScreen);document.body.appendChild(button)}
 const hidden=!authSession()?.access_token||!company()||document.body.classList.contains('device-mode')||(adapter()?.isOpen?adapter().isOpen():!!(root&&!root.hidden&&getComputedStyle(root).display!=='none'));
 if(button.hidden!==hidden)button.hidden=hidden;
}
function scan(){const root=activeRoot();floatingButton(root);if(root){install(root);mountWorkshop(root);mountExperience(root);syncConversation(root);const visible=adapter()?.isOpen?adapter().isOpen():!root.hidden&&getComputedStyle(root).display!=='none';if(state.handsFree&&!visible)stopHandsFree(root);if(visible&&root.classList.contains('active'))checkHealth(root)}}
document.addEventListener('c360:chat-experience-ready',scan);document.addEventListener('c360:workshop-chat-ready',scan);document.addEventListener('c360:assistant-scope-changed',scan);document.addEventListener('visibilitychange',()=>{if(document.hidden){const root=activeRoot();if(root)stopHandsFree(root)}});
document.addEventListener('c360:screen-changed',e=>{const s=String(e?.detail?.screen||e?.detail?.id||'').toLowerCase();if(!s||s.includes('ia'))setTimeout(scan,0)});
document.addEventListener('c360:lazy-feature-ready',()=>{scan();setTimeout(hydrateSharedImage,0)});
new MutationObserver(scan).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden']});
scan();setTimeout(hydrateSharedImage,0);
})();

