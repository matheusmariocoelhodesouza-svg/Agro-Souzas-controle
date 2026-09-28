(()=>{
'use strict';

const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const arr=v=>Array.isArray(v)?v:(v===null||v===undefined||v===''?[]:[v]);
const text=v=>{
  if(v===null||v===undefined||v==='')return '—';
  if(Array.isArray(v))return v.map(x=>typeof x==='string'?x:JSON.stringify(x)).join(' • ');
  if(typeof v==='object')return Object.entries(v).map(([k,x])=>`${k}: ${typeof x==='object'?JSON.stringify(x):x}`).join(' • ')||'—';
  return String(v);
};
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();

const state={
  client:null,token:0,active:false,vehicle:null,profile:null,links:[],groups:[],components:[],componentMap:new Map(),linkMap:new Map(),views:[],
  currentGroup:null,search:'',selectedId:null,diagnosticIds:new Set(),originalSystemOptions:'',guideSteps:[],guideIndex:0,guideComponent:null
};

function toast(message){
  const el=$('#toast');
  if(!el){console.info('[O360 Sprinter]',message);return}
  el.textContent=message;el.classList.add('show');
  clearTimeout(window.__sprRealToast);window.__sprRealToast=setTimeout(()=>el.classList.remove('show'),2800);
}

async function getClient(){
  if(state.client)return state.client;
  if(!window.supabase||!window.SUPABASE_URL||!window.SUPABASE_PUBLISHABLE_KEY)return null;
  state.client=window.supabase.createClient(window.SUPABASE_URL,window.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  return state.client;
}

async function chunks(table,ids,field='id',select='*'){
  const uniq=[...new Set((ids||[]).filter(Boolean))],out=[];
  if(!uniq.length)return out;
  for(let i=0;i<uniq.length;i+=70){
    const r=await state.client.from(table).select(select).in(field,uniq.slice(i,i+70));
    if(r.error)throw r.error;
    out.push(...(r.data||[]));
  }
  return out;
}

function exactSprinter(p){
  if(!p)return false;
  const vin=String(p.vin||'').toUpperCase();
  return vin==='8AC903662BE040910'||(String(p.chassis_variant||'')==='903.662'&&String(p.engine_code||'').toUpperCase()==='OM611.981');
}

function groupName(code){return state.groups.find(g=>g.code===code)?.name||code||'Outros'}
function fitClass(link,c){
  if(link?.fitment_status==='verified'&&c?.data_status==='verified')return 'verified';
  if(link?.fitment_status==='candidate'||c?.data_status==='estimated')return 'candidate';
  return 'pending';
}
function fitLabel(link,c){
  if(link?.fitment_status==='verified'&&c?.data_status==='verified')return 'Confirmada';
  if(link?.fitment_status==='candidate')return 'Aplicação a confirmar';
  if(c?.data_status==='estimated')return 'Referência';
  return 'Dado a confirmar';
}
function sourceLabel(c){
  if(c?.data_status==='verified')return 'dado técnico verificado';
  if(c?.data_status==='estimated')return 'referência técnica';
  return 'referência pendente';
}

function visualAlias(c){
  const s=norm([c?.name,c?.generic_name,c?.group_code].filter(Boolean).join(' '));
  if(/junta.*cabecote/.test(s))return 'gasket';
  if(/tampa.*valvula|separador.*carter|antichama|respiro.*carter/.test(s))return 'valveCover';
  if(/cabecote/.test(s))return 'head';
  if(/bloco.*cilind/.test(s))return 'block';
  if(/turbocompressor|\bturbo\b/.test(s))return 'turbo';
  if(/sensor.*pressao.*admiss|sensor.*map|pressao.*temperatura.*ar/.test(s))return 'mapSensor';
  if(/rail.*combust|sensor.*pressao.*rail|regulador.*pressao.*rail|valvula.*regul.*rail|injetor diesel|bico injetor|bomba.*alta.*pressao/.test(s))return 'rail';
  if(/sincronismo|corrente.*comando|tensor.*corrente|guia.*corrente/.test(s))return 'timing';
  if(/virabrequim/.test(s))return 'crankshaft';
  if(/pistao|\bbiela\b/.test(s))return 'piston';
  if(/bomba.*oleo/.test(s))return 'oilPump';
  if(/filtro.*oleo/.test(s))return 'oilFilter';
  if(/carter.*oleo|\bcarter\b/.test(s))return 'oilPan';
  return null;
}

function ensureUi(){
  const shell=$('#tab-visual .pv-shell');if(!shell)return false;
  if(!state.originalSystemOptions)state.originalSystemOptions=$('#pvSystem')?.innerHTML||'';
  if(!$('#sprRealStrip')){
    const strip=document.createElement('div');strip.id='sprRealStrip';strip.className='spr-real-strip';strip.hidden=true;
    strip.innerHTML='<div class="spr-real-id"><span class="spr-real-badge">REAL</span><div><b id="sprRealTitle">Sprinter 313 CDI</b><small id="sprRealIdentity">Identificando configuração...</small></div></div><div class="spr-real-kpis" id="sprRealKpis"></div>';
    shell.querySelector('.pv-head')?.insertAdjacentElement('afterend',strip);
  }
  if(!$('#sprRealCatalog')){
    const box=document.createElement('section');box.id='sprRealCatalog';box.className='spr-real-catalog';box.hidden=true;
    box.innerHTML=`
      <div class="spr-real-head"><div><span class="pv-eyebrow">CATÁLOGO VINCULADO AO VIN</span><h3>Dados reais desta condução</h3><p>Peças, aplicação, localização, ferramentas e referências lidas do banco técnico do Oficina 360. Geometria visual só é vinculada quando há correspondência segura.</p></div><span class="spr-real-live">BANCO AO VIVO</span></div>
      <div class="spr-system-nav" id="sprSystemNav"></div>
      <div class="spr-diag-banner" id="sprDiagBanner"></div>
      <div class="spr-real-body">
        <div class="spr-real-list-wrap"><div class="spr-real-tools"><input id="sprRealSearch" class="spr-real-search" type="search" placeholder="Buscar peça, OEM, sensor, turbo, rail..."></div><div class="spr-real-list" id="sprRealList"><div class="spr-loading">Carregando catálogo técnico...</div></div></div>
        <aside class="spr-real-detail" id="sprRealDetail"><div class="spr-real-detail-empty">Selecione uma peça real do catálogo para ver os dados técnicos e, quando houver vínculo seguro, localizar a região correspondente no modelo visual.</div></aside>
      </div>`;
    const note=shell.querySelector('.pv-note');
    (note||shell.querySelector('.pv-lower'))?.insertAdjacentElement(note?'afterend':'beforebegin',box);
    $('#sprRealSearch')?.addEventListener('input',e=>{state.search=norm(e.target.value);renderList()});
  }
  if(!$('#sprRealGuide')){
    const d=document.createElement('dialog');d.id='sprRealGuide';d.className='spr-guide-dialog';
    d.innerHTML=`<div class="spr-guide-head"><div><span class="pv-eyebrow">GUIA TÉCNICO • DADOS DO CATÁLOGO</span><h3 id="sprGuideTitle">Procedimento</h3></div><button class="pv-mini" id="sprGuideClose" type="button">✕</button></div><div class="spr-guide-content"><div class="spr-guide-progress"><i id="sprGuideProgress"></i></div><div class="spr-guide-step"><span class="spr-guide-num" id="sprGuideNum">1</span><div><h4 id="sprGuideStepTitle">Etapa</h4><p id="sprGuideStepText"></p></div></div><div class="spr-guide-note" id="sprGuideNote">Execute somente procedimentos compatíveis com a configuração exata. Torque, sequência de aperto e itens de uso único só são tratados como confirmados quando o catálogo técnico os marca como verificados.</div><div class="spr-guide-nav"><button id="sprGuidePrev" type="button">← Anterior</button><button class="primary" id="sprGuideNext" type="button">Próxima →</button></div></div>`;
    $('#tab-visual')?.appendChild(d);
    $('#sprGuideClose').onclick=()=>d.close();
    $('#sprGuidePrev').onclick=()=>guideMove(-1);
    $('#sprGuideNext').onclick=()=>guideMove(1);
  }
  return true;
}

function setActive(on){
  state.active=on;
  if($('#sprRealStrip'))$('#sprRealStrip').hidden=!on;
  if($('#sprRealCatalog'))$('#sprRealCatalog').hidden=!on;
  if(!on){
    state.selectedId=null;state.diagnosticIds.clear();state.currentGroup=null;
    if($('#pvSystem')&&state.originalSystemOptions)$('#pvSystem').innerHTML=state.originalSystemOptions;
  }
}

async function load(){
  if(!ensureUi())return;
  const token=++state.token,c=await getClient();if(!c)return;
  const id=$('#vehiclePicker')?.value||new URLSearchParams(location.search).get('vehicle');if(!id)return;
  try{
    const [vr,pr,lr,gr]=await Promise.all([
      c.from('v2_vehicles').select('*').eq('id',id).maybeSingle(),
      c.from('v2_vehicle_technical_profiles').select('*').eq('vehicle_id',id).maybeSingle(),
      c.from('v2_vehicle_component_links').select('*').eq('vehicle_id',id),
      c.from('v2_vehicle_component_groups').select('*').order('sort_order')
    ]);
    if(token!==state.token)return;
    if(vr.error)throw vr.error;if(pr.error)throw pr.error;if(lr.error)throw lr.error;if(gr.error)throw gr.error;
    state.vehicle=vr.data||null;state.profile=pr.data||null;
    if(!exactSprinter(state.profile)){setActive(false);return}
    setActive(true);
    state.links=lr.data||[];state.groups=gr.data||[];
    state.components=await chunks('v2_vehicle_components',state.links.map(x=>x.component_id));
    if(token!==state.token)return;
    state.componentMap=new Map(state.components.map(x=>[x.id,x]));
    state.linkMap=new Map(state.links.map(x=>[x.component_id,x]));
    const viewsR=await c.from('v2_vehicle_exploded_views').select('*').order('group_code');
    state.views=viewsR.error?[]:(viewsR.data||[]).filter(v=>(!v.chassis_family||v.chassis_family===state.profile.chassis_family)&&(!v.chassis_variant||v.chassis_variant===state.profile.chassis_variant)&&(!v.engine_code||v.engine_code===state.profile.engine_code));
    state.diagnosticIds.clear();state.selectedId=null;state.search='';if($('#sprRealSearch'))$('#sprRealSearch').value='';
    const available=state.groups.filter(g=>state.components.some(cmp=>cmp.group_code===g.code));
    const preferred=['engine_turbo','engine_air','engine_fuel','engine','engine_cooling','engine_lubrication'];
    state.currentGroup=preferred.find(code=>available.some(g=>g.code===code))||available[0]?.code||null;
    renderIdentity();renderSystems();renderList();renderDetail(null);bindSystemSelect();
    const pv=$('#pvVehicle');if(pv)pv.textContent=`Sprinter 313 CDI • W903 903.662 • OM611.981 • VIN ${state.profile.vin||'identificado'}`;
  }catch(e){
    console.error('Oficina360 Sprinter real layer',e);setActive(true);
    const h=$('#sprRealList');if(h)h.innerHTML=`<div class="spr-error">Não foi possível carregar a camada técnica real agora: ${esc(e.message||'erro de sincronização')}</div>`;
  }
}

function renderIdentity(){
  const p=state.profile,v=state.vehicle;
  $('#sprRealTitle').textContent=`${v?.description||'Sprinter 313 CDI'} • ${v?.plate||''}`.replace(/\s•\s$/,'');
  $('#sprRealIdentity').textContent=`VIN ${p.vin||'—'} • W903 / ${p.chassis_variant||'—'} • ${p.engine_code||'—'} • motor ${p.engine_serial||'—'}`;
  const verified=state.components.filter(c=>state.linkMap.get(c.id)?.fitment_status==='verified'&&c.data_status==='verified').length;
  const candidate=state.links.filter(l=>l.fitment_status==='candidate').length;
  $('#sprRealKpis').innerHTML=`<span class="spr-real-kpi"><b>${state.components.length}</b> peças vinculadas</span><span class="spr-real-kpi"><b>${verified}</b> confirmadas</span><span class="spr-real-kpi"><b>${candidate}</b> a conferir</span><span class="spr-real-kpi"><b>${state.views.length}</b> vistas compatíveis</span>`;
}

function grouped(){
  const m=new Map();state.components.forEach(c=>{if(!m.has(c.group_code))m.set(c.group_code,[]);m.get(c.group_code).push(c)});return m;
}
function renderSystems(){
  const m=grouped(),available=state.groups.filter(g=>m.has(g.code));
  $('#sprSystemNav').innerHTML=available.map(g=>`<button type="button" class="spr-system-btn ${g.code===state.currentGroup?'active':''}" data-spr-group="${esc(g.code)}">${esc(g.name)} <span class="count">${m.get(g.code).length}</span></button>`).join('');
  $$('#sprSystemNav [data-spr-group]').forEach(b=>b.onclick=()=>chooseGroup(b.dataset.sprGroup));
  const sel=$('#pvSystem');if(sel){
    sel.innerHTML=available.map(g=>`<option value="${esc(g.code)}">${esc(g.name)} (${m.get(g.code).length})</option>`).join('');
    if(state.currentGroup)sel.value=state.currentGroup;
  }
}
function bindSystemSelect(){
  const sel=$('#pvSystem');if(!sel||sel.dataset.sprBound==='1')return;
  sel.dataset.sprBound='1';sel.addEventListener('change',()=>{if(state.active&&state.groups.some(g=>g.code===sel.value))chooseGroup(sel.value)});
}
function chooseGroup(code){
  state.currentGroup=code;state.selectedId=null;
  $$('#sprSystemNav [data-spr-group]').forEach(b=>b.classList.toggle('active',b.dataset.sprGroup===code));
  if($('#pvSystem')&&$('#pvSystem').value!==code)$('#pvSystem').value=code;
  renderList();renderDetail(null);
}

function filteredComponents(){
  let rows=state.components.filter(c=>!state.currentGroup||c.group_code===state.currentGroup);
  if(state.search){rows=rows.filter(c=>norm([c.name,c.generic_name,c.oem_part_number,c.manufacturer_part_number,c.location_description,c.function_description].join(' ')).includes(state.search))}
  return rows.sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'pt-BR'));
}
function renderList(){
  const h=$('#sprRealList');if(!h||!state.active)return;
  const rows=filteredComponents();
  if(!rows.length){h.innerHTML='<div class="spr-loading">Nenhuma peça encontrada neste sistema/filtro.</div>';return}
  h.innerHTML=rows.map(c=>{
    const l=state.linkMap.get(c.id),fc=fitClass(l,c),alias=visualAlias(c),diag=state.diagnosticIds.has(c.id);
    return `<button type="button" class="spr-part-card ${c.id===state.selectedId?'active':''} ${diag?'diagnostic':''}" data-spr-part="${esc(c.id)}"><span class="spr-part-main"><b>${esc(c.name)}</b><small>${esc(c.generic_name||groupName(c.group_code))}${alias?' • possui vínculo visual':' • sem geometria visual confirmada'}</small></span><span class="spr-part-meta"><span class="spr-chip ${fc}">${fitLabel(l,c)}</span><span class="spr-oem">${esc(c.oem_part_number?'OEM '+c.oem_part_number:'OEM a confirmar')}</span></span></button>`;
  }).join('');
  $$('[data-spr-part]',h).forEach(b=>b.onclick=()=>selectReal(b.dataset.sprPart));
}

function renderDetail(c){
  const h=$('#sprRealDetail');if(!h)return;
  if(!c){h.innerHTML='<div class="spr-real-detail-empty">Selecione uma peça real do catálogo para ver aplicação, OEM, localização, ferramentas, testes e o vínculo com o desenho interativo.</div>';return}
  const l=state.linkMap.get(c.id),alias=visualAlias(c),tools=arr(c.required_tools),tests=arr(c.diagnostic_notes),symptoms=arr(c.failure_symptoms),sources=arr(c.source_metadata?.sources);
  h.innerHTML=`<div class="spr-detail-head"><div><small>${esc(groupName(c.group_code))} • ${esc(sourceLabel(c))}</small><h4>${esc(c.name)}</h4><span class="spr-chip ${fitClass(l,c)}">${fitLabel(l,c)}</span></div><small>${alias?'VISUAL ↔ '+esc(alias):'SEM GEOMETRIA VINCULADA'}</small></div>
    <div class="spr-detail-grid">
      <div class="spr-detail-cell"><span>OEM</span><b>${esc(c.oem_part_number||'A confirmar')}</b></div>
      <div class="spr-detail-cell"><span>FABRICANTE / EQUIVALENTE</span><b>${esc(c.manufacturer_part_number||'—')}</b></div>
      <div class="spr-detail-cell"><span>LOCALIZAÇÃO</span><b>${esc(c.location_description||'A confirmar')}</b></div>
      <div class="spr-detail-cell"><span>APLICAÇÃO NESTA CONDUÇÃO</span><b>${esc(l?.notes||fitLabel(l,c))}</b></div>
      <div class="spr-detail-cell"><span>TORQUE / PROCEDIMENTO</span><b>${esc(text(c.torque_spec))}</b></div>
      <div class="spr-detail-cell"><span>CONECTOR / MEDIDAS</span><b>${esc([text(c.connector_spec),text(c.dimensions_spec)].filter(x=>x!=='—').join(' • ')||'—')}</b></div>
    </div>
    ${c.function_description?`<div class="spr-detail-section"><b>FUNÇÃO</b><ul><li>${esc(c.function_description)}</li></ul></div>`:''}
    ${symptoms.length?`<div class="spr-detail-section"><b>SINTOMAS ASSOCIADOS</b><ul>${symptoms.map(x=>`<li>${esc(typeof x==='string'?x:text(x))}</li>`).join('')}</ul></div>`:''}
    ${tests.length?`<div class="spr-detail-section"><b>TESTES / INVESTIGAÇÃO CADASTRADOS</b><ul>${tests.map(x=>`<li>${esc(typeof x==='string'?x:text(x))}</li>`).join('')}</ul></div>`:''}
    ${tools.length?`<div class="spr-detail-section"><b>FERRAMENTAS</b><ul>${tools.map(x=>`<li>${esc(typeof x==='string'?x:text(x))}</li>`).join('')}</ul></div>`:''}
    ${sources.length?`<div class="spr-detail-section"><b>RASTREABILIDADE</b><ul>${sources.slice(0,4).map(x=>`<li>${esc(x?.label||text(x))}</li>`).join('')}</ul></div>`:''}
    ${!alias?'<div class="spr-no-geometry">Esta peça existe no catálogo real da Sprinter, mas ainda não possui uma geometria visual segura no modelo. O Oficina 360 não vai apontar uma posição inventada.</div>':''}
    <div class="spr-real-actions"><button type="button" class="primary" id="sprOpenGuide">Guia técnico desta peça</button><button type="button" id="sprOpenCatalog">Abrir no catálogo completo</button><button type="button" id="sprFocusVisual" ${alias?'':'disabled'}>${alias?'Focar no desenho':'Sem desenho vinculado'}</button></div>`;
  $('#sprOpenGuide').onclick=()=>openGuide(c);
  $('#sprOpenCatalog').onclick=()=>openCatalog(c);
  $('#sprFocusVisual').onclick=()=>focusVisual(c,true);
}

function selectReal(id){
  const c=state.componentMap.get(id);if(!c)return;
  state.selectedId=id;renderList();renderDetail(c);focusVisual(c,false);updatePremiumDetail(c);
}
function focusVisual(c,notify){
  const alias=visualAlias(c);if(!alias){if(notify)toast('Peça real selecionada; ainda sem geometria visual vinculada.');return false}
  const el=$(`.pv-part[data-part="${alias}"]`);if(!el){if(notify)toast('Vínculo visual previsto, mas a geometria não está disponível nesta vista.');return false}
  el.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));
  el.classList.add('selected');
  if(notify){el.scrollIntoView({behavior:'smooth',block:'center'});toast('Região correspondente destacada no desenho.')}
  return true;
}
function updatePremiumDetail(c){
  const alias=visualAlias(c),l=state.linkMap.get(c.id);
  const set=(id,v)=>{const e=$(id);if(e)e.textContent=v};
  set('#pvNum','R');set('#pvName',c.name);set('#pvPartSystem',`${groupName(c.group_code)} • ${fitLabel(l,c)}`);
  set('#pvCode',c.oem_part_number?`OEM ${c.oem_part_number} • ${sourceLabel(c)}`:`OEM a confirmar • ${sourceLabel(c)}`);
  set('#pvFunction',c.function_description||'Função técnica a confirmar na base.');
  set('#pvTools',text(c.required_tools));set('#pvTorque',text(c.torque_spec));set('#pvPreviewName',c.name);set('#pvArPart',c.name);
  const icon=$('#pvPreviewIcon');if(icon)icon.textContent=alias==='turbo'?'◉':alias==='rail'?'≋':alias==='mapSensor'?'▣':alias==='oilPump'||alias==='timing'?'⚙':'◇';
}

