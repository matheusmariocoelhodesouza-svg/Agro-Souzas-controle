(function(){
 'use strict';
 const VERSION='2026.09.30-fax1';
 const BUCKET='v2-poultry-sheets';
 let rows=[],teams=[],selectedFile=null,aiActions=[],currentTab='today',installed=false,loading=false;
 const q=s=>document.querySelector(s);
 const escLocal=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
 const todayLocal=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const dateBR=v=>{if(!v)return '—';const [y,m,d]=String(v).slice(0,10).split('-');return `${d}/${m}/${y}`};
 const timeHM=v=>v?String(v).slice(0,5):'Sem horário';
 const num=v=>Number(v||0).toLocaleString('pt-BR');
 function safeCompanyId(){try{return (typeof companyId!=='undefined'&&companyId)||null}catch(_){return null}}
 function isDevice(){try{return typeof deviceMode!=='undefined'&&deviceMode}catch(_){return false}}
 function pathEncode(path){return String(path||'').split('/').map(encodeURIComponent).join('/')}
 function fileSafe(name){return String(name||'fax').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/-+/g,'-').slice(-100)||'fax'}
 async function api(path,opts={}){
  if(typeof authFetch!=='function')throw new Error('Sessão do Comando 360 ainda não está pronta.');
  const r=await authFetch(path,opts);
  const text=await r.text();
  let data=null;try{data=text?JSON.parse(text):null}catch(_){data=text}
  if(!r.ok){const msg=data?.message||data?.msg||data?.error_description||data?.error||('HTTP '+r.status);throw new Error(msg)}
  return data;
 }
 function style(){
  if(q('#c360FaxStyle'))return;
  const s=document.createElement('style');s.id='c360FaxStyle';s.textContent=`
  #c360FaxPanel{border:1px solid #dbe6f1;background:linear-gradient(180deg,#fff,#fbfdff);box-shadow:0 5px 18px rgba(18,46,78,.04)}
  .c360-fax-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap}
  .c360-fax-head h3{margin:0;color:#162d49}.c360-fax-head .muted{margin-top:4px}
  .c360-fax-tabs{display:flex;gap:7px;flex-wrap:wrap;margin:13px 0 10px}.c360-fax-tab{border:1px solid #dbe5ef;background:#f7f9fc;color:#40566f;border-radius:999px;padding:8px 12px;font-weight:850;cursor:pointer}.c360-fax-tab.active{background:#173b67;color:#fff;border-color:#173b67}
  .c360-fax-form{border:1px solid #d8e3ef;border-radius:15px;background:#f8fbff;padding:14px;margin:12px 0}.c360-fax-form h4{margin:0 0 4px}.c360-fax-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:12px}.c360-fax-grid .wide{grid-column:span 2}.c360-fax-file-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}.c360-fax-file-name{font-size:11px;color:#51677e;margin-top:7px;word-break:break-word}
  .c360-fax-list{display:grid;gap:9px}.c360-fax-card{border:1px solid #e0e8f1;border-radius:14px;background:#fff;padding:12px}.c360-fax-card.overdue{border-color:#f2c9a4;background:#fffaf5}.c360-fax-card.done{opacity:.82}.c360-fax-main{display:grid;grid-template-columns:minmax(210px,1.2fr) minmax(180px,.8fr) minmax(180px,.8fr);gap:12px;align-items:start}.c360-fax-title{font-size:14px;font-weight:900;color:#17304d}.c360-fax-meta{font-size:11px;color:#70839a;margin-top:4px}.c360-fax-badges{display:flex;gap:5px;flex-wrap:wrap;margin-top:7px}.c360-fax-badge{font-size:10px;font-weight:850;border-radius:999px;background:#eef4fb;color:#31516f;padding:4px 7px}.c360-fax-badge.hot{background:#fff0df;color:#9a4f08}.c360-fax-badge.ok{background:#e7f8ee;color:#17643e}.c360-fax-actions{display:flex;justify-content:flex-end;gap:7px;flex-wrap:wrap;margin-top:10px}.c360-fax-actions .btn{padding:8px 10px;font-size:11px}.c360-fax-empty{padding:18px 5px;color:#8798ab;font-size:12px;text-align:center}.c360-fax-hero-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}.c360-fax-dashboard-btn{border-color:#dce7f2!important}
  body.darkmode #c360FaxPanel,body.darkmode .c360-fax-card{background:#0f1d2e!important;border-color:#263b53!important;color:#e8f0f9!important}body.darkmode .c360-fax-form{background:#102238!important;border-color:#29425d!important}body.darkmode .c360-fax-title,body.darkmode .c360-fax-head h3{color:#f1f6fc!important}body.darkmode .c360-fax-tab{background:#13263b;color:#c2d1e1;border-color:#29425d}body.darkmode .c360-fax-tab.active{background:#2767ad;color:#fff}
  @media(max-width:900px){.c360-fax-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.c360-fax-main{grid-template-columns:1fr 1fr}.c360-fax-main>div:first-child{grid-column:1/-1}}
  @media(max-width:560px){.c360-fax-grid{grid-template-columns:1fr}.c360-fax-grid .wide{grid-column:auto}.c360-fax-main{grid-template-columns:1fr}.c360-fax-main>div:first-child{grid-column:auto}.c360-fax-actions{justify-content:flex-start}.c360-fax-hero-actions{width:100%}.c360-fax-hero-actions .btn{flex:1}}
  `;(document.head||document.documentElement).appendChild(s);
 }
 function markup(){return `
  <div class="card" id="c360FaxPanel">
   <div class="c360-fax-head"><div><h3>📠 FAX / Programação</h3><div class="muted">Guarde a foto ou PDF do FAX e transforme os dados em programação da equipe.</div></div><button class="btn primary" id="c360FaxNew" type="button">+ ADICIONAR FAX</button></div>
   <div id="c360FaxForm" class="c360-fax-form hidden">
    <div class="toolbar" style="justify-content:space-between"><div><h4>Novo FAX</h4><div class="muted">Cadastre o que chegou da integradora. Depois você pode mandar os dados direto para “Nova apanha”.</div></div><button class="btn soft" id="c360FaxClose" type="button">Fechar</button></div>
    <div class="c360-fax-grid">
     <div><label>Cliente / empresa</label><input id="c360FaxClient" placeholder="Ex.: Zanchetta"></div>
     <div><label>Data da apanha *</label><input id="c360FaxDate" type="date"></div>
     <div><label>Horário previsto</label><input id="c360FaxTime" type="time"></div>
     <div><label>Equipe</label><select id="c360FaxTeam"><option value="">Definir depois</option></select></div>
     <div><label>Integrado / produtor *</label><input id="c360FaxIntegrated" placeholder="Nome do integrado"></div>
     <div><label>Granja</label><input id="c360FaxFarm" placeholder="Nome da granja"></div>
     <div><label>Cidade *</label><input id="c360FaxCity" placeholder="Cidade"></div>
     <div><label>Localização / endereço</label><input id="c360FaxLocation" placeholder="Endereço, referência ou link"></div>
     <div><label>Aves previstas</label><input id="c360FaxBirds" type="number" min="0" inputmode="numeric"></div>
     <div><label>Nº de aviários</label><input id="c360FaxSheds" type="number" min="0" inputmode="numeric"></div>
     <div class="wide"><label>Observações</label><input id="c360FaxNotes" placeholder="Informações adicionais do FAX"></div>
     <div class="wide"><label>Foto ou PDF do FAX</label><div class="c360-fax-file-actions"><button class="btn soft" id="c360FaxCameraBtn" type="button">📷 TIRAR FOTO</button><button class="btn soft" id="c360FaxFileBtn" type="button">📎 ESCOLHER FOTO/PDF</button></div><input id="c360FaxCamera" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" hidden><input id="c360FaxFile" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" hidden><div class="c360-fax-file-name" id="c360FaxFileName">Nenhum arquivo selecionado.</div><div id="c360FaxAiBox" class="hidden" style="margin-top:8px"><span class="muted" id="c360FaxAiMsg"></span><select id="c360FaxAiChoice" class="hidden" style="margin-top:7px"></select></div></div>
    </div>
    <div class="toolbar" style="margin-top:13px"><button class="btn primary" id="c360FaxSave" type="button">SALVAR FAX E PROGRAMAR</button><span class="muted" id="c360FaxMsg"></span></div>
   </div>
   <div class="c360-fax-tabs"><button class="c360-fax-tab active" data-faxtab="today" type="button">Hoje <span id="c360FaxCountToday"></span></button><button class="c360-fax-tab" data-faxtab="upcoming" type="button">Próximos <span id="c360FaxCountUpcoming"></span></button><button class="c360-fax-tab" data-faxtab="completed" type="button">Concluídos <span id="c360FaxCountCompleted"></span></button></div>
   <div class="c360-fax-list" id="c360FaxList"><div class="c360-fax-empty">Carregando programação...</div></div>
  </div>`}
 function inject(){
  if(installed||isDevice())return false;
  const section=q('#operacoes'),hero=section?.querySelector('.v2hero');if(!section||!hero)return false;
  style();
  let actions=hero.querySelector('.c360-fax-hero-actions');
  if(!actions){actions=document.createElement('div');actions.className='c360-fax-hero-actions';const newOp=q('#newPoultryOp');if(newOp){hero.insertBefore(actions,newOp);actions.appendChild(newOp)}else hero.appendChild(actions)}
  if(!q('#c360FaxHeroBtn')){const b=document.createElement('button');b.className='btn soft';b.id='c360FaxHeroBtn';b.type='button';b.textContent='📠 FAX / Programação';actions.appendChild(b)}
  hero.insertAdjacentHTML('afterend',markup());
  addDashboardShortcut();bind();installed=true;
  return true;
 }
 function addDashboardShortcut(){
  const host=q('#dashboardActions');if(!host||q('#c360FaxDashboardBtn'))return;
  const b=document.createElement('button');b.type='button';b.id='c360FaxDashboardBtn';b.className='c360-fax-dashboard-btn';b.innerHTML='<span>📠</span><div><b>Adicionar FAX</b><small>Programar apanha</small></div>';
  b.onclick=async()=>{try{if(typeof v2Go==='function')await v2Go('operacoes')}catch(_){};setTimeout(()=>{q('#c360FaxPanel')?.scrollIntoView({behavior:'smooth',block:'start'});openForm()},80)};
  host.insertBefore(b,host.firstChild);
 }
 function bind(){
  q('#c360FaxNew').onclick=openForm;q('#c360FaxHeroBtn').onclick=()=>{q('#c360FaxPanel')?.scrollIntoView({behavior:'smooth',block:'start'});openForm()};q('#c360FaxClose').onclick=closeForm;
  q('#c360FaxCameraBtn').onclick=()=>q('#c360FaxCamera').click();q('#c360FaxFileBtn').onclick=()=>q('#c360FaxFile').click();
  q('#c360FaxCamera').onchange=e=>chooseFile(e.target.files?.[0]);q('#c360FaxFile').onchange=e=>chooseFile(e.target.files?.[0]);q('#c360FaxAiChoice').onchange=e=>applyAiAction(aiActions[Number(e.target.value)||0]);
  q('#c360FaxSave').onclick=save;
  document.querySelectorAll('[data-faxtab]').forEach(b=>b.onclick=()=>{currentTab=b.dataset.faxtab;document.querySelectorAll('[data-faxtab]').forEach(x=>x.classList.toggle('active',x===b));render()});
 }
 function chooseFile(file){
  if(!file)return;const allowed=['application/pdf','image/jpeg','image/png','image/webp'];if(!allowed.includes(file.type)){alert('Use PDF, JPG, PNG ou WEBP.');return}if(file.size>15*1024*1024){alert('O arquivo do FAX deve ter no máximo 15 MB.');return}selectedFile=file;aiActions=[];q('#c360FaxFileName').textContent=`${file.name} • ${(file.size/1024/1024).toFixed(1)} MB`;const box=q('#c360FaxAiBox'),msg=q('#c360FaxAiMsg'),choice=q('#c360FaxAiChoice');box?.classList.remove('hidden');choice?.classList.add('hidden');if(file.type.startsWith('image/')){msg.textContent='✨ Lendo o FAX com a IA...';analyzeFaxImage(file)}else msg.textContent='PDF anexado. Os dados podem ser preenchidos manualmente; a leitura automática desta tela usa foto do FAX.';
 }
 function fileToDataUrl(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result||''));r.onerror=()=>reject(new Error('Não foi possível ler a foto.'));r.readAsDataURL(file)})}
 function applyAiAction(a){
  const p=a?.payload||{};if(!p)return;const start=String(p.scheduled_start||'');if(p.team_id)q('#c360FaxTeam').value=p.team_id;if(start){q('#c360FaxDate').value=start.slice(0,10);const tm=start.match(/T(\d{2}:\d{2})/);if(tm)q('#c360FaxTime').value=tm[1]}if(p.integrator_name)q('#c360FaxClient').value=p.integrator_name;if(p.producer||p.farm_name||p.integrator_name)q('#c360FaxIntegrated').value=p.producer||p.farm_name||p.integrator_name;if(p.farm_name)q('#c360FaxFarm').value=p.farm_name;if(p.city)q('#c360FaxCity').value=p.city;if(p.planned_birds!=null)q('#c360FaxBirds').value=String(Math.round(Number(p.planned_birds)||0));if(p.notes)q('#c360FaxNotes').value=p.notes;
 }
 async function analyzeFaxImage(file){
  const cid=safeCompanyId(),msg=q('#c360FaxAiMsg'),choice=q('#c360FaxAiChoice');if(!cid){msg.textContent='A empresa ainda está carregando. Você pode salvar o FAX manualmente.';return}
  try{const image=await fileToDataUrl(file);const data=await api('/functions/v1/controla-ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({company_id:cid,mode:'analyze',question:'Leia este FAX de programação de apanha. Extraia todas as apanhas/localidades visíveis e os dados de equipe, empresa/integrador, produtor, granja, cidade, data, horário e aves previstas. Apenas proponha os dados; não execute nenhum lançamento.',image_data_url:image})});aiActions=(data?.actions||[]).filter(a=>a.action_type==='poultry_schedule');if(!aiActions.length){msg.textContent='Não consegui identificar uma programação de apanha automaticamente. Confira e preencha os campos manualmente.';return}applyAiAction(aiActions[0]);if(aiActions.length>1){choice.innerHTML=aiActions.map((a,i)=>`<option value="${i}">Apanha ${i+1} — ${escLocal(a.payload?.farm_name||a.payload?.producer||a.payload?.city||'local '+(i+1))}</option>`).join('');choice.classList.remove('hidden');msg.textContent=`✨ IA encontrou ${aiActions.length} apanhas. Escolha acima qual deseja cadastrar agora e confira os campos.`}else{choice.classList.add('hidden');msg.textContent='✨ IA leu o FAX e preencheu os campos. Confira antes de salvar.'}}catch(e){msg.textContent='Não foi possível ler automaticamente: '+e.message+' Você ainda pode preencher e salvar manualmente.'}
 }
 async function loadTeams(){const cid=safeCompanyId();if(!cid)return;teams=await api('/rest/v1/v2_teams?select=id,name,status&company_id=eq.'+encodeURIComponent(cid)+'&status=eq.active&order=name.asc');const sel=q('#c360FaxTeam');if(sel)sel.innerHTML='<option value="">Definir depois</option>'+teams.map(t=>`<option value="${escLocal(t.id)}">${escLocal(t.name)}</option>`).join('')}
 async function loadRows(){
  const cid=safeCompanyId();if(!cid){q('#c360FaxList').innerHTML='<div class="c360-fax-empty">Abra o Comando 360 com seu usuário para carregar os FAX.</div>';return}
  if(loading)return;loading=true;
  try{rows=await api('/rest/v1/v2_poultry_faxes?select=*&company_id=eq.'+encodeURIComponent(cid)+'&order=pickup_date.asc,scheduled_time.asc,created_at.asc');render()}
  catch(e){q('#c360FaxList').innerHTML='<div class="c360-fax-empty">Não foi possível carregar os FAX: '+escLocal(e.message)+'</div>'}
  finally{loading=false}
 }
 function counters(){const t=todayLocal();return {today:rows.filter(r=>r.status==='scheduled'&&r.pickup_date<=t).length,upcoming:rows.filter(r=>r.status==='scheduled'&&r.pickup_date>t).length,completed:rows.filter(r=>r.status!=='scheduled').length}}
 function render(){
  const host=q('#c360FaxList');if(!host)return;const t=todayLocal(),c=counters();q('#c360FaxCountToday').textContent=c.today?`(${c.today})`:'';q('#c360FaxCountUpcoming').textContent=c.upcoming?`(${c.upcoming})`:'';q('#c360FaxCountCompleted').textContent=c.completed?`(${c.completed})`:'';
  let list=rows.filter(r=>currentTab==='today'?r.status==='scheduled'&&r.pickup_date<=t:currentTab==='upcoming'?r.status==='scheduled'&&r.pickup_date>t:r.status!=='scheduled');if(currentTab==='today')list=list.sort((a,b)=>String(a.pickup_date+a.scheduled_time).localeCompare(String(b.pickup_date+b.scheduled_time)));if(currentTab==='completed')list=list.sort((a,b)=>String(b.pickup_date).localeCompare(String(a.pickup_date)));
  if(!list.length){host.innerHTML='<div class="c360-fax-empty">Nenhum FAX nesta aba.</div>';return}
  host.innerHTML=list.map(r=>{const team=teams.find(ti=>ti.id===r.team_id)?.name||'Equipe a definir';const overdue=r.status==='scheduled'&&r.pickup_date<t;const done=r.status!=='scheduled';return `<div class="c360-fax-card ${overdue?'overdue':''} ${done?'done':''}" data-faxid="${escLocal(r.id)}"><div class="c360-fax-main"><div><div class="c360-fax-title">${escLocal(r.client_name||'FAX')} • ${escLocal(r.integrated_name)}</div><div class="c360-fax-meta">${escLocal(r.farm_name||'Granja não informada')} • ${escLocal(r.city)}${r.location_text?' • '+escLocal(r.location_text):''}</div><div class="c360-fax-badges"><span class="c360-fax-badge ${overdue?'hot':''}">${overdue?'Atrasado • ':''}${dateBR(r.pickup_date)} • ${timeHM(r.scheduled_time)}</span><span class="c360-fax-badge">${escLocal(team)}</span>${r.status==='completed'?'<span class="c360-fax-badge ok">Concluído</span>':''}${r.status==='cancelled'?'<span class="c360-fax-badge">Cancelado</span>':''}</div></div><div><div class="muted">Planejamento</div><div style="font-weight:850;margin-top:3px">${r.expected_birds!=null?num(r.expected_birds)+' aves':'Aves não informadas'}</div><div class="c360-fax-meta">${r.shed_count!=null?num(r.shed_count)+' aviário(s)':'Aviários não informados'}</div></div><div><div class="muted">Documento</div><div style="font-weight:800;margin-top:3px">${r.storage_path?'FAX anexado':'Sem anexo'}</div><div class="c360-fax-meta">${escLocal(r.original_name||r.notes||'')}</div></div></div><div class="c360-fax-actions">${r.storage_path?`<button class="btn soft c360FaxOpenFile" type="button" data-id="${escLocal(r.id)}">📄 Abrir FAX</button>`:''}${r.status==='scheduled'?`<button class="btn soft c360FaxUse" type="button" data-id="${escLocal(r.id)}">↗ Usar na apanha</button><button class="btn primary c360FaxDone" type="button" data-id="${escLocal(r.id)}">✓ Concluir</button>`:''}</div></div>`}).join('');
  host.querySelectorAll('.c360FaxOpenFile').forEach(b=>b.onclick=()=>openFile(b.dataset.id));host.querySelectorAll('.c360FaxUse').forEach(b=>b.onclick=()=>useInOperation(b.dataset.id));host.querySelectorAll('.c360FaxDone').forEach(b=>b.onclick=()=>complete(b.dataset.id));
 }
 function openForm(){q('#c360FaxForm')?.classList.remove('hidden');if(q('#c360FaxDate')&&!q('#c360FaxDate').value)q('#c360FaxDate').value=todayLocal();q('#c360FaxForm')?.scrollIntoView({behavior:'smooth',block:'nearest'})}
 function closeForm(){q('#c360FaxForm')?.classList.add('hidden')}
 function resetForm(){['#c360FaxClient','#c360FaxTime','#c360FaxIntegrated','#c360FaxFarm','#c360FaxCity','#c360FaxLocation','#c360FaxBirds','#c360FaxSheds','#c360FaxNotes'].forEach(id=>{const e=q(id);if(e)e.value=''});if(q('#c360FaxDate'))q('#c360FaxDate').value=todayLocal();if(q('#c360FaxTeam'))q('#c360FaxTeam').value='';if(q('#c360FaxCamera'))q('#c360FaxCamera').value='';if(q('#c360FaxFile'))q('#c360FaxFile').value='';selectedFile=null;aiActions=[];q('#c360FaxFileName').textContent='Nenhum arquivo selecionado.';q('#c360FaxAiBox')?.classList.add('hidden');q('#c360FaxAiChoice')?.classList.add('hidden')}
 async function upload(file,faxId,teamId){
  const cid=safeCompanyId();const folder=teamId||cid;const path=`${cid}/${folder}/fax/${faxId}/${Date.now()}-${fileSafe(file.name)}`;await api('/storage/v1/object/'+BUCKET+'/'+pathEncode(path),{method:'POST',headers:{'Content-Type':file.type||'application/octet-stream','x-upsert':'false'},body:file});return path
 }
 async function save(){
  const cid=safeCompanyId(),date=q('#c360FaxDate').value,integrated=q('#c360FaxIntegrated').value.trim(),city=q('#c360FaxCity').value.trim();if(!cid)return alert('Empresa ainda não carregada.');if(!date)return alert('Informe a data da apanha.');if(!integrated)return alert('Informe o integrado / produtor.');if(!city)return alert('Informe a cidade.');
  const btn=q('#c360FaxSave'),msg=q('#c360FaxMsg');btn.disabled=true;msg.textContent='Salvando FAX...';let created=null;
  try{
   const payload={company_id:cid,team_id:q('#c360FaxTeam').value||null,pickup_date:date,scheduled_time:q('#c360FaxTime').value||null,client_name:q('#c360FaxClient').value.trim()||null,integrated_name:integrated,farm_name:q('#c360FaxFarm').value.trim()||null,city,location_text:q('#c360FaxLocation').value.trim()||null,expected_birds:q('#c360FaxBirds').value?Number(q('#c360FaxBirds').value):null,shed_count:q('#c360FaxSheds').value?Number(q('#c360FaxSheds').value):null,notes:q('#c360FaxNotes').value.trim()||null,status:'scheduled',updated_at:new Date().toISOString()};
   const data=await api('/rest/v1/v2_poultry_faxes',{method:'POST',headers:{'Content-Type':'application/json','Prefer':'return=representation'},body:JSON.stringify(payload)});created=Array.isArray(data)?data[0]:data;
   if(selectedFile){msg.textContent='Enviando foto/PDF do FAX...';const path=await upload(selectedFile,created.id,payload.team_id);await api('/rest/v1/v2_poultry_faxes?id=eq.'+encodeURIComponent(created.id),{method:'PATCH',headers:{'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify({storage_bucket:BUCKET,storage_path:path,original_name:selectedFile.name,mime_type:selectedFile.type||null,updated_at:new Date().toISOString()})})}
   msg.textContent='FAX salvo e programação criada.';resetForm();closeForm();currentTab=date<=todayLocal()?'today':'upcoming';document.querySelectorAll('[data-faxtab]').forEach(x=>x.classList.toggle('active',x.dataset.faxtab===currentTab));await loadRows();
  }catch(e){if(created?.id&&selectedFile){try{await api('/rest/v1/v2_poultry_faxes?id=eq.'+encodeURIComponent(created.id),{method:'DELETE',headers:{'Prefer':'return=minimal'}})}catch(_){}}msg.textContent='Erro: '+e.message}
  finally{btn.disabled=false}
 }
 async function openFile(id){
  const r=rows.find(x=>x.id===id);if(!r?.storage_path)return;const win=window.open('','_blank');try{const res=await authFetch('/storage/v1/object/'+BUCKET+'/'+pathEncode(r.storage_path));if(!res.ok)throw new Error('Não foi possível abrir o documento.');const blob=await res.blob(),url=URL.createObjectURL(blob);if(win)win.location.href=url;else location.href=url;setTimeout(()=>URL.revokeObjectURL(url),60000)}catch(e){if(win)win.close();alert(e.message)}
 }
 async function complete(id){
  try{await api('/rest/v1/v2_poultry_faxes?id=eq.'+encodeURIComponent(id),{method:'PATCH',headers:{'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify({status:'completed',updated_at:new Date().toISOString()})});await loadRows()}catch(e){alert('Não foi possível concluir: '+e.message)}
 }
 async function useInOperation(id){
  const r=rows.find(x=>x.id===id);if(!r)return;const newBtn=q('#newPoultryOp');if(newBtn)newBtn.click();setTimeout(()=>{
   const set=(id,val)=>{const el=q(id);if(el&&val!=null)el.value=val};if(r.team_id)set('#poTeam',r.team_id);if(r.pickup_date&&r.scheduled_time)set('#poStart',r.pickup_date+'T'+String(r.scheduled_time).slice(0,5));else if(r.pickup_date)set('#poStart',r.pickup_date+'T09:00');set('#poIntegratedName',r.integrated_name||'');set('#poCity',r.city||'');set('#poFarmName',r.farm_name||'');if(r.expected_birds!=null)set('#poPlannedBirds',r.expected_birds);const noteParts=[];if(r.client_name)noteParts.push('Cliente: '+r.client_name);if(r.location_text)noteParts.push('Localização: '+r.location_text);if(r.shed_count!=null)noteParts.push('Aviários previstos: '+r.shed_count);if(r.notes)noteParts.push(r.notes);noteParts.push('Origem: FAX '+r.id.slice(0,8));set('#poNotes',noteParts.join(' | '));q('#poultryForm')?.scrollIntoView({behavior:'smooth',block:'start'});const m=q('#poMsg');if(m)m.textContent='Dados preenchidos a partir do FAX. Confira e salve a apanha.';
  },80)
 }
 async function readyData(){if(isDevice())return;const cid=safeCompanyId();if(!cid)return;try{await loadTeams();await loadRows()}catch(e){console.warn('FAX / Programação',e)}}
 function boot(){if(!inject()){let n=0;const t=setInterval(()=>{n++;if(inject()||n>80)clearInterval(t)},100)}setTimeout(readyData,300);const ob=new MutationObserver(()=>{if(document.body.classList.contains('app-ready'))readyData()});ob.observe(document.body,{attributes:true,attributeFilter:['class']});window.addEventListener('c360:company-changed',readyData)}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
 window.c360FaxRefresh=readyData;window.C360_FAX_VERSION=VERSION;
})();
