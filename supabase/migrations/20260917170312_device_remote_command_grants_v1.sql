revoke all on table public.v2_device_commands from anon, authenticated;
revoke all on table public.v2_device_location_current from anon, authenticated;
revoke all on table public.v2_device_location_history from anon, authenticated;

grant select, insert on table public.v2_device_commands to authenticated;
grant update(status, result, delivered_at, acknowledged_at) on table public.v2_device_commands to authenticated;
grant select, insert, update on table public.v2_device_location_current to authenticated;
grant select, insert on table public.v2_device_location_history to authenticated;
