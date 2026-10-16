import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const html=fs.readFileSync('index.html','utf8');
function source(name){
 const m=new RegExp('(?:async )?function '+name+'\\(').exec(html);assert.ok(m,'Missing '+name);
 for(let end=html.indexOf('}',m.index);end>=0;end=html.indexOf('}',end+1)){
  const s=html.slice(m.index,end+1);try{new vm.Script('('+s+')');return s}catch{}
 }throw Error('Incomplete '+name);
}
const nodes=new Map();
for(const id of ['fuelList','fuelKpis','fuelHistorySubtitle','fuelScreenTitle','fuelScreenSubtitle','newKmBtn','kmEditCard','fuelVehicle','kmVehicle','reportsFuel'])nodes.set(id,{value:'',innerHTML:'',textContent:'',style:{}});
const unknown={id:'unknown',vehicle_id:'v',fueled_at:'2026-10-03T15:00:00Z',liters:50,total_amount:0,odometer_km:null,station_name:'Galão',metadata:{cost_unknown:true}};
const known={id:'known',vehicle_id:'v',fueled_at:'2026-10-16T15:00:00Z',liters:100,total_amount:665,odometer_km:1000,station_name:'Posto',metadata:{}};
const rows=[known,unknown],money=n=>'R$ '+Number(n).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
const c=vm.createContext({console,Date,Number,Map,Set,JSON,money,poN:n=>Number(n)||0,esc:s=>String(s??''),
 document:{getElementById:id=>nodes.get(id)},$:s=>nodes.get(s.slice(1)),deviceMode:false,companyId:'qa',fuelCache:[],fuelVehicles:[],
 localDateBR:()=> '2026-10-16',fuelInterval:()=>({km:100,rate:2,review:false}),fuelLogIsFull:()=>false,
 rest:async table=>table==='v2_fuel_logs'?rows:[{id:'v',description:'Ônibus QA',plate:'QA00001',status:'active'}],
 alert:message=>{throw Error(message)},fmtMinutes:()=> '0h00',setTimeout:()=>{}
});
c.restAll=(...args)=>c.rest(...args);
c.fuelRenderLimit=100;vm.runInContext(source('renderFuelHistory'),c);
for(const n of ['fuelCostKnown','fuelCostSummary','fuelCostNotice','saoPauloDateKey','isTrailerVehicle','loadFuel','renderFuelReportByVehicle','reportResultNotice','csvCell','exportAdminReportsCsv','printAdminReports'])vm.runInContext(source(n),c);
let passed=0;
async function test(name,fn){await fn();passed++;console.log('PASS '+name)}
await test('Unknown, malformed and negative cost never become a known zero',()=>{
 for(const value of [null,undefined,'',' ',false,[],{},'NaN',-1])assert.equal(c.fuelCostKnown({total_amount:value}),false);
 assert.equal(c.fuelCostKnown(unknown),false);assert.equal(c.fuelCostKnown({...known,metadata:{cost_unknown:'true'}}),false);
});
await test('A genuine zero remains a known amount and missing litres are not free fuel',()=>{
 assert.equal(c.fuelCostKnown({total_amount:0}),true);assert.equal(c.fuelCostKnown({total_amount:'0.00'}),true);
 const s=c.fuelCostSummary(rows);assert.equal(s.liters,150);assert.equal(s.knownLiters,100);assert.equal(s.cost,665);assert.equal(s.cost/s.knownLiters,6.65);assert.equal(s.unknownCount,1);
});
await test('Live fuel renderer labels incomplete cost and mileage and computes known-only average',async()=>{
 await c.loadFuel();
 assert.match(nodes.get('fuelKpis').innerHTML,/6,65\/L/);assert.match(nodes.get('fuelKpis').innerHTML,/parcial/);
 assert.match(nodes.get('fuelHistorySubtitle').textContent,/1 abastecimento\(s\).*50 L/);
 const missing=nodes.get('fuelList').innerHTML.split('<div class="item">').find(x=>x.includes('Galão'));
 assert.match(missing,/Custo não informado/);assert.match(missing,/KM não informado/);assert.doesNotMatch(missing,/R\$ 0,00/);
});
const group={vehicle_id:'v',name:'Ônibus QA',plate:'QA00001',liters:150,cost:665,logs:2,entries:rows};
await test('Fuel report renderer keeps all litres but excludes unknown cost from the price denominator',()=>{
 c.renderFuelReportByVehicle([group]);const out=nodes.get('reportsFuel').innerHTML;
 assert.match(out,/150 L/);assert.match(out,/6,65/);assert.match(out,/CUSTO INFORMADO \(PARCIAL\)/);assert.match(out,/Custo não informado/);assert.doesNotMatch(out,/4,43/);
});
c.adminReportCache={month:'2026-10',label:'Outubro',company:'Empresa QA',birds:1,revenue:100,cost:10,result:90,loadings:1,trucks:1,avgTruck:1,byTeam:[],byCustomer:[],fuels:[group],attendance:{}};
await test('CSV exports unknown costs as empty numeric cells with a pending flag',()=>{
 let out;c.downloadText=(name,text)=>{out=text};c.exportAdminReportsCsv();
 assert.match(out,/Custo informado \(parcial\)/);assert.match(out,/'Média informada R\$\/L'|Média informada R\$\/L/);
 const missing=out.split('\n').find(line=>line.includes('Galão'));assert.match(missing,/;"50";"";"";"Não"$/);assert.doesNotMatch(missing,/;"0"/);
 assert.match(out,/"6.65"/);
});
await test('Print/PDF HTML retains incomplete-cost warning and known-only average',()=>{
 let out='';c.window={open:()=>({document:{write:text=>out+=text,close(){}},focus(){},print(){}})};c.printAdminReports();
 assert.match(out,/Custo informado \(parcial\)/);assert.match(out,/6,65\/L/);assert.match(out,/Custo não informado/);assert.match(out,/1 abastecimento\(s\)/);
});
console.log(`${passed} fuel cost audit regressions passed.`);
