const CACHE='comando360-v7-02';
const CORE=[
  './',
  './index.html',
  './comando360.webmanifest',
  './comando360-icon.svg'
];

async function fetchWithTimeout(request,ms=4500){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),ms);
  try{
    return await fetch(request,{cache:'no-store',signal:controller.signal});
  }finally{
    clearTimeout(timer);
  }
}

async function prepareCore(){
  const cache=await caches.open(CACHE);
  let hasShell=false;
  for(const url of CORE){
    try{
      const response=await fetchWithTimeout(url,6000);
      if(response&&response.ok){
        await cache.put(url,response.clone());
        if(url==='./'||url==='./index.html')hasShell=true;
      }
    }catch(_){}
  }
  if(!hasShell){
    const cachedIndex=await cache.match('./index.html');
    const cachedRoot=await cache.match('./');
    hasShell=!!(cachedIndex||cachedRoot);
  }
  if(!hasShell)throw new Error('APP_SHELL_NOT_READY');
}

self.addEventListener('install',event=>{
  self.skipWaiting();
  event.waitUntil(prepareCore());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    // Só remove caches antigos depois de confirmar que a versão atual
    // já possui uma cópia funcional do app para uso offline.
    await prepareCore();
    const current=await caches.open(CACHE);
    const ready=await current.match('./index.html')||await current.match('./');
    if(ready){
      const keys=await caches.keys();
      await Promise.all(keys.filter(k=>k.startsWith('comando360-')&&k!==CACHE).map(k=>caches.delete(k)));
    }
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
        const fresh=await fetchWithTimeout(req,4500);
        if(fresh&&fresh.ok){
          const cache=await caches.open(CACHE);
          await cache.put('./index.html',fresh.clone());
          await cache.put('./',fresh.clone());
          return fresh;
        }
      }catch(_){}

      // Se estiver sem internet, aceita também um shell de versão anterior.
      return (await caches.match('./index.html'))||
             (await caches.match('./'))||
             new Response('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Comando 360</title><body style="font-family:system-ui;padding:24px"><h2>Comando 360</h2><p>O aplicativo está sem internet e não encontrou uma cópia offline pronta. Conecte uma vez à internet, abra o app e depois ele continuará funcionando offline.</p></body>',{headers:{'Content-Type':'text/html; charset=utf-8'}});
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

    if(cached){
      event.waitUntil(network);
      return cached;
    }
    return (await network)||Response.error();
  })());
});
