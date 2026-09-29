-- Oficina 360 — árvores por sintoma específicas da frota v1.
-- Cada roteiro respeita a arquitetura real/candidata de cada condução.
-- Nenhum roteiro condena peça por DTC ou por sintoma isolado.

with veh as (
 select id,company_id,upper(replace(coalesce(plate,''),'-','')) plate_key
 from public.v2_vehicles
 where upper(replace(coalesce(plate,''),'-','')) in ('CPI6C79','MBJ1166','BYH8J61','QSR7H50')
), p(plate_key,symptom_key,title,category,aliases,description,related_dtcs,ordered_tests,likely_causes,source_meta,status) as (values
-- COMIL: eletrônica/common rail SOMENTE como arquitetura candidata de família.
('CPI6C79','loss_of_power_limp','Comil CPI6C79 — perda de força / modo de emergência','engine_performance',
 array['comil perde força','onibus perde força','turbo corta','modo emergência','não desenvolve','corta potência'],
 'Roteiro eletrônico condicionado à confirmação da variante VW/MWM. Prioriza evidência do scanner e integridade física antes de substituir turbo, sensor ou injeção.',
 array['P0299','P0234','P0105','P0106','P0190','P0191'],
 '[
  {"key":"comil_variant_gate","action":"Confirmar na plaqueta/identificação se a arquitetura eletrônica instalada corresponde à família VW/MWM cadastrada. Se não corresponder, parar o uso de pinagens/especificações de família e registrar a variante real.","expected":"Variante eletrônica identificada","candidate_if_fail":["variante técnica ainda não confirmada"],"next_on_pass":1,"next_on_fail":8},
  {"key":"comil_scan_context","action":"Registrar DTCs, freeze frame, RPM, carga e acelerador na condição da perda de força. Não apagar memória antes do registro.","expected":"Condição e códigos capturados","scanner_pids":["engine_rpm","engine_load_percent","accelerator_percent","vehicle_speed_kmh"],"next_on_pass":2,"next_on_fail":2},
  {"key":"comil_intake_leak","action":"Inspecionar filtro, mangotes, turbo, intercooler e abraçadeiras por restrição ou fuga de pressurização.","expected":"Admissão estanque e sem restrição","candidate_if_fail":["restrição de admissão","vazamento de pressurização"],"next_on_pass":3,"next_on_fail":8},
  {"key":"comil_boost","action":"Se os PIDs estiverem disponíveis no scanner compatível, comparar pressão de admissão solicitada x real sob carga. Se não houver PID, medir conforme ferramenta/procedimento aplicável.","expected":"Pressão real acompanha a solicitada de modo plausível","scanner_pids":["intake_pressure_target_kpa_abs","intake_pressure_actual_kpa_abs","engine_rpm","engine_load_percent"],"scanner_compare":{"type":"target_actual_delta","target":"intake_pressure_target_kpa_abs","actual":"intake_pressure_actual_kpa_abs"},"related_terms":["pressão de admissão","turbo","map"],"candidate_if_fail":["controle do turbo","vazamento","sensor de pressão/temperatura do ar"],"next_on_pass":4,"next_on_fail":8},
  {"key":"comil_air_sensor","action":"Conferir coerência do sensor combinado de pressão/temperatura da admissão e abrir o Mapa Elétrico se houver leitura incoerente.","expected":"Leituras plausíveis e circuito íntegro","scanner_pids":["intake_pressure_actual_kpa_abs","iat_c"],"related_terms":["sensor combinado","pressão","temperatura do ar"],"candidate_if_fail":["sensor/circuito de admissão"],"next_on_pass":5,"next_on_fail":8},
  {"key":"comil_rail","action":"Comparar pressão de rail solicitada x real durante a falha. Não abrir linhas de alta pressão durante este diagnóstico.","expected":"Rail real acompanha o solicitado","scanner_pids":["rail_pressure_target_bar","rail_pressure_actual_bar","engine_rpm","engine_load_percent"],"scanner_compare":{"type":"target_actual_delta","target":"rail_pressure_target_bar","actual":"rail_pressure_actual_bar"},"related_terms":["rail","pressão de combustível"],"candidate_if_fail":["alimentação de baixa","controle/sensor do rail","retorno excessivo"],"next_on_pass":6,"next_on_fail":8},
  {"key":"comil_power_ground","action":"Testar banco de baterias, alimentação, fusíveis/relés e aterramentos dos circuitos que apresentaram anomalia; pinagem somente após confirmação da variante.","expected":"Alimentações e terras estáveis","candidate_if_fail":["queda de tensão","mau contato","fusível/relé/chicote"],"next_on_pass":7,"next_on_fail":8},
  {"key":"comil_confirm_power","action":"Após o reparo, repetir a mesma condição de carga e confirmar potência normal, dados coerentes e ausência de DTC recorrente.","expected":"Falha não retorna"},
  {"key":"comil_hold","action":"Há evidência que exige correção/identificação antes de avançar. Corrigir a anomalia encontrada e repetir o teste que falhou.","expected":"Anomalia corrigida e teste repetido"}
 ]'::jsonb,
 '["vazamento/restrição de ar","controle de turbo","sensor/circuito de admissão","pressão/fornecimento de combustível","alimentação/terra","variante técnica incorreta"]'::jsonb,
 jsonb_build_object('vehicle','CPI6C79','architecture','electronic_common_rail_candidate','variant_confirmation_required',true,'measurement_before_replacement',true),'reference'),

