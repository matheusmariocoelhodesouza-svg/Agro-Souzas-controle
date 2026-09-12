import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const auditVersion = '2026.09.12-r6';
const base = process.env.C360_BASE_URL || 'http://127.0.0.1:8080';
const out = path.resolve('qa-artifacts');
await fs.mkdir(out, { recursive: true });

const adminScreens = [
  'inicio','equipes','funcionarios','documentosrh','ponto','operacoes','frota',
  'manutencoes','combustivel','insumos','financeiro','relatorios','alertas',
  'integracoes','configuracoes','ia'
];
const criticalMobile = ['inicio','operacoes','ponto','frota','financeiro'];
const fieldScreens = ['equipehome','operacoes','ponto','combustivel','equipereport'];
const results = {
  auditVersion, base,
  pageErrors: [], consoleErrors: [], overflow: [], missing: [], sourceLeaks: [],
  flowErrors: [], dialogs: [], mockedWrites: [], screenshots: []
};

function safeName(value){ return value.replace(/[^a-z0-9_-]+/gi,'-').toLowerCase(); }
function flowError(label, message){ results.flowErrors.push({ label, message:String(message) }); }

async function installQaApiMock(page){
  await page.route('https://aycbrqziusxtxhsdfqjk.supabase.co/**', async route => {
    const req = route.request();
    const url = new URL(req.url());
    const method = req.method().toUpperCase();
    if (!['GET','HEAD','OPTIONS'].includes(method)) {
      results.mockedWrites.push({ method, path:url.pathname, note:'interceptado pelo QA; nenhum dado real foi alterado' });
    }

    let body = '[]';
    if (url.pathname.includes('/auth/v1/user')) {
      body = JSON.stringify({
        id:'00000000-0000-0000-0000-00000000c360', aud:'authenticated', role:'authenticated',
        is_anonymous:false, app_metadata:{provider:'email',providers:['email']}, user_metadata:{name:'QA Comando 360'}
      });
    } else if (url.pathname.includes('/auth/v1/token')) {
      body = JSON.stringify({
        access_token:'qa-access-token', refresh_token:'qa-refresh-token', token_type:'bearer', expires_in:3600,
        user:{id:'00000000-0000-0000-0000-00000000c360',aud:'authenticated',role:'authenticated'}
      });
    } else if (url.pathname.includes('/functions/v1/')) {
      body = JSON.stringify({ ok:true, data:[], items:[] });
    }

    await route.fulfill({
      status:200, contentType:'application/json; charset=utf-8',
      headers:{'access-control-allow-origin':'*','content-range':'0-0/0'}, body
    });
  });
}

function attachRuntimeAudit(page, label){
  page.on('pageerror', err => results.pageErrors.push({ viewport:label, message:String(err?.stack || err) }));
  page.on('console', msg => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (/failed to load resource|401|403|not authenticated|invalid refresh token/i.test(text)) return;
    results.consoleErrors.push({ viewport:label, text });
  });
  page.on('dialog', async dialog => {
    results.dialogs.push({ viewport:label, type:dialog.type(), message:dialog.message() });
    try{ await dialog.dismiss(); }catch{}
  });
}

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
      'function setTextSafe','async function loadTeamPoint',"'+esc(e.full_name)+'",
      'const currentEmployees=employees.filter','window.__pointSelfieFile=null',
      'Object.fromEntries(employees.map','events=events.filter(ev=>'
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

async function exposeScreen(page, id){
  return page.evaluate((screenId) => {
    const login = document.getElementById('login');
    const app = document.getElementById('app');
    if (login) login.classList.add('hidden');
    if (app) app.classList.remove('hidden');
    const all = [...document.querySelectorAll('[data-screen]')];
    for (const el of all){
      el.classList.remove('active');
      el.hidden = true;
      el.style.removeProperty('display');
    }
    const target = document.getElementById(screenId);
    if (!target) return false;
    target.hidden = false;
    target.classList.add('active');
    window.scrollTo(0,0);
    return true;
  }, id);
}

