-- Comando 360: hardening multi-tenant antes da comercialização.
-- Tabelas antigas sem company_id permanecem preservadas para histórico,
-- mas deixam de ser acessíveis diretamente por clientes do navegador.

revoke all privileges on table public.adjustments from anon, authenticated;
revoke all privileges on table public.attendance from anon, authenticated;
revoke all privileges on table public.employee_biometrics from anon, authenticated;
revoke all privileges on table public.employee_documents from anon, authenticated;
revoke all privileges on table public.employee_face_enrollments from anon, authenticated;
revoke all privileges on table public.employees from anon, authenticated;
revoke all privileges on table public.equipment from anon, authenticated;
revoke all privileges on table public.fuel_logs from anon, authenticated;
revoke all privileges on table public.loading_surcharges from anon, authenticated;
revoke all privileges on table public.loading_trucks from anon, authenticated;
revoke all privileges on table public.loadings from anon, authenticated;
revoke all privileges on table public.maintenance from anon, authenticated;
revoke all privileges on table public.maintenance_parts from anon, authenticated;
revoke all privileges on table public.mileage_logs from anon, authenticated;
revoke all privileges on table public.movit_sessions from anon, authenticated;
revoke all privileges on table public.point_devices from anon, authenticated;
revoke all privileges on table public.point_events from anon, authenticated;
revoke all privileges on table public.point_face_checks from anon, authenticated;
revoke all privileges on table public.point_vehicle_validation from anon, authenticated;
revoke all privileges on table public.vehicle_tracking_current from anon, authenticated;
revoke all privileges on table public.vehicles from anon, authenticated;

revoke all privileges on table public.loading_summary from anon, authenticated;
revoke all privileges on table public.point_event_receipts from anon, authenticated;

-- Segredos e tabelas internas continuam exclusivamente server-side.
revoke all privileges on table public.movit_configuration from anon, authenticated;
revoke all privileges on table public.v2_attendance_audit_log from anon, authenticated;
revoke all privileges on table public.v2_integration_credentials from anon, authenticated;
revoke all privileges on table public.v2_integration_oauth_states from anon, authenticated;
comment on table public.movit_configuration is 'Configuração interna MOVIT. Acesso somente por backend com service role.';
comment on table public.v2_integration_credentials is 'Segredos e tokens de integrações. Acesso somente por backend com service role.';
comment on table public.v2_integration_oauth_states is 'Estados OAuth internos. Acesso somente por backend/callback autorizado.';
comment on table public.v2_attendance_audit_log is 'Log interno de auditoria do ponto. Sem acesso direto pelo cliente; expor somente por interface/RPC autorizada.';

-- RLS não cobre TRUNCATE. O navegador também não precisa de REFERENCES/TRIGGER.
revoke truncate, references, trigger on all tables in schema public from anon, authenticated;
alter default privileges for role postgres in schema public revoke truncate, references, trigger on tables from anon, authenticated;

-- Funções legadas/trigger-functions não podem ser chamadas diretamente pelo navegador.
revoke execute on function public.enroll_employee_face(uuid,text) from public, anon, authenticated;
revoke execute on function public.employee_earnings(date,date) from public, anon, authenticated;
revoke execute on function public.lookup_employee_for_punch(text) from public, anon, authenticated;
revoke execute on function private.v2_device_protect_operation_fields() from public, anon, authenticated;
revoke execute on function private.v2_sync_vehicle_odometer_from_fuel() from public, anon, authenticated;

-- Telemetria técnica: dispositivos/membros podem inserir; somente gestão consulta.
grant select, insert on table public.v2_client_health_events to authenticated;
revoke update, delete, truncate, references, trigger on table public.v2_client_health_events from anon, authenticated;
revoke select, insert on table public.v2_client_health_events from anon;

drop policy if exists v2_client_health_events_select on public.v2_client_health_events;
create policy v2_client_health_events_select
on public.v2_client_health_events
for select
to authenticated
using (
  public.v2_has_permission(company_id,'settings.manage')
  or public.v2_has_permission(company_id,'teams.manage')
);

-- Remove o antigo bypass global baseado em profiles.role='admin'.
drop policy if exists biometric_selfies_delete_admin on storage.objects;
create policy biometric_selfies_delete_admin
on storage.objects
for delete
to authenticated
using (
  bucket_id='biometric-selfies'
  and public.v2_has_permission(((storage.foldername(name))[1])::uuid,'attendance.biometric.manage')
);

drop policy if exists biometric_selfies_insert on storage.objects;
create policy biometric_selfies_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id='biometric-selfies'
  and (
    public.v2_has_permission(((storage.foldername(name))[1])::uuid,'attendance.create')
    or public.v2_has_permission(((storage.foldername(name))[1])::uuid,'attendance.biometric.manage')
  )
);

drop policy if exists biometric_selfies_select on storage.objects;
create policy biometric_selfies_select
on storage.objects
for select
to authenticated
using (
  bucket_id='biometric-selfies'
  and public.v2_has_permission(((storage.foldername(name))[1])::uuid,'attendance.view')
);

drop policy if exists employee_storage_admin_delete on storage.objects;
create policy employee_storage_admin_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id='employee-documents'
  and (
    public.v2_has_permission(((storage.foldername(name))[1])::uuid,'employees.edit')
    or public.v2_has_permission(((storage.foldername(name))[1])::uuid,'fleet.manage')
    or public.v2_has_permission(((storage.foldername(name))[1])::uuid,'employee.documents.manage')
  )
);

drop policy if exists employee_storage_admin_insert on storage.objects;
create policy employee_storage_admin_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id='employee-documents'
  and (
    public.v2_has_permission(((storage.foldername(name))[1])::uuid,'employees.edit')
    or public.v2_has_permission(((storage.foldername(name))[1])::uuid,'fleet.manage')
    or public.v2_has_permission(((storage.foldername(name))[1])::uuid,'employee.documents.manage')
  )
);

drop policy if exists employee_storage_admin_select on storage.objects;
create policy employee_storage_admin_select
on storage.objects
for select
to authenticated
using (
  bucket_id='employee-documents'
  and public.v2_is_company_member(((storage.foldername(name))[1])::uuid)
);
