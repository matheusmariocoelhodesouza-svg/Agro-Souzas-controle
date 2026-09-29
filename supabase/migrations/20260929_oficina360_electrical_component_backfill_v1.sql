create unique index if not exists ux_v2_electrical_nodes_vehicle_component
on public.v2_vehicle_electrical_nodes(vehicle_id, component_id)
where component_id is not null;

insert into public.v2_vehicle_electrical_nodes (
  company_id, vehicle_id, component_id, circuit_code, system_code, node_type,
  label, reference, location_description, electrical_spec, source_metadata,
  verification_status
)
select
  l.company_id,
  l.vehicle_id,
  c.id,
  coalesce(c.group_code, 'electrical'),
  coalesce(c.group_code, 'electrical'),
  case
    when lower(c.name) like '%sensor%' then 'sensor'
    when lower(c.name) like '%atuador%' or lower(c.name) like '%válvula%' or lower(c.name) like '%valvula%' or lower(c.name) like '%motor de partida%' then 'actuator'
    when lower(c.name) like '%alternador%' then 'power'
    else 'component'
  end,
  c.name,
  c.oem_part_number,
  c.location_description,
  coalesce(c.connector_spec, '{}'::jsonb),
  coalesce(c.source_metadata, '{}'::jsonb),
  case
    when c.data_status='verified' and l.fitment_status='verified' then 'verified'
    when c.data_status='verified' then 'reference'
    else 'estimated'
  end
from public.v2_vehicle_component_links l
join public.v2_vehicle_components c on c.id=l.component_id
where (c.connector_spec is not null and c.connector_spec <> '{}'::jsonb)
   or c.group_code='electrical'
on conflict (vehicle_id, component_id) where component_id is not null do nothing;
