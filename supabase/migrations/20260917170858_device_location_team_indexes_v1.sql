create index if not exists v2_device_location_current_team_idx on public.v2_device_location_current(team_id);
create index if not exists v2_device_location_history_team_idx on public.v2_device_location_history(team_id);
