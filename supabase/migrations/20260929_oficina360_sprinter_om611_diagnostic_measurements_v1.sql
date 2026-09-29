-- Oficina 360 — Sprinter W903 / OM611 diagnostic measurements v1
-- Stores only values supported by public technical references. Where a family-level
-- source does not expose an exact numeric curve, the test method is recorded without
-- inventing a voltage/resistance. Vehicle-specific WIS remains the final authority.

with v as (
  select id, company_id from public.v2_vehicles where upper(plate)='EJW6A76' limit 1
), src(source_key,source_type,title,publisher,source_url,authority_level,applicability_status,access_status,verification_status,notes,meta) as (values
  (
    'mb_global_training_om611_612_measurements',
    'manufacturer_training_scan',
    'Mercedes-Benz Global Training — Motores Série 600 / OM611 e OM612',
    'Mercedes-Benz Global Training (public scan)',
    'https://pdfcoffee.com/apostila-motor-mbb-om-611-e-612pdf-4-pdf-free.html',
    'manufacturer_training_reproduction',
    'om611_family_sprinter_reference',
    'public_scan',
    'reference_pending',
    'Public reproduction of Mercedes-Benz Global Training material. Use for family-level diagnostic reference; confirm variant-sensitive values in VIN-specific XENTRY WIS before final diagnosis.',
    jsonb_build_object('systems',jsonb_build_array('common_rail','turbo','map','iat','coolant','crank','cam'),'final_authority','Mercedes-Benz XENTRY WIS')
  ),
  (
    'hella_12v_voltage_drop_reference',
    'generic_electrical_diagnostic_reference',
    'HELLA TechWorld — Earth (31) troubleshooting / permissible voltage drop reference',
    'HELLA',
    'https://www.hella.com/techworld/en/ti/earth-31-troubleshooting/',
    'oem_supplier',
    'generic_12v_vehicle_electrical_system',
    'public_full',
    'verified',
    'Generic 12 V workshop reference for voltage-drop testing. Not Mercedes/VIN-specific; use as a diagnostic benchmark only.',
    jsonb_build_object('system_voltage_v',12,'scope','generic_voltage_drop')
  ),
  (
    'vector_high_speed_can_levels',
    'network_physical_layer_reference',
    'Vector — CAN Bus Levels / ISO 11898-2 physical-layer reference',
    'Vector Informatik',
    'https://certification.vector.com/mod/page/view.php?id=341',
    'technical_training_reference',
    'generic_high_speed_can_physical_layer',
    'public_full',
    'verified',
    'Generic high-speed CAN differential-voltage reference; not a VIN-specific Mercedes wiring document.',
    jsonb_build_object('standard','ISO 11898-2','scope','high_speed_can_physical_layer')
  )
)
insert into public.v2_vehicle_technical_sources (
  company_id,vehicle_id,source_key,source_type,title,publisher,source_url,
  authority_level,applicability_status,access_status,verification_status,notes,source_metadata
)
select v.company_id,v.id,s.source_key,s.source_type,s.title,s.publisher,s.source_url,
       s.authority_level,s.applicability_status,s.access_status,s.verification_status,s.notes,s.meta
from v cross join src s
on conflict (company_id,vehicle_id,source_key) do update set
  source_type=excluded.source_type,title=excluded.title,publisher=excluded.publisher,
  source_url=excluded.source_url,authority_level=excluded.authority_level,
  applicability_status=excluded.applicability_status,access_status=excluded.access_status,
  verification_status=excluded.verification_status,notes=excluded.notes,
  source_metadata=excluded.source_metadata,updated_at=now();