function openCatalog(c){
  const tab=document.querySelector('[data-tab="catalog"]');if(tab){tab.click();setTimeout(()=>{const q=$('#catalogSearch');if(q){q.value=c.oem_part_number||c.name;q.dispatchEvent(new Event('input',{bubbles:true}));q.focus()}},120)}
}

function openGuide(c){
  state.guideComponent=c;state.guideIndex=0;
  const tests=arr(c.diagnostic_notes).map(x=>typeof x==='string'?x:text(x));
  const replace=arr(c.replacement_notes).map(x=>typeof x==='string'?x:text(x));
  state.guideSteps=[...tests,...replace].filter(Boolean);
  if(!state.guideSteps.length)state.guideSteps=['Não existe uma sequência de desmontagem/reparo verificada para esta peça na base. Use os dados de localização e aplicação para identificar o componente e consulte a fonte técnica correta antes de desmontar.'];
  $('#sprGuideTitle').textContent=c.name;renderGuide();
  const d=$('#sprRealGuide');if(d?.showModal)d.showModal();else d?.setAttribute('open','');
  focusVisual(c,false);
}
function guideMove(delta){state.guideIndex=Math.max(0,Math.min(state.guideSteps.length-1,state.guideIndex+delta));renderGuide()}
function renderGuide(){
  const n=state.guideSteps.length,i=state.guideIndex;
  $('#sprGuideNum').textContent=i+1;$('#sprGuideStepTitle').textContent=`Etapa ${i+1} de ${n}`;$('#sprGuideStepText').textContent=state.guideSteps[i]||'';
  $('#sprGuideProgress').style.width=`${((i+1)/n)*100}%`;$('#sprGuidePrev').disabled=i===0;$('#sprGuideNext').disabled=i===n-1;
  const c=state.guideComponent,alias=visualAlias(c);if(alias){const part=$(`.pv-part[data-part="${alias}"]`);part?.classList.add('selected')}
}

