import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{JSDOM}=require(process.env.C360_JSDOM_PATH||'jsdom');
const ids={company:'11111111-1111-4111-8111-111111111111',vehicle:'33333333-3333-4333-8333-333333333333',other:'33333333-3333-4333-8333-333333333334',conversation:'44444444-4444-4444-8444-444444444444',order:'55555555-5555-4555-8555-555555555555'};
const sources=['c360-workshop-chat.js','oficina360-chat.js','c360-chat-stream.js','c360-chat-experience.js','c360-assistant360.js'].map(f=>fs.readFileSync(f,'utf8'));
const tick=async()=>{for(let i=0;i<4;i++)await new Promise(r=>setTimeout(r,0))};
function setup(options={}){
 const dom=new JSDOM('<!doctype html><div id="tab-workshop-chat" class="active"><div id="ia"><div class="card"><h3>Oficina IA</h3><p class="muted">Conversa</p><div class="chatbox" id="chatbox"></div><div class="toolbar"><textarea id="question"></textarea><button id="sendAI" class="primary">Enviar</button></div></div></div></div>',{url:'https://qa.invalid',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,d=w.document,calls=[],notices=[],recognitions=[],utterances=[],observers=[];let vehicle=ids.vehicle,workshop=null,fail=false,hold=null;
 const Observer=w.MutationObserver;w.MutationObserver=class extends Observer{constructor(fn){super(fn);observers.push(this)}};
 Object.assign(w,{Response,Headers,AbortController,ReadableStream,TextEncoder,TextDecoder});w.Element.prototype.scrollIntoView=()=>{};w.SUPABASE_URL='https://qa.invalid';w.SUPABASE_PUBLISHABLE_KEY='fixture-public';
 w.O360Workspace={session:()=>({access_token:'fixture',user:{id:'owner'}}),vehicle:()=>({id:vehicle,company_id:ids.company}),notify:t=>notices.push(t),openTab(tab){d.querySelector('#tab-workshop-chat').classList.toggle('active',tab==='workshop-chat');d.dispatchEvent(new w.CustomEvent('o360:tab-changed',{detail:{tab}}))},refreshOrders:async()=>{}};
 w.SpeechRecognition=class{constructor(){recognitions.push(this)}start(){this.started=true}abort(){this.aborted=true;this.onend?.()}stop(){this.onend?.()}};w.SpeechSynthesisUtterance=class{constructor(t){this.text=t}};w.speechSynthesis={cancel(){},speak:u=>utterances.push(u)};
 w.authFetch=async(_endpoint,opts)=>{
  const b=JSON.parse(opts.body);calls.push(b);
  if(b.mode==='health')return Response.json({configured:true,status:'configured'});
  if(b.mode==='conversations')return Response.json({conversations:options.threads||[]});
  if(b.mode==='history')return Response.json({messages:[{role:'user',content:b.conversation_id===ids.conversation?'Minha oficina.':'Meus pagamentos.'}],workshop:null});
  if(b.mode==='workshop_options')return Response.json({can_start:true,vehicles:[{id:ids.vehicle,description:'Ônibus 1'},{id:ids.other,description:'Ônibus 2'}],orders:[]});
  if(b.mode==='workshop_start'){workshop={work_order_id:ids.order,work_order_number:42,vehicle_id:vehicle,vehicle_name:'Ônibus 1',title:b.title,active:true,status:'in_progress',can_record:true};return Response.json({conversation_id:ids.conversation,workshop,message:'Acompanhamento iniciado.'})}
  if(b.mode==='workshop_timeline')return Response.json({workshop:{...workshop,timeline:[{kind:'hypothesis',description:'Suspeita de junta.',source_quote:'Acho que é a junta.',recorded_at:'2026-10-25T10:00:00Z',attachments:[]}]}});
  if(b.mode==='workshop_control'){workshop={...workshop,active:false,status:b.operation==='finish'?'completed':workshop.status};return Response.json({workshop,message:'Atualizado.'})}
  if(b.mode==='analyze'){
   if(hold)return hold;if(fail){fail=false;return Response.json({message:'Falha simulada',conversation_id:ids.conversation},{status:503})}
   const final={conversation_id:ids.conversation,answer:'Etapa **recebida**.',actions:[],workshop:workshop?{...workshop,entries_written:1}:null};
   if(options.stream){const encoder=new TextEncoder();return new Response(new ReadableStream({start(c){c.enqueue(encoder.encode('event: session\ndata: '+JSON.stringify({conversation_id:ids.conversation})+'\n\nevent: answer\ndata: '+JSON.stringify({text:'Etapa recebida'})+'\n\n'));setTimeout(()=>{c.enqueue(encoder.encode('event: done\ndata: '+JSON.stringify(final)+'\n\n'));c.close()},10)}}),{headers:{'Content-Type':'text/event-stream'}})}
   return Response.json(final);
  }throw Error('Unexpected request '+b.mode);
 };
 sources.forEach(s=>w.eval(s));const $=s=>d.querySelector(s),click=async s=>{$(s).click();await tick()},send=async t=>{$('#question').value=t;await click('#sendAI')};
 return {w,d,$,calls,notices,recognitions,utterances,click,send,close(){observers.forEach(o=>o.disconnect());w.close()},fail:()=>fail=true,hold:p=>hold=p,switchVehicle(){vehicle=ids.other;d.dispatchEvent(new w.CustomEvent('o360:vehicle-changed'))},async start(){await tick();await click('.ai360-workshop-open');$('.ai360-workshop-title').value='Reparo no ônibus';await click('.ai360-workshop-start')}};
}
let passed=0;async function test(name,run,options){const r=setup(options);try{await run(r);passed++;console.log('PASS '+name)}finally{await tick();r.close()}}
await test('The professional chat keeps a scrollable transcript, a conversation sidebar and a separate composer',async r=>{
 await tick();assert(r.$('.ai360-chat-layout'));assert(r.$('.ai360-sidebar input[aria-label="Buscar conversas"]'));assert(r.$('.ai360-composer-wrap #question'));assert(!r.$('.ai360-chat-scroll #question'));assert.equal(r.$('.ai360-empty').hidden,false);assert.equal(r.d.querySelectorAll('.ai360-suggestion').length,4);await r.click('.ai360-suggestion:nth-child(2)');assert.match(r.$('#question').value,/consumo/);
});
await test('Multiple threads restore separate histories and show the active conversation',async r=>{
 await tick();assert.equal(r.d.querySelectorAll('.ai360-thread').length,2);assert.match(r.$('#chatbox').textContent,/Minha oficina/);await r.click('.ai360-thread:nth-child(2)');assert.match(r.$('#chatbox').textContent,/Meus pagamentos/);assert.doesNotMatch(r.$('#chatbox').textContent,/Minha oficina/);assert.equal(r.d.querySelectorAll('.ai360-thread[aria-current="true"]').length,1);r.$('.ai360-sidebar-search').value='pagamento';r.$('.ai360-sidebar-search').dispatchEvent(new r.w.Event('input'));assert.equal(r.d.querySelectorAll('.ai360-thread').length,1);
},{threads:[{id:ids.conversation,title:'Oficina do ônibus'},{id:ids.order,title:'Pagamento da equipe'}]});
await test('Starting the service once keeps subsequent reports on the same bus and conversation',async r=>{
 await r.start();await r.send('Tirei a tampa.');await r.send('Limpei a tampa.');const turns=r.calls.filter(c=>c.mode==='analyze');assert.equal(turns.length,2);assert(turns.every(c=>c.conversation_id===ids.conversation&&c.vehicle_context_id===ids.vehicle));assert.notEqual(turns[0].client_request_id,turns[1].client_request_id);assert.equal(r.d.querySelectorAll('.ai360-journal-receipt').length,2);assert.equal(r.$('.ai360-empty').hidden,true);
});
await test('A failed turn keeps the original draft and request ID when resent',async r=>{
 await r.start();r.fail();await r.send('Tirei a tampa.');assert.equal(r.$('#question').value,'Tirei a tampa.');await r.click('#sendAI');const turns=r.calls.filter(c=>c.mode==='analyze');assert.equal(turns[0].client_request_id,turns[1].client_request_id);assert.equal(r.$('#question').value,'');assert.equal(r.d.querySelectorAll('.ai360-journal-receipt').length,1);
});
await test('The diary shows source quotes and completion requires a separate result confirmation',async r=>{
 await r.start();await r.click('.ai360-workshop-diary');assert.match(r.$('.ai360-workshop-log').textContent,/Hipótese/);assert.match(r.$('.ai360-workshop-log').textContent,/Acho que é a junta/);await r.click('.ai360-workshop-diary');assert.equal(r.$('.ai360-workshop-log'),null);await r.click('.ai360-workshop-complete');await r.click('.ai360-workshop-finish-save');assert(!r.calls.some(c=>c.operation==='finish'));r.$('.ai360-workshop-result').value='Resultado conferido.';await r.click('.ai360-workshop-finish-save');assert.equal(r.calls.filter(c=>c.operation==='finish').length,1);
});
await test('Changing the selected bus discards a delayed answer from the old scope',async r=>{
 await r.start();let resolve;r.hold(new Promise(r=>resolve=r));const send=r.send('Tirei a tampa.');await tick();r.switchVehicle();await tick();resolve(Response.json({answer:'old_bus_marker',conversation_id:ids.conversation,workshop:{vehicle_name:'Old bus',work_order_number:42,active:true},actions:[]}));await send;await tick();assert.doesNotMatch(r.$('#chatbox').textContent,/old_bus_marker/);assert.doesNotMatch(r.$('.ai360-workshop').textContent,/Old bus/);assert.equal(r.$('#sendAI').disabled,false);
});
await test('Hands-free mode sends a spoken report, reads the saved answer and listens again',async r=>{
 await r.start();await r.click('.ai360-handsfree');const rec=r.recognitions.at(-1);assert(rec.started);rec.onresult({results:[{0:{transcript:'Tirei a tampa.'},isFinal:true}]});rec.onend();await tick();assert.equal(r.calls.find(c=>c.mode==='analyze').question,'Tirei a tampa.');assert(r.utterances[0]);r.utterances[0].onend();await new Promise(r=>setTimeout(r,400));assert(r.recognitions.at(-1)!==rec);await r.click('.ai360-handsfree');assert(r.recognitions.at(-1).aborted);
});
await test('Leaving the chat stops the microphone and preserves a floating return control',async r=>{
 await r.start();await r.click('.ai360-handsfree');r.w.O360Workspace.openTab('overview');await tick();assert(r.recognitions.at(-1).aborted);assert.equal(r.$('#c360AiFab').hidden,false);await r.click('#c360AiFab');assert(r.$('#tab-workshop-chat').classList.contains('active'));assert.equal(r.$('#c360AiFab').hidden,true);
});
await test('A speech playback failure cannot turn a saved report into a failed draft',async r=>{
 await r.start();r.w.speechSynthesis.speak=()=>{throw Error('Playback unavailable')};await r.click('.ai360-handsfree');const rec=r.recognitions.at(-1);rec.onresult({results:[{0:{transcript:'Tirei a tampa.'},isFinal:true}]});rec.onend();await tick();assert.equal(r.$('#question').value,'');assert.equal(r.d.querySelectorAll('.ai360-journal-receipt').length,1);assert.doesNotMatch(r.$('#chatbox').textContent,/Playback unavailable/);
});
await test('Streaming finishes one message with rendered text and one server-confirmed receipt',async r=>{
 await r.start();await r.send('Tirei a tampa.');await new Promise(r=>setTimeout(r,20));await tick();assert.equal(r.calls.filter(c=>c.mode==='analyze')[0].stream,true);assert.equal(r.d.querySelectorAll('.ai360-journal-receipt').length,1);assert.equal(r.d.querySelectorAll('.ai360-streaming').length,0);assert.equal(r.d.querySelectorAll('.msg.ai strong').length,1);assert.equal(r.$('#sendAI').textContent,'↑');
},{stream:true});
await test('Message formatting renders lists and tables while treating model HTML as text',async r=>{
 const el=r.d.createElement('div');r.w.C360ChatExperience.renderText(el,'**Peças**\n- Junta\n- Filtro\n\n| Peça | Valor |\n| --- | --- |\n| Junta | R$ 10 |\n<img src=x onerror=alert(1)>');assert.equal(el.querySelectorAll('strong').length,1);assert.equal(el.querySelectorAll('li').length,2);assert.equal(el.querySelectorAll('table').length,1);assert.equal(el.querySelector('img'),null);assert.match(el.textContent,/<img/);
});
console.log(`${passed} professional chat UI regressions passed.`);
