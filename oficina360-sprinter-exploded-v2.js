(()=>{
'use strict';

const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const asText=v=>{
  if(v===null||v===undefined||v==='')return '—';
  if(Array.isArray(v))return v.map(x=>typeof x==='string'?x:JSON.stringify(x)).join(' • ')||'—';
  if(typeof v==='object')return Object.entries(v).map(([k,x])=>`${k}: ${typeof x==='object'?JSON.stringify(x):x}`).join(' • ')||'—';
  return String(v);
};

const S={client:null,token:0,active:false,profile:null,vehicleId:null,views:[],group:null,view:null,items:[],components:new Map(),cache:new Map(),selectedId:null,mode:'structural'};

async function client(){
  if(S.client)return S.client;
  if(!window.supabase||!window.SUPABASE_URL||!window.SUPABASE_PUBLISHABLE_KEY)return null;
  S.client=window.supabase.createClient(window.SUPABASE_URL,window.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  return S.client;
}
function exact(p){
  if(!p)return false;
  const vin=String(p.vin||'').toUpperCase();
  return vin==='8AC903662BE040910'||(String(p.chassis_variant||'')==='903.662'&&String(p.engine_code||'').toUpperCase()==='OM611.981');
}
function notice(msg){
  const t=$('#toast');if(!t){console.info('[O360 EPC2]',msg);return}
  t.textContent=msg;t.classList.add('show');clearTimeout(window.__o360Epc2Toast);window.__o360Epc2Toast=setTimeout(()=>t.classList.remove('show'),2500);
}

function ensureUi(){
  const tab=$('#tab-visual'),stage=tab?.querySelector('.pv-stage');if(!tab||!stage)return false;
  if($('#sprEpc2'))return true;
  const box=document.createElement('section');box.id='sprEpc2';box.className='spr-epc2';
  box.innerHTML=`
    <div class="spr-epc2-head">
      <div><span class="spr-epc2-eyebrow">SPRINTER 313 CDI • VISTA ESTRUTURAL V2</span><h3 id="sprEpc2Title">Conjunto técnico</h3><p id="sprEpc2Subtitle">Reconstrução vetorial original do Oficina 360 baseada na estrutura real cadastrada para W903 / 903.662 / OM611.981. Não copia imagem protegida de EPC.</p></div>
      <div class="spr-epc2-actions"><button class="spr-epc2-btn primary" id="sprEpc2Structural" type="button">Vista estrutural real</button><button class="spr-epc2-btn" id="sprEpc2Illustrative" type="button">Modelo 3D ilustrativo</button></div>
    </div>
    <div class="spr-epc2-meta" id="sprEpc2Meta"></div>
    <div class="spr-epc2-layout">
      <div class="spr-epc2-main"><div class="spr-epc2-viewnav" id="sprEpc2ViewNav"></div><div class="spr-epc2-stage" id="sprEpc2Stage"><div class="spr-epc2-empty">Carregando vista técnica...</div></div><div class="spr-epc2-legend"><span><i class="spr-epc2-dot v"></i> verificado</span><span><i class="spr-epc2-dot e"></i> estrutural / estimado</span><span><i class="spr-epc2-dot p"></i> pendente</span><span>• o desenho mostra relações e peças cadastradas; geometria/dimensão não verificada não é apresentada como OEM.</span></div></div>
      <aside class="spr-epc2-side" id="sprEpc2Side"><div class="spr-epc2-side-empty">Toque em uma peça do desenho para abrir OEM, aplicação, quantidade, posição e nível de confiabilidade.</div></aside>
    </div>`;
  stage.prepend(box);
  $('#sprEpc2Structural').onclick=()=>setMode('structural');
  $('#sprEpc2Illustrative').onclick=()=>setMode('illustrative');
  return true;
}
function setMode(mode){
  S.mode=mode;const tab=$('#tab-visual');if(!tab)return;
  tab.classList.toggle('spr-epc2-active',mode==='structural'&&S.active);
  tab.classList.toggle('spr-epc2-illustrative',mode==='illustrative'&&S.active);
  $('#sprEpc2Structural')?.classList.toggle('active',mode==='structural');
  $('#sprEpc2Illustrative')?.classList.toggle('active',mode==='illustrative');
  if(mode==='structural')notice('Vista estrutural: peças e relações vêm do catálogo técnico desta Sprinter.');
  else notice('Modelo 3D ilustrativo exibido. Ele não representa geometria OEM exata.');
}
function activate(on){
  S.active=on;const box=$('#sprEpc2'),tab=$('#tab-visual');if(box)box.classList.toggle('active',on);
  if(tab){tab.classList.toggle('spr-epc2-active',on&&S.mode==='structural');if(!on)tab.classList.remove('spr-epc2-illustrative')}
}

async function load(){
  if(!ensureUi())return;
  const c=await client();if(!c)return;
  const id=$('#vehiclePicker')?.value||new URLSearchParams(location.search).get('vehicle');if(!id)return;
  const token=++S.token;
  try{
    const [p,v]=await Promise.all([
      c.from('v2_vehicle_technical_profiles').select('*').eq('vehicle_id',id).maybeSingle(),
      c.from('v2_vehicles').select('id,plate,description').eq('id',id).maybeSingle()
    ]);
    if(token!==S.token)return;
    if(p.error)throw p.error;
    S.profile=p.data||null;S.vehicleId=id;
    if(!exact(S.profile)){activate(false);return}
    S.active=true;activate(true);setMode('structural');
    const vr=await c.from('v2_vehicle_exploded_views').select('*').order('group_code').order('title');
    if(vr.error)throw vr.error;
    S.views=(vr.data||[]).filter(x=>(!x.chassis_family||x.chassis_family===S.profile.chassis_family)&&(!x.chassis_variant||x.chassis_variant===S.profile.chassis_variant)&&(!x.engine_code||x.engine_code===S.profile.engine_code));
    const current=$('#pvSystem')?.value;
    S.group=current&&S.views.some(x=>x.group_code===current)?current:preferredGroup();
    renderGroup(S.group);
    const plate=v.data?.plate?` • ${v.data.plate}`:'';
    $('#sprEpc2Subtitle').textContent=`Reconstrução vetorial original do Oficina 360 baseada no catálogo desta Sprinter${plate}. Estrutura W903 / ${S.profile.chassis_variant||'903.662'} / ${S.profile.engine_code||'OM611.981'}; nenhuma geometria estimada é rotulada como OEM.`;
  }catch(e){
    console.error('Oficina360 Sprinter exploded v2',e);activate(true);
    $('#sprEpc2Stage').innerHTML=`<div class="spr-epc2-empty">Não foi possível carregar as vistas estruturais agora.<br>${esc(e.message||'Erro de sincronização')}</div>`;
  }
}
function preferredGroup(){
  const pref=['engine_turbo','engine_air','engine_fuel','engine','engine_cooling','engine_lubrication','transmission','brakes'];
  return pref.find(g=>S.views.some(v=>v.group_code===g))||S.views[0]?.group_code||null;
}
function groupLabel(code){
  const o=[...($('#pvSystem')?.options||[])].find(x=>x.value===code);return o?.textContent?.replace(/\s*\(\d+\)\s*$/,'')||code||'Sistema';
}

function renderGroup(group){
  if(!S.active)return;S.group=group;
  const views=S.views.filter(v=>v.group_code===group);
  const nav=$('#sprEpc2ViewNav');
  if(!views.length){
    nav.innerHTML='';$('#sprEpc2Title').textContent=groupLabel(group);
    $('#sprEpc2Meta').innerHTML='<span class="spr-epc2-chip pending">SEM VISTA ESTRUTURADA PARA ESTE SISTEMA</span>';
    $('#sprEpc2Stage').innerHTML='<div class="spr-epc2-empty">O catálogo possui peças deste sistema, mas ainda não existe uma vista explodida estruturada segura para ele. O Oficina 360 não cria uma geometria falsa.</div>';
    $('#sprEpc2Side').innerHTML='<div class="spr-epc2-side-empty">Use o catálogo real abaixo para consultar as peças enquanto esta vista não é estruturada.</div>';return;
  }
  nav.innerHTML=views.map((v,i)=>`<button class="spr-epc2-viewbtn ${(!S.view&&i===0)||S.view?.id===v.id?'active':''}" type="button" data-epc2-view="${esc(v.id)}" title="${esc(v.title||v.assembly_code)}">${esc(v.title||v.assembly_code)}</button>`).join('');
  $$('[data-epc2-view]',nav).forEach(b=>b.onclick=()=>selectView(views.find(v=>v.id===b.dataset.epc2View)));
  const candidate=views.find(v=>v.id===S.view?.id)||rankViews(views)[0];selectView(candidate);
}
function rankViews(views){
  return [...views].sort((a,b)=>scoreView(b)-scoreView(a)||String(a.title||'').localeCompare(String(b.title||''),'pt-BR'));
}
function scoreView(v){
  let n=0;if(v.verification_status==='verified')n+=40;if(v.verification_status==='estimated')n+=10;
  if(v.source_metadata?.official_epc===true)n+=50;if(v.image_license_status==='licensed'||v.image_license_status==='owned')n+=30;
  if(v.source_metadata?.generated_catalog===true)n-=5;return n;
}
async function selectView(view){
  if(!view)return;S.view=view;S.selectedId=null;
  $$('[data-epc2-view]').forEach(b=>b.classList.toggle('active',b.dataset.epc2View===view.id));
  $('#sprEpc2Title').textContent=view.title||groupLabel(view.group_code);
  renderMeta(view);$('#sprEpc2Stage').innerHTML='<div class="spr-epc2-empty">Montando vista explodida...</div>';renderSide(null);
  try{
    let payload=S.cache.get(view.id);
    if(!payload){
      const r=await S.client.from('v2_vehicle_exploded_view_items').select('*').eq('exploded_view_id',view.id).order('item_number');
      if(r.error)throw r.error;
      const items=r.data||[],ids=[...new Set(items.map(x=>x.component_id).filter(Boolean))],comps=[];
      for(let i=0;i<ids.length;i+=70){const q=await S.client.from('v2_vehicle_components').select('*').in('id',ids.slice(i,i+70));if(q.error)throw q.error;comps.push(...(q.data||[]))}
      payload={items,components:new Map(comps.map(c=>[c.id,c]))};S.cache.set(view.id,payload);
    }
    if(S.view?.id!==view.id)return;S.items=payload.items;S.components=payload.components;renderScene();
  }catch(e){console.warn('EPC2 view load',e);$('#sprEpc2Stage').innerHTML=`<div class="spr-epc2-empty">Falha ao carregar os itens desta vista.<br>${esc(e.message||'')}</div>`}
}
function renderMeta(v){
  const status=v.verification_status||'reference_pending',cls=status==='verified'?'verified':status==='estimated'?'estimated':'pending';
  const official=v.source_metadata?.official_epc===true;
  const generated=v.source_metadata?.generated_catalog===true||v.image_license_status==='generated';
  const source=v.source_name||'Oficina 360';
  $('#sprEpc2Meta').innerHTML=`<span class="spr-epc2-chip ${cls}"><b>${status==='verified'?'VISTA VERIFICADA':status==='estimated'?'VISTA ESTRUTURAL':'VISTA PENDENTE'}</b></span><span class="spr-epc2-chip">CONJUNTO <b>${esc(v.assembly_code||'—')}</b></span><span class="spr-epc2-chip">FONTE <b>${esc(source)}</b></span>${official?'<span class="spr-epc2-chip verified">EPC OFICIAL REFERENCIADO</span>':''}${generated?'<span class="spr-epc2-chip estimated">DESENHO ORIGINAL / NÃO OEM</span>':''}`;
}

function statusOf(item,c){
  const i=String(item?.exactness_status||'').toLowerCase(),d=String(c?.data_status||'').toLowerCase();
  if(i==='verified'&&d==='verified')return 'verified';
  if(i==='estimated'||d==='estimated')return 'estimated';
  return 'pending';
}
function statusLabel(s){return s==='verified'?'verificado':s==='estimated'?'estrutural':'pendente'}
function sceneItems(){
  const rows=S.items.map(i=>({item:i,c:S.components.get(i.component_id)||null}));
  const parent=rows.find(x=>x.item.parent_item_number===null||x.item.item_number==='00'||x.c?.component_type==='assembly');
  const sorted=rows.sort((a,b)=>{
    const ap=a===parent?-1:0,bp=b===parent?-1:0;if(ap!==bp)return ap-bp;
    return String(a.item.item_number||'').localeCompare(String(b.item.item_number||''),undefined,{numeric:true});
  });
  const MAX=20;if(sorted.length<=MAX)return {shown:sorted,total:sorted.length};
  const major=sorted.filter(x=>['assembly','part','sensor','actuator','bearing','hose','pipe','gasket','seal'].includes(x.item.component_type||x.c?.component_type)).slice(0,MAX);
  return {shown:major.length?major:sorted.slice(0,MAX),total:sorted.length};
}
function layout(rows){
  const n=rows.length,out=[];if(!n)return out;
  const cx=560,cy=285;
  const parentIndex=Math.max(0,rows.findIndex(x=>x.item.parent_item_number===null||x.item.item_number==='00'||x.c?.component_type==='assembly'));
  const parent=rows[parentIndex];out.push({row:parent,x:cx,y:cy,w:210,h:105,central:true});
  const others=rows.filter((_,i)=>i!==parentIndex);
  const left=[],right=[],top=[],bottom=[];
  others.forEach((r,i)=>{const bucket=i%4;({0:left,1:right,2:top,3:bottom}[bucket]).push(r)});
  left.forEach((r,i)=>out.push({row:r,x:120,y:90+i*(430/Math.max(1,left.length-1||1)),w:190,h:78}));
  right.forEach((r,i)=>out.push({row:r,x:895,y:90+i*(430/Math.max(1,right.length-1||1)),w:190,h:78}));
  top.forEach((r,i)=>out.push({row:r,x:330+i*(460/Math.max(1,top.length-1||1)),y:55,w:175,h:74}));
  bottom.forEach((r,i)=>out.push({row:r,x:330+i*(460/Math.max(1,bottom.length-1||1)),y:515,w:175,h:74}));
  return out;
}
function renderScene(){
  const stage=$('#sprEpc2Stage');if(!stage)return;
  const {shown,total}=sceneItems();if(!shown.length){stage.innerHTML='<div class="spr-epc2-empty">Esta vista está cadastrada, mas ainda não possui itens estruturados.</div>';return}
  const nodes=layout(shown),center=nodes.find(n=>n.central)||nodes[0];
  const leaders=nodes.filter(n=>!n.central).map(n=>`<line class="spr-epc2-leader" x1="${center.x}" y1="${center.y}" x2="${n.x}" y2="${n.y}"/>`).join('');
  const body=nodes.map(n=>nodeSvg(n)).join('');
  stage.innerHTML=`<svg viewBox="0 0 1120 610" role="img" aria-label="Vista estrutural explodida de ${esc(S.view?.title||'conjunto')}"><defs><linearGradient id="epcMetal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e0e9ef"/><stop offset=".26" stop-color="#6c8294"/><stop offset=".52" stop-color="#c2d0da"/><stop offset=".78" stop-color="#455b6e"/><stop offset="1" stop-color="#9db0be"/></linearGradient><linearGradient id="epcDark" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#33495b"/><stop offset=".55" stop-color="#0e1b27"/><stop offset="1" stop-color="#50687b"/></linearGradient><filter id="epcShadow"><feDropShadow dx="0" dy="7" stdDeviation="6" flood-color="#000" flood-opacity=".48"/></filter></defs>${leaders}${body}</svg><div class="spr-epc2-watermark">${total>shown.length?`${shown.length} de ${total} itens representados • `:''}RECONSTRUÇÃO VETORIAL ORIGINAL • NÃO É IMAGEM OEM</div>`;
  $$('[data-epc2-item]',stage).forEach(g=>g.addEventListener('click',()=>selectItem(g.dataset.epc2Item)));
  if(S.selectedId)highlight(S.selectedId);
}
function nodeSvg(n){
  const {item,c}=n.row,id=item.component_id||`item-${item.id}`,name=c?.name||item.position_note||'Componente',type=item.component_type||c?.component_type||'part',status=statusOf(item,c);
  const label=short(name,28),num=item.item_number||'—',qty=item.quantity||1;
  return `<g class="spr-epc2-node ${status}" data-epc2-item="${esc(id)}" transform="translate(${n.x} ${n.y})"><g transform="translate(${-n.w/2} ${-n.h/2})">${partShape(type,name,n.w,n.h,n.central)}<rect class="spr-epc2-badge" x="6" y="5" width="34" height="19" rx="8"/><text class="spr-epc2-itemnum" x="23" y="19" text-anchor="middle">${esc(num)}</text><text class="spr-epc2-label" x="${n.w/2}" y="${n.h-19}" text-anchor="middle">${esc(label)}</text><text class="spr-epc2-sub" x="${n.w/2}" y="${n.h-7}" text-anchor="middle">${esc(type)} • ${esc(statusLabel(status))} • qtd ${esc(qty)}</text></g></g>`;
}
function short(s,n){s=String(s||'');return s.length>n?s.slice(0,n-1)+'…':s}
function partShape(type,name,w,h,central){
  const s=norm(`${type} ${name}`),cx=w/2,cy=h/2-7,scale=central?1.15:1;
  const frame=`<rect class="spr-body" x="2" y="2" width="${w-4}" height="${h-4}" rx="${central?18:13}" fill="#0a1721" stroke-width="2" opacity=".92"/>`;
  if(/turbo/.test(s))return frame+`<g transform="translate(${cx} ${cy}) scale(${scale})" filter="url(#epcShadow)"><path d="M-34 5c0-27 22-49 49-49 22 0 41 14 47 34l-22 8c-3-10-13-17-25-17-14 0-26 11-26 25s12 25 26 25c12 0 22-7 25-18h-24V-7h50v13c0 34-25 57-56 57-31 0-44-24-44-58z" fill="url(#epcMetal)" stroke="#d5e2eb" stroke-width="2"/><circle cx="15" cy="5" r="11" fill="#0a1721" stroke="#9bb1c1" stroke-width="3"/></g>`;
  if(/rail/.test(s))return frame+`<g transform="translate(${cx} ${cy})" filter="url(#epcShadow)"><rect x="-56" y="-9" width="112" height="18" rx="8" fill="url(#epcMetal)" stroke="#d6e2ea"/><g fill="#bdcad4" stroke="#52697a">${[-42,-14,14,42].map(x=>`<rect x="${x-4}" y="8" width="8" height="18" rx="3"/>`).join('')}</g><circle cx="-62" cy="0" r="8" fill="#b2c1cc"/><circle cx="62" cy="0" r="8" fill="#b2c1cc"/></g>`;
  if(/injector|bico/.test(s))return frame+`<g transform="translate(${cx} ${cy})" filter="url(#epcShadow)"><rect x="-8" y="-32" width="16" height="46" rx="6" fill="url(#epcMetal)" stroke="#d6e1e9"/><path d="M-5 14h10l-2 25h-6z" fill="#9aabb8"/><rect x="8" y="-24" width="18" height="11" rx="3" fill="#182a38" stroke="#7890a2"/></g>`;
  if(/sensor|connector|conector/.test(s))return frame+`<g transform="translate(${cx} ${cy})" filter="url(#epcShadow)"><rect x="-22" y="-22" width="44" height="42" rx="8" fill="url(#epcDark)" stroke="#9eb1c0" stroke-width="2"/><rect x="-11" y="-36" width="22" height="17" rx="4" fill="#465e72" stroke="#9eb1c0"/><circle cx="0" cy="4" r="7" fill="#d8a455"/></g>`;
  if(/hose|pipe|mangueira|linha|tubo/.test(s))return frame+`<g transform="translate(${cx} ${cy})"><path d="M-55 20 C-25 -40, 20 42, 58 -16" fill="none" stroke="#8196a5" stroke-width="13" stroke-linecap="round" filter="url(#epcShadow)"/><path d="M-55 20 C-25 -40, 20 42, 58 -16" fill="none" stroke="#233746" stroke-width="6" stroke-linecap="round"/></g>`;
  if(/gasket|seal|o_ring|o-ring|junta|retentor|vedacao/.test(s))return frame+`<g transform="translate(${cx} ${cy})"><ellipse rx="48" ry="25" fill="none" stroke="#d79a40" stroke-width="8" filter="url(#epcShadow)"/><ellipse rx="28" ry="11" fill="none" stroke="#f1c16f" stroke-width="3"/></g>`;
  if(/bolt|screw|stud|parafuso|prisioneiro/.test(s))return frame+`<g transform="translate(${cx} ${cy}) rotate(-12)" filter="url(#epcShadow)"><polygon points="-12,-29 12,-29 20,-19 12,-9 -12,-9 -20,-19" fill="#b7c5cf" stroke="#e1e8ed"/><rect x="-6" y="-9" width="12" height="54" rx="3" fill="url(#epcMetal)"/><path d="M-6 28h12M-6 34h12M-6 40h12" stroke="#52687a" stroke-width="2"/></g>`;
  if(/nut|porca/.test(s))return frame+`<g transform="translate(${cx} ${cy})"><polygon points="0,-34 30,-17 30,17 0,34 -30,17 -30,-17" fill="url(#epcMetal)" stroke="#e1e8ed" stroke-width="2" filter="url(#epcShadow)"/><circle r="15" fill="#0d1a24" stroke="#6c8191" stroke-width="3"/></g>`;
  if(/washer|arruela/.test(s))return frame+`<g transform="translate(${cx} ${cy})"><circle r="33" fill="url(#epcMetal)" stroke="#e0e7ec" filter="url(#epcShadow)"/><circle r="14" fill="#0b1721" stroke="#627a8d"/></g>`;
  if(/bearing|rolamento|cubo/.test(s))return frame+`<g transform="translate(${cx} ${cy})"><circle r="38" fill="#8296a6" stroke="#e0e8ed" stroke-width="3" filter="url(#epcShadow)"/><circle r="25" fill="#142431" stroke="#a5b5c0" stroke-width="3"/>${Array.from({length:8},(_,i)=>{const a=i*Math.PI/4,x=Math.cos(a)*31,y=Math.sin(a)*31;return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" fill="#d4dce2"/>`}).join('')}<circle r="10" fill="#07121b"/></g>`;
  if(/pump|bomba/.test(s))return frame+`<g transform="translate(${cx} ${cy})"><circle r="35" fill="url(#epcMetal)" stroke="#dfe8ee" stroke-width="2" filter="url(#epcShadow)"/>${Array.from({length:6},(_,i)=>`<path d="M0 0 L5 -29 Q19 -22 21 -9 Z" transform="rotate(${i*60})" fill="#465c6e"/>`).join('')}<circle r="8" fill="#152633"/></g>`;
  if(/fan|helice|ventoinha/.test(s))return frame+`<g transform="translate(${cx} ${cy})"><circle r="10" fill="#9fb0bd"/>${Array.from({length:6},(_,i)=>`<path d="M4 -6 C18 -27 35 -29 34 -13 C33 1 20 9 6 8 Z" transform="rotate(${i*60})" fill="#6f8799" stroke="#b8c6cf"/>`).join('')}</g>`;
  if(/radiador|intercooler|condensador|evaporador/.test(s))return frame+`<g transform="translate(${cx} ${cy})" filter="url(#epcShadow)"><rect x="-58" y="-33" width="116" height="66" rx="5" fill="#526a7c" stroke="#c1ced7" stroke-width="3"/>${Array.from({length:12},(_,i)=>`<line x1="${-50+i*9}" y1="-27" x2="${-50+i*9}" y2="27" stroke="#9cadb9"/>`).join('')}<rect x="-68" y="-25" width="10" height="50" fill="#293c4b"/><rect x="58" y="-25" width="10" height="50" fill="#293c4b"/></g>`;
  if(/brake|freio|disco/.test(s))return frame+`<g transform="translate(${cx} ${cy})"><circle r="38" fill="#8b9ca8" stroke="#dde5ea" stroke-width="3" filter="url(#epcShadow)"/><circle r="17" fill="#132430" stroke="#8ca0af" stroke-width="3"/><circle r="7" fill="#07131c"/>${Array.from({length:5},(_,i)=>{const a=i*Math.PI*2/5,x=Math.cos(a)*27,y=Math.sin(a)*27;return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="#263c4a"/>`}).join('')}</g>`;
  if(/spring|mola/.test(s))return frame+`<g transform="translate(${cx} ${cy})"><path d="M-52 0 C-44 -25,-34 25,-26 0 S-8 -25,0 0 S18 25,26 0 S44 -25,52 0" fill="none" stroke="#b5c2ca" stroke-width="7" stroke-linecap="round" filter="url(#epcShadow)"/></g>`;
  if(/clutch|embreagem|volante/.test(s))return frame+`<g transform="translate(${cx} ${cy})"><circle r="39" fill="#6e8291" stroke="#d9e2e8" stroke-width="3" filter="url(#epcShadow)"/><circle r="21" fill="#1a2c38" stroke="#a8b8c3" stroke-width="3"/>${Array.from({length:8},(_,i)=>`<rect x="-4" y="-33" width="8" height="17" rx="2" fill="#b78b46" transform="rotate(${i*45})"/>`).join('')}</g>`;
  if(/filter|filtro/.test(s))return frame+`<g transform="translate(${cx} ${cy})" filter="url(#epcShadow)"><ellipse cx="0" cy="-28" rx="26" ry="9" fill="#c0ccd5"/><rect x="-26" y="-28" width="52" height="59" fill="url(#epcMetal)"/><ellipse cx="0" cy="31" rx="26" ry="9" fill="#728797"/>${[-15,-5,5,15].map(x=>`<line x1="${x}" y1="-24" x2="${x}" y2="27" stroke="#526878"/>`).join('')}</g>`;
  if(/battery|bateria/.test(s))return frame+`<g transform="translate(${cx} ${cy})" filter="url(#epcShadow)"><rect x="-53" y="-30" width="106" height="62" rx="7" fill="#1b2d3a" stroke="#91a6b5" stroke-width="3"/><rect x="-38" y="-38" width="18" height="9" rx="2" fill="#c7d3da"/><rect x="20" y="-38" width="18" height="9" rx="2" fill="#c7d3da"/><text x="-29" y="3" fill="#d9e4ea" font-size="18" font-weight="900">−</text><text x="26" y="3" fill="#d9e4ea" font-size="18" font-weight="900">+</text></g>`;
  if(/head|cabecote|bloco|motor/.test(s)||central)return frame+`<g transform="translate(${cx} ${cy})" filter="url(#epcShadow)"><path d="M-62 -26 L45 -26 L62 -9 L57 28 L-55 28 L-67 8 Z" fill="url(#epcMetal)" stroke="#d8e3ea" stroke-width="2"/><rect x="-43" y="-38" width="70" height="14" rx="5" fill="#314656" stroke="#9aadb9"/><circle cx="-35" cy="2" r="12" fill="#1a2a35" stroke="#7f94a4"/><circle cx="2" cy="2" r="12" fill="#1a2a35" stroke="#7f94a4"/><circle cx="39" cy="2" r="12" fill="#1a2a35" stroke="#7f94a4"/></g>`;
  return frame+`<g transform="translate(${cx} ${cy})" filter="url(#epcShadow)"><path d="M-48 -25 H36 L51 -10 V25 H-48 Z" fill="url(#epcMetal)" stroke="#d9e4ea" stroke-width="2"/><circle cx="-29" cy="2" r="8" fill="#1a2b37"/><circle cx="21" cy="2" r="8" fill="#1a2b37"/><rect x="-23" y="-34" width="38" height="10" rx="4" fill="#435a6b"/></g>`;
}

function selectItem(id){
  S.selectedId=id;highlight(id);
  const row=S.items.find(i=>i.component_id===id),c=S.components.get(id);renderSide(row,c);
  const real=$(`[data-spr-part="${CSS.escape(id)}"]`);if(real){real.click();setTimeout(()=>real.scrollIntoView({behavior:'smooth',block:'nearest'}),20)}
}
function highlight(id){$$('.spr-epc2-node').forEach(n=>n.classList.toggle('selected',n.dataset.epc2Item===id))}
function renderSide(item,c){
  const h=$('#sprEpc2Side');if(!h)return;
  if(!item&&!c){h.innerHTML='<div class="spr-epc2-side-empty">Toque em uma peça do desenho para abrir OEM, aplicação, quantidade, posição e nível de confiabilidade.</div>';return}
  const st=statusOf(item,c),sources=Array.isArray(c?.source_metadata?.sources)?c.source_metadata.sources:[];
  h.innerHTML=`<div class="spr-epc2-parthead"><span class="spr-epc2-partnum">${esc(item?.item_number||'—')}</span><div><small>${esc(item?.component_type||c?.component_type||'componente')} • ${esc(statusLabel(st))}</small><h4>${esc(c?.name||item?.position_note||'Componente')}</h4><span class="spr-epc2-chip ${st}">${esc(st==='verified'?'APLICAÇÃO/DADO VERIFICADO':st==='estimated'?'REFERÊNCIA ESTRUTURAL':'CONFIRMAÇÃO PENDENTE')}</span></div></div>
    <div class="spr-epc2-specs"><div class="spr-epc2-cell"><span>OEM</span><b>${esc(c?.oem_part_number||'A confirmar')}</b></div><div class="spr-epc2-cell"><span>FABRICANTE / EQUIVALENTE</span><b>${esc(c?.manufacturer_part_number||'—')}</b></div><div class="spr-epc2-cell"><span>QUANTIDADE NA VISTA</span><b>${esc(item?.quantity||1)}</b></div><div class="spr-epc2-cell"><span>EXATIDÃO DO ITEM</span><b>${esc(item?.exactness_status||'a confirmar')}</b></div><div class="spr-epc2-cell"><span>LOCALIZAÇÃO</span><b>${esc(c?.location_description||item?.position_note||'A confirmar')}</b></div><div class="spr-epc2-cell"><span>TORQUE / PROCEDIMENTO</span><b>${esc(asText(c?.torque_spec))}</b></div></div>
    ${c?.function_description?`<div class="spr-epc2-section"><span>FUNÇÃO</span><p>${esc(c.function_description)}</p></div>`:''}
    ${item?.position_note?`<div class="spr-epc2-section"><span>POSIÇÃO / RELAÇÃO NA VISTA</span><p>${esc(item.position_note)}</p></div>`:''}
    ${sources.length?`<div class="spr-epc2-section"><span>RASTREABILIDADE</span><p>${sources.slice(0,3).map(x=>esc(x.label||x.url||asText(x))).join(' • ')}</p></div>`:''}
    <div class="spr-epc2-note">${st==='verified'?'O cadastro marca este item como verificado, mas o desenho vetorial continua sendo uma reconstrução original do Oficina 360 e não uma prancha OEM.':'A geometria e/ou aplicação deste item não está marcada como totalmente verificada. Use a vista para localização e relação entre peças; confirme código, medida e procedimento antes da compra ou desmontagem.'}</div>
    <div class="spr-epc2-actions2"><button type="button" class="primary" id="sprEpc2OpenReal">Abrir dados completos</button><button type="button" id="sprEpc2OpenGuide">Guia técnico</button></div>`;
  $('#sprEpc2OpenReal').onclick=()=>openReal(c?.id);
  $('#sprEpc2OpenGuide').onclick=()=>openGuide(c?.id);
}
function openReal(id){if(!id)return;const b=$(`[data-spr-part="${CSS.escape(id)}"]`);if(b){b.click();b.scrollIntoView({behavior:'smooth',block:'center'})}else notice('Peça da vista não está disponível na lista filtrada atual.')}
function openGuide(id){if(!id)return;const b=$(`[data-spr-part="${CSS.escape(id)}"]`);if(b){b.click();setTimeout(()=>$('#sprOpenGuide')?.click(),60)}else notice('Guia técnico indisponível para este item.')}

function syncGroup(group){if(!S.active||!group||group===S.group)return;S.view=null;renderGroup(group)}
function bind(){
  const picker=$('#vehiclePicker');if(picker&&picker.dataset.epc2Bound!=='1'){picker.dataset.epc2Bound='1';picker.addEventListener('change',()=>setTimeout(load,140))}
  const sel=$('#pvSystem');if(sel&&sel.dataset.epc2Bound!=='1'){sel.dataset.epc2Bound='1';sel.addEventListener('change',()=>setTimeout(()=>syncGroup(sel.value),30))}
  document.addEventListener('click',e=>{
    const gb=e.target.closest?.('[data-spr-group]');if(gb&&S.active)setTimeout(()=>syncGroup(gb.dataset.sprGroup),30);
    const rb=e.target.closest?.('[data-spr-part]');if(rb&&S.active&&S.items.some(i=>i.component_id===rb.dataset.sprPart)){S.selectedId=rb.dataset.sprPart;highlight(S.selectedId);const item=S.items.find(i=>i.component_id===S.selectedId);renderSide(item,S.components.get(S.selectedId))}
  });
}
function boot(){
  let tries=0;const timer=setInterval(()=>{tries++;if(ensureUi()){clearInterval(timer);bind();setTimeout(load,180)}else if(tries>160)clearInterval(timer)},100);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
