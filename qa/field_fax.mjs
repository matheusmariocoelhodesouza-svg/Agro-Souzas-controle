import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const base=process.env.C360_BASE_URL||'http://127.0.0.1:8080';
const sample={company:'00000000-0000-0000-0000-00000000c361',team:'00000000-0000-0000-0000-00000000c362',user:'00000000-0000-0000-0000-00000000c360'};
const date=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const fax={id:'00000000-0000-0000-0000-00000000fa01',company_id:sample.company,team_id:sample.team,pickup_date:date,scheduled_time:'19:30:00',integrated_name:'Produtor teste Equipe 2',farm_name:'Granja teste',city:'Laranjal Paulista',expected_birds:6000,status:'scheduled',notes:'Conferir caixas',storage_path:`${sample.company}/${sample.team}/fax/qa/fax.png`,mime_type:'image/png',original_name:'fax.png'};
const unrelated={...fax,id:'00000000-0000-0000-0000-00000000fa02',team_id:'00000000-0000-0000-0000-00000000c399',integrated_name:'Produtor de outra equipe'};
const browser=await chromium.launch({headless:true});
const errors=[],queries=[],writes=[],checks=[];
let faxRows=[fax,unrelated],documentReads=0;
const adminUiCount=()=>document.querySelectorAll('#c360FaxPanel,#c360FaxHeroBtn,#c360FaxDashboardBtn').length+(typeof v2ScreenStore==='object'?Object.values(v2ScreenStore).filter(s=>!s.isConnected).reduce((n,s)=>n+s.querySelectorAll('#c360FaxPanel,#c360FaxHeroBtn,#c360FaxDashboardBtn').length,0):0);
let failedFax=false;
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});
const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
await page.route('**/*',async route=>{
 const req=route.request(),u=new URL(req.url());
 if(u.origin===new URL(base).origin)return route.continue();
 if(u.hostname==='cdn.jsdelivr.net')return route.fulfill({status:200,contentType:'application/javascript',body:'/* QA isolates external libraries. */'});
 if(u.hostname!=='aycbrqziusxtxhsdfqjk.supabase.co')return route.abort();
 if(u.pathname.startsWith('/storage/v1/object/')){documentReads++;return route.fulfill({status:200,contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6eQAAAABJRU5ErkJggg==','base64')})}
 const table=u.pathname.match(/\/rest\/v1\/([^/]+)/)?.[1];let rows=[];
 if(req.method()!=='GET')writes.push({path:u.pathname,method:req.method()});
 if(table==='v2_poultry_faxes'){
  if(req.method()==='POST'){const created={id:'00000000-0000-0000-0000-00000000fa03',...req.postDataJSON()};faxRows.push(created);return route.fulfill({status:201,contentType:'application/json',body:JSON.stringify([created])})}
  queries.push(u.searchParams.toString());
  if(failedFax)return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'QA temporary network failure'})});
  rows=faxRows;
 }else if(table==='v2_teams'){
  // This delayed context used to erase values filled by the FAX's 80ms timer.
  await new Promise(r=>setTimeout(r,250));rows=[{id:sample.team,company_id:sample.company,name:'Equipe 2',status:'active',metadata:{}}];
 }else if(table==='v2_device_access')rows=[{id:'qa-device',...sample,company_id:sample.company,team_id:sample.team,active:true,permissions:{apanha:true,ponto:true,abastecimento:true,relatorio:true}}];
 else if(table==='v2_companies')rows=[{id:sample.company,trade_name:'Empresa QA',status:'active',metadata:{}}];
 if(u.pathname.includes('/auth/v1/user'))rows={id:sample.user,role:'authenticated',user_metadata:{comando360_device:true}};
 return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(rows),headers:{'access-control-allow-origin':'*','content-range':'0-0/1'}});
});
try{
 await page.goto(base+'/?qa_field_fax=1',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__c360Bootstrap?.featuresReady===true);
 if(!await page.evaluate(()=>!!window.C360_FAX_VERSION))await page.addScriptTag({url:base+'/c360-fax.js'});
 await page.evaluate(()=>window.c360FaxRefresh());
 assert.equal(await page.evaluate(adminUiCount),0);assert.equal(queries.length,0);checks.push('Loading the admin module before identifying the phone exposes no admin form or FAX request');
 await page.evaluate(async s=>{
  companyId=s.company;companyProfile={id:s.company,trade_name:'Empresa QA'};deviceMode=true;deviceAccess={id:'qa-device',company_id:s.company,team_id:s.team,active:true,permissions:{apanha:true,ponto:true,abastecimento:true,relatorio:true}};deviceTeam={id:s.team,name:'Equipe 2',metadata:{}};currentRoleCode='device';isAdminGeneral=false;
  localStorage.setItem('controla_beta_session',JSON.stringify({access_token:'qa-access',refresh_token:'qa-refresh',expires_at:Date.now()+3600000,user:{id:s.user,user_metadata:{comando360_device:true}}}));
  document.getElementById('login').classList.add('hidden');document.getElementById('app').classList.remove('hidden');document.body.classList.add('app-ready','device-mode');applyDeviceUi();initScreenRouter();await window.v2Go('equipehome');
 },sample);
 const home=page.locator('#c360FieldFaxHome');
 assert.equal(await page.evaluate(adminUiCount),0);checks.push('Field startup has no FAX registration controls, including detached screens');
 assert.match(await home.innerText(),/Produtor teste Equipe 2/);assert.doesNotMatch(await home.innerText(),/outra equipe/);checks.push('Home displays the team FAX and excludes another team');
 assert(queries.length&&queries.every(q=>new URLSearchParams(q).get('team_id')==='eq.'+sample.team));checks.push('Every field FAX request filters company and team');
 await home.locator('[data-fax-list]').click();
 const panel=page.locator('#c360FieldFaxPanel');assert(await panel.isVisible());assert.doesNotMatch(await panel.innerText(),/outra equipe/);checks.push('Field can open its programming without administrative actions');
 assert.equal(await page.locator('#operacoes .v2hero button').count(),1);assert(await page.locator('#newPoultryOp').isVisible());assert.equal(await page.evaluate(adminUiCount),0);checks.push('Apanhas shows only Nova Apanha in the header and the team FAX immediately below');
 const contrast=await page.evaluate(()=>{
  const luminance=color=>{const c=color.match(/[\d.]+/g).slice(0,3).map(x=>{const s=Number(x)/255;return s<=.04045?s/12.92:((s+.055)/1.055)**2.4});return .2126*c[0]+.7152*c[1]+.0722*c[2]};
  return ['#c360FieldFaxPanel h3','#c360FieldFaxPanel strong','#c360FieldFaxPanel .c360-field-fax-status','#c360FieldFaxPanel [data-fax-doc]'].map(selector=>{const el=document.querySelector(selector),s=getComputedStyle(el);let bg=el;while(bg&&getComputedStyle(bg).backgroundColor==='rgba(0, 0, 0, 0)')bg=bg.parentElement;const a=luminance(s.color),b=luminance(getComputedStyle(bg).backgroundColor);return {selector,ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)}});
 });assert(contrast.every(c=>c.ratio>=4.5),JSON.stringify(contrast));checks.push('FAX producer, status and document button stay readable against the field background');
 await fs.mkdir('qa-artifacts-r100',{recursive:true});await page.screenshot({path:'qa-artifacts-r100/field-fax-readonly.png',fullPage:true});
 const popupPromise=page.waitForEvent('popup');await panel.locator(`[data-fax-doc="${fax.id}"]`).click();const popup=await popupPromise;await popup.waitForURL(/^blob:/);await popup.close();assert.equal(documentReads,1);checks.push('Field opens the original administrator FAX and caches the document');
 await panel.locator('[data-fax-use]').click();
 await page.waitForFunction(()=>document.getElementById('poIntegratedName')?.value==='Produtor teste Equipe 2');
 const form=await page.evaluate(()=>Object.fromEntries(['poIntegratedName','poCity','poFarmName','poTeam','poStart','poNotes'].map(k=>[k,document.getElementById(k)?.value])));
 assert.equal(form.poCity,'Laranjal Paulista');assert.equal(form.poTeam,sample.team);assert.equal(form.poStart,date+'T19:30');assert.match(form.poNotes,/Origem: FAX/);checks.push('FAX fills the form after delayed context finishes');
 assert(!writes.some(w=>/v2_operations|v2_poultry_loadings/.test(w.path)));checks.push('Reading and using FAX never saves an operation automatically');
 assert(!writes.some(w=>/v2_poultry_faxes|\/storage\//.test(w.path)));checks.push('Field viewing and form prefilling never write a FAX or its document');
 await context.setOffline(true);await page.evaluate(()=>window.C360FieldFax.refresh(true));assert.match(await panel.innerText(),/programação salva/);assert.match(await panel.innerText(),/Produtor teste Equipe 2/);checks.push('Saved programming remains available offline');
 const offlinePopupPromise=page.waitForEvent('popup');await panel.locator(`[data-fax-doc="${fax.id}"]`).click();const offlinePopup=await offlinePopupPromise;await offlinePopup.waitForURL(/^blob:/);await offlinePopup.close();assert.equal(documentReads,1);checks.push('The original FAX opens offline after its first online viewing');
 await context.setOffline(false);failedFax=true;await page.evaluate(()=>window.C360FieldFax.refresh(true));assert.match(await panel.innerText(),/salva anteriormente/);assert.match(await panel.innerText(),/Produtor teste Equipe 2/);checks.push('A failed refresh preserves the last programming with a visible notice');
 failedFax=false;
 await page.evaluate(async()=>{deviceAccess.team_id='00000000-0000-0000-0000-00000000c398';deviceTeam={id:deviceAccess.team_id,name:'Outra equipe',metadata:{}};await window.C360FieldFax.refresh(true)});
 assert.doesNotMatch(await panel.innerText(),/Produtor teste Equipe 2/);checks.push('Switching team never reuses the previous team programming');
 // Exercise the first lazy fiscal navigation, with the field guard still enabled.
 await page.evaluate(async()=>{deviceMode=false;currentRoleCode='owner';isAdminGeneral=true;document.body.classList.remove('device-mode');await window.v2Go('configuracoes');await window.v2Go('fiscal')});
 assert(await page.locator('#fiscal').isVisible());checks.push('First fiscal navigation waits for the dynamic screen');
 await page.evaluate(()=>window.v2Go('operacoes'));
 assert(await page.locator('#c360FaxNew').isVisible());assert.equal(await page.locator('#c360FieldFaxPanel').count(),0);checks.push('Administrator retains FAX registration and sees no previous field card');
 await page.locator('[data-faxtab="upcoming"]').click();assert.match(await page.locator('#c360FaxList').innerText(),/Nenhum FAX nesta aba/);await page.locator('[data-faxtab="today"]').click();assert.match(await page.locator('#c360FaxList').innerText(),/Produtor teste Equipe 2/);checks.push('Admin tabs work after the operation screen is detached and reattached');
 if(await page.locator('#closePoultryForm').isVisible())await page.locator('#closePoultryForm').click();
 await page.locator('#c360FaxNew').click();await page.locator('#c360FaxIntegrated').fill('FAX cadastrado pelo administrador');await page.locator('#c360FaxCity').fill('Laranjal Paulista');await page.locator('#c360FaxTeam').selectOption(sample.team);await page.locator('#c360FaxSave').click();
 await page.waitForFunction(()=>document.getElementById('c360FaxMsg')?.textContent==='FAX salvo e programação criada.');
 assert.equal(writes.filter(w=>w.method==='POST'&&/v2_poultry_faxes/.test(w.path)).length,1);checks.push('Administrator can save the FAX assigned to Equipe 2');
 await page.evaluate(()=>{window.__qaOldFaxNew=document.getElementById('c360FaxNew').onclick;window.__qaOldFaxSave=document.getElementById('c360FaxSave').onclick;window.__qaOldFaxDone=document.querySelector('.c360FaxDone').onclick;window.__qaOldFaxUse=document.querySelector('.c360FaxUse').onclick});
 const beforeField={writes:writes.length,queries:queries.length};
 await page.evaluate(async s=>{deviceMode=true;currentRoleCode='device';isAdminGeneral=false;deviceAccess.team_id=s.team;deviceTeam={id:s.team,name:'Equipe 2',metadata:{}};applyDeviceUi();await window.v2Go('operacoes');await window.c360FaxRefresh();await window.C360FieldFax.refresh(true);await window.__qaOldFaxNew();await window.__qaOldFaxSave();await window.__qaOldFaxDone();await window.__qaOldFaxUse()},sample);
 assert.equal(await page.evaluate(adminUiCount),0);const lifecycleWrites=writes.slice(beforeField.writes);assert.deepEqual(lifecycleWrites.filter(w=>/v2_poultry_faxes|\/storage\/|v2_operations|v2_poultry_loadings/.test(w.path)),[],JSON.stringify(lifecycleWrites));assert.equal(await page.locator('#poultryForm').isVisible(),false);checks.push('Returning from admin to field removes admin controls and blocks stale create/complete/use callbacks');
 assert(queries.slice(beforeField.queries).every(q=>new URLSearchParams(q).get('team_id')==='eq.'+sample.team));assert.match(await page.locator('#c360FieldFaxPanel').innerText(),/FAX cadastrado pelo administrador/);checks.push('Field sees the newly registered team FAX using only team-scoped requests');
 assert.equal(errors.length,0,errors.join('\n'));checks.push('No unhandled browser error');
 await fs.mkdir('qa-artifacts-r100',{recursive:true});await fs.writeFile('qa-artifacts-r100/field-fax-report.json',JSON.stringify({checks,errors,queries,operationWrites:writes.filter(w=>/v2_operations|v2_poultry_loadings/.test(w.path))},null,2));
 console.log(checks.map(x=>'PASS '+x).join('\n'));
}finally{await context.close();await browser.close()}