('CPI6C79','no_start','Comil CPI6C79 — gira e não pega','starting',
 array['comil não pega','comil gira e não pega','motor gira mas não funciona'],
 'Roteiro de não-partida da arquitetura eletrônica candidata, com gate de variante e segurança common rail.',
 array['P0335','P0340','P0190','P0191'],
 '[
  {"key":"comil_ns_variant","action":"Confirmar a variante eletrônica/motor antes de usar dados específicos.","expected":"Variante identificada","next_on_pass":1,"next_on_fail":7},
  {"key":"comil_ns_crank","action":"Confirmar banco de baterias, queda de tensão e RPM durante a partida.","expected":"Arranque elétrico e RPM suficientes","scanner_pids":["battery_voltage","engine_rpm"],"candidate_if_fail":["bateria/cabos/terra","motor de partida"],"next_on_pass":2,"next_on_fail":7},
  {"key":"comil_ns_scan","action":"Ler DTCs e verificar se há RPM/sincronismo reconhecidos pela ECU durante a partida.","expected":"RPM e sincronismo plausíveis","scanner_pids":["engine_rpm","cam_crank_sync"],"candidate_if_fail":["sensor de rotação/fase","chicote/sincronismo"],"next_on_pass":3,"next_on_fail":7},
  {"key":"comil_ns_rail","action":"Comparar rail solicitado x real durante a partida sem abrir alta pressão.","expected":"Pressão suficiente para habilitar injeção","scanner_pids":["rail_pressure_target_bar","rail_pressure_actual_bar","engine_rpm"],"scanner_compare":{"type":"target_actual_delta","target":"rail_pressure_target_bar","actual":"rail_pressure_actual_bar"},"candidate_if_fail":["alimentação de baixa","retorno","controle/sensor do rail"],"next_on_pass":4,"next_on_fail":7},
  {"key":"comil_ns_ecu","action":"Confirmar fusíveis, relés, alimentação e terras da eletrônica; falha de comunicação isolada não condena ECU.","expected":"ECU e circuitos essenciais alimentados","candidate_if_fail":["fusível/relé","terra/chicote"],"next_on_pass":5,"next_on_fail":7},
  {"key":"comil_ns_fuel","action":"Verificar combustível, filtro/separador, entrada de ar e alimentação de baixa pressão.","expected":"Combustível contínuo e sem ar","candidate_if_fail":["filtro/linha","entrada de ar","baixa alimentação"],"next_on_pass":6,"next_on_fail":7},
  {"key":"comil_ns_confirm","action":"Após a correção, repetir partida e confirmar ausência de DTC recorrente.","expected":"Motor pega normalmente"},
  {"key":"comil_ns_hold","action":"Corrigir/identificar a anomalia encontrada antes de avançar e repetir o passo que falhou.","expected":"Anomalia corrigida"}
 ]'::jsonb,
 '["bateria/partida","sincronismo","rail/alimentação","ECU/alimentação","combustível"]'::jsonb,
 jsonb_build_object('vehicle','CPI6C79','variant_confirmation_required',true,'high_pressure_warning',true),'reference'),

