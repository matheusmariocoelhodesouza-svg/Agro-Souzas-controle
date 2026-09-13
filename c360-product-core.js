(()=>{
'use strict';
if(window.C360Product)return;

const VERSION='2026.09.13-product1';
const P=window.C360Platform||{};
const doc=document;
let lastScreen='';
let observer=null;

function liveRegion(){
 let el=doc.getElementById('c360LiveRegion');
 if(el)return el;
 el=doc.createElement('div');
 el.id='c360LiveRegion';
 el.className='c360-live-region';
 el.setAttribute('aria-live','polite');
 el.setAttribute('aria-atomic','true');
 doc.body.appendChild(el);
 return el;
}
function announce(text){
 const el=liveRegion();
 el.textContent='';
 requestAnimationFrame(()=>{el.textContent=String(text||'')});
}
function screenName(section){
 if(!section)return 'Comando 360';
 const heading=section.querySelector('.v2hero h1,.fleet-hero h1,h1,h2');
 const text=heading?.textContent?.trim();
 return text||section.id||'Comando 360';
}
function currentScreen(){
 return doc.querySelector('#screenHost .section.active,#screenHost [data-screen].active,.section.active:not([hidden])');
}
function updateScreenContext(){
 const active=currentScreen();
 const id=active?.id||'';
 if(id===lastScreen)return;
 lastScreen=id;
 if(id)doc.body.dataset.c360Screen=id;
 else delete doc.body.dataset.c360Screen;

 doc.querySelectorAll('.v2navbtn').forEach(btn=>{
  const activeBtn=btn.classList.contains('active') || (id&&btn.getAttribute('data-tab')===id);
  if(activeBtn)btn.setAttribute('aria-current','page');
  else btn.removeAttribute('aria-current');
 });
 doc.querySelectorAll('.section,[data-screen]').forEach(section=>{
  const visible=section===active || (section.classList.contains('active')&&!section.hidden);
  section.setAttribute('aria-hidden',visible?'false':'true');
  if(!section.hasAttribute('role'))section.setAttribute('role','region');
 });
 if(active){
  const name=screenName(active);
  doc.title=`Comando 360 • ${name}`;
  P.emit?.('c360:screen-changed',{id,name});
 }
}
function accessibleName(el){
 const aria=el.getAttribute('aria-label');
 if(aria)return aria;
 const title=el.getAttribute('title');
 if(title)return title;
 const text=(el.textContent||'').replace(/\s+/g,' ').trim();
 if(text)return text.slice(0,80);
 const id=el.id||'';
 const map={
  themeToggle:'Alternar tema',logout:'Sair',headerMenuBtn:'Abrir menu',
  networkBadge:'Status da conexão',newPoultryOpBtn:'Nova apanha',newVehicleBtn:'Novo veículo'
 };
 return map[id]||'';
}
function enhanceA11y(root=doc){
 root.querySelectorAll?.('button,a,[role="button"]').forEach(el=>{
  const name=accessibleName(el);
  if(name&&!el.getAttribute('aria-label')&&!(el.textContent||'').trim())el.setAttribute('aria-label',name);
 });
 root.querySelectorAll?.('img:not([alt])').forEach(img=>img.setAttribute('alt',''));
 root.querySelectorAll?.('.error,.okmsg,#networkBadge').forEach(el=>{
  if(!el.hasAttribute('role'))el.setAttribute('role','status');
  if(!el.hasAttribute('aria-live'))el.setAttribute('aria-live','polite');
 });
 root.querySelectorAll?.('input,select,textarea').forEach(el=>{
  if(el.disabled)el.setAttribute('aria-disabled','true');
  else el.removeAttribute('aria-disabled');
  if(el.required)el.setAttribute('aria-required','true');
 });
}
function syncTheme(){
 const dark=doc.body?.classList.contains('darkmode');
 doc.documentElement.style.colorScheme=dark?'dark':'light';
 const meta=doc.querySelector('meta[name="theme-color"]');
 if(meta)meta.setAttribute('content',dark?'#081321':'#0f172a');
}
function syncNetwork(){
 const online=navigator.onLine!==false;
 doc.body?.classList.toggle('c360-online',online);
 doc.body?.classList.toggle('c360-offline',!online);
 announce(online?'Conexão restabelecida.':'Você está sem internet. O Comando 360 continuará usando os dados disponíveis offline.');
}
function setupKeyboard(){
 doc.addEventListener('keydown',event=>{
  const tag=doc.activeElement?.tagName?.toLowerCase();
  const typing=['input','textarea','select'].includes(tag) || doc.activeElement?.isContentEditable;
  if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){
   const input=doc.querySelector('.c360-sidebar-search input,.c360-sidebar-search');
   if(input){event.preventDefault();input.focus?.();input.select?.()}
   return;
  }
  if(event.key==='/'&&!typing){
   const input=doc.querySelector('.c360-sidebar-search input,.c360-sidebar-search');
   if(input){event.preventDefault();input.focus?.();input.select?.()}
  }
  if(event.key==='Escape'&&typing){
   doc.activeElement?.blur?.();
  }
 });
}
function setupMutationObserver(){
 const run=(P.debounce||((fn)=>fn))(()=>{
  updateScreenContext();
  enhanceA11y(doc);
  syncTheme();
 },100);
 observer=new MutationObserver(run);
 observer.observe(doc.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden','disabled','aria-hidden']});
}
function bootstrapHealthBanner(event){
 const detail=event.detail||{};
 if(!detail.errors?.length)return;
 let box=doc.getElementById('c360BootstrapNotice');
 if(box)return;
 box=doc.createElement('div');
 box.id='c360BootstrapNotice';
 box.className='c360-product-notice';
 box.setAttribute('role','alert');
 box.innerHTML='<strong>Alguns recursos não carregaram.</strong><span>O Comando 360 está tentando se recuperar automaticamente.</span>';
 doc.body.appendChild(box);
 setTimeout(()=>box.remove(),9000);
}
function init(){
 doc.documentElement.classList.add('c360-product-shell');
 doc.body?.classList.add('c360-product-ready');
 liveRegion();
 enhanceA11y(doc);
 updateScreenContext();
 syncTheme();
 syncNetwork();
 setupKeyboard();
 setupMutationObserver();
 window.addEventListener('online',syncNetwork);
 window.addEventListener('offline',syncNetwork);
 doc.addEventListener('c360:bootstrap-ready',bootstrapHealthBanner);
 try{performance.mark('c360-product-ready')}catch(_){}
 P.emit?.('c360:product-ready',{version:VERSION,screen:lastScreen||null});
}

window.C360Product={version:VERSION,announce,enhanceA11y,updateScreenContext,syncTheme,syncNetwork};
if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',init,{once:true});
else init();
})();
