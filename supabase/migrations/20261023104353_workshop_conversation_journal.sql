-- A service journal records what the mechanic reports. It does not debit stock,
-- post expenses, set a diagnosis, or release a vehicle.
create table if not exists public.v2_workshop_journal (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.v2_companies(id) on delete restrict,
 vehicle_id uuid not null references public.v2_vehicles(id) on delete restrict,
 work_order_id uuid not null references public.v2_work_orders(id) on delete restrict,
 conversation_id uuid references public.v2_ai_conversations(id) on delete set null,
 source_message_id uuid references public.v2_ai_messages(id) on delete set null,
 source_request_id uuid not null,
 entry_index smallint not null check(entry_index between 1 and 21),
 kind text not null check(kind in ('finding','disassembly','work_done','part','measurement','test_result','hypothesis','plan','note','attachment')),
 description text not null check(length(btrim(description)) between 1 and 2000),
 source_quote text not null default '' check(length(source_quote)<=3000),
 attachments jsonb not null default '[]'::jsonb check(jsonb_typeof(attachments)='array' and jsonb_array_length(attachments)<=10),
 created_by uuid references auth.users(id) on delete set null,
 recorded_at timestamptz not null default now(),
 unique(company_id,conversation_id,source_request_id,entry_index)
);
create index if not exists idx_v2_workshop_journal_vehicle on public.v2_workshop_journal(vehicle_id,company_id,recorded_at desc);
create index if not exists idx_v2_workshop_journal_order on public.v2_workshop_journal(work_order_id,company_id,recorded_at desc);
create index if not exists idx_v2_workshop_journal_message on public.v2_workshop_journal(source_message_id);
create index if not exists idx_v2_workshop_journal_conversation on public.v2_workshop_journal(conversation_id);
create index if not exists idx_v2_workshop_journal_actor on public.v2_workshop_journal(created_by);
create unique index if not exists uq_v2_ai_workshop_start_request on public.v2_ai_conversations(company_id,user_id,(context->>'workshop_start_request_id')) where context->>'workshop_start_request_id' is not null;
create unique index if not exists uq_v2_ai_reply_client_request on public.v2_ai_messages(company_id,conversation_id,user_id,(answer_data->>'client_request_id')) where role='assistant' and answer_data->>'client_request_id' is not null;
alter table public.v2_workshop_journal enable row level security;
revoke all on public.v2_workshop_journal from public,anon,authenticated;
grant select,insert on public.v2_workshop_journal to authenticated;
create policy v2_workshop_journal_read on public.v2_workshop_journal for select to authenticated
 using(public.v2_is_company_member(company_id) and (public.v2_has_permission(company_id,'workshop.view') or public.v2_has_permission(company_id,'workshop.manage')));
create policy v2_workshop_journal_insert on public.v2_workshop_journal for insert to authenticated
 with check(created_by=(select auth.uid()) and public.v2_is_company_member(company_id) and public.v2_has_permission(company_id,'workshop.manage')
 and exists(select 1 from public.v2_work_orders w where w.id=work_order_id and w.company_id=v2_workshop_journal.company_id and w.vehicle_id=v2_workshop_journal.vehicle_id)
 and exists(select 1 from public.v2_ai_conversations c join public.v2_ai_messages m on m.conversation_id=c.id
  where c.id=v2_workshop_journal.conversation_id and c.company_id=v2_workshop_journal.company_id and c.user_id=(select auth.uid())
  and m.id=source_message_id and m.company_id=c.company_id and m.user_id=(select auth.uid()) and m.role='user'
  and (kind='attachment' or (length(source_quote)>0 and strpos(m.content,source_quote)>0))));

