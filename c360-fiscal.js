(()=>{
'use strict';
const MOD='fiscal';
const GUIDE_LABELS={fgts:'FGTS mensal',fgts_rescisorio:'FGTS rescisório',darf_dctfweb:'DARF DCTFWeb',das:'DAS Simples Nacional',mit:'MIT / DCTFWeb',other:'Outra obrigação'};
const STATUS_LABELS={pending:'Pendente',generated:'Guia pronta',paid:'Pago',overdue:'Vencido',cancelled:'Cancelado'};
const PROVIDER_LABELS={esocial:'eSocial',fgts_digital:'FGTS Digital',dctfweb:'DCTFWeb',pgdas:'PGDAS-D / DAS',mit:'MIT'};
let state={month:'',period:null,guides:[],integrations:[],files:{},employees:[],loading:false};

const q=id=>document.getElementById(id);
const htmlEscape=v=>typeof esc==='function'?esc(String(v??'')):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
const fmtMoney=v=>typeof money==='function'?money(Number(v||0)):Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const fmtDate=v=>v?new Date(String(v).slice(0,10)+'T12:00:00').toLocaleDateString('pt-BR'):'—';
const currentMonth=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit'}).format(new Date()).slice(0,7);
const competenceDate=m=>(m||currentMonth())+'-01';
const todayBR=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const num=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
const toast=(title,text,type='success')=>{if(typeof c360Toast==='function')c360Toast(title,text,type);else alert(title+'\n'+text)};

function fiscalScreen(){
 const section=document.createElement('section');
 section.id='fiscal';section.className='section';section.dataset.screen='fiscal';section.hidden=false;
 section.innerHTML=`
  <div class="fiscal-page">
   <div class="fiscal-hero">
    <div><span class="fiscal-eyebrow">FOLHA • TRIBUTOS • OBRIGAÇÕES</span><h1>Folha & Fiscal</h1><p>Controle mensal de eSocial, FGTS Digital, DCTFWeb, DAS e guias da empresa.</p></div>
    <div class="fiscal-hero-actions"><label>Competência<input id="fiscalMonth" type="month"></label><button class="btn soft" id="fiscalRefresh" type="button">↻ Atualizar</button><button class="btn primary" id="fiscalPrepare" type="button">Preparar competência</button></div>
   </div>
   <div class="fiscal-notice"><b>Controle oficial com segurança.</b> O Comando 360 não marca transmissão ou emissão como concluída sem retorno do ambiente oficial. Certificado A1 e segredos nunca ficam no navegador.</div>
   <div class="fiscal-kpis" id="fiscalKpis"></div>
   <div class="fiscal-grid-main">
    <div>
     <div class="fiscal-card">
      <div class="fiscal-card-head"><div><h3>Obrigações da competência</h3><p>Visão do fluxo oficial e do que ainda depende de integração.</p></div><span class="pill" id="fiscalPeriodPill">NÃO PREPARADA</span></div>
      <div class="fiscal-flow" id="fiscalFlow"></div>
     </div>
     <div class="fiscal-card">
      <div class="fiscal-card-head"><div><h3>Guias e pagamentos</h3><p>FGTS, DARF, DAS e demais obrigações ficam arquivados com comprovante.</p></div><button class="btn primary" id="fiscalNewGuide" type="button">+ Registrar guia</button></div>
      <div id="fiscalGuides"></div>
     </div>
    </div>
    <div>
     <div class="fiscal-card">
      <div class="fiscal-card-head"><div><h3>Integrações oficiais</h3><p>Status por empresa.</p></div></div>
      <div id="fiscalIntegrations"></div>
     </div>
     <div class="fiscal-card">
      <div class="fiscal-card-head"><div><h3>Valores apurados</h3><p>Registre os totais confirmados da competência; não há cálculo fiscal presumido.</p></div></div>
      <div class="fiscal-values-form">
       <label>Folha bruta<input id="fiscalGrossPayroll" inputmode="decimal" placeholder="0,00"></label>
       <label>FGTS<input id="fiscalFgts" inputmode="decimal" placeholder="0,00"></label>
       <label>INSS<input id="fiscalInss" inputmode="decimal" placeholder="0,00"></label>
       <label>IRRF<input id="fiscalIrrf" inputmode="decimal" placeholder="0,00"></label>
       <label>DAS<input id="fiscalDas" inputmode="decimal" placeholder="0,00"></label>
       <label>Outros<input id="fiscalOther" inputmode="decimal" placeholder="0,00"></label>
      </div>
      <button class="btn primary" id="fiscalSaveValues" type="button">Salvar valores confirmados</button><div class="muted fiscal-msg" id="fiscalValuesMsg"></div>
     </div>
    </div>
   </div>

   <div class="fiscal-drawer hidden" id="fiscalGuideDrawer" aria-hidden="true">
    <div class="fiscal-drawer-head"><div><h3>Registrar guia</h3><p>Use os dados da guia emitida no ambiente oficial.</p></div><button class="btn soft" id="fiscalCloseGuide" type="button">Fechar</button></div>
    <div class="fiscal-form-grid">
     <label>Tipo<select id="fiscalGuideType"><option value="fgts">FGTS mensal</option><option value="fgts_rescisorio">FGTS rescisório</option><option value="darf_dctfweb">DARF DCTFWeb</option><option value="das">DAS Simples Nacional</option><option value="mit">MIT / DCTFWeb</option><option value="other">Outra obrigação</option></select></label>
     <label>Valor<input id="fiscalGuideAmount" inputmode="decimal" placeholder="0,00"></label>
     <label>Vencimento<input id="fiscalGuideDue" type="date"></label>
     <label>Situação<select id="fiscalGuideStatus"><option value="generated">Guia pronta</option><option value="pending">Pendente</option><option value="paid">Pago</option></select></label>
     <label class="fiscal-wide">Referência / identificador<input id="fiscalGuideReference" placeholder="Opcional"></label>
     <label class="fiscal-wide">Arquivo da guia<input id="fiscalGuideFile" type="file" accept="application/pdf,image/jpeg,image/png,image/webp"></label>
    </div>
    <div class="toolbar"><button class="btn primary" id="fiscalSaveGuide" type="button">Salvar guia</button></div><div class="muted fiscal-msg" id="fiscalGuideMsg"></div>
   </div>
  </div>`;
 return section;
}

function install(){
 if(window.__c360FiscalInstalled)return;window.__c360FiscalInstalled=true;
 try{if(typeof C360_MODULES==='object')C360_MODULES.fiscal=['Folha & Fiscal','eSocial, FGTS e tributos'];}catch(_){ }
 const financeBtn=document.querySelector('.v2navbtn[data-v2tab="financeiro"]');
 if(financeBtn&&!document.querySelector('.v2navbtn[data-v2tab="fiscal"]')){
  const b=document.createElement('button');b.type='button';b.className='v2navbtn';b.dataset.v2tab='fiscal';b.innerHTML='🧾 &nbsp; Folha &amp; Fiscal';financeBtn.insertAdjacentElement('afterend',b);
 }
 const screen=fiscalScreen();
 try{v2ScreenStore.fiscal=screen;}catch(e){console.warn('Fiscal router indisponível',e);return}
 const original=window.v2Go;
 if(typeof original==='function'&&!original.__fiscalWrapped){
  const wrapped=async function(tab){const r=await original(tab);if(tab==='fiscal')await loadFiscal();return r};
  wrapped.__fiscalWrapped=true;window.v2Go=wrapped;
 }
 bindEvents();
}

function parseBRMoney(v){
 let s=String(v??'').trim().replace(/R\$\s*/gi,'').replace(/\s/g,'').replace(/[^0-9,.-]/g,'');if(!s)return 0;
 if(s.includes(',')&&s.includes('.'))s=s.lastIndexOf(',')>s.lastIndexOf('.')?s.replace(/\./g,'').replace(',','.'):s.replace(/,/g,'');
 else if(s.includes(','))s=s.replace(/\./g,'').replace(',','.');
 return Math.max(0,Number(s)||0);
}
function setInputMoney(id,v){const el=q(id);if(el)el.value=num(v)?num(v).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}):''}
function statusClass(s){return s==='paid'||s==='accepted'||s==='active'?'ok':s==='overdue'||s==='rejected'||s==='error'?'danger':s==='generated'||s==='configured'||s==='testing'?'warn':''}
function integrationLabel(s){return ({active:'Ativa',configured:'Configurada',testing:'Em teste',error:'Erro',disabled:'Desativada',not_configured:'Não configurada'})[s]||'Não configurada'}
function guideDisplayStatus(g){if(['paid','cancelled'].includes(g.status))return g.status;if(g.due_date&&g.due_date<todayBR())return 'overdue';return g.status||'pending'}

