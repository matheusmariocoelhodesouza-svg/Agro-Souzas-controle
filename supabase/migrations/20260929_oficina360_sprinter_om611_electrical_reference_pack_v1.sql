-- Oficina 360 — Sprinter W903 / OM611 electrical reference pack v1
-- Facts are stored as reference-level electrical data because the public pinout
-- matches chassis family + engine family, but the exact emission/equipment code
-- of the vehicle has not yet been confirmed from VIN build data.

with v as (
  select id, company_id
  from public.v2_vehicles
  where upper(plate) = 'EJW6A76'
  limit 1
)
insert into public.v2_vehicle_technical_sources (
  company_id, vehicle_id, source_key, source_type, title, publisher,
  publication_year, source_url, authority_level, applicability_status,
  access_status, verification_status, notes, source_metadata
)
select
  company_id, id,
  'sprinter_forum_om611981_a80_pinout',
  'electrical_pinout_reference',
  'CDI ECU A80 pinout — OM611.981 / OM611.987 — chassis family 901.6–904.6',
  'Sprinter-Forum technical community',
  2020,
  'https://www.sprinter-forum.de/viewtopic.php?t=21779',
  'community_technical_reference',
  'exact_engine_and_chassis_family_equipment_code_unconfirmed',
  'public_full',
  'reference_pending',
  'Public transcription of a vehicle-family wiring/pinout reference. Use as a diagnostic reference only until the exact equipment/emissions code is confirmed from VIN-specific Mercedes build data/WIS.',
  jsonb_build_object(
    'engine_code','OM611.981',
    'chassis_variant','903.662',
    'ecu_designation','A80',
    'applicable_engine_codes',jsonb_build_array('OM611.981','OM611.987'),
    'applicable_chassis_families',jsonb_build_array('901.6','902.6','903.6','904.6'),
    'required_equipment_code_any',jsonb_build_array('MD1','MF8','MS5'),
    'electrical_data_policy','reference_until_vin_build_code_confirmed'
  )
from v
on conflict (company_id, vehicle_id, source_key) do update set
  title=excluded.title,
  source_url=excluded.source_url,
  applicability_status=excluded.applicability_status,
  verification_status=excluded.verification_status,
  notes=excluded.notes,
  source_metadata=excluded.source_metadata,
  updated_at=now();

with v as (
  select id, company_id
  from public.v2_vehicles
  where upper(plate) = 'EJW6A76'
  limit 1
), src(source_key,title,notes,meta) as (values
  ('mercedes_xentry_wis_electrical',
   'Mercedes-Benz XENTRY WIS — electrical circuit diagrams',
   'Official Mercedes-Benz source for VIN-specific workshop information. VAN/older-model circuit information is supplied as PE electrical diagrams in XENTRY WIS.',
   jsonb_build_object('official',true,'usage','final_verification_source')),
  ('mercedes_pe42_30_d_2200a_abs',
   'Mercedes PE42.30-D-2200A — ABS/ASR wiring reference',
   'Document identifier applies to model families 901.6–905.6 with equipment code BB0. Do not apply pin-level data until BB0 is confirmed for this exact vehicle.',
   jsonb_build_object('document_id','PE42.30-D-2200A','system','ABS/ASR','requires_code','BB0','latin_america_reference_code','ZL3')),
  ('mercedes_pe82_10_d_2200c_turn_hazard',
   'Mercedes PE82.10-D-2200C — turn signal / hazard wiring reference',
   'Document identifier covers turn/hazard circuits in the 901.6–905.6 family. Latin-America version is identified with ZL3; exact vehicle option/configuration must be confirmed before pin-level use.',
   jsonb_build_object('document_id','PE82.10-D-2200C','system','turn_signal_hazard','regional_code_reference','ZL3')),
  ('mercedes_pe82_10_d_2300a_stop_lamp',
   'Mercedes PE82.10-D-2300A — stop lamp wiring reference',
   'Document identifier includes 901.6–904.6 with equipment code LB5. Use only after confirming the exact lighting equipment configuration.',
   jsonb_build_object('document_id','PE82.10-D-2300A','system','stop_lamp','requires_code','LB5','regional_code_reference','ZL3'))
)
insert into public.v2_vehicle_technical_sources (
  company_id, vehicle_id, source_key, source_type, title, publisher,
  source_url, authority_level, applicability_status, access_status,
  verification_status, notes, source_metadata
)
select
  v.company_id,v.id,src.source_key,'oem_wiring_reference',src.title,'Mercedes-Benz',
  'https://b2bconnect.mercedes-benz.com/pt/shop/workshop-solutions/xentry-wis',
  'manufacturer',
  case when src.source_key='mercedes_xentry_wis_electrical' then 'vin_specific_official_source'
       else 'model_family_option_code_gated' end,
  'authorized_network_or_account',
  case when src.source_key='mercedes_xentry_wis_electrical' then 'verified' else 'reference_pending' end,
  src.notes,src.meta