-- Crankshaft position sensor B73: exact resistance range is stated by the OM611 training material.
with v as (select id from public.v2_vehicles where upper(plate)='EJW6A76' limit 1)
update public.v2_vehicle_electrical_nodes n set
  electrical_spec=coalesce(n.electrical_spec,'{}'::jsonb) || jsonb_build_object(
    'sensor_type','indutivo',
    'coil_resistance_min_ohm',800,
    'coil_resistance_max_ohm',1400
  ),
  test_procedure=jsonb_build_object(
    'ferramenta','Multímetro para resistência; osciloscópio para forma de onda',
    'condição','Ignição desligada e sensor desconectado para medir resistência',
    'onde_medir','Entre os pinos 1 e 2 do B73',
    'esperado','800–1400 Ω',
    'sinal_dinâmico','Sensor indutivo gera sinal alternado durante a rotação; amplitude depende de rotação e entreferro',
    'interpretação','Resistência fora da faixa pede inspeção do sensor e do chicote antes de condenar ECU',
    'cuidado','Não aplicar tensão externa ao sensor durante o teste de resistência',
    'nível_de_confiança','Referência Mercedes-Benz Global Training para motores Série 600 / Sprinter'
  ),
  source_metadata=coalesce(n.source_metadata,'{}'::jsonb) || jsonb_build_object(
    'diagnostic_source_name','Mercedes-Benz Global Training — Motores Série 600',
    'diagnostic_source_url','https://pdfcoffee.com/apostila-motor-mbb-om-611-e-612pdf-4-pdf-free.html',
    'diagnostic_reference','B73 crank sensor 800–1400 ohm'
  ),
  updated_at=now()
from v where n.vehicle_id=v.id and n.label='Sensor de rotação do virabrequim';

-- Camshaft Hall sensor B108: signal behavior is documented, but public training copies
-- conflict on the supply voltage (5 V vs 12 V). Do not publish a fixed supply value.
with v as (select id from public.v2_vehicles where upper(plate)='EJW6A76' limit 1)
update public.v2_vehicle_electrical_nodes n set
  electrical_spec=coalesce(n.electrical_spec,'{}'::jsonb) || jsonb_build_object(
    'sensor_type','Hall',
    'signal_high_reference_v',5,
    'signal_low_reference_v',0,
    'supply_voltage_status','variant_conflict_public_sources_verify_wis'
  ),
  test_procedure=jsonb_build_object(
    'ferramenta','Osciloscópio preferencial; multímetro somente para checagem estática',
    'condição','Conector ligado, backprobe, ignição ligada / motor girando para forma de onda',
    'onde_medir','Sinal no pino 2 em relação ao terra do sensor no pino 1',
    'esperado','Sinal Hall alternando aproximadamente 5 V → 0 V conforme o ressalto passa pelo sensor',
    'alimentação','Não assumir valor fixo: materiais públicos de treinamento divergem entre 5 V e 12 V no circuito de alimentação; confirmar no WIS do VIN',
    'interpretação','Sem comutação: conferir alimentação, terra, chicote e presença do alvo mecânico antes de substituir o sensor',
    'cuidado','Não fazer jumper nos pinos do sensor/ECU',
    'nível_de_confiança','Comportamento Hall de referência; alimentação exata bloqueada até confirmação VIN-específica'
  ),
  source_metadata=coalesce(n.source_metadata,'{}'::jsonb) || jsonb_build_object(
    'diagnostic_source_name','Mercedes-Benz Global Training — Motores Série 600',
    'diagnostic_source_url','https://pdfcoffee.com/apostila-motor-mbb-om-611-e-612pdf-4-pdf-free.html',
    'variant_conflict','public training copies show different supply voltage; WIS required'
  ),
  updated_at=now()
from v where n.vehicle_id=v.id and n.label='Sensor de fase do comando';

