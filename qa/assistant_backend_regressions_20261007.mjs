import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {stripTypeScriptTypes} from 'node:module';
const shared=fs.readFileSync('supabase/functions/_shared/openai-server.ts','utf8').replace(/^import .*$/gm,'').replace(/^export /gm,'');
const source=stripTypeScriptTypes(shared+'\n'+fs.readFileSync('supabase/functions/controla-ai/index.ts','utf8').replace(/^import .*$/gm,''));
let passed=0;
async function test(name,run){await run();passed++;console.log('PASS '+name)}
function runtime(options={}){
 const calls=[],writes=[],timers=[],cleared=[];let handler;
 const result={ok:true,result:{target_type:'fuel_log',target_id:'fixture-target',message:'Confirmado'}};
 const sb={auth:{getUser:async()=>({data:{user:options.noUser?null:{id:'fixture-user'}}})},rpc:async(name,args)=>{
  calls.push({name,args});if(name==='v2_has_permission')return{data:options.noPermission?false:true};
  if(name==='v2_execute_assistant_action')return{data:options.rpcResult||result,error:options.rpcError||null};throw Error('Unexpected RPC');
 },from(table){let inserted=false;const chain=new Proxy({}, {get(_,name){
  if(name==='then')return(resolve,reject)=>Promise.resolve({data:options.rows?.[table]||[],error:null}).then(resolve,reject);
  if(name==='insert')return body=>{inserted=true;writes.push({table,body});return chain};
  if(name==='single'||name==='maybeSingle')return async()=>({data:table==='v2_ai_conversations'?(options.foreignConversation&&!inserted?null:{id:'fixture-conversation'}):{id:'fixture-message'},error:null});
  return()=>chain;
 }});return chain;}};
 const server={rpc:async name=>{assert.equal(name,'v2_ai_server_key');calls.push({name,service:true});return{data:options.vaultKey||null,error:options.vaultError?{message:'private key lookup SQL detail'}:null}}};
 const sandbox={Request,Response,Headers,AbortController,AbortSignal,Error,Date,Intl,JSON,console,createClient:(_url,_key,config)=>config?.global?.headers?.Authorization?sb:server,
  Deno:{serve:fn=>{handler=fn},env:{get:name=>name==='OPENAI_API_KEY'?(options.noKey?null:'synthetic-qa-key'):'synthetic-qa-config'}},
  setTimeout(fn,ms){timers.push(ms);if(options.hang)queueMicrotask(fn);return timers.length},clearTimeout:id=>cleared.push(id),
  fetch:async(url,opt)=>{calls.push({provider:url,signal:opt.signal,authorization:opt.headers.Authorization,payload:JSON.parse(opt.body)});if(options.hang)return new Promise((resolve,reject)=>opt.signal.addEventListener('abort',()=>reject(Object.assign(new Error('aborted'),{name:'AbortError'}))));
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
 assert.equal(r.writes.length,0);
});
await test('AI health reports activation without creating conversations or calling the provider',async()=>{
 for(const noKey of [true,false]){const r=runtime({noKey}),out=await r.request({mode:'health'});assert.equal(out.status,200);assert.equal(out.body.configured,!noKey);assert.equal(r.writes.length,0);assert.equal(r.calls.filter(c=>c.provider).length,0);assert.doesNotMatch(JSON.stringify(out.body),/synthetic-qa-key/)}
});
await test('AI health requires the company AI permission',async()=>{
 const r=runtime({noPermission:true});assert.equal((await r.request({mode:'health'})).status,403);assert.equal(r.writes.length,0);
});
await test('Vault credentials are unavailable until user and company permission checks pass',async()=>{
 for(const options of [{noUser:true},{noPermission:true}]){
  const r=runtime({noKey:true,vaultKey:'fixture-private-vault-credential',...options});
  assert.ok([401,403].includes((await r.request({mode:'health'})).status));
  assert.equal(r.calls.filter(c=>c.name==='v2_ai_server_key').length,0);
 }
});
await test('Vault health exposes only configuration status and sends no model request',async()=>{
 const key='fixture-private-vault-credential',r=runtime({noKey:true,vaultKey:key}),out=await r.request({mode:'health'});
 assert.equal(out.status,200);assert.equal(out.body.configured,true);assert.equal(r.writes.length,0);
 assert.equal(r.calls.filter(c=>c.name==='v2_ai_server_key'&&c.service).length,1);
 assert.equal(r.calls.filter(c=>c.provider).length,0);assert.ok(!JSON.stringify(out.body).includes(key));
});
await test('The Vault key powers provider requests without entering app responses or database writes',async()=>{
 const key='fixture-private-vault-credential',r=runtime({noKey:true,vaultKey:key}),out=await r.request({question:'Consulta'});
 assert.equal(out.status,200);assert.equal(r.calls.find(c=>c.provider).authorization,'Bearer '+key);
 assert.ok(!JSON.stringify([out.body,r.writes]).includes(key));
});
await test('Native secret configuration takes precedence without a Vault query',async()=>{
 const r=runtime({vaultError:true});assert.equal((await r.request({mode:'health'})).body.configured,true);
 assert.equal(r.calls.filter(c=>c.name==='v2_ai_server_key').length,0);
});
await test('A Vault failure stops analysis before any conversation write and hides server details',async()=>{
 const r=runtime({noKey:true,vaultError:true}),out=await r.request({question:'Consulta'});
 assert.equal(out.status,503);assert.equal(out.body.error,'ai_configuration_unavailable');
 assert.equal(r.writes.length,0);assert.equal(r.calls.filter(c=>c.provider).length,0);
 assert.doesNotMatch(JSON.stringify(out.body),/private key lookup|SQL detail/);
});
await test('Confirmed actions do not depend on the provider or secret store being available',async()=>{
 const r=runtime({noKey:true,vaultError:true}),out=await r.request({mode:'execute',action_request_id:'fixture-action'});
 assert.equal(out.status,200);assert.equal(r.calls.filter(c=>c.name==='v2_ai_server_key'||c.provider).length,0);
});
await test('Provider requests limit generation and disable response storage',async()=>{
 const r=runtime();assert.equal((await r.request({question:'Consulta'})).status,200);
 const request=r.calls.find(c=>c.provider);assert.equal(request.provider,'https://api.openai.com/v1/responses');
 assert.equal(request.payload.store,false);assert.equal(request.payload.max_output_tokens,4096);
});
await test('Quota, access and rate errors give actionable messages without echoing provider secrets',async()=>{
 for(const [status,code,expected] of [[429,'insufficient_quota','ai_billing_required'],[429,'credit_balance_exhausted','ai_billing_required'],[429,'rate_limit_exceeded','ai_busy'],[401,'invalid_api_key','ai_configuration_error'],[403,'forbidden','ai_configuration_error'],[500,'server_error','ai_provider_error']]){
  const r=runtime({providerStatus:status,providerBody:{error:{code,message:'fixture-secret-private-provider-message'}}}),out=await r.request({question:'Consulta'});
  assert.equal(out.body.error,expected);assert.doesNotMatch(JSON.stringify(out.body),/fixture-secret-private/);
  assert.equal(r.writes.filter(w=>w.table==='v2_ai_action_requests').length,0);
 }
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
function proposalRuntime(action_type,payload){
 return runtime({rows:{v2_vehicles:[{id:'fixture-vehicle',plate:'QA00001',description:'608'}]},providerBody:{status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({answer:'Confira os dados da nota.',actions:[{action_type,summary:'Nota sintética',confidence:0.9,payload}]})}]}]}});
}
await test('An unreadable receipt amount stays missing and cannot become a free fuel purchase',async()=>{
 for(const missing of [null,undefined,'',' ',false,[],{}]){
  const r=proposalRuntime('fuel_log',{vehicle:'608',liters:45,total_amount:missing,price_per_liter:null,odometer_km:null});
  const out=await r.request({question:'Leia esta nota sintética'});assert.equal(out.status,200);
  const draft=r.writes.find(w=>w.table==='v2_ai_action_requests').body.proposed_payload;
  assert.equal(draft.total_amount,null);assert.equal(draft.price_per_liter,null);assert.equal(draft.odometer_km,null);
  assert.ok(draft.missing_fields.includes('valor total'));
 }
});
await test('A receipt may calculate a known total or preserve an explicitly recorded zero',async()=>{
 for(const [payload,expected] of [[{liters:45,price_per_liter:6.45,total_amount:null},290.25],[{liters:45,price_per_liter:null,total_amount:0},0]]){
  const r=proposalRuntime('fuel_log',{vehicle:'608',...payload});assert.equal((await r.request({question:'Nota sintética'})).status,200);
  const draft=r.writes.find(w=>w.table==='v2_ai_action_requests').body.proposed_payload;
  assert.equal(draft.total_amount,expected);assert.ok(!draft.missing_fields.includes('valor total'));
 }
});
await test('An unreadable odometer requires review instead of proposing zero kilometres',async()=>{
 const r=proposalRuntime('odometer',{vehicle:'608',odometer_km:null});assert.equal((await r.request({question:'Atualize a quilometragem da foto sintética'})).status,200);
 const draft=r.writes.find(w=>w.table==='v2_ai_action_requests').body.proposed_payload;
 assert.equal(draft.odometer_km,null);assert.ok(draft.missing_fields.includes('quilometragem'));
});
const photo=n=>`data:image/jpeg;base64,${Buffer.from('synthetic-image-'+n).toString('base64')}`;
const attachment=n=>({bucket:'company-documents',path:`fixture-company/assistant360/2026-10-19/photo-${n}.jpg`,original_name:`nota-${n}.jpg`,mime_type:'image/jpeg',size_bytes:100+n});
const images=n=>Array.from({length:n},(_,i)=>({image_data_url:photo(i+1),source_attachment:attachment(i+1)}));
await test('All selected images reach one provider request in order with their archive references',async()=>{
 const selected=images(3),r=runtime(),out=await r.request({question:'Compare estas fotos',images:selected});assert.equal(out.status,200);
 const requests=r.calls.filter(c=>c.provider);assert.equal(requests.length,1);
 const content=requests[0].payload.input[0].content;assert.deepEqual(content.filter(x=>x.type==='input_image').map(x=>x.image_url),selected.map(x=>x.image_data_url));
 assert.match(content[1].text,/Imagem 1 de 3: nota-1.jpg/);assert.match(content[5].text,/Imagem 3 de 3: nota-3.jpg/);
 assert.equal(requests[0].payload.max_output_tokens,8192);assert.equal(requests[0].payload.store,false);
 for(const role of ['user','assistant']){
  const message=r.writes.find(w=>w.table==='v2_ai_messages'&&w.body.role===role).body;
  assert.deepEqual(JSON.parse(JSON.stringify(message.answer_data.source_attachments)),selected.map(x=>x.source_attachment));
 }
 assert.equal(r.writes.filter(w=>w.table==='v2_ai_action_requests').length,0);
});
await test('Ten images are accepted together and an eleventh is rejected without writes',async()=>{
 const accepted=runtime();assert.equal((await accepted.request({images:images(10)})).status,200);
 assert.equal(accepted.calls.find(c=>c.provider).payload.input[0].content.filter(c=>c.type==='input_image').length,10);
 const rejected=runtime();assert.equal((await rejected.request({images:images(11)})).status,400);assert.equal(rejected.writes.length,0);assert.equal(rejected.calls.filter(c=>c.provider).length,0);
});
await test('Malformed batches and a bad image anywhere stop the whole request before writes',async()=>{
 const cases=[{images:'invalid'},{images:{}},{images:[null]},{images:[{}]},{images:[{image_data_url:'data:image/jpeg;base64,'}]},{images:[images(1)[0],{image_data_url:'https://qa.invalid/private.jpg'}]},{images:[{image_data_url:'data:image/jpeg;base64,not base64'}]}];
 for(const body of cases){const r=runtime();assert.equal((await r.request(body)).status,400);assert.equal(r.writes.length,0);assert.equal(r.calls.filter(c=>c.provider).length,0)}
});
await test('Every archive reference is checked against the current company including the final image',async()=>{
 for(const source of [{...attachment(2),path:'foreign-company/assistant360/secret.jpg'},{...attachment(2),bucket:'private'},{...attachment(2),path:'fixture-company/assistant360/../secret.jpg'},{...attachment(2),path:'fixture-company/assistant360/%2e%2e/secret.jpg'}]){
  const selected=images(2);selected[1].source_attachment=source;const r=runtime();assert.equal((await r.request({images:selected})).status,400);assert.equal(r.writes.length,0);assert.equal(r.calls.filter(c=>c.provider).length,0);
 }
});
await test('The combined encoded image size is bounded rather than only checking the first photo',async()=>{
 const large='data:image/jpeg;base64,'+'A'.repeat(7*1024*1024),r=runtime();
 assert.equal((await r.request({images:[{image_data_url:large},{image_data_url:large}]})).status,400);assert.equal(r.writes.length,0);assert.equal(r.calls.filter(c=>c.provider).length,0);
});
await test('Existing single-photo clients remain compatible and mixed request formats are rejected',async()=>{
 const legacy=runtime();assert.equal((await legacy.request({image_data_url:photo(1),source_attachment:attachment(1)})).status,200);
 assert.equal(legacy.calls.find(c=>c.provider).payload.input[0].content.filter(c=>c.type==='input_image').length,1);
 for(const old of [{image_data_url:photo(1)},{source_attachment:attachment(1)}]){const r=runtime();assert.equal((await r.request({...old,images:images(2)})).status,400);assert.equal(r.writes.length,0)}
});
function multiProposalRuntime(indicesList){
 return runtime({rows:{v2_vehicles:[{id:'fixture-vehicle',plate:'QA00001',description:'608'}]},providerBody:{status:'completed',output_text:JSON.stringify({answer:'Confira as notas.',actions:indicesList.map((source_image_indices,i)=>({action_type:'fuel_log',summary:`Nota ${i+1}`,confidence:.9,source_image_indices,payload:{vehicle:'608',liters:10+i,total_amount:60+i}}))})}});
}
await test('Separate receipts keep the correct primary source instead of attaching the first photo to every action',async()=>{
 const r=multiProposalRuntime([[2],[1]]),out=await r.request({images:images(2)});assert.equal(out.status,200);
 const drafts=r.writes.filter(w=>w.table==='v2_ai_action_requests').map(w=>w.body.proposed_payload);
 assert.equal(drafts.length,2);assert.equal(drafts[0]._source.path,attachment(2).path);assert.equal(drafts[1]._source.path,attachment(1).path);
 assert.equal(drafts[0]._sources.length,1);assert.equal(drafts[0].source_image_indices[0],2);assert.equal(drafts[0].missing_fields.length,0);
 assert.equal(r.calls.filter(c=>c.name==='v2_execute_assistant_action').length,0);
});
await test('Multiple pages of one receipt preserve every supporting archive in a single proposal',async()=>{
 const r=multiProposalRuntime([[1,2]]);assert.equal((await r.request({images:images(2)})).status,200);
 const drafts=r.writes.filter(w=>w.table==='v2_ai_action_requests');assert.equal(drafts.length,1);
 assert.equal(drafts[0].body.proposed_payload._source.related_attachments[0].path,attachment(2).path);assert.equal(drafts[0].body.proposed_payload._sources.length,2);
});
await test('Uncertain or invalid source indices require review before multi-photo actions can be confirmed',async()=>{
 for(const indices of [undefined,[],[3],['1'],[1,99]]){
  const r=multiProposalRuntime([indices]);assert.equal((await r.request({images:images(2)})).status,200);
  assert.ok(r.writes.find(w=>w.table==='v2_ai_action_requests').body.proposed_payload.missing_fields.includes('imagem de origem'));
 }
});
await test('Multiple images still require user authentication and company AI permission',async()=>{
 for(const options of [{noUser:true},{noPermission:true}]){const r=runtime(options),out=await r.request({images:images(2)});assert.ok([401,403].includes(out.status));assert.equal(r.writes.length,0);assert.equal(r.calls.filter(c=>c.provider).length,0)}
});
await test('A multi-photo provider timeout clears its longer deadline and creates no proposals',async()=>{
 const r=runtime({hang:true}),out=await r.request({images:images(2)});assert.equal(out.status,503);assert.deepEqual(r.timers,[50000]);assert.deepEqual(r.cleared,[1]);assert.equal(r.writes.filter(w=>w.table==='v2_ai_action_requests').length,0);
});
console.log(`${passed} assistant backend regressions passed.`);
