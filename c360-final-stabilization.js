(()=>{
'use strict';
if(window.C360_FINAL_STABILIZATION_VERSION)return;
const VERSION='2026.09.23-v1-final1';
const state={version:VERSION,monthlyLoads:0,fuelWarnings:0,lastFinanceCheck:0};
let observer=null,timer=null,monthlyBusy=false,financeBusy=false,pricingBusy=false;

const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
function isDevice(){return document.body?.classList.contains('device-mode')||false}
function activeScreen(){return document.querySelector('#screenHost .section.active')?.id||document.querySelector('.section.active')?.id||''}
function toast(title,message,kind='info'){
 try{if(typeof window.c360Toast==='function')return window.c360Toast(title,message,kind)}catch(_){}
 try{window.C360Release?.announce?.(`${title}. ${message}`)}catch(_){}
}
function restFn(){try{return typeof rest==='function'?rest:(typeof window.v2Rest==='function'?window.v2Rest:null)}catch{return null}}
function company(){try{return typeof companyId!=='undefined'&&companyId?companyId:null}catch{return null}}
function getFuelCache(){try{return Array.isArray(fuelCache)?fuelCache:[]}catch{return []}}
function getFuelVehicles(){try{return Array.isArray(fuelVehicles)?fuelVehicles:[]}catch{return []}}
function getPoultryOps(){try{return Array.isArray(poultryOpsCache)?poultryOpsCache:[]}catch{return []}}
function getPoultryTeams(){try{return Array.isArray(poultryTeams)?poultryTeams:[]}catch{return []}}

/* Exportações: havia chamadas a downloadText sem implementação global. */
if(typeof window.downloadText!=='function'){
 window.downloadText=function downloadText(filename,text,type='text/plain;charset=utf-8'){
  const blob=new Blob([String(text??'')],{type});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=String(filename||'arquivo.txt');a.style.display='none';
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
  return true;
 };
}

/* Compatibilidade de Apanha: o handler legado espera este campo mesmo em layouts onde ele não foi renderizado. */
function ensurePoultryCompatibilityFields(){
 const form=$('#poultryForm'),trigger=$('#newPoultryOp');if(!form||!trigger)return;
 if(!$('#poSavedAviary')){const input=document.createElement('input');input.type='hidden';input.id='poSavedAviary';form.appendChild(input)}
 if(!$('#aviaryMsg')){const msg=document.createElement('div');msg.id='aviaryMsg';msg.className='muted hidden';form.appendChild(msg)}
}

/* Edição de veículo não deve lançar erro quando um perfil sem formulário dispara uma ação residual. */
function hardenVehicleEditor(){
 const original=window.openVehicleEdit;
 if(typeof original!=='function'||original.__c360FinalWrapped)return;
 const wrapped=async function(...args){
  const card=$('#vehicleEditCard');
  if(!card){toast('Edição indisponível','Seu perfil não possui o formulário de edição de veículo nesta tela.','error');return false}
  try{return await original.apply(this,args)}catch(e){console.error('Comando 360 edição de veículo',e);toast('Não foi possível abrir o veículo','Atualize a tela e tente novamente.','error');return false}
 };
 wrapped.__c360FinalWrapped=true;wrapped.__c360Original=original;window.openVehicleEdit=wrapped;
}

/* Espelho mensal: popula funcionários ao entrar no Ponto, sem depender de abrir RH antes. */
async function ensureMonthlyEmployees(){
 if(isDevice()||monthlyBusy)return;
 const sel=$('#monthlyEmployee');if(!sel)return;
 const usable=$$('#monthlyEmployee option').some(o=>String(o.value||'').trim());
 if(usable)return;
 monthlyBusy=true;
 try{
  if(typeof window.loadEmployees==='function')await window.loadEmployees();
  const nowUsable=$$('#monthlyEmployee option').some(o=>String(o.value||'').trim());
  if(!nowUsable){
   let rows=[];try{rows=(typeof window.__rhEmployees!=='undefined'&&Array.isArray(window.__rhEmployees))?window.__rhEmployees:[]}catch(_){}
   const active=rows.filter(x=>x.status==='active');
   if(active.length)sel.innerHTML='<option value="">Selecione...</option>'+active.map(x=>`<option value="${esc(x.id)}">${esc(x.full_name)} • ${esc(x.employee_number||'')}</option>`).join('');
  }
  state.monthlyLoads++;
 }catch(e){console.warn('Comando 360 espelho mensal',e)}finally{monthlyBusy=false}
}

function isTrailerVehicle(v){
 const raw=[v?.description,v?.model,v?.make,v?.metadata?.vehicle_kind,v?.metadata?.crlv?.species_type].filter(Boolean).join(' ');
 return /(carretinha|carreta|reboque|semi-reboque|trailer)/i.test(raw);
}
function isTrailerOption(option){return /(carretinha|carreta|reboque|semi-reboque|trailer)/i.test(String(option?.textContent||''))}
function sanitizeFuelSelectors(){
 for(const sel of [$('#fuelVehicle'),$('#kmVehicle')]){
  if(!sel)continue;
  const selected=sel.value;
  [...sel.options].forEach(o=>{if(o.value&&isTrailerOption(o))o.remove()});
  if(selected&&![...sel.options].some(o=>o.value===selected))sel.value='';
 }
}
function latestFuelLog(vehicleId,beforeDate=null,excludeId=''){
 const rows=getFuelCache().filter(x=>String(x.vehicle_id||'')===String(vehicleId||'')&&String(x.id||'')!==String(excludeId||'')&&Number(x.odometer_km)>0)
  .filter(x=>!beforeDate||!x.fueled_at||new Date(x.fueled_at)<=beforeDate)
  .sort((a,b)=>new Date(b.fueled_at||0)-new Date(a.fueled_at||0));
 return rows[0]||null;
}
function severeOdometerDivergence(a,b){
 a=Number(a||0);b=Number(b||0);if(!(a>0&&b>0))return false;
 const hi=Math.max(a,b),lo=Math.min(a,b),diff=hi-lo;
 return diff>100000||hi/Math.max(lo,1)>3;
}
function reconcileFuelAutofill(){
 const sel=$('#fuelVehicle'),km=$('#fuelKm'),msg=$('#fuelMsg');if(!sel||!km||!sel.value)return;
 const v=getFuelVehicles().find(x=>String(x.id)===String(sel.value));
 if(v&&isTrailerVehicle(v)){sel.value='';km.value='';if(msg){msg.className='error';msg.textContent='Carretinhas/reboques não podem receber abastecimento direto.'}return}
 const last=latestFuelLog(sel.value);const current=Number(v?.current_odometer_km||km.value||0),lastKm=Number(last?.odometer_km||0);
 if(severeOdometerDivergence(current,lastKm)){
  km.value=lastKm||'';km.dataset.c360Reconciled='1';
  if(msg){msg.className='c360-data-warning';msg.textContent=`KM do cadastro diverge muito do último abastecimento (${lastKm.toLocaleString('pt-BR')} km). Confirme o hodômetro real antes de salvar.`}
 }
}
function parsePtNumber(value){
 const s=String(value||'').trim();if(!s)return NaN;
 if(s.includes(',')&&s.includes('.'))return Number(s.replace(/\./g,'').replace(',','.'));
 if(s.includes(','))return Number(s.replace(',','.'));
 return Number(s);
}
function flagFuelOutliers(){
 let n=0;
 $$('#fuelList .item').forEach(item=>{
  item.querySelectorAll('.pill,span,div').forEach(el=>{
   if(el.children.length)return;
   const t=String(el.textContent||'');const m=t.match(/([\d.]+(?:,\d+)?)\s*km\s*\/\s*l/i);if(!m)return;
   const value=parsePtNumber(m[1]);if(!(value>30))return;
   if(!el.dataset.c360OriginalText)el.dataset.c360OriginalText=t;
   el.textContent='⚠ consumo inconsistente';el.classList.add('c360-anomaly-pill');el.title=`Valor original: ${t}. Confira a base do hodômetro.`;n++;
  });
 });
 state.fuelWarnings=n;
}
function validateFuelBeforeSave(){
 const sel=$('#fuelVehicle'),kmEl=$('#fuelKm'),msg=$('#fuelMsg');if(!sel||!sel.value)return true;
 const vehicle=getFuelVehicles().find(v=>String(v.id)===String(sel.value));
 if(vehicle&&isTrailerVehicle(vehicle)){
  if(msg){msg.className='error';msg.textContent='Selecione uma condução motorizada. Carretinhas/reboques não recebem abastecimento direto.'}return false;
 }
 const km=Number(kmEl?.value||0),editId=$('#fuelEditId')?.value||'',last=latestFuelLog(sel.value,new Date($('#fuelDate')?.value||Date.now()),editId),lastKm=Number(last?.odometer_km||0);
 if(severeOdometerDivergence(km,lastKm)){
  if(msg){msg.className='error';msg.textContent=`KM bloqueado por divergência: ${km.toLocaleString('pt-BR')} km contra último registro confiável de ${lastKm.toLocaleString('pt-BR')} km. Corrija ou registre a quilometragem primeiro.`}
  kmEl?.focus();return false;
 }
 if(km>0&&lastKm>0&&km<lastKm-1000){
  if(msg){msg.className='error';msg.textContent=`O KM informado é menor que o último registro (${lastKm.toLocaleString('pt-BR')} km). Confira antes de salvar.`}kmEl?.focus();return false;
 }
 return true;
}
function hardenFuelSave(){
 const original=window.saveFuel;if(typeof original!=='function'||original.__c360FinalWrapped)return;
 const wrapped=async function(...args){if(!validateFuelBeforeSave())return false;return original.apply(this,args)};
 wrapped.__c360FinalWrapped=true;wrapped.__c360Original=original;window.saveFuel=wrapped;
}

/* RH: ativos por padrão, com busca e filtro, sem apagar arquivados. */
function ensureEmployeeFilters(){
 const list=$('#employeesList');if(!list||isDevice())return;
 let bar=$('#c360EmployeeFilters');
 if(!bar){
  bar=document.createElement('div');bar.id='c360EmployeeFilters';bar.className='c360-filterbar';
  bar.innerHTML='<input id="c360EmployeeSearch" type="search" placeholder="Buscar nome, matrícula, cargo ou equipe"><select id="c360EmployeeStatus"><option value="active">Ativos</option><option value="all">Todos</option><option value="archived">Arquivados</option></select>';
  list.parentElement?.insertBefore(bar,list);
  bar.addEventListener('input',applyEmployeeFilters);bar.addEventListener('change',applyEmployeeFilters);
 }
 applyEmployeeFilters();
}
function applyEmployeeFilters(){
 const list=$('#employeesList');if(!list)return;
 const q=norm($('#c360EmployeeSearch')?.value),status=$('#c360EmployeeStatus')?.value||'active';
 [...list.children].forEach(item=>{
  const text=norm(item.textContent),archived=text.includes('arquivado');
  const statusOk=status==='all'||(status==='archived'?archived:!archived),searchOk=!q||text.includes(q);
  item.style.display=statusOk&&searchOk?'':'none';
 });
}

/* Operações: data explícita + filtros administrativos por data/equipe/status. */
function ensurePoultryFilters(){
 const list=$('#poultryList');if(!list||isDevice())return;
 let bar=$('#c360PoultryFilters');
 if(!bar){
  bar=document.createElement('div');bar.id='c360PoultryFilters';bar.className='c360-filterbar c360-poultry-filters';
  bar.innerHTML='<input id="c360PoultryDate" type="date" aria-label="Filtrar apanhas por data"><select id="c360PoultryTeam"><option value="all">Todas as equipes</option></select><select id="c360PoultryStatus"><option value="all">Todos os status</option><option value="planned">Programadas</option><option value="in_progress">Em andamento</option><option value="completed">Concluídas</option><option value="cancelled">Canceladas</option></select><input id="c360PoultrySearch" type="search" placeholder="Buscar granja, produtor, caminhão…">';
  list.parentElement?.insertBefore(bar,list);
  bar.addEventListener('input',applyPoultryFilters);bar.addEventListener('change',applyPoultryFilters);
 }
 annotatePoultryItems();applyPoultryFilters();
}
function dateKey(value){try{return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value))}catch{return''}}
function annotatePoultryItems(){
 const list=$('#poultryList');if(!list)return;
 const ops=getPoultryOps(),teams=getPoultryTeams();
 const teamSel=$('#c360PoultryTeam');if(teamSel){
  const current=teamSel.value||'all';const active=teams.filter(t=>t.status!=='inactive');
  teamSel.innerHTML='<option value="all">Todas as equipes</option>'+active.map(t=>`<option value="${esc(t.id)}">${esc(t.name)}</option>`).join('');
  if([...teamSel.options].some(o=>o.value===current))teamSel.value=current;
 }
 [...list.children].forEach((item,i)=>{
  const op=ops[i];if(!op)return;
  const team=teams.find(t=>String(t.id)===String(op.team_id));const day=dateKey(op.scheduled_start||op.created_at);
  item.dataset.c360Date=day;item.dataset.c360Team=op.team_id||'';item.dataset.c360Status=op.status||'';
  let meta=item.querySelector(':scope > .c360-op-context');if(!meta){meta=document.createElement('div');meta.className='c360-op-context';item.prepend(meta)}
  const dateLabel=day?new Date(day+'T12:00:00-03:00').toLocaleDateString('pt-BR'):'Data não informada';
  meta.textContent=`📅 ${dateLabel}${team?.name?' • 👥 '+team.name:''}`;
 });
}
function applyPoultryFilters(){
 const list=$('#poultryList');if(!list)return;
 const day=$('#c360PoultryDate')?.value||'',team=$('#c360PoultryTeam')?.value||'all',status=$('#c360PoultryStatus')?.value||'all',q=norm($('#c360PoultrySearch')?.value);
 [...list.children].forEach(item=>{
  const ok=(!day||item.dataset.c360Date===day)&&(team==='all'||item.dataset.c360Team===team)&&(status==='all'||item.dataset.c360Status===status)&&(!q||norm(item.textContent).includes(q));
  item.style.display=ok?'':'none';
 });
}

