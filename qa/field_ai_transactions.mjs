// Generate an isolated SQL test: no business rows, production sequences or public functions are changed.
import fs from 'node:fs';
const migration=fs.readFileSync('supabase/migrations/20261028214921_field_ai_photo_registration.sql','utf8');
const functions=[...migration.matchAll(/create or replace function[\s\S]+?end \$\$;/g)].map(m=>m[0].replaceAll('public.','pg_temp.').replaceAll('storage.objects','pg_temp.field_test_objects'));
const tables=['v2_device_access','v2_ai_conversations','v2_ai_messages','v2_ai_action_requests','v2_teams','v2_vehicles','v2_employees','v2_files','v2_fuel_logs','v2_attendance_events','v2_poultry_farms','v2_poultry_integrators','v2_operations','v2_poultry_loadings','v2_poultry_truck_loads','v2_poultry_barns','v2_poultry_truck_barns'];
const setup=tables.map(t=>`create temp table ${t} as select * from public.${t} with no data; alter table pg_temp.${t} alter column id set default gen_random_uuid();`).join('\n');
const sql=`begin;
${setup}
create temp table v2_vehicle_odometer_logs as select * from public.v2_vehicle_odometer_logs with no data;
create temp sequence field_odo_seq;
alter table pg_temp.v2_vehicle_odometer_logs alter column id set default nextval('pg_temp.field_odo_seq');
create temp table field_test_objects(bucket_id text,name text);
${functions.join('\n')}
do $test$
declare
 company uuid:=gen_random_uuid();usr uuid:=gen_random_uuid();device uuid:=gen_random_uuid();team uuid:=gen_random_uuid();
 vehicle uuid:=gen_random_uuid();employee uuid:=gen_random_uuid();conv uuid:=gen_random_uuid();msg uuid:=gen_random_uuid();
 a uuid;b uuid;out jsonb;again jsonb;p jsonb;result jsonb;request uuid;loading uuid;operation uuid;before_count integer;
begin
 insert into pg_temp.v2_device_access(id,company_id,user_id,team_id,active,control_state,lost_mode,permissions) values(device,company,usr,team,true,'active',false,'{}');
 insert into pg_temp.v2_teams(id,company_id,name,status) values(team,company,'Equipe Teste','active');
 insert into pg_temp.v2_vehicles(id,company_id,plate,description,status,current_odometer_km) values(vehicle,company,'ABC1D23','Ônibus','active',5000);
 insert into pg_temp.v2_employees(id,company_id,employee_number,full_name,status) values(employee,company,'001','João da Silva','active');
 insert into pg_temp.v2_ai_conversations(id,company_id,user_id,context) values(conv,company,usr,jsonb_build_object('scope','field','team_id',team,'device_access_id',device));
 insert into pg_temp.v2_ai_messages(id,company_id,user_id,conversation_id,role,content,answer_data) values(msg,company,usr,conv,'user','Foto sintética','{}');
 p=jsonb_build_object('_scope','field','team_id',team,'device_access_id',device,'date','2026-10-01','_sources','[]'::jsonb,'vehicle_id',vehicle,'liters',20,'total_amount',120,'odometer_km',4000);
 request=gen_random_uuid();out=pg_temp.v2_field_ai_commit_turn(company,usr,device,conv,msg,request,'Confira','Memória',jsonb_build_array(jsonb_build_object('action_type','fuel_log','summary','Combustível','confidence',1,'missing_fields','[]'::jsonb,'payload',p)));
 again=pg_temp.v2_field_ai_commit_turn(company,usr,device,conv,msg,request,'Confira','', '[]');
 if not coalesce((again->>'already_processed')::boolean,false) or (select count(*) from pg_temp.v2_ai_action_requests)<>1 or (select count(*) from pg_temp.v2_fuel_logs)<>0 then raise exception 'TEST: proposals must not save fuel, and retry must not duplicate proposals';end if;
 a=(out#>>'{actions,0,id}')::uuid;out=pg_temp.v2_execute_field_assistant_action(company,usr,device,a);again=pg_temp.v2_execute_field_assistant_action(company,usr,device,a);
 if out->'result' is distinct from again->'result' or (select count(*) from pg_temp.v2_fuel_logs)<>1 or (select count(*) from pg_temp.v2_vehicle_odometer_logs)<>1 or (select current_odometer_km from pg_temp.v2_vehicles where id=vehicle)<>5000 then raise exception 'TEST: duplicate confirmation or decreasing odometer';end if;
 begin perform pg_temp.v2_execute_field_assistant_action(company,gen_random_uuid(),device,a);raise exception 'TEST: wrong user accepted' using errcode='ZX001';exception when insufficient_privilege then null;end;
 begin perform pg_temp.v2_execute_field_assistant_action(gen_random_uuid(),usr,device,a);raise exception 'TEST: wrong company accepted' using errcode='ZX001';exception when insufficient_privilege then null;end;
 update pg_temp.v2_device_access set team_id=gen_random_uuid() where id=device;
 begin perform pg_temp.v2_execute_field_assistant_action(company,usr,device,a);raise exception 'TEST: changed team accepted' using errcode='ZX001';exception when insufficient_privilege then null;end;
 update pg_temp.v2_device_access set team_id=team,permissions='{"abastecimento":false}' where id=device;
 begin perform pg_temp.v2_execute_field_assistant_action(company,usr,device,a);raise exception 'TEST: disabled module accepted' using errcode='ZX001';exception when insufficient_privilege then null;end;
 update pg_temp.v2_device_access set permissions='{}' where id=device;
 -- Incomplete proposal cannot save; a corrected proposal cancels the previous draft.
 out=pg_temp.v2_field_ai_commit_turn(company,usr,device,conv,msg,gen_random_uuid(),'Falta litro','',jsonb_build_array(jsonb_build_object('action_type','fuel_log','summary','Pendente','confidence',1,'missing_fields',jsonb_build_array('litros'),'payload',p)));
 b=(out#>>'{actions,0,id}')::uuid;
 begin perform pg_temp.v2_execute_field_assistant_action(company,usr,device,b);raise exception 'TEST: incomplete action accepted' using errcode='ZX001';exception when raise_exception then null;end;
 p=p||jsonb_build_object('employee_id',employee,'event_type','in','occurred_at','2026-10-01T05:00:00-03:00');
 out=pg_temp.v2_field_ai_commit_turn(company,usr,device,conv,msg,gen_random_uuid(),'Ponto','',jsonb_build_array(jsonb_build_object('action_type','attendance_event','summary','Entrada','confidence',1,'missing_fields','[]'::jsonb,'payload',p)));
 if (select status from pg_temp.v2_ai_action_requests where id=b)<>'cancelled' then raise exception 'TEST: old incomplete proposal not cancelled';end if;
 a=(out#>>'{actions,0,id}')::uuid;out=pg_temp.v2_execute_field_assistant_action(company,usr,device,a);
 if (select count(*) from pg_temp.v2_attendance_events)<>1 or not exists(select 1 from pg_temp.v2_attendance_events where work_team_id=team and device_access_id=device and method='manual' and metadata->>'identification_method'='photo_transcription' and occurred_at='2026-10-01T05:00:00-03:00'::timestamptz) then raise exception 'TEST: point attribution or exact timestamp incorrect';end if;
 out=pg_temp.v2_field_ai_commit_turn(company,usr,device,conv,msg,gen_random_uuid(),'Ponto repetido','',jsonb_build_array(jsonb_build_object('action_type','attendance_event','summary','Entrada','confidence',1,'missing_fields','[]'::jsonb,'payload',p)));
 a=(out#>>'{actions,0,id}')::uuid;
 begin perform pg_temp.v2_execute_field_assistant_action(company,usr,device,a);raise exception 'TEST: duplicate point accepted' using errcode='ZX001';exception when raise_exception then null;end;
 if (select count(*) from pg_temp.v2_attendance_events)<>1 then raise exception 'TEST: duplicate point was written';end if;
 p=jsonb_build_object('_scope','field','team_id',team,'device_access_id',device,'date','2026-10-01','_sources','[]'::jsonb,'producer','Produtor Teste','farm_name','Sítio Teste','city','Tietê','aviary','1','trucks',jsonb_build_array(jsonb_build_object('truck_sequence',1,'truck_plate','DEF4G56','birds',720,'boxes_count',100,'empty_boxes',10,'birds_per_box',8,'is_cata',false)));
 out=pg_temp.v2_field_ai_commit_turn(company,usr,device,conv,msg,gen_random_uuid(),'Apanha','',jsonb_build_array(jsonb_build_object('action_type','poultry_operation','summary','Apanha','confidence',1,'missing_fields','[]'::jsonb,'payload',p)));
 a=(out#>>'{actions,0,id}')::uuid;out=pg_temp.v2_execute_field_assistant_action(company,usr,device,a);loading=(out#>>'{result,target_id}')::uuid;operation=(out#>>'{result,operation_id}')::uuid;
 if (select count(*) from pg_temp.v2_poultry_truck_loads)<>1 or not exists(select 1 from pg_temp.v2_poultry_loadings where id=loading and team_id=team and reported_birds=720 and reported_trucks=1) or (select count(*) from pg_temp.v2_poultry_truck_barns)<>1 or (select count(*) from pg_temp.v2_poultry_farms)<>1 then raise exception 'TEST: poultry, trucks, aviary and totals not saved together';end if;
 -- First truck succeeds, second duplicates #1: whole confirmation must roll back.
 p=p||jsonb_build_object('operation_id',operation,'trucks',jsonb_build_array(jsonb_build_object('truck_sequence',2,'birds',800,'is_cata',false),jsonb_build_object('truck_sequence',1,'birds',700,'is_cata',false)));
 out=pg_temp.v2_field_ai_commit_turn(company,usr,device,conv,msg,gen_random_uuid(),'Conferir dois caminhões','',jsonb_build_array(jsonb_build_object('action_type','poultry_operation','summary','Apanha','confidence',1,'missing_fields','[]'::jsonb,'payload',p)));
 a=(out#>>'{actions,0,id}')::uuid;
 begin perform pg_temp.v2_execute_field_assistant_action(company,usr,device,a);raise exception 'TEST: duplicate truck accepted' using errcode='ZX001';exception when raise_exception then null;end;
 if (select count(*) from pg_temp.v2_poultry_truck_loads)<>1 or (select reported_birds from pg_temp.v2_poultry_loadings where id=loading)<>720 or (select status from pg_temp.v2_ai_action_requests where id=a)<>'proposed' then raise exception 'TEST: partial truck write survived failed confirmation';end if;
 update pg_temp.v2_device_access set active=false where id=device;
 begin perform pg_temp.v2_execute_field_assistant_action(company,usr,device,a);raise exception 'TEST: revoked device accepted' using errcode='ZX001';exception when insufficient_privilege then null;end;
end $test$;
rollback;
select 'FIELD_AI_TRANSACTIONS_OK' as result;
`;
if(process.argv[2])fs.writeFileSync(process.argv[2],sql);else process.stdout.write(sql);
