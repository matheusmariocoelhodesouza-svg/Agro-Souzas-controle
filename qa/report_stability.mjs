import { chromium } from 'playwright';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1280,height:800}});
try{
  await page.goto('http://127.0.0.1:8080/qa/report_stability_fixture.html',{waitUntil:'networkidle'});
  await page.waitForTimeout(250);
  const result=await page.evaluate(async()=>{
    const value=await window.loadReports();
    await new Promise(r=>setTimeout(r,50));
    return {
      value,
      unhandled:window.__unhandled,
      version:window.C360_REPORT_STABILITY_VERSION||null,
      message:document.getElementById('reportsKpis')?.textContent||'',
      busy:document.getElementById('refreshReports')?.disabled||false,
      button:document.getElementById('refreshReports')?.textContent||''
    };
  });
  const failures=[];
  if(result.unhandled!==0)failures.push('report failure produced an unhandled rejection');
  if(result.version!=='2026.09.22-reports1')failures.push('report stability wrapper did not load');
  if(!result.message.includes('Não foi possível gerar o relatório'))failures.push('friendly report error state was not rendered');
  if(result.busy)failures.push('report generate button stayed disabled');
  if(result.button!=='GERAR')failures.push('report generate button text was not restored');
  console.log(JSON.stringify({checks:5,failed:failures.length,result},null,2));
  if(failures.length){for(const f of failures)console.error('REPORT STABILITY FAIL:',f);process.exitCode=1;}
} finally {await browser.close();}
