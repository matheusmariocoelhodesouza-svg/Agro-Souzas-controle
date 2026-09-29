-- Oficina 360 — Sprinter W903 / OM611 guided electrical diagnostic values v1
-- Policy: keep exact vehicle pinout and generic component-technology test values distinct.
-- A value is only marked vehicle-exact when supported by exact part/VIN data.

with v as (
  select id, company_id from public.v2_vehicles where upper(plate)='EJW6A76' limit 1
), src(source_key,source_type,title,publisher,source_url,authority_level,applicability_status,access_status,verification_status,notes,meta) as (values
  ('pierburg_maf_diagnostic_reference','diagnostic_procedure','Pierburg / Motorservice — verificar sensores de massa de ar','MS Motorservice / Pierburg','https://www.ms-motorservice.com/br/pt_br/tecnipedia/verificar-sensores-de-massa-de-ar-1377','component_manufacturer_technical','pierburg_analog_maf_pin_pattern_matches_B101_2_3_4_5','public_full','verified','Procedimento técnico Pierburg para MAF analógico. A ocupação 2/3/4/5 coincide com o conector B101 registrado na referência elétrica OM611; manter como referência até confirmação VIN/WIS.',jsonb_build_object('values',jsonb_build_object('pin2_to_ground','approx 12 V KOEO','pin3_to_pin4','approx 5 V KOEO','pin3_to_pin5_engine_off','approx 1.0 V','pin3_to_pin5_running','1.2-1.8 V','pin3_to_pin5_snap_acceleration','3.6-4.4 V'))),
  ('pierburg_pressure_transducer_diagnostic','diagnostic_procedure','Pierburg / Motorservice — transdutor eletropneumático de pressão','MS Motorservice / Pierburg','https://www.ms-motorservice.com/br/pt_br/tecnipedia/transdutores-de-pressao-1097','component_manufacturer_technical','generic_electropneumatic_pressure_transducer_for_turbo_control','public_full','verified','Procedimento genérico Pierburg para transdutores eletropneumáticos: resistência 11-18 ohm, verificação pneumática e comando PWM por massa. Aplicar somente após confirmar portas/mangueiras da peça instalada.',jsonb_build_object('resistance_ohm','11-18','control','ground-controlled PWM square wave','idle_control_pressure_mbar','>=480 generic reference','unplugged_pressure_mbar','0-60 generic reference')),
  ('hella_cam_hall_diagnostic','diagnostic_procedure','HELLA TechWorld — diagnóstico de sensor de fase Hall','HELLA','https://www.hella.com/techworld/br/tecnica/sensores-e-atuadores/sensor-da-arvore-de-comando-de-valvulas/','component_manufacturer_technical','generic_hall_cam_sensor','public_full','verified','Referência de tecnologia Hall: alimentação aproximadamente 5 V e sinal quadrado no osciloscópio. Valores exatos do veículo prevalecem quando disponíveis.',jsonb_build_object('supply','approx 5 V','signal','square wave','continuity','approx 0 ohm end-to-end with ECU and sensor disconnected')),
  ('hella_crank_inductive_diagnostic','diagnostic_procedure','HELLA TechWorld — diagnóstico de sensor de rotação indutivo','HELLA','https://www.hella.com/techworld/br/technik/sensores-e-atuadores/sensor-da-arvore-de-manivelas/','component_manufacturer_technical','generic_two_wire_inductive_crank_sensor','public_full','verified','Referência de tecnologia: sensor de 2 vias é indutivo; priorizar forma de onda senoidal e integridade do chicote. O intervalo genérico HELLA não deve ser usado sozinho para condenar o Bosch 0261210170.',jsonb_build_object('signal','sinusoidal waveform while cranking/running','generic_resistance_ohm','200-1000 depending on design','exact_code_cross_catalog_note','0261210170 equivalent aftermarket catalog reports approx 1150 ohm; do not reject solely by generic range')),
  ('hella_map_pressure_diagnostic','diagnostic_procedure','HELLA TechWorld — teste de sensor de pressão do coletor','HELLA','https://www.hella.com/techworld/br/bi/vw-golf-5-dificuldades-no-arranque-do-motor/','component_manufacturer_technical','generic_three_wire_map_sensor','public_full','verified','Referência para arquitetura MAP de 3 vias: verificar referência de aproximadamente 5 V, terra e resposta do sinal à pressão. Curva exata do Bosch/MTE aplicado à Sprinter permanece pendente.',jsonb_build_object('supply','approx 5 V','signal','analog; must vary with pressure','method','backprobe with sensor connected; compare scan MAP with atmospheric pressure KOEO and response under load')),
  ('mte_ntc_temperature_diagnostic','diagnostic_procedure','MTE-THOMSON — princípio e diagnóstico de sensor NTC','MTE-THOMSON','https://mte-thomson.com/en/produtosmte/temperature-sensor/','component_manufacturer_technical','generic_ntc_temperature_sensor','public_full','verified','Referência NTC: aumento de temperatura reduz resistência. Comparar leitura do scanner com temperatura real e verificar transição suave; curva ôhmica exata da peça permanece pendente.',jsonb_build_object('principle','NTC: resistance decreases as temperature rises','method','scanner plausibility plus ohmmeter with sensor disconnected','warning','do not measure resistance on energized circuit')),
  ('hella_start_charge_ground_diagnostic','diagnostic_procedure','HELLA TechWorld — sistema de partida, carga e quedas de tensão','HELLA','https://www.hella.com/techworld/br/tecnica/eletrica-eletronica/sistema-de-arranque-e-de-carregamento/trabalhos-de-servico-no-sistema-de-carregamento/','component_manufacturer_technical','generic_12v_start_charge_system','public_full','verified','Valores gerais HELLA para rede 12 V: bateria em repouso >=12,4 V; carga 13,7-15,0 V; quedas máximas devem ser usadas como referência de diagnóstico, observando dados Mercedes quando disponíveis.',jsonb_build_object('battery_rest_v','12.4-13.2','charging_v','13.7-15.0','alternator_bplus_vs_battery_max_delta_v','0.5')),
  ('delphi_common_rail_diagnostic_flow','diagnostic_procedure','Delphi Technologies — diagnóstico lógico do Common Rail','Delphi Technologies','https://www.delphiautoparts.com/pt-br/centro-de-recursos/artigo/como-identificar-falhas-no-sistema-common-rail---sintomas--diagn%C3%B3stico-e-preven%C3%A7%C3%A3o','oem_supplier_technical','generic_common_rail_diagnostic_sequence','public_full','verified','Antes de desmontar componentes, comparar pressão desejada x pressão real pelo scanner e então testar sensor, controle, alimentação e retorno.',jsonb_build_object('first_step','compare commanded vs actual rail pressure with scanner','safety','do not loosen high-pressure lines with system pressurized'))
)
insert into public.v2_vehicle_technical_sources (
  company_id,vehicle_id,source_key,source_type,title,publisher,source_url,authority_level,
  applicability_status,access_status,verification_status,notes,source_metadata
)
select v.company_id,v.id,s.source_key,s.source_type,s.title,s.publisher,s.source_url,s.authority_level,
       s.applicability_status,s.access_status,s.verification_status,s.notes,s.meta