('CPI6C79','air_brake_fault','Comil CPI6C79 — baixa pressão / falha de freio a ar','brakes',
 array['pressão do ar baixa','freio sem ar','compressor não enche','tanque não enche','alarme de ar'],
 'Diagnóstico do freio pneumático sem definir pressão nominal exata antes da documentação/configuração física.',
 array[]::text[],
 '[
  {"key":"air_safety","action":"Imobilizar o veículo e não operar em via se a reserva de ar/eficiência de freio estiver insegura. Registrar manômetros e sintomas.","expected":"Veículo seguro para diagnóstico estático","next_on_pass":1,"next_on_fail":6},
  {"key":"air_build","action":"Cronometrar a formação de pressão e observar os dois circuitos/manômetros; anotar vazamentos audíveis.","expected":"Pressão sobe de forma consistente sem queda anormal","candidate_if_fail":["compressor","vazamento","secador/válvula"],"next_on_pass":2,"next_on_fail":6},
  {"key":"air_leak","action":"Com sistema carregado e veículo seguro, localizar vazamentos em conexões, reservatórios, válvulas e câmaras usando método apropriado.","expected":"Sem vazamento relevante","candidate_if_fail":["linha/conexão","válvula","reservatório/câmara"],"next_on_pass":3,"next_on_fail":6},
  {"key":"air_compressor","action":"Verificar acionamento do compressor, linha de descarga, temperatura anormal e condição do secador/Consep conforme a configuração instalada.","expected":"Geração e tratamento de ar coerentes","candidate_if_fail":["compressor","secador/Consep","linha de descarga"],"next_on_pass":4,"next_on_fail":6},
  {"key":"air_service","action":"Verificar resposta da válvula de pedal/circuitos e atuação nas rodas, sem entrar sob veículo sem suporte seguro.","expected":"Comando distribuído e frenagem coerente","candidate_if_fail":["válvula de serviço","câmara/mecanismo S-cam","regulagem"],"next_on_pass":5,"next_on_fail":6},
  {"key":"air_confirm","action":"Após reparo, carregar novamente e confirmar retenção/recuperação e resposta do freio em condição segura.","expected":"Sistema estabilizado"},
  {"key":"air_stop","action":"Falha de segurança detectada: manter veículo fora de operação até correção e teste de confirmação.","expected":"Reparo concluído antes de liberar"}
 ]'::jsonb,
 '["vazamento","compressor","secador/Consep","válvula de serviço","atuadores/mecanismo"]'::jsonb,
 jsonb_build_object('vehicle','CPI6C79','safety_critical',true,'exact_pressure_values_require_vehicle_documentation',true),'reference'),

('CPI6C79','overheating','Comil CPI6C79 — temperatura alta / superaquecimento','engine_cooling',
 array['comil esquenta','temperatura alta','ferve','superaquece'],
 'Roteiro específico com leitura eletrônica quando disponível e confirmação física do circuito de arrefecimento.',array[]::text[],
 '[
  {"key":"comil_hot_safety","action":"Com motor frio, verificar nível, vazamentos e condição do fluido. Nunca abrir reservatório pressurizado quente.","expected":"Nível correto e sem vazamento evidente","next_on_pass":1,"next_on_fail":6},
  {"key":"comil_hot_sensor","action":"Comparar temperatura do scanner com condição/medição independente e observar subida contínua.","expected":"Leitura plausível","scanner_pids":["coolant_temp_c"],"candidate_if_fail":["sensor/chicote"],"next_on_pass":2,"next_on_fail":6},
  {"key":"comil_hot_flow","action":"Verificar correia, bomba d água, ventilador, termostática e circulação no radiador com segurança.","expected":"Circulação e ventilação coerentes","candidate_if_fail":["correia/bomba","ventilador","termostática/radiador"],"next_on_pass":3,"next_on_fail":6},
  {"key":"comil_hot_pressure","action":"Se necessário, testar pressão a frio e procurar vazamento oculto usando ferramenta apropriada.","expected":"Sistema mantém condição compatível com a especificação aplicável","next_on_pass":4,"next_on_fail":6},
  {"key":"comil_hot_internal","action":"Persistindo o aquecimento sem causa externa, investigar gases de combustão/vedação interna.","expected":"Sem evidência de fuga interna","next_on_pass":5,"next_on_fail":6},
  {"key":"comil_hot_confirm","action":"Após correção, aquecer em condição controlada e confirmar estabilização.","expected":"Temperatura normalizada"},
  {"key":"comil_hot_hold","action":"Corrigir a anomalia encontrada antes de prosseguir e repetir o teste.","expected":"Anomalia corrigida"}
 ]'::jsonb,
 '["vazamento","sensor/chicote","bomba/ventilador","termostática/radiador","vedação interna"]'::jsonb,
 jsonb_build_object('vehicle','CPI6C79','scanner_optional',true),'reference'),

