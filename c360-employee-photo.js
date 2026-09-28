(()=>{
'use strict';

const VERSION='2026.09.28-photo1';
const MAX_UPLOAD_BYTES=5*1024*1024;
const TARGET_EDGE=1600;
const JPEG_QUALITIES=[0.92,0.88,0.84,0.80,0.76,0.72];
const ACCEPTED=/^image\/(jpeg|png|webp)$/i;
let previewUrl='';
let replayingSave=false;

function bytesLabel(bytes){
 const n=Number(bytes||0);
 if(n>=1024*1024)return (n/(1024*1024)).toLocaleString('pt-BR',{maximumFractionDigits:1})+' MB';
 return Math.max(1,Math.round(n/1024)).toLocaleString('pt-BR')+' KB';
}
function setEmployeePhotoMsg(text,kind='muted'){
 const m=document.getElementById('employeeEditMsg');
 if(!m)return;
 m.className=kind;
 m.textContent=text;
}
function canvasBlob(canvas,type='image/jpeg',quality=.9){
 return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Não foi possível otimizar a foto.')),type,quality));
}
async function decodeImage(file){
 if(typeof createImageBitmap==='function'){
  try{
   const bitmap=await createImageBitmap(file,{imageOrientation:'from-image'});
   return {source:bitmap,width:bitmap.width,height:bitmap.height,dispose:()=>bitmap.close?.()};
  }catch(_){ }
 }
 const url=URL.createObjectURL(file);
 try{
  const img=await new Promise((resolve,reject)=>{
   const el=new Image();
   el.onload=()=>resolve(el);
   el.onerror=()=>reject(new Error('Não foi possível abrir esta foto.'));
   el.src=url;
  });
  return {source:img,width:img.naturalWidth||img.width,height:img.naturalHeight||img.height,dispose:()=>URL.revokeObjectURL(url)};
 }catch(e){URL.revokeObjectURL(url);throw e}
}
async function renderJpeg(source,width,height,quality){
 const canvas=document.createElement('canvas');
 canvas.width=Math.max(1,Math.round(width));
 canvas.height=Math.max(1,Math.round(height));
 const ctx=canvas.getContext('2d',{alpha:false});
 if(!ctx)throw new Error('Não foi possível preparar a foto neste aparelho.');
 ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
 ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
 ctx.drawImage(source,0,0,canvas.width,canvas.height);
 return canvasBlob(canvas,'image/jpeg',quality);
}
async function optimizeEmployeePhoto(file){
 if(!file)return null;
 if(!ACCEPTED.test(file.type||''))throw new Error('Escolha uma imagem JPG, PNG ou WEBP.');
 if(file.size<=MAX_UPLOAD_BYTES)return file;

 const decoded=await decodeImage(file);
 try{
  if(!(decoded.width>0&&decoded.height>0))throw new Error('A foto não possui dimensões válidas.');
  let scale=Math.min(1,TARGET_EDGE/Math.max(decoded.width,decoded.height));
  let width=Math.max(1,Math.round(decoded.width*scale));
  let height=Math.max(1,Math.round(decoded.height*scale));
  let best=null;

  for(let round=0;round<4;round++){
   for(const quality of JPEG_QUALITIES){
    const blob=await renderJpeg(decoded.source,width,height,quality);
    if(!best||blob.size<best.size)best=blob;
    if(blob.size<=MAX_UPLOAD_BYTES*0.90){best=blob;round=99;break}
   }
   if(round>=99)break;
   width=Math.max(720,Math.round(width*0.84));
   height=Math.max(720,Math.round(height*0.84));
  }

  if(!best||best.size>MAX_UPLOAD_BYTES)throw new Error('A foto continua muito grande mesmo após a otimização. Escolha outra foto.');
  const base=String(file.name||'foto').replace(/\.[^.]+$/,'').replace(/[^a-z0-9_-]+/gi,'-').replace(/^-+|-+$/g,'')||'foto';
  return new File([best],base+'-otimizada.jpg',{type:'image/jpeg',lastModified:Date.now()});
 }finally{decoded.dispose?.()}
}

const originalUpload=typeof window.uploadEmployeeProfilePhoto==='function'?window.uploadEmployeeProfilePhoto:null;
if(originalUpload){
 window.uploadEmployeeProfilePhoto=async function(file,employeeId){
  if(!file)return null;
  const prepared=await optimizeEmployeePhoto(file);
  return originalUpload(prepared,employeeId);
 };
}

async function handleEmployeePhotoInput(input){
 const original=input?.files?.[0];
 if(!original)return;
 if(!ACCEPTED.test(original.type||'')){
  setEmployeePhotoMsg('Escolha uma imagem JPG, PNG ou WEBP.','error');
  input.value='';
  return;
 }
 try{
  setEmployeePhotoMsg(original.size>MAX_UPLOAD_BYTES?'Otimizando foto sem perder a qualidade...':'Preparando foto...','muted');
  const prepared=await optimizeEmployeePhoto(original);
  window.__employeePhotoFile=prepared;
  window.__removeEmployeePhoto=false;
  if(previewUrl)URL.revokeObjectURL(previewUrl);
  previewUrl=URL.createObjectURL(prepared);
  const preview=document.getElementById('editEmployeePhotoPreview');
  if(preview)preview.src=previewUrl;
  if(prepared!==original){
   setEmployeePhotoMsg('Foto pronta ✓ '+bytesLabel(original.size)+' → '+bytesLabel(prepared.size)+' • qualidade preservada.','okmsg');
  }else{
   setEmployeePhotoMsg('Foto pronta ✓ qualidade original preservada.','okmsg');
  }
 }catch(e){
  window.__employeePhotoFile=null;
  setEmployeePhotoMsg(e?.message||String(e),'error');
 }
}

window.__c360OptimizeEmployeePhoto=optimizeEmployeePhoto;
window.__c360EmployeePhotoVersion=VERSION;
window.previewEmployeePhotoInput=handleEmployeePhotoInput;

function installInputGuard(id){
 const el=document.getElementById(id);if(!el||el.dataset.c360PhotoGuard==='1')return;
 el.dataset.c360PhotoGuard='1';
 el.addEventListener('change',e=>{
  e.stopImmediatePropagation();
  handleEmployeePhotoInput(el);
 },true);
}

function installSaveGuard(){
 const btn=document.getElementById('saveEmployeeEdit');
 if(!btn||btn.dataset.c360PhotoSaveGuard==='1')return;
 btn.dataset.c360PhotoSaveGuard='1';
 btn.addEventListener('click',async e=>{
  if(replayingSave){replayingSave=false;return}
  const file=window.__employeePhotoFile;
  if(!file||file.size<=MAX_UPLOAD_BYTES)return;
  e.preventDefault();e.stopImmediatePropagation();
  try{
   setEmployeePhotoMsg('Otimizando foto antes de salvar...','muted');
   window.__employeePhotoFile=await optimizeEmployeePhoto(file);
   replayingSave=true;
   btn.click();
  }catch(err){setEmployeePhotoMsg(err?.message||String(err),'error')}
 },true);
}

function install(){
 installInputGuard('employeePhotoCamera');
 installInputGuard('employeePhotoGallery');
 installSaveGuard();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
else install();
})();