from v cross join src s
on conflict (company_id,vehicle_id,source_key) do update set
  title=excluded.title,publisher=excluded.publisher,source_url=excluded.source_url,
  authority_level=excluded.authority_level,applicability_status=excluded.applicability_status,
  access_status=excluded.access_status,verification_status=excluded.verification_status,
  notes=excluded.notes,source_metadata=excluded.source_metadata,updated_at=now();

-- MAF B101: Pierburg procedure maps directly to pins 2/3/4/5 used in our OM611 reference.
with v as (select id from public.v2_vehicles where upper(plate)='EJW6A76' limit 1)
update public.v2_vehicle_electrical_nodes n set
  test_procedure=jsonb_build_object(
    'ferramenta','multímetro; osciloscópio opcional',
    'condicao','primeiro ignição ligada/motor parado; depois motor funcionando',
    'alimentacao','pino 2 para massa: aprox. 12 V; pino 3 para pino 4: aprox. 5 V',
    'sinal_motor_parado','pino 3 para pino 5: aprox. 1,0 V sem fluxo de ar',
    'sinal_motor_funcionando','pino 3 para pino 5: 1,2 a 1,8 V',
    'sinal_aceleracao','em aceleração até rotação máxima controlada: 3,6 a 4,4 V',
    'observacao','não perfurar cabos; usar backprobe apropriado e confirmar a ocupação dos pinos antes da medição',
    'nivel','referência técnica Pierburg; pinagem 2/3/4/5 coincide com B101',
    'fonte_diagnostico','MS Motorservice / Pierburg',
    'fonte_url','https://www.ms-motorservice.com/br/pt_br/tecnipedia/verificar-sensores-de-massa-de-ar-1377'
  ),
  source_metadata=coalesce(n.source_metadata,'{}'::jsonb)||jsonb_build_object('diagnostic_source_name','MS Motorservice / Pierburg — MAF','diagnostic_source_url','https://www.ms-motorservice.com/br/pt_br/tecnipedia/verificar-sensores-de-massa-de-ar-1377','diagnostic_confidence','manufacturer_reference_pin_pattern_match'),
  updated_at=now()
