import {PROTOCOLS,PIDS,hex,decodeObd,decodeJ1939,decodeUds,validateSample} from './protocols.mjs';
import {EcuSimulator,PROFILES,SCENARIOS} from './simulator.mjs';
import {RecordingStore,MAX_SAMPLES,parseRecording,recordingCsv,MAX_IMPORT_BYTES,newRecordingId} from './recordings.mjs';
import {snapshotContext,localGuide,ScanAssistantClient} from './assistant.mjs';

const $ = id => document.getElementById(id);
const nf = new Intl.NumberFormat('pt-BR',{maximumFractionDigits:1});
const time = at => new Date(at).toLocaleTimeString('pt-BR',{timeZone:'America/Sao_Paulo'});
const uid = newRecordingId;
let simulator=new EcuSimulator(),recording,store,activeView='live',running=false,viewingArchive=false;
let binding=null,auth=null,cloud=null,conversationId=null,conversations=[],epoch=0,aiAbort=null,aiBusy=false,dirty=false,pendingTurn=null;
let toastTimer,autosaveTimer,authSubscription,revision=0;

function toast(message) { $('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),4500); }
function fail(error) {toast(error.message||'Não foi possível concluir esta operação.');}
function freshRecording() {return {schema:'o360.scan.recording.v1',id:uid(),profile:simulator.profile,simulated:true,started_at:new Date().toISOString(),samples:[],events:[]};}
function event(description) {recording.events.push({at:new Date().toISOString(),description,simulated:true});recording.events=recording.events.slice(-200);revision++;dirty=true;renderEvents();}
function switchView(view) {
  if (!$('view-'+view)) return;activeView=view;
  document.querySelectorAll('.view').forEach(el=>el.classList.toggle('active',el.id==='view-'+view));
  document.querySelectorAll('[data-view]').forEach(el=>{el.classList.toggle('active',el.dataset.view===view);el.setAttribute('aria-current',el.dataset.view===view?'page':'false');});
  $('view-title').textContent={live:'Dados ao vivo',faults:'Falhas e ensaios',recordings:'Gravações',protocols:'Protocolos',assistant:'Assistente de diagnóstico',hardware:'Scanner profissional'}[view];
  if(view==='live') drawChart();
  if(view==='recordings') renderRecordings().catch(fail);
}
function stop() {simulator.stop();running=false;$('start').disabled=!PROFILES[simulator.profile].electronic;$('stop').disabled=true;$('connection-state').className='connection';$('connection-state').textContent=viewingArchive?'Gravação histórica':'Simulador parado';}
async function save() {if(!recording.samples.length&&!recording.events.length||viewingArchive)return;const r=recording,version=revision;await store.save(r);if(recording===r&&revision===version)dirty=false;}
async function reset(profile=simulator.profile) {
  stop();await save();simulator.configure(profile);viewingArchive=false;recording=freshRecording();dirty=false;updateProfile();render();
}
function resetChat() {epoch++;aiAbort?.abort();aiAbort=null;aiBusy=false;pendingTurn=null;conversationId=null;conversations=[];$('chat-log').replaceChildren();$('chat-input').value='';renderConversations();setAiBusy(false);addMessage('Escolha um sinal ou me conte o que está investigando. Todas as leituras desta área são exercícios de laboratório.','assistant','ROTEIRO LOCAL · SEM MODELO DE IA');}
function inferProfile(vehicle) {
  const text=[vehicle.description,vehicle.model].join(' ').toLowerCase();
  if(text.includes('comil')) return 'comil';if(text.includes('sprinter'))return 'sprinter';if(text.includes('volare'))return 'volare';if(/608/.test(text))return 'mercedes608';return null;
}
function activeBinding() {return binding&&inferProfile(binding)===simulator.profile?binding:null;}
function updateProfile() {
  const p=PROFILES[simulator.profile];$('profile').value=simulator.profile;$('profile-note').textContent=p.note;
  $('profile-protocol').textContent=PROTOCOLS[p.protocol].name;$('transport-label').textContent=p.electronic?'ECU virtual':'Entrada manual';
  $('manual-panel').hidden=p.electronic;$('scenario').disabled=!p.electronic;$('throttle').disabled=!p.electronic;$('start').disabled=!p.electronic;
  $('chart-empty').textContent=p.electronic?'Inicie o simulador para acompanhar o sinal.':'Registre um exercício manual para acompanhar o sinal.';
  $('run-actuator').disabled=!p.electronic;$('reset-faults').disabled=!p.electronic;$('origin').textContent=p.electronic?'Simulador de ECU':'Exercício manual';
  $('scenario').value=simulator.scenario;$('throttle').value=simulator.throttle;$('throttle-value').textContent=simulator.throttle+'%';
  const b=activeBinding();$('vehicle-scope').textContent=b?`${b.description} · ${b.plate} · sessão do Oficina 360`:'Perfil de demonstração · sem vínculo com a frota';
  cloud=b&&auth?new ScanAssistantClient({client:auth.client,apiBase:window.SUPABASE_URL,apiKey:window.SUPABASE_PUBLISHABLE_KEY,vehicle:b,user:auth.user}):null;
  $('ai-mode').textContent=cloud?'OpenAI · sessão do Oficina 360':'Roteiro local por regras';
  $('ai-status').textContent=cloud?'Integração OpenAI existente. As leituras enviadas continuam identificadas como simulação. Histórico separado por conversa e condução.':'O roteiro local funciona sem internet. Para conversar com a OpenAI, abra o Scan Pro pela condução no Oficina 360.';
}
function receive(sample) {
  if(viewingArchive) return;
  sample=validateSample(sample);recording.samples.push(sample);revision++;dirty=true;
  if(recording.samples.length>=MAX_SAMPLES){stop();event('Limite de 600 amostras atingido. Inicie uma nova sessão para continuar.');toast('Gravação completa: 600 amostras.');}
  $('connection-state').textContent=sample.state==='timeout'?'Sem comunicação virtual':running?'Simulação em execução':'Exercício manual';
  $('connection-state').classList.toggle('running',running&&sample.state==='streaming');render();
}
const metricKeys=['engine_rpm','coolant_temp_c','battery_voltage','rail_pressure_actual_bar'];
function buildMetrics() {
  $('metrics').replaceChildren();for(const key of metricKeys) {
    const card=document.createElement('article');card.className='metric';card.innerHTML='<small></small><strong><b></b><span></span></strong><div class="metric-bottom"></div>';card.querySelector('small').textContent=PIDS[key].label.toUpperCase();card.querySelector('span').textContent=PIDS[key].unit;card.dataset.pid=key;$('metrics').appendChild(card);
  }
}
function render() {
  const s=recording.samples.at(-1),p=s?.pids||{};
  for(const card of $('metrics').children) {const value=p[card.dataset.pid];card.querySelector('b').textContent=value?nf.format(value.value):'—';card.querySelector('.metric-bottom').textContent=value?(value.quality==='manual'?'ENTRADA MANUAL · LAB':value.source==='didactic_model'?'MODELO DIDÁTICO · SEM PID OEM':'DECODIFICADO · QUADRO SIMULADO'):!PROFILES[simulator.profile].electronic&&card.dataset.pid.startsWith('rail_')?'NÃO APLICÁVEL A ESTE PERFIL':s?.state==='timeout'?'SEM LEITURA ATUAL':'AGUARDANDO LEITURA';}
  $('sample-count').textContent=recording.samples.length+' / '+MAX_SAMPLES;$('last-sample').textContent=s?time(s.recorded_at):'Aguardando';
  const raw=[];for(const f of s?.frames||[]) raw.push(`${f.protocol.toUpperCase()}  ${f.id===null?'':f.id.toString(16).toUpperCase()}  ${hex(f.data)}`);
  for(const [key,value] of Object.entries(p)) if(value.source==='didactic_model')raw.push(`${key}: ${value.value} ${value.unit} [modelo didático; sem quadro OEM]`);
  $('raw-frames').textContent=raw.join('\n')||'Nenhum quadro recebido. Entradas manuais não geram quadros de ECU.';
  renderFaults();renderEvents();drawChart();
}
function renderFaults() {
  const s=recording.samples.at(-1),host=$('fault-list');host.replaceChildren();
  if(!s?.dtcs.length){const e=document.createElement('p');e.className='empty';e.textContent=s?.state==='timeout'?'Sem resposta atual. O estado das falhas é desconhecido.':PROFILES[simulator.profile].electronic?'Nenhum código no último quadro simulado.':'Sem ECU de motor identificada neste perfil. Diagnóstico por medições e sintomas.';host.appendChild(e);return;}
  const descriptions={P0299:'Cenário didático de pressão de admissão abaixo do esperado.',P0087:'Cenário didático de pressão de combustível abaixo do esperado.',P0217:'Cenário didático de temperatura elevada.'};
  for(const d of s.dtcs){const e=document.createElement('div');e.className='fault';const b=document.createElement('b');b.textContent=d.code||`SPN ${d.spn} / FMI ${d.fmi}`;const p=document.createElement('p');p.textContent=descriptions[d.code]||'Código simulado do monitoramento. Não confirma a causa nem condena um componente.';e.append(b,p);host.append(e);}
}
function renderEvents() {
  $('event-list').replaceChildren();if(!recording.events.length){const li=document.createElement('li');li.textContent='Marque uma evidência ou execute um exercício para criar o histórico.';$('event-list').append(li);}
  for(const e of recording.events.slice(-30).reverse()){const li=document.createElement('li'),t=document.createElement('time');t.textContent=time(e.at);li.append(t,document.createTextNode(e.description));$('event-list').append(li);}
}
function drawChart() {
  if(activeView!=='live')return;const canvas=$('signal-chart'),box=canvas.getBoundingClientRect();if(!box.width)return;
  const ratio=devicePixelRatio||1;canvas.width=box.width*ratio;canvas.height=box.height*ratio;const c=canvas.getContext('2d');c.scale(ratio,ratio);
  const key=$('chart-pid').value,points=recording.samples.slice(-60).map(s=>({at:s.recorded_at,value:s.pids[key]?.value})),values=points.map(p=>p.value).filter(Number.isFinite);
  $('chart-empty').hidden=!!values.length;const W=box.width,H=box.height,left=45,right=14,top=14,bottom=30,w=W-left-right,h=H-top-bottom;
  c.font='10px system-ui';c.textBaseline='middle';c.fillStyle='#8092ad';c.strokeStyle='#2b3545';c.lineWidth=.7;
  let low=values.length?Math.min(...values):0,high=values.length?Math.max(...values):100;const padding=Math.max((high-low)*.25,key==='engine_rpm'?100:key==='battery_voltage'?.5:5);low-=padding;high+=padding;if(key!=='coolant_temp_c')low=Math.max(0,low);
  for(let i=0;i<5;i++){const y=top+i*h/4;c.beginPath();c.moveTo(left,y);c.lineTo(W-right,y);c.stroke();c.fillText(nf.format(high-(high-low)*i/4),0,y);}
  if(!values.length)return;
  const px=i=>left+i*w/Math.max(points.length-1,1),py=v=>top+(high-v)/(high-low)*h;
  c.beginPath();let started=false;for(let i=0;i<points.length;i++){const v=points[i].value;if(!Number.isFinite(v)){started=false;continue;}if(!started){c.moveTo(px(i),py(v));started=true;}else c.lineTo(px(i),py(v));}
  c.strokeStyle='#e7bb70';c.lineWidth=2;c.stroke();const last=points.at(-1);if(Number.isFinite(last?.value)){c.beginPath();c.arc(px(points.length-1),py(last.value),3.2,0,Math.PI*2);c.fillStyle='#e7bb70';c.fill();}
  c.fillStyle='#8092ad';c.textBaseline='alphabetic';c.fillText(time(points[0].at),left,H-5);c.textAlign='right';c.fillText(time(points.at(-1).at),W-right,H-5);$('chart-range').textContent=points.length+' amostras · '+PIDS[key].unit;
}
async function renderRecordings() {
  const rows=await store.all();$('recording-list').replaceChildren();if(!rows.length){const e=document.createElement('p');e.className='empty';e.textContent='Suas gravações do laboratório aparecerão aqui.';$('recording-list').append(e);}
  for(const r of rows){const row=document.createElement('div');row.className='recording-row';const info=document.createElement('div'),name=document.createElement('strong'),meta=document.createElement('small'),button=document.createElement('button');name.textContent=PROFILES[r.profile]?.name||r.profile;meta.textContent=`SIMULAÇÃO · ${r.samples.length} amostras · ${new Date(r.started_at).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})}`;button.textContent='Revisar gravação';button.onclick=()=>loadRecording(r).catch(fail);info.append(name,meta);row.append(info,button);$('recording-list').append(row);}
}
async function loadRecording(r) {
  if(!PROFILES[r.profile])throw Error('Perfil de gravação não reconhecido.');await save();stop();simulator.configure(r.profile);recording=parseRecording(JSON.stringify(r));viewingArchive=true;dirty=false;resetChat();updateProfile();stop();render();switchView('live');toast('Gravação histórica aberta. Iniciar criará uma nova sessão.');refreshConversations().catch(fail);
}
function download(content,type,extension) {
  const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`scan-pro-SIMULACAO-${recording.profile}-${recording.id.slice(0,8)}.${extension}`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function addMessage(text,role='assistant',label='ROTEIRO LOCAL · SEM MODELO DE IA') {const row=document.createElement('div');row.className='chat-message '+role;const title=document.createElement('small'),body=document.createElement('span');title.textContent=role==='user'?'VOCÊ':label;body.textContent=text;row.append(title,body);$('chat-log').append(row);$('chat-log').scrollTop=$('chat-log').scrollHeight;return {row,body,title};}
function setAiBusy(value) {aiBusy=value;$('chat-send').disabled=value;$('chat-send').textContent=value?'Respondendo…':'Enviar ↗';$('conversation-select').disabled=value;}
function renderConversations() {
  const select=$('conversation-select');select.replaceChildren(new Option('Nova conversa',''));for(const c of conversations)select.add(new Option(c.title,c.id));select.value=conversationId||'';
}
async function refreshConversations() {const token=epoch,api=cloud;if(!api)return;const r=await api.request({mode:'conversations'});if(token!==epoch||api!==cloud)return;conversations=r.conversations||[];renderConversations();}
async function sendQuestion(question) {
  if(aiBusy)return;question=question.trim();if(!question)return;const token=epoch,context=snapshotContext(recording);setAiBusy(true);
  const turn=pendingTurn?.question===question?pendingTurn:{question,id:uid(),context};pendingTurn=turn;
  if(!turn.rendered){addMessage(question,'user');turn.rendered=true;}$('chat-input').value='';
  const message=addMessage(cloud?'Consultando a OpenAI…':'','assistant',cloud?'OPENAI · ANÁLISE DO LABORATÓRIO':'ROTEIRO LOCAL · SEM MODELO DE IA');
  try {
    if(!cloud){message.body.textContent=localGuide(question,context);pendingTurn=null;return;}
    const api=cloud;aiAbort=new AbortController();const timer=setTimeout(()=>aiAbort?.abort(),65000);
    try {
      const data=await api.request({mode:'analyze',conversation_id:conversationId,client_request_id:turn.id,question,context:turn.context,stream:true},{signal:aiAbort.signal,onEvent:e=>{
        if(token!==epoch)return;if(e.type==='session'){conversationId=e.conversation_id;turn.conversation_id=conversationId;}if(e.type==='answer')message.body.textContent=e.answer;
      }});
      if(token!==epoch)return;conversationId=data.conversation_id;message.body.textContent=data.answer;message.title.textContent='OPENAI · RESPOSTA GUARDADA';pendingTurn=null;await refreshConversations();
    } finally {clearTimeout(timer);}
  } catch(e) {
    if(token!==epoch)return;message.title.textContent='CONSULTA NÃO CONCLUÍDA';message.body.textContent=(message.body.textContent==='Consultando a OpenAI…'?'':message.body.textContent+'\n\n')+(e.name==='AbortError'?'A consulta demorou demais.':e.message)+' Sua pergunta foi mantida para tentar novamente.';$('chat-input').value=question;
  } finally {if(token===epoch){setAiBusy(false);aiAbort=null;$('chat-log').scrollTop=$('chat-log').scrollHeight;}}
}

async function initAuth() {
  if(!window.supabase||!window.SUPABASE_URL||!window.SUPABASE_PUBLISHABLE_KEY)return;
  const requested=new URLSearchParams(location.search).get('vehicle');if(!requested||!/^[0-9a-f-]{36}$/i.test(requested))return;
  const client=window.supabase.createClient(window.SUPABASE_URL,window.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  const {data:{session}}=await client.auth.getSession();if(!session)return;
  const r=await client.from('v2_vehicles').select('id,company_id,description,plate,model').eq('id',requested).maybeSingle();if(r.error||!r.data)throw Error('Condução indisponível para esta sessão. O laboratório local continua disponível.');
  const profile=inferProfile(r.data);if(!profile)throw Error('Esta condução ainda não tem perfil de laboratório.');
  auth={client,user:session.user};binding=r.data;await reset(profile);resetChat();updateProfile();
  store.close();store=await new RecordingStore(`${session.user.id}:${r.data.company_id}:${r.data.id}`).open();await refreshConversations();
  const {data}=client.auth.onAuthStateChange((_event,next)=>{if(!next||next.user.id!==auth?.user.id){resetChat();auth=null;binding=null;cloud=null;store.close();store=new RecordingStore('demo');store.open().then(()=>reset()).catch(fail);updateProfile();}});authSubscription=data.subscription;
}

async function boot() {
  for(const [key,p] of Object.entries(PROFILES))$('profile').add(new Option(p.name,key));for(const [key,name] of Object.entries(SCENARIOS))$('scenario').add(new Option(name,key));
  for(const p of Object.values(PROTOCOLS)){const panel=document.createElement('article');panel.className='panel';const name=document.createElement('h2'),status=document.createElement('span'),detail=document.createElement('p');name.textContent=p.name;status.className='tag';status.textContent=p.status;detail.textContent=p.detail;panel.append(name,status,detail);$('protocol-list').append(panel);}
  store=await new RecordingStore().open();recording=freshRecording();buildMetrics();updateProfile();resetChat();render();
  if(!store.persistent)$('storage-note').textContent='Armazenamento persistente indisponível. Exporte a sessão antes de fechar a página.';
  document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>switchView(b.dataset.view));
  document.querySelector('.brand').onclick=e=>{e.preventDefault();switchView('live');};
  $('profile').onchange=async()=>{try{await reset($('profile').value);resetChat();await refreshConversations();}catch(e){fail(e);}};
  $('start').onclick=async()=>{try{if(viewingArchive||recording.samples.length>=MAX_SAMPLES)await reset();running=true;$('start').disabled=true;$('stop').disabled=false;event('Simulação iniciada. Nenhum veículo conectado.');simulator.start(receive);}catch(e){stop();fail(e);}};
  $('stop').onclick=()=>{stop();event('Simulação pausada.');save().catch(fail);};
  $('scenario').onchange=()=>{simulator.setScenario($('scenario').value);if(!viewingArchive)event('Cenário: '+SCENARIOS[simulator.scenario]);};
  $('throttle').oninput=()=>{simulator.setThrottle(Number($('throttle').value));$('throttle-value').textContent=simulator.throttle+'%';};
  $('chart-pid').onchange=drawChart;new ResizeObserver(drawChart).observe($('signal-chart'));
  $('snapshot').onclick=()=>{const s=recording.samples.at(-1);if(!s||s.state==='timeout'||viewingArchive)return toast('Use uma leitura atual de uma sessão ativa para marcar a evidência.');event('Evidência da amostra #'+s.sequence+': '+Object.entries(s.pids).map(([k,p])=>`${PIDS[k].label}: ${nf.format(p.value)} ${p.unit}`).join(' · '));toast('Evidência marcada no laboratório.');};
  $('reset-faults').onclick=()=>{$('scenario').value='normal';simulator.setScenario('normal');event('Solicitado cenário regular; aguarde a próxima amostra simulada.');toast('O próximo quadro trará o cenário regular.');};
  $('run-actuator').onclick=()=>{try{if(viewingArchive)throw Error('Inicie uma nova sessão para executar ensaios.');if(!$('actuator-confirm').checked)throw Error('Marque que entendeu o caráter simulado do ensaio.');const result=simulator.runActuator($('actuator').value);$('actuator-result').textContent=result.description+'\nRetorno virtual: '+result.result.join(' → ')+'\nComandos enviados a veículos: 0.';event('Ensaio virtual: '+result.description);$('actuator-confirm').checked=false;}catch(e){fail(e);}};
  $('manual-form').onsubmit=e=>{e.preventDefault();try{if(viewingArchive)throw Error('Inicie uma nova sessão para registrar.');const form=new FormData(e.target),pids={};for(const [key,value] of form)if(value.trim()!=='')pids[key]={value:Number(value),...PIDS[key],quality:'manual',source:'manual_exercise'};if(!Object.keys(pids).length)throw Error('Informe ao menos uma medição.');if(recording.samples.length>=MAX_SAMPLES)throw Error('Inicie uma nova sessão.');const sample={...simulator.sample(),origin:'manual',state:'manual',pids};receive(sample);event('Exercício manual registrado.');save().catch(fail);}catch(err){fail(err);}};
  $('ask-current').onclick=()=>{switchView('assistant');$('chat-input').value='O que estas leituras indicam e qual seria o próximo teste?';$('chat-input').focus();};
  $('save-session').onclick=()=>save().then(()=>{toast('Sessão guardada neste navegador.');renderRecordings();}).catch(fail);
  $('export-json').onclick=()=>download(JSON.stringify(recording,null,2),'application/json','json');$('export-csv').onclick=()=>{try{download(recordingCsv(recording),'text/csv;charset=utf-8','csv');}catch(e){fail(e);}};
  $('new-session').onclick=()=>reset().then(()=>{switchView('live');toast('Nova sessão criada; a anterior foi guardada.');}).catch(fail);
  $('import-recording').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>MAX_IMPORT_BYTES)throw Error('Arquivo acima de 8 MB.');const r=parseRecording(await file.text());if(!PROFILES[r.profile])throw Error('Perfil desconhecido.');r.id=uid();await store.save(r);await loadRecording(r);}catch(error){fail(error);}finally{e.target.value='';}};
  $('decode-form').onsubmit=e=>{e.preventDefault();try{const form=new FormData(e.target),raw=form.get('bytes').trim();if(!/^[0-9a-f]{2}(?:\s+[0-9a-f]{2})*$/i.test(raw))throw Error('Use pares hexadecimais separados por espaços.');const b=raw.split(/\s+/).map(v=>parseInt(v,16)),protocol=form.get('protocol');const result=protocol==='j1939'?decodeJ1939(parseInt(form.get('can_id'),16),b):protocol==='uds'?decodeUds(b):decodeObd(b);$('decode-result').textContent=JSON.stringify(result,null,2);}catch(err){$('decode-result').textContent=err.message;}};
  $('chat-form').onsubmit=e=>{e.preventDefault();sendQuestion($('chat-input').value).catch(fail);};
  $('chat-input').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendQuestion($('chat-input').value).catch(fail);}};
  document.querySelectorAll('[data-prompt]').forEach(b=>b.onclick=()=>{$('chat-input').value=b.dataset.prompt;$('chat-input').focus();});
  $('new-conversation').onclick=()=>{resetChat();refreshConversations().catch(fail);};
  $('conversation-select').onchange=async()=>{const id=$('conversation-select').value;if(!id){resetChat();return;}if(!cloud)return;resetChat();const token=epoch;setAiBusy(true);try{const data=await cloud.request({mode:'history',conversation_id:id});if(token!==epoch)return;conversationId=id;$('chat-log').replaceChildren();for(const m of data.messages||[])addMessage(m.content,m.role,m.role==='assistant'?'OPENAI · HISTÓRICO DO LABORATÓRIO':'VOCÊ');await refreshConversations();}catch(e){fail(e);}finally{if(token===epoch)setAiBusy(false);}};
  autosaveTimer=setInterval(()=>{if(dirty)save().catch(fail);},15000);
  window.addEventListener('pagehide',()=>{simulator.stop();if(dirty)save().catch(()=>{});});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&running){stop();event('Simulação pausada ao sair da página.');save().catch(()=>{});}});
  window.addEventListener('beforeunload',e=>{if(dirty&&!store.persistent){e.preventDefault();e.returnValue='';}});
  await initAuth().catch(fail);
  if(window.O360_SCAN_PREVIEW){$('back-link').href='https://app.comando360.com.br/oficina360.html';$('back-link').target='_blank';$('back-link').rel='noopener';}
  if('serviceWorker' in navigator&&!window.O360_SCAN_PREVIEW)navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(()=>{});
}
boot().catch(fail);
