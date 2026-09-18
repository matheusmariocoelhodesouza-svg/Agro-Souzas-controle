import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const PROVIDER = "onvio";
const AUTHORIZE_URL = "https://auth.thomsonreuters.com/authorize";
const TOKEN_URL = "https://auth.thomsonreuters.com/oauth/token";
const AUDIENCE = "409f91f6-dc17-44c8-a5d8-e0a1bafd8b67";
const STATUS_URL = "https://api.onvio.com.br/dominio/status/v2/integration/info";
const CLIENTS_URL = "https://api.onvio.com.br/dominio/integration/v2/client/info";

function json(body: unknown, status=200){ return new Response(JSON.stringify(body),{status,headers:cors}); }
function clean(s: unknown){ return String(s ?? "").trim(); }
async function sha256(s:string){
  const data=new TextEncoder().encode(s);
  const hash=await crypto.subtle.digest("SHA-256",data);
  return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,"0")).join("");
}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS") return new Response("ok",{headers:cors});
  if(req.method!=="POST") return json({error:"Método não permitido"},405);

  const url=Deno.env.get("SUPABASE_URL");
  const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!url||!serviceKey) return json({error:"Servidor sem configuração"},500);

  const auth=clean(req.headers.get("authorization"));
  const token=auth.replace(/^Bearer\s+/i,"");
  if(!token) return json({error:"Sessão administrativa necessária"},401);

  const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:userData,error:userErr}=await admin.auth.getUser(token);
  const user=userData?.user;
  if(userErr||!user) return json({error:"Sessão expirada"},401);

  let body:any={};
  try{ body=await req.json(); }catch{ return json({error:"Dados inválidos"},400); }
  const companyId=clean(body.company_id);
  const action=clean(body.action)||"status";
  if(!companyId) return json({error:"Empresa não informada"},400);

  async function canManage(){
    const {data:member}=await admin.from("v2_company_members").select("id,role_id,status").eq("company_id",companyId).eq("user_id",user.id).eq("status","active").maybeSingle();
    if(!member) return false;
    const {data:perm}=await admin.from("v2_permissions").select("id").eq("code","documents.manage").maybeSingle();
    if(!perm) return false;
    const {data:override}=await admin.from("v2_member_permissions").select("allowed").eq("member_id",member.id).eq("permission_id",perm.id).maybeSingle();
    if(override) return override.allowed===true;
    const {data:rolePerm}=await admin.from("v2_role_permissions").select("allowed").eq("role_id",member.role_id).eq("permission_id",perm.id).maybeSingle();
    return rolePerm?.allowed===true;
  }
  if(!await canManage()) return json({error:"Sem permissão para gerenciar integrações"},403);

  const callbackUrl=url+"/functions/v1/comando360-onvio-callback";

  async function credentials(){
    const {data,error}=await admin.from("v2_integration_credentials").select("*").eq("company_id",companyId).eq("provider",PROVIDER).maybeSingle();
    if(error) throw error;
    return data;
  }

  async function saveTokens(cred:any,t:any){
    const expires=Number(t.expires_in||0);
    const patch={
      access_token:t.access_token||null,
      refresh_token:t.refresh_token||cred?.refresh_token||null,
      id_token:t.id_token||null,
      token_type:t.token_type||"Bearer",
      scope:t.scope||null,
      token_expires_at:expires?new Date(Date.now()+expires*1000).toISOString():null,
      updated_at:new Date().toISOString()
    };
    const {error}=await admin.from("v2_integration_credentials").update(patch).eq("company_id",companyId).eq("provider",PROVIDER);
    if(error) throw error;
    return {...cred,...patch};
  }

  async function refreshIfNeeded(cred:any){
    if(!cred) throw new Error("Credenciais do Onvio ainda não configuradas.");
    if(cred.access_token && (!cred.token_expires_at || new Date(cred.token_expires_at).getTime()>Date.now()+90000)) return cred;
    if(!cred.refresh_token) throw new Error("Onvio ainda não autorizado.");
    const basic=btoa(cred.client_id+":"+cred.client_secret);
    const tr=await fetch(TOKEN_URL,{
      method:"POST",
      headers:{"Authorization":"Basic "+basic,"Content-Type":"application/x-www-form-urlencoded"},
      body:new URLSearchParams({grant_type:"refresh_token",refresh_token:cred.refresh_token})
    });
    const tj=await tr.json().catch(()=>({}));
    if(!tr.ok) throw new Error(tj.error_description||tj.error||"Não foi possível renovar a autorização do Onvio.");
    return await saveTokens(cred,tj);
  }

  async function probe(cred:any){
    cred=await refreshIfNeeded(cred);
    const headers={Authorization:"Bearer "+cred.access_token,Accept:"application/json"};
    const sr=await fetch(STATUS_URL,{headers});
    const statusText=await sr.text();
    if(!sr.ok) throw new Error("Onvio recusou o teste de integração ("+sr.status+").");
    let clients:any[]=[];
    for(let page=1;page<=20;page++){
      const cr=await fetch(CLIENTS_URL+"?pageIndex="+page,{headers});
      if(!cr.ok) break;
      const cj=await cr.json().catch(()=>({}));
      const pageClients=Array.isArray(cj.clients)?cj.clients:[];
      clients.push(...pageClients);
      const totalPages=Number(cj.totalPages||1);
      if(page>=totalPages) break;
    }
    const safeClients=clients.map(x=>({id:x.id||null,name:x.name||"Cliente Onvio",nationalIdentity:x.nationalIdentity||null,nationalIdentityKind:x.nationalIdentityKind||null}));
    const {data:intRow}=await admin.from("v2_integrations").select("config").eq("company_id",companyId).eq("provider",PROVIDER).maybeSingle();
    const cfg={...(intRow?.config||{}),accessible_clients:safeClients,api_status:statusText.slice(0,1000),oauth_verified_at:new Date().toISOString()};
    const {error:intErr}=await admin.from("v2_integrations").upsert({company_id:companyId,provider:PROVIDER,status:"connected",enabled:true,config:cfg,last_connected_at:new Date().toISOString(),last_error:null},{onConflict:"company_id,provider"});
    if(intErr) throw intErr;
    return safeClients;
  }

  try{
    if(action==="status"){
      const [{data:integration},{data:cred}]=await Promise.all([
        admin.from("v2_integrations").select("*").eq("company_id",companyId).eq("provider",PROVIDER).maybeSingle(),
        admin.from("v2_integration_credentials").select("client_id,redirect_uri,refresh_token,token_expires_at").eq("company_id",companyId).eq("provider",PROVIDER).maybeSingle()
      ]);
      return json({integration:integration||{provider:PROVIDER,status:"not_configured",enabled:false,config:{}},credentials_configured:!!cred?.client_id,authorized:!!cred?.refresh_token,callback_url:callbackUrl,client_id:cred?.client_id||null,token_expires_at:cred?.token_expires_at||null});
    }

    if(action==="save_credentials"){
      const clientId=clean(body.client_id),clientSecret=clean(body.client_secret);
      if(!clientId||!clientSecret) return json({error:"Informe client_id e client_secret enviados pela Thomson Reuters."},400);
      const {error:credErr}=await admin.from("v2_integration_credentials").upsert({company_id:companyId,provider:PROVIDER,client_id:clientId,client_secret:clientSecret,redirect_uri:callbackUrl,access_token:null,refresh_token:null,id_token:null,token_expires_at:null},{onConflict:"company_id,provider"});
      if(credErr) throw credErr;
      const {error:intErr}=await admin.from("v2_integrations").upsert({company_id:companyId,provider:PROVIDER,status:"credentials_ready",enabled:false,display_name:"Thomson Reuters Onvio",last_error:null},{onConflict:"company_id,provider"});
      if(intErr) throw intErr;
      return json({ok:true,callback_url:callbackUrl});
    }

    if(action==="connect"){
      const cred=await credentials();
      if(!cred?.client_id||!cred?.client_secret) return json({error:"Primeiro salve as credenciais OAuth enviadas pela Thomson Reuters."},400);
      const rawState=crypto.randomUUID()+"."+crypto.randomUUID();
      const stateHash=await sha256(rawState);
      const {error:stateErr}=await admin.from("v2_integration_oauth_states").insert({company_id:companyId,provider:PROVIDER,state_hash:stateHash,created_by:user.id,expires_at:new Date(Date.now()+10*60*1000).toISOString()});
      if(stateErr) throw stateErr;
      const {error:intErr}=await admin.from("v2_integrations").upsert({company_id:companyId,provider:PROVIDER,status:"authorizing",display_name:"Thomson Reuters Onvio"},{onConflict:"company_id,provider"});
      if(intErr) throw intErr;
      const u=new URL(AUTHORIZE_URL);
      u.searchParams.set("client_id",cred.client_id);
      u.searchParams.set("response_type","code");
      u.searchParams.set("audience",AUDIENCE);
      u.searchParams.set("redirect_uri",cred.redirect_uri||callbackUrl);
      u.searchParams.set("scope","openid profile email offline_access");
      u.searchParams.set("state",rawState);
      return json({ok:true,authorize_url:u.toString()});
    }

    if(action==="test"){ const clients=await probe(await credentials()); return json({ok:true,clients}); }

    if(action==="select_client"){
      const externalId=clean(body.external_account_id),externalName=clean(body.external_account_name);
      if(!externalId) return json({error:"Selecione a empresa do Onvio."},400);
      const {data:row}=await admin.from("v2_integrations").select("config").eq("company_id",companyId).eq("provider",PROVIDER).maybeSingle();
      const cfg={...(row?.config||{}),selected_client_id:externalId,selected_client_name:externalName||null};
      const {error}=await admin.from("v2_integrations").upsert({company_id:companyId,provider:PROVIDER,external_account_id:externalId,external_account_name:externalName||null,config:cfg},{onConflict:"company_id,provider"});
      if(error) throw error;
      return json({ok:true});
    }

    if(action==="disconnect"){
      await admin.from("v2_integration_credentials").update({access_token:null,refresh_token:null,id_token:null,token_expires_at:null}).eq("company_id",companyId).eq("provider",PROVIDER);
      await admin.from("v2_integrations").update({status:"disconnected",enabled:false,last_error:null}).eq("company_id",companyId).eq("provider",PROVIDER);
      return json({ok:true});
    }

    return json({error:"Ação desconhecida"},400);
  }catch(e){
    const msg=e instanceof Error?e.message:String(e);
    try{await admin.from("v2_integrations").upsert({company_id:companyId,provider:PROVIDER,status:"error",last_error:msg},{onConflict:"company_id,provider"});}catch(_){ }
    return json({error:msg},500);
  }
});
