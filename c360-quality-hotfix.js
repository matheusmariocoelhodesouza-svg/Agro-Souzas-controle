(()=>{
'use strict';
const BOOT_VERSION='2026.09.13-b2';
const styles=[
 './c360-premium-ui.css'
];
const modules=[
 './c360-quality-core.js',
 './c360-farm-cache-hotfix.js',
 './c360-field-offline-hotfix.js',
 './c360-consumable-edit.js',
 './c360-team-chat.js'
];

function loadStyle(href){
 return new Promise((resolve,reject)=>{
  const base=href.split('?')[0];
  const existing=[...document.querySelectorAll('link[rel="stylesheet"]')].find(l=>{
   try{return new URL(l.href,location.href).pathname.endsWith(base.replace(/^\.\//,''))}catch{return false}
  });
  if(existing)return resolve();
  const l=document.createElement('link');
  l.rel='stylesheet';
  l.href=href+(href.includes('?')?'&':'?')+'v='+encodeURIComponent(BOOT_VERSION);
  l.dataset.c360Style=base;
  l.onload=resolve;
  l.onerror=()=>reject(new Error('Falha ao carregar '+base));
  document.head.appendChild(l);
 });
}

function loadScript(src){
 return new Promise((resolve,reject)=>{
  const base=src.split('?')[0];
  const existing=[...document.scripts].find(s=>{
   try{return new URL(s.src,location.href).pathname.endsWith(base.replace(/^\.\//,''))}catch{return false}
  });
  if(existing){
   if(existing.dataset.c360Loaded==='1'||existing.readyState==='complete')return resolve();
   existing.addEventListener('load',resolve,{once:true});
   existing.addEventListener('error',()=>reject(new Error('Falha ao carregar '+base)),{once:true});
   setTimeout(resolve,1500);
   return;
  }
  const s=document.createElement('script');
  s.src=src+(src.includes('?')?'&':'?')+'v='+encodeURIComponent(BOOT_VERSION);
  s.async=false;
  s.dataset.c360Module=base;
  s.onload=()=>{s.dataset.c360Loaded='1';resolve()};
  s.onerror=()=>reject(new Error('Falha ao carregar '+base));
  document.head.appendChild(s);
 });
}

async function boot(){
 const errors=[];
 for(const href of styles){
  try{await loadStyle(href)}catch(e){errors.push(e?.message||String(e))}
 }
 for(const src of modules){
  try{await loadScript(src)}catch(e){errors.push(e?.message||String(e))}
 }
 window.__c360Bootstrap={version:BOOT_VERSION,styles:[...styles],modules:[...modules],errors,ready:errors.length===0};
 if(errors.length)console.error('Comando 360: recursos não carregados:',errors.join(' | '));
 document.dispatchEvent(new CustomEvent('c360:bootstrap-ready',{detail:window.__c360Bootstrap}));
}

boot().catch(e=>{
 window.__c360Bootstrap={version:BOOT_VERSION,styles:[...styles],modules:[...modules],errors:[e?.message||String(e)],ready:false};
 console.error('Comando 360 bootstrap',e);
});
})();
