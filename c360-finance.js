let financeValuesHidden=localStorage.getItem('c360_finance_values_hidden')==='1';
let financeViewState={income:0,expense:0};
let financeRenderLimit=100,financeSaveBusy=false,financeLoadGeneration=0;
let financeCostRenderLimit=100;
let financeReconciliation={company:null,rows:[],entries:[],busy:false,generation:0};

function financeDisplayMoney(value){
 return financeValuesHidden?'R$ ••••••':money(value);
}
function financeDisplayDescription(value){
 const safe=esc(value||'Sem descrição');
 return financeValuesHidden?safe.replace(/R\$\s*[0-9][0-9.,]*/gi,'R$ ••••'):safe;
}
function updateFinancePrivacyButton(){
 const b=document.getElementById('toggleFinancePrivacy');if(!b)return;
 b.textContent=financeValuesHidden?'👁 Mostrar valores':'👁 Ocultar valores';
 b.setAttribute('aria-pressed',financeValuesHidden?'true':'false');
 b.setAttribute('aria-label',financeValuesHidden?'Mostrar valores financeiros':'Ocultar valores financeiros');
}
function renderFinanceView(){
 const income=Number(financeViewState.income||0),expense=Number(financeViewState.expense||0);
 const k=document.getElementById('financeKpis');
 if(k)k.innerHTML=
  '<div class="finance-kpi"><span class="finance-kpi-label">RECEITAS POR COMPETÊNCIA</span><strong class="finance-kpi-value">'+financeDisplayMoney(income)+'</strong></div>'+
  '<div class="finance-kpi"><span class="finance-kpi-label">DESPESAS POR COMPETÊNCIA</span><strong class="finance-kpi-value">'+financeDisplayMoney(expense)+'</strong></div>'+
  '<div class="finance-kpi"><span class="finance-kpi-label">SALDO LANÇADO (PARCIAL)</span><strong class="finance-kpi-value">'+financeDisplayMoney(income-expense)+'</strong></div>'+
  '<div class="finance-kpi"><span class="finance-kpi-label">LANÇAMENTOS</span><strong class="finance-kpi-value count">'+financeCache.length+'</strong></div>';

 const l=document.getElementById('financeList');
 if(l)l.innerHTML=financeCache.slice(0,financeRenderLimit).map(x=>{
  const cancelled=x.status==='cancelled';
  return '<div class="item finance-entry-card"><div class="finance-entry-layout">'+
   '<div class="finance-entry-main">'+
    '<div class="finance-entry-title">'+(x.entry_type==='income'?'⬆ Entrada':'⬇ Saída')+' • '+financeDisplayDescription(x.description||'Sem descrição')+'</div>'+
    '<div class="muted finance-entry-meta">'+(x.issue_date?new Date(x.issue_date+'T00:00:00').toLocaleDateString('pt-BR'):'')+(x.counterparty_name?' • '+esc(x.counterparty_name):'')+'</div>'+
    '<span class="pill '+(x.entry_type==='income'?'ok':'warn')+' finance-entry-amount">'+financeDisplayMoney(x.amount)+'</span>'+
    '<span class="pill">'+esc(({planned:'PREVISTO',pending:'PENDENTE',paid:'PAGO',overdue:'VENCIDO',cancelled:'CANCELADO'})[x.status]||x.status)+'</span>'+
    (x.source_id?' <span class="pill">Origem vinculada</span>':'')+
   '</div>'+
   (!cancelled?'<div class="finance-entry-actions"><button type="button" class="btn danger finCancel" data-id="'+esc(x.id)+'">Cancelar</button></div>':'')+
  '</div></div>';
 }).join('')||'<div class="muted">Nenhum lançamento.</div>';
 if(l&&financeCache.length>financeRenderLimit)l.insertAdjacentHTML('beforeend','<button class="btn soft" type="button" data-fin-more>Mostrar mais lançamentos ('+financeCache.length+' no histórico)</button>');
 updateFinancePrivacyButton();
 renderFinanceReconciliation();
}

