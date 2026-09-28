(()=>{
'use strict';
if(window.__c360PayrollLinkInstalled)return;
window.__c360PayrollLinkInstalled=true;

function go(){location.href='./pagamentos-folha.html'}
function install(){
 const finance=document.getElementById('financeiro');
 if(!finance)return;
 const newBtn=document.getElementById('newFinEntryBtn');
 if(newBtn&&!document.getElementById('openPayrollPayments')){
  const b=document.createElement('button');
  b.type='button';b.className='btn soft';b.id='openPayrollPayments';b.innerHTML='👥 PAGAMENTOS &amp; FOLHA';
  b.addEventListener('click',go);
  newBtn.insertAdjacentElement('beforebegin',b);
 }
 const sideFinance=document.querySelector('.v2navbtn[data-v2tab="financeiro"]');
 if(sideFinance&&!document.getElementById('payrollSideLink')){
  const b=document.createElement('button');
  b.type='button';b.className='v2navbtn';b.id='payrollSideLink';b.innerHTML='🧾 &nbsp; Pagamentos &amp; Folha';
  b.addEventListener('click',go);
  sideFinance.insertAdjacentElement('afterend',b);
 }
}
install();
document.addEventListener('c360:screen-changed',e=>{if(String(e?.detail?.screen||'').includes('finance'))install()});
})();