async function loadFiscal(){
 if(!companyId||state.loading)return;state.loading=true;
 const month=q('fiscalMonth')?.value||state.month||currentMonth();state.month=month;if(q('fiscalMonth'))q('fiscalMonth').value=month;
 try{
  const comp=competenceDate(month);
  const [periods,guides,integrations,employees]=await Promise.all([
   rest('v2_fiscal_periods','select=*&company_id=eq.'+companyId+'&competence_date=eq.'+comp+'&limit=1'),
   rest('v2_fiscal_guides','select=*&company_id=eq.'+companyId+'&competence_date=eq.'+comp+'&order=due_date.asc,created_at.desc'),
   rest('v2_fiscal_integrations','select=*&company_id=eq.'+companyId+'&order=provider.asc'),
   rest('v2_employees','select=id,full_name,status&company_id=eq.'+companyId+'&status=eq.active')
  ]);
  state.period=periods?.[0]||null;state.guides=guides||[];state.integrations=integrations||[];state.employees=employees||[];
  const fileIds=[...new Set(state.guides.flatMap(g=>[g.file_id,g.proof_file_id]).filter(Boolean))];state.files={};
  if(fileIds.length){const files=await rest('v2_files','select=id,original_name,storage_bucket,storage_path,mime_type&company_id=eq.'+companyId+'&id=in.('+fileIds.join(',')+')');(files||[]).forEach(f=>state.files[f.id]=f)}
  render();
 }catch(e){console.error('Fiscal',e);toast('Falha ao carregar Folha & Fiscal',e.message||String(e),'error')}
 finally{state.loading=false}
}