from v cross join src
on conflict (company_id, vehicle_id, source_key) do update set
  title=excluded.title,
  source_url=excluded.source_url,
  applicability_status=excluded.applicability_status,
  verification_status=excluded.verification_status,
  notes=excluded.notes,
  source_metadata=excluded.source_metadata,
  updated_at=now();

-- Add functional electrical nodes that are referenced by the OM611.981 pinout
-- but are not normal spare-parts catalog entries.
with v as (
  select id, company_id from public.v2_vehicles where upper(plate)='EJW6A76' limit 1
), nodes(reference,label,node_type,circuit_code,system_code,location_description) as (values
  ('W4','W4 — ponto de aterramento firewall','ground','power_ground','engine_electrical','Firewall / parede corta-fogo'),
  ('A12K3','A12k3 — relé eletrônica do motor ME/CDI','relay','ecu_power','engine_electrical','Central elétrica A12'),
  ('J421','J421 — barramento CAN Low','bus','can_network','network','Chicote / emenda CAN'),
  ('J422','J422 — barramento CAN High','bus','can_network','network','Chicote / emenda CAN'),
  ('J18','J18 — terminal 15 protegido','power','ecu_power','engine_electrical','Alimentação pós-chave protegida'),
  ('K61','K61 — relé do motor de partida','relay','starting','starting_charging','Circuito de partida'),
  ('J352','J352 — terminal 50 / comando de partida','power','starting','starting_charging','Circuito de partida'),
  ('P11','P11 — tomada de diagnóstico 14 pinos','connector','diagnostic','network','Tomada de diagnóstico'),
  ('K214','K214 — relé da bomba de combustível','relay','engine_fuel','fuel_system','Circuito de alimentação de combustível')
)
insert into public.v2_vehicle_electrical_nodes (
  company_id,vehicle_id,circuit_code,system_code,node_type,label,reference,
  location_description,pins,electrical_spec,test_procedure,source_metadata,verification_status
)
select
  v.company_id,v.id,n.circuit_code,n.system_code,n.node_type,n.label,n.reference,
  n.location_description,'[]'::jsonb,'{}'::jsonb,'{}'::jsonb,
  jsonb_build_object(
    'source_name','OM611.981 A80 public pinout reference',
    'url','https://www.sprinter-forum.de/viewtopic.php?t=21779',
    'wiring_status','reference',
    'requires_final_vin_wis_confirmation',true
  ),
  'reference'
from v cross join nodes n
where not exists (
  select 1 from public.v2_vehicle_electrical_nodes e
  where e.vehicle_id=v.id and e.reference=n.reference
);

-- Create electrical nodes for catalog components that were linked to the vehicle
-- but were not captured by the generic electrical backfill.
with v as (
  select id,company_id from public.v2_vehicles where upper(plate)='EJW6A76' limit 1
), wanted(name,node_type,connector_name,circuit_code) as (values
  ('Sensor de massa de ar (MAF)','sensor','B101','engine_air'),
  ('Válvula reguladora de pressão do rail','actuator','Y92','engine_fuel')
)
insert into public.v2_vehicle_electrical_nodes (
  company_id,vehicle_id,component_id,circuit_code,system_code,node_type,label,
  reference,location_description,connector_name,pins,electrical_spec,test_procedure,
  source_metadata,verification_status
)
select
  v.company_id,v.id,c.id,w.circuit_code,w.circuit_code,w.node_type,c.name,
  c.oem_part_number,c.location_description,w.connector_name,'[]'::jsonb,
  coalesce(c.connector_spec,'{}'::jsonb),'{}'::jsonb,
  jsonb_build_object('source_name','OM611.981 A80 public pinout reference','url','https://www.sprinter-forum.de/viewtopic.php?t=21779','wiring_status','reference','requires_final_vin_wis_confirmation',true),
  'reference'
