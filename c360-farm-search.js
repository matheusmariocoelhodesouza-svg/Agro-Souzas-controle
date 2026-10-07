(()=>{
'use strict';
const VERSION='2026.10.07-farm-search2';
let cached={company:'',at:0,rows:[]};
const normalize=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const stop=new Set('a o as os da do das dos de d e em no na nos nas um uma me eu voce vc por favor pfv preciso quero ver veja mostre mostra mostrar mande enviar envie retorna retornar local localizacao localizar localize fica ficam esta estao onde qual endereco link links maps mapa mapas rota caminho acesso banco nosso nossa granja granjas fazenda fazendas propriedade propriedades produtor produtores integrado integrados sitio sitios chacara chacaras para pra como chegar ate consegue poderia pode encontre encontrar busque busca buscar procure procurar pesquise pesquisar ache achar'.split(' '));
function hasFarmContext(question){return /\b(granja\w*|fazenda\w*|propriedade\w*|produtor\w*|integrado\w*|sitio\w*|chacara\w*)\b/.test(normalize(question))}
function terms(question){return normalize(question).split(' ').filter(word=>word&&!stop.has(word))}
function isLocationQuestion(question){const text=normalize(question);return /\b(localizacao|localiz\w*|onde fica\w*|onde esta\w*|endereco|maps|mapa\w*|rota|como chegar)\b/.test(text)||(hasFarmContext(question)&&/\b(encontre|encontrar|busque|buscar|procure|procurar|pesquise|pesquisar|ache|achar)\b/.test(text))}
function search(rows,question){
 const words=terms(question);if(!words.length)return[];
 return rows.filter(row=>!['inactive','archived'].includes(row.status)).map(row=>{
  const name=normalize([row.producer_name,row.farm_name,row.city].filter(Boolean).join(' ')),tokens=new Set(name.split(' '));
  if(words.some(word=>/^\d+$/.test(word)&&!tokens.has(word)))return{row,score:0};
  const matches=words.filter(word=>tokens.has(word)).length;
  const minimum=words.length>=3?Math.max(2,Math.ceil(words.length*.65)):words.length;
  return{row,score:matches>=minimum?matches/words.length:0};
 }).filter(item=>item.score>0).sort((a,b)=>b.score-a.score||String(a.row.farm_name||a.row.producer_name).localeCompare(String(b.row.farm_name||b.row.producer_name),'pt-BR')).map(item=>item.row);
}
function mapsUrl(row){
 const stored=row.metadata?.google_maps_url||row.metadata?.maps_url||row.address?.google_maps_url;
 if(stored){
  try{
   const url=new URL(stored);
   const valid=url.protocol==='https:'&&!url.username&&!url.password&&(url.hostname==='maps.app.goo.gl'||url.hostname==='maps.google.com'||(url.hostname==='goo.gl'&&url.pathname.startsWith('/maps/'))||(['google.com','www.google.com'].includes(url.hostname)&&url.pathname.startsWith('/maps')));
   if(valid)return String(stored);
  }catch(_){}
 }
 const lat=row.latitude,lng=row.longitude;
 if(lat!==null&&lat!==undefined&&lat!==''&&lng!==null&&lng!==undefined&&lng!==''&&Number.isFinite(Number(lat))&&Number.isFinite(Number(lng))&&Math.abs(Number(lat))<=90&&Math.abs(Number(lng))<=180)return 'https://www.google.com/maps?q='+encodeURIComponent(Number(lat)+','+Number(lng));
 return null;
}
async function load(){
 const company=typeof companyId!=='undefined'?companyId:window.companyId;
 if(!company)throw new Error('Entre na empresa antes de consultar as granjas.');
 if(cached.company===company&&Date.now()-cached.at<60000)return cached.rows;
 let rows=[];
 if(navigator.onLine===false){
  if(typeof offlineCacheGet==='function'&&typeof offlineTeamKey==='function')rows=(await offlineCacheGet(offlineTeamKey('poultry_context')))?.farms||[];
  if(!rows.length)throw new Error('O catálogo de granjas ainda não está disponível offline neste aparelho.');
 }else{
  const request=typeof rest==='function'?rest:window.v2Rest;
  if(typeof request!=='function')throw new Error('A consulta de granjas ainda está carregando.');
  for(let offset=0;;offset+=500){
   const page=await request('v2_poultry_farms','select=id,company_id,producer_name,farm_name,city,address,latitude,longitude,status,metadata&company_id=eq.'+encodeURIComponent(company)+'&status=eq.active&order=producer_name.asc,id.asc&limit=500&offset='+offset);
   if(!Array.isArray(page))throw new Error('Não foi possível ler o catálogo de granjas.');
   rows.push(...page);if(page.length<500)break;
   if(offset>=9500)throw new Error('O catálogo é muito grande para esta consulta. Informe um nome mais específico.');
  }
 }
 // RLS remains authoritative; also reject unexpected rows from another company.
 rows=rows.filter(row=>!row.company_id||row.company_id===company);
 cached={company,at:Date.now(),rows};return rows;
}
async function answer(question){
 if(!isLocationQuestion(question))return null;
 const words=terms(question);
 if(!words.length)return hasFarmContext(question)?'Diga o nome da granja ou do produtor para eu consultar a localização cadastrada.':null;
 const matches=search(await load(),question);
 if(!matches.length)return hasFarmContext(question)?'Não encontrei esse nome entre as granjas ativas da empresa. Confira o nome do produtor ou da propriedade.':null;
 const lines=matches.slice(0,10).map(row=>{
  const name=row.farm_name||row.producer_name||'Granja',url=mapsUrl(row);
  return name+(row.city?' · '+row.city:'')+'\n'+(url||'Localização ainda não cadastrada.');
 });
 return (matches.length>1?'Encontrei '+matches.length+' cadastros. Confira a propriedade desejada:\n\n':'Localização cadastrada:\n\n')+lines.join('\n\n')+(matches.length>10?'\n\nMostrando 10 resultados. Inclua a cidade ou o número da propriedade para refinar.':'');
}
window.C360FarmSearch={version:VERSION,normalize,terms,search,mapsUrl,answer,clear(){cached={company:'',at:0,rows:[]}}};
})();
