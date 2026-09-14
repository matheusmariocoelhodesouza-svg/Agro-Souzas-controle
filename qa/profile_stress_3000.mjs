import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const VERSION='2026.09.14-profile-stress1';
const base=process.env.C360_BASE_URL||'http://127.0.0.1:8080';
const perProfile=Math.max(1000,Number(process.env.C360_STRESS_PER_PROFILE||1000));
const profiles=['admin','client','field'];
const totalSessions=perProfile*profiles.length;
const out=path.resolve('qa-profile-stress-artifacts');
await fs.mkdir(out,{recursive:true});

const companyScreens=['inicio','equipes','funcionarios','documentosrh','ponto','operacoes','frota','rastreamento','manutencoes','combustivel','insumos','financeiro','relatorios','alertas','integracoes','configuracoes','fiscal','ia'];
const fieldScreens=['equipehome','operacoes','ponto','combustivel','equipereport'];
const forbiddenField=['financeiro','frota','rastreamento','manutencoes','insumos','funcionarios','equipes','documentosrh','configuracoes','integracoes','fiscal','ia','alertas'];
const sample={
 company:'00000000-0000-0000-0000-00000000c361',team:'00000000-0000-0000-0000-00000000c362',user:'00000000-0000-0000-0000-00000000c360',employee:'00000000-0000-0000-0000-00000000e001',vehicle:'00000000-0000-0000-0000-00000000f001',item:'00000000-0000-0000-0000-00000000a001',role:'00000000-0000-0000-0000-00000000b001'
};
const results={
 version:VERSION,perProfile,totalSessions,startedAt:new Date().toISOString(),finishedAt:null,durationMs:0,
 journeysCompleted:0,profileJourneys:{admin:0,client:0,field:0},routes:0,actions:0,coldRestarts:0,viewportChanges:0,mockedWrites:0,
 pageErrors:[],consoleErrors:[],flowErrors:[],overflow:[],multiScreen:[],forbiddenLeaks:[],clippedControls:[],profileLeaks:[],screenshots:[]
};
const started=Date.now();
const record=(bucket,payload,limit=160)=>{if(results[bucket].length<limit)results[bucket].push(payload)};
const errText=e=>String(e?.stack||e?.message||e);