from v where n.vehicle_id=v.id and n.label='Sensor de massa de ar (MAF)';

-- MAP B112: only publish the 5-V architecture and dynamic-signal check, not an unverified transfer curve.
with v as (select id from public.v2_vehicles where upper(plate)='EJW6A76' limit 1)
update public.v2_vehicle_electrical_nodes n set
  test_procedure=jsonb_build_object(
    'ferramenta','multímetro + scanner; osciloscópio opcional',
    'condicao','sensor conectado; ignição ligada para referência e motor funcionando para resposta dinâmica',
    'alimentacao','referência esperada aprox. 5 V entre alimentação e terra',
    'sinal','deve variar de forma coerente com a pressão; curva tensão x pressão exata ainda não foi confirmada para esta peça',
    'scanner','com motor parado, MAP deve ser plausível frente à pressão atmosférica; sob carga deve acompanhar a sobrealimentação',
    'nao_condenar','não substituir o sensor apenas por DTC; testar 5 V, terra, continuidade e resposta',
    'nivel','referência de tecnologia MAP 3 vias; curva exata pendente',
    'fonte_diagnostico','HELLA TechWorld',
    'fonte_url','https://www.hella.com/techworld/br/bi/vw-golf-5-dificuldades-no-arranque-do-motor/'
  ),
  source_metadata=coalesce(n.source_metadata,'{}'::jsonb)||jsonb_build_object('diagnostic_source_name','HELLA — MAP diagnostic reference','diagnostic_source_url','https://www.hella.com/techworld/br/bi/vw-golf-5-dificuldades-no-arranque-do-motor/','diagnostic_confidence','technology_reference_not_exact_transfer_curve'),
  updated_at=now()
from v where n.vehicle_id=v.id and n.label='Sensor de pressão de admissão / MAP';

-- IAT and ECT: NTC logic, scanner plausibility, and safe resistance check without inventing an exact curve.
with v as (select id from public.v2_vehicles where upper(plate)='EJW6A76' limit 1)
update public.v2_vehicle_electrical_nodes n set
  test_procedure=jsonb_build_object(
    'ferramenta','scanner + multímetro/ohmímetro',
    'principio','NTC: a resistência diminui conforme a temperatura aumenta',
    'teste_frio','após longo repouso, comparar leitura do scanner com temperatura ambiente/temperatura real plausível',
    'teste_aquecimento','acompanhar pelo scanner; a leitura deve mudar de forma suave, sem saltos ou interrupções',
    'teste_resistencia','sensor desconectado e circuito desenergizado; observar mudança contínua da resistência com a temperatura',
    'nao_fazer','não medir resistência com o circuito energizado',
    'nivel','princípio NTC confirmado; curva ôhmica exata desta peça ainda pendente',
    'fonte_diagnostico','MTE-THOMSON',
    'fonte_url','https://mte-thomson.com/en/produtosmte/temperature-sensor/'
  ),
  source_metadata=coalesce(n.source_metadata,'{}'::jsonb)||jsonb_build_object('diagnostic_source_name','MTE-THOMSON — NTC diagnostic','diagnostic_source_url','https://mte-thomson.com/en/produtosmte/temperature-sensor/','diagnostic_confidence','manufacturer_technology_reference'),
  updated_at=now()
from v where n.vehicle_id=v.id and n.label in ('Sensor de temperatura do ar de admissão (IAT)','Sensor de temperatura do líquido de arrefecimento');

