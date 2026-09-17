-- Comando 360 — rastreamento e controle remoto de aparelhos

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
  created_by uuid default auth.uid(),
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

revoke all on public.v2_device_commands from anon, authenticated;
revoke all on public.v2_device_location_current from anon, authenticated;
revoke all on public.v2_device_location_history from anon, authenticated;

create or replace function public.v2_device_get_control()
returns table(
  device_access_id uuid,
  permissions jsonb,
  control_state text,
  control_message text,
  lost_mode boolean
)
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if (select auth.uid()) is null or not private.v2_is_device_session() then
    raise exception 'Sessão de aparelho inválida';
  end if;

  return query
  select d.id,
         coalesce(d.permissions, '{}'::jsonb),
         coalesce(d.control_state, 'active'),
         d.control_message,
         coalesce(d.lost_mode, false)
    from public.v2_device_access d
   where d.user_id = (select auth.uid())
     and d.active = true
   limit 1;
end;
$function$;

create or replace function public.v2_device_set_controls(
  p_device_access_id uuid,
  p_permissions jsonb,
  p_control_state text default 'active',
  p_control_message text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_company_id uuid;
  v_state text := lower(coalesce(trim(p_control_state), 'active'));
begin
  select d.company_id into v_company_id
    from public.v2_device_access d
   where d.id = p_device_access_id;

  if v_company_id is null or not public.v2_has_permission(v_company_id, 'teams.manage') then
    raise exception 'Sem permissão para controlar este aparelho';
  end if;

  if jsonb_typeof(coalesce(p_permissions, '{}'::jsonb)) <> 'object' then
    raise exception 'Permissões inválidas';
  end if;

  if v_state not in ('active','app_locked','lost') then
    raise exception 'Estado de controle inválido';
  end if;

  update public.v2_device_access
     set permissions = coalesce(p_permissions, '{}'::jsonb),
         control_state = v_state,
         control_message = nullif(trim(p_control_message), ''),
         lost_mode = (v_state = 'lost')
   where id = p_device_access_id;
end;
$function$;

create or replace function public.v2_issue_device_command(
  p_device_access_id uuid,
  p_command text,
  p_payload jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_company_id uuid;
  v_command text := lower(coalesce(trim(p_command), ''));
  v_id uuid;
begin
  select d.company_id into v_company_id
    from public.v2_device_access d
   where d.id = p_device_access_id
     and d.active = true;

  if v_company_id is null or not public.v2_has_permission(v_company_id, 'teams.manage') then
    raise exception 'Sem permissão para comandar este aparelho';
  end if;

  if v_command not in ('ring','stop_ring','locate_now','lost_mode_on','lost_mode_off','lock_app','unlock_app','lock_device') then
    raise exception 'Comando remoto inválido';
  end if;

  insert into public.v2_device_commands(company_id, device_access_id, command, payload, created_by)
  values (v_company_id, p_device_access_id, v_command, coalesce(p_payload, '{}'::jsonb), (select auth.uid()))
  returning id into v_id;

  if v_command = 'lost_mode_on' then
    update public.v2_device_access
       set control_state = 'lost', lost_mode = true,
           control_message = coalesce(nullif(trim(p_payload->>'message'), ''), control_message)
     where id = p_device_access_id;
  elsif v_command = 'lost_mode_off' then
    update public.v2_device_access
       set control_state = 'active', lost_mode = false, control_message = null
     where id = p_device_access_id;
  elsif v_command = 'lock_app' then
    update public.v2_device_access set control_state = 'app_locked' where id = p_device_access_id;
  elsif v_command = 'unlock_app' then
    update public.v2_device_access set control_state = 'active', lost_mode = false, control_message = null where id = p_device_access_id;
  end if;

  return v_id;
end;
$function$;

create or replace function public.v2_device_get_pending_commands()
returns table(
  id uuid,
  command text,
  payload jsonb,
  created_at timestamptz,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_device_id uuid;
begin
  if (select auth.uid()) is null or not private.v2_is_device_session() then
    raise exception 'Sessão de aparelho inválida';
  end if;

  select d.id into v_device_id
    from public.v2_device_access d
   where d.user_id = (select auth.uid())
     and d.active = true
   limit 1;

  if v_device_id is null then
    raise exception 'Aparelho não vinculado';
  end if;

  update public.v2_device_commands c
     set status = 'expired', acknowledged_at = coalesce(acknowledged_at, now())
   where c.device_access_id = v_device_id
     and c.status in ('pending','delivered')
     and c.expires_at <= now();

  update public.v2_device_commands c
     set status = 'delivered', delivered_at = coalesce(delivered_at, now())
   where c.device_access_id = v_device_id
     and c.status = 'pending'
     and c.expires_at > now();

  return query
  select c.id, c.command, c.payload, c.created_at, c.expires_at
    from public.v2_device_commands c
   where c.device_access_id = v_device_id
     and c.status = 'delivered'
     and c.expires_at > now()
   order by c.created_at asc
   limit 20;
end;
$function$;

create or replace function public.v2_device_ack_command(
  p_command_id uuid,
  p_status text default 'completed',
  p_result jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_device_id uuid;
  v_status text := lower(coalesce(trim(p_status), 'completed'));
begin
  if (select auth.uid()) is null or not private.v2_is_device_session() then
    raise exception 'Sessão de aparelho inválida';
  end if;

  select d.id into v_device_id
    from public.v2_device_access d
   where d.user_id = (select auth.uid())
     and d.active = true
   limit 1;

  if v_status not in ('completed','failed') then
    raise exception 'Status de confirmação inválido';
  end if;

  update public.v2_device_commands c
     set status = v_status,
         result = coalesce(p_result, '{}'::jsonb),
         acknowledged_at = now()
   where c.id = p_command_id
     and c.device_access_id = v_device_id
     and c.status in ('pending','delivered');

  if not found then
    raise exception 'Comando não encontrado para este aparelho';
  end if;
end;
$function$;

create or replace function public.v2_device_report_location(
  p_latitude numeric,
  p_longitude numeric,
  p_accuracy_m numeric default null,
  p_speed_kmh numeric default null,
  p_heading_deg numeric default null,
  p_battery_percent integer default null,
  p_charging boolean default null,
  p_recorded_at timestamptz default now()
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_device public.v2_device_access%rowtype;
  v_when timestamptz := coalesce(p_recorded_at, now());
begin
  if (select auth.uid()) is null or not private.v2_is_device_session() then
    raise exception 'Sessão de aparelho inválida';
  end if;

  if p_latitude is null or p_longitude is null
     or p_latitude < -90 or p_latitude > 90
     or p_longitude < -180 or p_longitude > 180 then
    raise exception 'Localização inválida';
  end if;

  select d.* into v_device
    from public.v2_device_access d
   where d.user_id = (select auth.uid())
     and d.active = true
   limit 1;

  if v_device.id is null then
    raise exception 'Aparelho não vinculado';
  end if;

  insert into public.v2_device_location_history(
    company_id, team_id, device_access_id, latitude, longitude, accuracy_m,
    speed_kmh, heading_deg, battery_percent, charging, recorded_at
  ) values (
    v_device.company_id, v_device.team_id, v_device.id, p_latitude, p_longitude,
    p_accuracy_m, p_speed_kmh, p_heading_deg,
    case when p_battery_percent between 0 and 100 then p_battery_percent else null end,
    p_charging, v_when
  );

  insert into public.v2_device_location_current(
    device_access_id, company_id, team_id, latitude, longitude, accuracy_m,
    speed_kmh, heading_deg, battery_percent, charging, recorded_at, updated_at
  ) values (
    v_device.id, v_device.company_id, v_device.team_id, p_latitude, p_longitude,
    p_accuracy_m, p_speed_kmh, p_heading_deg,
    case when p_battery_percent between 0 and 100 then p_battery_percent else null end,
    p_charging, v_when, now()
  )
  on conflict (device_access_id) do update set
    company_id = excluded.company_id,
    team_id = excluded.team_id,
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    accuracy_m = excluded.accuracy_m,
    speed_kmh = excluded.speed_kmh,
    heading_deg = excluded.heading_deg,
    battery_percent = excluded.battery_percent,
    charging = excluded.charging,
    recorded_at = excluded.recorded_at,
    updated_at = now()
  where public.v2_device_location_current.recorded_at <= excluded.recorded_at;

  update public.v2_device_access
     set last_seen_at = now(),
         device_info = coalesce(device_info, '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
           'battery_percent', case when p_battery_percent between 0 and 100 then p_battery_percent else null end,
           'charging', p_charging,
           'location_heartbeat_at', now()
         ))
   where id = v_device.id;
end;
$function$;

create or replace function public.v2_device_admin_status(p_company_id uuid)
returns table(
  device_access_id uuid,
  team_id uuid,
  device_name text,
  active boolean,
  permissions jsonb,
  control_state text,
  control_message text,
  lost_mode boolean,
  last_seen_at timestamptz,
  device_info jsonb,
  latitude numeric,
  longitude numeric,
  accuracy_m numeric,
  speed_kmh numeric,
  heading_deg numeric,
  battery_percent integer,
  charging boolean,
  location_recorded_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if p_company_id is null or not public.v2_has_permission(p_company_id, 'teams.manage') then
    raise exception 'Sem permissão para consultar os aparelhos';
  end if;

  return query
  select d.id, d.team_id, d.device_name, d.active,
         coalesce(d.permissions, '{}'::jsonb), coalesce(d.control_state, 'active'),
         d.control_message, coalesce(d.lost_mode, false), d.last_seen_at,
         coalesce(d.device_info, '{}'::jsonb),
         l.latitude, l.longitude, l.accuracy_m, l.speed_kmh, l.heading_deg,
         l.battery_percent, l.charging, l.recorded_at
    from public.v2_device_access d
    left join public.v2_device_location_current l on l.device_access_id = d.id
   where d.company_id = p_company_id
   order by d.active desc, d.paired_at desc;
end;
$function$;

revoke all on function public.v2_device_get_control() from public;
revoke all on function public.v2_device_set_controls(uuid,jsonb,text,text) from public;
revoke all on function public.v2_issue_device_command(uuid,text,jsonb) from public;
revoke all on function public.v2_device_get_pending_commands() from public;
revoke all on function public.v2_device_ack_command(uuid,text,jsonb) from public;
revoke all on function public.v2_device_report_location(numeric,numeric,numeric,numeric,numeric,integer,boolean,timestamptz) from public;
revoke all on function public.v2_device_admin_status(uuid) from public;

grant execute on function public.v2_device_get_control() to authenticated;
grant execute on function public.v2_device_set_controls(uuid,jsonb,text,text) to authenticated;
grant execute on function public.v2_issue_device_command(uuid,text,jsonb) to authenticated;
grant execute on function public.v2_device_get_pending_commands() to authenticated;
grant execute on function public.v2_device_ack_command(uuid,text,jsonb) to authenticated;
grant execute on function public.v2_device_report_location(numeric,numeric,numeric,numeric,numeric,integer,boolean,timestamptz) to authenticated;
grant execute on function public.v2_device_admin_status(uuid) to authenticated;
