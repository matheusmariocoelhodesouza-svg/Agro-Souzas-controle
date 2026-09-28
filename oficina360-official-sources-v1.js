(()=>{
'use strict';

const SOURCES={
  sprinter:{
    title:'Mercedes-Benz Sprinter',
    note:'Consulta oficial da Sprinter sem copiar banco de terceiros. O Oficina 360 mantém no próprio catálogo apenas referências verificadas da nossa frota.',
    sources:[
      {name:'Mercedes-Benz Vans — Peças Genuínas',type:'PÚBLICO',desc:'Consulta oficial de peças genuínas e preços sugeridos por número/descrição e região.',url:'https://www2.mercedes-benz.com.br/vans/services/genuine-parts.html'},
      {name:'XENTRY Parts Information',type:'PORTAL OFICIAL',desc:'Identificação por VIN, listas de peças e navegação visual. O acesso ao catálogo pode exigir conta/credencial Mercedes-Benz.',url:'https://b2bconnect.mercedes-benz.com/pt/shop/workshop-solutions/parts-information'},
      {name:'Mercedes-Benz B2B Connect',type:'OFICIAL',desc:'Portal técnico Mercedes-Benz para oficina, peças e documentação.',url:'https://b2bconnect.mercedes-benz.com/pt/'},
    ]
  },
  comil:{
    title:'VW/Comil',
    note:'Para o Comil, separamos chassi Volkswagen, carroceria Comil e motor MWM. Cada fonte abre no fabricante correto.',
    sources:[
      {name:'Volkswagen Caminhões e Ônibus — Peças e Acessórios',type:'PÚBLICO',desc:'Peças originais, portfólio e canais oficiais VWCO.',url:'https://www.vwco.com.br/servicos/Pe%C3%A7as%20e%20Acess%C3%B3rios?id=10'},
      {name:'Comil Assist',type:'PÚBLICO',desc:'Pós-venda oficial Comil, assistência técnica e rede de reposição de peças da carroceria.',url:'https://www2.comilonibus.com.br/comil-assist'},
      {name:'MWM — FAQ técnico e peças',type:'PÚBLICO',desc:'Orientações oficiais para identificação de peças pelo número de série do motor; o catálogo genuíno completo é restrito à rede autorizada.',url:'https://mwm.com.br/pt/faq/'},
    ]
  },
  volare:{
    title:'Marcopolo/Volare',
    note:'A carroceria/veículo Volare e o motor MWM são tratados separadamente para evitar misturar aplicações.',
    sources:[
      {name:'Volare — Pós-vendas',type:'PÚBLICO',desc:'Portal oficial de pós-venda, assistência e manuais.',url:'https://www.volare.com.br/pos-vendas'},
      {name:'Volare — Manuais',type:'PÚBLICO',desc:'Manuais do proprietário e materiais técnicos disponibilizados pela Volare.',url:'https://sac.volare.com.br/pos-vendas/manuais'},
      {name:'Volare — Peças e catálogos',type:'OFICIAL',desc:'Área oficial de peças/catálogos. Alguns conteúdos exigem identificação específica.',url:'https://sac.volare.com.br/pos-vendas/pecas-catalogos'},
      {name:'MWM — FAQ técnico e peças',type:'PÚBLICO',desc:'Orientações oficiais para identificar peças pelo número de série do motor.',url:'https://mwm.com.br/pt/faq/'},
    ]
  },
  mb608:{
    title:'Mercedes-Benz 608',
    note:'Para a 608 antiga, o Oficina 360 prioriza referências verificadas no nosso banco e usa os canais Mercedes-Benz/MWM como apoio, sem presumir compatibilidade de catálogo moderno.',
    sources:[
      {name:'Mercedes-Benz — Peças Genuínas',type:'PÚBLICO',desc:'Canal oficial de peças Mercedes-Benz e rede autorizada.',url:'https://www2.mercedes-benz.com.br/passengercars/services/genuine-parts.html'},
      {name:'Mercedes-Benz B2B Connect',type:'OFICIAL',desc:'Portal técnico Mercedes-Benz; disponibilidade de informações depende da linha e do acesso.',url:'https://b2bconnect.mercedes-benz.com/pt/'},
      {name:'MWM — FAQ técnico e peças',type:'PÚBLICO',desc:'Apoio para referências MWM/Master Parts quando houver aplicação documentada.',url:'https://mwm.com.br/pt/faq/'},
    ]
  },
  generic:{
    title:'Fontes técnicas do veículo',
    note:'Não há um pacote oficial pré-configurado para esta condução. O Oficina 360 continua usando o catálogo interno e permite consultar fontes externas sem copiar bases protegidas.',
    sources:[]
  }
};

function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function selectedVehicleText(){
  const p=document.querySelector('#vehiclePicker');
  const option=p?.selectedOptions?.[0];
  return [option?.textContent,document.querySelector('#vehicleHero')?.textContent,document.querySelector('#technicalProfile')?.textContent].filter(Boolean).join(' ').toLowerCase();
}
function vehicleKind(){
  const t=selectedVehicleText();
  if(/sprinter|ejw6a76|903\.662|om611/.test(t))return 'sprinter';
  if(/comil|cpi6c79|9\.?150|4\.12\s*tce/.test(t))return 'comil';
  if(/volare|mbj1166|4\.07\s*tca/.test(t))return 'volare';
  if(/\b608\b|byh8j61|om314/.test(t))return 'mb608';
  return 'generic';
}
function readDetail(label){
  const rows=[...document.querySelectorAll('#technicalProfile .detail')];
  const row=rows.find(x=>(x.querySelector('span')?.textContent||'').trim().toLowerCase().includes(label.toLowerCase()));
  return (row?.querySelector('b')?.textContent||'').trim();
}
function vehicleIdentity(){
  const p=document.querySelector('#vehiclePicker');
  const name=p?.selectedOptions?.[0]?.textContent?.trim()||'Condução';
  return {name,vin:readDetail('VIN / chassi'),engine:readDetail('Motor'),engineSerial:readDetail('Nº motor')};
}
function copyText(text){
  if(!text||text==='—')return;
  navigator.clipboard?.writeText(text).then(()=>showToast('Copiado: '+text)).catch(()=>{});
}
function showToast(text){
  const t=document.querySelector('#toast');
  if(!t)return;
  t.textContent=text;t.classList.add('show');
  clearTimeout(window.__o360OfficialSourcesToast);
  window.__o360OfficialSourcesToast=setTimeout(()=>t.classList.remove('show'),2200);
}
function injectStyles(){
  if(document.querySelector('#o360OfficialSourcesStyle'))return;
  const s=document.createElement('style');s.id='o360OfficialSourcesStyle';s.textContent=`
  .official-source-hero{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:18px;align-items:center;padding:20px;border:1px solid rgba(136,166,199,.22);border-radius:18px;background:linear-gradient(135deg,rgba(20,37,60,.86),rgba(9,18,31,.92));margin-bottom:18px}
  .official-source-hero h3{margin:4px 0 6px;font-size:1.35rem}.official-source-hero p{margin:0;color:#a9b9cb;max-width:780px;line-height:1.55}
  .official-identity{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.official-id-pill{display:inline-flex;align-items:center;gap:7px;border:1px solid rgba(136,166,199,.22);background:rgba(255,255,255,.035);border-radius:999px;padding:7px 10px;font-size:.82rem;color:#c9d6e4}.official-id-pill button{border:0;background:transparent;color:#8ec5ff;cursor:pointer;padding:0}
  .official-source-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:14px}.official-source-card{border:1px solid rgba(136,166,199,.18);background:rgba(12,23,39,.82);border-radius:16px;padding:16px;display:flex;flex-direction:column;gap:10px;min-height:180px}.official-source-card h4{margin:0;font-size:1rem}.official-source-card p{margin:0;color:#9fb0c2;line-height:1.5;font-size:.9rem}.official-source-card .src-tag{width:max-content;border:1px solid rgba(83,192,132,.3);background:rgba(83,192,132,.09);color:#8ed9af;border-radius:999px;padding:4px 8px;font-size:.7rem;font-weight:800;letter-spacing:.04em}.official-source-card a{margin-top:auto;text-decoration:none;text-align:center}.official-source-rule{margin-top:18px;padding:15px 16px;border-radius:14px;border:1px solid rgba(245,184,73,.2);background:rgba(245,184,73,.06);color:#c8d3df;line-height:1.55}.official-source-rule strong{color:#f5c46d}.official-source-empty{padding:24px;border:1px dashed rgba(136,166,199,.25);border-radius:14px;color:#9fb0c2}
  @media(max-width:720px){.official-source-hero{grid-template-columns:1fr}.official-source-grid{grid-template-columns:1fr}.official-source-hero .btn{width:100%}}
  `;document.head.appendChild(s);
}
function ensureUi(){
  if(document.querySelector('[data-tab="official-sources"]'))return;
  const nav=document.querySelector('.side-nav');
  const content=document.querySelector('.content');
  if(!nav||!content)return;
  const btn=document.createElement('button');btn.type='button';btn.dataset.tab='official-sources';btn.innerHTML='<span>↗</span> Fontes oficiais';
  const diagnostics=nav.querySelector('[data-tab="diagnostics"]');
  diagnostics?diagnostics.insertAdjacentElement('afterend',btn):nav.appendChild(btn);
  const section=document.createElement('section');section.id='tab-official-sources';section.className='tab';section.innerHTML='<div id="officialSourcesRoot"></div>';
  content.appendChild(section);
  btn.addEventListener('click',()=>{
    document.querySelectorAll('.side-nav button[data-tab]').forEach(b=>b.classList.toggle('active',b===btn));
    document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x===section));
    const title=document.querySelector('#pageTitle');if(title)title.textContent='Fontes oficiais';
    render();
  });
}
function render(){
  const root=document.querySelector('#officialSourcesRoot');if(!root)return;
  const kind=vehicleKind(),pack=SOURCES[kind]||SOURCES.generic,id=vehicleIdentity();
  const ids=[id.vin&&id.vin!=='—'?`<span class="official-id-pill">VIN/chassi <b>${esc(id.vin)}</b> <button type="button" data-copy="${esc(id.vin)}">copiar</button></span>`:'',id.engine&&id.engine!=='—'?`<span class="official-id-pill">Motor <b>${esc(id.engine)}</b></span>`:'',id.engineSerial&&id.engineSerial!=='—'?`<span class="official-id-pill">Nº motor <b>${esc(id.engineSerial)}</b> <button type="button" data-copy="${esc(id.engineSerial)}">copiar</button></span>`:''].filter(Boolean).join('');
  const cards=pack.sources.length?pack.sources.map(s=>`<article class="official-source-card"><span class="src-tag">${esc(s.type)}</span><h4>${esc(s.name)}</h4><p>${esc(s.desc)}</p><a class="btn soft" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">Abrir fonte oficial ↗</a></article>`).join(''):'<div class="official-source-empty">Nenhuma fonte pública pré-configurada para esta condução. Continue usando o catálogo interno e cadastre referências verificadas conforme forem confirmadas.</div>';
  root.innerHTML=`<div class="section-head"><div><span class="eyebrow">CONSULTA TÉCNICA</span><h2>Fontes oficiais do fabricante</h2><p>Atalhos por condução, sem espelhar nem raspar catálogos protegidos.</p></div></div><div class="official-source-hero"><div><span class="eyebrow">${esc(id.name)}</span><h3>${esc(pack.title)}</h3><p>${esc(pack.note)}</p><div class="official-identity">${ids}</div></div><button class="btn primary" type="button" id="officialOpenCatalog">Abrir nosso catálogo</button></div><div class="official-source-grid">${cards}</div><div class="official-source-rule"><strong>Regra do Oficina 360:</strong> consultar a fonte oficial e registrar no nosso banco somente a referência necessária para a nossa condução, com origem e status de verificação. Não copiar catálogo inteiro, imagens EPC ou base protegida. Assim o sistema cresce peça por peça sem depender de licença de redistribuição.</div>`;
  root.querySelectorAll('[data-copy]').forEach(b=>b.addEventListener('click',()=>copyText(b.dataset.copy)));
  root.querySelector('#officialOpenCatalog')?.addEventListener('click',()=>document.querySelector('.side-nav [data-tab="catalog"]')?.click());
}
function boot(){
  injectStyles();ensureUi();render();
  document.querySelector('#vehiclePicker')?.addEventListener('change',()=>setTimeout(render,450));
  const target=document.querySelector('#technicalProfile');
  if(target)new MutationObserver(()=>render()).observe(target,{childList:true,subtree:true,characterData:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,0),{once:true});else setTimeout(boot,0);
})();
