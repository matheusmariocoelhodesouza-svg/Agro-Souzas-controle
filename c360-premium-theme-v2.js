(()=>{
'use strict';
const VERSION='2026.09.13-showcase4';
const METRIC_SELECTOR='.v2kpi,.fleet-kpi,.finance-kpi,.rh-kpi-card,.dash-stat,.dash-month,.c360-dda-kpi,.maintenance-kpi,.integration-stat';
const clean=s=>String(s||'').replace(/\s+/g,' ').trim().toLowerCase();
function textOf(el){
  const label=el.querySelector('.t,.finance-kpi-label,.rh-kpi-label,.label,span:not(.c360-metric-icon):not(.c360-metric-spark),small');
  return clean(label?.textContent||el.textContent);
}
function toneFor(text,index=0){
  if(/litro|quantidade|estoque atual|conclu|ativo|online|presen|funcion[aá]rio com registro|aves/.test(text))return 'green';
  if(/pre[cç]o|custo m[eé]dio|manuten|pendente|alerta|venc/.test(text))return 'amber';
  if(/km|quilometr|rodado|dist[aâ]ncia|entre abaste/.test(text))return 'purple';
  if(/erro|atras|inativo|parado|morte|perda|despesa/.test(text))return 'red';
  if(/equipe|celular|document|rh|ponto|insumo|produto/.test(text))return 'cyan';
  if(/gasto|valor|receita|saldo|fatur|finance|compra|pago|total/.test(text))return 'blue';
  return ['blue','green','amber','purple','cyan'][index%5];
}
const svg=body=>'<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">'+body+'</svg>';
function iconSvgFor(text){
  if(/litro/.test(text))return svg('<path d="M12 2.7s6 6.6 6 11a6 6 0 0 1-12 0c0-4.4 6-11 6-11Z"/>');
  if(/combust|diesel|abaste/.test(text))return svg('<path d="M5 21V4a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v17"/><path d="M4 21h12M7 7h6v5H7zM15 8h2l2 2v7a2 2 0 0 0 2 2h0V9l-2-2"/>');
  if(/pre[cç]o|custo/.test(text))return svg('<circle cx="12" cy="12" r="9"/><path d="M15.2 8.5c-.7-.8-1.8-1.3-3.1-1.3-1.8 0-3.1.9-3.1 2.2 0 3.2 6.6 1.4 6.6 4.7 0 1.5-1.4 2.5-3.5 2.5-1.5 0-2.8-.5-3.7-1.5M12 5.5v13"/>');
  if(/km|quilometr|dist[aâ]ncia|rodado/.test(text))return svg('<path d="M6 19c-2.2-1.3-3.5-3.2-3.5-5.5C2.5 9.4 6.7 6 12 6s9.5 3.4 9.5 7.5c0 2.3-1.3 4.2-3.5 5.5"/><path d="M12 14l4-4M8 18h8"/>');
  if(/gasto|valor|saldo|receita|fatur|pago/.test(text))return svg('<path d="M3 7.5h15a3 3 0 0 1 3 3v7.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7.5Z"/><path d="M3 7.5V6a2 2 0 0 1 2-2h11M16 13h5"/><circle cx="17" cy="13" r=".6"/>');
  if(/equipe/.test(text))return svg('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>');
  if(/celular/.test(text))return svg('<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>');
  if(/funcion|presen|ponto/.test(text))return svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>');
  if(/ve[ií]culo|frota|condu[cç]/.test(text))return svg('<rect x="3" y="6" width="18" height="11" rx="2"/><path d="M5 17v2M19 17v2M6 9h12M7 13h2M15 13h2"/>');
  if(/manuten|revis/.test(text))return svg('<path d="M14.7 6.3a4 4 0 0 0-5-5L7.4 3.6l3 3-3.1 3.1-3-3L2 9a4 4 0 0 0 5 5l7.7 7.7a2.1 2.1 0 0 0 3-3L10 11"/>');
  if(/estoque|insumo|produto/.test(text))return svg('<path d="M4 7.5 12 3l8 4.5-8 4.5-8-4.5Z"/><path d="M4 7.5V16l8 5 8-5V7.5M12 12v9"/>');
  if(/apanha|aves|frango/.test(text))return svg('<path d="M5 17c4-1 6-4 7-8 2 2 4 2 7 1-1 5-4 9-9 9H6"/><path d="M15 7c0-2 1-3 3-4M18 3l2 1-2 1M7 19v2M11 19v2"/>');
  if(/alerta|venc/.test(text))return svg('<path d="M12 3 2.5 20h19L12 3Z"/><path d="M12 9v4M12 17h.01"/>');
  if(/erro|atras|perda|morte/.test(text))return svg('<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6m0-6-6 6"/>');
  if(/conclu|ativo|online/.test(text))return svg('<circle cx="12" cy="12" r="9"/><path d="m8 12 2.6 2.6L16.5 9"/>');
  return svg('<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>');
}
function decorateMetric(el,index){
  if(!el)return;
  const text=textOf(el);
  if(!text)return;
  el.classList.add('c360-pro-metric');
  el.dataset.c360Tone=toneFor(text,index);
  el.dataset.c360PremiumMetric='1';
  let icon=el.querySelector('.c360-metric-icon');
  if(!icon){icon=document.createElement('span');icon.className='c360-metric-icon';icon.setAttribute('aria-hidden','true');el.insertBefore(icon,el.firstChild)}
  icon.innerHTML=iconSvgFor(text);
  if(!el.querySelector('.c360-metric-spark')){
    const spark=document.createElement('span');spark.className='c360-metric-spark';spark.setAttribute('aria-hidden','true');spark.innerHTML='<i></i><i></i><i></i>';el.appendChild(spark);
  }
}
function actionIconFor(text){
  if(/abastec/.test(text))return '⛽';
  if(/km|quilometr/.test(text))return '◉';
  if(/ve[ií]culo|frota|condu[cç]/.test(text))return '▰';
  if(/manuten|revis/.test(text))return '🔧';
  if(/funcion|pessoa|rh/.test(text))return '♙';
  if(/apanha|opera[cç]/.test(text))return '🐔';
  if(/insumo|produto/.test(text))return '▣';
  if(/finance|receita|despesa|lan[cç]/.test(text))return 'R$';
  return '+';
}
function decorateAction(btn){
  if(!btn||btn.classList.contains('danger'))return;
  const text=clean(btn.textContent);
  if(!/^\+|novo|nova|registrar|adicionar|cadastrar|importar|lan[cç]ar/.test(text))return;
  btn.classList.add('c360-showcase-cta');
  let icon=btn.querySelector('.c360-action-icon');
  if(!icon){icon=document.createElement('span');icon.className='c360-action-icon';icon.setAttribute('aria-hidden','true');btn.insertBefore(icon,btn.firstChild)}
  icon.textContent=actionIconFor(text);
  if(!btn.querySelector('.c360-action-arrow')){const arrow=document.createElement('span');arrow.className='c360-action-arrow';arrow.setAttribute('aria-hidden','true');arrow.textContent='›';btn.appendChild(arrow)}
}
function upgrade(root=document){
  const metrics=[...root.querySelectorAll?.(METRIC_SELECTOR)||[]];
  metrics.forEach(decorateMetric);
  [...root.querySelectorAll?.('.section>.card:first-child .toolbar .btn,.v2hero .btn,.v2hero .v2new')||[]].forEach(decorateAction);
  document.documentElement.dataset.c360PremiumTheme=VERSION;
}
let timer=0;
function schedule(){clearTimeout(timer);timer=setTimeout(()=>upgrade(document),45)}
document.addEventListener('c360:bootstrap-ready',schedule);
document.addEventListener('click',schedule,true);
document.addEventListener('change',schedule,true);
new MutationObserver(muts=>{
  for(const m of muts){if(m.addedNodes?.length||m.type==='characterData'){schedule();break}}
}).observe(document.documentElement,{subtree:true,childList:true,characterData:true});
window.addEventListener('resize',schedule);
schedule();
window.__c360PremiumTheme={version:VERSION,refresh:()=>upgrade(document)};
})();
