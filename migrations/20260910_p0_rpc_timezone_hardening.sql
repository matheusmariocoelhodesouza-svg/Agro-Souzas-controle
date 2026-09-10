-- Comando 360 • P0 RPC authorization and timezone hardening.

create or replace function public.v2_attendance_next_event(
  p_company_id uuid,
  p_employee_id uuid,
  p_at timestamptz default now()
)
returns text
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_last text;
  v_tz text;
begin
  if not (
    public.v2_has_permission(p_company_id,'attendance.create')
    or private.v2_device_employee_allowed(p_company_id,p_employee_id)
  ) then
    raise exception 'Sem permissão para consultar sequência de ponto';
  end if;

  select coalesce(nullif(c.timezone,''),'America/Sao_Paulo')
    into v_tz
  from public.v2_companies c
  where c.id=p_company_id and c.status='active';
  if v_tz is null then raise exception 'Empresa inválida ou inativa'; end if;

  select e.event_type into v_last
  from public.v2_attendance_events e
  where e.company_id=p_company_id
    and e.employee_id=p_employee_id
    and (e.occurred_at at time zone v_tz)::date=(p_at at time zone v_tz)::date
  order by e.occurred_at desc
  limit 1;

  return case
    when v_last is null then 'in'
    when v_last='in' then 'break_start'
    when v_last='break_start' then 'break_end'
    when v_last='break_end' then 'out'
    when v_last='out' then 'finished'
    else 'in'
  end;
end;
$function$;

create or replace function public.v2_touch_device()
returns void
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if (select auth.uid()) is null or not private.v2_is_device_session() then
    raise exception 'Sessão de aparelho inválida';
  end if;
  update public.v2_device_access
     set last_seen_at=now()
   where user_id=(select auth.uid()) and active=true;
end;
$function$;

create or replace function public.v2_update_device_identity(
  p_device_name text default null,
  p_device_info jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if (select auth.uid()) is null or not private.v2_is_device_session() then
    raise exception 'Sessão de aparelho inválida';
  end if;
  update public.v2_device_access
     set device_name=coalesce(nullif(trim(p_device_name),''),device_name),
         device_info=coalesce(p_device_info,'{}'::jsonb),
         last_seen_at=now()
   where user_id=(select auth.uid()) and active=true;
end;
$function$;

create or replace function public.v2_device_point_events_today()
returns table(
  id uuid,
  employee_id uuid,
  occurred_at timestamptz,
  event_type text,
  method text,
  accuracy_m numeric,
  offline_event_id text,
  work_team_id uuid,
  device_access_id uuid,
  metadata jsonb
)
language sql
stable
security definer
set search_path to ''
as $function$
  select e.id,e.employee_id,e.occurred_at,e.event_type,e.method,e.accuracy_m,
         e.offline_event_id,e.work_team_id,e.device_access_id,e.metadata
  from public.v2_device_access da
  join public.v2_companies c on c.id=da.company_id and c.status='active'
  join public.v2_attendance_events e on e.company_id=da.company_id
  where da.user_id=(select auth.uid())
    and da.active=true
    and private.v2_is_device_session()
    and e.occurred_at >= timezone(coalesce(nullif(c.timezone,''),'America/Sao_Paulo'),
          (timezone(coalesce(nullif(c.timezone,''),'America/Sao_Paulo'),now()))::date::timestamp)
    and e.occurred_at < timezone(coalesce(nullif(c.timezone,''),'America/Sao_Paulo'),
          ((timezone(coalesce(nullif(c.timezone,''),'America/Sao_Paulo'),now()))::date + 1)::timestamp)
  order by e.occurred_at;
$function$;

create or replace function public.v2_vehicle_tracking_distance_summary(p_company_id uuid)
returns table(
  vehicle_id uuid,
  today_km numeric,
  yesterday_km numeric,
  last_7_days_km numeric,
  month_km numeric,
  sample_count bigint,
  first_recorded_at timestamptz,
  last_recorded_at timestamptz
)
language sql
stable
security definer
set search_path to ''
as $function$
  with company_cfg as (
    select coalesce(nullif(c.timezone,''),'America/Sao_Paulo') as tz
    from public.v2_companies c
    where c.id=p_company_id and c.status='active'
      and public.v2_is_company_member(p_company_id)
  ), cfg as (
    select tz,
           timezone(tz,now())::date as today_local,
           date_trunc('month',timezone(tz,now()))::date as month_start
    from company_cfg
  ), h as (
    select x.vehicle_id,
           greatest(0::numeric,least(coalesce(x.distance_delta_km,0),1000::numeric)) as delta,
           timezone(cfg.tz,x.recorded_at)::date as local_day,
           x.recorded_at
    from public.v2_vehicle_tracking_history x
    cross join cfg
    where x.company_id=p_company_id
      and x.provider='movit'
      and x.recorded_at >= timezone(cfg.tz,(cfg.today_local-40)::timestamp)
  )
  select v.id,
         coalesce(sum(h.delta) filter(where h.local_day=cfg.today_local),0)::numeric,
         coalesce(sum(h.delta) filter(where h.local_day=cfg.today_local-1),0)::numeric,
         coalesce(sum(h.delta) filter(where h.local_day between cfg.today_local-6 and cfg.today_local),0)::numeric,
         coalesce(sum(h.delta) filter(where h.local_day between cfg.month_start and cfg.today_local),0)::numeric,
         count(h.recorded_at)::bigint,
         min(h.recorded_at),
         max(h.recorded_at)
  from cfg
  join public.v2_vehicles v on v.company_id=p_company_id
  left join h on h.vehicle_id=v.id
  group by v.id,cfg.today_local,cfg.month_start
  order by v.id;
$function$;

-- Trigger helpers must never be callable as public RPC endpoints.
revoke execute on function public.v2_sync_receipt_face_check() from public, anon, authenticated;
