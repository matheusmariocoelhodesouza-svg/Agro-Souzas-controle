const CACHE='agro-souzas-equipe-v6-19';
const CORE=[
  './',
  './index.html',
  './agro-souzas-controle-v7.webmanifest',
  './agro-souzas-controle-192-v6.png',
  './agro-souzas-controle-512-v6.png',
  './apple-touch-icon-180.png'
];

self.addEventListener('install',event=>{
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then(cache=>
      Promise.all(CORE.map(url=>cache.add(url).catch(()=>null)))
    )
  );
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)));
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
        const cache=await caches.open(CACHE);
        cache.put('./index.html',fresh.clone()).catch(()=>{});
        return fresh;
      }catch(_){
        return (await caches.match(req)) ||
               (await caches.match('./index.html')) ||
               (await caches.match('./'));
      }
    })());
    return;
  }

  const cacheable=url.origin===self.location.origin || url.hostname==='cdn.jsdelivr.net';
  if(!cacheable)return;

  event.respondWith((async()=>{
    const cached=await caches.match(req);
    if(cached)return cached;
    try{
      const fresh=await fetch(req);
      if(fresh && (fresh.ok || fresh.type==='opaque')){
        const cache=await caches.open(CACHE);
        cache.put(req,fresh.clone()).catch(()=>{});
      }
      return fresh;
    }catch(_){
      return cached;
    }
  })());
});
