(()=>{
'use strict';
if(window.C360_DATA_INTEGRITY_VERSION)return;
const VERSION='2026.09.23-integrity2';
let timer=null,busy={pricing:false,biometric:false,poultry:false,fiscal:false};
const $=s=>document.querySelector(s);
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[m]));
const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
function cid(){try{return typeof companyId!=='undefined'&&companyId?companyId:null}catch{return null}}
function rf(){try{return typeof rest==='function'?rest:(typeof window.v2Rest==='function'?window.v2Rest:null)}catch{return null}}
function device(){return document.body?.classList.contains('device-mode')||false}
function active(){return document.querySelector('#screenHost .section.active')?.id||document.querySelector('.section.active')?.id||''}
async function safe(p){try{return await p}catch(e){console.warn('Comando 360 integridade',e);return[]}}
function notice(root,id,state='attention'){
 if(!root)return null;let el=document.getElementById(id);if(!el){el=document.createElement('div');el.id=id;el.className='c360-reconciliation-notice c360-integrity-notice';const hero=root.querySelector('.v2hero,.hero,.section-title,.toolbar');if(hero)hero.insertAdjacentElement('afterend',el);else root.prepend(el)}el.dataset.state=state;return el
}
function remove(id){document.getElementById(id)?.remove()}

/* O handler legado da Apanha acessa estes campos sem null-check. O guard em capture garante
   que eles existam antes de qualquer listener de clique antigo executar. */
function ensureLegacyPoultryFields(){
 const form=$('#poultryForm');if(!form)return;
 if(!$('#poSavedAviary')){const input=document.createElement('input');input.type='hidden';input.id='poSavedAviary';form.appendChild(input)}
 if(!$('#aviaryMsg')){const msg=document.createElement('div');msg.id='aviaryMsg';msg.className='muted hidden';form.appendChild(msg)}
}
document.addEventListener('click',e=>{if(e.target?.closest?.('#newPoultryOp'))ensureLegacyPoultryFields()},true);

/* "Resultado" sem despesas conciliadas é apenas saldo dos lançamentos registrados. */
function clarifyFinanceLabels(){
 const root=$('#financeiro');if(!root)return;
 root.querySelectorAll('.finance-kpi-label').forEach(el=>{
  if(norm(el.textContent)==='resultado'){
   el.textContent='Saldo dos lançamentos';
   el.title='Entradas menos saídas efetivamente registradas no Financeiro. Não representa lucro líquido sem conciliação dos demais módulos.';
  }
 });
 /* Corrige somente a apresentação de milhares em descrições de aves; não altera o dado salvo. */
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
 const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
 nodes.forEach(n=>{const p=n.parentElement;if(!p||/^(SCRIPT|STYLE|INPUT|TEXTAREA|OPTION)$/.test(p.tagName))return;const value=n.nodeValue||'';const fixed=value.replace(/\b(\d{1,3}),(\d{3})(?=\s*aves\b)/gi,'$1.$2');if(fixed!==value)n.nodeValue=fixed});
}

