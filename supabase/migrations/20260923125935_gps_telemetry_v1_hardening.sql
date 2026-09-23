create index if not exists v2_tracking_sources_vehicle_fk_idx on public.v2_tracking_sources(vehicle_id);
create index if not exists v2_tracking_source_current_vehicle_fk_idx on public.v2_vehicle_tracking_source_current(vehicle_id);
create index if not exists v2_telemetry_current_source_fk_idx on public.v2_vehicle_telemetry_current(source_id);
create index if not exists v2_telemetry_history_source_fk_idx on public.v2_vehicle_telemetry_history(source_id);
create index if not exists v2_faults_source_fk_idx on public.v2_vehicle_faults(source_id);
create index if not exists v2_trips_company_fk_idx on public.v2_vehicle_trips(company_id);

drop policy if exists "v2_tracking_sources_manage" on public.v2_tracking_sources;
create policy "v2_tracking_sources_insert" on public.v2_tracking_sources
  for insert to authenticated with check (public.v2_has_permission(company_id, 'fleet.manage'));
create policy "v2_tracking_sources_update" on public.v2_tracking_sources
  for update to authenticated using (public.v2_has_permission(company_id, 'fleet.manage'))
  with check (public.v2_has_permission(company_id, 'fleet.manage'));
create policy "v2_tracking_sources_delete" on public.v2_tracking_sources
  for delete to authenticated using (public.v2_has_permission(company_id, 'fleet.manage'));

create policy "v2_tracking_ingest_keys_deny_user_access" on public.v2_tracking_ingest_keys
  for all to authenticated using (false) with check (false);
