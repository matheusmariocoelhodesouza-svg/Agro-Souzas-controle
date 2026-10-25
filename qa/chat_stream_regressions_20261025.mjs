import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {stripTypeScriptTypes} from 'node:module';
const shared=['openai-server.ts','workshop-conversation.ts','assistant-stream.ts','daily-chat-context.ts'].map(f=>fs.readFileSync('supabase/functions/_shared/'+f,'utf8').replace(/^import .*$/gm,'').replace(/^export /gm,'')).join('\n');
const source=stripTypeScriptTypes(shared+'\n'+fs.readFileSync('supabase/functions/controla-ai/index.ts','utf8').replace(/^import .*$/gm,''));
const ids={company:'11111111-1111-4111-8111-111111111111',user:'22222222-2222-4222-8222-222222222222',vehicle:'33333333-3333-4333-8333-333333333333',conversation:'44444444-4444-4444-8444-444444444444',order:'55555555-5555-4555-8555-555555555555',message:'66666666-6666-4666-8666-666666666666',request:'77777777-7777-4777-8777-777777777777'};
let passed=0;const test=async(name,run)=>{await run();passed++;console.log('PASS '+name)};
const frame=(type,data)=>'data: '+JSON.stringify({type,...data})+'\n\n';
function runtime(options={}){
 const calls=[],writes=[],reads=[],signed=[];let handler;
 const order={id:ids.order,vehicle_id:ids.vehicle,work_order_number:42,title:'Reparo',status:options.completed?'completed':'in_progress'};
 const context=options.unbound?{}:{memory:'Tampa retirada.',workshop:{work_order_id:ids.order,vehicle_id:ids.vehicle,active:options.active!==false}};
 const db={auth:{getUser:async()=>({data:{user:{id:ids.user}}})},rpc:async(name,args)=>{
  calls.push({name,args});if(name==='v2_has_permission')return {data:!(options.denied||[]).includes(args.p_permission_code)};
  if(name==='v2_ai_commit_turn')return options.commitError?{error:{code:'P0001',message:'private database error'}}:{data:{conversation_id:ids.conversation,answer:args.p_answer,actions:args.p_actions,workshop:options.unbound?null:{work_order_id:ids.order,vehicle_id:ids.vehicle,entries_written:args.p_entries.length}}};
  if(name==='v2_ai_start_workshop'||name==='v2_ai_workshop_control')return {data:{conversation_id:ids.conversation,workshop:context.workshop,message:'Atualizado'}};
  throw Error('Unexpected RPC '+name);
 },from(table){
  const filters=[];let write=false,single=false,limit=100;
  const result=()=>{
   if(write)return {data:{id:table==='v2_ai_conversations'?ids.conversation:ids.message},error:null};reads.push({table,filters:[...filters]});
   if(table==='v2_ai_conversations')return {data:options.foreign?null:(single?{id:ids.conversation,context}:[]),error:null};
   if(table==='v2_ai_messages')return {data:single?options.cached||null:[],error:null};
   if(table==='v2_work_orders')return {data:single?order:[order],error:null};
   if(table==='v2_vehicles')return {data:single?{id:options.otherVehicle||ids.vehicle,description:'Ônibus QA'}:[{id:ids.vehicle,description:'Ônibus QA'}],error:null};
   if(table==='v2_workshop_journal')return {data:(options.journal||[]).slice(0,limit),error:options.journalError?{message:'private read error'}:null};
   return {data:options.rows?.[table]||[],error:options.readError===table?{message:'private read error'}:null};
  };
  const chain=new Proxy({}, {get(_,name){if(name==='then')return(resolve,reject)=>Promise.resolve(result()).then(resolve,reject);if(name==='single'||name==='maybeSingle')return async()=>{single=true;return result()};if(name==='insert'||name==='update')return body=>{write=true;writes.push({table,body});return chain};if(name==='eq'||name==='in')return(k,v)=>{filters.push([k,v]);return chain};if(name==='limit')return n=>{limit=n;return chain};return()=>chain}});return chain;
 },storage:{from:()=>({createSignedUrls:async()=>({data:[]}),createSignedUrl:async path=>{signed.push(path);return {data:{signedUrl:'https://qa.invalid/'+path}}}})}};
 const providerResult={answer:'Etapa recebida.',actions:options.actions||[],conversation_memory:'Contexto atualizado.',workshop_vehicle_id:options.modelVehicle===undefined?ids.vehicle:options.modelVehicle,workshop_entries:options.entries||[]};
 const sandbox={Request,Response,Headers,ReadableStream,TextEncoder,TextDecoder,AbortController,AbortSignal,Error,Date,Intl,JSON,console,createClient:()=>db,setTimeout:()=>1,clearTimeout:()=>{},Deno:{serve:fn=>handler=fn,env:{get:name=>name==='OPENAI_API_KEY'?(options.noKey?'':'fixture-key'):'qa'}},fetch:async(url,opts)=>{
  const payload=JSON.parse(opts.body);calls.push({provider:url,payload});
  if(!payload.stream)return Response.json({status:'completed',output_text:JSON.stringify(providerResult)});
  const raw=JSON.stringify(providerResult),encoder=new TextEncoder();const content=frame('response.output_text.delta',{delta:raw.slice(0,23)})+frame('response.output_text.delta',{delta:raw.slice(23)})+(options.incomplete?frame('response.incomplete',{response:{status:'incomplete'}}):frame('response.completed',{response:{status:'completed'}}));
  return new Response(new ReadableStream({start(c){for(let i=0;i<content.length;i+=7)c.enqueue(encoder.encode(content.slice(i,i+7)));c.close()}}),{headers:{'Content-Type':'text/event-stream'}});
 }};
 vm.runInNewContext(source,sandbox);
 const request=async body=>await handler(new Request('https://qa.invalid/controla-ai',{method:'POST',headers:{Authorization:'Bearer fixture','Content-Type':'application/json'},body:JSON.stringify({company_id:ids.company,conversation_id:ids.conversation,...body})}));
 return {calls,writes,reads,signed,sandbox,request,json:async body=>{const r=await request(body);return {status:r.status,body:await r.json()}}};
}
const entry={kind:'disassembly',description:'Tampa retirada.',source_quote:'Tirei a tampa.'};
await test('Incremental JSON decoding preserves escaped quotes, accents, newlines and emoji without exposing other fields',async()=>{
 const r=runtime(),answer='Peça "A"\nMedição: 2,5 mm 🚌 \\ fim.',raw=JSON.stringify({answer,conversation_memory:'private-memory-marker',actions:[]});let previous='';
 for(let i=1;i<=raw.length;i++){const value=r.sandbox.partialAnswer(raw.slice(0,i));assert(answer.startsWith(value));assert(value.startsWith(previous));assert(!value.includes('private-memory-marker'));previous=value}assert.equal(previous,answer);
});
await test('Answer text is delivered before a delayed provider completion',async()=>{
 const r=runtime();let finish;const encoder=new TextEncoder(),parts=[];
 const response=new Response(new ReadableStream({start(c){c.enqueue(encoder.encode(frame('response.output_text.delta',{delta:'{"answer":"Olá'})));finish=()=>{c.enqueue(encoder.encode(frame('response.output_text.delta',{delta:'!","actions":[]}'})));c.enqueue(encoder.encode(frame('response.completed',{response:{status:'completed'}})));c.close()}}}));
 const pending=r.sandbox.readAssistantStream(response,text=>parts.push(text));await new Promise(r=>setTimeout(r,0));assert.deepEqual(parts,['Olá']);finish();const final=await pending;assert.equal(JSON.parse(final.output_text).answer,'Olá!');
});
await test('A streamed workshop turn has session, visible answer and a final atomic receipt',async()=>{
 const r=runtime({entries:[entry]}),response=await r.request({question:'Tirei a tampa.',stream:true,client_request_id:ids.request});assert.match(response.headers.get('content-type'),/event-stream/);const text=await response.text();assert(text.indexOf('event: session')<text.indexOf('event: answer'));assert(text.indexOf('event: answer')<text.indexOf('event: done'));assert.match(text,/"entries_written":1/);assert.equal(r.calls.filter(c=>c.name==='v2_ai_commit_turn').length,1);assert.equal(r.calls.find(c=>c.provider).payload.store,false);
});
await test('An interrupted provider stream never commits an assistant reply or journal receipt',async()=>{
 const r=runtime({entries:[entry],incomplete:true}),text=await(await r.request({question:'Tirei a tampa.',stream:true})).text();assert.match(text,/event: error/);assert.doesNotMatch(text,/event: done|entries_written/);assert(!r.calls.some(c=>c.name==='v2_ai_commit_turn'));
});
await test('A failed journal transaction emits an error after preview text and never emits success',async()=>{
 const r=runtime({entries:[entry],commitError:true}),text=await(await r.request({question:'Tirei a tampa.',stream:true})).text();assert.match(text,/event: answer/);assert.match(text,/event: error/);assert.doesNotMatch(text,/event: done|private database error/);
});
await test('Reports commit the source user message and selected work order together',async()=>{
 const r=runtime({entries:[entry]}),out=await r.json({question:'Tirei a tampa.',client_request_id:ids.request});assert.equal(out.status,200);const commit=r.calls.find(c=>c.name==='v2_ai_commit_turn');assert.equal(commit.args.p_user_message_id,ids.message);assert.equal(commit.args.p_request_id,ids.request);assert.deepEqual(JSON.parse(JSON.stringify(commit.args.p_entries)),[entry]);assert.equal(r.writes.find(w=>w.body.role==='user').body.answer_data.work_order_id,ids.order);
});
await test('Model-invented source quotes and another bus are rejected before journal commit',async()=>{
 for(const options of [{entries:[{...entry,source_quote:'Montei o motor.'}]},{entries:[entry],modelVehicle:ids.message}]){const r=runtime(options),out=await r.json({question:'Tirei a tampa.'});assert([400,502].includes(out.status));assert(!r.calls.some(c=>c.name==='v2_ai_commit_turn'))}
});
await test('Paused, closed, unbound and read-only conversations do not record automatic entries',async()=>{
 for(const options of [{active:false},{completed:true},{unbound:true},{denied:['workshop.manage']}]){const r=runtime({...options,entries:[entry]});assert.equal((await r.json({question:'Tirei a tampa.'})).status,200);assert.equal(r.calls.find(c=>c.name==='v2_ai_commit_turn').args.p_entries.length,0)}
});
await test('A saved request can be retried with no provider credential or extra writes',async()=>{
 const r=runtime({noKey:true,cached:{id:ids.message,content:'Resposta salva',answer_data:{workshop:{entries_written:1},actions:[]}}}),out=await r.json({question:'Tirei a tampa.',client_request_id:ids.request,stream:true});assert.equal(out.status,200);assert.equal(out.body.already_processed,true);assert.equal(r.writes.length,0);assert(!r.calls.some(c=>c.provider||c.name==='v2_ai_server_key'));
});
await test('Tracking suppresses a new maintenance proposal for every reported stage',async()=>{
 const r=runtime({entries:[entry],actions:[{action_type:'maintenance',payload:{},missing_fields:[]}]});await r.json({question:'Tirei a tampa.'});assert(!r.writes.some(w=>w.table==='v2_ai_action_requests'));
});
await test('Workshop controls and options do not call the model or require its credential',async()=>{
 const r=runtime({noKey:true});for(const b of [{mode:'workshop_options'},{mode:'workshop_start',vehicle_id:ids.vehicle,client_request_id:ids.request},{mode:'workshop_control',operation:'pause'},{mode:'workshop_control',operation:'finish',result:'Conferido.'}])assert.equal((await r.json(b)).status,200);assert(!r.calls.some(c=>c.provider||c.name==='v2_ai_server_key'));
});
await test('A diary read verifies conversation ownership and validates all signed archive paths',async()=>{
 const bad=runtime({foreign:true});assert.equal((await bad.json({mode:'workshop_timeline'})).status,404);assert(!bad.reads.some(c=>c.table==='v2_workshop_journal'));
 const valid={bucket:'company-documents',path:ids.company+'/assistant360/a.jpg',mime_type:'image/jpeg'},r=runtime({journal:[{kind:'attachment',attachments:[valid,{...valid,path:ids.company+'/assistant360/../x'},{...valid,path:'foreign/assistant360/x'}]}]});await r.json({mode:'workshop_timeline'});assert.deepEqual(r.signed,[valid.path]);
});
await test('Selected vehicle changes cannot infer from an active conversation about a different bus',async()=>{
 const r=runtime({otherVehicle:ids.message}),out=await r.json({question:'Continue',vehicle_context_id:ids.message});assert.equal(out.status,400);assert.equal(r.writes.length,0);assert(!r.calls.some(c=>c.provider));
});
await test('A daily finance query is never made when the account lacks the required domain permissions',async()=>{
 const r=runtime({unbound:true,denied:['finance.view','employee.payments.manage']});await r.json({question:'Confira meus pagamentos.'});assert(!r.reads.some(c=>/financial_entries|employee_payments|payment_runs/.test(c.table)));assert.match(r.calls.find(c=>c.provider).payload.instructions,/sem permissão/);
});
await test('Authorized payment, consumption and part queries remain scoped to the company and selected bus',async()=>{
 const r=runtime();await r.json({question:'Confira os pagamentos, o consumo de diesel e a peça junta.'});for(const table of ['v2_financial_entries','v2_employee_payments','v2_fuel_logs','v2_vehicle_component_links']){const read=r.reads.find(c=>c.table===table);assert(read,table);assert(read.filters.some(([k,v])=>k==='company_id'&&v===ids.company));if(table==='v2_fuel_logs'||table==='v2_vehicle_component_links')assert(read.filters.some(([k,v])=>k==='vehicle_id'&&v===ids.vehicle))}
});
await test('Unavailable payment data is reported as unavailable rather than an empty balance',async()=>{
 const r=runtime({unbound:true,readError:'v2_employee_payments'});await r.json({question:'Quais pagamentos fiz?'});assert.match(r.calls.find(c=>c.provider).payload.instructions,/Consulta indisponível/);
});
await test('Conversation lists use the selected vehicle scope and the authenticated company',async()=>{
 const r=runtime();await r.json({mode:'conversations',vehicle_context_id:ids.vehicle});const read=r.reads.find(c=>c.table==='v2_ai_conversations');assert(read.filters.some(([k,v])=>k==='context->>vehicle_context_id'&&v===ids.vehicle));assert(read.filters.some(([k,v])=>k==='user_id'&&v===ids.user));
});
console.log(`${passed} streaming, workshop and daily context regressions passed.`);
