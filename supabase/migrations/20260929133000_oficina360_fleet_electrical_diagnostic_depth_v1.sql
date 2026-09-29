-- Oficina 360 — profundidade elétrica/diagnóstica aplicável à frota v1
-- CPI6C79: referência de família eletrônica VW/MWM; variante exata ainda depende de confirmação física.
-- MBJ1166 e BYH8J61: diesel de injeção mecânica; não recebem ECU/common rail fictícios.
-- QSR7H50: elétrica de reboque por mapeamento físico.

-- Fontes técnicas e gates de confirmação.
with veh as (
  select id,company_id,upper(replace(coalesce(plate,''),'-','')) plate_key
  from public.v2_vehicles
  where upper(replace(coalesce(plate,''),'-','')) in ('CPI6C79','MBJ1166','BYH8J61','QSR7H50')
), src(plate_key,source_key,source_type,title,publisher,source_url,authority_level,applicability_status,access_status,verification_status,notes,meta) as (values
 ('CPI6C79','mwm_engine_serial_literature','manufacturer_literature','MWM — literatura técnica por identificação do motor','MWM','https://www.mwm.com.br/','manufacturer','engine_serial_lookup','public_or_request','verified','Usar o serial D1A001816 para confirmar a literatura do motor. A combinação VW 9.150 EOD / MWM 4.12 TCE permanece candidata até plaqueta.',jsonb_build_object('engine_serial','D1A001816','physical_variant_required',true)),
 ('CPI6C79','vw_mwm_8150e_9150e_od_wiring','electrical_diagram_reference','VW 8.150E OD / 9.150E OD — Motor MWM, sistema elétrico','Volkswagen/MWM family reference','https://pdfcoffee.com/8150e-od-9150e-od-motor-mwm-sistema-eletrico-pdf-pdf-free.html','technical_reference','vehicle_family_only','public_reference','reference_pending','Arquitetura elétrica pública da família. Não promover pino, tensão ou aplicação a exatos da CPI6C79 sem confirmar a variante instalada.',jsonb_build_object('family_reference',true,'candidate','VW 9.150 EOD / MWM 4.12 TCE','requires_physical_variant_confirmation',true,'pins_withheld',true)),
 ('MBJ1166','mwm_sprint_407tca_manual','manufacturer_manual_reference','MWM Sprint 4.07 TCA — Manual de Operação e Manutenção 9.407.0.006.0160','MWM International','https://www.manualzz.com/doc/html/6045907/mwm-sprint-4.07-tca-operation-and-maintenance-manual','manufacturer_document_mirror','engine_family_general','public_reference','reference_pending','Manual MWM da família Sprint. O próprio documento ressalva que há várias aplicações e que o manual do fabricante do veículo prevalece.',jsonb_build_object('document_id','9.407.0.006.0160','engine_serial','40704030141','mechanical_injection',true)),
 ('MBJ1166','mwm_engine_serial_literature','manufacturer_literature','MWM — confirmação de literatura pelo número de série','MWM','https://www.mwm.com.br/','manufacturer','engine_serial_lookup','public_or_request','verified','Usar o serial 40704030141 para confirmar documento e variante do motor instalado.',jsonb_build_object('engine_serial','40704030141')),
 ('BYH8J61','mercedes_b2b_service_reference','oem_service_reference','Mercedes-Benz B2B Connect — peças e informação técnica','Mercedes-Benz','https://b2bconnect.mercedes-benz.com/','manufacturer','vehicle_family_and_build_data','account_or_authorized_access','verified','Fonte OEM para confirmação final do LO 608/OM314 candidato e seus componentes.',jsonb_build_object('candidate_chassis','LO 608','candidate_engine','OM314','requires_build_confirmation',true)),
 ('BYH8J61','mb608_voltage_gate','physical_verification_gate','Mercedes 608 — tensão nominal deve ser confirmada na própria condução','Oficina 360',null,'internal_control','exact_vehicle_only','physical_check_required','reference_pending','Referências de família incluem aplicações elétricas distintas. Confirmar baterias, ligação e plaquetas do alternador/partida antes de usar valores 12/24/28 V.',jsonb_build_object('nominal_voltage','unknown_until_physical_check','do_not_assume_12v_or_24v',true)),
 ('QSR7H50','trailer_wiring_gate','physical_verification_gate','QSR7H50 — padrão do plugue e tensão por inspeção física','Oficina 360',null,'internal_control','exact_vehicle_only','physical_check_required','reference_pending','Não assumir número de vias, pinagem ou tensão do reboque. Mapear cada função na instalação existente.',jsonb_build_object('do_not_assume_connector_standard',true,'do_not_assume_voltage',true))
)
insert into public.v2_vehicle_technical_sources(
 company_id,vehicle_id,source_key,source_type,title,publisher,source_url,authority_level,
 applicability_status,access_status,verification_status,notes,source_metadata
)
select v.company_id,v.id,s.source_key,s.source_type,s.title,s.publisher,s.source_url,s.authority_level,
 s.applicability_status,s.access_status,s.verification_status,s.notes,s.meta
