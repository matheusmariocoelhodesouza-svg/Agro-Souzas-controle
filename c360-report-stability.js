(()=>{
'use strict';
const VERSION='2026.09.22-reports1';
let installed=false;

function text(error){return error?.message||String(error||'Falha inesperada ao gerar o relatório.');}
function renderError(error){
 const message=text(error);
 const host=document.getElementById('reportsKpis');
 const generated=document.getElementById('reportsGeneratedAt');
 if(host)host.innerHTML='<div class="v2panel" style="grid-column:1/-1"><strong>Não foi possível gerar o relatório agora.</strong><div class="muted" style="margin-top:5px">'+String(message).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))+'</div><div class="muted" style="margin-top:5px">Você pode tentar novamente sem sair desta tela.</div></div>';
 if(generated)generated.textContent='Falha ao atualizar • tente novamente';
 try{document.dispatchEvent(new CustomEvent('c360:reports-error',{detail:{message,version:VERSION}}))}catch(_){}
}
function setBusy(busy){
 const button=document.getElementById('refreshReports');
 if(!button)return;
 if(busy){
   if(!button.dataset.c360OriginalText)button.dataset.c360OriginalText=button.textContent||'GERAR';
   button.disabled=true;button.textContent='GERANDO...';
 }else{
   button.disabled=false;button.textContent=button.dataset.c360OriginalText||'GERAR';
 }
}
function install(){
 if(installed)return true;
 const original=window.loadReports;
 if(typeof original!=='function')return false;
 if(original.__c360ReportsStable){installed=true;return true;}
 const wrapped=async function(){
   setBusy(true);
   try{return await original.apply(this,arguments)}
   catch(error){renderError(error);console.error('Comando 360 relatórios',error);return null}
   finally{setBusy(false)}
 };
 wrapped.__c360ReportsStable=true;
 wrapped.__c360Original=original;
 window.loadReports=wrapped;
 installed=true;
 return true;
}
let attempts=0;
const timer=setInterval(()=>{attempts++;if(install()||attempts>=120)clearInterval(timer)},100);
if(document.readyState!=='loading')install();else document.addEventListener('DOMContentLoaded',install,{once:true});
window.C360_REPORT_STABILITY_VERSION=VERSION;
})();