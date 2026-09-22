import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const VERSION='2026.09.22-r100-field-torture3';
const base=process.env.C360_BASE_URL||'http://127.0.0.1:8080';
const out=path.resolve('qa-artifacts-r100');
await fs.mkdir(out,{recursive:true});

const report={version:VERSION,checks:[],pageErrors:[],consoleErrors:[]};
const pass=(name,detail='')=>report.checks.push({name,ok:true,detail});
const fail=(name,detail='')=>report.checks.push({name,ok:false,detail:String(detail)});
const assert=(name,condition,detail='')=>condition?pass(name,detail):fail(name,detail);

const sw=await fs.readFile('sw-v7-02.js','utf8');
const authGuard=await fs.readFile('sw-auth-refresh-guard.js','utf8');
assert('sw:auth-guard-importado',sw.includes("sw-auth-refresh-guard.js"));
assert('sw:refresh-falha-nao-fica-cacheada',authGuard.includes('snapshot.ok')&&authGuard.includes('c360RefreshFlights.delete(key)'));

const sample={
 company:'00000000-0000-0000-0000-00000000c361',
 team:'00000000-0000-0000-0000-00000000c362',
 user:'00000000-0000-0000-0000-00000000c360',
 employee:'00000000-0000-0000-0000-00000000e001',
 vehicle:'00000000-0000-0000-0000-00000000a001'
};

function mockRows(table){
 if(table==='v2_teams')return[{id:sample.team,company_id:sample.company,name:'Equipe QA',status:'active',metadata:{}}];
 if(table==='v2_employees')return[{id:sample.employee,company_id:sample.company,employee_number:'99',full_name:'Funcionário QA',status:'active',job_title:'Cargueiro',primary_team:'Equipe QA'}];
 if(table==='v2_vehicles')return[{id:sample.vehicle,company_id:sample.company,plate:'QAQ1A23',name:'Micro-ônibus QA',status:'active',team_id:sample.team,current_km:123456,metadata:{}}];
 if(table==='v2_poultry_integrators')return[{id:'int-qa',company_id:sample.company,name:'Cliente QA',status:'active'}];
 if(table==='v2_poultry_farms')return[{id:'farm-qa',company_id:sample.company,integrator_id:'int-qa',producer_name:'Produtor QA',farm_name:'Granja QA',city:'Laranjal Paulista',status:'active'}];
 if(table==='v2_device_access')return[{id:'qa-device',company_id:sample.company,team_id:sample.team,device_name:'QA Campo',permissions:{ponto:true,apanha:true,abastecimento:true,relatorio:true,impressao:true},active:true,control_state:'active',lost_mode:false,device_info:{}}];
 return[];
}

async function installApiMock(page){
 await page.route('https://aycbrqziusxtxhsdfqjk.supabase.co/**',async route=>{
  const req=route.request(),url=new URL(req.url()),method=req.method().toUpperCase();
  let body='[]',status=200;
  if(url.pathname.includes('/auth/v1/user'))body=JSON.stringify({id:sample.user,aud:'authenticated',role:'authenticated',user_metadata:{name:'QA Campo'}});
  else if(url.pathname.includes('/auth/v1/token'))body=JSON.stringify({access_token:'qa-access-token',refresh_token:'qa-refresh-token',token_type:'bearer',expires_in:3600,user:{id:sample.user,aud:'authenticated',role:'authenticated'}});
  else if(url.pathname.includes('/rpc/'))body='[]';
  else if(url.pathname.includes('/functions/v1/'))body=JSON.stringify({ok:true,data:[]});
  else if(url.pathname.includes('/storage/v1/')){body='';status=404}
  else{
   const table=url.pathname.match(/\/rest\/v1\/([^/]+)/)?.[1];
   if(['POST','PATCH','PUT'].includes(method)){body=JSON.stringify([{id:'qa-write'}]);status=method==='POST'?201:200}
   else if(method==='DELETE'){body='[]';status=204}
   else body=JSON.stringify(mockRows(table));
  }
  await route.fulfill({status,contentType:'application/json; charset=utf-8',headers:{'access-control-allow-origin':'*','content-range':'0-0/1'},body});
 });
}

