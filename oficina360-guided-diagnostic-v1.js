(()=>{
'use strict';
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[m]));
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const arr=v=>Array.isArray(v)?v:[];
const obj=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};
const state={client:null,vehicle:null,profile:null,session:null,steps:[],playbook:null,components:[],electricalNodes:[],recent:[],busy:false,activeStep:null};

function addStyle(){
 if($('#o360GuidedDiagStyle'))return;
 const s=document.createElement('style');s.id='o360GuidedDiagStyle';s.textContent=`
 .o360-gd{display:grid;gap:14px;margin:16px 0}.o360-gd-hero{border:1px solid rgba(78,143,204,.24);border-radius:18px;padding:17px;background:linear-gradient(135deg,rgba(18,37,62,.94),rgba(9,18,31,.97))}.o360-gd-hero h2{margin:3px 0 7px}.o360-gd-hero p{margin:0;color:#9fb0c2;line-height:1.5}.o360-gd-launch{display:flex;flex-wrap:wrap;gap:9px;margin-top:13px;align-items:center}.o360-gd-code{font-weight:900;font-size:1.15rem;letter-spacing:.05em;border:1px solid rgba(136,166,199,.22);border-radius:11px;padding:9px 11px}.o360-gd-card{border:1px solid rgba(136,166,199,.17);border-radius:16px;background:rgba(12,23,39,.66);padding:14px}.o360-gd-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.o360-gd-progress{height:8px;border-radius:999px;background:rgba(136,166,199,.14);overflow:hidden;margin-top:10px}.o360-gd-progress>span{display:block;height:100%;background:#4e8fcc}.o360-gd-layout{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(260px,.65fr);gap:14px}.o360-gd-step{border:1px solid rgba(136,166,199,.18);border-radius:15px;padding:15px;background:rgba(255,255,255,.025)}.o360-gd-step h3{margin:3px 0 8px}.o360-gd-step .meta{color:#93a6ba;font-size:.82rem;line-height:1.45}.o360-gd-box{border:1px solid rgba(136,166,199,.14);border-radius:12px;padding:11px;margin-top:10px}.o360-gd-box h4{margin:0 0 7px;font-size:.86rem}.o360-gd-grid{display:grid;grid-template-columns:1fr 130px;gap:8px;margin-top:12px}.o360-gd-grid input,.o360-gd-note,.o360-gd-finish input,.o360-gd-finish textarea{width:100%;box-sizing:border-box;border:1px solid rgba(136,166,199,.22);background:rgba(255,255,255,.04);color:inherit;border-radius:10px;padding:10px}.o360-gd-note{margin-top:8px;min-height:70px;resize:vertical}.o360-gd-outcomes{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:11px}.o360-gd-outcomes button{border-radius:11px;padding:10px;border:1px solid rgba(136,166,199,.22);background:rgba(255,255,255,.04);color:inherit;cursor:pointer}.o360-gd-outcomes .pass{border-color:rgba(72,187,120,.35)}.o360-gd-outcomes .fail{border-color:rgba(245,107,107,.35)}.o360-gd-outcomes .inc{border-color:rgba(245,184,73,.35)}.o360-gd-list{display:grid;gap:7px}.o360-gd-list button{width:100%;text-align:left;border:1px solid rgba(136,166,199,.14);background:rgba(255,255,255,.025);color:inherit;border-radius:11px;padding:9px;cursor:pointer}.o360-gd-list button.active{border-color:rgba(78,143,204,.58);background:rgba(78,143,204,.09)}.o360-gd-list small{display:block;color:#91a3b8;margin-top:3px}.o360-gd-status{font-size:.67rem;text-transform:uppercase;border:1px solid rgba(136,166,199,.18);border-radius:999px;padding:3px 6px}.o360-gd-status.pass{color:#8ed9af}.o360-gd-status.fail{color:#ff9a9a}.o360-gd-status.inconclusive{color:#f5c46d}.o360-gd-decision{border-left:4px solid #d7a13d;background:rgba(215,161,61,.09);border-radius:9px;padding:10px 12px;margin-top:10px}.o360-gd-source{font-size:.76rem;color:#91a3b8;word-break:break-word}.o360-gd-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}.o360-gd-finish{display:grid;gap:9px}.o360-gd-recent{display:grid;gap:7px}.o360-gd-recent button{border:1px solid rgba(136,166,199,.14);border-radius:10px;padding:9px;background:rgba(255,255,255,.025);color:inherit;text-align:left;cursor:pointer}.o360-gd-empty{color:#91a3b8;padding:12px 0}.o360-gd-check{display:flex;gap:8px;align-items:center}.o360-gd-check input{width:auto}
 @media(max-width:850px){.o360-gd-layout{grid-template-columns:1fr}.o360-gd-outcomes{grid-template-columns:1fr}.o360-gd-grid{grid-template-columns:1fr}.o360-gd-launch .btn{flex:1}}
 `;document.head.appendChild(s);
}

