(()=>{
'use strict';
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
let client=null,loadToken=0;

function addStyle(){
 if($('#o360SpecStyle'))return;
 const s=document.createElement('style');s.id='o360SpecStyle';
 s.textContent=`
 .o360-spec-summary{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 14px}.o360-spec-stat{border:1px solid #dfe7ef;border-radius:999px;padding:7px 11px;background:#f8fafc;font-size:12px;color:#475467}.o360-spec-stat b{color:#101828}
 .o360-profile-card{border:1px solid #dfe7ef;border-radius:15px;background:var(--surface,#fff);padding:15px;margin-bottom:14px}.o360-profile-card h3{margin:0 0 12px}.o360-profile-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
 .o360-profile-cell,.o360-spec{border:1px solid #e6ebf1;border-radius:12px;padding:11px;min-height:72px}.o360-profile-cell span,.o360-spec>span{display:block;font-size:11px;color:#7b8794;text-transform:uppercase;letter-spacing:.03em}.o360-profile-cell b,.o360-spec>b{display:block;margin-top:5px;font-size:14px;word-break:break-word}
 .o360-spec-groups{display:grid;gap:14px}.o360-spec-group{border:1px solid #dfe7ef;border-radius:15px;background:var(--surface,#fff);padding:15px}.o360-spec-group h3{margin:0 0 12px}.o360-spec-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.o360-spec small{display:block;margin-top:6px;color:#667085;line-height:1.35}.o360-spec.pending{border-style:dashed;background:#fffbeb}.o360-spec.estimated{background:#fffaf0;border-color:#f4d9a6}.o360-spec.verified{background:#f7fcf8;border-color:#cfe9d5}
 .o360-spec-status{display:inline-flex!important;width:max-content;border-radius:999px;padding:4px 7px;margin-top:7px!important;font-size:10px!important;font-weight:800}.o360-spec-status.verified{background:#e8f7ec;color:#166534}.o360-spec-status.estimated{background:#fff2cc;color:#854d0e}.o360-spec-status.pending{background:#f2f4f7;color:#475467}
 .o360-candidates{margin-top:8px;padding:8px;border-radius:9px;background:rgba(255,255,255,.72);border:1px solid #eceff3}.o360-candidates strong{display:block;font-size:11px;color:#344054;margin-bottom:5px}.o360-candidate{display:flex;justify-content:space-between;gap:8px;padding:5px 0;border-bottom:1px dashed #e5e7eb;font-size:12px}.o360-candidate:last-child{border-bottom:0}.o360-candidate em{font-style:normal;color:#667085}
 .o360-proof{margin-top:8px;border-left:3px solid #f59e0b;padding-left:8px}.o360-source{font-size:11px;color:#667085;margin-top:5px}.o360-empty-spec{padding:20px;border:1px dashed #cbd5e1;border-radius:12px;color:#64748b}
 @media(max-width:1000px){.o360-profile-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.o360-spec-grid{grid-template-columns:1fr 1fr}}
 @media(max-width:620px){.o360-profile-grid,.o360-spec-grid{grid-template-columns:1fr}.o360-spec-summary{overflow:auto;flex-wrap:nowrap;padding-bottom:3px}.o360-spec-stat{white-space:nowrap}}
 `;
 document.head.appendChild(s)
}

function openSpecs(){
 $$('.side-nav button[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab==='specs'));
 $$('.tab').forEach(t=>t.classList.toggle('active',t.id==='tab-specs'));
 const title=$('#pageTitle');if(title)title.textContent='Ficha completa da condução';
 load().catch(console.error);
}
function inject(){
 const nav=$('.side-nav');
 if(nav&&!nav.querySelector('[data-tab="specs"]')){
  const btn=document.createElement('button');btn.type='button';btn.dataset.tab='specs';btn.innerHTML='<span>▤</span> Ficha completa';
  const cat=nav.querySelector('[data-tab="catalog"]');nav.insertBefore(btn,cat);btn.addEventListener('click',e=>{e.preventDefault();openSpecs()});
 }
 const overview=$('#tab-overview');
 if(overview&&!$('#tab-specs')){
  const s=document.createElement('section');s.id='tab-specs';s.className='tab';
  s.innerHTML='<div class="section-head"><div><span class="eyebrow">DATA CARD + ESPECIFICAÇÕES</span><h2>Ficha completa da condução</h2><p>Identidade técnica, construção, pintura, motor, transmissão, eixo, fluidos, capacidades e tudo que depende de confirmação física.</p></div></div><div id="o360SpecsSummary" class="o360-spec-summary"></div><div id="o360IdentityHost"></div><div id="o360SpecsHost" class="o360-spec-groups"></div>';
  overview.after(s);
 }
 addStyle();
 $('#vehiclePicker')?.addEventListener('change',()=>setTimeout(()=>load().catch(console.error),250));
}

function categoryLabel(cat){return ({identity:'Identificação',vehicle:'Veículo e dimensões',engine:'Motor',transmission:'Câmbio e transmissão',driveline:'Eixo e transmissão final',body:'Carroceria e interior',paint:'Pintura',hvac:'Ar-condicionado e ventilação',fluids:'Fluidos e capacidades',electrical:'Elétrica',wheels:'Rodas e pneus',brakes:'Freios'})[cat]||cat}
function statusInfo(v){
 const s=String(v||'pending').toLowerCase();
 if(s==='verified')return {cls:'verified',text:'✓ Confirmado'};
 if(['estimated','candidate','catalog_candidate'].includes(s))return {cls:'estimated',text:'◐ Referência candidata'};
 return {cls:'pending',text:'⚠ A confirmar'};
}
function displayValue(x){
 if(x.value_text!==null&&x.value_text!==undefined&&String(x.value_text).trim()!=='')return String(x.value_text)+(x.unit?' '+x.unit:'');
 const j=x.value_json||{};
 if(j.catalog_candidate_mm!=null)return `${j.catalog_candidate_mm} mm (candidato)`;
 if(j.catalog_candidate!=null)return String(j.catalog_candidate);
 return 'Pendente de confirmação';
}
function candidates(j){
 const c=j?.catalog_candidates;
 if(!Array.isArray(c)||!c.length)return '';
 return `<div class="o360-candidates"><strong>Referências candidatas — não comprar/usar como dado confirmado ainda</strong>${c.map(x=>{
  if(x&&typeof x==='object')return `<div class="o360-candidate"><span>${esc([x.code,x.name].filter(Boolean).join(' — ')||JSON.stringify(x))}</span><em>${esc(x.status||'candidato')}</em></div>`;
  return `<div class="o360-candidate"><span>${esc(x)}</span><em>candidato</em></div>`;
 }).join('')}</div>`;
}
function specCard(x){
 const st=statusInfo(x.verification_status);
 const evidence=Array.isArray(x.value_json?.required_evidence)?x.value_json.required_evidence:[];
 return `<div class="o360-spec ${st.cls}"><span>${esc(x.label)}</span><b>${esc(displayValue(x))}</b><span class="o360-spec-status ${st.cls}">${st.text}</span>${candidates(x.value_json)}${evidence.length?`<div class="o360-proof"><small><b>Para confirmar:</b> ${esc(evidence.join(' • '))}</small></div>`:''}${x.notes?`<small>${esc(x.notes)}</small>`:''}${x.source_reference?`<div class="o360-source">Fonte/referência: ${esc(x.source_reference)}</div>`:''}</div>`;
}
function profileCell(label,value){return `<div class="o360-profile-cell"><span>${esc(label)}</span><b>${esc(value??'—')}</b></div>`}
function renderIdentity(profile,vehicle){
 const host=$('#o360IdentityHost');if(!host)return;
 if(!profile){host.innerHTML='<div class="o360-empty-spec">Ficha técnica principal ainda não disponível.</div>';return}
 const values=[
  ['Condução',vehicle?.description||vehicle?.model||'—'],['Placa',vehicle?.plate||'—'],['VIN / chassi',profile.vin||'—'],['Família de chassi',profile.chassis_family||'—'],['Variante de chassi',profile.chassis_variant||'—'],['Motor',profile.engine_code||profile.engine_family||'—'],['Nº do motor',profile.engine_serial||'—'],['Ano fabricação/modelo',[profile.production_year,profile.model_year].filter(Boolean).join(' / ')||'—'],['Potência',profile.power_cv?`${profile.power_cv} cv`:'—'],['Combustível',profile.fuel_type||'—'],['PBT',profile.gross_vehicle_weight_t?`${profile.gross_vehicle_weight_t} t`:'—'],['CMT',profile.gross_combination_weight_t?`${profile.gross_combination_weight_t} t`:'—'],['Eixos',profile.axle_count??'—'],['Lugares',profile.seats??'—'],['Carroceria',profile.body_type||'—'],['Status do catálogo',profile.catalog_status||'—']
 ];
 host.innerHTML=`<article class="o360-profile-card"><h3>Identificação técnica confirmada</h3><div class="o360-profile-grid">${values.map(x=>profileCell(x[0],x[1])).join('')}</div></article>`;
}
function render(rows,profile,vehicle){
 renderIdentity(profile,vehicle);
 const host=$('#o360SpecsHost');if(!host)return;
 const by=new Map();rows.forEach(x=>{if(!by.has(x.category))by.set(x.category,[]);by.get(x.category).push(x)});
 host.innerHTML=[...by.entries()].map(([cat,items])=>`<article class="o360-spec-group"><h3>${esc(categoryLabel(cat))}</h3><div class="o360-spec-grid">${items.map(specCard).join('')}</div></article>`).join('')||'<div class="o360-empty-spec">Ainda não há especificações adicionais cadastradas para esta condução.</div>';
 const verified=rows.filter(x=>statusInfo(x.verification_status).cls==='verified').length;
 const candidate=rows.filter(x=>statusInfo(x.verification_status).cls==='estimated').length;
 const pending=rows.length-verified-candidate;
 const summary=$('#o360SpecsSummary');if(summary)summary.innerHTML=`<span class="o360-spec-stat"><b>${rows.length}</b> especificações adicionais</span><span class="o360-spec-stat"><b>${verified}</b> confirmadas</span><span class="o360-spec-stat"><b>${candidate}</b> candidatas</span><span class="o360-spec-stat"><b>${pending}</b> pendentes</span>`;
}

async function getClient(){
 if(client)return client;
 if(!window.supabase||!window.SUPABASE_URL||!window.SUPABASE_PUBLISHABLE_KEY)return null;
 client=window.supabase.createClient(window.SUPABASE_URL,window.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});return client
}
async function load(){
 const token=++loadToken,c=await getClient();if(!c)return;
 const vid=$('#vehiclePicker')?.value||new URLSearchParams(location.search).get('vehicle');if(!vid)return;
 const [sr,pr,vr]=await Promise.all([
  c.from('v2_vehicle_specifications').select('*').eq('vehicle_id',vid).order('category').order('label'),
  c.from('v2_vehicle_technical_profiles').select('*').eq('vehicle_id',vid).maybeSingle(),
  c.from('v2_vehicles').select('id,plate,description,make,model,model_year').eq('id',vid).maybeSingle()
 ]);
 if(token!==loadToken)return;
 if(sr.error)throw sr.error;if(pr.error)throw pr.error;if(vr.error)throw vr.error;
 render(sr.data||[],pr.data||null,vr.data||null);
}

document.addEventListener('DOMContentLoaded',()=>{inject();setTimeout(()=>load().catch(console.error),550)},{once:true});
window.O360SpecSheet={reload:()=>load(),open:openSpecs};
})();
