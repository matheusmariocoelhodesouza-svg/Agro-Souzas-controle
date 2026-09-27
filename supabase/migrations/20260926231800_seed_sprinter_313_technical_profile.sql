-- Seed técnico da Sprinter 313 CDI cadastrada no Comando 360.
-- Os identificadores abaixo vieram do CRLV conferido manualmente pelo proprietário.
-- Códigos OEM de peças não são preenchidos aqui sem validação em EPC/catálogo confiável.

insert into public.v2_vehicle_technical_profiles (
  company_id, vehicle_id, vin, chassis_family, chassis_variant,
  engine_family, engine_code, engine_serial,
  production_year, model_year, power_cv, fuel_type,
  gross_vehicle_weight_t, gross_combination_weight_t,
  axle_count, seats, body_type, source, source_metadata
)
select
  v.company_id,
  v.id,
  '8AC903662BE040910',
  'W903',
  '903.662',
  'OM611',
  'OM611.981',
  '61198170114097',
  2010,
  2011,
  129,
  'diesel',
  3.55,
  5.0,
  2,
  16,
  'passageiro_microonibus',
  'crlv',
  jsonb_build_object(
    'vehicle_version', 'I/M.BENZ 313 CDI FFBM 28',
    'verified_from_crlv', true,
    'verified_at', now()
  )
from public.v2_vehicles v
where upper(replace(coalesce(v.plate,''),'-','')) = 'EJW6A76'
on conflict (company_id, vehicle_id) do update set
  vin = excluded.vin,
  chassis_family = excluded.chassis_family,
  chassis_variant = excluded.chassis_variant,
  engine_family = excluded.engine_family,
  engine_code = excluded.engine_code,
  engine_serial = excluded.engine_serial,
  production_year = excluded.production_year,
  model_year = excluded.model_year,
  power_cv = excluded.power_cv,
  fuel_type = excluded.fuel_type,
  gross_vehicle_weight_t = excluded.gross_vehicle_weight_t,
  gross_combination_weight_t = excluded.gross_combination_weight_t,
  axle_count = excluded.axle_count,
  seats = excluded.seats,
  body_type = excluded.body_type,
  source = excluded.source,
  source_metadata = excluded.source_metadata,
  updated_at = now();