async function loadFinance(){
 const company=companyId,generation=++financeLoadGeneration;
 const [entries,rep]=await Promise.all([
  restAll('v2_financial_entries','select=*&company_id=eq.'+company+'&order=issue_date.desc,created_at.desc'),
  rest('v2_report_monthly_financial','select=*&company_id=eq.'+company+'&reference_month=eq.'+currentMonthBR()+'-01')
 ]);
 if(company!==companyId||generation!==financeLoadGeneration)return;
 financeCache=entries||[];
 const month=currentMonthBR(),r=(rep||[]).find(x=>String(x.reference_month||'').slice(0,7)===month);
 const income=Number(r?.income??financeCache.filter(x=>String(x.competence_date||x.issue_date||'').slice(0,7)===month&&x.entry_type==='income'&&x.status!=='cancelled').reduce((a,x)=>a+Number(x.amount||0),0));
 const expense=Number(r?.expense??financeCache.filter(x=>String(x.competence_date||x.issue_date||'').slice(0,7)===month&&x.entry_type==='expense'&&x.status!=='cancelled').reduce((a,x)=>a+Number(x.amount||0),0));
 financeViewState={income,expense};
 renderFinanceView();
 await refreshFinanceReconciliation();
}

async function saveFinEntry(){
 if(financeSaveBusy)return;
 const m=document.getElementById('finMsg'),button=document.getElementById('saveFinEntry');
 const raw=document.getElementById('finAmount').value,amount=Number(raw),desc=document.getElementById('finDescription').value.trim();
 if(!desc||!Number.isFinite(amount)||amount<=0||Math.abs(amount*100-Math.round(amount*100))>0.000001){m.textContent='Informe descrição e valor positivo com até duas casas decimais.';return}
 const type=document.getElementById('finType').value;
 if(!['income','expense'].includes(type)){m.textContent='Selecione entrada ou saída.';return}
 financeSaveBusy=true;if(button)button.disabled=true;
 let saved=false;
 try{
  const u=await getUser(),company=companyId,d=document.getElementById('finIssueDate').value||new Date().toLocaleDateString('sv-SE',{timeZone:'America/Sao_Paulo'});
  if(!u?.id)throw new Error('Entre novamente para salvar o lançamento.');
  const body={company_id:company,entry_type:type,description:desc,amount:Math.round(amount*100)/100,issue_date:d,due_date:document.getElementById('finDueDate').value||null,competence_date:d,status:'pending',counterparty_name:document.getElementById('finCounterparty').value.trim()||null,source_type:'manual',metadata:{},created_by:u.id};
  const signature=JSON.stringify(body),key='c360_finance_draft_'+company;
  let draft;try{draft=JSON.parse(sessionStorage.getItem(key)||'null')}catch(_){}
  if(!draft||draft.signature!==signature)draft={signature,id:crypto.randomUUID()};
  sessionStorage.setItem(key,JSON.stringify(draft));
  await restInsertOnce('v2_financial_entries','id',draft.id,body);
  saved=true;sessionStorage.removeItem(key);document.getElementById('finEditCard').style.display='none';
  ['finDescription','finAmount','finDueDate','finCounterparty'].forEach(id=>{document.getElementById(id).value=''});
  m.textContent='Lançamento registrado como pendente.';await loadFinance();
 }catch(e){if(saved)alert('O lançamento foi salvo. Não foi possível atualizar a lista; toque em Atualizar.');else m.textContent=e.message}
 finally{financeSaveBusy=false;if(button)button.disabled=false}
}
async function cancelFinEntry(id){
 if(!id||!confirm('Cancelar este lançamento financeiro? O histórico será preservado.'))return;
 try{const rows=await rest('v2_financial_entries','id=eq.'+encodeURIComponent(id)+'&company_id=eq.'+companyId+'&status=neq.cancelled','PATCH',{status:'cancelled'});if(!rows?.length)throw new Error('O lançamento não foi alterado. Confira seu acesso e atualize a tela.');await loadFinance()}catch(e){alert(e.message)}
}

