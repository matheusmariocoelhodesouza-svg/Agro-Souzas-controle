alter table public.v2_device_access
  add column if not exists native_user_id uuid references auth.users(id) on delete set null;

create unique index if not exists v2_device_access_native_user_uidx
  on public.v2_device_access(native_user_id)
  where native_user_id is not null;

create table if not exists public.v2_native_tracker_pairing_codes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.v2_companies(id) on delete cascade,
  device_access_id uuid not null references public.v2_device_access(id) on delete cascade,
  code_hash text not null unique,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  used_at timestamptz
);
create index if not exists v2_native_tracker_pairing_device_idx
  on public.v2_native_tracker_pairing_codes(device_access_id,created_at desc);
alter table public.v2_native_tracker_pairing_codes enable row level security;
revoke all on table public.v2_native_tracker_pairing_codes from anon, authenticated;

create or replace function public.v2_create_native_tracker_pairing_code(p_device_access_id uuid)
returns table(code text, expires_at timestamptz)
language plpgsql security definer set search_path = '' as $function$
declare
  v_company_id uuid;
  v_code text;
  v_expires timestamptz := now() + interval '30 minutes';
begin
  select d.company_id into v_company_id from public.v2_device_access d
  where d.id = p_device_access_id and d.active = true;
  if v_company_id is null then raise exception 'Aparelho ativo não encontrado'; end if;
  if not public.v2_has_permission(v_company_id,'teams.manage') then raise exception 'Sem permissão para administrar este aparelho'; end if;
  delete from public.v2_native_tracker_pairing_codes where device_access_id = p_device_access_id and used_at is null;
  v_code := upper(substr(encode(extensions.gen_random_bytes(8),'hex'),1,10));
  insert into public.v2_native_tracker_pairing_codes(company_id,device_access_id,code_hash,created_by,expires_at)
  values (v_company_id,p_device_access_id,encode(extensions.digest(v_code,'sha256'),'hex'),(select auth.uid()),v_expires);
  return query select v_code, v_expires;
end;
$function$;
revoke all on function public.v2_create_native_tracker_pairing_code(uuid) from public;
grant execute on function public.v2_create_native_tracker_pairing_code(uuid) to authenticated;

create or replace function public.v2_native_tracker_heartbeat(
  p_native_version text default null,
  p_background_permission boolean default null,
  p_service_running boolean default null,
  p_device_owner boolean default null
)
returns void language plpgsql security definer set search_path = '' as $function$
begin
  if (select auth.uid()) is null or not private.v2_is_device_session() then raise exception 'Sessão de rastreador inválida'; end if;
  update public.v2_device_access
     set device_info = coalesce(device_info,'{}'::jsonb) || jsonb_build_object(
       'native_tracker', true,
       'native_tracker_version', coalesce(p_native_version,''),
       'native_background_permission', coalesce(p_background_permission,false),
       'native_service_running', coalesce(p_service_running,false),
       'native_device_owner', coalesce(p_device_owner,false),
       'native_managed', coalesce(p_device_owner,false),
       'native_tracker_heartbeat_at', now()
     ), last_seen_at = now()
   where native_user_id = (select auth.uid()) and active = true;
end;
$function$;
revoke all on function public.v2_native_tracker_heartbeat(text,boolean,boolean,boolean) from public;
grant execute on function public.v2_native_tracker_heartbeat(text,boolean,boolean,boolean) to authenticated;

create or replace function public.v2_device_location_status(p_permission text default null,p_error text default null,p_available boolean default null)
returns void language plpgsql security definer set search_path = '' as $function$
declare v_permission text := lower(trim(coalesce(p_permission,'')));
begin
  if (select auth.uid()) is null or not private.v2_is_device_session() then raise exception 'Sessão de aparelho inválida'; end if;
  if v_permission not in ('granted','prompt','denied','unknown','unavailable') then v_permission := 'unknown'; end if;
  update public.v2_device_access set device_info = coalesce(device_info, '{}'::jsonb) || jsonb_build_object(
    'location_permission',v_permission,'location_error',coalesce(nullif(trim(coalesce(p_error,'')),''),''),
    'location_available',coalesce(p_available,false),'location_status_at',now())
  where (user_id=(select auth.uid()) or native_user_id=(select auth.uid())) and active=true;