function showDiagnosticBanner(html){const b=$('#sprDiagBanner');if(!b)return;b.innerHTML=html;b.classList.add('show')}
function clearDiagnosticReal(){state.diagnosticIds.clear();$('#sprDiagBanner')?.classList.remove('show');renderList()}
function groupByKeywords(t){
  const s=norm(t);
  if(/turbo|boost|sobrealiment|pressao.*admiss/.test(s))return 'engine_turbo';
  if(/rail|fuel|combust|inject|diesel/.test(s))return 'engine_fuel';
  if(/oil|oleo.*press|lubrif/.test(s))return 'engine_lubrication';
  if(/coolant|arrefec|temperatura.*motor|overheat|superaquec/.test(s))return 'engine_cooling';
  if(/abs|brake|freio/.test(s))return 'brakes';
  if(/steer|direcao/.test(s))return 'steering';
  if(/transmiss|clutch|embreagem|cambio/.test(s))return 'transmission';
  return null;
}
async function syncDiagnostic(){
  if(!state.active||!state.client)return;
  const code=String($('#pvDtc')?.value||'').trim().toUpperCase().replace(/\s+/g,'');
  const symptom=$('#pvSymptom')?.value||'';
  state.diagnosticIds.clear();
  if(!code){
    const g={powerLoss:'engine_turbo',oilPressure:'engine_lubrication',overheat:'engine_cooling',roughIdle:'engine_fuel'}[symptom];
    if(g&&state.components.some(c=>c.group_code===g)){chooseGroup(g);showDiagnosticBanner(`<b>Direção de investigação por sintoma:</b> o Oficina 360 abriu ${esc(groupName(g))}. Nenhuma peça foi declarada defeituosa sem teste.`)}
    renderList();return;
  }
  try{
    const [pr,lr]=await Promise.all([
      state.client.from('v2_vehicle_diagnostic_playbooks').select('*').eq('protocol','obd2').eq('code',code),
      state.client.from('v2_diagnostic_code_library').select('*').eq('protocol','obd2').eq('code',code).maybeSingle()
    ]);
    const plays=pr.error?[]:(pr.data||[]);
    const p=plays.find(x=>x.vehicle_id===state.vehicle.id)||plays.find(x=>!x.vehicle_id&&x.chassis_variant===state.profile.chassis_variant&&x.engine_code===state.profile.engine_code)||plays.find(x=>!x.vehicle_id&&x.engine_code===state.profile.engine_code)||plays[0]||null;
    const ids=arr(p?.related_component_ids).filter(id=>state.componentMap.has(id));
    ids.forEach(id=>state.diagnosticIds.add(id));
    if(ids.length){
      const first=state.componentMap.get(ids[0]);if(first){chooseGroup(first.group_code);state.diagnosticIds=new Set(ids);renderList();selectReal(first.id)}
      showDiagnosticBanner(`<b>${esc(code)} • playbook técnico vinculado:</b> ${ids.length} componente(s) relacionado(s) foram destacados. Isso orienta a sequência de testes e não confirma troca de peça.`);
      return;
    }
    const lib=lr.error?null:lr.data;
    const g=groupByKeywords([p?.title,p?.interpretation,lib?.title,lib?.generic_definition].filter(Boolean).join(' '));
    if(g&&state.components.some(c=>c.group_code===g)){chooseGroup(g);showDiagnosticBanner(`<b>${esc(code)} • sem vínculo peça-a-peça confirmado:</b> o código direciona para ${esc(groupName(g))}. Faça os testes do sistema antes de condenar um componente.`)}
    else showDiagnosticBanner(`<b>${esc(code)}:</b> o código foi reconhecido/consultado, mas ainda não há um vínculo visual seguro com uma peça desta Sprinter. Nenhuma peça será apontada por chute.`);
    renderList();
  }catch(e){console.warn('Sprinter real diagnostic bridge',e);showDiagnosticBanner(`<b>${esc(code)}:</b> não foi possível consultar o playbook técnico agora. O diagnóstico visual genérico continua disponível, sem assumir uma peça real.`)}
}

function bindGlobal(){
  const picker=$('#vehiclePicker');if(picker&&picker.dataset.sprRealBound!=='1'){picker.dataset.sprRealBound='1';picker.addEventListener('change',()=>setTimeout(load,80))}
  const analyze=$('#pvAnalyze');if(analyze&&analyze.dataset.sprRealBound!=='1'){analyze.dataset.sprRealBound='1';analyze.addEventListener('click',()=>setTimeout(syncDiagnostic,20))}
  const clear=$('#pvClear');if(clear&&clear.dataset.sprRealBound!=='1'){clear.dataset.sprRealBound='1';clear.addEventListener('click',clearDiagnosticReal)}
}

function boot(){
  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    if(ensureUi()){
      clearInterval(timer);bindGlobal();load();
    }else if(tries>120)clearInterval(timer);
  },100);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