function billingRule(team){
 const b=team?.metadata?.billing;if(!b||typeof b!=='object')return null;
 const type=String(b.type||b.billing_model||'').toLowerCase();
 if(type==='per_bird'||type==='bird'||type==='per-bird'){
  const value=Number(b.price_per_bird??b.unit_price??b.value??0);return value>0?`${money(value)} por ave`:null;
 }
 if(type==='daily'||type==='day'||type==='per_day'){
  const value=Number(b.daily_amount??b.amount??b.value??0);return value>0?`${money(value)} por diária/equipe`:null;
 }
 const value=Number(b.value??0);return value>0?`${money(value)} (${esc(type||'regra da equipe')})`:null;
}
async function refreshPricing(){
 if(device()||busy.pricing||active()!=='configuracoes')return;const restFn=rf(),company=cid();if(!restFn||!company)return;busy.pricing=true;
 try{
  const [teams,contracts]=await Promise.all([
   safe(restFn('v2_teams','select=id,name,status,metadata&company_id=eq.'+company+'&status=eq.active&order=name.asc')),
   safe(restFn('v2_contracts','select=id,title,status,billing_model,default_price,starts_on,ends_on&company_id=eq.'+company+'&status=eq.active&order=starts_on.desc'))
  ]);
  const rules=(teams||[]).map(t=>({name:t.name,rule:billingRule(t)})).filter(x=>x.rule);
  if(!rules.length&&!(contracts||[]).length){remove('c360BillingProvenance');return}
  const el=notice($('#configuracoes'),'c360BillingProvenance',rules.length&&!(contracts||[]).length?'attention':'ok');if(!el)return;
  const teamHtml=rules.length?'<div class="c360-integrity-list">'+rules.map(x=>`<div><b>${esc(x.name)}</b><span>${esc(x.rule)}</span><small>Origem: configuração da equipe</small></div>`).join('')+'</div>':'<div>Nenhuma tarifa ativa foi encontrada na configuração das equipes.</div>';
  const contractText=(contracts||[]).length?`${contracts.length} contrato(s) ativo(s) cadastrado(s).`:'Nenhum contrato ativo cadastrado. As operações atuais podem continuar usando a tarifa histórica/configuração da equipe; isso deve permanecer rastreável e não altera receitas já geradas.';
  el.innerHTML='<strong>💰 Origem das tarifas em uso</strong>'+teamHtml+`<small>${esc(contractText)}</small>`;
 }finally{busy.pricing=false}
}

async function refreshBiometrics(){
 if(device()||busy.biometric||active()!=='funcionarios')return;const restFn=rf(),company=cid();if(!restFn||!company)return;busy.biometric=true;
 try{
  const [employees,enrollments]=await Promise.all([
   safe(restFn('v2_employees','select=id,full_name,status,primary_team&company_id=eq.'+company+'&status=eq.active')),
   safe(restFn('v2_employee_face_enrollments','select=employee_id,status,revoked_at&company_id=eq.'+company+'&status=eq.active'))
  ]);
  const activeEmployees=employees||[],enrolled=new Set((enrollments||[]).filter(x=>!x.revoked_at).map(x=>String(x.employee_id))),done=activeEmployees.filter(x=>enrolled.has(String(x.id))).length,total=activeEmployees.length,pending=Math.max(total-done,0);
  const el=notice($('#funcionarios'),'c360BiometricCoverage',pending?'attention':'ok');if(!el)return;
  const pct=total?Math.round(done*100/total):0;
  el.innerHTML=`<strong>${pending?'⚠':'✓'} Cobertura de reconhecimento facial: ${done}/${total} (${pct}%)</strong><div>${pending?`${pending} funcionário(s) ativo(s) ainda precisam de cadastro biométrico.`:'Todos os funcionários ativos retornados nesta sessão possuem biometria ativa.'}</div><small>O sistema não cria biometria fictícia; pendências precisam ser cadastradas com a pessoa presente.</small>`;
 }finally{busy.biometric=false}
}