async function ensureServiceWorkerControlled(page,name){
  const supported = await page.evaluate(() => 'serviceWorker' in navigator);
  if(!supported) return;
  await page.evaluate(async()=>{
    await Promise.race([navigator.serviceWorker.ready,new Promise(resolve=>setTimeout(()=>resolve(null),5000))]);
  });
  await page.reload({ waitUntil:'domcontentloaded', timeout:30000 });
  await page.waitForTimeout(700);
  const controlled = await page.evaluate(() => !!navigator.serviceWorker.controller);
  if(!controlled) results.missing.push(`${name}: PWA sem controle do Service Worker após reload`);
  await auditSourceLeak(page,`${name}:pwa-controlado`);
}

async function prepareSimulatedMode(page, mode){
  const state = await page.evaluate((requestedMode) => {
    const qaUserId='00000000-0000-0000-0000-00000000c360';
    const qaCompanyId='00000000-0000-0000-0000-00000000c361';
    const qaTeamId='00000000-0000-0000-0000-00000000c362';
    localStorage.setItem('controla_beta_session',JSON.stringify({
      access_token:'qa-access-token',refresh_token:'qa-refresh-token',expires_at:Date.now()+3600000,
      user:{id:qaUserId,email:'qa@comando360.local'}
    }));
    let bindingError='';
    try{
      companyId=qaCompanyId;
      companyProfile={id:qaCompanyId,trade_name:'Empresa QA',legal_name:'Empresa QA'};
      deviceMode=requestedMode==='field';
      deviceAccess=deviceMode?{id:'qa-device',company_id:qaCompanyId,team_id:qaTeamId,status:'active'}:null;
      deviceTeam=deviceMode?{id:qaTeamId,name:'Equipe QA',metadata:{}}:null;
      currentRoleCode=deviceMode?'device':'admin';
      isAdminGeneral=!deviceMode;
    }catch(e){ bindingError=String(e?.stack||e); }

    const login=document.getElementById('login');
    const app=document.getElementById('app');
    if(login)login.classList.add('hidden');
    if(app)app.classList.remove('hidden');
    document.body.classList.add('app-ready');
    document.body.classList.toggle('device-mode',requestedMode==='field');

    // O ensaio visual anterior não pode contaminar o roteador funcional.
    document.querySelectorAll('#app [data-screen]').forEach(el=>{
      el.classList.remove('active');
      el.hidden=true;
      el.style.removeProperty('display');
    });
    const host=document.getElementById('screenHost');
    if(host) while(host.firstChild) host.removeChild(host.firstChild);
    try{ if(typeof initScreenRouter==='function')initScreenRouter(); else bindingError += '\ninitScreenRouter ausente'; }
    catch(e){ bindingError += '\ninitScreenRouter: '+String(e); }

    if(requestedMode==='field'){
      const n=document.getElementById('teamHomeName'); if(n)n.textContent='Equipe QA';
      const v=document.getElementById('teamHomeVehicle'); if(v)v.textContent='Celular de campo • QA';
      const b=document.getElementById('deviceModeTeam'); if(b)b.textContent='Equipe QA';
      try{ if(typeof applyDeviceUi==='function')applyDeviceUi(); }catch(e){ bindingError += '\napplyDeviceUi: '+String(e); }
    }
    return {bindingError,deviceModeValue:typeof deviceMode!=='undefined'?deviceMode:null,hasRouter:typeof v2Go==='function'};
  }, mode);
  if(state.bindingError) flowError(`${mode}:preparação`,state.bindingError);
  if(!state.hasRouter) flowError(`${mode}:preparação`,'v2Go não está disponível');
  if(mode==='field' && state.deviceModeValue!==true) flowError(`${mode}:preparação`,'deviceMode não ficou ativo');
  if(mode==='admin' && state.deviceModeValue!==false) flowError(`${mode}:preparação`,'deviceMode não ficou desativado');
}

async function routeThroughApp(page, tab, label){
  try{
    const state = await page.evaluate(async (screenId) => {
      if(typeof v2Go!=='function')throw new Error('v2Go ausente');
      await v2Go(screenId);
      const active=[...document.querySelectorAll('[data-screen]')].filter(el=>!el.hidden && getComputedStyle(el).display!=='none').map(el=>el.id);
      const requested=document.getElementById(screenId);
      const visible=el=>!!el && !el.hidden && getComputedStyle(el).display!=='none';
      return {active,targetExists:!!requested,targetVisible:visible(requested)};
    },tab);
    if(!state.targetExists) flowError(label,`tela #${tab} não existe`);
    if(!state.targetVisible) flowError(label,`tela #${tab} não ficou visível; ativas: ${state.active.join(', ')||'nenhuma'}`);
  }catch(e){ flowError(label,e?.stack||e); }
  await page.waitForTimeout(120);
  await auditSourceLeak(page,label);
  await auditOverflow(page,label);
}

