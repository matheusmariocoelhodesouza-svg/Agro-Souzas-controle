import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const base=process.env.C360_BASE_URL||'http://127.0.0.1:8080';
const out=path.resolve('qa-artifacts');
await fs.mkdir(out,{recursive:true});
const sample={company:'00000000-0000-0000-0000-00000000c361',team:'00000000-0000-0000-0000-00000000c362',user:'00000000-0000-0000-0000-00000000c360'};
const report={version:'2026.09.26-commercial3',checks:[],screenshots:[],errors:[],coverage:{}};
const ok=(name,detail='')=>report.checks.push({name,ok:true,detail});
const bad=(name,detail)=>{report.checks.push({name,ok:false,detail:String(detail)});report.errors.push({name,detail:String(detail)})};
const safe=s=>String(s).replace(/[^a-z0-9_-]+/gi,'-').toLowerCase();

const ADMIN_SCREENS=['inicio','equipes','funcionarios','ponto','operacoes','frota','rastreamento','manutencoes','combustivel','documentosrh','insumos','financeiro','relatorios','alertas','integracoes','configuracoes','ia'];
const TABLET_SCREENS=['inicio','equipes','funcionarios','frota','manutencoes','insumos','financeiro','relatorios','configuracoes'];
const FIELD_SCREENS=['equipehome','operacoes','ponto','combustivel','equipereport'];

function mockRows(table){
 if(table==='v2_teams')return[{id:sample.team,company_id:sample.company,name:'Equipe QA',code:'QA-01',status:'active',metadata:{contractor_name:'Cliente QA'}}];
 if(table==='v2_employees')return[{id:'emp-qa',company_id:sample.company,employee_number:'99',full_name:'Funcionário QA',primary_team:'Equipe QA',status:'active',job_title:'Cargueiro'}];
 if(table==='v2_vehicles')return[{id:'veh-qa',company_id:sample.company,plate:'QAQ1A23',name:'Micro-ônibus QA',description:'Micro-ônibus QA',model:'Sprinter',make:'Mercedes-Benz',year:2018,status:'active',current_km:123456,current_odometer_km:123456,team_id:sample.team,metadata:{}}];
 if(table==='v2_poultry_integrators')return[{id:'int-qa',company_id:sample.company,name:'Cliente QA',status:'active'}];
 if(table==='v2_poultry_farms')return[{id:'farm-qa',company_id:sample.company,integrator_id:'int-qa',producer_name:'Produtor QA',farm_name:'Granja QA',city:'Laranjal Paulista',status:'active',address:{city:'Laranjal Paulista'}}];
 if(table==='v2_inventory_items')return[{id:'item-qa',company_id:sample.company,name:'Óleo QA',unit:'L',category:'insumo',status:'active',minimum_stock:5,current_stock:20,current_avg_cost:12.5,metadata:{}}];
 if(table==='v2_operations')return[{id:'op-qa',company_id:sample.company,team_id:sample.team,operation_type:'poultry_catching',title:'Apanha QA',customer_name:'Cliente QA',location_name:'Granja QA',scheduled_start:new Date().toISOString(),status:'planned',planned_birds:6000,actual_birds:0,actual_revenue:0,actual_cost:0}];
 if(table==='v2_fuel_logs')return[{id:'fuel-qa',company_id:sample.company,vehicle_id:'veh-qa',fueled_at:new Date().toISOString(),liters:35,total_amount:225.75,odometer_km:123456,station_name:'Posto QA'}];
 if(table==='v2_financial_entries')return[{id:'fin-qa',company_id:sample.company,entry_type:'income',description:'Receita QA',amount:5720,status:'open',competence_date:new Date().toISOString().slice(0,10)}];
 if(table==='v2_maintenance_plans')return[{id:'maint-qa',company_id:sample.company,vehicle_id:'veh-qa',name:'Troca de óleo',active:true,next_due_odometer_km:125000}];
 if(table==='v2_vehicle_documents')return[{id:'doc-qa',company_id:sample.company,vehicle_id:'veh-qa',document_type:'CRLV',status:'active',expires_at:'2027-01-01'}];
 if(table==='v2_device_access')return[{id:'dev-qa',company_id:sample.company,team_id:sample.team,device_name:'Galaxy QA',active:true,last_seen_at:new Date().toISOString()}];
 if(table==='v2_attendance_events')return[{id:'att-qa',company_id:sample.company,employee_id:'emp-qa',event_type:'clock_in',occurred_at:new Date().toISOString()}];
 return[];
}