-- Cam Hall B108.
with v as (select id from public.v2_vehicles where upper(plate)='EJW6A76' limit 1)
update public.v2_vehicle_electrical_nodes n set
  test_procedure=jsonb_build_object(
    'ferramenta','multímetro + osciloscópio',
    'alimentacao','aprox. 5 V com ignição ligada, observando a pinagem específica já cadastrada',
    'continuidade','com ECU e sensor desconectados, cabos devem apresentar continuidade próxima de 0 ohm',
    'sinal','com motor girando, o osciloscópio deve mostrar onda quadrada Hall',
    'nao_fazer','não testar o elemento Hall como se fosse sensor indutivo com ohmímetro',
    'nivel','referência técnica Hall; alimentação e forma de onda genéricas, pinagem B108/A80 específica de família OM611',
    'fonte_diagnostico','HELLA TechWorld',
    'fonte_url','https://www.hella.com/techworld/br/tecnica/sensores-e-atuadores/sensor-da-arvore-de-comando-de-valvulas/'
  ),
  source_metadata=coalesce(n.source_metadata,'{}'::jsonb)||jsonb_build_object('diagnostic_source_name','HELLA — camshaft Hall diagnostic','diagnostic_source_url','https://www.hella.com/techworld/br/tecnica/sensores-e-atuadores/sensor-da-arvore-de-comando-de-valvulas/','diagnostic_confidence','manufacturer_technology_reference'),
  updated_at=now()
from v where n.vehicle_id=v.id and n.label='Sensor de fase do comando';

-- Crank inductive B73. Waveform is the primary criterion; resistance number is deliberately not a hard pass/fail.
with v as (select id from public.v2_vehicles where upper(plate)='EJW6A76' limit 1)
update public.v2_vehicle_electrical_nodes n set
  test_procedure=jsonb_build_object(
    'ferramenta','osciloscópio + multímetro',
    'tipo','sensor indutivo de 2 vias',
    'sinal','durante partida/funcionamento deve produzir forma de onda senoidal com amplitude suficiente e regularidade coerente com a rotação',
    'resistencia','HELLA cita 200-1000 ohm como faixa genérica por projeto; catálogo aftermarket do equivalente Bosch 0261210170 informa cerca de 1150 ohm',
    'criterio','não condenar somente pela resistência; priorizar circuito aberto/curto, isolamento, folga/roda fônica e forma de onda',
    'nivel','forma de onda = referência técnica forte; resistência exata OEM ainda pendente',
    'fonte_diagnostico','HELLA TechWorld + cross-reference 0261210170',
    'fonte_url','https://www.hella.com/techworld/br/technik/sensores-e-atuadores/sensor-da-arvore-de-manivelas/'
  ),
  source_metadata=coalesce(n.source_metadata,'{}'::jsonb)||jsonb_build_object('diagnostic_source_name','HELLA — crank inductive diagnostic','diagnostic_source_url','https://www.hella.com/techworld/br/technik/sensores-e-atuadores/sensor-da-arvore-de-manivelas/','diagnostic_confidence','waveform_strong_resistance_value_reference_only','cross_catalog_resistance_ohm',1150),
  updated_at=now()
from v where n.vehicle_id=v.id and n.label='Sensor de rotação do virabrequim';

-- Turbo control pressure converter Y87.
with v as (select id from public.v2_vehicles where upper(plate)='EJW6A76' limit 1)
update public.v2_vehicle_electrical_nodes n set
  test_procedure=jsonb_build_object(
    'ferramenta','multímetro + bomba de vácuo/manômetro + osciloscópio',
    'resistencia_bobina','11 a 18 ohm — referência Pierburg para transdutor eletropneumático',
    'comando','onda quadrada PWM comandada por massa; a largura do pulso deve mudar quando a solicitação de carga muda',
    'teste_pneumatico','referência genérica Pierburg: >=480 mbar em marcha lenta e 0-60 mbar após retirar alimentação; confirmar portas/mangueiras antes de aplicar esse critério',
    'inspecao','verificar vácuo de alimentação, mangueiras, dobras, vazamentos e atuador do turbo antes de condenar a válvula',
    'nivel','procedimento de fabricante para transdutor eletropneumático; valores pneumáticos não são VIN-específicos',
    'fonte_diagnostico','MS Motorservice / Pierburg',
    'fonte_url','https://www.ms-motorservice.com/br/pt_br/tecnipedia/transdutores-de-pressao-1097'
  ),
  source_metadata=coalesce(n.source_metadata,'{}'::jsonb)||jsonb_build_object('diagnostic_source_name','MS Motorservice / Pierburg — pressure transducer','diagnostic_source_url','https://www.ms-motorservice.com/br/pt_br/tecnipedia/transdutores-de-pressao-1097','diagnostic_confidence','manufacturer_generic_component_procedure'),
  updated_at=now()
