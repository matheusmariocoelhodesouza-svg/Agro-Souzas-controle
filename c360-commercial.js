(()=>{
'use strict';
const VERSION='2026.09.13-c1';
let state={sub:null,loading:false,loadedAt:0};
let observer=null;
const q=(s,r=document)=>r.querySelector(s);
const safe=v=>typeof esc==='function'?esc(String(v??'')):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function cid(){try{return typeof companyId!=='undefined'?companyId:null}catch(_){return null}}
function deviceMode(){try{return !!(typeof window.deviceMode!=='undefined'&&window.deviceMode)||document.body.classList.contains('device-mode')}catch(_){return document.body.classList.contains('device-mode')}}
function planLabel(code){return({client_zero:'Piloto interno',essential:'Essencial',professional:'Profissional',complete:'360 Completo'})[String(code||'').toLowerCase()]||String(code||'Licença personalizada')}
function statusLabel(v){return({active:'Ativo',trial:'Período de avaliação',past_due:'Pagamento pendente',cancelled:'Cancelado',suspended:'Suspenso'})[v]||v||'Não configurado'}
function fmtDate(v){if(!v)return'—';const d=new Date(v);return Number.isFinite(d.getTime())?d.toLocaleDateString('pt-BR'):'—'}
function daysLeft(v){if(!v)return null;const n=Math.ceil((new Date(v).getTime()-Date.now())/86400000);return Number.isFinite(n)?Math.max(0,n):null}

async function load(force=false){
 const id=cid();if(!id||deviceMode()||state.loading)return state.sub;
 if(!force&&state.loadedAt&&Date.now()-state.loadedAt<30000)return state.sub;
 state.loading=true;
 try{
  const rows=await rest('v2_subscriptions','select=plan_code,status,trial_ends_at,current_period_start,current_period_end,limits&company_id=eq.'+id+'&limit=1').catch(()=>[]);
  state.sub=rows?.[0]||null;state.loadedAt=Date.now();render();return state.sub;
 }finally{state.loading=false}
}
function render(){
 const box=q('#settingsSubscription');if(!box)return;
 const sub=state.sub;
 const signature=sub?JSON.stringify([sub.plan_code,sub.status,sub.trial_ends_at,sub.current_period_start,sub.current_period_end]):'none';
 if(box.dataset.c360CommercialSignature===signature&&box.querySelector('.c360-commercial-plan'))return;
 box.dataset.c360CommercialSignature=signature;
 if(!sub){
  box.innerHTML='<div class="c360-commercial-plan"><div class="c360-commercial-plan-top"><div class="c360-commercial-plan-title"><div class="c360-commercial-plan-icon">360</div><div><strong>Licença da empresa</strong><small>Vinculada ao ambiente do cliente</small></div></div><span class="c360-commercial-status">NÃO CONFIGURADA</span></div><div class="c360-commercial-plan-note">A empresa está ativa no sistema, mas ainda não possui uma licença comercial vinculada. O funcionamento operacional não é alterado por esta tela.</div></div>';
  return;
 }
 const left=daysLeft(sub.trial_ends_at),end=sub.status==='trial'?sub.trial_ends_at:sub.current_period_end;
 const periodText=sub.status==='trial'&&left!=null?(left===0?'Encerra hoje':left+' dia'+(left===1?'':'s')+' restante'+(left===1?'':'s')):fmtDate(end);
 box.innerHTML=`<div class="c360-commercial-plan"><div class="c360-commercial-plan-top"><div class="c360-commercial-plan-title"><div class="c360-commercial-plan-icon">360</div><div><strong>${safe(planLabel(sub.plan_code))}</strong><small>Licença vinculada a esta empresa</small></div></div><span class="c360-commercial-status ${safe(sub.status||'')}">${safe(statusLabel(sub.status))}</span></div><div class="c360-commercial-plan-grid"><div><span>PLANO</span><b>${safe(planLabel(sub.plan_code))}</b></div><div><span>SITUAÇÃO</span><b>${safe(statusLabel(sub.status))}</b></div><div><span>${sub.status==='trial'?'AVALIAÇÃO':'PERÍODO ATUAL'}</span><b>${safe(periodText)}</b></div></div><div class="c360-commercial-plan-note">Plano, acesso e período ficam vinculados à empresa. Dados operacionais permanecem isolados por cliente e preservados independentemente desta visualização comercial.</div></div>`;
}
function ensure(){if(!q('#settingsSubscription'))return;load(false).then(render)}
function bind(){
 document.addEventListener('click',e=>{if(e.target.closest?.('[data-v2tab="configuracoes"],[data-jump="configuracoes"],[data-enterprise-jump="configuracoes"]'))setTimeout(()=>load(true),180)});
 document.addEventListener('c360:screen-changed',e=>{if(e.detail?.id==='configuracoes')setTimeout(()=>load(true),120)});
}
function watch(){
 if(observer)return;observer=new MutationObserver(()=>{const box=q('#settingsSubscription');if(!box)return;if(!box.querySelector('.c360-commercial-plan'))setTimeout(ensure,20)});
 observer.observe(document.body,{subtree:true,childList:true});
}
function init(){if(deviceMode())return;bind();watch();setTimeout(ensure,1200)}
window.C360Commercial={version:VERSION,refresh:()=>load(true)};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
