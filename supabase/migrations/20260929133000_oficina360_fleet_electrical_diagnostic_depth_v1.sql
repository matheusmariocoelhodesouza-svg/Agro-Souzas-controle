-- Oficina 360 — profundidade elétrica/diagnóstica aplicável à frota v1
-- Comil CPI6C79: arquitetura eletrônica de família VW 8.150E/9.150E OD + MWM eletrônico.
-- Volare MBJ1166 e Mercedes 608 BYH8J61: diesel mecânico; NÃO recebem arquitetura common rail/OBD artificial.
-- Trailer QSR7H50: iluminação/chicote aplicáveis.
-- Regra: referência de família nunca é promovida a confirmação física da condução.

-- 1) Fontes técnicas rastreáveis.
with v as (
  select id,company_id,upper(replace(coalesce(plate,''),'-','')) plate_key
  from public.v2_vehicles
  where upper(replace(coalesce(plate,''),'-','')) in ('CPI6C79','MBJ1166','BYH8J61','QSR7H50')
), src(plate_key,source_key,source_type,title,publisher,source_url,authority_level,applicability_status,access_status,verification_status,notes,meta) as (values
 ('CPI6C79','mwm_literatura_tecnica_412','manufacturer_literature','MWM — literatura técnica e manuais por número de série','MWM','https://www.mwm.com.br/','manufacturer','engine_family_and_serial_lookup','public_or_request','verified','Fonte do fabricante para solicitar/confirmar literatura pelo serial D1A001816. A identidade VW 9.150 EOD / MWM 4.12 TCE ainda exige confirmação física.',jsonb_build_object('engine_serial','D1A001816','usage','final_engine_family_confirmation','physical_variant_required',true)),
 ('CPI6C79','vw_8150e_9150e_od_mwm_wiring','electrical_diagram_reference','VW 8.150E OD / 9.150E OD — Motor MWM, sistema elétrico','Volkswagen/MWM family reference','https://pdfcoffee.com/8150e-od-9150e-od-motor-mwm-sistema-eletrico-pdf-pdf-free.html','technical_reference','vehicle_family_only','public_reference','reference_pending','Diagrama público da família eletrônica. Usar arquitetura/componentes como referência; não usar pinagem como exata da CPI6C79 até confirmar variante/plaqueta.',jsonb_build_object('family_reference',true,'candidate','VW 9.150 EOD / MWM 4.12 TCE','requires_physical_variant_confirmation',true,'no_exact_pin_promotion',true)),
 ('MBJ1166','mwm_sprint_407tca_manual','manufacturer_manual_reference','MWM Sprint 4.07 TCA — Manual de Operação e Manutenção 9.407.0.006.0160','MWM International','https://www.manualzz.com/doc/html/6045907/mwm-sprint-4.07-tca-operation-and-maintenance-manual','manufacturer_document_mirror','engine_family_general','public_reference','reference_pending','Manual MWM de família. O próprio manual informa que existem várias aplicações e que as instruções do fabricante do veículo prevalecem.',jsonb_build_object('document_id','9.407.0.006.0160','engine_serial','40704030141','mechanical_injection',true,'vehicle_application_requires_confirmation',true)),
 ('MBJ1166','mwm_official_literature_request','manufacturer_literature','MWM — confirmação de literatura pelo número de série','MWM','https://www.mwm.com.br/','manufacturer','engine_serial_lookup','public_or_request','verified','Usar o serial 40704030141 para buscar a literatura correta do motor instalado.',jsonb_build_object('engine_serial','40704030141','usage','final_engine_document_confirmation')),
 ('BYH8J61','mercedes_b2b_parts_wis_reference','oem_service_reference','Mercedes-Benz B2B Connect / informações técnicas e peças','Mercedes-Benz','https://b2bconnect.mercedes-benz.com/','manufacturer','vehicle_family_and_build_data','account_or_authorized_access','verified','Fonte OEM para confirmação final de aplicação elétrica/mecânica do LO 608. Dados específicos continuam dependentes de build/plaqueta.',jsonb_build_object('candidate_engine','OM314','candidate_chassis','LO 608','requires_build_confirmation',true)),
 ('BYH8J61','mb608_voltage_physical_gate','physical_verification_gate','LO 608 — tensão nominal do sistema deve ser confirmada fisicamente','Oficina 360','', 'internal_control','exact_vehicle_only','physical_check_required','reference_pending','Referências de família encontradas incluem aplicações 12 V e 24 V. O app não assume tensão até conferir quantidade/ligação das baterias, plaquetas de alternador e motor de partida.',jsonb_build_object('voltage_status','unknown_until_physical_check','do_not_assume_12v_or_24v',true)),
 ('QSR7H50','trailer_physical_wiring_gate','physical_verification_gate','Reboque QSR7H50 — padrão do plugue e tensão por inspeção','Oficina 360','', 'internal_control','exact_vehicle_only','physical_check_required','reference_pending','Confirmar fisicamente padrão/número de vias, pinagem e tensão do veículo trator antes de atribuir pinos ao plugue.',jsonb_build_object('do_not_assume_connector_standard',true,'do_not_assume_voltage',true))
)
insert into public.v2_vehicle_technical_sources(
  company_id,vehicle_id,source_key,source_type,title,publisher,source_url,authority_level,
  applicability_status,access_status,verification_status,notes,source_metadata
)
select v.company_id,v.id,s.source_key,s.source_type,s.title,s.publisher,nullif(s.source_url,''),s.authority_level,
       s.applicability_status,s.access_status,s.verification_status,s.notes,s.meta