function inject(){
 if($('#o360GuidedDiagRoot'))return;
 const diag=$('#tab-diagnostics');if(!diag)return;
 const root=document.createElement('div');root.id='o360GuidedDiagRoot';root.className='o360-gd';
 const assistant=$('#o360DiagAssistant');assistant?assistant.insertAdjacentElement('afterend',root):diag.prepend(root);
 addStyle();
 $('#vehiclePicker')?.addEventListener('change',()=>setTimeout(()=>resetForVehicle(),120));
 document.addEventListener('click',onClick);
 document.addEventListener('input',e=>{if(e.target?.id==='o360FaultCode'&&!state.session)renderLauncher()});
 new MutationObserver(()=>{if(!state.session)renderLauncher()}).observe(diag,{subtree:true,childList:true});
 resetForVehicle();
}

async function client(){
 if(state.client)return state.client;
 if(!window.supabase||!window.SUPABASE_URL||!window.SUPABASE_PUBLISHABLE_KEY)throw new Error('Conexão do Oficina 360 não carregada.');
 state.client=window.supabase.createClient(window.SUPABASE_URL,window.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});return state.client;
}

async function resetForVehicle(){
 state.session=null;state.steps=[];state.playbook=null;state.components=[];state.electricalNodes=[];state.activeStep=null;
 try{await loadVehicle();await loadRecent();renderLauncher()}catch(e){showError(e)}
}

async function loadVehicle(){
 const c=await client(),id=$('#vehiclePicker')?.value||new URLSearchParams(location.search).get('vehicle');if(!id)return;
 const [vr,pr]=await Promise.all([
  c.from('v2_vehicles').select('id,company_id,plate,description,make,model,model_year,current_odometer_km').eq('id',id).maybeSingle(),
  c.from('v2_vehicle_technical_profiles').select('*').eq('vehicle_id',id).maybeSingle()
 ]);
 if(vr.error)throw vr.error;state.vehicle=vr.data||null;state.profile=pr.data||null;
}

async function loadRecent(){
 if(!state.vehicle)return;const c=await client();
 const r=await c.from('v2_diagnostic_sessions').select('id,code,title,status,current_step_index,started_at,last_activity_at,completed_at').eq('vehicle_id',state.vehicle.id).order('last_activity_at',{ascending:false}).limit(5);
 state.recent=r.data||[];
}

function validCode(){const s=String($('#o360FaultCode')?.value||'').toUpperCase().replace(/\s+/g,'');return /^[PCBU][0-9A-F]{4}$/.test(s)?s:null}
function pct(){if(!state.steps.length)return 0;return Math.round((state.steps.filter(x=>x.outcome!=='pending').length/state.steps.length)*100)}
function outLabel(v){return ({pass:'dentro do esperado',fail:'fora do esperado',inconclusive:'inconclusivo',skipped:'pulado',pending:'pendente'})[v]||v}