async function testPoultryForm(page, mode, label){
  await routeThroughApp(page,'operacoes',`${label}:abrir-operacoes`);
  const button=page.locator('#newPoultryOp');
  if(!await button.count()){ flowError(label,'botão Nova Apanha ausente'); return; }
  try{
    await button.click({timeout:3000});
    await page.waitForTimeout(180);
  }catch(e){ flowError(label,`não abriu Nova Apanha: ${e}`); return; }

  const formState=await page.evaluate((requestedMode)=>{
    const form=document.getElementById('poultryForm');
    const planning=document.getElementById('poAdminPlanning');
    const visible=el=>!!el && !el.classList.contains('hidden') && getComputedStyle(el).display!=='none';
    return {form:visible(form),planning:visible(planning),requestedMode};
  },mode);
  if(!formState.form) flowError(label,'formulário Nova Apanha não ficou visível');
  if(mode==='field' && formState.planning) flowError(label,'planejamento administrativo apareceu no celular de campo');
  if(mode==='admin' && !formState.planning) flowError(label,'planejamento administrativo não apareceu para administrador');

  const energyButtons=page.locator('.po-energy-btn');
  if(await energyButtons.count()>=2){
    try{
      await energyButtons.nth(0).click();
      await energyButtons.nth(1).click();
      const energy=await page.locator('#poEnergyType').inputValue();
      if(!/380/.test(energy)) flowError(label,`seleção 220/380 V não atualizou corretamente: "${energy}"`);
    }catch(e){ flowError(label,`falha ao selecionar tensão: ${e}`); }
  }else flowError(label,'seletor 220/380 V incompleto');

  await auditOverflow(page,`${label}:form-apanha`);
  await shot(page,`${label}-nova-apanha`,true);
  const close=page.locator('#closePoultryForm');
  if(await close.count()){
    try{ await close.click(); }catch(e){ flowError(label,`botão Cancelar da apanha falhou: ${e}`); }
  }
}

async function runAdminFlow(page, name){
  await prepareSimulatedMode(page,'admin');
  for(const id of adminScreens) await routeThroughApp(page,id,`${name}:admin:${id}`);
  await testPoultryForm(page,'admin',`${name}:admin`);
  const state=await page.evaluate(()=>({
    deviceClass:document.body.classList.contains('device-mode'),
    appVisible:!document.getElementById('app')?.classList.contains('hidden')
  }));
  if(state.deviceClass) flowError(`${name}:admin`,'classe device-mode permaneceu ativa no modo administrador');
  if(!state.appVisible) flowError(`${name}:admin`,'app ficou oculto durante o fluxo administrativo');
}

async function runFieldFlow(page, name){
  await prepareSimulatedMode(page,'field');
  await routeThroughApp(page,'equipehome',`${name}:campo:inicio`);
  const tiles=await page.evaluate(()=>[...document.querySelectorAll('#equipehome .team-tile')].map(b=>b.textContent.trim().replace(/\s+/g,' ')));
  for(const expected of ['Apanha','Ponto','Abastecimento','Relatório']){
    if(!tiles.some(t=>t.includes(expected))) flowError(`${name}:campo:inicio`,`atalho "${expected}" ausente`);
  }
  if(tiles.length!==4) flowError(`${name}:campo:inicio`,`esperados 4 atalhos; encontrados ${tiles.length}`);

  for(const id of fieldScreens.slice(1)) await routeThroughApp(page,id,`${name}:campo:${id}`);

  try{
    const restricted=await page.evaluate(async()=>{
      await v2Go('financeiro');
      const home=document.getElementById('equipehome');
      const finance=document.getElementById('financeiro');
      const visible=el=>!!el && !el.hidden && getComputedStyle(el).display!=='none';
      return {home:visible(home),finance:visible(finance)};
    });
    if(!restricted.home || restricted.finance) flowError(`${name}:campo:restricao`,'módulo Financeiro não foi bloqueado para o celular da equipe');
  }catch(e){ flowError(`${name}:campo:restricao`,e?.stack||e); }

  await testPoultryForm(page,'field',`${name}:campo`);
  const adminVisible=await page.evaluate(()=>[...document.querySelectorAll('.admin-only')].some(el=>getComputedStyle(el).display!=='none' && !el.closest('.hidden')));
  if(adminVisible) flowError(`${name}:campo`,'há conteúdo .admin-only visível no modo de campo');
  await shot(page,`${name}-campo-final`,true);
}

