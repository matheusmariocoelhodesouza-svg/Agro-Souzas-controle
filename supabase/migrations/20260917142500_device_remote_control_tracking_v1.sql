create or replace function private.v2_device_access_id(p_company_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $function$
  select da.id
  from public.v2_device_access da
  where da.user_id = (select auth.uid())
    and da.company_id = p_company_id
    and da.active = true
  limit 1;
$function$;

revoke all on function private.v2_device_access_id(uuid) from public;
grant execute on function private.v2_device_access_id(uuid) to authenticated;

alter table public.v2_device_access
  add column if not exists control_state text not null default 'active',
  add column if not exists control_message text,
  add column if not exists lost_mode boolean not null default false;

alter table public.v2_device_access drop constraint if exists v2_device_access_control_state_check;
alter table public.v2_device_access add constraint v2_device_access_control_state_check
  check (control_state in ('active','app_locked','lost'));

create table if not exists public.v2_device_commands (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.v2_companies(id) on delete cascade,
  device_access_id uuid not null references public.v2_device_access(id) on delete cascade,
  command text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  delivered_at timestamptz,
  acknowledged_at timestamptz,
  expires_at timestamptz not null default (now() + interval '24 hours'),
  result jsonb not null default '{}'::jsonb
);

alter table public.v2_device_commands drop constraint if exists v2_device_commands_command_check;
alter table public.v2_device_commands add constraint v2_device_commands_command_check
  check (command in ('ring','stop_ring','request_location','locate_now','lock_app','unlock_app','lost_mode_on','lost_mode_off','lock_device'));
alter table public.v2_device_commands drop constraint if exists v2_device_commands_status_check;
alter table public.v2_device_commands add constraint v2_device_commands_status_check
  check (status in ('pending','delivered','acknowledged','completed','failed','expired'));

create index if not exists v2_device_commands_device_status_idx on public.v2_device_commands(device_access_id,status,created_at desc);
create index if not exists v2_device_commands_company_created_idx on public.v2_device_commands(company_id,created_at desc);
create index if not exists v2_device_access_company_control_idx on public.v2_device_access(company_id,control_state,active);

alter table public.v2_device_commands enable row level security;
revoke all on table public.v2_device_commands from anon, authenticated;
grant select, insert on table public.v2_device_commands to authenticated;
grant update(status, delivered_at, acknowledged_at, result) on table public.v2_device_commands to authenticated;

drop policy if exists v2_device_commands_select on public.v2_device_commands;
create policy v2_device_commands_select on public.v2_device_commands for select to authenticated
using (public.v2_has_permission(company_id,'teams.manage') or private.v2_device_access_id(company_id)=device_access_id);

drop policy if exists v2_device_commands_admin_insert on public.v2_device_commands;
create policy v2_device_commands_admin_insert on public.v2_device_commands for insert to authenticated
with check (
  public.v2_has_permission(company_id,'teams.manage')
  and device_access_id in (select da.id from public.v2_device_access da where da.company_id=v2_device_commands.company_id)
);

drop policy if exists v2_device_commands_device_update on public.v2_device_commands;
create policy v2_device_commands_device_update on public.v2_device_commands for update to authenticated
using (private.v2_device_access_id(company_id)=device_access_id)
with check (private.v2_device_access_id(company_id)=device_access_id);

create table if not exists public.v2_device_location_current (
  device_access_id uuid primary key references public.v2_device_access(id) on delete cascade,
  company_id uuid not null references public.v2_companies(id) on delete cascade,
  team_id uuid references public.v2_teams(id) on delete set null,
  latitude numeric(9,6) not null check (latitude between -90 and 90),
  longitude numeric(9,6) not null check (longitude between -180 and 180),
  accuracy_m numeric,
  speed_kmh numeric,
  heading_deg numeric,
  battery_percent smallint check (battery_percent between 0 and 100),
  charging boolean,
  recorded_at timestamptz not null,
  updated_at timestamptz not null default now()
);

alter table public.v2_device_location_current add column if not exists team_id uuid references public.v2_teams(id) on delete set null;
alter table public.v2_device_location_current add column if not exists charging boolean;
create index if not exists v2_device_location_current_company_idx on public.v2_device_location_current(company_id,recorded_at desc);

alter table public.v2_device_location_current enable row level security;
revoke all on table public.v2_device_location_current from anon, authenticated;
grant select, insert, update on table public.v2_device_location_current to authenticated;

drop policy if exists v2_device_location_current_select on public.v2_device_location_current;
create policy v2_device_location_current_select on public.v2_device_location_current for select to authenticated
using (public.v2_has_permission(company_id,'teams.manage') or private.v2_device_access_id(company_id)=device_access_id);

drop policy if exists v2_device_location_current_insert on public.v2_device_location_current;
create policy v2_device_location_current_insert on public.v2_device_location_current for insert to authenticated
with check (private.v2_device_access_id(company_id)=device_access_id);

drop policy if exists v2_device_location_current_update on public.v2_device_location_current;
create policy v2_device_location_current_update on public.v2_device_location_current for update to authenticated
using (private.v2_device_access_id(company_id)=device_access_id)
with check (private.v2_device_access_id(company_id)=device_access_id);

create table if not exists public.v2_device_location_history (
  id uuid primary key default gen_random_uuid(),
  device_access_id uuid not null references public.v2_device_access(id) on delete cascade,
  company_id uuid not null references public.v2_companies(id) on delete cascade,
  team_id uuid references public.v2_teams(id) on delete set null,
  latitude numeric(9,6) not null check (latitude between -90 and 90),
  longitude numeric(9,6) not null check (longitude between -180 and 180),
  accuracy_m numeric,
  speed_kmh numeric,
  heading_deg numeric,
  battery_percent smallint check (battery_percent between 0 and 100),
  charging boolean,
  recorded_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.v2_device_location_history add column if not exists team_id uuid references public.v2_teams(id) on delete set null;
alter table public.v2_device_location_history add column if not exists charging boolean;
create index if not exists v2_device_location_history_device_recorded_idx on public.v2_device_location_history(device_access_id,recorded_at desc);
create index if not exists v2_device_location_history_company_recorded_idx on public.v2_device_location_history(company_id,recorded_at desc);

alter table public.v2_device_location_history enable row level security;
revoke all on table public.v2_device_location_history from anon, authenticated;
grant select, insert on table public.v2_device_location_history to authenticated;

drop policy if exists v2_device_location_history_select on public.v2_device_location_history;
create policy v2_device_location_history_select on public.v2_device_location_history for select to authenticated
using (public.v2_has_permission(company_id,'teams.manage') or private.v2_device_access_id(company_id)=device_access_id);

drop policy if exists v2_device_location_history_insert on public.v2_device_location_history;
create policy v2_device_location_history_insert on public.v2_device_location_history for insert to authenticated
with check (private.v2_device_access_id(company_id)=device_access_id);