function mockRows(table,mode){
 const isAdmin=mode==='admin';
 const companyName=isAdmin?'Comando 360 QA Admin':mode==='client'?'Cliente QA 360':'Empresa QA Campo';
 if(table==='v2_companies')return[{id:sample.company,legal_name:companyName,trade_name:companyName,tax_id:'00.000.000/0001-00',status:'active',created_at:'2026-09-01T12:00:00Z',metadata:{}}];
 if(table==='v2_subscriptions')return[{id:'sub-qa',company_id:sample.company,plan_code:isAdmin?'client_zero':'complete',status:isAdmin?'active':'trial',trial_ends_at:'2026-09-28T12:00:00Z',current_period_start:'2026-09-14T12:00:00Z',current_period_end:'2026-10-14T12:00:00Z',limits:{}}];
 if(table==='v2_company_members')return[{company_id:sample.company,user_id:sample.user,role_id:sample.role,status:'active'}];
 if(table==='v2_roles')return[{id:sample.role,company_id:null,code:'owner',name:'Proprietário'}];
 if(table==='v2_platform_admins')return isAdmin?[{user_id:sample.user,role:'owner',active:true}]:[];
 if(table==='v2_billing_accounts')return[{company_id:sample.company,provider:'unconfigured',status:'not_configured',billing_email:'qa@comando360.local',next_billing_at:null,last_payment_at:null,grace_until:null,cancel_at_period_end:false,updated_at:'2026-09-14T12:00:00Z'}];
 if(table==='v2_legal_documents')return[{document_code:'terms',version:'2026-09-13.1',title:'Termos de Uso do Comando 360',category:'terms',effective_at:'2026-09-13T03:00:00Z',document_url:'/legal.html#terms',requires_acceptance:true,active:true}];
 if(table==='v2_legal_acceptances')return[{document_code:'terms',document_version:'2026-09-13.1',accepted_at:'2026-09-14T12:00:00Z',acceptance_source:'web_admin'}];
 if(table==='v2_platform_incidents'||table==='v2_subscription_events'||table==='v2_fiscal_integrations')return[];
 if(table==='v2_teams')return[{id:sample.team,company_id:sample.company,name:'Equipe QA',status:'active',metadata:{},supervisor_employee_id:null}];
 if(table==='v2_employees')return[{id:sample.employee,company_id:sample.company,employee_number:'99',full_name:'Funcionário QA',cpf:'',rg:'',birth_date:null,phone:'',address:{city:'Laranjal Paulista'},photo_path:null,primary_team:'Equipe QA',status:'active',job_title:'Cargueiro',admission_date:'2026-01-01'}];
 if(table==='v2_employee_face_enrollments')return[{employee_id:sample.employee,status:'active'}];
 if(table==='v2_inventory_items')return[{id:sample.item,company_id:sample.company,name:'Óleo QA',unit:'L',category:'insumo',status:'active',minimum_stock:5,current_stock:20,current_avg_cost:12.5,metadata:{note:'Teste automatizado'}}];
 if(table==='v2_inventory_movements')return[{id:'mov-qa',company_id:sample.company,item_id:sample.item,movement_type:'in',quantity:20,unit_cost:12.5,occurred_at:'2026-09-12T12:00:00-03:00',notes:'QA'}];
 if(table==='v2_vehicles')return[{id:sample.vehicle,company_id:sample.company,plate:'QAQ1A23',description:'Micro-ônibus QA',name:'Micro-ônibus QA',model:'Sprinter',make:'Mercedes-Benz',model_year:2018,status:'active',current_km:123456,current_odometer_km:123456,team_id:sample.team,fuel_tank_capacity_liters:100,metadata:{}}];
 if(table==='v2_team_chat_settings'||table==='v2_team_chat_messages'||table==='v2_financial_entries'||table==='v2_report_monthly_financial'||table==='v2_alerts'||table==='v2_vehicle_documents'||table==='v2_files'||table==='v2_vehicle_tracking_current'||table==='v2_fuel_logs')return[];
 if(table==='v2_poultry_integrators')return[{id:'int-qa',company_id:sample.company,name:'Cliente QA',status:'active'}];
 if(table==='v2_poultry_farms')return[{id:'farm-qa',company_id:sample.company,integrator_id:'int-qa',producer_name:'Produtor QA',farm_name:'Granja QA',city:'Laranjal Paulista',status:'active',address:{city:'Laranjal Paulista'}}];
 if(table==='v2_device_access')return[{id:'qa-device',company_id:sample.company,team_id:sample.team,status:'active',active:true,device_name:'Celular QA'}];
 return[];
}

