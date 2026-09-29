(()=>{
'use strict';
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
let client=null,lastQuery='',timer=null;
function getClient(){if(client)return client;if(!window.supabase||!window.SUPABASE_URL||!window.SUPABASE_PUBLISHABLE_KEY)return null;client=window.supabase.createClient(window.SUPABASE_URL,window.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});return client}
function injectShortcut(){
 const grid=$('#o360CentralRoot .o360-central-shortcuts');if(!grid||grid.querySelector('[data-electrical-shortcut]'))return;
 const b=document.createElement('button');b.className='o360-shortcut';b.type='button';b.dataset.electricalShortcut='1';b.innerHTML='<span>ϟ</span><b>Elétrica</b><small>Pinos, fusíveis, relés, módulos, terras e medições.</small>';b.addEventListener('click',()=>openElectrical(''));grid.appendChild(b);
}
function openElectrical(q){const btn=$('.side-nav [data-tab="electrical"]');if(btn)btn.click();else document.dispatchEvent(new CustomEvent('o360:electrical-open',{detail:{query:q}}));setTimeout(()=>{const i=$('#o360ElectricalSearch');if(i&&q){i.value=q;i.dispatchEvent(new Event('input',{bubbles:true}))}},80)}
async function appendElectricalResults(q){
 q=String(q||'').trim();if(!q||q===lastQuery&&$('#o360ElectricalCentralGroup'))return;lastQuery=q;const c=getClient(),vid=$('#vehiclePicker')?.value;if(!c||!vid)return;
 const r=await c.from('v2_vehicle_electrical_nodes').select('id,label,reference,node_type,circuit_code,location_description,connector_name,verification_status,electrical_spec').eq('vehicle_id',vid).limit(300);if(r.error){console.warn('Electrical bridge:',r.error.message);return}
 const nq=norm(q),terms=nq.split(/[^a-z0-9]+/).filter(x=>x.length>1);const rows=(r.data||[]).map(n=>{const text=norm([n.label,n.reference,n.node_type,n.circuit_code,n.location_description,n.connector_name,JSON.stringify(n.electrical_spec)].join(' '));let score=text.includes(nq)?20:0;terms.forEach(t=>{if(text.includes(t))score+=4});return {...n,score}}).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,12);
 const host=$('#o360UniversalResults');if(!host)return;$('#o360ElectricalCentralGroup')?.remove();if(!rows.length)return;
 const group=document.createElement('div');group.id='o360ElectricalCentralGroup';group.className='o360-result-group';group.innerHTML=`<div class="o360-result-group-head"><h3>ϟ Elétrica</h3><small>${rows.length} resultado(s)</small></div><div class="o360-result-list">${rows.map(x=>`<div class="o360-result" data-elec-central="${esc(x.label)}"><div class="o360-result-icon">ϟ</div><div class="o360-result-copy"><b>${esc(x.label)}</b><small>${esc([x.node_type,x.reference,x.circuit_code,x.location_description].filter(Boolean).join(' • '))}</small></div><div class="o360-result-meta"><span class="o360-mini ${x.verification_status==='verified'?'ok':x.verification_status==='estimated'?'warn':''}">${esc(x.verification_status==='verified'?'verificado':x.verification_status==='estimated'?'estimado':'referência')}</span></div></div>`).join('')}</div>`;
 host.prepend(group);group.querySelectorAll('[data-elec-central]').forEach(x=>x.addEventListener('click',()=>openElectrical(x.dataset.elecCentral)));
}
function schedule(q){clearTimeout(timer);timer=setTimeout(()=>appendElectricalResults(q).catch(console.error),450)}
document.addEventListener('click',e=>{if(e.target.closest('#o360UniversalGo'))schedule($('#o360UniversalSearch')?.value);const q=e.target.closest('#o360CentralRoot [data-q]');if(q)schedule(q.dataset.q)});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target?.id==='o360UniversalSearch')schedule(e.target.value)});
const observer=new MutationObserver(()=>injectShortcut());
document.addEventListener('DOMContentLoaded',()=>{const root=$('#o360CentralRoot')||document.body;observer.observe(root,{childList:true,subtree:true});injectShortcut()},{once:true});
})();
