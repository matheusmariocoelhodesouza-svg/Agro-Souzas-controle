-- Prevent a routine device identity refresh from replacing security/runtime metadata.
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
     set device_name = coalesce(nullif(trim(p_device_name),''),device_name),
         device_info = coalesce(device_info,'{}'::jsonb) || coalesce(p_device_info,'{}'::jsonb),
         last_seen_at = now()
   where user_id = (select auth.uid())
     and active = true;
end;
$function$;
