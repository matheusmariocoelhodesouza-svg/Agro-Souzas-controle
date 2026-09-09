const CACHE='comando360-v7-01';
const CORE=[
  './',
  './index.html',
  './comando360.webmanifest',
  './comando360-icon.svg'
];

async function refreshCore(){
  const cache=await caches.open(CACHE);
  await Promise.all(CORE.map(async url=>{
    try{
      const response=await fetch(url,{cache:'no-store'});
      if(response && response.ok) await cache.put(url,response.clone());
    }catch(_){}
  }));
}

self.addEventListener('install',event=>{
  self.skipWaiting();
  event.waitUntil(refreshCore());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)));
    await refreshCore();
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
        const fresh=await fetch(req,{cache:'no-store'});
        if(fresh && fresh.ok){
          const cache=await caches.open(CACHE);
          await cache.put('./index.html',fresh.clone());
        }
        return fresh;
      }catch(_){
        return (await caches.match('./index.html')) ||
               (await caches.match('./')) ||
               Response.error();
      }
    })());
    return;
  }

  const sameOrigin=url.origin===self.location.origin;
  const approvedCdn=url.hostname==='cdn.jsdelivr.net';
  if(!sameOrigin&&!approvedCdn)return;

  event.respondWith((async()=>{
    const cached=await caches.match(req);
    const network=fetch(req,{cache:sameOrigin?'no-cache':'default'}).then(async fresh=>{
      if(fresh && (fresh.ok || fresh.type==='opaque')){
        const cache=await caches.open(CACHE);
        await cache.put(req,fresh.clone());
      }
      return fresh;
    }).catch(()=>null);

    if(cached){
      event.waitUntil(network);
      return cached;
    }
    return (await network) || Response.error();
  })());
});