function minutesBetween(a,b){if(!a||!b)return null;const d=(new Date(b)-new Date(a))/60000;return Number.isFinite(d)?d:null}
async function refreshPoultryIntegrity(){
 if(device()||busy.poultry||active()!=='operacoes')return;const restFn=rf(),company=cid();if(!restFn||!company)return;busy.poultry=true;
 try{
  const rows=await safe(restFn('v2_poultry_truck_loads','select=id,loading_id,truck_sequence,truck_plate,driver_name,birds,started_at,completed_at,is_cata,metadata,created_at&company_id=eq.'+company+'&order=created_at.desc&limit=300'));
  const quantity=[],timing=[],small=[];
  for(const t of rows||[]){
   const m=t.metadata||{},boxes=Number(m.boxes_count||0),per=Number(m.birds_per_box||0),birds=Number(t.birds||0),simple=boxes*per,dur=minutesBetween(t.started_at,t.completed_at);
   if(!t.is_cata&&boxes>0&&per>0&&birds>0&&Math.abs(simple-birds)>=Math.max(per,20))quantity.push({t,simple,boxes,per,birds});
   if(dur!==null&&dur>=0&&dur<=1)timing.push({t,dur});
   if(!t.is_cata&&boxes>=100&&birds>0&&birds<100)small.push({t,birds,boxes});
  }
  const total=quantity.length+timing.length+small.length;
  if(!total){remove('c360PoultryIntegrity');return}
  const el=notice($('#operacoes'),'c360PoultryIntegrity','attention');if(!el)return;
  const examples=[];
  quantity.slice(0,3).forEach(x=>examples.push(`Caminhão ${x.t.truck_sequence||'—'}: ${x.boxes.toLocaleString('pt-BR')} caixas × ${x.per.toLocaleString('pt-BR')} = ${x.simple.toLocaleString('pt-BR')}, informado ${x.birds.toLocaleString('pt-BR')} aves`));
  timing.slice(0,2).forEach(x=>examples.push(`Caminhão ${x.t.truck_sequence||'—'}: duração ${Math.round(x.dur)} min`));
  small.slice(0,2).forEach(x=>examples.push(`Caminhão ${x.t.truck_sequence||'—'}: ${x.birds.toLocaleString('pt-BR')} aves para ${x.boxes.toLocaleString('pt-BR')} caixas`));
  el.innerHTML=`<strong>⚠ Conferência de dados da apanha</strong><div>${quantity.length} divergência(s) entre o total informado e o cálculo simples caixas × aves/caixa; ${timing.length} horário(s) de 0–1 minuto; ${small.length} quantidade(s) muito pequena(s) para centenas de caixas.</div>${examples.length?'<div class="c360-integrity-examples">'+examples.map(x=>`<span>${esc(x)}</span>`).join('')+'</div>':''}<small>Nenhum valor foi alterado automaticamente. Caixas vazias, cata e ajustes manuais podem explicar diferenças; a correção deve preservar o registro original e o motivo.</small>`;
 }finally{busy.poultry=false}
}

async function refreshFiscalState(){
 if(device()||busy.fiscal||active()!=='fiscal')return;const restFn=rf(),company=cid();if(!restFn||!company)return;busy.fiscal=true;
 try{
  const [integrations,guides]=await Promise.all([
   safe(restFn('v2_fiscal_integrations','select=id,status,provider&company_id=eq.'+company)),
   safe(restFn('v2_fiscal_guides','select=id,status,due_date&company_id=eq.'+company+'&limit=20'))
  ]);
  const configured=(integrations||[]).some(x=>['active','connected','ready'].includes(String(x.status||'').toLowerCase()));
  if(configured){remove('c360FiscalCoverage');return}
  const el=notice($('#fiscal'),'c360FiscalCoverage','attention');if(!el)return;
  el.innerHTML=`<strong>⚠ Fiscal ainda não integrado</strong><div>${(guides||[]).length} guia(s) estão visíveis nesta consulta, mas a integração fiscal não está ativa.</div><small>“0 guias” deve ser lido como “não apurado/não integrado” até a competência e a integração estarem configuradas; não significa ausência de obrigação.</small>`;
 }finally{busy.fiscal=false}
}

function run(){
 ensureLegacyPoultryFields();
 clarifyFinanceLabels();
 if(active()==='configuracoes')refreshPricing();
 if(active()==='funcionarios')refreshBiometrics();
 if(active()==='operacoes')refreshPoultryIntegrity();
 if(active()==='fiscal')refreshFiscalState();
}
function schedule(){clearTimeout(timer);timer=setTimeout(run,100)}
function init(){run();document.addEventListener('c360:screen-changed',schedule);document.addEventListener('c360:bootstrap-ready',schedule);new MutationObserver(schedule).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden']});setTimeout(run,500);setTimeout(run,1600)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.C360_DATA_INTEGRITY_VERSION=VERSION;window.C360DataIntegrity={version:VERSION,refresh:run};
})();