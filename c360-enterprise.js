(()=>{
'use strict';
const VERSION='2026.09.25-e2';
const q=(s,r=document)=>r.querySelector(s);
const qq=(s,r=document)=>[...r.querySelectorAll(s)];
const safe=v=>typeof esc==='function'?esc(String(v??'')):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let installPrompt=null,context=null,loading=false,observer=null;
const storageKey='c360_launchpad_hidden_v1';

function cid(){try{return typeof companyId!=='undefined'?companyId:null}catch(_){return null}}
function isDevice(){try{return !!(typeof deviceMode!=='undefined'&&deviceMode)||document.body.classList.contains('device-mode')}catch(_){return document.body.classList.contains('device-mode')}}
function daysLeft(v){if(!v)return null;const ms=new Date(v).getTime()-Date.now();return Number.isFinite(ms)?Math.max(0,Math.ceil(ms/86400000)):null}
function initials(name){return String(name||'Usuário').trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase()||'U'}
function planLabel(s){const code=String(s?.plan_code||'').toLowerCase();if(code==='client_zero')return'Piloto interno';if(code==='essential')return'Essencial';if(code==='professional')return'Profissional';if(code==='complete')return'360 Completo';return code||'Sem plano'}
function statusLabel(s){return({trial:'Teste',active:'Ativo',past_due:'Pagamento pendente',cancelled:'Cancelado',suspended:'Suspenso'})[s]||s||'—'}
function roleLabel(code){return({owner:'Proprietário',admin:'Administrador',manager:'Gestor',supervisor:'Supervisor',viewer:'Consulta'})[code]||code||'Acesso administrativo'}
function toast(a,b,t='success'){try{if(typeof c360Toast==='function')c360Toast(a,b,t)}catch(_){}}

async function loadContext(force=false){
 if(loading||!cid()||isDevice())return context; if(context&&!force)return context; loading=true;
 try{
  const id=cid();
  const safeCall=p=>p.catch(()=>[]);
  const user=typeof getUser==='function'?await getUser().catch(()=>null):null;
  const [companies,subs,members,roles]=await Promise.all([
    safeCall(rest('v2_companies','select=id,legal_name,trade_name,status,created_at& id=eq.'.replace(' ','')+id+'&limit=1')),
    safeCall(rest('v2_subscriptions','select=plan_code,status,trial_ends_at,current_period_end&company_id=eq.'+id+'&limit=1')),
    safeCall(rest('v2_company_members','select=role_id,status&company_id=eq.'+id+'&user_id=eq.'+(user?.id||'00000000-0000-0000-0000-000000000000')+'&limit=1')),
    safeCall(rest('v2_roles','select=id,code,name&or=(company_id.eq.'+id+',company_id.is.null)'))
  ]);
  const company=companies?.[0]||{},sub=subs?.[0]||null,member=members?.[0]||null,role=(roles||[]).find(r=>r.id===member?.role_id)||null;
  context={user,company,sub,member,role};
  renderAccount();renderPlanBadge();renderSidebarProduct();
  return context;
 }finally{loading=false}
}

function ensureAccount(){
 const meta=q('header .v2topmeta');if(!meta||q('#c360AccountWrap')||isDevice())return;
 const wrap=document.createElement('div');wrap.id='c360AccountWrap';wrap.className='c360-account-wrap';
 wrap.innerHTML='<button id="c360AccountBtn" class="c360-account-btn" type="button" aria-label="Conta e empresa" aria-expanded="false">U</button><div id="c360AccountMenu" class="c360-account-menu hidden" role="dialog" aria-label="Conta e empresa"></div>';
 const theme=q('#themeToggle');if(theme)meta.insertBefore(wrap,theme);else meta.appendChild(wrap);
}
function renderAccount(){
 ensureAccount();const btn=q('#c360AccountBtn'),menu=q('#c360AccountMenu');if(!btn||!menu||!context)return;
 const user=context.user||{},company=context.company||{},sub=context.sub,role=context.role;
 const name=user.user_metadata?.full_name||user.user_metadata?.name||user.email||'Usuário';
 btn.textContent=initials(name);
 const left=daysLeft(sub?.trial_ends_at);
 menu.innerHTML=`<div class="c360-account-head"><strong>${safe(name)}</strong><span>${safe(user.email||'')}</span><span>${safe(company.trade_name||company.legal_name||'Empresa')}</span></div><div class="c360-account-meta"><div><small>PERFIL</small><b>${safe(role?.name||roleLabel(role?.code))}</b></div><div><small>PLANO</small><b>${safe(planLabel(sub))}${sub?.status==='trial'&&left!=null?' • '+left+' dia'+(left===1?'':'s'):''}</b></div></div><div class="c360-account-actions"><button type="button" data-enterprise-jump="configuracoes">⚙ Configurações da empresa</button><button type="button" data-enterprise-jump="saudesistema">🩺 Saúde do sistema</button><button type="button" data-enterprise-install class="${installPrompt?'':'hidden'}">⬇ Instalar Comando 360</button><button type="button" data-enterprise-jump="ia">✦ Ajuda com o Assistente IA</button><button type="button" data-enterprise-logout class="danger">↪ Sair desta conta</button></div>`;
}
function renderPlanBadge(){
 const meta=q('header .v2topmeta');if(!meta||isDevice())return;
 let badge=q('#c360PlanBadge');if(!badge){badge=document.createElement('span');badge.id='c360PlanBadge';badge.className='c360-plan-badge';const build=q('#buildBadge');if(build)meta.insertBefore(badge,build);else meta.appendChild(badge)}
 const sub=context?.sub;if(!sub){badge.textContent='Plano não configurado';badge.className='c360-plan-badge';return}
 const left=daysLeft(sub.trial_ends_at);badge.className='c360-plan-badge '+(sub.plan_code==='client_zero'?'pilot':sub.status==='active'?'active':sub.status==='trial'?'trial':'');badge.textContent=sub.plan_code==='client_zero'?'Piloto':sub.status==='trial'?'Teste • '+(left??'—')+'d':planLabel(sub);
}
function renderSidebarProduct(){
 const side=q('#v2sidebar');if(!side||isDevice()||!context)return;let box=q('#c360SidebarProduct');if(!box){box=document.createElement('div');box.id='c360SidebarProduct';box.className='c360-sidebar-product';side.appendChild(box)}
 const company=context.company||{},sub=context.sub,left=daysLeft(sub?.trial_ends_at);
 box.innerHTML=`<div class="c360-side-company">${safe(company.trade_name||company.legal_name||'Comando 360')}</div><div class="c360-side-plan">${safe(planLabel(sub))}${sub?.status==='trial'&&left!=null?' • teste por mais '+left+' dia'+(left===1?'':'s'):''}</div><button type="button" data-enterprise-jump="configuracoes">⚙ Conta e empresa</button>`;
}

async function launchpadData(){
 const id=cid();if(!id)return null;const safeCall=p=>p.catch(()=>[]);
 const [teams,employees,vehicles,ops]=await Promise.all([
  safeCall(rest('v2_teams','select=id&company_id=eq.'+id+'&status=eq.active&limit=1')),
  safeCall(rest('v2_employees','select=id&company_id=eq.'+id+'&status=eq.active&limit=1')),
  safeCall(rest('v2_vehicles','select=id&company_id=eq.'+id+'&limit=1')),
  safeCall(rest('v2_poultry_loadings','select=id&company_id=eq.'+id+'&limit=1'))
 ]);
 return {company:true,teams:!!teams?.length,employees:!!employees?.length,vehicles:!!vehicles?.length,ops:!!ops?.length};
}
function launchSteps(data){return [
 {key:'company',icon:'🏢',title:'Empresa criada',desc:'Ambiente e dados básicos configurados.',tab:'configuracoes'},
 {key:'teams',icon:'👥',title:'Criar equipe',desc:'Organize a operação por equipe e celular.',tab:'equipes'},
 {key:'employees',icon:'♙',title:'Cadastrar funcionário',desc:'Prepare RH, ponto e reconhecimento facial.',tab:'funcionarios'},
 {key:'vehicles',icon:'▰',title:'Cadastrar veículo',desc:'Ative frota, documentos e manutenção.',tab:'frota'},
 {key:'ops',icon:'🐔',title:'Registrar 1ª apanha',desc:'Feche o ciclo e valide a operação real.',tab:'operacoes'}
 ].map(x=>({...x,done:!!data?.[x.key]}))}
async function renderLaunchpad(){
 if(isDevice()||!cid()||localStorage.getItem(storageKey)==='1')return;
 const start=q('#inicio');if(!start)return;const existing=q('#c360Launchpad');if(existing&&existing.dataset.loading==='1')return;
 if(existing)existing.dataset.loading='1';
 const data=await launchpadData();const steps=launchSteps(data),done=steps.filter(x=>x.done).length,percent=Math.round(done/steps.length*100);
 let box=q('#c360Launchpad');if(!box){box=document.createElement('div');box.id='c360Launchpad';box.className='c360-launchpad';const hero=start.querySelector('.v2hero');if(hero)hero.insertAdjacentElement('afterend',box);else start.prepend(box)}
 box.dataset.loading='0';box.innerHTML=`<div class="c360-launchpad-head"><div><div class="c360-launchpad-eyebrow">PRIMEIROS PASSOS</div><h3>${percent===100?'Seu Comando 360 está pronto para rodar':'Coloque sua operação para rodar'}</h3><p>${percent===100?'Os principais cadastros iniciais foram concluídos.':'Complete estes passos para validar o sistema com sua operação real.'}</p></div><div class="c360-launchpad-progress"><b>${percent}%</b><span>${done} de ${steps.length} concluídos</span><button class="c360-launch-dismiss" data-launch-dismiss type="button">Ocultar</button></div></div><div class="c360-launchpad-bar"><i style="width:${percent}%"></i></div><div class="c360-launchpad-grid">${steps.map(s=>`<div class="c360-launch-step ${s.done?'done':''}"><span class="ico">${s.done?'✓':s.icon}</span><strong>${safe(s.title)}</strong><small>${safe(s.desc)}</small><button type="button" data-enterprise-jump="${s.tab}">${s.done?'Revisar':'Abrir agora'} →</button></div>`).join('')}</div>`;
}

function closeAccount(){const m=q('#c360AccountMenu'),b=q('#c360AccountBtn');m?.classList.add('hidden');b?.setAttribute('aria-expanded','false')}
function toggleAccount(){const m=q('#c360AccountMenu'),b=q('#c360AccountBtn');if(!m||!b)return;const open=m.classList.contains('hidden');m.classList.toggle('hidden',!open);b.setAttribute('aria-expanded',open?'true':'false')}
async function installApp(){if(!installPrompt)return;try{installPrompt.prompt();await installPrompt.userChoice}catch(_){}finally{installPrompt=null;renderAccount()}}
function jump(tab){closeAccount();try{if(typeof v2Go==='function')v2Go(tab);else q('.v2navbtn[data-v2tab="'+tab+'"]')?.click()}catch(_){q('.v2navbtn[data-v2tab="'+tab+'"]')?.click()}}
function logout(){closeAccount();const b=q('#logout');if(b){b.classList.remove('hidden');b.click();return}try{if(typeof clearSession==='function')clearSession()}catch(_){}location.reload()}

function enhanceEmptyStates(root=document){
 qq('.list>.muted,.card>.muted',root).forEach(node=>{
  if(node.dataset.c360Empty==='1')return;const t=(node.textContent||'').trim();if(!/^(nenhum|nenhuma|ainda não há|sem registros)/i.test(t))return;
  node.dataset.c360Empty='1';node.classList.add('c360-enterprise-empty');node.innerHTML='<span>◎</span><strong>Nada por aqui ainda</strong><small>'+safe(t)+'</small>';
 });
}
function fixA11y(){qq('.v2navbtn').forEach(btn=>{const tab=btn.dataset.v2tab;if(tab&&btn.classList.contains('active'))btn.setAttribute('aria-current','page');else btn.removeAttribute('aria-current')});}
function refreshShell(){if(isDevice())return;ensureAccount();loadContext();renderLaunchpad();enhanceEmptyStates();fixA11y()}

function bind(){
 document.addEventListener('click',e=>{
  if(e.target.closest('#c360AccountBtn')){e.preventDefault();toggleAccount();return}
  if(!e.target.closest('#c360AccountMenu')&&!e.target.closest('#c360AccountBtn'))closeAccount();
  const j=e.target.closest('[data-enterprise-jump]');if(j){e.preventDefault();jump(j.dataset.enterpriseJump);return}
  if(e.target.closest('[data-enterprise-install]')){e.preventDefault();installApp();return}
  if(e.target.closest('[data-enterprise-logout]')){e.preventDefault();logout();return}
  if(e.target.closest('[data-launch-dismiss]')){e.preventDefault();localStorage.setItem(storageKey,'1');q('#c360Launchpad')?.remove();return}
 });
 document.addEventListener('keydown',e=>{if(e.key==='Escape')closeAccount()});
 window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;renderAccount()});
 window.addEventListener('appinstalled',()=>{installPrompt=null;renderAccount();toast('Comando 360 instalado','O aplicativo foi adicionado ao aparelho.','success')});
 document.addEventListener('c360:screen-changed',e=>{closeAccount();fixA11y();if(e.detail?.id==='inicio')setTimeout(renderLaunchpad,120)});
}
function observe(){if(observer)return;observer=new MutationObserver(()=>{if(document.body.classList.contains('app-ready')){enhanceEmptyStates();fixA11y();if(q('#inicio')&&!q('#c360Launchpad')&&localStorage.getItem(storageKey)!=='1')setTimeout(renderLaunchpad,100)}});observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden']})}
function init(){bind();observe();const timer=setInterval(()=>{if(document.body.classList.contains('app-ready')&&cid()){clearInterval(timer);refreshShell()}},350);setTimeout(()=>clearInterval(timer),15000)}

window.C360Enterprise={version:VERSION,refresh:()=>{context=null;return loadContext(true).then(refreshShell)},showLaunchpad:()=>{localStorage.removeItem(storageKey);return renderLaunchpad()}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
