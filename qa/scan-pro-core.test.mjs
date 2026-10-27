import test from 'node:test';
import assert from 'node:assert/strict';
import {decodeObd,decodeJ1939,j1939Id,IsoTpReceiver,decodeUds,validateSample} from '../scan-pro/protocols.mjs';
import {EcuSimulator,ProfessionalTransport} from '../scan-pro/simulator.mjs';
import {parseRecording,validateRecording,recordingCsv,RecordingStore,newRecordingId} from '../scan-pro/recordings.mjs';
import {localGuide,snapshotContext,ScanAssistantClient} from '../scan-pro/assistant.mjs';

test('Known OBD wire vectors: scaling, DTC families, missing bytes and unsupported PID',()=>{
  assert.equal(decodeObd([0x41,0x0c,0x1a,0xf8]).pids.engine_rpm.value,1726);
  assert.equal(decodeObd([0x41,0x05,0x7b]).pids.coolant_temp_c.value,83);
  assert.equal(decodeObd([0x41,0x42,0x36,0xb0]).pids.battery_voltage.value,14);
  assert.deepEqual(decodeObd([0x43,0x02,0x99,0xc1,0x23]).dtcs.map(d=>d.code),['P0299','U0123']);
  assert.throws(()=>decodeObd([0x41,0x0c,0x1a]),/truncada/);
  assert.throws(()=>decodeObd([0x43,0x02]),/DTC truncado/);
  assert.equal(decodeObd([0x41,0x99]).unsupported,true);
  assert.throws(()=>decodeObd([0x41,0x05,256]),/Bytes/);
});
test('J1939 known vectors, PDU1 destination, unavailable/error sentinels and 19-bit SPN',()=>{
  assert.equal(decodeJ1939(0x0cf00400,[255,255,255,0xe0,0x2e,255,255,255]).pids.engine_rpm.value,1500);
  assert.deepEqual(j1939Id(0x18ea8001),{pgn:59904,source:1,destination:128});
  for(const raw of [0xfa00,0xfe00,0xffff])assert.deepEqual(decodeJ1939(0x0cf00400,[0,0,0,raw&255,raw>>8,0,0,0]).pids,{});
  assert.equal(decodeJ1939(0x18feca00,[0,255,0x34,0x12,0xe5,0x7f,255,255]).dtcs[0].spn,0x71234);
  assert.equal(decodeJ1939(0x18feca00,[0,255,0x34,0x12,0xe5,0x7f,255,255]).dtcs[0].fmi,5);
  assert.equal(decodeJ1939(0x18feca00,[0,255,0x34,0x12,0xe5,0xff,255,255]).unsupported,true);
  assert.throws(()=>decodeJ1939(0x1fffffff,[1,2]),/Bytes/);
  assert.throws(()=>j1939Id(0x20000000),/inválido/);
});
test('ISO-TP normal addressing: sequence, timeout, isolated channels, rollover and limits',()=>{
  const r=new IsoTpReceiver({timeoutMs:100});
  assert.deepEqual(r.accept('a',[3,0x41,0x05,0x7b,0,0,0,0],0),[0x41,0x05,0x7b]);
  assert.equal(r.accept('a',[0x10,10,1,2,3,4,5,6],0),null);
  assert.equal(r.accept('b',[0x10,10,11,12,13,14,15,16],0),null);
  assert.deepEqual(r.accept('a',[0x21,7,8,9,10,0,0,0],20),[1,2,3,4,5,6,7,8,9,10]);
  assert.throws(()=>r.accept('b',[0x22,17,18,19,20,0,0,0],20),/Sequência/);
  r.accept('c',[0x10,10,1,2,3,4,5,6],0);assert.throws(()=>r.accept('c',[0x21,7,8,9,10,0,0,0],101),/expirado/);
  assert.throws(()=>r.accept('x',[0x07,1,2]),/Single/);
  r.accept('long',[0x10,125,0,1,2,3,4,5],200);
  let result;for(let i=1;i<=17;i++)result=r.accept('long',[0x20|(i&15),...Array.from({length:7},(_,j)=>(i-1)*7+j+6)],200+i);
  assert.equal(result.length,125);assert.equal(result[124],124);
  r.reset();for(let i=0;i<32;i++)r.accept(i,[0x10,20,1,2,3,4,5,6],500);
  assert.throws(()=>r.accept(33,[0x10,20,1,2,3,4,5,6],500),/Limite/);
});
test('UDS DID F190 and negative response stay explicit; proprietary DIDs are not guessed',()=>{
  const vin='WDB9036631R123456';
  assert.equal(decodeUds([0x62,0xf1,0x90,...[...vin].map(c=>c.charCodeAt(0))]).vin,vin);
  assert.deepEqual(decodeUds([0x7f,0x22,0x78]),{negative:true,service:0x22,nrc:0x78,pending:true});
  assert.equal(decodeUds([0x62,0x12,0x34,1,2]).unsupported,true);
  assert.throws(()=>decodeUds([0x62,0xf1,0x90,1,2]),/VIN/);
});
test('Scenarios traverse decoders, preserve model provenance, and timeout erases current signals',()=>{
  const s=new EcuSimulator('sprinter');s.setScenario('rail');const p=s.sample(1000);
  assert.equal(p.dtcs[0].code,'P0087');assert(p.pids.rail_pressure_actual_bar.value<p.pids.rail_pressure_target_bar.value);
  assert.equal(p.pids.engine_rpm.source,'decoder_lab');assert.equal(p.pids.rail_pressure_actual_bar.source,'didactic_model');
  s.setScenario('timeout');const timeout=s.sample(2000);assert.deepEqual(timeout.pids,{});assert.deepEqual(timeout.dtcs,[]);assert.equal(timeout.state,'timeout');
  assert.match(localGuide('agora?',{snapshot:timeout}),/Não há leituras atuais/);
  const j=new EcuSimulator('comil');j.setScenario('overheat');assert.equal(j.sample(1000).dtcs[0].spn,110);
});
test('Mechanical profiles never invent ECU readings or actuator commands; physical operations fail closed',async()=>{
  for(const name of ['mercedes608','volare']){const s=new EcuSimulator(name);assert.deepEqual(s.sample(1000).pids,{});assert.equal(s.capabilities().read,false);assert.throws(()=>s.runActuator('fan'),/ECU/);}
  const s=new EcuSimulator('comil');assert.equal(s.runActuator('fan').physical_command_sent,false);assert.throws(()=>s.runActuator('flash'),/não implementado/);
  const transport=new ProfessionalTransport('RP1210',{actuator:true});await assert.rejects(transport.connect(),/pendentes/);await assert.rejects(transport.request('actuator'),/bloqueados/);
});
test('Recording round trip, rejecting mixed/physical data, bounded imports, and formula-safe CSV',async()=>{
  const s=new EcuSimulator('comil');const r={schema:'o360.scan.recording.v1',id:'recording-1',profile:'comil',simulated:true,started_at:new Date(1000).toISOString(),samples:[s.sample(1000),s.sample(2000)],events:[]};
  assert.deepEqual(parseRecording(JSON.stringify(r)),validateRecording(r));
  assert.throws(()=>parseRecording(JSON.stringify({...r,simulated:false})),/inválida/);
  assert.throws(()=>validateSample({...r.samples[0],origin:'scanner_bridge',simulated:false}),/Somente/);
  assert.throws(()=>validateRecording({...r,samples:[r.samples[1],r.samples[0]]}),/fora de ordem/);
  assert.throws(()=>validateRecording({...r,samples:[new EcuSimulator('sprinter').sample(1000)]}),/misturados/);
  assert.throws(()=>validateSample({...r.samples[0],state:'timeout'}),/Timeout/);
  assert.throws(()=>parseRecording(' '.repeat(8*1024*1024+1)),/8 MB/);
  assert(recordingCsv(r).includes('"SIMULACAO"'));const evil=structuredClone(r);evil.samples[0].pids.battery_voltage.value=-12;assert(recordingCsv(evil).includes('"\'-12"'));
  const store=await new RecordingStore('qa').open();for(let i=0;i<21;i++)await store.save({...r,id:'r'+i});assert.equal((await store.all()).length,20);
  assert.equal(snapshotContext(r).snapshot.sequence,1);
});
test('Client stream handles split UTF-8 and rejects missing commit receipt',async()=>{
  const original=globalThis.fetch;
  const client=new ScanAssistantClient({client:{auth:{getSession:async()=>({data:{session:{access_token:'fixture',user:{id:'u'}}}})}},apiBase:'https://qa.invalid',apiKey:'public-fixture',vehicle:{id:'v',company_id:'c'},user:{id:'u'}});
  const encoded=new TextEncoder().encode('data: '+JSON.stringify({type:'answer',answer:'Pressão 🚌'})+'\n\ndata: '+JSON.stringify({type:'done',answer:'Pressão 🚌',conversation_id:'x'})+'\n\n');
  try {
    globalThis.fetch=async()=>new Response(new ReadableStream({start(c){for(const b of encoded)c.enqueue(Uint8Array.of(b));c.close();}}),{headers:{'Content-Type':'text/event-stream'}});
    const events=[];assert.equal((await client.request({}, {onEvent:e=>events.push(e)})).answer,'Pressão 🚌');assert.equal(events.length,2);
    globalThis.fetch=async()=>new Response('data: {"type":"answer","answer":"partial"}\n\n',{headers:{'Content-Type':'text/event-stream'}});
    await assert.rejects(client.request({}),/interrompida/);
  } finally {globalThis.fetch=original;}
});
test('Recording IDs work on HTTP preview without randomUUID, and refuse an insecure fallback',()=>{
  const api={getRandomValues:array=>{array.fill(123);return array;}};
  assert.match(newRecordingId(api),/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.throws(()=>newRecordingId({}),/geração segura/);
});
