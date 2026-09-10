const CACHE='comando360-v8-00';
const CORE=[
  './',
  './index.html',
  './comando360.webmanifest',
  './comando360-icon.svg',
  './c360-core-network.js',
  './c360-core-ui.js'
];

async function fetchWithTimeout(request,ms=4000){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),ms);
  try{return await fetch(request,{cache:'no-store',signal:controller.signal})}
  finally{clearTimeout(timer)}
}

async function warmShell(){
  const cache=await caches.open(CACHE);
  const results=await Promise.allSettled(CORE.map(async url=>{
    const r=await fetchWithTimeout(url,6000);
    if(!r?.ok)throw new Error('HTTP '+(r?.status||0)+' '+url);
    await cache.put(url,r.clone());
    return url;
  }));
  const ok=results.some((r,i)=>r.status==='fulfilled'&&(CORE[i]==='./'||CORE[i]==='./index.html'));
  if(!ok){
    const cached=(await cache.match('./index.html'))||(await cache.match('./'));
    if(!cached)throw new Error('APP_SHELL_NOT_READY');
  }
}

self.addEventListener('install',event=>{
  self.skipWaiting();
  event.waitUntil(warmShell());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    await warmShell().catch(()=>{});
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k.startsWith('comando360-')&&k!==CACHE).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.hostname.endsWith('supabase.co'))return;

  if(req.mode==='navigate'){
    event.respondWith((async()=>{
      try{
        const fresh=await fetchWithTimeout(req,3000);
        if(fresh?.ok){
          const cache=await caches.open(CACHE);
          await cache.put('./index.html',fresh.clone());
          await cache.put('./',fresh.clone());
          return fresh;
        }
      }catch(_){}
      const cached=(await caches.match('./index.html'))||(await caches.match('./'));
      if(cached)return cached;
      return new Response('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Comando 360</title><body style="font-family:system-ui;padding:24px"><h2>Comando 360</h2><p>Este aparelho ainda não possui a cópia offline do aplicativo. Conecte à internet, abra o Comando 360 uma vez e tente novamente.</p></body>',{headers:{'Content-Type':'text/html; charset=utf-8'}});
    })());
    return;
  }

  const sameOrigin=url.origin===self.location.origin;
  const approvedCdn=url.hostname==='cdn.jsdelivr.net';
  if(!sameOrigin&&!approvedCdn)return;

  event.respondWith((async()=>{
    const cached=await caches.match(req);
    const network=fetch(req,{cache:sameOrigin?'no-cache':'default'}).then(async fresh=>{
      if(fresh&&(fresh.ok||fresh.type==='opaque')){
        const cache=await caches.open(CACHE);
        await cache.put(req,fresh.clone());
      }
      return fresh;
    }).catch(()=>null);
    if(cached){event.waitUntil(network);return cached}
    return (await network)||Response.error();
  })());
});
