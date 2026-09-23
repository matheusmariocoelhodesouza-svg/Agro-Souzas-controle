import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const html=fs.readFileSync('index.html','utf8');
function source(name){
 const re=new RegExp('(?:async )?function '+name+'\\('),match=re.exec(html);
 assert.ok(match,`Missing ${name}`);
 for(let end=html.indexOf('}',match.index);end>=0;end=html.indexOf('}',end+1)){
  const text=html.slice(match.index,end+1);
  try{new vm.Script('('+text+')');return text}catch{}
 }
 throw Error(`Incomplete ${name}`);
}
let passed=0;
function test(name,fn){fn();passed++;console.log('PASS',name)}
const context=vm.createContext({console,Date,Number,Blob,setTimeout});
for(const name of ['fuelPlausibleKmL','fuelInterval','isTrailerVehicle','maintenanceStatus','csvCell'])vm.runInContext(source(name),context);
const fuel=(km,liters,date)=>({odometer_km:km,liters,fueled_at:date});
const old=fuel(2831,30,'2026-09-14T12:00:00Z');
test('Observed 8,433 km/L cannot enter valid mileage',()=>{
 const result=context.fuelInterval(fuel(365598,43.01,'2026-09-16T12:00:00Z'),old);
 assert.equal(result.review,true);assert.equal(result.km,0);assert.equal(result.rate,0);
});
test('Normal chronological interval retained',()=>{
 const result=context.fuelInterval(fuel(3231,80,'2026-09-16T12:00:00Z'),old);
 assert.equal(result.review,false);assert.equal(result.km,400);assert.equal(result.rate,5);
});
test('Decreasing, impossible speed and zero-time odometers flagged',()=>{
 for(const row of [fuel(100,30,'2026-09-16T12:00:00Z'),fuel(3331,100,'2026-09-14T13:00:00Z'),fuel(3000,40,old.fueled_at)])assert.equal(context.fuelInterval(row,old).review,true);
});
test('No invented interval for missing odometer',()=>assert.equal(context.fuelInterval(fuel(null,40,'2026-09-16'),old).km,0));
test('Carretinha excluded but Sprinter kept',()=>{assert.equal(context.isTrailerVehicle({description:'Carretinha 02'}),true);assert.equal(context.isTrailerVehicle({model:'Sprinter 415'}),false)});
test('Unscheduled service is not reported as preventive up to date',()=>assert.equal(context.maintenanceStatus({},{} )[0],'Sem programação'));
test('Scheduled overdue maintenance stays overdue',()=>assert.equal(context.maintenanceStatus({next_due_odometer_km:1000},{current_odometer_km:1100})[0],'Vencida'));
test('CSV preserves escaping, numbers and blocks spreadsheet formulas',()=>{
 assert.equal(context.csvCell('São "João";Equipe'),'"São ""João"";Equipe"');
 assert.equal(context.csvCell('=HYPERLINK("url")'),'"\'=HYPERLINK(""url"")"');
 assert.equal(context.csvCell(-10),'"-10"');assert.equal(context.csvCell(null),'""');
});
let clicked=0,removed=0,revoked=0,anchor,downloadBlob;
Object.assign(context,{
 URL:{createObjectURL(blob){downloadBlob=blob;return 'blob:test'},revokeObjectURL(url){assert.equal(url,'blob:test');revoked++}},
 document:{createElement(){anchor={style:{},click(){clicked++},remove(){removed++}};return anchor},body:{appendChild(){}}},
 setTimeout(fn){fn()},
 adminReportCache:{month:'2026-09',label:'Setembro',company:'São João',birds:100,revenue:21,cost:3,result:18,loadings:1,trucks:1,byTeam:[{name:'=1+1',birds:100}],byCustomer:[],fuels:[]},
 alert(message){throw Error(message)}
});
vm.runInContext(source('downloadText')+'\n'+source('exportAdminReportsCsv'),context);
context.exportAdminReportsCsv();
const csv=await downloadBlob.text();
test('Real report export produces CSV download and releases URL',()=>{
 assert.equal(clicked,1);assert.equal(removed,1);assert.equal(revoked,1);assert.equal(anchor.download,'Comando_360_Relatorio_2026-09.csv');
 assert.match(csv,/São João/);assert.match(csv,/'=1\+1/);assert.equal(downloadBlob.type,'text/csv;charset=utf-8');
});
const nodes=new Map();
for(const id of ['fuelVehicle','kmVehicle','fuelKpis','fuelList','fuelScreenTitle','fuelScreenSubtitle','fuelHistorySubtitle','newKmBtn','kmEditCard'])nodes.set(id,{value:'',innerHTML:'',style:{}});
Object.assign(context,{
 document:{getElementById(id){return nodes.get(id)}},deviceMode:false,companyId:'fixture-company',fuelCache:[],fuelVehicles:[],
 money:n=>'R$ '+Number(n).toFixed(2),esc:s=>String(s??''),fuelLogIsFull:()=>false,
 async rest(table){return table==='v2_vehicles'?[{id:'v',description:'Sprinter',status:'active'},{id:'t',description:'Carretinha 02',status:'active'}]:[{...fuel(365598,43.01,'2026-09-16T12:00:00Z'),id:'new',vehicle_id:'v'},{...old,id:'old',vehicle_id:'v'}]}
});
vm.runInContext(source('loadFuel'),context);await context.loadFuel();
test('Fuel screen uses warning and excludes anomalous KPI and trailer choice',()=>{
 assert.match(nodes.get('fuelList').innerHTML,/Revisar hodômetro/);assert.doesNotMatch(nodes.get('fuelList').innerHTML,/8433/);
 assert.doesNotMatch(nodes.get('fuelVehicle').innerHTML,/Carretinha/);assert.match(nodes.get('fuelKpis').innerHTML,/0 km/);
});
for(const file of fs.readdirSync('.').filter(x=>x.endsWith('.js')))new vm.Script(fs.readFileSync(file,'utf8'),{filename:file});
for(const file of fs.readdirSync('.').filter(x=>x.endsWith('.html'))){
 const text=fs.readFileSync(file,'utf8');
 for(const match of text.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
  if(/\bsrc\s*=/.test(match[1])||/type=['"]application\//.test(match[1]))continue;
  new vm.Script(match[2],{filename:file});
 }
}


const employeeNodes=new Map(['employeesList','faceEmployee','scheduleEmployee','monthlyEmployee','monthlyMonth','faceEnrollmentList'].map(id=>[id,{innerHTML:'',value:''}]));
Object.assign(context,{
 $:selector=>employeeNodes.get(selector.slice(1)),window:{},hydrateEmployeePhotos(){},localDateBR:()=> '2026-09-23',
 async rest(table){return table==='v2_employees'?[{id:'active',full_name:'João',employee_number:1,status:'active'},{id:'archived',full_name:'Maria',employee_number:2,status:'archived'}]:[]}
});
vm.runInContext(source('loadEmployees'),context);await context.loadEmployees();
test('Monthly attendance includes archived history and initializes month',()=>{
 assert.match(employeeNodes.get('monthlyEmployee').innerHTML,/Maria.*Arquivado/);
 assert.doesNotMatch(employeeNodes.get('faceEmployee').innerHTML,/Maria/);
 assert.equal(employeeNodes.get('monthlyMonth').value,'2026-09');
});
let finishSave,calls=0;
Object.assign(context,{$:()=>({disabled:false}),saveTruckLoadImpl:()=>{calls++;return new Promise(resolve=>{finishSave=resolve})}});
vm.runInContext('let truckSavePending=false;'+source('saveTruckLoad'),context);
const firstSave=context.saveTruckLoad();await context.saveTruckLoad();finishSave();await firstSave;
test('Two simultaneous truck saves produce one write',()=>assert.equal(calls,1));
const nextSave=context.saveTruckLoad();finishSave();await nextSave;
test('Successful truck save unlocks next truck',()=>assert.equal(calls,2));
context.saveTruckLoadImpl=async()=>{throw Error('network')};
await assert.rejects(context.saveTruckLoad(),/network/);
context.saveTruckLoadImpl=async()=>{calls++};await context.saveTruckLoad();
test('Failed truck save unlocks retry',()=>assert.equal(calls,3));
console.log(`${passed} regression checks passed; all JS and inline scripts parse.`);
