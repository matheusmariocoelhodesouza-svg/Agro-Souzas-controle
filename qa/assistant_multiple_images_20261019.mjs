import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.C360_PLAYWRIGHT_PATH||'playwright');
const source=await fs.readFile('c360-assistant360.js','utf8');
const shell=await fs.readFile('index.html','utf8'),boot=await fs.readFile('c360-quality-hotfix.js','utf8');
const shellHead=shell.slice(0,shell.indexOf('</head>'));
const inlineStyles=[...shellHead.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map(m=>m[1]);
const themeNames=['c360-ui-polish-legacy-20260915.css','c360-ui-polish-base.css','c360-ui-polish.css'];
for(const list of ['commonStyles','adminStyles','mobileAdminStyles']){
 const block=boot.match(new RegExp(`const ${list}=\\[([\\s\\S]*?)\\];`));
 for(const m of block[1].matchAll(/'\.\/([^']+\.css)'/g))themeNames.push(m[1]);
}
const productionTheme=inlineStyles.join('\n')+'\n'+(await Promise.all([...new Set(themeNames)].map(name=>fs.readFile(name,'utf8')))).join('\n');
const dir=await fs.mkdtemp(path.join(os.tmpdir(),'c360-multi-image-'));
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=','base64');
const paths=Array.from({length:11},(_,i)=>path.join(dir,`nota-${String(i+1).padStart(2,'0')}.png`));
await Promise.all(paths.map(file=>fs.writeFile(file,png)));
const bad=path.join(dir,'invalida.jpg'),textFile=path.join(dir,'programa.exe');
await fs.writeFile(bad,'not an image');await fs.writeFile(textFile,'not an image');
const browser=await chromium.launch({headless:true});
let passed=0;
async function test(name,run){await run();passed++;console.log('PASS '+name)}
async function fixture(run,viewport={width:412,height:915}){
 const context=await browser.newContext({viewport});
 const page=await context.newPage();
 await context.route('**/*',route=>route.abort());
 await page.setContent('<!doctype html><html><head><style>body{margin:0;font-family:Arial;background:#0b1929;color:#e2e8f0}.card{padding:16px;max-width:760px;margin:auto}.chatbox{border:1px solid #334155;padding:8px;box-sizing:border-box}.msg{margin:8px 0;padding:10px;white-space:pre-wrap;background:#152c44;overflow-wrap:anywhere}.toolbar{display:flex;gap:8px}.toolbar input{min-width:0;flex:1}button{padding:8px}input{padding:8px}</style></head><body><div id="screenHost"><section id="ia" data-screen="ia" class="section active"><div class="card"><h3>Comando IA</h3><div class="muted"></div><div id="chatbox" class="chatbox"></div><div class="toolbar"><input id="question"><button id="sendAI" class="btn primary">Enviar</button></div></div></section></div></body></html>');
 await page.evaluate(()=>{
  window.companyId='fixture-company';window.session=()=>({access_token:'synthetic-token',user:{id:'fixture-user'}});
  window.qa={uploads:[],analyses:[],toasts:[],actions:[],failUploadName:'',failAnalysis:false,holdAnalysis:false,release:null};
  window.showToast=message=>window.qa.toasts.push(message);
  window.authFetch=async(endpoint,options)=>{
   if(endpoint.startsWith('/storage/')){
    window.qa.uploads.push({name:options.body.name,endpoint});
    return new Response(JSON.stringify({message:'Falha sintética de upload'}),{status:options.body.name===window.qa.failUploadName?503:200});
   }
   const body=JSON.parse(options.body);
   if(body.mode==='health')return Response.json({status:'configured',configured:true});
   if(body.mode==='conversations')return Response.json({conversations:[]});
   if(body.mode==='history')return Response.json({messages:[]});
   window.qa.analyses.push(body);
   if(window.qa.holdAnalysis)await new Promise(resolve=>window.qa.release=resolve);
   return window.qa.failAnalysis?Response.json({message:'Falha sintética da IA'},{status:503}):Response.json({conversation_id:'fixture-conversation',answer:'Fotos analisadas em conjunto.',actions:window.qa.actions});
  };
 });
 await page.addScriptTag({content:source});
 async function choose(files,kind='gallery'){
  const chooser=page.waitForEvent('filechooser');await page.locator('.ai360-'+kind).click();
  const picker=await chooser;assert.equal(picker.isMultiple(),kind!=='camera');await picker.setFiles(files);
  await page.waitForFunction(()=>!document.getElementById('sendAI').disabled);
 }
 try{await run(page,choose)}finally{await context.close()}
}
try{
 await test('Gallery selects several photos, preserves earlier selections and removes one without dropping the rest',()=>fixture(async(page,choose)=>{
  await choose(paths.slice(0,3));assert.equal(await page.locator('.ai360-thumb-wrap').count(),3);
  await page.locator('.ai360-remove').nth(1).click();assert.equal(await page.locator('.ai360-thumb-wrap').count(),2);
  await choose([paths[3]]);assert.equal(await page.locator('.ai360-thumb-wrap').count(),3);
  await page.locator('#question').fill('Compare estas notas.');await page.locator('#sendAI').click();
  await page.waitForFunction(()=>window.qa.analyses.length===1&&!document.getElementById('sendAI').disabled);
  const result=await page.evaluate(()=>({body:window.qa.analyses[0],uploads:window.qa.uploads.length}));
  assert.equal(result.uploads,3);assert.deepEqual(result.body.images.map(i=>i.source_attachment.original_name),['nota-01.png','nota-03.png','nota-04.png']);
  assert(result.body.images.every(i=>i.image_data_url.startsWith('data:image/jpeg;base64,')));assert.equal(result.body.company_id,'fixture-company');
  assert.equal(result.body.source_attachment,undefined);assert.equal(result.body.image_data_url,undefined);
  assert.equal(await page.locator('.ai360-message-images img').count(),3);assert.equal(await page.locator('.ai360-thumb-wrap').count(),0);
 }));
 await test('Camera adds a single photo while switching back to gallery restores multiple selection',()=>fixture(async(page,choose)=>{
  await choose([paths[0]]);await choose([paths[1]],'camera');assert.equal(await page.locator('.ai360-thumb-wrap').count(),2);
  assert.equal(await page.locator('.ai360-file-input').getAttribute('capture'),'environment');
  await choose(paths.slice(2,4));assert.equal(await page.locator('.ai360-thumb-wrap').count(),4);assert.equal(await page.locator('.ai360-file-input').getAttribute('capture'),null);
 }));
 await test('Repeated files are not duplicated and clearing the batch removes every preview',()=>fixture(async(page,choose)=>{
  await choose(paths.slice(0,2));await choose([paths[0]]);assert.equal(await page.locator('.ai360-thumb-wrap').count(),2);
  await page.locator('.ai360-clear').click();assert.equal(await page.locator('.ai360-thumb-wrap').count(),0);
  await page.locator('#sendAI').click();assert.equal(await page.evaluate(()=>window.qa.analyses.length),0);
 }));
 await test('Ten previews fit on a phone and extra or invalid files preserve the existing selection',()=>fixture(async(page,choose)=>{
  await choose(paths.slice(0,10));assert.equal(await page.locator('.ai360-thumb-wrap').count(),10);
  await choose([paths[10]]);assert.equal(await page.locator('.ai360-thumb-wrap').count(),10);
  assert.match(await page.evaluate(()=>window.qa.toasts.at(-1)),/até 10/);
  const width=await page.evaluate(()=>({page:document.documentElement.scrollWidth,viewport:innerWidth,list:document.querySelector('.ai360-attachment-list').getBoundingClientRect().height}));
  assert(width.page<=width.viewport);assert(width.list<=281);
  await fs.mkdir('qa-artifacts',{recursive:true});await page.screenshot({path:'qa-artifacts/assistant-multiple-images-mobile.png',fullPage:true});
  await page.locator('.ai360-clear').click();await choose([paths[0]]);await choose([textFile]);assert.equal(await page.locator('.ai360-thumb-wrap').count(),1);
  await choose([paths[1],bad]);assert.equal(await page.locator('.ai360-thumb-wrap').count(),1);
 },{width:360,height:800}));
 await test('A partial archive failure keeps the prompt and photos and retries only the unfinished original',()=>fixture(async(page,choose)=>{
  await choose(paths.slice(0,2));await page.evaluate(()=>window.qa.failUploadName='nota-02.png');
  await page.locator('#question').fill('Confira estas duas notas.');await page.locator('#sendAI').click();
  await page.waitForFunction(()=>window.qa.uploads.length===2&&!document.getElementById('sendAI').disabled);
  assert.equal(await page.locator('#question').inputValue(),'Confira estas duas notas.');assert.equal(await page.locator('.ai360-thumb-wrap').count(),2);assert.equal(await page.evaluate(()=>window.qa.analyses.length),0);
  await page.evaluate(()=>window.qa.failUploadName='');await page.locator('#sendAI').click();
  await page.waitForFunction(()=>window.qa.analyses.length===1&&!document.getElementById('sendAI').disabled);
  assert.deepEqual(await page.evaluate(()=>window.qa.uploads.map(u=>u.name)),['nota-01.png','nota-02.png','nota-02.png']);
 }));
 await test('A failed analysis preserves all photos, prevents changes in flight and reuses their archived originals',()=>fixture(async(page,choose)=>{
  await choose(paths.slice(0,2));await page.evaluate(()=>{window.qa.failAnalysis=true;window.qa.holdAnalysis=true});
  await page.locator('#question').fill('Analise as fotos juntas.');await page.locator('#sendAI').click();
  await page.waitForFunction(()=>typeof window.qa.release==='function');
  assert(await page.locator('.ai360-gallery').isDisabled());assert(await page.locator('.ai360-remove').first().isDisabled());assert(await page.locator('.ai360-clear').isDisabled());
  await page.evaluate(()=>{window.qa.holdAnalysis=false;window.qa.release()});await page.waitForFunction(()=>!document.getElementById('sendAI').disabled);
  assert.equal(await page.locator('#question').inputValue(),'Analise as fotos juntas.');assert.equal(await page.locator('.ai360-thumb-wrap').count(),2);
  await page.evaluate(()=>window.qa.failAnalysis=false);await page.locator('#sendAI').click();await page.waitForFunction(()=>window.qa.analyses.length===2&&!document.getElementById('sendAI').disabled);
  assert.equal(await page.evaluate(()=>window.qa.uploads.length),2);assert.equal(await page.locator('.ai360-thumb-wrap').count(),0);
 }));
 await test('A company switch during archival cannot send foreign attachments to the AI',()=>fixture(async(page,choose)=>{
  await choose(paths.slice(0,2));await page.evaluate(()=>{
   const previous=window.authFetch;
   window.authFetch=async(endpoint,options)=>{const r=await previous(endpoint,options);if(endpoint.startsWith('/storage/'))window.companyId='different-company';return r};
  });
  await page.locator('#question').fill('Leia as fotos.');await page.locator('#sendAI').click();await page.waitForFunction(()=>!document.getElementById('sendAI').disabled);
  assert.equal(await page.evaluate(()=>window.qa.analyses.length),0);assert.equal(await page.evaluate(()=>window.qa.uploads.length),1);
 }));
 await test('The same gallery workflow works on a desktop',()=>fixture(async(page,choose)=>{
  await choose(paths.slice(0,2));assert.equal(await page.locator('.ai360-thumb-wrap').count(),2);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await fs.mkdir('qa-artifacts',{recursive:true});await page.screenshot({path:'qa-artifacts/assistant-multiple-images-desktop.png',fullPage:true});
 },{width:1280,height:900}));
 await test('Review cards remain legible with the actual app themes on phone and desktop',async()=>{
  for(const width of [390,1280])for(const theme of ['light','dark-body','dark-html'])await fixture(async page=>{
   await page.addStyleTag({content:productionTheme});
   await page.evaluate(mode=>{
    document.body.className='app-ready c360-product-ready'+(mode==='dark-body'?' darkmode':'');
    document.documentElement.classList.toggle('darkmode',mode==='dark-html');
    window.qa.actions=[{id:'synthetic-action',action_type:'poultry_schedule',summary:'Apanha em 20/10 para José Célio — Porangaba, início 10:30.',confidence:.88,missing_fields:[],payload:{team_name:'Equipe de teste',farm_name:'José Célio',producer:'José Célio',city:'Porangaba',scheduled_start:'2026-10-20T10:30:00-03:00',planned_birds:22066}}];
   },theme);
   await page.locator('#question').fill('Confira a programação.');await page.locator('#sendAI').click();await page.locator('.ai360-action-card').waitFor();
   async function checkContrast(){
    const samples=await page.evaluate(()=>{
     const rgb=value=>{const m=value.match(/[\d.]+/g);return m?m.map(Number):[0,0,0,0]};
     const luminance=color=>rgb(color).slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
     return [...document.querySelectorAll('.ai360-action-head strong,.ai360-review-grid b,.ai360-review-grid span,.ai360-action-kind,.ai360-confidence,.ai360-ready,.ai360-missing,.ai360-saved')].map(el=>{
      const style=getComputedStyle(el);let parent=el,bg='';
      while(parent){const color=getComputedStyle(parent).backgroundColor,c=rgb(color);if(c.length===3||c[3]>0){bg=color;break}parent=parent.parentElement}
      const text=style.webkitTextFillColor||style.color,fore=luminance(text),back=luminance(bg);
      return {text:el.textContent,ratio:(Math.max(fore,back)+.05)/(Math.min(fore,back)+.05),color:text,background:bg,opacity:style.opacity};
     });
    });
    assert(samples.length>8);for(const s of samples){assert(s.ratio>=4.5,`${theme} ${width}px ${s.text}: contrast ${s.ratio.toFixed(2)} (${s.color} on ${s.background})`);assert.equal(s.opacity,'1')}
   }
   await checkContrast();
   await fs.mkdir('qa-artifacts',{recursive:true});await page.locator('.ai360-action-card').screenshot({path:`qa-artifacts/assistant-review-${theme}-${width}.png`});
   await page.locator('.ai360-confirm').click();await page.locator('.ai360-action-card.saved').waitFor();await checkContrast();
   await page.evaluate(()=>window.qa.actions[0].missing_fields=['granja/produtor']);await page.locator('#question').fill('Revise os dados.');await page.locator('#sendAI').click();await page.locator('.ai360-action-card .ai360-missing').waitFor();
   await checkContrast();assert(await page.locator('.ai360-confirm').isDisabled());
  },{width,height:915});
 });
 console.log(`${passed} multi-image and review browser regressions passed.`);
}finally{await browser.close();await fs.rm(dir,{recursive:true,force:true})}

