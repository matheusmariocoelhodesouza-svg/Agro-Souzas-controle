const CACHE='comando360-v7-02-hotfix63';
const STABLE_CACHE='comando360-stable-v1';
const META_CACHE='comando360-meta-v1';
const META_KEY='./__c360_recovery_meta__';
/*
 * O primeiro install mantém offline apenas o shell, runtime comum e o que é
 * necessário no celular de campo. Relatórios/fiscal/insumos administrativos
 * passam a entrar no cache quando a respectiva tela é realmente aberta.
 */
const CORE=[
  './','./index.html','./cadastro.html','./legal.html','./comando360.webmanifest','./comando360-icon.svg',
  './c360-quality-hotfix.js','./c360-autorecovery.js','./c360-platform.js','./c360-product-core.js','./c360-release-core.js','./c360-quality-core.js',
  './c360-farm-cache-hotfix.js','./c360-field-offline-hotfix.js','./c360-field-stability.js','./c360-runtime-compatibility.js','./c360-final-stabilization.js','./c360-data-integrity.js','./c360-system-health.js','./c360-consumable-edit.js',
  './c360-field-route-guard.js','./c360-ux-polish-hotfix.js','./c360-onboarding-entry.js','./c360-team-chat.js','./c360-enterprise.js','./c360-commercial.js','./c360-saas-readiness.js','./c360-rpc-bridge.js','./c360-showcase-exact.js',
  './c360-ui-polish.css','./c360-ui-polish-legacy-20260915.css','./c360-premium-ui.css','./c360-product-ui.css','./c360-visual-system.css','./c360-contrast-fix.css','./c360-premium-theme-v2.css','./c360-showcase-theme.css','./c360-showcase-exact.css','./c360-visual-final.css','./c360-layout-hardening.css','./c360-release-core.css','./c360-final-stabilization.css',
  './c360-field-mobile-density.css','./c360-field-home-stack.css','./c360-field-contrast-hotfix.css','./c360-mobile-rescue.css','./c360-signature-ui.css','./c360-signature-icons.css','./c360-professional-pass.css','./c360-signature-ui.js','./c360-professional-pass.js'
];
const SHELL=['./','./index.html'];
const CONCURRENCY=8;

