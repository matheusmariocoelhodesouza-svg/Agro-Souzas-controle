(()=>{
'use strict';
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const eq=(a,b)=>String(a??'').toLowerCase()===String(b??'').toLowerCase();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let client=null,token=0,currentVehicle=null,views=[];

function toast(msg){const t=$('#toast');if(!t)return;t.textContent=msg;t.classList.add('show');clearTimeout(window.__o360ExplodedToast);window.__o360ExplodedToast=setTimeout(()=>t.classList.remove('show'),2800)}
function getClient(){if(client)return client;if(!window.supabase||!window.SUPABASE_URL||!window.SUPABASE_PUBLISHABLE_KEY)return null;client=window.supabase.createClient(window.SUPABASE_URL,window.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});return client}

async function loadViews(){
 const vid=$('#vehiclePicker')?.value||new URLSearchParams(location.search).get('vehicle');if(!vid)return [];
 if(currentVehicle===vid&&views.length)return views;
 const c=getClient();if(!c)return [];
 const my=++token;
 const [pr,vr]=await Promise.all([
   c.from('v2_vehicle_technical_profiles').select('chassis_family,chassis_variant,engine_code').eq('vehicle_id',vid).maybeSingle(),
   c.from('v2_vehicle_exploded_views').select('id,title,group_code,chassis_family,chassis_variant,engine_code,source_diagram_key,assembly_code,image_reference').order('group_code').order('title')
 ]);
 if(my!==token)return views;
 const p=pr.data||{};
 views=(vr.data||[]).filter(x=>{
   if(x.chassis_family&&(!p.chassis_family||!eq(x.chassis_family,p.chassis_family)))return false;
   if(x.chassis_variant&&(!p.chassis_variant||!eq(x.chassis_variant,p.chassis_variant)))return false;
   if(x.engine_code&&(!p.engine_code||!eq(x.engine_code,p.engine_code)))return false;
   return true;
 });
 currentVehicle=vid;return views;
}

function miniSvg(card){
 const parts=$$('.view-part',card).slice(0,6).map((row,i)=>({num:$('b',row)?.textContent?.trim()||String(i+1)}));
 const n=Math.max(3,Math.min(6,parts.length||6));
 const pos=[[86,62],[86,164],[205,42],[415,42],[534,62],[534,164]];
 let lines='',nodes='';
 for(let i=0;i<n;i++){
   const [x,y]=pos[i];const right=x>310;const targetX=right?383:237;const targetY=i%2?137:92;
   lines+=`<line x1="${x+(right?-18:18)}" y1="${y}" x2="${targetX}" y2="${targetY}"/>`;
   const num=esc(parts[i]?.num||String(i+1));
   if(i%3===0)nodes+=`<g transform="translate(${x} ${y})"><circle r="25"/><circle r="10" class="hole"/><text y="4">${num}</text></g>`;
   else if(i%3===1)nodes+=`<g transform="translate(${x} ${y})"><rect x="-31" y="-20" width="62" height="40" rx="8"/><text y="4">${num}</text></g>`;
   else nodes+=`<g transform="translate(${x} ${y})"><path d="M-30,-18 H22 L34,0 L22,18 H-30 Z"/><text y="4">${num}</text></g>`;
 }
 return `<div class="o360-preview-badge">VISUAL ESTRUTURAL • NÃO OEM</div><svg viewBox="0 0 620 215" role="img" aria-label="Prévia estrutural da vista explodida"><g class="o360-preview-axis"><line x1="146" y1="108" x2="474" y2="108"/></g><g class="o360-preview-lines">${lines}</g><g class="o360-preview-core"><rect x="247" y="66" width="126" height="84" rx="16"/><rect x="267" y="83" width="86" height="15" rx="5"/><circle cx="278" cy="127" r="12"/><circle cx="342" cy="127" r="12"/></g><g class="o360-preview-nodes">${nodes}</g></svg><div class="o360-preview-note">Reconstrução funcional a partir dos itens catalogados. Abra para montar/explodir e selecionar peças.</div>`;
}

const lazy=('IntersectionObserver'in window)?new IntersectionObserver(entries=>entries.forEach(e=>{if(!e.isIntersecting)return;const p=e.target;if(!p.dataset.drawn){p.innerHTML=miniSvg(p.closest('.view-card'));p.dataset.drawn='1'}lazy.unobserve(p)}),{rootMargin:'240px 0px'}):null;

function decorate(cards,meta){
 cards.forEach((card,i)=>{
   const title=$('h3',card)?.textContent?.trim()||'';
   let v=meta[i];
   if(!v||v.title!==title)v=meta.find(x=>x.title===title)||v;
   if(!v)return;
   card.dataset.o360ViewId=v.id;card.dataset.o360Group=v.group_code||'';
   const icon=$('.view-icon',card);
   if(icon&&!$('img',icon)&&!$('.o360-generated-preview',icon)){
     icon.innerHTML='<div class="o360-generated-preview" aria-live="polite"><div class="o360-preview-loading">Preparando reconstrução visual…</div></div>';
     const p=$('.o360-generated-preview',icon);if(lazy)lazy.observe(p);else{p.innerHTML=miniSvg(card);p.dataset.drawn='1'}
   }
   if(!$('.o360-open-view',card)){
     const actions=document.createElement('div');actions.className='o360-view-actions';
     actions.innerHTML=`<button type="button" class="o360-open-view" data-view="${esc(v.id)}" data-group="${esc(v.group_code||'')}">◫ Abrir vista explodida interativa</button>`;
     const parts=$('.view-parts',card);(parts||card).insertAdjacentElement('afterend',actions);
   }
 });
}

async function sync(){
 const host=$('#explodedViews');if(!host)return;
 try{const meta=await loadViews();const cards=$$('.view-card',host);if(cards.length&&meta.length)decorate(cards,meta)}catch(e){console.error('Oficina360 exploded browser',e)}
}

async function openInteractive(viewId,group){
 const visual=$('.side-nav [data-tab="visual"]')||$('[data-tab="visual"]');
 if(!visual){toast('O diagnóstico visual ainda está carregando. Tente novamente.');return}
 visual.click();await sleep(90);
 const sel=$('#pvSystem');
 if(sel&&group&&[...sel.options].some(o=>o.value===group)){
   sel.value=group;sel.dispatchEvent(new Event('change',{bubbles:true}));await sleep(70);
 }
 let exact=null;
 for(let i=0;i<24&&!exact;i++){
   exact=$$('[data-fleet-view]').find(b=>b.dataset.fleetView===viewId)||null;
   if(!exact)await sleep(50);
 }
 if(exact)exact.click();
 else toast('Sistema visual aberto. Esta prancha específica não está entre os atalhos rápidos; o conjunto correspondente já foi selecionado.');
 await sleep(80);($('#fleetStage')||$('#pvStage')||$('#tab-visual'))?.scrollIntoView({behavior:'smooth',block:'start'});
}

function bind(){
 const host=$('#explodedViews');if(!host)return false;
 if(host.dataset.o360ExplodedBound!=='1'){
   host.dataset.o360ExplodedBound='1';
   host.addEventListener('click',e=>{const b=e.target.closest('.o360-open-view');if(!b)return;e.preventDefault();openInteractive(b.dataset.view,b.dataset.group)});
   new MutationObserver(()=>sync()).observe(host,{childList:true});
 }
 $('#vehiclePicker')?.addEventListener('change',()=>{currentVehicle=null;views=[];setTimeout(sync,220)});
 sync();return true;
}
function boot(){let tries=0;const t=setInterval(()=>{tries++;if(bind()||tries>100)clearInterval(t)},80)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();