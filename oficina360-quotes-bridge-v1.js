(()=>{
'use strict';

function toast(message){
  const el=document.querySelector('#toast');
  if(!el)return;
  el.textContent=message;el.classList.add('show');
  clearTimeout(window.__o360QuoteBridgeToast);window.__o360QuoteBridgeToast=setTimeout(()=>el.classList.remove('show'),2600);
}

// O módulo principal carrega a frota de forma assíncrona. Dispara uma única
// sincronização quando o seletor receber a primeira condução.
let attempts=0;
const contextTimer=setInterval(()=>{
  attempts+=1;
  const picker=document.querySelector('#vehiclePicker');
  if(picker?.value&&window.Oficina360Quotes){
    picker.dispatchEvent(new Event('change',{bubbles:true}));
    clearInterval(contextTimer);
  }else if(attempts>80){clearInterval(contextTimer)}
},200);

// window.open com noopener pode devolver null em alguns navegadores, impedindo
// a montagem da janela de impressão. Mantém a proteção para links externos e
// abre apenas a janela vazia de impressão sem o terceiro argumento.
const nativeOpen=window.open.bind(window);
window.open=function(url,target,features){
  if((url===''||url===undefined)&&typeof features==='string'&&/(noopener|noreferrer)/.test(features)){
    return nativeOpen(url||'',target||'_blank');
  }
  return nativeOpen(url,target,features);
};

// Orçamento convertido é histórico da OS e não pode mais ser editado.
document.addEventListener('click',ev=>{
  const edit=ev.target.closest?.('[data-action="edit"]');
  if(!edit)return;
  const card=edit.closest('.quote-card');
  if(card&&card.textContent.includes('Convertido em OS')){
    ev.preventDefault();ev.stopImmediatePropagation();
    toast('Este orçamento já virou OS e está bloqueado para edição.');
  }
},true);

function augmentCatalog(){
  document.querySelectorAll('#catalogGroups .part-row').forEach(row=>{
    if(row.querySelector('.quote-add-part'))return;
    const status=row.querySelector('.part-status');if(!status)return;
    const name=row.querySelector('.part-name')?.textContent?.trim()||'Peça';
    const rawOem=row.querySelector('.part-oem')?.textContent?.trim()||'';
    const oem=rawOem.startsWith('OEM ')?rawOem.slice(4).trim():'';
    const btn=document.createElement('button');
    btn.type='button';btn.className='btn soft quote-add-part';btn.textContent='+ Orçamento';
    btn.title='Adicionar esta peça a um novo orçamento';
    btn.addEventListener('click',ev=>{
      ev.preventDefault();ev.stopPropagation();
      if(!window.Oficina360Quotes?.addComponent)return toast('Módulo de orçamento ainda está carregando.');
      window.Oficina360Quotes.addComponent({name,oem_part_number:oem||null});
    });
    status.appendChild(btn);
  });
}

const catalog=document.querySelector('#catalogGroups');
if(catalog){
  new MutationObserver(augmentCatalog).observe(catalog,{childList:true,subtree:true});
  augmentCatalog();
}
})();