-- VOLARE: injeção mecânica; nada de rail/ECU.
('MBJ1166','no_start','Volare MBJ1166 — motor gira e não pega','starting',
 array['volare não pega','volare gira e não pega','mwm não pega'],
 'Roteiro mecânico para MWM Sprint 4.07 TCA candidato: partida, combustível, corte da bomba, injeção e compressão.',array[]::text[],
 '[
  {"key":"volare_ns_crank","action":"Confirmar tensão nominal fisicamente; testar bateria(s), cabos/terra e velocidade de arranque. Evitar tentativas prolongadas.","expected":"Motor gira com velocidade consistente","candidate_if_fail":["bateria/cabos/terra","motor de partida"],"next_on_pass":1,"next_on_fail":6},
  {"key":"volare_ns_fuel","action":"Confirmar diesel, filtro/separador, ausência de entrada de ar e alimentação até a bomba injetora.","expected":"Alimentação contínua e sem ar","candidate_if_fail":["filtro/vedação/linha","bomba alimentadora"],"next_on_pass":2,"next_on_fail":6},
  {"key":"volare_ns_stop","action":"Confirmar que o mecanismo/solenoide de corte da bomba, se presente na configuração física, está liberando combustível durante a partida.","expected":"Corte liberado","candidate_if_fail":["comando de parada/solenoide","chicote"],"next_on_pass":3,"next_on_fail":6},
  {"key":"volare_ns_injection","action":"Verificar chegada de combustível e condição da bomba injetora/bicos com procedimento diesel apropriado; respeitar risco de alta pressão mecânica.","expected":"Sistema injeta de forma compatível","candidate_if_fail":["bomba injetora","bicos","sincronismo"],"next_on_pass":4,"next_on_fail":6},
  {"key":"volare_ns_mech","action":"Se alimentação/injeção estiverem coerentes, avaliar sincronismo mecânico e compressão.","expected":"Sincronismo e compressão suficientes","next_on_pass":5,"next_on_fail":6},
  {"key":"volare_ns_confirm","action":"Depois do reparo, repetir partida na mesma condição e confirmar funcionamento estável.","expected":"Motor pega normalmente"},
  {"key":"volare_ns_hold","action":"Corrigir a anomalia encontrada e repetir o passo antes de avançar.","expected":"Anomalia corrigida"}
 ]'::jsonb,'["bateria/partida","entrada de ar/alimentação","corte da bomba","bomba injetora/bicos","compressão/sincronismo"]'::jsonb,
 jsonb_build_object('vehicle','MBJ1166','mechanical_injection',true,'common_rail_not_applicable',true),'needs_physical_verification'),

('MBJ1166','hard_start','Volare MBJ1166 — partida difícil','starting',array['volare demora pegar','volare pega ruim frio','volare pega ruim quente'],
 'Investiga condição de partida de motor mecânico sem exigir PIDs eletrônicos.',array[]::text[],
 '[
  {"key":"volare_hs_condition","action":"Registrar se ocorre frio/quente/sempre e tempo de partida; conferir velocidade de arranque.","expected":"Condição reproduzida","next_on_pass":1,"next_on_fail":5},
  {"key":"volare_hs_fuel","action":"Verificar filtro, linha, vedação e retorno de combustível após repouso; procurar entrada de ar/perda de coluna.","expected":"Sistema permanece escorvado","candidate_if_fail":["entrada de ar","filtro/vedação/linha"],"next_on_pass":2,"next_on_fail":5},
  {"key":"volare_hs_injection","action":"Verificar sincronismo/condição da bomba injetora e pulverização/retorno dos bicos conforme procedimento aplicável.","expected":"Injeção mecânica coerente","candidate_if_fail":["bomba injetora","bicos","sincronismo"],"next_on_pass":3,"next_on_fail":5},
  {"key":"volare_hs_mechanical","action":"Persistindo, avaliar compressão, folgas e condição mecânica conforme manual MWM aplicável.","expected":"Condição mecânica adequada","next_on_pass":4,"next_on_fail":5},
  {"key":"volare_hs_confirm","action":"Repetir partida na condição original e confirmar normalização.","expected":"Partida normal"},
  {"key":"volare_hs_hold","action":"Corrigir o achado e repetir o teste.","expected":"Anomalia corrigida"}
 ]'::jsonb,'["arranque lento","entrada de ar","bomba/bicos","sincronismo/compressão"]'::jsonb,
 jsonb_build_object('vehicle','MBJ1166','mechanical_injection',true),'needs_physical_verification'),