from veh v join src s on s.plate_key=v.plate_key
on conflict (company_id,vehicle_id,source_key) do update set
 source_type=excluded.source_type,title=excluded.title,publisher=excluded.publisher,source_url=excluded.source_url,
 authority_level=excluded.authority_level,applicability_status=excluded.applicability_status,
 access_status=excluded.access_status,verification_status=excluded.verification_status,notes=excluded.notes,
 source_metadata=excluded.source_metadata,updated_at=now();

-- Componentes funcionais que devem existir no Mapa Elétrico.
with desired(plate_key,component_name,circuit_code,node_type,status,test_procedure,electrical_spec,source_meta) as (values
 ('CPI6C79','Sensor combinado de pressao/temperatura do ar','engine_air','sensor','reference',
  jsonb_build_object('nivel','REFERÊNCIA DE FAMÍLIA','scanner','Comparar pressão/temperatura da admissão e, quando disponível, pressão solicitada x real.','eletrico','Depois de confirmar a variante, medir referência/terra/sinal pelo diagrama correto; não adivinhar pinos.','fonte_diagnostico','VW 8.150E/9.150E OD MWM'),
  jsonb_build_object('architecture','combined_intake_pressure_temperature','exact_pinout','blocked_until_variant_confirmation'),jsonb_build_object('family_reference',true,'requires_physical_variant_confirmation',true)),
 ('CPI6C79','Sensor de pressao do rail','engine_fuel','sensor','reference',
  jsonb_build_object('nivel','REFERÊNCIA DE FAMÍLIA','scanner','Comparar pressão solicitada x real na partida, lenta e carga.','eletrico','Se incoerente, testar referência, terra e sinal somente pelo diagrama da variante confirmada.','seguranca','Não abrir linha common rail pressurizada.','fonte_diagnostico','VW/MWM família eletrônica'),
  jsonb_build_object('architecture','common_rail_pressure_sensor','exact_pinout','blocked_until_variant_confirmation'),jsonb_build_object('family_reference',true,'high_pressure_warning',true)),
 ('CPI6C79','Sensor de temperatura do liquido','engine_cooling','sensor','reference',
  jsonb_build_object('nivel','REFERÊNCIA DE FAMÍLIA','scanner','Após repouso, comparar leitura com ambiente plausível e acompanhar subida contínua no aquecimento.','eletrico','Curva resistiva só pode ser tratada como exata com código/peça/manual confirmados.','fonte_diagnostico','VW/MWM família eletrônica'),
  jsonb_build_object('exact_curve','requires_exact_part_or_manual'),jsonb_build_object('family_reference',true)),
 ('CPI6C79','Modulo de controle do motor (ECU)','ecu_power','ecu','reference',
  jsonb_build_object('nivel','REFERÊNCIA DE FAMÍLIA','passo_1','Antes de condenar ECU, verificar banco de baterias, fusíveis, relés, alimentações e terras sob carga.','passo_2','Confirmar comunicação e DTCs; falta de comunicação isolada não prova ECU defeituosa.','fonte_diagnostico','VW 8.150E/9.150E OD MWM'),
  jsonb_build_object('module_family','J248/reference','exact_connector_pinout','blocked_until_variant_confirmation'),jsonb_build_object('family_reference',true)),
 ('CPI6C79','Alternador','starting_charging','component','reference',
  jsonb_build_object('nivel','REFERÊNCIA — CONFIRMAR SISTEMA FÍSICO','passo_1','Confirmar quantidade/ligação das baterias e tensão nominal.','passo_2','Medir carga, correia, B+, terra e quedas sob carga.','fonte_diagnostico','arquitetura VW candidata + procedimento funcional'),
  jsonb_build_object('candidate_system_voltage_v',24,'candidate_alternator_v',28,'physical_confirmation_required',true),jsonb_build_object('family_reference',true)),
 ('CPI6C79','Motor de partida','starting_charging','component','reference',
  jsonb_build_object('nivel','REFERÊNCIA — CONFIRMAR SISTEMA FÍSICO','passo_1','Confirmar banco/tensão.','passo_2','Durante a partida medir queda nos cabos positivo/terra e observar velocidade de arranque.','fonte_diagnostico','procedimento funcional'),
  jsonb_build_object('candidate_system_voltage_v',24,'physical_confirmation_required',true),jsonb_build_object('family_reference',true)),
 ('CPI6C79','Bateria','starting_charging','power','reference',
  jsonb_build_object('nivel','REFERÊNCIA — CONFIRMAR BANCO FÍSICO','passo_1','Conferir quantidade, tensão individual e ligação série/paralelo.','passo_2','Testar cada bateria e terminais antes de culpar partida/alternador.'),
  jsonb_build_object('candidate_configuration','2 x 12 V em série','physical_confirmation_required',true),jsonb_build_object('family_reference',true)),

 ('MBJ1166','Alternador','starting_charging','component','needs_physical_verification',
  jsonb_build_object('nivel','CONFIRMAR NA CONDUÇÃO','passo_1','Identificar tensão nominal pelas baterias e plaqueta.','passo_2','Verificar correia, conexões, B+, terra e queda sob carga.','fonte_diagnostico','MWM Sprint + procedimento elétrico funcional'),
  jsonb_build_object('nominal_voltage','physical_check_required'),jsonb_build_object('mechanical_engine',true)),
 ('MBJ1166','Motor de partida','starting_charging','component','needs_physical_verification',
  jsonb_build_object('nivel','CONFIRMAR NA CONDUÇÃO','passo_1','Identificar tensão nominal.','passo_2','Medir alimentação/queda durante a partida e observar velocidade de arranque. Evitar tentativas prolongadas.','fonte_diagnostico','MWM Sprint 4.07 TCA'),
  jsonb_build_object('nominal_voltage','physical_check_required'),jsonb_build_object('mechanical_engine',true)),
 ('MBJ1166','Bateria','starting_charging','power','needs_physical_verification',
  jsonb_build_object('nivel','CONFIRMAR NA CONDUÇÃO','passo_1','Conferir tensão, quantidade/ligação, terminais e estado de carga.','passo_2','Testar sob carga e medir queda nos cabos.'),
  jsonb_build_object('nominal_voltage','physical_check_required'),jsonb_build_object('mechanical_engine',true)),
 ('MBJ1166','Chave de ignicao','starting','component','needs_physical_verification',
  jsonb_build_object('nivel','CONFIRMAR PINAGEM FÍSICA','passo_1','Confirmar entrada e saída de comando na posição de partida; seguir o chicote instalado se não houver comando.'),
  '{}'::jsonb,jsonb_build_object('exact_pinout_required',true)),
 ('MBJ1166','Sensor/interruptor de temperatura','engine_cooling','sensor','needs_physical_verification',
  jsonb_build_object('nivel','CONFIRMAR NA CONDUÇÃO','passo_1','Comparar painel com temperatura real e testar chicote.','passo_2','Se resistivo, medir desenergizado e comparar só com a curva da peça exata.','fonte_diagnostico','MWM Sprint + peça instalada'),
  jsonb_build_object('exact_sensor_type','physical_check_required'),jsonb_build_object('mechanical_engine',true)),
 ('MBJ1166','Interruptor de pressao do oleo','engine_lubrication','sensor','needs_physical_verification',
  jsonb_build_object('nivel','CONFIRMAR NA CONDUÇÃO','passo_1','Testar lógica da lâmpada/continuidade.','passo_2','Se houver dúvida de pressão real, medir com manômetro mecânico; não condenar pela lâmpada sozinha.'),
  '{}'::jsonb,jsonb_build_object('mechanical_engine',true)),

 ('BYH8J61','Alternador','starting_charging','component','needs_physical_verification',
  jsonb_build_object('nivel','GATE DE TENSÃO OBRIGATÓRIO','passo_1','Identificar quantidade/ligação das baterias e plaqueta do alternador antes de qualquer valor absoluto.','passo_2','Só depois medir carga e quedas conforme a tensão confirmada.'),
  jsonb_build_object('nominal_voltage','unknown_until_physical_check'),jsonb_build_object('do_not_assume_12v_or_24v',true)),
 ('BYH8J61','Motor de partida','starting_charging','component','needs_physical_verification',
  jsonb_build_object('nivel','GATE DE TENSÃO OBRIGATÓRIO','passo_1','Identificar tensão na instalação/plaqueta.','passo_2','Medir queda nos cabos e terra durante a partida; separar falha elétrica de motor mecanicamente pesado.'),
  jsonb_build_object('nominal_voltage','unknown_until_physical_check'),jsonb_build_object('do_not_assume_12v_or_24v',true)),
 ('BYH8J61','Bateria','starting_charging','power','needs_physical_verification',
  jsonb_build_object('nivel','GATE DE TENSÃO OBRIGATÓRIO','passo_1','Registrar quantidade, tensão individual e ligação série/paralelo.','passo_2','Testar bateria(s), terminais, cabos e aterramentos sob carga.'),
  jsonb_build_object('nominal_voltage','unknown_until_physical_check'),jsonb_build_object('do_not_assume_12v_or_24v',true)),
 ('BYH8J61','Chave de ignicao','starting','component','needs_physical_verification',
  jsonb_build_object('nivel','CONFIRMAR PINAGEM FÍSICA','passo_1','Testar entrada e saída de comando nas posições reais sem assumir terminais não identificados.'),
  '{}'::jsonb,jsonb_build_object('exact_pinout_required',true)),
 ('BYH8J61','Indicador/sensor de temperatura','engine_cooling','sensor','needs_physical_verification',
  jsonb_build_object('nivel','CONFIRMAR NA CONDUÇÃO','passo_1','Comparar indicação com medição independente.','passo_2','Testar sensor/chicote conforme a peça instalada; curva genérica não é valor exato.'),
  '{}'::jsonb,jsonb_build_object('mechanical_engine',true)),
 ('BYH8J61','Interruptor de pressao de oleo','engine_lubrication','sensor','needs_physical_verification',
  jsonb_build_object('nivel','CONFIRMAR NA CONDUÇÃO','passo_1','Testar continuidade/lógica do aviso.','passo_2','Confirmar pressão real com manômetro se houver suspeita de lubrificação.'),
  '{}'::jsonb,jsonb_build_object('mechanical_engine',true)),

 ('QSR7H50','Plugue elétrico do reboque','trailer_lighting','connector','needs_physical_verification',
  jsonb_build_object('nivel','MAPEAR FISICAMENTE','passo_1','Identificar número de vias, tensão e padrão instalado.','passo_2','Acionar posição/freio/setas e mapear cada via por medição; só então salvar pinagem.'),
  jsonb_build_object('pinout','physical_mapping_required'),jsonb_build_object('do_not_assume_connector_standard',true)),
 ('QSR7H50','Chicote principal do reboque','trailer_lighting','component','needs_physical_verification',
  jsonb_build_object('nivel','CONFIRMAR NA CARRETINHA','passo_1','Inspecionar emendas/corrosão/esmagamento e testar continuidade desenergizada.','passo_2','Com lâmpadas ligadas, medir queda de tensão; continuidade sozinha não elimina mau contato resistivo.'),
  '{}'::jsonb,jsonb_build_object('physical_wiring',true)),
 ('QSR7H50','Lanterna traseira esquerda','trailer_lighting','component','needs_physical_verification',
  jsonb_build_object('nivel','CONFIRMAR NA CARRETINHA','passo_1','Testar alimentação e aterramento sob carga. Se funções interferem entre si, priorizar o terra.'),'{}'::jsonb,jsonb_build_object('physical_wiring',true)),
 ('QSR7H50','Lanterna traseira direita','trailer_lighting','component','needs_physical_verification',
  jsonb_build_object('nivel','CONFIRMAR NA CARRETINHA','passo_1','Testar alimentação e aterramento sob carga. Se funções interferem entre si, priorizar o terra.'),'{}'::jsonb,jsonb_build_object('physical_wiring',true)),
 ('QSR7H50','Luz de placa','trailer_lighting','component','needs_physical_verification',
  jsonb_build_object('nivel','CONFIRMAR NA CARRETINHA','passo_1','Confirmar alimentação de posição e terra com carga aplicada.'),'{}'::jsonb,jsonb_build_object('physical_wiring',true))
), matched as (
 select v.company_id,v.id vehicle_id,c.id component_id,c.name,c.location_description,d.*
 from desired d
 join public.v2_vehicles v on upper(replace(coalesce(v.plate,''),'-',''))=d.plate_key
 join public.v2_vehicle_component_links l on l.vehicle_id=v.id and l.company_id=v.company_id and l.fitment_status<>'not_applicable'
 join public.v2_vehicle_components c on c.id=l.component_id and c.name=d.component_name
)
insert into public.v2_vehicle_electrical_nodes(
 company_id,vehicle_id,component_id,circuit_code,system_code,node_type,label,location_description,
 pins,electrical_spec,test_procedure,source_metadata,verification_status
)
select m.company_id,m.vehicle_id,m.component_id,m.circuit_code,m.circuit_code,m.node_type,m.name,m.location_description,
 '[]'::jsonb,m.electrical_spec,m.test_procedure,m.source_meta,m.status
