const CACHE='comando360-v6-101';
const CORE=[
  './',
  './index.html',
  './comando360.webmanifest',
  './comando360-icon.svg',
  './c360-device-session.js',
  './c360-login-cleanup.css'
];

async function decorateAppShell(response){
  if(!response || !response.ok)return response;
  const type=(response.headers.get('content-type')||'').toLowerCase();
  if(!type.includes('text/html'))return response;
  let html=await response.text();
  if(!html.includes('c360-device-session.js')){
    const inject='\n<script src="./c360-device-session.js?v=20260914-1"></script>\n<link rel="stylesheet" href="./c360-login-cleanup.css?v=20260914-1">\n';
    html=html.replace(/<head([^>]*)>/i,'<head$1>'+inject);
  }
  const headers=new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

async function refreshCore(){
  const cache=await caches.open(CACHE);
  await Promise.all(CORE.map(async url=>{
    try{
      let response=await fetch(url,{cache:'no-store'});
      if(response && response.ok){
        if(url==='./'||url==='./index.html')response=await decorateAppShell(response);
        await cache.put(url,response.clone());
      }
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
        let fresh=await fetch(req,{cache:'no-store'});
        fresh=await decorateAppShell(fresh);
        if(fresh && fresh.ok){
          const cache=await caches.open(CACHE);
          await cache.put('./index.html',fresh.clone());
          await cache.put('./',fresh.clone());
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
