import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {stripTypeScriptTypes} from 'node:module';

const shared=fs.readFileSync('supabase/functions/_shared/openai-server.ts','utf8').replace(/^import .*$/gm,'').replace(/^export /gm,'');
const source=stripTypeScriptTypes(shared+'\n'+fs.readFileSync('supabase/functions/comando360-daily-ai/index.ts','utf8').replace(/^import .*$/gm,''));
const image='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6NWQAAAAASUVORK5CYII=';
const roster=[{id:'fixture-worker',operational_name:'Ana Silva',team_name:'Equipe 1'}];
let passed=0;
async function test(name,run){await run();passed++;console.log('PASS '+name)}

function runtime(options={}){
 const calls=[],writes=[],timers=[],cleared=[];let handler;
 const userClient={auth:{getUser:async()=>({data:{user:options.noUser?null:{id:'fixture-user'}}})},
  rpc:async(name,args)=>{assert.equal(name,'v2_is_company_member');calls.push({name,args});return{data:!options.noMembership}},
  from(table){const filters=[];const chain=new Proxy({}, {get(_,method){
   if(method==='then')return(resolve,reject)=>{calls.push({table,filters});return Promise.resolve({data:options.roster||roster,error:options.rosterError?{message:'private detail'}:null}).then(resolve,reject)};
   if(['insert','update','delete','upsert'].includes(method))return value=>{writes.push({table,method,value});throw Error('Daily AI may not write business records')};
   return(...args)=>{filters.push({method,args});return chain};
  }});return chain}
 };
 const server={rpc:async name=>{assert.equal(name,'v2_ai_server_key');calls.push({name,service:true});return{data:options.vaultKey||null,error:options.vaultError?{message:'private SQL credentials'}:null}}};
 const sandbox={Request,Response,Headers,AbortController,AbortSignal,Error,JSON,console,
  Deno:{serve:fn=>{handler=fn},env:{get:name=>name==='OPENAI_API_KEY'?(options.noKey?null:'fixture-native-credential'):'fixture-server-config'}},
  createClient:(_url,_key,config)=>config?.global?.headers?.Authorization?userClient:server,
  setTimeout(fn,ms){timers.push(ms);if(options.hang)queueMicrotask(fn);return timers.length},clearTimeout:id=>cleared.push(id),
  fetch:async(url,opt)=>{
   calls.push({provider:url,authorization:opt.headers.Authorization,payload:JSON.parse(opt.body),signal:opt.signal});
   if(options.hang)return new Promise((resolve,reject)=>opt.signal.addEventListener('abort',()=>reject(Object.assign(new Error('private abort detail'),{name:'AbortError'}))));
   const parsed=options.parsed||{summary:'Confira a presença.',rows:[{name:'Ana Silva',status:'present',work_team:'Equipe 1',role:'floor',confidence:0.9}]};
   const body=options.providerBody||{status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(parsed)}]}]};
   return new Response(JSON.stringify(body),{status:options.providerStatus||200});
  }
 };
 vm.runInNewContext(source,sandbox,{filename:'daily-ai.test.js'});
 return {calls,writes,timers,cleared,request:async(body={},authorized=true)=>{
  const r=await handler(new Request('https://qa.invalid/daily-ai',{method:'POST',headers:{'Content-Type':'application/json',...(authorized?{Authorization:'Bearer fixture-user-session'}:{})},body:JSON.stringify({company_id:'fixture-company',image_data_url:image,...body})}));
  return{status:r.status,body:await r.json()};
 }};
}