function render(){renderKpis();renderFlow();renderGuides();renderIntegrations();renderValues()}
function renderKpis(){
 const p=state.period||{},guides=state.guides||[];
 const total=guides.filter(g=>guideDisplayStatus(g)!=='cancelled').reduce((s,g)=>s+num(g.amount),0);
 const paid=guides.filter(g=>g.status==='paid').reduce((s,g)=>s+num(g.amount),0);
 const pending=Math.max(0,total-paid);
 const fgtsGuides=guides.filter(g=>['fgts','fgts_rescisorio'].includes(g.guide_type)&&guideDisplayStatus(g)!=='cancelled');
 const fgts=fgtsGuides.length?fgtsGuides.reduce((s,g)=>s+num(g.amount),0):num(p.fgts_amount);
 const overdue=guides.filter(g=>guideDisplayStatus(g)==='overdue').length;
 q('fiscalKpis').innerHTML=[
  ['FUNCIONÁRIOS',String(p.employee_count||state.employees.length),'ativos na competência','👥'],
  ['TOTAL DE GUIAS',fmtMoney(total),'valores registrados','🧾'],
  ['PENDENTE',fmtMoney(pending),overdue?overdue+' vencida(s)':'sem guia vencida','⏳'],
  ['FGTS',fmtMoney(fgts),'mensal + rescisório','🏦']
 ].map(x=>`<div class="fiscal-kpi"><div><span>${x[0]}</span><b>${htmlEscape(x[1])}</b><small>${htmlEscape(x[2])}</small></div><i>${x[3]}</i></div>`).join('');
 const pill=q('fiscalPeriodPill');if(pill){pill.className='pill '+(p.status==='closed'||p.status==='submitted'?'ok':p.status==='ready'?'warn':'');pill.textContent=p.id?({open:'ABERTA',calculating:'EM APURAÇÃO',ready:'PRONTA',submitted:'ENVIADA',closed:'FECHADA',reopened:'REABERTA'}[p.status]||String(p.status).toUpperCase()):'NÃO PREPARADA'}
}
function providerState(provider){return state.integrations.find(x=>x.provider===provider)||{provider,status:'not_configured',environment:'production_restricted'}}
function renderFlow(){
 const p=state.period;
 const steps=[
  {provider:'esocial',title:'Folha / eSocial',desc:p?'Competência preparada para conferência.':'Prepare a competência para iniciar.'},
  {provider:'fgts_digital',title:'FGTS Digital',desc:'Débitos e guia vinculados ao retorno oficial.'},
  {provider:'dctfweb',title:'DCTFWeb / DARF',desc:'INSS, IRRF e demais débitos após fechamento.'},
  {provider:'pgdas',title:'DAS / PGDAS-D',desc:'Controle do DAS quando aplicável à empresa.'}
 ];
 q('fiscalFlow').innerHTML=steps.map((s,i)=>{const it=providerState(s.provider),ready=it.status==='active';return `<div class="fiscal-flow-row"><span class="fiscal-step">${i+1}</span><div><strong>${htmlEscape(s.title)}</strong><p>${htmlEscape(s.desc)}</p></div><span class="pill ${ready?'ok':'warn'}">${ready?'INTEGRAÇÃO ATIVA':'AGUARDANDO INTEGRAÇÃO'}</span></div>`}).join('');
}
function renderGuides(){
 const box=q('fiscalGuides');if(!box)return;
 if(!state.guides.length){box.innerHTML='<div class="fiscal-empty"><b>Nenhuma guia registrada nesta competência.</b><span>Quando a guia oficial for emitida, salve aqui o PDF, valor e vencimento.</span></div>';return}
 box.innerHTML=`<div class="fiscal-table-wrap"><table class="fiscal-table"><thead><tr><th>Guia</th><th>Vencimento</th><th>Valor</th><th>Status</th><th>Arquivos</th><th></th></tr></thead><tbody>${state.guides.map(g=>{const st=guideDisplayStatus(g),f=state.files[g.file_id],proof=state.files[g.proof_file_id];return `<tr><td><b>${htmlEscape(GUIDE_LABELS[g.guide_type]||g.guide_type)}</b>${g.external_reference?`<small>${htmlEscape(g.external_reference)}</small>`:''}</td><td>${fmtDate(g.due_date)}</td><td><b>${fmtMoney(g.amount)}</b></td><td><span class="pill ${statusClass(st)}">${htmlEscape(STATUS_LABELS[st]||st)}</span></td><td><div class="fiscal-file-actions">${f?`<button class="fiscal-link" data-fiscal-open-file="${f.id}" type="button">Guia</button>`:''}${proof?`<button class="fiscal-link" data-fiscal-open-file="${proof.id}" type="button">Comprovante</button>`:''}${!f&&!proof?'—':''}</div></td><td><div class="fiscal-row-actions">${g.status!=='paid'&&g.status!=='cancelled'?`<button class="btn soft" data-fiscal-pay="${g.id}" type="button">Marcar pago</button>`:''}${g.status==='paid'&&!proof?`<button class="btn soft" data-fiscal-proof="${g.id}" type="button">+ comprovante</button>`:''}</div></td></tr>`}).join('')}</tbody></table></div>`;
}
function renderIntegrations(){
 const providers=['esocial','fgts_digital','dctfweb','pgdas','mit'];
 q('fiscalIntegrations').innerHTML=providers.map(provider=>{const x=providerState(provider),active=x.status==='active',env=x.environment==='production'?'Produção':'Produção restrita';return `<div class="fiscal-integration"><div><strong>${htmlEscape(PROVIDER_LABELS[provider]||provider)}</strong><small>${htmlEscape(env)}${x.certificate_expires_at?' • certificado até '+fmtDate(x.certificate_expires_at):''}</small></div><span class="pill ${statusClass(x.status)}">${htmlEscape(integrationLabel(x.status))}</span>${provider==='esocial'&&!active?'<button class="btn soft fiscal-preflight" type="button">Ver requisitos</button>':''}</div>`}).join('');
}
function renderValues(){const p=state.period||{};setInputMoney('fiscalGrossPayroll',p.gross_payroll);setInputMoney('fiscalFgts',p.fgts_amount);setInputMoney('fiscalInss',p.inss_amount);setInputMoney('fiscalIrrf',p.irrf_amount);setInputMoney('fiscalDas',p.das_amount);setInputMoney('fiscalOther',p.other_taxes_amount);q('fiscalSaveValues').disabled=!p.id;q('fiscalValuesMsg').textContent=p.id?'Valores são de controle e devem corresponder ao que foi apurado/confirmado oficialmente.':'Prepare a competência antes de salvar valores.'}

