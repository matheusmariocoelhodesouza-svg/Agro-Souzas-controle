(()=>{
'use strict';
if(window.C360_UX_POLISH_VERSION)return;
const VERSION='2026.09.22-ux1';
let toastOriginalParent=null,toastOriginalNext=null;
const utilityOrigins=new Map();
let observer=null,timer=null;

function isDevice(){return document.body?.classList.contains('device-mode')||false}
function activeScreen(){return document.querySelector('#screenHost .section.active')?.id||document.querySelector('.section.active')?.id||''}
function norm(v){return String(v||'').replace(/\s+/g,' ').trim().toLowerCase()}

function ensureStyle(){
 if(document.getElementById('c360UxPolishHotfixStyle'))return;
 const s=document.createElement('style');s.id='c360UxPolishHotfixStyle';
 s.textContent=`
 /* Campo: o aviso de localização participa do fluxo da página, sem recorte nem texto invisível. */
 html body.device-mode #c360LocationPermissionCard{
   position:relative!important;inset:auto!important;top:auto!important;right:auto!important;bottom:auto!important;left:auto!important;
   transform:none!important;width:100%!important;max-width:none!important;max-height:none!important;min-height:0!important;
   overflow:visible!important;margin:0 0 8px!important;padding:11px 12px!important;border-radius:14px!important;
   background:#fff!important;color:#14213d!important;border:1px solid #d9e3ef!important;box-shadow:0 5px 18px rgba(2,18,38,.13)!important;
   box-sizing:border-box!important;z-index:1!important;
 }
 html body.device-mode #c360LocationPermissionCard :is(h1,h2,h3,strong){color:#17233c!important;-webkit-text-fill-color:#17233c!important;opacity:1!important;text-shadow:none!important}
 html body.device-mode #c360LocationPermissionCard p,
 html body.device-mode #c360LocationPermissionCard .muted{color:#526985!important;-webkit-text-fill-color:#526985!important;opacity:1!important;text-shadow:none!important}
 html body.device-mode #c360LocationPermissionCard p{font-size:12px!important;line-height:1.35!important;margin:2px 0 6px!important}
 html body.device-mode #c360LocationPermissionCard .muted{font-size:10.5px!important;line-height:1.3!important;margin:0 0 7px!important}
 html body.device-mode #c360LocationPermissionCard .toolbar{display:flex!important;align-items:stretch!important;gap:6px!important;flex-wrap:wrap!important}
 html body.device-mode #c360LocationPermissionCard button,
 html body.device-mode #c360LocationPermissionCard .btn{display:flex!important;align-items:center!important;justify-content:center!important;width:100%!important;max-width:100%!important;min-height:42px!important;margin:2px 0 0!important;padding:9px 12px!important;border-radius:11px!important;white-space:normal!important;overflow:visible!important;font-size:11px!important;line-height:1.2!important;box-sizing:border-box!important}
 html body.device-mode #c360FieldLocationSlot{width:100%!important;margin:0!important;padding:0!important}
 @supports selector(body:has(*)){
   html body.device-mode:has(#c360LocationPermissionCard:not(.hidden):not([hidden])) #screenHost{padding-top:0!important}
 }

 /* Toasts do campo entram no layout da tela inicial: nenhuma mensagem cobre Apanha/Ponto. */
 html body.device-mode #c360FieldToastSlot{width:100%;margin:0 0 8px;padding:0;order:-90}
 html body.device-mode #c360FieldToastSlot #c360ToastStack{position:relative!important;inset:auto!important;top:auto!important;right:auto!important;bottom:auto!important;left:auto!important;width:100%!important;max-width:none!important;margin:0!important;padding:0!important;z-index:2!important;pointer-events:none!important;transform:none!important}
 html body.device-mode #c360FieldToastSlot #c360ToastStack .c360-toast{width:100%!important;max-width:none!important;margin:0!important;box-sizing:border-box!important;box-shadow:0 4px 14px rgba(2,18,38,.11)!important}

 /* Financeiro: ocultar números não pode apagar os rótulos nem reduzir contraste do card. */
 html body #financeiro .finance-kpi{opacity:1!important;filter:none!important;mix-blend-mode:normal!important}
 html body #financeiro .finance-kpi-label{color:#465a73!important;-webkit-text-fill-color:#465a73!important;opacity:1!important;filter:none!important;text-shadow:none!important}
 html body #financeiro .finance-kpi-value{color:#14213d!important;-webkit-text-fill-color:#14213d!important;opacity:1!important;filter:none!important;text-shadow:none!important}
 html body.darkmode #financeiro .finance-kpi-label{color:#b8c8da!important;-webkit-text-fill-color:#b8c8da!important}
 html body.darkmode #financeiro .finance-kpi-value{color:#f8fafc!important;-webkit-text-fill-color:#f8fafc!important}

 .c360-list-search+div>[hidden]{display:none!important}
 /* Indicadores: valores longos e contraste legível nos dois temas. */
 html body:not(.darkmode) :is(#combustivel,#manutencoes,#insumos,#relatorios) .v2kpi{
   background:#fff!important;color:#14213d!important;border-color:#d9e3ef!important;
 }
 html body:not(.darkmode) :is(#combustivel,#manutencoes,#insumos,#relatorios) .v2kpi :is(strong,.v){
   color:#14213d!important;-webkit-text-fill-color:#14213d!important;
 }
 html body:not(.darkmode) :is(#combustivel,#manutencoes,#insumos,#relatorios) .v2kpi :is(span,.t,.s){
   color:#475569!important;-webkit-text-fill-color:#475569!important;
 }
 html body :is(.v2kpi,.finance-kpi){min-width:0!important;overflow:hidden}
 html body :is(.v2kpi strong,.v2kpi .v,.finance-kpi-value){font-size:clamp(16px,1.8vw,24px)!important;overflow-wrap:anywhere;line-height:1.25!important}
 html body .v2sidebar{overflow-x:hidden!important}
 html body #configuracoes .row>div{min-width:0}
 html body #configuracoes :is(input,select,textarea){max-width:100%;box-sizing:border-box}
 /* Atalhos administrativos ficam dentro da barra lateral e deixam de cobrir listas/formulários. */
 #c360UtilityDock{margin:14px 0 4px;padding:10px 8px 8px;border-top:1px solid rgba(255,255,255,.08);display:grid;gap:7px}
 #c360UtilityDock .c360-utility-title{font-size:9px;letter-spacing:1.2px;font-weight:900;color:#7187a6;padding:0 3px 2px;text-transform:uppercase}
 #c360UtilityDock #c360NativeTrackerQuick,
 #c360UtilityDock #c360ChatFab{position:static!important;inset:auto!important;right:auto!important;bottom:auto!important;left:auto!important;top:auto!important;transform:none!important;width:100%!important;max-width:none!important;min-height:40px!important;margin:0!important;padding:9px 10px!important;border-radius:10px!important;box-shadow:none!important;z-index:auto!important;font-size:11px!important;justify-content:flex-start!important}
 #c360UtilityDock #c360NativeTrackerQuick:hover,
 #c360UtilityDock #c360ChatFab:hover{transform:none!important}
 .c360-plan-noise-hidden{display:none!important}

 @media(max-width:640px){
   html body.device-mode #c360LocationPermissionCard{padding:10px!important;margin-bottom:7px!important;border-radius:12px!important}
   html body.device-mode #c360LocationPermissionCard button,
   html body.device-mode #c360LocationPermissionCard .btn{min-height:42px!important}
 }
 `;
 (document.head||document.documentElement).appendChild(s);
}

function fieldHost(){return document.querySelector('#equipehome .team-home-grid')?.parentElement||document.querySelector('#equipehome')}
function placeFieldToast(){
 const stack=document.getElementById('c360ToastStack');if(!stack)return;
 if(!toastOriginalParent){toastOriginalParent=stack.parentElement;toastOriginalNext=stack.nextSibling}
 const homeActive=isDevice()&&activeScreen()==='equipehome';
 if(homeActive){
   const grid=document.querySelector('#equipehome .team-home-grid');const host=fieldHost();if(!grid||!host)return;
   let slot=document.getElementById('c360FieldToastSlot');
   if(!slot){slot=document.createElement('div');slot.id='c360FieldToastSlot';slot.setAttribute('aria-live','polite');host.insertBefore(slot,grid)}
   if(stack.parentElement!==slot)slot.appendChild(stack);
 }else if(stack.parentElement?.id==='c360FieldToastSlot'){
   const parent=toastOriginalParent&&toastOriginalParent.isConnected?toastOriginalParent:document.body;
   if(toastOriginalNext&&toastOriginalNext.parentElement===parent)parent.insertBefore(stack,toastOriginalNext);else parent.appendChild(stack);
   document.getElementById('c360FieldToastSlot')?.remove();
 }
}

function rememberOrigin(el){if(el&&!utilityOrigins.has(el))utilityOrigins.set(el,{parent:el.parentElement,next:el.nextSibling})}
function restoreUtility(el){const o=utilityOrigins.get(el);if(!o)return;const parent=o.parent&&o.parent.isConnected?o.parent:document.body;if(o.next&&o.next.parentElement===parent)parent.insertBefore(el,o.next);else parent.appendChild(el)}
function placeAdminUtilities(){
 const tracker=document.getElementById('c360NativeTrackerQuick');const chat=document.getElementById('c360ChatFab');
 for(const el of [tracker,chat])rememberOrigin(el);
 if(isDevice()){
   for(const el of [tracker,chat])if(el&&el.closest('#c360UtilityDock'))restoreUtility(el);
   document.getElementById('c360UtilityDock')?.remove();
   return;
 }
 const sidebar=document.querySelector('.v2sidebar');if(!sidebar||(!tracker&&!chat))return;
 let dock=document.getElementById('c360UtilityDock');
 if(!dock){dock=document.createElement('div');dock.id='c360UtilityDock';dock.innerHTML='<div class="c360-utility-title">Atalhos</div>';sidebar.appendChild(dock)}
 for(const el of [tracker,chat])if(el&&el.parentElement!==dock)dock.appendChild(el);
}

function cleanPlanNoise(){
 if(isDevice())return;
 const roots=[document.querySelector('header'),document.querySelector('.v2sidebar')].filter(Boolean);
 document.querySelectorAll('.c360-plan-noise-hidden').forEach(el=>{if(!['plano não configurado','sem plano'].includes(norm(el.textContent)))el.classList.remove('c360-plan-noise-hidden')});
 for(const root of roots){
   root.querySelectorAll('*').forEach(el=>{
     const t=norm(el.textContent);if(!['plano não configurado','sem plano'].includes(t))return;
     if([...el.children].some(c=>norm(c.textContent)&&norm(c.textContent)!==t))return;
     el.classList.add('c360-plan-noise-hidden');
   });
 }
}

function searchableText(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()}
function installListSearch(){
 if(isDevice())return;
 const lists={employeesList:'Nome, matrícula, equipe ou situação',poultryList:'Integrado, equipe, data ou situação',fuelList:'Condução, placa, posto ou data',maintenanceList:'Serviço, condução, data ou situação',financeList:'Descrição, data ou favorecido'};
 for(const [id,label] of Object.entries(lists)){
  const list=document.getElementById(id);if(!list)continue;
  let filter=document.getElementById(id+'Search');
  if(!filter){
   const box=document.createElement('div');box.className='c360-list-search';box.style.cssText='display:grid;gap:5px;margin:12px 0';
   const caption=document.createElement('label');caption.htmlFor=id+'Search';caption.textContent='Filtrar registros carregados';
   filter=document.createElement('input');filter.id=id+'Search';filter.type='search';filter.placeholder=label;filter.style.cssText='width:100%;min-height:44px;box-sizing:border-box';
   const status=document.createElement('span');status.id=id+'SearchStatus';status.className='muted';status.setAttribute('aria-live','polite');
   box.append(caption,filter,status);list.before(box);filter.addEventListener('input',()=>applyListSearch(list,filter));
  }
  applyListSearch(list,filter);
 }
}
function applyListSearch(list,filter){
 const words=searchableText(filter.value).trim().split(/\s+/).filter(Boolean);
 const rows=[...list.children].filter(el=>el.matches('.item,.poultry-op-card,.finance-entry-card'));
 let count=0;
 for(const row of rows){const match=words.every(word=>searchableText(row.textContent).includes(word));if(row.hidden===match)row.hidden=!match;if(match)count++}
 const status=document.getElementById(list.id+'SearchStatus');
 const message=words.length?(count+' de '+rows.length+' registros carregados'+(count?'':' — nenhum resultado')):'';
 if(status&&status.textContent!==message)status.textContent=message;
}
function fix(){ensureStyle();placeFieldToast();placeAdminUtilities();cleanPlanNoise();installListSearch()}
function schedule(){clearTimeout(timer);timer=setTimeout(fix,40)}
function init(){
 ensureStyle();fix();
 document.addEventListener('c360:screen-changed',schedule);
 document.addEventListener('c360:interactive-ready',schedule);
 document.addEventListener('c360:bootstrap-ready',schedule);
 window.addEventListener('online',()=>setTimeout(fix,0));
 window.addEventListener('offline',()=>setTimeout(fix,0));
 observer=new MutationObserver(schedule);observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden','aria-pressed']});
 setTimeout(fix,250);setTimeout(fix,900);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.C360_UX_POLISH_VERSION=VERSION;
})();