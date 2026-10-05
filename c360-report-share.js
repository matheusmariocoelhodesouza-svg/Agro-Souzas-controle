(()=>{
'use strict';
if(window.__c360ReportShareInstalled)return;
window.__c360ReportShareInstalled=true;

const VERSION='2026.10.05-reports2';
const JSPDF_URL=new URL('./vendor/jspdf/jspdf.umd.min.js',document.baseURI).href;
let jsPdfPromise=null;
let observedRoot=null,buttonsObserver=null;

function num(v){const n=Number(v||0);return Number.isFinite(n)?n:0}
function fmtNum(v){return num(v).toLocaleString('pt-BR')}
function fmtTime(v){if(!v)return '—';const d=new Date(v);if(Number.isNaN(d.getTime()))return '—';return d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit',timeZone:'America/Sao_Paulo'})}
function fmtDate(v){if(!v)return '—';const d=new Date(v);if(Number.isNaN(d.getTime()))return '—';return d.toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'})}
function fmtDuration(a,b){if(!a||!b)return '—';const ms=new Date(b)-new Date(a);if(!Number.isFinite(ms)||ms<0)return '—';const mins=Math.round(ms/60000),h=Math.floor(mins/60),m=mins%60;return h?`${h}h ${String(m).padStart(2,'0')}min`:`${m}min`}
function fileSafe(v){return String(v||'relatorio').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'_').replace(/^_+|_+$/g,'').slice(0,70)||'relatorio'}
// As fontes padrão do PDF usam WinAnsi; setas e travessões Unicode podem
// fazer uma linha inteira sair com glifos incorretos ou espaçamento quebrado.
function pdfText(v){return String(v??'-').normalize('NFC').replace(/[\u2010-\u2015\u2212]/g,'-').replace(/[\u2190-\u2194]/g,' - ').replace(/[\u2022\u00b7]/g,' | ').replace(/\u00a0/g,' ')}
function getReports(){try{return typeof teamCatchReports!=='undefined'&&Array.isArray(teamCatchReports)?teamCatchReports:[]}catch(_){return[]}}

function decorateButtons(root=document){
 root.querySelectorAll?.('.catchReportA4').forEach(btn=>{
  const host=btn.parentElement;if(!host)return;
  for(const [className,label,title] of [
   ['catchReportDownload','📥 BAIXAR PDF','Baixar o relatório de apanha em PDF'],
   ['catchReportWhatsApp','💬 COMPARTILHAR PDF','Compartilhar o PDF no WhatsApp ou em outro aplicativo']
  ]){
   let action=[...host.querySelectorAll('.'+className)].find(b=>b.dataset.index===btn.dataset.index);
   if(!action){action=document.createElement('button');action.type='button';action.className='btn soft '+className;action.dataset.index=btn.dataset.index;action.textContent=label;action.setAttribute('aria-label',title);host.appendChild(action)}
  }
 });
}

function watchButtons(){
 const root=document.getElementById('teamReportToday');
 if(!root)return;
 decorateButtons(root);
 if(observedRoot!==root){buttonsObserver?.disconnect();observedRoot=root;buttonsObserver=new MutationObserver(watchButtons);buttonsObserver.observe(root,{childList:true,subtree:true})}
 // Prepara o gerador ao abrir a tela, antes do clique de compartilhamento.
 if(root.querySelector('.catchReportA4'))loadJsPdf().catch(()=>{});
}

function loadJsPdf(){
 if(window.jspdf?.jsPDF)return Promise.resolve(window.jspdf.jsPDF);
 if(jsPdfPromise)return jsPdfPromise;
 jsPdfPromise=new Promise((resolve,reject)=>{
  let s=[...document.scripts].find(s=>s.src===JSPDF_URL);
  if(s?.dataset.c360PdfState==='error'){s.remove();s=null}
  const existing=!!s;if(!s){s=document.createElement('script');s.src=JSPDF_URL;s.async=true}
  let done=false;
  const finish=error=>{if(done)return;done=true;clearTimeout(timer);s.removeEventListener('load',loaded);s.removeEventListener('error',failed);s.dataset.c360PdfState=error?'error':'ready';error?reject(error):resolve(window.jspdf.jsPDF)};
  const loaded=()=>finish(window.jspdf?.jsPDF?null:new Error('Gerador de PDF indisponível.'));
  const failed=()=>finish(new Error('Não foi possível carregar o gerador de PDF. Conecte-se e tente novamente.'));
  const timer=setTimeout(failed,15000);
  s.addEventListener('load',loaded,{once:true});s.addEventListener('error',failed,{once:true});
  if(!existing)document.head.appendChild(s);
 }).catch(error=>{jsPdfPromise=null;throw error});
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
 const text=(value,size=10,bold=false,space=5)=>{const clean=pdfText(value);doc.setFont('helvetica',bold?'bold':'normal');doc.setFontSize(size);const rows=doc.splitTextToSize(clean,usable);for(const row of rows){ensure(space+2);doc.text(row,margin,y);y+=space}};
 const rule=()=>{ensure(5);doc.setDrawColor(210);doc.line(margin,y,196,y);y+=5};

 doc.setFont('helvetica','bold');doc.setFontSize(16);doc.text('RELATÓRIO DE APANHA DE AVES',105,y,{align:'center'});y+=7;
 doc.setFontSize(10);doc.setFont('helvetica','normal');doc.text(op.operation_number?`Nº ${op.operation_number}`:'COMANDO 360',105,y,{align:'center'});y+=7;
 rule();
 text(`Integrado / produtor: ${integrated}`,11,true,5.5);
 text(`Granja: ${farmName}`);text(`Cidade: ${city}`);text(`Equipe: ${team.name||'—'}`);text(`Encarregado: ${sup.name||'—'}${sup.phone?' • '+sup.phone:''}`);
 text(`Data: ${fmtDate(r.actualStart||op.scheduled_start)} • Horário: ${fmtTime(r.actualStart)} → ${fmtTime(r.actualEnd)} • Duração: ${fmtDuration(r.actualStart,r.actualEnd)}`);
 rule();text(`TOTAL: ${fmtNum(r.totalBirds)} AVES • ${(r.trucks||[]).length} CAMINHÕES`,13,true,6);y+=2;

 (r.trucks||[]).forEach(t=>{
  const breakdown=Array.isArray(t.metadata?.barn_breakdown)?t.metadata.barn_breakdown:[];
  const aviary=breakdown.length?breakdown.map(x=>`Aviário ${x.barn_number||'—'}: ${fmtNum(x.birds)} aves`).join(' • '):`Aviário ${t.metadata?.aviary_number||'—'}`;
  const detail=[`${t.truck_plate||'Sem placa'} • ${t.driver_name||'Sem motorista'}`,aviary,`${fmtNum(t.birds)} aves • ${fmtTime(t.started_at)} → ${fmtTime(t.completed_at)}`,`Caixas: ${fmtNum(t.metadata?.boxes_count)} • Aves/caixa: ${num(t.metadata?.birds_per_box).toLocaleString('pt-BR',{maximumFractionDigits:2})} • Vazias: ${fmtNum(t.metadata?.empty_boxes)} • Mortes: ${fmtNum(t.metadata?.loading_deaths)}`];
  const extra=t.metadata?.notes?`Obs.: ${t.metadata.notes}`:'';
  const wrap=(value,size,bold,space)=>{doc.setFont('helvetica',bold?'bold':'normal');doc.setFontSize(size);return doc.splitTextToSize(pdfText(value),usable-6).map(text=>({text,size,bold,space}))};
  const title=`CAMINHÃO ${t.truck_sequence||'—'}${t.is_cata?' • CATA':''}`;
  const remaining=detail.concat(extra?[extra]:[]).flatMap(line=>wrap(line,9,false,4.5));
  let continued=false;
  while(remaining.length){
   const heading=wrap(title+(continued?' (CONTINUAÇÃO)':''),11,true,5.5);
   const fullHeight=Math.max(34,8+heading.concat(remaining).reduce((sum,row)=>sum+row.space,0));
   // Mantém o caminhão inteiro quando cabe em uma página. Conteúdo maior
   // continua em outra moldura, sem invadir o rodapé ou perder observações.
   if(fullHeight<=bottom-12&&y-4+fullHeight>bottom){doc.addPage();y=16}
   let height=8+heading.reduce((sum,row)=>sum+row.space,0);
   const rows=[...heading];
   while(remaining.length&&y-4+height+remaining[0].space<=bottom){const row=remaining.shift();rows.push(row);height+=row.space}
   if(rows.length===heading.length){doc.addPage();y=16;continue}
   height=Math.max(34,height);
   const top=y-4;
   doc.setFillColor(247,249,252);doc.setDrawColor(220,226,234);doc.roundedRect(margin,top,usable,height,2,2,'FD');
   for(const row of rows){doc.setFont('helvetica',row.bold?'bold':'normal');doc.setFontSize(row.size);doc.text(row.text,margin+3,y);y+=row.space}
   y=top+height+5;
   if(remaining.length){doc.addPage();y=16;continued=true}
  }
 });

 const notes=[op.notes,...(r.trucks||[]).map(t=>t.metadata?.notes).filter(Boolean)].filter(Boolean);
 if(notes.length){rule();text('OBSERVAÇÕES',10,true);text(notes.join(' • '),9,false,4.5)}
 const pages=doc.getNumberOfPages();
 for(let p=1;p<=pages;p++){doc.setPage(p);doc.setFontSize(8);doc.setFont('helvetica','normal');doc.setTextColor(110);doc.text(pdfText(`Comando 360 • Página ${p}/${pages}`),105,291,{align:'center'});doc.setTextColor(0)}
 const blob=doc.output('blob');
 const stamp=fmtDate(r.actualStart||op.scheduled_start).replaceAll('/','-');
 const name=`Relatorio_Apanha_${fileSafe(op.operation_number||farmName)}_${fileSafe(stamp)}.pdf`;
 return new File([blob],name,{type:'application/pdf',lastModified:Date.now()});
}

function downloadPdf(file){
 const url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download=file.name;a.style.display='none';document.body.appendChild(a);
 try{a.click()}finally{a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000)}
}

async function shareReport(index,button,download=false){
 const r=getReports()[Number(index)];
 if(!r)throw new Error('Relatório não encontrado. Atualize a tela e tente novamente.');
 const original=button.textContent;
 button.disabled=true;button.textContent='GERANDO PDF...';
 try{
  const file=await createPdfFile(r);
  const shareData={files:[file],title:'Relatório de apanha',text:'Relatório de apanha gerado pelo Comando 360.'};
  if(!download&&navigator.share&&(!navigator.canShare||navigator.canShare(shareData))){
   button.textContent='ABRINDO COMPARTILHAMENTO...';
   try{await navigator.share(shareData);return}catch(error){if(error?.name==='AbortError')return}
  }
  downloadPdf(file);
  if(!download&&typeof window.c360Toast==='function')window.c360Toast('PDF baixado','Abra o arquivo e compartilhe pelo WhatsApp.','success');
 }finally{
  button.disabled=false;button.textContent=original;
 }
}

document.addEventListener('click',e=>{
 const button=e.target.closest?.('.catchReportWhatsApp,.catchReportDownload');
 if(!button||button.disabled)return;
 e.preventDefault();e.stopImmediatePropagation();
 shareReport(button.dataset.index,button,button.classList.contains('catchReportDownload')).catch(err=>{if(err?.name==='AbortError')return;console.error('Compartilhamento do relatório',err);alert(err?.message||'Não foi possível compartilhar o relatório agora.')});
},true);

document.addEventListener('c360:screen-changed',watchButtons);
window.C360ReportShare={version:VERSION,createPdfFile,reportText};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watchButtons,{once:true});else watchButtons();
})();
