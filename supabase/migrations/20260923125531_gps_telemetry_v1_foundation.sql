-- GPS/telemetry foundation for Comando 360.
-- Ingest API keys are provisioned separately and must never be committed in plaintext.

create table if not exists public.v2_tracking_sources (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.v2_companies(id) on delete cascade,
  vehicle_id uuid not null references public.v2_vehicles(id) on delete cascade,
  provider text not null default 'comando360',
  external_device_id text not null,
  device_model text,
  label text,
  enabled boolean not null default true,
  is_primary boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, provider, external_device_id)
);

create unique index if not exists v2_tracking_sources_primary_per_vehicle_uq
  on public.v2_tracking_sources(company_id, vehicle_id)
  where is_primary and enabled;
create index if not exists v2_tracking_sources_vehicle_idx
  on public.v2_tracking_sources(company_id, vehicle_id, enabled);

create table if not exists public.v2_vehicle_tracking_source_current (
  source_id uuid primary key references public.v2_tracking_sources(id) on delete cascade,
  company_id uuid not null references public.v2_companies(id) on delete cascade,
  vehicle_id uuid not null references public.v2_vehicles(id) on delete cascade,
  provider text not null,
  latitude numeric,
  longitude numeric,
  altitude_m numeric,
  accuracy_m numeric,
  speed_kmh numeric,
  heading_deg numeric,
  satellites integer,
  ignition boolean,
  motion boolean,
  odometer_km numeric,
  recorded_at timestamptz not null,
  received_at timestamptz not null default now(),
  raw_data jsonb not null default '{}'::jsonb,
  check (latitude is null or (latitude between -90 and 90)),
  check (longitude is null or (longitude between -180 and 180)),
  check (speed_kmh is null or speed_kmh >= 0),
  check (heading_deg is null or (heading_deg >= 0 and heading_deg < 360)),
  check (satellites is null or satellites >= 0)
);
create index if not exists v2_tracking_source_current_company_vehicle_idx
  on public.v2_vehicle_tracking_source_current(company_id, vehicle_id);
create index if not exists v2_tracking_source_current_recorded_idx
  on public.v2_vehicle_tracking_source_current(company_id, recorded_at desc);

alter table public.v2_vehicle_tracking_history
  add column if not exists tracking_source_id uuid references public.v2_tracking_sources(id) on delete set null,
  add column if not exists heading_deg numeric,
  add column if not exists altitude_m numeric,
  add column if not exists accuracy_m numeric,
  add column if not exists satellites integer,
  add column if not exists motion boolean;
create index if not exists v2_vehicle_tracking_history_source_recorded_idx
  on public.v2_vehicle_tracking_history(tracking_source_id, recorded_at desc)
  where tracking_source_id is not null;

create table if not exists public.v2_vehicle_telemetry_current (
  vehicle_id uuid primary key references public.v2_vehicles(id) on delete cascade,
  company_id uuid not null references public.v2_companies(id) on delete cascade,
  source_id uuid references public.v2_tracking_sources(id) on delete set null,
  engine_rpm numeric,
  can_speed_kmh numeric,
  coolant_temp_c numeric,
  engine_hours numeric,
  fuel_percent numeric,
  fuel_liters numeric,
  total_fuel_used_l numeric,
  battery_voltage numeric,
  external_voltage numeric,
  accelerator_percent numeric,
  engine_load_percent numeric,
  recorded_at timestamptz not null,
  updated_at timestamptz not null default now(),
  raw_data jsonb not null default '{}'::jsonb,
  check (engine_rpm is null or engine_rpm >= 0),
  check (can_speed_kmh is null or can_speed_kmh >= 0),
  check (fuel_percent is null or (fuel_percent >= 0 and fuel_percent <= 100)),
  check (accelerator_percent is null or (accelerator_percent >= 0 and accelerator_percent <= 100)),
  check (engine_load_percent is null or (engine_load_percent >= 0 and engine_load_percent <= 100))
);
create index if not exists v2_vehicle_telemetry_current_company_idx
  on public.v2_vehicle_telemetry_current(company_id, updated_at desc);