from v
join public.v2_vehicle_component_links l on l.vehicle_id=v.id
join public.v2_vehicle_components c on c.id=l.component_id
join wanted w on w.name=c.name
where not exists (
  select 1 from public.v2_vehicle_electrical_nodes e
  where e.vehicle_id=v.id and e.component_id=c.id
);

-- Enrich connector identification and pin assignments.
with v as (select id from public.v2_vehicles where upper(plate)='EJW6A76' limit 1)
update public.v2_vehicle_electrical_nodes n set
  connector_name='A80',
  electrical_spec=coalesce(n.electrical_spec,'{}'::jsonb) || jsonb_build_object('ecu_designation','A80','engine_code_reference','OM611.981'),
  source_metadata=coalesce(n.source_metadata,'{}'::jsonb) || jsonb_build_object('source_name','OM611.981 A80 public pinout reference','url','https://www.sprinter-forum.de/viewtopic.php?t=21779','wiring_status','reference','requires_final_vin_wis_confirmation',true),
  verification_status='reference',updated_at=now()
from v where n.vehicle_id=v.id and n.label='ECU do motor CDI';

with v as (select id from public.v2_vehicles where upper(plate)='EJW6A76' limit 1)
update public.v2_vehicle_electrical_nodes n set
  connector_name='B112',
  pins=jsonb_build_array(
    jsonb_build_object('pin','1','function','sensor supply minus','wire_color','marrom/branco','ecu_pin','A80 C3/22','status','reference'),
    jsonb_build_object('pin','2','function','pressure signal','wire_color','branco/verde','ecu_pin','A80 C3/6','status','reference'),
    jsonb_build_object('pin','3','function','sensor supply plus','wire_color','branco/vermelho','ecu_pin','A80 C3/17','status','reference')
  ),
  source_metadata=coalesce(n.source_metadata,'{}'::jsonb) || jsonb_build_object('source_name','OM611.981 A80 public pinout reference','url','https://www.sprinter-forum.de/viewtopic.php?t=21779','wiring_status','reference','requires_final_vin_wis_confirmation',true),
  verification_status='reference',updated_at=now()
from v where n.vehicle_id=v.id and n.label='Sensor de pressão de admissão / MAP';

with v as (select id from public.v2_vehicles where upper(plate)='EJW6A76' limit 1)
update public.v2_vehicle_electrical_nodes n set
  connector_name='G14',
  pins=jsonb_build_array(
    jsonb_build_object('pin','1','function','sensor circuit','wire_color','marrom/verde','ecu_pin','A80 C3/1','status','reference'),
    jsonb_build_object('pin','2','function','sensor circuit','wire_color','verde/branco','ecu_pin','A80 C3/12','status','reference')
  ),
  source_metadata=coalesce(n.source_metadata,'{}'::jsonb) || jsonb_build_object('source_name','OM611.981 A80 public pinout reference','url','https://www.sprinter-forum.de/viewtopic.php?t=21779','wiring_status','reference','requires_final_vin_wis_confirmation',true),
  verification_status='reference',updated_at=now()
from v where n.vehicle_id=v.id and n.label='Sensor de temperatura do ar de admissão (IAT)';

with v as (select id from public.v2_vehicles where upper(plate)='EJW6A76' limit 1)
update public.v2_vehicle_electrical_nodes n set
  connector_name='B113',
  pins=jsonb_build_array(
    jsonb_build_object('pin','1','function','sensor supply minus','wire_color','marrom/amarelo','ecu_pin','A80 C4/4','status','reference'),
    jsonb_build_object('pin','2','function','rail pressure signal','wire_color','verde/violeta','ecu_pin','A80 C4/14','status','reference'),
    jsonb_build_object('pin','3','function','sensor supply plus','wire_color','vermelho/verde','ecu_pin','A80 C4/13','status','reference')
  ),
  source_metadata=coalesce(n.source_metadata,'{}'::jsonb) || jsonb_build_object('source_name','OM611.981 A80 public pinout reference','url','https://www.sprinter-forum.de/viewtopic.php?t=21779','wiring_status','reference','requires_final_vin_wis_confirmation',true),
  verification_status='reference',updated_at=now()
