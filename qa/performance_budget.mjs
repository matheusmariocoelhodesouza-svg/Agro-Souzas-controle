import { chromium } from 'playwright';

const base=process.env.C360_QA_BASE||'http://127.0.0.1:8080';
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000}});
const page=await context.newPage();
const pageErrors=[];
page.on('pageerror',e=>pageErrors.push(String(e?.message||e)));

// Simula uma rede de campo moderada para arquivos do app. Em vez de medir localhost
// puro, cada JS/CSS recebe atraso fixo; downloads concorrentes vencem, cascatas sequenciais falham.
await page.route('**/*',async route=>{
  const u=new URL(route.request().url());
  if(u.hostname==='127.0.0.1'||u.hostname==='localhost'){
    if(/\.(?:js|css)(?:\?|$)/i.test(u.pathname+u.search))await new Promise(r=>setTimeout(r,90));
    return route.continue();
  }
  return route.abort();
});

const started=Date.now();
await page.goto(base+'/?qa_performance=1',{waitUntil:'domcontentloaded',timeout:15000});
await page.waitForFunction(()=>window.__c360Bootstrap?.ready!==undefined,{timeout:8000});
const interactiveWall=Date.now()-started;
await page.waitForFunction(()=>window.__c360Bootstrap?.featuresReady===true||window.__c360Bootstrap?.safeMode===true,{timeout:10000});
const completeWall=Date.now()-started;

const metrics=await page.evaluate(()=>{
  const entries=performance.getEntriesByType('resource');
  const boot=window.__c360Bootstrap||{};
  const interactive=performance.getEntriesByName('c360:boot:interactive-ms')[0]?.duration??null;
  const total=performance.getEntriesByName('c360:boot:total-ms')[0]?.duration??null;
  return {
    interactiveMeasureMs:interactive==null?null:Math.round(interactive),
    totalMeasureMs:total==null?null:Math.round(total),
    resources:entries.length,
    scripts:entries.filter(x=>x.initiatorType==='script').length,
    styles:entries.filter(x=>x.initiatorType==='link'&&/\.css(?:\?|$)/.test(x.name)).length,
    bootstrapErrors:Array.isArray(boot.errors)?boot.errors:[],
    releaseHealth:window.__c360ReleaseHealth||null,
  };
});
metrics.interactiveWallMs=interactiveWall;
metrics.completeWallMs=completeWall;
console.log(JSON.stringify(metrics,null,2));

const failures=[];
if(metrics.bootstrapErrors.length)failures.push('bootstrap errors: '+metrics.bootstrapErrors.join(' | '));
if(pageErrors.length)failures.push('page errors: '+pageErrors.join(' | '));
if(interactiveWall>3000)failures.push(`interactive bootstrap ${interactiveWall}ms > 3000ms budget`);
if(completeWall>6000)failures.push(`complete bootstrap ${completeWall}ms > 6000ms budget`);
if(metrics.resources>115)failures.push(`resource count ${metrics.resources} > 115 budget`);
if(!metrics.releaseHealth?.enhanced)failures.push('release runtime did not complete DOM enhancement');

await browser.close();
if(failures.length){
  console.error('\nPERFORMANCE BUDGET FAIL');
  for(const f of failures)console.error(' - '+f);
  process.exit(1);
}
console.log('\nPERFORMANCE BUDGET PASS');