function renderLauncher(){
 const root=$('#o360GuidedDiagRoot');if(!root||state.session)return;const code=validCode();
 root.innerHTML=`<div class="o360-gd-hero"><span class="eyebrow">DIAGNÓSTICO GUIADO</span><h2>Teste, meça e deixe o Oficina decidir o próximo passo</h2><p>Use o código já digitado acima. Cada teste fica salvo com valor medido, resultado e observação; você pode interromper e continuar depois.</p><div class="o360-gd-launch">${code?`<span class="o360-gd-code">${esc(code)}</span><button class="btn primary" type="button" data-gd-start>Iniciar diagnóstico guiado</button>`:'<span class="o360-gd-code">Digite um DTC acima</span>'}<button class="btn soft" type="button" data-gd-refresh>Atualizar</button></div></div>${recentHtml()}`;
}

function recentHtml(){
 return `<div class="o360-gd-card"><div class="o360-gd-head"><div><span class="eyebrow">MEMÓRIA DA OFICINA</span><h3 style="margin:3px 0">Diagnósticos recentes</h3></div></div><div class="o360-gd-recent">${state.recent.length?state.recent.map(s=>`<button type="button" data-gd-open="${esc(s.id)}"><b>${esc(s.code||'Sem DTC')} — ${esc(s.title)}</b><small>${esc(s.status)} • ${new Date(s.last_activity_at||s.started_at).toLocaleString('pt-BR')}</small></button>`).join(''):'<div class="o360-gd-empty">Ainda não há diagnóstico guiado salvo para esta condução.</div>'}</div></div>`
}

async function choosePlaybook(code){
 const c=await client();
 const r=await c.from('v2_vehicle_diagnostic_playbooks').select('*').eq('protocol','obd2').eq('code',code);if(r.error)throw r.error;
 const p=arr(r.data).find(x=>x.vehicle_id===state.vehicle.id)||arr(r.data).find(x=>!x.vehicle_id&&x.chassis_variant===state.profile?.chassis_variant&&x.engine_code===state.profile?.engine_code)||arr(r.data)[0]||null;
 return p;
}

function genericSteps(code){return [
 {step:1,action:`Confirmar o código ${code}, descrição exata, freeze frame e sintomas antes de apagar a memória`,pass:'Código e condições registrados'},
 {step:2,action:'Fazer inspeção visual de conectores, chicotes, mangueiras, alimentação e aterramentos ligados ao sistema',pass:'Sem dano aparente ou anomalia encontrada'},
 {step:3,action:'Usar a Central Técnica e o Mapa Elétrico para medir o circuito/componente relacionado antes de substituir peça',pass:'Medições comparadas com fonte técnica'},
 {step:4,action:'Registrar causa provável, teste confirmatório e resultado final',pass:'Causa sustentada por teste'}
]}

async function ensureFault(code,title){
 const c=await client(),v=state.vehicle;
 let r=await c.from('v2_vehicle_faults').select('id').eq('company_id',v.company_id).eq('vehicle_id',v.id).eq('protocol','obd2').eq('code',code).eq('status','active').order('last_seen_at',{ascending:false}).limit(1);
 if(r.data?.[0]?.id)return r.data[0].id;
 r=await c.from('v2_vehicle_faults').insert({company_id:v.company_id,vehicle_id:v.id,protocol:'obd2',code,description:title||code,status:'active',first_seen_at:new Date().toISOString(),last_seen_at:new Date().toISOString(),occurrence_count:1,raw_data:{entry_method:'guided_diagnostic',source:'oficina360'}}).select('id').single();if(r.error)throw r.error;return r.data.id;
}

