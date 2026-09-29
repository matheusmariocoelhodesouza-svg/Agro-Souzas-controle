(()=>{
'use strict';

const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const arr=v=>Array.isArray(v)?v:[];
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const words=v=>norm(v).split(/[^a-z0-9]+/).filter(x=>x.length>1);

const state={client:null,vehicle:null,profile:null,links:[],components:[],views:[],maintenance:[],orders:[],faults:[],resolutions:[],specs:[],results:[],ready:false};

function addStyle(){
 if($('#o360CentralStyle'))return;
 const s=document.createElement('style');s.id='o360CentralStyle';s.textContent=`
 .o360-central{display:grid;gap:18px}.o360-central-hero{padding:22px;border:1px solid rgba(136,166,199,.22);border-radius:20px;background:linear-gradient(135deg,rgba(20,37,60,.96),rgba(7,16,29,.96));box-shadow:0 18px 45px rgba(0,0,0,.12)}
 .o360-central-hero h2{margin:4px 0 8px;font-size:clamp(1.45rem,4vw,2.15rem)}.o360-central-hero p{margin:0;color:#9fb0c2;max-width:820px;line-height:1.55}
 .o360-universal-search{display:grid;grid-template-columns:1fr auto;gap:10px;margin-top:18px}.o360-universal-search input{width:100%;box-sizing:border-box;border:1px solid rgba(142,197,255,.32);background:rgba(255,255,255,.06);color:inherit;border-radius:14px;padding:15px 16px;font-size:17px;outline:none}.o360-universal-search input:focus{border-color:#8ec5ff;box-shadow:0 0 0 3px rgba(142,197,255,.12)}
 .o360-suggestions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.o360-suggestions button{border:1px solid rgba(136,166,199,.2);background:rgba(255,255,255,.04);color:#c9d6e4;border-radius:999px;padding:7px 10px;cursor:pointer}
 .o360-central-shortcuts{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px}.o360-shortcut{border:1px solid rgba(136,166,199,.18);background:rgba(12,23,39,.7);border-radius:15px;padding:14px;text-align:left;cursor:pointer;color:inherit;min-height:105px}.o360-shortcut b{display:block;margin:7px 0 4px}.o360-shortcut small{color:#93a5b9;line-height:1.35}.o360-shortcut span{font-size:21px}
 .o360-search-summary{display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap}.o360-search-summary p{margin:0;color:#93a5b9}.o360-result-groups{display:grid;gap:14px}.o360-result-group{border:1px solid rgba(136,166,199,.16);border-radius:16px;overflow:hidden;background:rgba(12,23,39,.62)}.o360-result-group-head{display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border-bottom:1px solid rgba(136,166,199,.12)}.o360-result-group-head h3{margin:0;font-size:1rem}.o360-result-list{display:grid}.o360-result{display:grid;grid-template-columns:auto 1fr auto;gap:12px;align-items:center;padding:13px 14px;border-bottom:1px solid rgba(136,166,199,.09);cursor:pointer}.o360-result:last-child{border-bottom:0}.o360-result:hover{background:rgba(142,197,255,.06)}.o360-result-icon{width:38px;height:38px;border-radius:11px;display:grid;place-items:center;background:rgba(142,197,255,.08);font-size:18px}.o360-result-copy{min-width:0}.o360-result-copy b{display:block}.o360-result-copy small{display:block;color:#91a3b8;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.o360-result-meta{display:flex;gap:6px;align-items:center;justify-content:flex-end;flex-wrap:wrap}.o360-mini{border:1px solid rgba(136,166,199,.18);border-radius:999px;padding:4px 7px;font-size:.68rem;color:#aebdcb}.o360-mini.ok{border-color:rgba(72,187,120,.28);color:#8ed9af}.o360-mini.warn{border-color:rgba(245,184,73,.3);color:#f5c46d}.o360-empty-search{padding:28px;border:1px dashed rgba(136,166,199,.24);border-radius:15px;text-align:center;color:#95a7bb}.o360-search-extra{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;justify-content:center}
 .o360-loading-line{height:3px;border-radius:999px;overflow:hidden;background:rgba(255,255,255,.07);margin-top:12px}.o360-loading-line span{display:block;width:35%;height:100%;background:currentColor;animation:o360load 1.1s infinite ease-in-out}@keyframes o360load{0%{transform:translateX(-120%)}100%{transform:translateX(390%)}}
 @media(max-width:1050px){.o360-central-shortcuts{grid-template-columns:repeat(3,1fr)}}@media(max-width:720px){.o360-universal-search{grid-template-columns:1fr}.o360-central-shortcuts{grid-template-columns:1fr 1fr}.o360-result{grid-template-columns:auto 1fr}.o360-result-meta{grid-column:2;justify-content:flex-start}.o360-universal-search .btn{width:100%}}@media(max-width:460px){.o360-central-shortcuts{grid-template-columns:1fr}}
 `;document.head.appendChild(s);
}

function inject(){
 const nav=$('.side-nav'),content=$('.content');if(!nav||!content||$('[data-tab="central"]'))return;
 const btn=document.createElement('button');btn.type='button';btn.dataset.tab='central';btn.innerHTML='<span>✦</span> Central Técnica';
 const overview=nav.querySelector('[data-tab="overview"]');overview?.insertAdjacentElement('afterend',btn);
 const section=document.createElement('section');section.id='tab-central';section.className='tab';section.innerHTML=`<div id="o360CentralRoot" class="o360-central"></div>`;
 const overviewTab=$('#tab-overview');overviewTab?.insertAdjacentElement('afterend',section);
 btn.addEventListener('click',()=>activate());
 addStyle();
}

function activate(){
 $$('.side-nav button[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab==='central'));
 $$('.tab').forEach(t=>t.classList.toggle('active',t.id==='tab-central'));
 const title=$('#pageTitle');if(title)title.textContent='Central Técnica';
 renderHome();
 if(!state.ready)loadContext().catch(showError);
 setTimeout(()=>$('#o360UniversalSearch')?.focus(),40);
}

function renderHome(){
 const host=$('#o360CentralRoot');if(!host)return;
 const vehicle=$('#vehiclePicker')?.selectedOptions?.[0]?.textContent?.trim()||'condução selecionada';
 host.innerHTML=`
 <div class="o360-central-hero">
  <span class="eyebrow">INTELIGÊNCIA TÉCNICA DA OFICINA</span>
  <h2>O que você precisa resolver nesta condução?</h2>
  <p>Busque por sintoma, código do scanner, peça, código OEM, sistema, serviço ou especificação. O Oficina 360 cruza o que já sabe sobre <b>${esc(vehicle)}</b> e leva você direto ao ponto certo.</p>
  <div class="o360-universal-search"><input id="o360UniversalSearch" autocomplete="off" spellcheck="false" placeholder="Ex.: P0299, perde força, sensor MAP, filtro diesel, torque, freio..."><button id="o360UniversalGo" class="btn primary" type="button">Pesquisar</button></div>
  <div class="o360-suggestions"><button data-q="P0299">P0299</button><button data-q="perde força">perde força</button><button data-q="sensor">sensor</button><button data-q="filtro">filtro</button><button data-q="freio">freio</button><button data-q="óleo">óleo</button></div>
  <div id="o360CentralLoading"></div>
 </div>
 <div class="o360-central-shortcuts">
  <button class="o360-shortcut" data-shortcut="diagnostics"><span>⌁</span><b>Diagnóstico</b><small>DTC, sintomas e memória de reparos.</small></button>
  <button class="o360-shortcut" data-shortcut="catalog"><span>⚙</span><b>Peças</b><small>OEM, equivalentes, aplicação e localização.</small></button>
  <button class="o360-shortcut" data-shortcut="exploded"><span>◫</span><b>Visual</b><small>Vistas explodidas e conjuntos técnicos.</small></button>
  <button class="o360-shortcut" data-shortcut="specs"><span>▤</span><b>Especificações</b><small>Motor, fluidos, capacidades e dados técnicos.</small></button>
  <button class="o360-shortcut" data-shortcut="maintenance"><span>🔧</span><b>Manutenção</b><small>Preventiva, vencimentos e histórico.</small></button>
  <button class="o360-shortcut" data-shortcut="official-sources"><span>↗</span><b>Fontes oficiais</b><small>Fabricantes, manuais e portais técnicos.</small></button>
 </div>
 <div id="o360UniversalResults"></div>`;
 bind();
}

function bind(){
 $('#o360UniversalGo')?.addEventListener('click',()=>runSearch($('#o360UniversalSearch')?.value));
 $('#o360UniversalSearch')?.addEventListener('keydown',e=>{if(e.key==='Enter')runSearch(e.currentTarget.value)});
 $$('#o360CentralRoot [data-q]').forEach(b=>b.addEventListener('click',()=>{const i=$('#o360UniversalSearch');if(i)i.value=b.dataset.q;runSearch(b.dataset.q)}));
 $$('#o360CentralRoot [data-shortcut]').forEach(b=>b.addEventListener('click',()=>openTab(b.dataset.shortcut)));
}

async function client(){
 if(state.client)return state.client;
 if(!window.supabase||!window.SUPABASE_URL||!window.SUPABASE_PUBLISHABLE_KEY)throw new Error('Conexão do Oficina 360 não carregada.');
 state.client=window.supabase.createClient(window.SUPABASE_URL,window.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});return state.client;
}

async function loadContext(){
 const c=await client(),vid=$('#vehiclePicker')?.value||new URLSearchParams(location.search).get('vehicle');if(!vid)return;
 state.ready=false;loading(true);
 const [vr,pr,lr,viewr,mr,orr,fr,rr,sr]=await Promise.all([
  c.from('v2_vehicles').select('*').eq('id',vid).maybeSingle(),
  c.from('v2_vehicle_technical_profiles').select('*').eq('vehicle_id',vid).maybeSingle(),
  c.from('v2_vehicle_component_links').select('*').eq('vehicle_id',vid),
  c.from('v2_vehicle_exploded_views').select('*'),
  c.from('v2_maintenance_plans').select('*').eq('vehicle_id',vid),
  c.from('v2_work_orders').select('*').eq('vehicle_id',vid).order('opened_at',{ascending:false}).limit(120),
  c.from('v2_vehicle_faults').select('*').eq('vehicle_id',vid).order('last_seen_at',{ascending:false}).limit(120),
  c.from('v2_vehicle_fault_resolutions').select('*').eq('vehicle_id',vid).order('created_at',{ascending:false}).limit(120),
  c.from('v2_vehicle_specifications').select('*').eq('vehicle_id',vid)
 ]);
 state.vehicle=vr.data||null;state.profile=pr.data||null;state.links=lr.data||[];state.maintenance=mr.data||[];state.orders=orr.data||[];state.faults=fr.data||[];state.resolutions=rr.data||[];state.specs=sr.data||[];
 const allViews=viewr.data||[];const p=state.profile;
 state.views=allViews.filter(v=>(!v.chassis_family||norm(v.chassis_family)===norm(p?.chassis_family))&&(!v.chassis_variant||norm(v.chassis_variant)===norm(p?.chassis_variant))&&(!v.engine_code||norm(v.engine_code)===norm(p?.engine_code)));
 const ids=[...new Set(state.links.map(x=>x.component_id).filter(Boolean))];state.components=[];
 for(let i=0;i<ids.length;i+=70){const r=await c.from('v2_vehicle_components').select('*').in('id',ids.slice(i,i+70));if(r.data)state.components.push(...r.data)}
 state.ready=true;loading(false);
}

function loading(on){const h=$('#o360CentralLoading');if(!h)return;h.innerHTML=on?'<div class="o360-loading-line"><span></span></div><small style="display:block;margin-top:7px;color:#91a3b8">Carregando inteligência desta condução...</small>':''}
function showError(e){console.error(e);loading(false);const h=$('#o360UniversalResults');if(h)h.innerHTML='<div class="o360-empty-search">Não foi possível carregar a Central Técnica: '+esc(e.message||e)+'</div>'}

function textOf(obj,fields){return fields.map(k=>{const v=obj?.[k];return Array.isArray(v)?v.join(' '):typeof v==='object'&&v?JSON.stringify(v):v||''}).join(' ')}
function expandQuery(q){
 const n=norm(q),set=new Set(words(n));
 const map=[
  [/perde.*forca|sem.*forca|fraco/,['turbo','pressao','admissao','combustivel','sensor']],
  [/nao.*pega|nao.*liga|partida/,['partida','bateria','combustivel','rail','injeção']],
  [/esquenta|temperatura|aquec/,['arrefecimento','radiador','termostato','ventoinha','sensor']],
  [/fumaca|fumaça/,['injeção','turbo','combustivel','admissao']],
  [/freio/,['freio','abs','disco','pastilha','lona','cilindro']],
  [/oleo|óleo/,['oleo','lubrificacao','filtro','pressao']],
  [/diesel|combustivel/,['diesel','combustivel','filtro','bomba','rail','injetor']]
 ];
 map.forEach(([re,adds])=>{if(re.test(n))adds.forEach(x=>set.add(norm(x)))});return [...set];
}
function score(text,qTerms,raw){
 const n=norm(text),r=norm(raw);if(!n)return 0;let s=n.includes(r)&&r.length>1?16:0;qTerms.forEach(t=>{if(n.includes(t))s+=t.length>4?5:3});return s;
}
function confidenceLabel(v){return v==='verified'?['Confirmado','ok']:v==='not_applicable'?['Não aplicável','warn']:v==='candidate'?['A confirmar','warn']:v==='ready'?['Verificado','ok']:['Referência','']}

async function runSearch(raw){
 const q=String(raw||'').trim();if(!q)return;
 if(!state.ready)await loadContext();
 const terms=expandQuery(q),out=[];
 const add=(r)=>{if(r.score>0)out.push(r)};
 const linkByComp=new Map(state.links.map(x=>[x.component_id,x]));
 state.components.forEach(c=>{const link=linkByComp.get(c.id)||{};const tx=textOf(c,['name','generic_name','oem_part_number','manufacturer_part_number','manufacturer','group_code','location_description','function_description','failure_symptoms','diagnostic_notes','replacement_notes']);add({type:'Peças',icon:'⚙',title:c.name||c.generic_name||'Componente',subtitle:[c.oem_part_number&&'OEM '+c.oem_part_number,c.location_description,c.function_description].filter(Boolean).join(' • '),status:confidenceLabel(link.fitment_status||c.data_status),score:score(tx,terms,q)+(norm(c.oem_part_number)===norm(q)?20:0),action:'catalog',query:c.name||c.oem_part_number})});
 state.views.forEach(v=>{const tx=textOf(v,['title','group_code','assembly_code','notes','source_name']);add({type:'Vistas',icon:'◫',title:v.title||'Vista técnica',subtitle:[v.group_code,v.assembly_code,v.source_name].filter(Boolean).join(' • '),status:confidenceLabel(v.verification_status),score:score(tx,terms,q),action:'exploded',query:v.title})});
 state.faults.forEach(f=>{const tx=textOf(f,['code','description','protocol','raw_data']);add({type:'Diagnóstico',icon:'⌁',title:[f.code,f.description].filter(Boolean).join(' — ')||'Falha registrada',subtitle:'Falha '+String(f.status||'registrada')+' • '+(f.occurrence_count||1)+' ocorrência(s)',status:[String(f.status||'').toLowerCase()==='active'?'Ativa':'Histórico',String(f.status||'').toLowerCase()==='active'?'warn':'ok'],score:score(tx,terms,q)+(norm(f.code)===norm(q)?30:0),action:'diagnostics',query:f.code})});
 state.resolutions.forEach(r=>{const tx=textOf(r,['code','symptom','diagnosis','root_cause','service_performed','result','parts_used','tests_performed']);add({type:'Memória da oficina',icon:'◆',title:r.root_cause||r.diagnosis||('Solução '+(r.code||'')),subtitle:[r.symptom,r.service_performed,r.result].filter(Boolean).join(' • '),status:['Resolvido','ok'],score:score(tx,terms,q)+(norm(r.code)===norm(q)?25:0),action:r.code?'diagnostics':'orders',query:r.code||''})});
 state.maintenance.forEach(m=>{const tx=textOf(m,['name','asset_name','metadata']);add({type:'Manutenção',icon:'🔧',title:m.name||'Manutenção',subtitle:[m.asset_name,m.metadata?.parts,m.metadata?.notes].filter(Boolean).join(' • '),status:['Plano',''],score:score(tx,terms,q),action:'maintenance',query:m.name})});
 state.orders.forEach(o=>{const tx=textOf(o,['work_order_number','title','reported_issue','diagnosis','service_performed','status']);add({type:'Ordens de serviço',icon:'📋',title:'OS '+(o.work_order_number||'—')+' • '+(o.title||'Serviço'),subtitle:[o.reported_issue,o.diagnosis,o.service_performed].filter(Boolean).join(' • '),status:[String(o.status||'').toUpperCase(),''],score:score(tx,terms,q),action:'orders',query:o.title})});
 state.specs.forEach(s=>{const tx=textOf(s,['category','label','value_text','unit','notes']);add({type:'Especificações',icon:'▤',title:s.label||s.category||'Especificação',subtitle:[s.value_text,s.unit,s.notes].filter(Boolean).join(' '),status:confidenceLabel(s.verification_status),score:score(tx,terms,q),action:'specs',query:s.label})});
 const code=String(q).toUpperCase().replace(/\s/g,'');
 if(/^[PCBU][0-9A-F]{4}$/.test(code)){
  const c=await client();
  const [lib,plays]=await Promise.all([c.from('v2_diagnostic_code_library').select('*').eq('code',code).limit(3),c.from('v2_vehicle_diagnostic_playbooks').select('*').eq('code',code).limit(8)]);
  const rows=[...(lib.data||[]),...(plays.data||[])];
  if(!rows.length)out.push({type:'Diagnóstico',icon:'⌁',title:code+' — interpretar código',subtitle:'Abrir o tradutor de falhas para registrar e investigar sem adivinhar o significado.',status:['Código OBD',''],score:50,action:'diagnostics',query:code});
  rows.forEach((x,i)=>out.push({type:'Diagnóstico',icon:'⌁',title:code+' — '+(x.title||x.generic_definition||x.interpretation||'Código de diagnóstico'),subtitle:x.interpretation||x.generic_definition||'Playbook técnico cadastrado',status:[i===0?'Base técnica':'Playbook','ok'],score:80-i,action:'diagnostics',query:code}));
 }
 state.results=dedupe(out).sort((a,b)=>b.score-a.score).slice(0,80);renderResults(q);
}

function dedupe(list){const seen=new Set();return list.filter(x=>{const k=[x.type,norm(x.title),x.action,norm(x.query)].join('|');if(seen.has(k))return false;seen.add(k);return true})}
function renderResults(q){
 const host=$('#o360UniversalResults');if(!host)return;const list=state.results;
 if(!list.length){host.innerHTML=`<div class="o360-empty-search"><b>Nada específico encontrado para “${esc(q)}”.</b><br><small>Isso não significa que não exista informação. Você pode ampliar a consulta nas fontes oficiais ou abrir o diagnóstico para registrar o sintoma.</small><div class="o360-search-extra"><button class="btn soft" data-empty-action="official-sources">Fontes oficiais</button><button class="btn soft" data-empty-action="diagnostics">Diagnóstico</button><button class="btn soft" data-empty-action="catalog">Catálogo completo</button></div></div>`;$$('[data-empty-action]').forEach(b=>b.addEventListener('click',()=>openTab(b.dataset.emptyAction)));return}
 const by=new Map();list.forEach(x=>{if(!by.has(x.type))by.set(x.type,[]);by.get(x.type).push(x)});
 host.innerHTML=`<div class="o360-search-summary"><div><span class="eyebrow">RESULTADOS CRUZADOS</span><h2 style="margin:4px 0">${list.length} resultado(s) para “${esc(q)}”</h2><p>Ordenados pela relação com a condução e pelo histórico disponível.</p></div><button class="btn soft" id="o360SearchOfficial" type="button">Pesquisar nas fontes oficiais ↗</button></div><div class="o360-result-groups">${[...by.entries()].map(([type,items])=>`<section class="o360-result-group"><div class="o360-result-group-head"><h3>${esc(type)}</h3><span class="o360-mini">${items.length}</span></div><div class="o360-result-list">${items.slice(0,12).map((x,i)=>`<div class="o360-result" role="button" tabindex="0" data-type="${esc(type)}" data-index="${i}"><div class="o360-result-icon">${x.icon}</div><div class="o360-result-copy"><b>${esc(x.title)}</b><small>${esc(x.subtitle||'Abrir informação relacionada')}</small></div><div class="o360-result-meta"><span class="o360-mini ${x.status?.[1]||''}">${esc(x.status?.[0]||'Abrir')}</span><span>›</span></div></div>`).join('')}</div></section>`).join('')}</div>`;
 $('#o360SearchOfficial')?.addEventListener('click',()=>openTab('official-sources'));
 $$('#o360UniversalResults .o360-result').forEach(el=>{const go=()=>{const items=by.get(el.dataset.type)||[],r=items[Number(el.dataset.index)];if(r)openResult(r)};el.addEventListener('click',go);el.addEventListener('keydown',e=>{if(e.key==='Enter')go()})});
 host.scrollIntoView({behavior:'smooth',block:'start'});
}

function openResult(r){
 if(r.action==='diagnostics'){openTab('diagnostics');setTimeout(()=>{const input=$('#o360FaultCode');if(input&&r.query){input.value=r.query;$('#o360LookupFault')?.click()}},180);return}
 if(r.action==='catalog'){openTab('catalog');setTimeout(()=>{const i=$('#catalogSearch');if(i){i.value=r.query||'';i.dispatchEvent(new Event('input',{bubbles:true}));i.scrollIntoView({behavior:'smooth',block:'center'})}},100);return}
 if(r.action==='exploded'){openTab('exploded');setTimeout(()=>{const cards=[...document.querySelectorAll('#explodedViews .view-card,.o360-view-full')];const q=norm(r.query);const card=cards.find(x=>norm(x.textContent).includes(q));(card||$('#explodedViews'))?.scrollIntoView({behavior:'smooth',block:'start'})},150);return}
 openTab(r.action);
}
function openTab(name){
 const btn=$(`.side-nav [data-tab="${name}"]`);if(btn){btn.click();return}
 $$('.side-nav button[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));$$('.tab').forEach(t=>t.classList.toggle('active',t.id==='tab-'+name));
}

function boot(){
 inject();
 $('#vehiclePicker')?.addEventListener('change',()=>{state.ready=false;state.results=[];setTimeout(()=>loadContext().catch(showError),350)});
 setTimeout(()=>loadContext().catch(console.error),900);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
