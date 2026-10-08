do $$
declare p oid;
begin
 foreach p in array array['public.v2_save_operational_daily_work(uuid,date,text,text,jsonb)'::regprocedure::oid,'public.v2_prepare_operational_payment_run(uuid,text,date,date)'::regprocedure::oid] loop
  if (select prosecdef from pg_proc where oid=p) then raise exception 'RPC operacional não pode ignorar RLS'; end if;
  if has_function_privilege('anon',p,'EXECUTE') or not has_function_privilege('authenticated',p,'EXECUTE') then raise exception 'Privilégio incorreto da RPC'; end if;
  if not exists(select 1 from pg_proc where oid=p and proconfig @> array['search_path=""']) then raise exception 'search_path inseguro'; end if;
 end loop;
 if exists(select 1 from public.v2_daily_team_work_members where employee_id is not null and worker_profile_id is not null) then raise exception 'Identidade operacional misturada ao RH'; end if;
 if exists(select 1 from public.v2_daily_team_work_members m join public.v2_daily_team_work w on w.id=m.daily_work_id where m.company_id<>w.company_id) then raise exception 'Diária vinculada a outra empresa'; end if;
 if exists(select 1 from public.v2_employee_payments p join public.v2_employees e on e.id=p.employee_id where p.company_id<>e.company_id) then raise exception 'Pagamento vinculado a outra empresa'; end if;
 if exists(select 1 from public.v2_operational_payment_items i join public.v2_operational_worker_profiles w on w.id=i.worker_profile_id join public.v2_operational_payment_runs r on r.id=i.run_id where i.company_id<>w.company_id or i.company_id<>r.company_id) then raise exception 'Fechamento vinculado a outra empresa'; end if;
 raise notice 'OPERATIONAL_DAILY_AUDIT_OK';
end $$;
select 'OPERATIONAL_DAILY_AUDIT_OK' as result;