async function prepareField(page){
 await page.evaluate(sample=>{
  localStorage.setItem('controla_beta_session',JSON.stringify({access_token:'qa-access-token',refresh_token:'qa-refresh-token',expires_at:Date.now()+3600000,user:{id:sample.user,email:'qa@comando360.local',user_metadata:{comando360_device:true}}}));
  companyId=sample.company;
  companyProfile={id:sample.company,trade_name:'Empresa QA',legal_name:'Empresa QA'};
  deviceMode=true;
  deviceAccess={id:'qa-device',company_id:sample.company,team_id:sample.team,device_name:'QA Campo',active:true,permissions:{ponto:true,apanha:true,abastecimento:true,relatorio:true,impressao:true}};
  deviceTeam={id:sample.team,name:'Equipe QA',metadata:{}};
  currentRoleCode='device';isAdminGeneral=false;
  document.getElementById('login')?.classList.add('hidden');
  document.getElementById('app')?.classList.remove('hidden');
  document.body.classList.add('app-ready','device-mode');
  if(typeof applyDeviceUi==='function')applyDeviceUi();
  if(typeof initScreenRouter==='function')initScreenRouter();
  const n=document.getElementById('teamHomeName');if(n)n.textContent='Equipe QA';
  const v=document.getElementById('teamHomeVehicle');if(v)v.textContent='Celular de campo • QA';
  const b=document.getElementById('deviceModeTeam');if(b)b.textContent='Equipe QA';
 },sample);
 await page.evaluate(async()=>{if(typeof v2Go==='function')await v2Go('equipehome')});
 await page.waitForTimeout(500);
}