create table if not exists public.v2_vehicle_telemetry_history (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.v2_companies(id) on delete cascade,
  vehicle_id uuid not null references public.v2_vehicles(id) on delete cascade,
  source_id uuid references public.v2_tracking_sources(id) on delete set null,
  engine_rpm numeric,
  can_speed_kmh numeric,
  coolant_temp_c numeric,
  engine_hours numeric,
  fuel_percent numeric,
  fuel_liters numeric,
  total_fuel_used_l numeric,
  battery_voltage numeric,
  external_voltage numeric,
  accelerator_percent numeric,
  engine_load_percent numeric,
  recorded_at timestamptz not null,
  created_at timestamptz not null default now(),
  raw_data jsonb not null default '{}'::jsonb
);
create index if not exists v2_vehicle_telemetry_history_vehicle_recorded_idx
  on public.v2_vehicle_telemetry_history(vehicle_id, recorded_at desc);
create index if not exists v2_vehicle_telemetry_history_company_recorded_idx
  on public.v2_vehicle_telemetry_history(company_id, recorded_at desc);

create table if not exists public.v2_vehicle_faults (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.v2_companies(id) on delete cascade,
  vehicle_id uuid not null references public.v2_vehicles(id) on delete cascade,
  source_id uuid references public.v2_tracking_sources(id) on delete set null,
  protocol text not null default 'j1939',
  spn integer,
  fmi integer,
  occurrence_count integer,
  code text,
  description text,
  status text not null default 'active' check (status in ('active','stored','cleared')),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  cleared_at timestamptz,
  raw_data jsonb not null default '{}'::jsonb
);
create index if not exists v2_vehicle_faults_active_idx
  on public.v2_vehicle_faults(company_id, vehicle_id, last_seen_at desc)
  where status = 'active';
create unique index if not exists v2_vehicle_faults_active_code_uq
  on public.v2_vehicle_faults(vehicle_id, source_id, protocol, coalesce(spn,-1), coalesce(fmi,-1), coalesce(code,''))
  where status = 'active';

create table if not exists public.v2_vehicle_trips (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.v2_companies(id) on delete cascade,
  vehicle_id uuid not null references public.v2_vehicles(id) on delete cascade,
  source_id uuid references public.v2_tracking_sources(id) on delete set null,
  status text not null default 'active' check (status in ('active','completed','cancelled')),
  started_at timestamptz not null,
  ended_at timestamptz,
  start_latitude numeric,
  start_longitude numeric,
  end_latitude numeric,
  end_longitude numeric,
  start_odometer_km numeric,
  end_odometer_km numeric,
  distance_km numeric not null default 0,
  max_speed_kmh numeric not null default 0,
  driving_seconds bigint not null default 0,
  idle_seconds bigint not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists v2_vehicle_trips_one_active_source_uq
  on public.v2_vehicle_trips(source_id)
  where status = 'active' and source_id is not null;
create index if not exists v2_vehicle_trips_vehicle_started_idx
  on public.v2_vehicle_trips(vehicle_id, started_at desc);

create table if not exists public.v2_tracking_ingest_keys (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  key_hash text not null unique,
  active boolean not null default true,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

alter table public.v2_tracking_sources enable row level security;
alter table public.v2_vehicle_tracking_source_current enable row level security;
alter table public.v2_vehicle_telemetry_current enable row level security;
alter table public.v2_vehicle_telemetry_history enable row level security;
alter table public.v2_vehicle_faults enable row level security;
alter table public.v2_vehicle_trips enable row level security;
alter table public.v2_tracking_ingest_keys enable row level security;

create policy "v2_tracking_sources_member_select" on public.v2_tracking_sources
  for select to authenticated using (public.v2_is_company_member(company_id));
create policy "v2_tracking_sources_manage" on public.v2_tracking_sources
  for all to authenticated using (public.v2_has_permission(company_id, 'fleet.manage'))
  with check (public.v2_has_permission(company_id, 'fleet.manage'));

create policy "v2_tracking_source_current_member_select" on public.v2_vehicle_tracking_source_current
  for select to authenticated using (public.v2_is_company_member(company_id));
create policy "v2_telemetry_current_member_select" on public.v2_vehicle_telemetry_current
  for select to authenticated using (public.v2_is_company_member(company_id));
create policy "v2_telemetry_history_member_select" on public.v2_vehicle_telemetry_history
  for select to authenticated using (public.v2_is_company_member(company_id));
create policy "v2_faults_member_select" on public.v2_vehicle_faults
  for select to authenticated using (public.v2_is_company_member(company_id));
create policy "v2_faults_manage" on public.v2_vehicle_faults
  for update to authenticated using (public.v2_has_permission(company_id, 'workshop.manage'))
  with check (public.v2_has_permission(company_id, 'workshop.manage'));
create policy "v2_trips_member_select" on public.v2_vehicle_trips
  for select to authenticated using (public.v2_is_company_member(company_id));