async function start(){
 if(state.busy)return;const code=validCode();if(!code){flash('Digite um código DTC válido acima.');return}state.busy=true;
 try{
  if(!state.vehicle)await loadVehicle();const c=await client();
  const ex=await c.from('v2_diagnostic_sessions').select('id').eq('vehicle_id',state.vehicle.id).eq('protocol','obd2').eq('code',code).in('status',['active','paused']).order('last_activity_at',{ascending:false}).limit(1);
  if(ex.data?.[0]?.id){await openSession(ex.data[0].id);return}
  state.playbook=await choosePlaybook(code);const title=state.playbook?.title||`Diagnóstico ${code}`;const faultId=await ensureFault(code,title);
  const sr=await c.from('v2_diagnostic_sessions').insert({company_id:state.vehicle.company_id,vehicle_id:state.vehicle.id,fault_id:faultId,playbook_id:state.playbook?.id||null,protocol:'obd2',code,title,status:'active',current_step_index:0,odometer_km:state.vehicle.current_odometer_km||null,metadata:{source:'oficina360',playbook_verification:state.playbook?.verification_status||'generic'}}).select('*').single();if(sr.error)throw sr.error;
  const tests=arr(state.playbook?.ordered_tests).length?arr(state.playbook.ordered_tests):genericSteps(code);
  const rows=tests.map((t,i)=>({session_id:sr.data.id,company_id:state.vehicle.company_id,vehicle_id:state.vehicle.id,step_index:i,step_key:`step_${i+1}`,action:String(t.action||t),expected:t.pass||null,fail_next:t.fail_next||null,outcome:'pending',measurement:{source_step:t}}));
  const ir=await c.from('v2_diagnostic_session_steps').insert(rows);if(ir.error)throw ir.error;
  await openSession(sr.data.id);
 }catch(e){showError(e)}finally{state.busy=false}
}

async function openSession(id){
 const c=await client();
 const [sr,st]=await Promise.all([
  c.from('v2_diagnostic_sessions').select('*').eq('id',id).maybeSingle(),
  c.from('v2_diagnostic_session_steps').select('*').eq('session_id',id).order('step_index')
 ]);if(sr.error)throw sr.error;if(!sr.data)return;
 state.session=sr.data;state.steps=st.data||[];state.activeStep=Math.min(sr.data.current_step_index||0,Math.max(0,state.steps.length-1));
 state.playbook=sr.data.playbook_id?(await c.from('v2_vehicle_diagnostic_playbooks').select('*').eq('id',sr.data.playbook_id).maybeSingle()).data:null;
 const ids=arr(state.playbook?.related_component_ids);
 if(ids.length){const cr=await c.from('v2_vehicle_components').select('id,name,oem_part_number,location_description').in('id',ids);state.components=cr.data||[];const nr=await c.from('v2_vehicle_electrical_nodes').select('id,component_id,label,circuit_code,connector_name,pins,test_procedure,source_metadata,verification_status').eq('vehicle_id',state.vehicle.id).in('component_id',ids);state.electricalNodes=nr.data||[]}else{state.components=[];state.electricalNodes=[]}
 renderSession();
}

function bestNode(step){
 if(!state.electricalNodes.length)return null;const txt=norm(step?.action||'');const stop=new Set(['testar','verificar','medir','comparar','inspecionar','sensor','circuito','chicote','conector','pressao','motor','sistema','com','sem','para','dos','das','uma']);const tokens=txt.split(/[^a-z0-9]+/).filter(x=>x.length>3&&!stop.has(x));
 let best=null,score=0;for(const n of state.electricalNodes){const hay=norm(`${n.label} ${n.circuit_code}`);const s=tokens.reduce((a,t)=>a+(hay.includes(t)?1:0),0);if(s>score){score=s;best=n}}
 return best||(state.electricalNodes.length===1?state.electricalNodes[0]:null)
}

