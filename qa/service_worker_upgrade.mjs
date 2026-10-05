import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';

const loader=await fs.readFile('sw-v7-02.js','utf8');
const corePath=loader.match(/importScripts\(['"]\.\/(sw-v7-02-core-[^'"]+)['"]\)/)[1];
const core=await fs.readFile(corePath,'utf8'),current=core.match(/const CACHE='([^']+)'/)[1];
const failedVersion='comando360-v7-02-stable999';
let broken=false;
// O navegador não intercepta importScripts do worker com page.route.
// Este servidor isola a atualização defeituosa sem alterar arquivos do projeto.
const root=process.cwd(),server=http.createServer(async(req,res)=>{
 const pathname=new URL(req.url,'http://localhost').pathname;
 const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
 try{
  let body=await fs.readFile(file);
  if(broken&&pathname==='/'+corePath)body=Buffer.from(core.replace(current,failedVersion).replace('const CORE=[',"const CORE=['./__missing_core_qa__.js',"));
  const types={'.js':'application/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(body);
 }catch{res.writeHead(404).end('QA missing resource')}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true}),context=await browser.newContext();
const page=await context.newPage();
await page.route('https://cdn.jsdelivr.net/**',r=>r.fulfill({status:200,contentType:'application/javascript',body:'/* Optional libraries isolated by QA. */'}));
await page.route('https://*.supabase.co/**',r=>r.fulfill({status:200,contentType:'application/json',body:'[]'}));
try{
 await page.goto(base+'/qa/report_stability_fixture.html',{waitUntil:'domcontentloaded'});
 await page.evaluate(async()=>{
  for(const [name,marker] of [['comando360-v7-02-hotfix69','old-hotfix'],['comando360-v7-02-stable71','previous-stable'],['oficina360-v1','other-app']]){
   const cache=await caches.open(name);await cache.put(new URL('../index.html',location.href).href,new Response(marker,{headers:{'Content-Type':'text/html'}}));
  }
 });
 await page.goto(base+'/?qa_sw_upgrade=1',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>!!navigator.serviceWorker.controller,{timeout:30000});
 const status=await page.evaluate(async()=>{
  const channel=new MessageChannel();const state=await new Promise(resolve=>{channel.port1.onmessage=e=>resolve(e.data);navigator.serviceWorker.controller.postMessage({type:'C360_STATUS'},[channel.port2])});channel.port1.close();
  const stable=await caches.open(state.stable),previous=await stable.match(new URL('./index.html',location.href).href);return {...state,keys:await caches.keys(),stableKeys:(await stable.keys()).map(r=>r.url),previousShell:previous?await previous.text():null};
 });
 assert.equal(status.current,current);assert.equal(status.stable_from,'comando360-v7-02-stable71');assert.equal(status.previousShell,'previous-stable');
 assert(status.keys.includes('oficina360-v1'));assert(!status.keys.includes('comando360-v7-02-stable71'));assert(!status.keys.includes('comando360-v7-02-hotfix69'));
 console.log('PASS Upgrade preserves the previous stable generation and cleans only obsolete Comando release caches');

 broken=true;
 const rejected=await page.evaluate(async()=>{
  const reg=await navigator.serviceWorker.register('./sw-v7-02.js?qa_failed_upgrade=1',{updateViaCache:'none'});
  const installing=reg.installing;if(!installing)throw Error('No upgrade candidate');
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Candidate installation timeout')),15000);const check=()=>{if(installing.state==='redundant'){clearTimeout(timer);resolve()}else if(installing.state==='activated'){clearTimeout(timer);reject(Error('Incomplete core was activated'))}};installing.addEventListener('statechange',check);check()});
  const channel=new MessageChannel();const state=await new Promise(resolve=>{channel.port1.onmessage=e=>resolve(e.data);navigator.serviceWorker.controller.postMessage({type:'C360_STATUS'},[channel.port2])});channel.port1.close();
  return {state,keys:await caches.keys()};
 });
 assert.equal(rejected.state.current,current);assert(!rejected.keys.includes(failedVersion));
 await context.setOffline(true);
 const offline=await page.evaluate(async()=>{const r=await fetch('./c360-field-fax.js?v=qa-upgrade');return {ok:r.ok,text:await r.text()}});
 assert(offline.ok);assert(offline.text.includes('C360FieldFax'));
 console.log('PASS An incomplete update is rejected without replacing the active worker or damaging its offline FAX');
}finally{await context.close();await browser.close();await new Promise(resolve=>server.close(resolve))}
