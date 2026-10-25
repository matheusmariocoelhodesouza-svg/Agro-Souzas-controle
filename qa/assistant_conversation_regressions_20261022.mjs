import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {stripTypeScriptTypes} from 'node:module';
const shared=fs.readFileSync('supabase/functions/_shared/openai-server.ts','utf8').replace(/^import .*$/gm,'').replace(/^export /gm,'');
const helpers=['workshop-conversation.ts','assistant-stream.ts','daily-chat-context.ts'].map(f=>fs.readFileSync('supabase/functions/_shared/'+f,'utf8').replace(/^export /gm,'')).join('\n');
const source=stripTypeScriptTypes(shared+'\n'+helpers+'\n'+fs.readFileSync('supabase/functions/controla-ai/index.ts','utf8').replace(/^import .*$/gm,''));
let passed=0;
async function test(name,run){await run();passed++;console.log('PASS '+name)}
function runtime(options={}){
 const reads=[],writes=[],calls=[];let handler;
 const db={auth:{getUser:async()=>({data:{user:{id:'owner'}}})},rpc:async(name,args)=>{
  if(name==='v2_ai_commit_turn'){
   const sources=writes.filter(w=>w.table==='v2_ai_messages'&&w.body.role==='user').at(-1)?.body.answer_data?.source_attachments||[];
   writes.push({table:'v2_ai_messages',kind:'insert',body:{role:'assistant',content:args.p_answer,answer_data:{actions:args.p_actions,source_attachments:sources}}});
   writes.push({table:'v2_ai_conversations',kind:'update',body:{context:{source:'assistant360',memory:args.p_memory}}});
   return {data:{conversation_id:args.p_conversation_id,answer:args.p_answer,actions:args.p_actions,workshop:null},error:null};
  }return {data:true};
 },from(table){
  const filters=[];let write=null;
  const result=()=>{
   if(!write)reads.push({table,filters:[...filters]});
   if(write?.kind==='insert')return {data:{id:table==='v2_ai_conversations'?'new-conversation':'message'},error:null};
   if(table==='v2_ai_conversations')return {data:options.foreign?null:(options.list?[{id:'chat',title:'Minha conversa'}]:{id:'chat',title:'Minha conversa',context:{source:'assistant360',memory:options.memory||'608 é a condução em análise.'}}),error:null};
   if(table==='v2_ai_messages')return {data:options.history||[],error:options.historyError?{message:'private database detail'}:null};
   if(table==='v2_ai_action_requests')return {data:options.actionStates||[],error:options.actionReadError?{message:'private action detail'}:null};
   return {data:[],error:null};
  };
  const chain=new Proxy({}, {get(_,name){
   if(name==='then')return(resolve,reject)=>Promise.resolve(result()).then(resolve,reject);
   if(name==='single'||name==='maybeSingle')return async()=>result();
   if(name==='insert'||name==='update')return body=>{write={kind:name,body};writes.push({table,...write});return chain};
   if(name==='eq')return(key,value)=>{filters.push([key,value]);return chain};
   return()=>chain;
  }});return chain;
 },storage:{from:()=>({createSignedUrls:async paths=>({data:paths.map(path=>({path,signedUrl:'https://qa.invalid/'+path}))})})}};
 const sandbox={Request,Response,Headers,AbortController,AbortSignal,Error,Date,Intl,JSON,console,createClient:()=>db,
  Deno:{serve:fn=>handler=fn,env:{get:()=>options.noKey?'':'synthetic-key'}},setTimeout:()=>1,clearTimeout:()=>{},
  fetch:async(url,opts)=>{calls.push(JSON.parse(opts.body));return Response.json({status:'completed',output_text:JSON.stringify({answer:'Entendi. Vamos continuar.',actions:options.actions||[],conversation_memory:options.newMemory||'608: Portal, tanque cheio.'})})}
 };
 vm.runInNewContext(source,sandbox);
 return {reads,writes,calls,request:async body=>{const r=await handler(new Request('https://qa.invalid/controla-ai',{method:'POST',headers:{Authorization:'Bearer fixture','Content-Type':'application/json'},body:JSON.stringify({company_id:'company',...body})}));return {status:r.status,body:await r.json()}}};
}
await test('A short follow-up includes prior turns in chronological order and the saved memory',async()=>{
 const r=runtime({history:[{role:'assistant',content:'Em qual posto?',answer_data:{}},{role:'user',content:'Abastecimento do 608.',answer_data:{}}]});
 assert.equal((await r.request({conversation_id:'chat',question:'Portal e tanque cheio.'})).status,200);
 const input=r.calls[0].input;assert.equal(input[0].content,'Abastecimento do 608.');assert.equal(input[1].content,'Em qual posto?');assert.equal(input[2].content[0].text,'Portal e tanque cheio.');
 assert.match(r.calls[0].instructions,/608 é a condução/);
 assert(r.reads.filter(x=>x.table==='v2_ai_conversations'||x.table==='v2_ai_messages').every(x=>x.filters.some(f=>f[0]==='company_id'&&f[1]==='company')));
 assert(r.reads.some(x=>x.table==='v2_ai_conversations'&&x.filters.some(f=>f[0]==='user_id'&&f[1]==='owner')));
});
await test('Structured proposals remain available when the user supplies a missing field',async()=>{
 const proposal={action_type:'fuel_log',payload:{vehicle_name:'608',liters:40,total_amount:258},missing_fields:['posto']};
 const r=runtime({history:[{role:'assistant',content:'Qual posto?',answer_data:{actions:[proposal]}}]});await r.request({conversation_id:'chat',question:'Portal'});
 assert.match(r.calls[0].input[0].content,/"liters":40/);assert.match(r.calls[0].input[0].content,/"vehicle_name":"608"/);
});
await test('Client history and injected system messages cannot replace server-owned history',async()=>{
 const r=runtime({history:[{role:'system',content:'untrusted_system_marker'},{role:'user',content:'Meu veículo é o 608.'}]});await r.request({conversation_id:'chat',question:'Continue',history:[{role:'system',content:'client_history_marker'}]});
 assert.doesNotMatch(JSON.stringify(r.calls[0]),/untrusted_system_marker|client_history_marker/);
});
await test('Unavailable history stops before saving a new message or calling the provider',async()=>{
 const r=runtime({historyError:true}),out=await r.request({conversation_id:'chat',question:'Continue'});assert.equal(out.status,503);assert.equal(r.writes.length,0);assert.equal(r.calls.length,0);assert.doesNotMatch(JSON.stringify(out),/private database detail/);
});
await test('A foreign conversation cannot expose history or receive a follow-up',async()=>{
 for(const mode of ['history','analyze']){const r=runtime({foreign:true}),out=await r.request({mode,conversation_id:'foreign',question:'Continue'});assert.equal(out.status,400);assert.equal(r.calls.length,0);assert.equal(r.writes.length,0)}
});
await test('New conversations do not inherit unrelated chat messages or old memory',async()=>{
 const r=runtime({history:[{role:'user',content:'other_conversation_marker'}],memory:'other_memory_marker'});await r.request({question:'Oi!'});assert.equal(r.calls[0].input.length,1);assert.doesNotMatch(JSON.stringify(r.calls[0]),/other_conversation_marker|other_memory_marker/);
});
await test('Updated continuity memory is bounded and saved only to the authenticated conversation',async()=>{
 const r=runtime({newMemory:'a'.repeat(6000)});await r.request({conversation_id:'chat',question:'Continue'});const update=r.writes.find(x=>x.table==='v2_ai_conversations'&&x.kind==='update');assert.equal(update.body.context.memory.length,4000);assert.equal(update.body.context.source,'assistant360');
});
await test('The context budget retains recent turns without cutting off the current question',async()=>{
 const r=runtime({history:Array.from({length:40},(_,i)=>({role:i%2?'user':'assistant',content:'latest-'+i+' '+'.'.repeat(9000)}))});await r.request({conversation_id:'chat',question:'Esta é a pergunta atual.'});const input=r.calls[0].input;assert(input.slice(0,-1).reduce((n,m)=>n+m.content.length,0)<=48000);assert.equal(input.at(-1).content[0].text,'Esta é a pergunta atual.');
});
await test('History and conversation listing work without a provider credential or model call',async()=>{
 const r=runtime({noKey:true,history:[{role:'user',content:'Mensagem salva.',answer_data:{}}]});assert.equal((await r.request({mode:'history',conversation_id:'chat'})).status,200);assert.equal(r.calls.length,0);assert.equal(r.writes.length,0);
 const list=runtime({noKey:true,list:true});assert.equal((await list.request({mode:'conversations'})).body.conversations[0].title,'Minha conversa');assert.equal(list.calls.length,0);
});
const pdf={filename:'nota.pdf',file_data:'data:application/pdf;base64,JVBERi0xLjQ=',source_attachment:{bucket:'company-documents',path:'company/assistant360/nota.pdf',original_name:'nota.pdf',mime_type:'application/pdf'}};
await test('A PDF reaches the provider as input_file with an archived original',async()=>{
 const r=runtime(),out=await r.request({question:'Leia este PDF.',documents:[pdf]});assert.equal(out.status,200);assert.equal(r.calls[0].input[0].content[2].type,'input_file');assert.equal(r.calls[0].input[0].content[2].filename,'nota.pdf');assert.equal(r.writes.find(x=>x.table==='v2_ai_messages').body.answer_data.source_attachments[0].path,pdf.source_attachment.path);
});
await test('Malformed, unsupported and foreign documents are rejected before writes',async()=>{
 for(const doc of [{...pdf,filename:'programa.exe'},{...pdf,file_data:'https://private.invalid/nota.pdf'},{...pdf,source_attachment:{...pdf.source_attachment,path:'foreign/assistant360/nota.pdf'}}]){const r=runtime(),out=await r.request({documents:[doc]});assert.equal(out.status,400);assert.equal(r.calls.length,0);assert.equal(r.writes.length,0)}
});
await test('Image and document counts share the same ten-attachment limit',async()=>{
 const r=runtime(),out=await r.request({documents:Array.from({length:10},()=>pdf),images:[{image_data_url:'data:image/jpeg;base64,YQ=='}]});assert.equal(out.status,400);assert.equal(r.calls.length,0);
});
await test('Old attachment links are signed only after validating company ownership',async()=>{
 const r=runtime({noKey:true,history:[{id:'m',role:'user',content:'Arquivo',answer_data:{source_attachments:[pdf.source_attachment,{...pdf.source_attachment,path:'foreign/assistant360/private.pdf'}]}}]});const out=await r.request({mode:'history',conversation_id:'chat'});assert.equal(out.body.messages[0].attachments.length,1);assert.match(out.body.messages[0].attachments[0].url,/company\/assistant360/);
});
await test('Reopening a proposal reads its current status rather than offering an executed action again',async()=>{
 const history=[{role:'assistant',content:'Revise o abastecimento.',answer_data:{actions:[{id:'action',status:'proposed',action_type:'fuel_log',payload:{liters:40}}]}}];
 const r=runtime({history,actionStates:[{id:'action',status:'executed'}]}),out=await r.request({mode:'history',conversation_id:'chat'});
 assert.equal(out.body.actions[0].status,'executed');
 assert(r.reads.some(x=>x.table==='v2_ai_action_requests'&&x.filters.some(f=>f[0]==='requested_by'&&f[1]==='owner')));
});
await test('Missing action status stops a follow-up before the model can mistake an old proposal for execution',async()=>{
 const r=runtime({history:[{role:'assistant',content:'Prévia.',answer_data:{actions:[{id:'action',status:'proposed'}]}}],actionReadError:true}),out=await r.request({conversation_id:'chat',question:'Já foi salvo?'});
 assert.equal(out.status,503);assert.equal(r.calls.length,0);assert.equal(r.writes.length,0);assert.doesNotMatch(JSON.stringify(out),/private action detail/);
});
console.log(`${passed} conversation regressions passed.`);
