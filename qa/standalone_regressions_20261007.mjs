import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{JSDOM}=require(process.env.C360_JSDOM_PATH||'jsdom');
const A='00000000-0000-4000-8000-000000000001',B='00000000-0000-4000-8000-000000000002',USER='00000000-0000-4000-8000-000000000003';
let passed=0,failed=0;
const response=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
async function test(name,fn){try{await fn();passed++;console.log('PASS',name)}catch(e){failed++;console.error('FAIL',name,e.stack||e)}}
async function fixture(file,fn,query=''){
 const html=file?fs.readFileSync(file,'utf8'):'<!doctype html><body></body>',dom=new JSDOM(html,{url:'https://example.test/'+query,runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window;w.SUPABASE_URL='https://api.example.test';w.SUPABASE_PUBLISHABLE_KEY='fixture-public-key';w.alert=()=>{};w.confirm=()=>true;w.scrollTo=()=>{};
 w.localStorage.setItem('controla_beta_session',JSON.stringify({access_token:'fixture-token',refresh_token:'fixture-refresh',expires_at:Math.floor(Date.now()/1000)+3600,user:{id:USER}}));
 w.crypto.randomUUID=()=>A;
 w.eval(fs.readFileSync('c360-standalone-core.js','utf8'));
 if(file){const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].filter(x=>!x[1].includes('src='));let code=scripts.at(-1)[2];const stop=file.startsWith('pagamentos')?"$('#month').value=currentMonth();":"$('#photoBtn').onclick";code=code.slice(0,code.indexOf(stop));vm.runInContext(code,dom.getInternalVMContext());if(file.startsWith('pagamentos'))w.document.querySelector('#month').value='2026-10'}
 try{await fn(w)}finally{dom.window.close()}
}
await test('Company context uses the selected membership, not the first membership',()=>fixture(null,async w=>{
 const requests=[];w.fetch=async url=>{requests.push(url);return response(url.includes('company_members')?[{company_id:A},{company_id:B}]:[{id:B,legal_name:'Real B'}])};
 assert.equal((await w.C360Standalone.resolveCompany()).id,B);assert.ok(requests.at(-1).includes('id=eq.'+B));
},'?company='+B));
await test('A company outside the user memberships is rejected before reading its data',()=>fixture(null,async w=>{
 let reads=0;w.fetch=async url=>{reads++;return response([{company_id:A}])};await assert.rejects(w.C360Standalone.resolveCompany(),/não está disponível/);assert.equal(reads,1);
},'?company='+B));
await test('An ambiguous direct bookmark requires returning through the company menu',()=>fixture(null,async w=>{
 w.fetch=async url=>response(url.includes('company_members')?[{company_id:A},{company_id:B}]:[{id:A,legal_name:'Real A'},{id:B,legal_name:'Real B'}]);await assert.rejects(w.C360Standalone.resolveCompany(),/menu da empresa/);
}));
await test('Standalone requests refresh once after an expired-token response',()=>fixture(null,async w=>{
 let refresh=0,requests=0;w.fetch=async url=>{if(url.includes('/auth/')){refresh++;return response({access_token:'fixture-new',refresh_token:'fixture-next',user:{id:USER}})}return response(++requests===1?{message:'expired'}:[],requests===1?401:200)};
 await w.C360Standalone.api('/rest/v1/test');assert.equal(refresh,1);assert.equal(requests,2);assert.equal(JSON.parse(w.localStorage.getItem('controla_beta_session')).access_token,'fixture-new');
}));
await test('Concurrent requests share an expiring-session refresh',()=>fixture(null,async w=>{
 const s=JSON.parse(w.localStorage.getItem('controla_beta_session'));s.expires_at=1;w.localStorage.setItem('controla_beta_session',JSON.stringify(s));let refresh=0;
 w.fetch=async url=>{if(url.includes('/auth/')){refresh++;await new Promise(r=>setTimeout(r,10));return response({...s,access_token:'fixture-new',expires_at:Math.floor(Date.now()/1000)+3600})}return response([])};
 await Promise.all([w.C360Standalone.api('/a'),w.C360Standalone.api('/b')]);assert.equal(refresh,1);
}));
await test('A permission failure is not retried as a refresh',()=>fixture(null,async w=>{
 let calls=0;w.fetch=async()=>{calls++;return response({message:'denied'},403)};await assert.rejects(w.C360Standalone.api('/private'),/denied/);assert.equal(calls,1);
}));
await test('A network timeout ends the request and preserves the saved session',()=>fixture(null,async w=>{
 const old=w.localStorage.getItem('controla_beta_session');w.fetch=async(_url,opts)=>new Promise((_r,reject)=>opts.signal.addEventListener('abort',()=>{const e=new Error('abort');e.name='AbortError';reject(e)}));
 await assert.rejects(w.C360Standalone.api('/slow',{timeoutMs:5}),/demorou/);assert.equal(w.localStorage.getItem('controla_beta_session'),old);
}));
await test('A lost write response is recovered with the original ID and creates no second payment',()=>fixture(null,async w=>{
 let stored=null,writes=0;w.fetch=async(_url,opts)=>{if(opts.method==='POST'){writes++;stored=JSON.parse(opts.body);throw Error('connection lost')}return response(stored?[stored]:[])};
 const body={company_id:B,amount:160},first=await w.C360Standalone.insertOnce('v2_employee_payments',body,A),again=await w.C360Standalone.insertOnce('v2_employee_payments',body,A);
 assert.equal(first[0].id,A);assert.equal(again[0].amount,160);assert.equal(writes,1);
}));
await test('An unavailable confirmation query never starts an unverified write',()=>fixture(null,async w=>{
 let writes=0;w.fetch=async(_url,opts)=>{if(opts.method==='POST')writes++;throw Error('offline')};await assert.rejects(w.C360Standalone.insertOnce('v2_employee_payments',{company_id:B},A),/offline/);assert.equal(writes,0);
 const id=w.C360Standalone.draftId('test-draft');assert.equal(w.C360Standalone.draftId('test-draft'),id);
}));
function paymentForm(w){w.eval(`companyId='${B}';currentEmployee={id:'${A}',full_name:'Fixture',status:'active'};`);const values={days:'1',dailyRate:'160,00',periodStart:'2026-10-01',periodEnd:'2026-10-07',paidDate:'2026-10-07',payMethod:'pix'};for(const [id,value] of Object.entries(values))w.document.getElementById(id).value=value}
await test('Weekly payment rejects reversed periods before any write',()=>fixture('pagamentos-folha.html',async w=>{
 paymentForm(w);w.document.getElementById('periodEnd').value='2026-09-30';let writes=0;w.fetch=async()=>{writes++;return response([])};await w.savePayment();assert.equal(writes,0);assert.match(w.document.getElementById('paymentMsg').textContent,/fim da semana/);
}));
await test('Weekly payment rejects discounts greater than its gross amount',()=>fixture('pagamentos-folha.html',async w=>{
 paymentForm(w);w.document.getElementById('grocery').value='200,00';let writes=0;w.fetch=async()=>{writes++;return response([])};await w.savePayment();assert.equal(writes,0);assert.match(w.document.getElementById('paymentMsg').textContent,/descontos/);
}));
await test('Two simultaneous save calls create one weekly payment',()=>fixture('pagamentos-folha.html',async w=>{
 paymentForm(w);let writes=0,release;const gate=new Promise(r=>release=r);w.fetch=async(_url,opts)=>{if(opts.method==='POST'){writes++;await gate;return response([{id:A,amount:160}])}return response([])};
 w.loadAll=async()=>true;w.printPayment=()=>{};const one=w.savePayment(),two=w.savePayment();await new Promise(r=>setTimeout(r,10));assert.equal(writes,1);release();await Promise.all([one,two]);assert.equal(writes,1);assert.match(w.document.getElementById('paymentMsg').textContent,/160,00/);
}));
await test('A monthly query failure clears the old period and disables its receipt drawer',()=>fixture('pagamentos-folha.html',async w=>{
 w.eval(`companyId='${B}';employees=[{id:'${A}'}];payments=[{amount:999}];currentEmployee=employees[0]`);w.document.getElementById('kReal').textContent='999';w.document.getElementById('drawerBg').classList.add('open');w.fetch=async()=>{throw Error('offline')};assert.equal(await w.loadAll(),false);assert.equal(w.document.getElementById('kReal').textContent,'—');assert.equal(w.eval('payments.length'),0);assert.equal(w.document.getElementById('drawerBg').classList.contains('open'),false);
}));
await test('Payments of an archived employee remain in monthly cash totals and history',()=>fixture('pagamentos-folha.html',async w=>{
 w.eval(`companyId='${B}'`);w.fetch=async url=>response(url.includes('v2_employees?')?[{id:A,full_name:'Archived fixture',status:'archived'}]:url.includes('v2_employee_payments?')?[{id:B,employee_id:A,status:'paid',amount:160,payment_type:'weekly_settlement'}]:[]);await w.loadAll();assert.match(w.document.getElementById('kReal').textContent,/160,00/);assert.match(w.document.getElementById('rows').textContent,/Archived fixture/);
}));
await test('An older monthly response cannot overwrite the later selected month',()=>fixture('pagamentos-folha.html',async w=>{
 w.eval(`companyId='${B}'`);let release;const gate=new Promise(r=>release=r);let round=0;w.fetch=async url=>{const current=++round;if(current<=3)await gate;return response(url.includes('v2_employees?')?[{id:A,full_name:current<=3?'Old':'New',status:'active'}]:[])};
 const old=w.loadAll();await new Promise(r=>setTimeout(r,0));w.document.getElementById('month').value='2026-11';await w.loadAll();release();await old;assert.match(w.document.getElementById('rows').textContent,/New/);assert.doesNotMatch(w.document.getElementById('rows').textContent,/Old/);
}));
await test('Daily save sends operational identities through one RPC and never deletes via REST',()=>fixture('controle-diarias.html',async w=>{
 w.eval(`companyId='${B}';members=[{worker_profile_id:'${A}',employee_id:null,employee_name:'Fixture',role_type:'floor',daily_rate:160,attendance_status:'pending'}]`);w.document.getElementById('team').innerHTML='<option value="Equipe 1">Equipe 1</option>';w.document.getElementById('date').value='2026-10-07';w.document.getElementById('save').disabled=false;const calls=[];w.fetch=async(url,opts)=>{calls.push({url,...opts});return response({id:A,saved:1})};w.loadDay=async()=>true;await w.saveDay();assert.equal(calls.length,1);assert.ok(calls[0].url.includes('/rpc/v2_save_operational_daily_work'));const row=JSON.parse(calls[0].body).p_members[0];assert.equal(row.worker_profile_id,A);assert.equal(row.employee_id,null);assert.equal(calls[0].method,'POST');
}));
await test('Changing a preview period blocks stale operational payment generation',()=>fixture('controle-diarias.html',async w=>{
 w.eval(`companyId='${B}';paymentPreviewContext='old-period'`);let requests=0;w.fetch=async()=>{requests++;return response([])};await w.generatePayments();assert.equal(requests,0);assert.match(w.document.getElementById('payPreview').textContent,/CALCULAR novamente/);
}));
const edge=fs.readFileSync('supabase/functions/comando360-daily-ai/index.ts','utf8');
const context=vm.createContext({Response});vm.runInContext(edge.replace(/^import .*;$/mg,'').split('Deno.serve(')[0],context);
await test('Daily AI reads raw Responses output after a reasoning item',()=>{
 const raw={output:[{type:'reasoning'},{type:'message',content:[{type:'output_text',text:'{"rows":[],'},{type:'output_text',text:'"summary":"ok"}'}]}]};assert.equal(JSON.parse(context.responseText(raw)).summary,'ok');assert.throws(()=>context.responseText({status:'incomplete'}),/incompleta/);
});
await test('Daily AI leaves ambiguous and short names for manual confirmation',()=>{
 const roster=[{id:A,name:'Ana Silva',team:'Equipe 1'},{id:B,name:'Ana Silva',team:'Equipe 2'}];const ambiguous=context.matchRows([{name:'Ana Silva',status:'present'}],roster,'');assert.equal(ambiguous[0].worker_profile_id,null);assert.equal(ambiguous[0].status,'unclear');assert.equal(context.matchRows([{name:'An',status:'present'}],roster,'Equipe 1')[0].worker_profile_id,null);
 const matched=context.matchRows([{name:'ANA SILVA',status:'present'}],roster,'Equipe 2')[0];assert.equal(matched.worker_profile_id,B);assert.equal(matched.employee_id,null);
});
console.log(`Standalone regressions: ${passed} passed, ${failed} failed`);if(failed)process.exitCode=1;