from v where n.vehicle_id=v.id and n.label='Sensor de pressão do rail';

with v as (select id from public.v2_vehicles where upper(plate)='EJW6A76' limit 1)
update public.v2_vehicle_electrical_nodes n set
  connector_name='Y92',
  pins=jsonb_build_array(
    jsonb_build_object('pin','1','function','rail pressure control circuit','wire_color','preto/branco','ecu_pin','A80 C4/21','status','reference'),
    jsonb_build_object('pin','2','function','rail pressure control circuit','wire_color','vermelho/branco','ecu_pin','A80 C4/31','status','reference')
  ),
  source_metadata=coalesce(n.source_metadata,'{}'::jsonb) || jsonb_build_object('source_name','OM611.981 A80 public pinout reference','url','https://www.sprinter-forum.de/viewtopic.php?t=21779','wiring_status','reference','requires_final_vin_wis_confirmation',true),
  verification_status='reference',updated_at=now()
from v where n.vehicle_id=v.id and n.label='Válvula reguladora de pressão do rail';

with v as (select id from public.v2_vehicles where upper(plate)='EJW6A76' limit 1)
update public.v2_vehicle_electrical_nodes n set
  connector_name='B108',
  pins=jsonb_build_array(
    jsonb_build_object('pin','1','function','sensor supply minus','wire_color','marrom/verde','ecu_pin','A80 C4/2','status','reference'),
    jsonb_build_object('pin','2','function','cam signal','wire_color','amarelo/cinza','ecu_pin','A80 C4/3','status','reference'),
    jsonb_build_object('pin','3','function','sensor supply plus','wire_color','vermelho/azul','ecu_pin','A80 C4/12','status','reference')
  ),
  source_metadata=coalesce(n.source_metadata,'{}'::jsonb) || jsonb_build_object('source_name','OM611.981 A80 public pinout reference','url','https://www.sprinter-forum.de/viewtopic.php?t=21779','wiring_status','reference','requires_final_vin_wis_confirmation',true),
  verification_status='reference',updated_at=now()
from v where n.vehicle_id=v.id and n.label='Sensor de fase do comando';

with v as (select id from public.v2_vehicles where upper(plate)='EJW6A76' limit 1)
update public.v2_vehicle_electrical_nodes n set
  connector_name='B73',
  pins=jsonb_build_array(
    jsonb_build_object('pin','1','function','crank sensor circuit','wire_color','verde','ecu_pin','A80 C4/26','status','reference'),
    jsonb_build_object('pin','2','function','crank sensor circuit','wire_color','verde/branco','ecu_pin','A80 C4/37','status','reference')
  ),
  source_metadata=coalesce(n.source_metadata,'{}'::jsonb) || jsonb_build_object('source_name','OM611.981 A80 public pinout reference','url','https://www.sprinter-forum.de/viewtopic.php?t=21779','wiring_status','reference','requires_final_vin_wis_confirmation',true),
  verification_status='reference',updated_at=now()
from v where n.vehicle_id=v.id and n.label='Sensor de rotação do virabrequim';

with v as (select id from public.v2_vehicles where upper(plate)='EJW6A76' limit 1)
update public.v2_vehicle_electrical_nodes n set
  connector_name='B16',
  pins=jsonb_build_array(
    jsonb_build_object('pin','1','function','coolant temperature sensor circuit','wire_color','marrom/branco','ecu_pin','A80 C4/27','status','reference'),
    jsonb_build_object('pin','2','function','coolant temperature sensor circuit','wire_color','verde/vermelho','ecu_pin','A80 C4/36','status','reference')
  ),
  source_metadata=coalesce(n.source_metadata,'{}'::jsonb) || jsonb_build_object('source_name','OM611.981 A80 public pinout reference','url','https://www.sprinter-forum.de/viewtopic.php?t=21779','wiring_status','reference','requires_final_vin_wis_confirmation',true),
  verification_status='reference',updated_at=now()