-- Rail pressure control valve Y92.
with v as (select id from public.v2_vehicles where upper(plate)='EJW6A76' limit 1)
update public.v2_vehicle_electrical_nodes n set
  electrical_spec=coalesce(n.electrical_spec,'{}'::jsonb) || jsonb_build_object(
    'control_type','PWM',
    'coil_resistance_reference_ohm',2.5
  ),
  test_procedure=jsonb_build_object(
    'ferramenta','Multímetro para bobina; osciloscópio para comando PWM',
    'condição','Ignição desligada e conector desconectado para resistência',
    'onde_medir','Entre os dois pinos da Y92',
    'esperado','Resistência da bobina ≈ 2,5 Ω',
    'sinal_dinâmico','Comando proporcional PWM enviado pela unidade CR/A80',
    'interpretação','Bobina aberta/curto fora da referência ou ausência de PWM exige separar falha de válvula, chicote e comando da ECU',
    'cuidado','Sistema common rail trabalha em alta pressão; não afrouxar tubulações/rail com motor funcionando ou sistema pressurizado',
    'nível_de_confiança','Referência Mercedes-Benz Global Training para Y92 Sprinter'
  ),
  source_metadata=coalesce(n.source_metadata,'{}'::jsonb) || jsonb_build_object(
    'diagnostic_source_name','Mercedes-Benz Global Training — Motores Série 600',
    'diagnostic_source_url','https://pdfcoffee.com/apostila-motor-mbb-om-611-e-612pdf-4-pdf-free.html'
  ),
  updated_at=now()
from v where n.vehicle_id=v.id and n.label='Válvula reguladora de pressão do rail';

-- Rail pressure sensor B113: pressure ranges are documented; exact voltage curve is not stored.
with v as (select id from public.v2_vehicles where upper(plate)='EJW6A76' limit 1)
update public.v2_vehicle_electrical_nodes n set
  electrical_spec=coalesce(n.electrical_spec,'{}'::jsonb) || jsonb_build_object(
    'sensor_pressure_range_min_bar',0,
    'sensor_pressure_range_max_bar',1500,
    'engine_operating_pressure_reference_min_bar',300,
    'engine_operating_pressure_reference_max_bar',1350
  ),
  test_procedure=jsonb_build_object(
    'ferramenta','Scanner + multímetro/osciloscópio para plausibilidade elétrica',
    'condição','Preferir leitura do scanner com sistema fechado; backprobe somente com procedimento seguro',
    'onde_medir','Pressão real no scanner; sinal elétrico no pino 2 em relação ao sensor supply minus',
    'esperado','Sensor mede 0–1500 bar; material de treinamento cita 300–1350 bar como faixa de trabalho do combustível nos motores Série 600',
    'sinal_elétrico','Saída variável; curva tensão×pressão não é publicada como número nesta carga e permanece a confirmar no WIS',
    'interpretação','Comparar pressão real, pressão solicitada e atuação da Y92; não condenar o sensor apenas por um DTC',
    'cuidado','Não abrir o rail nem linhas de alta pressão com o sistema pressurizado',
    'nível_de_confiança','Faixa de pressão de referência Mercedes-Benz Global Training; curva elétrica final depende do WIS/VIN'
  ),
  source_metadata=coalesce(n.source_metadata,'{}'::jsonb) || jsonb_build_object(
    'diagnostic_source_name','Mercedes-Benz Global Training — Motores Série 600',
    'diagnostic_source_url','https://pdfcoffee.com/apostila-motor-mbb-om-611-e-612pdf-4-pdf-free.html'
  ),
  updated_at=now()
from v where n.vehicle_id=v.id and n.label='Sensor de pressão do rail';

-- MAP B112.
with v as (select id from public.v2_vehicles where upper(plate)='EJW6A76' limit 1)
update public.v2_vehicle_electrical_nodes n set
  electrical_spec=coalesce(n.electrical_spec,'{}'::jsonb) || jsonb_build_object(
    'supply_terminals','1 e 3',
    'signal_terminal','2',
    'signal_behavior','tensão variável com pressão'
  ),
  test_procedure=jsonb_build_object(
    'ferramenta','Scanner + multímetro/osciloscópio',
    'condição','Backprobe com conector ligado; evitar perfurar isolação quando houver adaptador de teste',
    'onde_medir','Alimentação entre terminais 1 e 3; sinal no terminal 2',
    'esperado','Terminais 1 e 3 alimentam o sensor; terminal 2 devolve sinal variável de pressão',
    'valor_numérico','Não preencher tensão fixa sem curva WIS/VIN-específica',
    'interpretação','Se falta alimentação, investigar circuito/ECU; se há alimentação e sinal não responde à pressão, comparar scanner, chicote e sensor',
    'nível_de_confiança','Função dos terminais documentada no treinamento Mercedes; escala elétrica exata pendente do WIS'
  ),
  source_metadata=coalesce(n.source_metadata,'{}'::jsonb) || jsonb_build_object(
    'diagnostic_source_name','Mercedes-Benz Global Training — Motores Série 600',
    'diagnostic_source_url','https://pdfcoffee.com/apostila-motor-mbb-om-611-e-612pdf-4-pdf-free.html'
  ),
  updated_at=now()
