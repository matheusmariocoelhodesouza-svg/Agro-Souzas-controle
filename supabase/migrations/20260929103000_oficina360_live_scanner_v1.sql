-- Oficina 360 — Live scanner bridge v1
-- Vendor-neutral current snapshot + diagnostic evidence capture.
-- Canonical scanner PIDs live in JSON so Raven/Napro/other bridges can map into one contract.

create table if not exists public.v2_vehicle_scanner_current (
  vehicle_id uuid primary key references public.v2_vehicles(id) on delete cascade,
  company_id uuid not null references public.v2_companies(id) on delete restrict,
  source_key text not null default 'generic_scanner',
  source_label text,
  source_type text not null default 'scanner_bridge',
  protocol text not null default 'obd2',
  connection_state text not null default 'streaming'
    check (connection_state in ('offline','idle','connected','streaming','error')),
  scanner_recorded_at timestamptz,
  received_at timestamptz not null default now(),
  pids jsonb not null default '{}'::jsonb check (jsonb_typeof(pids)='object'),
  dtcs jsonb not null default '[]'::jsonb check (jsonb_typeof(dtcs)='array'),
  raw_data jsonb not null default '{}'::jsonb check (jsonb_typeof(raw_data)='object'),
  source_metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(source_metadata)='object'),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.v2_diagnostic_scanner_snapshots (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.v2_companies(id) on delete restrict,
  vehicle_id uuid not null references public.v2_vehicles(id) on delete cascade,
  session_id uuid not null references public.v2_diagnostic_sessions(id) on delete cascade,
  step_id uuid references public.v2_diagnostic_session_steps(id) on delete set null,
  source_key text not null default 'generic_scanner',
  source_label text,
  protocol text,
  scanner_recorded_at timestamptz,
  captured_at timestamptz not null default now(),
  captured_pid_keys text[] not null default '{}'::text[],
  pids jsonb not null default '{}'::jsonb check (jsonb_typeof(pids)='object'),
  dtcs jsonb not null default '[]'::jsonb check (jsonb_typeof(dtcs)='array'),
  comparison jsonb not null default '{}'::jsonb check (jsonb_typeof(comparison)='object'),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata)='object'),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists idx_v2_scanner_current_company on public.v2_vehicle_scanner_current(company_id);
create index if not exists idx_v2_scanner_current_received on public.v2_vehicle_scanner_current(received_at desc);
create index if not exists idx_v2_diag_scanner_snapshots_session on public.v2_diagnostic_scanner_snapshots(session_id,captured_at desc);
create index if not exists idx_v2_diag_scanner_snapshots_vehicle on public.v2_diagnostic_scanner_snapshots(vehicle_id,captured_at desc);
create index if not exists idx_v2_diag_scanner_snapshots_step on public.v2_diagnostic_scanner_snapshots(step_id);
create index if not exists idx_v2_diag_scanner_snapshots_company on public.v2_diagnostic_scanner_snapshots(company_id);
create index if not exists idx_v2_diag_scanner_snapshots_created_by on public.v2_diagnostic_scanner_snapshots(created_by);

alter table public.v2_vehicle_scanner_current enable row level security;
alter table public.v2_diagnostic_scanner_snapshots enable row level security;

drop policy if exists v2_scanner_current_member_select on public.v2_vehicle_scanner_current;
create policy v2_scanner_current_member_select
on public.v2_vehicle_scanner_current for select to authenticated
using (
  public.v2_is_company_member(company_id)
  and exists (
    select 1 from public.v2_vehicles v
    where v.id = vehicle_id and v.company_id = company_id
  )
);

drop policy if exists v2_scanner_current_insert on public.v2_vehicle_scanner_current;
create policy v2_scanner_current_insert
on public.v2_vehicle_scanner_current for insert to authenticated
with check (
  public.v2_has_permission(company_id,'workshop.manage')
  and exists (
    select 1 from public.v2_vehicles v
    where v.id = vehicle_id and v.company_id = company_id
  )
);