async function installApiMock(page){
 await page.route('https://aycbrqziusxtxhsdfqjk.supabase.co/**',async route=>{
  const req=route.request(),url=new URL(req.url()),method=req.method().toUpperCase();
  let body='[]',status=200;
  if(url.pathname.includes('/auth/v1/user'))body=JSON.stringify({id:sample.user,aud:'authenticated',role:'authenticated',is_anonymous:false,user_metadata:{name:'QA'}});
  else if(url.pathname.includes('/auth/v1/token'))body=JSON.stringify({access_token:'qa-access-token',refresh_token:'qa-refresh-token',token_type:'bearer',expires_in:3600,user:{id:sample.user,aud:'authenticated',role:'authenticated'}});
  else if(url.pathname.includes('/functions/v1/'))body=JSON.stringify({ok:true,data:[],items:[],positions:[]});
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

async function openShell(browser,name,viewport,isMobile=false){
 const context=await browser.newContext({viewport,isMobile,hasTouch:isMobile});
 const page=await context.newPage();
 page.on('pageerror',e=>bad(`${name}:pageerror`,e?.stack||e));
 page.on('console',m=>{if(m.type()==='error'&&!/401|403|404|failed to load resource|foto indisponível|ERR_INTERNET_DISCONNECTED/i.test(m.text()))bad(`${name}:console`,m.text())});
 await installApiMock(page);
 await page.goto(`${base}/?qa_commercial=1`,{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(()=>typeof window.v2Go==='function'&&typeof window.initScreenRouter==='function',{timeout:10000});
 return{context,page};
}

async function prepare(page,mode){
 const state=await page.evaluate(({mode,sample})=>{
  try{
   localStorage.setItem('controla_beta_session',JSON.stringify({access_token:'qa-access-token',refresh_token:'qa-refresh-token',expires_at:Date.now()+3600000,user:{id:sample.user,email:'qa@comando360.local'}}));
   companyId=sample.company;companyProfile={id:sample.company,trade_name:'Empresa QA',legal_name:'Empresa QA',tax_id:'00.000.000/0001-00'};
   deviceMode=mode==='field';deviceAccess=deviceMode?{id:'qa-device',company_id:sample.company,team_id:sample.team,status:'active'}:null;deviceTeam=deviceMode?{id:sample.team,name:'Equipe QA',metadata:{}}:null;currentRoleCode=deviceMode?'device':'admin';isAdminGeneral=!deviceMode;
   document.getElementById('login')?.classList.add('hidden');document.getElementById('app')?.classList.remove('hidden');document.body.classList.add('app-ready');document.body.classList.toggle('device-mode',deviceMode);
   if(deviceMode&&typeof applyDeviceUi==='function')applyDeviceUi();initScreenRouter();
   if(deviceMode){document.getElementById('teamHomeName')&&(document.getElementById('teamHomeName').textContent='Equipe QA');document.getElementById('teamHomeVehicle')&&(document.getElementById('teamHomeVehicle').textContent='Celular de campo • QA')}
   return{ok:true};
  }catch(e){return{ok:false,error:String(e?.stack||e)}}
 },{mode,sample});
 if(!state.ok)throw new Error(state.error);
 await page.waitForTimeout(300);
}

async function route(page,id){
 await page.evaluate(async id=>{await v2Go(id)},id);
 await page.waitForFunction(id=>{const s=document.querySelector(`.section[data-screen="${id}"]`);return !!s&&s.classList.contains('active')&&!s.hidden},id,{timeout:5000}).catch(()=>{});
 await page.waitForTimeout(260);
}
async function screenshot(page,name){const file=`commercial-${safe(name)}.png`;await page.screenshot({path:path.join(out,file),fullPage:true});report.screenshots.push(file)}

async function inspect(page,label,expected,mobile=false){
 const r=await page.evaluate(({mobile})=>{
  const root=document.documentElement,section=document.querySelector('#screenHost .section.active')||document.querySelector('.section.active');
  const visible=e=>{const s=getComputedStyle(e),b=e.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity||1)>0&&b.width>0&&b.height>0};
  const controls=[...(section?.querySelectorAll('button,.btn,input:not([type="hidden"]),select,textarea,summary')||[])].filter(visible).slice(0,140).map(e=>({tag:e.tagName,id:e.id||'',cls:String(e.className||'').slice(0,100),text:String(e.textContent||e.value||'').trim().slice(0,50),h:e.getBoundingClientRect().height}));
  const tooSmall=controls.filter(x=>x.h<(mobile?43.5:37.5));
  const style=getComputedStyle(root),vw=root.clientWidth;
  const escaped=[...(section?.querySelectorAll('.card,.v2panel,.v2hero,.fleet-card,.tracking-card,.item,.row')||[])].filter(visible).map(e=>{const b=e.getBoundingClientRect();return{id:e.id||'',cls:String(e.className||'').slice(0,80),left:Math.round(b.left),right:Math.round(b.right),width:Math.round(b.width)}}).filter(x=>x.left<-2||x.right>vw+2).slice(0,8);
  return{
   overflow:Math.max(root.scrollWidth-root.clientWidth,document.body.scrollWidth-root.clientWidth),
   pro:root.dataset.c360ProfessionalPass||'',radius:style.getPropertyValue('--c360-pro-card-radius').trim(),controlHeight:style.getPropertyValue('--c360-pro-control-height').trim(),
   active:section?.id||'',tooSmall,escaped,
   h1:[...(section?.querySelectorAll('h1')||[])].filter(visible).map(e=>parseFloat(getComputedStyle(e).fontSize)||0),
   visibleControls:controls.length
  };
 },{mobile});
 if(r.active!==expected)bad(`${label}:rota-ativa`,`${r.active||'nenhuma'} != ${expected}`);else ok(`${label}:rota-ativa`,r.active);
 if(r.overflow>2)bad(`${label}:overflow`,JSON.stringify(r));else ok(`${label}:overflow`,String(r.overflow));
 if(r.escaped.length)bad(`${label}:elemento-fora-da-tela`,JSON.stringify(r.escaped));else ok(`${label}:elemento-fora-da-tela`,'0');
 if(r.pro!=='2026.09.25-pro2')bad(`${label}:professional-pass`,r.pro);else ok(`${label}:professional-pass`,r.pro);
 if(r.radius!=='16px')bad(`${label}:visual-token-radius`,r.radius);else ok(`${label}:visual-token-radius`,r.radius);
 if(r.tooSmall.length)bad(`${label}:alvos-de-toque`,JSON.stringify(r.tooSmall.slice(0,10)));else ok(`${label}:alvos-de-toque`,`${mobile?'touch':'desktop'} ok (${r.visibleControls})`);
 if(r.h1.some(n=>n>42))bad(`${label}:hierarquia-titulo`,JSON.stringify(r.h1));else ok(`${label}:hierarquia-titulo`,JSON.stringify(r.h1));
}

async function inspectFieldOperationContrast(page){
 const headings=await page.evaluate(()=>[...document.querySelectorAll('#operacoes>.v2hero h1,#operacoes>.v2panel>.v2panelhead h3')].filter(e=>{const s=getComputedStyle(e),b=e.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&b.width>0&&b.height>0}).map(e=>({text:String(e.textContent||'').trim(),color:getComputedStyle(e).color})));
 const dark=headings.filter(x=>{const rgb=(x.color.match(/[\d.]+/g)||[]).slice(0,3).map(Number);return rgb.length===3&&(rgb[0]+rgb[1]+rgb[2])/3<150});
 if(!headings.length)bad('field:operacoes:contraste-titulos','Nenhum título-alvo visível');
 else if(dark.length)bad('field:operacoes:contraste-titulos',JSON.stringify(dark));
 else ok('field:operacoes:contraste-titulos',JSON.stringify(headings));
}

async function verifyScreenInventory(page){
 const ids=await page.evaluate(()=>[...document.querySelectorAll('.section[data-screen]')].map(e=>e.dataset.screen).filter(Boolean));
 const missing=ADMIN_SCREENS.filter(x=>!ids.includes(x));
 if(missing.length)bad('inventory:telas-administrativas',JSON.stringify(missing));else ok('inventory:telas-administrativas',`${ADMIN_SCREENS.length}/${ADMIN_SCREENS.length}`);
 for(const id of FIELD_SCREENS){if(!ids.includes(id))bad(`inventory:campo:${id}`,'ausente')}
 report.coverage.domScreens=[...new Set(ids)].sort();
}

async function captureAdmin(browser,viewport,isMobile,screens,prefix){
 const{context,page}=await openShell(browser,prefix,viewport,isMobile);await prepare(page,'admin');
 if(prefix==='desktop')await verifyScreenInventory(page);
 for(const id of screens){await route(page,id);await inspect(page,`${prefix}:${id}`,id,isMobile);await screenshot(page,`${prefix}-${id}`)}
 await context.close();
}
async function captureField(browser){
 const{context,page}=await openShell(browser,'field-commercial',{width:390,height:844},true);await prepare(page,'field');
 for(const id of FIELD_SCREENS){await route(page,id);await inspect(page,`field:${id}`,id,true);if(id==='operacoes')await inspectFieldOperationContrast(page);await screenshot(page,`field-${id}`)}
 await context.close();
}

const browser=await chromium.launch({headless:true});
try{
 await captureAdmin(browser,{width:1440,height:1000},false,ADMIN_SCREENS,'desktop');
 await captureAdmin(browser,{width:820,height:1180},true,TABLET_SCREENS,'tablet');
 await captureAdmin(browser,{width:390,height:844},true,ADMIN_SCREENS,'mobile-admin');
 await captureField(browser);
}finally{await browser.close()}

report.coverage={...report.coverage,adminDesktop:ADMIN_SCREENS,adminTablet:TABLET_SCREENS,adminMobile:ADMIN_SCREENS,field:FIELD_SCREENS};
await fs.writeFile(path.join(out,'commercial-polish-report.json'),JSON.stringify(report,null,2));
const summary={version:report.version,checks:report.checks.length,failed:report.checks.filter(x=>!x.ok).length,screenshots:report.screenshots.length,errors:report.errors.length,coverage:{desktop:ADMIN_SCREENS.length,tablet:TABLET_SCREENS.length,mobile:ADMIN_SCREENS.length,field:FIELD_SCREENS.length}};
console.log(JSON.stringify(summary,null,2));
if(summary.failed||summary.errors)process.exit(1);