from v join src s on s.plate_key=v.plate_key
on conflict (company_id,vehicle_id,source_key) do update set
 source_type=excluded.source_type,title=excluded.title,publisher=excluded.publisher,source_url=excluded.source_url,
 authority_level=excluded.authority_level,applicability_status=excluded.applicability_status,
 access_status=excluded.access_status,verification_status=excluded.verification_status,
 notes=excluded.notes,source_metadata=excluded.source_metadata,updated_at=now();

-- 2) Procedimentos dos componentes elétricos já vinculados ao catálogo.
-- Não há pinagem inventada: o procedimento orienta medição e mantém gate de aplicação.
with wanted(plate_key,component_name,circuit_code,node_type,status,procedure,spec,meta) as (values
 -- COMIL / candidato VW 9.150 EOD + MWM 4.12 TCE
 ('CPI6C79','Sensor combinado de pressao/temperatura do ar','engine_air','sensor','reference',
  jsonb_build_object('nivel','REFERÊNCIA DE FAMÍLIA','scanner','Comparar pressão/temperatura de admissão com condição real e, quando disponível, pressão solicitada x real.','eletrico','Com diagrama da variante confirmado, verificar alimentação de referência, terra e sinais; não atribuir pinos pela memória.','seguranca','Não perfurar chicote sem método apropriado.','fonte_diagnostico','VW 8.150E/9.150E OD MWM — diagrama de família'),
  jsonb_build_object('architecture','combined_intake_pressure_temperature_sensor','exact_pinout','blocked_until_variant_confirmation'),
  jsonb_build_object('family_reference',true,'requires_physical_variant_confirmation',true)),
 ('CPI6C79','Sensor de pressao do rail','engine_fuel','sensor','reference',
  jsonb_build_object('nivel','REFERÊNCIA DE FAMÍLIA','scanner','Comparar pressão de rail solicitada x real na partida, lenta e carga.','eletrico','Se a leitura for incoerente, confirmar alimentação/referência, terra e sinal segundo o diagrama confirmado.','seguranca','Common rail trabalha em alta pressão: não abrir linha com sistema pressurizado.','fonte_diagnostico','VW/MWM família eletrônica'),
  jsonb_build_object('architecture','common_rail_pressure_sensor','exact_pinout','blocked_until_variant_confirmation'),
  jsonb_build_object('family_reference',true,'high_pressure_warning',true)),
 ('CPI6C79','Sensor de temperatura do liquido','engine_cooling','sensor','reference',
  jsonb_build_object('nivel','REFERÊNCIA DE FAMÍLIA','scanner','Após repouso, comparar temperatura lida com ambiente plausível e observar subida contínua no aquecimento.','eletrico','Se incoerente, testar sensor/chicote conforme diagrama confirmado; resistência somente com circuito desenergizado.','fonte_diagnostico','VW/MWM família eletrônica'),
  jsonb_build_object('sensor_behavior','temperature_sensor','exact_curve','requires_exact_part_or_manual'),
  jsonb_build_object('family_reference',true)),
 ('CPI6C79','Modulo de controle do motor (ECU)','ecu_power','ecu','reference',
  jsonb_build_object('nivel','REFERÊNCIA DE FAMÍLIA','passo_1','Antes de condenar ECU, verificar bateria/banco, fusíveis, relés, alimentações e aterramentos sob carga.','passo_2','Confirmar comunicação e DTCs; falha de comunicação não prova ECU defeituosa.','fonte_diagnostico','VW 8.150E/9.150E OD MWM — diagrama de família'),
  jsonb_build_object('module_family','J248/reference','exact_connector_pinout','blocked_until_variant_confirmation'),
  jsonb_build_object('family_reference',true,'candidate_variant_only',true)),
 ('CPI6C79','Alternador','starting_charging','component','reference',
  jsonb_build_object('nivel','REFERÊNCIA / CONFIRMAR 24 V FÍSICO','passo_1','Confirmar fisicamente configuração das baterias e tensão nominal antes de avaliar valores absolutos.','passo_2','Medir tensão em repouso e em carga, queda de tensão B+ e terra, correia e conexões.','fonte_diagnostico','arquitetura VW candidata + procedimento elétrico geral'),
  jsonb_build_object('candidate_system_voltage_v',24,'candidate_alternator_v',28,'exact_vehicle_confirmation_required',true),
  jsonb_build_object('family_reference',true)),
 ('CPI6C79','Motor de partida','starting_charging','component','reference',
  jsonb_build_object('nivel','REFERÊNCIA / CONFIRMAR 24 V FÍSICO','passo_1','Confirmar banco de baterias e tensão nominal.','passo_2','Durante a partida medir queda nos cabos positivo/terra e observar velocidade do motor; corrente alta com giro lento exige investigar cabos, motor e mecânica.','fonte_diagnostico','procedimento elétrico geral'),
  jsonb_build_object('candidate_system_voltage_v',24,'exact_vehicle_confirmation_required',true),
  jsonb_build_object('family_reference',true)),
 ('CPI6C79','Bateria','starting_charging','power','reference',
  jsonb_build_object('nivel','REFERÊNCIA / CONFIRMAR BANCO FÍSICO','passo_1','Conferir quantidade, tensão individual, ligação série/paralelo e estado dos terminais.','passo_2','Testar cada bateria individualmente antes de culpar partida/alternador.','fonte_diagnostico','arquitetura VW candidata'),
  jsonb_build_object('candidate_configuration','2 x 12 V em série','exact_vehicle_confirmation_required',true),
  jsonb_build_object('family_reference',true)),
 -- VOLARE / MWM 4.07 TCA mecânico
 ('MBJ1166','Alternador','starting_charging','component','needs_physical_verification',
  jsonb_build_object('nivel','CONFIRMAR NA CONDUÇÃO','passo_1','Identificar tensão nominal pelas baterias e plaqueta do alternador.','passo_2','Verificar correia, conexões, B+ e terra; medir tensão antes/durante/depois da partida e queda de tensão sob carga.','fonte_diagnostico','MWM Sprint + procedimento elétrico geral'),
  jsonb_build_object('engine_family','MWM Sprint 4.07 TCA','nominal_voltage','physical_check_required'),
  jsonb_build_object('mechanical_engine',true)),
 ('MBJ1166','Motor de partida','starting_charging','component','needs_physical_verification',
  jsonb_build_object('nivel','CONFIRMAR NA CONDUÇÃO','passo_1','Identificar tensão nominal do sistema.','passo_2','Medir alimentação e queda de tensão durante a partida; observar velocidade de arranque. O manual MWM limita tentativas prolongadas e exige intervalo entre tentativas.','fonte_diagnostico','MWM Sprint 4.07 TCA manual'),
  jsonb_build_object('engine_family','MWM Sprint 4.07 TCA','nominal_voltage','physical_check_required'),
  jsonb_build_object('mechanical_engine',true)),
 ('MBJ1166','Bateria','starting_charging','power','needs_physical_verification',
  jsonb_build_object('nivel','CONFIRMAR NA CONDUÇÃO','passo_1','Conferir tensão nominal, quantidade/ligação, terminais e estado de carga.','passo_2','Testar bateria(s) sob carga e quedas nos cabos antes de condenar motor de partida.','fonte_diagnostico','procedimento elétrico geral'),
  jsonb_build_object('nominal_voltage','physical_check_required'),jsonb_build_object('mechanical_engine',true)),
 ('MBJ1166','Chave de ignicao','starting','component','needs_physical_verification',
  jsonb_build_object('nivel','CONFIRMAR NA CONDUÇÃO','passo_1','Confirmar alimentação de entrada e saída de comando durante a posição de partida.','passo_2','Se não houver comando, seguir continuidade até relé/solenoide conforme chicote instalado.','fonte_diagnostico','diagnóstico funcional; pinagem física pendente'),
  '{}'::jsonb,jsonb_build_object('exact_pinout_required',true)),
 ('MBJ1166','Sensor/interruptor de temperatura','engine_cooling','sensor','needs_physical_verification',
  jsonb_build_object('nivel','CONFIRMAR NA CONDUÇÃO','passo_1','Comparar indicação do painel com temperatura real do motor e verificar continuidade/chicote.','passo_2','Se for sensor resistivo, medir somente desenergizado e comparar com curva da peça exata.','fonte_diagnostico','MWM Sprint + peça instalada'),
  jsonb_build_object('exact_sensor_type','physical_check_required'),jsonb_build_object('mechanical_engine',true)),
 ('MBJ1166','Interruptor de pressao do oleo','engine_lubrication','sensor','needs_physical_verification',
  jsonb_build_object('nivel','CONFIRMAR NA CONDUÇÃO','passo_1','Com ignição ligada/motor parado verificar lógica da lâmpada e continuidade do interruptor.','passo_2','Se houver dúvida de pressão real, usar manômetro mecânico no ponto apropriado; não assumir defeito do interruptor.','fonte_diagnostico','MWM Sprint + procedimento funcional'),
  jsonb_build_object('type','oil_pressure_switch_candidate'),jsonb_build_object('mechanical_engine',true)),
 -- MERCEDES 608 / OM314 mecânico
 ('BYH8J61','Alternador','starting_charging','component','needs_physical_verification',
  jsonb_build_object('nivel','GATE DE TENSÃO OBRIGATÓRIO','passo_1','Antes de qualquer valor absoluto, identificar fisicamente o sistema: quantidade/ligação das baterias e plaqueta do alternador.','passo_2','Depois, testar carga, correia, conexões, queda de tensão B+ e terra conforme a tensão confirmada.','fonte_diagnostico','Mercedes família LO608 + verificação física'),
  jsonb_build_object('nominal_voltage','unknown_until_physical_check'),jsonb_build_object('do_not_assume_12v_or_24v',true)),
 ('BYH8J61','Motor de partida','starting_charging','component','needs_physical_verification',
  jsonb_build_object('nivel','GATE DE TENSÃO OBRIGATÓRIO','passo_1','Identificar tensão na plaqueta/instalação antes de aplicar especificação.','passo_2','Medir queda de tensão nos cabos e aterramento durante a partida; distinguir arranque elétrico lento de motor mecanicamente pesado.','fonte_diagnostico','Mercedes LO608 + verificação física'),
  jsonb_build_object('nominal_voltage','unknown_until_physical_check'),jsonb_build_object('do_not_assume_12v_or_24v',true)),
 ('BYH8J61','Bateria','starting_charging','power','needs_physical_verification',
  jsonb_build_object('nivel','GATE DE TENSÃO OBRIGATÓRIO','passo_1','Registrar quantidade, tensão individual e ligação série/paralelo.','passo_2','Testar terminais, cabos, aterramentos e bateria(s) sob carga.','fonte_diagnostico','verificação física da BYH8J61'),
  jsonb_build_object('nominal_voltage','unknown_until_physical_check'),jsonb_build_object('do_not_assume_12v_or_24v',true)),
 ('BYH8J61','Chave de ignicao','starting','component','needs_physical_verification',
  jsonb_build_object('nivel','CONFIRMAR PINAGEM FÍSICA','passo_1','Testar entrada e saída de comando nas posições desligado/ligado/partida sem assumir número de terminal além dos marcados fisicamente.','passo_2','Seguir circuito até solenoide/relé conforme a instalação real.','fonte_diagnostico','diagnóstico funcional'),
  '{}'::jsonb,jsonb_build_object('exact_pinout_required',true)),
 ('BYH8J61','Indicador/sensor de temperatura','engine_cooling','sensor','needs_physical_verification',
  jsonb_build_object('nivel','CONFIRMAR NA CONDUÇÃO','passo_1','Comparar indicação do painel com temperatura medida independentemente.','passo_2','Testar chicote e sensor compatível com a peça instalada; não aplicar curva genérica como valor exato.','fonte_diagnostico','OM314/LO608 + peça física'),
  jsonb_build_object('exact_sensor_curve','physical_part_required'),jsonb_build_object('mechanical_engine',true)),
 ('BYH8J61','Interruptor de pressao de oleo','engine_lubrication','sensor','needs_physical_verification',
  jsonb_build_object('nivel','CONFIRMAR NA CONDUÇÃO','passo_1','Testar lógica da lâmpada/continuidade do interruptor.','passo_2','Confirmar pressão real com manômetro mecânico se houver suspeita de lubrificação.','fonte_diagnostico','OM314 + procedimento funcional'),
  jsonb_build_object('type','oil_pressure_switch_candidate'),jsonb_build_object('mechanical_engine',true)),
 -- TRAILER
 ('QSR7H50','Plugue elétrico do reboque','trailer_lighting','connector','needs_physical_verification',
  jsonb_build_object('nivel','CONFIRMAR PADRÃO DO PLUGUE','passo_1','Identificar fisicamente número de vias, padrão e tensão do veículo trator.','passo_2','Com cada função acionada, mapear posição/freio/seta/terra por medição; salvar o mapa somente depois da confirmação.','fonte_diagnostico','inspeção física QSR7H50'),
  jsonb_build_object('pinout','physical_mapping_required'),jsonb_build_object('do_not_assume_connector_standard',true)),
 ('QSR7H50','Chicote principal do reboque','trailer_lighting','wire','needs_physical_verification',
  jsonb_build_object('nivel','CONFIRMAR NA CARRETINHA','passo_1','Inspecionar esmagamento/emendas/corrosão e continuidade ponta a ponta com circuito desenergizado.','passo_2','Com carga ligada, medir queda de tensão e qualidade do aterramento; continuidade sem carga não elimina mau contato resistivo.','fonte_diagnostico','procedimento funcional'),
  '{}'::jsonb,jsonb_build_object('physical_wiring',true)),
 ('QSR7H50','Lanterna traseira esquerda','trailer_lighting','component','needs_physical_verification',
  jsonb_build_object('nivel','CONFIRMAR NA CARRETINHA','passo_1','Verificar função que falha, alimentação no soquete/módulo e aterramento sob carga.','passo_2','Se várias funções interferem entre si, priorizar teste de aterramento antes de substituir lanterna.','fonte_diagnostico','procedimento funcional'),
  '{}'::jsonb,jsonb_build_object('physical_wiring',true)),
 ('QSR7H50','Lanterna traseira direita','trailer_lighting','component','needs_physical_verification',
  jsonb_build_object('nivel','CONFIRMAR NA CARRETINHA','passo_1','Verificar função que falha, alimentação no soquete/módulo e aterramento sob carga.','passo_2','Se várias funções interferem entre si, priorizar teste de aterramento antes de substituir lanterna.','fonte_diagnostico','procedimento funcional'),
  '{}'::jsonb,jsonb_build_object('physical_wiring',true)),
 ('QSR7H50','Luz de placa','trailer_lighting','component','needs_physical_verification',
  jsonb_build_object('nivel','CONFIRMAR NA CARRETINHA','passo_1','Confirmar alimentação da posição, soquete/LED e terra.','passo_2','Medir tensão com carga aplicada para detectar resistência em emenda/conector.','fonte_diagnostico','procedimento funcional'),
  '{}'::jsonb,jsonb_build_object('physical_wiring',true))
), matched as (
 select v.company_id,v.id vehicle_id,c.id component_id,w.*
 from wanted w
 join public.v2_vehicles v on upper(replace(coalesce(v.plate,''),'-',''))=w.plate_key
 join public.v2_vehicle_component_links l on l.vehicle_id=v.id and l.company_id=v.company_id and l.fitment_status<>'not_applicable'
 join public.v2_vehicle_components c on c.id=l.component_id and c.name=w.component_name
)
update public.v2_vehicle_electrical_nodes n set
 circuit_code=m.circuit_code,system_code=m.circuit_code,node_type=m.node_type,
 test_procedure=m.procedure,electrical_spec=coalesce(n.electrical_spec,'{}'::jsonb)||m.spec,
 source_metadata=coalesce(n.source_metadata,'{}'::jsonb)||m.meta,
 verification_status=m.status,updated_at=now()
