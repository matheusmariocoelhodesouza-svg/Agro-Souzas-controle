-- Oficina 360: fechamento da cobertura de vistas explodidas/estruturadas.
-- Objetivo: toda peça já vinculada às quatro conduções principais deve aparecer em ao menos uma vista.
-- IMPORTANTE: isto não transforma posição gerada em item EPC oficial e não promove fitment físico.

insert into public.v2_vehicle_exploded_views (
  group_code,chassis_family,chassis_variant,engine_code,assembly_code,title,subtitle,
  source_name,verification_status,notes,source_metadata
)
select * from (values
 ('body','W903','903.662','OM611.981','exterior_mirrors_903662','Sprinter 903.662 — Retrovisores externos e fixações','Vista estrutural complementar.','Oficina 360 / estrutura de navegação','estimated','Não substitui EPC oficial.',jsonb_build_object('seed','fleet_exploded_view_coverage_completion_v1','generated_catalog',true,'plate','EJW6A76')),
 ('engine_fuel','W903','903.662','OM611.981','common_rail_611981','OM611.981 — Rail common rail, sensor, regulador e conexões','Vista estrutural complementar.','Oficina 360 / estrutura de navegação','estimated','Não substitui EPC oficial.',jsonb_build_object('seed','fleet_exploded_view_coverage_completion_v1','generated_catalog',true,'plate','EJW6A76')),
 ('transmission','W903','903.662','OM611.981','clutch_mechanical_903662','Sprinter 903.662 — Embreagem mecânica, volante, garfo e rolamento','Vista estrutural complementar.','Oficina 360 / estrutura de navegação','estimated','Não substitui EPC oficial.',jsonb_build_object('seed','fleet_exploded_view_coverage_completion_v1','generated_catalog',true,'plate','EJW6A76')),
 ('steering','W903','903.662','OM611.981','steering_linkage_903662','Sprinter 903.662 — Barras, terminais e articulações de direção','Vista estrutural complementar.','Oficina 360 / estrutura de navegação','estimated','Não substitui EPC oficial.',jsonb_build_object('seed','fleet_exploded_view_coverage_completion_v1','generated_catalog',true,'plate','EJW6A76')),
 ('driveline','W903','903.662','OM611.981','rear_hub_bearing_903662','Sprinter 903.662 — Cubo/rolamento traseiro e vedações','Vista estrutural complementar.','Oficina 360 / estrutura de navegação','estimated','Não substitui EPC oficial.',jsonb_build_object('seed','fleet_exploded_view_coverage_completion_v1','generated_catalog',true,'plate','EJW6A76')),
 ('electrical','W903','903.662','OM611.981','door_electrical_903662','Sprinter 903.662 — Vidros elétricos, travas e atuadores das portas','Vista estrutural complementar.','Oficina 360 / estrutura de navegação','estimated','Não substitui EPC oficial.',jsonb_build_object('seed','fleet_exploded_view_coverage_completion_v1','generated_catalog',true,'plate','EJW6A76'))
) as x(group_code,chassis_family,chassis_variant,engine_code,assembly_code,title,subtitle,source_name,verification_status,notes,source_metadata)
where not exists (select 1 from public.v2_vehicle_exploded_views ev where ev.assembly_code=x.assembly_code);

-- Comil e Volare: encaixa os componentes adicionados depois do seed estrutural na vista do seu grupo.
with target_vehicle as (
  select id,plate from public.v2_vehicles where plate in ('CPI6C79','MBJ1166')
), missing as (
  select v.plate,c.id component_id,c.group_code,c.component_type,c.name
  from target_vehicle v
  join public.v2_vehicle_component_links l on l.vehicle_id=v.id
  join public.v2_vehicle_components c on c.id=l.component_id
  left join public.v2_vehicle_exploded_view_items evi on evi.component_id=c.id
  where evi.id is null
), ranked as (
  select m.*,row_number() over(partition by m.plate,m.group_code order by m.name,m.component_id) rn from missing m
)
insert into public.v2_vehicle_exploded_view_items(
  exploded_view_id,component_id,item_number,quantity,component_type,position_note,exactness_status,source_metadata
)
select ev.id,r.component_id,'ADD-'||lpad(r.rn::text,3,'0'),1,
       case when r.component_type in ('assembly','part','fastener','washer','nut','bolt','screw','stud','seal','o_ring','gasket','clip','spring','bearing','bushing','hose','pipe','connector','wire','sensor','actuator','consumable','other') then r.component_type else 'part' end,
       'Componente acrescentado no fechamento de cobertura; numeração ADD não é item EPC oficial.',
       'estimated',jsonb_build_object('seed','fleet_exploded_view_coverage_completion_v1','coverage_completion',true,'plate',r.plate,'official_item_number',false)
from ranked r
join public.v2_vehicle_exploded_views ev on ev.assembly_code=(r.plate||'-'||r.group_code||'-STRUCT-V1')
on conflict do nothing;

