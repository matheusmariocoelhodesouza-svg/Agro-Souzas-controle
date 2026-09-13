import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const VERSION='2026.09.13-stress1';
const base=process.env.C360_BASE_URL||'http://127.0.0.1:8080';
const totalSessions=Math.max(1000,Number(process.env.C360_STRESS_SESSIONS||1000));
const adminSessions=Math.ceil(totalSessions/2);
const fieldSessions=totalSessions-adminSessions;
const out=path.resolve('qa-stress-artifacts');
await fs.mkdir(out,{recursive:true});

const adminScreens=['inicio','equipes','funcionarios','documentosrh','ponto','operacoes','frota','manutencoes','combustivel','insumos','financeiro','relatorios','alertas','integracoes','configuracoes','ia'];
const fieldScreens=['equipehome','operacoes','ponto','combustivel','equipereport'];
const forbiddenField=['financeiro','frota','manutencoes','insumos','funcionarios','equipes','documentosrh','configuracoes','integracoes','ia','alertas'];
const sample={
 company:'00000000-0000-0000-0000-00000000c361',team:'00000000-0000-0000-0000-00000000c362',user:'00000000-0000-0000-0000-00000000c360',employee:'00000000-0000-0000-0000-00000000e001',vehicle:'00000000-0000-0000-0000-00000000v001',item:'00000000-0000-0000-0000-00000000i001',role:'00000000-0000-0000-0000-00000000a001'
};
const results={
 version:VERSION,totalSessions,adminSessions,fieldSessions,startedAt:new Date().toISOString(),finishedAt:null,durationMs:0,
 journeysCompleted:0,routes:0,actions:0,reloads:0,viewportChanges:0,mockedWrites:0,
 pageErrors:[],consoleErrors:[],flowErrors:[],overflow:[],multiScreen:[],forbiddenLeaks:[],screenshots:[]
};
const started=Date.now();
const record=(bucket,payload,limit=100)=>{if(results[bucket].length<limit)results[bucket].push(payload)};
const errText=e=>String(e?.stack||e?.message||e);

function mockRows(table){
 if(table==='v2_companies')return[{id:sample.company,legal_name:'Empresa QA',trade_name:'Empresa QA',tax_id:'00.000.000/0001-00',status:'active',created_at:'2026-09-01T12:00:00Z',metadata:{}}];
 if(table==='v2_subscriptions')return[{company_id:sample.company,plan_code:'complete',status:'trial',trial_ends_at:'2026-09-27T12:00:00Z',current_period_start:'2026-09-13T12:00:00Z',current_period_end:'2026-09-27T12:00:00Z',limits:{}}];
 if(table==='v2_company_members')return[{company_id:sample.company,user_id:sample.user,role_id:sample.role,status:'active'}];
 if(table==='v2_roles')return[{id:sample.role,company_id:null,code:'admin',name:'Administrador'}];
 if(table==='v2_teams')return[{id:sample.team,company_id:sample.company,name:'Equipe QA',status:'active',metadata:{}}];
 if(table==='v2_employees')return[{id:sample.employee,company_id:sample.company,employee_number:'99',full_name:'Funcionário QA',cpf:'',rg:'',birth_date:null,phone:'',address:{city:'Laranjal Paulista'},photo_path:null,primary_team:'Equipe QA',status:'active',job_title:'Cargueiro',admission_date:'2026-01-01'}];
 if(table==='v2_employee_face_enrollments')return[{employee_id:sample.employee,status:'active'}];
 if(table==='v2_inventory_items')return[{id:sample.item,company_id:sample.company,name:'Óleo QA',unit:'L',category:'insumo',status:'active',minimum_stock:5,current_stock:20,current_avg_cost:12.5,metadata:{note:'Teste automatizado'}}];
 if(table==='v2_inventory_movements')return[{id:'mov-qa',company_id:sample.company,item_id:sample.item,movement_type:'in',quantity:20,unit_cost:12.5,occurred_at:'2026-09-12T12:00:00-03:00',notes:'QA'}];
 if(table==='v2_vehicles')return[{id:sample.vehicle,company_id:sample.company,plate:'QAQ1A23',description:'Micro-ônibus QA',name:'Micro-ônibus QA',model:'Sprinter',make:'Mercedes-Benz',year:2018,status:'active',current_km:123456,current_odometer_km:123456,team_id:sample.team,metadata:{}}];
 if(table==='v2_team_chat_settings'||table==='v2_team_chat_messages'||table==='v2_financial_entries'||table==='v2_report_monthly_financial')return[];
 if(table==='v2_poultry_integrators')return[{id:'int-qa',company_id:sample.company,name:'Cliente QA',status:'active'}];
 if(table==='v2_poultry_farms')return[{id:'farm-qa',company_id:sample.company,integrator_id:'int-qa',producer_name:'Produtor QA',farm_name:'Granja QA',city:'Laranjal Paulista',status:'active',address:{city:'Laranjal Paulista'}}];
 if(table==='v2_device_access')return[{id:'qa-device',company_id:sample.company,team_id:sample.team,status:'active',device_name:'Celular QA'}];
 return[];
}