from matched m
where n.vehicle_id=m.vehicle_id and n.component_id=m.component_id;

with wanted(plate_key,component_name,circuit_code,node_type,status,procedure,spec,meta) as (values
 ('CPI6C79','Sensor combinado de pressao/temperatura do ar','engine_air','sensor','reference',jsonb_build_object('nivel','REFERÊNCIA DE FAMÍLIA','scanner','Comparar pressão/temperatura no scanner; pinagem exata bloqueada até confirmar variante.'),jsonb_build_object('exact_pinout','blocked_until_variant_confirmation'),jsonb_build_object('family_reference',true)),
 ('CPI6C79','Sensor de pressao do rail','engine_fuel','sensor','reference',jsonb_build_object('nivel','REFERÊNCIA DE FAMÍLIA','scanner','Comparar rail solicitado x real; não abrir common rail pressurizado.'),jsonb_build_object('exact_pinout','blocked_until_variant_confirmation'),jsonb_build_object('family_reference',true)),
 ('CPI6C79','Sensor de temperatura do liquido','engine_cooling','sensor','reference',jsonb_build_object('nivel','REFERÊNCIA DE FAMÍLIA','scanner','Comparar leitura fria com ambiente e acompanhar aquecimento.'),'{}'::jsonb,jsonb_build_object('family_reference',true)),
 ('CPI6C79','Modulo de controle do motor (ECU)','ecu_power','ecu','reference',jsonb_build_object('nivel','REFERÊNCIA DE FAMÍLIA','passo_1','Confirmar fusíveis, relés, alimentação e terras antes de condenar ECU.'),jsonb_build_object('exact_pinout','blocked_until_variant_confirmation'),jsonb_build_object('family_reference',true)),
 ('CPI6C79','Alternador','starting_charging','component','reference',jsonb_build_object('nivel','REFERÊNCIA / CONFIRMAR FÍSICO','passo_1','Confirmar banco/tensão; depois medir carga e quedas.'),jsonb_build_object('candidate_system_voltage_v',24),jsonb_build_object('family_reference',true)),
 ('CPI6C79','Motor de partida','starting_charging','component','reference',jsonb_build_object('nivel','REFERÊNCIA / CONFIRMAR FÍSICO','passo_1','Confirmar banco/tensão; medir queda sob partida.'),jsonb_build_object('candidate_system_voltage_v',24),jsonb_build_object('family_reference',true)),
 ('CPI6C79','Bateria','starting_charging','power','reference',jsonb_build_object('nivel','REFERÊNCIA / CONFIRMAR FÍSICO','passo_1','Confirmar quantidade/ligação e testar individualmente.'),jsonb_build_object('candidate_configuration','2 x 12 V em série'),jsonb_build_object('family_reference',true)),
 ('MBJ1166','Alternador','starting_charging','component','needs_physical_verification',jsonb_build_object('nivel','CONFIRMAR NA CONDUÇÃO','passo_1','Identificar tensão e testar carga/quedas.'),jsonb_build_object('nominal_voltage','physical_check_required'),jsonb_build_object('mechanical_engine',true)),
 ('MBJ1166','Motor de partida','starting_charging','component','needs_physical_verification',jsonb_build_object('nivel','CONFIRMAR NA CONDUÇÃO','passo_1','Identificar tensão e testar queda sob partida.'),jsonb_build_object('nominal_voltage','physical_check_required'),jsonb_build_object('mechanical_engine',true)),
 ('MBJ1166','Bateria','starting_charging','power','needs_physical_verification',jsonb_build_object('nivel','CONFIRMAR NA CONDUÇÃO','passo_1','Conferir banco e estado de carga.'),jsonb_build_object('nominal_voltage','physical_check_required'),jsonb_build_object('mechanical_engine',true)),
 ('MBJ1166','Chave de ignicao','starting','component','needs_physical_verification',jsonb_build_object('nivel','CONFIRMAR PINAGEM FÍSICA','passo_1','Testar entrada/saída de comando sem assumir pinos.'),'{}'::jsonb,jsonb_build_object('exact_pinout_required',true)),
 ('MBJ1166','Sensor/interruptor de temperatura','engine_cooling','sensor','needs_physical_verification',jsonb_build_object('nivel','CONFIRMAR NA CONDUÇÃO','passo_1','Comparar painel x temperatura real; testar curva apenas da peça exata.'),'{}'::jsonb,jsonb_build_object('mechanical_engine',true)),
 ('MBJ1166','Interruptor de pressao do oleo','engine_lubrication','sensor','needs_physical_verification',jsonb_build_object('nivel','CONFIRMAR NA CONDUÇÃO','passo_1','Testar interruptor e confirmar pressão real com manômetro se necessário.'),'{}'::jsonb,jsonb_build_object('mechanical_engine',true)),
 ('BYH8J61','Alternador','starting_charging','component','needs_physical_verification',jsonb_build_object('nivel','GATE DE TENSÃO OBRIGATÓRIO','passo_1','Identificar banco/plaqueta antes de valores absolutos.'),jsonb_build_object('nominal_voltage','unknown_until_physical_check'),jsonb_build_object('do_not_assume_12v_or_24v',true)),
 ('BYH8J61','Motor de partida','starting_charging','component','needs_physical_verification',jsonb_build_object('nivel','GATE DE TENSÃO OBRIGATÓRIO','passo_1','Identificar tensão antes de testar quedas sob partida.'),jsonb_build_object('nominal_voltage','unknown_until_physical_check'),jsonb_build_object('do_not_assume_12v_or_24v',true)),
 ('BYH8J61','Bateria','starting_charging','power','needs_physical_verification',jsonb_build_object('nivel','GATE DE TENSÃO OBRIGATÓRIO','passo_1','Registrar quantidade/tensão/ligação antes de diagnosticar.'),jsonb_build_object('nominal_voltage','unknown_until_physical_check'),jsonb_build_object('do_not_assume_12v_or_24v',true)),
 ('BYH8J61','Chave de ignicao','starting','component','needs_physical_verification',jsonb_build_object('nivel','CONFIRMAR PINAGEM FÍSICA','passo_1','Testar comando sem assumir terminais não marcados.'),'{}'::jsonb,jsonb_build_object('exact_pinout_required',true)),
 ('BYH8J61','Indicador/sensor de temperatura','engine_cooling','sensor','needs_physical_verification',jsonb_build_object('nivel','CONFIRMAR NA CONDUÇÃO','passo_1','Comparar painel x medição independente; curva somente da peça exata.'),'{}'::jsonb,jsonb_build_object('mechanical_engine',true)),
 ('BYH8J61','Interruptor de pressao de oleo','engine_lubrication','sensor','needs_physical_verification',jsonb_build_object('nivel','CONFIRMAR NA CONDUÇÃO','passo_1','Testar chave e confirmar pressão com manômetro se necessário.'),'{}'::jsonb,jsonb_build_object('mechanical_engine',true)),
 ('QSR7H50','Plugue elétrico do reboque','trailer_lighting','connector','needs_physical_verification',jsonb_build_object('nivel','CONFIRMAR PADRÃO DO PLUGUE','passo_1','Mapear fisicamente cada via com a função acionada.'),jsonb_build_object('pinout','physical_mapping_required'),jsonb_build_object('do_not_assume_connector_standard',true)),
 ('QSR7H50','Chicote principal do reboque','trailer_lighting','wire','needs_physical_verification',jsonb_build_object('nivel','CONFIRMAR NA CARRETINHA','passo_1','Continuidade desenergizada e queda de tensão sob carga.'),'{}'::jsonb,jsonb_build_object('physical_wiring',true)),
 ('QSR7H50','Lanterna traseira esquerda','trailer_lighting','component','needs_physical_verification',jsonb_build_object('nivel','CONFIRMAR NA CARRETINHA','passo_1','Testar alimentação e terra sob carga.'),'{}'::jsonb,jsonb_build_object('physical_wiring',true)),
 ('QSR7H50','Lanterna traseira direita','trailer_lighting','component','needs_physical_verification',jsonb_build_object('nivel','CONFIRMAR NA CARRETINHA','passo_1','Testar alimentação e terra sob carga.'),'{}'::jsonb,jsonb_build_object('physical_wiring',true)),
 ('QSR7H50','Luz de placa','trailer_lighting','component','needs_physical_verification',jsonb_build_object('nivel','CONFIRMAR NA CARRETINHA','passo_1','Testar alimentação da posição e terra sob carga.'),'{}'::jsonb,jsonb_build_object('physical_wiring',true))
), matched as (
 select v.company_id,v.id vehicle_id,c.id component_id,c.location_description,c.name,w.*
 from wanted w
 join public.v2_vehicles v on upper(replace(coalesce(v.plate,''),'-',''))=w.plate_key
 join public.v2_vehicle_component_links l on l.vehicle_id=v.id and l.company_id=v.company_id and l.fitment_status<>'not_applicable'
 join public.v2_vehicle_components c on c.id=l.component_id and c.name=w.component_name
)
insert into public.v2_vehicle_electrical_nodes(
 company_id,vehicle_id,component_id,circuit_code,system_code,node_type,label,reference,
 location_description,pins,electrical_spec,test_procedure,source_metadata,verification_status
)
select m.company_id,m.vehicle_id,m.component_id,m.circuit_code,m.circuit_code,m.node_type,m.name,null,
       m.location_description,'[]'::jsonb,m.spec,m.procedure,m.meta,m.status
