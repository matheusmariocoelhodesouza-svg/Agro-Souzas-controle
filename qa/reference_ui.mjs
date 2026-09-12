import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const auditVersion='2026.09.12-r7-deep';
const base=process.env.C360_BASE_URL||'http://127.0.0.1:8080';
const out=path.resolve('qa-artifacts');
await fs.mkdir(out,{recursive:true});

const adminScreens=['inicio','equipes','funcionarios','documentosrh','ponto','operacoes','frota','manutencoes','combustivel','insumos','financeiro','relatorios','alertas','integracoes','configuracoes','ia'];
const fieldScreens=['equipehome','operacoes','ponto','combustivel','equipereport'];
const forbiddenField=['financeiro','frota','manutencoes','insumos','funcionarios','equipes','documentosrh','configuracoes','integracoes','ia','alertas'];
const results={auditVersion,base,pageErrors:[],consoleErrors:[],overflow:[],missing:[],sourceLeaks:[],flowErrors:[],dialogs:[],mockedWrites:[],checks:[],screenshots:[]};

const sample={
 company:'00000000-0000-0000-0000-00000000c361',team:'00000000-0000-0000-0000-00000000c362',user:'00000000-0000-0000-0000-00000000c360',employee:'00000000-0000-0000-0000-00000000e001',vehicle:'00000000-0000-0000-0000-00000000v001',item:'00000000-0000-0000-0000-00000000i001'
};
function pass(name,detail=''){results.checks.push({name,ok:true,detail})}
function fail(name,detail){results.flowErrors.push({label:name,message:String(detail)});results.checks.push({name,ok:false,detail:String(detail)})}
function safe(v){return String(v).replace(/[^a-z0-9_-]+/gi,'-').toLowerCase()}

function mockRows(table){
 if(table==='v2_teams')return[{id:sample.team,company_id:sample.company,name:'Equipe QA',status:'active',metadata:{}}];
 if(table==='v2_employees')return[{id:sample.employee,company_id:sample.company,employee_number:'99',full_name:'Funcionário QA',cpf:'',rg:'',birth_date:null,phone:'',address:{city:'Laranjal Paulista'},photo_path:null,primary_team:'Equipe QA',status:'active',job_title:'Cargueiro',admission_date:'2026-01-01'}];
 if(table==='v2_employee_face_enrollments')return[{employee_id:sample.employee,status:'active'}];
 if(table==='v2_inventory_items')return[{id:sample.item,company_id:sample.company,name:'Óleo QA',unit:'L',category:'insumo',status:'active',minimum_stock:5,current_stock:20,current_avg_cost:12.5,metadata:{note:'Teste automatizado'}}];
 if(table==='v2_inventory_movements')return[{id:'mov-qa',company_id:sample.company,item_id:sample.item,movement_type:'in',quantity:20,unit_cost:12.5,occurred_at:'2026-09-12T12:00:00-03:00',notes:'QA'}];
 if(table==='v2_vehicles')return[{id:sample.vehicle,company_id:sample.company,plate:'QAQ1A23',name:'Micro-ônibus QA',model:'Sprinter',make:'Mercedes-Benz',year:2018,status:'active',current_km:123456,team_id:sample.team,metadata:{}}];
 if(table==='v2_team_chat_settings')return[];
 if(table==='v2_team_chat_messages')return[];
 if(table==='v2_financial_entries'||table==='v2_report_monthly_financial')return[];
 if(table==='v2_poultry_integrators')return[{id:'int-qa',company_id:sample.company,name:'Cliente QA',status:'active'}];
 if(table==='v2_poultry_farms')return[{id:'farm-qa',company_id:sample.company,integrator_id:'int-qa',producer_name:'Produtor QA',farm_name:'Granja QA',city:'Laranjal Paulista',status:'active',address:{city:'Laranjal Paulista'}}];
 return[];
}

