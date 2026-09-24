(()=>{
'use strict';
const VERSION='2026.09.24-signature1';
let timer=0;
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const svg=(body)=>`<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

function safe(fn){try{fn()}catch(err){console.warn('Comando 360 Signature UI',err)}}

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
   const icon=holder.querySelector(':scope > span');
   if(icon&&icon.dataset.c360SignatureIcon!=='1'){
     icon.dataset.c360SignatureIcon='1';
     icon.innerHTML=svg('<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>');
     icon.style.width='18px';icon.style.height='18px';icon.style.display='grid';icon.style.placeItems='center';
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
   if(h1){h1.setAttribute('aria-label','Apanhas')}
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
