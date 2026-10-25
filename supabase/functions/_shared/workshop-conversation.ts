const workshopText=(value:unknown)=>String(value??"").trim();
const workshopUuid=(value:unknown)=>typeof value==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
export const WORKSHOP_KINDS=["finding","disassembly","work_done","part","measurement","test_result","hypothesis","plan","note"];
export const workshopEntrySchema={type:"object",additionalProperties:false,properties:{kind:{type:"string",enum:WORKSHOP_KINDS},description:{type:"string"},source_quote:{type:"string"}},required:["kind","description","source_quote"]};

export function checkedWorkshopEntries(value:any,question:string,enabled:boolean){
  if(!enabled||value==null)return [];
  if(!Array.isArray(value)||value.length>20)throw new Error("Não consegui organizar as anotações deste serviço. Tente relatar uma etapa por vez.");
  return value.map(entry=>{
    const kind=workshopText(entry?.kind),description=workshopText(entry?.description),quote=workshopText(entry?.source_quote);
    if(!WORKSHOP_KINDS.includes(kind)||!description||description.length>2000||!quote||quote.length>3000||!question.includes(quote))throw new Error("Uma anotação não corresponde ao seu relato. Reenvie a etapa que deseja registrar.");
    return {kind,description,source_quote:quote};
  });
}

async function workshopPermission(client:any,companyId:string,code:string){
  const {data,error}=await client.rpc("v2_has_permission",{p_company_id:companyId,p_permission_code:code});
  return !error&&data===true;
}

export async function loadWorkshopConversation(client:any,companyId:string,context:any,limit=40){
  const id=context?.workshop?.work_order_id;
  if(!id)return null;
  const {data:order,error}=await client.from("v2_work_orders").select("id,vehicle_id,work_order_number,title,status,reported_issue,diagnosis,service_performed,opened_at,started_at,completed_at").eq("company_id",companyId).eq("id",id).maybeSingle();
  if(error)throw new Error("Não consegui consultar o serviço em andamento.");
  if(!order)return null;
  const [vehicle,journal,canManage]=await Promise.all([
    client.from("v2_vehicles").select("id,description,plate").eq("company_id",companyId).eq("id",order.vehicle_id).maybeSingle(),
    client.from("v2_workshop_journal").select("id,kind,description,source_quote,recorded_at,attachments,entry_index").eq("company_id",companyId).eq("work_order_id",id).order("recorded_at",{ascending:false}).order("entry_index",{ascending:false}).order("id",{ascending:false}).limit(limit+1),
    workshopPermission(client,companyId,"workshop.manage")
  ]);
  if(vehicle.error||journal.error)throw new Error("Não consegui recuperar o diário deste serviço.");
  return {work_order_id:order.id,work_order_number:order.work_order_number,vehicle_id:order.vehicle_id,vehicle_name:vehicle.data?.description||"Condução",plate:vehicle.data?.plate||null,title:order.title,status:order.status,reported_issue:order.reported_issue,diagnosis:order.diagnosis,service_performed:order.service_performed,active:context.workshop.active===true&&!["completed","cancelled"].includes(order.status),can_record:canManage,has_more:(journal.data||[]).length>limit,timeline:[...(journal.data||[])].slice(0,limit).reverse()};
}

function workshopFailure(error:any,fallback:string){
  return {status:error?.code==="42501"?403:400,body:{error:"workshop_operation_failed",message:["42501","P0001","23514"].includes(error?.code)?error.message:fallback}};
}