('MBJ1166','black_smoke','Volare MBJ1166 — fumaça preta / falta de rendimento','engine_performance',array['volare fuma preto','mwm fuma preto','volare fraco e fuma'],
 'Roteiro mecânico de ar/combustível/turbo/injeção.',array[]::text[],
 '[
  {"key":"volare_smoke_air","action":"Inspecionar filtro, dutos, turbo/intercooler e mangueiras por restrição/fuga.","expected":"Ar suficiente e circuito estanque","candidate_if_fail":["filtro/restrição","mangueira/intercooler","turbo"],"next_on_pass":1,"next_on_fail":5},
  {"key":"volare_smoke_turbo","action":"Verificar mecanicamente pressurização do turbo e sinais de óleo/folga somente com procedimento seguro.","expected":"Sobrealimentação coerente","candidate_if_fail":["turbo/pressurização"],"next_on_pass":2,"next_on_fail":5},
  {"key":"volare_smoke_injection","action":"Verificar bomba injetora, ponto e condição/pulverização dos bicos antes de regular por tentativa.","expected":"Dosagem e pulverização coerentes","candidate_if_fail":["bomba/ponto","bicos"],"next_on_pass":3,"next_on_fail":5},
  {"key":"volare_smoke_mech","action":"Se ar/injeção estiverem corretos, avaliar compressão e folgas mecânicas.","expected":"Motor mecanicamente íntegro","next_on_pass":4,"next_on_fail":5},
  {"key":"volare_smoke_confirm","action":"Repetir condição de carga e confirmar redução da fumaça e retorno de rendimento.","expected":"Combustão normalizada"},
  {"key":"volare_smoke_hold","action":"Corrigir o achado e repetir a condição.","expected":"Anomalia corrigida"}
 ]'::jsonb,'["restrição de ar","vazamento/turbo","bomba/ponto","bicos","compressão"]'::jsonb,
 jsonb_build_object('vehicle','MBJ1166','mechanical_injection',true),'needs_physical_verification'),

('MBJ1166','overheating','Volare MBJ1166 — superaquecimento','engine_cooling',array['volare esquenta','volare ferve','temperatura alta volare'],
 'Roteiro do MWM Sprint baseado em condição física; especificações exatas dependem do manual/variante confirmados.',array[]::text[],
 '[
  {"key":"volare_hot_level","action":"Com motor frio, conferir nível/estado e vazamentos. Não abrir sistema quente pressurizado.","expected":"Nível e vedação adequados","next_on_pass":1,"next_on_fail":5},
  {"key":"volare_hot_indicator","action":"Comparar indicação do painel com medição independente e conferir sensor/chicote se divergente.","expected":"Temperatura indicada é plausível","next_on_pass":2,"next_on_fail":5},
  {"key":"volare_hot_flow","action":"Verificar correia, bomba d água, ventilador, termostática e fluxo no radiador.","expected":"Circulação e ventilação normais","next_on_pass":3,"next_on_fail":5},
  {"key":"volare_hot_internal","action":"Persistindo, testar pressão a frio e investigar gases de combustão/vedação interna com ferramenta apropriada.","expected":"Sem vazamento oculto/interno","next_on_pass":4,"next_on_fail":5},
  {"key":"volare_hot_confirm","action":"Aquecer em condição controlada após o reparo e confirmar estabilização.","expected":"Temperatura estabilizada"},
  {"key":"volare_hot_hold","action":"Corrigir o achado e repetir o teste.","expected":"Anomalia corrigida"}
 ]'::jsonb,'["vazamento","sensor/painel","correia/bomba/ventilador","termostática/radiador","vedação interna"]'::jsonb,
 jsonb_build_object('vehicle','MBJ1166','engine_family_manual_reference','MWM Sprint 4.07 TCA'),'needs_physical_verification'),