from v where n.vehicle_id=v.id and n.label='Sensor de temperatura do líquido de arrefecimento';

with v as (select id from public.v2_vehicles where upper(plate)='EJW6A76' limit 1)
update public.v2_vehicle_electrical_nodes n set
  connector_name='Y87',
  pins=jsonb_build_array(
    jsonb_build_object('pin','1','function','boost control pressure transducer circuit','wire_color','branco','ecu_pin','A80 C3/48','status','reference'),
    jsonb_build_object('pin','2','function','boost control pressure transducer circuit','wire_color','marrom','ecu_pin','A80 C3/35','status','reference')
  ),
  source_metadata=coalesce(n.source_metadata,'{}'::jsonb) || jsonb_build_object('source_name','OM611.981 A80 public pinout reference','url','https://www.sprinter-forum.de/viewtopic.php?t=21779','wiring_status','reference','requires_final_vin_wis_confirmation',true),
  verification_status='reference',updated_at=now()
from v where n.vehicle_id=v.id and n.label='Atuador/controle do turbo';

with v as (select id from public.v2_vehicles where upper(plate)='EJW6A76' limit 1)
update public.v2_vehicle_electrical_nodes n set
  connector_name='B101',
  pins=jsonb_build_array(
    jsonb_build_object('pin','2','function','MAF circuit','wire_color','amarelo/vermelho','ecu_pin','A80 C3/33','status','reference'),
    jsonb_build_object('pin','3','function','MAF circuit','wire_color','marrom/amarelo','ecu_pin','A80 C3/7','status','reference'),
    jsonb_build_object('pin','4','function','MAF circuit','wire_color','marrom/preto','ecu_pin','A80 C3/19','status','reference'),
    jsonb_build_object('pin','5','function','MAF circuit','wire_color','amarelo/verde','ecu_pin','A80 C3/18','status','reference')
  ),
  source_metadata=coalesce(n.source_metadata,'{}'::jsonb) || jsonb_build_object('source_name','OM611.981 A80 public pinout reference','url','https://www.sprinter-forum.de/viewtopic.php?t=21779','wiring_status','reference','requires_final_vin_wis_confirmation',true),
  verification_status='reference',updated_at=now()
from v where n.vehicle_id=v.id and n.label='Sensor de massa de ar (MAF)';