/* Manutenção: "Em dia" não é sinônimo de "sem programação". */
function normalizeMaintenanceLabels(){
 const root=$('#manutencoes');if(!root)return;
 root.querySelectorAll('.item,.card,.maintenance-card').forEach(item=>{
  const text=norm(item.textContent);if(!/proximo:\s*(—|-|nao informado|sem)/.test(text))return;
  item.querySelectorAll('.pill,.status,.badge').forEach(p=>{if(norm(p.textContent)==='em dia'){p.textContent='Sem programação';p.classList.remove('ok');p.classList.add('warn')}});
 });
}

/* Erros conhecidos devem aparecer em português e com ação útil. */
function normalizeUserFacingMessages(root=document){
 root.querySelectorAll?.('.error,.muted,.okmsg,[role="alert"]').forEach(el=>{
  const t=String(el.textContent||'').trim();
  if(t==='Invalid login credentials')el.textContent='E-mail ou senha inválidos. Confira os dados e tente novamente.';
  if(/Failed to fetch/i.test(t))el.textContent='Não foi possível conectar ao servidor. Confira a internet e tente novamente.';
 });
}

function monthWindow(){
 const now=new Date(),y=now.getFullYear(),m=now.getMonth();
 const start=new Date(y,m,1,0,0,0),end=new Date(y,m+1,1,0,0,0);
 const d=x=>x.toISOString();return{start:d(start),end:d(end),startDate:start.toISOString().slice(0,10),endDate:end.toISOString().slice(0,10)};
}
async function refreshFinanceReconciliation(){
 if(isDevice()||activeScreen()!=='financeiro'||financeBusy)return;
 const rf=restFn(),cid=company();if(!rf||!cid)return;
 financeBusy=true;state.lastFinanceCheck=Date.now();
 try{
  const w=monthWindow(),safe=p=>Promise.resolve(p).catch(()=>[]);
  const [fuel,maintenance,inventory,financial]=await Promise.all([
   safe(rf('v2_fuel_logs','select=id,total_amount&company_id=eq.'+cid+'&fueled_at=gte.'+encodeURIComponent(w.start)+'&fueled_at=lt.'+encodeURIComponent(w.end))),
   safe(rf('v2_work_orders','select=id,total_amount,status,created_at&company_id=eq.'+cid+'&created_at=gte.'+encodeURIComponent(w.start)+'&created_at=lt.'+encodeURIComponent(w.end))),
   safe(rf('v2_inventory_movements','select=id,movement_type,quantity,unit_cost,occurred_at&company_id=eq.'+cid+'&movement_type=eq.in&occurred_at=gte.'+encodeURIComponent(w.start)+'&occurred_at=lt.'+encodeURIComponent(w.end))),
   safe(rf('v2_financial_entries','select=id,entry_type,amount,source_type,source_id,issue_date&company_id=eq.'+cid+'&issue_date=gte.'+w.startDate+'&issue_date=lt.'+w.endDate))
  ]);
  const fuelTotal=(fuel||[]).reduce((a,x)=>a+Number(x.total_amount||0),0);
  const maintTotal=(maintenance||[]).reduce((a,x)=>a+Number(x.total_amount||0),0);
  const inventoryTotal=(inventory||[]).reduce((a,x)=>a+Number(x.quantity||0)*Number(x.unit_cost||0),0);
  const financeExpense=(financial||[]).filter(x=>x.entry_type==='expense').reduce((a,x)=>a+Number(x.amount||0),0);
  const operational=fuelTotal+maintTotal+inventoryTotal;
  let el=$('#c360FinanceReconciliationNotice');
  if(!(operational>0)){el?.remove();return}
  if(!el){el=document.createElement('div');el.id='c360FinanceReconciliationNotice';el.className='c360-reconciliation-notice';const section=$('#financeiro');const anchor=section?.querySelector('.v2-kpis,.finance-kpis,.grid');if(anchor)anchor.insertAdjacentElement('afterend',el);else section?.prepend(el)}
  const mismatch=Math.abs(operational-financeExpense)>1;
  el.dataset.state=mismatch?'attention':'ok';
  el.innerHTML='<strong>'+(mismatch?'⚠ Conciliação financeira pendente':'✓ Custos operacionais conciliados')+'</strong><div>Combustível: <b>'+money(fuelTotal)+'</b> • Manutenção: <b>'+money(maintTotal)+'</b> • Entradas de estoque: <b>'+money(inventoryTotal)+'</b> • Despesas no Financeiro: <b>'+money(financeExpense)+'</b></div>'+(mismatch?'<small>Não trate o “resultado” como lucro líquido enquanto esses módulos não estiverem conciliados. Os registros originais foram preservados.</small>':'');
 }catch(e){console.warn('Comando 360 conciliação financeira',e)}finally{financeBusy=false}
}

