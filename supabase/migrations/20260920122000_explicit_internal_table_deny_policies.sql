-- Comando 360 — internal tables are server/RPC only.
-- RLS without policies already denies direct client access; these explicit policies
-- keep that contract visible in source control and detectable by security audits.
do $$
declare
  t text;
begin
  foreach t in array array[
    'movit_configuration',
    'v2_attendance_audit_log',
    'v2_integration_credentials',
    'v2_integration_oauth_states',
    'v2_native_tracker_pairing_codes'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists c360_internal_no_direct_access on public.%I', t);
    execute format(
      'create policy c360_internal_no_direct_access on public.%I as restrictive for all to anon, authenticated using (false) with check (false)',
      t
    );
  end loop;
end $$;
