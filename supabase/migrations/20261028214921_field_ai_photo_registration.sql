-- The field endpoint authenticates the device before creating its server client.
-- These RPCs are invoker functions, executable only by service_role. They recheck
-- the device, team, company, permissions and draft ownership inside the transaction.
create or replace function public.v2_field_ai_commit_turn(
 p_company_id uuid,p_user_id uuid,p_device_access_id uuid,p_conversation_id uuid,
 p_user_message_id uuid,p_request_id uuid,p_answer text,p_memory text,p_actions jsonb
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare
 d public.v2_device_access%rowtype;c public.v2_ai_conversations%rowtype;m public.v2_ai_messages%rowtype;
 a jsonb;p jsonb;s jsonb;action_id uuid;reply_id uuid;actions jsonb:='[]';permission_key text;
begin
 select * into d from public.v2_device_access where id=p_device_access_id and company_id=p_company_id and user_id=p_user_id and active for share;
 if not found or d.control_state<>'active' or d.lost_mode or d.permissions->>'ia'='false' then raise exception 'Aparelho sem acesso à IA de campo' using errcode='42501';end if;
 select * into c from public.v2_ai_conversations where id=p_conversation_id and company_id=p_company_id and user_id=p_user_id and context->>'scope'='field' and context->>'team_id'=d.team_id::text and context->>'device_access_id'=d.id::text for update;
 if not found then raise exception 'Conversa indisponível nesta equipe' using errcode='42501';end if;
 select * into m from public.v2_ai_messages where conversation_id=c.id and company_id=p_company_id and user_id=p_user_id and role='assistant' and answer_data->>'client_request_id'=p_request_id::text limit 1;
 if found then return jsonb_build_object('conversation_id',c.id,'answer',m.content,'actions',m.answer_data->'actions','already_processed',true);end if;
 if p_request_id is null or coalesce(length(btrim(p_answer)),0)=0 or length(p_answer)>20000 or jsonb_typeof(p_actions) is distinct from 'array' or jsonb_array_length(p_actions)>40 then raise exception 'Confira a resposta da IA';end if;
 select * into m from public.v2_ai_messages where id=p_user_message_id and conversation_id=c.id and company_id=p_company_id and user_id=p_user_id and role='user';
 if not found then raise exception 'Mensagem indisponível nesta conversa' using errcode='42501';end if;
 if jsonb_array_length(p_actions)>0 then
  update public.v2_ai_action_requests set status='cancelled' where conversation_id=c.id and company_id=p_company_id and requested_by=p_user_id and status='proposed' and proposed_payload->>'_scope'='field';
 end if;
 for a in select value from jsonb_array_elements(p_actions) loop
  permission_key=case a->>'action_type' when 'fuel_log' then 'abastecimento' when 'poultry_operation' then 'apanha' when 'attendance_event' then 'ponto' end;
  if permission_key is null or d.permissions->>permission_key='false' then raise exception 'Tipo de lançamento não liberado neste aparelho' using errcode='42501';end if;
  p=a->'payload';
  if p->>'team_id' is distinct from d.team_id::text or p->>'device_access_id' is distinct from d.id::text or p->>'_scope' is distinct from 'field' then raise exception 'Confira a equipe da proposta' using errcode='42501';end if;
  if jsonb_typeof(p->'_sources') is distinct from 'array' then raise exception 'Confira os anexos';end if;
  for s in select value from jsonb_array_elements(p->'_sources') loop
   if s->>'bucket' is distinct from 'company-documents' or left(coalesce(s->>'path',''),length(p_company_id::text||'/assistant360/field/'||d.team_id::text||'/'||p_user_id::text||'/'))<>p_company_id::text||'/assistant360/field/'||d.team_id::text||'/'||p_user_id::text||'/'
    or s->>'path' ~ '(%|\\|[?#])' or '..'=any(string_to_array(s->>'path','/'))
    or not exists(select 1 from storage.objects o where o.bucket_id='company-documents' and o.name=s->>'path') then raise exception 'Foto indisponível nesta equipe' using errcode='42501';end if;
  end loop;
  p=p||jsonb_build_object('summary',a->>'summary','confidence',a->'confidence','missing_fields',a->'missing_fields');
  insert into public.v2_ai_action_requests(company_id,conversation_id,requested_by,action_type,target_type,proposed_payload,status)
  values(p_company_id,c.id,p_user_id,a->>'action_type',a->>'action_type',p,'proposed') returning id into action_id;
  actions=actions||jsonb_build_array(a||jsonb_build_object('id',action_id,'status','proposed'));
 end loop;
 insert into public.v2_ai_messages(company_id,conversation_id,user_id,role,content,answer_data)
 values(p_company_id,c.id,p_user_id,'assistant',p_answer,jsonb_build_object('actions',actions,'client_request_id',p_request_id)) returning id into reply_id;
 update public.v2_ai_conversations set context=context||jsonb_build_object('memory',left(coalesce(p_memory,''),4000)),updated_at=now() where id=c.id;
 return jsonb_build_object('conversation_id',c.id,'message_id',reply_id,'answer',p_answer,'actions',actions);
end $$;
revoke all on function public.v2_field_ai_commit_turn(uuid,uuid,uuid,uuid,uuid,uuid,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.v2_field_ai_commit_turn(uuid,uuid,uuid,uuid,uuid,uuid,text,text,jsonb) to service_role;

create or replace function public.v2_execute_field_assistant_action(p_company_id uuid,p_user_id uuid,p_device_access_id uuid,p_action_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
 d public.v2_device_access%rowtype;c public.v2_ai_conversations%rowtype;a public.v2_ai_action_requests%rowtype;
 f public.v2_poultry_farms%rowtype;team public.v2_teams%rowtype;oprow public.v2_operations%rowtype;
 p jsonb;s jsonb;t jsonb;meta jsonb;v_result jsonb;permission_key text;prefix text;kind text;
 target uuid;file_id uuid;op uuid;loading uuid;integrator uuid;truck_id uuid;barn uuid;
 stamp timestamptz;day date;birds bigint;truck_count integer;next_sequence integer;duplicate_count integer;
 v_producer text;v_farm_name text;v_city text;aviary text;
begin
 select * into d from public.v2_device_access where id=p_device_access_id and company_id=p_company_id and user_id=p_user_id and active for share;
 if not found or d.control_state<>'active' or d.lost_mode or d.permissions->>'ia'='false' then raise exception 'Aparelho sem acesso à IA de campo' using errcode='42501';end if;
 select * into a from public.v2_ai_action_requests where id=p_action_id and company_id=p_company_id and requested_by=p_user_id;
 if not found then raise exception 'Proposta indisponível neste aparelho' using errcode='42501';end if;
 select * into c from public.v2_ai_conversations where id=a.conversation_id and company_id=p_company_id and user_id=p_user_id and context->>'scope'='field' and context->>'team_id'=d.team_id::text and context->>'device_access_id'=d.id::text for update;
 if not found then raise exception 'Proposta de outra equipe ou aparelho' using errcode='42501';end if;
 select * into a from public.v2_ai_action_requests where id=p_action_id for update;
 p=a.proposed_payload;kind=a.action_type;
 permission_key=case kind when 'fuel_log' then 'abastecimento' when 'poultry_operation' then 'apanha' when 'attendance_event' then 'ponto' end;
 if permission_key is null or d.permissions->>permission_key='false' then raise exception 'Lançamento não liberado neste aparelho' using errcode='42501';end if;
 if p->>'_scope' is distinct from 'field' or p->>'team_id' is distinct from d.team_id::text or p->>'device_access_id' is distinct from d.id::text then raise exception 'Confira a equipe da proposta' using errcode='42501';end if;
 if a.status='executed' then return jsonb_build_object('ok',true,'already_executed',true,'result',a.result);end if;
 if a.status<>'proposed' then raise exception 'Esta proposta foi substituída ou encerrada. Confira a mais recente.';end if;
 if jsonb_typeof(p->'missing_fields') is distinct from 'array' or jsonb_array_length(p->'missing_fields')>0 then raise exception 'Complete os dados pendentes no chat antes de salvar';end if;
 if coalesce(p->>'date','') !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Confira a data do registro';end if;
 day=(p->>'date')::date;stamp=(day::text||'T12:00:00-03:00')::timestamptz;
 prefix=p_company_id::text||'/assistant360/field/'||d.team_id::text||'/'||p_user_id::text||'/';
 if jsonb_typeof(p->'_sources') is distinct from 'array' then raise exception 'Confira os anexos';end if;
 for s in select value from jsonb_array_elements(p->'_sources') loop
  if s->>'bucket' is distinct from 'company-documents' or left(coalesce(s->>'path',''),length(prefix))<>prefix or s->>'path' ~ '(%|\\|[?#])' or '..'=any(string_to_array(s->>'path','/'))
   or not exists(select 1 from storage.objects o where o.bucket_id='company-documents' and o.name=s->>'path') then raise exception 'Foto indisponível nesta equipe' using errcode='42501';end if;
 end loop;
 meta=jsonb_build_object('source','field_ai_photo','assistant_action_request_id',a.id,'device_access_id',d.id,'team_id',d.team_id,'attachments',p->'_sources','notes',p->>'notes');
 if jsonb_array_length(p->'_sources')>0 then
  s=p->'_sources'->0;
  insert into public.v2_files(company_id,storage_bucket,storage_path,original_name,mime_type,size_bytes,category,entity_type,metadata,uploaded_by)
  values(p_company_id,'company-documents',s->>'path',coalesce(s->>'original_name','foto.jpg'),s->>'mime_type',nullif(s->>'size_bytes','')::bigint,'assistant_source',kind,meta,p_user_id) returning id into file_id;
 end if;
 select * into team from public.v2_teams where id=d.team_id and company_id=p_company_id and status='active';
 if not found then raise exception 'Equipe indisponível' using errcode='42501';end if;
 if kind='fuel_log' then
  if not exists(select 1 from public.v2_vehicles where id=(p->>'vehicle_id')::uuid and company_id=p_company_id and status='active') then raise exception 'Confira a condução desta empresa' using errcode='42501';end if;
  if coalesce((p->>'liters')::numeric,0)<=0 or (p->>'liters')::numeric='NaN'::numeric or (p->>'total_amount') is null or (p->>'total_amount')::numeric<0 or (p->>'total_amount')::numeric='NaN'::numeric or (p->>'odometer_km')::numeric<0 then raise exception 'Confira litros, valor e quilometragem';end if;
  insert into public.v2_fuel_logs(company_id,vehicle_id,fueled_at,odometer_km,liters,total_amount,station_name,file_id,metadata,offline_event_id)
  values(p_company_id,(p->>'vehicle_id')::uuid,stamp,(p->>'odometer_km')::numeric,(p->>'liters')::numeric,(p->>'total_amount')::numeric,p->>'station_name',file_id,meta||jsonb_build_object('driver',p->>'driver','full_tank',p->'full_tank','price_per_liter',p->'price_per_liter'),'field-ai:'||a.id) returning id into target;
  if p->>'odometer_km' is not null then
   insert into public.v2_vehicle_odometer_logs(company_id,vehicle_id,recorded_at,odometer_km,source,metadata) values(p_company_id,(p->>'vehicle_id')::uuid,stamp,(p->>'odometer_km')::numeric,'fuel',meta);
   update public.v2_vehicles set current_odometer_km=(p->>'odometer_km')::numeric where id=(p->>'vehicle_id')::uuid and company_id=p_company_id and (current_odometer_km is null or current_odometer_km<(p->>'odometer_km')::numeric);
  end if;
  v_result=jsonb_build_object('target_type','fuel_log','target_id',target,'message','Abastecimento salvo com sucesso.');
 elsif kind='attendance_event' then
  -- Transcription is manual evidence, never a facial verification or an inferred punch.
  perform 1 from public.v2_employees where id=(p->>'employee_id')::uuid and company_id=p_company_id and status='active' for update;
  if not found then raise exception 'Confira a pessoa desta empresa' using errcode='42501';end if;
  if coalesce(p->>'occurred_at','') !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(Z|[+-]\d{2}:\d{2})$' or coalesce(p->>'event_type','') not in ('in','out','break_start','break_end') then raise exception 'Informe a data, o horário exato e o tipo da batida';end if;
  stamp=(p->>'occurred_at')::timestamptz;
  if (stamp at time zone 'America/Sao_Paulo')::date<>day or stamp>now()+interval '5 minutes' then raise exception 'Confira a data e o horário da batida';end if;
  if exists(select 1 from public.v2_attendance_events where company_id=p_company_id and employee_id=(p->>'employee_id')::uuid and occurred_at=stamp and event_type=p->>'event_type') then raise exception 'Esta batida já está cadastrada. Confira o ponto antes de lançar novamente.';end if;
  insert into public.v2_attendance_events(company_id,employee_id,occurred_at,event_type,method,work_team_id,device_access_id,metadata,created_by,offline_event_id)
  values(p_company_id,(p->>'employee_id')::uuid,stamp,p->>'event_type','manual',d.team_id,d.id,meta||jsonb_build_object('identification_method','photo_transcription','selfie_evidence',false,'file_id',file_id),p_user_id,'field-ai:'||a.id) returning id into target;
  v_result=jsonb_build_object('target_type','attendance_event','target_id',target,'message','Ponto registrado com a data e o horário conferidos.');
 elsif kind='poultry_operation' then
  v_producer=nullif(btrim(p->>'producer'),'');v_farm_name=coalesce(nullif(btrim(p->>'farm_name'),''),v_producer);v_city=nullif(btrim(p->>'city'),'');
  if v_producer is null or v_city is null then raise exception 'Informe integrado/produtor e cidade';end if;
  perform pg_advisory_xact_lock(hashtextextended(p_company_id::text||lower(v_producer)||lower(v_city)||lower(v_farm_name),0));
  if p->>'farm_id' is not null then
   select * into f from public.v2_poultry_farms where id=(p->>'farm_id')::uuid and company_id=p_company_id and status='active';
   if not found then raise exception 'Granja indisponível nesta empresa' using errcode='42501';end if;
  else
   select * into f from public.v2_poultry_farms where company_id=p_company_id and lower(btrim(producer_name))=lower(v_producer) and lower(btrim(farm_name))=lower(v_farm_name) and lower(btrim(coalesce(v2_poultry_farms.city,'')))=lower(v_city) and status='active' order by created_at limit 1;
   if not found then
    select id into integrator from public.v2_poultry_integrators where company_id=p_company_id and lower(btrim(name))=lower(v_producer) and status='active' order by created_at limit 1;
    if integrator is null then insert into public.v2_poultry_integrators(company_id,name,status,metadata) values(p_company_id,v_producer,'active',jsonb_build_object('created_from','field_ai')) returning id into integrator;end if;
    insert into public.v2_poultry_farms(company_id,integrator_id,producer_name,farm_name,city,address,status,metadata)
    values(p_company_id,integrator,v_producer,v_farm_name,v_city,jsonb_build_object('city',v_city),'active',jsonb_build_object('created_from','field_ai','created_for_team_id',d.team_id,'energy_type',p->>'energy_type','outlet_type',p->>'outlet_type')) returning * into f;
   end if;
  end if;
  if nullif(p->>'operation_id','') is not null then
   select * into oprow from public.v2_operations where id=(p->>'operation_id')::uuid and company_id=p_company_id and team_id=d.team_id and operation_type='poultry_catching' and status<>'cancelled' for update;
   if not found or (oprow.scheduled_start at time zone 'America/Sao_Paulo')::date<>day then raise exception 'Confira a apanha e a data desta equipe' using errcode='42501';end if;
   select id into loading from public.v2_poultry_loadings where operation_id=oprow.id and company_id=p_company_id and team_id=d.team_id and farm_id=f.id;
   if loading is null then raise exception 'Confira a granja da apanha' using errcode='42501';end if;op=oprow.id;
  else
   select count(*) into duplicate_count from public.v2_poultry_loadings l join public.v2_operations o on o.id=l.operation_id where l.company_id=p_company_id and l.team_id=d.team_id and l.farm_id=f.id and l.loading_date=day and o.status<>'cancelled';
   if duplicate_count>1 then raise exception 'Há mais de uma apanha desta granja no dia. Informe qual deve receber a ficha.';end if;
   if duplicate_count=1 then select l.operation_id,l.id into op,loading from public.v2_poultry_loadings l join public.v2_operations o on o.id=l.operation_id where l.company_id=p_company_id and l.team_id=d.team_id and l.farm_id=f.id and l.loading_date=day and o.status<>'cancelled';end if;
   if op is null then
    insert into public.v2_operations(company_id,operation_type,title,customer_name,location_name,team_id,scheduled_start,status,notes,metadata,created_by)
    values(p_company_id,'poultry_catching','Apanha - '||v_producer,v_producer,concat_ws(' • ',v_city,v_farm_name),d.team_id,coalesce(nullif(p->>'scheduled_start','')::timestamptz,stamp),'planned',p->>'notes',meta||jsonb_build_object('farm_id',f.id,'city',v_city,'integrated_name',v_producer,'outlet_type',p->>'outlet_type','energy_type',p->>'energy_type'),p_user_id) returning id into op;
    insert into public.v2_poultry_loadings(company_id,operation_id,integrator_id,farm_id,loading_date,catching_method,status,team_id,notes,metadata,report_file_id)
    values(p_company_id,op,f.integrator_id,f.id,day,'back','planned',d.team_id,p->>'notes',meta,file_id) returning id into loading;
   end if;
  end if;
  perform 1 from public.v2_poultry_loadings where id=loading for update;
  if jsonb_typeof(p->'trucks') is distinct from 'array' or jsonb_array_length(p->'trucks')>30 then raise exception 'Confira os caminhões da ficha';end if;
  for t in select value from jsonb_array_elements(p->'trucks') loop
   next_sequence=(t->>'truck_sequence')::integer;
   if next_sequence is null or next_sequence<1 or t->>'birds' is null or (t->>'birds')::bigint<0 then raise exception 'Confira número e aves de cada caminhão';end if;
   if exists(select 1 from public.v2_poultry_truck_loads where loading_id=loading and truck_sequence=next_sequence) then raise exception 'O caminhão % já está lançado nesta apanha. Confira a ficha antes de repetir.',next_sequence;end if;
   if nullif(t->>'completed_at','')::timestamptz < nullif(t->>'started_at','')::timestamptz then raise exception 'Confira a ordem dos horários do caminhão';end if;
   aviary=coalesce(nullif(t->>'aviary',''),nullif(p->>'aviary',''));
   insert into public.v2_poultry_truck_loads(company_id,loading_id,truck_sequence,truck_plate,driver_name,birds,cages,started_at,completed_at,is_cata,truck_origin,external_reference,metadata)
   values(p_company_id,loading,next_sequence,nullif(t->>'truck_plate',''),nullif(t->>'driver_name',''),(t->>'birds')::bigint,nullif(t->>'boxes_count','')::integer,nullif(t->>'started_at','')::timestamptz,nullif(t->>'completed_at','')::timestamptz,coalesce((t->>'is_cata')::boolean,false),nullif(t->>'truck_origin',''),'field-ai:'||a.id||':'||next_sequence,
    meta||jsonb_build_object('aviary_number',aviary,'boxes_count',t->'boxes_count','empty_boxes',t->'empty_boxes','birds_per_box',t->'birds_per_box','notes',t->>'notes')) returning id into truck_id;
   if aviary is not null and not coalesce((t->>'is_cata')::boolean,false) then
    select id into barn from public.v2_poultry_barns b where b.company_id=p_company_id and b.farm_id=f.id and b.barn_number=aviary limit 1;
    if barn is null then insert into public.v2_poultry_barns(company_id,farm_id,barn_number,status) values(p_company_id,f.id,aviary,'active') returning id into barn;end if;
    insert into public.v2_poultry_truck_barns(company_id,truck_load_id,barn_id,sequence_no,birds,started_at,completed_at) values(p_company_id,truck_id,barn,1,(t->>'birds')::bigint,nullif(t->>'started_at','')::timestamptz,nullif(t->>'completed_at','')::timestamptz);
   end if;
  end loop;
  select coalesce(sum(tl.birds),0),count(*) into birds,truck_count from public.v2_poultry_truck_loads tl where tl.loading_id=loading;
  if jsonb_array_length(p->'trucks')>0 then
   update public.v2_poultry_loadings set reported_birds=birds,reported_trucks=truck_count,status='in_progress' where id=loading;
   update public.v2_operations set actual_birds=birds,status='in_progress' where id=op;
  end if;
  target=loading;v_result=jsonb_build_object('target_type','poultry_loading','target_id',target,'operation_id',op,'message','Apanha salva com os caminhões conferidos.');
 end if;
 update public.v2_ai_action_requests set status='executed',approved_by=p_user_id,approved_at=now(),executed_at=now(),target_type=v_result->>'target_type',target_id=target,result=v_result where id=a.id;
 return jsonb_build_object('ok',true,'action_request_id',a.id,'result',v_result);
end $$;
revoke all on function public.v2_execute_field_assistant_action(uuid,uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.v2_execute_field_assistant_action(uuid,uuid,uuid,uuid) to service_role;

-- Field upload permissions cover only the current user's own team folder.
create policy v2_field_ai_photo_insert on storage.objects for insert to authenticated with check (
 bucket_id='company-documents' and (storage.foldername(name))[2]='assistant360' and (storage.foldername(name))[3]='field'
 and (storage.foldername(name))[5]=(select auth.uid())::text and private.v2_is_device_session()
 and exists(select 1 from public.v2_device_access da where da.company_id::text=(storage.foldername(name))[1] and da.team_id::text=(storage.foldername(name))[4] and da.user_id=(select auth.uid()) and da.active and da.control_state='active' and not da.lost_mode and coalesce(da.permissions->>'ia','true')<>'false')
);
