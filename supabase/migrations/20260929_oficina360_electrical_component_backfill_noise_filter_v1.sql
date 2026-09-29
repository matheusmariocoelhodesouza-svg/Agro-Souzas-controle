delete from public.v2_vehicle_electrical_nodes n
using public.v2_vehicle_components c
where n.component_id=c.id
  and not exists (
    select 1 from public.v2_vehicle_electrical_links l
    where l.from_node_id=n.id or l.to_node_id=n.id
  )
  and c.name ~* '^(ADHESIVE LABEL|BRACKET|BUTT JOINT|CAP[[:space:]]+—|CONTACT|DUST CAP|HEXAGON|FUSEBOX LABEL|FUSEBOX STICKER|STICKER|LABEL|SCREW|BOLT|NUT|WASHER|CLIP|SPRING|COVER|SEAL)';
