import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const base=process.env.C360_BASE_URL||'http://127.0.0.1:8080';
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block',acceptDownloads:true,timezoneId:'UTC'});
const page=await context.newPage(),errors=[],dialogs=[];
let failPdf=true;
await page.route('https://cdn.jsdelivr.net/**',r=>r.fulfill({status:200,contentType:'application/javascript',body:'/* QA isolates optional CDN libraries. */'}));
await page.route('https://*.supabase.co/**',r=>r.fulfill({status:200,contentType:'application/json',body:'[]'}));
await page.route('**/vendor/jspdf/jspdf.umd.min.js',r=>failPdf?r.fulfill({status:503,body:'temporary PDF failure'}):r.continue());
page.on('pageerror',e=>errors.push(e.message));
page.on('dialog',async d=>{dialogs.push(d.message());await d.dismiss()});
try{
 await page.goto(base+'/?qa_report_share=1',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__c360Bootstrap?.ready===true);
 await page.evaluate(async()=>{
  document.getElementById('login').classList.add('hidden');document.getElementById('app').classList.remove('hidden');
  initScreenRouter();
  // O roteador mantém telas inativas fora do DOM. O módulo é carregado na rota.
  const screen=v2ScreenStore.equipereport;document.getElementById('screenHost').appendChild(screen);screen.hidden=false;screen.classList.remove('hidden');screen.classList.add('active');
  await window.c360LoadScreenFeatures('equipereport');
  teamCatchReports=[{op:{operation_number:25,scheduled_start:'2026-10-04T01:30:00Z'},farm:{farm_name:'Granja QA',producer_name:'Produtor QA',city:'Laranjal Paulista'},team:{name:'Equipe QA'},supervisor:{name:'Encarregado QA',phone:''},trucks:[{truck_sequence:1,driver_name:'Motorista QA',truck_plate:'QAQ1A23',birds:6000,metadata:{boxes_count:750,birds_per_box:8}}],totalBirds:6000,catas:0,actualStart:'2026-10-04T01:30:00Z',actualEnd:'2026-10-04T02:30:00Z'}];
  document.getElementById('teamReportToday').innerHTML='<div class="toolbar"><button class="btn catchReportPrint" data-index="0">IMPRIMIR 80 MM</button><button class="btn catchReportA4" data-index="0">PDF / IMPRESSÃO A4</button></div>';
  window.__reportMutations=0;new MutationObserver(()=>window.__reportMutations++).observe(document.getElementById('teamReportToday'),{childList:true,subtree:true});
 });
 await page.waitForFunction(()=>document.querySelector('.catchReportDownload')&&document.querySelector('.catchReportWhatsApp'));
 await page.waitForTimeout(200);
 assert.equal(await page.locator('.catchReportA4').innerText(),'PDF / IMPRESSÃO A4');
 assert.equal(await page.locator('.catchReportPrint').count(),1);
 assert.equal(await page.locator('iframe[aria-hidden="true"]').count(),0,'opening reports must not start printing');
 assert(await page.evaluate(()=>window.__reportMutations<5),'report button decoration must settle without a mutation loop');
 console.log('PASS Field report route loads download/share actions without replacing A4 or automatically printing');

 await page.locator('.catchReportDownload').click();
 await page.waitForFunction(()=>!document.querySelector('.catchReportDownload').disabled);
 assert(dialogs.some(x=>/gerador de PDF/.test(x)),'failed PDF load must show a recoverable error');
 assert.equal(await page.locator('.catchReportDownload').innerText(),'📥 BAIXAR PDF');
 failPdf=false;
 const downloaded=page.waitForEvent('download');await page.locator('.catchReportDownload').click();const download=await downloaded;
 const data=await fs.readFile(await download.path());assert.equal(data.subarray(0,5).toString(),'%PDF-');assert(data.length>1000);
 assert.match(download.suggestedFilename(),/03-10-2026\.pdf$/,'PDF dates follow São Paulo even if the browser uses UTC');
 await page.waitForFunction(()=>!document.querySelector('.catchReportDownload').disabled);
 console.log('PASS PDF download succeeds after a library failure and restores the action button');

 await page.evaluate(()=>{Object.defineProperty(navigator,'share',{configurable:true,value:async()=>{throw new DOMException('Share unavailable','NotAllowedError')}});Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>true})});
 const fallback=page.waitForEvent('download');await page.locator('.catchReportWhatsApp').click();const sharedFallback=await fallback;
 assert.equal((await fs.readFile(await sharedFallback.path())).subarray(0,5).toString(),'%PDF-');
 assert(new URL(page.url()).origin===new URL(base).origin,'unsupported sharing must not leave the report');
 await page.waitForFunction(()=>!document.querySelector('.catchReportWhatsApp').disabled);
 console.log('PASS Unsupported file sharing downloads the actual PDF and keeps the report open');

 let extraDownloads=0;page.on('download',()=>extraDownloads++);
 await page.evaluate(()=>Object.defineProperty(navigator,'share',{configurable:true,value:async()=>{throw new DOMException('User cancelled','AbortError')}}));
 await page.locator('.catchReportWhatsApp').click();await page.waitForFunction(()=>!document.querySelector('.catchReportWhatsApp').disabled);
 assert.equal(extraDownloads,0,'cancelled sharing must not force a download');
 assert.equal(await page.locator('.catchReportDownload').count(),1);assert.equal(await page.locator('.catchReportWhatsApp').count(),1);
 await page.evaluate(()=>{
  window.__qaPrints=[];
  new MutationObserver(records=>{
   for(const record of records)for(const node of record.addedNodes)if(node.tagName==='IFRAME'&&node.getAttribute('aria-hidden')==='true'){
    node.contentWindow.print=()=>{window.__qaPrints.push({text:node.contentDocument.body.innerText,css:node.contentDocument.querySelector('style')?.textContent||''});node.contentWindow.dispatchEvent(new Event('afterprint'))};
   }
  }).observe(document.body,{childList:true});
 });
 await page.locator('.catchReportA4').click();await page.waitForFunction(()=>window.__qaPrints.length===1);
 const a4=await page.evaluate(()=>window.__qaPrints[0]);assert.match(a4.css,/size:A4 portrait/);assert.match(a4.text,/6\.000 AVES/);
 await page.waitForTimeout(1600);await page.locator('.catchReportPrint').click();await page.waitForFunction(()=>window.__qaPrints.length===2);
 const thermal=await page.evaluate(()=>window.__qaPrints[1]);assert.match(thermal.css,/size:80mm auto/);assert.doesNotMatch(thermal.css,/size:A4 portrait/);assert.match(thermal.text,/6\.000 AVES/);
 console.log('PASS Trusted A4 and 80 mm actions prepare separate print documents with the correct bird total');
 assert.equal(errors.length,0,errors.join('\n'));
 await fs.mkdir('qa-artifacts-r100',{recursive:true});await page.screenshot({path:'qa-artifacts-r100/report-actions.png',fullPage:true});
 console.log('PASS Cancelling sharing restores controls without duplicated actions or unhandled browser errors');
}finally{await context.close();await browser.close()}