-- Store real point-to-point relationships from the OM611.981 A80 public reference.
with v as (
  select id,company_id from public.v2_vehicles where upper(plate)='EJW6A76' limit 1
), pairs(circuit_code,from_label,to_label,from_pin,to_pin,wire_color,wire_code,signal_type,direction) as (values
  ('engine_air','Sensor de pressão de admissão / MAP','ECU do motor CDI','2','C3/6','branco/verde','wsgn','sensor_signal','sensor_to_ecu'),
  ('engine_air','Sensor de pressão de admissão / MAP','ECU do motor CDI','3','C3/17','branco/vermelho','wsrt','sensor_supply_plus','ecu_to_sensor'),
  ('engine_air','Sensor de pressão de admissão / MAP','ECU do motor CDI','1','C3/22','marrom/branco','brws','sensor_supply_minus','ecu_to_sensor'),
  ('engine_air','Sensor de temperatura do ar de admissão (IAT)','ECU do motor CDI','1','C3/1','marrom/verde','brgn','sensor_circuit','bidirectional_reference'),
  ('engine_air','Sensor de temperatura do ar de admissão (IAT)','ECU do motor CDI','2','C3/12','verde/branco','gnws','sensor_circuit','bidirectional_reference'),
  ('engine_air','Sensor de massa de ar (MAF)','ECU do motor CDI','3','C3/7','marrom/amarelo','brge','maf_circuit','bidirectional_reference'),
  ('engine_air','Sensor de massa de ar (MAF)','ECU do motor CDI','5','C3/18','amarelo/verde','gegn','maf_circuit','bidirectional_reference'),
  ('engine_air','Sensor de massa de ar (MAF)','ECU do motor CDI','4','C3/19','marrom/preto','brsw','maf_circuit','bidirectional_reference'),
  ('engine_air','Sensor de massa de ar (MAF)','ECU do motor CDI','2','C3/33','amarelo/vermelho','gert','maf_circuit','bidirectional_reference'),
  ('engine_turbo','Atuador/controle do turbo','ECU do motor CDI','2','C3/35','marrom','br','boost_control','ecu_controlled'),
  ('engine_turbo','Atuador/controle do turbo','ECU do motor CDI','1','C3/48','branco','ws','boost_control','ecu_controlled'),
  ('engine_fuel','Sensor de pressão do rail','ECU do motor CDI','1','C4/4','marrom/amarelo','brge','sensor_supply_minus','ecu_to_sensor'),
  ('engine_fuel','Sensor de pressão do rail','ECU do motor CDI','3','C4/13','vermelho/verde','rtgn','sensor_supply_plus','ecu_to_sensor'),
  ('engine_fuel','Sensor de pressão do rail','ECU do motor CDI','2','C4/14','verde/violeta','gnvi','sensor_signal','sensor_to_ecu'),
  ('engine_fuel','Válvula reguladora de pressão do rail','ECU do motor CDI','1','C4/21','preto/branco','swws','rail_pressure_control','ecu_controlled'),
  ('engine_fuel','Válvula reguladora de pressão do rail','ECU do motor CDI','2','C4/31','vermelho/branco','rtws','rail_pressure_control','ecu_controlled'),
  ('engine_cooling','Sensor de temperatura do líquido de arrefecimento','ECU do motor CDI','1','C4/27','marrom/branco','brws','temperature_sensor_circuit','bidirectional_reference'),
  ('engine_cooling','Sensor de temperatura do líquido de arrefecimento','ECU do motor CDI','2','C4/36','verde/vermelho','gnrt','temperature_sensor_circuit','bidirectional_reference'),
  ('engine_timing','Sensor de fase do comando','ECU do motor CDI','1','C4/2','marrom/verde','brgn','sensor_supply_minus','ecu_to_sensor'),
  ('engine_timing','Sensor de fase do comando','ECU do motor CDI','2','C4/3','amarelo/cinza','gegr','cam_signal','sensor_to_ecu'),
  ('engine_timing','Sensor de fase do comando','ECU do motor CDI','3','C4/12','vermelho/azul','rtbl','sensor_supply_plus','ecu_to_sensor'),
  ('engine_timing','Sensor de rotação do virabrequim','ECU do motor CDI','1','C4/26','verde','gn','crank_sensor_circuit','sensor_to_ecu'),
  ('engine_timing','Sensor de rotação do virabrequim','ECU do motor CDI','2','C4/37','verde/branco','gnws','crank_sensor_circuit','sensor_to_ecu'),
  ('starting','K61 — relé do motor de partida','ECU do motor CDI','2','C3/30','vermelho/azul','rtbl','starter_relay_coil','ecu_controlled'),
  ('starting','K61 — relé do motor de partida','ECU do motor CDI','4','C3/43','violeta/verde','vign','starter_relay_coil','ecu_controlled'),
  ('starting','J352 — terminal 50 / comando de partida','ECU do motor CDI',null,'C3/20','violeta','vi','terminal_50','input_to_ecu'),
  ('can_network','J422 — barramento CAN High','ECU do motor CDI',null,'C2/11','verde/branco','gnws','can_high','network'),
  ('can_network','J421 — barramento CAN Low','ECU do motor CDI',null,'C2/12','verde','gn','can_low','network'),
  ('ecu_power','J18 — terminal 15 protegido','ECU do motor CDI',null,'C2/13','preto','sw','terminal_15_fused','power_to_ecu'),
  ('power_ground','W4 — ponto de aterramento firewall','ECU do motor CDI',null,'C1/4','marrom','br','ground','ground_to_ecu'),
  ('power_ground','W4 — ponto de aterramento firewall','ECU do motor CDI',null,'C1/5','marrom','br','ground','ground_to_ecu'),
  ('power_ground','W4 — ponto de aterramento firewall','ECU do motor CDI',null,'C1/6','marrom','br','ground','ground_to_ecu'),
  ('ecu_power','A12k3 — relé eletrônica do motor ME/CDI','ECU do motor CDI',null,'C1/7','preto/azul','swbl','terminal_30_via_engine_relay','power_to_ecu'),
  ('ecu_power','A12k3 — relé eletrônica do motor ME/CDI','ECU do motor CDI',null,'C1/8','preto/azul','swbl','terminal_30_via_engine_relay','power_to_ecu'),
  ('diagnostic','P11 — tomada de diagnóstico 14 pinos','ECU do motor CDI','14','C3/28','azul/branco','blws','diagnostic_line','diagnostic')
), resolved as (
  select v.company_id,v.id as vehicle_id,p.*,
         fn.id as from_node_id,tn.id as to_node_id
  from v cross join pairs p
  join public.v2_vehicle_electrical_nodes fn on fn.vehicle_id=v.id and fn.label=p.from_label
  join public.v2_vehicle_electrical_nodes tn on tn.vehicle_id=v.id and tn.label=p.to_label
)
insert into public.v2_vehicle_electrical_links (
  company_id,vehicle_id,circuit_code,from_node_id,to_node_id,from_pin,to_pin,
  wire_code,wire_color,signal_type,direction,expected_values,test_method,
  source_metadata,verification_status
)
select
  r.company_id,r.vehicle_id,r.circuit_code,r.from_node_id,r.to_node_id,r.from_pin,r.to_pin,
  r.wire_code,r.wire_color,r.signal_type,r.direction,'{}'::jsonb,
  jsonb_build_object('policy','measurement_values_require_verified_manual_or_physical_test'),
  jsonb_build_object(
    'source_name','OM611.981 A80 public pinout reference',
    'url','https://www.sprinter-forum.de/viewtopic.php?t=21779',
    'applicability','OM611.981/987 + 901.6/902.6/903.6/904.6; equipment code MD1/MF8/MS5',
    'final_verification_source','Mercedes-Benz XENTRY WIS PE diagram',
    'requires_final_vin_wis_confirmation',true
  ),
  'reference'
