import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import {createClient} from 'jsr:@supabase/supabase-js@2.118.0';
import {getOpenAiApiKey,openAiProviderError} from '../_shared/openai-server.ts';
import {readAssistantStream} from '../_shared/assistant-stream.ts';
import {scanUuid,checkedScanContext,scanInstructions} from './contract.ts';

const scanCors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
const scanJson=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...scanCors,'Content-Type':'application/json','Cache-Control':'no-store'}});
const scanText=(value:unknown)=>typeof value==='string'?value.trim():'';

Deno.serve(async (req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:scanCors});
  if(req.method!=='POST')return scanJson({message:'Método não permitido.'},405);
  const authHeader=req.headers.get('Authorization');
  if(!authHeader)return scanJson({message:'Entre novamente pelo Oficina 360.'},401);
  try {
    const client=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:authHeader}},auth:{persistSession:false,autoRefreshToken:false}});
    const {data:{user},error:authError}=await client.auth.getUser();
    if(authError||!user)return scanJson({message:'Sessão inválida.'},401);
    const raw=await req.text();if(new TextEncoder().encode(raw).length>48000)return scanJson({message:'Consulta acima do limite.'},413);
    let body:any;try{body=JSON.parse(raw);}catch{return scanJson({message:'Consulta inválida.'},400);}
    const companyId=scanText(body.company_id),vehicleId=scanText(body.vehicle_id),mode=scanText(body.mode)||'analyze';
    if(!scanUuid(companyId)||!scanUuid(vehicleId))return scanJson({message:'Confira a empresa e a condução.'},400);
    const [member,permission]=await Promise.all([client.rpc('v2_is_company_member',{p_company_id:companyId}),client.rpc('v2_has_permission',{p_company_id:companyId,p_permission_code:'ai.use'})]);
    if(member.error||permission.error)return scanJson({message:'Não consegui verificar suas permissões.'},503);
    if(member.data!==true||permission.data!==true)return scanJson({message:'Sua conta não tem acesso a esta consulta.'},403);
    const vehicle=await client.from('v2_vehicles').select('id,description,plate,model,model_year').eq('company_id',companyId).eq('id',vehicleId).maybeSingle();
    if(vehicle.error)return scanJson({message:'Não consegui recuperar a condução.'},503);
    if(!vehicle.data)return scanJson({message:'Condução indisponível para esta empresa.'},404);
    const conversations=()=>client.from('v2_ai_conversations').select('id,title,context,updated_at').eq('company_id',companyId).eq('user_id',user.id).eq('context->>scan_pro','v1').eq('context->>vehicle_context_id',vehicleId);
    if(mode==='conversations') {
      const r=await conversations().order('updated_at',{ascending:false}).limit(30);
      return r.error?scanJson({message:'Histórico indisponível.'},503):scanJson({conversations:(r.data||[]).map((c:any)=>({id:c.id,title:c.title,updated_at:c.updated_at}))});
    }
    if(!['history','health','analyze'].includes(mode))return scanJson({message:'Operação inválida.'},400);
    if(mode==='health') {
      const key=await getOpenAiApiKey();return scanJson({configured:!!key,message:key?'Configuração existente presente; resposta autenticada ainda precisa de validação.':'Configuração da OpenAI indisponível.'});
    }
    let conversation:any=null;
    const conversationId=scanText(body.conversation_id);
    if(conversationId) {
      if(!scanUuid(conversationId))return scanJson({message:'Conversa inválida.'},400);
      const r=await conversations().eq('id',conversationId).maybeSingle();
      if(r.error)return scanJson({message:'Não consegui recuperar a conversa.'},503);
      if(!r.data||r.data.context?.workshop)return scanJson({message:'Esta conversa não pertence ao laboratório desta condução.'},404);
      conversation=r.data;
    }
    if(mode==='history'&&!conversation)return scanJson({message:'Escolha uma conversa.'},400);
    const readMessages=(id:string)=>client.from('v2_ai_messages').select('id,role,content,answer_data,created_at').eq('company_id',companyId).eq('user_id',user.id).eq('conversation_id',id).order('created_at',{ascending:false}).order('id',{ascending:false}).limit(40);
    let history:any[]=[];
    if(conversation) {
      const r=await readMessages(conversation.id);if(r.error)return scanJson({message:'Não consegui recuperar o contexto.'},503);history=[...(r.data||[])].reverse();
    }
    if(mode==='history')return scanJson({conversation_id:conversation.id,messages:history.map(m=>({id:m.id,role:m.role,content:m.content,created_at:m.created_at}))});
    const question=scanText(body.question),requestId=scanText(body.client_request_id);
    if(!question||question.length>4000||!scanUuid(requestId))return scanJson({message:'Envie uma mensagem de até 4.000 caracteres e uma identificação válida.'},400);
    const cached=history.find(m=>m.role==='assistant'&&m.answer_data?.client_request_id===requestId);
    if(cached){
      const original=history.find(m=>m.role==='user'&&m.answer_data?.client_request_id===requestId);
      if(original&&original.content!==question)return scanJson({message:'Esta identificação já foi usada em outra mensagem.'},409);
      return scanJson({conversation_id:conversation.id,answer:cached.content,already_processed:true});
    }
    let context:any;try{context=checkedScanContext(body.context);}catch(e){return scanJson({message:e instanceof Error?e.message:'Confira o exercício.'},400);}
    const label=[vehicle.data.description,vehicle.data.model].join(' ').toLowerCase();
    const expected=label.includes('comil')?'comil':label.includes('sprinter')?'sprinter':label.includes('volare')?'volare':label.includes('608')?'mercedes608':null;
    if(context.profile!==expected)return scanJson({message:'O perfil do laboratório não corresponde à condução selecionada.'},400);
    const profile=await client.from('v2_vehicle_technical_profiles').select('engine_code,identity_status').eq('company_id',companyId).eq('vehicle_id',vehicleId).maybeSingle();
    if(profile.error)return scanJson({message:'Ficha técnica indisponível.'},503);
    const key=await getOpenAiApiKey();if(!key)return scanJson({message:'A configuração existente da OpenAI precisa ser conferida.'},503);
    if(!conversation) {
      const r=await client.from('v2_ai_conversations').insert({company_id:companyId,user_id:user.id,title:'Scan Pro · '+question.slice(0,65),context:{source:'scan-pro',scan_pro:'v1',vehicle_context_id:vehicleId,simulated:true}}).select('id,context').single();
      if(r.error)return scanJson({message:'Não consegui abrir a conversa.'},503);conversation=r.data;
    }
    let userMessage=history.find(m=>m.role==='user'&&m.answer_data?.client_request_id===requestId);
    if(userMessage&&userMessage.content!==question)return scanJson({message:'Esta identificação já foi usada em outra mensagem.'},409);
    if(!userMessage) {
      const r=await client.from('v2_ai_messages').insert({company_id:companyId,user_id:user.id,conversation_id:conversation.id,role:'user',content:question,intent:'query',answer_data:{client_request_id:requestId,scan_pro:'v1',simulated:true,snapshot:context}}).select('id').single();
      if(r.error)return scanJson({message:'Não consegui guardar sua pergunta.'},503);userMessage=r.data;
    } else context=userMessage.answer_data?.snapshot||context;
    const providerAbort=new AbortController();
    const input=history.filter(m=>['user','assistant'].includes(m.role)&&m.id!==userMessage.id).slice(-12).map((m,index,rows)=>{
      let content=String(m.content).slice(0,2000);
      if(m.role==='user'&&index>=rows.length-6&&m.answer_data?.scan_pro==='v1'&&m.answer_data?.snapshot){
        try{content+='\n[EXERCÍCIO ANTERIOR, DADOS SIMULADOS]: '+JSON.stringify(checkedScanContext(m.answer_data.snapshot)).slice(0,5000);}catch{/* Unverifiable old metadata is not model context. */}
      }
      return {role:m.role,content};
    });
    async function analyze(onAnswer?:(text:string)=>void) {
      const timer=setTimeout(()=>providerAbort.abort(),55000);
      try {
        const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',signal:providerAbort.signal,headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({model:'gpt-5-mini',store:false,stream:true,max_output_tokens:2500,reasoning:{effort:'low'},instructions:scanInstructions(vehicle.data,profile.data,context),input:[...input,{role:'user',content:question}],text:{format:{type:'json_schema',name:'scan_pro_consultation',strict:true,schema:{type:'object',additionalProperties:false,properties:{answer:{type:'string'}},required:['answer']}}}})});
        if(!response.ok){const failure=await openAiProviderError(response);throw Error(failure.message);}
        const output=await readAssistantStream(response,text=>onAnswer?.(text));let answer:string;
        try{const parsed=JSON.parse(output.output_text);if(typeof parsed.answer!=='string'||!parsed.answer.trim()||parsed.answer.length>20000)throw Error('answer');answer=parsed.answer;}catch{throw Error('A resposta não pôde ser validada. Tente novamente.');}
        // Existing atomic, security-invoker RPC. No actions, diary entries or work-order bindings.
        const committed=await client.rpc('v2_ai_commit_turn',{p_company_id:companyId,p_conversation_id:conversation.id,p_user_message_id:userMessage.id,p_answer:answer,p_memory:'Conversa de laboratório Scan Pro. Todas as leituras são simuladas.',p_actions:[],p_entries:[],p_request_id:requestId});
        if(committed.error)throw Error('Não consegui guardar a resposta. Sua pergunta foi preservada; tente novamente.');
        return {conversation_id:conversation.id,answer:committed.data?.answer||answer,message_id:committed.data?.message_id};
      } finally {clearTimeout(timer);}
    }
    if(body.stream!==true)try{return scanJson(await analyze());}catch(e){return scanJson({conversation_id:conversation.id,message:e instanceof Error?e.message:'Consulta indisponível.'},503);}
    const encoder=new TextEncoder();let cancelled=false;
    return new Response(new ReadableStream({
      async start(controller) {
        const send=(value:unknown)=>{if(!cancelled)controller.enqueue(encoder.encode('data: '+JSON.stringify(value)+'\n\n'));};
        send({type:'session',conversation_id:conversation.id});
        try{const done=await analyze(answer=>send({type:'answer',answer}));send({type:'done',...done});}
        catch(e){send({type:'error',conversation_id:conversation.id,message:e instanceof Error&&e.name!=='AbortError'?e.message:'A consulta demorou demais. Tente novamente.'});}
        finally{if(!cancelled)controller.close();}
      },
      cancel(){cancelled=true;providerAbort.abort();}
    }),{headers:{...scanCors,'Content-Type':'text/event-stream','Cache-Control':'no-store','X-Accel-Buffering':'no'}});
  } catch {return scanJson({message:'Não foi possível consultar o diagnóstico. Tente novamente.'},503);}
});
