import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const base=process.env.C360_BASE_URL||'http://127.0.0.1:8080';
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
const page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
await page.route('https://cdn.jsdelivr.net/**',r=>r.fulfill({status:200,contentType:'application/javascript',body:'/* QA isolates optional CDN libraries. */'}));
await page.route('https://*.supabase.co/**',r=>r.fulfill({status:200,contentType:'application/json',body:'[]'}));
try{
 await page.goto(base+'/?qa_offline_reload=1',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__c360Bootstrap?.ready===true);
 await page.waitForFunction(()=>!!navigator.serviceWorker.controller,{timeout:30000});
 const cached=await page.evaluate(async()=>{
  const status=await new Promise((resolve,reject)=>{
   const channel=new MessageChannel(),timer=setTimeout(()=>reject(Error('Service worker status timeout')),5000);
   channel.port1.onmessage=e=>{clearTimeout(timer);channel.port1.close();resolve(e.data)};
   navigator.serviceWorker.controller.postMessage({type:'C360_STATUS'},[channel.port2]);
  });
  assertReady(status);
  const c=await caches.open(status.current);
  return {status,keys:(await c.keys()).map(r=>new URL(r.url).pathname)};
  function assertReady(status){if(!status?.ok||!status.current)throw Error('No active offline release')}
 });
 for(const name of ['c360-field-fax.js','c360-assistant360.js','c360-employee-photo.js','c360-fuel-type.js','c360-report-share.js','vendor/jspdf/jspdf.umd.min.js'])assert(cached.keys.some(x=>x.endsWith('/'+name)),name+' must be prepared for offline');
 await context.setOffline(true);
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__c360Bootstrap?.ready!==undefined,{timeout:15000});
 const status=await page.evaluate(()=>({boot:window.__c360Bootstrap,fieldFax:!!window.C360FieldFax}));
 assert.equal(status.boot.ready,true,JSON.stringify(status.boot.errors));assert.equal(status.fieldFax,true);assert.equal(errors.length,0,errors.join('\n'));
 await page.evaluate(()=>window.c360LoadScreenFeatures('equipereport'));
 const pdf=await page.evaluate(async()=>{
  const file=await window.C360ReportShare.createPdfFile({op:{operation_number:25,scheduled_start:'2026-10-03T06:00:00-03:00'},team:{name:'Equipe QA'},farm:{farm_name:'Granja QA'},supervisor:{name:'QA'},trucks:[],totalBirds:27400});
  return {type:file.type,size:file.size,header:await file.slice(0,5).text()};
 });
 assert.equal(pdf.type,'application/pdf');assert(pdf.size>1000);assert.equal(pdf.header,'%PDF-');
 console.log('PASS Offline cold reload loads the full runtime, FAX and generates a PDF with versioned resource URLs');
}finally{await context.close();await browser.close()}
