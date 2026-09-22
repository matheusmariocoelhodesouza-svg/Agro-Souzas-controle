import { chromium } from 'playwright';

const base='http://127.0.0.1:8080';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:390,height:844}});
const failures=[];
const assert=(condition,message)=>{if(!condition)failures.push(message)};

try{
  await page.goto(base+'/qa/field_stability_fixture.html',{waitUntil:'networkidle'});
  await page.waitForTimeout(450);

  const result=await page.evaluate(()=>{
    const card=document.getElementById('c360LocationPermissionCard');
    const slot=document.getElementById('c360FieldLocationSlot');
    const apanha=document.getElementById('apanha');
    const retry=document.getElementById('retryLocation');
    const cardRect=card.getBoundingClientRect();
    const apanhaRect=apanha.getBoundingClientRect();
    const retryRect=retry.getBoundingClientRect();
    const cardStyle=getComputedStyle(card);
    return {
      hasSlot:!!slot,
      parentIsSlot:card.parentElement===slot,
      position:cardStyle.position,
      noOverlap:cardRect.bottom<=apanhaRect.top+1,
      apanhaVisible:apanhaRect.top>=0&&apanhaRect.bottom<=innerHeight,
      retryVisible:retryRect.left>=0&&retryRect.right<=innerWidth&&retryRect.top>=0&&retryRect.bottom<=innerHeight,
      widthFits:cardRect.left>=0&&cardRect.right<=innerWidth,
      version:window.C360_FIELD_LOCATION_UI_HOTFIX||null
    };
  });

  assert(result.hasSlot,'location slot was not created');
  assert(result.parentIsSlot,'location card was not moved into its safe slot');
  assert(result.position!=='fixed','location card still uses fixed positioning');
  assert(result.noOverlap,'location card overlaps the Apanha action');
  assert(result.apanhaVisible,'Apanha is not visible in the initial mobile viewport');
  assert(result.retryVisible,'location retry action is clipped');
  assert(result.widthFits,'location warning exceeds the mobile viewport');
  assert(result.version==='2026.09.22-locui2','unexpected location UI version');

  await page.evaluate(()=>{
    const card=document.getElementById('c360LocationPermissionCard');
    const slot=document.getElementById('c360FieldLocationSlot');
    if(card)document.body.appendChild(card);
    slot?.remove();
    const marker=document.createElement('div');
    marker.textContent='mutation';
    document.body.appendChild(marker);
  });
  await page.waitForTimeout(150);
  const recovered=await page.evaluate(()=>document.getElementById('c360LocationPermissionCard')?.parentElement?.id==='c360FieldLocationSlot');
  assert(recovered,'location card did not self-heal after DOM replacement');

  console.log(JSON.stringify({checks:9,failed:failures.length,result,recovered},null,2));
  if(failures.length){
    for(const failure of failures)console.error('FIELD STABILITY FAIL:',failure);
    process.exitCode=1;
  }
} finally {
  await browser.close();
}