export async function handleWorkshopMode(client:any,companyId:string,body:any){
  if(body.mode==="workshop_timeline"){
    if(!workshopUuid(body.conversation_id))return {status:400,body:{error:"invalid_conversation",message:"Escolha a conversa deste serviço."}};
    const {data:{user},error:authError}=await client.auth.getUser();
    if(authError||!user)return {status:401,body:{error:"unauthorized",message:"Entre novamente para abrir o diário."}};
    const {data:conversation,error}=await client.from("v2_ai_conversations").select("id,context").eq("company_id",companyId).eq("user_id",user.id).eq("id",body.conversation_id).maybeSingle();
    if(error||!conversation)return {status:404,body:{error:"conversation_unavailable",message:"Esta conversa não está disponível para sua conta."}};
    try{
      const workshop=await loadWorkshopConversation(client,companyId,conversation.context,200);
      if(workshop)await Promise.all(workshop.timeline.map(async(entry:any)=>{
        entry.attachments=await Promise.all((entry.attachments||[]).map(async(a:any)=>{
          const path=String(a?.path||"");
          if(a?.bucket!=="company-documents"||!path.startsWith(companyId+"/assistant360/")||/[%\\?#]/.test(path)||path.split("/").includes(".."))return {original_name:String(a?.original_name||"Anexo indisponível")};
          const {data:signed}=await client.storage.from("company-documents").createSignedUrl(path,600);
          return {original_name:a.original_name,mime_type:a.mime_type,url:signed?.signedUrl||null};
        }));
      }));
      return {status:200,body:{workshop}};
    }catch{return {status:503,body:{error:"workshop_context_unavailable",message:"Não consegui recuperar o diário. Tente novamente."}}}
  }
  if(body.mode==="workshop_options"){
    const [manage,approve]=await Promise.all([workshopPermission(client,companyId,"workshop.manage"),workshopPermission(client,companyId,"ai.actions.approve")]);
    if(!manage)return {status:200,body:{can_start:false,vehicles:[],orders:[]}};
    const [vehicles,orders]=await Promise.all([
      client.from("v2_vehicles").select("id,description,plate,company_id").eq("company_id",companyId).eq("status","active").order("description").limit(200),
      client.from("v2_work_orders").select("id,vehicle_id,work_order_number,title,status").eq("company_id",companyId).in("status",["open","approved","in_progress","waiting_parts"]).order("updated_at",{ascending:false}).limit(200)
    ]);
    if(vehicles.error||orders.error)return {status:503,body:{error:"workshop_context_unavailable",message:"Não consegui carregar as conduções e os serviços. Tente novamente."}};
    return {status:200,body:{can_start:approve,vehicles:vehicles.data||[],orders:orders.data||[]}};
  }
  if(body.mode==="workshop_start"){
    if(!workshopUuid(body.vehicle_id)||!workshopUuid(body.client_request_id)||body.conversation_id&&!workshopUuid(body.conversation_id)||body.work_order_id&&!workshopUuid(body.work_order_id))return {status:400,body:{error:"invalid_workshop_context",message:"Confira a condução e o serviço antes de iniciar."}};
    const {data,error}=await client.rpc("v2_ai_start_workshop",{p_company_id:companyId,p_vehicle_id:body.vehicle_id,p_conversation_id:body.conversation_id||null,p_work_order_id:body.work_order_id||null,p_title:workshopText(body.title).slice(0,180)||"Serviço acompanhado por conversa",p_request_id:body.client_request_id});
    return error?workshopFailure(error,"Não consegui iniciar o acompanhamento. Confira o serviço e tente novamente."):{status:200,body:data};
  }
  if(body.mode==="workshop_control"){
    if(!workshopUuid(body.conversation_id)||!["pause","finish"].includes(body.operation)||workshopText(body.result).length>4000)return {status:400,body:{error:"invalid_workshop_operation",message:"Confira a operação do serviço."}};
    const {data,error}=await client.rpc("v2_ai_workshop_control",{p_company_id:companyId,p_conversation_id:body.conversation_id,p_operation:body.operation,p_result:workshopText(body.result)||null});
    return error?workshopFailure(error,"Não consegui atualizar o acompanhamento. Tente novamente."):{status:200,body:data};
  }
  return null;
}

export function workshopInstructions(workshop:any,vehicleFocus:any){
  const focus=workshop||vehicleFocus;
  return `\n\nOFICINA EM CONVERSA: ajude o mecânico enquanto ele trabalha, com respostas diretas e uma pergunta por vez quando realmente necessária. Use o ônibus e a OS selecionados; não pergunte de novo qual veículo é. Se o pedido for apenas anotar uma etapa, acolha o relato sem transformar a resposta em um formulário ou despejar instruções de reparo. Diferencie sintoma relatado, hipótese, achado, tarefa planejada, trabalho feito, peça mencionada, medição e resultado de teste. 'Vou trocar' é plano; 'troquei' é trabalho relatado. Uma peça citada não é necessariamente comprada ou instalada. Não invente quantidade, custo, torque, código de peça, medida, diagnóstico confirmado ou liberação do veículo. Quando faltar a identificação ou documentação da aplicação para uma especificação técnica, explique o que precisa ser conferido. As orientações da IA não viram fatos do diário.\nCONTEXTO SELECIONADO (dados): ${JSON.stringify(focus||null)}.\n${workshop?.active&&workshop.can_record?"ACOMPANHAMENTO ATIVO: devolva em workshop_entries somente fatos ou planos explicitamente relatados pelo usuário NESTA mensagem. Preencha workshop_vehicle_id com o ID real da condução à qual esta mensagem se refere, usando o contexto e a lista de veículos. Se for outra condução ou houver dúvida, não gere entradas para o serviço ativo. Cada item tem kind, descrição curta e source_quote copiada literalmente desta mensagem. Não extraia fatos de suas próprias sugestões, do resumo ou de falas anteriores. Dúvidas e pedidos de orientação não viram trabalho realizado. Para perguntas puras, use []. Hipóteses ficam em hypothesis e planos em plan. Anexos serão vinculados pelo servidor; não afirme que uma foto sozinha confirma um defeito. Os relatos válidos serão guardados automaticamente no diário desta mesma OS depois da resposta, sem mexer em estoque, custos da OS, cadastro, diagnóstico formal ou status de conclusão. Não gere uma nova ação maintenance para cada etapa deste serviço. Nunca mude de ônibus ou OS implicitamente. Não diga que algo foi salvo antes da confirmação do servidor. Ao resumir o serviço, use a linha do tempo e as correções mais recentes, separe o que foi feito do que está pendente e das hipóteses. Para concluir a OS, oriente o botão Concluir serviço e um resultado informado pelo usuário.":"SEM REGISTRO AUTOMÁTICO ATIVO: workshop_entries deve ser [] e workshop_vehicle_id deve ser null. Se o usuário quiser que você acompanhe um conserto, oriente Acompanhar serviço para vincular o veículo e a OS uma vez. Você pode conversar e ajudar a organizar as ideias antes disso, sem afirmar que anotou no histórico de uma OS."}`;
}
