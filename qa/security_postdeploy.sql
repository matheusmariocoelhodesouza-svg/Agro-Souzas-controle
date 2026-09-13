-- Comando 360 — auditoria pós-deploy de segurança multiempresa.
-- Executar no banco de produção depois de migrations de segurança.
-- Falha com EXCEPTION se algum contrato crítico for violado.

do $$
declare
  n integer;
begin
  select count(*) into n
  from pg_class c
  join pg_namespace ns on ns.oid=c.relnamespace and ns.nspname='public'
  join information_schema.columns ic on ic.table_schema='public' and ic.table_name=c.relname and ic.column_name='company_id'
  where c.relkind in ('r','p') and not c.relrowsecurity;
  if n<>0 then raise exception 'SECURITY_AUDIT: % tabela(s) multiempresa sem RLS',n; end if;

  select count(*) into n
  from information_schema.role_table_grants
  where table_schema='public' and grantee in ('anon','authenticated')
    and table_name in ('movit_configuration','v2_attendance_audit_log','v2_integration_credentials','v2_integration_oauth_states');
  if n<>0 then raise exception 'SECURITY_AUDIT: tabela interna exposta (% grant(s))',n; end if;

  select count(*) into n
  from information_schema.role_table_grants
  where table_schema='public' and grantee in ('anon','authenticated')
    and table_name in ('adjustments','attendance','employee_biometrics','employee_documents','employee_face_enrollments','employees','equipment','fuel_logs','loading_surcharges','loading_trucks','loadings','maintenance','maintenance_parts','mileage_logs','movit_sessions','point_devices','point_events','point_face_checks','point_vehicle_validation','vehicle_tracking_current','vehicles','loading_summary','point_event_receipts');
  if n<>0 then raise exception 'SECURITY_AUDIT: recurso legado exposto (% grant(s))',n; end if;

  select count(*) into n
  from information_schema.role_table_grants
  where table_schema='public' and grantee in ('anon','authenticated') and privilege_type in ('TRUNCATE','REFERENCES','TRIGGER');
  if n<>0 then raise exception 'SECURITY_AUDIT: privilégio estrutural indevido (% grant(s))',n; end if;

  select count(*) into n
  from information_schema.role_table_grants
  where table_schema='public' and table_name='v2_client_health_events' and grantee='authenticated'
    and privilege_type in ('SELECT','INSERT');
  if n<>2 then raise exception 'SECURITY_AUDIT: telemetria sem grants mínimos esperados'; end if;

  select count(*) into n
  from pg_policies
  where schemaname='storage' and tablename='objects'
    and policyname in ('biometric_selfies_delete_admin','biometric_selfies_insert','biometric_selfies_select','employee_storage_admin_delete','employee_storage_admin_insert','employee_storage_admin_select')
    and lower(coalesce(qual,'')||' '||coalesce(with_check,'')) like '%profiles%';
  if n<>0 then raise exception 'SECURITY_AUDIT: bypass legado em storage (% policy(s))',n; end if;

  select count(*) into n
  from pg_proc p join pg_namespace ns on ns.oid=p.pronamespace
  where ns.nspname='public' and p.proname in ('enroll_employee_face','employee_earnings','lookup_employee_for_punch')
    and (has_function_privilege('anon',p.oid,'EXECUTE') or has_function_privilege('authenticated',p.oid,'EXECUTE'));
  if n<>0 then raise exception 'SECURITY_AUDIT: função legada executável por cliente (% função(ões))',n; end if;
end $$;

select 'SECURITY_AUDIT_OK' as result;