from matched m
where not exists(select 1 from public.v2_vehicle_electrical_nodes n where n.vehicle_id=m.vehicle_id and n.component_id=m.component_id);

-- Atualiza também nós que já vieram do backfill genérico.
with desired(plate_key,component_name,circuit_code,node_type,status,test_procedure,electrical_spec,source_meta) as (values
 ('CPI6C79','Sensor combinado de pressao/temperatura do ar','engine_air','sensor','reference',jsonb_build_object('nivel','REFERÊNCIA DE FAMÍLIA','scanner','Pressão/temperatura e alvo x real quando disponível; pinagem exata bloqueada.'),jsonb_build_object('exact_pinout','blocked_until_variant_confirmation'),jsonb_build_object('family_reference',true)),
 ('CPI6C79','Sensor de pressao do rail','engine_fuel','sensor','reference',jsonb_build_object('nivel','REFERÊNCIA DE FAMÍLIA','scanner','Comparar rail alvo x real; não abrir linha pressurizada.'),jsonb_build_object('exact_pinout','blocked_until_variant_confirmation'),jsonb_build_object('family_reference',true,'high_pressure_warning',true)),
 ('CPI6C79','Sensor de temperatura do liquido','engine_cooling','sensor','reference',jsonb_build_object('nivel','REFERÊNCIA DE FAMÍLIA','scanner','Comparar a frio com ambiente e acompanhar aquecimento.'),'{}'::jsonb,jsonb_build_object('family_reference',true)),
 ('CPI6C79','Modulo de controle do motor (ECU)','ecu_power','ecu','reference',jsonb_build_object('nivel','REFERÊNCIA DE FAMÍLIA','passo_1','Verificar alimentação, fusível, relé, terra e comunicação antes da ECU.'),'{}'::jsonb,jsonb_build_object('family_reference',true)),
 ('CPI6C79','Alternador','starting_charging','component','reference',jsonb_build_object('nivel','REFERÊNCIA — CONFIRMAR FÍSICO','passo_1','Confirmar sistema; testar carga/quedas.'),jsonb_build_object('candidate_system_voltage_v',24),jsonb_build_object('family_reference',true)),
 ('CPI6C79','Motor de partida','starting_charging','component','reference',jsonb_build_object('nivel','REFERÊNCIA — CONFIRMAR FÍSICO','passo_1','Confirmar sistema; testar queda sob partida.'),jsonb_build_object('candidate_system_voltage_v',24),jsonb_build_object('family_reference',true)),
 ('CPI6C79','Bateria','starting_charging','power','reference',jsonb_build_object('nivel','REFERÊNCIA — CONFIRMAR FÍSICO','passo_1','Confirmar banco e testar baterias individualmente.'),'{}'::jsonb,jsonb_build_object('family_reference',true)),
 ('MBJ1166','Alternador','starting_charging','component','needs_physical_verification',jsonb_build_object('nivel','CONFIRMAR NA CONDUÇÃO','passo_1','Identificar tensão; testar carga/quedas.'),'{}'::jsonb,jsonb_build_object('mechanical_engine',true)),
 ('MBJ1166','Motor de partida','starting_charging','component','needs_physical_verification',jsonb_build_object('nivel','CONFIRMAR NA CONDUÇÃO','passo_1','Identificar tensão; testar queda sob partida.'),'{}'::jsonb,jsonb_build_object('mechanical_engine',true)),
 ('MBJ1166','Bateria','starting_charging','power','needs_physical_verification',jsonb_build_object('nivel','CONFIRMAR NA CONDUÇÃO','passo_1','Conferir banco e estado de carga.'),'{}'::jsonb,jsonb_build_object('mechanical_engine',true)),
 ('MBJ1166','Chave de ignicao','starting','component','needs_physical_verification',jsonb_build_object('nivel','CONFIRMAR PINAGEM FÍSICA','passo_1','Testar comando sem assumir pinos.'),'{}'::jsonb,jsonb_build_object('exact_pinout_required',true)),
 ('MBJ1166','Sensor/interruptor de temperatura','engine_cooling','sensor','needs_physical_verification',jsonb_build_object('nivel','CONFIRMAR NA CONDUÇÃO','passo_1','Comparar painel x temperatura real.'),'{}'::jsonb,jsonb_build_object('mechanical_engine',true)),
 ('MBJ1166','Interruptor de pressao do oleo','engine_lubrication','sensor','needs_physical_verification',jsonb_build_object('nivel','CONFIRMAR NA CONDUÇÃO','passo_1','Testar chave; manômetro para pressão real.'),'{}'::jsonb,jsonb_build_object('mechanical_engine',true)),
 ('BYH8J61','Alternador','starting_charging','component','needs_physical_verification',jsonb_build_object('nivel','GATE DE TENSÃO OBRIGATÓRIO','passo_1','Identificar sistema antes de valores absolutos.'),jsonb_build_object('nominal_voltage','unknown_until_physical_check'),jsonb_build_object('do_not_assume_12v_or_24v',true)),
 ('BYH8J61','Motor de partida','starting_charging','component','needs_physical_verification',jsonb_build_object('nivel','GATE DE TENSÃO OBRIGATÓRIO','passo_1','Identificar sistema; testar queda sob partida.'),jsonb_build_object('nominal_voltage','unknown_until_physical_check'),jsonb_build_object('do_not_assume_12v_or_24v',true)),
 ('BYH8J61','Bateria','starting_charging','power','needs_physical_verification',jsonb_build_object('nivel','GATE DE TENSÃO OBRIGATÓRIO','passo_1','Registrar quantidade/tensão/ligação.'),jsonb_build_object('nominal_voltage','unknown_until_physical_check'),jsonb_build_object('do_not_assume_12v_or_24v',true)),
 ('BYH8J61','Chave de ignicao','starting','component','needs_physical_verification',jsonb_build_object('nivel','CONFIRMAR PINAGEM FÍSICA','passo_1','Testar comando sem assumir terminais.'),'{}'::jsonb,jsonb_build_object('exact_pinout_required',true)),
 ('BYH8J61','Indicador/sensor de temperatura','engine_cooling','sensor','needs_physical_verification',jsonb_build_object('nivel','CONFIRMAR NA CONDUÇÃO','passo_1','Comparar painel x medição independente.'),'{}'::jsonb,jsonb_build_object('mechanical_engine',true)),
 ('BYH8J61','Interruptor de pressao de oleo','engine_lubrication','sensor','needs_physical_verification',jsonb_build_object('nivel','CONFIRMAR NA CONDUÇÃO','passo_1','Testar chave; manômetro para pressão real.'),'{}'::jsonb,jsonb_build_object('mechanical_engine',true)),
 ('QSR7H50','Plugue elétrico do reboque','trailer_lighting','connector','needs_physical_verification',jsonb_build_object('nivel','MAPEAR FISICAMENTE','passo_1','Mapear vias pela função acionada.'),'{}'::jsonb,jsonb_build_object('physical_wiring',true)),
 ('QSR7H50','Chicote principal do reboque','trailer_lighting','component','needs_physical_verification',jsonb_build_object('nivel','CONFIRMAR NA CARRETINHA','passo_1','Continuidade desenergizada + queda sob carga.'),'{}'::jsonb,jsonb_build_object('physical_wiring',true)),
 ('QSR7H50','Lanterna traseira esquerda','trailer_lighting','component','needs_physical_verification',jsonb_build_object('nivel','CONFIRMAR NA CARRETINHA','passo_1','Testar alimentação e terra sob carga.'),'{}'::jsonb,jsonb_build_object('physical_wiring',true)),
 ('QSR7H50','Lanterna traseira direita','trailer_lighting','component','needs_physical_verification',jsonb_build_object('nivel','CONFIRMAR NA CARRETINHA','passo_1','Testar alimentação e terra sob carga.'),'{}'::jsonb,jsonb_build_object('physical_wiring',true)),
 ('QSR7H50','Luz de placa','trailer_lighting','component','needs_physical_verification',jsonb_build_object('nivel','CONFIRMAR NA CARRETINHA','passo_1','Testar posição e terra sob carga.'),'{}'::jsonb,jsonb_build_object('physical_wiring',true))
), matched as (
 select v.id vehicle_id,c.id component_id,d.*
 from desired d join public.v2_vehicles v on upper(replace(coalesce(v.plate,''),'-',''))=d.plate_key
 join public.v2_vehicle_component_links l on l.vehicle_id=v.id and l.fitment_status<>'not_applicable'
 join public.v2_vehicle_components c on c.id=l.component_id and c.name=d.component_name
)
update public.v2_vehicle_electrical_nodes n set
 circuit_code=m.circuit_code,system_code=m.circuit_code,node_type=m.node_type,
 electrical_spec=coalesce(n.electrical_spec,'{}'::jsonb)||m.electrical_spec,
 test_procedure=coalesce(n.test_procedure,'{}'::jsonb)||m.test_procedure,
 source_metadata=coalesce(n.source_metadata,'{}'::jsonb)||m.source_meta,
 verification_status=m.status,updated_at=now()
