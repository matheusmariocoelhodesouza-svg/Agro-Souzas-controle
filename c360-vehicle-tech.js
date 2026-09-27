(function(){
 'use strict';
 const VERSION='2026.09.27-oficina360-bridge-v3';
 let decorateQueued=false;

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
   if(!actions||actions.querySelector('.fleet-tech-btn'))return;
   const id=card.getAttribute('data-fleet-vehicle');
   const btn=document.createElement('button');
   btn.type='button';
   btn.className='btn fleet-tech-btn';
   btn.textContent='🛠 Oficina 360';
   btn.title='Abrir catálogo, vistas explodidas, manutenção e diagnóstico desta condução';
   btn.addEventListener('click',event=>{
    event.preventDefault();
    event.stopPropagation();
    openOficina360(id);
   });
   actions.prepend(btn);
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

 function decorateVehicleEdit(){
  const card=document.getElementById('vehicleEditCard');
  if(!card)return;
  const actions=card.querySelector('.vehicle-edit-actions');
  if(!actions||actions.querySelector('.oficina360-edit-btn'))return;
  const btn=document.createElement('button');
  btn.type='button';
  btn.className='btn oficina360-edit-btn';
  btn.textContent='🛠 ABRIR OFICINA 360';
  btn.title='Abrir a ficha técnica desta condução no Oficina 360';
  btn.addEventListener('click',()=>{
   const id=document.getElementById('editVehicleId')?.value||'';
   openOficina360(id);
  });
  actions.appendChild(btn);
 }

 function installStyle(){
  if(document.getElementById('c360OficinaBridgeStyle'))return;
  const style=document.createElement('style');
  style.id='c360OficinaBridgeStyle';
  style.textContent=`
   .fleet-tech-btn{background:#eef4fb!important;color:#163d68!important;border:1px solid #d8e5f2!important}
   .fleet-tech-btn:hover{background:#e3effc!important;border-color:#c6dbf1!important}
   .oficina360-open-all,.oficina360-edit-btn{background:#102b51!important;color:#fff!important;border:1px solid #102b51!important}
   .oficina360-edit-btn{margin-left:auto}
  `;
  document.head.appendChild(style);
 }

 function decorate(){
  installStyle();
  decorateFleetCards();
  decorateFleetHeader();
  decorateVehicleEdit();
 }

 function queueDecorate(){
  if(decorateQueued)return;
  decorateQueued=true;
  requestAnimationFrame(()=>{
   decorateQueued=false;
   decorate();
  });
 }

 function boot(){
  decorate();
  const root=document.getElementById('frota')||document.body;
  const observer=new MutationObserver(mutations=>{
   if(!mutations.some(m=>m.addedNodes&&m.addedNodes.length))return;
   queueDecorate();
  });
  observer.observe(root,{childList:true,subtree:true});
  window.c360OpenVehicleTech=openOficina360;
  window.c360OpenOficina360=openOficina360;
  window.c360ReloadVehicleTech=openOficina360;
  window.C360_VEHICLE_TECH_VERSION=VERSION;
 }

 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
