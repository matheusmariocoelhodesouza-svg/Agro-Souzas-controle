(()=>{
'use strict';
const BOOT_VERSION='2026.09.25-audit3';
const recoveryModule='./c360-autorecovery.js';

/* Runtime enxuto: só recursos globais entram no primeiro paint. */
const commonStyles=[
 './c360-premium-ui.css','./c360-product-ui.css','./c360-visual-system.css','./c360-contrast-fix.css',
 './c360-premium-theme-v2.css','./c360-showcase-theme.css','./c360-showcase-exact.css','./c360-visual-final.css',
 './c360-layout-hardening.css','./c360-release-core.css','./c360-final-stabilization.css'
];
const adminStyles=[
 './c360-dashboard-dark-fix.css','./c360-hotfix-dashboard-dark.css','./c360-enterprise-ui.css','./c360-commercial.css','./c360-saas-readiness.css'
];
const mobileAdminStyles=[
 './c360-hotfix-bottom-nav.css','./c360-showcase-mobile-fix.css','./c360-mobile-final-fix.css','./c360-mobile-density-fix.css'
];
const fieldStyles=[
 './c360-field-mobile-density.css','./c360-field-home-stack.css','./c360-field-contrast-hotfix.css'
];
const routeStyles={fiscal:['./c360-fiscal.css'],frota:['./c360-trailer-hitches.css']};

const essentialModules=[
 './c360-platform.js','./c360-product-core.js','./c360-release-core.js','./c360-quality-core.js','./c360-farm-cache-hotfix.js',
 './c360-field-offline-hotfix.js','./c360-field-stability.js','./c360-runtime-compatibility.js','./c360-final-stabilization.js','./c360-data-integrity.js',
 './c360-field-route-guard.js','./c360-ux-polish-hotfix.js','./c360-onboarding-entry.js','./c360-team-chat.js','./c360-system-health.js','./c360-enterprise.js',
 './c360-commercial.js','./c360-saas-readiness.js','./c360-rpc-bridge.js','./c360-showcase-exact.js'
];
const routeModules={
 relatorios:['./c360-report-share.js','./c360-report-stability.js'],
 insumos:['./c360-consumable-edit.js','./c360-consumable-action-bridge.js','./c360-consumable-mobile-actions.js'],
 fiscal:['./c360-fiscal.js','./c360-fiscal-issuance.js'],
 frota:['./c360-trailer-hitches.js','./c360-native-tracker-admin.js'],
 rastreamento:['./c360-native-tracker-admin.js'],
 combustivel:['./c360-fuel-type.js'],abastecimento:['./c360-fuel-type.js']
};

const loadedStyles=new Set(),loadedModules=new Set();
const loadingStyles=new Map(),loadingModules=new Map();
const lazyErrors=[];
let modeObserver=null;

const resourceUrl=src=>src+(src.includes('?')?'&':'?')+'v='+encodeURIComponent(BOOT_VERSION);
const baseName=src=>src.split('?')[0];
const normalizedPath=src=>baseName(src).replace(/^\.\//,'');
function mark(name){try{performance.mark(name)}catch(_){}}
function emit(name,detail){document.dispatchEvent(new CustomEvent(name,{detail}))}
function isDevice(){return !!document.body?.classList.contains('device-mode')}
function isAppReady(){return !!document.body?.classList.contains('app-ready')}
function isMobileAdmin(){return !isDevice()&&!!(window.matchMedia&&window.matchMedia('(max-width:900px)').matches)}
function activeScreen(){return document.querySelector('#screenHost .section.active')?.id||document.querySelector('#screenHost [data-screen]:not([hidden])')?.id||document.querySelector('.section.active')?.id||''}

function preconnect(href){
 if(!href||document.querySelector(`link[rel="preconnect"][href="${href}"]`))return;
 const l=document.createElement('link');l.rel='preconnect';l.href=href;l.crossOrigin='anonymous';document.head.appendChild(l);
 const d=document.createElement('link');d.rel='dns-prefetch';d.href=href;document.head.appendChild(d);
}
function existingStyle(href){return[...document.querySelectorAll('link[rel="stylesheet"]')].find(l=>{try{return new URL(l.href,location.href).pathname.endsWith(normalizedPath(href))}catch{return false}})}
function existingScript(src){return[...document.scripts].find(s=>{try{return s.src&&new URL(s.src,location.href).pathname.endsWith(normalizedPath(src))}catch{return false}})}
function appendStyle(href){
 const key=baseName(href);if(loadedStyles.has(key))return Promise.resolve({ok:true,src:href,reused:true});
 if(loadingStyles.has(key))return loadingStyles.get(key);
 const found=existingStyle(href);if(found){loadedStyles.add(key);return Promise.resolve({ok:true,src:href,reused:true})}
 const job=new Promise(resolve=>{const l=document.createElement('link');l.rel='stylesheet';l.href=resourceUrl(href);l.dataset.c360Style=key;l.onload=()=>{loadedStyles.add(key);loadingStyles.delete(key);resolve({ok:true,src:href})};l.onerror=()=>{loadingStyles.delete(key);resolve({ok:false,src:href,error:'Falha ao carregar '+key})};document.head.appendChild(l)});
 loadingStyles.set(key,job);return job;
}
function appendScript(src){
 const key=baseName(src);if(loadedModules.has(key))return Promise.resolve({ok:true,src,reused:true});
 if(loadingModules.has(key))return loadingModules.get(key);
 const found=existingScript(src);
 if(found){
  if(found.dataset.c360Loaded==='1'||document.readyState!=='loading'){loadedModules.add(key);return Promise.resolve({ok:true,src,reused:true})}
  const job=new Promise(resolve=>{let done=false;const finish=(ok,error)=>{if(done)return;done=true;loadingModules.delete(key);if(ok)loadedModules.add(key);resolve({ok,src,reused:true,error})};found.addEventListener('load',()=>finish(true),{once:true});found.addEventListener('error',()=>finish(false,'Falha ao carregar '+key),{once:true});setTimeout(()=>finish(true),1800)});loadingModules.set(key,job);return job;
 }
 const job=new Promise(resolve=>{const s=document.createElement('script');s.src=resourceUrl(src);s.async=false;s.dataset.c360Module=key;s.onload=()=>{s.dataset.c360Loaded='1';loadedModules.add(key);loadingModules.delete(key);resolve({ok:true,src})};s.onerror=()=>{loadingModules.delete(key);resolve({ok:false,src,error:'Falha ao carregar '+key})};document.head.appendChild(s)});loadingModules.set(key,job);return job;
}
async function loadStylesParallel(list){
 const results=await Promise.allSettled([...new Set(list)].map(appendStyle));
 return results.map(r=>r.status==='fulfilled'?r.value:{ok:false,error:r.reason?.message||String(r.reason)});
}
async function loadScriptsOrderedParallel(list){
 /* async=false preserva ordem de execução e o map inicia os downloads em paralelo. */
 const results=await Promise.allSettled([...new Set(list)].map(appendScript));
 return results.map(r=>r.status==='fulfilled'?r.value:{ok:false,error:r.reason?.message||String(r.reason)});
}
const loadStyles=loadStylesParallel;
const loadScripts=loadScriptsOrderedParallel;
function errorsFrom(results){return results.filter(x=>!x?.ok).map(x=>x?.error||('Falha em '+(x?.src||'recurso')))}

async function loadModeStyles(){
 if(!isAppReady())return [];
 const list=isDevice()?fieldStyles:[...adminStyles,...(isMobileAdmin()?mobileAdminStyles:[])];
 const results=await loadStylesParallel(list);lazyErrors.push(...errorsFrom(results));return results;
}
function normalizeScreen(value){return String(value||'').trim().toLowerCase().replace(/^#/, '')}
function resourcesForScreen(screen,map){const s=normalizeScreen(screen),out=[];for(const [key,list] of Object.entries(map))if(s===key||s.includes(key))out.push(...list);return out}
async function loadScreenFeatures(screen){
 const s=normalizeScreen(screen);if(!s)return;
 const [styleResults,moduleResults]=await Promise.all([loadStylesParallel(resourcesForScreen(s,routeStyles)),loadScriptsOrderedParallel(resourcesForScreen(s,routeModules))]);
 lazyErrors.push(...errorsFrom(styleResults),...errorsFrom(moduleResults));
 emit('c360:lazy-feature-ready',{version:BOOT_VERSION,screen:s,styles:styleResults,modules:moduleResults,errors:[...lazyErrors]});
}
function installRuntimeTriggers(){
 const sync=()=>{loadModeStyles();loadScreenFeatures(activeScreen())};
 if(document.body&&!modeObserver){modeObserver=new MutationObserver(sync);modeObserver.observe(document.body,{attributes:true,attributeFilter:['class']})}
 document.addEventListener('c360:screen-changed',e=>loadScreenFeatures(e?.detail?.screen||e?.detail?.id||activeScreen()));
 document.addEventListener('click',e=>{
  const target=e.target.closest('[data-jump],[data-v2tab],[data-screen]');if(!target)return;
  const screen=target.dataset.jump||target.dataset.v2tab||target.dataset.screen||'';if(screen)loadScreenFeatures(screen);
 },true);
 window.addEventListener('resize',()=>{if(isAppReady())loadModeStyles()},{passive:true});sync();
}

async function boot(){
 mark('c360:boot:start');preconnect('https://aycbrqziusxtxhsdfqjk.supabase.co');preconnect('https://cdn.jsdelivr.net');
 const errors=[];const recovery=await appendScript(recoveryModule);if(!recovery.ok)errors.push(recovery.error);
 const safeMode=!!window.__c360SafeMode;mark('c360:boot:recovery-ready');
 const [styleResults,essentialResults]=await Promise.all([safeMode?Promise.resolve([]):loadStylesParallel(commonStyles),loadScriptsOrderedParallel(essentialModules)]);
 errors.push(...errorsFrom(styleResults),...errorsFrom(essentialResults));mark('c360:boot:interactive');
 installRuntimeTriggers();if(!safeMode){await loadModeStyles();await loadScreenFeatures(activeScreen())}
 mark('c360:boot:complete');
 try{performance.measure('c360:boot:interactive-ms','c360:boot:start','c360:boot:interactive');performance.measure('c360:boot:total-ms','c360:boot:start','c360:boot:complete')}catch(_){}
 const state={version:BOOT_VERSION,recovery:window.__c360RecoveryVersion||null,safeMode,styles:[...loadedStyles],modules:[...loadedModules],errors,ready:errors.length===0,featuresReady:true,lazy:true,lazyErrors:[...lazyErrors]};
 window.__c360Bootstrap=state;if(errors.length)console.error('Comando 360: recursos não carregados:',errors.join(' | '));emit('c360:interactive-ready',state);emit('c360:bootstrap-ready',state);
}
boot().catch(e=>{
 const detail={version:BOOT_VERSION,recovery:window.__c360RecoveryVersion||null,safeMode:!!window.__c360SafeMode,styles:[...loadedStyles],modules:[...loadedModules],errors:[e?.message||String(e)],ready:false,featuresReady:false,lazy:true,lazyErrors:[...lazyErrors]};
 window.__c360Bootstrap=detail;console.error('Comando 360 bootstrap',e);emit('c360:bootstrap-ready',detail);
});
})();