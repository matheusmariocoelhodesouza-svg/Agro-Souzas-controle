import { chromium } from 'playwright';

const base=process.env.C360_BASE_URL||'http://127.0.0.1:8080';
const browser=await chromium.launch({headless:true});
let failed=0;const checks=[];
const ok=(name,pass,detail='')=>{checks.push({name,pass,detail});if(!pass)failed++};
try{
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 await page.goto(`${base}/qa/ux_polish_fixture.html`,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.C360_UX_POLISH_VERSION==='2026.09.22-ux1',{timeout:5000});
 await page.waitForTimeout(180);
 const field=await page.evaluate(()=>{
   const card=document.getElementById('c360LocationPermissionCard'),p=card.querySelector('p'),btn=card.querySelector('button'),toast=document.getElementById('c360ToastStack'),tile=document.getElementById('firstTile');
   const cs=getComputedStyle(card),ps=getComputedStyle(p),bs=getComputedStyle(btn),ts=getComputedStyle(toast),cr=card.getBoundingClientRect(),br=btn.getBoundingClientRect(),tr=toast.getBoundingClientRect(),fr=tile.getBoundingClientRect();
   return{version:window.C360_UX_POLISH_VERSION,position:cs.position,top:cs.top,maxHeight:cs.maxHeight,overflow:cs.overflow,pColor:ps.color,buttonWidth:br.width,cardWidth:cr.width,buttonInside:br.bottom<=cr.bottom+1,screenPad:getComputedStyle(document.getElementById('screenHost')).paddingTop,toastParent:toast.parentElement?.id,toastPosition:ts.position,noToastOverlap:tr.bottom<=fr.top+1};
 });
 ok('version',field.version==='2026.09.22-ux1',field.version);
 ok('location relative',field.position==='relative',field.position);
 ok('location top reset',field.top==='auto'||field.top==='0px',field.top);
 ok('location unclipped',field.maxHeight==='none'&&field.overflow==='visible',`${field.maxHeight}/${field.overflow}`);
 ok('location readable',!/rgb\(255, 255, 255\)/.test(field.pColor),field.pColor);
 ok('retry inside card',field.buttonInside,JSON.stringify(field));
 ok('retry full width',Math.abs(field.buttonWidth-field.cardWidth)<30,`${field.buttonWidth}/${field.cardWidth}`);
 ok('screen padding removed',field.screenPad==='0px',field.screenPad);
 ok('toast in flow',field.toastParent==='c360FieldToastSlot'&&field.toastPosition==='relative',`${field.toastParent}/${field.toastPosition}`);
 ok('toast does not cover first tile',field.noToastOverlap,JSON.stringify(field));

 await page.evaluate(()=>{
   document.body.classList.remove('device-mode');
   document.getElementById('equipehome').classList.remove('active');
   document.getElementById('financeiro').classList.add('active');
   document.dispatchEvent(new CustomEvent('c360:screen-changed',{detail:{id:'financeiro'}}));
 });
 await page.waitForTimeout(220);
 const admin=await page.evaluate(()=>{
   const label=document.querySelector('.finance-kpi-label'),value=document.querySelector('.finance-kpi-value'),tracker=document.getElementById('c360NativeTrackerQuick'),chat=document.getElementById('c360ChatFab');
   const plan=document.querySelector('.plan-chip'),side=document.querySelector('.sidebar-plan');
   return{labelColor:getComputedStyle(label).color,labelFill:getComputedStyle(label).webkitTextFillColor,valueColor:getComputedStyle(value).color,valueFill:getComputedStyle(value).webkitTextFillColor,trackerParent:tracker.parentElement?.id,trackerPos:getComputedStyle(tracker).position,chatParent:chat.parentElement?.id,chatPos:getComputedStyle(chat).position,planDisplay:getComputedStyle(plan).display,sideDisplay:getComputedStyle(side).display};
 });
 ok('finance label readable',!/rgb\(255, 255, 255\)/.test(admin.labelColor)&&!/rgb\(255, 255, 255\)/.test(admin.labelFill),JSON.stringify(admin));
 ok('finance hidden value readable',!/rgb\(255, 255, 255\)/.test(admin.valueColor)&&!/rgb\(255, 255, 255\)/.test(admin.valueFill),JSON.stringify(admin));
 ok('tracker docked',admin.trackerParent==='c360UtilityDock'&&admin.trackerPos==='static',JSON.stringify(admin));
 ok('chat docked',admin.chatParent==='c360UtilityDock'&&admin.chatPos==='static',JSON.stringify(admin));
 ok('top plan noise hidden',admin.planDisplay==='none',admin.planDisplay);
 ok('sidebar plan noise hidden',admin.sideDisplay==='none',admin.sideDisplay);
 console.log(JSON.stringify({checks:checks.length,failed,checks},null,2));
 if(failed)process.exitCode=1;
}finally{await browser.close()}
