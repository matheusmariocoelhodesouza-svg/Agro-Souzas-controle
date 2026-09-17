create table if not exists public.v2_device_commands (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.v2_companies(id) on delete cascade,
  device_access_id uuid not null references public.v2_device_access(id) on delete cascade,
  command text not null check (command in ('ring','stop_ring','locate_now','lost_mode_on','lost_mode_off','lock_app','unlock_app','lock_device')),
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','delivered','completed','failed','expired')),
  result jsonb not null default '{}'::jsonb,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  delivered_at timestamptz,
  acknowledged_at timestamptz,
  expires_at timestamptz not null default (now() + interval '24 hours')
);
create index if not exists v2_device_commands_device_pending_idx on public.v2_device_commands(device_access_id,status,created_at desc);
create index if not exists v2_device_commands_company_created_idx on public.v2_device_commands(company_id,created_at desc);

create table if not exists public.v2_device_location_current (
  device_access_id uuid primary key references public.v2_device_access(id) on delete cascade,
  company_id uuid not null references public.v2_companies(id) on delete cascade,
  team_id uuid references public.v2_teams(id) on delete set null,
  latitude numeric(10,7) not null,
  longitude numeric(10,7) not null,
  accuracy_m numeric(10,2),
  speed_kmh numeric(10,2),
  heading_deg numeric(7,2),
  battery_percent integer,
  charging boolean,
  recorded_at timestamptz not null,
  updated_at timestamptz not null default now()
);
create index if not exists v2_device_location_current_company_idx on public.v2_device_location_current(company_id,recorded_at desc);

create table if not exists public.v2_device_location_history (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.v2_companies(id) on delete cascade,
  team_id uuid references public.v2_teams(id) on delete set null,
  device_access_id uuid not null references public.v2_device_access(id) on delete cascade,
  latitude numeric(10,7) not null,
  longitude numeric(10,7) not null,
  accuracy_m numeric(10,2),
  speed_kmh numeric(10,2),
  heading_deg numeric(7,2),
  battery_percent integer,
  charging boolean,
  recorded_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists v2_device_location_history_device_time_idx on public.v2_device_location_history(device_access_id,recorded_at desc);
create index if not exists v2_device_location_history_company_time_idx on public.v2_device_location_history(company_id,recorded_at desc);

alter table public.v2_device_commands enable row level security;
alter table public.v2_device_location_current enable row level security;
alter table public.v2_device_location_history enable row level security;
