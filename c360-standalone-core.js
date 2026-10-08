(()=>{
'use strict';
if(window.C360Standalone)return;
const API=window.SUPABASE_URL,KEY=window.SUPABASE_PUBLISHABLE_KEY;
let refreshing=null;
function session(){try{return JSON.parse(localStorage.getItem('controla_beta_session')||'null')}catch{return null}}
function saveSession(s){const old=session();if(old?.refresh_token&&old.refresh_token!==s.refresh_token)localStorage.setItem('c360_previous_refresh_token',old.refresh_token);localStorage.setItem('controla_beta_session',JSON.stringify(s))}
async function requestJSON(url,options={},timeoutMs=20000){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
 try{
  const r=await fetch(url,{...options,signal:controller.signal}),raw=await r.text();let data;
  try{data=raw?JSON.parse(raw):null}catch{data=raw}
  if(!r.ok){const e=new Error(data?.message||data?.error_description||data?.detail||data?.error||('HTTP '+r.status));e.status=r.status;e.code=data?.code;throw e}
  return data;
 }catch(e){if(e.name==='AbortError')throw new Error('A conexão demorou demais. Tente conferir novamente.');throw e}
 finally{clearTimeout(timer)}
}
async function refresh(){
 if(refreshing)return refreshing;
 refreshing=(async()=>{
  const s=session();if(!s?.refresh_token)throw new Error('Sessão expirada. Entre novamente no Comando 360.');
  const send=refreshToken=>requestJSON(API+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:refreshToken})});
  let fresh;
  try{fresh=await send(s.refresh_token)}catch(e){const latest=session();if((e.status===400||e.status===401)&&latest?.refresh_token&&latest.refresh_token!==s.refresh_token)fresh=await send(latest.refresh_token);else throw e}
  if(!fresh?.access_token)throw new Error('Não foi possível renovar a sessão.');saveSession(fresh);return fresh;
 })();
 try{return await refreshing}finally{refreshing=null}
}
async function token(){let s=session();if(!s?.access_token)throw new Error('Entre no Comando 360 antes de abrir esta tela.');if(Number(s.expires_at)&&Number(s.expires_at)-Math.floor(Date.now()/1000)<90)s=await refresh();return s.access_token}
async function api(path,options={}){
 const {timeoutMs=20000,...opts}=options;
 const send=t=>requestJSON(API+path,{...opts,headers:{apikey:KEY,Authorization:'Bearer '+t,'Content-Type':'application/json',Prefer:'return=representation',...(opts.headers||{})}},timeoutMs);
 const t=await token();try{return await send(t)}catch(e){if(e.status!==401)throw e;const fresh=await refresh();return send(fresh.access_token)}
}
async function resolveCompany(){
 const uid=session()?.user?.id;if(!uid)throw new Error('Abra esta tela pelo menu do Comando 360 depois de entrar.');
 const requested=new URL(location.href).searchParams.get('company');
 const members=await api('/rest/v1/v2_company_members?select=company_id&user_id=eq.'+encodeURIComponent(uid)+'&status=eq.active');
 const ids=[...new Set((members||[]).map(x=>x.company_id))];
 if(requested&&!ids.includes(requested))throw new Error('A empresa informada não está disponível para esta conta.');
 if(!ids.length)throw new Error('Sua conta não está vinculada a uma empresa ativa.');
 const filter=requested?'id=eq.'+encodeURIComponent(requested):'id=in.('+ids.map(encodeURIComponent).join(',')+')';
 let companies=await api('/rest/v1/v2_companies?select=id,legal_name,trade_name,tax_id&status=eq.active&'+filter);
 if(!requested)companies=(companies||[]).filter(x=>!String(x.legal_name||'').toUpperCase().includes('DADOS FICTÍCIOS'));
 if(companies?.length!==1)throw new Error('Abra esta tela pelo menu da empresa desejada no Comando 360.');
 return companies[0];
}
async function insertOnce(table,body,id){
 if(!/^[a-z0-9_]+$/.test(table)||!id||!body.company_id)throw new Error('Não foi possível identificar este registro.');
 const path='/rest/v1/'+table,query='?select=*&company_id=eq.'+encodeURIComponent(body.company_id)+'&id=eq.'+encodeURIComponent(id)+'&limit=1';
 const existing=await api(path+query);if(existing?.length)return existing;
 try{return await api(path,{method:'POST',body:JSON.stringify({...body,id})})}
 catch(e){try{const recovered=await api(path+query);if(recovered?.length)return recovered}catch{}throw e}
}
function draftId(key){let id=sessionStorage.getItem(key);if(!id){id=crypto.randomUUID();sessionStorage.setItem(key,id)}return id}
window.C360Standalone=Object.freeze({version:'2026.10.07-standalone1',api,resolveCompany,insertOnce,draftId});
})();
