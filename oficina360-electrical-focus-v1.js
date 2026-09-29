(()=>{
'use strict';
let client=null,epcIds=new Set(),showEpc=false,loading=false,lastVehicle=null,observer=null;
const $=s=>document.querySelector(s);

async function supa(){
 if(client)return client;
 if(!window.supabase||!window.SUPABASE_URL||!window.SUPABASE_PUBLISHABLE_KEY)return null;
 client=window.supabase.createClient(window.SUPABASE_URL,window.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
 return client;
}
function vehicleId(){return $('#vehiclePicker')?.value||new URLSearchParams(location.search).get('vehicle')||null}
function ensureUi(){
 const root=$('#o360ElectricalRoot'); if(!root)return false;
 const toolbar=root.querySelector('.o360-elec-toolbar'); if(!toolbar)return false;
 if(!$('#o360ElectricalFocusBar')){
   const wrap=document.createElement('div');wrap.id='o360ElectricalFocusBar';
   wrap.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-top:10px;padding:9px 11px;border:1px solid rgba(136,166,199,.16);border-radius:12px;background:rgba(255,255,255,.025)';
   wrap.innerHTML='<small id="o360ElectricalFocusInfo" style="color:#9fb0c2">Organizando mapa elétrico...</small><button id="o360ElectricalToggleEpc" type="button" class="btn soft" style="padding:7px 10px">Mostrar referências EPC</button>';
   toolbar.insertAdjacentElement('afterend',wrap);
   $('#o360ElectricalToggleEpc')?.addEventListener('click',()=>{showEpc=!showEpc;apply();});
 }
 return true;
}
async function refresh(){
 const vid=vehicleId(); if(!vid||loading)return;
 loading=true;lastVehicle=vid;
 try{
   const c=await supa(); if(!c)return;
   const r=await c.from('v2_vehicle_electrical_nodes').select('id,source_metadata').eq('vehicle_id',vid);
   epcIds=new Set((r.data||[]).filter(x=>x.source_metadata?.diagnostic_applicability==='epc_reference_only').map(x=>x.id));
   apply();
 }finally{loading=false}
}
function apply(){
 if(!ensureUi())return;
 const cards=[...document.querySelectorAll('#o360ElectricalBody [data-elec-node]')];
 let hidden=0;
 cards.forEach(card=>{
   const isEpc=epcIds.has(card.dataset.elecNode);
   if(isEpc&&!showEpc){card.style.display='none';hidden++}else card.style.display='';
 });
 const info=$('#o360ElectricalFocusInfo');
 const button=$('#o360ElectricalToggleEpc');
 if(info){
   const visible=cards.length-hidden;
   info.textContent=showEpc?`${visible} item(ns) visíveis • referências EPC exibidas`:`${visible} item(ns) diagnosticáveis • ${hidden} referência(s) EPC ocultas`;
 }
 if(button)button.textContent=showEpc?'Ocultar referências EPC':'Mostrar referências EPC';
}
function observe(){
 const body=$('#o360ElectricalBody');if(!body||body.__o360FocusObserved)return;
 body.__o360FocusObserved=true;
 observer?.disconnect();
 observer=new MutationObserver(()=>setTimeout(apply,0));
 observer.observe(body,{childList:true,subtree:true});
}
function tick(){
 if(ensureUi()){observe();const vid=vehicleId();if(vid&&vid!==lastVehicle)refresh();else apply()}
}
function boot(){
 setInterval(tick,700);
 $('#vehiclePicker')?.addEventListener('change',()=>{lastVehicle=null;showEpc=false;setTimeout(refresh,250)});
 document.addEventListener('o360:electrical-open',()=>setTimeout(tick,100));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
