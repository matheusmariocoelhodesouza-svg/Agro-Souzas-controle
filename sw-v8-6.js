const CACHE='agro-souzas-controle-v8-6-20260816';
const STATIC=['/app.js','/config.js'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(STATIC)))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const req=e.request,u=new URL(req.url);if(req.mode==='navigate'||u.pathname==='/'||u.pathname.endsWith('/index.html')||u.pathname.endsWith('/app.js')){e.respondWith(fetch(req,{cache:'no-store'}).catch(()=>caches.match(req)));return}e.respondWith(caches.match(req).then(c=>c||fetch(req)))});
