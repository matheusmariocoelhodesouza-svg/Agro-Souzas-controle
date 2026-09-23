(()=>{
'use strict';
const BOOT_VERSION='2026.09.23-v1-final1';
const recoveryModule='./c360-autorecovery.js';
const styles=[
 './c360-premium-ui.css','./c360-product-ui.css','./c360-dashboard-dark-fix.css','./c360-enterprise-ui.css',
 './c360-commercial.css','./c360-fiscal.css','./c360-saas-readiness.css','./c360-visual-system.css','./c360-contrast-fix.css',
 './c360-hotfix-dashboard-dark.css','./c360-hotfix-bottom-nav.css','./c360-trailer-hitches.css','./c360-premium-theme-v2.css',
 './c360-showcase-theme.css','./c360-showcase-mobile-fix.css','./c360-showcase-exact.css','./c360-mobile-final-fix.css',
 './c360-visual-final.css','./c360-mobile-density-fix.css','./c360-field-mobile-density.css','./c360-field-home-stack.css',
 './c360-layout-hardening.css','./c360-field-contrast-hotfix.css','./c360-release-core.css','./c360-final-stabilization.css'
];
const essentialModules=[
 './c360-platform.js',
 './c360-product-core.js',
 './c360-release-core.js',
 './c360-quality-core.js',
 './c360-farm-cache-hotfix.js',
 './c360-field-offline-hotfix.js',
 './c360-field-stability.js',
 './c360-runtime-compatibility.js',
 './c360-final-stabilization.js',
 './c360-data-integrity.js'
];
const optionalModules=[
 './c360-report-share.js','./c360-report-stability.js','./c360-consumable-edit.js','./c360-consumable-action-bridge.js','./c360-consumable-mobile-actions.js',
 './c360-team-chat.js','./c360-system-health.js','./c360-onboarding-entry.js','./c360-fiscal.js','./c360-fiscal-issuance.js',
 './c360-enterprise.js','./c360-commercial.js','./c360-saas-readiness.js','./c360-rpc-bridge.js','./c360-trailer-hitches.js',
 './c360-showcase-exact.js','./c360-field-route-guard.js','./c360-fuel-type.js','./c360-native-tracker-admin.js','./c360-ux-polish-hotfix.js'
];
const resourceUrl=src=>src+(src.includes('?')?'&':'?')+'v='+encodeURIComponent(BOOT_VERSION);
const baseName=src=>src.split('?')[0];
const normalizedPath=src=>baseName(src).replace(/^\.\//,'');
function mark(name){try{performance.mark(name)}catch(_){}}
function preconnect(href){
 if(!href||document.querySelector(`link[rel="preconnect"][href="${href}"]`))return;
 const l=document.createElement('link');l.rel='preconnect';l.href=href;l.crossOrigin='anonymous';document.head.appendChild(l);
 const d=document.createElement('link');d.rel='dns-prefetch';d.href=href;document.head.appendChild(d);
}
function existingStyle(href){return[...document.querySelectorAll('link[rel="stylesheet"]')].find(l=>{try{return new URL(l.href,location.href).pathname.endsWith(normalizedPath(href))}catch{return false}})}
function existingScript(src){return[...document.scripts].find(s=>{try{return s.src&&new URL(s.src,location.href).pathname.endsWith(normalizedPath(src))}catch{return false}})}
function appendStyle(href){
 const found=existingStyle(href);if(found)return Promise.resolve({ok:true,src:href,reused:true});
 return new Promise(resolve=>{const l=document.createElement('link');l.rel='stylesheet';l.href=resourceUrl(href);l.dataset.c360Style=baseName(href);l.onload=()=>resolve({ok:true,src:href});l.onerror=()=>resolve({ok:false,src:href,error:'Falha ao carregar '+baseName(href)});document.head.appendChild(l)});
}
function appendScript(src){
 const found=existingScript(src);
 if(found){
  if(found.dataset.c360Loaded==='1'||document.readyState!=='loading')return Promise.resolve({ok:true,src,reused:true});
  return new Promise(resolve=>{let done=false;const finish=(ok,error)=>{if(done)return;done=true;resolve({ok,src,reused:true,error})};found.addEventListener('load',()=>finish(true),{once:true});found.addEventListener('error',()=>finish(false,'Falha ao carregar '+baseName(src)),{once:true});setTimeout(()=>finish(true),1800)});
 }
 return new Promise(resolve=>{const s=document.createElement('script');s.src=resourceUrl(src);s.async=false;s.dataset.c360Module=baseName(src);s.onload=()=>{s.dataset.c360Loaded='1';resolve({ok:true,src})};s.onerror=()=>resolve({ok:false,src,error:'Falha ao carregar '+baseName(src)});document.head.appendChild(s)});
}
async function loadStylesParallel(list){
 const results=await Promise.allSettled(list.map(appendStyle));
 return results.map(r=>r.status==='fulfilled'?r.value:{ok:false,error:r.reason?.message||String(r.reason)});
}
async function loadScriptsOrderedParallel(list){
 const pending=list.map(appendScript);
 const results=await Promise.allSettled(pending);
 return results.map(r=>r.status==='fulfilled'?r.value:{ok:false,error:r.reason?.message||String(r.reason)});
}
function errorsFrom(results){return results.filter(x=>!x?.ok).map(x=>x?.error||('Falha em '+(x?.src||'recurso')))}
function emit(name,detail){document.dispatchEvent(new CustomEvent(name,{detail}))}
async function boot(){
 mark('c360:boot:start');
 preconnect('https://aycbrqziusxtxhsdfqjk.supabase.co');
 preconnect('https://cdn.jsdelivr.net');
 const errors=[];const loadedStyles=[];const loadedModules=[];
 const recovery=await appendScript(recoveryModule);if(recovery.ok)loadedModules.push(recoveryModule);else errors.push(recovery.error);
 const safeMode=!!window.__c360SafeMode;
 mark('c360:boot:recovery-ready');
 const stylePromise=safeMode?Promise.resolve([]):loadStylesParallel(styles);
 const essentialPromise=loadScriptsOrderedParallel(essentialModules);
 const [styleResults,essentialResults]=await Promise.all([stylePromise,essentialPromise]);
 for(const r of styleResults){if(r.ok)loadedStyles.push(r.src)}
 for(const r of essentialResults){if(r.ok)loadedModules.push(r.src)}
 errors.push(...errorsFrom(styleResults),...errorsFrom(essentialResults));
 mark('c360:boot:interactive');
 const interactive={version:BOOT_VERSION,recovery:window.__c360RecoveryVersion||null,safeMode,styles:[...loadedStyles],modules:[...loadedModules],errors:[...errors],ready:errors.length===0,featuresReady:safeMode};
 window.__c360Bootstrap=interactive;emit('c360:interactive-ready',interactive);
 let optionalResults=[];
 if(!safeMode){
   optionalResults=await loadScriptsOrderedParallel(optionalModules);
   for(const r of optionalResults){if(r.ok)loadedModules.push(r.src)}
   errors.push(...errorsFrom(optionalResults));
 }
 mark('c360:boot:complete');
 try{performance.measure('c360:boot:interactive-ms','c360:boot:start','c360:boot:interactive');performance.measure('c360:boot:total-ms','c360:boot:start','c360:boot:complete')}catch(_){}
 const finalState={version:BOOT_VERSION,recovery:window.__c360RecoveryVersion||null,safeMode,styles:loadedStyles,modules:loadedModules,errors,ready:errors.length===0,featuresReady:!safeMode?errorsFrom(optionalResults).length===0:true};
 window.__c360Bootstrap=finalState;
 if(errors.length)console.error('Comando 360: recursos não carregados:',errors.join(' | '));
 emit('c360:bootstrap-ready',finalState);
}
boot().catch(e=>{
 const detail={version:BOOT_VERSION,recovery:window.__c360RecoveryVersion||null,safeMode:!!window.__c360SafeMode,styles:[],modules:[recoveryModule],errors:[e?.message||String(e)],ready:false,featuresReady:false};
 window.__c360Bootstrap=detail;console.error('Comando 360 bootstrap',e);emit('c360:bootstrap-ready',detail);
});
})();