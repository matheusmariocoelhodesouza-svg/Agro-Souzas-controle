(()=>{
'use strict';
const VERSION='2026.09.24-signature2';
let timer=0;
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const svg=(body)=>`<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

function safe(fn){try{fn()}catch(err){console.warn('Comando 360 Signature UI',err)}}

function icon(name){
 const map={
  home:'<path d="m3 11 9-7 9 7"/><path d="M5.5 10v10h13V10M9.5 20v-6h5v6"/>',
  poultry:'<path d="M5 17c4-1 6-4 7-8 2 2 4 2 7 1-1 5-4 9-9 9H6"/><path d="M15 7c0-2 1-3 3-4M18 3l2 1-2 1M7 19v2M11 19v2"/>',
  clock:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.5 2"/>',
  users:'<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20c.6-4 2.7-6 6-6s5.4 2 6 6"/><path d="M14.5 15c3.5-.4 5.7 1.4 6.5 5"/>',
  truck:'<path d="M4 17V8h12l4 4v5"/><path d="M16 8v4h4M4 13h16"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
  box:'<path d="m4 7 8-4 8 4-8 4-8-4Z"/><path d="M4 7v10l8 4 8-4V7M12 11v10"/>',
  wallet:'<path d="M4 7.5h13.5A2.5 2.5 0 0 1 20 10v7.5A2.5 2.5 0 0 1 17.5 20h-13A2.5 2.5 0 0 1 2 17.5v-12A2.5 2.5 0 0 1 4.5 3H16v4.5"/><path d="M15 11h5v5h-5a2.5 2.5 0 1 1 0-5Z"/>',
  chart:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>',
  search:'<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>',
  spark:'<path d="m12 2 1.5 5.1L19 9l-5.5 1.9L12 16l-1.5-5.1L5 9l5.5-1.9L12 2Z"/><path d="m19 15 .8 2.3L22 18l-2.2.7L19 21l-.8-2.3L16 18l2.2-.7L19 15Z"/>',
  gear:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.12 2.12-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.04 1.56V20.3h-3v-.08A1.7 1.7 0 0 0 10.66 18.7a1.7 1.7 0 0 0-1.88.34l-.06.06L6.6 16.98l.06-.06A1.7 1.7 0 0 0 7 15.04a1.7 1.7 0 0 0-1.56-1.04H5.3v-3h.14A1.7 1.7 0 0 0 7 9.96a1.7 1.7 0 0 0-.34-1.88L6.6 8.02 8.72 5.9l.06.06A1.7 1.7 0 0 0 10.66 6.3 1.7 1.7 0 0 0 11.7 4.74V4.7h3v.04a1.7 1.7 0 0 0 1.04 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.12 2.12-.06.06a1.7 1.7 0 0 0-.34 1.88A1.7 1.7 0 0 0 20.96 11h.04v3h-.04A1.7 1.7 0 0 0 19.4 15Z"/>'
 };
 return svg(map[name]||map.box);
}

function enhanceHeaderAndSidebar(){
 const header=$('header');
 if(header){
  const search=$('#headerSearchBtn',header);
  if(search&&search.dataset.c360SignatureIcon!=='1'){
   search.dataset.c360SignatureIcon='1';search.innerHTML=`<span class="c360-header-svg">${icon('search')}</span>`;
  }
  const alert=$('[data-jump="alertas"].header-icon-btn',header);
  if(alert&&alert.dataset.c360SignatureIcon!=='1'){
   const current=$('#headerAlertsCount',alert)?.textContent||'0';
   alert.dataset.c360SignatureIcon='1';
   alert.innerHTML=`<span class="c360-header-svg">${icon('bell')}</span><span id="headerAlertsCount">${current}</span>`;
  }
  const ai=$('[data-jump="ia"].header-icon-btn',header);
  if(ai&&ai.dataset.c360SignatureIcon!=='1'){
   ai.dataset.c360SignatureIcon='1';ai.innerHTML=`<span class="c360-header-svg">${icon('spark')}</span>`;
  }
 }
 const sideMap={inicio:['home','Início'],operacoes:['poultry','Apanhas'],ponto:['clock','Ponto'],funcionarios:['users','Funcionários'],equipes:['users','Equipes'],frota:['truck','Frota'],insumos:['box','Insumos'],financeiro:['wallet','Financeiro'],relatorios:['chart','Relatórios'],alertas:['bell','Alertas'],ia:['spark','Assistente IA'],configuracoes:['gear','Configurações']};
 $$('.v2navbtn[data-v2tab]').forEach(btn=>{
  const key=btn.dataset.v2tab,meta=sideMap[key];if(!meta||btn.dataset.c360SignatureIcon==='1')return;
  btn.dataset.c360SignatureIcon='1';
  btn.innerHTML=`<span class="c360-side-icon">${icon(meta[0])}</span><span class="c360-side-label">${meta[1]}</span>`;
 });
}

function enhanceFleet(){
 const root=$('#frota');
 if(!root)return;
 const filter=$('#fleetStatusFilter',root);
 const cards=$$('.fleet-kpi',root);
 const statusMap=['all','active','maintenance','inactive'];
 const titles=['Mostrar todos os veículos','Filtrar veículos ativos','Filtrar veículos em manutenção','Filtrar veículos inativos'];
 cards.forEach((card,i)=>{
   card.setAttribute('role','button');
   card.setAttribute('tabindex','0');
   card.setAttribute('aria-label',titles[i]||'Filtrar frota');
   card.title=titles[i]||'Filtrar frota';
   if(card.dataset.c360SignatureBound==='1')return;
   card.dataset.c360SignatureBound='1';
   const activate=()=>{
     if(!filter)return;
     const value=statusMap[i]||'all';
     if(filter.value!==value){
       filter.value=value;
       filter.dispatchEvent(new Event('change',{bubbles:true}));
       filter.dispatchEvent(new Event('input',{bubbles:true}));
     }
     syncFleetFilterState();
   };
   card.addEventListener('click',activate);
   card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();activate()}});
 });
 if(filter&&filter.dataset.c360SignatureBound!=='1'){
   filter.dataset.c360SignatureBound='1';
   filter.addEventListener('change',syncFleetFilterState);
 }
 syncFleetFilterState();

 const search=$('#fleetSearch',root);
 const holder=search?.closest('.fleet-search');
 if(search&&holder){
   let clear=$('.c360-search-clear',holder);
   if(!clear){
     clear=document.createElement('button');
     clear.type='button';
     clear.className='c360-search-clear';
     clear.setAttribute('aria-label','Limpar busca');
     clear.title='Limpar busca';
     clear.textContent='×';
     holder.appendChild(clear);
     clear.addEventListener('click',()=>{
       search.value='';
       search.dispatchEvent(new Event('input',{bubbles:true}));
       search.dispatchEvent(new Event('change',{bubbles:true}));
       search.focus();
       updateClear();
     });
   }
   const updateClear=()=>clear.classList.toggle('show',!!String(search.value||'').trim());
   if(search.dataset.c360SignatureClear!=='1'){
     search.dataset.c360SignatureClear='1';
     search.addEventListener('input',updateClear);
     search.addEventListener('search',updateClear);
   }
   updateClear();
   const searchIcon=holder.querySelector(':scope > span');
   if(searchIcon&&searchIcon.dataset.c360SignatureIcon!=='1'){
     searchIcon.dataset.c360SignatureIcon='1';
     searchIcon.innerHTML=icon('search');
     searchIcon.style.width='18px';searchIcon.style.height='18px';searchIcon.style.display='grid';searchIcon.style.placeItems='center';
   }
 }

 const titleIcon=$('.fleet-title-icon',root);
 if(titleIcon&&titleIcon.dataset.c360SignatureIcon!=='1'){
   titleIcon.dataset.c360SignatureIcon='1';
   titleIcon.innerHTML=svg('<path d="M4 17V8.5A3.5 3.5 0 0 1 7.5 5h9A3.5 3.5 0 0 1 20 8.5V17"/><path d="M4 13h16M7 17v2M17 17v2M7.5 9h9"/><circle cx="7" cy="16" r="1"/><circle cx="17" cy="16" r="1"/>');
   const s=titleIcon.querySelector('svg');if(s){s.style.width='27px';s.style.height='27px'}
 }
}

function syncFleetFilterState(){
 const root=$('#frota');if(!root)return;
 const filter=$('#fleetStatusFilter',root);
 const value=filter?.value||'all';
 const statusMap=['all','active','maintenance','inactive'];
 $$('.fleet-kpi',root).forEach((card,i)=>card.classList.toggle('c360-filter-active',statusMap[i]===value));
}

function enhanceIntegrity(){
 const box=$('#c360PoultryIntegrity');
 if(!box)return;
 const examples=$('.c360-integrity-examples',box);
 const note=$('small',box);
 if(!examples&&!note)return;
 let toggle=$('.c360-integrity-toggle',box);
 if(!toggle){
   toggle=document.createElement('button');
   toggle.type='button';
   toggle.className='c360-integrity-toggle';
   const countText=$$('div',box).find(n=>n!==examples && /diverg|hor[aá]rio|quantidade/i.test(n.textContent||''))?.textContent||'';
   const nums=[...countText.matchAll(/(\d+)\s+(?:diverg|hor[aá]rio|quantidade)/gi)].map(m=>Number(m[1]||0));
   const total=nums.reduce((a,b)=>a+b,0);
   toggle.innerHTML=`<span>${total?`Ver ${total} ponto(s) para conferir`:'Ver detalhes da conferência'}</span>`;
   if(examples)examples.insertAdjacentElement('beforebegin',toggle);else if(note)note.insertAdjacentElement('beforebegin',toggle);else box.appendChild(toggle);
   const compact=window.matchMedia('(max-width:900px)').matches;
   box.classList.toggle('c360-integrity-collapsed',compact);
   toggle.setAttribute('aria-expanded',compact?'false':'true');
   toggle.addEventListener('click',()=>{
     const collapsed=box.classList.toggle('c360-integrity-collapsed');
     toggle.setAttribute('aria-expanded',collapsed?'false':'true');
     const span=toggle.querySelector('span');
     if(span)span.textContent=collapsed?(total?`Ver ${total} ponto(s) para conferir`:'Ver detalhes da conferência'):'Ocultar detalhes';
   });
 }
}

function enhancePoultry(){
 const root=$('#operacoes');if(!root)return;
 const hero=$('.v2hero',root);
 if(hero&&!hero.dataset.c360SignatureHero){
   hero.dataset.c360SignatureHero='1';
   const h1=$('h1',hero);
   if(h1)h1.setAttribute('aria-label','Apanhas');
 }
 enhanceIntegrity();
}

function enhanceFloatingUi(){
 const chat=$('#c360ChatFab');
 if(chat){chat.setAttribute('aria-label','Abrir assistente do Comando 360');chat.title='Assistente do Comando 360'}
 const nav=$('#mobileBottomNav');
 if(nav)$$('button',nav).forEach(b=>{
   const label=$('small',b)?.textContent?.trim();
   if(label)b.setAttribute('aria-label',label);
 });
}

function run(){
 safe(enhanceHeaderAndSidebar);
 safe(enhanceFleet);
 safe(enhancePoultry);
 safe(enhanceFloatingUi);
 document.documentElement.dataset.c360SignatureUi=VERSION;
}
function schedule(){clearTimeout(timer);timer=setTimeout(run,80)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
document.addEventListener('c360:bootstrap-ready',schedule);
document.addEventListener('c360:screen-changed',schedule);
document.addEventListener('input',e=>{if(e.target?.id==='fleetSearch')schedule()},true);
new MutationObserver(schedule).observe(document.documentElement,{subtree:true,childList:true});
window.addEventListener('resize',schedule,{passive:true});
window.__c360SignatureUi={version:VERSION,refresh:run};
})();