function renderSession(){
 const root=$('#o360GuidedDiagRoot');if(!root||!state.session)return;const s=state.session,step=state.steps[state.activeStep],progress=pct(),done=s.status==='completed';
 root.innerHTML=`<div class="o360-gd-hero"><div class="o360-gd-head"><div><span class="eyebrow">SESSÃO DE DIAGNÓSTICO</span><h2>${esc(s.code||'Diagnóstico')} — ${esc(s.title)}</h2><p>${esc(s.symptom||'Registre cada teste antes de condenar qualquer componente.')}</p></div><span class="o360-gd-status ${esc(s.status)}">${esc(s.status)}</span></div><div class="o360-gd-progress"><span style="width:${progress}%"></span></div><small>${progress}% dos testes registrados • ${Number(s.odometer_km||0).toLocaleString('pt-BR')} km</small></div>${lastDecisionHtml()}<div class="o360-gd-layout"><div>${done?finishSummary():stepHtml(step)}</div><aside class="o360-gd-card"><h3 style="margin-top:0">Roteiro</h3><div class="o360-gd-list">${state.steps.map((x,i)=>`<button type="button" class="${i===state.activeStep?'active':''}" data-gd-step="${i}"><span class="o360-gd-status ${esc(x.outcome)}">${esc(outLabel(x.outcome))}</span><b> ${i+1}. ${esc(x.action)}</b>${x.observed_value?`<small>Medido: ${esc(x.observed_value)} ${esc(x.observed_unit||'')}</small>`:''}</button>`).join('')}</div><div class="o360-gd-actions"><button class="btn soft" type="button" data-gd-pause>Pausar</button><button class="btn primary" type="button" data-gd-finish>Concluir diagnóstico</button></div></aside></div>`;
}

function lastDecisionHtml(){const d=obj(state.session?.metadata).last_decision;if(!d?.message)return '';return `<div class="o360-gd-decision"><b>Próxima decisão:</b> ${esc(d.message)}</div>`}

function stepHtml(step){
 if(!step)return '<div class="o360-gd-card">Nenhum passo disponível.</div>';const node=bestNode(step),tp=obj(node?.test_procedure);
 return `<div class="o360-gd-step"><span class="eyebrow">PASSO ${step.step_index+1} DE ${state.steps.length}</span><h3>${esc(step.action)}</h3>${step.expected?`<div class="o360-gd-box"><h4>O que esperamos</h4>${esc(step.expected)}</div>`:''}${step.fail_next?`<div class="o360-gd-box"><h4>Se estiver fora do esperado</h4>${esc(step.fail_next)}</div>`:''}${node?electricalHtml(node,tp):''}<div class="o360-gd-grid"><input id="o360GdValue" value="${esc(step.observed_value||'')}" placeholder="Valor medido / observação curta"><input id="o360GdUnit" value="${esc(step.observed_unit||'')}" placeholder="Unidade: V, Ω, bar..."></div><textarea id="o360GdNotes" class="o360-gd-note" placeholder="Observações do teste, condição do motor, temperatura, comportamento...">${esc(step.notes||'')}</textarea><div class="o360-gd-outcomes"><button class="pass" type="button" data-gd-outcome="pass">✓ Dentro do esperado</button><button class="fail" type="button" data-gd-outcome="fail">✕ Fora do esperado</button><button class="inc" type="button" data-gd-outcome="inconclusive">? Inconclusivo</button></div></div>`
}

function electricalHtml(node,tp){
 const useful=Object.keys(tp).filter(k=>!['nivel','fonte_url','fonte_diagnostico'].includes(k)).slice(0,5);
 return `<div class="o360-gd-box"><h4>Mapa elétrico relacionado — ${esc(node.label)}</h4>${node.connector_name?`<div class="meta">Conector: <b>${esc(node.connector_name)}</b> • ${esc(node.verification_status)}</div>`:''}${useful.length?`<div class="meta">${useful.map(k=>`<b>${esc(k.replaceAll('_',' '))}:</b> ${esc(typeof tp[k]==='object'?JSON.stringify(tp[k]):tp[k])}`).join('<br>')}</div>`:''}<div class="o360-gd-actions"><button class="btn soft" type="button" data-gd-electrical="${esc(node.label)}">⚡ Abrir no mapa elétrico</button></div>${tp.fonte_diagnostico?`<div class="o360-gd-source">Fonte: ${esc(tp.fonte_diagnostico)}</div>`:''}</div>`
}

