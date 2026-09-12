import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { unzipSync } from "npm:fflate@0.8.2";

const CORS={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":"POST, OPTIONS"
};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...CORS,"Content-Type":"application/json; charset=utf-8"}});
const norm=(v:unknown)=>String(v??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\s+/g," ").trim();
const clean=(v:unknown)=>String(v??"").replace(/[\u200e\u200f\u202a-\u202e]/g,"").replace(/\s+/g," ").trim();
const mapRe=/(https?:\/\/(?:maps\.app\.goo\.gl|goo\.gl\/maps|maps\.google\.[a-z.]+|www\.google\.[a-z.]+\/maps)[^\s<>"']+)/ig;
const skipLineRe=/^(?:imagem|foto|vídeo|video|áudio|audio|figurinha|sticker|arquivo|documento|mídia|midia|mensagem apagada|chamada|localização|localizacao)(?:\s|$)/i;

function decodeBytes(bytes:Uint8Array){
  let text=new TextDecoder("utf-8",{fatal:false}).decode(bytes);
  const bad=(text.match(/�/g)||[]).length;
  if(bad>Math.max(3,text.length/5000)){
    try{text=new TextDecoder("windows-1252").decode(bytes)}catch(_){ }
  }
  return text.replace(/^\uFEFF/,"");
}

function whatsappBlocks(raw:string){
  const lines=raw.replace(/\r\n?/g,"\n").split("\n");
  const start=/^(?:\[)?\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}(?:,|\s)\s*\d{1,2}:\d{2}(?:\s*[AP]M)?(?:\])?\s*(?:-|–|—)\s*/i;
  const out:{text:string,index:number}[]=[];
  let buf:string[]=[];
  const push=()=>{const t=buf.join("\n").trim();if(t)out.push({text:t,index:out.length});buf=[]};
  for(const line of lines){
    if(start.test(line)){
      push();
      let s=line.replace(start,"");
      const sender=s.match(/^[^:\n]{1,80}:\s*/);
      if(sender)s=s.slice(sender[0].length);
      buf=[s];
    }else if(buf.length)buf.push(line);else if(line.trim())buf=[line];
  }
  push();
  return out;
}

function stripMaps(s:string){return s.replace(mapRe,"").replace(/\s+/g," ").trim()}
function alphaRatio(s:string){const letters=(s.match(/[A-Za-zÀ-ÿ]/g)||[]).length;return letters/Math.max(1,s.length)}
function plausibleName(s:string){
  s=clean(stripMaps(s)).replace(/^[\-–—•*\d.)\s]+/,"");
  if(s.length<4||s.length>110||skipLineRe.test(s)||alphaRatio(s)<0.55)return false;
  if(/^(?:cidade|município|municipio|granja|produtor|integrado|nome|endereço|endereco|local|localização|localizacao)\s*[:\-]?\s*$/i.test(s))return false;
  if(/^https?:/i.test(s))return false;
  return s.split(/\s+/).length>=2;
}
function plausibleCity(s:string){
  s=clean(stripMaps(s)).replace(/^[\-–—•*\d.)\s]+/,"").replace(/\s*[-/]\s*SP$/i,"");
  if(s.length<3||s.length>45||skipLineRe.test(s)||alphaRatio(s)<0.75)return false;
  const words=s.split(/\s+/); if(words.length>5)return false;
  if(/\d/.test(s)||/^(?:granja|produtor|integrado|nome|endereço|endereco|local)$/i.test(s))return false;
  return true;
}
function extractLabel(text:string,label:string){
  const re=new RegExp("(?:^|\\n)\\s*"+label+"\\s*[:=\\-]\\s*([^\\n|;]{2,110})","i");
  const m=text.match(re);return m?clean(stripMaps(m[1])):"";
}
function titleCaseGuess(v:string){return clean(v).replace(/\s{2,}/g," ")}