from v where n.vehicle_id=v.id and n.label='Sensor de pressão de admissão / MAP';

-- IAT G14 and coolant B16: NTC behavior is documented; numerical curves are intentionally not invented.
with v as (select id from public.v2_vehicles where upper(plate)='EJW6A76' limit 1)
update public.v2_vehicle_electrical_nodes n set
  electrical_spec=coalesce(n.electrical_spec,'{}'::jsonb) || jsonb_build_object(
    'sensor_type','NTC',
    'behavior','resistência diminui quando a temperatura aumenta'
  ),
  test_procedure=jsonb_build_object(
    'ferramenta','Scanner + multímetro em resistência',
    'condição','Para resistência: ignição desligada e sensor desconectado; para plausibilidade: leitura pelo scanner',
    'onde_medir','Entre os dois pinos do sensor quando desconectado',
    'esperado','Comportamento NTC: a resistência deve cair conforme a temperatura sobe',
    'valor_numérico','Curva Ω×°C não é preenchida nesta carga porque o material público consultado não expõe os pontos numéricos com segurança',
    'interpretação','Curto, circuito aberto ou resposta térmica incoerente exige separar sensor e chicote antes de substituir',
    'nível_de_confiança','Comportamento NTC documentado; curva exata pendente do WIS ou tabela confiável do fabricante do sensor'
  ),
  source_metadata=coalesce(n.source_metadata,'{}'::jsonb) || jsonb_build_object(
    'diagnostic_source_name','Mercedes-Benz Global Training — Motores Série 600',
    'diagnostic_source_url','https://pdfcoffee.com/apostila-motor-mbb-om-611-e-612pdf-4-pdf-free.html'
  ),
  updated_at=now()
from v where n.vehicle_id=v.id and n.label='Sensor de temperatura do ar de admissão (IAT)';

with v as (select id from public.v2_vehicles where upper(plate)='EJW6A76' limit 1)
update public.v2_vehicle_electrical_nodes n set
  electrical_spec=coalesce(n.electrical_spec,'{}'::jsonb) || jsonb_build_object(
    'sensor_type','NTC',
    'behavior','resistência diminui quando a temperatura aumenta',
    'thermostat_opening_reference_c',87,
    'thermostat_full_open_reference_c',102
  ),
  test_procedure=jsonb_build_object(
    'ferramenta','Scanner + multímetro em resistência',
    'condição','Para resistência: ignição desligada e sensor desconectado; para plausibilidade: leitura pelo scanner durante aquecimento',
    'onde_medir','Entre os dois pinos do B16 quando desconectado',
    'esperado','Comportamento NTC: resistência cai com aumento da temperatura; referência do sistema: termostática inicia abertura acima de 87 °C e abertura total a 102 °C',
    'valor_numérico_sensor','Curva Ω×°C do B16 permanece pendente de fonte numérica confiável/WIS',
    'interpretação','Comparar progressão da temperatura no scanner com comportamento do sistema de arrefecimento; não confundir falha de sensor com termostática',
    'nível_de_confiança','Comportamento e temperaturas do sistema documentados no treinamento Mercedes; curva elétrica exata pendente'
  ),
  source_metadata=coalesce(n.source_metadata,'{}'::jsonb) || jsonb_build_object(
    'diagnostic_source_name','Mercedes-Benz Global Training — Motores Série 600',
    'diagnostic_source_url','https://pdfcoffee.com/apostila-motor-mbb-om-611-e-612pdf-4-pdf-free.html'
  ),
  updated_at=now()
from v where n.vehicle_id=v.id and n.label='Sensor de temperatura do líquido de arrefecimento';

