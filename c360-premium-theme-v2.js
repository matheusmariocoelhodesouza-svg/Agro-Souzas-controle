(()=>{
'use strict';
const VERSION='2026.09.13-showcase3';
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
function iconFor(text){
  if(/litro/.test(text))return '💧';
  if(/combust|diesel|abaste/.test(text))return '⛽';
  if(/pre[cç]o|custo/.test(text))return '🪙';
  if(/km|quilometr|dist[aâ]ncia|rodado/.test(text))return '🛣';
  if(/gasto|valor|saldo|receita|fatur|pago/.test(text))return '👛';
  if(/equipe/.test(text))return '👥';
  if(/celular/.test(text))return '▯';
  if(/funcion|presen|ponto/.test(text))return '◷';
  if(/ve[ií]culo|frota|condu[cç]/.test(text))return '▰';
  if(/manuten|revis/.test(text))return '🔧';
  if(/estoque|insumo|produto/.test(text))return '▣';
  if(/apanha|aves|frango/.test(text))return '🐔';
  if(/alerta|venc/.test(text))return '⚠';
  if(/erro|atras|perda|morte/.test(text))return '!';
  if(/conclu|ativo|online/.test(text))return '✓';
  return '▦';
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
  icon.textContent=iconFor(text);
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