-- 608 / OM314: diesel mecânico e gate elétrico de tensão.
('BYH8J61','no_start','Mercedes 608 BYH8J61 — gira e não pega','starting',array['608 não pega','608 gira e não pega','om314 não pega'],
 'Roteiro mecânico OM314 candidato, sem scanner de ECU.',array[]::text[],
 '[
  {"key":"608_ns_voltage_gate","action":"Primeiro identificar fisicamente tensão/banco de baterias e plaqueta do motor de partida. Não aplicar valor 12/24 V por suposição.","expected":"Sistema elétrico identificado","next_on_pass":1,"next_on_fail":6},
  {"key":"608_ns_crank","action":"Testar bateria(s), cabos, aterramento e velocidade de partida conforme a tensão confirmada.","expected":"Arranque consistente","candidate_if_fail":["bateria/cabo/terra","motor de partida"],"next_on_pass":2,"next_on_fail":6},
  {"key":"608_ns_fuel","action":"Verificar diesel, filtros, bomba alimentadora, entrada de ar e chegada até a bomba injetora.","expected":"Alimentação contínua e sem ar","candidate_if_fail":["filtro/linha","bomba alimentadora"],"next_on_pass":3,"next_on_fail":6},
  {"key":"608_ns_stop","action":"Confirmar mecanismo de parada/corte da bomba conforme a configuração física.","expected":"Bomba liberada para injeção","candidate_if_fail":["mecanismo/comando de parada"],"next_on_pass":4,"next_on_fail":6},
  {"key":"608_ns_injection","action":"Verificar bomba injetora linear, ponto e bicos com procedimento diesel seguro; não aproximar pele de jato de alta pressão.","expected":"Injeção mecânica funcional","candidate_if_fail":["bomba/ponto","bicos"],"next_on_pass":5,"next_on_fail":6},
  {"key":"608_ns_mech","action":"Se combustível/injeção estiverem coerentes, avaliar compressão e sincronismo mecânico.","expected":"Condição mecânica suficiente"},
  {"key":"608_ns_hold","action":"Corrigir/identificar o achado e repetir o passo.","expected":"Anomalia corrigida"}
 ]'::jsonb,'["bateria/partida","alimentação diesel","bomba injetora/ponto","bicos","compressão"]'::jsonb,
 jsonb_build_object('vehicle','BYH8J61','mechanical_injection',true,'engine_scanner_not_applicable',true,'voltage_physical_gate',true),'needs_physical_verification'),

('BYH8J61','hard_start','Mercedes 608 BYH8J61 — partida difícil','starting',array['608 demora pegar','608 pega ruim frio','608 pega ruim quente'],
 'Partida difícil mecânica: arranque, ar no diesel, bomba/bicos e compressão.',array[]::text[],
 '[
  {"key":"608_hs_voltage","action":"Confirmar tensão nominal e registrar condição frio/quente e velocidade de arranque.","expected":"Sistema elétrico identificado e arranque consistente","next_on_pass":1,"next_on_fail":5},
  {"key":"608_hs_air","action":"Verificar perda de coluna/entrada de ar em filtros, linhas e conexões após repouso.","expected":"Alimentação permanece escorvada","next_on_pass":2,"next_on_fail":5},
  {"key":"608_hs_injection","action":"Avaliar ponto/condição da bomba injetora e bicos conforme literatura/peça instalada.","expected":"Injeção mecânica coerente","next_on_pass":3,"next_on_fail":5},
  {"key":"608_hs_mech","action":"Persistindo, avaliar compressão e condição mecânica.","expected":"Compressão adequada","next_on_pass":4,"next_on_fail":5},
  {"key":"608_hs_confirm","action":"Repetir a partida na condição original.","expected":"Partida normalizada"},
  {"key":"608_hs_hold","action":"Corrigir o achado e repetir o teste.","expected":"Anomalia corrigida"}
 ]'::jsonb,'["arranque lento","entrada de ar","bomba/bicos","compressão"]'::jsonb,
 jsonb_build_object('vehicle','BYH8J61','mechanical_injection',true,'voltage_physical_gate',true),'needs_physical_verification'),

('BYH8J61','black_smoke','Mercedes 608 BYH8J61 — fumaça preta / perda de rendimento','engine_performance',array['608 fuma preto','608 fraca','om314 fuma preto'],
 'Ar, injeção mecânica e condição do OM314 candidato.',array[]::text[],
 '[
  {"key":"608_smoke_air","action":"Verificar filtro/dutos de admissão e escape por restrição.","expected":"Fluxo de ar livre","next_on_pass":1,"next_on_fail":4},
  {"key":"608_smoke_injection","action":"Verificar ponto e condição da bomba injetora e pulverização dos bicos; não regular por tentativa sem referência.","expected":"Dosagem/pulverização coerentes","next_on_pass":2,"next_on_fail":4},
  {"key":"608_smoke_mech","action":"Avaliar compressão/folgas se ar e injeção estiverem coerentes.","expected":"Condição mecânica adequada","next_on_pass":3,"next_on_fail":4},
  {"key":"608_smoke_confirm","action":"Repetir carga e confirmar melhora de fumaça/rendimento.","expected":"Combustão normalizada"},
  {"key":"608_smoke_hold","action":"Corrigir o achado e repetir a condição.","expected":"Anomalia corrigida"}
 ]'::jsonb,'["restrição de ar","bomba/ponto","bicos","compressão"]'::jsonb,
 jsonb_build_object('vehicle','BYH8J61','mechanical_injection',true),'needs_physical_verification'),