async function installApiMock(page){
 await page.route('https://aycbrqziusxtxhsdfqjk.supabase.co/**',async route=>{
  const req=route.request(),url=new URL(req.url()),method=req.method().toUpperCase();
  if(!['GET','HEAD','OPTIONS'].includes(method))results.mockedWrites.push({method,path:url.pathname,note:'interceptado pelo QA; produção não alterada'});
  let body='[]',status=200;
  if(url.pathname.includes('/auth/v1/user'))body=JSON.stringify({id:sample.user,aud:'authenticated',role:'authenticated',is_anonymous:false,app_metadata:{provider:'email',providers:['email']},user_metadata:{name:'QA Comando 360'}});
  else if(url.pathname.includes('/auth/v1/token'))body=JSON.stringify({access_token:'qa-access-token',refresh_token:'qa-refresh-token',token_type:'bearer',expires_in:3600,user:{id:sample.user,aud:'authenticated',role:'authenticated'}});
  else if(url.pathname.includes('/functions/v1/'))body=JSON.stringify({ok:true,data:[],items:[]});
  else if(url.pathname.includes('/storage/v1/')){body='';status=404}
  else{
   const m=url.pathname.match(/\/rest\/v1\/([^/]+)/);const table=m?.[1];
   if(['POST','PATCH','PUT'].includes(method)){body=JSON.stringify([{id:'qa-write',...Object.fromEntries(url.searchParams)}]);status=method==='POST'?201:200}
   else if(method==='DELETE'){body='[]';status=204}
   else body=JSON.stringify(mockRows(table));
  }
  await route.fulfill({status,contentType:'application/json; charset=utf-8',headers:{'access-control-allow-origin':'*','content-range':'0-0/1'},body});
 });
}

function attachRuntime(page,label){
 page.on('pageerror',e=>results.pageErrors.push({viewport:label,message:String(e?.stack||e)}));
 page.on('console',m=>{if(m.type()!=='error')return;const t=m.text();if(/failed to load resource|401|403|404|not authenticated|invalid refresh token|foto indisponível/i.test(t))return;results.consoleErrors.push({viewport:label,text:t})});
 page.on('dialog',async d=>{results.dialogs.push({viewport:label,type:d.type(),message:d.message()});try{await d.dismiss()}catch{}});
}
async function audit(page,label){
 const a=await page.evaluate(()=>({html:document.documentElement.scrollWidth-document.documentElement.clientWidth,body:document.body.scrollWidth-document.documentElement.clientWidth,text:document.body?.innerText||'',router:typeof v2Go==='function',point:typeof loadTeamPoint==='function'}));
 if(Math.max(a.html,a.body)>2)results.overflow.push({label,html:a.html,body:a.body});
 const patterns=['function setTextSafe','async function loadTeamPoint',"'+esc(e.full_name)+'",'const currentEmployees=employees.filter','window.__pointSelfieFile=null','Object.fromEntries(employees.map','events=events.filter(ev=>'];
 const hit=patterns.find(p=>a.text.includes(p));if(hit||!a.router||!a.point)results.sourceLeaks.push({label,hit:hit||null,router:a.router,point:a.point});
}
async function shot(page,name){const file=safe(name)+'.png';await page.screenshot({path:path.join(out,file),fullPage:true});results.screenshots.push(file)}
async function waitRuntime(page){await page.waitForFunction(()=>typeof window.v2Go==='function'&&typeof window.initScreenRouter==='function',{timeout:10000})}