async function refreshPricingTraceability(){
 if(isDevice()||activeScreen()!=='configuracoes'||pricingBusy)return;
 const rf=restFn(),cid=company();if(!rf||!cid)return;pricingBusy=true;
 try{
  const safe=p=>Promise.resolve(p).catch(()=>[]),w=monthWindow();
  const [contracts,ops]=await Promise.all([
   safe(rf('v2_contracts','select=id,title,status,billing_model,default_price,starts_on,ends_on&company_id=eq.'+cid+'&status=eq.active')),
   safe(rf('v2_operations','select=id,status,actual_revenue,actual_birds,customer_name,scheduled_start&company_id=eq.'+cid+'&operation_type=eq.poultry_catching&status=eq.completed&scheduled_start=gte.'+encodeURIComponent(w.start)+'&scheduled_start=lt.'+encodeURIComponent(w.end)))
  ]);
  let el=$('#c360PricingTraceabilityNotice');
  const revenue=(ops||[]).reduce((a,x)=>a+Number(x.actual_revenue||0),0);
  if((contracts||[]).length||!(revenue>0)){el?.remove();return}
  if(!el){el=document.createElement('div');el.id='c360PricingTraceabilityNotice';el.className='c360-reconciliation-notice';const root=$('#configuracoes');root?.querySelector('.v2hero')?.insertAdjacentElement('afterend',el);if(!el.parentElement)root?.prepend(el)}
  el.dataset.state='attention';el.innerHTML='<strong>⚠ Tarifa em uso sem contrato ativo rastreável</strong><div>Existem receitas de apanha no mês, mas nenhum contrato ativo aparece no cadastro comercial.</div><small>Cadastre a origem da tarifa antes de alterar preços. Receitas históricas devem permanecer com o valor usado na data da operação.</small>';
 }catch(e){console.warn('Comando 360 rastreabilidade de tarifa',e)}finally{pricingBusy=false}
}

