-- Comando 360 — rastreamento e controle remoto de aparelhos
-- Acesso privilegiado é controlado por RLS; não há funções SECURITY DEFINER expostas.

alter table public.v2_device_access
  add column if not exists control_state text not null default 'active',
  add column if not exists control_message text,
  add column if not exists lost_mode boolean not null default false;

create table if not exists public.v2_device_commands (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.v2_companies(id) on delete cascade,
  device_access_id uuid not null references public.v2_device_access(id) on delete cascade,
  command text not null check (command in (
    'ring','stop_ring','locate_now','lost_mode_on','lost_mode_off',
    'lock_app','unlock_app','lock_device'
  )),
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','delivered','completed','failed','expired')),
  result jsonb not null default '{}'::jsonb,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  delivered_at timestamptz,
  acknowledged_at timestamptz,
  expires_at timestamptz not null default (now() + interval '24 hours')
);

create index if not exists v2_device_commands_device_pending_idx
  on public.v2_device_commands(device_access_id, status, created_at desc);
create index if not exists v2_device_commands_company_created_idx
  on public.v2_device_commands(company_id, created_at desc);

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

create index if not exists v2_device_location_current_company_idx
  on public.v2_device_location_current(company_id, recorded_at desc);

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

create index if not exists v2_device_location_history_device_time_idx
  on public.v2_device_location_history(device_access_id, recorded_at desc);
create index if not exists v2_device_location_history_company_time_idx
  on public.v2_device_location_history(company_id, recorded_at desc);

alter table public.v2_device_commands enable row level security;
alter table public.v2_device_location_current enable row level security;
alter table public.v2_device_location_history enable row level security;

revoke all on table public.v2_device_commands from anon, authenticated;
revoke all on table public.v2_device_location_current from anon, authenticated;
revoke all on table public.v2_device_location_history from anon, authenticated;

grant select, insert on table public.v2_device_commands to authenticated;
grant update(status, result, delivered_at, acknowledged_at) on table public.v2_device_commands to authenticated;
grant select, insert, update on table public.v2_device_location_current to authenticated;
grant select, insert on table public.v2_device_location_history to authenticated;

create policy v2_device_commands_select
on public.v2_device_commands for select
to authenticated
using (
  public.v2_has_permission(company_id, 'teams.manage')
  or exists (
    select 1
      from public.v2_device_access d
     where d.id = device_access_id
       and d.company_id = company_id
       and d.user_id = (select auth.uid())
       and d.active = true
       and private.v2_is_device_session()
  )
);

create policy v2_device_commands_admin_insert
on public.v2_device_commands for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and public.v2_has_permission(company_id, 'teams.manage')
  and exists (
    select 1
      from public.v2_device_access d
     where d.id = device_access_id
       and d.company_id = company_id
       and d.active = true
  )
);

create policy v2_device_commands_device_update
on public.v2_device_commands for update
to authenticated
using (
  exists (
    select 1
      from public.v2_device_access d
     where d.id = device_access_id
       and d.company_id = company_id
       and d.user_id = (select auth.uid())
       and d.active = true
       and private.v2_is_device_session()
  )
)
with check (
  exists (
    select 1
      from public.v2_device_access d
     where d.id = device_access_id
       and d.company_id = company_id
       and d.user_id = (select auth.uid())
       and d.active = true
       and private.v2_is_device_session()
  )
);

create policy v2_device_location_current_select
on public.v2_device_location_current for select
to authenticated
using (
  public.v2_has_permission(company_id, 'teams.manage')
  or exists (
    select 1
      from public.v2_device_access d
     where d.id = device_access_id
       and d.company_id = company_id
       and d.user_id = (select auth.uid())
       and d.active = true
       and private.v2_is_device_session()
  )
);

create policy v2_device_location_current_insert
on public.v2_device_location_current for insert
to authenticated
with check (
  latitude between -90 and 90
  and longitude between -180 and 180
  and (battery_percent is null or battery_percent between 0 and 100)
  and exists (
    select 1
      from public.v2_device_access d
     where d.id = device_access_id
       and d.company_id = company_id
       and d.team_id = team_id
       and d.user_id = (select auth.uid())
       and d.active = true
       and private.v2_is_device_session()
  )
);

create policy v2_device_location_current_update
on public.v2_device_location_current for update
to authenticated
using (
  exists (
    select 1
      from public.v2_device_access d
     where d.id = device_access_id
       and d.company_id = company_id
       and d.user_id = (select auth.uid())
       and d.active = true
       and private.v2_is_device_session()
  )
)
with check (
  latitude between -90 and 90
  and longitude between -180 and 180
  and (battery_percent is null or battery_percent between 0 and 100)
  and exists (
    select 1
      from public.v2_device_access d
     where d.id = device_access_id
       and d.company_id = company_id
       and d.team_id = team_id
       and d.user_id = (select auth.uid())
       and d.active = true
       and private.v2_is_device_session()
  )
);

create policy v2_device_location_history_select
on public.v2_device_location_history for select
to authenticated
using (public.v2_has_permission(company_id, 'teams.manage'));

create policy v2_device_location_history_insert
on public.v2_device_location_history for insert
to authenticated
with check (
  latitude between -90 and 90
  and longitude between -180 and 180
  and (battery_percent is null or battery_percent between 0 and 100)
  and exists (
    select 1
      from public.v2_device_access d
     where d.id = device_access_id
       and d.company_id = company_id
       and d.team_id = team_id
       and d.user_id = (select auth.uid())
       and d.active = true
       and private.v2_is_device_session()
  )
);