drop policy if exists v2_scanner_current_update on public.v2_vehicle_scanner_current;
create policy v2_scanner_current_update
on public.v2_vehicle_scanner_current for update to authenticated
using (
  public.v2_has_permission(company_id,'workshop.manage')
  and exists (
    select 1 from public.v2_vehicles v
    where v.id = vehicle_id and v.company_id = company_id
  )
)
with check (
  public.v2_has_permission(company_id,'workshop.manage')
  and exists (
    select 1 from public.v2_vehicles v
    where v.id = vehicle_id and v.company_id = company_id
  )
);

drop policy if exists v2_scanner_current_delete on public.v2_vehicle_scanner_current;
create policy v2_scanner_current_delete
on public.v2_vehicle_scanner_current for delete to authenticated
using (
  public.v2_has_permission(company_id,'workshop.manage')
  and exists (
    select 1 from public.v2_vehicles v
    where v.id = vehicle_id and v.company_id = company_id
  )
);

drop policy if exists v2_diag_scanner_snapshots_member_select on public.v2_diagnostic_scanner_snapshots;
create policy v2_diag_scanner_snapshots_member_select
on public.v2_diagnostic_scanner_snapshots for select to authenticated
using (
  public.v2_is_company_member(company_id)
  and exists (
    select 1 from public.v2_vehicles v
    where v.id = vehicle_id and v.company_id = company_id
  )
);

drop policy if exists v2_diag_scanner_snapshots_insert on public.v2_diagnostic_scanner_snapshots;
create policy v2_diag_scanner_snapshots_insert
on public.v2_diagnostic_scanner_snapshots for insert to authenticated
with check (
  public.v2_has_permission(company_id,'workshop.manage')
  and exists (
    select 1 from public.v2_vehicles v
    where v.id = vehicle_id and v.company_id = company_id
  )
);

drop policy if exists v2_diag_scanner_snapshots_delete on public.v2_diagnostic_scanner_snapshots;
create policy v2_diag_scanner_snapshots_delete
on public.v2_diagnostic_scanner_snapshots for delete to authenticated
using (public.v2_has_permission(company_id,'workshop.manage'));

-- Explicit Data API grants: new public tables are no longer guaranteed to be auto-exposed.
grant select, insert, update, delete on public.v2_vehicle_scanner_current to authenticated;
grant select, insert, delete on public.v2_diagnostic_scanner_snapshots to authenticated;

-- Preserve scanner provenance when the guided-diagnostic UI later saves the outcome
-- from its in-memory copy of the step.
create or replace function public.v2_preserve_live_scanner_measurement()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if old.measurement ? 'live_scanner_capture'
     and not (coalesce(new.measurement,'{}'::jsonb) ? 'live_scanner_capture') then
    new.measurement := coalesce(new.measurement,'{}'::jsonb)
      || jsonb_build_object('live_scanner_capture', old.measurement->'live_scanner_capture');
  end if;
  return new;
end;
$$;

drop trigger if exists v2_diag_steps_preserve_live_scanner on public.v2_diagnostic_session_steps;
create trigger v2_diag_steps_preserve_live_scanner
before update on public.v2_diagnostic_session_steps
for each row execute function public.v2_preserve_live_scanner_measurement();

