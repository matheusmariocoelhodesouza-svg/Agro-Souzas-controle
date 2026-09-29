delete from public.v2_vehicle_electrical_nodes n
using public.v2_vehicle_components c
where n.component_id=c.id
  and not exists (
    select 1 from public.v2_vehicle_electrical_links l
    where l.from_node_id=n.id or l.to_node_id=n.id
  )
  and c.name !~* '(sensor|atuador|alternador|motor de partida|bateria|fus[ií]vel|rel[eé]|\mecu\M|m[oó]dulo|chicote|conector|buzina|l[aâ]mpada|interruptor|comutador|solen[oó]ide|injetor|vela aquecedora|cabo b\+|cabo positivo|cabo negativo|aterramento|caixa de fus[ií]veis|porta-fus)';

update public.v2_vehicle_electrical_nodes n
set node_type=case
  when c.name ~* 'fus[ií]vel|porta-fus' then 'fuse'
  when c.name ~* 'rel[eé]' then 'relay'
  when c.name ~* '\mecu\M|m[oó]dulo' then 'module'
  when c.name ~* 'sensor' then 'sensor'
  when c.name ~* 'alternador|bateria|cabo b\+|cabo positivo' then 'power'
  when c.name ~* 'atuador|motor de partida|solen[oó]ide|injetor|buzina|l[aâ]mpada' then 'actuator'
  when c.name ~* 'conector|chicote' then 'connector'
  when c.name ~* 'cabo negativo|aterramento' then 'ground'
  else 'component'
end
from public.v2_vehicle_components c
where n.component_id=c.id;
