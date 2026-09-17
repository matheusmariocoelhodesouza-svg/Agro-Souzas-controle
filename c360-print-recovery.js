(()=>{
'use strict';
const VERSION='2026.09.17-print-recovery1';
function isAndroid(){return /Android/i.test(navigator.userAgent||'')}
function inDeviceMode(){try{return !!deviceMode}catch(_){return document.body.classList.contains('device-mode')}}
function printMode(){
 try{return String(deviceAccess?.permissions?.print_mode||'').toLowerCase()}
 catch(_){return ''}
}
function text(v){return String(v??'').replace(/\s+/g,' ').trim()}
function n(v){const x=Number(v||0);return Number.isFinite(x)?x:0}
function divider(){return '--------------------------------\n'}
function reportText(index){
 try{
  const r=teamCatchReports?.[Number(index)];
  if(!r)return '';
  const op=r.op||{},farm=r.farm||{},team=r.team||{},sup=r.supervisor||{};
  const company=text(companyProfile?.trade_name||companyProfile?.legal_name||"Agro Souza's");
  const integrated=text(farm.producer_name||op.customer_name||'Não informado');
  const farmName=text(farm.farm_name||farm.producer_name||op.customer_name||op.title||'Granja');
  const city=text(farm.city||op.metadata?.city||'');
  const date=op.scheduled_start?new Date(op.scheduled_start).toLocaleDateString('pt-BR'):'—';
  const lines=[company,'COMPROVANTE DE APANHA',divider().trim(),`Integrado: ${integrated}`,`Granja: ${farmName}`,city?`Cidade: ${city}`:'',`Equipe: ${text(team.name||'')}`,`Data: ${date}`,sup.name?`Encarregado: ${text(sup.name)}`:'',divider().trim()];
  const trucks=Array.isArray(r.trucks)?r.trucks:[];
  trucks.forEach((t,i)=>{
   const m=t.metadata||{};
   const boxes=n(m.boxes_count),birdsBox=n(m.birds_per_box),birds=n(t.birds_count||m.birds_count||(boxes*birdsBox));
   lines.push(`CAMINHÃO ${t.truck_sequence||i+1}`,t.vehicle_description?text(t.vehicle_description):'',m.plate?`Placa: ${text(m.plate)}`:'',boxes?`Caixas: ${boxes}`:'',birdsBox?`Aves/caixa: ${birdsBox}`:'',`Aves: ${Math.round(birds).toLocaleString('pt-BR')}`,divider().trim());
  });
  lines.push(`TOTAL DE AVES: ${n(r.totalBirds).toLocaleString('pt-BR')}`,'',sup.name?text(sup.name):'','Encarregado da equipe','','Responsável pela granja / integrado','','*** FIM DO COMPROVANTE ***','');
  return lines.filter((x,i)=>x!==''||lines[i-1]!=='').join('\n');
 }catch(e){console.warn('C360 report raw text',e);return ''}
}
function sendRawBt(payload){
 const value=String(payload||'').trim();
 if(!value)return false;
 try{
  const uri='intent:'+encodeURIComponent(value)+'#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;';
  window.location.href=uri;
  return true;
 }catch(e){console.warn('C360 RawBT',e);return false}
}
function toast(title,msg,type='success'){try{if(typeof c360Toast==='function')return c360Toast(title,msg,type)}catch(_){};alert(msg)}
document.addEventListener('click',e=>{
 const btn=e.target.closest?.('.catchReportPrint');
 if(!btn||!inDeviceMode()||!isAndroid()||printMode()!=='rawbt')return;
 const payload=reportText(btn.dataset.index);
 if(!payload)return;
 e.preventDefault();e.stopImmediatePropagation();
 toast('Impressão 80 mm','Enviando direto para o RawBT...');
 sendRawBt(payload);
},true);
window.C360PrintRecovery={version:VERSION,printMode,sendRawBt};
})();