function financeReconciliationHost(){
 const root=document.getElementById('financeiro');if(!root)return null;
 let host=document.getElementById('c360FinanceReconciliationNotice');
 if(!host){host=document.createElement('div');host.id='c360FinanceReconciliationNotice';host.className='card c360-reconciliation-notice';root.querySelector('.finance-overview-card')?.insertAdjacentElement('afterend',host);if(!host.isConnected)root.prepend(host)}
 return host;
}
function classifyReconciliation(row,entries){
 const links=entries.filter(x=>x.status!=='cancelled'&&x.source_type===row.source_type&&x.source_id===row.source_id);
 if(row.cost_state==='review')return{state:'review',label:'Conferir possível sobreposição de custos',linked:links[0]};
 if(row.cost_state==='unknown'&&links.length)return{state:'review',label:'Origem sem custo para conferir o vínculo',linked:links[0]};
 if(links.length>1)return{state:'review',label:'Mais de um vínculo; conferir'};
 if(links.length){const linked=links[0],matches=linked.entry_type==='expense'&&row.amount!=null&&Math.abs(Number(linked.amount)-Number(row.amount))<0.005;return{state:matches?'linked':'review',label:matches?'Conciliado por origem':'Valor ou tipo divergente',linked}}
 if(row.cost_state==='unknown')return{state:'unknown',label:'Custo não informado'};
 if(row.cost_state==='review')return{state:'review',label:'Conferir possível sobreposição de custos'};
 if(row.cost_state==='zero')return{state:'zero',label:'Sem valor a lançar'};
 return{state:'pending',label:'Sem lançamento financeiro'};
}
function renderFinanceReconciliation(){
 if(financeReconciliation.company!==companyId)return;
 const host=financeReconciliationHost();if(!host)return;
 const month=financeReconciliation.month||currentMonthBR();
 const rows=financeReconciliation.rows,entries=financeReconciliation.entries;
 const classified=rows.map(row=>({row,...classifyReconciliation(row,entries)}));
 const pending=classified.filter(x=>x.state==='pending'),unresolved=classified.filter(x=>['unknown','review'].includes(x.state));
 const linked=classified.filter(x=>x.state==='linked').length;
 host.dataset.state=pending.length||unresolved.length?'attention':'ok';
 const labels={fuel_log:'Combustível',maintenance_plan:'Manutenção',work_order:'Ordem de serviço',inventory_movement:'Compra de estoque'};
 host.innerHTML='<div class="toolbar" style="justify-content:space-between"><h3 style="margin:0">Conciliação dos custos</h3><label>Competência <input type="month" data-fin-month value="'+esc(month)+'"></label><button class="btn soft" type="button" data-fin-reconcile-refresh>Atualizar custos</button></div>'+
  '<p>'+rows.length+' origem(ns) • '+linked+' conciliada(s) • '+pending.length+' sem lançamento • '+unresolved.length+' para conferir.</p>'+
  '<p class="muted">Criar despesa registra uma conta pendente, sem marcar pagamento. Se a compra já estiver no Financeiro, vincule o lançamento existente. Compras de estoque e peças de uma ordem podem representar o mesmo custo.</p>'+
  (classified.length?'<div class="list">'+classified.slice(0,financeCostRenderLimit).map(({row,state,label,linked:entry},i)=>{
   const candidates=entries.filter(x=>x.entry_type==='expense'&&x.status!=='cancelled'&&!x.source_id&&(!x.source_type||x.source_type==='manual')&&row.amount!=null&&Math.abs(Number(x.amount)-Number(row.amount))<0.005);
   const actions=state==='pending'?'<div class="toolbar"><button class="btn primary" type="button" data-fin-create="'+i+'">Criar despesa pendente</button>'+(candidates.length?'<label>Despesa já registrada <select data-fin-existing="'+i+'"><option value="">Selecione para vincular…</option>'+candidates.map(e=>'<option value="'+esc(e.id)+'">'+esc(e.description)+' • '+esc(e.competence_date||e.issue_date)+' • '+financeDisplayMoney(e.amount)+'</option>').join('')+'</select></label><button class="btn soft" type="button" data-fin-link="'+i+'">Vincular existente</button>':'')+'</div>':'';
   return '<div class="item"><strong>'+esc(labels[row.source_type]||row.source_type)+' • '+financeDisplayDescription(row.description)+'</strong><div class="muted">'+esc(row.incurred_on||'Data não informada')+' • '+esc(label)+'</div><div>'+(row.amount==null?'Custo não informado':financeDisplayMoney(row.amount))+'</div>'+(entry?'<small>Financeiro: '+financeDisplayDescription(entry.description)+'</small>':'')+actions+'</div>';
  }).join('')+(classified.length>financeCostRenderLimit?'<button type="button" class="btn soft" data-fin-cost-more>Mostrar mais origens</button>':'')+'</div>':'<p class="muted">Nenhum custo operacional encontrado nesta competência.</p>')+
  '<p class="muted" role="status" data-fin-reconcile-msg>Confira cada origem antes de confirmar. A conciliação não comprova o pagamento nem inclui despesas que ainda não foram cadastradas.</p>';
}
async function refreshFinanceReconciliation(selectedMonth=null){
 if(typeof deviceMode!=='undefined'&&deviceMode)return;
 const company=companyId,host=financeReconciliationHost();if(!company||!host)return;
 const generation=++financeReconciliation.generation,month=selectedMonth||host.querySelector('[data-fin-month]')?.value||document.getElementById('c360FinanceMonth')?.value||currentMonthBR();
 if(!/^\d{4}-\d{2}$/.test(month))return;
 const [year,mo]=month.split('-').map(Number),end=new Date(Date.UTC(year,mo,1)).toISOString().slice(0,10);
 financeReconciliation.company=company;financeReconciliation.busy=true;
 try{
  const [rows,entries]=await Promise.all([
   restAll('v2_reconcilable_costs','select=*&company_id=eq.'+company+'&incurred_on=gte.'+month+'-01&incurred_on=lt.'+end+'&order=incurred_on.desc,source_type.asc,source_id.asc',{uniqueOrder:false}),
   restAll('v2_financial_entries','select=id,description,amount,entry_type,status,source_type,source_id,competence_date,issue_date&company_id=eq.'+company+'&status=neq.cancelled')
  ]);
  if(company!==companyId||generation!==financeReconciliation.generation)return;
  financeReconciliation.rows=rows;financeReconciliation.entries=entries;financeReconciliation.month=month;renderFinanceReconciliation();
 }catch(e){if(company===companyId&&generation===financeReconciliation.generation){financeReconciliation.rows=[];financeReconciliation.entries=[];host.dataset.state='attention';host.textContent='Não foi possível conferir os vínculos dos custos. O saldo permanece parcial. '+e.message}}
 finally{if(generation===financeReconciliation.generation)financeReconciliation.busy=false}
}
async function reconcileFinanceCost(index,existingId=null){
 if(financeReconciliation.busy||financeReconciliation.company!==companyId)return;
 const row=financeReconciliation.rows[index];if(!row||classifyReconciliation(row,financeReconciliation.entries).state!=='pending')return;
 if(!confirm((existingId?'Vincular a despesa existente':'Criar despesa pendente')+' de '+financeDisplayMoney(row.amount)+' para '+row.description+'? Confira se este custo já foi lançado.'))return;
 financeReconciliation.busy=true;const host=financeReconciliationHost(),msg=host.querySelector('[data-fin-reconcile-msg]');
 host.querySelectorAll('button,select,input').forEach(x=>x.disabled=true);
 let committed=false;
 try{
  const out=await rpc('v2_reconcile_operational_cost',{p_company_id:companyId,p_source_type:row.source_type,p_source_id:row.source_id,p_expected_amount:Number(row.amount),p_entry_id:existingId});
  if(!out?.entry_id)throw new Error('O servidor não confirmou o vínculo. Atualize antes de tentar novamente.');
  committed=true;financeReconciliation.busy=false;await loadFinance();
 }catch(e){if(msg)msg.textContent=committed?'O vínculo foi salvo. Atualize a tela para conferir.':e.message}
 finally{financeReconciliation.busy=false;host.querySelectorAll('button,select,input').forEach(x=>x.disabled=false)}
}
document.addEventListener('click',e=>{
 if(e.target.closest('[data-fin-cost-more]')){financeCostRenderLimit+=100;renderFinanceReconciliation();return}
 if(e.target.closest('[data-fin-more]')){financeRenderLimit+=100;renderFinanceView();return}
 if(e.target.closest('[data-fin-reconcile-refresh]')){refreshFinanceReconciliation();return}
 const create=e.target.closest('[data-fin-create]');if(create){reconcileFinanceCost(Number(create.dataset.finCreate));return}
 const link=e.target.closest('[data-fin-link]');if(link){const selected=document.querySelector('[data-fin-existing="'+link.dataset.finLink+'"]')?.value;if(selected)reconcileFinanceCost(Number(link.dataset.finLink),selected);else{const msg=document.querySelector('[data-fin-reconcile-msg]');if(msg)msg.textContent='Selecione o lançamento existente para vincular.'}}
});
document.addEventListener('change',e=>{if(e.target.matches('[data-fin-month]'))refreshFinanceReconciliation()});


// The legacy bootstrap must preserve the idempotent form handler.
saveFinEntry.__c360Quality=true;
