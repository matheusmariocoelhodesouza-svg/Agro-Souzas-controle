(()=>{
'use strict';

const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const arr=v=>Array.isArray(v)?v:(v===null||v===undefined||v===''?[]:[v]);
const text=v=>{
  if(v===null||v===undefined||v==='')return '—';
  if(Array.isArray(v))return v.map(x=>typeof x==='string'?x:JSON.stringify(x)).join(' • ')||'—';
  if(typeof v==='object')return Object.entries(v).map(([k,x])=>`${k}: ${typeof x==='object'?JSON.stringify(x):x}`).join(' • ')||'—';
  return String(v);
};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

const F={
  client:null,token:0,active:false,vehicle:null,profile:null,groups:[],views:[],links:[],
  linkMap:new Map(),components:new Map(),view:null,items:[],cache:new Map(),group:null,
  selected:null,diagnostic:new Set(),diagnosisText:'',explode:1,timer:null
};

async function client(){
  if(F.client)return F.client;
  if(!window.supabase||!window.SUPABASE_URL||!window.SUPABASE_PUBLISHABLE_KEY)return null;
  F.client=window.supabase.createClient(window.SUPABASE_URL,window.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  return F.client;
}
function isSprinter(p){return !!p&&String(p.chassis_variant||'')==='903.662'&&String(p.engine_code||'').toUpperCase()==='OM611.981'}
function toast(msg){
  const t=$('#toast');if(!t)return;
  t.textContent=msg;t.classList.add('show');
  clearTimeout(window.__fleetPremiumToast);window.__fleetPremiumToast=setTimeout(()=>t.classList.remove('show'),2600);
}
async function loadComponents(ids){
  const out=[],uniq=[...new Set(ids.filter(Boolean))];
  for(let i=0;i<uniq.length;i+=70){
    const r=await F.client.from('v2_vehicle_components').select('*').in('id',uniq.slice(i,i+70));
    if(r.error)throw r.error;
    out.push(...(r.data||[]));
  }
  return out;
}

function ensureUi(){
  const tab=$('#tab-visual'),stage=tab?.querySelector('.pv-stage');
  if(!tab||!stage)return false;
  if($('#fleetPremium'))return true;
  const box=document.createElement('section');
  box.id='fleetPremium';box.className='fleet-premium';
  box.innerHTML=`
    <div class="fleet-head">
      <div><span class="fleet-eyebrow">OFICINA 360 • FROTA PREMIUM</span><h3 id="fleetTitle">Vista técnica da condução</h3><p id="fleetSubtitle">Carregando catálogo real...</p></div>
      <div class="fleet-diagnose"><input id="fleetDiagInput" placeholder="Sintoma ou código: perda de força, vazamento, P0299..."><button id="fleetDiagBtn" type="button">⚠ Diagnosticar</button><button id="fleetDiagClear" type="button">Limpar</button></div>
    </div>
    <div id="fleetTrust" class="fleet-trust"></div>
    <div id="fleetViewNav" class="fleet-view-nav"></div>
    <div class="fleet-layout">
      <div class="fleet-main"><div id="fleetStage" class="fleet-stage"></div></div>
      <aside id="fleetSide" class="fleet-side"><div class="fleet-empty">Selecione uma peça no desenho para abrir os dados técnicos e o Reparo Guiado.</div></aside>
    </div>`;
  stage.prepend(box);
  $('#fleetDiagBtn').onclick=()=>diagnose($('#fleetDiagInput').value);
  $('#fleetDiagInput').addEventListener('keydown',e=>{if(e.key==='Enter')diagnose(e.currentTarget.value)});
  $('#fleetDiagClear').onclick=()=>{
    F.diagnostic.clear();F.diagnosisText='';F.selected=null;$('#fleetDiagInput').value='';renderScene();renderSide(null);
  };
  return true;
}
function activate(on){
  F.active=on;
  $('#tab-visual')?.classList.toggle('fleet-premium-active',on);
  $('#fleetPremium')?.classList.toggle('active',on);
}

async function load(){
  if(!ensureUi())return;
  const c=await client();if(!c)return;
  const id=$('#vehiclePicker')?.value||new URLSearchParams(location.search).get('vehicle');if(!id)return;
  const token=++F.token;
  try{
    const [vr,pr,lr,gr,evr]=await Promise.all([
      c.from('v2_vehicles').select('*').eq('id',id).maybeSingle(),
      c.from('v2_vehicle_technical_profiles').select('*').eq('vehicle_id',id).maybeSingle(),
      c.from('v2_vehicle_component_links').select('*').eq('vehicle_id',id),
      c.from('v2_vehicle_component_groups').select('*').order('sort_order'),
      c.from('v2_vehicle_exploded_views').select('*').order('group_code').order('title')
    ]);
    if(token!==F.token)return;
    F.vehicle=vr.data||null;F.profile=pr.data||null;F.links=lr.error?[]:(lr.data||[]);F.groups=gr.error?[]:(gr.data||[]);
    if(!F.vehicle||!F.profile||isSprinter(F.profile)){activate(false);return}
    activate(true);
    F.linkMap=new Map(F.links.map(x=>[x.component_id,x]));
    const comps=await loadComponents(F.links.map(x=>x.component_id));
    F.components=new Map(comps.map(x=>[x.id,x]));
    const all=evr.error?[]:(evr.data||[]);
    F.views=all.filter(v=>(!v.chassis_family||v.chassis_family===F.profile.chassis_family)&&(!v.chassis_variant||v.chassis_variant===F.profile.chassis_variant)&&(!v.engine_code||v.engine_code===F.profile.engine_code));
    F.cache.clear();F.diagnostic.clear();F.selected=null;F.diagnosisText='';
    renderIdentity();renderSystems();
    const current=$('#pvSystem')?.value;
    F.group=current&&availableGroups().some(g=>g.code===current)?current:preferredGroup();
    if($('#pvSystem'))$('#pvSystem').value=F.group||'';
    renderGroup(F.group);
  }catch(e){
    console.error('Oficina360 Fleet Premium',e);activate(true);
    $('#fleetStage').innerHTML=`<div class="fleet-empty">Falha ao carregar o catálogo Premium.<br>${esc(e.message||'')}</div>`;
  }
}
function availableGroups(){
  const codes=new Set([...F.views.map(v=>v.group_code),...[...F.components.values()].map(c=>c.group_code)].filter(Boolean));
  return F.groups.filter(g=>codes.has(g.code));
}
function preferredGroup(){
  const pref=['engine','engine_turbo','engine_fuel','engine_cooling','engine_lubrication','brakes','suspension','electrical','body'];
  return pref.find(x=>availableGroups().some(g=>g.code===x))||availableGroups()[0]?.code||null;
}
function groupName(code){return F.groups.find(g=>g.code===code)?.name||code||'Sistema'}
function renderIdentity(){
  const v=F.vehicle,p=F.profile,verified=F.links.filter(x=>x.fitment_status==='verified').length;
  $('#fleetTitle').textContent=`${v.description||v.model||'Condução'} • ${v.plate||''}`;
  $('#fleetSubtitle').textContent=`${p.chassis_family||v.make||'—'} • ${p.chassis_variant||v.model||'—'}${p.engine_code?' • '+p.engine_code:''}. Peças e relações vêm do catálogo desta condução; geometria gerada permanece identificada como não OEM.`;
  $('#fleetTrust').innerHTML=`<span><b>${F.links.length}</b> peças vinculadas</span><span><b>${verified}</b> aplicações confirmadas</span><span><b>${F.views.length}</b> vistas compatíveis</span><span class="fleet-safe">✓ código/torque só é confirmado quando a base técnica marca como verificado</span>`;
  if($('#pvVehicle'))$('#pvVehicle').textContent=`${v.description||v.model||'Condução'} • ${v.plate||''}${p.engine_code?' • '+p.engine_code:''}`;
}
function renderSystems(){
  const sel=$('#pvSystem');if(!sel)return;
  sel.innerHTML=availableGroups().map(g=>`<option value="${esc(g.code)}">${esc(g.name)}</option>`).join('');
  if(sel.dataset.fleetBound!=='1'){
    sel.dataset.fleetBound='1';sel.addEventListener('change',()=>{if(F.active)renderGroup(sel.value)});
  }
}
function rankView(v){
  let n=0;
  if(v.source_metadata?.fleet_premium===true)n+=120;
  if(/STRUCT-V1/i.test(v.assembly_code||''))n+=95;
  if(v.verification_status==='verified')n+=75;
  if(v.verification_status==='estimated')n+=30;
  if(/micro-EPC/i.test(v.title||''))n-=15;
  if(v.image_license_status==='generated')n+=8;
  return n;
}
function renderGroup(code){
  if(!F.active||!code)return;
  F.group=code;F.selected=null;
  const views=F.views.filter(v=>v.group_code===code).sort((a,b)=>rankView(b)-rankView(a));
  const nav=$('#fleetViewNav');
  nav.innerHTML=views.length?views.slice(0,18).map((v,i)=>`<button type="button" data-fleet-view="${esc(v.id)}" class="${i===0?'active':''}">${esc(v.title||v.assembly_code)}</button>`).join(''):'<span class="fleet-empty-inline">Sem prancha cadastrada; usando componentes vinculados.</span>';
  $$('[data-fleet-view]',nav).forEach(b=>{b.onclick=()=>selectView(views.find(v=>v.id===b.dataset.fleetView));});
  if(views[0])selectView(views[0]);
  else{F.view=null;F.items=synthItems(code);renderScene();renderSide(null)}
}
function synthItems(group){
  return [...F.components.values()].filter(c=>c.group_code===group).sort((a,b)=>priority(a)-priority(b)||String(a.name||'').localeCompare(String(b.name||''),'pt-BR')).slice(0,20).map((c,i)=>({
    id:'virtual-'+c.id,component_id:c.id,item_number:String(i+1).padStart(2,'0'),quantity:1,component_type:c.component_type||'part',
    exactness_status:F.linkMap.get(c.id)?.fitment_status==='verified'&&c.data_status==='verified'?'verified':c.data_status==='estimated'?'estimated':'reference_pending',
    position_note:c.location_description||'Posição funcional a confirmar'
  }));
}
function priority(c){return ({critical:0,high:1,medium:2,low:3})[c.service_priority]??4}
async function selectView(v){
  if(!v)return;F.view=v;F.selected=null;
  $$('[data-fleet-view]').forEach(b=>b.classList.toggle('active',b.dataset.fleetView===v.id));
  let items=F.cache.get(v.id);
  if(!items){
    const r=await F.client.from('v2_vehicle_exploded_view_items').select('*').eq('exploded_view_id',v.id).order('item_number');
    if(r.error){toast('Não foi possível carregar esta vista.');return}
    items=r.data||[];
    const missing=items.map(x=>x.component_id).filter(id=>id&&!F.components.has(id));
    if(missing.length)(await loadComponents(missing)).forEach(c=>F.components.set(c.id,c));
    F.cache.set(v.id,items);
  }
  F.items=items.length?items:synthItems(v.group_code);renderScene();renderSide(null);
}

function role(item){
  const c=F.components.get(item.component_id)||{},s=norm(`${item.component_type||''} ${c.component_type||''} ${c.name||''} ${c.generic_name||''}`);
  const rules=[
    ['turbo',/turbo/],['intercooler',/intercooler/],['injector',/injetor|bico/],['rail',/rail/],['pump',/bomba/],['filter',/filtro|elemento/],
    ['radiator',/radiador|condensador|evaporador/],['fan',/ventoinha|ventilador|helice/],['hose',/mangueira|duto|tubo|linha/],['sensor',/sensor|interruptor/],
    ['battery',/bateria/],['alternator',/alternador/],['starter',/partida/],['light',/farol|lanterna|luz de placa|refletor/],['door',/porta/],
    ['disc',/disco.*freio/],['drum',/tambor/],['caliper',/pinca/],['shoe',/sapata|lona|pastilha/],['master',/cilindro mestre/],['booster',/servo|hidrovacuo/],
    ['spring',/feixe|mola/],['shock',/amortecedor/],['hub',/cubo/],['bearing',/rolamento/],['steering',/caixa.*direcao|barra.*direcao|terminal.*direcao|coluna.*direcao/],
    ['gearbox',/cambio|transmissao/],['clutch',/embreagem|plato/],['shaft',/cardan|semi-eixo|cruzeta/],['diff',/diferencial/],['oilpan',/carter/],
    ['block',/bloco|cabecote|motor/],['frame',/chassi|quadro|plataforma|carroceria/],['hitch',/engate|lanca|timao|corrente de seguranca|jockey/],
    ['wheel',/roda|pneu/],['gasket',/junta|retentor|vedacao|o-ring/],['fastener',/parafuso|porca|arruela|grampo|fixador/]
  ];
  for(const [k,re] of rules)if(re.test(s))return k;
  return c.component_type||item.component_type||'part';
}
const Z={
  engine:{block:[560,290],pump:[300,390],filter:[820,390],sensor:[830,180],gasket:[280,180]},
  engine_air:{filter:[220,250],hose:[400,330],turbo:[580,260],intercooler:[790,300],sensor:[880,160]},
  engine_turbo:{turbo:[520,270],intercooler:[810,300],hose:[280,330],sensor:[840,160],pump:[320,160]},
  engine_fuel:{pump:[260,230],filter:[280,420],rail:[560,235],injector:[560,430],hose:[790,340],sensor:[840,165]},
  engine_cooling:{pump:[350,280],radiator:[790,310],fan:[590,360],hose:[260,420],sensor:[850,170],filter:[250,170]},
  engine_lubrication:{pump:[450,250],filter:[760,260],oilpan:[560,430],sensor:[820,140],hose:[280,360]},
  exhaust:{block:[250,280],hose:[520,310],filter:[800,310],sensor:[820,160]},
  transmission:{clutch:[300,300],gearbox:[560,290],shaft:[820,315],bearing:[800,160],fastener:[850,470]},
  driveline:{shaft:[450,290],diff:[760,300],bearing:[250,180],hub:[860,430],fastener:[250,450]},
  brakes:{disc:[520,290],drum:[520,290],caliper:[720,270],shoe:[760,410],master:[300,180],booster:[300,370],hose:[850,160],hub:[390,390]},
  suspension:{spring:[520,390],shock:[760,230],hub:[820,410],bearing:[680,410],fastener:[250,420],frame:[350,220]},
  steering:{steering:[560,290],pump:[300,220],hose:[760,370],bearing:[830,180]},
  electrical:{battery:[260,300],alternator:[500,230],starter:[500,400],sensor:[800,260],light:[850,420],hose:[300,150]},
  body:{frame:[560,300],door:[300,280],light:[820,260],hitch:[250,430],fastener:[850,440]},
  hvac:{radiator:[600,280],pump:[300,280],fan:[820,300],hose:[520,430],sensor:[820,150]}
};
function placed(){
  const rows=F.items.map(i=>({...i,c:F.components.get(i.component_id)||null,r:role(i)})),map=Z[F.group]||{},count={};
  return rows.slice(0,24).map((x,i)=>{
    const k=map[x.r]?x.r:'part',n=count[k]=(count[k]||0)+1,t=map[k]||[220+(i%5)*180,140+Math.floor(i/5)*105],dx=((n-1)%3)*50,dy=Math.floor((n-1)/3)*48;
    return {...x,ex:clamp(t[0]+dx,100,1020),ey:clamp(t[1]+dy,90,525),ax:540+((i%5)-2)*18,ay:300+((Math.floor(i/5)%3)-1)*15};
  });
}
function status(x){
  const l=F.linkMap.get(x.component_id),i=String(x.exactness_status||'');
  if(i==='verified'||(l?.fitment_status==='verified'&&x.c?.data_status==='verified'))return 'verified';
  if(i==='estimated'||x.c?.data_status==='estimated')return 'estimated';
  return 'pending';
}
function defs(){return `<defs><linearGradient id="fpMetal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#eef5f9"/><stop offset=".25" stop-color="#7c93a4"/><stop offset=".5" stop-color="#d7e2e9"/><stop offset=".8" stop-color="#445b6c"/><stop offset="1" stop-color="#a7bac6"/></linearGradient><linearGradient id="fpDark" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#405568"/><stop offset=".6" stop-color="#0c1822"/><stop offset="1" stop-color="#61798a"/></linearGradient><filter id="fpShadow"><feDropShadow dx="0" dy="7" stdDeviation="6" flood-color="#000" flood-opacity=".5"/></filter><filter id="fpGlow"><feDropShadow dx="0" dy="0" stdDeviation="7" flood-color="#2a9cff" flood-opacity=".85"/></filter></defs>`}
function shape(x){
  const r=x.r,m='url(#fpMetal)',d='url(#fpDark)';
  if(r==='turbo')return `<path d="M-40 4c0-30 24-53 54-53 27 0 48 17 55 40l-24 8c-4-12-15-20-30-20-17 0-30 13-30 29s13 29 30 29c15 0 26-8 31-21H16V-6h58v14c0 37-29 61-64 61-35 0-50-27-50-65z" fill="${m}" stroke="#dce6ec"/><circle cx="15" cy="7" r="13" fill="#101e28" stroke="#9fb2c0" stroke-width="3"/>`;
  if(r==='rail')return `<rect x="-70" y="-11" width="140" height="22" rx="10" fill="${m}" stroke="#e0e8ed"/>${[-45,-15,15,45].map(v=>`<path d="M${v} 10v30" stroke="#b5c4cd" stroke-width="8"/>`).join('')}`;
  if(r==='injector')return `<rect x="-8" y="-38" width="16" height="51" rx="6" fill="${m}"/><path d="M-5 12h10l-2 31h-6z" fill="#8fa2b0"/><rect x="8" y="-29" width="23" height="12" rx="4" fill="${d}"/>`;
  if(r==='pump')return `<circle r="40" fill="${m}" stroke="#dce6ec"/>${Array.from({length:6},(_,i)=>`<path d="M0 0 L6 -31 Q21 -24 22 -8 Z" transform="rotate(${i*60})" fill="#4c6273"/>`).join('')}<circle r="9" fill="#152631"/>`;
  if(r==='filter')return `<ellipse cy="-28" rx="28" ry="9" fill="#c3cfd7"/><rect x="-28" y="-28" width="56" height="59" fill="${m}"/><ellipse cy="31" rx="28" ry="9" fill="#738897"/>`;
  if(r==='radiator'||r==='intercooler')return `<rect x="-68" y="-40" width="136" height="80" rx="5" fill="#536b7c" stroke="#c7d4dc" stroke-width="3"/>${Array.from({length:12},(_,i)=>`<line x1="${-57+i*10}" y1="-33" x2="${-57+i*10}" y2="33" stroke="#9eafba"/>`).join('')}`;
  if(r==='fan')return `${Array.from({length:6},(_,i)=>`<path d="M4 -6 C18 -30 39 -30 38 -12 C36 3 22 10 6 9 Z" transform="rotate(${i*60})" fill="#7890a0" stroke="#c2cfd7"/>`).join('')}<circle r="12" fill="#aabac4"/>`;
  if(r==='hose')return `<path d="M-60 22 C-30 -42,20 40,64 -18" fill="none" stroke="#6b8190" stroke-width="15" stroke-linecap="round"/><path d="M-60 22 C-30 -42,20 40,64 -18" fill="none" stroke="#1b2d38" stroke-width="7" stroke-linecap="round"/>`;
  if(r==='sensor')return `<rect x="-24" y="-28" width="48" height="50" rx="8" fill="${d}" stroke="#9eb1bf"/><rect x="-13" y="-43" width="26" height="16" rx="4" fill="#4d6578"/><circle cy="3" r="8" fill="#d8a34e"/>`;
  if(r==='battery')return `<rect x="-58" y="-34" width="116" height="68" rx="8" fill="#1b2d3a" stroke="#91a6b5" stroke-width="3"/><rect x="-40" y="-42" width="18" height="9" rx="2" fill="#c7d3da"/><rect x="22" y="-42" width="18" height="9" rx="2" fill="#c7d3da"/><text x="-32" y="6" fill="#e2edf2" font-size="18">−</text><text x="27" y="6" fill="#e2edf2" font-size="18">+</text>`;
  if(r==='alternator'||r==='starter')return `<circle r="38" fill="${m}" stroke="#dbe5eb" stroke-width="3"/><circle r="17" fill="#172833"/><rect x="34" y="-11" width="38" height="22" rx="8" fill="${d}"/>`;
  if(r==='disc'||r==='drum'||r==='hub'||r==='bearing'||r==='wheel')return `<circle r="50" fill="#8397a5" stroke="#e0e7ec" stroke-width="3"/><circle r="26" fill="#152631" stroke="#a3b5c0" stroke-width="3"/><circle r="11" fill="#07131b"/>`;
  if(r==='caliper')return `<path d="M-55 -31h70c27 0 42 17 42 39v30H22V10c0-10-7-17-17-17h-60z" fill="#5e7180" stroke="#c8d4dc" stroke-width="3"/>`;
  if(r==='shoe')return `<path d="M-46 -33h92l8 15-9 50h-90l-9-50z" fill="#3b4d59" stroke="#9cafbb"/><rect x="-34" y="-25" width="68" height="12" rx="4" fill="#836f4e"/>`;
  if(r==='spring')return `<path d="M-72 20 Q0 -55 72 20 M-66 30 Q0 -37 66 30 M-58 40 Q0 -20 58 40" fill="none" stroke="#aab9c3" stroke-width="8" stroke-linecap="round"/>`;
  if(r==='shock')return `<rect x="-10" y="-57" width="20" height="112" rx="8" fill="${m}"/><rect x="-21" y="21" width="42" height="24" rx="8" fill="#526a7a"/><circle cy="-65" r="12" fill="#334a59"/>`;
  if(r==='gearbox')return `<path d="M-72 -36h95l44 22v49l-31 18h-108z" fill="${m}" stroke="#dbe6ec" stroke-width="3"/><circle cx="-40" r="16" fill="#172833"/><circle cx="18" r="13" fill="#172833"/>`;
  if(r==='clutch')return `<circle r="47" fill="#708492" stroke="#dce5ea" stroke-width="3"/><circle r="23" fill="#1a2c38" stroke="#a9b8c2" stroke-width="3"/>`;
  if(r==='shaft')return `<path d="M-75 0h150" stroke="#8fa1ad" stroke-width="18" stroke-linecap="round"/><circle cx="-80" r="18" fill="#566d7d"/><circle cx="80" r="18" fill="#566d7d"/>`;
  if(r==='diff')return `<ellipse rx="55" ry="42" fill="${m}" stroke="#dce6ec" stroke-width="3"/><circle r="16" fill="#172833"/><path d="M-95 0h40M55 0h40" stroke="#8fa2af" stroke-width="18"/>`;
  if(r==='steering')return `<rect x="-48" y="-42" width="96" height="84" rx="17" fill="${m}" stroke="#dce6ec" stroke-width="3"/><circle r="19" fill="#172833"/><path d="M46 15l55 35" stroke="#899daa" stroke-width="12" stroke-linecap="round"/>`;
  if(r==='light')return `<path d="M-48 -28h80l20 28-20 28h-80z" fill="#d9eef7" fill-opacity=".7" stroke="#9fc0d0" stroke-width="3"/><circle cx="5" r="17" fill="#f4d98c" fill-opacity=".75"/>`;
  if(r==='door')return `<rect x="-45" y="-60" width="90" height="120" rx="8" fill="#536b7c" stroke="#c0cdd6" stroke-width="3"/><rect x="-32" y="-47" width="64" height="50" rx="5" fill="#1c3445"/><circle cx="28" cy="20" r="5" fill="#d8a34e"/>`;
  if(r==='frame')return `<path d="M-90 -34h180v18H-58v32H90v18H-90z" fill="${m}" stroke="#d9e3e9" stroke-width="2"/><path d="M-62 -16v32M0 -16v32M62 -16v32" stroke="#607788" stroke-width="10"/>`;
  if(r==='hitch')return `<path d="M-80 0h105l50 36" fill="none" stroke="#899ca8" stroke-width="18" stroke-linecap="round"/><circle cx="78" cy="39" r="18" fill="#5d7484" stroke="#ccd7de"/>`;
  if(r==='gasket')return `<ellipse rx="52" ry="31" fill="none" stroke="#d69b43" stroke-width="8"/><ellipse rx="30" ry="15" fill="none" stroke="#f1c274" stroke-width="3"/>`;
  if(r==='fastener')return `<polygon points="-13,-30 13,-30 21,-19 13,-8 -13,-8 -21,-19" fill="#bdcad2"/><rect x="-6" y="-8" width="12" height="60" rx="3" fill="${m}"/>`;
  if(r==='oilpan')return `<path d="M-69 -22h138l-13 64h-112z" fill="${m}" stroke="#dce5ea" stroke-width="3"/>`;
  return `<path d="M-58 -32h90l30 22-10 44h-97l-23-20z" fill="${m}" stroke="#dbe6ec" stroke-width="3"/><circle cx="-25" r="11" fill="#172833"/><circle cx="25" r="11" fill="#172833"/>`;
}
function node(x){
  const st=status(x),id=x.component_id,name=x.c?.name||x.position_note||'Componente',num=x.item_number||'—',px=x.ax+(x.ex-x.ax)*F.explode,py=x.ay+(x.ey-x.ay)*F.explode;
  return `<g data-v3-id="${esc(id)}" class="spr-v3-node fleet-node ${st}${F.diagnostic.has(id)?' diagnostic':''}${F.selected===id?' selected':''}" transform="translate(${px.toFixed(1)} ${py.toFixed(1)})"><g class="spr-v3-part" filter="url(#fpShadow)">${shape(x)}</g><g class="fleet-tag" transform="translate(-64 60)"><rect width="128" height="34" rx="10"/><circle cx="16" cy="17" r="10"/><text x="16" y="20" text-anchor="middle">${esc(num)}</text><text x="31" y="14" class="n">${esc(String(name).slice(0,20))}${String(name).length>20?'…':''}</text><text x="31" y="27" class="s">${st==='verified'?'verificado':st==='estimated'?'estrutural':'a confirmar'}</text></g></g>`;
}
function grid(){let s='';for(let x=40;x<1120;x+=40)s+=`<line x1="${x}" y1="0" x2="${x}" y2="610"/>`;for(let y=40;y<610;y+=40)s+=`<line x1="0" y1="${y}" x2="1120" y2="${y}"/>`;return s}
function renderScene(){
  const h=$('#fleetStage');if(!h||!F.active)return;
  const cfg=placed();if(!cfg.length){h.innerHTML='<div class="fleet-empty">Este sistema ainda não possui componentes vinculados.</div>';return}
  const leaders=cfg.map(x=>{const px=x.ax+(x.ex-x.ax)*F.explode,py=x.ay+(x.ey-x.ay)*F.explode;return `<line x1="540" y1="300" x2="${px}" y2="${py}"/>`;}).join('');
  h.innerHTML=`<div class="spr-v3-toolbar fleet-toolbar"><div><span class="spr-v3-premium">PREMIUM</span><b>${esc(groupName(F.group))}</b><small>${esc(F.view?.title||'Vista estrutural gerada a partir do catálogo da condução')}</small></div><div class="spr-v3-controls"><button id="fleetAssembled" type="button">Montado</button><button id="fleetExploded" class="active" type="button">Explodido</button><button id="fleetPlay" type="button">▶ Animar</button><input id="fleetRange" type="range" min="0" max="100" value="${Math.round(F.explode*100)}"><span id="fleetPct">${Math.round(F.explode*100)}%</span></div></div><div class="fleet-canvas"><svg class="fleet-svg" viewBox="0 0 1120 610">${defs()}<g class="fleet-grid">${grid()}</g><g class="fleet-leaders">${leaders}</g><g>${cfg.map(node).join('')}</g></svg><div class="fleet-watermark">${F.view?.verification_status==='verified'?'DADOS DA VISTA VERIFICADOS • ':''}POSIÇÃO VISUAL FUNCIONAL • NÃO É GEOMETRIA OEM</div></div>`;
  $('#fleetAssembled').onclick=()=>animate(0);$('#fleetExploded').onclick=()=>animate(1);$('#fleetRange').oninput=e=>{F.explode=Number(e.target.value)/100;renderScene()};$('#fleetPlay').onclick=play;
  $$('#fleetStage [data-v3-id]').forEach(n=>n.onclick=()=>select(n.dataset.v3Id));
}
function animate(target){
  clearInterval(F.timer);F.timer=null;const a=F.explode,d=target-a,t0=performance.now();
  function tick(t){const p=clamp((t-t0)/600,0,1);F.explode=a+d*(1-Math.pow(1-p,3));renderScene();if(p<1)requestAnimationFrame(tick)}
  requestAnimationFrame(tick);
}
function play(){
  if(F.timer){clearInterval(F.timer);F.timer=null;renderScene();return}
  let d=F.explode>.5?-1:1;
  F.timer=setInterval(()=>{F.explode=clamp(F.explode+d*.04,0,1);if(F.explode===0||F.explode===1)d*=-1;renderScene()},80);
}
function select(id){F.selected=id;renderScene();renderSide(F.components.get(id))}
function renderSide(c){
  const h=$('#fleetSide');if(!h)return;
  if(!c){
    const result=F.diagnostic.size?`<div class="fleet-diagnosis"><b>Peças para verificar</b>${[...F.diagnostic].slice(0,6).map(id=>{const x=F.components.get(id);return x?`<button data-fleet-result="${esc(id)}">${esc(x.name)}</button>`:''}).join('')}<small>${esc(F.diagnosisText||'A lista indica prioridade de inspeção, não condenação automática da peça.')}</small></div>`:'';
    h.innerHTML=`<div class="fleet-empty">Selecione uma peça no desenho para ver aplicação, código, ferramentas, sintomas e abrir o Reparo Guiado.</div>${result}`;
    $$('[data-fleet-result]',h).forEach(b=>b.onclick=()=>focusComponent(b.dataset.fleetResult));return;
  }
  const l=F.linkMap.get(c.id),verified=l?.fitment_status==='verified'&&c.data_status==='verified',tools=arr(c.required_tools),sym=arr(c.failure_symptoms),tests=arr(c.diagnostic_notes);
  h.innerHTML=`<div class="fleet-part-head"><div><small>${esc(groupName(c.group_code))}</small><h4>${esc(c.name)}</h4></div><span class="fleet-status ${verified?'verified':'pending'}">${verified?'VERIFICADO':'CONFIRMAR APLICAÇÃO'}</span></div><div class="fleet-spec"><div><span>OEM</span><b>${esc(c.oem_part_number||'A confirmar')}</b></div><div><span>Equivalente</span><b>${esc(c.manufacturer_part_number||'—')}</b></div><div><span>Localização</span><b>${esc(c.location_description||'A confirmar')}</b></div><div><span>Torque / especificação</span><b>${esc(text(c.torque_spec))}</b></div></div>${c.function_description?`<section><b>Função</b><p>${esc(c.function_description)}</p></section>`:''}${tools.length?`<section><b>Ferramentas</b><p>${tools.map(x=>esc(typeof x==='string'?x:text(x))).join(' • ')}</p></section>`:''}${sym.length?`<section><b>Sintomas relacionados</b><ul>${sym.slice(0,6).map(x=>`<li>${esc(typeof x==='string'?x:text(x))}</li>`).join('')}</ul></section>`:''}${tests.length?`<section><b>Testes cadastrados</b><ol>${tests.slice(0,6).map(x=>`<li>${esc(typeof x==='string'?x:text(x))}</li>`).join('')}</ol></section>`:''}<div class="fleet-warning">${verified?'A aplicação está marcada como confirmada. A geometria visual continua sendo reconstrução funcional quando a vista não for OEM licenciada.':'Não comprar, apertar ou desmontar com base em dado estimado. Confirme código, medida e procedimento na peça instalada/fonte técnica.'}</div><div class="fleet-side-actions"><button id="fleetRepair" class="primary">🔧 Reparo guiado</button><button id="fleetCatalog">Abrir no catálogo</button></div>`;
  $('#fleetRepair').onclick=()=>{const n=$(`#fleetStage [data-v3-id="${CSS.escape(c.id)}"]`);n?.dispatchEvent(new MouseEvent('dblclick',{bubbles:true,cancelable:true,view:window}))};
  $('#fleetCatalog').onclick=()=>{const s=$('#catalogSearch');if(s){s.value=c.name;s.dispatchEvent(new Event('input',{bubbles:true}))}document.querySelector('[data-tab="catalog"]')?.click()};
}
function focusComponent(id){
  const c=F.components.get(id);if(!c)return;
  if(c.group_code!==F.group){F.group=c.group_code;if($('#pvSystem'))$('#pvSystem').value=F.group;renderGroup(F.group);setTimeout(()=>{F.selected=id;F.diagnostic.add(id);renderScene();renderSide(c)},350)}
  else{F.selected=id;F.diagnostic.add(id);renderScene();renderSide(c)}
}

async function diagnose(raw){
  const q=String(raw||'').trim();if(!q){toast('Digite um sintoma ou código de falha.');return}
  F.diagnostic.clear();F.diagnosisText='';const code=q.toUpperCase().replace(/\s+/g,'');
  if(/^[PCBU][0-9A-F]{4}$/.test(code)){
    const r=await F.client.from('v2_vehicle_diagnostic_playbooks').select('*').eq('protocol','obd2').eq('code',code);
    const plays=r.error?[]:(r.data||[]),p=plays.find(x=>x.vehicle_id===F.vehicle.id)||plays.find(x=>!x.vehicle_id&&x.chassis_variant===F.profile.chassis_variant&&x.engine_code===F.profile.engine_code)||plays[0];
    arr(p?.related_component_ids).forEach(id=>{if(F.components.has(id))F.diagnostic.add(id)});
    F.diagnosisText=p?.interpretation||p?.title||`Código ${code}: componentes relacionados cadastrados para inspeção.`;
    if(F.diagnostic.size){finishDiagnosis();return}
    const lib=await F.client.from('v2_diagnostic_code_library').select('*').eq('protocol','obd2').eq('code',code).maybeSingle();
    const seed=[lib.data?.generic_definition,...arr(lib.data?.generic_causes)].filter(Boolean).join(' ');
    scoreSymptom(seed||q);return;
  }
  scoreSymptom(q);
}
function scoreSymptom(q){
  const stop=new Set(['com','sem','que','para','uma','uns','das','dos','por','esta','esse','isso','muito','quando','depois','antes','veiculo','motor']);
  const tokens=norm(q).split(/[^a-z0-9]+/).filter(x=>x.length>2&&!stop.has(x));
  const nq=norm(q);
  const scored=[...F.components.values()].map(c=>{
    const name=norm(`${c.name} ${c.generic_name||''}`),blob=norm(`${c.name} ${c.generic_name||''} ${c.location_description||''} ${c.function_description||''} ${JSON.stringify(c.failure_symptoms||[])} ${JSON.stringify(c.diagnostic_notes||[])}`);
    let s=0;for(const t of tokens){if(name.includes(t))s+=5;if(blob.includes(t))s+=2}
    if(/perda.*forca|sem.*forca|turbo/.test(nq)&&/turbo|intercooler|pressao|admissao|mangueira/.test(blob))s+=5;
    if(/aquece|superaquec/.test(nq)&&/radiador|bomba.*agua|termost|temperatura|ventilador|arrefec/.test(blob))s+=6;
    if(/oleo|pressao.*oleo/.test(nq)&&/oleo|lubr|carter|filtro/.test(blob))s+=5;
    if(/freio|freia/.test(nq)&&/freio|tambor|disco|pinca|cilindro|servo/.test(blob))s+=6;
    if(/barulho|folga|vibra/.test(nq)&&/rolamento|cubo|cardan|cruzeta|bucha|mola|amortec/.test(blob))s+=3;
    return {id:c.id,s};
  }).filter(x=>x.s>0).sort((a,b)=>b.s-a.s).slice(0,6);
  scored.forEach(x=>F.diagnostic.add(x.id));
  F.diagnosisText=scored.length?'Componentes priorizados por correspondência entre o sintoma informado e os dados técnicos cadastrados. Confirme por teste antes de substituir.':'Nenhuma peça foi apontada com segurança. Use o diagnóstico por sistema e inspeção física.';
  finishDiagnosis();
}
function finishDiagnosis(){
  if(!F.diagnostic.size){renderScene();renderSide(null);toast('Nenhuma peça relacionada cadastrada para este diagnóstico.');return}
  const first=F.components.get([...F.diagnostic][0]);
  if(first&&first.group_code!==F.group){F.group=first.group_code;if($('#pvSystem'))$('#pvSystem').value=F.group;renderGroup(F.group);setTimeout(()=>{renderScene();renderSide(null)},350)}
  else{renderScene();renderSide(null)}
  toast(`${F.diagnostic.size} componente(s) priorizado(s) para inspeção.`);
}

function bind(){
  const picker=$('#vehiclePicker');
  if(picker&&picker.dataset.fleetPremium!=='1'){
    picker.dataset.fleetPremium='1';picker.addEventListener('change',()=>setTimeout(load,180));
  }
  document.addEventListener('click',e=>{
    const b=e.target.closest?.('[data-component-name]');if(!b||!F.active)return;
    const n=norm(b.dataset.componentName),c=[...F.components.values()].find(x=>norm(x.name)===n)||[...F.components.values()].find(x=>norm(x.name).includes(n)||n.includes(norm(x.name)));
    if(c){F.diagnostic.clear();F.diagnostic.add(c.id);F.diagnosisText='Componente relacionado pelo diagnóstico do código informado.';focusComponent(c.id)}
  });
}
function boot(){
  let tries=0;const t=setInterval(()=>{tries++;if(ensureUi()){clearInterval(t);bind();setTimeout(load,260)}else if(tries>180)clearInterval(t)},100);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();