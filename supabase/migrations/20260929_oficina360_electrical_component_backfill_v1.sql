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
    when c.name ~* 'fus[ií]vel|porta-fus' then 'fuse'
    when c.name ~* 'rel[eé]' then 'relay'
    when c.name ~* '\mecu\M|m[oó]dulo' then 'module'
    when c.name ~* 'sensor' then 'sensor'
    when c.name ~* 'alternador|bateria|cabo b\+|cabo positivo' then 'power'
    when c.name ~* 'atuador|motor de partida|solen[oó]ide|injetor|buzina|l[aâ]mpada' then 'actuator'
    when c.name ~* 'conector|chicote' then 'connector'
    when c.name ~* 'cabo negativo|aterramento' then 'ground'
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
where c.name ~* '(sensor|atuador|alternador|motor de partida|bateria|fus[ií]vel|rel[eé]|\mecu\M|m[oó]dulo|chicote|conector|buzina|l[aâ]mpada|interruptor|comutador|solen[oó]ide|injetor|vela aquecedora|cabo b\+|cabo positivo|cabo negativo|aterramento|caixa de fus[ií]veis|porta-fus)'
on conflict (vehicle_id, component_id) where component_id is not null do nothing;