function inferCandidateFromText(text:string){
  const links=[...text.matchAll(mapRe)].map(m=>m[1]);
  const combined=text.trim();
  let name=extractLabel(combined,"(?:granja|produtor(?:a)?|integrado(?:a)?|nome(?: da granja| do produtor)?)");
  let city=extractLabel(combined,"(?:cidade|munic[ií]pio)");
  let farmName=extractLabel(combined,"(?:granja|fazenda|s[ií]tio|sitio|ch[aá]cara|chacara)");
  const lines=combined.split("\n").map(x=>clean(stripMaps(x))).filter(Boolean).filter(x=>!skipLineRe.test(x));
  const unlabeled=lines.filter(x=>!/(?:granja|produtor|integrado|nome|cidade|munic[ií]pio|fazenda|s[ií]tio|ch[aá]cara)\s*[:=\-]/i.test(x));
  if(!city){
    const explicitSp=unlabeled.find(x=>plausibleCity(x)&&/\bSP$/i.test(x));
    if(explicitSp)city=explicitSp.replace(/\s*[-/]?\s*SP$/i,"").trim();
  }
  if(!name&&unlabeled.length>=2){
    const candidates=unlabeled.filter(plausibleName);
    if(candidates.length)name=candidates[0];
  }
  if(!city&&unlabeled.length>=2){
    const ni=name?unlabeled.findIndex(x=>norm(x)===norm(name)):-1;
    const pool=unlabeled.filter((x,i)=>i!==ni&&plausibleCity(x));
    if(pool.length){
      pool.sort((a,b)=>a.length-b.length);
      city=pool[0];
    }
  }
  if(!farmName)farmName=name;
  name=titleCaseGuess(name);city=titleCaseGuess(city);farmName=titleCaseGuess(farmName);
  let confidence=0.35;
  const labeledName=/(?:granja|produtor|integrado|nome)\s*[:=\-]/i.test(combined);
  const labeledCity=/(?:cidade|munic[ií]pio)\s*[:=\-]/i.test(combined);
  if(name&&city)confidence=0.68;
  if(name&&city&&links.length)confidence=0.82;
  if(labeledName&&labeledCity)confidence=Math.max(confidence,0.91);
  if(labeledName&&labeledCity&&links.length)confidence=0.97;
  return {name,city,farm_name:farmName||name,maps_url:links[0]||"",confidence:Number(confidence.toFixed(2)),context:clean(text).slice(0,360)};
}

function extractCandidates(raw:string){
  const blocks=whatsappBlocks(raw);
  const found:any[]=[];
  for(let i=0;i<blocks.length;i++){
    const b=blocks[i];
    const links=[...b.text.matchAll(mapRe)].map(m=>m[1]);
    let c=inferCandidateFromText(b.text);
    if(links.length&&(!c.name||!c.city)){
      const neighbors=[blocks[i-1],blocks[i+1]].filter(Boolean).filter(x=>![...x.text.matchAll(mapRe)].length);
      for(const n of neighbors){
        const guess=inferCandidateFromText(n.text);
        if(!c.name&&guess.name)c.name=guess.name;
        if(!c.city&&guess.city)c.city=guess.city;
        if((!c.farm_name||c.farm_name===c.name)&&guess.farm_name)c.farm_name=guess.farm_name;
        if(c.name&&c.city){c.confidence=Math.min(c.confidence||0.55,0.62);break}
      }
    }
    if(c.name&&c.city&&(links.length||/(?:granja|produtor|integrado|cidade|munic[ií]pio)/i.test(b.text)))found.push(c);
    if(!links.length){
      const lines=b.text.split("\n").map(x=>clean(stripMaps(x))).filter(Boolean).filter(x=>!skipLineRe.test(x));
      if(lines.length>=2&&lines.length<=5){
        const n=lines.find(plausibleName), ci=lines.filter(plausibleCity).filter(x=>norm(x)!==norm(n||"")).sort((a,b)=>a.length-b.length)[0];
        if(n&&ci&&norm(n)!==norm(ci))found.push({name:n,city:ci,farm_name:n,maps_url:"",confidence:0.58,context:clean(b.text).slice(0,360)});
      }
    }
  }
  if(blocks.length<=1){
    const paragraphs=raw.replace(/\r\n?/g,"\n").split(/\n{2,}/).slice(0,4000);
    for(const p of paragraphs){
      if(!/(?:granja|produtor|integrado|nome)\s*[:=\-]/i.test(p)||!/(?:cidade|munic[ií]pio)\s*[:=\-]/i.test(p))continue;
      const c=inferCandidateFromText(p);if(c.name&&c.city)found.push(c);
    }
  }
  const map=new Map<string,any>();
  for(const c of found){
    c.name=clean(c.name);c.city=clean(c.city);c.farm_name=clean(c.farm_name||c.name);c.maps_url=clean(c.maps_url);
    if(!c.name||!c.city)continue;
    const key=norm(c.name)+"|"+norm(c.city)+"|"+norm(c.farm_name);
    const old=map.get(key);
    if(!old||c.confidence>old.confidence||(!old.maps_url&&c.maps_url))map.set(key,{...old,...c,maps_url:c.maps_url||old?.maps_url||""});
  }
  return [...map.values()].sort((a,b)=>a.name.localeCompare(b.name,"pt-BR"));
}

