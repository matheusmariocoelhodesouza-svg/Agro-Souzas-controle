(()=>{
'use strict';
const VERSION='2026.09.13-premium2';
const METRIC_SELECTOR='.v2kpi,.fleet-kpi,.finance-kpi,.rh-kpi-card,.dash-stat,.dash-month,.c360-dda-kpi';
const clean=s=>String(s||'').replace(/\s+/g,' ').trim().toLowerCase();
function textOf(el){
  const label=el.querySelector('.t,.finance-kpi-label,.rh-kpi-label,span,small');
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
  if(/litro|combust|diesel|abaste/.test(text))return '⛽';
  if(/pre[cç]o|custo/.test(text))return '🪙';
  if(/km|quilometr|dist[aâ]ncia|rodado/.test(text))return '🛣️';
  if(/gasto|valor|saldo|receita|fatur|pago/.test(text))return '💳';
  if(/equipe/.test(text))return '👥';
  if(/celular/.test(text))return '📱';
  if(/funcion|presen|ponto/.test(text))return '🕒';
  if(/ve[ií]culo|frota|condu[cç]/.test(text))return '🚐';
  if(/manuten|revis/.test(text))return '🔧';
  if(/estoque|insumo|produto/.test(text))return '📦';
  if(/apanha|aves|frango/.test(text))return '🐔';
  if(/alerta|venc/.test(text))return '⚠️';
  if(/erro|atras|perda|morte/.test(text))return '⛔';
  if(/conclu|ativo|online/.test(text))return '✓';
  return '▥';
}
function decorateMetric(el,index){
  if(!el||el.dataset.c360PremiumMetric==='1')return;
  const text=textOf(el);
  if(!text)return;
  el.classList.add('c360-pro-metric');
  el.dataset.c360Tone=toneFor(text,index);
  el.dataset.c360PremiumMetric='1';
  if(!el.querySelector('.c360-metric-icon')){
    const icon=document.createElement('span');
    icon.className='c360-metric-icon';
    icon.setAttribute('aria-hidden','true');
    icon.textContent=iconFor(text);
    el.insertBefore(icon,el.firstChild);
  }
}
function upgrade(root=document){
  const metrics=[...root.querySelectorAll?.(METRIC_SELECTOR)||[]];
  metrics.forEach(decorateMetric);
  document.documentElement.dataset.c360PremiumTheme=VERSION;
}
let timer=0;
function schedule(root=document){clearTimeout(timer);timer=setTimeout(()=>upgrade(root),45)}
document.addEventListener('c360:bootstrap-ready',()=>schedule());
document.addEventListener('click',()=>schedule(),true);
document.addEventListener('change',()=>schedule(),true);
new MutationObserver(muts=>{
  let relevant=false;
  for(const m of muts){if(m.addedNodes?.length||m.type==='characterData'){relevant=true;break}}
  if(relevant)schedule();
}).observe(document.documentElement,{subtree:true,childList:true,characterData:true});
window.addEventListener('resize',()=>schedule());
schedule();
window.__c360PremiumTheme={version:VERSION,refresh:()=>upgrade()};
})();