from matched m where n.vehicle_id=m.vehicle_id and n.component_id=m.component_id;

-- Nós de arquitetura e gates que não são peças compráveis.
with veh as (
 select id,company_id,upper(replace(coalesce(plate,''),'-','')) plate_key from public.v2_vehicles
 where upper(replace(coalesce(plate,''),'-','')) in ('CPI6C79','MBJ1166','BYH8J61','QSR7H50')
), n(plate_key,reference,label,node_type,circuit_code,system_code,status,procedure,meta) as (values
 ('CPI6C79','VW-FAMILY-DLC','Conector de diagnóstico — família VW 8.150E/9.150E OD','connector','diagnostic','network','reference',jsonb_build_object('nivel','REFERÊNCIA DE FAMÍLIA','procedimento','Confirmar conector/pinagem física antes de usar adaptador e registrar módulos que respondem.'),jsonb_build_object('exact_connector','physical_confirmation_required')),
 ('CPI6C79','VW-FAMILY-POWER','Alimentação principal / fusíveis da eletrônica — família VW','power','ecu_power','electrical','reference',jsonb_build_object('nivel','REFERÊNCIA DE FAMÍLIA','procedimento','Identificar o fusível/relé na condução e medir ambos os lados sob carga; não confiar apenas em inspeção visual.'),jsonb_build_object('family_reference',true)),
 ('MBJ1166','MECH-DIESEL-NO-ECU','MWM 4.07 TCA — injeção mecânica, sem common rail assumido','other','mechanical_injection','engine_fuel','needs_physical_verification',jsonb_build_object('nivel','ARQUITETURA APLICÁVEL','procedimento','Priorizar alimentação, entrada de ar, bomba alimentadora/injetora, bicos, compressão e sincronismo; PIDs common rail não são aplicáveis.'),jsonb_build_object('no_common_rail',true,'no_engine_ecu_assumed',true)),
 ('BYH8J61','OM314-NO-ECU','OM314 — injeção mecânica, sem ECU de motor assumida','other','mechanical_injection','engine_fuel','needs_physical_verification',jsonb_build_object('nivel','ARQUITETURA APLICÁVEL','procedimento','Priorizar alimentação, bomba injetora, bicos, compressão e sincronismo; diagnóstico moderno de ECU não é aplicável.'),jsonb_build_object('no_common_rail',true,'engine_scanner_not_applicable',true)),
 ('BYH8J61','VOLTAGE-GATE','Gate de tensão nominal — 608','power','starting_charging','electrical','needs_physical_verification',jsonb_build_object('nivel','OBRIGATÓRIO','procedimento','Fotografar banco de baterias/ligação e plaquetas de alternador/partida antes de salvar tensão nominal.'),jsonb_build_object('nominal_voltage','unknown_until_physical_check')),
 ('QSR7H50','TRAILER-GROUND','Aterramento principal do reboque','ground','trailer_lighting','electrical','needs_physical_verification',jsonb_build_object('nivel','CONFIRMAR NA CARRETINHA','procedimento','Medir queda entre retorno do plugue e retorno das lanternas com cargas ligadas.'),jsonb_build_object('physical_wiring',true))
)
insert into public.v2_vehicle_electrical_nodes(
 company_id,vehicle_id,circuit_code,system_code,node_type,label,reference,pins,electrical_spec,test_procedure,source_metadata,verification_status
)
select v.company_id,v.id,n.circuit_code,n.system_code,n.node_type,n.label,n.reference,'[]'::jsonb,'{}'::jsonb,n.procedure,n.meta,n.status
from veh v join n on n.plate_key=v.plate_key
where not exists(select 1 from public.v2_vehicle_electrical_nodes e where e.vehicle_id=v.id and e.reference=n.reference);