from v where n.vehicle_id=v.id and n.label='Atuador/controle do turbo';

-- Common-rail pressure sensor and control valve: scanner first, no guessed voltage curve.
with v as (select id from public.v2_vehicles where upper(plate)='EJW6A76' limit 1)
update public.v2_vehicle_electrical_nodes n set
  test_procedure=jsonb_build_object(
    'ferramenta','scanner + multímetro; osciloscópio quando necessário',
    'primeiro_passo','comparar pressão do rail desejada x pressão real durante partida, marcha lenta e aceleração controlada',
    'eletrica_sensor','verificar alimentação, terra, continuidade e plausibilidade do sinal usando a pinagem B113/A80 cadastrada; curva exata tensão x pressão ainda não confirmada',
    'sequencia','só investigar alta pressão depois de descartar problema de alimentação de baixa pressão, filtro, entrada de ar e retorno excessivo',
    'seguranca','não soltar tubulação de alta pressão com o sistema pressurizado',
    'nivel','sequência de diagnóstico confirmada por fornecedores OE; valores hidráulicos exatos dependem do fabricante/condição',
    'fonte_diagnostico','Delphi Technologies / HELLA',
    'fonte_url','https://www.delphiautoparts.com/pt-br/centro-de-recursos/artigo/como-identificar-falhas-no-sistema-common-rail---sintomas--diagn%C3%B3stico-e-preven%C3%A7%C3%A3o'
  ),
  source_metadata=coalesce(n.source_metadata,'{}'::jsonb)||jsonb_build_object('diagnostic_source_name','Delphi + HELLA — Common Rail diagnostic sequence','diagnostic_source_url','https://www.delphiautoparts.com/pt-br/centro-de-recursos/artigo/como-identificar-falhas-no-sistema-common-rail---sintomas--diagn%C3%B3stico-e-preven%C3%A7%C3%A3o','diagnostic_confidence','oem_supplier_process_reference'),
  updated_at=now()
from v where n.vehicle_id=v.id and n.label='Sensor de pressão do rail';

with v as (select id from public.v2_vehicles where upper(plate)='EJW6A76' limit 1)
update public.v2_vehicle_electrical_nodes n set
  test_procedure=jsonb_build_object(
    'ferramenta','scanner + osciloscópio/multímetro conforme procedimento do sistema',
    'primeiro_passo','avaliar pressão desejada x real e códigos antes de condenar a válvula',
    'comando','a ECU regula a pressão do rail através desta válvula; confirmar forma de comando e duty-cycle no WIS/diagrama específico antes de aplicar valor numérico',
    'eletrica','verificar circuito Y92 pinos 1/2 até ECU A80 C4/21 e C4/31 conforme referência já cadastrada',
    'seguranca','não abrir circuito de alta pressão com o sistema pressurizado',
    'nivel','função e circuito confirmados; duty-cycle/corrente exatos ainda pendentes',
    'fonte_diagnostico','Bosch Mobility + Delphi Technologies',
    'fonte_url','https://www.bosch-mobility.com/en/solutions/fuel-supply/high-pressure-rail-for-common-rail-systems/'
  ),
  source_metadata=coalesce(n.source_metadata,'{}'::jsonb)||jsonb_build_object('diagnostic_source_name','Bosch + Delphi — rail pressure control','diagnostic_source_url','https://www.bosch-mobility.com/en/solutions/fuel-supply/high-pressure-rail-for-common-rail-systems/','diagnostic_confidence','system_function_verified_numeric_command_pending'),
  updated_at=now()
from v where n.vehicle_id=v.id and n.label='Válvula reguladora de pressão do rail';

