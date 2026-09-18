import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const PROVIDER="onvio";
const TOKEN_URL="https://auth.thomsonreuters.com/oauth/token";
const STATUS_URL="https://api.onvio.com.br/dominio/status/v2/integration/info";
const CLIENTS_URL="https://api.onvio.com.br/dominio/integration/v2/client/info";
const APP_URL="https://app.comando360.com.br/";

async function sha256(s:string){
 const h=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s));
 return [...new Uint8Array(h)].map(b=>b.toString(16).padStart(2,"0")).join("");
}
function redirect(status:string,msg?:string){
 const u=new URL(APP_URL);
 u.searchParams.set("onvio",status);
 if(msg)u.searchParams.set("onvio_msg",msg.slice(0,180));
 return Response.redirect(u.toString(),302);
}

Deno.serve(async(req:Request)=>{
 const url=Deno.env.get("SUPABASE_URL");
 const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!url||!serviceKey) return redirect("error","Servidor sem configuração");
 const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
 const u=new URL(req.url);
 const code=(u.searchParams.get("code")||"").trim();
 const state=(u.searchParams.get("state")||"").trim();
 const oauthError=(u.searchParams.get("error_description")||u.searchParams.get("error")||"").trim();
 if(oauthError) return redirect("error",oauthError);
 if(!code||!state) return redirect("error","Retorno OAuth incompleto.");

 try{
   const stateHash=await sha256(state);
   const {data:st,error:stErr}=await admin.from("v2_integration_oauth_states").select("*").eq("provider",PROVIDER).eq("state_hash",stateHash).is("used_at",null).gt("expires_at",new Date().toISOString()).maybeSingle();
   if(stErr||!st) return redirect("error","Autorização expirada ou inválida.");
   await admin.from("v2_integration_oauth_states").update({used_at:new Date().toISOString()}).eq("id",st.id);

   const companyId=st.company_id;
   const {data:cred,error:credErr}=await admin.from("v2_integration_credentials").select("*").eq("company_id",companyId).eq("provider",PROVIDER).maybeSingle();
   if(credErr||!cred?.client_id||!cred?.client_secret) return redirect("error","Credenciais OAuth não encontradas.");

   const basic=btoa(cred.client_id+":"+cred.client_secret);
   const tr=await fetch(TOKEN_URL,{
     method:"POST",
     headers:{"Authorization":"Basic "+basic,"Content-Type":"application/x-www-form-urlencoded"},
     body:new URLSearchParams({grant_type:"authorization_code",redirect_uri:cred.redirect_uri,code})
   });
   const tj=await tr.json().catch(()=>({}));
   if(!tr.ok||!tj.access_token) throw new Error(tj.error_description||tj.error||"Falha ao trocar autorização por token.");

   const expires=Number(tj.expires_in||0);
   const now=new Date();
   await admin.from("v2_integration_credentials").update({
     access_token:tj.access_token,refresh_token:tj.refresh_token||null,id_token:tj.id_token||null,
     token_type:tj.token_type||"Bearer",scope:tj.scope||null,
     token_expires_at:expires?new Date(Date.now()+expires*1000).toISOString():null
   }).eq("id",cred.id);

   const headers={Authorization:"Bearer "+tj.access_token,Accept:"application/json"};
   const sr=await fetch(STATUS_URL,{headers});
   if(!sr.ok) throw new Error("OAuth concluído, mas o Onvio recusou o teste de integração ("+sr.status+").");

   let clients:any[]=[];
   for(let page=1;page<=20;page++){
     const cr=await fetch(CLIENTS_URL+"?pageIndex="+page,{headers});
     if(!cr.ok) break;
     const cj=await cr.json().catch(()=>({}));
     const list=Array.isArray(cj.clients)?cj.clients:[];
     clients.push(...list);
     if(page>=Number(cj.totalPages||1)) break;
   }
   const safe=clients.map(x=>({id:x.id||null,name:x.name||"Cliente Onvio",nationalIdentity:x.nationalIdentity||null,nationalIdentityKind:x.nationalIdentityKind||null}));
   const {data:old}=await admin.from("v2_integrations").select("config").eq("company_id",companyId).eq("provider",PROVIDER).maybeSingle();
   const config={...(old?.config||{}),accessible_clients:safe,oauth_verified_at:now.toISOString()};
   await admin.from("v2_integrations").upsert({company_id:companyId,provider:PROVIDER,status:"connected",enabled:true,display_name:"Thomson Reuters Onvio",config,last_connected_at:now.toISOString(),last_error:null},{onConflict:"company_id,provider"});

   return redirect("connected");
 }catch(e){
   const msg=e instanceof Error?e.message:String(e);
   try{
     const stateHash=await sha256(state);
     const {data:st}=await admin.from("v2_integration_oauth_states").select("company_id").eq("state_hash",stateHash).maybeSingle();
     if(st?.company_id) await admin.from("v2_integrations").upsert({company_id:st.company_id,provider:PROVIDER,status:"error",last_error:msg},{onConflict:"company_id,provider"});
   }catch(_){ }
   return redirect("error",msg);
 }
});