from matched m
where not exists(select 1 from public.v2_vehicle_electrical_nodes n where n.vehicle_id=m.vehicle_id and n.component_id=m.component_id);

-- 3) Nós funcionais sem uma peça de catálogo específica.
with v as (
 select id,company_id,upper(replace(coalesce(plate,''),'-','')) plate_key
 from public.v2_vehicles where upper(replace(coalesce(plate,''),'-','')) in ('CPI6C79','MBJ1166','BYH8J61','QSR7H50')
), n(plate_key,reference,label,node_type,circuit_code,system_code,status,procedure,meta) as (values
 ('CPI6C79','VW-FAMILY-DLC','Conector de diagnóstico — família VW 8.150E/9.150E OD','connector','diagnostic','network','reference',jsonb_build_object('nivel','REFERÊNCIA DE FAMÍLIA','procedimento','Confirmar formato/pinagem física antes de conectar adaptador; registrar comunicação e módulos presentes.'),jsonb_build_object('exact_connector','physical_confirmation_required')),
 ('CPI6C79','VW-FAMILY-POWER','Alimentação principal / caixa de fusíveis — família VW','power','ecu_power','electrical','reference',jsonb_build_object('nivel','REFERÊNCIA DE FAMÍLIA','procedimento','Confirmar fusíveis/relés identificados no veículo e medir tensão nos dois lados do fusível sob carga.'),jsonb_build_object('family_reference',true)),
 ('MBJ1166','MECH-DIESEL-NO-ECU','Motor MWM 4.07 TCA — arquitetura mecânica de injeção','other','mechanical_injection','engine_fuel','needs_physical_verification',jsonb_build_object('nivel','ARQUITETURA APLICÁVEL','procedimento','Diagnóstico de combustível é por alimentação, ar na linha, bomba/injetores/sincronismo mecânico; não exigir PIDs common rail.'),jsonb_build_object('no_common_rail',true,'no_engine_ecu_assumed',true)),
 ('BYH8J61','OM314-NO-ECU','Motor OM314 — arquitetura de injeção mecânica','other','mechanical_injection','engine_fuel','needs_physical_verification',jsonb_build_object('nivel','ARQUITETURA APLICÁVEL','procedimento','Diagnóstico por alimentação de combustível, bomba injetora, injetores, compressão e sincronismo; não exigir scanner de ECU.'),jsonb_build_object('no_common_rail',true,'no_engine_ecu_assumed',true)),
 ('BYH8J61','VOLTAGE-GATE','Gate de tensão nominal — 608','power','starting_charging','electrical','needs_physical_verification',jsonb_build_object('nivel','OBRIGATÓRIO','procedimento','Antes de usar qualquer valor 12/24/28 V, fotografar baterias/ligação e plaquetas de alternador/partida; salvar confirmação no dossiê.'),jsonb_build_object('nominal_voltage','unknown_until_physical_check')),
 ('QSR7H50','TRAILER-GROUND','Aterramento principal do reboque','ground','trailer_lighting','electrical','needs_physical_verification',jsonb_build_object('nivel','CONFIRMAR NA CARRETINHA','procedimento','Medir queda entre terra do veículo trator/plugue e carcaça/retorno das lanternas com cargas ligadas.'),jsonb_build_object('physical_wiring',true))
)
insert into public.v2_vehicle_electrical_nodes(
 company_id,vehicle_id,circuit_code,system_code,node_type,label,reference,location_description,
 pins,electrical_spec,test_procedure,source_metadata,verification_status
)
select v.company_id,v.id,n.circuit_code,n.system_code,n.node_type,n.label,n.reference,null,
       '[]'::jsonb,'{}'::jsonb,n.procedure,n.meta,n.status