async function fetchWithTimeout(request,ms=3200){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),ms);
  try{return await fetch(request,{cache:'no-store',signal:controller.signal})
  }finally{clearTimeout(timer)}
}
async function mapLimit(items,limit,worker){
  let cursor=0;
  const runners=Array.from({length:Math.min(limit,items.length)},async()=>{
    while(true){const i=cursor++;if(i>=items.length)return;await worker(items[i],i)}
  });
  await Promise.all(runners);
}
async function cacheOne(cache,url,timeout=3200){
  try{const response=await fetchWithTimeout(url,timeout);if(response&&response.ok){await cache.put(url,response.clone());return true}}catch(_){}
  return false;
}
function isAppShellNavigation(url){
  const path=url.pathname.replace(/\/+$/,'/');
  const scopePath=new URL(self.registration.scope).pathname.replace(/\/+$/,'/');
  return path===scopePath||path===scopePath+'index.html';
}
function versionNumber(name){const m=String(name||'').match(/comando360-v7-02-hotfix(\d+)$/);return m?Number(m[1]):0}
async function getMeta(){try{const c=await caches.open(META_CACHE);const r=await c.match(META_KEY);return r?await r.json():{}}catch(_){return{}}}
async function setMeta(patch){
  const current=await getMeta();const next={...current,...patch,updated_at:new Date().toISOString()};
  const c=await caches.open(META_CACHE);await c.put(META_KEY,new Response(JSON.stringify(next),{headers:{'Content-Type':'application/json','Cache-Control':'no-store'}}));return next;
}
async function copyCache(sourceName,targetName){
  if(!sourceName||sourceName===targetName)return false;
  const source=await caches.open(sourceName);const keys=await source.keys();if(!keys.length)return false;
  await caches.delete(targetName);const target=await caches.open(targetName);let copied=0;
  await mapLimit(keys,CONCURRENCY,async req=>{const res=await source.match(req);if(res){await target.put(req,res.clone());copied++}});return copied>0;
}
async function stableMatch(request,shell=false){
  const cache=await caches.open(STABLE_CACHE);if(shell)return(await cache.match('./index.html'))||(await cache.match('./'))||null;
  const url=new URL(typeof request==='string'?request:request.url,self.location.origin);let hit=await cache.match(request);if(hit)return hit;
  if(url.origin===self.location.origin){
    hit=await cache.match(url.origin+url.pathname);if(hit)return hit;
    const scope=new URL(self.registration.scope);if(url.pathname.startsWith(scope.pathname)){const rel='./'+url.pathname.slice(scope.pathname.length).replace(/^\/+/, '');hit=await cache.match(rel);if(hit)return hit}
  }
  return null;
}
function offlinePage(){
  return new Response('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Comando 360</title><body style="font-family:system-ui;padding:24px"><h2>Comando 360</h2><p>Esta tela precisa de internet e ainda não possui uma cópia offline neste aparelho. Volte ao painel principal ou conecte-se à internet.</p><p><a href="./">Voltar ao Comando 360</a></p></body>',{headers:{'Content-Type':'text/html; charset=utf-8'}});
}
async function prepareCore(){
  const cache=await caches.open(CACHE);let refreshed=0,shellRefreshed=false;
  await Promise.all(SHELL.map(async url=>{if(await cacheOne(cache,url,4500)){refreshed++;shellRefreshed=true}}));
  let hasShell=!!((await cache.match('./index.html'))||(await cache.match('./')));if(!hasShell)throw new Error('APP_SHELL_NOT_READY');
  const rest=CORE.filter(x=>!SHELL.includes(x));await mapLimit(rest,CONCURRENCY,async url=>{if(await cacheOne(cache,url,3200))refreshed++});
  hasShell=!!((await cache.match('./index.html'))||(await cache.match('./')));return{ok:true,hasShell,refreshed,shellRefreshed};
}
async function stableReady(){const cache=await caches.open(STABLE_CACHE);return!!((await cache.match('./index.html'))||(await cache.match('./')))}
self.addEventListener('install',event=>{self.skipWaiting();event.waitUntil(prepareCore())});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keysBefore=await caches.keys();const previous=keysBefore.filter(k=>/^comando360-v7-02-hotfix\d+$/.test(k)&&k!==CACHE).sort((a,b)=>versionNumber(b)-versionNumber(a))[0]||null;
    if(previous){try{await copyCache(previous,STABLE_CACHE)}catch(_){}}
    await prepareCore();const current=await caches.open(CACHE);const ready=(await current.match('./index.html'))||(await current.match('./'));
    if(ready){
      await setMeta({current_cache:CACHE,stable_cache:STABLE_CACHE,stable_from:previous,rollback:false,rollback_reason:null,activated_at:new Date().toISOString()});
      const keys=await caches.keys();await Promise.all(keys.filter(k=>/^comando360-v7-02-hotfix\d+$/.test(k)&&k!==CACHE).map(k=>caches.delete(k)));
    }
    await self.clients.claim();
  })());
});
self.addEventListener('message',event=>{
  const msg=event.data||{};const reply=data=>{try{event.ports&&event.ports[0]&&event.ports[0].postMessage(data)}catch(_){}};
  event.waitUntil((async()=>{
    try{
      if(msg.type==='C360_STATUS'){const meta=await getMeta();reply({ok:true,...meta,rollback:!!meta.rollback,current:CACHE,stable:STABLE_CACHE,stable_ready:await stableReady()});return}
      if(msg.type==='C360_HEAL_CORE'){const result=await prepareCore();const healed=!!result.shellRefreshed&&result.refreshed>=3;await setMeta({last_heal_at:new Date().toISOString(),last_heal_reason:String(msg.reason||'').slice(0,240),last_heal_ok:healed});reply({ok:healed,...result});return}
      if(msg.type==='C360_ROLLBACK_TO_STABLE'){const ready=await stableReady();if(!ready){reply({ok:false,reason:'stable-cache-unavailable'});return}const meta=await setMeta({rollback:true,rollback_at:new Date().toISOString(),rollback_reason:String(msg.reason||'').slice(0,240)});reply({ok:true,rollback:true,stable_from:meta.stable_from||null});return}
      if(msg.type==='C360_MARK_HEALTHY'){const meta=await getMeta();if(!meta.rollback)await setMeta({last_healthy_at:new Date().toISOString(),healthy_build:String(msg.build||'').slice(0,80),recovery_version:String(msg.recovery_version||'').slice(0,80)});reply({ok:true,rollback:!!meta.rollback,current:CACHE,stable:STABLE_CACHE,stable_ready:await stableReady()});return}
      if(msg.type==='C360_CLEAR_ROLLBACK'){const meta=await setMeta({rollback:false,rollback_reason:null,rollback_cleared_at:new Date().toISOString()});reply({ok:true,rollback:!!meta.rollback});return}
      reply({ok:false,reason:'unknown-message'});
    }catch(e){reply({ok:false,reason:e&&e.message?e.message:String(e)})}
  })());
});
self.addEventListener('fetch',event=>{
  const req=event.request;if(req.method!=='GET')return;const url=new URL(req.url);if(url.hostname.endsWith('supabase.co'))return;
  if(req.mode==='navigate'){
    event.respondWith((async()=>{
      const shell=isAppShellNavigation(url);const meta=await getMeta();if(meta.rollback){const stable=await stableMatch(req,shell);if(stable)return stable}
      try{const fresh=await fetchWithTimeout(req,4000);if(fresh&&fresh.ok){const cache=await caches.open(CACHE);if(shell){await cache.put('./index.html',fresh.clone());await cache.put('./',fresh.clone())}else await cache.put(req,fresh.clone());return fresh}}catch(_){}
      const cache=await caches.open(CACHE);if(shell){const cached=(await cache.match('./index.html'))||(await cache.match('./'));if(cached)return cached}else{const cached=await cache.match(req);if(cached)return cached}return offlinePage();
    })());return;
  }
  const sameOrigin=url.origin===self.location.origin;const approvedCdn=url.hostname==='cdn.jsdelivr.net';if(!sameOrigin&&!approvedCdn)return;
  event.respondWith((async()=>{
    const meta=await getMeta();if(meta.rollback&&sameOrigin){const stable=await stableMatch(req,false);if(stable)return stable}
    const cache=await caches.open(CACHE);const cached=await cache.match(req);
    const network=fetch(req,{cache:sameOrigin?'no-cache':'default'}).then(async fresh=>{if(fresh&&(fresh.ok||fresh.type==='opaque'))await cache.put(req,fresh.clone());return fresh}).catch(()=>null);
    if(cached){event.waitUntil(network);return cached}return(await network)||Response.error();
  })());
});