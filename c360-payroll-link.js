(()=>{
'use strict';
if(window.__c360PayrollLinkInstalled)return;
window.__c360PayrollLinkInstalled=true;

function go(){location.href='./pagamentos-folha.html'}
function install(){
 const sideFinance=document.querySelector('.v2navbtn[data-v2tab="financeiro"]');
 if(sideFinance&&!document.getElementById('payrollSideLink')){
  const b=document.createElement('button');
  b.type='button';b.className='v2navbtn';b.id='payrollSideLink';b.innerHTML='🧾 &nbsp; Pagamentos &amp; Folha';
  b.addEventListener('click',go);
  sideFinance.insertAdjacentElement('afterend',b);
 }
 const newBtn=document.getElementById('newFinEntryBtn');
 if(newBtn&&!document.getElementById('openPayrollPayments')){
  const b=document.createElement('button');
  b.type='button';b.className='btn soft';b.id='openPayrollPayments';b.innerHTML='👥 PAGAMENTOS &amp; FOLHA';
  b.addEventListener('click',go);
  newBtn.insertAdjacentElement('beforebegin',b);
 }
}
install();
let attempts=0;
const timer=setInterval(()=>{install();if(++attempts>=24||document.getElementById('openPayrollPayments'))clearInterval(timer)},250);
document.addEventListener('c360:screen-changed',e=>{if(String(e?.detail?.screen||e?.detail?.id||'').includes('finance'))setTimeout(install,0)});
const host=document.getElementById('screenHost');
if(host)new MutationObserver(install).observe(host,{childList:true,subtree:true});
})();
