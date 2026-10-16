import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{JSDOM}=require(process.env.C360_JSDOM_PATH||'jsdom');
let passed=0;
async function test(name,fn){await fn();passed++;console.log('PASS '+name)}
const access=fs.readFileSync('c360-data-access.js','utf8');
function accessRuntime(read){const c=vm.createContext({URLSearchParams,Intl,Date,rest:read});vm.runInContext(access,c);return c}
await test('Complete history survives a server page cap smaller than the requested page size',async()=>{
 const data=Array.from({length:2507},(_,i)=>({id:String(i),amount:1})),queries=[];
 const c=accessRuntime(async(t,q)=>{const p=new URLSearchParams(q);queries.push(p);return data.slice(Number(p.get('offset')),Number(p.get('offset'))+37)});
 const rows=await c.restAll('history','company_id=eq.qa&order=occurred_at.desc&limit=200');
 assert.equal(rows.length,2507);assert.equal(rows.at(-1).id,'2506');assert.equal(rows.reduce((s,x)=>s+x.amount,0),2507);
 assert.equal(queries[0].get('company_id'),'eq.qa');assert.equal(queries[0].get('order'),'occurred_at.desc,id.asc');
});
await test('A failed later page rejects the whole total',async()=>{
 let calls=0;const c=accessRuntime(async()=>{if(calls++)throw Error('network');return[{id:'one'}]});await assert.rejects(()=>c.restAll('history'),/network/);
});
await test('Ignored pagination and oversized queries fail explicitly',async()=>{
 const c=accessRuntime(async()=>[{id:'one'}]);await assert.rejects(()=>c.restAll('history'),/avançar/);
 const d=accessRuntime(async(t,q)=>[{id:new URLSearchParams(q).get('offset')}]);await assert.rejects(()=>d.restAll('history','',{maxRows:2}),/limite/);
});
await test('Views can use a stable composite order without a nonexistent id column',async()=>{
 let n=0,q;const c=accessRuntime(async(t,query)=>{q=query;return n++?[]:[{source_id:'x',source_type:'fuel_log'}]});
 await c.restAll('costs','order=source_type.asc,source_id.asc',{uniqueOrder:false});assert.equal(new URLSearchParams(q).get('order'),'source_type.asc,source_id.asc');
});
await test('A company change during pagination cannot expose the previous company history',async()=>{
 let c;c=accessRuntime(async()=>{c.companyId='company-b';return[{id:'old-company-row'}]});c.companyId='company-a';await assert.rejects(()=>c.restAll('history','company_id=eq.company-a'),/empresa selecionada mudou/);
});
function fixture(){
 const dom=new JSDOM('<body><section id="financeiro"><div class="finance-overview-card"></div><div id="financeKpis"></div><div id="financeList"></div><div id="finEditCard"><input id="finAmount" value="12.34"><input id="finDescription" value="Despesa de teste"><input id="finIssueDate" value="2026-10-16"><input id="finDueDate"><input id="finCounterparty"><select id="finType"><option value="expense" selected>Saída</option></select><button id="saveFinEntry"></button><div id="finMsg"></div></div></section></body>',{url:'https://qa.invalid',runScripts:'outside-only'});
 const w=dom.window;w.companyId='qa-company';w.deviceMode=false;w.financeCache=[];w.esc=s=>String(s??'').replace(/</g,'&lt;');w.money=n=>'R$ '+Number(n).toFixed(2);w.getUser=async()=>({id:'qa-user'});w.confirm=()=>true;w.alert=()=>{};w.rest=async()=>[];w.rpc=async()=>({entry_id:'linked'});
 w.eval(access);w.eval(fs.readFileSync('c360-finance.js','utf8')+'\nwindow.qaPrivacy=(hidden)=>{financeValuesHidden=hidden;renderFinanceReconciliation()};');w.loadFinance=async()=>{};
 return dom;
}
await test('Manual finance saves pending cents once despite two concurrent clicks',async()=>{
 const dom=fixture(),w=dom.window;let writes=0,body;
 w.restInsertOnce=async(t,f,id,payload)=>{writes++;body=payload;await new Promise(r=>setTimeout(r,10));return[{id}]};
 try{await Promise.all([w.saveFinEntry(),w.saveFinEntry()]);assert.equal(writes,1);assert.equal(body.status,'pending');assert.equal(body.amount,12.34);assert.equal(body.created_by,'qa-user');assert.equal(w.document.getElementById('saveFinEntry').disabled,false)}finally{w.close()}
});
await test('Uncertain manual save retries with the same record identifier',async()=>{
 const dom=fixture(),w=dom.window,ids=[];w.restInsertOnce=async(t,f,id)=>{ids.push(id);if(ids.length===1)throw Error('timeout');return[{id}]};
 try{await w.saveFinEntry();await w.saveFinEntry();assert.equal(ids.length,2);assert.equal(ids[0],ids[1]);assert.equal(w.sessionStorage.getItem('c360_finance_draft_qa-company'),null)}finally{w.close()}
});
await test('Fractional cents, negative and absent values cannot create a financial entry',async()=>{
 const dom=fixture(),w=dom.window;let writes=0;w.restInsertOnce=async()=>{writes++};
 try{for(const amount of ['12.345','-1','']){w.document.getElementById('finAmount').value=amount;await w.saveFinEntry()}assert.equal(writes,0);assert.match(w.document.getElementById('finMsg').textContent,/duas casas/)}finally{w.close()}
});
const cost={source_type:'fuel_log',source_id:'fuel-one',amount:100,cost_state:'ready',description:'Posto QA',incurred_on:'2026-10-16'};
await test('Equal totals without a source link remain unconfirmed',()=>{
 const dom=fixture(),w=dom.window;try{assert.equal(w.classifyReconciliation(cost,[{id:'expense',entry_type:'expense',amount:100,status:'paid',source_type:'manual'}]).state,'pending')}finally{w.close()}
});
await test('Only a unique active expense with matching source and value is reconciled',()=>{
 const dom=fixture(),w=dom.window,entry={id:'expense',...cost,entry_type:'expense',status:'pending'};
 try{assert.equal(w.classifyReconciliation(cost,[entry]).state,'linked');for(const x of [{...entry,amount:101},{...entry,entry_type:'income'}])assert.equal(w.classifyReconciliation(cost,[x]).state,'review');assert.equal(w.classifyReconciliation(cost,[entry,{...entry,id:'duplicate'}]).state,'review');assert.equal(w.classifyReconciliation(cost,[{...entry,status:'cancelled'}]).state,'pending')}finally{w.close()}
});
await test('Unknown costs, zero costs and overlap warnings do not offer automatic expenses',()=>{
 const dom=fixture(),w=dom.window;
 try{for(const [cost_state,state] of [['unknown','unknown'],['zero','zero'],['review','review']])assert.equal(w.classifyReconciliation({...cost,cost_state,amount:cost_state==='unknown'?null:0},[]).state,state)}finally{w.close()}
});
await test('Reconciliation UI offers existing links and respects financial privacy',async()=>{
 const dom=fixture(),w=dom.window;w.restAll=async table=>table==='v2_reconcilable_costs'?[cost]:[{id:'manual',entry_type:'expense',status:'paid',description:'Compra QA',amount:100,source_type:'manual',source_id:null,competence_date:'2026-10-16'}];
 try{await w.refreshFinanceReconciliation('2026-10');assert.ok(w.document.querySelector('[data-fin-link]'));assert.ok(w.document.querySelector('[data-fin-create]'));w.qaPrivacy(true);assert.doesNotMatch(w.document.getElementById('c360FinanceReconciliationNotice').textContent,/100\.00/);assert.match(w.document.body.textContent,/R\$ •••/)}finally{w.close()}
});
await test('An unavailable reconciliation query displays unavailable rather than reconciled',async()=>{
 const dom=fixture(),w=dom.window;w.restAll=async()=>{throw Error('offline')};
 try{await w.refreshFinanceReconciliation();assert.match(w.document.body.textContent,/Não foi possível conferir/);assert.doesNotMatch(w.document.body.textContent,/0 conciliada/)}finally{w.close()}
});
await test('Cancellation scopes the write to the current company and detects a denied update',async()=>{
 const dom=fixture(),w=dom.window;let query,message;w.rest=async(t,q)=>{query=q;return[]};w.alert=x=>message=x;
 try{await w.cancelFinEntry('entry');assert.match(query,/company_id=eq.qa-company/);assert.match(message,/não foi alterado/)}finally{w.close()}
});
await test('The legacy bootstrap preserves the idempotent manual handler',()=>{
 const dom=fixture(),w=dom.window;try{assert.equal(w.saveFinEntry.__c360Quality,true)}finally{w.close()}
});
await test('Operational readiness distinguishes missing evidence and denied data from readiness',async()=>{
 const dom=fixture(),w=dom.window;
 const panel=w.document.createElement('section');panel.id='saudesistema';panel.className='section active';w.document.body.appendChild(panel);
 const rows={v2_employees:[{id:'one'},{id:'two'}],v2_employee_face_enrollments:[{id:'face',employee_id:'one'}],v2_vehicles:[],v2_vehicle_documents:[],v2_maintenance_plans:[{id:'plan'}],v2_device_access:[{id:'phone',last_seen_at:null}],v2_reconcilable_costs:[],v2_financial_entries:[]};
 w.restAll=async table=>rows[table]||[];w.rest=async()=>{throw Error('permission denied')};
 try{w.eval(fs.readFileSync('c360-operational-readiness.js','utf8'));await new Promise(r=>setTimeout(r,20));const text=panel.textContent;assert.match(text,/1 de 2 ativo/);assert.match(text,/sem próxima data ou KM/);assert.match(text,/NÃO VERIFICADO/);assert.match(text,/Validar câmera, offline/);assert.doesNotMatch(text,/100%|10\/10|pronto para rodar/)}finally{w.close()}
});
console.log(`${passed} readiness audit regressions passed.`);
