(()=>{
'use strict';
const VERSION='2026.09.24-pro1';
let timer=0;
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
const svg=(body)=>`<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
const icons={
 home:svg('<path d="m3 11 9-7 9 7"/><path d="M5.5 10v10h13V10M9.5 20v-6h5v6"/>'),
 grid:svg('<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>'),
 users:svg('<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20c.6-4 2.7-6 6-6s5.4 2 6 6"/><path d="M14.5 15c3.5-.4 5.7 1.4 6.5 5"/>'),
 user:svg('<circle cx="12" cy="8" r="3.5"/><path d="M5 20c.7-4.3 3-6.5 7-6.5s6.3 2.2 7 6.5"/>'),
 bus:svg('<path d="M4 17V8.5A3.5 3.5 0 0 1 7.5 5h9A3.5 3.5 0 0 1 20 8.5V17"/><path d="M4 13h16M7 17v2M17 17v2M7.5 9h9"/><circle cx="7" cy="16" r="1"/><circle cx="17" cy="16" r="1"/>'),
 box:svg('<path d="m4 7 8-4 8 4-8 4-8-4Z"/><path d="M4 7v10l8 4 8-4V7M12 11v10"/>'),
 wallet:svg('<path d="M4 7.5h13.5A2.5 2.5 0 0 1 20 10v7.5A2.5 2.5 0 0 1 17.5 20h-13A2.5 2.5 0 0 1 2 17.5v-12A2.5 2.5 0 0 1 4.5 3H16v4.5"/><path d="M15 11h5v5h-5a2.5 2.5 0 1 1 0-5Z"/>'),
 file:svg('<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v5h5M9.5 12h6M9.5 16h6"/>'),
 chart:svg('<path d="M4 20V9M10 20V4M16 20v-7M22 20H2"/>'),
 pulse:svg('<path d="M3 12h4l2-5 4 10 2-5h6"/>'),
 bell:svg('<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 8h18c0-1-3-1-3-8"/><path d="M10 20h4"/>'),
 spark:svg('<path d="m12 3 1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3Z"/><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z"/>'),
 gear:svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21h-4v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H3v-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1L7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V3h4v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.1v4H21a1.7 1.7 0 0 0-1.6 1Z"/>'),
 wrench:svg('<path d="M14.5 6.2a4 4 0 0 0-5.3 5.3L3.4 17.3a2 2 0 1 0 2.8 2.8l5.8-5.8a4 4 0 0 0 5.3-5.3l-2.8 2.8-2.3-2.3 2.3-3.3Z"/>'),
 pin:svg('<path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z"/><circle cx="12" cy="10" r="2"/>'),
 fuel:svg('<path d="M6 3h8v18H6z"/><path d="M8.5 6h3M14 7h2l2 2v8.5a1.5 1.5 0 0 0 3 0V10l-2-2"/><path d="M5 21h10"/>'),
 doc:svg('<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v5h5M9.5 12h6M9.5 16h5"/>'),
 plus:svg('<path d="M12 5v14M5 12h14"/>'),
 search:svg('<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>'),
 drop:svg('<path d="M12 3s-5 5.7-5 10.3a5 5 0 0 0 10 0C17 8.7 12 3 12 3Z"/>'),
 road:svg('<path d="M8 21 10 3h4l2 18"/><path d="M12 5v3m0 3v3m0 3v2"/>'),
 coin:svg('<ellipse cx="12" cy="7" rx="6" ry="3"/><path d="M6 7v5c0 1.7 2.7 3 6 3s6-1.3 6-3V7"/><path d="M6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5"/>')
};

const menuMap={
 inicio:['Painel','home'], operacoes:['Operações','grid'], equipes:['Equipes','users'], funcionarios:['RH','user'],
 frota:['Frota','bus'], insumos:['Insumos','box'], financeiro:['Financeiro','wallet'], fiscal:['Folha & Fiscal','file'],
 relatorios:['Relatórios','chart'], systemhealth:['Saúde do Sistema','pulse'], saude:['Saúde do Sistema','pulse'], alertas:['Alertas','bell'],
 ia:['Assistente IA','spark'], configuracoes:['Configurações','gear']
};
function enhanceSidebar(){
 $$('.v2navbtn').forEach(btn=>{
   const tab=btn.dataset.v2tab||btn.dataset.jump||'';
   let info=menuMap[tab];
   if(!info){
     const t=clean(btn.textContent).toLowerCase();
     if(t.includes('saúde'))info=['Saúde do Sistema','pulse'];
     else if(t.includes('folha')||t.includes('fiscal'))info=['Folha & Fiscal','file'];
     else if(t.includes('relat'))info=['Relatórios','chart'];
     else if(t.includes('alert'))info=['Alertas','bell'];
     else if(t.includes('assistente'))info=['Assistente IA','spark'];
   }
   if(!info)return;
   const sig=info.join('|');
   if(btn.dataset.c360ProMenu===sig)return;
   btn.dataset.c360ProMenu=sig;
   btn.innerHTML=`<span class="c360-pro-nav-icon">${icons[info[1]]||icons.grid}</span><span class="c360-pro-nav-label">${info[0]}</span>`;
 });
}

function enhanceHeader(){
 const search=$('#headerSearchBtn');
 if(search&&search.dataset.c360ProIcon!=='1'){
   search.dataset.c360ProIcon='1';search.innerHTML=`<span class="c360-pro-header-icon">${icons.search}</span>`;
 }
 const alert=$('.header-icon-btn[data-jump="alertas"]');
 if(alert&&alert.dataset.c360ProIcon!=='1'){
   const count=$('#headerAlertsCount',alert)?.outerHTML||'';
   alert.dataset.c360ProIcon='1';alert.innerHTML=`<span class="c360-pro-header-icon">${icons.bell}</span>${count}`;
 }
 const ai=$('.header-icon-btn[data-jump="ia"]');
 if(ai&&ai.dataset.c360ProIcon!=='1'){
   ai.dataset.c360ProIcon='1';ai.innerHTML=`<span class="c360-pro-header-icon">${icons.spark}</span>`;
 }
}

function setButton(btn,icon,label){
 if(!btn)return;
 const sig=icon+'|'+label;
 if(btn.dataset.c360ProButton===sig)return;
 btn.dataset.c360ProButton=sig;
 btn.innerHTML=`<span class="c360-pro-button-icon">${icons[icon]||icons.plus}</span><span>${label}</span>`;
}
function enhanceFleet(){
 setButton($('#importCrlvBtn'),'doc','Importar CRLV');
 setButton($('#newVehicleBtn'),'plus','Cadastrar veículo');
 const map={frota:['Veículos','bus'],rastreamento:['Rastreamento','pin'],manutencoes:['Manutenção','wrench'],combustivel:['Abastecimento','fuel']};
 $$('#frota .fleet-subnav button').forEach(btn=>{
   const key=btn.dataset.jump||'';const info=map[key];if(!info)return;
   const sig=info.join('|');if(btn.dataset.c360ProSubnav===sig)return;
   btn.dataset.c360ProSubnav=sig;
   btn.innerHTML=`<span class="c360-pro-inline-icon">${icons[info[1]]}</span><span>${info[0]}</span>`;
 });
}

function enhanceFuel(){
 const title=$('#fuelScreenTitle');
 if(title&&title.dataset.c360ProTitle!=='1'){
   title.dataset.c360ProTitle='1';
   title.innerHTML=`<span class="c360-pro-title-icon">${icons.fuel}</span><span>Combustível & KM</span>`;
 }
 setButton($('#newFuelBtn'),'fuel','Abastecimento');
 setButton($('#newKmBtn'),'road','Registrar KM');
 const kpis=$$('#fuelKpis .v2kpi');
 const ki=['wallet','drop','coin','road'];
 kpis.forEach((card,i)=>{
   if(card.querySelector(':scope > .c360-fuel-kpi-icon'))return;
   const mark=document.createElement('span');
   mark.className='c360-fuel-kpi-icon';
   mark.innerHTML=icons[ki[i]||'grid'];
   card.insertBefore(mark,card.firstChild);
 });
}

function enhanceMaintenance(){
 const root=$('#manutencoes');if(!root)return;
 const h=root.querySelector('h3');
 if(h&&/manuten/i.test(h.textContent||'')&&h.dataset.c360ProTitle!=='1'){
   h.dataset.c360ProTitle='1';
   h.innerHTML=`<span class="c360-pro-title-icon">${icons.wrench}</span><span>Manutenções</span>`;
 }
 setButton($('#newMaintenanceBtn'),'wrench','Nova manutenção');
}

function run(){
 try{enhanceSidebar()}catch(e){console.warn('c360 pro sidebar',e)}
 try{enhanceHeader()}catch(e){console.warn('c360 pro header',e)}
 try{enhanceFleet()}catch(e){console.warn('c360 pro fleet',e)}
 try{enhanceFuel()}catch(e){console.warn('c360 pro fuel',e)}
 try{enhanceMaintenance()}catch(e){console.warn('c360 pro maintenance',e)}
 document.documentElement.dataset.c360ProfessionalPass=VERSION;
}
function schedule(){clearTimeout(timer);timer=setTimeout(run,80)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
document.addEventListener('c360:bootstrap-ready',schedule);
document.addEventListener('c360:screen-changed',schedule);
document.addEventListener('click',schedule,true);
new MutationObserver(schedule).observe(document.documentElement,{subtree:true,childList:true,characterData:true});
window.__c360ProfessionalPass={version:VERSION,refresh:run};
})();
