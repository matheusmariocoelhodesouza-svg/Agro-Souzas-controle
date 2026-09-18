create or replace function public.v2_device_location_status(
  p_permission text default null,
  p_error text default null,
  p_available boolean default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_permission text := lower(trim(coalesce(p_permission,'')));
begin
  if (select auth.uid()) is null or not private.v2_is_device_session() then
    raise exception 'Sessão de aparelho inválida';
  end if;

  if v_permission not in ('granted','prompt','denied','unknown','unavailable') then
    v_permission := 'unknown';
  end if;

  update public.v2_device_access
     set device_info = coalesce(device_info, '{}'::jsonb)
       || jsonb_build_object(
            'location_permission', v_permission,
            'location_error', coalesce(nullif(trim(coalesce(p_error,'')),''),''),
            'location_available', coalesce(p_available,false),
            'location_status_at', now()
          )
   where user_id = (select auth.uid())
     and active = true;
end;
$function$;

revoke all on function public.v2_device_location_status(text,text,boolean) from public;
grant execute on function public.v2_device_location_status(text,text,boolean) to authenticated;
