(()=>{
'use strict';
const VERSION='2026.09.13-showcase-exact3';
const METRICS='.v2kpi,.fleet-kpi,.finance-kpi,.rh-kpi-card,.dash-stat,.dash-month,.c360-dda-kpi,.maintenance-kpi,.integration-stat';
const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
const lower=s=>clean(s).toLowerCase();
const esc=s=>String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function originals(el,sel){return [...el.querySelectorAll(sel)].filter(n=>!n.closest('.c360-exact-surface'))}
function valueNode(el){for(const s of ['.v','.finance-kpi-value','.kpi','strong','b']){const n=originals(el,s).find(x=>clean(x.textContent));if(n)return n}return null}
function titleOf(el){
  for(const s of ['.t','.finance-kpi-label','.rh-kpi-label','.label','.fleet-kpi>span:not(.fleet-kpi-icon)','span:not(.c360-metric-icon):not(.c360-metric-spark)']){const n=originals(el,s).find(x=>clean(x.textContent));if(n)return clean(n.textContent)}
  const value=valueNode(el);
  return [...el.children].filter(n=>n!==value&&!n.classList?.contains('c360-metric-icon')&&!n.classList?.contains('c360-metric-spark')&&!n.classList?.contains('c360-exact-surface')).map(n=>clean(n.textContent)).find(Boolean)||'Indicador';
}
function valueOf(el){
  const n=valueNode(el);if(n)return clean(n.textContent);
  const all=[...el.childNodes].filter(n=>!(n.nodeType===1&&n.classList?.contains('c360-exact-surface'))).map(n=>clean(n.textContent)).filter(Boolean);
  return all.find(t=>/(R\$\s*)?[\d.]+(?:,[\d]+)?(?:\s*(?:km|L|%))?/i.test(t))||'—';
}
function toneFor(text,index=0){const t=lower(text);if(/litro|quantidade|estoque atual|conclu|ativo|online|presen|aves/.test(t))return'green';if(/pre[cç]o|custo m[eé]dio|manuten|pendente|alerta|venc/.test(t))return'amber';if(/km|quilometr|rodado|dist[aâ]ncia|entre abaste/.test(t))return'purple';if(/erro|atras|inativo|parado|morte|perda|despesa/.test(t))return'red';if(/equipe|celular|document|rh|ponto|insumo|produto/.test(t))return'cyan';if(/gasto|valor|receita|saldo|fatur|finance|compra|pago|total/.test(t))return'blue';return['blue','green','amber','purple','cyan'][index%5]}
const svg=(body,view='0 0 24 24')=>`<svg viewBox="${view}" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
function iconFor(text){const t=lower(text);
  if(/litro|volume/.test(t))return svg('<path d="M12 2.8S6.5 9.1 6.5 14a5.5 5.5 0 0 0 11 0C17.5 9.1 12 2.8 12 2.8Z"/><path d="M9.2 15.2c.4 1.4 1.5 2.3 3 2.5"/>');
  if(/pre[cç]o|custo/.test(t))return svg('<ellipse cx="9" cy="7" rx="5" ry="2.4"/><path d="M4 7v4c0 1.3 2.2 2.4 5 2.4s5-1.1 5-2.4V7"/><path d="M4 11v4c0 1.3 2.2 2.4 5 2.4 1 0 1.8-.1 2.6-.4"/><ellipse cx="16.5" cy="14.5" rx="4.5" ry="2.2"/><path d="M12 14.5v3.4c0 1.2 2 2.1 4.5 2.1s4.5-.9 4.5-2.1v-3.4"/>');
  if(/km|quilometr|dist[aâ]ncia|rodado/.test(t))return svg('<path d="M7.2 22 9 2h6l1.8 20"/><path d="M12 4v3m0 3v3m0 3v3"/><path d="M5 22h14"/>');
  if(/gasto|valor|saldo|receita|fatur|finance|pago/.test(t))return svg('<path d="M4 7.5h13.5A2.5 2.5 0 0 1 20 10v7.5A2.5 2.5 0 0 1 17.5 20h-13A2.5 2.5 0 0 1 2 17.5v-12A2.5 2.5 0 0 1 4.5 3H16v4.5"/><path d="M15 11h5v5h-5a2.5 2.5 0 1 1 0-5Z"/>');
  if(/equipe|funcion|pessoa|rh/.test(t))return svg('<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20c.6-4 2.7-6 6-6s5.4 2 6 6"/><path d="M14.5 15c3.5-.4 5.7 1.4 6.5 5"/>');
  if(/celular|telefone/.test(t))return svg('<rect x="7" y="2.5" width="10" height="19" rx="2.2"/><path d="M10 5h4M11 18.5h2"/>');
  if(/ponto|hora|tempo|rel[oó]gio/.test(t))return svg('<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.5 2"/>');
  if(/ve[ií]culo|frota|condu[cç]|[oô]nibus|carret/.test(t))return svg('<path d="M4 17V7.5A3.5 3.5 0 0 1 7.5 4h9A3.5 3.5 0 0 1 20 7.5V17"/><path d="M4 13h16M7 17v2M17 17v2M7.5 8h9"/><circle cx="7" cy="16" r="1"/><circle cx="17" cy="16" r="1"/>');
  if(/manuten|revis|oficina/.test(t))return svg('<path d="M14.5 6.2a4 4 0 0 0-5.3 5.3L3.4 17.3a2 2 0 1 0 2.8 2.8l5.8-5.8a4 4 0 0 0 5.3-5.3l-2.8 2.8-2.3-2.3 2.3-3.3Z"/>');
  if(/estoque|insumo|produto/.test(t))return svg('<path d="m4 7 8-4 8 4-8 4-8-4Z"/><path d="M4 7v10l8 4 8-4V7M12 11v10"/>');
  if(/apanha|aves|frango/.test(t))return svg('<path d="M5 17c4-1 6-4 7-8 2 2 4 2 7 1-1 5-4 9-9 9H6"/><path d="M15 7c0-2 1-3 3-4M18 3l2 1-2 1M7 19v2M11 19v2"/>');
  if(/alerta|venc/.test(t))return svg('<path d="M12 3 2.8 19h18.4L12 3Z"/><path d="M12 9v4M12 16.5h.01"/>');
  if(/combust|diesel|abaste/.test(t))return svg('<path d="M6 3h8v18H6z"/><path d="M8.5 6h3M14 7h2l2 2v8.5a1.5 1.5 0 0 0 3 0V10l-2-2"/><path d="M5 21h10"/>');
  return svg('<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>')}
function chart(index){const v=['M0 61 C24 61 30 54 47 54 S73 60 91 49 S117 39 137 43 S164 40 178 27 S193 22 200 25','M0 61 C27 61 36 58 53 52 S82 39 102 44 S130 55 149 43 S179 27 200 33','M0 62 C23 62 35 56 50 58 S81 64 100 54 S127 40 148 45 S174 52 200 34','M0 62 C25 62 36 60 55 54 S80 49 98 53 S129 62 150 48 S181 31 200 29'];const line=v[index%v.length],area=line+' L200 70 L0 70 Z';return `<svg class="c360-exact-chart" viewBox="0 0 200 70" preserveAspectRatio="none" aria-hidden="true"><path class="area" d="${area}"/><path class="line" d="${line}"/></svg>`}
function decorateMetric(el,index){if(!el)return;const title=titleOf(el),value=valueOf(el);if(!title&&!value)return;const tone=toneFor(title,index),sig=`${title}|${value}|${tone}|${index%4}`;el.classList.add('c360-pro-metric','c360-exact-metric');if(el.dataset.c360Tone!==tone)el.dataset.c360Tone=tone;let surface=el.querySelector(':scope > .c360-exact-surface');if(!surface){surface=document.createElement('div');surface.className='c360-exact-surface';el.appendChild(surface)}if(surface.dataset.sig===sig)return;surface.dataset.sig=sig;surface.innerHTML=`<span class="c360-exact-icon">${iconFor(title)}</span><span class="c360-exact-title">${esc(title)}</span><span class="c360-exact-value">${esc(value)}</span><span class="c360-exact-bars" aria-hidden="true"><i></i><i></i><i></i></span>${chart(index)}`}
function actionIcon(text){const t=lower(text);if(/abastec/.test(t))return iconFor('abastecimento combustível');if(/km|quilometr/.test(t))return svg('<path d="M4 16a8 8 0 1 1 16 0"/><path d="M12 16l4-5"/><path d="M6.5 13h.01M17.5 13h.01M9 9h.01M15 9h.01"/>');if(/ve[ií]culo|frota|condu[cç]/.test(t))return iconFor('veículo');if(/manuten|revis/.test(t))return iconFor('manutenção');if(/funcion|pessoa|rh/.test(t))return iconFor('funcionários');if(/apanha|opera[cç]/.test(t))return iconFor('apanha');if(/insumo|produto/.test(t))return iconFor('produto');if(/finance|receita|despesa|lan[cç]/.test(t))return iconFor('financeiro');return svg('<path d="M12 5v14M5 12h14"/>')}
function rawButtonText(btn){const clone=btn.cloneNode(true);clone.querySelectorAll('.c360-action-icon,.c360-action-arrow').forEach(n=>n.remove());return clean(clone.textContent)}
function decorateAction(btn){if(!btn||btn.classList.contains('danger'))return;const raw=rawButtonText(btn),text=lower(raw);if(!/^\+|novo|nova|registrar|adicionar|cadastrar|importar|lan[cç]ar/.test(text))return;const sig=text;btn.classList.add('c360-showcase-cta');if(btn.dataset.c360ExactAction===sig)return;btn.dataset.c360ExactAction=sig;let i=btn.querySelector('.c360-action-icon');if(!i){i=document.createElement('span');i.className='c360-action-icon';btn.insertBefore(i,btn.firstChild)}i.innerHTML=actionIcon(text);let a=btn.querySelector('.c360-action-arrow');if(!a){a=document.createElement('span');a.className='c360-action-arrow';a.setAttribute('aria-hidden','true');btn.appendChild(a)}a.textContent='›'}
function navIcon(name){const t=lower(name);if(/in[ií]cio|home/.test(t))return svg('<path d="m3 11 9-7 9 7"/><path d="M5.5 10v10h13V10M9.5 20v-6h5v6"/>');if(/apanha/.test(t))return iconFor('apanha');if(/ponto/.test(t))return iconFor('ponto');if(/frota/.test(t))return svg('<path d="M4 17V8h12l4 4v5"/><path d="M16 8v4h4M4 13h16"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>');if(/mais|menu/.test(t))return svg('<path d="M4 6h16M4 12h16M4 18h16"/>');return svg('<circle cx="12" cy="12" r="8"/>')}
function decorateNav(){document.querySelectorAll('.mobile-bottom-nav button').forEach(btn=>{const label=clean(btn.querySelector('small')?.textContent||btn.textContent),sig=lower(label),holder=btn.querySelector('span');if(!holder)return;holder.classList.add('c360-exact-nav-icon');if(holder.dataset.c360ExactNav===sig)return;holder.dataset.c360ExactNav=sig;holder.innerHTML=navIcon(label)})}
function upgrade(root=document){[...root.querySelectorAll?.(METRICS)||[]].forEach(decorateMetric);[...root.querySelectorAll?.('.section>.card:first-child .toolbar .btn,.v2hero .btn,.v2hero .v2new')||[]].forEach(decorateAction);decorateNav();document.documentElement.dataset.c360ShowcaseExact=VERSION}
let timer=0;function schedule(){clearTimeout(timer);timer=setTimeout(()=>upgrade(document),70)}
document.addEventListener('c360:bootstrap-ready',schedule);document.addEventListener('click',schedule,true);document.addEventListener('change',schedule,true);
new MutationObserver(ms=>{for(const m of ms){if(m.addedNodes?.length||m.type==='characterData'){schedule();break}}}).observe(document.documentElement,{subtree:true,childList:true,characterData:true});
window.addEventListener('resize',schedule);schedule();window.__c360ShowcaseExact={version:VERSION,refresh:()=>upgrade(document)};
})();
