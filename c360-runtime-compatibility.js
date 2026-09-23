(()=>{
'use strict';
if(window.C360_RUNTIME_COMPATIBILITY_VERSION)return;
const VERSION='2026.09.23-compat1';
function ensureHidden(id){
 let el=document.getElementById(id);if(el)return el;
 el=document.createElement('input');el.type='hidden';el.id=id;
 (document.getElementById('poultryForm')||document.body||document.documentElement).appendChild(el);
 return el;
}
function ensureMessage(){
 let el=document.getElementById('aviaryMsg');if(el)return el;
 el=document.createElement('div');el.id='aviaryMsg';el.className='muted hidden';
 (document.getElementById('poultryForm')||document.body||document.documentElement).appendChild(el);
 return el;
}
function ensure(){ensureHidden('poSavedAviary');ensureMessage()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensure,{once:true});else ensure();
new MutationObserver(()=>{if(!document.getElementById('poSavedAviary')||!document.getElementById('aviaryMsg'))ensure()}).observe(document.documentElement,{subtree:true,childList:true});
window.C360_RUNTIME_COMPATIBILITY_VERSION=VERSION;
})();