-- Add scanner hints to the playbook JSON. These are acquisition hints, not automatic fault verdicts.
update public.v2_vehicle_symptom_playbooks p
set ordered_tests = (
  select coalesce(jsonb_agg(
    case t->>'key'
      when 'starting_condition' then t || jsonb_build_object('scanner_pids',jsonb_build_array('battery_voltage','engine_rpm'))
      when 'temperature_plausibility' then t || jsonb_build_object('scanner_pids',jsonb_build_array('coolant_temp_c','iat_c'))
      when 'rail_during_start' then t || jsonb_build_object(
        'scanner_pids',jsonb_build_array('rail_pressure_target_bar','rail_pressure_actual_bar','engine_rpm'),
        'scanner_compare',jsonb_build_object('type','target_actual_delta','target','rail_pressure_target_bar','actual','rail_pressure_actual_bar')
      )
      when 'battery_crank' then t || jsonb_build_object('scanner_pids',jsonb_build_array('battery_voltage','engine_rpm'))
      when 'scan_no_start' then t || jsonb_build_object('scanner_pids',jsonb_build_array('engine_rpm','cam_crank_sync'))
      when 'rail_start' then t || jsonb_build_object(
        'scanner_pids',jsonb_build_array('rail_pressure_target_bar','rail_pressure_actual_bar','engine_rpm'),
        'scanner_compare',jsonb_build_object('type','target_actual_delta','target','rail_pressure_target_bar','actual','rail_pressure_actual_bar')
      )
      when 'temp_sensor' then t || jsonb_build_object('scanner_pids',jsonb_build_array('coolant_temp_c'))
      when 'scan_context' then t || jsonb_build_object('scanner_pids',jsonb_build_array('engine_rpm','vehicle_speed_kmh','engine_load_percent','accelerator_percent'))
      when 'boost_compare' then t || jsonb_build_object(
        'scanner_pids',jsonb_build_array('intake_pressure_target_kpa_abs','intake_pressure_actual_kpa_abs','engine_rpm','engine_load_percent'),
        'scanner_compare',jsonb_build_object('type','target_actual_delta','target','intake_pressure_target_kpa_abs','actual','intake_pressure_actual_kpa_abs')
      )
      when 'air_sensors' then t || jsonb_build_object('scanner_pids',jsonb_build_array('maf_g_s','intake_pressure_actual_kpa_abs','iat_c'))
      when 'rail_compare' then t || jsonb_build_object(
        'scanner_pids',jsonb_build_array('rail_pressure_target_bar','rail_pressure_actual_bar','engine_rpm','engine_load_percent'),
        'scanner_compare',jsonb_build_object('type','target_actual_delta','target','rail_pressure_target_bar','actual','rail_pressure_actual_bar')
      )
      when 'sprinter_capture' then t || jsonb_build_object('scanner_pids',jsonb_build_array('engine_rpm','vehicle_speed_kmh','engine_load_percent','accelerator_percent'))
      when 'sprinter_map_boost' then t || jsonb_build_object(
        'scanner_pids',jsonb_build_array('intake_pressure_target_kpa_abs','intake_pressure_actual_kpa_abs','engine_rpm','engine_load_percent'),
        'scanner_compare',jsonb_build_object('type','target_actual_delta','target','intake_pressure_target_kpa_abs','actual','intake_pressure_actual_kpa_abs')
      )
      when 'sprinter_maf_iat' then t || jsonb_build_object('scanner_pids',jsonb_build_array('maf_g_s','iat_c','intake_pressure_actual_kpa_abs'))
      when 'sprinter_rail' then t || jsonb_build_object(
        'scanner_pids',jsonb_build_array('rail_pressure_target_bar','rail_pressure_actual_bar','engine_rpm','engine_load_percent'),
        'scanner_compare',jsonb_build_object('type','target_actual_delta','target','rail_pressure_target_bar','actual','rail_pressure_actual_bar')
      )
      when 'sprinter_egr' then t || jsonb_build_object('scanner_pids',jsonb_build_array('egr_command_percent','egr_position_percent','maf_g_s'))
      else t
    end
    order by ord
  ),'[]'::jsonb)
  from jsonb_array_elements(p.ordered_tests) with ordinality as x(t,ord)
)
where p.symptom_key in ('loss_of_power_limp','no_start','hard_start','overheating');

-- Small internal fleet: Postgres Changes is intentionally used for the two current-state tables.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='v2_vehicle_scanner_current'
  ) then
    execute 'alter publication supabase_realtime add table public.v2_vehicle_scanner_current';
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='v2_vehicle_telemetry_current'
  ) then
    execute 'alter publication supabase_realtime add table public.v2_vehicle_telemetry_current';
  end if;
end $$;

comment on table public.v2_vehicle_scanner_current is 'Latest vendor-neutral live scanner snapshot per Oficina 360 vehicle.';
comment on column public.v2_vehicle_scanner_current.pids is 'Canonical PID object: {pid_key:{value,unit,label,quality}}.';
comment on table public.v2_diagnostic_scanner_snapshots is 'Scanner evidence captured at a specific diagnostic session/step.';