-- Starting / charging and main grounds: populate nodes already present from catalog/backfill.
with v as (select id from public.v2_vehicles where upper(plate)='EJW6A76' limit 1)
update public.v2_vehicle_electrical_nodes n set
  test_procedure=jsonb_build_object(
    'ferramenta','multímetro + alicate amperímetro se disponível',
    'bateria_reposo','12,4 a 13,2 V com consumidores desligados — referência HELLA para rede 12 V',
    'bplus_alternador','B+ do alternador para massa deve corresponder à tensão da bateria; desvio máximo de referência <0,5 V',
    'tensao_carga','13,7 a 15,0 V como referência geral; medir em marcha lenta e novamente com carga/rotação conforme procedimento',
    'nao_fazer','não desconectar bateria nem curto-circuitar terminais com motor/alternador funcionando',
    'nivel','referência HELLA para sistema 12 V; especificação Mercedes prevalece se disponível',
    'fonte_diagnostico','HELLA TechWorld',
    'fonte_url','https://www.hella.com/techworld/br/tecnica/eletrica-eletronica/sistema-de-arranque-e-de-carregamento/trabalhos-de-servico-no-sistema-de-carregamento/'
  ),
  source_metadata=coalesce(n.source_metadata,'{}'::jsonb)||jsonb_build_object('diagnostic_source_name','HELLA — charging system','diagnostic_source_url','https://www.hella.com/techworld/br/tecnica/eletrica-eletronica/sistema-de-arranque-e-de-carregamento/trabalhos-de-servico-no-sistema-de-carregamento/','diagnostic_confidence','manufacturer_general_12v_reference'),
  updated_at=now()
from v where n.vehicle_id=v.id and n.label='Alternador';

with v as (select id from public.v2_vehicles where upper(plate)='EJW6A76' limit 1)
update public.v2_vehicle_electrical_nodes n set
  test_procedure=jsonb_build_object(
    'ferramenta','multímetro em queda de tensão durante a partida',
    'positivo','bateria + até terminal principal do motor de partida: queda máxima de referência 0,5 V',
    'massa','bateria - até carcaça do motor de partida: queda máxima de referência 0,3 V',
    'carcaca_bloco','carcaça do motor de partida até bloco/carroceria: referência 0,1 V',
    'comando','chave de ignição até terminal de comando: queda de referência até 1,5 V',
    'condicao','medir sob carga durante a partida; bateria deve estar previamente carregada e testada',
    'nivel','referência HELLA para rede 12 V; usar como diagnóstico de cabeamento, não como especificação exclusiva Mercedes',
    'fonte_diagnostico','HELLA TechWorld — Massa (31)',
    'fonte_url','https://www.hella.com/techworld/br/ti/massa-31-frequentemente-negligenciada/'
  ),
  source_metadata=coalesce(n.source_metadata,'{}'::jsonb)||jsonb_build_object('diagnostic_source_name','HELLA — starter voltage drop','diagnostic_source_url','https://www.hella.com/techworld/br/ti/massa-31-frequentemente-negligenciada/','diagnostic_confidence','manufacturer_general_12v_reference'),
  updated_at=now()
from v where n.vehicle_id=v.id and n.label='Motor de partida';

with v as (select id from public.v2_vehicles where upper(plate)='EJW6A76' limit 1)
update public.v2_vehicle_electrical_nodes n set
  test_procedure=jsonb_build_object(
    'ferramenta','multímetro em escala de tensão; medir queda com circuito sob carga',
    'referencia_massa_bateria_bloco','até 0,2 V como referência geral 12 V',
    'referencia_massa_bateria_partida','até 0,3 V até carcaça do motor de partida',
    'referencia_massa_bateria_alternador','até 0,3 V até carcaça do alternador',
    'inspecao','limpar oxidação, tinta e sujeira nos pontos de massa; conferir aperto antes de condenar componente',
    'nivel','referência HELLA de queda de tensão',
    'fonte_diagnostico','HELLA TechWorld — Massa (31)',
    'fonte_url','https://www.hella.com/techworld/br/ti/massa-31-frequentemente-negligenciada/'
  ),
  source_metadata=coalesce(n.source_metadata,'{}'::jsonb)||jsonb_build_object('diagnostic_source_name','HELLA — ground voltage drop','diagnostic_source_url','https://www.hella.com/techworld/br/ti/massa-31-frequentemente-negligenciada/','diagnostic_confidence','manufacturer_general_12v_reference'),
  updated_at=now()
from v where n.vehicle_id=v.id and n.node_type='ground';