async function preparePeriod(){
 const month=q('fiscalMonth')?.value||currentMonth(),comp=competenceDate(month),btn=q('fiscalPrepare');
 try{btn.disabled=true;btn.textContent='Preparando...';const existing=await rest('v2_fiscal_periods','select=id&company_id=eq.'+companyId+'&competence_date=eq.'+comp+'&limit=1');if(existing?.length){toast('Competência já preparada',month,'success');await loadFiscal();return}
  const employees=await rest('v2_employees','select=id&company_id=eq.'+companyId+'&status=eq.active');
  await rest('v2_fiscal_periods','','POST',{company_id:companyId,competence_date:comp,status:'open',employee_count:(employees||[]).length,metadata:{created_from:'comando360_fiscal'}});
  toast('Competência preparada',month+' • '+(employees||[]).length+' funcionário(s)','success');await loadFiscal();
 }catch(e){toast('Não foi possível preparar',e.message||String(e),'error')}finally{btn.disabled=false;btn.textContent='Preparar competência'}
}
async function saveValues(){
 if(!state.period?.id)return;
 const btn=q('fiscalSaveValues'),msg=q('fiscalValuesMsg');
 try{btn.disabled=true;msg.textContent='Salvando...';const body={gross_payroll:parseBRMoney(q('fiscalGrossPayroll').value),fgts_amount:parseBRMoney(q('fiscalFgts').value),inss_amount:parseBRMoney(q('fiscalInss').value),irrf_amount:parseBRMoney(q('fiscalIrrf').value),das_amount:parseBRMoney(q('fiscalDas').value),other_taxes_amount:parseBRMoney(q('fiscalOther').value),updated_at:new Date().toISOString()};body.total_taxes_amount=body.fgts_amount+body.inss_amount+body.irrf_amount+body.das_amount+body.other_taxes_amount;body.status='ready';await rest('v2_fiscal_periods','id=eq.'+state.period.id,'PATCH',body);toast('Valores salvos','Competência atualizada.','success');await loadFiscal()}catch(e){msg.className='error fiscal-msg';msg.textContent=e.message||String(e)}finally{btn.disabled=false}
}
function openGuideDrawer(){q('fiscalGuideDrawer').classList.remove('hidden');q('fiscalGuideDrawer').setAttribute('aria-hidden','false');q('fiscalGuideAmount').value='';q('fiscalGuideDue').value='';q('fiscalGuideReference').value='';q('fiscalGuideFile').value='';q('fiscalGuideMsg').textContent='';q('fiscalGuideDrawer').scrollIntoView({behavior:'smooth',block:'start'})}
function closeGuideDrawer(){q('fiscalGuideDrawer').classList.add('hidden');q('fiscalGuideDrawer').setAttribute('aria-hidden','true')}
async function saveGuide(){
 const amount=parseBRMoney(q('fiscalGuideAmount').value),type=q('fiscalGuideType').value,due=q('fiscalGuideDue').value||null,status=q('fiscalGuideStatus').value,file=q('fiscalGuideFile').files?.[0],msg=q('fiscalGuideMsg'),btn=q('fiscalSaveGuide');
 if(!(amount>0)){msg.className='error fiscal-msg';msg.textContent='Informe o valor da guia.';return}
 try{btn.disabled=true;msg.className='muted fiscal-msg';msg.textContent='Salvando guia...';let period=state.period;if(!period?.id){await preparePeriod();period=state.period;if(!period?.id)throw new Error('Prepare a competência antes de registrar a guia.')}
  const rows=await rest('v2_fiscal_guides','','POST',{company_id:companyId,period_id:period.id,guide_type:type,competence_date:competenceDate(state.month),due_date:due,amount,status,issuer:'official_portal',external_reference:q('fiscalGuideReference').value.trim()||null,paid_at:status==='paid'?new Date().toISOString():null,metadata:{source:'manual_official_guide'}});const guide=rows?.[0];if(!guide?.id)throw new Error('Não foi possível obter a guia criada.');
  let fileId=null;if(file){msg.textContent='Arquivando PDF/foto da guia...';const stored=await uploadCompanyDocument(file,'fiscal_guide',guide.id);fileId=stored?.id||null;if(fileId)await rest('v2_fiscal_guides','id=eq.'+guide.id,'PATCH',{file_id:fileId})}
  try{await rest('v2_obligations','','POST',{company_id:companyId,obligation_type:type,title:GUIDE_LABELS[type]||'Obrigação fiscal',competence_date:competenceDate(state.month),due_date:due,amount,status:status==='paid'?'paid':'pending',file_id:fileId,paid_at:status==='paid'?new Date().toISOString():null,metadata:{source:'fiscal_guide',fiscal_guide_id:guide.id}})}catch(e){console.warn('obligation mirror',e)}
  if(status==='paid')await ensureFinancialExpense(guide);
  closeGuideDrawer();toast('Guia registrada',GUIDE_LABELS[type]||'Obrigação fiscal','success');await loadFiscal();
 }catch(e){msg.className='error fiscal-msg';msg.textContent=e.message||String(e)}finally{btn.disabled=false}
}
async function ensureFinancialExpense(guide){
 if(!guide?.id||!(num(guide.amount)>0))return;
 try{const old=await rest('v2_financial_entries','select=id&company_id=eq.'+companyId+'&source_type=eq.fiscal_guide&source_id=eq.'+guide.id+'&limit=1');if(old?.length)return;const u=await getUser();await rest('v2_financial_entries','','POST',{company_id:companyId,entry_type:'expense',description:GUIDE_LABELS[guide.guide_type]||'Obrigação fiscal',amount:num(guide.amount),issue_date:todayBR(),due_date:guide.due_date||null,competence_date:guide.competence_date,status:'paid',counterparty_name:'Governo / obrigação fiscal',source_type:'fiscal_guide',source_id:guide.id,metadata:{fiscal:true},created_by:u?.id||null,paid_at:new Date().toISOString()})}catch(e){console.warn('fiscal finance mirror',e)}
}
async function markPaid(id){
 const g=state.guides.find(x=>x.id===id);if(!g)return;if(!confirm('Marcar esta guia como paga? O valor também será lançado como saída no Financeiro.'))return;
 try{await rest('v2_fiscal_guides','id=eq.'+id,'PATCH',{status:'paid',paid_at:new Date().toISOString(),updated_at:new Date().toISOString()});const mirror=await rest('v2_obligations','select=id&company_id=eq.'+companyId+'&metadata->>fiscal_guide_id=eq.'+id).catch(()=>[]);for(const x of mirror||[])await rest('v2_obligations','id=eq.'+x.id,'PATCH',{status:'paid',paid_at:new Date().toISOString()});await ensureFinancialExpense({...g,status:'paid'});toast('Pagamento registrado','Lançamento integrado ao Financeiro.','success');await loadFiscal()}catch(e){toast('Falha ao registrar pagamento',e.message||String(e),'error')}
}
async function attachProof(id){
 const input=document.createElement('input');input.type='file';input.accept='application/pdf,image/jpeg,image/png,image/webp';input.onchange=async()=>{const file=input.files?.[0];if(!file)return;try{const stored=await uploadCompanyDocument(file,'fiscal_proof',id);if(!stored?.id)throw new Error('Arquivo não salvo.');await rest('v2_fiscal_guides','id=eq.'+id,'PATCH',{proof_file_id:stored.id,status:'paid',paid_at:new Date().toISOString()});toast('Comprovante arquivado','Pagamento documentado.','success');await loadFiscal()}catch(e){toast('Falha ao salvar comprovante',e.message||String(e),'error')}};input.click();
}
async function openFile(id){try{if(typeof openStoredFile==='function')await openStoredFile(id,false);else toast('Arquivo salvo','Abra em Documentos da empresa.','success')}catch(e){toast('Não foi possível abrir',e.message||String(e),'error')}}
function showPreflight(){alert('Para transmissão oficial pelo Comando 360 precisamos:\n\n• Certificado digital ICP-Brasil A1 válido da empresa ou procuração compatível;\n• configuração segura no servidor (nunca no navegador);\n• validação no ambiente de Produção Restrita do eSocial;\n• somente depois habilitar Produção.\n\nAté isso estar configurado, o app controla e arquiva as obrigações sem fingir que transmitiu ao governo.')}

