-- Run alongside the migration. All fixtures live only in temporary tables;
-- no production people, days, payments or audit rows are inserted or modified.
create temporary table v2_companies (like public.v2_companies including all) on commit drop;
create temporary table v2_daily_team_work (like public.v2_daily_team_work including all) on commit drop;
create temporary table v2_daily_team_work_members (like public.v2_daily_team_work_members including all) on commit drop;
create temporary table v2_operational_worker_profiles (like public.v2_operational_worker_profiles including all) on commit drop;
create temporary table v2_operational_payment_runs (like public.v2_operational_payment_runs including all) on commit drop;
create temporary table v2_operational_payment_items (like public.v2_operational_payment_items including all) on commit drop;
create temporary table v2_employees (like public.v2_employees including all) on commit drop;
create function pg_temp.v2_is_company_member(uuid) returns boolean language sql as 'select true';
do $$
declare d text;
begin
 d=pg_get_functiondef('public.v2_save_operational_daily_work(uuid,date,text,text,jsonb)'::regprocedure);
 d=replace(d,'public.v2_','pg_temp.v2_');d=replace(d,'auth.uid()','''00000000-0000-4000-8000-000000000099''::uuid');execute d;
 d=pg_get_functiondef('public.v2_prepare_operational_payment_run(uuid,text,date,date)'::regprocedure);
 d=replace(d,'public.v2_','pg_temp.v2_');d=replace(d,'auth.uid()','''00000000-0000-4000-8000-000000000099''::uuid');execute d;
end $$;
do $$
declare
 c uuid=gen_random_uuid(); a uuid=gen_random_uuid(); b uuid=gen_random_uuid(); rows jsonb; out jsonb; work_id uuid; run_id uuid; original_ids uuid[]; caught boolean;
begin
 insert into pg_temp.v2_companies(id,legal_name,tax_id) values(c,'Temporary company',c::text);
 insert into pg_temp.v2_operational_worker_profiles(id,company_id,operational_name,team_name,daily_rate,active)
 values(a,c,'Temporary A','Equipe temporária',160,true),(b,c,'Temporary B','Equipe temporária',200,true);
 rows=jsonb_build_array(jsonb_build_object('worker_profile_id',a,'employee_name','Temporary A','role_type','floor','daily_rate',160,'attendance_status','present'),
  jsonb_build_object('worker_profile_id',b,'employee_name','Temporary B','role_type','loader','daily_rate',200,'attendance_status','present'));
 out=pg_temp.v2_save_operational_daily_work(c,'2026-10-07','Equipe temporária',null,rows);work_id=(out->>'id')::uuid;
 if (out->>'saved')::int<>2 then raise exception 'TEST: members missing'; end if;
 if exists(select 1 from pg_temp.v2_daily_team_work_members where employee_id is not null) then raise exception 'TEST: operational identity leaked into employees'; end if;
 select array_agg(id order by id) into original_ids from pg_temp.v2_daily_team_work_members;
 out=pg_temp.v2_save_operational_daily_work(c,'2026-10-07','Equipe temporária',null,rows);
 if (out->>'id')::uuid<>work_id or original_ids is distinct from (select array_agg(id order by id) from pg_temp.v2_daily_team_work_members) then raise exception 'TEST: retry replaced identities'; end if;
 caught=false;begin
  perform pg_temp.v2_save_operational_daily_work(c,'2026-10-07','Equipe temporária','must roll back',jsonb_set(rows,'{1,worker_profile_id}',to_jsonb(gen_random_uuid())));
 exception when others then caught=true;end;
 if not caught or (select notes from pg_temp.v2_daily_team_work where id=work_id) is not null or (select count(*) from pg_temp.v2_daily_team_work_members)<>2 then raise exception 'TEST: invalid save damaged existing day'; end if;
 caught=false;begin perform pg_temp.v2_save_operational_daily_work(c,'2026-10-07','Equipe temporária',null,jsonb_build_array(rows->0,rows->0));exception when others then caught=true;end;
 if not caught or (select count(*) from pg_temp.v2_daily_team_work_members)<>2 then raise exception 'TEST: duplicate identity accepted'; end if;
 caught=false;begin perform pg_temp.v2_save_operational_daily_work(gen_random_uuid(),'2026-10-07','Equipe temporária',null,rows);exception when others then caught=true;end;
 if not caught or (select count(*) from pg_temp.v2_daily_team_work)<>1 then raise exception 'TEST: cross-company identity accepted'; end if;
 caught=false;begin perform pg_temp.v2_save_operational_daily_work(c,'2026-10-07','Equipe temporária',null,'[]');exception when others then caught=true;end;
 if not caught then raise exception 'TEST: empty list could erase a day'; end if;
 update pg_temp.v2_daily_team_work set status='closed' where id=work_id;
 caught=false;begin perform pg_temp.v2_save_operational_daily_work(c,'2026-10-07','Equipe temporária',null,rows);exception when others then caught=true;end;
 if not caught then raise exception 'TEST: closed day modified'; end if;
 update pg_temp.v2_daily_team_work set status='open' where id=work_id;
 update pg_temp.v2_daily_team_work_members set attendance_status='pending' where worker_profile_id=b;
 caught=false;begin perform pg_temp.v2_prepare_operational_payment_run(c,'Equipe temporária','2026-10-01','2026-10-07');exception when others then caught=true;end;
 if not caught or (select count(*) from pg_temp.v2_operational_payment_runs)<>0 then raise exception 'TEST: pending attendance generated payment'; end if;
 update pg_temp.v2_daily_team_work_members set attendance_status='present';
 out=pg_temp.v2_prepare_operational_payment_run(c,'Equipe temporária','2026-10-01','2026-10-07');run_id=(out->>'id')::uuid;
 if (out->>'gross_total')::numeric<>360 or (out->>'people')::int<>2 then raise exception 'TEST: totals incorrect'; end if;
 select array_agg(id order by id) into original_ids from pg_temp.v2_operational_payment_items;
 out=pg_temp.v2_prepare_operational_payment_run(c,'Equipe temporária','2026-10-01','2026-10-07');
 if (out->>'id')::uuid<>run_id or original_ids is distinct from (select array_agg(id order by id) from pg_temp.v2_operational_payment_items) then raise exception 'TEST: run retry duplicated items'; end if;
 update pg_temp.v2_operational_payment_items set discount_amount=10 where worker_profile_id=a;
 perform pg_temp.v2_prepare_operational_payment_run(c,'Equipe temporária','2026-10-01','2026-10-07');
 if (select net_total from pg_temp.v2_operational_payment_runs where id=run_id)<>350 then raise exception 'TEST: existing discount lost'; end if;
 update pg_temp.v2_operational_payment_runs set status='paid' where id=run_id;
 caught=false;begin perform pg_temp.v2_prepare_operational_payment_run(c,'Equipe temporária','2026-10-01','2026-10-07');exception when others then caught=true;end;
 if not caught or (select status from pg_temp.v2_operational_payment_runs where id=run_id)<>'paid' then raise exception 'TEST: paid run reopened'; end if;
 raise notice 'OPERATIONAL_DAILY_TRANSACTION_TEST_OK';
end $$;
do $$
declare c uuid; other_company uuid=gen_random_uuid(); other_worker uuid=gen_random_uuid(); rows jsonb; out jsonb; v_run_id uuid; label text;
begin
 select id into c from pg_temp.v2_companies limit 1;
 update pg_temp.v2_companies set metadata='{"operational_payment_rules":{"no_absence_repass_teams":["Equipe 3"]}}'::jsonb where id=c;
 select jsonb_agg(jsonb_build_object('worker_profile_id',id,'employee_name',operational_name,'role_type','floor','daily_rate',daily_rate,'attendance_status','present','absence_repass_share',80,'collective_additional_share',320)) into rows from pg_temp.v2_operational_worker_profiles where company_id=c;
 foreach label in array array['Equipe 3','Equipe 03'] loop
  out=pg_temp.v2_save_operational_daily_work(c,'2026-10-12',label,null,rows);
  if exists(select 1 from pg_temp.v2_daily_team_work_members where daily_work_id=(out->>'id')::uuid and (absence_repass_share<>0 or collective_additional_share<>320)) then raise exception 'TEST: disabled repass or collective addition incorrect'; end if;
  -- Simulate a stale draft saved by an older client: closing still excludes repass.
  update pg_temp.v2_daily_team_work_members set absence_repass_share=99 where daily_work_id=(out->>'id')::uuid;
  out=pg_temp.v2_prepare_operational_payment_run(c,label,'2026-10-12','2026-10-12');v_run_id=(out->>'id')::uuid;
  if (out->>'gross_total')::numeric<>1000 or exists(select 1 from pg_temp.v2_operational_payment_items i where i.run_id=v_run_id and i.repass_total<>0) then raise exception 'TEST: closing included disabled repass'; end if;
 end loop;
 foreach label in array array['Equipe 1','Equipe 2'] loop
  out=pg_temp.v2_save_operational_daily_work(c,'2026-10-12',label,null,rows);
  out=pg_temp.v2_prepare_operational_payment_run(c,label,'2026-10-12','2026-10-12');
  if (out->>'gross_total')::numeric<>1160 then raise exception 'TEST: eligible team lost repass'; end if;
 end loop;
 insert into pg_temp.v2_companies(id,legal_name,tax_id) values(other_company,'Another temporary company',other_company::text);
 insert into pg_temp.v2_operational_worker_profiles(id,company_id,operational_name,team_name,daily_rate,active) values(other_worker,other_company,'Other temporary worker','Equipe 3',160,true);
 rows=jsonb_build_array(jsonb_build_object('worker_profile_id',other_worker,'employee_name','Other temporary worker','role_type','floor','daily_rate',160,'attendance_status','present','absence_repass_share',20));
 perform pg_temp.v2_save_operational_daily_work(other_company,'2026-10-12','Equipe 3',null,rows);
 out=pg_temp.v2_prepare_operational_payment_run(other_company,'Equipe 3','2026-10-12','2026-10-12');
 if (out->>'gross_total')::numeric<>180 then raise exception 'TEST: one company exception affected another company'; end if;
 raise notice 'OPERATIONAL_REPASS_RULES_TEST_OK';
end $$;
drop function pg_temp.v2_save_operational_daily_work(uuid,date,text,text,jsonb);
drop function pg_temp.v2_prepare_operational_payment_run(uuid,text,date,date);
drop function pg_temp.v2_is_company_member(uuid);
