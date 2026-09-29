-- Oficina 360 — Sprinter W903 / OM611 remaining guided electrical diagnostics v1
-- Purpose: finish the functional diagnostic layer without converting generic component
-- guidance into VIN-specific Mercedes specifications.

with v as (
  select id, company_id from public.v2_vehicles where upper(plate)='EJW6A76' limit 1
), src(source_key,source_type,title,publisher,source_url,authority_level,applicability_status,access_status,verification_status,notes,meta) as (values
  ('hella_abs_wheel_speed_diagnostic','diagnostic_procedure','HELLA — verificar e substituir sensor ABS / velocidade de roda','HELLA','https://www.hella.com/techworld/br/tecnica/sensores-e-atuadores/verificar-e-substituir-o-sensor-abs/','component_manufacturer_technical','generic_active_and_passive_wheel_speed_sensor','public_full','verified','Diagnóstico por memória de falhas, parâmetros por roda, inspeção, multímetro e osciloscópio. Sensor passivo indutivo gera tensão AC sem alimentação; resistência só deve ser usada quando o tipo passivo estiver confirmado.',jsonb_build_object('priority','scanner_compare_all_wheels_then_waveform','safety','brake-system work by qualified personnel')),
  ('bosch_glow_plug_resistance_test','diagnostic_procedure','Bosch — teste de resistência de velas aquecedoras','Bosch Aftermarket','https://www.boschaftermarket.com/xrm/media/images/services/downloads/parts_14/sp_glp_kombi_brochure_en.pdf','component_manufacturer_technical','generic_metal_glow_plug_resistance_test','public_full','verified','Procedimento Bosch: descontar a resistência própria do multímetro. Infinito ou abaixo de 0,2 ohm indica falha; acima de 0,2 e abaixo de 5 ohm é faixa funcional de referência. Não aplicar bateria diretamente para testar.',jsonb_build_object('multimeter_resolution','<100 mOhm','ok_reference_ohm','>0.2 and <5','open_circuit','infinite = defective','short_reference','<0.2 = defective')),
  ('hella_stop_lamp_switch_function','diagnostic_procedure','HELLA — teste funcional do interruptor da luz de freio','HELLA','https://www.hella.com/techworld/br/ti/installation-of-stop-light-switch-with-automatic-adjuster/','component_manufacturer_technical','generic_stop_lamp_switch','public_full','verified','Após montagem/ajuste correto, testar eletricamente com ignição ligada e repetir acionamento do pedal. Quando disponível, comparar também o estado do interruptor no scanner.',jsonb_build_object('test','ignition on; press pedal repeatedly; verify stop lamps and scan-data state')),
  ('hella_signal_lamp_diagnostic','diagnostic_procedure','HELLA — diagnóstico de lanternas e circuitos de sinalização','HELLA','https://www.hella.com/techworld/br/tecnica/iluminacao/lanterna-de-sinalizacao/','component_manufacturer_technical','generic_12v_lighting_circuit','public_full','verified','Verificar elemento luminoso, suporte/placa, corrosão, alimentação, fusíveis, conectores e massa. Se houver PWM, usar osciloscópio/aparelho de diagnóstico.',jsonb_build_object('sequence',jsonb_build_array('lamp/load','holder/contact','fuse/feed','connector','ground','PWM/scope if applicable'))),
  ('hella_ground_voltage_drop_reference','diagnostic_procedure','HELLA — Massa 31 e limites de queda de tensão','HELLA','https://www.hella.com/techworld/en/ti/earth-31-troubleshooting/','component_manufacturer_technical','generic_12v_power_ground','public_full','verified','Referência de queda de tensão para rede 12 V. Bateria em repouso deve ter pelo menos 12,4 V para os testes. Valores são referência geral, não substituem WIS.',jsonb_build_object('battery_rest_min_v',12.4,'starter_battery_plus_to_main_max_v',0.5,'starter_control_path_max_v',1.5,'alternator_bplus_path_max_v',0.4,'ground_battery_to_starter_max_v',0.3,'ground_battery_to_alternator_max_v',0.3)),
  ('hella_starter_diagnostic','diagnostic_procedure','HELLA — diagnóstico do motor de partida e solenoide','HELLA','https://www.hella.com/techworld/br/tecnica/eletrica-eletronica/sistema-de-arranque-e-de-carregamento/controlar-o-motor-de-partida/','component_manufacturer_technical','generic_12v_starter_system','public_full','verified','Diagnóstico começa por bateria, cabos e massas; depois comando/solenoide e motor de partida. Usar queda de tensão sob carga em vez de apenas continuidade sem carga.',jsonb_build_object('sequence',jsonb_build_array('battery','battery terminals','positive cable drop','ground drop','terminal 50 command','solenoid','starter motor'))),
  ('hella_horn_fuse_diagnostic','diagnostic_procedure','HELLA — diagnóstico de buzina, fusível e contatos','HELLA','https://www.hella.com/techworld/br/lounge/buzinas-e-fanfarras-hella-identificar-defeitos-e-corrigi-los-corretamente/','component_manufacturer_technical','generic_horn_and_fuse_circuit','public_full','verified','Antes de trocar a buzina, testar fusível com multímetro, contatos do porta-fusível, alimentação sob comando, massa e resistências de contato.',jsonb_build_object('visual_only_not_enough',true,'test_fuse_with_multimeter',true)),
  ('hella_oil_sensor_reference','diagnostic_procedure','HELLA — sensores de nível e temperatura do óleo','HELLA','https://www.hella.com/techworld/br/pecas-automotivas/sistema-eletronico-automovel/outros-sensores/','component_manufacturer_technical','generic_oil_level_temperature_sensor','public_full','verified','Sensores de nível podem medir dinamicamente e integrar temperatura. Diagnóstico deve comparar scanner com nível físico/condição real e verificar conector/chicote antes de substituir.',jsonb_build_object('level_reference','compare scan/display with dipstick/static level on level ground','temperature_reference','plausibility versus cold-soak and warm-up')),
  ('hella_oil_temperature_ntc','diagnostic_procedure','HELLA — princípio do sensor de temperatura do óleo','HELLA','https://www.hella.com/techworld/br/ti/oil-temperature-sensor/','component_manufacturer_technical','generic_oil_temperature_ntc','public_full','verified','Quando a temperatura do óleo é medida por NTC, a resistência diminui com o aumento da temperatura. Aplicar apenas se a arquitetura do sensor instalado for confirmada.',jsonb_build_object('principle','NTC resistance decreases with temperature')),
  ('hella_relay_component_reference','diagnostic_procedure','HELLA — relés automotivos: parâmetros elétricos de diagnóstico','HELLA','https://www.hella.com/partnerworld/assets/documents/1716_Broschuere_Relais_und_Relaisgeraete_HELLA_EN.pdf','component_manufacturer_technical','generic_automotive_relay','public_full','verified','Para relés, confirmar alimentação da bobina, comando, atuação e queda de tensão nos contatos sob carga. Não assumir numeração 30/85/86/87 sem conferir o diagrama do relé instalado.',jsonb_build_object('check',jsonb_build_array('coil feed','coil command','mechanical actuation','contact feed','contact output under load','contact voltage drop'))),
  ('mercedes_wis_remaining_electrical_gate','oem_wiring_reference','Mercedes-Benz XENTRY WIS — confirmação final de ABS, iluminação, relés e opção do veículo','Mercedes-Benz','https://b2bconnect.mercedes-benz.com/pt/shop/workshop-solutions/xentry-wis','manufacturer','vin_specific_official_source','authorized_network_or_account','verified','Fonte final para promover pinagem/cor/valor de referência a VIN-específico. ABS e iluminação permanecem com pinagem bloqueada até confirmação de equipamento/build data.',jsonb_build_object('official',true,'priority','final_vehicle_specific_confirmation'))
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

-- ABS wheel sensor: node is already classified as inductive in our catalog, but exact
-- front/rear resistance and module pinout stay locked until BB0/build configuration is confirmed.
with v as (select id from public.v2_vehicles where upper(plate)='EJW6A76' limit 1)
update public.v2_vehicle_electrical_nodes n set
 test_procedure=jsonb_build_object(
   'ferramenta','scanner + osciloscópio; multímetro somente após confirmar sensor passivo',
   'passo_1','ler DTC ABS/ASR e comparar velocidade das quatro rodas no scanner durante rotação/rodagem segura',
   'passo_2','inspecionar cabo, conector, folga do rolamento e roda fônica/anel de impulso',
   'passo_3','como este cadastro aponta sensor indutivo/passivo, observar sinal AC no osciloscópio; frequência e amplitude devem crescer com a velocidade e ser comparáveis entre rodas equivalentes',
   'resistencia','não publicar faixa ohmica específica sem WIS/peça exata; sensores ativos não devem ser avaliados por resistência interna',
   'seguranca','trabalho em ABS/freio exige procedimento do fabricante e profissional qualificado',
   'nivel','método HELLA confirmado; valores/pinagem exatos Mercedes bloqueados por configuração BB0',
   'fonte_diagnostico','HELLA + Mercedes PE42.30-D-2200A',
   'fonte_url','https://www.hella.com/techworld/br/tecnica/sensores-e-atuadores/verificar-e-substituir-o-sensor-abs/'
 ),
 source_metadata=coalesce(n.source_metadata,'{}'::jsonb)||jsonb_build_object(
   'diagnostic_source_name','HELLA — ABS wheel speed sensor',
   'diagnostic_source_url','https://www.hella.com/techworld/br/tecnica/sensores-e-atuadores/verificar-e-substituir-o-sensor-abs/',
   'diagnostic_confidence','technology_and_method_verified_exact_wis_values_pending'
 ), updated_at=now()
from v where n.vehicle_id=v.id and n.label='Sensor ABS de roda';

-- Glow plugs: apply Bosch resistance method to both the service-level and EPC-level glow plug nodes.
with v as (select id from public.v2_vehicles where upper(plate)='EJW6A76' limit 1)
update public.v2_vehicle_electrical_nodes n set
 test_procedure=jsonb_build_object(
   'ferramenta','multímetro/ohmímetro com resolução melhor que 0,1 ohm',
   'condicao','motor desligado; limpar contatos; medir e anotar o offset do próprio multímetro encostando as pontas',
   'onde_medir','terminal da vela para massa do motor com a vela instalada e alimentação desconectada',
   'calculo','resistência da vela = leitura medida - offset do multímetro',
   'referencia_bosch','infinito = circuito aberto/defeituosa; abaixo de 0,2 ohm = defeituosa; acima de 0,2 e abaixo de 5 ohm = faixa funcional de referência Bosch',
   'comparacao','comparar as quatro velas; diferença grande entre cilindros é indício importante',
   'nao_fazer','não aplicar 12 V diretamente para testar; pode superaquecer/danificar a vela',
   'nivel','procedimento Bosch de tecnologia; confirmar especificação da vela exata se houver divergência',
   'fonte_diagnostico','Bosch Aftermarket',
   'fonte_url','https://www.boschaftermarket.com/xrm/media/images/services/downloads/parts_14/sp_glp_kombi_brochure_en.pdf'
 ),
 source_metadata=coalesce(n.source_metadata,'{}'::jsonb)||jsonb_build_object(
   'diagnostic_source_name','Bosch — glow plug resistance test',
   'diagnostic_source_url','https://www.boschaftermarket.com/xrm/media/images/services/downloads/parts_14/sp_glp_kombi_brochure_en.pdf',
   'diagnostic_confidence','manufacturer_generic_glow_plug_test'
 ), updated_at=now()
from v where n.vehicle_id=v.id and n.label ~* 'GLOW PLUG|vela aquecedora';

-- Glow module/relay: no hard-coded pinout until engine-serial/WIS confirmation.
with v as (select id from public.v2_vehicles where upper(plate)='EJW6A76' limit 1)
update public.v2_vehicle_electrical_nodes n set
 test_procedure=jsonb_build_object(
   'ferramenta','scanner + multímetro + alicate amperímetro DC quando disponível',
   'condicao','motor frio para solicitar pré-aquecimento; bateria em bom estado',
   'passo_1','ler DTC do sistema de pré-aquecimento e confirmar comando pelo scanner se disponível',
   'passo_2','confirmar alimentação principal e massa do módulo sob carga',
   'passo_3','comparar presença de saída/corrente para cada vela durante pré/pós-aquecimento; uma saída sem corrente com vela boa aponta chicote/módulo',
   'passo_4','testar cada vela separadamente pelo procedimento Bosch antes de condenar o módulo',
   'nivel','roteiro funcional; pinagem e corrente nominal exatas pendentes de WIS/número do módulo',
   'fonte_diagnostico','Bosch + Mercedes WIS'
 ),
 source_metadata=coalesce(n.source_metadata,'{}'::jsonb)||jsonb_build_object('diagnostic_confidence','functional_flow_exact_module_pinout_pending'),updated_at=now()
from v where n.vehicle_id=v.id and n.label='Módulo/relé das velas aquecedoras';

-- Battery and main positive paths.
with v as (select id from public.v2_vehicles where upper(plate)='EJW6A76' limit 1)
update public.v2_vehicle_electrical_nodes n set
 test_procedure=jsonb_build_object(
   'ferramenta','multímetro; testador de bateria/carga quando disponível',
   'repouso','para os testes HELLA, tensão em circuito aberto deve ser pelo menos 12,4 V',
   'inspecao','terminais limpos/apertados; sem sulfatação, aquecimento ou cabo danificado',
   'sob_partida','observar queda de tensão e estabilidade; usar especificação da bateria/veículo para julgamento final',
   'nivel','referência geral HELLA para rede 12 V',
   'fonte_diagnostico','HELLA'
 ),
 source_metadata=coalesce(n.source_metadata,'{}'::jsonb)||jsonb_build_object('diagnostic_source_name','HELLA — 12 V power/ground reference','diagnostic_source_url','https://www.hella.com/techworld/en/ti/earth-31-troubleshooting/','diagnostic_confidence','manufacturer_general_12v_reference'),updated_at=now()
from v where n.vehicle_id=v.id and n.label in ('Bateria 12 V','Bateria e cabos principais','Cabo positivo principal');

-- Positive cable to starter / alternator and terminal 50 control path.
with v as (select id from public.v2_vehicles where upper(plate)='EJW6A76' limit 1)
update public.v2_vehicle_electrical_nodes n set
 test_procedure=case
   when n.label='Cabo B+ do alternador' then jsonb_build_object(
     'ferramenta','multímetro em queda de tensão DC',
     'condicao','motor funcionando e sistema carregando; ligar consumidores para criar carga',
     'onde_medir','bateria positiva até B+ do alternador',
     'referencia_hella','queda máxima de referência 0,4 V',
     'nivel','referência geral HELLA 12 V; WIS prevalece')
   when n.label='Cabo B+ do motor de partida' then jsonb_build_object(
     'ferramenta','multímetro em queda de tensão DC',
     'condicao','durante acionamento do motor de partida',
     'onde_medir','bateria positiva até conexão principal do motor de partida',
     'referencia_hella','queda máxima de referência 0,5 V',
     'nivel','referência geral HELLA 12 V; WIS prevalece')
   else jsonb_build_object(
     'ferramenta','multímetro em queda de tensão DC',
     'condicao','durante comando START',
     'onde_medir','da saída de comando de ignição até terminal de controle do motor de partida',
     'referencia_hella','queda máxima de referência no caminho de comando: 1,5 V',
     'nivel','referência geral HELLA 12 V; pinagem exata já fica separada no grafo')
   end,
 source_metadata=coalesce(n.source_metadata,'{}'::jsonb)||jsonb_build_object('diagnostic_source_name','HELLA — voltage drop reference','diagnostic_source_url','https://www.hella.com/techworld/en/ti/earth-31-troubleshooting/','diagnostic_confidence','manufacturer_general_12v_reference'),updated_at=now()
from v where n.vehicle_id=v.id and n.label in ('Cabo B+ do alternador','Cabo B+ do motor de partida','Fio de comando do solenoide','J352 — terminal 50 / comando de partida');

-- Starter relay, solenoid and engine relay: functional relay test without assuming terminal numbering.
with v as (select id from public.v2_vehicles where upper(plate)='EJW6A76' limit 1)
update public.v2_vehicle_electrical_nodes n set
 test_procedure=jsonb_build_object(
   'ferramenta','multímetro + scanner; pinça amperimétrica opcional',
   'passo_1','confirmar alimentação da bobina/comando conforme grafo/diagrama do veículo',
   'passo_2','acionar a função e confirmar atuação do relé/solenoide',
   'passo_3','medir alimentação de entrada e saída sob carga; contato que fecha mas apresenta queda excessiva pode estar queimado/oxidado',
   'passo_4','não assumir terminais 30/85/86/87 sem conferir o diagrama ou marcação do relé instalado',
   'nivel','procedimento HELLA para relés + ligação de família OM611; pinout físico do relé fica pendente quando não documentado',
   'fonte_diagnostico','HELLA + referência OM611/WIS'
 ),
 source_metadata=coalesce(n.source_metadata,'{}'::jsonb)||jsonb_build_object('diagnostic_source_name','HELLA — relay diagnostic principle','diagnostic_source_url','https://www.hella.com/partnerworld/assets/documents/1716_Broschuere_Relais_und_Relaisgeraete_HELLA_EN.pdf','diagnostic_confidence','relay_function_reference_exact_socket_pending'),updated_at=now()
from v where n.vehicle_id=v.id and n.label in ('K61 — relé do motor de partida','A12k3 — relé eletrônica do motor ME/CDI','K214 — relé da bomba de combustível','Solenoide do motor de partida');

-- Terminal 15 and ECU itself.
with v as (select id from public.v2_vehicles where upper(plate)='EJW6A76' limit 1)
update public.v2_vehicle_electrical_nodes n set
 test_procedure=case when n.label='J18 — terminal 15 protegido' then jsonb_build_object(
   'ferramenta','multímetro',
   'condicao','ignição ligada',
   'teste','confirmar tensão próxima à tensão da bateria no terminal 15 protegido e no destino ECU C2/13 registrado no grafo',
   'falha','se ausente, voltar pelo fusível/ignição antes de suspeitar da ECU',
   'nivel','ligação OM611 de referência; tensão funcional de sistema 12 V')
 else jsonb_build_object(
   'ferramenta','multímetro + scanner + osciloscópio conforme circuito',
   'antes_de_condenar','confirmar alimentações permanentes/relé, terminal 15, todas as massas relevantes, CAN/rede, linha de diagnóstico e referências de sensores',
   'alimentacoes_registradas','A12k3 -> ECU C1/7 e C1/8; J18 -> ECU C2/13; consultar grafo para detalhes',
   'massas','testar queda de tensão com circuito carregado, não apenas continuidade',
   'regra','ECU somente deve ser condenada após excluir alimentação, massa, curto externo, chicote e periféricos',
   'nivel','arquitetura OM611 de referência; confirmação final pelo WIS') end,
 source_metadata=coalesce(n.source_metadata,'{}'::jsonb)||jsonb_build_object('diagnostic_confidence','family_wiring_plus_general_power_diagnostic'),updated_at=now()
from v where n.vehicle_id=v.id and n.label in ('J18 — terminal 15 protegido','ECU do motor CDI');

-- 14-pin diagnostic socket P11: only the line already mapped to A80 gets pin-specific treatment.
with v as (select id from public.v2_vehicles where upper(plate)='EJW6A76' limit 1)
update public.v2_vehicle_electrical_nodes n set
 test_procedure=jsonb_build_object(
   'ferramenta','multímetro + scanner compatível Mercedes 14 pinos',
   'linha_confirmada_referencia','P11 pino 14 -> ECU A80 C3/28, fio azul/branco, linha de diagnóstico',
   'passo_1','inspecionar pinos, oxidação e encaixe do adaptador',
   'passo_2','confirmar alimentação e massa da tomada somente pelos pinos definidos no diagrama WIS/build data desta configuração',
   'passo_3','se ECU não comunica mas alimentação/massa da tomada estão corretas, verificar continuidade da linha P11/14 até A80 C3/28 com módulos desligados conforme procedimento',
   'nao_fazer','não aplicar 12 V diretamente na linha de diagnóstico e não fazer jumper entre pinos sem diagrama confirmado',
   'nivel','pino 14/ECU = referência de família OM611; demais pinos bloqueados até WIS') ,
 source_metadata=coalesce(n.source_metadata,'{}'::jsonb)||jsonb_build_object('diagnostic_confidence','one_family_pin_mapped_other_socket_pins_wis_required'),updated_at=now()
from v where n.vehicle_id=v.id and n.label='P11 — tomada de diagnóstico 14 pinos';

-- Fuse boxes / fuse links: test under power, not visually only.
with v as (select id from public.v2_vehicles where upper(plate)='EJW6A76' limit 1)
update public.v2_vehicle_electrical_nodes n set
 test_procedure=jsonb_build_object(
   'ferramenta','multímetro ou lâmpada de prova adequada ao circuito',
   'passo_1','identificar o fusível correto pelo diagrama/legenda antes de remover',
   'passo_2','com circuito energizado quando seguro, verificar tensão nos dois lados do fusível; inspeção visual isolada não é suficiente',
   'passo_3','se aberto, investigar curto/sobrecorrente antes de substituir; usar somente amperagem especificada',
   'passo_4','inspecionar porta-fusível por oxidação, aquecimento e resistência de contato',
   'nivel','procedimento funcional HELLA; amperagem/posição exatas dependem de WIS/equipamento',
   'fonte_diagnostico','HELLA'
 ),
 source_metadata=coalesce(n.source_metadata,'{}'::jsonb)||jsonb_build_object('diagnostic_source_name','HELLA — fuse/contact diagnostic','diagnostic_source_url','https://www.hella.com/techworld/br/lounge/buzinas-e-fanfarras-hella-identificar-defeitos-e-corrigi-los-corretamente/','diagnostic_confidence','manufacturer_general_fuse_test'),updated_at=now()
from v where n.vehicle_id=v.id and (
  n.label='Caixa de fusíveis e relés' or n.label='Caixa/fusível principal de potência' or
  n.label ~* '^FUSE (BOX|LINK|STRIP|CARRIER|/)|^FUSE BOX CENTRAL|^SOCKET — Sprinter 903\.662 — Relés|^DIODE — Sprinter 903\.662'
);

-- Brake light, reverse, clutch, headlamp/hazard and ignition switches.
with v as (select id from public.v2_vehicles where upper(plate)='EJW6A76' limit 1)
update public.v2_vehicle_electrical_nodes n set
 test_procedure=case
   when n.label='Interruptor de luz de freio' then jsonb_build_object(
     'ferramenta','scanner + multímetro',
     'condicao','interruptor corretamente montado/ajustado; ignição ligada',
     'teste_funcional','pressionar o pedal várias vezes e confirmar luzes de freio; comparar estado do interruptor no scanner quando disponível',
     'teste_eletrico','se a função falhar, confirmar alimentação e mudança de estado no circuito sem presumir pinagem até o PE82.10-D-2300A/WIS ser confirmado',
     'nivel','função HELLA confirmada; pinagem Mercedes LB5/ZL3 pendente')
   when n.label='Interruptor de ré' then jsonb_build_object(
     'ferramenta','multímetro + scanner quando disponível',
     'condicao','veículo imobilizado com segurança; ignição ligada conforme necessário',
     'teste','confirmar mudança de estado ao selecionar ré; com conector desligado e circuito desenergizado, testar continuidade somente se o tipo de interruptor simples for confirmado',
     'saida','se interruptor muda mas luz não acende, seguir alimentação/chicote/placa/terra da traseira')
   when n.label='Interruptor de embreagem' then jsonb_build_object(
     'ferramenta','scanner + multímetro',
     'teste','observar parâmetro de embreagem no scanner enquanto pressiona/solta pedal; se não mudar, verificar ajuste mecânico, alimentação e continuidade do interruptor conforme diagrama',
     'uso','estado pode participar de estratégia de ECU/partida/controle; não jumpear sem WIS')
   when n.label='Interruptor de faróis' then jsonb_build_object(
     'ferramenta','multímetro + lâmpada de prova adequada; osciloscópio se houver PWM',
     'teste','confirmar alimentação de entrada e mudança de saída conforme cada posição; seguir circuito até fusível/relé/lâmpada e massa',
     'pinagem','PE/WIS necessário para identificar pinos exatos')
   when n.label='Interruptor de pisca-alerta' then jsonb_build_object(
     'ferramenta','multímetro + scanner/osciloscópio quando aplicável',
     'teste','confirmar comando e saída funcional para os dois lados; depois verificar fusível/relé, conectores e lâmpadas',
     'pinagem','PE82.10-D-2200C identificado, mas configuração regional precisa ser confirmada')
   else jsonb_build_object(
     'ferramenta','multímetro + scanner',
     'sequencia','confirmar terminal 30 permanente, terminal 15 em RUN e terminal 50 em START pelo diagrama do veículo; medir sob carga quando possível',
     'diagnostico','se terminal 50 não aparece, verificar comutador/miolo, alimentação e intertravamentos antes do motor de partida',
     'pinagem','não presumir pinos físicos sem WIS') end,
 source_metadata=coalesce(n.source_metadata,'{}'::jsonb)||jsonb_build_object('diagnostic_confidence','functional_switch_test_exact_pinout_wis_gated'),updated_at=now()
from v where n.vehicle_id=v.id and n.label in ('Interruptor de luz de freio','Interruptor de ré','Interruptor de embreagem','Interruptor de faróis','Interruptor de pisca-alerta','Interruptor elétrico da ignição','Comutador/miolo de ignição');

-- Lighting loads and front/rear harnesses.
with v as (select id from public.v2_vehicles where upper(plate)='EJW6A76' limit 1)
update public.v2_vehicle_electrical_nodes n set
 test_procedure=jsonb_build_object(
   'ferramenta','multímetro + lâmpada de prova compatível; osciloscópio se circuito modulado',
   'passo_1','confirmar lâmpada/carga correta e integridade do soquete/placa',
   'passo_2','com função ligada, medir tensão no conector e comparar com tensão da bateria; queda grande aponta resistência em fusível, relé, chave ou chicote',
   'passo_3','medir queda de tensão no retorno de massa sob carga e inspecionar corrosão/encaixe',
   'passo_4','se duas funções acendem juntas ou há retorno por outra lâmpada, priorizar massa/placa traseira/conector compartilhado',
   'pinagem','PE82.10/WIS define fios/pinos exatos; permanece bloqueado até configuração regional/equipamento ser confirmada',
   'fonte_diagnostico','HELLA + Mercedes PE/WIS') ,
 source_metadata=coalesce(n.source_metadata,'{}'::jsonb)||jsonb_build_object('diagnostic_source_name','HELLA — signal lamp diagnostic','diagnostic_source_url','https://www.hella.com/techworld/br/tecnica/iluminacao/lanterna-de-sinalizacao/','diagnostic_confidence','manufacturer_general_lighting_test_exact_pinout_wis_gated'),updated_at=now()
from v where n.vehicle_id=v.id and n.label in (
 'Lâmpada da seta dianteira','Lâmpada de farol baixo/alto','Soquete/conector do farol','Soquete/placa de lâmpadas traseira','Chicote/conector de iluminação dianteira','Chicote/conector de iluminação traseira'
);

-- Horn.
with v as (select id from public.v2_vehicles where upper(plate)='EJW6A76' limit 1)
update public.v2_vehicle_electrical_nodes n set
 test_procedure=jsonb_build_object(
   'ferramenta','multímetro',
   'sequencia','testar fusível eletricamente; comandar buzina e confirmar tensão no conector; confirmar massa/retorno; verificar relé/contatos se não houver alimentação',
   'inspecao','porta-fusível e conectores com oxidação podem criar resistência e falha intermitente',
   'nivel','procedimento HELLA; fusível/relé/pinagem exatos dependem do diagrama Mercedes') ,
 source_metadata=coalesce(n.source_metadata,'{}'::jsonb)||jsonb_build_object('diagnostic_source_name','HELLA — horn diagnostic','diagnostic_source_url','https://www.hella.com/techworld/br/lounge/buzinas-e-fanfarras-hella-identificar-defeitos-e-corrigi-los-corretamente/','diagnostic_confidence','manufacturer_general_horn_test'),updated_at=now()
from v where n.vehicle_id=v.id and n.label='Buzina';

-- Engine oil level/temperature sensor: plausibility first; no invented pinout or voltage.
with v as (select id from public.v2_vehicles where upper(plate)='EJW6A76' limit 1)
update public.v2_vehicle_electrical_nodes n set
 test_procedure=jsonb_build_object(
   'ferramenta','scanner + multímetro',
   'nivel_oleo','em piso nivelado e condição apropriada, comparar indicação/valor do scanner com nível físico pela vareta',
   'temperatura','após repouso prolongado, temperatura do óleo deve ser plausível frente ao ambiente/outros sensores; acompanhar aquecimento sem saltos',
   'eletrico','inspecionar conector/chicote, alimentação e massa somente conforme diagrama; não assumir tecnologia/pinagem até identificar o sensor instalado',
   'ntc','se a função de temperatura desta peça for confirmada como NTC, a resistência deve diminuir com o aquecimento; medir apenas desenergizado',
   'nivel','diagnóstico por plausibilidade HELLA; arquitetura exata do sensor W903 ainda pendente') ,
 source_metadata=coalesce(n.source_metadata,'{}'::jsonb)||jsonb_build_object('diagnostic_source_name','HELLA — oil level/temperature sensor reference','diagnostic_source_url','https://www.hella.com/techworld/br/pecas-automotivas/sistema-eletronico-automovel/outros-sensores/','diagnostic_confidence','technology_plausibility_exact_pinout_pending'),updated_at=now()
from v where n.vehicle_id=v.id and n.label='Sensor de nível/temperatura do óleo';

-- Harness/connectors: generic safe electrical integrity workflow.
with v as (select id from public.v2_vehicles where upper(plate)='EJW6A76' limit 1)
update public.v2_vehicle_electrical_nodes n set
 test_procedure=jsonb_build_object(
   'ferramenta','multímetro + osciloscópio conforme sinal',
   'visual','inspecionar trava, terminais recuados, oxidação, óleo/água, atrito e fio quebrado perto do conector',
   'continuidade','com módulos/sensores desconectados e circuito desenergizado, testar continuidade ponta a ponta pelo diagrama',
   'curto','verificar curto para massa/positivo somente com os módulos protegidos/desconectados conforme procedimento',
   'sob_carga','quando se tratar de alimentação ou massa, preferir queda de tensão sob carga à simples continuidade',
   'wiggle','repetir monitorando scanner/osciloscópio enquanto movimenta suavemente o chicote para falhas intermitentes',
   'regra','não perfurar isolamento se houver alternativa de backprobe; reparar com método/bitola apropriados') ,
 source_metadata=coalesce(n.source_metadata,'{}'::jsonb)||jsonb_build_object('diagnostic_confidence','generic_harness_integrity_workflow'),updated_at=now()
from v where n.vehicle_id=v.id and n.label in ('Chicote principal do motor','Conector de excitação/sinal','Conector do quadro de instrumentos','Conector de diagnóstico OBD');

-- Mark catalog-only hardware so the UI can de-emphasize it without deleting catalog data.
with v as (select id from public.v2_vehicles where upper(plate)='EJW6A76' limit 1)
update public.v2_vehicle_electrical_nodes n set
 source_metadata=coalesce(n.source_metadata,'{}'::jsonb)||jsonb_build_object(
   'diagnostic_applicability','epc_reference_only',
   'diagnostic_note','Item preservado no catálogo/EPC; não é alvo primário de diagnóstico elétrico.'
 ),updated_at=now()
from v where n.vehicle_id=v.id and (
 n.label ~* '^Parafuso|^Tampa do fusível|^TAPPING SCREW|^SOLDER SLEEVE|^LOOM TIE|^LOCKING/CLAMPING RING|^FUSE BOX COVER/CAP|^PLUG HOUSING|^RECEPTACLE HOUSING|^RECEPTACLE HOUSING / SOCKET|^Polia do alternador|^Bandeja da bateria'
);

-- Preserve PE/WIS gates explicitly on ABS/lighting-related nodes.
with v as (select id from public.v2_vehicles where upper(plate)='EJW6A76' limit 1)
update public.v2_vehicle_electrical_nodes n set
 source_metadata=coalesce(n.source_metadata,'{}'::jsonb)||jsonb_build_object('final_pinout_source','Mercedes XENTRY WIS','vin_specific_pinout_status','blocked_until_vehicle_configuration_confirmed'),updated_at=now()
from v where n.vehicle_id=v.id and (
 n.label='Sensor ABS de roda' or n.label in ('Interruptor de luz de freio','Interruptor de faróis','Interruptor de pisca-alerta','Lâmpada da seta dianteira','Lâmpada de farol baixo/alto','Soquete/conector do farol','Soquete/placa de lâmpadas traseira','Chicote/conector de iluminação dianteira','Chicote/conector de iluminação traseira')
);