('BYH8J61','brake_assist_fault','Mercedes 608 BYH8J61 — assistência de freio / ar insuficiente','brakes',array['608 freio duro','608 sem ar no freio','servo freio 608','compressor 608'],
 'Roteiro do sistema candidato de freio hidráulico com reforço pneumático. A configuração deve ser conferida fisicamente antes de especificações.',array[]::text[],
 '[
  {"key":"608_brake_safety","action":"Manter o veículo imobilizado se houver perda de assistência/eficiência. Confirmar fisicamente a arquitetura do freio instalado.","expected":"Configuração e condição segura identificadas","next_on_pass":1,"next_on_fail":5},
  {"key":"608_brake_air","action":"Verificar compressor, reservatório, linhas e vazamentos do circuito de assistência pneumática candidato.","expected":"Reserva/assistência sem fuga evidente","next_on_pass":2,"next_on_fail":5},
  {"key":"608_brake_hydraulic","action":"Inspecionar nível/vazamentos e condição do circuito hidráulico/cilindro mestre conforme a configuração instalada.","expected":"Circuito hidráulico íntegro","next_on_pass":3,"next_on_fail":5},
  {"key":"608_brake_wheels","action":"Verificar ajuste, cilindros de roda, lonas/tambores e resposta por eixo com segurança.","expected":"Atuação mecânica/hidráulica uniforme","next_on_pass":4,"next_on_fail":5},
  {"key":"608_brake_confirm","action":"Após reparo, testar estaticamente e em condição controlada antes de liberar o veículo.","expected":"Frenagem e assistência normais"},
  {"key":"608_brake_stop","action":"Falha crítica: veículo permanece fora de operação até correção e teste de confirmação.","expected":"Reparo concluído"}
 ]'::jsonb,'["compressor/vazamento","servo/assistência","hidráulico","cilindros/lonas/tambores"]'::jsonb,
 jsonb_build_object('vehicle','BYH8J61','safety_critical',true,'brake_architecture_candidate',true),'needs_physical_verification'),

('BYH8J61','overheating','Mercedes 608 BYH8J61 — superaquecimento','engine_cooling',array['608 esquenta','608 ferve','om314 temperatura alta'],
 'Roteiro físico do OM314 candidato.',array[]::text[],
 '[
  {"key":"608_hot_level","action":"Com motor frio, conferir nível/vazamentos e condição do fluido; não abrir quente.","expected":"Nível/vedação adequados","next_on_pass":1,"next_on_fail":5},
  {"key":"608_hot_indicator","action":"Comparar indicador do painel com medição independente e testar sensor/chicote se divergente.","expected":"Indicação plausível","next_on_pass":2,"next_on_fail":5},
  {"key":"608_hot_flow","action":"Verificar correia em V, bomba d água, ventilador mecânico, termostática e radiador.","expected":"Circulação/ventilação coerentes","next_on_pass":3,"next_on_fail":5},
  {"key":"608_hot_internal","action":"Persistindo, testar vazamento oculto e gases de combustão/vedação interna com ferramenta apropriada.","expected":"Sem fuga interna","next_on_pass":4,"next_on_fail":5},
  {"key":"608_hot_confirm","action":"Aquecer em condição controlada e confirmar estabilização.","expected":"Temperatura estabilizada"},
  {"key":"608_hot_hold","action":"Corrigir o achado e repetir o teste.","expected":"Anomalia corrigida"}
 ]'::jsonb,'["vazamento","sensor/painel","correia/bomba/ventilador","termostática/radiador","vedação interna"]'::jsonb,
 jsonb_build_object('vehicle','BYH8J61','mechanical_engine',true),'needs_physical_verification'),

