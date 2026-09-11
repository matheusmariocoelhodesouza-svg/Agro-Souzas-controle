const CACHE='comando360-v7-02-hotfix3';
const CORE=[
  './',
  './index.html',
  './comando360.webmanifest',
  './comando360-icon.svg',
  './c360-field-offline-hotfix.js',
  './c360-quality-hotfix.js'
];

async function fetchWithTimeout(request,ms=3500){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),ms);
  try{
    return await fetch(request,{cache:'no-store',signal:controller.signal});
  }finally{
    clearTimeout(timer);
  }
}

async function patchAppHtml(response){
  if(!response)return response;
  try{
    const type=response.headers.get('content-type')||'';
    if(type&&!type.includes('text/html'))return response;
    let html=await response.text();
    if(!html.includes('c360-field-offline-hotfix.js')){
      const marker="<script>\n'use strict';";
      if(html.includes(marker)){
        html=html.replace(marker,"<script src=\"./c360-field-offline-hotfix.js\"></script>\n"+marker);
      }else{
        html=html.replace('</head>','<script src="./c360-field-offline-hotfix.js"></script></head>');
      }
    }
    if(!html.includes('c360-quality-hotfix.js')){
      const quality='<script src="./c360-quality-hotfix.js"></script>';
      if(html.includes('</body>'))html=html.replace('</body>',quality+'</body>');
      else html+=quality;
    }
    html=html.replaceAll('navigator.onLine','c360NetOnline()');
    const headers=new Headers(response.headers);
    headers.delete('content-length');
    headers.delete('content-encoding');
    return new Response(html,{status:response.status,statusText:response.statusText,headers});
  }catch(_){
    return response;
  }
}

function isAppShellNavigation(url){
  const path=url.pathname.replace(/\/+$/,'/');
  const scopePath=new URL(self.registration.scope).pathname.replace(/\/+$/,'/');
  return path===scopePath || path===scopePath+'index.html';
}

function offlinePage(){
  return new Response('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Comando 360</title><body style="font-family:system-ui;padding:24px"><h2>Comando 360</h2><p>Esta tela precisa de internet e ainda não possui uma cópia offline neste aparelho. Volte ao painel principal ou conecte-se à internet.</p><p><a href="./">Voltar ao Comando 360</a></p></body>',{headers:{'Content-Type':'text/html; charset=utf-8'}});
}

async function prepareCore(){
  const cache=await caches.open(CACHE);
  let hasShell=false;
  for(const url of CORE){
    try{
      const response=await fetchWithTimeout(url,5000);
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
      const shell=isAppShellNavigation(url);
      try{
        const fresh=await fetchWithTimeout(req,2500);
        if(fresh&&fresh.ok){
          const cache=await caches.open(CACHE);
          if(shell){
            await cache.put('./index.html',fresh.clone());
            await cache.put('./',fresh.clone());
            return await patchAppHtml(fresh);
          }
          await cache.put(req,fresh.clone());
          return fresh;
        }
      }catch(_){}

      if(shell){
        const cached=(await caches.match('./index.html'))||(await caches.match('./'));
        if(cached)return await patchAppHtml(cached);
      }else{
        const cached=await caches.match(req);
        if(cached)return cached;
      }
      return offlinePage();
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
