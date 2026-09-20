create or replace function public.v2_native_tracker_heartbeat_v2(
  p_native_version text default null,
  p_background_permission boolean default null,
  p_service_running boolean default null,
  p_device_owner boolean default null,
  p_battery_percent integer default null,
  p_charging boolean default null
)
returns void
language plpgsql
security definer
set search_path=''
as $$
begin
  if (select auth.uid()) is null or not private.v2_is_device_session() then
    raise exception 'Sessão de rastreador inválida';
  end if;

  if p_battery_percent is not null and (p_battery_percent < 0 or p_battery_percent > 100) then
    raise exception 'Bateria inválida';
  end if;

  update public.v2_device_access
     set device_info = coalesce(device_info,'{}'::jsonb)
       || jsonb_strip_nulls(jsonb_build_object(
            'native_tracker', true,
            'native_tracker_version', coalesce(p_native_version,''),
            'native_background_permission', coalesce(p_background_permission,false),
            'native_service_running', coalesce(p_service_running,false),
            'native_device_owner', coalesce(p_device_owner,false),
            'native_managed', coalesce(p_device_owner,false),
            'native_battery_percent', p_battery_percent,
            'native_charging', p_charging,
            'native_tracker_heartbeat_at', now()
          )),
         last_seen_at = now()
   where native_user_id = (select auth.uid())
     and active = true;
end;
$$;

revoke all on function public.v2_native_tracker_heartbeat_v2(text,boolean,boolean,boolean,integer,boolean) from public, anon;
grant execute on function public.v2_native_tracker_heartbeat_v2(text,boolean,boolean,boolean,integer,boolean) to authenticated, service_role;
