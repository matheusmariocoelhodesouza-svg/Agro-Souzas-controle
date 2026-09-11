-- Comando 360 quality/security/performance hardening
-- Applied to production on 2026-09-11.

-- Prevent accidental future Data API exposure. New objects require explicit grants.
alter default privileges for role postgres in schema public
  revoke select, insert, update, delete on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke usage, select on sequences from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke execute on functions from public;

-- Service/internal tables must not be reachable directly by browser roles.
revoke all on table public.movit_configuration from anon, authenticated;
revoke all on table public.v2_attendance_audit_log from anon, authenticated;
revoke all on table public.v2_integration_credentials from anon, authenticated;
revoke all on table public.v2_integration_oauth_states from anon, authenticated;

-- Retire legacy privileged RPCs not used by the current V2 application flow.
revoke execute on function public.match_employee_face(double precision[], double precision) from public, anon, authenticated;
revoke execute on function public.register_point_event_by_employee(uuid, double precision, double precision, numeric, text, numeric, uuid) from public, anon, authenticated;
revoke execute on function public.register_point_event_by_registration(text, double precision, double precision, numeric, text, uuid) from public, anon, authenticated;
revoke execute on function public.save_employee_face_descriptor(uuid, double precision[]) from public, anon, authenticated;
revoke execute on function public.save_loading(date, text, text, text, text, text, jsonb, jsonb) from public, anon, authenticated;

-- Hot-path indexes for multi-company scale and field usage.
create index if not exists v2_fin_entries_company_issue_created_idx
  on public.v2_financial_entries(company_id, issue_date desc, created_at desc);
create unique index if not exists v2_fin_dda_active_unique
  on public.v2_financial_entries(company_id, source_id)
  where source_type='dda_polp' and source_id is not null and status<>'cancelled';
create index if not exists v2_operations_company_type_start_idx
  on public.v2_operations(company_id, operation_type, scheduled_start desc);
create index if not exists v2_poultry_loadings_company_operation_idx
  on public.v2_poultry_loadings(company_id, operation_id);
create index if not exists v2_poultry_truck_loads_company_loading_idx
  on public.v2_poultry_truck_loads(company_id, loading_id, created_at);
create index if not exists v2_fuel_logs_company_date_idx
  on public.v2_fuel_logs(company_id, fueled_at desc);
create index if not exists v2_fuel_logs_company_vehicle_date_idx
  on public.v2_fuel_logs(company_id, vehicle_id, fueled_at desc);
create index if not exists v2_vehicle_documents_company_vehicle_status_idx
  on public.v2_vehicle_documents(company_id, vehicle_id, status, expires_at);
create index if not exists v2_vehicle_odometer_company_vehicle_time_idx
  on public.v2_vehicle_odometer_logs(company_id, vehicle_id, recorded_at desc);
create index if not exists v2_employees_company_status_name_idx
  on public.v2_employees(company_id, status, full_name);
create index if not exists v2_teams_company_status_name_idx
  on public.v2_teams(company_id, status, name);
create index if not exists v2_employee_docs_company_employee_idx
  on public.v2_employee_documents(company_id, employee_id, created_at desc);
create index if not exists v2_ppe_company_employee_date_idx
  on public.v2_ppe_deliveries(company_id, employee_id, delivered_at desc);
create index if not exists v2_work_orders_company_vehicle_opened_idx
  on public.v2_work_orders(company_id, vehicle_id, opened_at desc);
create index if not exists v2_integrations_company_provider_idx
  on public.v2_integrations(company_id, provider);
create index if not exists v2_integration_sync_company_provider_time_idx
  on public.v2_integration_sync_runs(company_id, provider, started_at desc);
