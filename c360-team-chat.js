(()=>{
'use strict';

const CHAT_VERSION='2026.09.12-c1';
const POLL_MS=8000;
const state={open:false,teamId:null,teams:[],messages:[],settings:null,poll:null,installed:false};
const q=(s,r=document)=>r.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const online=()=>navigator.onLine!==false;
const nowIso=()=>new Date().toISOString();
const uuid=()=>globalThis.crypto?.randomUUID?.()||('c360-'+Date.now()+'-'+Math.random().toString(36).slice(2));
const queueKey=()=>`c360_team_chat_queue_v1_${String(companyId||'none')}`;
const cacheKey=team=>`c360_team_chat_cache_v1_${String(companyId||'none')}_${String(team||'none')}`;
function readJson(key,fallback){try{return JSON.parse(localStorage.getItem(key)||'')||fallback}catch{return fallback}}
function writeJson(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch(_){}}
function queue(){return readJson(queueKey(),[])}
function setQueue(rows){writeJson(queueKey(),rows.slice(-200))}
function saveCache(team,rows){writeJson(cacheKey(team),rows.slice(-200))}
function loadCache(team){return readJson(cacheKey(team),[])}
function sessionUser(){try{return session()?.user||null}catch{return null}}
function senderName(kind){
  if(kind==='team') return (typeof deviceTeam!=='undefined'&&deviceTeam?.name)?`${deviceTeam.name} • Encarregado`:'Equipe • Encarregado';
  const u=sessionUser();return u?.user_metadata?.full_name||u?.email||'Administração';
}
function formatTime(v){try{return new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(v))}catch{return ''}}
function installStyles(){
 if(q('#c360ChatStyles'))return;
 const s=document.createElement('style');s.id='c360ChatStyles';s.textContent=`
 .c360-chat-fab{position:fixed;right:18px;bottom:18px;z-index:80;border:0;border-radius:999px;background:#1976d2;color:#fff;min-width:58px;height:58px;padding:0 18px;font-weight:900;box-shadow:0 10px 28px rgba(25,118,210,.32);cursor:pointer}.c360-chat-fab span{margin-left:6px}
 .c360-chat-overlay{position:fixed;inset:0;z-index:100000;background:rgba(5,12,24,.66);display:none;padding:16px}.c360-chat-overlay.open{display:flex;align-items:center;justify-content:center}
 .c360-chat-shell{width:min(980px,100%);height:min(760px,100%);background:var(--card,#fff);color:var(--ink,#0f172a);border-radius:20px;overflow:hidden;display:grid;grid-template-columns:260px minmax(0,1fr);box-shadow:0 24px 80px rgba(0,0,0,.35);border:1px solid rgba(148,163,184,.22)}
 .c360-chat-side{border-right:1px solid #e2e8f0;padding:14px;background:#f8fafc;overflow:auto}.c360-chat-side h3{margin:4px 0 10px}.c360-chat-team{width:100%;border:1px solid #e2e8f0;border-radius:12px;background:#fff;padding:11px;text-align:left;margin:5px 0;cursor:pointer;font-weight:800}.c360-chat-team.active{background:#eaf3ff;border-color:#98c5f7;color:#1556a8}.c360-chat-team small{display:block;color:#64748b;margin-top:3px;font-weight:600}
 .c360-chat-main{display:grid;grid-template-rows:auto minmax(0,1fr) auto;background:#fff}.c360-chat-head{display:flex;gap:10px;align-items:center;padding:13px 15px;border-bottom:1px solid #e2e8f0}.c360-chat-head .grow{flex:1}.c360-chat-head h3{margin:0}.c360-chat-head small{color:#64748b}.c360-chat-close{border:0;background:#eef2f7;border-radius:10px;width:38px;height:38px;font-size:22px;cursor:pointer}
 .c360-chat-messages{overflow:auto;padding:16px;background:#f6f8fb}.c360-msg{display:flex;margin:8px 0}.c360-msg.mine{justify-content:flex-end}.c360-msg-bubble{max-width:min(78%,580px);background:#fff;border:1px solid #e2e8f0;border-radius:15px;padding:10px 12px;box-shadow:0 2px 8px rgba(15,23,42,.035)}.c360-msg.mine .c360-msg-bubble{background:#eaf3ff;border-color:#cfe2fb}.c360-msg-body{white-space:pre-wrap;word-break:break-word;line-height:1.38}.c360-msg-meta{margin-top:5px;font-size:10px;color:#64748b;display:flex;gap:6px;align-items:center}.c360-msg-pending{color:#a16207;font-weight:800}
 .c360-chat-compose{padding:12px;border-top:1px solid #e2e8f0;background:#fff}.c360-chat-compose textarea{width:100%;min-height:74px;max-height:150px;resize:vertical;border:1px solid #cbd5e1;border-radius:12px;padding:11px;font:inherit;background:#fff;color:inherit}.c360-chat-actions{display:flex;gap:8px;align-items:center;margin-top:8px;flex-wrap:wrap}.c360-chat-status{font-size:11px;color:#64748b;flex:1}.c360-chat-sms{background:#fff4dc;border:1px solid #f2cc7b;color:#7a4a00;border-radius:10px;padding:10px 12px;font-weight:850;cursor:pointer}.c360-chat-send{background:#1976d2;color:#fff;border:0;border-radius:10px;padding:10px 16px;font-weight:900;cursor:pointer}
 .c360-chat-settings{margin-top:16px;padding-top:14px;border-top:1px solid #e2e8f0}.c360-chat-settings label{font-size:10px;font-weight:900;color:#64748b}.c360-chat-settings input{width:100%;height:40px;border:1px solid #cbd5e1;border-radius:10px;padding:0 10px;margin:6px 0}.c360-chat-settings button{width:100%}
 .c360-chat-empty{padding:28px;text-align:center;color:#94a3b8}.c360-chat-offline{display:inline-flex;padding:4px 8px;border-radius:999px;background:#fff3cd;color:#8a5b00;font-size:10px;font-weight:850}.c360-chat-online{display:inline-flex;padding:4px 8px;border-radius:999px;background:#dcfce7;color:#166534;font-size:10px;font-weight:850}
 .team-chat-tile{position:relative}.team-chat-tile .chat-dot{position:absolute;right:10px;top:10px;width:10px;height:10px;border-radius:50%;background:#ef4444;display:none}
 body.darkmode .c360-chat-shell,body.darkmode .c360-chat-main,body.darkmode .c360-chat-compose{background:#0f1b2b;color:#eaf2fb}body.darkmode .c360-chat-side{background:#0c1726;border-color:#2a3d53}body.darkmode .c360-chat-team{background:#101c2e;border-color:#2a3d53;color:#dce8f7}body.darkmode .c360-chat-team.active{background:#15365e;border-color:#2f6cac}body.darkmode .c360-chat-messages{background:#0b1523}body.darkmode .c360-msg-bubble{background:#101c2e;border-color:#2a3d53}body.darkmode .c360-msg.mine .c360-msg-bubble{background:#15365e;border-color:#2f6cac}body.darkmode .c360-chat-compose textarea,body.darkmode .c360-chat-settings input{background:#0b1523;border-color:#32465f;color:#eaf2fb}
 @media(max-width:760px){.c360-chat-overlay{padding:0}.c360-chat-shell{width:100%;height:100%;border-radius:0;grid-template-columns:1fr}.c360-chat-side{display:none}.c360-chat-shell.admin .c360-chat-side{display:block;position:absolute;z-index:3;left:0;top:0;bottom:0;width:min(84vw,320px);transform:translateX(-105%);transition:.18s}.c360-chat-shell.admin.side-open .c360-chat-side{transform:translateX(0)}.c360-chat-msgs-menu{display:inline-flex!important}.c360-msg-bubble{max-width:88%}.c360-chat-fab span{display:none}.c360-chat-fab{width:58px;padding:0}}
 `;document.head.appendChild(s);
}
function ensureUi(){
 installStyles();if(q('#c360ChatOverlay'))return;
 const isDevice=typeof deviceMode!=='undefined'&&deviceMode;
 const overlay=document.createElement('div');overlay.id='c360ChatOverlay';overlay.className='c360-chat-overlay';overlay.innerHTML=`<div class="c360-chat-shell ${isDevice?'device':'admin'}" id="c360ChatShell"><aside class="c360-chat-side" id="c360ChatSide"><h3>💬 Conversas</h3><div id="c360ChatTeams"></div><div class="c360-chat-settings" id="c360ChatSettings" ${isDevice?'hidden':''}><label>NÚMERO PARA SMS DE EMERGÊNCIA</label><input id="c360ChatPhone" type="tel" placeholder="(15) 99999-9999"><button class="btn soft" id="c360SaveChatPhone" type="button">Salvar número</button><div class="muted" id="c360ChatSettingsMsg" style="margin-top:6px"></div></div></aside><main class="c360-chat-main"><div class="c360-chat-head"><button class="btn soft c360-chat-msgs-menu" id="c360ChatMenu" type="button" style="display:none">☰</button><div class="grow"><h3 id="c360ChatTitle">Mensagens</h3><small id="c360ChatSub">Equipe ↔ Administração</small></div><span id="c360ChatNet" class="c360-chat-online">Online</span><button class="c360-chat-close" id="c360ChatClose" type="button">×</button></div><div class="c360-chat-messages" id="c360ChatMessages"><div class="c360-chat-empty">Carregando conversa...</div></div><div class="c360-chat-compose"><textarea id="c360ChatText" maxlength="4000" placeholder="Escreva uma mensagem..."></textarea><div class="c360-chat-actions"><div class="c360-chat-status" id="c360ChatStatus">Mensagens offline serão enviadas quando a internet voltar.</div><button class="c360-chat-sms" id="c360ChatSms" type="button">📱 SMS emergência</button><button class="c360-chat-send" id="c360ChatSend" type="button">Enviar</button></div></div></main></div>`;document.body.appendChild(overlay);
 q('#c360ChatClose').onclick=closeChat;q('#c360ChatSend').onclick=sendMessage;q('#c360ChatSms').onclick=openSms;q('#c360ChatMenu').onclick=()=>q('#c360ChatShell').classList.toggle('side-open');
 overlay.addEventListener('click',e=>{if(e.target===overlay)closeChat()});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&state.open)closeChat()});
 q('#c360ChatText').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage()}});
 if(!isDevice)q('#c360SaveChatPhone').onclick=savePhone;
}
function ensureEntryPoints(){
 const isDevice=typeof deviceMode!=='undefined'&&deviceMode;
 if(isDevice){
   const grid=q('.team-home-grid');if(grid&&!q('#c360TeamChatTile')){const b=document.createElement('button');b.id='c360TeamChatTile';b.className='team-tile team-chat-tile';b.type='button';b.innerHTML='<span class="chat-dot"></span><span class="ico">💬</span><strong>Mensagens</strong><small>Falar com a administração, mesmo quando estiver offline.</small>';b.onclick=openChat;grid.appendChild(b)}
 }else if(!q('#c360ChatFab')){const b=document.createElement('button');b.id='c360ChatFab';b.className='c360-chat-fab';b.type='button';b.innerHTML='💬 <span>Chat</span>';b.onclick=openChat;document.body.appendChild(b)}
}
async function loadTeams(){
 if(typeof deviceMode!=='undefined'&&deviceMode){state.teams=deviceTeam?[deviceTeam]:[];state.teamId=deviceTeam?.id||null;return}
 state.teams=await rest('v2_teams','select=id,name,status&company_id=eq.'+companyId+'&status=eq.active&order=name.asc')||[];
 if(!state.teamId&&state.teams[0])state.teamId=state.teams[0].id;
 renderTeams();
}
function renderTeams(){const host=q('#c360ChatTeams');if(!host)return;host.innerHTML=state.teams.map(t=>`<button class="c360-chat-team ${t.id===state.teamId?'active':''}" type="button" data-chat-team="${esc(t.id)}">${esc(t.name||'Equipe')}<small>Abrir conversa</small></button>`).join('')||'<div class="c360-chat-empty">Nenhuma equipe ativa.</div>';host.querySelectorAll('[data-chat-team]').forEach(b=>b.onclick=async()=>{state.teamId=b.dataset.chatTeam;renderTeams();q('#c360ChatShell')?.classList.remove('side-open');await refreshMessages(true)})}
async function loadSettings(){
 try{const rows=await rest('v2_team_chat_settings','select=company_id,emergency_phone,metadata&company_id=eq.'+companyId+'&limit=1')||[];state.settings=rows[0]||{company_id:companyId,emergency_phone:''};const input=q('#c360ChatPhone');if(input)input.value=state.settings.emergency_phone||''}catch(_){state.settings={company_id:companyId,emergency_phone:''}}
}
async function savePhone(){
 const msg=q('#c360ChatSettingsMsg'),phone=(q('#c360ChatPhone')?.value||'').trim();if(msg)msg.textContent='Salvando...';
 try{const existing=await rest('v2_team_chat_settings','select=company_id&company_id=eq.'+companyId+'&limit=1')||[];if(existing.length)await rest('v2_team_chat_settings','company_id=eq.'+companyId,'PATCH',{emergency_phone:phone,updated_at:nowIso()});else await rest('v2_team_chat_settings','', 'POST',{company_id:companyId,emergency_phone:phone,metadata:{source:'comando360_chat'},updated_at:nowIso()});state.settings={...(state.settings||{}),emergency_phone:phone};if(msg)msg.textContent='Número salvo.'}catch(e){if(msg)msg.textContent='Erro: '+(e?.message||e)}
}
function pendingForTeam(team){return queue().filter(x=>x.team_id===team)}
function mergedMessages(){
 const server=state.messages||[],pending=pendingForTeam(state.teamId).map(x=>({...x,id:x.client_message_id,pending:true}));
 const ids=new Set(server.map(x=>x.client_message_id));return [...server,...pending.filter(x=>!ids.has(x.client_message_id))].sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));
}
function renderMessages(){
 const host=q('#c360ChatMessages');if(!host)return;const rows=mergedMessages();const isDevice=typeof deviceMode!=='undefined'&&deviceMode;const mineKind=isDevice?'team':'admin';const team=state.teams.find(t=>t.id===state.teamId)||deviceTeam;
 q('#c360ChatTitle').textContent=isDevice?'Administração':(team?.name||'Equipe');q('#c360ChatSub').textContent=isDevice?(deviceTeam?.name||'Celular da equipe'):'Equipe ↔ Administração';
 if(!rows.length){host.innerHTML='<div class="c360-chat-empty">Nenhuma mensagem ainda.<br>Você pode iniciar a conversa abaixo.</div>';return}
 host.innerHTML=rows.map(m=>`<div class="c360-msg ${m.sender_kind===mineKind?'mine':''}"><div class="c360-msg-bubble"><div class="c360-msg-body">${esc(m.body)}</div><div class="c360-msg-meta"><span>${esc(m.sender_name|| (m.sender_kind==='team'?'Equipe':'Administração'))}</span><span>•</span><span>${esc(formatTime(m.created_at))}</span>${m.pending?'<span>•</span><span class="c360-msg-pending">na fila</span>':''}</div></div></div>`).join('');host.scrollTop=host.scrollHeight;
}
async function refreshMessages(scroll=false){
 if(!state.teamId)return;updateNet();
 if(!online()){state.messages=loadCache(state.teamId);renderMessages();return}
 try{await flushQueue();state.messages=await rest('v2_team_messages','select=id,company_id,team_id,sender_kind,sender_user_id,sender_name,body,client_message_id,metadata,created_at&company_id=eq.'+companyId+'&team_id=eq.'+encodeURIComponent(state.teamId)+'&order=created_at.asc&limit=200')||[];saveCache(state.teamId,state.messages);renderMessages();if(scroll)q('#c360ChatMessages').scrollTop=q('#c360ChatMessages').scrollHeight}catch(e){state.messages=loadCache(state.teamId);renderMessages();setStatus('Sem conexão com o servidor • mostrando mensagens salvas')}
}
async function currentUserId(){const s=sessionUser();if(s?.id)return s.id;if(online()&&typeof getUser==='function'){try{return (await getUser())?.id||null}catch(_){}}return null}
async function sendMessage(){
 const ta=q('#c360ChatText'),body=(ta?.value||'').trim();if(!body||!state.teamId)return;const kind=(typeof deviceMode!=='undefined'&&deviceMode)?'team':'admin';const uid=await currentUserId();if(!uid){setStatus('Não foi possível identificar a sessão deste aparelho.');return}
 const item={company_id:companyId,team_id:state.teamId,sender_kind:kind,sender_user_id:uid,sender_name:senderName(kind),body,client_message_id:uuid(),metadata:{source:'comando360_chat',chat_version:CHAT_VERSION},created_at:nowIso()};ta.value='';
 if(online()){
   try{await rest('v2_team_messages','', 'POST',item);setStatus('Mensagem enviada.');await refreshMessages(true);return}catch(_){ }
 }
 const rows=queue();rows.push(item);setQueue(rows);state.messages=loadCache(state.teamId);renderMessages();setStatus('Sem internet • mensagem salva e aguardando envio.');
}
async function flushQueue(){
 if(!online())return;let rows=queue();if(!rows.length)return;const keep=[];
 for(const item of rows){
   try{await rest('v2_team_messages','', 'POST',item)}catch(e){
     try{const found=await rest('v2_team_messages','select=id&company_id=eq.'+companyId+'&client_message_id=eq.'+encodeURIComponent(item.client_message_id)+'&limit=1')||[];if(!found.length)keep.push(item)}catch(_){keep.push(item)}
   }
 }
 setQueue(keep);if(rows.length!==keep.length)setStatus(`${rows.length-keep.length} mensagem(ns) sincronizada(s).`);
}
function updateNet(){const el=q('#c360ChatNet');if(!el)return;el.textContent=online()?'Online':'Offline';el.className=online()?'c360-chat-online':'c360-chat-offline'}
function setStatus(t){const el=q('#c360ChatStatus');if(el)el.textContent=t}
function openSms(){
 const phone=(state.settings?.emergency_phone||'').trim();if(!phone){setStatus('O número de emergência ainda não foi configurado pela administração.');return}
 const typed=(q('#c360ChatText')?.value||'').trim();const team=state.teams.find(t=>t.id===state.teamId)||deviceTeam;const body=typed||`Comando 360 — ${team?.name||'Equipe'} precisa falar com a administração.`;location.href='sms:'+phone.replace(/[^\d+]/g,'')+'?body='+encodeURIComponent(body)
}
async function openChat(){
 ensureUi();state.open=true;q('#c360ChatOverlay').classList.add('open');document.body.style.overflow='hidden';updateNet();
 await loadTeams();await loadSettings();if(state.teamId){state.messages=loadCache(state.teamId);renderMessages();await refreshMessages(true)}
 if(state.poll)clearInterval(state.poll);state.poll=setInterval(()=>{if(state.open)refreshMessages(false)},POLL_MS);
}
function closeChat(){state.open=false;q('#c360ChatOverlay')?.classList.remove('open');q('#c360ChatShell')?.classList.remove('side-open');document.body.style.overflow='';if(state.poll){clearInterval(state.poll);state.poll=null}}
async function onOnline(){updateNet();await flushQueue();if(state.open)await refreshMessages(false)}
async function install(){
 if(state.installed)return;for(let i=0;i<80;i++){let ready=false;try{ready=typeof companyId!=='undefined'&&!!companyId&&typeof rest==='function'}catch(_){ }if(ready)break;await new Promise(r=>setTimeout(r,250))}
 let ready=false;try{ready=typeof companyId!=='undefined'&&!!companyId&&typeof rest==='function'}catch(_){ }if(!ready)return;state.installed=true;ensureUi();ensureEntryPoints();setInterval(ensureEntryPoints,2500);window.addEventListener('online',onOnline);window.addEventListener('offline',updateNet);if(online())flushQueue().catch(()=>{});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,0));else setTimeout(install,0);
})();