async function saveOutcome(outcome){
 const step=state.steps[state.activeStep];if(!step||state.busy)return;state.busy=true;
 try{
  const c=await client(),value=$('#o360GdValue')?.value?.trim()||'',unit=$('#o360GdUnit')?.value?.trim()||'',notes=$('#o360GdNotes')?.value?.trim()||'',now=new Date().toISOString();
  const ur=await c.from('v2_diagnostic_session_steps').update({outcome,observed_value:value||null,observed_unit:unit||null,notes:notes||null,performed_at:now,updated_at:now,measurement:{...(obj(step.measurement)),recorded_at:now}}).eq('id',step.id);if(ur.error)throw ur.error;
  step.outcome=outcome;step.observed_value=value;step.observed_unit=unit;step.notes=notes;step.performed_at=now;
  let next=state.steps.findIndex((x,i)=>i>state.activeStep&&x.outcome==='pending');if(next<0)next=state.steps.findIndex(x=>x.outcome==='pending');if(next<0)next=state.activeStep;
  const msg=outcome==='fail'?(step.fail_next||'Resultado fora do esperado. Continue o roteiro e use o mapa elétrico/peças relacionadas antes de substituir componente.'):outcome==='pass'?'Teste dentro do esperado. Avance para o próximo ponto do roteiro.':'Resultado inconclusivo. Repita a medição ou use outro método/ferramenta antes de tirar conclusão.';
  const meta={...obj(state.session.metadata),last_decision:{step_index:step.step_index,outcome,message:msg,at:now}};
  const sr=await c.from('v2_diagnostic_sessions').update({current_step_index:next,last_activity_at:now,updated_at:now,metadata:meta}).eq('id',state.session.id).select('*').single();if(sr.error)throw sr.error;state.session=sr.data;state.activeStep=next;renderSession();flash('Teste registrado.');
 }catch(e){showError(e)}finally{state.busy=false}
}

function finishSummary(){
 return `<div class="o360-gd-card"><h3 style="margin-top:0">Diagnóstico concluído</h3><p>${esc(state.session.conclusion||'Sessão finalizada.')}</p>${state.session.root_cause?`<div class="o360-gd-box"><h4>Causa encontrada</h4>${esc(state.session.root_cause)}</div>`:''}${state.session.result?`<div class="o360-gd-box"><h4>Resultado</h4>${esc(state.session.result)}</div>`:''}<div class="o360-gd-actions"><button class="btn soft" type="button" data-gd-os>Gerar OS deste diagnóstico</button><button class="btn soft" type="button" data-gd-close>Voltar aos diagnósticos</button></div></div>`
}

function finishForm(){
 const root=$('#o360GuidedDiagRoot');if(!root)return;
 root.innerHTML=`<div class="o360-gd-card o360-gd-finish"><span class="eyebrow">FECHAR DIAGNÓSTICO</span><h2 style="margin:0">Transformar os testes em memória da condução</h2><input id="o360GdSymptom" placeholder="Sintoma relatado" value="${esc(state.session.symptom||'')}"><textarea id="o360GdConclusion" rows="2" placeholder="Diagnóstico/conclusão"></textarea><textarea id="o360GdRoot" rows="2" placeholder="Causa real encontrada"></textarea><textarea id="o360GdService" rows="2" placeholder="Serviço realizado"></textarea><textarea id="o360GdResult" rows="2" placeholder="Resultado após reparo"></textarea><label class="o360-gd-check"><input id="o360GdResolved" type="checkbox"> Problema resolvido / DTC pode ser encerrado</label><div class="o360-gd-actions"><button class="btn primary" type="button" data-gd-save-finish>Salvar e concluir</button><button class="btn soft" type="button" data-gd-cancel-finish>Voltar ao roteiro</button></div></div>`
}

