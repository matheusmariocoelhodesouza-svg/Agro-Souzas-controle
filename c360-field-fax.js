(()=>{
'use strict';
const VERSION='2026.10.03-field-fax2';
const BUCKET='v2-poultry-sheets';
let state={scope:'',rows:[],loaded:false,updatedAt:null,notice:'',lastAttempt:0};
let flight=null,home=null,panel=null,using=false,observedScope=null;
const escape=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const dateLabel=d=>{const [y,m,day]=String(d||'').slice(0,10).split('-');return y&&m&&day?`${day}/${m}/${y}`:'Data não informada'};
function context(){
 try{
  if(!deviceMode||!companyId||!deviceAccess?.active||!deviceAccess?.team_id||deviceAccess.permissions?.apanha===false)return null;
  return {company:companyId,team:deviceAccess.team_id,key:`field_faxes:${companyId}:${deviceAccess.team_id}`,name:deviceTeam?.name||'Equipe'};
 }catch(_){return null}
}
function screen(id){try{return document.getElementById(id)||v2ScreenStore[id]}catch(_){return document.getElementById(id)}}
function online(){return typeof c360NetOnline==='function'?c360NetOnline():navigator.onLine!==false}
function style(){
 if(document.getElementById('c360FieldFaxStyle'))return;
 const s=document.createElement('style');s.id='c360FieldFaxStyle';s.textContent=`
 body.device-mode #c360FaxPanel,body.device-mode #c360FaxHeroBtn,body.device-mode #c360FaxDashboardBtn{display:none!important}
 body:not(.device-mode) .c360-field-fax{display:none!important}
 .c360-field-fax{margin-top:12px;border:1px solid #dbe5ef;border-radius:16px;padding:14px;background:#fff;color:#172d46;min-width:0}
 .c360-field-fax h3{margin:0 0 8px;font-size:16px;color:inherit}.c360-field-fax-list{display:grid;gap:10px}
 .c360-field-fax-row{border:1px solid #dbe5ef;border-radius:12px;padding:12px;min-width:0;overflow-wrap:anywhere}
 .c360-field-fax-date{font-weight:800;font-size:12px;margin:5px 0}.c360-field-fax-status{font-size:12px;color:#51677e;margin:8px 0;overflow-wrap:anywhere}
 .c360-field-fax-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.c360-field-fax-actions .btn{flex:1 1 130px;white-space:normal}
 body.darkmode .c360-field-fax{background:#102238;color:#edf4fc;border-color:#29425d}body.darkmode .c360-field-fax-row{border-color:#29425d}body.darkmode .c360-field-fax-status{color:#b9cce1}
 body.device-mode .c360-field-fax{background:#102238!important;color:#edf4fc!important;border-color:#29425d!important}
 body.device-mode .c360-field-fax-row{border-color:#29425d!important}
 body.device-mode .c360-field-fax h3,body.device-mode .c360-field-fax strong,body.device-mode .c360-field-fax-date{color:#edf4fc!important}
 body.device-mode .c360-field-fax-status{color:#b9cce1!important}
 body.device-mode .c360-field-fax .btn.soft{background:#183653!important;border-color:#3c5873!important;color:#edf4fc!important}
 `;document.head.appendChild(s);
}
function install(){
 const ctx=context();if(!ctx)return false;style();
 const h=screen('equipehome'),p=screen('operacoes');
 if(h&&!home){home=document.createElement('div');home.id='c360FieldFaxHome';home.className='c360-field-fax';h.appendChild(home)}
 if(p&&!panel){panel=document.createElement('div');panel.id='c360FieldFaxPanel';panel.className='c360-field-fax';const hero=p.querySelector('.v2hero');if(hero)hero.insertAdjacentElement('afterend',panel);else p.prepend(panel)}
 return !!(home||panel);
}
function stamp(){
 const when=state.updatedAt?new Date(state.updatedAt).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'}):'';
 return state.notice||(state.loaded?(online()?'Atualizado'+(when?' em '+when:''):'Sem internet • programação salva'+(when?' em '+when:'')):'Carregando programação...');
}
function summary(r){
 return `<strong>${escape(r.integrated_name||r.farm_name||'Apanha')}</strong><div class="c360-field-fax-date">${dateLabel(r.pickup_date)}${r.scheduled_time?' • '+escape(String(r.scheduled_time).slice(0,5)):''}${r.pickup_date<today()?' • Data anterior':''}</div><div>${escape([r.farm_name,r.city].filter(Boolean).join(' • '))}</div>${r.expected_birds!=null?'<div>'+Number(r.expected_birds).toLocaleString('pt-BR')+' aves previstas</div>':''}${r.notes?'<div class="c360-field-fax-status">'+escape(r.notes)+'</div>':''}`;
}
function render(){
 const ctx=context();if(!ctx||state.scope!==ctx.key)return;
 const pending=state.rows.filter(r=>r.status==='scheduled'),next=pending[0];
 const empty=state.loaded?'Nenhum FAX programado para esta equipe.':'A programação ainda não foi carregada.';
 if(home){home.innerHTML=`<h3>📠 Próxima apanha</h3>${next?summary(next):'<div>'+empty+'</div>'}<div class="c360-field-fax-status" role="status">${escape(stamp())}</div><div class="c360-field-fax-actions"><button type="button" class="btn soft" data-fax-list>VER PROGRAMAÇÃO</button><button type="button" class="btn soft" data-fax-refresh>ATUALIZAR</button></div>`}
 if(panel){panel.innerHTML=`<h3>📠 FAX / Programação • ${escape(ctx.name)}</h3><div class="c360-field-fax-status" role="status">${escape(stamp())}</div><div class="c360-field-fax-list">${pending.length?pending.map(r=>`<article class="c360-field-fax-row">${summary(r)}${r.location_text?'<div class="c360-field-fax-status">Localização: '+escape(r.location_text)+'</div>':''}<div class="c360-field-fax-actions">${r.storage_path?'<button type="button" class="btn soft" data-fax-doc="'+escape(r.id)+'">ABRIR FAX</button>':''}<button type="button" class="btn primary" data-fax-use="${escape(r.id)}">USAR NA APANHA</button></div></article>`).join(''):'<div>'+empty+'</div>'}</div><div class="c360-field-fax-actions"><button type="button" class="btn soft" data-fax-refresh>ATUALIZAR PROGRAMAÇÃO</button></div>`}
 for(const root of [home,panel].filter(Boolean)){
  root.querySelectorAll('[data-fax-refresh]').forEach(b=>b.onclick=()=>refresh(true));
  root.querySelectorAll('[data-fax-list]').forEach(b=>b.onclick=async()=>{await window.v2Go('operacoes');panel?.scrollIntoView({behavior:'smooth',block:'start'})});
  root.querySelectorAll('[data-fax-use]').forEach(b=>b.onclick=()=>use(b.dataset.faxUse,b));
  root.querySelectorAll('[data-fax-doc]').forEach(b=>b.onclick=()=>openDocument(b.dataset.faxDoc));
 }
}
async function refresh(force=false){
 const ctx=context();if(!ctx){home?.remove();panel?.remove();home=null;panel=null;state={scope:'',rows:[],loaded:false,updatedAt:null,notice:'',lastAttempt:0};return}if(!install())return;
 if(state.scope!==ctx.key)state={scope:ctx.key,rows:[],loaded:false,updatedAt:null,notice:'',lastAttempt:0};
 if(flight?.scope===ctx.key)return flight.promise;
 if(!force&&state.loaded&&Date.now()-state.lastAttempt<60000){render();return}
 state.lastAttempt=Date.now();
 const promise=(async()=>{
  try{
   const cached=await offlineCacheGet(ctx.key);
   if(context()?.key!==ctx.key)return;
   if(cached&&Array.isArray(cached.rows)){state.rows=cached.rows.filter(r=>r.company_id===ctx.company&&r.team_id===ctx.team);state.updatedAt=cached.updatedAt;state.loaded=true;render()}
   if(!online()){state.notice=state.loaded?'':'Sem internet e sem programação salva. Conecte para carregar o FAX.';render();return}
   const r=await authFetch('/rest/v1/v2_poultry_faxes?select=*&company_id=eq.'+encodeURIComponent(ctx.company)+'&team_id=eq.'+encodeURIComponent(ctx.team)+'&status=eq.scheduled&order=pickup_date.asc,scheduled_time.asc,created_at.asc&limit=200');
   if(!r.ok)throw new Error('Não foi possível consultar o FAX.');
   const data=await r.json();if(!Array.isArray(data))throw new Error('Programação indisponível.');
   if(context()?.key!==ctx.key)return;
   state.rows=data.filter(row=>row.company_id===ctx.company&&row.team_id===ctx.team);state.updatedAt=new Date().toISOString();state.loaded=true;state.notice='';
   await offlineCacheSet(ctx.key,{rows:state.rows,updatedAt:state.updatedAt});render();
  }catch(e){if(context()?.key!==ctx.key)return;state.notice=state.loaded?'Não consegui atualizar. Exibindo a programação salva anteriormente.':'Não consegui carregar a programação. Toque em Atualizar para tentar novamente.';render();console.warn('FAX da equipe',e)}
 })();flight={scope:ctx.key,promise};
 try{await promise}finally{if(flight?.promise===promise)flight=null}
}
async function use(id,button){
 const ctx=context(),row=state.rows.find(r=>r.id===id&&r.company_id===ctx?.company&&r.team_id===ctx?.team&&r.status==='scheduled');
 if(!row||using)return;using=true;button.disabled=true;
 try{
  await openNewPoultryOperation();if(context()?.key!==ctx.key)return;
  const set=(id,value)=>{const el=document.getElementById(id);if(el&&value!=null)el.value=value};
  set('poTeam',ctx.team);set('poIntegratedName',row.integrated_name||'');set('poCity',row.city||'');set('poFarmName',row.farm_name||'');set('poPlannedBirds',row.expected_birds??'');
  const start=document.getElementById('poStart');if(start&&row.pickup_date)start.value=row.pickup_date+'T'+(row.scheduled_time?String(row.scheduled_time).slice(0,5):start.value.slice(11,16));
  set('poNotes',[row.client_name&&'Cliente: '+row.client_name,row.location_text&&'Localização: '+row.location_text,row.notes,'Origem: FAX '+row.id].filter(Boolean).join(' | '));
  const msg=document.getElementById('poMsg');if(msg)msg.textContent='FAX preenchido. Confira os dados e salve a apanha.';
  document.getElementById('poultryForm')?.scrollIntoView({behavior:'smooth',block:'start'});
 }catch(e){alert('Não foi possível abrir a apanha. Tente novamente.')}finally{using=false;button.disabled=false}
}
async function openDocument(id){
 const ctx=context(),row=state.rows.find(r=>r.id===id&&r.company_id===ctx?.company&&r.team_id===ctx?.team);if(!row?.storage_path)return;
 if(!row.storage_path.startsWith(`${ctx.company}/${ctx.team}/`)){alert('O FAX precisa estar vinculado à equipe pelo administrador.');return}
 const win=window.open('','_blank'),key=ctx.key+':document:'+id;
 try{
  let blob=await offlineCacheGet(key);
  if(online()){try{const r=await authFetch('/storage/v1/object/'+BUCKET+'/'+row.storage_path.split('/').map(encodeURIComponent).join('/'));if(!r.ok)throw new Error('FAX indisponível.');blob=await r.blob();if(blob.size<=15*1024*1024)await offlineCacheSet(key,blob)}catch(e){if(!blob)throw e}}
  if(context()?.key!==ctx.key){win?.close();return}
  if(!(blob instanceof Blob))throw new Error('Conecte à internet e abra o FAX uma vez para deixá-lo disponível offline.');
  const url=URL.createObjectURL(blob);if(win)win.location.href=url;else location.href=url;setTimeout(()=>URL.revokeObjectURL(url),60000);
 }catch(e){win?.close();alert(e.message)}
}
document.addEventListener('c360:screen-changed',e=>{if(['equipehome','operacoes'].includes(e.detail?.id||e.detail?.screen))refresh()});
window.addEventListener('online',()=>refresh(true));window.addEventListener('offline',()=>{state.notice='';render()});
window.C360FieldFax={version:VERSION,refresh};
style();
function syncMode(){const scope=context()?.key||'';if(scope===observedScope)return;observedScope=scope;refresh()}
const modeObserver=new MutationObserver(syncMode);modeObserver.observe(document.body,{attributes:true,attributeFilter:['class']});
syncMode();
})();
