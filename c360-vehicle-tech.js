(function(){
 'use strict';
 const VERSION='2026.09.27-oficina360-bridge-v1';

 function officeUrl(vehicleId){
  const url=new URL('./oficina360.html',window.location.href);
  if(vehicleId)url.searchParams.set('vehicle',vehicleId);
  return url.href;
 }

 function openOficina360(vehicleId){
  window.location.href=officeUrl(vehicleId);
 }

 function decorateFleetCards(){
  const root=document.getElementById('frota');
  if(!root)return;
  root.querySelectorAll('.fleet-card[data-fleet-vehicle]').forEach(card=>{
   const actions=card.querySelector('.fleet-actions');
   if(!actions)return;
   const id=card.getAttribute('data-fleet-vehicle');
   let btn=actions.querySelector('.fleet-tech-btn');
   if(!btn){
    btn=document.createElement('button');
    btn.type='button';
    btn.className='btn fleet-tech-btn';
    actions.prepend(btn);
   }
   btn.textContent='🛠 Oficina 360';
   btn.title='Abrir catálogo, vistas explodidas, manutenção e diagnóstico desta condução';
   btn.onclick=()=>openOficina360(id);
  });
 }

 function decorateFleetHeader(){
  const root=document.getElementById('frota');
  if(!root)return;
  const actions=root.querySelector('.fleet-hero-actions');
  if(!actions||actions.querySelector('.oficina360-open-all'))return;
  const btn=document.createElement('button');
  btn.type='button';
  btn.className='btn soft oficina360-open-all';
  btn.textContent='🛠 Oficina 360';
  btn.title='Abrir a central técnica da frota';
  btn.addEventListener('click',()=>openOficina360());
  actions.prepend(btn);
 }

 function installStyle(){
  if(document.getElementById('c360OficinaBridgeStyle'))return;
  const style=document.createElement('style');
  style.id='c360OficinaBridgeStyle';
  style.textContent=`
   .fleet-tech-btn{background:#eef4fb!important;color:#163d68!important;border:1px solid #d8e5f2!important}
   .fleet-tech-btn:hover{background:#e3effc!important;border-color:#c6dbf1!important}
   .oficina360-open-all{background:#102b51!important;color:#fff!important;border-color:#102b51!important}
  `;
  document.head.appendChild(style);
 }

 function decorate(){
  installStyle();
  decorateFleetCards();
  decorateFleetHeader();
 }

 function boot(){
  decorate();
  const observer=new MutationObserver(()=>decorate());
  observer.observe(document.body,{childList:true,subtree:true});
  window.c360OpenVehicleTech=openOficina360;
  window.c360OpenOficina360=openOficina360;
  window.c360ReloadVehicleTech=openOficina360;
  window.C360_VEHICLE_TECH_VERSION=VERSION;
 }

 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