from resolved r
where not exists (
  select 1 from public.v2_vehicle_electrical_links e
  where e.vehicle_id=r.vehicle_id
    and e.from_node_id=r.from_node_id
    and e.to_node_id=r.to_node_id
    and coalesce(e.from_pin,'')=coalesce(r.from_pin,'')
    and coalesce(e.to_pin,'')=coalesce(r.to_pin,'')
);

-- Attach option-gated OEM diagram identifiers to systems we are not yet allowed
-- to treat as exact-vehicle wiring.
with v as (select id from public.v2_vehicles where upper(plate)='EJW6A76' limit 1)
update public.v2_vehicle_electrical_nodes n set
  source_metadata=coalesce(n.source_metadata,'{}'::jsonb) || jsonb_build_object(
    'source_name','Mercedes-Benz PE42.30-D-2200A ABS/ASR diagram reference',
    'url','https://b2bconnect.mercedes-benz.com/pt/shop/workshop-solutions/xentry-wis',
    'document_id','PE42.30-D-2200A',
    'requires_equipment_code','BB0',
    'pinout_locked_until_option_confirmed',true
  ),
  updated_at=now()
from v
where n.vehicle_id=v.id and n.label='Sensor ABS de roda';

with v as (select id from public.v2_vehicles where upper(plate)='EJW6A76' limit 1)
update public.v2_vehicle_electrical_nodes n set
  source_metadata=coalesce(n.source_metadata,'{}'::jsonb) || jsonb_build_object(
    'source_name','Mercedes-Benz lighting PE reference — verify configuration in XENTRY WIS',
    'url','https://b2bconnect.mercedes-benz.com/pt/shop/workshop-solutions/xentry-wis',
    'turn_hazard_document_id','PE82.10-D-2200C',
    'stop_lamp_document_id','PE82.10-D-2300A',
    'regional_code_reference','ZL3',
    'pinout_locked_until_option_confirmed',true
  ),
  updated_at=now()
from v
where n.vehicle_id=v.id and n.label in ('Interruptor de luz de freio','Interruptor de faróis','Interruptor de pisca-alerta','Lâmpada da seta dianteira','Lâmpada de farol baixo/alto');
