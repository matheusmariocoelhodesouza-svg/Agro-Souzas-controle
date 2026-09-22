/* Comando 360 — proteção de refresh token do Supabase.
   Serializa/reaproveita a mesma rotação de refresh token entre PWA, abas e contextos
   controlados pelo mesmo service worker, evitando "Invalid Refresh Token: Already Used". */
'use strict';

const C360_AUTH_REFRESH_GUARD_VERSION='2026.09.22-r2';
const C360_REFRESH_REUSE_MS=2*60*1000;
const c360RefreshFlights=new Map();

function c360IsRefreshRequest(req){
  try{
    if(!req||String(req.method||'GET').toUpperCase()!=='POST')return false;
    const url=new URL(req.url);
    return url.hostname.endsWith('.supabase.co')&&
      url.pathname==='/auth/v1/token'&&
      url.searchParams.get('grant_type')==='refresh_token';
  }catch(_){return false}
}

async function c360RefreshKey(req){
  try{
    const text=await req.clone().text();
    const data=JSON.parse(text||'{}');
    return typeof data.refresh_token==='string'&&data.refresh_token?data.refresh_token:null;
  }catch(_){return null}
}

async function c360SnapshotResponse(response){
  const body=await response.arrayBuffer();
  return {
    ok:response.ok,
    status:response.status,
    statusText:response.statusText,
    headers:[...response.headers.entries()],
    body
  };
}

function c360ResponseFromSnapshot(snapshot){
  return new Response(snapshot.body.slice(0),{
    status:snapshot.status,
    statusText:snapshot.statusText,
    headers:new Headers(snapshot.headers)
  });
}

async function c360HandleRefresh(req){
  const key=await c360RefreshKey(req);
  if(!key)return fetch(req);

  const existing=c360RefreshFlights.get(key);
  if(existing&&Date.now()-existing.createdAt<C360_REFRESH_REUSE_MS){
    try{
      const snapshot=await existing.promise;
      return c360ResponseFromSnapshot(snapshot);
    }catch(_){
      if(c360RefreshFlights.get(key)===existing)c360RefreshFlights.delete(key);
    }
  }

  const entry={createdAt:Date.now(),promise:null};
  entry.promise=(async()=>{
    const response=await fetch(req);
    return await c360SnapshotResponse(response);
  })();
  c360RefreshFlights.set(key,entry);

  try{
    const snapshot=await entry.promise;
    if(snapshot.ok){
      setTimeout(()=>{
        const current=c360RefreshFlights.get(key);
        if(current===entry)c360RefreshFlights.delete(key);
      },C360_REFRESH_REUSE_MS);
    }else if(c360RefreshFlights.get(key)===entry){
      c360RefreshFlights.delete(key);
    }
    return c360ResponseFromSnapshot(snapshot);
  }catch(error){
    if(c360RefreshFlights.get(key)===entry)c360RefreshFlights.delete(key);
    throw error;
  }
}

self.addEventListener('fetch',event=>{
  if(!c360IsRefreshRequest(event.request))return;
  event.respondWith(c360HandleRefresh(event.request));
});

self.C360_AUTH_REFRESH_GUARD_VERSION=C360_AUTH_REFRESH_GUARD_VERSION;
