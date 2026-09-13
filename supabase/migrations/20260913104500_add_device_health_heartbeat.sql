create or replace function public.v2_device_health_heartbeat(
  p_app_version text default null,
  p_recovery_version text default null,
  p_bootstrap_version text default null,
  p_safe_mode boolean default false,
  p_route text default null,
  p_pending_sync integer default 0
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if (select auth.uid()) is null or not private.v2_is_device_session() then
    raise exception 'Sessão de aparelho inválida';
  end if;

  update public.v2_device_access
     set last_seen_at = now(),
         device_info = coalesce(device_info, '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
           'app_version', nullif(trim(p_app_version), ''),
           'recovery_version', nullif(trim(p_recovery_version), ''),
           'bootstrap_version', nullif(trim(p_bootstrap_version), ''),
           'safe_mode', coalesce(p_safe_mode, false),
           'last_route', nullif(trim(p_route), ''),
           'pending_sync', greatest(coalesce(p_pending_sync, 0), 0),
           'health_heartbeat_at', now()
         ))
   where user_id = (select auth.uid())
     and active = true;
end;
$function$;

revoke all on function public.v2_device_health_heartbeat(text,text,text,boolean,text,integer) from public;
grant execute on function public.v2_device_health_heartbeat(text,text,text,boolean,text,integer) to authenticated;