async function installApiMock(page){
 await page.route('https://aycbrqziusxtxhsdfqjk.supabase.co/**',async route=>{
  const req=route.request(),url=new URL(req.url()),method=req.method().toUpperCase();
  if(!['GET','HEAD','OPTIONS'].includes(method))results.mockedWrites++;
  let body='[]',status=200;
  if(url.pathname.includes('/auth/v1/user'))body=JSON.stringify({id:sample.user,email:'qa@comando360.local',aud:'authenticated',role:'authenticated',is_anonymous:false,app_metadata:{provider:'email',providers:['email']},user_metadata:{name:'Usuário QA'}});
  else if(url.pathname.includes('/auth/v1/token'))body=JSON.stringify({access_token:'qa-access-token',refresh_token:'qa-refresh-token',token_type:'bearer',expires_in:3600,user:{id:sample.user,email:'qa@comando360.local',aud:'authenticated',role:'authenticated'}});
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
 page.on('pageerror',e=>record('pageErrors',{label,message:errText(e)}));
 page.on('console',m=>{
  if(m.type()!=='error')return;
  const t=m.text();
  if(/failed to load resource|401|403|404|not authenticated|invalid refresh token|foto indisponível|favicon/i.test(t))return;
  record('consoleErrors',{label,text:t});
 });
 page.on('dialog',async d=>{try{await d.dismiss()}catch{}});
}
async function waitRuntime(page){await page.waitForFunction(()=>typeof window.v2Go==='function'&&typeof window.initScreenRouter==='function',{timeout:12000})}
async function seedMode(page,mode){
 const state=await page.evaluate(({mode,sample})=>{
  let error='';
  try{
   localStorage.setItem('controla_beta_session',JSON.stringify({access_token:'qa-access-token',refresh_token:'qa-refresh-token',expires_at:Date.now()+3600000,user:{id:sample.user,email:'qa@comando360.local'}}));
   companyId=sample.company;companyProfile={id:sample.company,trade_name:'Empresa QA',legal_name:'Empresa QA',tax_id:'00.000.000/0001-00'};
   deviceMode=mode==='field';deviceAccess=deviceMode?{id:'qa-device',company_id:sample.company,team_id:sample.team,status:'active',device_name:'Celular QA'}:null;deviceTeam=deviceMode?{id:sample.team,name:'Equipe QA',metadata:{}}:null;currentRoleCode=deviceMode?'device':'admin';isAdminGeneral=!deviceMode;
   document.getElementById('login')?.classList.add('hidden');document.getElementById('app')?.classList.remove('hidden');document.body.classList.add('app-ready');document.body.classList.toggle('device-mode',deviceMode);
   if(deviceMode&&typeof applyDeviceUi==='function')applyDeviceUi();
   initScreenRouter();
   if(deviceMode){const n=document.getElementById('teamHomeName');if(n)n.textContent='Equipe QA';const v=document.getElementById('teamHomeVehicle');if(v)v.textContent='Celular de campo • QA';const b=document.getElementById('deviceModeTeam');if(b)b.textContent='Equipe QA'}
  }catch(e){error=String(e?.stack||e)}
  return{error};
 },{mode,sample});
 if(state.error)throw new Error(state.error);
}

async function openMode(browser,mode,label){
 const field=mode==='field';
 const context=await browser.newContext({viewport:field?{width:390,height:844}:{width:1440,height:1000},isMobile:field,hasTouch:field,serviceWorkers:'block'});
 const page=await context.newPage();attachRuntime(page,label);await installApiMock(page);
 await page.goto(`${base}/?qa_stress=1&mode=${mode}`,{waitUntil:'domcontentloaded',timeout:30000});await waitRuntime(page);await seedMode(page,mode);await page.waitForTimeout(80);
 return{context,page};
}
async function reloadMode(page,mode){
 await page.reload({waitUntil:'domcontentloaded',timeout:30000});await waitRuntime(page);await seedMode(page,mode);results.reloads++;await page.waitForTimeout(35);
}

async function route(page,id,label,field=false){
 try{
  const state=await page.evaluate(async({id,field})=>{
   await v2Go(id);
   const visible=e=>!!e&&!e.hidden&&!e.classList.contains('hidden')&&getComputedStyle(e).display!=='none'&&getComputedStyle(e).visibility!=='hidden';
   const el=document.getElementById(id);const active=[...document.querySelectorAll('[data-screen]')].filter(visible).map(e=>e.id);
   return{exists:!!el,target:visible(el),active,html:document.documentElement.scrollWidth-document.documentElement.clientWidth,body:document.body.scrollWidth-document.documentElement.clientWidth,home:visible(document.getElementById('equipehome'))};
  },{id,field});
  results.routes++;
  if(!state.exists||!state.target){
   if(field&&forbiddenField.includes(id)&&state.home)return state;
   record('flowErrors',{label,message:`rota ${id} não ficou visível; ativas=${state.active.join(',')||'nenhuma'}`});
  }
  if(!field&&!forbiddenField.includes(id)&&state.active.length!==1)record('multiScreen',{label,id,active:state.active});
  if(Math.max(state.html,state.body)>2)record('overflow',{label,id,html:state.html,body:state.body});
  return state;
 }catch(e){record('flowErrors',{label,message:errText(e)});return null}
}

async function clickIf(page,selector,label,expectSelector=null){
 try{
  const loc=page.locator(selector);if(!await loc.count())return false;
  await loc.first().click({timeout:1800});results.actions++;
  if(expectSelector){const ok=await page.locator(expectSelector).first().evaluate(e=>!e.hidden&&!e.classList.contains('hidden')&&getComputedStyle(e).display!=='none').catch(()=>false);if(!ok)record('flowErrors',{label,message:`${expectSelector} não abriu`})}
  return true;
 }catch(e){record('flowErrors',{label,message:errText(e)});return false}
}
async function adminMicroActions(page,i){
 if(i%2===0){await route(page,'ponto',`admin-${i}:ponto`);await clickIf(page,'#methodFace',`admin-${i}:face`);await clickIf(page,'#methodMatricula',`admin-${i}:matricula`)}
 if(i%3===0){await route(page,'operacoes',`admin-${i}:operacoes`);if(await clickIf(page,'#newPoultryOp',`admin-${i}:apanha-abrir`,'#poultryForm')){const energy=page.locator('.po-energy-btn');if(await energy.count()>=2){await energy.nth(i%2).click();results.actions++;await energy.nth((i+1)%2).click();results.actions++}await clickIf(page,'#closePoultryForm',`admin-${i}:apanha-fechar`)}}
 if(i%4===0){await route(page,'frota',`admin-${i}:frota`);if(await clickIf(page,'#newVehicleBtn',`admin-${i}:veiculo-abrir`,'#vehicleEditCard'))await clickIf(page,'#cancelVehicleEdit',`admin-${i}:veiculo-fechar`)}
 if(i%5===0){await route(page,'manutencoes',`admin-${i}:manut`);if(await clickIf(page,'#newMaintenanceBtn',`admin-${i}:manut-abrir`,'#maintenanceEditCard'))await clickIf(page,'#cancelMaintenanceEdit',`admin-${i}:manut-fechar`)}
 if(i%6===0){await route(page,'combustivel',`admin-${i}:fuel`);if(await clickIf(page,'#newFuelBtn',`admin-${i}:fuel-abrir`,'#fuelEditCard'))await clickIf(page,'#cancelFuelEdit',`admin-${i}:fuel-fechar`)}
 if(i%7===0){await route(page,'insumos',`admin-${i}:insumos`);try{await page.evaluate(async()=>{if(typeof loadConsumables==='function')await loadConsumables()});await page.waitForTimeout(25)}catch(e){record('flowErrors',{label:`admin-${i}:insumos-load`,message:errText(e)})}if(await clickIf(page,'#newConsumableItemBtn',`admin-${i}:insumo-abrir`,'#consumableItemForm'))await clickIf(page,'#cancelConsumableItem',`admin-${i}:insumo-fechar`)}
 if(i%8===0){await route(page,'financeiro',`admin-${i}:fin`);if(await clickIf(page,'#newFinEntryBtn',`admin-${i}:fin-abrir`,'#finEditCard'))await clickIf(page,'#cancelFinEntry',`admin-${i}:fin-fechar`);await clickIf(page,'#toggleFinancePrivacy',`admin-${i}:privacidade`)}
 if(i%9===0)await clickIf(page,'#themeToggle',`admin-${i}:tema`);
 if(i%10===0&&await page.locator('#c360ChatFab').count()){await clickIf(page,'#c360ChatFab',`admin-${i}:chat`,'#c360ChatOverlay');await clickIf(page,'#c360ChatClose',`admin-${i}:chat-fechar`)}
 if(i%11===0&&await page.locator('#c360AccountBtn').count()){await clickIf(page,'#c360AccountBtn',`admin-${i}:conta`);await page.keyboard.press('Escape').catch(()=>{})}
}
async function fieldMicroActions(page,context,i){
 await route(page,'equipehome',`field-${i}:home`,true);
 const tiles=await page.evaluate(()=>[...document.querySelectorAll('#equipehome .team-tile')].map(e=>(e.textContent||'').replace(/\s+/g,' ').trim()));
 for(const name of ['Apanha','Ponto','Abastecimento','Relatório'])if(!tiles.some(x=>x.includes(name)))record('flowErrors',{label:`field-${i}:tile-${name}`,message:tiles.join(' | ')});
 if(i%2===0){await route(page,'ponto',`field-${i}:ponto`,true);await clickIf(page,'#methodFace',`field-${i}:face`);await clickIf(page,'#methodMatricula',`field-${i}:matricula`)}
 if(i%3===0){await route(page,'operacoes',`field-${i}:operacoes`,true);if(await clickIf(page,'#newPoultryOp',`field-${i}:apanha-abrir`,'#poultryForm')){const planning=await page.locator('#poAdminPlanning').evaluate(e=>!e.hidden&&!e.classList.contains('hidden')&&getComputedStyle(e).display!=='none').catch(()=>false);if(planning)record('forbiddenLeaks',{label:`field-${i}:planejamento-admin`});await clickIf(page,'#closePoultryForm',`field-${i}:apanha-fechar`)}}
 if(i%4===0){await route(page,'combustivel',`field-${i}:fuel`,true);if(await clickIf(page,'#newFuelBtn',`field-${i}:fuel-abrir`,'#fuelEditCard'))await clickIf(page,'#cancelFuelEdit',`field-${i}:fuel-fechar`)}
 const forbidden=forbiddenField[i%forbiddenField.length];const state=await route(page,forbidden,`field-${i}:bloqueio-${forbidden}`,true);if(state&&!state.home)record('forbiddenLeaks',{label:`field-${i}:${forbidden}`,active:state.active});
 if(i%20===0&&await page.locator('#c360TeamChatTile').count()){
  try{await context.setOffline(true);await page.locator('#c360TeamChatTile').click({timeout:1500});results.actions++;if(await page.locator('#c360ChatText').count()){await page.locator('#c360ChatText').fill(`Stress ${i}`);await page.locator('#c360ChatSend').click({timeout:1500});results.actions++}await context.setOffline(false);await clickIf(page,'#c360ChatClose',`field-${i}:chat-fechar`)}catch(e){await context.setOffline(false);record('flowErrors',{label:`field-${i}:offline-chat`,message:errText(e)})}
 }
}

async function adminWorker(browser){
 let{context,page}=await openMode(browser,'admin','stress-admin');
 try{
  for(let i=1;i<=adminSessions;i++){
   if(i>1&&i%50===0)await reloadMode(page,'admin');
   if(i%25===0){const vp=i%50===0?{width:1024,height:768}:{width:1440,height:1000};await page.setViewportSize(vp);results.viewportChanges++}
   for(const id of adminScreens)await route(page,id,`admin-${i}:${id}`,false);
   await adminMicroActions(page,i);
   results.journeysCompleted++;
   if(i%100===0)console.log(`[stress] admin ${i}/${adminSessions}`);
  }
  await page.screenshot({path:path.join(out,'admin-stress-final.png'),fullPage:true});results.screenshots.push('admin-stress-final.png');
 }finally{await context.close()}
}
async function fieldWorker(browser){
 let{context,page}=await openMode(browser,'field','stress-field');
 try{
  for(let i=1;i<=fieldSessions;i++){
   if(i>1&&i%50===0)await reloadMode(page,'field');
   if(i%25===0){await page.setViewportSize(i%50===0?{width:360,height:800}:{width:390,height:844});results.viewportChanges++}
   for(const id of fieldScreens)await route(page,id,`field-${i}:${id}`,true);
   await fieldMicroActions(page,context,i);
   results.journeysCompleted++;
   if(i%100===0)console.log(`[stress] field ${i}/${fieldSessions}`);
  }
  await page.screenshot({path:path.join(out,'field-stress-final.png'),fullPage:true});results.screenshots.push('field-stress-final.png');
 }finally{await context.close()}
}

const browser=await chromium.launch({headless:true,args:['--disable-dev-shm-usage']});
try{await Promise.all([adminWorker(browser),fieldWorker(browser)])}finally{await browser.close()}
results.finishedAt=new Date().toISOString();results.durationMs=Date.now()-started;
const failed=results.pageErrors.length+results.consoleErrors.length+results.flowErrors.length+results.overflow.length+results.multiScreen.length+results.forbiddenLeaks.length;
const summary={version:VERSION,totalSessions,journeysCompleted:results.journeysCompleted,routes:results.routes,actions:results.actions,reloads:results.reloads,viewportChanges:results.viewportChanges,mockedWrites:results.mockedWrites,durationMs:results.durationMs,failures:failed,pageErrors:results.pageErrors.length,consoleErrors:results.consoleErrors.length,flowErrors:results.flowErrors.length,overflow:results.overflow.length,multiScreen:results.multiScreen.length,forbiddenLeaks:results.forbiddenLeaks.length};
await fs.writeFile(path.join(out,'report.json'),JSON.stringify(results,null,2));
await fs.writeFile(path.join(out,'summary.json'),JSON.stringify(summary,null,2));
console.log(JSON.stringify(summary,null,2));
if(results.journeysCompleted!==totalSessions||failed){console.error('1000-session user stress audit failed. See qa-stress-artifacts/report.json');process.exit(1)}
