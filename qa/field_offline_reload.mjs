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
  const c=await caches.open('comando360-v7-02-hotfix66');
  return {keys:(await c.keys()).map(r=>new URL(r.url).pathname)};
 });
 for(const name of ['c360-field-fax.js','c360-assistant360.js','c360-employee-photo.js','c360-fuel-type.js'])assert(cached.keys.some(x=>x.endsWith('/'+name)),name+' must be prepared for offline');
 await context.setOffline(true);
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__c360Bootstrap?.ready!==undefined,{timeout:15000});
 const status=await page.evaluate(()=>({boot:window.__c360Bootstrap,fieldFax:!!window.C360FieldFax}));
 assert.equal(status.boot.ready,true,JSON.stringify(status.boot.errors));assert.equal(status.fieldFax,true);assert.equal(errors.length,0,errors.join('\n'));
 console.log('PASS Offline cold reload loads the full runtime and FAX with versioned resource URLs');
}finally{await context.close();await browser.close()}