from v join n on n.plate_key=v.plate_key
where not exists(select 1 from public.v2_vehicle_electrical_nodes e where e.vehicle_id=v.id and e.reference=n.reference);

-- 4) Grafo funcional sem pinagem falsa.
with pairs(plate_key,circuit_code,from_label,to_label,signal_type,status,meta) as (values
 ('CPI6C79','engine_air','Sensor combinado de pressao/temperatura do ar','Modulo de controle do motor (ECU)','sensor_signal','reference',jsonb_build_object('family_reference',true,'pins_withheld_until_variant_confirmation',true)),
 ('CPI6C79','engine_fuel','Sensor de pressao do rail','Modulo de controle do motor (ECU)','sensor_signal','reference',jsonb_build_object('family_reference',true,'pins_withheld_until_variant_confirmation',true)),
 ('CPI6C79','engine_cooling','Sensor de temperatura do liquido','Modulo de controle do motor (ECU)','sensor_signal','reference',jsonb_build_object('family_reference',true,'pins_withheld_until_variant_confirmation',true)),
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
 select v.company_id,v.id vehicle_id,p.*,
        a.id from_id,b.id to_id
 from pairs p
 join public.v2_vehicles v on upper(replace(coalesce(v.plate,''),'-',''))=p.plate_key
 join public.v2_vehicle_electrical_nodes a on a.vehicle_id=v.id and a.label=p.from_label
 join public.v2_vehicle_electrical_nodes b on b.vehicle_id=v.id and b.label=p.to_label
)
insert into public.v2_vehicle_electrical_links(
 company_id,vehicle_id,circuit_code,from_node_id,to_node_id,signal_type,direction,
 expected_values,test_method,source_metadata,verification_status
)
select r.company_id,r.vehicle_id,r.circuit_code,r.from_id,r.to_id,r.signal_type,'bidirectional',
       '{}'::jsonb,jsonb_build_object('rule','confirm physical wiring/pinout before invasive test'),r.meta,r.status
