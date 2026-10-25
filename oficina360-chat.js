(()=>{
'use strict';
const workspace=()=>window.O360Workspace;
const tab=()=>document.getElementById('tab-workshop-chat');
window.C360AssistantAdapter={label:'Oficina IA',apiBase:window.SUPABASE_URL,apiKey:window.SUPABASE_PUBLISHABLE_KEY,
 company:()=>workspace()?.session()?workspace()?.vehicle()?.company_id||'':'',session:()=>workspace()?.session(),vehicleId:()=>workspace()?.vehicle()?.id,
 root:()=>document.querySelector('#tab-workshop-chat #ia'),isOpen:()=>!!tab()?.classList.contains('active'),
 open:()=>workspace()?.openTab('workshop-chat'),notify:message=>workspace()?.notify(message)};
const style=document.createElement('style');style.textContent='.o360-chat{max-width:1300px;margin:auto}.o360-chat .toolbar{display:flex;gap:8px}.o360-chat .ai360-handsfree.recording{background:#fee2e2;color:#991b1b}.o360-chat .ai360-voice-status{flex-basis:100%}@media(max-width:760px){#c360AiFab{bottom:calc(84px + env(safe-area-inset-bottom,0px))}}';document.head.appendChild(style);
for(const event of ['o360:vehicle-changed','o360:session-changed'])document.addEventListener(event,()=>document.dispatchEvent(new CustomEvent('c360:assistant-scope-changed')));
document.addEventListener('o360:tab-changed',()=>document.dispatchEvent(new CustomEvent('c360:screen-changed',{detail:{screen:'ia'}})));
document.addEventListener('c360:workshop-journal-updated',()=>workspace()?.refreshOrders().catch(()=>{}));
})();