async function fileToText(file:File){
  const bytes=new Uint8Array(await file.arrayBuffer());
  if(bytes.byteLength>15*1024*1024)throw new Error("Arquivo maior que 15 MB");
  const lower=file.name.toLowerCase();
  if(lower.endsWith(".txt"))return decodeBytes(bytes);
  if(lower.endsWith(".zip")){
    const entries=unzipSync(bytes);
    const txts=Object.entries(entries).filter(([name])=>name.toLowerCase().endsWith(".txt"));
    if(!txts.length)throw new Error("O ZIP não contém um arquivo .txt exportado pelo WhatsApp");
    txts.sort((a,b)=>b[1].byteLength-a[1].byteLength);
    return decodeBytes(txts[0][1]);
  }
  throw new Error("Envie o export do WhatsApp em .zip ou .txt");
}

async function loadExisting(supabase:any,companyId:string){
  const {data,error}=await supabase.from("v2_poultry_farms").select("id,producer_name,farm_name,city,address,metadata").eq("company_id",companyId).eq("status","active").limit(5000);
  if(error)throw error;return data||[];
}
function markExisting(items:any[],existing:any[]){
  const exact=new Map(existing.map((f:any)=>[norm(f.producer_name)+"|"+norm(f.city)+"|"+norm(f.farm_name||f.producer_name),f]));
  const loose=new Map(existing.map((f:any)=>[norm(f.producer_name)+"|"+norm(f.city),f]));
  return items.map(x=>{const hit=exact.get(norm(x.name)+"|"+norm(x.city)+"|"+norm(x.farm_name||x.name))||loose.get(norm(x.name)+"|"+norm(x.city));return {...x,existing:!!hit,existing_id:hit?.id||null};});
}

