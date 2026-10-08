-- Production definitions, temporary tables, no real business rows or sequences.
create temporary table v2_ai_action_requests (like public.v2_ai_action_requests including all) on commit drop;
create temporary table v2_files (like public.v2_files including all) on commit drop;
create temporary table v2_fuel_logs (like public.v2_fuel_logs including all) on commit drop;
create temporary table v2_vehicle_odometer_logs (like public.v2_vehicle_odometer_logs including all) on commit drop;
alter table pg_temp.v2_vehicle_odometer_logs alter column id drop identity if exists;
create temporary sequence assistant_test_odometer_seq;
alter table pg_temp.v2_vehicle_odometer_logs alter column id set default nextval('pg_temp.assistant_test_odometer_seq'::regclass);
create temporary table v2_vehicles (like public.v2_vehicles including all) on commit drop;
create temporary table v2_work_orders (like public.v2_work_orders including all) on commit drop;
create temporary table v2_operations (like public.v2_operations including all) on commit drop;
create temporary table v2_poultry_loadings (like public.v2_poultry_loadings including all) on commit drop;
create temporary table v2_poultry_farms (like public.v2_poultry_farms including all) on commit drop;
create temporary table v2_poultry_integrators (like public.v2_poultry_integrators including all) on commit drop;
create temporary table v2_teams (like public.v2_teams including all) on commit drop;
create function pg_temp.v2_is_company_member(uuid) returns boolean language sql as $$select $1::text=current_setting('c360.assistant_test_company')$$;
create function pg_temp.v2_has_permission(uuid,text) returns boolean language sql as $$select $1::text=current_setting('c360.assistant_test_company') and $2<>coalesce(current_setting('c360.assistant_denied_permission',true),'')$$;
do $$declare d text;begin
 d=pg_get_functiondef('public.v2_execute_assistant_action(uuid,uuid)'::regprocedure);
 d=replace(d,'public.v2_','pg_temp.v2_');d=replace(d,'auth.uid()','''00000000-0000-4000-8000-000000000099''::uuid');execute d;
end $$;
do $$declare c uuid=gen_random_uuid(); v uuid=gen_random_uuid(); foreign_v uuid=gen_random_uuid(); a uuid=gen_random_uuid(); b uuid=gen_random_uuid(); f uuid=gen_random_uuid(); farm uuid=gen_random_uuid(); out jsonb; out2 jsonb; caught boolean; before_count int;begin
 perform set_config('c360.assistant_test_company',c::text,true);perform set_config('c360.assistant_denied_permission','',true);
 insert into pg_temp.v2_vehicles(id,company_id,plate,description,current_odometer_km,status) values(v,c,'QAQ1A23','Temporary vehicle',100,'active'),(foreign_v,gen_random_uuid(),'QAQ1A24','Temporary foreign vehicle',100,'active');
 insert into pg_temp.v2_ai_action_requests(id,company_id,conversation_id,requested_by,action_type,status,proposed_payload) values(a,c,gen_random_uuid(),'00000000-0000-4000-8000-000000000099','fuel_log','proposed',jsonb_build_object('vehicle_id',v,'date','2026-10-07','odometer_km',150,'liters',10,'total_amount',60));
 out=pg_temp.v2_execute_assistant_action(c,a);out2=pg_temp.v2_execute_assistant_action(c,a);
 if out->'result' is distinct from out2->'result' or not (out2->>'already_executed')::boolean or (select count(*) from pg_temp.v2_fuel_logs)<>1 or (select count(*) from pg_temp.v2_vehicle_odometer_logs)<>1 then raise exception 'TEST: retry duplicated fuel or odometer'; end if;
 if (select current_odometer_km from pg_temp.v2_vehicles where id=v)<>150 then raise exception 'TEST: odometer not updated'; end if;
 -- Force a later statement to fail after the fuel INSERT; everything must roll back.
 alter table pg_temp.v2_vehicle_odometer_logs add constraint temporary_later_write_failure check(odometer_km<200);
 insert into pg_temp.v2_ai_action_requests(id,company_id,conversation_id,requested_by,action_type,status,proposed_payload) values(b,c,gen_random_uuid(),'00000000-0000-4000-8000-000000000099','fuel_log','proposed',jsonb_build_object('vehicle_id',v,'date','2026-10-07','odometer_km',250,'liters',10,'total_amount',60));
 caught=false;begin perform pg_temp.v2_execute_assistant_action(c,b);exception when check_violation then caught=true;end;
 if not caught or (select count(*) from pg_temp.v2_fuel_logs)<>1 or (select status from pg_temp.v2_ai_action_requests where id=b)<>'proposed' or (select current_odometer_km from pg_temp.v2_vehicles where id=v)<>150 then raise exception 'TEST: failure left partial fuel or approved proposal'; end if;
 alter table pg_temp.v2_vehicle_odometer_logs drop constraint temporary_later_write_failure;
 update pg_temp.v2_ai_action_requests set proposed_payload=jsonb_set(proposed_payload,'{vehicle_id}',to_jsonb(foreign_v)) where id=b;
 caught=false;begin perform pg_temp.v2_execute_assistant_action(c,b);exception when raise_exception then caught=true;end;
 if not caught then raise exception 'TEST: cross-company vehicle accepted'; end if;
 update pg_temp.v2_ai_action_requests set proposed_payload=jsonb_set(proposed_payload,'{vehicle_id}',to_jsonb(v)) where id=b;
 perform set_config('c360.assistant_denied_permission','fleet.fuel.manage',true);
 caught=false;begin perform pg_temp.v2_execute_assistant_action(c,b);exception when insufficient_privilege then caught=true;end;
 if not caught then raise exception 'TEST: missing target permission accepted'; end if;
 perform set_config('c360.assistant_denied_permission','',true);
 caught=false;begin perform pg_temp.v2_execute_assistant_action(gen_random_uuid(),a);exception when insufficient_privilege then caught=true;end;
 if not caught then raise exception 'TEST: foreign company accepted'; end if;
 update pg_temp.v2_ai_action_requests set status='cancelled' where id=b;
 caught=false;begin perform pg_temp.v2_execute_assistant_action(c,b);exception when raise_exception then caught=true;end;
 if not caught then raise exception 'TEST: cancelled proposal executed'; end if;
 -- Independent maintenance proposals receive distinct numbers; retry retains the order.
 for i in 1..2 loop
  a=gen_random_uuid();insert into pg_temp.v2_ai_action_requests(id,company_id,conversation_id,requested_by,action_type,status,proposed_payload) values(a,c,gen_random_uuid(),'00000000-0000-4000-8000-000000000099','maintenance','proposed',jsonb_build_object('vehicle_id',v,'title','Temporary repair','labor_amount',20));
  out=pg_temp.v2_execute_assistant_action(c,a);out2=pg_temp.v2_execute_assistant_action(c,a);if out->'result' is distinct from out2->'result' then raise exception 'TEST: maintenance retry replaced target'; end if;
 end loop;
 if (select count(distinct work_order_number) from pg_temp.v2_work_orders)<>2 then raise exception 'TEST: maintenance numbers collided'; end if;
 insert into pg_temp.v2_poultry_integrators(id,company_id,name) values(f,c,'Temporary integrator');
 insert into pg_temp.v2_poultry_farms(id,company_id,integrator_id,producer_name) values(farm,c,f,'Temporary producer');
 -- Loading failure after operation insertion must leave no orphan operation.
 a=gen_random_uuid();insert into pg_temp.v2_ai_action_requests(id,company_id,conversation_id,requested_by,action_type,status,proposed_payload) values(a,c,gen_random_uuid(),'00000000-0000-4000-8000-000000000099','poultry_schedule','proposed',jsonb_build_object('integrator_id',f,'farm_id',farm,'date','2026-10-07','planned_birds',100,'farm_name','Temporary farm'));
 alter table pg_temp.v2_poultry_loadings add constraint temporary_loading_failure check(planned_birds<50);
 caught=false;begin perform pg_temp.v2_execute_assistant_action(c,a);exception when check_violation then caught=true;end;
 if not caught or (select count(*) from pg_temp.v2_operations)<>0 or (select status from pg_temp.v2_ai_action_requests where id=a)<>'proposed' then raise exception 'TEST: loading failure left an orphan operation'; end if;
 alter table pg_temp.v2_poultry_loadings drop constraint temporary_loading_failure;
 out=pg_temp.v2_execute_assistant_action(c,a);out2=pg_temp.v2_execute_assistant_action(c,a);
 if out->'result' is distinct from out2->'result' or (select count(*) from pg_temp.v2_operations)<>1 or (select count(*) from pg_temp.v2_poultry_loadings)<>1 then raise exception 'TEST: schedule retry duplicated operation'; end if;
 a=gen_random_uuid();insert into pg_temp.v2_ai_action_requests(id,company_id,conversation_id,requested_by,action_type,status,proposed_payload) values(a,c,gen_random_uuid(),'00000000-0000-4000-8000-000000000099','odometer','proposed',jsonb_build_object('vehicle_id',v,'date','2026-10-07','odometer_km',90));
 out=pg_temp.v2_execute_assistant_action(c,a);out2=pg_temp.v2_execute_assistant_action(c,a);
 if out->'result' is distinct from out2->'result' or (select current_odometer_km from pg_temp.v2_vehicles where id=v)<>150 or (select count(*) from pg_temp.v2_vehicle_odometer_logs)<>2 then raise exception 'TEST: odometer retry duplicated or reduced current mileage'; end if;
 raise notice 'ASSISTANT_TRANSACTION_TEST_OK';
end $$;
drop function pg_temp.v2_execute_assistant_action(uuid,uuid);
drop function pg_temp.v2_is_company_member(uuid);
drop function pg_temp.v2_has_permission(uuid,text);
drop sequence pg_temp.assistant_test_odometer_seq cascade;
