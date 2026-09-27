(()=>{
'use strict';
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const arr=v=>Array.isArray(v)?v:[];
const state={client:null,vehicle:null,profile:null,code:null,library:null,playbook:null,faultId:null,components:[],views:[],history:[]};

function inject(){
 const tab=$('#tab-diagnostics'); if(!tab||$('#o360DiagAssistant'))return;
 const box=document.createElement('div'); box.id='o360DiagAssistant'; box.className='o360-diag-assistant';
 box.innerHTML=`
 <article class="panel o360-code-entry">
   <div class="panel-head"><div><span class="eyebrow">TRADUTOR DE FALHAS</span><h2>Digite o código do scanner</h2></div><span class="chip neutral">Manual ou scanner</span></div>
   <p class="o360-muted">Você pode digitar o código que outra oficina encontrou. O Oficina 360 confere o significado, cruza com esta condução, mostra o que investigar e guarda como foi resolvido.</p>
   <div class="o360-code-line">
     <input id="o360FaultCode" autocomplete="off" spellcheck="false" placeholder="Ex.: P0299, P0203, P0087">
     <button id="o360LookupFault" class="btn primary" type="button">Interpretar código</button>
   </div>
   <div id="o360CodeHint"></div>
 </article>
 <div id="o360DiagResult"></div>
 `;
 const faults=$('#faultsList'); faults?.parentNode?.insertBefore(box,faults);
 addStyle();
 $('#o360LookupFault').addEventListener('click',lookupFromInput);
 $('#o360FaultCode').addEventListener('keydown',e=>{if(e.key==='Enter')lookupFromInput()});
 document.addEventListener('click',handleAction);
 const picker=$('#vehiclePicker'); picker?.addEventListener('change',()=>setTimeout(loadVehicle,50));
 }

function addStyle(){
 if($('#o360DiagStyle'))return;
 const st=document.createElement('style'); st.id='o360DiagStyle'; st.textContent=`
 .o360-diag-assistant{display:grid;gap:16px;margin-bottom:20px}.o360-muted{color:#718096;margin:0 0 14px}.o360-code-line{display:flex;gap:10px;align-items:center}.o360-code-line input{flex:1;min-width:180px;padding:13px 14px;border:1px solid #d6dfeb;border-radius:12px;background:var(--surface,#fff);font-size:16px;text-transform:uppercase}.o360-diagnostic-card{border:1px solid #dde5ef;border-radius:16px;background:var(--surface,#fff);padding:18px;display:grid;gap:16px}.o360-diagnostic-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start}.o360-code-big{font-size:28px;font-weight:900;letter-spacing:.04em}.o360-grid2{display:grid;grid-template-columns:1fr 1fr;gap:14px}.o360-box{border:1px solid #e3e9f1;border-radius:14px;padding:14px}.o360-box h3{margin:0 0 10px;font-size:15px}.o360-box ol,.o360-box ul{margin:0;padding-left:20px;display:grid;gap:8px}.o360-actions{display:flex;flex-wrap:wrap;gap:8px}.o360-related{display:flex;flex-wrap:wrap;gap:8px}.o360-related button{border:1px solid #d7e1ec;border-radius:999px;padding:8px 10px;background:#f8fafc;cursor:pointer}.o360-warning{border-left:4px solid #d97706;background:#fff7ed;padding:12px;border-radius:10px}.o360-ok{border-left:4px solid #16803c;background:#f0fdf4;padding:12px;border-radius:10px}.o360-resolution{display:grid;gap:10px}.o360-resolution textarea,.o360-resolution input{width:100%;box-sizing:border-box;border:1px solid #d6dfeb;border-radius:10px;padding:10px;background:var(--surface,#fff)}.o360-history-row{border-top:1px solid #edf1f6;padding:10px 0}.o360-history-row:first-child{border-top:0}.o360-suggest{margin-top:8px}.o360-suggest button{border:0;background:none;color:#1d4ed8;text-decoration:underline;cursor:pointer;padding:0}@media(max-width:760px){.o360-grid2{grid-template-columns:1fr}.o360-code-line{align-items:stretch;flex-direction:column}.o360-diagnostic-head{flex-direction:column}}
 `; document.head.appendChild(st);
}

async function initClient(){
 if(state.client)return true;
 if(!window.supabase||!window.SUPABASE_URL||!window.SUPABASE_PUBLISHABLE_KEY)return false;
 state.client=window.supabase.createClient(window.SUPABASE_URL,window.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
 return true;
}

async function loadVehicle(){
 if(!await initClient())return;
 const id=$('#vehiclePicker')?.value||new URLSearchParams(location.search).get('vehicle'); if(!id)return;
 const [vr,pr]=await Promise.all([
  state.client.from('v2_vehicles').select('id,company_id,plate,description,make,model,model_year,current_odometer_km').eq('id',id).maybeSingle(),
  state.client.from('v2_vehicle_technical_profiles').select('*').eq('vehicle_id',id).maybeSingle()
 ]);
 state.vehicle=vr.data||null; state.profile=pr.data||null;
 clearResult();
}

function normalizeCode(raw){
 const s=String(raw||'').toUpperCase().replace(/\s+/g,'');
 if(/^[PCBU][0-9A-F]{4}$/.test(s))return {code:s};
 const digits=s.replace(/\D/g,'');
 if(/^P/.test(s)&&digits.length>=3&&digits.length<=4){const suggestion='P'+digits.padStart(4,'0');return {error:true,suggestion};}
 return {error:true};
}

function clearResult(){state.code=null;state.library=null;state.playbook=null;state.faultId=null;state.components=[];state.views=[];state.history=[];const h=$('#o360DiagResult');if(h)h.innerHTML='';}

async function lookupFromInput(){
 const input=$('#o360FaultCode'),hint=$('#o360CodeHint'); const n=normalizeCode(input?.value);
 hint.innerHTML='';
 if(n.error){
  hint.innerHTML=n.suggestion?`<div class="o360-suggest">Código fora do formato OBD-II. Você quis dizer <button type="button" data-suggest-code="${esc(n.suggestion)}">${esc(n.suggestion)}</button>?</div>`:'<div class="o360-warning">Formato não reconhecido. Use algo como P0299, P0203, C1234, B1000 ou U0100.</div>';
  return;
 }
 await lookup(n.code);
}

async function lookup(code){
 if(!state.vehicle)await loadVehicle(); if(!state.vehicle)return;
 state.code=code; state.faultId=null;
 const cid=state.vehicle.company_id,vid=state.vehicle.id;
 const [lr,prs,hr,fr]=await Promise.all([
  state.client.from('v2_diagnostic_code_library').select('*').eq('protocol','obd2').eq('code',code).maybeSingle(),
  state.client.from('v2_vehicle_diagnostic_playbooks').select('*').eq('protocol','obd2').eq('code',code),
  state.client.from('v2_vehicle_fault_resolutions').select('*').eq('company_id',cid).eq('vehicle_id',vid).eq('code',code).order('created_at',{ascending:false}).limit(8),
  state.client.from('v2_vehicle_faults').select('*').eq('company_id',cid).eq('vehicle_id',vid).eq('code',code).eq('status','active').order('last_seen_at',{ascending:false}).limit(1)
 ]);
 state.library=lr.data||null;
 const plays=prs.data||[];
 state.playbook=plays.find(p=>p.vehicle_id===vid)||plays.find(p=>(!p.vehicle_id)&&p.chassis_variant===state.profile?.chassis_variant&&p.engine_code===state.profile?.engine_code)||plays[0]||null;
 state.history=hr.data||[];
 state.faultId=fr.data?.[0]?.id||null;
 const compIds=arr(state.playbook?.related_component_ids); const viewIds=arr(state.playbook?.related_view_ids);
 const [cr,vr]=await Promise.all([
  compIds.length?state.client.from('v2_vehicle_components').select('id,name,oem_part_number,group_code,location_description,required_tools,diagnostic_notes,failure_symptoms').in('id',compIds):Promise.resolve({data:[]}),
  viewIds.length?state.client.from('v2_vehicle_exploded_views').select('id,title,group_code,assembly_code,source_url,verification_status').in('id',viewIds):Promise.resolve({data:[]})
 ]);
 state.components=cr.data||[]; state.views=vr.data||[];
 renderResult();
}

function severityClass(v){return v==='high'||v==='critical'?'danger':v==='medium'?'warn':'neutral'}
function renderResult(){
 const host=$('#o360DiagResult'); if(!host)return;
 const l=state.library,p=state.playbook,c=state.code;
 if(!l&&!p){host.innerHTML=`<article class="o360-diagnostic-card"><div class="o360-warning"><b>${esc(c)} ainda não está traduzido na base.</b><br>Registre a descrição exata mostrada pelo scanner. O código não será interpretado por chute.</div>${resolutionForm(true)}</article>`;return;}
 const title=p?.title||l?.title||c;
 const causes=arr(p?.likely_causes).length?arr(p.likely_causes):arr(l?.generic_causes);
 const tests=arr(p?.ordered_tests).length?arr(p.ordered_tests):arr(l?.generic_tests).map((x,i)=>({step:i+1,action:x}));
 const tools=arr(p?.required_tools).length?arr(p.required_tools):arr(l?.generic_tools);
 const incompatible=compatibilityWarning(c);
 host.innerHTML=`<article class="o360-diagnostic-card">
  <div class="o360-diagnostic-head"><div><div class="o360-code-big">${esc(c)}</div><h2 style="margin:4px 0 0">${esc(title)}</h2><p class="o360-muted">${esc(p?.interpretation||l?.generic_definition||'')}</p></div><span class="chip ${severityClass(l?.severity)}">${esc((l?.severity||'verificar').toUpperCase())}</span></div>
  ${incompatible||''}
  ${state.history.length?`<div class="o360-ok"><b>Essa condução já tem histórico para ${esc(c)}.</b> Veja abaixo como foi resolvido anteriormente antes de trocar peças.</div>`:''}
  <div class="o360-grid2">
   <div class="o360-box"><h3>O que pode ser</h3><ul>${causes.map(x=>`<li>${esc(typeof x==='string'?x:x.action||x.description||JSON.stringify(x))}</li>`).join('')||'<li>Sem causas cadastradas ainda.</li>'}</ul></div>
   <div class="o360-box"><h3>Ferramentas</h3><ul>${tools.map(x=>`<li>${esc(typeof x==='string'?x:x.name||JSON.stringify(x))}</li>`).join('')||'<li>Definir conforme teste.</li>'}</ul></div>
  </div>
  <div class="o360-box"><h3>Passo a passo de investigação</h3><ol>${tests.map(t=>`<li><b>${esc(t.action||t)}</b>${t.pass?`<br><small>Esperado: ${esc(t.pass)}</small>`:''}${t.fail_next?`<br><small>Se falhar: ${esc(t.fail_next)}</small>`:''}</li>`).join('')}</ol></div>
  ${relatedHtml()}
  <div class="o360-actions"><button class="btn soft" type="button" data-record-fault>Registrar ocorrência</button><button class="btn soft" type="button" data-open-catalog>Abrir catálogo</button><button class="btn soft" type="button" data-open-views>Abrir vistas explodidas</button></div>
  ${historyHtml()}
  ${resolutionForm(false)}
 </article>`;
}

function compatibilityWarning(code){
 if(code==='P0760')return '<div class="o360-warning"><b>Cheque de compatibilidade:</b> P0760 é um código genérico de solenoide de mudança “C” de transmissão automática. Se esta condução for manual, confira o código original no scanner antes de seguir; não trate P0760 como falha de bico.</div>';
 return '';
}

function relatedHtml(){
 if(!state.components.length&&!state.views.length)return '';
 return `<div class="o360-box"><h3>Peças e vistas relacionadas</h3><div class="o360-related">${state.components.map(x=>`<button type="button" data-component-name="${esc(x.name)}">⚙ ${esc(x.name)}${x.oem_part_number?' • '+esc(x.oem_part_number):''}</button>`).join('')}${state.views.map(x=>`<button type="button" data-view-title="${esc(x.title)}">◫ ${esc(x.title)}</button>`).join('')}</div></div>`;
}

function historyHtml(){
 if(!state.history.length)return '<div class="o360-box"><h3>Memória desta condução</h3><p class="o360-muted">Ainda não há solução registrada para este código nesta condução.</p></div>';
 return `<div class="o360-box"><h3>Como já foi resolvido nesta condução</h3>${state.history.map(h=>`<div class="o360-history-row"><b>${esc(h.root_cause||h.diagnosis||'Registro de diagnóstico')}</b><br><small>${esc(h.service_performed||h.result||'Sem descrição do reparo')}</small>${h.odometer_km?`<br><small>${Number(h.odometer_km).toLocaleString('pt-BR')} km</small>`:''}</div>`).join('')}</div>`;
}

function resolutionForm(unknown){
 return `<div class="o360-box o360-resolution"><h3>${unknown?'Registrar descrição do scanner':'Registrar como foi resolvido'}</h3>
  <input id="o360Symptom" placeholder="Sintoma: perda de força, não pega, falha quente...">
  <textarea id="o360Diagnosis" rows="2" placeholder="Diagnóstico encontrado"></textarea>
  <textarea id="o360RootCause" rows="2" placeholder="Causa real encontrada (fio rompido, mangueira furada, bico 3, sensor...)"></textarea>
  <textarea id="o360Service" rows="2" placeholder="O que foi feito para corrigir"></textarea>
  <textarea id="o360Result" rows="2" placeholder="Resultado depois do reparo"></textarea>
  <button class="btn primary" type="button" data-save-resolution>${unknown?'Salvar registro':'Salvar solução no histórico'}</button>
 </div>`;
}

async function recordFault(){
 if(!state.vehicle||!state.code)return;
 const now=new Date().toISOString(),v=state.vehicle;
 if(state.faultId){
  const q=await state.client.from('v2_vehicle_faults').select('occurrence_count').eq('id',state.faultId).maybeSingle();
  const r=await state.client.from('v2_vehicle_faults').update({last_seen_at:now,occurrence_count:Number(q.data?.occurrence_count||1)+1,raw_data:{entry_method:'manual',updated_at:now}}).eq('id',state.faultId);
  if(r.error)throw r.error;
 }else{
  const r=await state.client.from('v2_vehicle_faults').insert({company_id:v.company_id,vehicle_id:v.id,protocol:'obd2',code:state.code,description:state.playbook?.title||state.library?.title||'Código informado manualmente',status:'active',first_seen_at:now,last_seen_at:now,occurrence_count:1,raw_data:{entry_method:'manual',source:'oficina360'}}).select('id').single();
  if(r.error)throw r.error; state.faultId=r.data.id;
 }
 flash('Ocorrência registrada nesta condução.');
}

async function saveResolution(){
 if(!state.vehicle||!state.code)return;
 const symptom=$('#o360Symptom')?.value?.trim()||'',diagnosis=$('#o360Diagnosis')?.value?.trim()||'',root=$('#o360RootCause')?.value?.trim()||'',service=$('#o360Service')?.value?.trim()||'',result=$('#o360Result')?.value?.trim()||'';
 if(!symptom&&!diagnosis&&!root&&!service&&!result){flash('Preencha pelo menos um campo do diagnóstico.');return}
 if(!state.faultId)await recordFault();
 const v=state.vehicle;
 const r=await state.client.from('v2_vehicle_fault_resolutions').insert({company_id:v.company_id,vehicle_id:v.id,fault_id:state.faultId,protocol:'obd2',code:state.code,symptom,diagnosis,root_cause:root,tests_performed:arr(state.playbook?.ordered_tests),tools_used:arr(state.playbook?.required_tools),parts_used:state.components.map(x=>({component_id:x.id,name:x.name,oem:x.oem_part_number||null})),service_performed:service,result,resolved:true,odometer_km:v.current_odometer_km||null,resolved_at:new Date().toISOString(),metadata:{entry_method:'oficina360_manual',playbook_id:state.playbook?.id||null}});
 if(r.error)throw r.error;
 if(state.faultId)await state.client.from('v2_vehicle_faults').update({status:'cleared',cleared_at:new Date().toISOString()}).eq('id',state.faultId);
 flash('Solução salva. O Oficina 360 vai lembrar disso na próxima ocorrência.');
 await lookup(state.code);
}

function switchTab(name){
 document.querySelectorAll('.side-nav button[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));
 document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x.id==='tab-'+name));
 const titles={catalog:'Catálogo de peças',exploded:'Vistas explodidas',diagnostics:'Scanner & falhas'}; const t=$('#pageTitle');if(t)t.textContent=titles[name]||'Oficina 360';
}
function openCatalog(name){switchTab('catalog');const input=$('#catalogSearch');if(input){input.value=name||state.components[0]?.name||state.code;input.dispatchEvent(new Event('input',{bubbles:true}));input.scrollIntoView({behavior:'smooth',block:'center'});}}
function openViews(title){switchTab('exploded');setTimeout(()=>{const cards=[...document.querySelectorAll('#explodedViews .view-card')];const card=title?cards.find(x=>x.querySelector('h3')?.textContent===title):cards.find(x=>state.views.some(v=>v.title===x.querySelector('h3')?.textContent));(card||$('#explodedViews'))?.scrollIntoView({behavior:'smooth',block:'start'});},50);}
function flash(msg){const t=$('#toast');if(t){t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2800)}else alert(msg)}

async function handleAction(e){
 const suggest=e.target.closest('[data-suggest-code]'); if(suggest){$('#o360FaultCode').value=suggest.dataset.suggestCode;await lookup(suggest.dataset.suggestCode);return}
 const comp=e.target.closest('[data-component-name]'); if(comp){openCatalog(comp.dataset.componentName);return}
 const view=e.target.closest('[data-view-title]'); if(view){openViews(view.dataset.viewTitle);return}
 if(e.target.closest('[data-open-catalog]')){openCatalog();return}
 if(e.target.closest('[data-open-views]')){openViews();return}
 if(e.target.closest('[data-record-fault]')){try{await recordFault()}catch(err){console.error(err);flash('Não foi possível registrar: '+err.message)}return}
 if(e.target.closest('[data-save-resolution]')){try{await saveResolution()}catch(err){console.error(err);flash('Não foi possível salvar: '+err.message)}return}
}

document.addEventListener('DOMContentLoaded',async()=>{inject();await loadVehicle();},{once:true});
})();