async function openShell(browser,name,viewport,isMobile=false){
 const context=await browser.newContext({viewport,isMobile,hasTouch:isMobile});const page=await context.newPage();attachRuntime(page,name);await installApiMock(page);
 await page.goto(`${base}/?qa_deep=1`,{waitUntil:'domcontentloaded',timeout:30000});await waitRuntime(page);await page.waitForTimeout(300);return{context,page};
}
async function prepareMode(page,mode){
 const state=await page.evaluate(({mode,sample})=>{
  let err='';
  try{
   localStorage.setItem('controla_beta_session',JSON.stringify({access_token:'qa-access-token',refresh_token:'qa-refresh-token',expires_at:Date.now()+3600000,user:{id:sample.user,email:'qa@comando360.local'}}));
   companyId=sample.company;companyProfile={id:sample.company,trade_name:'Empresa QA',legal_name:'Empresa QA',tax_id:'00.000.000/0001-00'};
   deviceMode=mode==='field';deviceAccess=deviceMode?{id:'qa-device',company_id:sample.company,team_id:sample.team,status:'active'}:null;deviceTeam=deviceMode?{id:sample.team,name:'Equipe QA',metadata:{}}:null;currentRoleCode=deviceMode?'device':'admin';isAdminGeneral=!deviceMode;
   document.getElementById('login')?.classList.add('hidden');document.getElementById('app')?.classList.remove('hidden');document.body.classList.add('app-ready');document.body.classList.toggle('device-mode',deviceMode);
   // Mesma ordem do app real: modo de campo ajusta a UI enquanto todas as telas ainda existem; só depois o roteador as move.
   if(deviceMode&&typeof applyDeviceUi==='function')applyDeviceUi();
   initScreenRouter();
   if(deviceMode){const n=document.getElementById('teamHomeName');if(n)n.textContent='Equipe QA';const v=document.getElementById('teamHomeVehicle');if(v)v.textContent='Celular de campo • QA';const b=document.getElementById('deviceModeTeam');if(b)b.textContent='Equipe QA'}
  }catch(e){err=String(e?.stack||e)}
  return{err,deviceMode:typeof deviceMode!=='undefined'?deviceMode:null};
 },{mode,sample});
 if(state.err)fail(`${mode}:preparação`,state.err);else pass(`${mode}:preparação`);
 return state;
}
async function route(page,id,label){
 try{
  const s=await page.evaluate(async id=>{await v2Go(id);const el=document.getElementById(id),visible=x=>!!x&&!x.hidden&&getComputedStyle(x).display!=='none';return{exists:!!el,visible:visible(el),active:[...document.querySelectorAll('[data-screen]')].filter(visible).map(x=>x.id)}} ,id);
  if(!s.exists||!s.visible)fail(label,`#${id} não ficou visível; ativas=${s.active.join(',')||'nenhuma'}`);else pass(label);
 }catch(e){fail(label,e?.stack||e)}
 await page.waitForTimeout(90);await audit(page,label);
}
async function expectVisible(page,selector,label,visible=true){
 const s=await page.evaluate(({selector,visible})=>{const e=document.querySelector(selector);if(!e)return{exists:false,actual:false};const actual=!e.hidden&&!e.classList.contains('hidden')&&getComputedStyle(e).display!=='none'&&getComputedStyle(e).visibility!=='hidden';return{exists:true,actual,expected:visible}}, {selector,visible});
 if(!s.exists||s.actual!==visible)fail(label,`${selector}: esperado ${visible?'visível':'oculto'}, obtido ${s.actual}`);else pass(label);
}
async function click(page,selector,label){try{const el=page.locator(selector);if(!await el.count()){fail(label,`${selector} ausente`);return false}await el.first().click({timeout:3000});await page.waitForTimeout(120);pass(label);return true}catch(e){fail(label,e);return false}}

