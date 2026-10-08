-- Confirmation locks the proposal and commits its target and result together.
-- SECURITY INVOKER keeps existing RLS and permissions authoritative.
create or replace function public.v2_execute_assistant_action(p_company_id uuid,p_action_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
 a public.v2_ai_action_requests%rowtype; p jsonb; src jsonb; fid uuid; target uuid; op uuid; odo bigint;
 n bigint; v_result jsonb; stamp timestamptz; load_date date; mt text;
begin
 if auth.uid() is null or not public.v2_is_company_member(p_company_id)
  or not public.v2_has_permission(p_company_id,'ai.use') or not public.v2_has_permission(p_company_id,'ai.actions.approve') then
  raise exception 'Sem permissão para confirmar esta ação' using errcode='42501';
 end if;
 select * into a from public.v2_ai_action_requests where company_id=p_company_id and id=p_action_id for update;
 if not found then raise exception 'Ação não encontrada'; end if;
 if a.status='executed' then return jsonb_build_object('ok',true,'already_executed',true,'action_request_id',a.id,'result',a.result); end if;
 if a.status not in ('proposed','approved') then raise exception 'Esta ação não está disponível para confirmação'; end if;
 p=coalesce(a.proposed_payload,'{}'); src=p->'_source';
 if jsonb_typeof(p->'missing_fields')='array' and jsonb_array_length(p->'missing_fields')>0 then raise exception 'Confira os dados que faltam antes de salvar'; end if;
 if a.action_type in ('fuel_log','odometer','maintenance') then
  if not exists(select 1 from public.v2_vehicles where company_id=p_company_id and id=(p->>'vehicle_id')::uuid) then raise exception 'Confira a condução desta empresa'; end if;
 end if;
 if a.action_type='fuel_log' and not public.v2_has_permission(p_company_id,'fleet.fuel.manage')
  or a.action_type='odometer' and not public.v2_has_permission(p_company_id,'fleet.manage')
  or a.action_type='maintenance' and not public.v2_has_permission(p_company_id,'workshop.manage')
  or a.action_type='poultry_schedule' and (not public.v2_has_permission(p_company_id,'operations.create') or not public.v2_has_permission(p_company_id,'poultry.manage')) then
  raise exception 'Sem permissão para este lançamento' using errcode='42501';
 end if;
 if a.action_type not in ('fuel_log','odometer','maintenance','poultry_schedule') then raise exception 'Tipo de ação ainda não executável'; end if;
 if a.action_type='poultry_schedule' then
  if nullif(p->>'farm_id','') is null or nullif(p->>'integrator_id','') is null then raise exception 'Confira a granja e o integrado antes de salvar'; end if;
  if nullif(p->>'farm_id','') is not null and not exists(select 1 from public.v2_poultry_farms where company_id=p_company_id and id=(p->>'farm_id')::uuid and integrator_id=(p->>'integrator_id')::uuid)
   or nullif(p->>'integrator_id','') is not null and not exists(select 1 from public.v2_poultry_integrators where company_id=p_company_id and id=(p->>'integrator_id')::uuid)
   or nullif(p->>'team_id','') is not null and not exists(select 1 from public.v2_teams where company_id=p_company_id and id=(p->>'team_id')::uuid) then raise exception 'Confira granja, integrado e equipe desta empresa'; end if;
 end if;
 if src->>'bucket' is not null and src->>'path' is not null and a.action_type<>'odometer' then
  if src->>'bucket'<>'company-documents' or src->>'path' not like p_company_id::text||'/assistant360/%' then raise exception 'Confira o anexo desta empresa'; end if;
  insert into public.v2_files(company_id,storage_bucket,storage_path,original_name,mime_type,size_bytes,category,entity_type,metadata,uploaded_by)
  values(p_company_id,src->>'bucket',src->>'path',coalesce(src->>'original_name','imagem'),src->>'mime_type',nullif(src->>'size_bytes','')::bigint,'assistant_source',
   case a.action_type when 'fuel_log' then 'fuel_log' when 'maintenance' then 'work_order' else 'poultry_loading' end,'{"source":"assistant360"}',auth.uid()) returning id into fid;
 end if;
 stamp=case when nullif(p->>'date','') is not null then ((p->>'date')||'T12:00:00-03:00')::timestamptz else now() end;
 if a.action_type='fuel_log' then
  insert into public.v2_fuel_logs(company_id,vehicle_id,fueled_at,odometer_km,liters,total_amount,station_name,file_id,metadata)
  values(p_company_id,(p->>'vehicle_id')::uuid,stamp,nullif(p->>'odometer_km','')::numeric,(p->>'liters')::numeric,(p->>'total_amount')::numeric,p->>'station_name',fid,
   jsonb_build_object('source','assistant360','assistant_action_request_id',a.id,'full_tank',p->'full_tank','driver',p->'driver','price_per_liter',p->'price_per_liter','attachment',src)) returning id into target;
  if nullif(p->>'odometer_km','') is not null then
   insert into public.v2_vehicle_odometer_logs(company_id,vehicle_id,recorded_at,odometer_km,source,metadata)
   values(p_company_id,(p->>'vehicle_id')::uuid,stamp,(p->>'odometer_km')::numeric,'fuel',jsonb_build_object('assistant_action_request_id',a.id));
   update public.v2_vehicles set current_odometer_km=(p->>'odometer_km')::numeric where company_id=p_company_id and id=(p->>'vehicle_id')::uuid and (current_odometer_km is null or current_odometer_km<(p->>'odometer_km')::numeric);
  end if;
  v_result=jsonb_build_object('target_type','fuel_log','target_id',target,'message','Abastecimento salvo com sucesso.');
 elsif a.action_type='odometer' then
  insert into public.v2_vehicle_odometer_logs(company_id,vehicle_id,recorded_at,odometer_km,source,metadata)
  values(p_company_id,(p->>'vehicle_id')::uuid,stamp,(p->>'odometer_km')::numeric,'assistant',jsonb_build_object('assistant_action_request_id',a.id,'attachment',src)) returning id into odo;
  update public.v2_vehicles set current_odometer_km=(p->>'odometer_km')::numeric where company_id=p_company_id and id=(p->>'vehicle_id')::uuid and (current_odometer_km is null or current_odometer_km<(p->>'odometer_km')::numeric);
  v_result=jsonb_build_object('target_type','vehicle_odometer','target_id',odo::text,'message','Quilometragem registrada.');
 elsif a.action_type='maintenance' then
  mt=case when p->>'maintenance_type' in ('preventive','corrective','inspection','tire','electrical','other') then p->>'maintenance_type' else 'other' end;
  insert into public.v2_work_orders(company_id,vehicle_id,maintenance_type,title,reported_issue,service_performed,odometer_km,labor_amount,parts_amount,total_amount,status,metadata,created_by)
  values(p_company_id,(p->>'vehicle_id')::uuid,mt,coalesce(nullif(p->>'title',''),nullif(p->>'reported_issue',''),nullif(p->>'service_performed',''),'Manutenção lançada pelo Assistente 360'),p->>'reported_issue',p->>'service_performed',nullif(p->>'odometer_km','')::numeric,
   coalesce(nullif(p->>'labor_amount','')::numeric,0),0,coalesce(nullif(p->>'labor_amount','')::numeric,0),'open',jsonb_build_object('source','assistant360','assistant_action_request_id',a.id,'attachment',src,'file_id',fid),auth.uid()) returning id,work_order_number into target,n;
  v_result=jsonb_build_object('target_type','work_order','target_id',target,'message','Ordem de serviço #'||n||' aberta.');
 else
  load_date=coalesce(nullif(left(p->>'scheduled_start',10),'')::date,nullif(p->>'date','')::date,(now() at time zone 'America/Sao_Paulo')::date);
  insert into public.v2_operations(company_id,operation_type,title,customer_name,location_name,location_address,scheduled_start,status,team_id,planned_birds,notes,metadata,created_by)
  values(p_company_id,'poultry_catching',coalesce(nullif(p->>'title',''),'Apanha - '||coalesce(p->>'farm_name',p->>'producer','granja')),p->>'integrator_name',coalesce(p->>'farm_name',p->>'producer'),jsonb_build_object('city',p->'city'),nullif(p->>'scheduled_start','')::timestamptz,'planned',nullif(p->>'team_id','')::uuid,nullif(p->>'planned_birds','')::bigint,p->>'notes',jsonb_build_object('source','assistant360','assistant_action_request_id',a.id,'attachment',src),auth.uid()) returning id,operation_number into op,n;
  insert into public.v2_poultry_loadings(company_id,operation_id,integrator_id,farm_id,loading_date,catching_method,planned_birds,status,report_file_id,notes,metadata,team_id)
  values(p_company_id,op,nullif(p->>'integrator_id','')::uuid,nullif(p->>'farm_id','')::uuid,load_date,'back',nullif(p->>'planned_birds','')::bigint,'planned',fid,p->>'notes',jsonb_build_object('source','assistant360','assistant_action_request_id',a.id,'attachment',src),nullif(p->>'team_id','')::uuid) returning id into target;
  v_result=jsonb_build_object('target_type','poultry_loading','target_id',target,'operation_id',op,'message','Apanha programada como operação #'||n||'.');
 end if;
 update public.v2_ai_action_requests set status='executed',approved_by=auth.uid(),approved_at=coalesce(approved_at,now()),executed_at=now(),target_type=v_result->>'target_type',target_id=target,result=v_result where company_id=p_company_id and id=a.id;
 return jsonb_build_object('ok',true,'action_request_id',a.id,'result',v_result);
end $$;
revoke all on function public.v2_execute_assistant_action(uuid,uuid) from public,anon;
grant execute on function public.v2_execute_assistant_action(uuid,uuid) to authenticated;
