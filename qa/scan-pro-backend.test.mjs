import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
import {EcuSimulator} from '../scan-pro/simulator.mjs';
import {snapshotContext} from '../scan-pro/assistant.mjs';
const root='supabase/functions/';
const source=stripTypeScriptTypes(['_shared/openai-server.ts','_shared/assistant-stream.ts','oficina360-scan-pro-ai/contract.ts','oficina360-scan-pro-ai/index.ts'].map(f=>fs.readFileSync(root+f,'utf8').replace(/^import .*$/gm,'').replace(/^export /gm,'')).join('\n'));
const ids={company:'11111111-1111-4111-8111-111111111111',vehicle:'22222222-2222-4222-8222-222222222222',user:'33333333-3333-4333-8333-333333333333',conversation:'44444444-4444-4444-8444-444444444444',request:'55555555-5555-4555-8555-555555555555',message:'66666666-6666-4666-8666-666666666666'};
function runtime(options={}) {
  let handler;const writes=[],calls=[],reads=[];
  const db={auth:{getUser:async()=>({data:{user:options.unauth?null:{id:ids.user}}})},rpc:async(name,args)=>{calls.push({name,args});if(name==='v2_ai_commit_turn')return options.commitError?{error:{message:'private'}}:{data:{answer:args.p_answer,message_id:ids.message}};return {data:!options.denied,error:null};},from(table){
    const filters=[];let inserted=false,single=false;
    const result=()=>{
      if(inserted)return {data:{id:table==='v2_ai_conversations'?ids.conversation:ids.message,context:{scan_pro:'v1'}}};reads.push({table,filters:[...filters]});
      if(table==='v2_vehicles')return {data:options.foreignVehicle?null:{id:ids.vehicle,description:'Comil',model:'Piá'}};
      if(table==='v2_vehicle_technical_profiles')return {data:{engine_code:'4.12 TCE',identity_status:'exact'}};
      if(table==='v2_ai_conversations')return {data:options.foreignConversation?null:single?{id:ids.conversation,context:options.workshop?{workshop:{}}:{scan_pro:'v1'}}:[]};
      if(table==='v2_ai_messages')return {data:options.history||[]};
      return {data:[]};
    };
    const chain=new Proxy({}, {get(_,name){if(name==='then')return(resolve,reject)=>Promise.resolve(result()).then(resolve,reject);if(name==='single'||name==='maybeSingle')return async()=>{single=true;return result();};if(name==='insert')return body=>{inserted=true;writes.push({table,body});return chain;};if(name==='eq')return(k,v)=>{filters.push([k,v]);return chain;};return()=>chain;}});return chain;
  }};
  const sandbox={Request,Response,Headers,ReadableStream,TextEncoder,TextDecoder,AbortController,AbortSignal,Date,JSON,console,Error,createClient:()=>db,setTimeout:()=>1,clearTimeout:()=>{},Deno:{serve:fn=>handler=fn,env:{get:n=>n==='OPENAI_API_KEY'?'fixture-secret':'qa'}},fetch:async(url,init)=>{
    calls.push({provider:url,payload:JSON.parse(init.body)});if(options.providerError)return Response.json({error:{code:'insufficient_quota'}},{status:429});
    const text=JSON.stringify({answer:'O sinal é simulado. Compare condições equivalentes.'});
    const events=[{type:'response.output_text.delta',delta:text},{type:options.incomplete?'response.incomplete':'response.completed',response:{status:options.incomplete?'incomplete':'completed'}}];
    return new Response(events.map(e=>'data: '+JSON.stringify(e)+'\n\n').join(''));
  }};
  vm.runInNewContext(source,sandbox);
  const sim=new EcuSimulator('comil');const context=snapshotContext({profile:'comil',samples:[sim.sample(1000)],events:[]});
  const request=(body={},headers={Authorization:'Bearer fixture'})=>handler(new Request('https://qa.invalid',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({company_id:ids.company,vehicle_id:ids.vehicle,conversation_id:ids.conversation,client_request_id:ids.request,question:'Qual o próximo teste?',mode:'analyze',context,...body})}));
  return {writes,calls,reads,request,context};
}
test('Authentication, company permission, vehicle ownership and conversation scope fail before provider',async()=>{
  for(const [options,status] of [[{unauth:true},401],[{denied:true},403],[{foreignVehicle:true},404],[{foreignConversation:true},404],[{workshop:true},404]]){const r=runtime(options),response=await r.request();assert.equal(response.status,status);assert.equal(r.writes.length,0);assert(!r.calls.some(c=>c.provider));}
  const r=runtime();assert.equal((await r.request({},{})).status,401);
});
test('Queries always scope vehicle and messages by company/user; unrelated data is not loaded',async()=>{
  const r=runtime(),response=await r.request();assert.equal(response.status,200);const p=r.calls.find(c=>c.provider).payload;
  assert.equal(p.store,false);assert.equal(p.tools,undefined);assert.match(p.instructions,/TODOS os sinais são SIMULADOS/);assert.match(p.instructions,/4.12 TCE/);
  const messages=r.reads.find(c=>c.table==='v2_ai_messages');assert(messages.filters.some(([k,v])=>k==='user_id'&&v===ids.user));assert(messages.filters.some(([k,v])=>k==='company_id'&&v===ids.company));
  const commit=r.calls.find(c=>c.name==='v2_ai_commit_turn');assert.equal(commit.args.p_actions.length,0);assert.equal(commit.args.p_entries.length,0);
  assert(r.writes.every(w=>['v2_ai_conversations','v2_ai_messages'].includes(w.table)));
});
test('Reject forged physical evidence, bad PID values, profile mismatch and stale-current timeout',async()=>{
  const r=runtime();
  for(const context of [{...r.context,simulated:false},{...r.context,profile:'sprinter'},{...r.context,snapshot:{...r.context.snapshot,simulated:false}},{...r.context,snapshot:{...r.context.snapshot,state:'timeout'}},{...r.context,snapshot:{...r.context.snapshot,pids:{engine_rpm:{value:'900'}}}}])assert.equal((await r.request({context})).status,400);
  assert(!r.calls.some(c=>c.provider));assert.equal(r.writes.length,0);
});
test('Provider or commit failure never emits a saved receipt; no fake local fallback',async()=>{
  for(const options of [{incomplete:true},{commitError:true},{providerError:true}]){const r=runtime(options),response=await r.request({stream:true}),text=await response.text();assert.match(text,/"type":"error"/);assert(!text.includes('"type":"done"'));assert.equal(r.writes.length,1);}
});
test('Streaming reports provisional answer and committed receipt; retries return committed result',async()=>{
  const r=runtime(),response=await r.request({stream:true}),text=await response.text();assert(text.indexOf('"type":"answer"')<text.indexOf('"type":"done"'));assert.match(text,/"type":"session"/);
  const cached=runtime({history:[{id:ids.message,role:'assistant',content:'Resposta guardada.',answer_data:{client_request_id:ids.request}}]});const data=await (await cached.request()).json();assert.equal(data.already_processed,true);assert(!cached.calls.some(c=>c.provider));assert.equal(cached.writes.length,0);
});
test('History works without generating tokens; rejects invalid modes and oversized questions',async()=>{
  const r=runtime();assert.equal((await r.request({mode:'history'})).status,200);assert(!r.calls.some(c=>c.provider));assert.equal((await r.request({mode:'execute'})).status,400);assert.equal((await r.request({question:'x'.repeat(4001)})).status,400);assert.equal((await r.request({question:'x'.repeat(49000)})).status,413);
});
