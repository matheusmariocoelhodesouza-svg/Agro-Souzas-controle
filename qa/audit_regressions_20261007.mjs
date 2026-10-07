import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{JSDOM}=require(process.env.C360_JSDOM_PATH||'jsdom');
const html=fs.readFileSync('index.html','utf8');
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let passed=0,failed=0;
async function test(name,fn){try{await fn();passed++;console.log('PASS',name)}catch(e){failed++;console.error('FAIL',name,e.stack||e)}}
function source(name,file='index.html'){
 const text=file==='index.html'?html:fs.readFileSync(file,'utf8');
 const match=new RegExp('(?:async )?function '+name+'\\(').exec(text);assert.ok(match,`Missing ${name} in ${file}`);
 for(let end=text.indexOf('}',match.index);end>=0;end=text.indexOf('}',end+1)){
  const value=text.slice(match.index,end+1);try{new vm.Script('('+value+')');return value}catch{}
 }
 throw Error('Incomplete '+name);
}
function fixture(body=''){
 const dom=new JSDOM('<!doctype html><body>'+body+'</body>',{url:'https://example.test',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window;w.companyId='fixture-company';w.console.warn=()=>{};w.scrollTo=()=>{};
 w.q=(s,r=w.document)=>r.querySelector(s);w.$=w.q;return dom;
}
function load(w,names,file='index.html'){for(const name of names)w.eval(source(name,file))}
async function withFixture(body,fn){const dom=fixture(body);try{await fn(dom.window)}finally{dom.window.close()}}
const operation='<section id="operacoes"><div class="v2hero"><div class="toolbar"><button id="newPoultryOp">Nova apanha</button></div></div></section>';
await test('Farm import supports nested action toolbar and is inserted once',()=>withFixture(operation,w=>{
 w.deviceMode=false;load(w,['ensureFarmImportButton'],'c360-quality-core.js');w.ensureFarmImportButton();w.ensureFarmImportButton();
 assert.equal(w.document.querySelectorAll('#c360FarmImportBtn').length,1);
 assert.equal(w.document.querySelector('#c360FarmImportBtn').nextElementSibling.id,'newPoultryOp');
}));
await test('Field phone never receives farm import control',()=>withFixture(operation,w=>{
 w.deviceMode=true;load(w,['ensureFarmImportButton'],'c360-quality-core.js');w.ensureFarmImportButton();assert.equal(w.document.querySelector('#c360FarmImportBtn'),null);
}));
await test('Quality layer installs with finance screen detached and decorates it later',()=>withFixture('<div id="screenHost"></div>',async w=>{
 w.rest=async()=>[];w.loadFinance=async()=>{};w.renderFinanceView=()=>{};
 w.eval(fs.readFileSync('c360-quality-core.js','utf8'));await delay(50);
 assert.equal(w.loadFinance.name,'smartLoadFinance');
 w.document.getElementById('screenHost').innerHTML='<section id="financeiro"><div class="card"><div id="financeList"></div></div></section>'+operation;
 await delay(50);assert.ok(w.document.querySelector('#c360FinanceTools'));assert.ok(w.document.querySelector('#c360FarmImportBtn'));
 assert.equal(w.c360QualityDiagnostics().length,0);
}));
await test('Quality layer activates after a later login without reporting a guest as broken',()=>withFixture('<div id="screenHost"></div>',async w=>{
 const original=async function originalFinance(){};w.companyId=null;w.rest=async()=>[];w.loadFinance=original;w.renderFinanceView=()=>{};
 const timer=w.setTimeout.bind(w);w.setTimeout=(fn,ms,...args)=>timer(fn,ms===250?0:ms,...args);
 w.eval(fs.readFileSync('c360-quality-core.js','utf8'));await delay(150);
 assert.equal(w.loadFinance,original);assert.equal(w.c360QualityDiagnostics().length,0);
 w.companyId='fixture-company';w.document.dispatchEvent(new w.CustomEvent('c360:screen-changed',{detail:{screen:'dashboard'}}));
 await delay(50);assert.equal(w.loadFinance.name,'smartLoadFinance');assert.equal(w.c360QualityDiagnostics().length,0);
}));
await test('FAX attaches beside nested new-operation button',()=>withFixture(operation,w=>{
 Object.assign(w,{canManage:()=>true,screen:id=>w.document.getElementById(id),style(){},markup:()=>'<div id="c360FaxPanel"></div>',addDashboardShortcut(){},bind(){}});
 w.eval('let installed=false;'+source('inject','c360-fax.js'));assert.equal(w.inject(),true);
 assert.equal(w.document.querySelector('.c360-fax-hero-actions #newPoultryOp')?.id,'newPoultryOp');
}));
await test('Trailer panel supports separate nested fleet result counter',()=>withFixture('<section id="frota"><div><span id="fleetResultCount"></span></div><div><div id="vehiclesList"></div></div></section>',w=>{
 w.bindPanel=()=>{};load(w,['ensurePanel'],'c360-trailer-hitches.js');w.ensurePanel();assert.equal(w.document.querySelector('#c360TrailerPanel').nextElementSibling.id,'vehiclesList');
}));
await test('Fuel type field supports wrapped station input',()=>withFixture('<div id="fuelEditCard"><div class="row"><div><div><input id="fuelStation"></div></div></div></div>',w=>{
 w.ensureStyle=()=>{};load(w,['ensureFuelTypeField'],'c360-fuel-type.js');w.ensureFuelTypeField();assert.equal(w.document.querySelector('#fuelTypeBox').parentElement.className,'row');
}));
await test('Fuel queue retains its diesel type when a different type is selected',()=>withFixture('<select id="fuelType"><option value="s10" selected>S10</option></select>',async w=>{
 const writes=[];w.rest=async(...args)=>{writes.push(args);return[]};w.offlineQueueAdd=async item=>{writes.push(item)};
 w.eval("const LABELS={s500:'Diesel S500',s10:'Diesel S10'};let selectedFuelType='s10';const norm=v=>v||'';"+source('typeFromEntry','c360-fuel-type.js')+source('wrapPersistence','c360-fuel-type.js'));
 w.wrapPersistence();await w.rest('v2_fuel_logs','','POST',{metadata:{fuel_type:'s500'}});
 await w.offlineQueueAdd({type:'fuel',payload:{metadata:{fuel_type:'s500'}}});
 assert.equal(writes[0][3].metadata.fuel_type,'s500');assert.equal(writes[1].payload.metadata.fuel_type,'s500');
}));
await test('Insumo work-order lookup uses composite key and preserves dependency failures',()=>withFixture('',async w=>{
 let query='';w.rest=async(table,q)=>{if(table==='v2_work_order_parts'){query=q;return[{work_order_id:'order'}]}return[]};
 load(w,['itemUsage'],'c360-consumable-edit.js');assert.equal((await w.itemUsage('item')).hasWorkOrders,true);assert.match(query,/select=work_order_id/);
 w.rest=async()=>{throw Error('Unavailable')};await assert.rejects(w.itemUsage('item'),/Unavailable/);
}));
function fuelFunctions(w){load(w,['fuelLogIsFull','fuelPlausibleKmL','fuelInterval','fuelEconomyEstimate'])}
const fuel=(km,liters,day,full=false)=>({vehicle_id:'vehicle',odometer_km:km,liters,fueled_at:`2026-10-${String(day).padStart(2,'0')}T12:00:00Z`,metadata:{tank_filled_full:full}});
await test('Full-to-full economy includes galão liters without an odometer',()=>withFixture('',w=>{
 fuelFunctions(w);const result=w.fuelEconomyEstimate('vehicle',[fuel(1000,30,1,true),fuel(null,50,2),fuel(1500,50,3,true)]);
 assert.equal(result.km_l,5);assert.equal(result.source,'full_cycles');
}));
await test('Approximate history includes partial fills between odometer readings',()=>withFixture('',w=>{
 fuelFunctions(w);assert.equal(w.fuelEconomyEstimate('vehicle',[fuel(1000,30,1),fuel(null,50,2),fuel(1500,50,3)]).km_l,5);
}));
await test('Impossible fuel chronology is never presented as valid economy',()=>withFixture('',w=>{
 fuelFunctions(w);assert.equal(w.fuelEconomyEstimate('vehicle',[fuel(1000,30,1,true),fuel(1500,50,1,true)]),null);
}));
await test('São Paulo date stays in previous month after UTC midnight',()=>withFixture('',w=>{
 load(w,['saoPauloDateKey']);assert.equal(w.saoPauloDateKey('2026-10-01T01:30:00Z'),'2026-09-30');
}));
await test('Operation save rejects concurrent taps and unlocks after failure',()=>withFixture('<button id="savePoultryOp"></button>',async w=>{
 let finish,calls=0;w.savePoultryOperationImpl=()=>{calls++;return new Promise(resolve=>{finish=resolve})};
 w.eval('let poultrySavePending=false;'+source('savePoultryOperation'));
 const pending=w.savePoultryOperation();await w.savePoultryOperation();assert.equal(calls,1);assert.equal(w.$('#savePoultryOp').disabled,true);
 finish();await pending;assert.equal(w.$('#savePoultryOp').disabled,false);
 w.savePoultryOperationImpl=async()=>{throw Error('network')};await assert.rejects(w.savePoultryOperation(),/network/);assert.equal(w.$('#savePoultryOp').disabled,false);
}));
await test('Server-committed write survives a lost response without duplication',()=>withFixture('',async w=>{
 let committed=null,writes=0;w.rest=async(table,query,method,body)=>{if(method==='POST'){writes++;committed={id:'saved',...body};throw Error('response lost')}return committed?[committed]:[]};
 load(w,['restInsertOnce']);const payload={company_id:'fixture-company',liters:50};
 assert.equal((await w.restInsertOnce('v2_fuel_logs','offline_event_id','event',payload))[0].id,'saved');
 await w.restInsertOnce('v2_fuel_logs','offline_event_id','event',payload);assert.equal(writes,1);
}));
await test('Failed write without a committed row remains retryable with the same event ID',()=>withFixture('',async w=>{
 let fail=true;w.rest=async(table,query,method,body)=>{if(method==='POST'){if(fail)throw Error('network');return[{id:'saved',...body}]}return[]};
 load(w,['restInsertOnce']);await assert.rejects(w.restInsertOnce('v2_operations','offline_event_id','draft',{company_id:'fixture-company'}),/network/);
 fail=false;assert.equal((await w.restInsertOnce('v2_operations','offline_event_id','draft',{company_id:'fixture-company'}))[0].offline_event_id,'draft');
}));
await test('Transient startup failures do not invalidate saved authentication',()=>withFixture('',w=>{
 load(w,['invalidSavedSession']);assert.equal(w.invalidSavedSession(Error('Failed to fetch')),false);assert.equal(w.invalidSavedSession(Error('A conexão demorou demais.')),false);
 assert.equal(w.invalidSavedSession({status:401}),true);assert.equal(w.invalidSavedSession({code:'refresh_token_not_found'}),true);assert.equal(w.invalidSavedSession({status:403,message:'permission denied'}),false);
}));
await test('HTTP errors retain status and backend code for recovery decisions',()=>withFixture('',async w=>{
 load(w,['parseResponse']);await assert.rejects(w.parseResponse({ok:false,status:401,text:async()=>JSON.stringify({message:'Expired',code:'invalid_jwt'})}),e=>e.status===401&&e.code==='invalid_jwt');
}));
await test('Authentication refresh retries once and preserves configurable timeout',()=>withFixture('',async w=>{
 let calls=0,refreshes=0;const seen=[];w.API_URL='https://api.test';w.KEY='fixture-publishable';w.ensureFreshAccessToken=async()=> 'first';w.refreshToken=async()=>{refreshes++;return 'refreshed'};
 w.fetchTimeout=async(url,opts,timeout)=>{seen.push({auth:opts.headers.Authorization,timeout});return{status:++calls===1?401:200}};
 load(w,['authFetch']);assert.equal((await w.authFetch('/functions/v1/controla-ai',{},true,45000)).status,200);
 assert.equal(refreshes,1);assert.deepEqual(seen,[{auth:'Bearer first',timeout:45000},{auth:'Bearer refreshed',timeout:45000}]);
}));
await test('Assistant uses the authenticated bounded request for expired sessions',()=>withFixture('',async w=>{
 let call;w.globalFn=name=>name==='authFetch'?async(...args)=>{call=args;return{ok:true}}:null;
 load(w,['assistantRequest'],'c360-assistant360.js');await w.assistantRequest('/functions/v1/controla-ai',{method:'POST'});
 assert.equal(call[0],'/functions/v1/controla-ai');assert.equal(call[2],true);assert.equal(call[3],45000);
}));
await test('Chat links are clickable and HTML payloads stay plain text',()=>withFixture('<div id="message"></div>',w=>{
 load(w,['appendLinkedText'],'c360-assistant360.js');const el=w.document.getElementById('message');
 w.appendLinkedText(el,'<img src=x onerror=alert(1)> https://goo.gl/maps/test.');
 assert.equal(el.querySelector('img'),null);assert.equal(el.querySelector('a').href,'https://goo.gl/maps/test');assert.equal(el.querySelector('a').rel,'noopener noreferrer');assert.match(el.textContent,/test\.$/);
}));
function farmApi(w){w.eval(fs.readFileSync('c360-farm-search.js','utf8'));return w.C360FarmSearch}
const farms=[{id:'farm',company_id:'fixture-company',producer_name:'MÁRCIA CARDOSO MAGALHÃES',farm_name:'MÁRCIA CARDOSO MAGALHÃES',city:'Iperó',status:'active',latitude:null,longitude:null,metadata:{google_maps_url:'https://goo.gl/maps/example'}},{id:'farm2',company_id:'fixture-company',producer_name:'MÁRCIA CARDOSO MAGALHÃES 02',farm_name:'MÁRCIA CARDOSO MAGALHÃES 02',city:'Iperó',status:'active',metadata:{google_maps_url:'https://goo.gl/maps/example'}}];
await test('Farm search handles accents, a mistyped first name and separate numbered properties',()=>withFixture('',w=>{
 const api=farmApi(w);assert.equal(api.search(farms,'Localização da granja Márcia Cardoso Magalhães').length,2);
 assert.equal(api.search(farms,'Localização da granja Amacia Cardoso Magalhaes').length,2);
 assert.equal(api.search(farms,'Onde fica a granja Márcia Cardoso Magalhães 02?')[0].id,'farm2');assert.equal(api.search(farms,'Localização Cardoso 03').length,0);
}));
await test('Farm Maps helper preserves confirmed URLs and never invents null coordinates',()=>withFixture('',w=>{
 const api=farmApi(w);assert.equal(api.mapsUrl(farms[0]),'https://goo.gl/maps/example');assert.equal(api.mapsUrl({latitude:null,longitude:null}),null);
 assert.equal(api.mapsUrl({metadata:{google_maps_url:'javascript:alert(1)'}}),null);assert.equal(api.mapsUrl({metadata:{google_maps_url:'https://google.com.evil.test/maps'}}),null);
}));
await test('Farm lookup stays inside the current company and does not write records',()=>withFixture('',async w=>{
 const calls=[];w.rest=async(table,query,method)=>{calls.push({table,query,method});return [...farms,{...farms[0],id:'other',company_id:'other-company'}]};
 const api=farmApi(w),answer=await api.answer('Onde fica a granja Marcia Cardoso Magalhaes?');
 assert.match(answer,/2 cadastros/);assert.match(answer,/https:\/\/goo.gl\/maps\/example/);assert.match(calls[0].query,/company_id=eq.fixture-company/);assert.equal(calls[0].method,undefined);
 assert.equal(await api.answer('Qual o gasto de combustível?'),null);
}));
await test('Farm lookup uses the cached team catalogue offline',()=>withFixture('',async w=>{
 Object.defineProperty(w.navigator,'onLine',{value:false});w.offlineTeamKey=()=> 'fixture-company:team:poultry_context';w.offlineCacheGet=async()=>({farms});
 const answer=await farmApi(w).answer('Localização granja Marcia Cardoso Magalhaes');assert.match(answer,/2 cadastros/);
}));
await test('Latest navigation wins when an earlier module download finishes last',()=>withFixture('<div id="screenHost"></div>',async w=>{
 let release;w.deviceMode=false;w.v2ScreenStore={ia:w.document.createElement('section'),equipes:w.document.createElement('section')};w.v2ScreenStore.ia.id='ia';w.v2ScreenStore.equipes.id='equipes';
 for(const name of ['stopMovitTrackingPolling','c360SetModule','c360CloseMobileMenu','c360Busy','c360Toast','renderDeviceModeBar'])w[name]=()=>{};
 w.loadTeams=async()=>{};w.c360LoadScreenFeatures=tab=>tab==='ia'?new Promise(resolve=>{release=resolve}):Promise.resolve();
 w.eval('let screenNavigationVersion=0;'+source('v2Go'));const older=w.v2Go('ia');await w.v2Go('equipes');release();assert.equal(await older,false);assert.equal(w.document.querySelector('#screenHost').firstElementChild.id,'equipes');
}));
await test('A failed optional screen download preserves the current screen',()=>withFixture('<div id="screenHost"><section id="current"></section></div>',async w=>{
 w.deviceMode=false;w.stopMovitTrackingPolling=()=>{};w.c360Toast=()=>{};w.c360LoadScreenFeatures=async()=>{throw Error('offline')};
 w.eval('let screenNavigationVersion=0;'+source('v2Go'));assert.equal(await w.v2Go('ia'),false);assert.ok(w.document.querySelector('#current'));
}));
console.log(`${passed+failed} audit regressions, ${passed} passed, ${failed} failed.`);
if(failed)process.exitCode=1;
