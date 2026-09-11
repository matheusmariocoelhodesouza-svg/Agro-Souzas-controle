import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const auditVersion = '2026.09.11-r3';
const base = process.env.C360_BASE_URL || 'http://127.0.0.1:8080';
const out = path.resolve('qa-artifacts');
await fs.mkdir(out, { recursive: true });

const screens = [
  'inicio','equipes','funcionarios','documentosrh','ponto','operacoes','frota',
  'manutencoes','combustivel','insumos','financeiro','relatorios','alertas',
  'integracoes','ia'
];
const criticalMobile = ['inicio','operacoes','ponto','frota','financeiro'];
const results = { auditVersion, base, pageErrors: [], consoleErrors: [], overflow: [], missing: [], sourceLeaks: [], screenshots: [] };

function safeName(value){ return value.replace(/[^a-z0-9_-]+/gi,'-').toLowerCase(); }

async function auditOverflow(page, label){
  const o = await page.evaluate(() => ({
    html: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    body: document.body.scrollWidth - document.documentElement.clientWidth,
    viewport: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  if (Math.max(o.html, o.body) > 2) results.overflow.push({ label, ...o });
}

async function auditSourceLeak(page,label){
  const leak = await page.evaluate(() => {
    const text = document.body?.innerText || '';
    const patterns = [
      'function setTextSafe',
      'async function loadTeamPoint',
      "'+esc(e.full_name)+'",
      'const currentEmployees=employees.filter',
      'window.__pointSelfieFile=null'
    ];
    const hit = patterns.find(p => text.includes(p)) || null;
    return { hit, hasLoadTeamPoint: typeof window.loadTeamPoint === 'function', hasRouter: typeof window.v2Go === 'function' };
  });
  if(leak.hit || !leak.hasLoadTeamPoint || !leak.hasRouter) results.sourceLeaks.push({label,...leak});
}

async function shot(page, name, fullPage=true){
  const file = `${safeName(name)}.png`;
  await page.screenshot({ path: path.join(out,file), fullPage });
  results.screenshots.push(file);
}

async function setTheme(page, dark){
  await page.evaluate((isDark) => {
    document.body.classList.toggle('darkmode', isDark);
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
  }, dark);
}

async function exposeAdminScreen(page, id){
  return page.evaluate((screenId) => {
    const login = document.getElementById('login');
    const app = document.getElementById('app');
    if (login) login.classList.add('hidden');
    if (app) app.classList.remove('hidden');
    const all = [...document.querySelectorAll('[data-screen]')];
    for (const el of all){
      el.classList.remove('active');
      el.hidden = true;
      el.style.display = 'none';
    }
    const target = document.getElementById(screenId);
    if (!target) return false;
    target.hidden = false;
    target.classList.add('active');
    target.style.display = '';
    window.scrollTo(0,0);
    return true;
  }, id);
}

async function ensureServiceWorkerControlled(page,name){
  const supported = await page.evaluate(() => 'serviceWorker' in navigator);
  if(!supported) return;
  await page.evaluate(async()=>{
    await Promise.race([
      navigator.serviceWorker.ready,
      new Promise(resolve=>setTimeout(()=>resolve(null),5000))
    ]);
  });
  await page.reload({ waitUntil:'domcontentloaded', timeout:30000 });
  await page.waitForTimeout(700);
  const controlled = await page.evaluate(() => !!navigator.serviceWorker.controller);
  if(!controlled) results.missing.push(`${name}: PWA sem controle do Service Worker após reload`);
  await auditSourceLeak(page,`${name}:pwa-controlado`);
}

async function runViewport(browser, name, viewport, mobile=false){
  const context = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile });
  const page = await context.newPage();
  page.on('pageerror', err => results.pageErrors.push({ viewport:name, message:String(err?.stack || err) }));
  page.on('console', msg => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (/failed to load resource|401|403|not authenticated|invalid refresh token/i.test(text)) return;
    results.consoleErrors.push({ viewport:name, text });
  });

  await page.goto(`${base}/?qa_browser=1`, { waitUntil:'domcontentloaded', timeout:30000 });
  await page.waitForTimeout(900);
  await auditSourceLeak(page,`${name}:primeiro-load`);
  await ensureServiceWorkerControlled(page,name);

  const essentials = await page.evaluate(() => ({
    login: !!document.getElementById('login'),
    device: !!document.getElementById('deviceSetupCard'),
    admin: !!document.getElementById('adminLoginCard'),
    app: !!document.getElementById('app'),
    title: document.title,
  }));
  for (const [key,value] of Object.entries(essentials)) if (key !== 'title' && !value) results.missing.push(`${name}: ${key}`);

  await setTheme(page,false);
  await auditOverflow(page,`${name}:entrada:claro`);
  await shot(page,`${name}-entrada-claro`);
  await setTheme(page,true);
  await auditOverflow(page,`${name}:entrada:escuro`);
  await shot(page,`${name}-entrada-escuro`);

  const adminLink = page.locator('#showAdminLogin');
  if (await adminLink.count()){
    await adminLink.click();
    await setTheme(page,false);
    await auditOverflow(page,`${name}:login-admin:claro`);
    await shot(page,`${name}-login-admin-claro`);
    await setTheme(page,true);
    await auditOverflow(page,`${name}:login-admin:escuro`);
    await shot(page,`${name}-login-admin-escuro`);
  }

  const list = mobile ? criticalMobile : screens;
  for (const id of list){
    const exists = await exposeAdminScreen(page,id);
    if (!exists){ results.missing.push(`${name}: tela #${id}`); continue; }
    for (const dark of [false,true]){
      await setTheme(page,dark);
      await page.waitForTimeout(60);
      const label = `${name}:${id}:${dark?'escuro':'claro'}`;
      await auditSourceLeak(page,label);
      await auditOverflow(page,label);
      await shot(page,`${name}-${id}-${dark?'escuro':'claro'}`);
    }
  }
  await context.close();
}

const browser = await chromium.launch({ headless:true });
try {
  await runViewport(browser,'desktop',{width:1440,height:1000},false);
  await runViewport(browser,'mobile',{width:390,height:844},true);

  const dda = await browser.newPage({ viewport:{width:1440,height:1000} });
  dda.on('pageerror', err => results.pageErrors.push({ viewport:'dda', message:String(err?.stack || err) }));
  await dda.goto(`${base}/dda.html?qa_browser=1`, { waitUntil:'domcontentloaded', timeout:30000 });
  await dda.waitForTimeout(600);
  for (const dark of [false,true]){
    await setTheme(dda,dark);
    await auditOverflow(dda,`dda:${dark?'escuro':'claro'}`);
    await shot(dda,`dda-${dark?'escuro':'claro'}`);
  }
  await dda.close();
} finally {
  await browser.close();
}

await fs.writeFile(path.join(out,'report.json'), JSON.stringify(results,null,2));
console.log(JSON.stringify({
  auditVersion: results.auditVersion,
  screenshots: results.screenshots.length,
  pageErrors: results.pageErrors.length,
  consoleErrors: results.consoleErrors.length,
  overflow: results.overflow.length,
  missing: results.missing.length,
  sourceLeaks: results.sourceLeaks.length,
}, null, 2));
if (results.pageErrors.length || results.consoleErrors.length || results.overflow.length || results.missing.length || results.sourceLeaks.length){
  console.error('Reference browser QA failed. See qa-artifacts/report.json');
  process.exit(1);
}
