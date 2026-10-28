(()=>{
'use strict';
const VERSION='2026.10.28-truck-photo-1';
const $=id=>document.getElementById(id);
const fields={driver_name:'poTruckDriver',truck_plate:'poTruckPlate',truck_origin:'poTruckOrigin',aviary:'poTruckAviaryNumber',birds:'poTruckBirds',boxes_count:'poTruckBoxes',empty_boxes:'poTruckEmptyBoxes',birds_per_box:'poTruckBirdsPerBox',loading_deaths:'poTruckLoadingDeaths',started_at:'poTruckStart',completed_at:'poTruckEnd',notes:'poTruckNotes'};
let epoch=0,file=null,pending=false,controller=null,analysis=null,busyButtons=[],busyCard=null;
function fieldMode(){try{return !!deviceMode}catch{return document.body.classList.contains('device-mode')}}
function allowed(){try{return fieldMode()&&deviceAccess?.permissions?.apanha!==false&&deviceAccess?.permissions?.ia!==false}catch{return false}}
function online(){try{return c360NetOnline()}catch{return navigator.onLine!==false}}
function binding(){try{return JSON.stringify([companyId,deviceAccess?.id,deviceAccess?.team_id,$('poTruckOperationId')?.value,$('poTruckLoadingId')?.value,$('poTruckSequence')?.value])}catch{return ''}}
function status(message,error=false){const el=$('poTruckPhotoStatus');if(el){el.textContent=message;el.classList.toggle('error',error)}}
function setBusy(value){
 pending=value;
 const card=$('poTruckCard');card?.setAttribute('aria-busy',String(value));
 if(value){busyCard=card;busyButtons=['poTruckSave','poTruckSaveClose'].map($).filter(Boolean)}
 for(const button of new Set([...busyButtons,...['poTruckSave','poTruckSaveClose'].map($).filter(Boolean)]))button.disabled=value;
 if(!value){busyCard?.setAttribute('aria-busy','false');busyCard=null;busyButtons=[]}
 const retry=$('poTruckPhotoRead');if(retry){retry.disabled=value;retry.hidden=!file||!allowed();retry.textContent=value?'LENDO A FICHA…':'LER FOTO NOVAMENTE'}
}
function sync(){
 const hint=$('poTruckPhotoIntro'),retry=$('poTruckPhotoRead');
 if($('poTruckPhotoTitle'))$('poTruckPhotoTitle').textContent=allowed()?'Preencher pela foto da ficha':'Foto da ficha';
 if(hint)hint.textContent=allowed()?'Envie a foto deste caminhão. A IA preenche os campos para você conferir e salvar.':fieldMode()?'Anexe a foto da ficha e preencha os campos. A leitura automática está desativada neste aparelho.':'Anexe a foto da ficha deste caminhão.';
 if(retry)retry.hidden=!file||!allowed();
}
function reset(){
 epoch++;controller?.abort();controller=null;file=null;analysis=null;setBusy(false);status('');
 document.querySelectorAll('#poTruckCard .field-photo-filled').forEach(el=>el.classList.remove('field-photo-filled'));sync();
}
function snapshot(){return Object.fromEntries(Object.values(fields).map(id=>[id,$(id)?.value||'']))}
function barnSnapshot(){return JSON.stringify([!!$('poTruckCata')?.checked,...document.querySelectorAll('#poTruckBarnChecks input')].map(v=>typeof v==='boolean'?v:v.value))}
async function compress(source){
 if(!/^image\/(jpeg|png|webp)$/.test(source.type)||source.size>12*1024*1024)throw Error('Use uma foto JPEG, PNG ou WebP de até 12 MB.');
 const raw=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('Não consegui abrir a foto. Tente selecionar novamente.'));reader.readAsDataURL(source)});
 const img=await new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error('Não consegui abrir a imagem. Use outra foto.'));image.src=raw});
 const scale=Math.min(1,2400/Math.max(img.width,img.height)),canvas=document.createElement('canvas');
 canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));
 canvas.getContext('2d',{alpha:false}).drawImage(img,0,0,canvas.width,canvas.height);
 const result=canvas.toDataURL('image/jpeg',.9);img.src='';canvas.width=canvas.height=1;
 if(result.length>12*1024*1024)throw Error('A imagem ficou muito grande. Tire uma foto mais próxima da ficha.');
 return result;
}
function applyDraft(data,before,barnsBefore){
 const t=data.truck;if(!t)return {count:0,skipped:[]};
 let count=0;const skipped=[];
 const barnsChanged=barnSnapshot()!==barnsBefore;
 for(const [key,id] of Object.entries(fields)){
  const el=$(id),value=t[key];if(!el)continue;
  if(el.value!==before[id]||barnsChanged&&['birds','aviary'].includes(key)){if(value!==null&&value!==undefined)skipped.push(key);continue}
  if(value===null||value===undefined){
   // A photo without a start time must not inherit the form's "now" shortcut.
   if(key==='started_at'&&el.value===$('poTruckCard')?.dataset.defaultStart)el.value='';
   continue;
  }
  el.value=key==='notes'&&before[id]?[before[id],value].join('\n'):String(value);
  el.classList.add('field-photo-filled');count++;
 }
 if(!barnsChanged&&typeof t.is_cata==='boolean'&&$('poTruckCata')){
  $('poTruckCata').checked=t.is_cata;
  if(typeof toggleTruckCataAviaries==='function')toggleTruckCataAviaries();
  if(t.is_cata&&Array.isArray(t.barn_breakdown)&&typeof renderTruckCataRows==='function')renderTruckCataRows(t.barn_breakdown);
 }
 if(!barnsChanged&&typeof calcTruckSheetTotalHint==='function')calcTruckSheetTotalHint();
 analysis={version:VERSION,interpreted_at:new Date().toISOString(),selection:data.selection,missing_fields:data.missing_fields||[],warnings:data.warnings||[],box_groups:t.box_groups||[],fields_applied:count,manual_edits_preserved:skipped};
 return {count,skipped};
}
async function read(source=file){
 if(source)file=source;sync();
 if(!file||!allowed())return;
 if(!online()){status('Sem internet para ler a ficha. A foto continua anexada; você pode preencher manualmente ou tocar em Ler foto novamente quando a conexão voltar.');return}
 try{if(typeof truckSavePending!=='undefined'&&truckSavePending)return}catch{}
 controller?.abort();const ticket=++epoch,current=binding(),before=snapshot(),barnsBefore=barnSnapshot(),selected=file;
 controller=new AbortController();const signal=controller.signal;
 analysis=null;setBusy(true);status('Lendo a ficha e preenchendo este caminhão…');
 let timer;
 const stillCurrent=()=>ticket===epoch&&current===binding()&&!$('poTruckCard')?.classList.contains('hidden')&&allowed();
 try{
  const image=await compress(selected);if(!stillCurrent())return;
  timer=setTimeout(()=>controller?.abort(),65000);
  const response=await authFetch('/functions/v1/comando360-field-ai',{method:'POST',headers:{'Content-Type':'application/json'},signal,body:JSON.stringify({mode:'truck_photo',company_id:companyId,operation_id:$('poTruckOperationId').value,loading_id:$('poTruckLoadingId').value,truck_sequence:Number($('poTruckSequence').value),loading_date:$('poTruckDate').value,plate_hint:before.poTruckPlate,image_data_url:image})},true,65000);
  const data=await response.json();if(!stillCurrent())return;
  if(!response.ok)throw Error(data.message||'Não foi possível ler a ficha. Tente novamente.');
  if(!data.truck){status((data.warnings||[]).join(' ')||'Não consegui identificar este caminhão. Envie outra foto.',true);return}
  const applied=applyDraft(data,before,barnsBefore),parts=[applied.count?'Campos preenchidos pela foto. Confira e toque em Salvar.':'A foto foi lida. Confira os campos antes de salvar.'];
  if(applied.skipped.length)parts.push('Mantive os campos que você alterou durante a leitura.');
  if(data.missing_fields?.length)parts.push('Confira ou complete: '+data.missing_fields.join(', ')+'.');
  if(data.warnings?.length)parts.push(data.warnings.join(' '));
  status(parts.join(' '));
 }catch(error){if(stillCurrent())status(error.name==='AbortError'?'A leitura foi interrompida. Sua foto continua anexada; toque em Ler foto novamente.':error.message||'Não foi possível ler a ficha. Tente novamente ou preencha manualmente.',true)}
 finally{clearTimeout(timer);if(ticket===epoch){controller=null;setBusy(false)}}
}
function init(){
 if(!$('poTruckCard')||$('poTruckPhotoRead')?.dataset.installed)return;
 if($('poTruckPhotoRead')){$('poTruckPhotoRead').dataset.installed='1';$('poTruckPhotoRead').addEventListener('click',()=>read())}
 $('poTruckCard').addEventListener('input',event=>event.target.classList.remove('field-photo-filled'));
 const style=document.createElement('style');style.textContent='.truck-photo-actions{display:flex;flex-wrap:wrap;gap:10px;margin:12px 0}.truck-photo-actions .btn{min-height:48px;white-space:normal}.truck-photo-status{font-size:13px;line-height:1.6;overflow-wrap:anywhere;white-space:pre-line;margin-top:10px}.field-photo-filled{outline:2px solid #45a694;outline-offset:1px}@media(max-width:640px){.truck-photo-actions{display:grid;grid-template-columns:1fr 1fr}.truck-photo-actions .btn{text-align:center;padding:12px 8px;font-size:12px}}';document.head.appendChild(style);sync();
}
document.addEventListener('c360:device-permissions',()=>{sync();if(!allowed()&&pending)reset()});
document.addEventListener('c360:screen-changed',()=>{init();sync();if(pending&&!document.querySelector('#operacoes.section.active'))reset()});
document.addEventListener('c360:bootstrap-ready',init);
window.C360TruckPhoto={version:VERSION,read,reset,sync,get busy(){return pending},metadata:()=>analysis?JSON.parse(JSON.stringify(analysis)):null};
init();
})();
