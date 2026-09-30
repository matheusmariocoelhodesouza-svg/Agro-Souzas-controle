/* Comando 360 — Android/PWA share target para imagens enviadas à IA. */
(()=>{
'use strict';
const SHARE_CACHE='comando360-share-inbox-v1';
const SHARE_KEY='./__assistant360_shared_image__';
const MAX_SIZE=15*1024*1024;

function redirect(mode){
  const url=new URL('./?c360_share='+encodeURIComponent(mode)+'#ia',self.registration.scope);
  return Response.redirect(url.href,303);
}
function isShareTarget(url){
  const scopePath=new URL(self.registration.scope).pathname.replace(/\/+$/,'');
  return url.origin===self.location.origin&&url.pathname===scopePath+'/share-target';
}
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='POST')return;
  const url=new URL(req.url);
  if(!isShareTarget(url))return;
  event.respondWith((async()=>{
    try{
      const data=await req.formData();
      const candidates=[...data.getAll('media'),...data.getAll('files')].filter(v=>v&&typeof v.arrayBuffer==='function');
      const file=candidates[0];
      if(!file)return redirect('missing');
      if(!String(file.type||'').startsWith('image/'))return redirect('unsupported');
      if(Number(file.size||0)>MAX_SIZE)return redirect('too-large');
      const cache=await caches.open(SHARE_CACHE);
      const key=new URL(SHARE_KEY,self.registration.scope).href;
      const headers=new Headers({'Content-Type':file.type||'image/jpeg','Cache-Control':'no-store'});
      try{headers.set('X-C360-File-Name',encodeURIComponent(file.name||'imagem-compartilhada.jpg'))}catch{}
      await cache.put(key,new Response(file,{headers}));
      return redirect('1');
    }catch(e){
      console.error('Comando 360 share target',e);
      return redirect('error');
    }
  })());
});
})();