async function runViewport(browser, name, viewport, mobile=false){
  const context = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile });
  const page = await context.newPage();
  attachRuntimeAudit(page,name);
  await installQaApiMock(page);

  await page.goto(`${base}/?qa_browser=1`, { waitUntil:'domcontentloaded', timeout:30000 });
  await page.waitForTimeout(900);
  await auditSourceLeak(page,`${name}:primeiro-load`);
  await ensureServiceWorkerControlled(page,name);

  const essentials = await page.evaluate(() => ({
    login: !!document.getElementById('login'), device: !!document.getElementById('deviceSetupCard'),
    admin: !!document.getElementById('adminLoginCard'), app: !!document.getElementById('app')
  }));
  for (const [key,value] of Object.entries(essentials)) if (!value) results.missing.push(`${name}: ${key}`);

  await setTheme(page,false); await auditOverflow(page,`${name}:entrada:claro`); await shot(page,`${name}-entrada-claro`);
  await setTheme(page,true); await auditOverflow(page,`${name}:entrada:escuro`); await shot(page,`${name}-entrada-escuro`);

  const adminLink = page.locator('#showAdminLogin');
  if (await adminLink.count()){
    await adminLink.click();
    await setTheme(page,false); await auditOverflow(page,`${name}:login-admin:claro`); await shot(page,`${name}-login-admin-claro`);
    await setTheme(page,true); await auditOverflow(page,`${name}:login-admin:escuro`); await shot(page,`${name}-login-admin-escuro`);
  }

  const list = mobile ? criticalMobile : adminScreens;
  for (const id of list){
    const exists = await exposeScreen(page,id);
    if (!exists){ results.missing.push(`${name}: tela #${id}`); continue; }
    for (const dark of [false,true]){
      await setTheme(page,dark); await page.waitForTimeout(60);
      const label = `${name}:${id}:${dark?'escuro':'claro'}`;
      await auditSourceLeak(page,label); await auditOverflow(page,label); await shot(page,`${name}-${id}-${dark?'escuro':'claro'}`);
    }
  }

  await setTheme(page,false);
  if(mobile) await runFieldFlow(page,name); else await runAdminFlow(page,name);
  await context.close();
}

const browser = await chromium.launch({ headless:true });
try {
  await runViewport(browser,'desktop',{width:1440,height:1000},false);
  await runViewport(browser,'mobile',{width:390,height:844},true);

  const dda = await browser.newPage({ viewport:{width:1440,height:1000} });
  attachRuntimeAudit(dda,'dda');
  await dda.goto(`${base}/dda.html?qa_browser=1`, { waitUntil:'domcontentloaded', timeout:30000 });
  await dda.waitForTimeout(600);
  for (const dark of [false,true]){
    await setTheme(dda,dark); await auditOverflow(dda,`dda:${dark?'escuro':'claro'}`); await shot(dda,`dda-${dark?'escuro':'claro'}`);
  }
  await dda.close();
} finally { await browser.close(); }

await fs.writeFile(path.join(out,'report.json'), JSON.stringify(results,null,2));
console.log(JSON.stringify({
  auditVersion:results.auditVersion,screenshots:results.screenshots.length,pageErrors:results.pageErrors.length,
  consoleErrors:results.consoleErrors.length,overflow:results.overflow.length,missing:results.missing.length,
  sourceLeaks:results.sourceLeaks.length,flowErrors:results.flowErrors.length,dialogs:results.dialogs.length,
  mockedWrites:results.mockedWrites.length
}, null, 2));
if (results.pageErrors.length || results.consoleErrors.length || results.overflow.length || results.missing.length || results.sourceLeaks.length || results.flowErrors.length){
  console.error('Reference browser QA failed. See qa-artifacts/report.json'); process.exit(1);
}