-- Grafo funcional sem pinagem falsa.
with pairs(plate_key,circuit_code,from_label,to_label,signal_type,status,meta) as (values
 ('CPI6C79','engine_air','Sensor combinado de pressao/temperatura do ar','Modulo de controle do motor (ECU)','sensor_signal','reference',jsonb_build_object('pins_withheld_until_variant_confirmation',true)),
 ('CPI6C79','engine_fuel','Sensor de pressao do rail','Modulo de controle do motor (ECU)','sensor_signal','reference',jsonb_build_object('pins_withheld_until_variant_confirmation',true)),
 ('CPI6C79','engine_cooling','Sensor de temperatura do liquido','Modulo de controle do motor (ECU)','sensor_signal','reference',jsonb_build_object('pins_withheld_until_variant_confirmation',true)),
 ('MBJ1166','engine_cooling','Sensor/interruptor de temperatura','Painel de instrumentos','indicator_signal','needs_physical_verification',jsonb_build_object('functional_relation_only',true)),
 ('MBJ1166','starting_charging','Alternador','Bateria','charge_path','needs_physical_verification',jsonb_build_object('functional_relation_only',true)),
 ('MBJ1166','starting_charging','Bateria','Motor de partida','starter_power','needs_physical_verification',jsonb_build_object('functional_relation_only',true)),
 ('BYH8J61','engine_cooling','Indicador/sensor de temperatura','Painel de instrumentos','indicator_signal','needs_physical_verification',jsonb_build_object('functional_relation_only',true)),
 ('BYH8J61','starting_charging','Alternador','Bateria','charge_path','needs_physical_verification',jsonb_build_object('functional_relation_only',true)),
 ('BYH8J61','starting_charging','Bateria','Motor de partida','starter_power','needs_physical_verification',jsonb_build_object('functional_relation_only',true)),
 ('QSR7H50','trailer_lighting','Plugue elétrico do reboque','Chicote principal do reboque','lighting_feed','needs_physical_verification',jsonb_build_object('pins_withheld_until_physical_mapping',true)),
 ('QSR7H50','trailer_lighting','Chicote principal do reboque','Lanterna traseira esquerda','lighting_feed','needs_physical_verification',jsonb_build_object('pins_withheld_until_physical_mapping',true)),
 ('QSR7H50','trailer_lighting','Chicote principal do reboque','Lanterna traseira direita','lighting_feed','needs_physical_verification',jsonb_build_object('pins_withheld_until_physical_mapping',true))
), resolved as (
 select v.company_id,v.id vehicle_id,p.*,a.id from_id,b.id to_id
 from pairs p join public.v2_vehicles v on upper(replace(coalesce(v.plate,''),'-',''))=p.plate_key
 join public.v2_vehicle_electrical_nodes a on a.vehicle_id=v.id and a.label=p.from_label
 join public.v2_vehicle_electrical_nodes b on b.vehicle_id=v.id and b.label=p.to_label
)
insert into public.v2_vehicle_electrical_links(
 company_id,vehicle_id,circuit_code,from_node_id,to_node_id,signal_type,direction,expected_values,test_method,source_metadata,verification_status
)
select r.company_id,r.vehicle_id,r.circuit_code,r.from_id,r.to_id,r.signal_type,'bidirectional','{}'::jsonb,
 jsonb_build_object('rule','confirmar chicote/pinagem física antes de teste invasivo'),r.meta,r.status
