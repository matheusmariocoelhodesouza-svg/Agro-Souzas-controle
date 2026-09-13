(()=>{
'use strict';
const VERSION='2026.09.13-saas1';
const q=(s,r=document)=>r.querySelector(s);
const safe=v=>typeof esc==='function'?esc(String(v??'')):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const PLANS={client_zero:'Piloto interno',essential:'Essencial',professional:'Profissional',complete:'360 Completo'};
const SUB_STATUS={trial:'Teste',active:'Ativo',past_due:'Pagamento pendente',suspended:'Suspenso',cancelled:'Cancelado'};
const BILL_STATUS={not_configured:'Gateway não conectado',ready:'Pronto para ativar',active:'Ativo',past_due:'Pagamento pendente',suspended:'Suspenso',cancelled:'Cancelado'};
let state={user:null,isPlatformAdmin:false,platformRole:null,documents:[],acceptances:[],billing:null,subscription:null,fiscal:[],companies:[],subscriptions:[],billings:[],incidents:[],loading:false,loadedAt:0};
let timer=null,observer=null;

function cid(){try{return typeof companyId!=='undefined'?companyId:null}catch(_){return null}}
function isDevice(){try{return !!(typeof deviceMode!=='undefined'&&deviceMode)||document.body.classList.contains('device-mode')}catch(_){return document.body.classList.contains('device-mode')}}
function toast(a,b,t='success'){try{if(typeof c360Toast==='function')return c360Toast(a,b,t)}catch(_){} if(t==='error')console.error(a,b)}
function fmtDate(v,withTime=false){if(!v)return'—';const d=new Date(v);if(!Number.isFinite(d.getTime()))return'—';return withTime?d.toLocaleString('pt-BR'):d.toLocaleDateString('pt-BR')}
function plan(v){return PLANS[v]||v||'Sem plano'}
function subStatus(v){return SUB_STATUS[v]||v||'Não configurado'}
function billStatus(v){return BILL_STATUS[v]||v||'Não configurado'}
function provider(v){if(!v||v==='unconfigured')return'Não conectado';return String(v).replaceAll('_',' ').replace(/\b\w/g,x=>x.toUpperCase())}
function activeScreen(){return q('#screenHost .section.active')?.id||q('.section.active')?.id||''}
async function safeRest(table,query='',method='GET',body){try{return await rest(table,query,method,body)}catch(e){console.warn('C360 SaaS',table,e);return method==='GET'?[]:null}}

function ensureSettingsUi(){
 const settings=q('#configuracoes');if(!settings||isDevice())return false;
 const subBox=q('#settingsSubscription');const anchor=subBox?.closest('.settings-card,.card')||settings.querySelector('.settings-card,.card');
 let shell=q('#c360SaasReadiness');
 if(!shell){
  shell=document.createElement('div');shell.id='c360SaasReadiness';shell.className='c360-saas-shell';
  shell.innerHTML='<div id="c360SaasLegal"></div><div id="c360SaasBilling"></div><div id="c360SaasPlatform"></div>';
  if(anchor)anchor.insertAdjacentElement('afterend',shell);else settings.appendChild(shell);
 }
 return true;
}
function acceptanceKey(a){return `${a.document_code}@${a.document_version}`}
function renderLegal(){
 const box=q('#c360SaasLegal');if(!box)return;
 const accepted=new Map(state.acceptances.map(a=>[acceptanceKey(a),a]));
 const docs=state.documents||[];const pending=docs.filter(d=>d.requires_acceptance&&!accepted.has(`${d.document_code}@${d.version}`));
 const rows=docs.map(d=>{const a=accepted.get(`${d.document_code}@${d.version}`),ok=!!a;return `<div class="c360-saas-doc"><div><strong>${safe(d.title)}</strong><small>Versão ${safe(d.version)}${ok?' • aceito em '+safe(fmtDate(a.accepted_at,true)):d.requires_acceptance?' • aceite pendente':' • aviso informativo'}</small></div><div class="c360-saas-actions"><a class="btn soft" href="${safe(d.document_url)}" target="_blank" rel="noopener">LER</a>${d.requires_acceptance&&!ok?`<button class="btn primary" type="button" data-saas-accept="${safe(d.document_code)}" data-saas-version="${safe(d.version)}">LI E CONCORDO</button>`:`<span class="c360-saas-pill ${ok?'ok':'neutral'}">${ok?'✓ ACEITO':'AVISO'}</span>`}</div></div>`}).join('');
 box.innerHTML=`<div class="card settings-card c360-saas-card"><div class="c360-saas-head"><div><span class="c360-saas-eyebrow">PRIVACIDADE & LGPD</span><h3>Termos, privacidade e biometria</h3><p>Controle de versão e aceite do usuário administrativo.</p></div><span class="c360-saas-pill ${pending.length?'warn':'ok'}">${pending.length?pending.length+' PENDENTE'+(pending.length>1?'S':''):'✓ EM DIA'}</span></div><div class="c360-saas-docs">${rows||'<div class="muted">Nenhum documento ativo.</div>'}</div><div class="c360-saas-note">O Comando 360 registra quem aceitou, a versão e o horário. Para biometria de funcionários, a empresa continua responsável por definir a base legal adequada, informar os titulares e revisar situações com impacto trabalhista.</div></div>`;
}
function renderBilling(){
 const box=q('#c360SaasBilling');if(!box)return;const b=state.billing||{},s=state.subscription||{};
 const gatewayReady=b.provider&&b.provider!=='unconfigured';
 const cycleEnd=s.status==='trial'?s.trial_ends_at:s.current_period_end;
 box.innerHTML=`<div class="card settings-card c360-saas-card"><div class="c360-saas-head"><div><span class="c360-saas-eyebrow">ASSINATURA & COBRANÇA</span><h3>Ciclo comercial</h3><p>Base pronta para cobrança recorrente sem armazenar segredo de pagamento no navegador.</p></div><span class="c360-saas-pill ${gatewayReady?'ok':'warn'}">${gatewayReady?'GATEWAY CONECTADO':'GATEWAY PENDENTE'}</span></div><div class="c360-saas-kpis"><div><small>PLANO</small><b>${safe(plan(s.plan_code))}</b></div><div><small>ASSINATURA</small><b>${safe(subStatus(s.status))}</b></div><div><small>COBRANÇA</small><b>${safe(billStatus(b.status))}</b></div><div><small>PRÓXIMO CICLO</small><b>${safe(fmtDate(b.next_billing_at||cycleEnd))}</b></div></div><div class="c360-saas-line"><span>Gateway</span><strong>${safe(provider(b.provider))}</strong></div><div class="c360-saas-line"><span>Último pagamento confirmado</span><strong>${safe(fmtDate(b.last_payment_at))}</strong></div><div class="c360-saas-note">${gatewayReady?'O cadastro do gateway existe. A confirmação de pagamentos deve chegar por integração segura no backend.':'A estrutura de assinatura está pronta, mas nenhuma cobrança real é disparada enquanto um provedor de pagamento não for conectado com credenciais seguras no backend.'}</div></div>`;
}
function incidentMap(){const m=new Map();for(const i of state.incidents){if(i.status==='resolved'||i.status==='ignored')continue;m.set(i.company_id,(m.get(i.company_id)||0)+1)}return m}
function planOptions(value){return Object.entries(PLANS).map(([k,v])=>`<option value="${k}" ${k===value?'selected':''}>${safe(v)}</option>`).join('')}
function statusOptions(value){return Object.entries(SUB_STATUS).map(([k,v])=>`<option value="${k}" ${k===value?'selected':''}>${safe(v)}</option>`).join('')}
function renderPlatform(){
 const box=q('#c360SaasPlatform');if(!box)return;if(!state.isPlatformAdmin){box.innerHTML='';return}
 const sm=new Map(state.subscriptions.map(x=>[x.company_id,x])),bm=new Map(state.billings.map(x=>[x.company_id,x])),im=incidentMap();
 const trials=state.subscriptions.filter(x=>x.status==='trial').length,past=state.subscriptions.filter(x=>x.status==='past_due'||x.status==='suspended').length,open=state.incidents.filter(x=>x.status==='open'||x.status==='investigating').length;
 const companies=state.companies.map(c=>{const s=sm.get(c.id),b=bm.get(c.id),issues=im.get(c.id)||0;return `<div class="c360-saas-company" data-company="${safe(c.id)}"><div class="c360-saas-company-name"><strong>${safe(c.trade_name||c.legal_name)}</strong><small>${safe(c.status||'active')} • ${issues?issues+' incidente'+(issues>1?'s':''):'sem incidente aberto'}</small></div><label>Plano<select data-saas-plan>${planOptions(s?.plan_code||'complete')}</select></label><label>Status<select data-saas-status>${statusOptions(s?.status||'trial')}</select></label><div class="c360-saas-billing-mini"><small>COBRANÇA</small><b>${safe(billStatus(b?.status))}</b><span>${safe(provider(b?.provider))}</span></div><button class="btn soft" type="button" data-saas-save-company="${safe(c.id)}">SALVAR</button></div>`}).join('');
 const incidents=state.incidents.filter(i=>i.status==='open'||i.status==='investigating').slice(0,20).map(i=>{const c=state.companies.find(x=>x.id===i.company_id);return `<div class="c360-saas-incident ${safe(i.severity)}"><div><strong>${safe(i.title)}</strong><small>${safe(c?.trade_name||c?.legal_name||'Empresa')} • ${Number(i.occurrence_count||1)} ocorrência(s) • ${safe(fmtDate(i.last_seen_at,true))}</small>${i.last_route?`<span>${safe(i.last_route)}</span>`:''}</div><button class="btn soft" type="button" data-saas-resolve="${safe(i.id)}">RESOLVER</button></div>`}).join('');
 box.innerHTML=`<div class="card settings-card settings-wide c360-saas-card c360-platform-card"><div class="c360-saas-head"><div><span class="c360-saas-eyebrow">ADMINISTRAÇÃO DO COMANDO 360</span><h3>Central SaaS</h3><p>Empresas, planos, situação comercial e incidentes técnicos em uma visão.</p></div><button class="btn soft" type="button" data-saas-refresh>↻ ATUALIZAR</button></div><div class="c360-saas-kpis platform"><div><small>EMPRESAS</small><b>${state.companies.length}</b></div><div><small>EM TESTE</small><b>${trials}</b></div><div><small>PENDÊNCIAS</small><b>${past}</b></div><div><small>INCIDENTES</small><b>${open}</b></div></div><div class="c360-saas-subhead"><strong>Clientes e assinaturas</strong><span>Alterações ficam registradas no histórico comercial.</span></div><div class="c360-saas-companies">${companies||'<div class="muted">Nenhuma empresa encontrada.</div>'}</div><div class="c360-saas-subhead"><strong>Incidentes técnicos</strong><span>Erros críticos ou recorrentes são agrupados automaticamente.</span></div><div class="c360-saas-incidents">${incidents||'<div class="c360-saas-clean">✓ Nenhum incidente aberto.</div>'}</div></div>`;
}
function renderFiscal(){
 const page=q('#fiscal .fiscal-page');if(!page||isDevice())return;let card=q('#c360FiscalReadiness');if(!card){card=document.createElement('div');card.id='c360FiscalReadiness';card.className='fiscal-card c360-fiscal-readiness';const a=q('#fiscalIssuanceHub');if(a)a.insertAdjacentElement('afterend',card);else page.prepend(card)}
 const active=state.fiscal.filter(x=>x.status==='active'||x.status==='configured'),errors=state.fiscal.filter(x=>x.status==='error'),cert=state.fiscal.filter(x=>x.certificate_expires_at).sort((a,b)=>new Date(a.certificate_expires_at)-new Date(b.certificate_expires_at))[0];
 card.innerHTML=`<div class="c360-saas-head"><div><span class="c360-saas-eyebrow">AUTOMAÇÃO FISCAL SEGURA</span><h3>Prontidão de integração oficial</h3><p>Certificado, integração e transmissão precisam ser confirmados pelo ambiente oficial.</p></div><span class="c360-saas-pill ${active.length?'ok':'neutral'}">${active.length?active.length+' CONFIGURADA'+(active.length>1?'S':''):'EMISSÃO ASSISTIDA'}</span></div><div class="c360-saas-kpis"><div><small>INTEGRAÇÕES</small><b>${active.length}</b></div><div><small>ERROS</small><b>${errors.length}</b></div><div><small>CERTIFICADO</small><b>${cert?safe(fmtDate(cert.certificate_expires_at)):'Não cadastrado'}</b></div><div><small>MODO</small><b>${active.length?'Integração controlada':'Portais oficiais'}</b></div></div><div class="c360-saas-note">${active.length?'O Comando 360 acompanha o estado das integrações. Uma obrigação só deve ser tratada como transmitida quando houver retorno oficial válido.':'Enquanto não houver integração/certificado homologados, o sistema mantém o fluxo seguro: prepara, abre o portal oficial, registra a guia e arquiva comprovantes sem fingir transmissão.'}</div>`;
}
function renderAll(){if(ensureSettingsUi()){renderLegal();renderBilling();renderPlatform()}renderFiscal();enhanceAccountMenu()}

async function loadPlatform(){if(!state.isPlatformAdmin){state.companies=[];state.subscriptions=[];state.billings=[];state.incidents=[];return}
 const [c,s,b,i]=await Promise.all([
  safeRest('v2_companies','select=id,legal_name,trade_name,status,created_at&order=created_at.asc'),
  safeRest('v2_subscriptions','select=id,company_id,plan_code,status,trial_ends_at,current_period_start,current_period_end,updated_at&order=created_at.asc'),
  safeRest('v2_billing_accounts','select=company_id,provider,status,billing_email,next_billing_at,last_payment_at,grace_until,cancel_at_period_end,updated_at&order=created_at.asc'),
  safeRest('v2_platform_incidents','select=id,company_id,severity,status,title,last_message,last_route,first_seen_at,last_seen_at,occurrence_count&order=last_seen_at.desc&limit=100')
 ]);state.companies=c||[];state.subscriptions=s||[];state.billings=b||[];state.incidents=i||[];
}
async function load(force=false){
 const id=cid();if(!id||isDevice()||state.loading)return;if(!force&&state.loadedAt&&Date.now()-state.loadedAt<25000){renderAll();return}
 state.loading=true;
 try{
  const user=typeof getUser==='function'?await getUser().catch(()=>null):null;state.user=user;if(!user)return;
  const [admin,docs,acc,billing,subs,fiscal]=await Promise.all([
   safeRest('v2_platform_admins','select=role,active&user_id=eq.'+user.id+'&active=eq.true&limit=1'),
   safeRest('v2_legal_documents','select=document_code,version,title,category,effective_at,document_url,requires_acceptance,active&active=eq.true&order=effective_at.desc'),
   safeRest('v2_legal_acceptances','select=document_code,document_version,accepted_at,acceptance_source&company_id=eq.'+id+'&user_id=eq.'+user.id),
   safeRest('v2_billing_accounts','select=company_id,provider,status,billing_email,next_billing_at,last_payment_at,grace_until,cancel_at_period_end,updated_at&company_id=eq.'+id+'&limit=1'),
   safeRest('v2_subscriptions','select=id,company_id,plan_code,status,trial_ends_at,current_period_start,current_period_end,limits,updated_at&company_id=eq.'+id+'&limit=1'),
   safeRest('v2_fiscal_integrations','select=provider,status,certificate_type,certificate_subject,certificate_expires_at,last_test_at,last_success_at,last_error&company_id=eq.'+id)
  ]);
  state.isPlatformAdmin=!!admin?.[0]?.active;state.platformRole=admin?.[0]?.role||null;state.documents=docs||[];state.acceptances=acc||[];state.billing=billing?.[0]||null;state.subscription=subs?.[0]||null;state.fiscal=fiscal||[];await loadPlatform();state.loadedAt=Date.now();renderAll();
 }finally{state.loading=false}
}
async function acceptLegal(code,version,btn){
 const doc=state.documents.find(d=>d.document_code===code&&d.version===version);if(!doc||!doc.requires_acceptance||!state.user||!cid())return;
 if(!confirm('Confirma que leu e concorda com “'+doc.title+'”, versão '+doc.version+'?'))return;
 const old=btn?.textContent;if(btn){btn.disabled=true;btn.textContent='REGISTRANDO…'}
 try{
  const out=await safeRest('v2_legal_acceptances','','POST',{company_id:cid(),user_id:state.user.id,document_code:code,document_version:version,acceptance_source:'web_admin',context:{app:'comando360',module_version:VERSION}});
  if(out===null)throw new Error('Falha ao registrar aceite');toast('Aceite registrado','A versão do documento ficou vinculada ao seu usuário.');await load(true);
 }catch(e){toast('Não foi possível registrar',e.message||String(e),'error')}
 finally{if(btn){btn.disabled=false;btn.textContent=old||'LI E CONCORDO'}}
}
async function saveCompanySubscription(companyId,root,btn){
 if(!state.isPlatformAdmin)return;const newPlan=root.querySelector('[data-saas-plan]')?.value,newStatus=root.querySelector('[data-saas-status]')?.value;if(!newPlan||!newStatus)return;
 const old=state.subscriptions.find(x=>x.company_id===companyId)||null;if(old?.plan_code===newPlan&&old?.status===newStatus){toast('Sem alterações','Plano e status já estão assim.','info');return}
 const company=state.companies.find(x=>x.id===companyId);if(!confirm('Salvar plano/status de '+(company?.trade_name||company?.legal_name||'esta empresa')+'?'))return;
 btn.disabled=true;const original=btn.textContent;btn.textContent='SALVANDO…';
 try{
  const now=new Date().toISOString();let changed;
  if(old){changed=await safeRest('v2_subscriptions','company_id=eq.'+companyId,'PATCH',{plan_code:newPlan,status:newStatus,updated_at:now})}
  else{const trialEnd=newStatus==='trial'?new Date(Date.now()+14*86400000).toISOString():null;changed=await safeRest('v2_subscriptions','','POST',{company_id:companyId,plan_code:newPlan,status:newStatus,trial_ends_at:trialEnd,current_period_start:newStatus==='active'?now:null})}
  if(changed===null)throw new Error('Falha ao atualizar assinatura');
  await safeRest('v2_subscription_events','','POST',{company_id:companyId,event_type:old?'subscription_updated':'subscription_created',source:'platform_admin',old_plan_code:old?.plan_code||null,new_plan_code:newPlan,old_status:old?.status||null,new_status:newStatus,effective_at:now,actor_user_id:state.user?.id||null,metadata:{module_version:VERSION}});
  toast('Assinatura atualizada',plan(newPlan)+' • '+subStatus(newStatus));await load(true);
 }catch(e){toast('Falha ao atualizar',e.message||String(e),'error')}
 finally{btn.disabled=false;btn.textContent=original}
}
async function resolveIncident(id,btn){if(!state.isPlatformAdmin)return;if(!confirm('Marcar este incidente como resolvido?'))return;btn.disabled=true;try{const out=await safeRest('v2_platform_incidents','id=eq.'+id,'PATCH',{status:'resolved',resolved_at:new Date().toISOString(),resolved_by:state.user?.id||null,updated_at:new Date().toISOString()});if(out===null)throw new Error('Falha ao resolver');toast('Incidente resolvido','Ele continuará disponível no histórico técnico.');await load(true)}catch(e){toast('Falha ao resolver',e.message||String(e),'error')}finally{btn.disabled=false}}
function enhanceAccountMenu(){if(!state.isPlatformAdmin)return;const menu=q('#c360AccountMenu');if(!menu||menu.querySelector('[data-saas-open]'))return;const actions=menu.querySelector('.c360-account-actions');if(!actions)return;const b=document.createElement('button');b.type='button';b.dataset.saasOpen='1';b.textContent='◫ Central SaaS';actions.prepend(b)}
function openPlatform(){try{if(typeof v2Go==='function')v2Go('configuracoes');else q('[data-v2tab="configuracoes"]')?.click()}catch(_){}setTimeout(()=>{q('#c360SaasPlatform')?.scrollIntoView({behavior:'smooth',block:'start'})},250)}
function bind(){document.addEventListener('click',e=>{const a=e.target.closest?.('[data-saas-accept]');if(a){e.preventDefault();acceptLegal(a.dataset.saasAccept,a.dataset.saasVersion,a);return}const s=e.target.closest?.('[data-saas-save-company]');if(s){e.preventDefault();saveCompanySubscription(s.dataset.saasSaveCompany,s.closest('.c360-saas-company'),s);return}const r=e.target.closest?.('[data-saas-resolve]');if(r){e.preventDefault();resolveIncident(r.dataset.saasResolve,r);return}if(e.target.closest?.('[data-saas-refresh]')){e.preventDefault();load(true);return}if(e.target.closest?.('[data-saas-open]')){e.preventDefault();openPlatform();return}});document.addEventListener('c360:screen-changed',e=>{if(e.detail?.id==='configuracoes'||e.detail?.id==='fiscal')setTimeout(()=>load(true),120)})}
function watch(){if(observer)return;observer=new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(()=>{if(isDevice())return;if(q('#configuracoes')||q('#fiscal .fiscal-page')){renderAll();if(!state.loadedAt)load(false)}},120)});observer.observe(document.body,{childList:true,subtree:true})}
function init(){if(isDevice())return;bind();watch();const t=setInterval(()=>{if(cid()&&typeof rest==='function'){clearInterval(t);load(true)}},350);setTimeout(()=>clearInterval(t),15000)}
window.C360SaaS={version:VERSION,refresh:()=>load(true),openPlatform};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