from resolved r
where not exists(
 select 1 from public.v2_vehicle_electrical_links x
 where x.vehicle_id=r.vehicle_id and x.from_node_id=r.from_id and x.to_node_id=r.to_id and x.circuit_code=r.circuit_code
);

-- 5) Perfil deixa explícita a maturidade diagnóstica e o tipo de arquitetura.
update public.v2_vehicle_technical_profiles p set
 source_metadata=coalesce(p.source_metadata,'{}'::jsonb)||case upper(replace(v.plate,'-',''))
  when 'CPI6C79' then jsonb_build_object('diagnostic_depth_v1',true,'diagnostic_architecture','electronic_common_rail_candidate','scanner_supported_conditionally',true,'scanner_gate','confirm VW/MWM exact variant first')
  when 'MBJ1166' then jsonb_build_object('diagnostic_depth_v1',true,'diagnostic_architecture','mechanical_diesel','common_rail_not_applicable',true,'engine_scanner_not_required',true)
  when 'BYH8J61' then jsonb_build_object('diagnostic_depth_v1',true,'diagnostic_architecture','mechanical_diesel','common_rail_not_applicable',true,'engine_scanner_not_applicable',true,'nominal_voltage_status','physical_confirmation_required')
  when 'QSR7H50' then jsonb_build_object('diagnostic_depth_v1',true,'diagnostic_architecture','non_motorized_trailer','engine_diagnostics_not_applicable',true,'trailer_wiring_physical_map_required',true)
  else '{}'::jsonb end,
 updated_at=now()
from public.v2_vehicles v
where p.vehicle_id=v.id and upper(replace(v.plate,'-','')) in ('CPI6C79','MBJ1166','BYH8J61','QSR7H50');
