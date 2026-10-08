import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":"POST, OPTIONS"
};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});
const str=(v:unknown)=>String(v??"").trim();
const num=(v:unknown)=>{const n=Number(v);return Number.isFinite(n)?n:null};
const norm=(v:unknown)=>str(v).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const todayBR=()=>new Intl.DateTimeFormat("en-CA",{timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const isoAtNoon=(date?:string|null)=>date?new Date(`${date}T12:00:00-03:00`).toISOString():new Date().toISOString();

function bestMatch<T extends Record<string,unknown>>(rows:T[], candidates:unknown[], fields:(keyof T)[]){
  const wants=candidates.map(norm).filter(Boolean);
  if(!wants.length)return null;
  let best:{row:T;score:number}|null=null;
  for(const row of rows){
    const vals=fields.map(f=>norm(row[f])).filter(Boolean);
    let score=0;
    for(const want of wants){
      for(const val of vals){
        if(want===val)score=Math.max(score,100);
        else if(val.includes(want)||want.includes(val))score=Math.max(score,75);
        else {
          const wt=new Set(want.split(" ").filter(x=>x.length>1));
          const vt=new Set(val.split(" ").filter(x=>x.length>1));
          const common=[...wt].filter(x=>vt.has(x)).length;
          if(common)score=Math.max(score,Math.round(50*common/Math.max(wt.size,1)));
        }
      }
    }
    if(!best||score>best.score)best={row,score};
  }
  return best&&best.score>=50?best.row:null;
}

const nullableString={anyOf:[{type:"string"},{type:"null"}]};
const nullableNumber={anyOf:[{type:"number"},{type:"null"}]};
const nullableBoolean={anyOf:[{type:"boolean"},{type:"null"}]};
const extractionSchema={
  type:"object",
  additionalProperties:false,
  properties:{
    answer:{type:"string"},
    actions:{type:"array",items:{
      type:"object",additionalProperties:false,
      properties:{
        action_type:{type:"string",enum:["fuel_log","poultry_schedule","maintenance","odometer","none"]},
        summary:{type:"string"},
        confidence:{type:"number",minimum:0,maximum:1},
        missing_fields:{type:"array",items:{type:"string"}},
        payload:{
          type:"object",additionalProperties:false,
          properties:{
            vehicle:nullableString,plate:nullableString,driver:nullableString,date:nullableString,
            odometer_km:nullableNumber,liters:nullableNumber,total_amount:nullableNumber,price_per_liter:nullableNumber,
            station_name:nullableString,full_tank:nullableBoolean,team:nullableString,integrator:nullableString,
            farm:nullableString,producer:nullableString,city:nullableString,scheduled_start:nullableString,
            planned_birds:nullableNumber,title:nullableString,maintenance_type:nullableString,
            reported_issue:nullableString,service_performed:nullableString,labor_amount:nullableNumber,notes:nullableString
          },
          required:["vehicle","plate","driver","date","odometer_km","liters","total_amount","price_per_liter","station_name","full_tank","team","integrator","farm","producer","city","scheduled_start","planned_birds","title","maintenance_type","reported_issue","service_performed","labor_amount","notes"]
        }
      },
      required:["action_type","summary","confidence","missing_fields","payload"]
    }}
  },
  required:["answer","actions"]
};

type Ctx={
  vehicles:any[]; teams:any[]; integrators:any[]; farms:any[];
  company:any; teamStatus:any[]; maintenance:any[]; vacations:any[]; operations:any[]; workshopOrders:any[]; workshopFaults:any[]; washOrders:any[]; washFindings:any[]; washProducts:any[];
};

async function loadContext(supabase:any,companyId:string):Promise<Ctx>{
  const [company,teamStatus,maintenance,vacations,operations,vehicles,teams,integrators,farms,workshopOrders,workshopFaults,washOrders,washFindings,washProducts]=await Promise.all([
    supabase.from("v2_ai_company_context").select("*").eq("company_id",companyId).maybeSingle(),
    supabase.from("v2_ai_team_status").select("*").eq("company_id",companyId).order("delay_minutes",{ascending:false}).limit(20),
    supabase.from("v2_ai_maintenance_attention").select("*").eq("company_id",companyId).neq("attention_level","normal").limit(20),
    supabase.from("v2_vacation_alerts").select("employee_id,concession_deadline,status,alert_level").eq("company_id",companyId).in("alert_level",["overdue","due_soon"]).limit(20),
    supabase.from("v2_ai_operation_insights").select("*").eq("company_id",companyId).order("calculated_margin",{ascending:false}).limit(30),
    supabase.from("v2_vehicles").select("id,plate,description,make,model,current_odometer_km,status").eq("company_id",companyId).eq("status","active").limit(200),
    supabase.from("v2_teams").select("id,name,code,status").eq("company_id",companyId).eq("status","active").limit(100),
    supabase.from("v2_poultry_integrators").select("id,name,code,status").eq("company_id",companyId).eq("status","active").limit(100),
    supabase.from("v2_poultry_farms").select("id,integrator_id,producer_name,farm_name,city,status").eq("company_id",companyId).eq("status","active").limit(500),
    supabase.from("v2_work_orders").select("id,work_order_number,vehicle_id,maintenance_type,title,reported_issue,diagnosis,service_performed,odometer_km,total_amount,status,created_at").eq("company_id",companyId).order("created_at",{ascending:false}).limit(80),
    supabase.from("v2_vehicle_faults").select("id,vehicle_id,code,description,status,occurrence_count,last_seen_at").eq("company_id",companyId).order("last_seen_at",{ascending:false}).limit(80),
    supabase.from("v2_wash_orders").select("id,wash_number,vehicle_id,ownership,service_name,status,water_liters,products_cost,total_cost,sale_price,margin_value,estimated_savings,created_at").eq("company_id",companyId).order("created_at",{ascending:false}).limit(80),
    supabase.from("v2_wash_findings").select("id,wash_order_id,vehicle_id,category,severity,description,status,sent_to_workshop,workshop_order_id,created_at").eq("company_id",companyId).order("created_at",{ascending:false}).limit(80),
    supabase.from("v2_wash_products").select("id,name,brand,stock_ml,unit_cost_per_ml,active").eq("company_id",companyId).eq("active",true).limit(100)
  ]);
  return {company:company.data,teamStatus:teamStatus.data||[],maintenance:maintenance.data||[],vacations:vacations.data||[],operations:operations.data||[],vehicles:vehicles.data||[],teams:teams.data||[],integrators:integrators.data||[],farms:farms.data||[],workshopOrders:workshopOrders.data||[],workshopFaults:workshopFaults.data||[],washOrders:washOrders.data||[],washFindings:washFindings.data||[],washProducts:washProducts.data||[]};
}

function compactContext(ctx:Ctx){
  return {
    company:ctx.company,
    teams:ctx.teams.map(x=>({name:x.name,code:x.code})),
    vehicles:ctx.vehicles.map(x=>({description:x.description,plate:x.plate,make:x.make,model:x.model,current_odometer_km:x.current_odometer_km})),
    integrators:ctx.integrators.map(x=>({name:x.name,code:x.code})),
    farms:ctx.farms.map(x=>({producer_name:x.producer_name,farm_name:x.farm_name,city:x.city})),
    team_status:ctx.teamStatus,
    maintenance_attention:ctx.maintenance,
    vacation_alerts:ctx.vacations,
    operation_insights:ctx.operations,
    oficina360:{work_orders:ctx.workshopOrders,faults:ctx.workshopFaults},
    lavador360:{wash_orders:ctx.washOrders,findings:ctx.washFindings,products:ctx.washProducts}
  };
}

function resolveAction(raw:any,ctx:Ctx,source:any){
  const p=raw?.payload||{};
  const missing=new Set<string>();
  const vehicle=bestMatch(ctx.vehicles,[p.plate,p.vehicle],["plate","description","make","model"] as any);
  const team=bestMatch(ctx.teams,[p.team],["name","code"] as any);
  const integrator=bestMatch(ctx.integrators,[p.integrator],["name","code"] as any);
  let farm=bestMatch(ctx.farms,[p.farm,p.producer,p.city],["farm_name","producer_name","city"] as any);
  if(farm&&integrator&&farm.integrator_id!==integrator.id){
    const under=ctx.farms.filter(x=>x.integrator_id===integrator.id);
    farm=bestMatch(under,[p.farm,p.producer,p.city],["farm_name","producer_name","city"] as any)||farm;
  }
  const type=str(raw?.action_type);
  const out:any={
    vehicle_id:vehicle?.id||null,vehicle_name:vehicle?.description||p.vehicle||null,plate:vehicle?.plate||p.plate||null,
    driver:p.driver||null,date:p.date||todayBR(),odometer_km:num(p.odometer_km),liters:num(p.liters),
    total_amount:num(p.total_amount),price_per_liter:num(p.price_per_liter),station_name:p.station_name||null,full_tank:p.full_tank,
    team_id:team?.id||null,team_name:team?.name||p.team||null,integrator_id:integrator?.id||farm?.integrator_id||null,
    integrator_name:integrator?.name||p.integrator||null,farm_id:farm?.id||null,farm_name:farm?.farm_name||farm?.producer_name||p.farm||p.producer||null,
    producer:farm?.producer_name||p.producer||null,city:farm?.city||p.city||null,scheduled_start:p.scheduled_start||null,
    planned_birds:num(p.planned_birds),title:p.title||null,maintenance_type:p.maintenance_type||null,
    reported_issue:p.reported_issue||null,service_performed:p.service_performed||null,labor_amount:num(p.labor_amount)||0,notes:p.notes||null,
    _source:source||null
  };
  if(out.total_amount==null&&out.liters!=null&&out.price_per_liter!=null)out.total_amount=Number((out.liters*out.price_per_liter).toFixed(2));
  if(type==="fuel_log"){
    if(!out.vehicle_id)missing.add("veículo");
    if(!(out.liters>0))missing.add("litros");
    if(out.total_amount==null||out.total_amount<0)missing.add("valor total");
  } else if(type==="poultry_schedule"){
    if(!out.integrator_id)missing.add("integrado");
    if(!out.farm_id)missing.add("granja/produtor");
    if(!out.scheduled_start)missing.add("data/horário");
  } else if(type==="maintenance"){
    if(!out.vehicle_id)missing.add("veículo");
    if(!out.title&&!out.reported_issue&&!out.service_performed)missing.add("serviço/problema");
  } else if(type==="odometer"){
    if(!out.vehicle_id)missing.add("veículo");
    if(out.odometer_km==null)missing.add("quilometragem");
  }
  return {action_type:type,summary:str(raw?.summary)||"Ação identificada",confidence:num(raw?.confidence)||0,payload:out,missing_fields:[...missing]};
}

async function hasPermission(supabase:any,companyId:string,code:string){
  const {data,error}=await supabase.rpc("v2_has_permission",{p_company_id:companyId,p_permission_code:code});
  if(error)throw error; return !!data;
}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(req.method!=="POST")return json({error:"method_not_allowed"},405);
  const auth=req.headers.get("Authorization"); if(!auth)return json({error:"unauthorized"},401);
  const supabase=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_ANON_KEY")!,{global:{headers:{Authorization:auth}}});
  const {data:{user},error:ue}=await supabase.auth.getUser(); if(ue||!user)return json({error:"unauthorized"},401);
  const body=await req.json().catch(()=>({}));
  const companyId=str(body.company_id); const mode=str(body.mode)||"analyze";
  if(!companyId)return json({error:"company_id_required"},400);
  if(!await hasPermission(supabase,companyId,"ai.use"))return json({error:"forbidden"},403);

  if(mode==="execute"){
    const actionId=str(body.action_request_id); if(!actionId)return json({error:"action_request_id_required"},400);
    const {data,error}=await supabase.rpc("v2_execute_assistant_action",{p_company_id:companyId,p_action_id:actionId});
    if(error)return json({error:"action_execution_failed",message:error.code==="P0001"||error.code==="42501"?error.message:"Não foi possível confirmar o lançamento. Confira os dados e tente novamente."},error.code==="42501"?403:400);
    return json(data);
  }

  const question=str(body.question)||"Analise a imagem e identifique o que deve ser lançado no Comando 360.";
  const imageData=str(body.image_data_url); const source=body.source_attachment||null;
  if(question.length>10000)return json({error:"Informe uma mensagem de até 10.000 caracteres."},400);
  if(imageData&&(imageData.length>12*1024*1024||!/^data:image\/(jpeg|png|webp);base64,/.test(imageData)))return json({error:"Use uma foto JPEG, PNG ou WebP válida."},400);
  if(source&&(source.bucket!=="company-documents"||typeof source.path!=="string"||!source.path.startsWith(companyId+"/assistant360/")))return json({error:"Confira o anexo desta empresa."},400);
  let conversationId=str(body.conversation_id);
  if(conversationId){
    const {data:conversation,error}=await supabase.from("v2_ai_conversations").select("id").eq("id",conversationId).eq("company_id",companyId).maybeSingle();
    if(error||!conversation)return json({error:"conversation_unavailable",message:"Abra uma nova conversa nesta empresa."},400);
  }
  if(!conversationId){
    const {data:c,error:e}=await supabase.from("v2_ai_conversations").insert({company_id:companyId,user_id:user.id,title:question.slice(0,80),context:{source:"assistant360"}}).select("id").single();
    if(e)return json({error:"conversation_create_failed",detail:e.message},500); conversationId=c.id;
  }
  await supabase.from("v2_ai_messages").insert({company_id:companyId,conversation_id:conversationId,user_id:user.id,role:"user",content:question+(source?.original_name?`\n[Anexo: ${source.original_name}]`:"")});

  const apiKey=Deno.env.get("OPENAI_API_KEY");
  if(!apiKey)return json({conversation_id:conversationId,status:"configuration_required",message:"A integração de IA está pronta, mas a chave OPENAI_API_KEY ainda não está configurada no servidor."},503);
  const ctx=await loadContext(supabase,companyId);
  const prompt=`Você é o Assistente 360 do Comando 360. Responda em português do Brasil. Hoje é ${todayBR()} (America/Sao_Paulo).\n\nOBJETIVO: ser o Comando IA, assistente central do Comando 360. Converse normalmente, responda dúvidas sobre o trabalho usando os dados internos fornecidos e, quando o usuário estiver pedindo para registrar algo, extraia uma ou mais ações estruturadas. Você também tem contexto do Oficina 360 (ordens de serviço, falhas e histórico) e do Lavador 360 (lavagens, custos, achados e produtos). Em dúvidas de oficina, priorize o histórico real da condução e diferencie dado registrado de hipótese técnica. Em dúvidas do lavador, use ordens, custos, produtos e achados reais. Nunca afirme que consultou um dado que não aparece no contexto. Nunca diga que algo já foi salvo: toda alteração deve ser apenas proposta e depende de confirmação humana posterior.\n\nAÇÕES SUPORTADAS:\n- fuel_log: abastecimento. Extraia veículo/placa, motorista, data, km, litros, valor total, preço por litro, posto e se completou o tanque.\n- poultry_schedule: fax/programação de apanha. Uma foto pode conter várias apanhas; gere UMA ação por apanha/local. Extraia equipe, integrado, granja/produtor, cidade, data/horário e aves previstas quando existirem.\n- maintenance: manutenção/ordem de serviço. Extraia veículo, km, tipo e descrição. maintenance_type deve ser preventive, corrective, inspection, tire, electrical ou other.\n- odometer: registro isolado de quilometragem.\n- none: pergunta/consulta sem lançamento.\n\nREGRAS: use a imagem e o texto em conjunto; não invente números ilegíveis. Quando um dado necessário não estiver claro, deixe null e liste em missing_fields. Use os nomes reais abaixo para reconhecer veículos/equipes/integrados/granjas, mas não invente entidade que não exista. Datas devem ser YYYY-MM-DD; scheduled_start deve ser ISO 8601 com offset -03:00 quando houver horário. Para 'amanhã', calcule a partir da data de hoje. Se houver apenas consulta, actions deve conter uma ação none.\n\nDADOS INTERNOS DISPONÍVEIS:\n${JSON.stringify(compactContext(ctx))}`;
  const content:any[]=[{type:"input_text",text:question}];
  if(imageData)content.push({type:"input_image",image_url:imageData,detail:"high"});
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),35000);let out:any;
  try{
    const r=await fetch("https://api.openai.com/v1/responses",{method:"POST",signal:controller.signal,headers:{Authorization:`Bearer ${apiKey}`,"Content-Type":"application/json"},body:JSON.stringify({
      model:"gpt-5-mini",instructions:prompt,input:[{role:"user",content}],text:{format:{type:"json_schema",name:"comando360_assistant",strict:true,schema:extractionSchema}}
    })});
    if(!r.ok)return json({error:"ai_provider_error",message:"A IA está indisponível. Tente novamente."},502);
    out=await r.json();
  }catch(e){return json({error:"ai_provider_unavailable",message:e instanceof Error&&e.name==="AbortError"?"A consulta demorou demais. Tente novamente.":"Não foi possível consultar a IA neste momento."},503)}
  finally{clearTimeout(timer)}
  if(out.status==="incomplete")return json({error:"ai_incomplete",message:"A resposta ficou incompleta. Tente novamente."},502);
  const outputText=typeof out.output_text==="string"?out.output_text:(out.output||[]).filter((x:any)=>x.type==="message").flatMap((x:any)=>x.content||[]).filter((x:any)=>x.type==="output_text"&&typeof x.text==="string").map((x:any)=>x.text).join("");
  let parsed:any;try{parsed=JSON.parse(outputText);if(!Array.isArray(parsed.actions))throw new Error("actions")}catch{return json({error:"ai_invalid_response",message:"Não foi possível interpretar a resposta. Tente novamente."},502)}
  const canPropose=await hasPermission(supabase,companyId,"ai.actions.propose").catch(()=>false);
  const resolved=(parsed.actions||[]).filter((a:any)=>a.action_type&&a.action_type!=="none").map((a:any)=>resolveAction(a,ctx,source));
  const actionRows:any[]=[];
  if(canPropose){
    for(const a of resolved){
      const {data:created,error}=await supabase.from("v2_ai_action_requests").insert({company_id:companyId,conversation_id:conversationId,requested_by:user.id,action_type:a.action_type,target_type:a.action_type,target_id:a.payload.vehicle_id||a.payload.farm_id||null,proposed_payload:{...a.payload,missing_fields:a.missing_fields,confidence:a.confidence,summary:a.summary},status:"proposed"}).select("id,action_type,target_type,target_id,proposed_payload,status").single();
      if(!error&&created)actionRows.push({id:created.id,action_type:a.action_type,summary:a.summary,confidence:a.confidence,missing_fields:a.missing_fields,payload:a.payload,status:created.status});
    }
  }
  let answer=str(parsed.answer)||"Analisei a solicitação.";
  if(resolved.length&&!canPropose)answer+=" Seu usuário pode consultar a IA, mas não tem permissão para propor lançamentos.";
  if(actionRows.length){
    const pend=actionRows.filter(a=>a.missing_fields?.length).length;
    answer+=pend?` Preparei ${actionRows.length} lançamento(s); ${pend} ainda precisam de dados antes da confirmação.`:` Preparei ${actionRows.length} lançamento(s) para sua confirmação.`;
  }
  const {data:m}=await supabase.from("v2_ai_messages").insert({company_id:companyId,conversation_id:conversationId,user_id:user.id,role:"assistant",content:answer,intent:actionRows.length?actionRows.map(a=>a.action_type).join(","):"query",answer_data:{actions:actionRows,source_attachment:source}}).select("id").single();
  return json({conversation_id:conversationId,message_id:m?.id,answer,actions:actionRows});
});