function bindEvents(){
 document.addEventListener('change',e=>{if(e.target?.id==='fiscalMonth'){state.month=e.target.value;loadFiscal()}});
 document.addEventListener('click',async e=>{
  if(e.target.closest('#fiscalRefresh')){e.preventDefault();await loadFiscal();return}
  if(e.target.closest('#fiscalPrepare')){e.preventDefault();await preparePeriod();return}
  if(e.target.closest('#fiscalSaveValues')){e.preventDefault();await saveValues();return}
  if(e.target.closest('#fiscalNewGuide')){e.preventDefault();openGuideDrawer();return}
  if(e.target.closest('#fiscalCloseGuide')){e.preventDefault();closeGuideDrawer();return}
  if(e.target.closest('#fiscalSaveGuide')){e.preventDefault();await saveGuide();return}
  const pay=e.target.closest('[data-fiscal-pay]');if(pay){e.preventDefault();await markPaid(pay.dataset.fiscalPay);return}
  const proof=e.target.closest('[data-fiscal-proof]');if(proof){e.preventDefault();await attachProof(proof.dataset.fiscalProof);return}
  const file=e.target.closest('[data-fiscal-open-file]');if(file){e.preventDefault();await openFile(file.dataset.fiscalOpenFile);return}
  if(e.target.closest('.fiscal-preflight')){e.preventDefault();showPreflight();return}
 });
}

window.c360Fiscal={load:loadFiscal,version:'2026.09.13-1'};
install();
})();