async function installApiMock(page,mode){
 await page.route('https://aycbrqziusxtxhsdfqjk.supabase.co/**',async route=>{
  const req=route.request(),url=new URL(req.url()),method=req.method().toUpperCase();
  if(!['GET','HEAD','OPTIONS'].includes(method))results.mockedWrites++;
  let body='[]',status=200,contentType='application/json; charset=utf-8';
  const user={id:sample.user,email:`${mode}@qa.comando360.local`,aud:'authenticated',role:'authenticated',is_anonymous:mode==='field',app_metadata:{provider:'email',providers:['email']},user_metadata:{name:`QA ${mode}`}};
  if(url.pathname.includes('/auth/v1/user'))body=JSON.stringify(user);
  else if(url.pathname.includes('/auth/v1/token'))body=JSON.stringify({access_token:'qa-access-token',refresh_token:'qa-refresh-token',token_type:'bearer',expires_in:3600,user});
  else if(url.pathname.includes('/functions/v1/'))body=JSON.stringify({ok:true,data:[],items:[]});
  else if(url.pathname.includes('/storage/v1/')){body='';status=404;contentType='text/plain'}
  else if(url.pathname.includes('/rest/v1/rpc/')){
   const rpcName=url.pathname.split('/').pop()||'';
   if(/list|summary|today|distance|report|search/i.test(rpcName))body='[]';
   else body='true';
  }else{
   const m=url.pathname.match(/\/rest\/v1\/([^/]+)/);const table=m?.[1];
   if(['POST','PATCH','PUT'].includes(method)){body=JSON.stringify([{id:'qa-write'}]);status=method==='POST'?201:200}
   else if(method==='DELETE'){body='';status=204}
   else body=JSON.stringify(mockRows(table,mode));
  }
  await route.fulfill({status,contentType,headers:{'access-control-allow-origin':'*','content-range':'0-0/1'},body});
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
async function waitRuntime(page){await page.waitForFunction(()=>typeof window.v2Go==='function'&&typeof window.initScreenRouter==='function',{timeout:15000})}

async function seedMode(page,mode){
 const state=await page.evaluate(({mode,sample})=>{
  let error='';
  try{
   localStorage.setItem('controla_beta_session',JSON.stringify({access_token:'qa-access-token',refresh_token:'qa-refresh-token',expires_at:Date.now()+3600000,user:{id:sample.user,email:`${mode}@qa.comando360.local`}}));
   companyId=sample.company;companyProfile={id:sample.company,trade_name:mode==='admin'?'Comando 360 QA Admin':mode==='client'?'Cliente QA 360':'Empresa QA Campo',legal_name:'Empresa QA',tax_id:'00.000.000/0001-00'};
   const field=mode==='field';deviceMode=field;deviceAccess=field?{id:'qa-device',company_id:sample.company,team_id:sample.team,status:'active',active:true,device_name:'Celular QA'}:null;deviceTeam=field?{id:sample.team,name:'Equipe QA',metadata:{}}:null;currentRoleCode=field?'device':'owner';isAdminGeneral=!field;
   document.getElementById('login')?.classList.add('hidden');document.getElementById('app')?.classList.remove('hidden');document.body.classList.add('app-ready');document.body.classList.toggle('device-mode',field);
   if(field&&typeof applyDeviceUi==='function')applyDeviceUi();
   initScreenRouter();
   if(field){const n=document.getElementById('teamHomeName');if(n)n.textContent='Equipe QA';const v=document.getElementById('teamHomeVehicle');if(v)v.textContent='Micro-ônibus QA • QAQ1A23';const b=document.getElementById('deviceModeTeam');if(b)b.textContent='Equipe QA'}
  }catch(e){error=String(e?.stack||e)}
  return{error};
 },{mode,sample});
 if(state.error)throw new Error(state.error);
 if(mode!=='field'){
  await page.waitForFunction(()=>!!window.C360SaaS,{timeout:7000}).catch(()=>{});
  await page.evaluate(async()=>{try{await window.C360SaaS?.refresh?.()}catch(_){}});
 }
}

const viewports={
 admin:[{width:1440,height:1000},{width:1024,height:768},{width:390,height:844}],
 client:[{width:390,height:844},{width:412,height:915},{width:1024,height:768},{width:1440,height:1000}],
 field:[{width:390,height:844},{width:360,height:800},{width:800,height:1280},{width:1280,height:800},{width:1024,height:600}]
};
async function openMode(browser,mode,label){
 const vp=viewports[mode][0],field=mode==='field';
 const context=await browser.newContext({viewport:vp,isMobile:field&&vp.width<600,hasTouch:field,serviceWorkers:'block'});
 const page=await context.newPage();attachRuntime(page,label);await installApiMock(page,mode);
 await page.goto(`${base}/?qa_profile_stress=1&mode=${mode}`,{waitUntil:'domcontentloaded',timeout:30000});await waitRuntime(page);await seedMode(page,mode);await page.waitForTimeout(100);
 return{context,page};
}

async function route(page,id,label,field=false){
 try{
  const state=await page.evaluate(async({id})=>{
   await v2Go(id);await new Promise(r=>setTimeout(r,12));
   const visible=e=>!!e&&!e.hidden&&!e.classList.contains('hidden')&&getComputedStyle(e).display!=='none'&&getComputedStyle(e).visibility!=='hidden'&&Number(getComputedStyle(e).opacity)!==0;
   const el=document.getElementById(id);const active=[...document.querySelectorAll('[data-screen]')].filter(visible).map(e=>e.id);
   return{exists:!!el,target:visible(el),active,html:document.documentElement.scrollWidth-document.documentElement.clientWidth,body:document.body.scrollWidth-document.body.clientWidth,home:visible(document.getElementById('equipehome'))};
  },{id});
  results.routes++;
  if(!state.exists||!state.target){if(field&&forbiddenField.includes(id)&&state.home)return state;record('flowErrors',{label,message:`rota ${id} não ficou visível; ativas=${state.active.join(',')||'nenhuma'}`})}
  if(!field&&!forbiddenField.includes(id)&&state.active.length!==1)record('multiScreen',{label,id,active:state.active});
  if(Math.max(state.html,state.body)>3)record('overflow',{label,id,html:state.html,body:state.body});
  return state;
 }catch(e){record('flowErrors',{label,message:errText(e)});return null}
}

async function auditViewport(page,label){
 try{
  const issues=await page.evaluate(()=>{
   const vw=document.documentElement.clientWidth;
   const visible=e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity)!==0};
   return [...document.querySelectorAll('button,.btn,input,select,textarea,a')].filter(visible).map(e=>{const r=e.getBoundingClientRect();return{tag:e.tagName,id:e.id||'',text:(e.textContent||e.getAttribute('aria-label')||'').trim().slice(0,70),left:r.left,right:r.right,width:r.width}}).filter(x=>x.left<-4||x.right>vw+4).slice(0,8);
  });
  if(issues.length)record('clippedControls',{label,issues});
 }catch(e){record('flowErrors',{label:`${label}:viewport-audit`,message:errText(e)})}
}

async function clickIf(page,selector,label,expectSelector=null,required=false){
 try{
  const loc=page.locator(selector).first();if(!await loc.count()){if(required)record('flowErrors',{label,message:`controle ausente: ${selector}`});return false}
  if(!await loc.isVisible()){if(required)record('flowErrors',{label,message:`controle invisível: ${selector}`});return false}
  await loc.scrollIntoViewIfNeeded().catch(()=>{});if(selector==='#newPoultryOp'||selector==='#newMaintenanceBtn')await page.waitForTimeout(160);
  await loc.click({timeout:2600});results.actions++;
  if(expectSelector){const ex=page.locator(expectSelector).first();const ok=await ex.isVisible().catch(()=>false);if(!ok)record('flowErrors',{label,message:`${expectSelector} não abriu`})}
  return true;
 }catch(e){record('flowErrors',{label,message:errText(e)});return false}
}

async function companyMicroActions(page,profile,i){
 const p=`${profile}-${i}`;
 if(i%2===0){await route(page,'ponto',`${p}:ponto`);await clickIf(page,'#methodFace',`${p}:face`);await clickIf(page,'#methodMatricula',`${p}:matricula`)}
 if(i%3===0){await route(page,'operacoes',`${p}:operacoes`);if(await clickIf(page,'#newPoultryOp',`${p}:apanha-abrir`,'#poultryForm',true))await clickIf(page,'#closePoultryForm',`${p}:apanha-fechar`)}
 if(i%4===0){await route(page,'frota',`${p}:frota`);if(await clickIf(page,'#newVehicleBtn',`${p}:veiculo-abrir`,'#vehicleEditCard',true))await clickIf(page,'#cancelVehicleEdit',`${p}:veiculo-fechar`)}
 if(i%5===0){await route(page,'manutencoes',`${p}:manut`);if(await clickIf(page,'#newMaintenanceBtn',`${p}:manut-abrir`,'#maintenanceEditCard',true))await clickIf(page,'#cancelMaintenanceEdit',`${p}:manut-fechar`)}
 if(i%6===0){await route(page,'combustivel',`${p}:fuel`);if(await clickIf(page,'#newFuelBtn',`${p}:fuel-abrir`,'#fuelEditCard',true))await clickIf(page,'#cancelFuelEdit',`${p}:fuel-fechar`)}
 if(i%7===0){await route(page,'insumos',`${p}:insumos`);try{await page.evaluate(async()=>{if(typeof loadConsumables==='function')await loadConsumables()});await page.waitForTimeout(40)}catch(e){record('flowErrors',{label:`${p}:insumos-load`,message:errText(e)})}if(await clickIf(page,'#newConsumableItemBtn',`${p}:insumo-abrir`,'#consumableItemForm',true))await clickIf(page,'#cancelConsumableItem',`${p}:insumo-fechar`)}
 if(i%8===0){await route(page,'financeiro',`${p}:fin`);if(await clickIf(page,'#newFinEntryBtn',`${p}:fin-abrir`,'#finEditCard'))await clickIf(page,'#cancelFinEntry',`${p}:fin-fechar`);if(await page.locator('#toggleFinancePrivacy').isVisible().catch(()=>false))await clickIf(page,'#toggleFinancePrivacy',`${p}:privacidade`)}
 if(i%10===0&&await page.locator('#c360ChatFab').isVisible().catch(()=>false)){await clickIf(page,'#c360ChatFab',`${p}:chat`,'#c360ChatOverlay');await clickIf(page,'#c360ChatClose',`${p}:chat-fechar`)}
 if(i%11===0&&await page.locator('#c360AccountBtn').isVisible().catch(()=>false)){await clickIf(page,'#c360AccountBtn',`${p}:conta`);await page.evaluate(()=>document.querySelector('#c360AccountMenu')?.classList.add('hidden'))}
 if(i%20===0){
  await route(page,'configuracoes',`${p}:config`);await page.evaluate(async()=>{try{await window.C360SaaS?.refresh?.()}catch(_){}});await page.waitForTimeout(80);
  const platform=await page.locator('#c360SaasPlatform').evaluate(e=>(e.textContent||'').includes('Central SaaS')).catch(()=>false);
  if(profile==='admin'&&!platform)record('profileLeaks',{label:`${p}:platform-admin-ausente`});
  if(profile==='client'&&platform)record('profileLeaks',{label:`${p}:cliente-viu-central-saas`});
 }
}

async function fieldChecks(page,context,i){
 const p=`field-${i}`;await route(page,'equipehome',`${p}:home`,true);
 const state=await page.evaluate(()=>{
  const visible=e=>!!e&&!e.hidden&&!e.classList.contains('hidden')&&getComputedStyle(e).display!=='none'&&getComputedStyle(e).visibility!=='hidden';
  const tiles=[...document.querySelectorAll('#equipehome .team-tile')].filter(visible).map(e=>(e.textContent||'').replace(/\s+/g,' ').trim());
  const leaks=['.mobile-bottom-nav','#nav','.v2sidebar'].filter(s=>[...document.querySelectorAll(s)].some(visible));
  return{tiles,leaks,device:document.body.classList.contains('device-mode')};
 });
 if(!state.device)record('profileLeaks',{label:`${p}:device-mode-ausente`});
 if(state.leaks.length)record('profileLeaks',{label:`${p}:navegacao-admin`,leaks:state.leaks});
 for(const name of ['Apanha','Ponto','Abastecimento','Relatório'])if(!state.tiles.some(x=>x.includes(name)))record('flowErrors',{label:`${p}:tile-${name}`,message:state.tiles.join(' | ')});
 if(i%2===0){await route(page,'ponto',`${p}:ponto`,true);await clickIf(page,'#methodFace',`${p}:face`);await clickIf(page,'#methodMatricula',`${p}:matricula`)}
 if(i%3===0){await route(page,'operacoes',`${p}:operacoes`,true);if(await clickIf(page,'#newPoultryOp',`${p}:apanha-abrir`,'#poultryForm',true)){const planning=await page.locator('#poAdminPlanning').isVisible().catch(()=>false);if(planning)record('forbiddenLeaks',{label:`${p}:planejamento-admin`});await clickIf(page,'#closePoultryForm',`${p}:apanha-fechar`)}}
 if(i%4===0){await route(page,'combustivel',`${p}:fuel`,true);if(await clickIf(page,'#newFuelBtn',`${p}:fuel-abrir`,'#fuelEditCard'))await clickIf(page,'#cancelFuelEdit',`${p}:fuel-fechar`)}
 const forbidden=forbiddenField[i%forbiddenField.length];const r=await route(page,forbidden,`${p}:bloqueio-${forbidden}`,true);if(r&&!r.home)record('forbiddenLeaks',{label:`${p}:${forbidden}`,active:r.active});
 if(i%25===0)await auditViewport(page,`${p}:layout`);
 if(i%40===0&&await page.locator('#c360TeamChatTile').isVisible().catch(()=>false)){
  try{await context.setOffline(true);await page.locator('#c360TeamChatTile').click({timeout:1800});results.actions++;if(await page.locator('#c360ChatText').count()){await page.locator('#c360ChatText').fill(`Stress ${i}`);await page.locator('#c360ChatSend').click({timeout:1800});results.actions++}await context.setOffline(false);await clickIf(page,'#c360ChatClose',`${p}:chat-fechar`)}catch(e){await context.setOffline(false);record('flowErrors',{label:`${p}:offline-chat`,message:errText(e)})}
 }
}

async function companyWorker(browser,profile){
 let{context,page}=await openMode(browser,profile,`stress-${profile}`);
 try{
  for(let i=1;i<=perProfile;i++){
   if(i>1&&i%50===0){await context.close();({context,page}=await openMode(browser,profile,`stress-${profile}`));results.coldRestarts++}
   if(i%25===0){const list=viewports[profile],vp=list[(i/25)%list.length|0];await page.setViewportSize(vp);results.viewportChanges++}
   for(const id of companyScreens)await route(page,id,`${profile}-${i}:${id}`,false);
   await companyMicroActions(page,profile,i);
   if(i%25===0)await auditViewport(page,`${profile}-${i}:layout`);
   results.journeysCompleted++;results.profileJourneys[profile]++;
   if(i%100===0)console.log(`[stress] ${profile} ${i}/${perProfile}`);
  }
  const vp=profile==='client'?{width:390,height:844}:{width:1440,height:1000};await page.setViewportSize(vp);await route(page,'inicio',`${profile}:final`);await page.screenshot({path:path.join(out,`${profile}-stress-final.png`),fullPage:true});results.screenshots.push(`${profile}-stress-final.png`);
 }finally{await context.close()}
}

async function fieldWorker(browser){
 let{context,page}=await openMode(browser,'field','stress-field');
 try{
  for(let i=1;i<=perProfile;i++){
   if(i>1&&i%50===0){await context.close();({context,page}=await openMode(browser,'field','stress-field'));results.coldRestarts++}
   if(i%20===0){const list=viewports.field,vp=list[(i/20)%list.length|0];await page.setViewportSize(vp);results.viewportChanges++}
   for(const id of fieldScreens)await route(page,id,`field-${i}:${id}`,true);
   await fieldChecks(page,context,i);
   results.journeysCompleted++;results.profileJourneys.field++;
   if(i%100===0)console.log(`[stress] field ${i}/${perProfile}`);
  }
  await page.setViewportSize({width:1280,height:800});await route(page,'equipehome','field:tablet-final',true);await page.screenshot({path:path.join(out,'field-tablet-landscape-final.png'),fullPage:true});results.screenshots.push('field-tablet-landscape-final.png');
  await page.setViewportSize({width:390,height:844});await route(page,'equipehome','field:phone-final',true);await page.screenshot({path:path.join(out,'field-phone-final.png'),fullPage:true});results.screenshots.push('field-phone-final.png');
 }finally{await context.close()}
}

const browser=await chromium.launch({headless:true,args:['--disable-dev-shm-usage']});
try{await Promise.all([companyWorker(browser,'admin'),companyWorker(browser,'client'),fieldWorker(browser)])}finally{await browser.close()}
results.finishedAt=new Date().toISOString();results.durationMs=Date.now()-started;
const failed=results.pageErrors.length+results.consoleErrors.length+results.flowErrors.length+results.overflow.length+results.multiScreen.length+results.forbiddenLeaks.length+results.clippedControls.length+results.profileLeaks.length;
const summary={version:VERSION,perProfile,totalSessions,profileJourneys:results.profileJourneys,journeysCompleted:results.journeysCompleted,routes:results.routes,actions:results.actions,coldRestarts:results.coldRestarts,viewportChanges:results.viewportChanges,mockedWrites:results.mockedWrites,durationMs:results.durationMs,failures:failed,pageErrors:results.pageErrors.length,consoleErrors:results.consoleErrors.length,flowErrors:results.flowErrors.length,overflow:results.overflow.length,multiScreen:results.multiScreen.length,forbiddenLeaks:results.forbiddenLeaks.length,clippedControls:results.clippedControls.length,profileLeaks:results.profileLeaks.length};
await fs.writeFile(path.join(out,'report.json'),JSON.stringify(results,null,2));
await fs.writeFile(path.join(out,'summary.json'),JSON.stringify(summary,null,2));
console.log(JSON.stringify(summary,null,2));
if(results.journeysCompleted!==totalSessions||Object.values(results.profileJourneys).some(n=>n!==perProfile)||failed){console.error('3-profile stress audit failed. See qa-profile-stress-artifacts/report.json');process.exit(1)}