create or replace function public.v2_ai_start_workshop(p_company_id uuid,p_vehicle_id uuid,p_conversation_id uuid,p_work_order_id uuid,p_title text,p_request_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
 c public.v2_ai_conversations%rowtype; w public.v2_work_orders%rowtype; v public.v2_vehicles%rowtype;
 payload jsonb; reused boolean:=false;
begin
 if auth.uid() is null or not public.v2_is_company_member(p_company_id) or not public.v2_has_permission(p_company_id,'ai.use')
  or not public.v2_has_permission(p_company_id,'ai.actions.approve') or not public.v2_has_permission(p_company_id,'workshop.manage') then
  raise exception 'Sem permissão para iniciar o acompanhamento deste serviço' using errcode='42501';
 end if;
 if p_request_id is null then raise exception 'Confira a solicitação de início'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_company_id::text||':'||auth.uid()::text||':workshop:'||p_request_id::text,0));
 select * into c from public.v2_ai_conversations where company_id=p_company_id and user_id=auth.uid() and context->>'workshop_start_request_id'=p_request_id::text for update;
 reused=found;
 if not reused and p_conversation_id is not null then
  select * into c from public.v2_ai_conversations where company_id=p_company_id and id=p_conversation_id and user_id=auth.uid() for update;
  if not found then raise exception 'Conversa indisponível para este usuário e empresa' using errcode='42501'; end if;
 end if;
 select * into v from public.v2_vehicles where company_id=p_company_id and id=p_vehicle_id and status='active';
 if not found then raise exception 'Confira a condução desta empresa'; end if;
 if reused then
  select * into w from public.v2_work_orders where company_id=p_company_id and id=(c.context#>>'{workshop,work_order_id}')::uuid and vehicle_id=p_vehicle_id;
  if not found then raise exception 'Confira o serviço desta conversa'; end if;
 else
  if p_work_order_id is not null then
   select * into w from public.v2_work_orders where company_id=p_company_id and id=p_work_order_id and vehicle_id=p_vehicle_id for update;
   if not found or w.status in ('completed','cancelled') then raise exception 'Escolha um serviço aberto desta condução'; end if;
  else
   insert into public.v2_work_orders(company_id,vehicle_id,maintenance_type,title,status,started_at,metadata,created_by)
   values(p_company_id,p_vehicle_id,'other',left(coalesce(nullif(btrim(p_title),''),'Serviço acompanhado por conversa'),180),'in_progress',now(),jsonb_build_object('source','workshop_conversation','start_request_id',p_request_id),auth.uid()) returning * into w;
  end if;
  if c.id is null then
   insert into public.v2_ai_conversations(company_id,user_id,title,context)
   values(p_company_id,auth.uid(),left(v.description||' — '||w.title,80),'{}') returning * into c;
  end if;
 end if;
 payload=jsonb_build_object('work_order_id',w.id,'work_order_number',w.work_order_number,'vehicle_id',v.id,'vehicle_name',v.description,'plate',v.plate,'title',w.title,'status',w.status,'active',(not reused or coalesce((c.context#>>'{workshop,active}')::boolean,false)) and w.status not in ('completed','cancelled'),'can_record',true);
 if not reused then
  update public.v2_ai_conversations set context=coalesce(context,'{}')||jsonb_build_object('source','assistant360','vehicle_context_id',v.id,'workshop_start_request_id',p_request_id,'workshop',payload),updated_at=now()
  where company_id=p_company_id and id=c.id and user_id=auth.uid();
  insert into public.v2_ai_messages(company_id,conversation_id,user_id,role,content,intent,answer_data)
  values(p_company_id,c.id,auth.uid(),'assistant','Acompanhamento iniciado na OS #'||w.work_order_number||' de '||v.description||'. Pode me contar o que encontrou ou fez; os relatos serão organizados no diário deste serviço.','workshop_start',jsonb_build_object('workshop',payload));
 end if;
 return jsonb_build_object('conversation_id',c.id,'workshop',payload,'already_started',reused,'message','Acompanhando OS #'||w.work_order_number||' — '||v.description||'.');
end $$;

-- Reply, continuity memory and journal entries commit together. Locking the
-- conversation also serializes retries without overwriting an active service.
create or replace function public.v2_ai_commit_turn(p_company_id uuid,p_conversation_id uuid,p_user_message_id uuid,p_answer text,p_memory text,p_actions jsonb,p_entries jsonb,p_request_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
 c public.v2_ai_conversations%rowtype; m public.v2_ai_messages%rowtype; previous public.v2_ai_messages%rowtype;
 w public.v2_work_orders%rowtype; v public.v2_vehicles%rowtype;
 entry jsonb; sources jsonb; info jsonb:=null; reply_id uuid; ordinal smallint:=0; saved integer:=0; recording boolean:=false; new_context jsonb;
begin
 if auth.uid() is null or not public.v2_is_company_member(p_company_id) or not public.v2_has_permission(p_company_id,'ai.use') then raise exception 'Sem permissão para esta conversa' using errcode='42501'; end if;
 select * into c from public.v2_ai_conversations where id=p_conversation_id and company_id=p_company_id and user_id=auth.uid() for update;
 if not found then raise exception 'Conversa indisponível para este usuário e empresa' using errcode='42501'; end if;
 if p_request_id is null then raise exception 'Confira a solicitação desta mensagem'; end if;
 select * into previous from public.v2_ai_messages where company_id=p_company_id and conversation_id=c.id and user_id=auth.uid() and role='assistant' and answer_data->>'client_request_id'=p_request_id::text;
 if found then return jsonb_build_object('conversation_id',c.id,'message_id',previous.id,'answer',previous.content,'actions',coalesce(previous.answer_data->'actions','[]'),'workshop',previous.answer_data->'workshop','already_processed',true); end if;
 select * into m from public.v2_ai_messages where id=p_user_message_id and company_id=p_company_id and conversation_id=c.id and user_id=auth.uid() and role='user';
 if not found then raise exception 'Mensagem indisponível nesta conversa' using errcode='42501'; end if;
 if jsonb_typeof(p_entries) is distinct from 'array' or jsonb_array_length(p_entries)>20 or jsonb_typeof(p_actions) is distinct from 'array' or length(coalesce(p_answer,''))=0 then raise exception 'Confira a resposta e as anotações' using errcode='23514'; end if;
 sources=coalesce(m.answer_data->'source_attachments','[]');
 if jsonb_typeof(sources) is distinct from 'array' or jsonb_array_length(sources)>10 then raise exception 'Confira os anexos desta mensagem'; end if;
 new_context=coalesce(c.context,'{}');
 if c.context#>>'{workshop,work_order_id}' is not null then
  select * into w from public.v2_work_orders where company_id=p_company_id and id=(c.context#>>'{workshop,work_order_id}')::uuid and vehicle_id=(c.context#>>'{workshop,vehicle_id}')::uuid for update;
  if not found then raise exception 'Confira o serviço desta conversa'; end if;
  select * into v from public.v2_vehicles where company_id=p_company_id and id=w.vehicle_id;
  recording=coalesce((c.context#>>'{workshop,active}')::boolean,false) and w.status not in ('completed','cancelled');
  info=jsonb_build_object('work_order_id',w.id,'work_order_number',w.work_order_number,'vehicle_id',v.id,'vehicle_name',v.description,'plate',v.plate,'title',w.title,'status',w.status,'active',recording,'can_record',public.v2_has_permission(p_company_id,'workshop.manage'));
  new_context=jsonb_set(new_context,'{workshop}',info,true);
 end if;
 if jsonb_array_length(p_entries)>0 and not recording then raise exception 'Inicie o acompanhamento de um serviço aberto antes de registrar etapas'; end if;
 if recording and (jsonb_array_length(p_entries)>0 or jsonb_array_length(sources)>0) then
  if not public.v2_has_permission(p_company_id,'workshop.manage') then raise exception 'Sem permissão para registrar etapas deste serviço' using errcode='42501'; end if;
  if m.answer_data->>'work_order_id' is distinct from w.id::text or m.answer_data->>'workshop_vehicle_id' is distinct from w.vehicle_id::text then raise exception 'O serviço da conversa mudou durante o envio. Confira a OS e reenvie o relato'; end if;
  for entry in select value from jsonb_array_elements(p_entries) loop
   ordinal=ordinal+1;
   if jsonb_typeof(entry) is distinct from 'object' or entry->>'kind' is null or entry->>'kind' not in ('finding','disassembly','work_done','part','measurement','test_result','hypothesis','plan','note')
    or coalesce(length(btrim(entry->>'description')),0) not between 1 and 2000
    or coalesce(length(btrim(entry->>'source_quote')),0) not between 1 and 3000
    or strpos(m.content,entry->>'source_quote')=0 then raise exception 'Uma anotação não corresponde ao relato enviado' using errcode='23514'; end if;
   insert into public.v2_workshop_journal(company_id,vehicle_id,work_order_id,conversation_id,source_message_id,source_request_id,entry_index,kind,description,source_quote,created_by)
   values(p_company_id,v.id,w.id,c.id,m.id,p_request_id,ordinal,entry->>'kind',btrim(entry->>'description'),entry->>'source_quote',auth.uid());
   saved=saved+1;
  end loop;
  if jsonb_array_length(sources)>0 then
   if exists(select 1 from jsonb_array_elements(sources) s where s->>'bucket' is distinct from 'company-documents' or coalesce(s->>'path','') not like p_company_id::text||'/assistant360/%' or s->>'path' ~ '(%|\\|[?#])' or '..'=any(string_to_array(s->>'path','/'))) then raise exception 'Confira os anexos desta empresa'; end if;
   insert into public.v2_workshop_journal(company_id,vehicle_id,work_order_id,conversation_id,source_message_id,source_request_id,entry_index,kind,description,attachments,created_by)
   values(p_company_id,v.id,w.id,c.id,m.id,p_request_id,ordinal+1,'attachment',left('Anexos enviados: '||(select string_agg(coalesce(s->>'original_name','arquivo'),', ') from jsonb_array_elements(sources) s),2000),sources,auth.uid());
   saved=saved+1;
  end if;
 end if;
 if info is not null then info=info||jsonb_build_object('entries_written',saved); end if;
 insert into public.v2_ai_messages(company_id,conversation_id,user_id,role,content,intent,answer_data)
 values(p_company_id,c.id,auth.uid(),'assistant',p_answer,case when recording then 'workshop_conversation' else 'query' end,jsonb_build_object('actions',p_actions,'source_attachments',sources,'source_attachment',sources->0,'client_request_id',p_request_id,'workshop',info)) returning id into reply_id;
 update public.v2_ai_conversations set context=jsonb_set(new_context,'{memory}',to_jsonb(left(coalesce(p_memory,''),4000)),true)||jsonb_build_object('source','assistant360'),updated_at=now() where id=c.id and company_id=p_company_id and user_id=auth.uid();
 return jsonb_build_object('conversation_id',c.id,'message_id',reply_id,'answer',p_answer,'actions',p_actions,'workshop',info);
end $$;

create or replace function public.v2_ai_workshop_control(p_company_id uuid,p_conversation_id uuid,p_operation text,p_result text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare c public.v2_ai_conversations%rowtype; w public.v2_work_orders%rowtype; info jsonb; message_text text; source_id uuid;
begin
 if auth.uid() is null or not public.v2_is_company_member(p_company_id) or not public.v2_has_permission(p_company_id,'ai.use') or not public.v2_has_permission(p_company_id,'workshop.manage') then raise exception 'Sem permissão para este serviço' using errcode='42501'; end if;
 if p_operation is null or p_operation not in ('pause','finish') then raise exception 'Operação inválida'; end if;
 select * into c from public.v2_ai_conversations where company_id=p_company_id and id=p_conversation_id and user_id=auth.uid() for update;
 if not found then raise exception 'Conversa indisponível' using errcode='42501'; end if;
 select * into w from public.v2_work_orders where company_id=p_company_id and id=(c.context#>>'{workshop,work_order_id}')::uuid and vehicle_id=(c.context#>>'{workshop,vehicle_id}')::uuid for update;
 if not found then raise exception 'Confira o serviço desta conversa'; end if;
 info=coalesce(c.context->'workshop','{}')||jsonb_build_object('active',false,'entries_written',0);
 if p_operation='finish' then
  if not public.v2_has_permission(p_company_id,'ai.actions.approve') then raise exception 'Sem permissão para concluir este serviço' using errcode='42501'; end if;
  if coalesce(length(btrim(p_result)),0) not between 1 and 4000 then raise exception 'Informe o resultado do serviço antes de concluir'; end if;
  if w.status='cancelled' then raise exception 'Este serviço está cancelado'; end if;
  if w.status<>'completed' then
   update public.v2_work_orders set status='completed',completed_at=now(),service_performed=btrim(p_result),metadata=coalesce(metadata,'{}')||jsonb_build_object('completion_source','workshop_conversation','completion_conversation_id',c.id),updated_at=now() where company_id=p_company_id and id=w.id;
   insert into public.v2_ai_messages(company_id,conversation_id,user_id,role,content,intent)
   values(p_company_id,c.id,auth.uid(),'user','Conclusão informada: '||btrim(p_result),'workshop_finish') returning id into source_id;
   insert into public.v2_workshop_journal(company_id,vehicle_id,work_order_id,conversation_id,source_message_id,source_request_id,entry_index,kind,description,source_quote,created_by)
   values(p_company_id,w.vehicle_id,w.id,c.id,source_id,source_id,1,'note',left('Conclusão relatada: '||btrim(p_result),2000),left(btrim(p_result),3000),auth.uid());
  end if;
  info=info||jsonb_build_object('status','completed');message_text='OS #'||w.work_order_number||' concluída com o resultado informado. O diário permanece no histórico da condução.';
 else
  message_text='Acompanhamento pausado. A OS #'||w.work_order_number||' continua com o status atual; nenhuma conclusão foi registrada.';
 end if;
 update public.v2_ai_conversations set context=jsonb_set(coalesce(context,'{}'),'{workshop}',info,true),updated_at=now() where company_id=p_company_id and id=c.id and user_id=auth.uid();
 if coalesce((c.context#>>'{workshop,active}')::boolean,false) or p_operation='finish' and w.status<>'completed' then
  insert into public.v2_ai_messages(company_id,conversation_id,user_id,role,content,intent,answer_data) values(p_company_id,c.id,auth.uid(),'assistant',message_text,'workshop_control',jsonb_build_object('workshop',info));
 end if;
 return jsonb_build_object('conversation_id',c.id,'workshop',info,'message',message_text);
end $$;

revoke all on function public.v2_ai_start_workshop(uuid,uuid,uuid,uuid,text,uuid) from public,anon;
revoke all on function public.v2_ai_commit_turn(uuid,uuid,uuid,text,text,jsonb,jsonb,uuid) from public,anon;
revoke all on function public.v2_ai_workshop_control(uuid,uuid,text,text) from public,anon;
grant execute on function public.v2_ai_start_workshop(uuid,uuid,uuid,uuid,text,uuid) to authenticated;
grant execute on function public.v2_ai_commit_turn(uuid,uuid,uuid,text,text,jsonb,jsonb,uuid) to authenticated;
grant execute on function public.v2_ai_workshop_control(uuid,uuid,text,text) to authenticated;
