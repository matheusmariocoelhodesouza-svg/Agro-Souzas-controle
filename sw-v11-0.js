const CACHE='agro-souzas-v11-0-20260817';
self.addEventListener('install',event=>{self.skipWaiting();});
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
 const isCore=url.origin===self.location.origin &&
   (req.mode==='navigate' || url.pathname.endsWith('/app.js') || url.pathname.endsWith('/config.js') || url.pathname.endsWith('/index.html') || url.pathname==='/');
 if(isCore){
   event.respondWith((async()=>{
     try{
       const fresh=await fetch(req,{cache:'no-store'});
       const c=await caches.open(CACHE);
       c.put(req,fresh.clone());
       return fresh;
     }catch(e){
       const cached=await caches.match(req);
       if(cached)return cached;
       throw e;
     }
   })());
   return;
 }
 event.respondWith((async()=>{
   const cached=await caches.match(req);
   if(cached)return cached;
   const fresh=await fetch(req);
   if(fresh && fresh.ok && url.origin===self.location.origin){
     const c=await caches.open(CACHE);
     c.put(req,fresh.clone());
   }
   return fresh;
 })());
});