(()=>{
'use strict';
const BOOT_VERSION='2026.09.15-b44';
const recoveryModule='./c360-autorecovery.js';
const styles=['./c360-premium-ui.css','./c360-product-ui.css','./c360-dashboard-dark-fix.css','./c360-enterprise-ui.css','./c360-commercial.css','./c360-fiscal.css','./c360-saas-readiness.css','./c360-visual-system.css','./c360-contrast-fix.css','./c360-hotfix-dashboard-dark.css','./c360-hotfix-bottom-nav.css','./c360-trailer-hitches.css','./c360-premium-theme-v2.css','./c360-showcase-theme.css','./c360-showcase-mobile-fix.css','./c360-showcase-exact.css','./c360-mobile-final-fix.css','./c360-visual-final.css','./c360-mobile-density-fix.css','./c360-field-mobile-density.css','./c360-field-home-stack.css','./c360-layout-hardening.css','./c360-field-contrast-hotfix.css'];
const essentialModules=[
 './c360-platform.js',
 './c360-product-core.js',
 './c360-quality-core.js',
 './c360-farm-cache-hotfix.js',
 './c360-field-offline-hotfix.js',
 './c360-field-stability.js'
];
const optionalModules=[
 './c360-consumable-edit.js',
 './c360-consumable-action-bridge.js',
 './c360-consumable-mobile-actions.js',
 './c360-team-chat.js',
 './c360-system-health.js',
 './c360-onboarding-entry.js',
 './c360-fiscal.js',
 './c360-fiscal-issuance.js',
 './c360-enterprise.js',
 './c360-commercial.js',
 './c360-saas-readiness.js',
 './c360-rpc-bridge.js',
 './c360-trailer-hitches.js',
 './c360-showcase-exact.js',
 './c360-field-route-guard.js',
 './c360-fuel-type.js'
];
function loadStyle(href){return new Promise((resolve,reject)=>{const base=href.split('?')[0];const existing=[...document.querySelectorAll('link[rel="stylesheet"]')].find(l=>{try{return new URL(l.href,location.href).pathname.endsWith(base.replace(/^\.\//,''))}catch{return false}});if(existing)return resolve();const l=document.createElement('link');l.rel='stylesheet';l.href=href+(href.includes('?')?'&':'?')+'v='+encodeURIComponent(BOOT_VERSION);l.dataset.c360Style=base;l.onload=resolve;l.onerror=()=>reject(new Error('Falha ao carregar '+base));document.head.appendChild(l)})}
function loadScript(src){return new Promise((resolve,reject)=>{const base=src.split('?')[0];const existing=[...document.scripts].find(s=>{try{return new URL(s.src,location.href).pathname.endsWith(base.replace(/^\.\//,''))}catch{return false}});if(existing){if(existing.dataset.c360Loaded==='1'||existing.readyState==='complete')return resolve();existing.addEventListener('load',resolve,{once:true});existing.addEventListener('error',()=>reject(new Error('Falha ao carregar '+base)),{once:true});setTimeout(resolve,1500);return}const s=document.createElement('script');s.src=src+(src.includes('?')?'&':'?')+'v='+encodeURIComponent(BOOT_VERSION);s.async=false;s.dataset.c360Module=base;s.onload=()=>{s.dataset.c360Loaded='1';resolve()};s.onerror=()=>reject(new Error('Falha ao carregar '+base));document.head.appendChild(s)})}
async function boot(){const errors=[];try{await loadScript(recoveryModule)}catch(e){errors.push(e?.message||String(e))}const safeMode=!!window.__c360SafeMode;const loadedStyles=[];const loadedModules=[recoveryModule];if(!safeMode){for(const href of styles){try{await loadStyle(href);loadedStyles.push(href)}catch(e){errors.push(e?.message||String(e))}}}for(const src of essentialModules){try{await loadScript(src);loadedModules.push(src)}catch(e){errors.push(e?.message||String(e))}}if(!safeMode){for(const src of optionalModules){try{await loadScript(src);loadedModules.push(src)}catch(e){errors.push(e?.message||String(e))}}}window.__c360Bootstrap={version:BOOT_VERSION,recovery:window.__c360RecoveryVersion||null,safeMode,styles:loadedStyles,modules:loadedModules,errors,ready:errors.length===0};if(errors.length)console.error('Comando 360: recursos não carregados:',errors.join(' | '));document.dispatchEvent(new CustomEvent('c360:bootstrap-ready',{detail:window.__c360Bootstrap}))}
boot().catch(e=>{window.__c360Bootstrap={version:BOOT_VERSION,recovery:window.__c360RecoveryVersion||null,safeMode:!!window.__c360SafeMode,styles:[],modules:[recoveryModule],errors:[e?.message||String(e)],ready:false};console.error('Comando 360 bootstrap',e);document.dispatchEvent(new CustomEvent('c360:bootstrap-ready',{detail:window.__c360Bootstrap}))});
})();