(()=>{
'use strict';
if(window.__c360ReportShareInstalled)return;
window.__c360ReportShareInstalled=true;

const JSPDF_URL='https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js';
let jsPdfPromise=null;

function num(v){const n=Number(v||0);return Number.isFinite(n)?n:0}
function fmtNum(v){return num(v).toLocaleString('pt-BR')}
function fmtTime(v){if(!v)return '—';const d=new Date(v);if(Number.isNaN(d.getTime()))return '—';return d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}
function fmtDate(v){if(!v)return '—';const d=new Date(v);if(Number.isNaN(d.getTime()))return '—';return d.toLocaleDateString('pt-BR')}
function fmtDuration(a,b){if(!a||!b)return '—';const ms=new Date(b)-new Date(a);if(!Number.isFinite(ms)||ms<0)return '—';const mins=Math.round(ms/60000),h=Math.floor(mins/60),m=mins%60;return h?`${h}h ${String(m).padStart(2,'0')}min`:`${m}min`}
function fileSafe(v){return String(v||'relatorio').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'_').replace(/^_+|_+$/g,'').slice(0,70)||'relatorio'}
function getReports(){try{return typeof teamCatchReports!=='undefined'&&Array.isArray(teamCatchReports)?teamCatchReports:[]}catch(_){return[]}}

function decorateButtons(root=document){
 root.querySelectorAll?.('.catchReportA4').forEach(btn=>{
  btn.classList.add('catchReportWhatsApp');
  btn.textContent='💬 ENVIAR PDF NO WHATSAPP';
  btn.setAttribute('aria-label','Compartilhar relatório PDF no WhatsApp');
  btn.title='Gerar PDF e compartilhar pelo WhatsApp';
 });
}

function watchButtons(){
 const root=document.getElementById('teamReportToday');
 if(!root)return;
 decorateButtons(root);
 const obs=new MutationObserver(()=>decorateButtons(root));
 obs.observe(root,{childList:true,subtree:true});
}

function loadJsPdf(){
 if(window.jspdf?.jsPDF)return Promise.resolve(window.jspdf.jsPDF);
 if(jsPdfPromise)return jsPdfPromise;
 jsPdfPromise=new Promise((resolve,reject)=>{
  const found=[...document.scripts].find(s=>s.src===JSPDF_URL);
  if(found){
   if(window.jspdf?.jsPDF)return resolve(window.jspdf.jsPDF);
   found.addEventListener('load',()=>resolve(window.jspdf?.jsPDF),{once:true});
   found.addEventListener('error',()=>reject(new Error('Não foi possível carregar o gerador de PDF.')),{once:true});
   return;
  }
  const s=document.createElement('script');
  s.src=JSPDF_URL;
  s.async=true;
  s.onload=()=>window.jspdf?.jsPDF?resolve(window.jspdf.jsPDF):reject(new Error('Gerador de PDF indisponível.'));
  s.onerror=()=>reject(new Error('Não foi possível carregar o gerador de PDF.'));
  document.head.appendChild(s);
 });
 return jsPdfPromise;
}

function reportText(r){
 const op=r?.op||{},farm=r?.farm||{},sup=r?.supervisor||{},team=r?.team||{};
 const farmName=farm.farm_name||farm.producer_name||op.customer_name||op.title||'Granja';
 const integrated=farm.producer_name||op.customer_name||'Não informado';
 const city=farm.city||op.metadata?.city||'Cidade não informada';
 const lines=[
  '*RELATÓRIO DE APANHA DE AVES*'+(op.operation_number?` Nº ${op.operation_number}`:''),
  `${integrated} • ${farmName}`,
  `Cidade: ${city}`,
  `Equipe: ${team.name||'—'}`,
  `Encarregado: ${sup.name||'—'}${sup.phone?' • '+sup.phone:''}`,
  `Data: ${fmtDate(r.actualStart||op.scheduled_start)}`,
  `Horário: ${fmtTime(r.actualStart)} → ${fmtTime(r.actualEnd)} (${fmtDuration(r.actualStart,r.actualEnd)})`,
  `Total: ${fmtNum(r.totalBirds)} aves • ${Array.isArray(r.trucks)?r.trucks.length:0} caminhões`,
  ''
 ];
 (r.trucks||[]).forEach(t=>{
  const breakdown=Array.isArray(t.metadata?.barn_breakdown)?t.metadata.barn_breakdown:[];
  const aviary=breakdown.length?breakdown.map(x=>`Aviário ${x.barn_number||'—'}: ${fmtNum(x.birds)} aves`).join(' | '):`Aviário ${t.metadata?.aviary_number||'—'}`;
  lines.push(`Caminhão ${t.truck_sequence||'—'}${t.is_cata?' • CATA':''}`);
  lines.push(`${t.truck_plate||'Sem placa'} • ${t.driver_name||'Sem motorista'}`);
  lines.push(`${aviary} • ${fmtNum(t.birds)} aves`);
  lines.push(`${fmtTime(t.started_at)} → ${fmtTime(t.completed_at)}`);
  if(t.metadata?.boxes_count||t.metadata?.birds_per_box||t.metadata?.empty_boxes||t.metadata?.loading_deaths)lines.push(`Caixas: ${fmtNum(t.metadata?.boxes_count)} • Aves/caixa: ${num(t.metadata?.birds_per_box).toLocaleString('pt-BR',{maximumFractionDigits:2})} • Vazias: ${fmtNum(t.metadata?.empty_boxes)} • Mortes: ${fmtNum(t.metadata?.loading_deaths)}`);
  if(t.metadata?.notes)lines.push(`Obs.: ${t.metadata.notes}`);
  lines.push('');
 });
 return lines.join('\n').trim();
}

async function createPdfFile(r){
 const JsPDF=await loadJsPdf();
 const doc=new JsPDF({orientation:'portrait',unit:'mm',format:'a4'});
 const op=r?.op||{},farm=r?.farm||{},sup=r?.supervisor||{},team=r?.team||{};
 const farmName=farm.farm_name||farm.producer_name||op.customer_name||op.title||'Granja';
 const integrated=farm.producer_name||op.customer_name||'Não informado';
 const city=farm.city||op.metadata?.city||'Cidade não informada';
 const pageW=210,margin=14,usable=pageW-(margin*2),bottom=282;
 let y=16;
 const ensure=(need=8)=>{if(y+need>bottom){doc.addPage();y=16}};
 const text=(value,size=10,bold=false,space=5)=>{const clean=String(value??'—');doc.setFont('helvetica',bold?'bold':'normal');doc.setFontSize(size);const rows=doc.splitTextToSize(clean,usable);ensure(rows.length*space+2);doc.text(rows,margin,y);y+=rows.length*space};
 const rule=()=>{ensure(5);doc.setDrawColor(210);doc.line(margin,y,196,y);y+=5};

 doc.setFont('helvetica','bold');doc.setFontSize(16);doc.text('RELATÓRIO DE APANHA DE AVES',105,y,{align:'center'});y+=7;
 doc.setFontSize(10);doc.setFont('helvetica','normal');doc.text(op.operation_number?`Nº ${op.operation_number}`:'COMANDO 360',105,y,{align:'center'});y+=7;
 rule();
 text(`Integrado / produtor: ${integrated}`,11,true,5.5);
 text(`Granja: ${farmName}`);text(`Cidade: ${city}`);text(`Equipe: ${team.name||'—'}`);text(`Encarregado: ${sup.name||'—'}${sup.phone?' • '+sup.phone:''}`);
 text(`Data: ${fmtDate(r.actualStart||op.scheduled_start)} • Horário: ${fmtTime(r.actualStart)} → ${fmtTime(r.actualEnd)} • Duração: ${fmtDuration(r.actualStart,r.actualEnd)}`);
 rule();text(`TOTAL: ${fmtNum(r.totalBirds)} AVES • ${(r.trucks||[]).length} CAMINHÕES`,13,true,6);y+=2;

 (r.trucks||[]).forEach(t=>{
  ensure(42);
  doc.setFillColor(247,249,252);doc.setDrawColor(220,226,234);
  const top=y-4;
  const breakdown=Array.isArray(t.metadata?.barn_breakdown)?t.metadata.barn_breakdown:[];
  const aviary=breakdown.length?breakdown.map(x=>`Aviário ${x.barn_number||'—'}: ${fmtNum(x.birds)} aves`).join(' • '):`Aviário ${t.metadata?.aviary_number||'—'}`;
  const detail=[`${t.truck_plate||'Sem placa'} • ${t.driver_name||'Sem motorista'}`,aviary,`${fmtNum(t.birds)} aves • ${fmtTime(t.started_at)} → ${fmtTime(t.completed_at)}`,`Caixas: ${fmtNum(t.metadata?.boxes_count)} • Aves/caixa: ${num(t.metadata?.birds_per_box).toLocaleString('pt-BR',{maximumFractionDigits:2})} • Vazias: ${fmtNum(t.metadata?.empty_boxes)} • Mortes: ${fmtNum(t.metadata?.loading_deaths)}`];
  const extra=t.metadata?.notes?`Obs.: ${t.metadata.notes}`:'';
  const height=extra?40:34;
  doc.roundedRect(margin,top,usable,height,2,2,'FD');
  text(`CAMINHÃO ${t.truck_sequence||'—'}${t.is_cata?' • CATA':''}`,11,true,5.5);
  detail.forEach(line=>text(line,9,false,4.5));
  if(extra)text(extra,9,false,4.5);
  y=Math.max(y,top+height+5);
 });

 const notes=[op.notes,...(r.trucks||[]).map(t=>t.metadata?.notes).filter(Boolean)].filter(Boolean);
 if(notes.length){rule();text('OBSERVAÇÕES',10,true);text(notes.join(' • '),9,false,4.5)}
 const pages=doc.getNumberOfPages();
 for(let p=1;p<=pages;p++){doc.setPage(p);doc.setFontSize(8);doc.setFont('helvetica','normal');doc.setTextColor(110);doc.text(`Comando 360 • Página ${p}/${pages}`,105,291,{align:'center'});doc.setTextColor(0)}
 const blob=doc.output('blob');
 const stamp=fmtDate(r.actualStart||op.scheduled_start).replaceAll('/','-');
 const name=`Relatorio_Apanha_${fileSafe(op.operation_number||farmName)}_${fileSafe(stamp)}.pdf`;
 return new File([blob],name,{type:'application/pdf',lastModified:Date.now()});
}

async function shareReport(index,button){
 const r=getReports()[Number(index)];
 if(!r)throw new Error('Relatório não encontrado. Atualize a tela e tente novamente.');
 const original=button.textContent;
 button.disabled=true;button.textContent='GERANDO PDF...';
 try{
  const file=await createPdfFile(r);
  const shareData={files:[file],title:'Relatório de apanha',text:'Relatório de apanha gerado pelo Comando 360.'};
  if(navigator.share&&(!navigator.canShare||navigator.canShare(shareData))){button.textContent='ABRINDO COMPARTILHAMENTO...';await navigator.share(shareData);return}
  window.location.href='https://wa.me/?text='+encodeURIComponent(reportText(r));
 }finally{
  button.disabled=false;button.textContent=original||'💬 ENVIAR PDF NO WHATSAPP';decorateButtons(button.parentElement||document);
 }
}

document.addEventListener('click',e=>{
 const button=e.target.closest?.('.catchReportA4');
 if(!button)return;
 e.preventDefault();e.stopImmediatePropagation();
 shareReport(button.dataset.index,button).catch(err=>{if(err?.name==='AbortError')return;console.error('Compartilhamento do relatório',err);alert(err?.message||'Não foi possível compartilhar o relatório agora.')});
},true);

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watchButtons,{once:true});else watchButtons();
})();