async function complete(){
 if(state.busy)return;state.busy=true;
 try{
  const c=await client(),now=new Date().toISOString(),resolved=!!$('#o360GdResolved')?.checked,symptom=$('#o360GdSymptom')?.value?.trim()||'',conclusion=$('#o360GdConclusion')?.value?.trim()||'',root=$('#o360GdRoot')?.value?.trim()||'',service=$('#o360GdService')?.value?.trim()||'',result=$('#o360GdResult')?.value?.trim()||'';
  const tests=state.steps.map(x=>({step:x.step_index+1,action:x.action,expected:x.expected,outcome:x.outcome,observed_value:x.observed_value,observed_unit:x.observed_unit,notes:x.notes,performed_at:x.performed_at}));
  const ur=await c.from('v2_diagnostic_sessions').update({symptom:symptom||null,status:'completed',conclusion:conclusion||null,root_cause:root||null,service_performed:service||null,result:result||null,completed_at:now,last_activity_at:now,updated_at:now}).eq('id',state.session.id).select('*').single();if(ur.error)throw ur.error;state.session=ur.data;
  if(state.session.code){
   const rr=await c.from('v2_vehicle_fault_resolutions').insert({company_id:state.vehicle.company_id,vehicle_id:state.vehicle.id,fault_id:state.session.fault_id||null,protocol:state.session.protocol||'obd2',code:state.session.code,symptom:symptom||null,diagnosis:conclusion||null,root_cause:root||null,tests_performed:tests,tools_used:arr(state.playbook?.required_tools),service_performed:service||null,result:result||null,resolved,odometer_km:state.session.odometer_km||state.vehicle.current_odometer_km||null,resolved_at:resolved?now:null,metadata:{guided_session_id:state.session.id,source:'oficina360_guided_diagnostic'}});if(rr.error)throw rr.error;
   if(resolved&&state.session.fault_id){const fr=await c.from('v2_vehicle_faults').update({status:'cleared',cleared_at:now}).eq('id',state.session.fault_id);if(fr.error)throw fr.error}
  }
  await loadRecent();renderSession();flash('Diagnóstico salvo no histórico da condução.');
 }catch(e){showError(e)}finally{state.busy=false}
}

async function pause(){const c=await client(),now=new Date().toISOString();const r=await c.from('v2_diagnostic_sessions').update({status:'paused',last_activity_at:now,updated_at:now}).eq('id',state.session.id).select('*').single();if(r.error)return showError(r.error);state.session=r.data;flash('Diagnóstico pausado. Você pode retomar depois.');renderSession()}

async function createWorkOrder(){
 try{const c=await client();const r=await c.rpc('v2_create_work_order_from_diagnostic_session',{p_session_id:state.session.id});if(r.error)throw r.error;const id=typeof r.data==='string'?r.data:r.data?.id||r.data;state.session.work_order_id=id||state.session.work_order_id;flash('OS criada e ligada ao diagnóstico.');document.querySelector('.side-nav [data-tab="orders"]')?.click()}catch(e){showError(e)}
}

function onClick(e){
 const t=e.target.closest('[data-gd-start],[data-gd-refresh],[data-gd-open],[data-gd-step],[data-gd-outcome],[data-gd-electrical],[data-gd-pause],[data-gd-finish],[data-gd-save-finish],[data-gd-cancel-finish],[data-gd-os],[data-gd-close]');if(!t)return;
 if(t.hasAttribute('data-gd-start'))start();
 else if(t.hasAttribute('data-gd-refresh'))resetForVehicle();
 else if(t.dataset.gdOpen)openSession(t.dataset.gdOpen).catch(showError);
 else if(t.dataset.gdStep!=null){state.activeStep=Number(t.dataset.gdStep);renderSession()}
 else if(t.dataset.gdOutcome)saveOutcome(t.dataset.gdOutcome);
 else if(t.dataset.gdElectrical){document.dispatchEvent(new CustomEvent('o360:electrical-open',{detail:{query:t.dataset.gdElectrical}}))}
 else if(t.hasAttribute('data-gd-pause'))pause();
 else if(t.hasAttribute('data-gd-finish'))finishForm();
 else if(t.hasAttribute('data-gd-save-finish'))complete();
 else if(t.hasAttribute('data-gd-cancel-finish'))renderSession();
 else if(t.hasAttribute('data-gd-os'))createWorkOrder();
 else if(t.hasAttribute('data-gd-close')){state.session=null;state.steps=[];renderLauncher()}
}

function flash(msg){const t=$('#toast');if(!t)return;t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2600)}
function showError(e){console.error(e);flash(e?.message||'Não foi possível concluir esta ação.')}

function boot(){inject()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,0),{once:true});else setTimeout(boot,0);
})();
