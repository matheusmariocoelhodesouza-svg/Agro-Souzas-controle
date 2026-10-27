const CACHE='o360-scan-pro-lab-v1';
const ASSETS=['./','./index.html','./scan-pro.css','./app.mjs','./protocols.mjs','./simulator.mjs','./recordings.mjs','./assistant.mjs'].map(path=>new URL(path,self.location.href).href);
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('o360-scan-pro-lab-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||!ASSETS.some(path=>new URL(path).pathname===new URL(event.request.url).pathname)||new URL(event.request.url).origin!==self.location.origin)return;
  event.respondWith(fetch(event.request).then(response=>{if(response.ok)caches.open(CACHE).then(cache=>cache.put(event.request,response.clone())).catch(()=>{});return response;}).catch(()=>caches.match(event.request).then(cached=>cached||(event.request.mode==='navigate'?caches.match(ASSETS[1]):Response.error()))));
});