async function commitItems(supabase:any,companyId:string,items:any[]){
  const cleanItems=items.slice(0,1200).map(x=>({
    name:clean(x.name),city:clean(x.city),farm_name:clean(x.farm_name||x.name),maps_url:clean(x.maps_url),selected:x.selected!==false
  })).filter(x=>x.selected&&x.name&&x.city);
  const {data:ints,error:ie}=await supabase.from("v2_poultry_integrators").select("id,name,status").eq("company_id",companyId).eq("status","active").limit(5000);if(ie)throw ie;
  const {data:farms,error:fe}=await supabase.from("v2_poultry_farms").select("id,integrator_id,producer_name,farm_name,city,address,metadata,status").eq("company_id",companyId).eq("status","active").limit(5000);if(fe)throw fe;
  const intMap=new Map((ints||[]).map((x:any)=>[norm(x.name),x]));
  const farmMap=new Map((farms||[]).map((x:any)=>[norm(x.producer_name)+"|"+norm(x.city)+"|"+norm(x.farm_name||x.producer_name),x]));
  const looseMap=new Map((farms||[]).map((x:any)=>[norm(x.producer_name)+"|"+norm(x.city),x]));
  let inserted=0,updated=0,skipped=0;
  for(const item of cleanItems){
    let integrator=intMap.get(norm(item.name));
    if(!integrator){
      const {data,error}=await supabase.from("v2_poultry_integrators").insert({company_id:companyId,name:item.name,status:"active",metadata:{created_from:"whatsapp_import"}}).select("id,name,status").single();
      if(error)throw error;integrator=data;intMap.set(norm(item.name),integrator);
    }
    const k=norm(item.name)+"|"+norm(item.city)+"|"+norm(item.farm_name||item.name);
    let farm=farmMap.get(k)||looseMap.get(norm(item.name)+"|"+norm(item.city));
    const importedAt=new Date().toISOString();
    if(farm){
      const oldMeta=farm.metadata||{},oldAddress=farm.address||{};
      const metadata={...oldMeta,import_source:"whatsapp_export",last_whatsapp_import_at:importedAt};
      if(item.maps_url)metadata.maps_url=item.maps_url;
      const address={...oldAddress,city:item.city};if(item.maps_url)address.maps_url=item.maps_url;
      const changed=norm(farm.farm_name||farm.producer_name)!==norm(item.farm_name)||norm(farm.city)!==norm(item.city)||(!oldMeta.maps_url&&!!item.maps_url)||farm.integrator_id!==integrator.id;
      if(changed){
        const {data,error}=await supabase.from("v2_poultry_farms").update({integrator_id:integrator.id,producer_name:item.name,farm_name:item.farm_name,city:item.city,address,metadata}).eq("id",farm.id).eq("company_id",companyId).select("id,integrator_id,producer_name,farm_name,city,address,metadata,status").single();
        if(error)throw error;farm=data;farmMap.set(k,farm);looseMap.set(norm(item.name)+"|"+norm(item.city),farm);updated++;
      }else skipped++;
    }else{
      const metadata:any={created_from:"whatsapp_import",import_source:"whatsapp_export",last_whatsapp_import_at:importedAt};if(item.maps_url)metadata.maps_url=item.maps_url;
      const address:any={city:item.city};if(item.maps_url)address.maps_url=item.maps_url;
      const {data,error}=await supabase.from("v2_poultry_farms").insert({company_id:companyId,integrator_id:integrator.id,producer_name:item.name,farm_name:item.farm_name,city:item.city,address,status:"active",metadata}).select("id,integrator_id,producer_name,farm_name,city,address,metadata,status").single();
      if(error)throw error;farm=data;farmMap.set(k,farm);looseMap.set(norm(item.name)+"|"+norm(item.city),farm);inserted++;
    }
  }
  return {inserted,updated,skipped,processed:inserted+updated+skipped};
}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:CORS});
  if(req.method!=="POST")return json({error:"method_not_allowed"},405);
  try{
    const auth=req.headers.get("Authorization");if(!auth)return json({error:"unauthorized"},401);
    const token=auth.replace(/^Bearer\s+/i,"");
    const url=Deno.env.get("SUPABASE_URL")!,serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if(!url||!serviceKey)return json({error:"server_not_configured"},500);
    const supabase=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data:userData,error:ue}=await supabase.auth.getUser(token);const user=userData?.user;if(ue||!user)return json({error:"unauthorized"},401);
    const ct=req.headers.get("content-type")||"";
    let action="preview",companyId="",items:any[]=[];let file:File|null=null;
    if(ct.includes("multipart/form-data")){
      const form=await req.formData();action=String(form.get("action")||"preview");companyId=String(form.get("company_id")||"");const f=form.get("file");if(f instanceof File)file=f;
    }else{
      const body=await req.json().catch(()=>({}));action=String(body.action||"preview");companyId=String(body.company_id||"");items=Array.isArray(body.items)?body.items:[];
    }
    if(!companyId)return json({error:"company_id_required"},400);
    const {data:member,error:me}=await supabase.from("v2_company_members").select("id,role_id,status").eq("company_id",companyId).eq("user_id",user.id).eq("status","active").maybeSingle();
    if(me||!member)return json({error:"forbidden",message:"Sem acesso a esta empresa."},403);
    const {data:perm}=await supabase.from("v2_permissions").select("id").eq("code","poultry.manage").maybeSingle();
    let allowed=false;
    if(perm){
      const {data:override}=await supabase.from("v2_member_permissions").select("allowed").eq("member_id",member.id).eq("permission_id",perm.id).maybeSingle();
      if(override)allowed=override.allowed===true;
      else{const {data:rp}=await supabase.from("v2_role_permissions").select("allowed").eq("role_id",member.role_id).eq("permission_id",perm.id).maybeSingle();allowed=rp?.allowed===true}
    }
    if(!allowed)return json({error:"forbidden",message:"É necessário acesso de gestão da apanha."},403);
    if(action==="commit"){
      if(!items.length)return json({error:"items_required"},400);
      const result=await commitItems(supabase,companyId,items);
      return json({ok:true,...result});
    }
    if(!file)return json({error:"file_required",message:"Selecione um .zip ou .txt exportado pelo WhatsApp."},400);
    const text=await fileToText(file);
    const candidates=markExisting(extractCandidates(text),await loadExisting(supabase,companyId));
    return json({ok:true,file_name:file.name,candidates,summary:{found:candidates.length,with_location:candidates.filter(x=>x.maps_url).length,existing:candidates.filter(x=>x.existing).length,needs_review:candidates.filter(x=>x.confidence<0.8).length},privacy:"Arquivo processado em memória; o conteúdo bruto da conversa não é salvo."});
  }catch(e){console.error(e);return json({error:"farm_import_failed",message:e instanceof Error?e.message:String(e)},500)}
});