function runUiPass(){
 ensurePoultryCompatibilityFields();hardenVehicleEditor();hardenFuelSave();sanitizeFuelSelectors();flagFuelOutliers();ensureEmployeeFilters();ensurePoultryFilters();normalizeMaintenanceLabels();normalizeUserFacingMessages(document);
 if(activeScreen()==='ponto')ensureMonthlyEmployees();
 if(activeScreen()==='financeiro'&&Date.now()-state.lastFinanceCheck>5000)refreshFinanceReconciliation();
 if(activeScreen()==='configuracoes')refreshPricingTraceability();
}
function schedule(){clearTimeout(timer);timer=setTimeout(runUiPass,60)}
function init(){
 runUiPass();
 document.addEventListener('c360:screen-changed',schedule);
 document.addEventListener('c360:bootstrap-ready',schedule);
 document.addEventListener('focusin',e=>{if(e.target?.id==='monthlyEmployee')ensureMonthlyEmployees()});
 document.addEventListener('change',e=>{if(e.target?.id==='fuelVehicle')setTimeout(()=>{sanitizeFuelSelectors();reconcileFuelAutofill()},0)});
 window.addEventListener('online',schedule);window.addEventListener('resize',schedule);
 observer=new MutationObserver(schedule);observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden']});
 setTimeout(runUiPass,300);setTimeout(runUiPass,1200);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.C360_FINAL_STABILIZATION_VERSION=VERSION;
window.C360Final={version:VERSION,state,run:runUiPass,validateFuelBeforeSave,ensureMonthlyEmployees,refreshFinanceReconciliation,refreshPricingTraceability,isTrailerVehicle};
})();