async function runViewport(browser,{name,width,height}){
 const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true});
 const page=await context.newPage();
 page.on('pageerror',e=>report.pageErrors.push({name,message:String(e?.stack||e)}));
 page.on('console',m=>{if(m.type()==='error'&&!/404|foto indisponível|not authenticated/i.test(m.text()))report.consoleErrors.push({name,text:m.text()})});
 await installApiMock(page);
 await page.goto(`${base}/?qa_r100=1`,{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(()=>typeof window.v2Go==='function'&&typeof window.initScreenRouter==='function',{timeout:12000});
 await prepareField(page);

 // Simula a permissão de localização negada: o aviso precisa entrar no fluxo, nunca cobrir Apanha.
 await page.evaluate(()=>{
  document.getElementById('c360LocationPermissionCard')?.remove();
  const card=document.createElement('div');card.id='c360LocationPermissionCard';
  card.innerHTML='<strong>📍 Localização bloqueada</strong><p>Permita Localização no Android e tente novamente.</p><div class="toolbar"><button class="btn primary" data-c360-enable-location type="button">TENTAR NOVAMENTE</button></div>';
  document.body.appendChild(card);
 });
 await page.waitForTimeout(180);
 const layout=await page.evaluate(()=>{
  const card=document.getElementById('c360LocationPermissionCard');
  const tile=document.querySelector('.team-home-grid .team-tile');
  const head=document.querySelector('.team-home-head');
  const header=document.querySelector('header');
  const sync=document.getElementById('c360FieldSyncStatus');
  const r=x=>x?.getBoundingClientRect();
  const cr=r(card),tr=r(tile),hr=r(head),top=r(header);
  return{
   parent:card?.parentElement?.className||'',
   cardBottom:cr?.bottom??99999,
   tileTop:tr?.top??-1,
   tileBottom:tr?.bottom??99999,
   viewport:innerHeight,
   gap:hr&&top?Math.round(hr.top-top.bottom):999,
   sync:!!sync,
   syncState:sync?.dataset?.state||''
  };
 });
 assert(`${name}:gps-no-fluxo`,/team-home/.test(layout.parent),JSON.stringify(layout));
 assert(`${name}:gps-nao-sobrepoe-apanha`,layout.cardBottom<=layout.tileTop+2,JSON.stringify(layout));
 assert(`${name}:apanha-aparece-na-primeira-tela`,layout.tileTop>=0&&layout.tileBottom<layout.viewport,JSON.stringify(layout));
 assert(`${name}:sem-buraco-no-topo`,layout.gap>=0&&layout.gap<=30,JSON.stringify(layout));
 assert(`${name}:status-sincronizacao`,layout.sync,JSON.stringify(layout));

 // Fila offline visível para o encarregado.
 await context.setOffline(true);
 await page.evaluate(async()=>{await window.C360Release?.refreshFieldSyncStatus?.()});
 const offline=await page.locator('#c360FieldSyncStatus').getAttribute('data-state');
 assert(`${name}:status-offline`,offline==='offline',offline);
 await context.setOffline(false);
 await page.evaluate(async()=>{
  localStorage.setItem('c360_team_chat_queue_v1_qa',JSON.stringify([{body:'pendente'}]));
  await window.C360Release?.refreshFieldSyncStatus?.();
 });
 const pending=await page.locator('#c360FieldSyncStatus').evaluate(el=>({state:el.dataset.state,text:el.textContent}));
 assert(`${name}:status-pendente`,pending.state==='pending'&&/1 registro/.test(pending.text),JSON.stringify(pending));

 // Dois toques imediatos numa ação crítica nunca podem executar duas gravações.
 const clicks=await page.evaluate(()=>{
  const b=document.createElement('button');b.id='savePoultryOpQA';b.textContent='SALVAR APANHA';document.body.appendChild(b);
  let n=0;b.addEventListener('click',()=>n++);b.click();b.click();return n;
 });
 assert(`${name}:anti-duplo-salvamento`,clicks===1,String(clicks));

 // A rejeição de Relatórios é um cenário administrativo. Troca temporariamente o contexto
 // apenas para validar o error boundary, sem liberar a rota no celular da equipe.
 await page.evaluate(()=>{
  document.body.classList.remove('device-mode');
  deviceMode=false;
  for(const el of document.querySelectorAll('[data-screen],.section'))el.classList.remove('active');
  const reports=document.getElementById('relatorios');
  if(reports){reports.hidden=false;reports.classList.remove('hidden');reports.classList.add('active');reports.style.setProperty('display','block','important')}
 });
 const before=await page.evaluate(()=>window.__c360ReleaseHealth?.unhandledRejections||0);
 await page.evaluate(()=>{
  const event=new PromiseRejectionEvent('unhandledrejection',{promise:Promise.resolve(),reason:new Error('QA report rejection')});
  window.dispatchEvent(event);
 });
 await page.waitForTimeout(80);
 const rejection=await page.evaluate(()=>({count:window.__c360ReleaseHealth?.unhandledRejections||0,live:document.getElementById('c360-release-live')?.textContent||'',app:!document.getElementById('app')?.classList.contains('hidden')}));
 assert(`${name}:relatorio-rejection-capturada`,rejection.count===before+1,JSON.stringify(rejection));
 assert(`${name}:relatorio-shell-continua`,rejection.app&&/Relatório/.test(rejection.live),JSON.stringify(rejection));

 // Restaura o aparelho para campo sem remontar os elementos internos já roteados.
 await page.evaluate(async()=>{
  const reports=document.getElementById('relatorios');
  if(reports){reports.style.removeProperty('display');reports.classList.remove('active');reports.classList.add('hidden');reports.hidden=true}
  deviceMode=true;document.body.classList.add('device-mode');
  if(typeof v2Go==='function')await v2Go('equipehome');
 });
 const adminVisible=await page.evaluate(()=>[...document.querySelectorAll('.admin-only')].some(e=>e.getClientRects().length&&getComputedStyle(e).display!=='none'&&getComputedStyle(e).visibility!=='hidden'));
 assert(`${name}:admin-oculto`,!adminVisible,String(adminVisible));

 await page.screenshot({path:path.join(out,`${name}.png`),fullPage:true});
 await context.close();
}

const browser=await chromium.launch({headless:true});
try{
 for(const cfg of [{name:'android-360',width:360,height:800},{name:'android-390',width:390,height:844}])await runViewport(browser,cfg);
}finally{await browser.close()}

assert('runtime:sem-page-errors',report.pageErrors.length===0,JSON.stringify(report.pageErrors));
assert('runtime:sem-console-errors',report.consoleErrors.length===0,JSON.stringify(report.consoleErrors));
const failed=report.checks.filter(x=>!x.ok);
report.summary={checks:report.checks.length,failed:failed.length};
await fs.writeFile(path.join(out,'field-torture-report.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report.summary,null,2));
if(failed.length){console.error(JSON.stringify(failed,null,2));process.exit(1)}
console.log('FIELD TORTURE R100: PASS');