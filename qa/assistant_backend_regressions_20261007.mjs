import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {stripTypeScriptTypes} from 'node:module';
const source=stripTypeScriptTypes(fs.readFileSync('supabase/functions/controla-ai/index.ts','utf8').replace(/^import .*$/gm,''));
let passed=0;
async function test(name,run){await run();passed++;console.log('PASS '+name)}
function runtime(options={}){
 const calls=[],writes=[],timers=[],cleared=[];let handler;
 const result={ok:true,result:{target_type:'fuel_log',target_id:'fixture-target',message:'Confirmado'}};
 const sb={auth:{getUser:async()=>({data:{user:options.noUser?null:{id:'fixture-user'}}})},rpc:async(name,args)=>{
  calls.push({name,args});if(name==='v2_has_permission')return{data:options.noPermission?false:true};
  if(name==='v2_execute_assistant_action')return{data:options.rpcResult||result,error:options.rpcError||null};throw Error('Unexpected RPC');
 },from(table){let inserted=false;const chain=new Proxy({}, {get(_,name){
  if(name==='then')return(resolve,reject)=>Promise.resolve({data:[],error:null}).then(resolve,reject);
  if(name==='insert')return body=>{inserted=true;writes.push({table,body});return chain};
  if(name==='single'||name==='maybeSingle')return async()=>({data:table==='v2_ai_conversations'?(options.foreignConversation&&!inserted?null:{id:'fixture-conversation'}):{id:'fixture-message'},error:null});
  return()=>chain;
 }});return chain;}};
 const sandbox={Request,Response,Headers,AbortController,Error,Date,Intl,JSON,console,createClient:()=>sb,
  Deno:{serve:fn=>{handler=fn},env:{get:name=>name==='OPENAI_API_KEY'?(options.noKey?null:'synthetic-qa-key'):'synthetic-qa-config'}},
  setTimeout(fn,ms){timers.push(ms);if(options.hang)queueMicrotask(fn);return timers.length},clearTimeout:id=>cleared.push(id),
  fetch:async(url,opt)=>{calls.push({provider:url,signal:opt.signal});if(options.hang)return new Promise((resolve,reject)=>opt.signal.addEventListener('abort',()=>reject(Object.assign(new Error('aborted'),{name:'AbortError'}))));
   return new Response(JSON.stringify(options.providerBody||{status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({answer:'Consulta sintética',actions:[]})}]}]}),{status:options.providerStatus||200});
  }};
 vm.runInNewContext(source,sandbox,{filename:'controla-ai.test.js'});
 const request=async(body={},authorized=true)=>{
  const r=await handler(new Request('https://qa.invalid/controla-ai',{method:'POST',headers:authorized?{Authorization:'Bearer synthetic-token','Content-Type':'application/json'}:{'Content-Type':'application/json'},body:JSON.stringify({company_id:'fixture-company',...body})}));return{status:r.status,body:await r.json()};
 };
 return{request,calls,writes,timers,cleared};
}
await test('Unauthenticated execution is rejected before database access',async()=>{
 const r=runtime(),out=await r.request({mode:'execute',action_request_id:'fixture-action'},false);assert.equal(out.status,401);assert.equal(r.calls.length,0);
});
await test('AI permission remains mandatory for action execution',async()=>{
 const r=runtime({noPermission:true}),out=await r.request({mode:'execute',action_request_id:'fixture-action'});assert.equal(out.status,403);assert.equal(r.calls.filter(c=>c.name==='v2_execute_assistant_action').length,0);
});
await test('Confirmation delegates all writes to one atomic RPC',async()=>{
 const r=runtime(),out=await r.request({mode:'execute',action_request_id:'fixture-action'});assert.equal(out.status,200);assert.equal(out.body.result.target_id,'fixture-target');assert.equal(r.writes.length,0);
 const calls=r.calls.filter(c=>c.name==='v2_execute_assistant_action');assert.equal(calls.length,1);assert.deepEqual(JSON.parse(JSON.stringify(calls[0].args)),{p_company_id:'fixture-company',p_action_id:'fixture-action'});
});
await test('Server-confirmed retry returns its original result',async()=>{
 const original={ok:true,already_executed:true,result:{target_id:'original-target'}},r=runtime({rpcResult:original});assert.deepEqual((await r.request({mode:'execute',action_request_id:'fixture-action'})).body,original);
});
await test('Permission and constraint failures do not expose internal SQL',async()=>{
 const denied=runtime({rpcError:{code:'42501',message:'Sem permissão'}});assert.equal((await denied.request({mode:'execute',action_request_id:'fixture-action'})).status,403);
 const fail=runtime({rpcError:{code:'23514',message:'private table constraint SQL'}}),out=await fail.request({mode:'execute',action_request_id:'fixture-action'});assert.equal(out.status,400);assert.doesNotMatch(JSON.stringify(out.body),/private table/);
});
await test('Missing provider configuration is reported without an external request',async()=>{
 const r=runtime({noKey:true}),out=await r.request({question:'Consulta sintética'});assert.equal(out.status,503);assert.equal(out.body.status,'configuration_required');assert.equal(r.calls.filter(c=>c.provider).length,0);
});
await test('A conversation from another company cannot receive new messages',async()=>{
 const r=runtime({foreignConversation:true}),out=await r.request({conversation_id:'foreign-conversation',question:'Consulta'});assert.equal(out.status,400);assert.equal(r.writes.length,0);
});
await test('Remote images and foreign attachment paths are rejected before transmission',async()=>{
 for(const body of [{image_data_url:'https://private.invalid/image'},{source_attachment:{bucket:'company-documents',path:'another-company/assistant360/file'}}]){
  const r=runtime(),out=await r.request(body);assert.equal(out.status,400);assert.equal(r.calls.filter(c=>c.provider).length,0);assert.equal(r.writes.length,0);
 }
});
await test('The provider request has an abort deadline and always clears its timer',async()=>{
 const r=runtime({hang:true}),out=await r.request({question:'Consulta'});assert.equal(out.status,503);assert.match(out.body.message,/demorou/);assert.deepEqual(r.timers,[35000]);assert.deepEqual(r.cleared,[1]);assert.ok(r.calls.find(c=>c.provider).signal.aborted);
});
await test('Incomplete or invalid provider responses cannot create proposals',async()=>{
 for(const providerBody of [{status:'incomplete',output:[]},{status:'completed',output:[{type:'message',content:[{type:'output_text',text:'invalid json'}]}]}]){
  const r=runtime({providerBody}),out=await r.request({question:'Consulta'});assert.equal(out.status,502);assert.equal(r.writes.filter(w=>w.table==='v2_ai_action_requests').length,0);
 }
});
await test('Raw Responses output messages are parsed without an SDK shortcut',async()=>{
 const r=runtime(),out=await r.request({question:'Consulta'});assert.equal(out.status,200);assert.equal(out.body.answer,'Consulta sintética');assert.deepEqual(out.body.actions,[]);assert.equal(r.cleared.length,1);
});
console.log(`${passed} assistant backend regressions passed.`);
