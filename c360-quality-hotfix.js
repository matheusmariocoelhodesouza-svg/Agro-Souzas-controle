(()=>{
'use strict';

const QUALITY_VERSION='2026.09.10-q1';
const FIN_PAGE_SIZE=100;
const runtimeState={financePage:0,financeHasNext:false,financeMonth:'',financeStatus:'',installed:false};

function q(sel,root=document){return root.querySelector(sel)}
function escHtml(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function brMonthNow(){
  try{if(typeof localDateBR==='function')return String(localDateBR()).slice(0,7)}catch(_){ }
  return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit'}).format(new Date());
}
function monthBounds(month){
  const m=/^\d{4}-\d{2}$/.test(month)?month:brMonthNow();
  const [y,mo]=m.split('-').map(Number),next=mo===12?`${y+1}-01`:`${y}-${String(mo+1).padStart(2,'0')}`;
  return {month:m,start:m+'-01',next:next+'-01'};
}
function shiftMonth(month,delta){
  const [y,m]=month.split('-').map(Number),d=new Date(Date.UTC(y,m-1+delta,1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}`;
}
function moneyLocal(v){return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}

function captureRuntimeError(kind,value,source=''){
  try{
    const item={at:new Date().toISOString(),kind,message:String(value||'Erro desconhecido').slice(0,320),source:String(source||'').split('?')[0].slice(0,180),screen:document.querySelector('.section:not([hidden])')?.id||null,version:QUALITY_VERSION};
    const key='c360_runtime_errors_v1',old=JSON.parse(localStorage.getItem(key)||'[]');
    old.push(item);localStorage.setItem(key,JSON.stringify(old.slice(-40)));
  }catch(_){ }
}
window.addEventListener('error',e=>captureRuntimeError('error',e.message,e.filename));
window.addEventListener('unhandledrejection',e=>captureRuntimeError('promise',e.reason?.message||e.reason||'Promise rejeitada'));
window.c360QualityDiagnostics=()=>{try{return JSON.parse(localStorage.getItem('c360_runtime_errors_v1')||'[]')}catch{return[]}};

function installStyles(){
  if(q('#c360QualityStyles'))return;
  const s=document.createElement('style');s.id='c360QualityStyles';s.textContent=`
  .c360-fin-tools{display:flex;gap:8px;align-items:end;flex-wrap:wrap;margin:12px 0 2px}.c360-fin-tools .c360-field{min-width:145px}.c360-fin-tools label{display:block;font-size:10px;font-weight:850;letter-spacing:.35px;color:#64748b;margin-bottom:5px}.c360-fin-tools input,.c360-fin-tools select{height:40px;border:1px solid #d7e0ea;border-radius:10px;padding:0 10px;background:var(--card,#fff);color:inherit}.c360-page-info{font-size:11px;color:#64748b;min-width:105px;text-align:center;padding:10px 4px}.c360-dda-card{overflow:hidden}.c360-dda-grid{display:grid;grid-template-columns:minmax(0,1.4fr) repeat(3,minmax(110px,.55fr));gap:10px;align-items:stretch}.c360-dda-main,.c360-dda-kpi{border:1px solid #e2e8f0;border-radius:13px;padding:13px;background:rgba(248,250,252,.7)}.c360-dda-main h3{margin:0 0 4px}.c360-dda-main p{margin:0;color:#64748b;font-size:12px;line-height:1.45}.c360-dda-kpi span{font-size:9px;font-weight:900;color:#64748b;letter-spacing:.45px}.c360-dda-kpi b{display:block;margin-top:6px;font-size:17px}.c360-dda-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:11px}.c360-dda-state{display:inline-flex;border-radius:999px;padding:4px 8px;font-size:10px;font-weight:850;background:#eef2f7;color:#53657c;margin-top:7px}.c360-dda-state.ok{background:#e8f7ef;color:#147348}.c360-dda-state.warn{background:#fff3d8;color:#976100}.c360-dda-overlay{position:fixed;inset:0;background:rgba(5,12,24,.72);z-index:99999;padding:14px;display:none}.c360-dda-overlay.open{display:block}.c360-dda-framewrap{position:relative;width:min(1500px,100%);height:100%;margin:auto;border-radius:16px;overflow:hidden;background:#fff;box-shadow:0 20px 70px rgba(0,0,0,.35)}.c360-dda-frame{width:100%;height:100%;border:0;background:#fff}.c360-dda-close{position:absolute;right:12px;top:12px;z-index:4;border:0;border-radius:999px;width:42px;height:42px;font-size:22px;background:#fff;color:#17233a;box-shadow:0 3px 16px rgba(0,0,0,.22);cursor:pointer}.c360-quality-badge{font-size:9px;color:#94a3b8;margin-left:6px;white-space:nowrap}
  @media(max-width:850px){.c360-dda-grid{grid-template-columns:1fr 1fr}.c360-dda-main{grid-column:1/-1}.c360-dda-overlay{padding:0}.c360-dda-framewrap{border-radius:0}.c360-fin-tools .c360-field{min-width:calc(50% - 4px);flex:1}.c360-page-info{order:10;width:100%}}
  @media(prefers-color-scheme:dark){.c360-dda-main,.c360-dda-kpi{border-color:#2b3a50;background:rgba(19,31,48,.72)}.c360-fin-tools input,.c360-fin-tools select{border-color:#33445c;background:#111c2c}.c360-dda-main p,.c360-dda-kpi span,.c360-page-info,.c360-fin-tools label{color:#94a7bf}}
  html[data-theme="dark"] .c360-dda-main,html[data-theme="dark"] .c360-dda-kpi{border-color:#2b3a50;background:rgba(19,31,48,.72)}
  `;document.head.appendChild(s);
}

function ensureFinanceTools(){
  const list=q('#financeList');if(!list||q('#c360FinanceTools'))return;
  const card=list.closest('.card');if(!card)return;
  const tools=document.createElement('div');tools.id='c360FinanceTools';tools.className='c360-fin-tools';
  tools.innerHTML=`<div class="c360-field"><label>MÊS</label><input id="c360FinanceMonth" type="month"></div><div class="c360-field"><label>STATUS</label><select id="c360FinanceStatus"><option value="">Todos</option><option value="pending">Pendente</option><option value="overdue">Vencido</option><option value="paid">Pago</option><option value="planned">Planejado</option><option value="cancelled">Cancelado</option></select></div><button class="btn soft" id="c360FinPrevMonth" type="button">← Mês</button><button class="btn soft" id="c360FinNextMonth" type="button">Mês →</button><button class="btn soft" id="c360FinPrevPage" type="button">← Página</button><div class="c360-page-info" id="c360FinPageInfo">Página 1</div><button class="btn soft" id="c360FinNextPage" type="button">Página →</button>`;
  list.before(tools);
  const saved=localStorage.getItem('c360_finance_month');runtimeState.financeMonth=/^\d{4}-\d{2}$/.test(saved||'')?saved:brMonthNow();
  q('#c360FinanceMonth').value=runtimeState.financeMonth;q('#c360FinanceStatus').value=runtimeState.financeStatus;
  q('#c360FinanceMonth').addEventListener('change',()=>{runtimeState.financeMonth=q('#c360FinanceMonth').value||brMonthNow();localStorage.setItem('c360_finance_month',runtimeState.financeMonth);runtimeState.financePage=0;smartLoadFinance()});
  q('#c360FinanceStatus').addEventListener('change',()=>{runtimeState.financeStatus=q('#c360FinanceStatus').value;runtimeState.financePage=0;smartLoadFinance()});
  q('#c360FinPrevMonth').addEventListener('click',()=>{runtimeState.financeMonth=shiftMonth(runtimeState.financeMonth,-1);q('#c360FinanceMonth').value=runtimeState.financeMonth;localStorage.setItem('c360_finance_month',runtimeState.financeMonth);runtimeState.financePage=0;smartLoadFinance()});
  q('#c360FinNextMonth').addEventListener('click',()=>{runtimeState.financeMonth=shiftMonth(runtimeState.financeMonth,1);q('#c360FinanceMonth').value=runtimeState.financeMonth;localStorage.setItem('c360_finance_month',runtimeState.financeMonth);runtimeState.financePage=0;smartLoadFinance()});
  q('#c360FinPrevPage').addEventListener('click',()=>{if(runtimeState.financePage>0){runtimeState.financePage--;smartLoadFinance()}});
  q('#c360FinNextPage').addEventListener('click',()=>{if(runtimeState.financeHasNext){runtimeState.financePage++;smartLoadFinance()}});
}

function updateFinancePager(){
  const info=q('#c360FinPageInfo'),prev=q('#c360FinPrevPage'),next=q('#c360FinNextPage');
  if(info)info.textContent=`Página ${runtimeState.financePage+1} • até ${FIN_PAGE_SIZE} lançamentos`;
  if(prev)prev.disabled=runtimeState.financePage===0;if(next)next.disabled=!runtimeState.financeHasNext;
  const labels=[...document.querySelectorAll('#financeKpis .finance-kpi-label')];
  const label=labels.find(x=>/LANÇAMENTOS/i.test(x.textContent||''));if(label)label.textContent='LANÇAMENTOS NA PÁGINA';
}

async function smartLoadFinance(){
  try{
    if(typeof companyId==='undefined'||!companyId||typeof rest!=='function'||typeof renderFinanceView!=='function')return;
    ensureFinanceTools();
    const b=monthBounds(runtimeState.financeMonth||brMonthNow());runtimeState.financeMonth=b.month;
    const offset=runtimeState.financePage*FIN_PAGE_SIZE;
    let query='select=*&company_id=eq.'+encodeURIComponent(companyId)+'&issue_date=gte.'+b.start+'&issue_date=lt.'+b.next;
    if(runtimeState.financeStatus)query+='&status=eq.'+encodeURIComponent(runtimeState.financeStatus);
    query+='&order=issue_date.desc,created_at.desc&limit='+(FIN_PAGE_SIZE+1)+'&offset='+offset;
    const [rows,rep]=await Promise.all([
      rest('v2_financial_entries',query),
      rest('v2_report_monthly_financial','select=*&company_id=eq.'+encodeURIComponent(companyId)+'&reference_month=gte.'+b.start+'&reference_month=lt.'+b.next+'&limit=1')
    ]);
    const all=rows||[];runtimeState.financeHasNext=all.length>FIN_PAGE_SIZE;
    financeCache=all.slice(0,FIN_PAGE_SIZE);
    const r=(rep||[])[0];
    let income=Number(r?.income||0),expense=Number(r?.expense||0);
    if(!r&&runtimeState.financePage===0&&!runtimeState.financeHasNext&&!runtimeState.financeStatus){
      income=financeCache.filter(x=>x.entry_type==='income'&&x.status!=='cancelled').reduce((a,x)=>a+Number(x.amount||0),0);
      expense=financeCache.filter(x=>x.entry_type==='expense'&&x.status!=='cancelled').reduce((a,x)=>a+Number(x.amount||0),0);
    }
    financeViewState={income,expense};renderFinanceView();updateFinancePager();refreshDdaSummary();
  }catch(e){
    captureRuntimeError('finance-load',e?.message||e);
    const list=q('#financeList');if(list)list.innerHTML='<div class="error">Não foi possível carregar o Financeiro. '+escHtml(e?.message||e)+'</div>';
  }
}

function installManualFinanceFix(){
  try{
    if(typeof saveFinEntry!=='function'||saveFinEntry.__c360Quality)return;
    const fixed=async function(){
      const m=q('#finMsg'),btn=q('#saveFinEntry'),amount=Number(q('#finAmount')?.value||0),desc=(q('#finDescription')?.value||'').trim();
      if(!desc||amount<=0){if(m)m.textContent='Informe descrição e valor.';return}
      try{
        if(btn)btn.disabled=true;
        const u=typeof getUser==='function'?await getUser():null,d=q('#finIssueDate')?.value||new Date().toISOString().slice(0,10);
        await rest('v2_financial_entries','', 'POST',{company_id:companyId,entry_type:q('#finType')?.value||'expense',description:desc,amount,issue_date:d,due_date:q('#finDueDate')?.value||null,competence_date:d,status:'pending',counterparty_name:(q('#finCounterparty')?.value||'').trim()||null,source_type:'manual',metadata:{ui_quality_version:QUALITY_VERSION},created_by:u?.id||null});
        if(q('#finEditCard'))q('#finEditCard').style.display='none';if(m)m.textContent='';
        ['finDescription','finAmount','finDueDate','finCounterparty'].forEach(id=>{const el=q('#'+id);if(el)el.value=''});
        await smartLoadFinance();
      }catch(e){captureRuntimeError('finance-save',e?.message||e);if(m)m.textContent=e?.message||String(e)}finally{if(btn)btn.disabled=false}
    };
    fixed.__c360Quality=true;saveFinEntry=fixed;
  }catch(e){captureRuntimeError('finance-install',e?.message||e)}
}

function ensureDdaOverlay(){
  if(q('#c360DdaOverlay'))return;
  const o=document.createElement('div');o.id='c360DdaOverlay';o.className='c360-dda-overlay';o.setAttribute('aria-hidden','true');
  o.innerHTML='<div class="c360-dda-framewrap"><button class="c360-dda-close" id="c360DdaClose" type="button" aria-label="Fechar DDA">×</button><iframe class="c360-dda-frame" id="c360DdaFrame" title="DDA do Comando 360"></iframe></div>';
  document.body.appendChild(o);
  q('#c360DdaClose').addEventListener('click',closeDdaOverlay);o.addEventListener('click',e=>{if(e.target===o)closeDdaOverlay()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&o.classList.contains('open'))closeDdaOverlay()});
}
function openDdaOverlay(){ensureDdaOverlay();const o=q('#c360DdaOverlay'),f=q('#c360DdaFrame');if(f&&!f.src)f.src='./dda.html';o.classList.add('open');o.setAttribute('aria-hidden','false');document.body.style.overflow='hidden'}
function closeDdaOverlay(){const o=q('#c360DdaOverlay');if(!o)return;o.classList.remove('open');o.setAttribute('aria-hidden','true');document.body.style.overflow=''}

function ensureDdaCard(){
  const section=q('#financeiro'),list=q('#financeList');if(!section||!list||q('#c360DdaCard'))return;
  try{if(typeof deviceMode!=='undefined'&&deviceMode)return}catch(_){ }
  const listCard=list.closest('.card'),card=document.createElement('div');card.className='card c360-dda-card';card.id='c360DdaCard';
  card.innerHTML=`<div class="c360-dda-grid"><div class="c360-dda-main"><h3>🏦 DDA / Boletos bancários <span class="c360-quality-badge">INTEGRADO</span></h3><p>Boletos recebidos pelo DDA entram automaticamente como contas a pagar, sem digitação duplicada.</p><span class="c360-dda-state" id="c360DdaState">Verificando conexão...</span><div class="c360-dda-actions"><button class="btn primary" id="c360DdaOpen" type="button">ABRIR DDA</button><button class="btn soft" id="c360DdaRefresh" type="button">↻ ATUALIZAR STATUS</button></div></div><div class="c360-dda-kpi"><span>BOLETOS</span><b id="c360DdaTitles">—</b></div><div class="c360-dda-kpi"><span>A PAGAR</span><b id="c360DdaOpenAmount">—</b></div><div class="c360-dda-kpi"><span>VENCIDOS</span><b id="c360DdaOverdue">—</b></div></div>`;
  listCard.parentNode.insertBefore(card,listCard);q('#c360DdaOpen').addEventListener('click',openDdaOverlay);q('#c360DdaRefresh').addEventListener('click',refreshDdaSummary);
}

async function refreshDdaSummary(){
  const stateEl=q('#c360DdaState');if(!stateEl||typeof authFetch!=='function'||typeof companyId==='undefined'||!companyId)return;
  try{
    stateEl.textContent='Verificando conexão...';stateEl.className='c360-dda-state';
    const r=await authFetch('/functions/v1/comando360-dda',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({company_id:companyId,action:'status'})});
    const text=await r.text();let d={};try{d=text?JSON.parse(text):{}}catch{d={error:text}}
    if(!r.ok)throw new Error(d?.error||d?.message||('HTTP '+r.status));
    const t=d.totals||{};q('#c360DdaTitles').textContent=Number(t.titles||0).toLocaleString('pt-BR');q('#c360DdaOpenAmount').textContent=moneyLocal(t.open_amount||0);q('#c360DdaOverdue').textContent=Number(t.overdue||0).toLocaleString('pt-BR');
    const connected=!!d?.credentials_configured&&['connected','credentials_ready'].includes(d?.integration?.status);
    stateEl.textContent=connected?(d.integration.status==='connected'?'DDA conectado':'Credenciais salvas • pronto para testar'):'DDA ainda não configurado';stateEl.className='c360-dda-state '+(connected?'ok':'warn');
  }catch(e){captureRuntimeError('dda-status',e?.message||e);stateEl.textContent='Não foi possível consultar o DDA';stateEl.className='c360-dda-state warn'}
}

async function waitForApp(){
  for(let i=0;i<60;i++){
    const finance=q('#financeList');let ready=false;try{ready=!!finance&&typeof loadFinance==='function'&&typeof rest==='function'&&typeof companyId!=='undefined'&&!!companyId}catch(_){ }
    if(ready)return true;await new Promise(r=>setTimeout(r,250));
  }
  return false;
}

async function install(){
  if(runtimeState.installed)return;installStyles();
  const ready=await waitForApp();if(!ready){captureRuntimeError('quality-install','Aplicativo não ficou pronto para a camada de qualidade');return}
  runtimeState.installed=true;ensureFinanceTools();ensureDdaCard();ensureDdaOverlay();installManualFinanceFix();
  try{loadFinance=smartLoadFinance}catch(e){captureRuntimeError('finance-override',e?.message||e)}
  await smartLoadFinance();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,0));else setTimeout(install,0);
})();