-- VNT control valve Y87: proportional PWM/vacuum control and overboost diagnostic reference.
with v as (select id from public.v2_vehicles where upper(plate)='EJW6A76' limit 1)
update public.v2_vehicle_electrical_nodes n set
  electrical_spec=coalesce(n.electrical_spec,'{}'::jsonb) || jsonb_build_object(
    'control_type','PWM',
    'actuation_type','válvula proporcional de vácuo',
    'overboost_diagnostic_reference_bar',2.7
  ),
  test_procedure=jsonb_build_object(
    'ferramenta','Scanner, vacuômetro e osciloscópio',
    'condição','Teste controlado; observar pressão solicitada/real e comando PWM sem provocar sobrepressão intencionalmente',
    'onde_medir','PWM nos dois fios da Y87; vácuo na entrada/saída da válvula; pressão de sobrealimentação no scanner',
    'esperado','A Y87 é proporcional e comandada por PWM; o treinamento orienta verificar o filtro de entrada da válvula quando houver corte de aceleração com pressão acima de 2,7 bar sob carga',
    'duty_cycle','Não preencher percentual fixo sem condição de carga/rotação e WIS específicos',
    'interpretação','Separar falha elétrica de PWM, falta de vácuo, filtro obstruído, atuador travado e vazamento de admissão antes de condenar o turbo',
    'nível_de_confiança','Referência Mercedes-Benz Global Training para sistema VNT Sprinter'
  ),
  source_metadata=coalesce(n.source_metadata,'{}'::jsonb) || jsonb_build_object(
    'diagnostic_source_name','Mercedes-Benz Global Training — Motores Série 600',
    'diagnostic_source_url','https://pdfcoffee.com/apostila-motor-mbb-om-611-e-612pdf-4-pdf-free.html'
  ),
  updated_at=now()
from v where n.vehicle_id=v.id and n.label='Atuador/controle do turbo';

-- Generic 12 V voltage-drop benchmarks from HELLA. These are clearly tagged generic, not Mercedes-specific.
with v as (select id from public.v2_vehicles where upper(plate)='EJW6A76' limit 1)
update public.v2_vehicle_electrical_nodes n set
  test_procedure=jsonb_build_object(
    'ferramenta','Multímetro em V DC durante a carga/partida',
    'condição','Bateria em vazio pelo menos 12,4 V segundo a referência HELLA; medir queda com circuito sob carga',
    'onde_medir','Negativo da bateria → carcaça do motor de partida / bloco / carroceria conforme trecho investigado',
    'esperado','Referência genérica HELLA: até 0,3 V do negativo da bateria à carcaça do motor de partida; até 0,2 V do negativo da bateria à carroceria/bloco; até 0,1 V da carcaça do motor de partida ao bloco/carroceria',
    'interpretação','Queda acima da referência aponta resistência em cabo, terminal, aterramento ou conexão; testar sob carga é mais útil que ohmímetro em cabo de alta corrente',
    'escopo','Referência genérica para sistema 12 V, não especificação Mercedes VIN-específica'
  ),
  source_metadata=coalesce(n.source_metadata,'{}'::jsonb) || jsonb_build_object(
    'diagnostic_source_name','HELLA TechWorld — Earth (31) troubleshooting',
    'diagnostic_source_url','https://www.hella.com/techworld/en/ti/earth-31-troubleshooting/',
    'diagnostic_scope','generic_12v_voltage_drop'
  ),
  updated_at=now()
from v where n.vehicle_id=v.id and (n.reference='W4' or n.label in ('Cinta de aterramento motor-chassi','Ponto de aterramento da carroceria'));