async function testPoint(page,prefix){
 await route(page,'ponto',`${prefix}:ponto:rota`);
 if(await click(page,'#methodFace',`${prefix}:ponto:selfie`)){
  const s=await page.evaluate(()=>({face:!document.getElementById('faceMode')?.classList.contains('hidden'),mat:document.getElementById('matriculaMode')?.classList.contains('hidden')}));
  if(!s.face||!s.mat)fail(`${prefix}:ponto:selfie-estado`,JSON.stringify(s));else pass(`${prefix}:ponto:selfie-estado`);
 }
 await click(page,'#methodMatricula',`${prefix}:ponto:matricula`);
 const s=await page.evaluate(()=>({mat:!document.getElementById('matriculaMode')?.classList.contains('hidden'),face:document.getElementById('faceMode')?.classList.contains('hidden')}));if(!s.mat||!s.face)fail(`${prefix}:ponto:matricula-estado`,JSON.stringify(s));else pass(`${prefix}:ponto:matricula-estado`);
}
async function testPoultry(page,mode,prefix){
 await route(page,'operacoes',`${prefix}:apanha:rota`);if(!await click(page,'#newPoultryOp',`${prefix}:apanha:nova`))return;
 await expectVisible(page,'#poultryForm',`${prefix}:apanha:form`,true);
 const planning=await page.evaluate(()=>{const e=document.getElementById('poAdminPlanning');return!!e&&!e.classList.contains('hidden')&&getComputedStyle(e).display!=='none'});
 if(mode==='field'&&planning)fail(`${prefix}:apanha:planejamento`,'planejamento administrativo visível no campo');else if(mode==='admin'&&!planning)fail(`${prefix}:apanha:planejamento`,'planejamento administrativo oculto no admin');else pass(`${prefix}:apanha:planejamento`);
 const eb=page.locator('.po-energy-btn');if(await eb.count()>=2){await eb.nth(0).click();await eb.nth(1).click();const v=await page.locator('#poEnergyType').inputValue();if(!/380/.test(v))fail(`${prefix}:apanha:tensão`,v);else pass(`${prefix}:apanha:tensão`)}else fail(`${prefix}:apanha:tensão`,'botões 220/380 ausentes');
 await audit(page,`${prefix}:apanha:aberta`);await click(page,'#closePoultryForm',`${prefix}:apanha:cancelar`);
}
async function testAdminForms(page){
 await route(page,'frota','admin:frota:rota');if(await click(page,'#newVehicleBtn','admin:frota:novo')){await expectVisible(page,'#vehicleEditCard','admin:frota:form',true);await click(page,'#cancelVehicleEdit','admin:frota:cancelar')}
 await route(page,'manutencoes','admin:manutenção:rota');if(await click(page,'#newMaintenanceBtn','admin:manutenção:nova')){await expectVisible(page,'#maintenanceEditCard','admin:manutenção:form',true);await click(page,'#cancelMaintenanceEdit','admin:manutenção:cancelar')}
 await route(page,'combustivel','admin:combustível:rota');if(await click(page,'#newFuelBtn','admin:combustível:novo')){await expectVisible(page,'#fuelEditCard','admin:combustível:form',true);await click(page,'#cancelFuelEdit','admin:combustível:cancelar')}
 await route(page,'insumos','admin:insumos:rota');
 try{await page.evaluate(async()=>{if(typeof loadConsumables==='function')await loadConsumables()});await page.waitForTimeout(450);pass('admin:insumos:carregar')}catch(e){fail('admin:insumos:carregar',e)}
 if(await click(page,'#newConsumableItemBtn','admin:insumos:novo')){const open=await page.locator('#consumableItemForm').evaluate(e=>e.classList.contains('open'));if(!open)fail('admin:insumos:form','form não abriu');else pass('admin:insumos:form');await click(page,'#cancelConsumableItem','admin:insumos:cancelar')}
 const edit=page.locator('.c360-consumable-edit-btn');if(await edit.count()){await edit.first().click();await page.waitForTimeout(150);const st=await page.evaluate(()=>({id:document.getElementById('consumableItemForm')?.dataset.editId,name:document.getElementById('consumableName')?.value,cost:document.getElementById('consumableAvgCost')?.value}));if(st.id!==sample.item||st.name!=='Óleo QA')fail('admin:insumos:editar',JSON.stringify(st));else pass('admin:insumos:editar');await click(page,'#cancelConsumableItem','admin:insumos:editar-cancelar')}else fail('admin:insumos:editar','botão Editar não foi injetado');
 await route(page,'financeiro','admin:financeiro:rota');if(await click(page,'#newFinEntryBtn','admin:financeiro:novo')){await expectVisible(page,'#finEditCard','admin:financeiro:form',true);await click(page,'#saveFinEntry','admin:financeiro:validar-vazio');const msg=await page.locator('#finMsg').textContent();if(!msg?.trim())fail('admin:financeiro:validação','form vazio não mostrou validação');else pass('admin:financeiro:validação',msg.trim());await click(page,'#cancelFinEntry','admin:financeiro:cancelar')}
 const privacy=page.locator('#toggleFinancePrivacy');if(await privacy.count()){const before=await privacy.textContent();await privacy.click();const after=await privacy.textContent();if(before===after)fail('admin:financeiro:privacidade','botão não alterou estado');else pass('admin:financeiro:privacidade')}
}
async function testAdminChat(page){
 try{await page.waitForSelector('#c360ChatFab',{timeout:5000});await page.locator('#c360ChatFab').click();await expectVisible(page,'#c360ChatOverlay','admin:chat:abrir',true);await expectVisible(page,'#c360ChatSettings','admin:chat:configuração',true);await click(page,'#c360ChatClose','admin:chat:fechar')}catch(e){fail('admin:chat',e)}
}
async function adminFlow(browser){
 const{context,page}=await openShell(browser,'admin',{width:1440,height:1000});await prepareMode(page,'admin');
 for(const id of adminScreens)await route(page,id,`admin:tela:${id}`);
 await testPoint(page,'admin');await testPoultry(page,'admin','admin');await testAdminForms(page);await testAdminChat(page);await shot(page,'admin-final');await context.close();
}
async function fieldFlow(browser){
 const{context,page}=await openShell(browser,'campo',{width:390,height:844},true);await prepareMode(page,'field');await route(page,'equipehome','campo:início');
 try{await page.waitForSelector('#c360TeamChatTile',{timeout:5000})}catch{}
 const tiles=await page.evaluate(()=>[...document.querySelectorAll('#equipehome .team-tile')].map(x=>x.textContent.replace(/\s+/g,' ').trim()));
 for(const name of ['Apanha','Ponto','Abastecimento','Relatório','Mensagens']){if(!tiles.some(x=>x.includes(name)))fail(`campo:atalho:${name}`,tiles.join(' | '));else pass(`campo:atalho:${name}`)}
 for(const id of fieldScreens.slice(1))await route(page,id,`campo:tela:${id}`);
 for(const id of forbiddenField){
  try{const s=await page.evaluate(async id=>{await v2Go(id);const vis=e=>!!e&&!e.hidden&&getComputedStyle(e).display!=='none';return{home:vis(document.getElementById('equipehome')),bad:vis(document.getElementById(id))}},id);if(!s.home||s.bad)fail(`campo:bloqueio:${id}`,JSON.stringify(s));else pass(`campo:bloqueio:${id}`)}catch(e){fail(`campo:bloqueio:${id}`,e)}
 }
 await testPoint(page,'campo');await testPoultry(page,'field','campo');
 await route(page,'combustivel','campo:combustível:rota');if(await click(page,'#newFuelBtn','campo:combustível:novo')){await expectVisible(page,'#fuelEditCard','campo:combustível:form',true);await click(page,'#cancelFuelEdit','campo:combustível:cancelar')}
 try{
  await route(page,'equipehome','campo:chat:home');await page.waitForSelector('#c360TeamChatTile',{timeout:3000});await context.setOffline(true);await page.locator('#c360TeamChatTile').click();await expectVisible(page,'#c360ChatOverlay','campo:chat:offline-abrir',true);await page.locator('#c360ChatText').fill('Mensagem QA offline');await page.locator('#c360ChatSend').click();await page.waitForTimeout(150);const queued=await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('c360_team_chat_queue_v1_')).reduce((n,k)=>{try{return n+JSON.parse(localStorage.getItem(k)||'[]').length}catch{return n}},0));if(queued<1)fail('campo:chat:fila-offline','mensagem não entrou na fila');else pass('campo:chat:fila-offline',String(queued));await context.setOffline(false);await click(page,'#c360ChatClose','campo:chat:fechar');
 }catch(e){await context.setOffline(false);fail('campo:chat:offline',e)}
 const adminVisible=await page.evaluate(()=>[...document.querySelectorAll('.admin-only')].some(e=>!e.closest('.hidden')&&getComputedStyle(e).display!=='none'));if(adminVisible)fail('campo:admin-only','conteúdo administrativo visível');else pass('campo:admin-only');
 await audit(page,'campo:final');await shot(page,'campo-final');await context.close();
}
async function responsiveFlow(browser){
 for(const cfg of [{name:'android-360',w:360,h:800},{name:'tablet',w:768,h:1024}]){
  const{context,page}=await openShell(browser,cfg.name,{width:cfg.w,height:cfg.h},cfg.w<600);await prepareMode(page,cfg.w<600?'field':'admin');
  for(const id of cfg.w<600?['equipehome','operacoes','ponto','combustivel']:['inicio','frota','insumos','financeiro']){await route(page,id,`${cfg.name}:${id}`);await audit(page,`${cfg.name}:${id}`)}
  await context.close();
 }
}
async function pwaOfflineFlow(browser){
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'allow'});const page=await context.newPage();attachRuntime(page,'pwa');await installApiMock(page);
 await page.goto(`${base}/?qa_pwa=1`,{waitUntil:'domcontentloaded',timeout:30000});await waitRuntime(page);
 try{await page.evaluate(async()=>{await Promise.race([navigator.serviceWorker.ready,new Promise(r=>setTimeout(r,6000))])});await page.reload({waitUntil:'domcontentloaded'});await page.waitForTimeout(400);const controlled=await page.evaluate(()=>!!navigator.serviceWorker.controller);if(!controlled)fail('pwa:service-worker','página não ficou controlada');else pass('pwa:service-worker');
  const cacheState=await page.evaluate(async()=>{const names=await caches.keys();const urls=['./c360-team-chat.js','./c360-farm-cache-hotfix.js','./c360-field-offline-hotfix.js','./c360-consumable-edit.js'];const hits={};for(const u of urls){let found=false;for(const n of names){const c=await caches.open(n);if(await c.match(u)){found=true;break}}hits[u]=found}return{names,hits}});for(const [u,ok] of Object.entries(cacheState.hits)){if(!ok)fail(`pwa:cache:${u}`,'asset não encontrado no cache');else pass(`pwa:cache:${u}`)}
  await context.setOffline(true);await page.reload({waitUntil:'domcontentloaded',timeout:15000});await page.waitForTimeout(400);if(!await page.locator('#login').count())fail('pwa:offline-shell','shell não abriu offline');else pass('pwa:offline-shell');await audit(page,'pwa:offline');await context.setOffline(false);
 }catch(e){await context.setOffline(false);fail('pwa:offline',e)}await context.close();
}
async function auxiliaryPages(browser){
 for(const p of ['dda.html','importar-granjas.html','reparar.html']){const page=await browser.newPage({viewport:{width:390,height:844}});attachRuntime(page,p);await installApiMock(page);try{await page.goto(`${base}/${p}?qa=1`,{waitUntil:'domcontentloaded',timeout:30000});await page.waitForTimeout(250);const o=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);if(o>2)results.overflow.push({label:p,html:o});pass(`página:${p}`)}catch(e){fail(`página:${p}`,e)}await page.close()}
}

const browser=await chromium.launch({headless:true});
try{await adminFlow(browser);await fieldFlow(browser);await responsiveFlow(browser);await pwaOfflineFlow(browser);await auxiliaryPages(browser)}finally{await browser.close()}

await fs.writeFile(path.join(out,'report.json'),JSON.stringify(results,null,2));
const summary={auditVersion:results.auditVersion,checks:results.checks.length,failedChecks:results.checks.filter(x=>!x.ok).length,screenshots:results.screenshots.length,pageErrors:results.pageErrors.length,consoleErrors:results.consoleErrors.length,overflow:results.overflow.length,missing:results.missing.length,sourceLeaks:results.sourceLeaks.length,flowErrors:results.flowErrors.length,dialogs:results.dialogs.length,mockedWrites:results.mockedWrites.length};
console.log(JSON.stringify(summary,null,2));
if(summary.pageErrors||summary.consoleErrors||summary.overflow||summary.missing||summary.sourceLeaks||summary.flowErrors){console.error('Reference browser QA failed. See qa-artifacts/report.json');process.exit(1)}