-- Sprinter: direciona os nós genéricos/top-level restantes para as vistas específicas já existentes.
with missing as (
  select c.id component_id,c.group_code,c.name,c.component_type
  from public.v2_vehicles v
  join public.v2_vehicle_component_links l on l.vehicle_id=v.id
  join public.v2_vehicle_components c on c.id=l.component_id
  left join public.v2_vehicle_exploded_view_items evi on evi.component_id=c.id
  where v.plate='EJW6A76' and evi.id is null
), mapped as (
  select m.*,
  case
    when group_code='body' and name ilike '%Dobradiças%' then 'rear_side_doors_903662'
    when group_code='body' and name ilike '%Fechaduras%' then 'front_door_closing_903662'
    when group_code='body' and (name ilike '%Grade dianteira%' or name ilike '%Para-choque dianteiro%') then 'bumper_fender_front_903662'
    when group_code='body' and name ilike '%Para-brisa%' then 'windows_wipers_903662'
    when group_code='body' and name ilike '%Retrovisores%' then 'exterior_mirrors_903662'
    when group_code='brakes' and (name ilike '%estacionamento%' or name ilike '%Sapatas%') then 'parking_brake_w903_late'
    when group_code='brakes' and name ilike '%Cilindro mestre%' then 'brake_master_903'
    when group_code='brakes' and (name ilike '%dianteir%' or name ilike '%desgaste%') then 'front_disc_brake_903662_late'
    when group_code='brakes' and name ilike '%traseir%' then 'rear_disc_brake_903662'
    when group_code='brakes' and (name ilike '%ABS%' or name ilike '%Sensor ABS%') then 'abs_hydraulic_unit_903'
    when group_code='brakes' and (name ilike '%Mangueiras%' or name ilike '%Servo-freio%') then 'brake_booster_lines_903662'
    when group_code='driveline' and (name ilike '%cardã%' or name ilike '%Cruzetas%' or name ilike '%Mancal central%') then 'propeller_shaft_903662'
    when group_code='driveline' and name ilike '%Diferencial%' then 'rear_axle_housing_903662'
    when group_code='driveline' and name ilike '%Retentores%' then 'rear_axle_shaft_903662'
    when group_code='driveline' and name ilike '%Rolamento/cubo traseiro%' then 'rear_hub_bearing_903662'
    when group_code='electrical' and (name ilike '%Alternador%' or name ilike '%Motor de partida%') then 'starter_alternator_611981'
    when group_code='electrical' and name ilike '%Bateria%' then 'battery_ground_903662'
    when group_code='electrical' and (name ilike '%lavador%' or name ilike '%limpador%') then 'windows_wipers_903662'
    when group_code='electrical' and (name ilike '%vidro elétrico%' or name ilike '%Travas elétricas%') then 'door_electrical_903662'
    when group_code='electrical' and (name ilike '%Faróis%' or name ilike '%Lanternas%') then 'lighting_903662'
    when group_code='electrical' and name ilike '%Chicote principal%' then 'engine_cable_harness_903662'
    when group_code='electrical' and name ilike '%ECU%' then 'engine_compartment_modules_903662'
    when group_code='electrical' and (name ilike '%velas aquecedoras%' or name ilike '%Sensor de fase%' or name ilike '%Sensor de rotação%') then 'engine_electrical_sensors_glow_611981'
    when group_code='electrical' and (name ilike '%fusíveis%' or name ilike '%relés%') then 'fusebox_instrument_903662'
    when group_code='electrical' and (name ilike '%Painel de instrumentos%' or name ilike '%Buzina%') then 'instrument_controls_903662'
    when group_code='engine' and name ilike '%Bomba de vácuo%' then 'vacuum_engine_connection_903662'
    when group_code='engine' and (name ilike '%Cabeçote%' or name ilike '%Junta do cabeçote%') then 'cylinder_head_block_611981'
    when group_code='engine' and (name ilike '%Correia de acessórios%' or name ilike '%Tensor e polias%') then 'accessory_drive_611981'
    when group_code='engine' and name ilike '%Coxins%' then 'engine_mounts_903662'
    when group_code='engine' and name ilike '%corrente de distribuição%' then 'timing_valvetrain_611981'
    when group_code='engine' and name ilike '%Tampa de válvulas%' then 'engine_cylinder_head_cover_611981'
    when group_code='engine_air' and (name ilike '%Caixa e dutos%' or name ilike '%Elemento do filtro%' or name ilike '%MAF%') then 'air_cleaner_903662'
    when group_code='engine_air' and name ilike '%Coletor de admissão%' then 'intake_manifold_611981'
    when group_code='engine_air' and (name ilike '%MAP%' or name ilike '%IAT%') then 'charge_air_903662'
    when group_code='engine_cooling' and (name ilike '%Bomba d’água%' or name ilike '%termostática%' or name ilike '%Sensor de temperatura%') then 'engine_cooling_water_pump_611981'
    when group_code='engine_cooling' and (name ilike '%viscosa%' or name ilike '%Hélice%' or name ilike '%Reservatório%') then 'cooling_fan_expansion_903662'
    when group_code='engine_cooling' and (name ilike '%Mangueiras%' or name ilike '%Radiador%') then 'radiator_diesel_903662'
    when group_code='engine_fuel' and name ilike '%Bomba de alta%' then 'injection_pump_system_611981'
    when group_code='engine_fuel' and name ilike '%Filtro de combustível%' then 'fuel_filter_lines_611981'
    when group_code='engine_fuel' and name ilike '%Injetor diesel%' then 'injector_lines_903662'
    when group_code='engine_fuel' and name ilike '%Linhas de combustível%' then 'fuel_filter_lines_611981'
    when group_code='engine_fuel' and (name ilike '%Pescador%' or name ilike '%Tanque de combustível%') then 'fuel_tank_903662'
    when group_code='engine_fuel' and (name ilike '%Rail de combustível%' or name ilike '%Sensor de pressão do rail%' or name ilike '%reguladora de pressão%') then 'common_rail_611981'
    when group_code='engine_lubrication' and name ilike '%Bomba de óleo%' then 'oil_pump_611981'
    when group_code='engine_lubrication' and (name ilike '%Filtro de óleo%' or name ilike '%Trocador de calor%') then 'oil_filter_cooler_611981'
    when group_code='engine_lubrication' and name ilike '%nível/temperatura%' then 'engine_oil_pan_611981'
    when group_code='engine_lubrication' and name ilike '%Separador/respiro%' then 'engine_cylinder_head_cover_611981'
    when group_code='engine_turbo' and (name ilike '%Turbocompressor%' or name ilike '%Atuador%') then 'turbocharger_611981'
    when group_code='engine_turbo' and (name ilike '%Intercooler%' or name ilike '%Mangueiras%') then 'charge_air_903662'
    when group_code='exhaust' then 'exhaust_system_903662'
    when group_code='hvac' and (name ilike '%Compressor%' or name ilike '%Condensador%' or name ilike '%Evaporador%' or name ilike '%secador%' or name ilike '%Pressostato%' or name ilike '%expansão%') then 'air_conditioning_903662'
    when group_code='hvac' then 'heating_ventilation_903662'
    when group_code='steering' and name ilike '%Coluna%' then 'steering_column_903662'
    when group_code='steering' and (name ilike '%Barra axial%' or name ilike '%Terminais%') then 'steering_linkage_903662'
    when group_code='steering' then 'steering_hydraulics_903662'
    when group_code='suspension' and (name ilike '%Amortecedor dianteiro%' or name ilike '%Bandeja%' or name ilike '%Pivô%' or name ilike '%Coxim/rolamento superior%') then 'front_knuckle_strut_control_arm_903662'
    when group_code='suspension' and name ilike '%Rolamento/cubo dianteiro%' then 'wheel_hubs_bearings_903662'
    when group_code='suspension' and (name ilike '%Bieletas%' or name ilike '%barra estabilizadora%') then 'front_axle_903662'
    when group_code='suspension' then 'rear_suspension_903662'
    when group_code='transmission' and name ilike '%Câmbio manual%' then 'manual_transmission_711620'
    when group_code='transmission' and (name ilike '%Cilindro escravo%' or name ilike '%Cilindro mestre%') then 'clutch_hydraulic_903662'
    when group_code='transmission' and name ilike '%Coxim do câmbio%' then 'engine_mounts_903662'
    when group_code='transmission' and (name ilike '%Garfo%' or name ilike '%Kit de embreagem%' or name ilike '%Rolamento de embreagem%' or name ilike '%Volante do motor%') then 'clutch_mechanical_903662'
    when group_code='transmission' and name ilike '%Trambulador%' then 'gearshift_711620'
    else null end assembly_code
  from missing m
), ranked as (
  select *,row_number() over(partition by assembly_code order by group_code,name,component_id) rn from mapped where assembly_code is not null
)
insert into public.v2_vehicle_exploded_view_items(
  exploded_view_id,component_id,item_number,quantity,component_type,position_note,exactness_status,source_metadata
)
select ev.id,r.component_id,'TOP-'||lpad(r.rn::text,3,'0'),1,
       case when r.component_type in ('assembly','part','fastener','washer','nut','bolt','screw','stud','seal','o_ring','gasket','clip','spring','bearing','bushing','hose','pipe','connector','wire','sensor','actuator','consumable','other') then r.component_type else 'assembly' end,
       'Nó principal do catálogo vinculado à vista mais específica disponível; número TOP não é item EPC oficial.',
       'estimated',jsonb_build_object('seed','fleet_exploded_view_coverage_completion_v1','coverage_completion',true,'plate','EJW6A76','official_item_number',false,'mapped_to_existing_epc_view',true)
from ranked r join public.v2_vehicle_exploded_views ev on ev.assembly_code=r.assembly_code
on conflict do nothing;

update public.v2_vehicle_exploded_views ev
set source_metadata=coalesce(ev.source_metadata,'{}'::jsonb)||jsonb_build_object('coverage_completion_v1',true),updated_at=now()
where exists (select 1 from public.v2_vehicle_exploded_view_items i where i.exploded_view_id=ev.id and i.source_metadata->>'seed'='fleet_exploded_view_coverage_completion_v1');