await test('Daily AI authenticates before loading company data or credentials',async()=>{
 for(const [options,authorized] of [[{},false],[{noUser:true},true]]){
  const r=runtime({noKey:true,vaultKey:'fixture-vault-credential',...options});assert.equal((await r.request({},authorized)).status,401);assert.equal(r.calls.length,0);
 }
});
await test('Daily AI requires membership before looking up the Vault key',async()=>{
 const r=runtime({noMembership:true,noKey:true,vaultKey:'fixture-vault-credential'});assert.equal((await r.request()).status,403);
 assert.equal(r.calls.filter(c=>c.service||c.table||c.provider).length,0);
});
await test('Daily AI rejects remote or oversized images before reading the roster or sending data',async()=>{
 for(const image_data_url of ['https://private.invalid/image','data:image/png;base64,'+'A'.repeat(12*1024*1024)]){
  const r=runtime();assert.equal((await r.request({image_data_url})).status,400);assert.equal(r.calls.filter(c=>c.table||c.provider).length,0);
 }
});
await test('Daily AI reads only active operational people from the selected company',async()=>{
 const r=runtime();assert.equal((await r.request()).status,200);const read=r.calls.find(c=>c.table);
 assert.equal(read.table,'v2_operational_worker_profiles');
 assert.ok(read.filters.some(f=>f.method==='eq'&&f.args[0]==='company_id'&&f.args[1]==='fixture-company'));
 assert.ok(read.filters.some(f=>f.method==='eq'&&f.args[0]==='active'&&f.args[1]===true));
 assert.equal(r.writes.length,0);
});
await test('Daily AI uses a Vault credential without returning it or making attendance or payroll writes',async()=>{
 const key='fixture-vault-credential',r=runtime({noKey:true,vaultKey:key}),out=await r.request();assert.equal(out.status,200);
 assert.equal(r.calls.find(c=>c.provider).authorization,'Bearer '+key);assert.ok(!JSON.stringify(out.body).includes(key));
 assert.equal(out.body.rows[0].worker_profile_id,'fixture-worker');assert.equal(out.body.rows[0].employee_id,null);assert.equal(r.writes.length,0);
});
await test('Daily AI keeps ambiguous people for human review',async()=>{
 const r=runtime({roster:[...roster,{id:'fixture-worker-2',operational_name:'Ana Silva',team_name:'Equipe 2'}]}),out=await r.request();
 assert.equal(out.body.rows[0].worker_profile_id,null);assert.equal(out.body.rows[0].status,'unclear');assert.equal(r.writes.length,0);
});
await test('Roster or credential failures stop Daily AI without disclosing backend details',async()=>{
 for(const options of [{rosterError:true},{noKey:true},{noKey:true,vaultError:true}]){
  const r=runtime(options),out=await r.request();assert.equal(out.status,503);assert.equal(r.calls.filter(c=>c.provider).length,0);
  assert.doesNotMatch(JSON.stringify(out.body),/private detail|private SQL|credentials/);
 }
});
await test('Daily AI quota and rate failures have Portuguese messages without provider secrets',async()=>{
 for(const [code,expected] of [['insufficient_quota','ai_billing_required'],['rate_limit_exceeded','ai_busy']]){
  const r=runtime({providerStatus:429,providerBody:{error:{code,message:'fixture-private-provider-credential'}}}),out=await r.request();
  assert.equal(out.status,503);assert.equal(out.body.code,expected);assert.match(out.body.error,/IA/);
  assert.doesNotMatch(JSON.stringify(out.body),/fixture-private/);assert.equal(r.writes.length,0);
 }
});
await test('Daily AI generation is bounded, response storage is disabled, and timeout is cleared',async()=>{
 const r=runtime();assert.equal((await r.request()).status,200);const call=r.calls.find(c=>c.provider);
 assert.equal(call.provider,'https://api.openai.com/v1/responses');assert.equal(call.payload.store,false);assert.equal(call.payload.max_output_tokens,4096);
 assert.deepEqual(r.timers,[45000]);assert.deepEqual(r.cleared,[1]);
 const hanging=runtime({hang:true});assert.equal((await hanging.request()).status,503);assert.ok(hanging.calls.find(c=>c.provider).signal.aborted);assert.deepEqual(hanging.cleared,[1]);
});
console.log(`${passed} daily AI backend regressions passed.`);