-- Primeira árvore técnica: componentes de diagnóstico e manutenção do OM611/W903.
-- Mantidos como reference_pending até que a aplicação e o código OEM sejam confirmados.
with seed(group_code, name, generic_name, location_description, function_description) as (
  values
    ('engine_air','Sensor de massa de ar (MAF)','medidor de massa de ar','Linha de admissão antes do coletor','Mede a massa de ar admitida para cálculo de injeção e controle de carga'),
    ('engine_air','Sensor de temperatura do ar de admissão (IAT)','sensor de temperatura do ar','Sistema de admissão','Informa a temperatura do ar admitido à ECU'),
    ('engine_air','Sensor de pressão de admissão / MAP','sensor MAP','Coletor/circuito pressurizado de admissão','Mede a pressão de sobrealimentação usada no controle do turbo'),
    ('engine_air','Coletor de admissão','coletor de admissão','Lado de admissão do motor','Distribui o ar de admissão aos cilindros'),
    ('engine_turbo','Turbocompressor','turbo','Escape/admissão do motor','Eleva a pressão do ar admitido'),
    ('engine_turbo','Atuador/controle do turbo','controle de pressão do turbo','Conjunto do turbocompressor','Controla a pressão de sobrealimentação'),
    ('engine_turbo','Intercooler','resfriador do ar de carga','Frente do veículo, circuito entre turbo e admissão','Reduz a temperatura do ar comprimido'),
    ('engine_turbo','Mangueiras do intercooler e pressurização','mangueira de pressurização','Entre turbo, intercooler e coletor','Transporta o ar pressurizado; vazamentos causam perda de potência'),
    ('engine_fuel','Bomba de alta pressão','bomba common rail','Motor, sistema de combustível','Gera a alta pressão do sistema common rail'),
    ('engine_fuel','Rail de combustível','flauta common rail','Cabeçote/lado do sistema de injeção','Acumula e distribui combustível em alta pressão'),
    ('engine_fuel','Sensor de pressão do rail','sensor de pressão de combustível','Rail de combustível','Mede a pressão real do rail'),
    ('engine_fuel','Válvula reguladora de pressão do rail','regulador de pressão de combustível','Sistema common rail','Controla a pressão de combustível do sistema'),
    ('engine_fuel','Injetor diesel','bico injetor common rail','Cabeçote, um por cilindro','Doseia combustível em alta pressão'),
    ('engine_fuel','Filtro de combustível','filtro diesel','Linha de alimentação de combustível','Retém contaminantes antes do sistema de alta pressão'),
    ('engine_cooling','Sensor de temperatura do líquido de arrefecimento','sensor ECT','Circuito de arrefecimento do motor','Informa a temperatura do motor à ECU'),
    ('engine_cooling','Válvula termostática','termostato','Circuito de arrefecimento','Controla o fluxo do líquido conforme a temperatura'),
    ('engine_cooling','Bomba d’água','bomba de arrefecimento','Frente/lateral do motor','Circula o líquido de arrefecimento'),
    ('engine_lubrication','Separador/respiro do cárter','antichama/respiro','Parte superior do motor','Separa óleo dos gases do cárter e conduz os vapores à admissão'),
    ('exhaust','Válvula EGR','recirculação de gases','Entre escape e admissão','Recircula parte dos gases de escape para controle de emissões'),
    ('electrical','Sensor de rotação do virabrequim','CKP','Próximo ao virabrequim/volante','Fornece rotação e referência de posição do motor'),
    ('electrical','Sensor de fase do comando','CMP','Cabeçote/comando de válvulas','Informa a fase do comando à ECU'),
    ('electrical','Alternador','alternador','Acessórios do motor','Gera energia elétrica e recarrega a bateria'),
    ('electrical','Motor de partida','motor de arranque','Campana do motor/câmbio','Aciona o motor durante a partida')
)
insert into public.v2_vehicle_components (
  group_code, name, generic_name, oem_brand,
  location_description, function_description,
  data_status, source_metadata
)
select
  s.group_code, s.name, s.generic_name, 'Mercedes-Benz',
  s.location_description, s.function_description,
  'reference_pending',
  jsonb_build_object('seed','sprinter_w903_om611','oem_code_verified',false)
from seed s
where not exists (
  select 1 from public.v2_vehicle_components c
  where c.group_code=s.group_code and c.name=s.name and coalesce(c.oem_brand,'')='Mercedes-Benz'
);

insert into public.v2_vehicle_component_applications (
  component_id, chassis_family, chassis_variant, engine_family, engine_code,
  model_year_from, model_year_to, notes, fitment_status, source_metadata
)
select
  c.id, 'W903', '903.662', 'OM611', 'OM611.981',
  2010, 2011,
  'Aplicação inicial baseada na identificação técnica do veículo; código OEM ainda requer validação por VIN/EPC.',
  'candidate',
  jsonb_build_object('vehicle_plate_reference','EJW6A76','oem_code_verified',false)
from public.v2_vehicle_components c
where c.source_metadata->>'seed'='sprinter_w903_om611'
  and not exists (
    select 1 from public.v2_vehicle_component_applications a
    where a.component_id=c.id and a.chassis_variant='903.662' and a.engine_code='OM611.981'
  );

insert into public.v2_vehicle_component_links (
  company_id, vehicle_id, component_id, fitment_status, notes
)
select
  v.company_id, v.id, c.id, 'candidate',
  'Vinculado ao perfil técnico da Sprinter; confirmar referência OEM antes da compra.'
from public.v2_vehicles v
join public.v2_vehicle_components c
  on c.source_metadata->>'seed'='sprinter_w903_om611'
where upper(replace(coalesce(v.plate,''),'-',''))='EJW6A76'
on conflict (company_id, vehicle_id, component_id) do nothing;
