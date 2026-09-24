import fs from 'node:fs';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {JSDOM}=require(process.env.C360_JSDOM_PATH||'jsdom');
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let failures=0,checks=0;
async function test(name,fn){checks++;try{await fn();console.log('PASS',name)}catch(e){failures++;console.error('FAIL',name,e.message)}}
function fixture(screen,body=''){
 const dom=new JSDOM(`<body><div id="screenHost"><section id="${screen}" class="section active">${body}</section></div></body>`,{url:'https://example.test',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window;w.companyId='fixture';w.console.warn=()=>{};return dom;
}
await test('Integrity notices do not refetch after their own DOM mutations',async()=>{
 const dom=fixture('funcionarios'),w=dom.window;let calls=0;
 w.rest=async table=>{calls++;return table==='v2_employees'?[{id:'e',status:'active'}]:[]};
 try{w.eval(fs.readFileSync('c360-data-integrity.js','utf8'));await delay(750);assert.ok(calls<=2,`${calls} requests for one idle screen`)}finally{w.close()}
});
await test('Failed biometrics request reports unavailable, not full coverage',async()=>{
 const dom=fixture('funcionarios'),w=dom.window;w.rest=async()=>{throw Error('Network failure')};
 try{w.eval(fs.readFileSync('c360-data-integrity.js','utf8'));await delay(200);const text=w.document.body.textContent;assert.match(text,/Não foi possível/);assert.doesNotMatch(text,/Todos os funcionários/)}finally{w.close()}
});
await test('Operation filters settle instead of rewriting the DOM endlessly',async()=>{
 const dom=fixture('operacoes','<div id="poultryList"><div class="item">Granja</div></div>'),w=dom.window;let mutations=0;
 w.poultryOpsCache=[{id:'o',team_id:'t',scheduled_start:'2026-09-23T10:00:00Z',status:'completed'}];w.poultryTeams=[{id:'t',name:'Equipe 1',status:'active'}];
 const observer=new w.MutationObserver(entries=>{mutations+=entries.length});observer.observe(w.document.body,{childList:true,subtree:true});
 try{w.eval(fs.readFileSync('c360-final-stabilization.js','utf8'));await delay(750);assert.ok(mutations<12,`${mutations} mutations on idle operations screen`)}finally{observer.disconnect();w.close()}
});
await test('Finance uses actual maintenance records and does not equate equal totals with reconciliation',async()=>{
 const dom=fixture('financeiro'),w=dom.window;const tables=[];
 w.rest=async table=>{tables.push(table);if(table==='v2_fuel_logs')return[{total_amount:100}];if(table==='v2_financial_entries')return[{entry_type:'expense',amount:100}];return[]};
 try{w.eval(fs.readFileSync('c360-final-stabilization.js','utf8'));await delay(200);assert.ok(tables.includes('v2_maintenance_plans'));assert.doesNotMatch(w.document.body.textContent,/✓ Custos operacionais conciliados/)}finally{w.close()}
});
await test('New field operation tolerates optional inputs removed during async loading',async()=>{
 const html=fs.readFileSync('index.html','utf8');
 const start=html.indexOf("if($('#newPoultryOp'))$('#newPoultryOp').addEventListener");
 const end=html.indexOf("if($('#closePoultryForm'))",start);
 const dom=fixture('operacoes','<button id="newPoultryOp"></button><div id="poultryForm" class="hidden"><input id="poStart"><input id="poEnd"><input id="poNotes"><span id="poMsg"></span><input id="poIntegratedName"></div>'),w=dom.window;
 let handler,energy=false;
 w.$=selector=>w.document.querySelector(selector);w.$('#newPoultryOp').addEventListener=(event,fn)=>{handler=fn};
 w.deviceMode=true;w.deviceAccess=null;w.poLocalInputDate=()=> '2026-09-24T12:00';
 w.loadDevicePoultryContext=async()=>{await Promise.resolve();w.$('#poIntegratedName').remove()};
 w.applyPoultryRoleUI=()=>{};w.setPoultryEnergy=()=>{energy=true};
 try{w.eval(html.slice(start,end));await handler();assert.equal(energy,true);assert.equal(w.$('#poultryForm').classList.contains('hidden'),false)}finally{w.close()}
});
console.log(`${checks} checks, ${failures} failures`);if(failures)process.exitCode=1;
