create or replace view public.v2_tracking_central
with (security_invoker = true)
as
select
  v.id as vehicle_id,
  v.company_id,
  v.description as vehicle_name,
  v.plate,
  v.make,
  v.model,
  v.status as vehicle_status,
  v.current_odometer_km,
  case when own.source_id is null then null else jsonb_build_object(
    'source_id', own.source_id,
    'provider', own.provider,
    'label', own.source_label,
    'device_model', own.device_model,
    'latitude', own.latitude,
    'longitude', own.longitude,
    'altitude_m', own.altitude_m,
    'accuracy_m', own.accuracy_m,
    'speed_kmh', own.speed_kmh,
    'heading_deg', own.heading_deg,
    'satellites', own.satellites,
    'ignition', own.ignition,
    'motion', own.motion,
    'odometer_km', own.odometer_km,
    'recorded_at', own.recorded_at,
    'received_at', own.received_at
  ) end as comando_gps,
  case when movit.vehicle_id is null then null else jsonb_build_object(
    'provider', movit.provider,
    'latitude', movit.latitude,
    'longitude', movit.longitude,
    'speed_kmh', movit.speed_kmh,
    'ignition', movit.ignition,
    'odometer_km', movit.odometer_km,
    'recorded_at', movit.recorded_at,
    'updated_at', movit.updated_at
  ) end as movit_gps,
  case when tel.vehicle_id is null then null else jsonb_build_object(
    'engine_rpm', tel.engine_rpm,
    'can_speed_kmh', tel.can_speed_kmh,
    'coolant_temp_c', tel.coolant_temp_c,
    'engine_hours', tel.engine_hours,
    'fuel_percent', tel.fuel_percent,
    'fuel_liters', tel.fuel_liters,
    'total_fuel_used_l', tel.total_fuel_used_l,
    'battery_voltage', tel.battery_voltage,
    'external_voltage', tel.external_voltage,
    'accelerator_percent', tel.accelerator_percent,
    'engine_load_percent', tel.engine_load_percent,
    'recorded_at', tel.recorded_at
  ) end as telemetry,
  phone.phone_json,
  coalesce(faults.active_fault_count,0) as active_fault_count,
  trip.trip_json as active_trip
from public.v2_vehicles v
left join lateral (
  select c.*, s.label as source_label, s.device_model
  from public.v2_vehicle_tracking_source_current c
  join public.v2_tracking_sources s on s.id=c.source_id
  where c.vehicle_id=v.id and s.enabled=true
  order by s.is_primary desc, c.recorded_at desc
  limit 1
) own on true
left join public.v2_vehicle_tracking_current movit on movit.vehicle_id=v.id
left join public.v2_vehicle_telemetry_current tel on tel.vehicle_id=v.id
left join lateral (
  select jsonb_build_object(
    'device_access_id', d.device_access_id,
    'team_id', d.team_id,
    'team_name', t.name,
    'latitude', d.latitude,
    'longitude', d.longitude,
    'accuracy_m', d.accuracy_m,
    'speed_kmh', d.speed_kmh,
    'heading_deg', d.heading_deg,
    'battery_percent', d.battery_percent,
    'charging', d.charging,
    'recorded_at', d.recorded_at,
    'updated_at', d.updated_at
  ) as phone_json
  from public.v2_device_location_current d
  join public.v2_teams t on t.id=d.team_id and t.company_id=v.company_id
  where case
    when (t.metadata->>'primary_vehicle_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then (t.metadata->>'primary_vehicle_id')::uuid=v.id
    else false
  end
  order by d.recorded_at desc
  limit 1
) phone on true
left join lateral (
  select count(*)::int as active_fault_count
  from public.v2_vehicle_faults f
  where f.vehicle_id=v.id and f.status='active'
) faults on true
left join lateral (
  select jsonb_build_object(
    'id', tr.id,
    'started_at', tr.started_at,
    'distance_km', tr.distance_km,
    'max_speed_kmh', tr.max_speed_kmh,
    'driving_seconds', tr.driving_seconds,
    'idle_seconds', tr.idle_seconds
  ) as trip_json
  from public.v2_vehicle_trips tr
  where tr.vehicle_id=v.id and tr.status='active'
  order by tr.started_at desc
  limit 1
) trip on true;

grant select on public.v2_tracking_central to authenticated;
