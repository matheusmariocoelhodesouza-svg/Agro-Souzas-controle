-- Read-only verification after the assistant transaction migration.
do $$
declare r record;
begin
 if not exists(select 1 from pg_proc where oid=to_regprocedure('public.v2_execute_assistant_action(uuid,uuid)') and not prosecdef
  and 'search_path=""'=any(proconfig)) then raise exception 'Assistant RPC security contract failed'; end if;
 if has_function_privilege('anon','public.v2_execute_assistant_action(uuid,uuid)','execute') then raise exception 'Anonymous assistant execution enabled'; end if;
 if not has_function_privilege('authenticated','public.v2_execute_assistant_action(uuid,uuid)','execute') then raise exception 'Authenticated assistant execution unavailable'; end if;
 for r in select c.relname,c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public'
  and c.relname in ('v2_ai_action_requests','v2_files','v2_fuel_logs','v2_vehicle_odometer_logs','v2_vehicles','v2_work_orders','v2_operations','v2_poultry_loadings','v2_poultry_farms','v2_poultry_integrators','v2_teams') loop
  if not r.relrowsecurity then raise exception 'RLS missing on %',r.relname; end if;
 end loop;
 raise notice 'ASSISTANT_AUDIT_OK';
end $$;
