-- Read-only verification of the company-scoped operational repass rule.
do $$
declare f regprocedure;
begin
 foreach f in array array['public.v2_save_operational_daily_work(uuid,date,text,text,jsonb)'::regprocedure,'public.v2_prepare_operational_payment_run(uuid,text,date,date)'::regprocedure] loop
  if not exists(select 1 from pg_proc where oid=f and not prosecdef and 'search_path=""'=any(proconfig) and position('v_allow_repass' in prosrc)>0) then raise exception 'Operational repass function contract failed'; end if;
  if has_function_privilege('anon',f,'execute') or not has_function_privilege('authenticated',f,'execute') then raise exception 'Operational repass execution privileges failed'; end if;
 end loop;
 if not exists(select 1 from public.v2_companies where status='active' and trade_name='Agro Souza''s' and legal_name='Nágila Severino de Araújo Apanha de Aves Vivas' and metadata->'operational_payment_rules'->'no_absence_repass_teams' @> '["Equipe 3"]'::jsonb) then raise exception 'Company repass configuration missing'; end if;
 raise notice 'OPERATIONAL_REPASS_AUDIT_OK';
end $$;