from resolved r
where not exists(select 1 from public.v2_vehicle_electrical_links x where x.vehicle_id=r.vehicle_id and x.from_node_id=r.from_id and x.to_node_id=r.to_id and x.circuit_code=r.circuit_code);

-- Maturidade diagnóstica por arquitetura.
update public.v2_vehicle_technical_profiles p set
 source_metadata=coalesce(p.source_metadata,'{}'::jsonb)||case upper(replace(v.plate,'-',''))
  when 'CPI6C79' then jsonb_build_object('diagnostic_depth_v1',true,'diagnostic_architecture','electronic_common_rail_candidate','scanner_supported_conditionally',true,'scanner_gate','confirm exact VW/MWM variant')
  when 'MBJ1166' then jsonb_build_object('diagnostic_depth_v1',true,'diagnostic_architecture','mechanical_diesel','common_rail_not_applicable',true,'engine_scanner_not_required',true)
  when 'BYH8J61' then jsonb_build_object('diagnostic_depth_v1',true,'diagnostic_architecture','mechanical_diesel','common_rail_not_applicable',true,'engine_scanner_not_applicable',true,'nominal_voltage_status','physical_confirmation_required')
  when 'QSR7H50' then jsonb_build_object('diagnostic_depth_v1',true,'diagnostic_architecture','non_motorized_trailer','engine_diagnostics_not_applicable',true,'wiring_physical_map_required',true)
  else '{}'::jsonb end,updated_at=now()
from public.v2_vehicles v
where p.vehicle_id=v.id and upper(replace(v.plate,'-','')) in ('CPI6C79','MBJ1166','BYH8J61','QSR7H50');
