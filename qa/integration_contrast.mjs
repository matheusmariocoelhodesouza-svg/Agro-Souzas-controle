import { chromium } from 'playwright';

const base=process.env.C360_BASE_URL||'http://127.0.0.1:8080';
const sample={company:'00000000-0000-0000-0000-00000000c361',user:'00000000-0000-0000-0000-00000000c360'};
const failures=[];

async function mockApi(page){
 await page.route('https://aycbrqziusxtxhsdfqjk.supabase.co/**',async route=>{
  const url=new URL(route.request().url());
  let body='[]';
  if(url.pathname.includes('/auth/v1/user'))body=JSON.stringify({id:sample.user,aud:'authenticated',role:'authenticated',user_metadata:{name:'QA'}});
  else if(url.pathname.includes('/auth/v1/token'))body=JSON.stringify({access_token:'qa',refresh_token:'qa',expires_in:3600,user:{id:sample.user}});
  else if(url.pathname.includes('/functions/v1/'))body=JSON.stringify({ok:true,data:[],items:[],positions:[]});
  await route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body});
 });
}

async function inspect(browser,label,viewport,isMobile){
 const context=await browser.newContext({viewport,isMobile,hasTouch:isMobile});
 const page=await context.newPage();
 await mockApi(page);
 await page.goto(`${base}/?qa_integration_contrast=1`,{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(()=>typeof window.v2Go==='function'&&typeof window.initScreenRouter==='function',{timeout:10000});
 await page.evaluate(({sample})=>{
  companyId=sample.company;companyProfile={id:sample.company,trade_name:'Empresa QA',legal_name:'Empresa QA'};
  deviceMode=false;currentRoleCode='admin';isAdminGeneral=true;
  document.getElementById('login')?.classList.add('hidden');document.getElementById('app')?.classList.remove('hidden');document.body.classList.add('app-ready');document.body.classList.remove('device-mode');
  initScreenRouter();
 },{sample});
 await page.evaluate(async()=>{await v2Go('integracoes')});
 await page.waitForTimeout(500);
 const result=await page.evaluate(()=>{
  const parse=s=>(String(s).match(/[\d.]+/g)||[]).slice(0,3).map(Number);
  const lum=c=>{const a=c.map(v=>{v/=255;return v<=.03928?v/12.92:((v+.055)/1.055)**2.4});return .2126*a[0]+.7152*a[1]+.0722*a[2]};
  const ratio=(a,b)=>{const A=lum(a),B=lum(b);return(Math.max(A,B)+.05)/(Math.min(A,B)+.05)};
  const visible=e=>{const s=getComputedStyle(e),b=e.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&b.width>0&&b.height>0};
  const items=[...document.querySelectorAll('#integracoes .integration-stat')].filter(visible).flatMap(card=>{
   const bg=getComputedStyle(card).backgroundColor;
   return[...card.querySelectorAll('span,strong')].filter(visible).map(el=>({text:String(el.textContent||'').trim(),fg:getComputedStyle(el).color,bg,ratio:ratio(parse(getComputedStyle(el).color),parse(bg))}));
  });
  const summary=document.querySelector('#integracoes details>summary');
  return{items,summaryHeight:summary?.getBoundingClientRect().height||0};
 });
 const weak=result.items.filter(x=>!Number.isFinite(x.ratio)||x.ratio<4.5);
 if(!result.items.length)failures.push(`${label}: nenhum indicador de integração visível`);
 if(weak.length)failures.push(`${label}: contraste insuficiente ${JSON.stringify(weak)}`);
 const min=isMobile?47.5:43.5;
 if(result.summaryHeight&&result.summaryHeight<min)failures.push(`${label}: summary ${result.summaryHeight}px < ${min}px`);
 console.log(JSON.stringify({label,indicators:result.items.length,minContrast:result.items.length?Math.min(...result.items.map(x=>x.ratio)):0,summaryHeight:result.summaryHeight},null,2));
 await context.close();
}

const browser=await chromium.launch({headless:true});
try{
 await inspect(browser,'desktop',{width:1440,height:1000},false);
 await inspect(browser,'mobile',{width:390,height:844},true);
}finally{await browser.close()}

if(failures.length){console.error(failures.join('\n'));process.exit(1)}
console.log('INTEGRATION CONTRAST PASS');