with v as (select id from public.v2_vehicles where upper(plate)='EJW6A76' limit 1)
update public.v2_vehicle_electrical_nodes n set
  test_procedure=jsonb_build_object(
    'ferramenta','Multímetro em V DC durante a partida',
    'condição','Circuito sob carga durante acionamento do motor de partida',
    'onde_medir','Bateria positiva → terminal principal do motor de partida e negativo da bateria → carcaça do motor de partida',
    'esperado','Referência genérica HELLA: queda de até 0,5 V no positivo bateria→terminal principal e até 0,3 V no negativo bateria→carcaça do motor de partida',
    'interpretação','Queda excessiva indica cabo/terminal/conexão; se as quedas estão boas, investigar solenoide, relé, alimentação de comando e motor de partida',
    'escopo','Referência genérica HELLA para sistema 12 V'
  ),
  source_metadata=coalesce(n.source_metadata,'{}'::jsonb) || jsonb_build_object(
    'diagnostic_source_name','HELLA TechWorld — Earth (31) troubleshooting',
    'diagnostic_source_url','https://www.hella.com/techworld/en/ti/earth-31-troubleshooting/',
    'diagnostic_scope','generic_12v_voltage_drop'
  ),
  updated_at=now()
from v where n.vehicle_id=v.id and n.label='Motor de partida' and coalesce((n.electrical_spec->>'power_kw')::numeric,0)>0;

with v as (select id from public.v2_vehicles where upper(plate)='EJW6A76' limit 1)
update public.v2_vehicle_electrical_nodes n set
  test_procedure=jsonb_build_object(
    'ferramenta','Multímetro em V DC com alternador carregando',
    'condição','Motor funcionando e circuito de carga sob condição representativa',
    'onde_medir','Bateria positiva → B+ do alternador e negativo da bateria → carcaça do alternador',
    'esperado','Referência genérica HELLA: queda de até 0,4 V no positivo bateria→B+ do alternador e até 0,3 V no negativo bateria→carcaça; carcaça do alternador→bloco/carroceria até 0,1 V',
    'interpretação','Queda acima da referência aponta resistência no caminho de carga; diferenciar cabo/terra de defeito interno do alternador',
    'escopo','Referência genérica HELLA para sistema 12 V'
  ),
  source_metadata=coalesce(n.source_metadata,'{}'::jsonb) || jsonb_build_object(
    'diagnostic_source_name','HELLA TechWorld — Earth (31) troubleshooting',
    'diagnostic_source_url','https://www.hella.com/techworld/en/ti/earth-31-troubleshooting/',
    'diagnostic_scope','generic_12v_voltage_drop'
  ),
  updated_at=now()
from v where n.vehicle_id=v.id and n.label='Alternador' and coalesce((n.electrical_spec->>'rated_current_a')::numeric,0)>0;

-- Generic high-speed CAN differential test reference. Use the two bus nodes together.
with v as (select id from public.v2_vehicles where upper(plate)='EJW6A76' limit 1)
update public.v2_vehicle_electrical_nodes n set
  electrical_spec=coalesce(n.electrical_spec,'{}'::jsonb) || jsonb_build_object(
    'physical_layer_reference','ISO 11898-2 high-speed CAN',
    'recessive_differential_typical_v',0,
    'dominant_differential_typical_v',2
  ),
  test_procedure=jsonb_build_object(
    'ferramenta','Osciloscópio diferencial ou medição apropriada de CAN',
    'condição','Rede energizada e comunicando; medir diferencial entre CAN High e CAN Low sem curto-circuitar o barramento',
    'onde_medir','Entre J422 CAN High e J421 CAN Low / ponto de diagnóstico equivalente',
    'esperado','Referência genérica ISO 11898-2: diferencial típico ≈0 V no recessivo e ≈2 V no dominante',
    'interpretação','Ausência de atividade, níveis presos ou forma de onda deformada pede inspeção de alimentação dos módulos, chicote, terminações e curtos',
    'escopo','Referência física genérica de high-speed CAN; confirmar topologia/terminação Mercedes no WIS'
  ),
  source_metadata=coalesce(n.source_metadata,'{}'::jsonb) || jsonb_build_object(
    'diagnostic_source_name','Vector — CAN Bus Levels / ISO 11898-2 reference',
    'diagnostic_source_url','https://certification.vector.com/mod/page/view.php?id=341',
    'diagnostic_scope','generic_high_speed_can'
  ),
  updated_at=now()
from v where n.vehicle_id=v.id and n.reference in ('J421','J422');