end;
$function$;

-- O PWA e o rastreador Android podem publicar no mesmo aparelho vinculado.
drop policy if exists v2_device_location_current_select on public.v2_device_location_current;
create policy v2_device_location_current_select on public.v2_device_location_current for select to authenticated using (
  public.v2_has_permission(company_id,'teams.manage') or exists (select 1 from public.v2_device_access d where d.id=device_access_id and d.company_id=company_id and (d.user_id=(select auth.uid()) or d.native_user_id=(select auth.uid())) and d.active=true and private.v2_is_device_session())
);
drop policy if exists v2_device_location_current_insert on public.v2_device_location_current;
create policy v2_device_location_current_insert on public.v2_device_location_current for insert to authenticated with check (
  latitude between -90 and 90 and longitude between -180 and 180 and (battery_percent is null or battery_percent between 0 and 100) and exists (select 1 from public.v2_device_access d where d.id=device_access_id and d.company_id=company_id and d.team_id=team_id and (d.user_id=(select auth.uid()) or d.native_user_id=(select auth.uid())) and d.active=true and private.v2_is_device_session())
);
drop policy if exists v2_device_location_current_update on public.v2_device_location_current;
create policy v2_device_location_current_update on public.v2_device_location_current for update to authenticated using (
  exists (select 1 from public.v2_device_access d where d.id=device_access_id and d.company_id=company_id and (d.user_id=(select auth.uid()) or d.native_user_id=(select auth.uid())) and d.active=true and private.v2_is_device_session())
) with check (
  latitude between -90 and 90 and longitude between -180 and 180 and (battery_percent is null or battery_percent between 0 and 100) and exists (select 1 from public.v2_device_access d where d.id=device_access_id and d.company_id=company_id and d.team_id=team_id and (d.user_id=(select auth.uid()) or d.native_user_id=(select auth.uid())) and d.active=true and private.v2_is_device_session())
);
drop policy if exists v2_device_location_history_insert on public.v2_device_location_history;
create policy v2_device_location_history_insert on public.v2_device_location_history for insert to authenticated with check (
  latitude between -90 and 90 and longitude between -180 and 180 and (battery_percent is null or battery_percent between 0 and 100) and exists (select 1 from public.v2_device_access d where d.id=device_access_id and d.company_id=company_id and d.team_id=team_id and (d.user_id=(select auth.uid()) or d.native_user_id=(select auth.uid())) and d.active=true and private.v2_is_device_session())
);
drop policy if exists v2_device_commands_select on public.v2_device_commands;
create policy v2_device_commands_select on public.v2_device_commands for select to authenticated using (
  public.v2_has_permission(company_id,'teams.manage') or exists (select 1 from public.v2_device_access d where d.id=device_access_id and d.company_id=company_id and (d.user_id=(select auth.uid()) or d.native_user_id=(select auth.uid())) and d.active=true and private.v2_is_device_session())
);
drop policy if exists v2_device_commands_device_update on public.v2_device_commands;
create policy v2_device_commands_device_update on public.v2_device_commands for update to authenticated using (
  exists (select 1 from public.v2_device_access d where d.id=device_access_id and d.company_id=company_id and (d.user_id=(select auth.uid()) or d.native_user_id=(select auth.uid())) and d.active=true and private.v2_is_device_session())
) with check (
  exists (select 1 from public.v2_device_access d where d.id=device_access_id and d.company_id=company_id and (d.user_id=(select auth.uid()) or d.native_user_id=(select auth.uid())) and d.active=true and private.v2_is_device_session())
);
