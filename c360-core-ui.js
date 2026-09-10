(function(){
'use strict';
function ensureStyle(){
  if(document.getElementById('c360CoreUiStyle'))return;
  const s=document.createElement('style');
  s.id='c360CoreUiStyle';
  s.textContent=`
    #c360EnvironmentBanner{display:none;position:sticky;top:0;z-index:1000;text-align:center;padding:7px 12px;font:800 12px/1.2 system-ui,-apple-system,Segoe UI,Roboto,Arial;letter-spacing:.04em;background:#fff7ed;color:#9a3412;border-bottom:1px solid #fed7aa}
    body[data-c360-environment="beta"] #c360EnvironmentBanner{display:block}
    body[data-c360-environment="beta"] header{box-shadow:inset 0 3px 0 #f59e0b}
  `;
  document.head.appendChild(s);
}
function ensureBanner(){
  ensureStyle();
  let b=document.getElementById('c360EnvironmentBanner');
  if(!b){
    b=document.createElement('div');
    b.id='c360EnvironmentBanner';
    b.setAttribute('role','status');
    b.textContent='🧪 AMBIENTE DE TESTE — DADOS NÃO PRODUTIVOS';
    document.body.prepend(b);
  }
  return b;
}
function refreshEnvironment(){
  if(!document.body)return;
  const label=String(document.getElementById('companyName')?.textContent||'');
  const profileName=String(window.companyProfile?.trade_name||window.companyProfile?.legal_name||'');
  const isBeta=/\bbeta\b/i.test(label+' '+profileName);
  document.body.dataset.c360Environment=isBeta?'beta':'production';
  ensureBanner();
}
function init(){
  refreshEnvironment();
  const node=document.getElementById('companyName');
  if(node)new MutationObserver(refreshEnvironment).observe(node,{childList:true,subtree:true,characterData:true});
  setInterval(refreshEnvironment,3000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