-- REBOQUE.
('QSR7H50','trailer_lighting_fault','QSR7H50 — falha de iluminação / funções misturadas','electrical',array['carretinha sem luz','seta da carretinha','freio da carretinha','lanterna carretinha','luzes misturadas'],
 'Diagnóstico do chicote/plugue sem assumir padrão de pinos.',array[]::text[],
 '[
  {"key":"trailer_plug_map","action":"Identificar tensão e mapear fisicamente as vias do plugue acionando posição, freio e setas uma função por vez.","expected":"Mapa funcional confirmado","next_on_pass":1,"next_on_fail":5},
  {"key":"trailer_ground","action":"Com cargas ligadas, medir qualidade/queda do aterramento entre plugue, chassi e lanternas.","expected":"Retorno estável sob carga","candidate_if_fail":["terra ruim/corrosão"],"next_on_pass":2,"next_on_fail":5},
  {"key":"trailer_harness","action":"Inspecionar emendas/conectores e testar continuidade desenergizada e queda de tensão sob carga.","expected":"Chicote íntegro","candidate_if_fail":["fio rompido","emenda resistiva","corrosão"],"next_on_pass":3,"next_on_fail":5},
  {"key":"trailer_lamps","action":"Testar alimentação/terra diretamente nas lanternas e luz de placa; funções cruzadas sugerem primeiro retorno comum ruim.","expected":"Cada função opera isoladamente","next_on_pass":4,"next_on_fail":5},
  {"key":"trailer_light_confirm","action":"Testar todas as funções simultaneamente e movimentar o chicote/plugue para confirmar estabilidade.","expected":"Iluminação estável"},
  {"key":"trailer_light_hold","action":"Corrigir o achado e repetir o passo.","expected":"Anomalia corrigida"}
 ]'::jsonb,'["aterramento","plugue","chicote/emenda","lanterna/soquete"]'::jsonb,
 jsonb_build_object('vehicle','QSR7H50','physical_pin_mapping_required',true),'needs_physical_verification'),

('QSR7H50','wheel_hub_noise','QSR7H50 — ruído / folga de roda ou cubo','suspension',array['carretinha ronca','carretinha roda com folga','rolamento carretinha','cubo quente'],
 'Roteiro de roda/cubo/rolamento sem inventar torque ou ajuste do conjunto.',array[]::text[],
 '[
  {"key":"trailer_hub_safety","action":"Imobilizar se houver folga grande, aquecimento excessivo ou ruído severo. Elevar somente com apoio seguro e capacidade adequada.","expected":"Condição segura para inspeção","next_on_pass":1,"next_on_fail":5},
  {"key":"trailer_hub_play","action":"Verificar folga radial/axial, rotação, ruído e condição visual de roda/pneu/cubo.","expected":"Sem folga/aspereza anormal","next_on_pass":2,"next_on_fail":5},
  {"key":"trailer_hub_temp","action":"Comparar temperatura dos lados após percurso controlado; diferença importante direciona inspeção de rolamento/freio se houver.","expected":"Temperaturas coerentes entre lados","next_on_pass":3,"next_on_fail":5},
  {"key":"trailer_hub_open","action":"Se necessário desmontar, identificar rolamento/retentor e método de ajuste físico antes de aplicar torque. Registrar códigos e fotos.","expected":"Componentes identificados e montados pelo procedimento correto","next_on_pass":4,"next_on_fail":5},
  {"key":"trailer_hub_confirm","action":"Após serviço, conferir rotação/folga e fazer percurso controlado com nova inspeção de temperatura.","expected":"Cubo normal"},
  {"key":"trailer_hub_hold","action":"Falha crítica encontrada: não liberar até corrigir e confirmar.","expected":"Reparo concluído"}
 ]'::jsonb,'["rolamento","retentor/lubrificação","cubo/eixo","roda/pneu"]'::jsonb,
 jsonb_build_object('vehicle','QSR7H50','exact_bearing_and_torque_require_physical_identification',true),'needs_physical_verification')
)
insert into public.v2_vehicle_symptom_playbooks(
 company_id,vehicle_id,symptom_key,title,category,aliases,description,related_dtcs,ordered_tests,likely_causes,source_metadata,verification_status,active
)
select v.company_id,v.id,p.symptom_key,p.title,p.category,p.aliases,p.description,p.related_dtcs,p.ordered_tests,p.likely_causes,p.source_meta,p.status,true
from veh v join p on p.plate_key=v.plate_key
on conflict (vehicle_id,symptom_key) where vehicle_id is not null do update set
 title=excluded.title,category=excluded.category,aliases=excluded.aliases,description=excluded.description,
 related_dtcs=excluded.related_dtcs,ordered_tests=excluded.ordered_tests,likely_causes=excluded.likely_causes,
 source_metadata=excluded.source_metadata,verification_status=excluded.verification_status,active=true,updated_at=now();
