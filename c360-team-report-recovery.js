(()=>{
'use strict';
const VERSION='2026.09.17-team-report-recovery1';
let patched=false;
let retrying=false;
let lastRetryKey='';

function online(){
 try{return navigator.onLine!==false}catch(_){return true}
}

function installQueueTimeout(){
 if(patched)return true;
 const original=window.offlineQueueList;
 if(typeof original!=='function')return false;
 patched=true;
 window.__c360OriginalOfflineQueueList=original;
 window.offlineQueueList=async function c360OfflineQueueListSafe(...args){
  if(!online())return await original.apply(this,args);
  let timer=null;
  try{
   return await Promise.race([
    Promise.resolve(original.apply(this,args)),
    new Promise(resolve=>{timer=setTimeout(()=>{
     console.warn('Comando 360: cache local demorou demais; seguindo com dados online.');
     resolve([]);
    },2200)})
   ]);
  }finally{
   if(timer)clearTimeout(timer);
  }
 };
 window.__c360TeamReportRecovery={version:VERSION,queueTimeout:true};
 return true;
}

async function recoverBlankReport(force=false){
 if(retrying||!online())return;
 const section=document.getElementById('equipereport');
 const list=document.getElementById('teamReportToday');
 const date=document.getElementById('teamReportDate')?.value||'';
 if(!section||!list||!section.classList.contains('active'))return;
 if(list.textContent.trim())return;
 const key=date||'today';
 if(!force&&lastRetryKey===key)return;
 lastRetryKey=key;
 retrying=true;
 try{
  if(typeof window.refreshToken==='function'){
   try{await window.refreshToken()}catch(e){console.warn('Comando 360: renovação de sessão do relatório',e)}
  }
  if(typeof window.loadTeamReport==='function')await window.loadTeamReport();
 }catch(e){
  console.warn('Comando 360: recuperação do relatório da equipe',e);
 }finally{
  retrying=false;
 }
}

function installReportWatch(){
 const section=document.getElementById('equipereport');
 if(!section)return false;
 if(section.dataset.c360ReportRecovery==='1')return true;
 section.dataset.c360ReportRecovery='1';
 const observer=new MutationObserver(()=>{
  if(section.classList.contains('active'))setTimeout(()=>recoverBlankReport(false),3200);
 });
 observer.observe(section,{attributes:true,attributeFilter:['class']});
 const refresh=document.getElementById('refreshTeamReport');
 if(refresh)refresh.addEventListener('click',()=>{lastRetryKey='';setTimeout(()=>recoverBlankReport(true),3200)});
 const date=document.getElementById('teamReportDate');
 if(date)date.addEventListener('change',()=>{lastRetryKey='';setTimeout(()=>recoverBlankReport(true),3200)});
 if(section.classList.contains('active'))setTimeout(()=>recoverBlankReport(false),3200);
 return true;
}

let tries=0;
const timer=setInterval(()=>{
 tries++;
 const a=installQueueTimeout();
 const b=installReportWatch();
 if((a&&b)||tries>=80)clearInterval(timer);
},125);
installQueueTimeout();
installReportWatch();
})();
