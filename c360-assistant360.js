(()=>{
'use strict';
const VERSION='2026.10.01-comando-ai-2';
if(window.__c360Assistant360Version===VERSION)return;
window.__c360Assistant360Version=VERSION;

const style=document.createElement('style');style.id='c360-assistant360-style';style.textContent=`
.assistant360-ready .chatbox,.assistant360-ready .ai-thread{min-height:360px;max-height:58vh;overflow:auto}.ai360-shell-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap}.ai360-brand{display:flex;align-items:center;gap:10px}.ai360-brand-mark{width:42px;height:42px;border-radius:13px;background:#102a4c;color:#fff;display:grid;place-items:center;font-weight:950;font-size:18px}.ai360-brand-copy h3{margin:0}.ai360-brand-copy p{margin:3px 0 0;color:#64748b;font-size:12px}.ai360-capabilities{display:flex;gap:6px;flex-wrap:wrap;margin:10px 0}.ai360-capabilities span{font-size:10px;font-weight:850;padding:5px 8px;border-radius:999px;background:#eef4fb;color:#31516f}.ai360-tools{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:10px 0}.ai360-tools-hint{font-size:11px;color:#64748b;flex:1;min-width:220px}.ai360-tool.recording{background:#fee2e2!important;color:#991b1b!important;border-color:#fecaca!important}.ai360-attachment{margin:8px 0 10px}.ai360-thumb-wrap{display:flex;align-items:center;gap:10px;padding:9px;border:1px solid #dbe4ef;background:#f8fafc;border-radius:13px}.ai360-thumb{width:58px;height:58px;border-radius:10px;object-fit:cover;background:#e2e8f0}.ai360-thumb-wrap>div{min-width:0;flex:1}.ai360-thumb-wrap b{font-size:12px;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ai360-thumb-wrap small,.ai360-msgmeta{display:block;color:#64748b;font-size:10px;margin-top:3px}.ai360-remove{border:0;background:#e2e8f0;border-radius:999px;width:30px;height:30px;font-size:20px;cursor:pointer}.ai360-actions{display:grid;gap:10px;margin:12px 0}.ai360-action-card{border:1px solid #dce6f2;border-radius:16px;padding:14px;background:#fff;box-shadow:0 5px 18px rgba(15,23,42,.05)}.ai360-action-card.saved{border-color:#bbf7d0;background:#f8fff9}.ai360-action-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.ai360-action-head>div{display:grid;gap:4px}.ai360-action-kind{font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.6px;color:#1976d2}.ai360-action-head strong{font-size:14px}.ai360-confidence{font-size:11px;font-weight:900;padding:5px 8px;border-radius:999px;background:#eef5ff;color:#1859a8}.ai360-review-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin:12px 0}.ai360-review-grid>div{padding:9px 10px;border:1px solid #edf1f6;border-radius:11px;background:#f8fafc;min-width:0}.ai360-review-grid span{display:block;color:#64748b;font-size:10px}.ai360-review-grid b{display:block;margin-top:2px;font-size:12px;overflow-wrap:anywhere}.ai360-ready,.ai360-missing{font-size:11px;font-weight:800;padding:8px 10px;border-radius:10px;margin-top:6px}.ai360-ready{background:#ecfdf3;color:#166534}.ai360-missing{background:#fff7ed;color:#9a3412}.ai360-action-buttons{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.ai360-action-buttons button:disabled{opacity:.5;cursor:not-allowed}.ai360-saved{font-size:12px;font-weight:900;color:#166534;padding:8px 0}@media(max-width:640px){.ai360-tools{display:grid;grid-template-columns:1fr 1fr}.ai360-tools-hint{grid-column:1/-1;min-width:0}.ai360-review-grid{grid-template-columns:1fr}.ai360-action-buttons{display:grid;grid-template-columns:1fr}.ai360-action-buttons button{width:100%}}
`;if(!document.getElementById(style.id))document.head.appendChild(style);

const SHARE_CACHE='comando360-share-inbox-v1';
const SHARE_KEY='./__assistant360_shared_image__';
const state={conversationId:null,file:null,imageDataUrl:null,sourceAttachment:null,busy:false,recognition:null,installed:new WeakSet(),shareHandled:false};
const $=(sel,root=document)=>root.querySelector(sel);
const $$=(sel,root=document)=>[...root.querySelectorAll(sel)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
function apiBase(){try{return (typeof API_URL!=='undefined'&&API_URL)?API_URL:'https://aycbrqziusxtxhsdfqjk.supabase.co'}catch{return 'https://aycbrqziusxtxhsdfqjk.supabase.co'}}
function apiKey(){try{return (typeof KEY!=='undefined'&&KEY)?KEY:''}catch{return ''}}
function company(){try{return (typeof companyId!=='undefined'&&companyId)?companyId:(window.companyId||'')}catch{return window.companyId||''}}
function authSession(){try{return (typeof session==='function')?session():null}catch{return null}}
function globalFn(name){const fn=window[name];return typeof fn==='function'?fn:null}
function headers(extra={}){const s=authSession();return {apikey:apiKey(),Authorization:`Bearer ${s?.access_token||''}`,...extra}}
function activeRoot(){
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
  const span=document.createElement('span');appendLinkedText(span,text);
  d.append(strong,span);
  if(meta){const small=document.createElement('small');small.className='ai360-msgmeta';small.textContent=meta;d.appendChild(small)}
 }else{
  d.className='msg '+(role==='user'?'user':'ai');
  appendLinkedText(d,text);
  if(meta){const small=document.createElement('div');small.className='ai360-msgmeta';small.textContent=meta;d.appendChild(small)}
 }
 box.appendChild(d);box.scrollTop=box.scrollHeight;
}
function notify(text,type='info'){
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
 const el=attachmentHost(root);if(!state.file){el.hidden=true;el.innerHTML='';return}
 el.hidden=false;el.innerHTML=`<div class="ai360-thumb-wrap"><img alt="Prévia do anexo" class="ai360-thumb"/><div><b>${esc(state.file.name)}</b><small>${(state.file.size/1024/1024).toFixed(1)} MB • original será arquivado</small></div><button type="button" class="ai360-remove" aria-label="Remover anexo">×</button></div>`;
 if(state.imageDataUrl)$('img',el).src=state.imageDataUrl;
 $('.ai360-remove',el)?.addEventListener('click',()=>{state.file=null;state.imageDataUrl=null;state.sourceAttachment=null;renderAttachment(root)});
}
function safeFileName(name){return String(name||'foto.jpg').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9._-]+/g,'-').slice(-120)}
async function compressForVision(file){
 const raw=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file)});
 const img=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=raw});
 const max=1600,scale=Math.min(1,max/Math.max(img.width,img.height));
 const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));
 canvas.getContext('2d',{alpha:false}).drawImage(img,0,0,canvas.width,canvas.height);
 return canvas.toDataURL('image/jpeg',.84);
}
async function uploadOriginal(file){
 const cid=company(),s=authSession();if(!cid||!s?.access_token)throw new Error('Sessão inválida para arquivar a foto.');
 const day=new Date().toISOString().slice(0,10);const uid=(crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random().toString(16).slice(2)}`);
 const path=`${cid}/assistant360/${day}/${uid}-${safeFileName(file.name)}`;
 const endpoint=`/storage/v1/object/company-documents/${path.split('/').map(encodeURIComponent).join('/')}`;
 const r=await assistantRequest(endpoint,{method:'POST',headers:{'Content-Type':file.type||'application/octet-stream','x-upsert':'false'},body:file});
 if(!r.ok){let msg='';try{msg=(await r.json())?.message||''}catch{}throw new Error(msg||'Não foi possível arquivar a foto original.');}
 return {bucket:'company-documents',path,original_name:file.name,mime_type:file.type||null,size_bytes:file.size};
}
async function prepareImage(root,file){
 if(!file)return false;
 if(!String(file.type||'').startsWith('image/')){notify('Selecione uma imagem (JPG, PNG, WEBP ou foto do celular).','error');return false}
 if(file.size>15*1024*1024){notify('A foto deve ter até 15 MB.','error');return false}
 state.file=file;state.sourceAttachment=null;
 try{state.imageDataUrl=await compressForVision(file);renderAttachment(root);return true}catch{state.file=null;state.imageDataUrl=null;notify('Não consegui preparar essa imagem.','error');return false}
}
function ensureFileInput(root){
 let input=$('.ai360-file-input',root);
 if(input)return input;
 input=document.createElement('input');input.className='ai360-file-input';input.type='file';input.accept='image/*';input.hidden=true;root.appendChild(input);
 input.addEventListener('change',async()=>{const file=input.files?.[0];if(file)await prepareImage(root,file)});
 return input;
}
function selectPhoto(root,source='camera'){
 const input=ensureFileInput(root);input.accept='image/*';
 if(source==='camera')input.setAttribute('capture','environment');else input.removeAttribute('capture');
 input.value='';input.click();
}
function speechCtor(){return window.SpeechRecognition||window.webkitSpeechRecognition||null}
function startVoice(root,btn){
 const C=speechCtor();if(!C){notify('O navegador deste aparelho não oferece ditado por voz.','error');return}
 if(state.recognition){try{state.recognition.stop()}catch{}state.recognition=null;btn.classList.remove('recording');return}
 const rec=new C();state.recognition=rec;rec.lang='pt-BR';rec.interimResults=true;rec.continuous=false;
 const input=inputEl(root);const base=input?.value||'';btn.classList.add('recording');btn.textContent='■ Ouvindo';
 rec.onresult=e=>{let final='',interim='';for(let i=e.resultIndex;i<e.results.length;i++){const t=e.results[i][0].transcript;if(e.results[i].isFinal)final+=t;else interim+=t}if(input)input.value=[base,final||interim].filter(Boolean).join(base?' ':'')};
 rec.onerror=()=>notify('Não consegui ouvir. Você pode digitar normalmente.','error');
 rec.onend=()=>{state.recognition=null;btn.classList.remove('recording');btn.textContent='🎤 Falar'};rec.start();
}
async function assistantRequest(endpoint,opts){
 const authenticated=globalFn('authFetch');
 if(authenticated)return await authenticated(endpoint,opts,true,45000);
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),45000);
 try{return await fetch(apiBase()+endpoint,{...opts,headers:headers(opts.headers||{}),signal:controller.signal})}
 finally{clearTimeout(timer)}
}
async function callAssistant(body){
 const s=authSession();if(!s?.access_token)throw new Error('Sua sessão expirou. Entre novamente.');
 const r=await assistantRequest('/functions/v1/controla-ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 let data={};try{data=await r.json()}catch{}
 if(!r.ok)throw new Error(data?.message||data?.detail||data?.error||`Falha na IA (${r.status})`);return data;
}
function setBusy(root,busy){state.busy=busy;const btn=sendBtn(root),input=inputEl(root);if(btn){btn.disabled=busy;btn.dataset.oldText=btn.dataset.oldText||btn.textContent;btn.textContent=busy?'Analisando…':(btn.dataset.oldText||'Enviar')}if(input)input.disabled=busy;$$('.ai360-tool',root).forEach(b=>b.disabled=busy)}
async function analyze(root){
 if(state.busy)return;
 const input=inputEl(root);const q=(input?.value||'').trim();if(!q&&!state.file)return;
 setBusy(root,true);
 try{
   if(state.file&&!state.sourceAttachment){addMessage(root,'Arquivando a foto original…','ai');state.sourceAttachment=await uploadOriginal(state.file)}
   const userText=q||(state.file?'Analise esta foto e faça o lançamento correspondente.':'');
   addMessage(root,userText,'user',state.file?`📎 ${state.file.name}`:'');if(input)input.value='';
   const body={mode:'analyze',company_id:company(),question:userText,source_attachment:state.sourceAttachment};
   if(state.conversationId)body.conversation_id=state.conversationId;
   if(state.imageDataUrl)body.image_data_url=state.imageDataUrl;
   const farmAnswer=!state.file&&window.C360FarmSearch?await window.C360FarmSearch.answer(userText):null;
   if(farmAnswer){addMessage(root,farmAnswer,'ai','Localização do cadastro da empresa');renderActions(root,[]);return}
   const data=await callAssistant(body);if(data.conversation_id)state.conversationId=data.conversation_id;
   addMessage(root,data.answer||data.message||'Solicitação analisada.','ai');renderActions(root,data.actions||[]);
   state.file=null;state.imageDataUrl=null;state.sourceAttachment=null;renderAttachment(root);
 }catch(e){addMessage(root,e?.message||'Falha ao consultar o Assistente 360.','ai');}
 finally{setBusy(root,false)}
}
async function confirmAction(root,a,card){
 const btn=$('.ai360-confirm',card);if(!a.id||btn?.disabled)return;
 const old=btn.textContent;btn.disabled=true;btn.textContent='Salvando…';
 try{
   const data=await callAssistant({mode:'execute',company_id:company(),action_request_id:a.id});
   card.classList.add('saved');const box=$('.ai360-action-buttons',card);if(box)box.innerHTML='<span class="ai360-saved">✓ Salvo no Comando 360</span>';
   addMessage(root,data?.result?.message||'Lançamento salvo com sucesso.','ai');
   document.dispatchEvent(new CustomEvent('c360:assistant-action-executed',{detail:{action:a,result:data?.result}}));
   ['loadDashboard','loadPoultryDashboard','loadFuel','loadVehicles','loadMaintenances'].forEach(name=>{const fn=globalFn(name);if(typeof fn==='function'){try{Promise.resolve(fn()).catch(e=>console.warn('Atualização após lançamento da IA',e?.message||e))}catch(e){console.warn('Atualização após lançamento da IA',e?.message||e)}}});
 }catch(e){btn.disabled=false;btn.textContent=old;addMessage(root,e?.message||'Não consegui salvar o lançamento.','ai')}
}
function tools(root){
 let bar=$('.ai360-tools',root);if(bar)return bar;
 bar=document.createElement('div');bar.className='ai360-tools';bar.innerHTML='<button type="button" class="btn soft ai360-tool ai360-camera">📷 Câmera</button><button type="button" class="btn soft ai360-tool ai360-gallery">🖼️ Galeria/arquivo</button><button type="button" class="btn soft ai360-tool ai360-voice">🎤 Falar</button><span class="ai360-tools-hint">Tire uma foto ou escolha uma imagem do celular/WhatsApp. Depois diga o que devo fazer.</span>';
 const input=inputEl(root),composer=input?.parentElement||null;
 if(composer&&composer!==root)composer.insertAdjacentElement('beforebegin',bar);else (chatBox(root)?.parentElement||root).appendChild(bar);
 $('.ai360-camera',bar)?.addEventListener('click',()=>selectPhoto(root,'camera'));
 $('.ai360-gallery',bar)?.addEventListener('click',()=>selectPhoto(root,'gallery'));
 const voice=$('.ai360-voice',bar);voice?.addEventListener('click',()=>startVoice(root,voice));return bar;
}
function install(root){
 if(!root||state.installed.has(root))return;state.installed.add(root);root.classList.add('assistant360-ready');
 const card=$('.card',root)||root;
 const h=$('h1',root)||$('h3',root);
 const intro=$('.muted',root)||$('p',root);
 if(h){
   h.textContent='Comando IA';
   const head=document.createElement('div');head.className='ai360-shell-head';
   const brand=document.createElement('div');brand.className='ai360-brand';
   brand.innerHTML='<div class="ai360-brand-mark">IA</div><div class="ai360-brand-copy"><h3>Comando IA</h3><p>Seu assistente dentro do Comando 360</p></div>';
   head.appendChild(brand);h.replaceWith(head);
 }
 if(intro)intro.textContent='Converse com o Comando 360, envie fotos e documentos e peça análises da operação. Qualquer lançamento é mostrado para conferência antes de ser salvo.';
 if(card&&!$('.ai360-capabilities',card)){
   const caps=document.createElement('div');caps.className='ai360-capabilities';caps.innerHTML='<span>📠 Ler FAX</span><span>⛽ Abastecimento</span><span>🔧 Oficina 360</span><span>🧽 Lavador 360</span><span>🐔 Apanhas</span><span>🚚 Frota</span><span>📊 Análises</span>';
   const bar=$('.ai360-tools',root);if(bar)bar.insertAdjacentElement('beforebegin',caps);else card.prepend(caps);
 }
 tools(root);attachmentHost(root);actionsHost(root);
 const btn=sendBtn(root);if(btn){btn.removeAttribute('onclick');btn.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();analyze(root)},true)}
 const input=inputEl(root);if(input){input.placeholder='Pergunte ao Comando IA ou diga o que deseja fazer…';input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();e.stopImmediatePropagation();analyze(root)}},true)}
 const box=chatBox(root);if(box&&!box.dataset.ai360Intro){box.dataset.ai360Intro='1';addMessage(root,'Olá! Eu sou o Comando IA. Posso analisar sua operação, ler um FAX ou foto, ajudar com a Oficina 360, Lavador 360, frota, abastecimento, manutenção e apanhas. Quando uma solicitação alterar dados, eu mostro uma prévia antes de salvar.','ai')}
}
function openIaScreen(){
 const candidates=['showScreen','openScreen','navigateTo','goToScreen'];for(const name of candidates){const fn=globalFn(name);if(fn){try{fn('ia');return}catch{}}}
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
   if(await prepareImage(root,file))addMessage(root,'Imagem recebida do WhatsApp/compartilhamento. Agora diga o que você quer que eu faça com ela.','ai',`📎 ${file.name}`);
   await cache.delete(SHARE_KEY);
 }catch(e){notify(e?.message||'Não consegui carregar a imagem compartilhada.','error')}
 finally{clearShareQuery()}
}
function scan(){const root=activeRoot();if(root)install(root)}
document.addEventListener('c360:screen-changed',e=>{const s=String(e?.detail?.screen||e?.detail?.id||'').toLowerCase();if(!s||s.includes('ia'))setTimeout(scan,0)});
document.addEventListener('c360:lazy-feature-ready',()=>{scan();setTimeout(hydrateSharedImage,0)});
new MutationObserver(scan).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden']});
scan();setTimeout(hydrateSharedImage,0);
})();
