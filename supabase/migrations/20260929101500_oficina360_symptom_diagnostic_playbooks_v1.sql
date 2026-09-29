-- Oficina 360 — symptom diagnostic playbooks v1
-- Keeps symptom-first diagnostic logic data-driven and reuses persistent guided sessions.

create table if not exists public.v2_vehicle_symptom_playbooks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.v2_companies(id) on delete cascade,
  vehicle_id uuid references public.v2_vehicles(id) on delete cascade,
  chassis_variant text,
  engine_code text,
  symptom_key text not null,
  title text not null,
  category text not null default 'general',
  aliases text[] not null default '{}'::text[],
  description text,
  related_dtcs text[] not null default '{}'::text[],
  ordered_tests jsonb not null default '[]'::jsonb,
  likely_causes jsonb not null default '[]'::jsonb,
  source_metadata jsonb not null default '{}'::jsonb,
  verification_status text not null default 'reference'
    check (verification_status in ('verified','reference','estimated','needs_physical_verification')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_v2_symptom_playbook_global
  on public.v2_vehicle_symptom_playbooks(symptom_key)
  where company_id is null and vehicle_id is null and chassis_variant is null and engine_code is null;
create unique index if not exists uq_v2_symptom_playbook_vehicle
  on public.v2_vehicle_symptom_playbooks(vehicle_id,symptom_key)
  where vehicle_id is not null;
create index if not exists idx_v2_symptom_playbook_key
  on public.v2_vehicle_symptom_playbooks(symptom_key,active);
create index if not exists idx_v2_symptom_playbook_vehicle
  on public.v2_vehicle_symptom_playbooks(vehicle_id,active);
create index if not exists idx_v2_symptom_playbook_company
  on public.v2_vehicle_symptom_playbooks(company_id);

alter table public.v2_vehicle_symptom_playbooks enable row level security;

drop policy if exists v2_symptom_playbooks_select on public.v2_vehicle_symptom_playbooks;
create policy v2_symptom_playbooks_select on public.v2_vehicle_symptom_playbooks
for select to authenticated
using (company_id is null or public.v2_is_company_member(company_id));

drop policy if exists v2_symptom_playbooks_insert on public.v2_vehicle_symptom_playbooks;
create policy v2_symptom_playbooks_insert on public.v2_vehicle_symptom_playbooks
for insert to authenticated
with check (company_id is not null and public.v2_has_permission(company_id,'workshop.manage'));

drop policy if exists v2_symptom_playbooks_update on public.v2_vehicle_symptom_playbooks;
create policy v2_symptom_playbooks_update on public.v2_vehicle_symptom_playbooks
for update to authenticated
using (company_id is not null and public.v2_has_permission(company_id,'workshop.manage'))
with check (company_id is not null and public.v2_has_permission(company_id,'workshop.manage'));

drop policy if exists v2_symptom_playbooks_delete on public.v2_vehicle_symptom_playbooks;
create policy v2_symptom_playbooks_delete on public.v2_vehicle_symptom_playbooks
for delete to authenticated
using (company_id is not null and public.v2_has_permission(company_id,'workshop.manage'));

grant select,insert,update,delete on public.v2_vehicle_symptom_playbooks to authenticated;

insert into public.v2_vehicle_symptom_playbooks
(symptom_key,title,category,aliases,description,related_dtcs,ordered_tests,likely_causes,source_metadata,verification_status)
values
(
 'loss_of_power_limp','Perda de força / modo de emergência','engine_performance',
 array['perde força','sem força','fraca','amarrada','modo emergência','limp mode','turbo corta','desliga e liga volta','não desenvolve'],
 'Roteiro diesel por sintoma: confirmar condição, correlacionar DTCs e comparar ar/sobrealimentação/combustível antes de substituir componentes.',
 array['P0299','P0234','P0100','P0101','P0102','P0103','P0105','P0106','P0190','P0191','P0400'],
 '[
  {"key":"scan_context","action":"Reproduzir a perda de força e registrar DTCs ativos/pendentes, freeze frame e condição exata em que o defeito aparece. Não apagar a memória antes do registro.","expected":"Condição e códigos registrados","candidate_if_fail":["falha eletrônica/intermitente registrada pela ECU"],"next_on_pass":1,"next_on_fail":1},
  {"key":"intake_visual","action":"Inspecionar filtro de ar, mangueiras entre filtro/turbo/intercooler/coletor, abraçadeiras e sinais de óleo/rasgo que indiquem fuga de pressão.","expected":"Admissão sem obstrução nem fuga visível","candidate_if_fail":["restrição de admissão","vazamento de pressurização/intercooler"],"related_terms":["turbo","pressão","map","maf"],"next_on_pass":2,"next_on_fail":8},
  {"key":"boost_compare","action":"Com scanner, comparar pressão de sobrealimentação/MAP desejada x real durante aceleração sob carga; observar se a pressão real fica consistentemente abaixo ou acima do comando.","expected":"Pressão real acompanha a solicitada de forma plausível","candidate_if_fail":["controle do turbo","vazamento de pressurização","sensor MAP","atuador/transdutor do turbo"],"related_terms":["map","pressão de admissão","turbo","transdutor"],"next_on_pass":4,"next_on_fail":3},
  {"key":"turbo_control","action":"Testar alimentação/comando do controle do turbo e, quando aplicável, vácuo/pressão nas mangueiras e movimentação do atuador. Confirmar o circuito antes de condenar turbo ou válvula.","expected":"Comando elétrico/pneumático e atuador respondem ao teste","candidate_if_fail":["transdutor/solenoide de controle","mangueira de vácuo/pressão","atuador do turbo","chicote/alimentação"],"related_terms":["turbo","transdutor","atuador","vácuo"],"next_on_pass":4,"next_on_fail":8},
  {"key":"air_sensors","action":"Comparar MAF/MAP/IAT no scanner com valores plausíveis e executar os testes elétricos cadastrados no Mapa Elétrico quando houver divergência.","expected":"Sensores de ar plausíveis e circuitos dentro do esperado","candidate_if_fail":["MAF","MAP","IAT","referência 5 V/terra/chicote"],"related_terms":["maf","map","temperatura do ar","iat"],"next_on_pass":5,"next_on_fail":8},
  {"key":"rail_compare","action":"Comparar pressão do rail solicitada x real no momento da perda de potência. Se houver diferença, verificar baixa alimentação, retorno, controle e sensor antes de abrir o circuito de alta pressão.","expected":"Pressão real acompanha a solicitada sem queda anormal","candidate_if_fail":["alimentação de combustível","controle de pressão do rail","sensor de rail","retorno excessivo de injetor"],"related_terms":["rail","pressão combustível","sensor de pressão"],"next_on_pass":6,"next_on_fail":8},
  {"key":"egr_exhaust","action":"Se aplicável ao veículo, verificar EGR/admissão por travamento ou fluxo incoerente e restrição de escape; correlacionar sempre com dados do scanner e inspeção física.","expected":"Fluxo de admissão/escape coerente e sem travamento evidente","candidate_if_fail":["EGR travada","restrição de escape/admissão"],"related_terms":["egr","escape","admissão"],"next_on_pass":7,"next_on_fail":8},
  {"key":"electrical_integrity","action":"Fazer teste de alimentação, aterramento, continuidade e queda de tensão dos circuitos envolvidos, priorizando componentes que apresentaram leitura incoerente.","expected":"Alimentações, terras e chicotes íntegros","candidate_if_fail":["mau contato","aterramento deficiente","chicote/conector"],"related_terms":["terra","alimentação","ecu"],"next_on_pass":8,"next_on_fail":8},
  {"key":"confirm_repair","action":"Após o reparo, apagar códigos somente quando apropriado, repetir a condição de carga e confirmar que a potência voltou e que DTCs não retornam.","expected":"Defeito não reaparece no teste de confirmação","candidate_if_fail":["causa raiz ainda não eliminada"]}
 ]'::jsonb,
 '["vazamento/restrição de admissão","controle/atuador do turbo","MAF/MAP/IAT ou circuito","pressão/fornecimento de combustível","EGR/escape","chicote/alimentação/terra"]'::jsonb,
 '{"scope":"generic_diesel","rule":"measurement_before_replacement"}'::jsonb,'reference'
),
(
 'no_start','Motor gira e não pega','starting',
 array['não pega','nao pega','gira e não pega','gira mas não liga','motor gira mas não funciona'],
 'Sequência de não-partida com prioridade para tensão/rotação, sincronismo e pressão de combustível.',
 array['P0335','P0340','P0190','P0191'],
 '[
  {"key":"battery_crank","action":"Medir tensão da bateria durante a partida e confirmar velocidade de arranque pelo scanner/tacômetro. Corrigir baixa tensão ou arranque lento antes de avançar.","expected":"Tensão e rotação de partida suficientes","candidate_if_fail":["bateria","cabos/aterramento","motor de partida"],"related_terms":["bateria","partida","terra"],"next_on_pass":1,"next_on_fail":7},
  {"key":"scan_no_start","action":"Ler DTCs sem apagar e observar no scanner rotação do motor, sincronismo de fase/rotação e parâmetros essenciais durante a partida.","expected":"RPM detectado e sincronismo plausível","candidate_if_fail":["sensor de rotação","sensor de fase","chicote/sincronismo mecânico"],"related_terms":["rotação","fase","crank","cam"],"next_on_pass":2,"next_on_fail":7},
  {"key":"rail_start","action":"Comparar pressão do rail solicitada x real durante a partida. Se não formar pressão, testar alimentação, retorno e controle antes de desmontar alta pressão.","expected":"Pressão de partida atinge nível necessário para habilitar injeção","candidate_if_fail":["baixa alimentação","retorno excessivo","controle/sensor do rail","bomba de alta"],"related_terms":["rail","pressão combustível"],"next_on_pass":3,"next_on_fail":7},
  {"key":"ecu_power","action":"Confirmar alimentação, aterramento e fusíveis/relés dos módulos de gerenciamento do motor e componentes essenciais.","expected":"Alimentação e aterramentos estáveis durante a partida","candidate_if_fail":["fusível/relé","alimentação da ECU","aterramento/chicote"],"related_terms":["ecu","relé","fusível","terra"],"next_on_pass":4,"next_on_fail":7},
  {"key":"fuel_supply","action":"Confirmar combustível correto, ausência de entrada de ar e alimentação de baixa pressão/fluxo até o sistema de injeção.","expected":"Alimentação de combustível contínua e sem ar","candidate_if_fail":["filtro/linha de combustível","entrada de ar","baixa alimentação"],"next_on_pass":5,"next_on_fail":7},
  {"key":"injection_enable","action":"Verificar se a ECU está habilitando injeção e, se necessário, executar teste de retorno/balanço conforme o sistema e procedimento técnico disponível.","expected":"Injeção habilitada e retorno dentro do esperado","candidate_if_fail":["injetor/retorno excessivo","comando de injeção"],"next_on_pass":6,"next_on_fail":7},
  {"key":"mechanical_check","action":"Se elétrica, sincronismo eletrônico e combustível estiverem coerentes, avaliar compressão/sincronismo mecânico conforme procedimento do motor.","expected":"Condição mecânica suficiente para combustão","candidate_if_fail":["baixa compressão","sincronismo mecânico"]},
  {"key":"confirm_no_start","action":"Depois da correção, repetir partida a frio/quente conforme o sintoma e confirmar ausência de DTC recorrente.","expected":"Motor parte normalmente e falha não retorna"}
 ]'::jsonb,
 '["bateria/partida","sensor de rotação/fase","pressão de combustível","alimentação ECU","injetores","compressão/sincronismo"]'::jsonb,
 '{"scope":"generic_diesel"}'::jsonb,'reference'
),
(
 'hard_start','Partida difícil / demora para pegar','starting',
 array['partida difícil','demora pegar','custa pegar','pega ruim frio','pega ruim quente','demora para ligar'],
 'Roteiro de partida difícil sem condenar injetor, sensor ou vela por tentativa.',
 array['P0380','P0335','P0340','P0190','P0191'],
 '[
  {"key":"starting_condition","action":"Definir se ocorre a frio, quente ou sempre; registrar tempo de partida, tensão e RPM durante o defeito.","expected":"Condição reproduzida e registrada","candidate_if_fail":["alimentação/arranque lento"],"next_on_pass":1,"next_on_fail":6},
  {"key":"temperature_plausibility","action":"Após repouso, comparar ECT/IAT do scanner com temperatura ambiente plausível e observar aquecimento sem saltos.","expected":"Temperaturas plausíveis e estáveis","candidate_if_fail":["sensor ECT/IAT","chicote/referência"],"related_terms":["temperatura","iat","líquido"],"next_on_pass":2,"next_on_fail":6},
  {"key":"glow_system","action":"Em diesel com pré-aquecimento, verificar alimentação, comando e corrente/resistência das velas conforme procedimento aplicável.","expected":"Sistema de pré-aquecimento funcional","candidate_if_fail":["velas aquecedoras","relé/módulo de pré-aquecimento","chicote"],"related_terms":["vela","aquecimento","relé"],"next_on_pass":3,"next_on_fail":6},
  {"key":"rail_during_start","action":"Comparar pressão de rail solicitada x real durante a partida difícil e observar tempo até formar pressão.","expected":"Pressão sobe rapidamente ao nível de habilitação","candidate_if_fail":["retorno excessivo","alimentação de combustível","controle/sensor do rail"],"related_terms":["rail","pressão combustível"],"next_on_pass":4,"next_on_fail":6},
  {"key":"fuel_air_ingress","action":"Verificar filtro/linhas e indícios de entrada de ar ou retorno de combustível durante repouso.","expected":"Circuito de baixa sem entrada de ar/perda de coluna","candidate_if_fail":["entrada de ar","filtro/vedação/linha"],"next_on_pass":5,"next_on_fail":6},
  {"key":"mechanical_if_needed","action":"Persistindo a falha com sensores, pré-aquecimento e combustível coerentes, avaliar compressão e sincronismo mecânico.","expected":"Compressão e sincronismo adequados"},
  {"key":"confirm_hard_start","action":"Repetir partida na mesma condição em que o defeito ocorria e confirmar tempo normal e ausência de DTC recorrente.","expected":"Partida normalizada"}
 ]'::jsonb,
 '["baixa tensão/RPM","temperatura incoerente","pré-aquecimento","formação lenta de rail","entrada de ar","compressão"]'::jsonb,
 '{"scope":"generic_diesel"}'::jsonb,'reference'
),
(
 'overheating','Superaquecimento / temperatura alta','cooling',
 array['esquenta','superaquece','temperatura alta','ferve','passa da temperatura','aquecendo'],
 'Diagnóstico de arrefecimento priorizando segurança, nível/vazamento, circulação, ventilação e plausibilidade do sensor.',
 array['P0115','P0116','P0117','P0118','P0217'],
 '[
  {"key":"cooling_safety","action":"Com motor frio, verificar nível/estado do fluido e sinais de vazamento. Nunca abrir reservatório pressurizado com o sistema quente.","expected":"Nível correto e sem vazamento evidente","candidate_if_fail":["vazamento/baixo nível"],"next_on_pass":1,"next_on_fail":6},
  {"key":"temp_sensor","action":"Comparar temperatura do scanner com medição/condição real; observar subida progressiva e coerente.","expected":"Leitura de temperatura plausível","candidate_if_fail":["sensor de temperatura/chicote"],"related_terms":["temperatura","líquido"],"next_on_pass":2,"next_on_fail":6},
  {"key":"fan_belt","action":"Verificar correias, acionamento da bomba d''água e ventilador/embreagem/controle elétrico conforme configuração.","expected":"Bomba e ventilação acionam corretamente","candidate_if_fail":["bomba d''água/correia","ventilador/acionamento"],"related_terms":["ventilador","temperatura"],"next_on_pass":3,"next_on_fail":6},
  {"key":"thermostat_flow","action":"Verificar abertura da válvula termostática e diferença de temperatura/fluxo no radiador sem provocar queimaduras.","expected":"Circulação e abertura coerentes","candidate_if_fail":["válvula termostática","radiador obstruído"],"next_on_pass":4,"next_on_fail":6},
  {"key":"cooling_pressure","action":"Se necessário, pressurizar o sistema a frio com ferramenta apropriada e verificar perda de pressão/vazamentos ocultos.","expected":"Sistema mantém pressão conforme especificação aplicável","candidate_if_fail":["vazamento oculto","tampa/vedação"],"next_on_pass":5,"next_on_fail":6},
  {"key":"combustion_gas","action":"Persistindo superaquecimento sem causa externa, investigar gases de combustão/vedação do motor com teste apropriado.","expected":"Sem evidência de gases de combustão no arrefecimento","candidate_if_fail":["junta/cabeçote/vedação interna"]},
  {"key":"confirm_cooling","action":"Após correção, aquecer em condição controlada e confirmar estabilização da temperatura e ausência de vazamentos.","expected":"Temperatura estabiliza normalmente"}
 ]'::jsonb,
 '["vazamento/baixo nível","sensor de temperatura","bomba/ventilador","termostática/radiador","vedação interna"]'::jsonb,
 '{"scope":"generic_vehicle","safety":"cooling_system_hot_pressure"}'::jsonb,'reference'
),
(
 'black_smoke','Fumaça preta / excesso de fuligem','combustion',
 array['fumaça preta','fumaceia preto','solta preto','muita fuligem'],
 'Roteiro diesel para excesso de combustível relativo ao ar, sem condenar injetores antes de medir ar, boost e rail.',
 array['P0100','P0101','P0105','P0106','P0299','P0400','P0191'],
 '[
  {"key":"air_filter_boost_leak","action":"Verificar filtro de ar e todo o caminho turbo/intercooler/coletor por restrição ou fuga.","expected":"Entrada de ar livre e pressurização estanque","candidate_if_fail":["filtro restrito","vazamento de boost"],"related_terms":["turbo","map","maf"],"next_on_pass":1,"next_on_fail":5},
  {"key":"maf_map_black_smoke","action":"Comparar MAF/MAP no scanner e testar circuito do sensor se a leitura for incoerente.","expected":"Massa/pressão de ar plausíveis","candidate_if_fail":["MAF/MAP/circuito"],"related_terms":["maf","map"],"next_on_pass":2,"next_on_fail":5},
  {"key":"turbo_egr","action":"Verificar controle do turbo e EGR quando aplicável; observar se há baixa massa de ar por comando/travamento.","expected":"Turbo/EGR respondem de forma coerente","candidate_if_fail":["controle do turbo","EGR travada"],"related_terms":["turbo","egr","transdutor"],"next_on_pass":3,"next_on_fail":5},
  {"key":"fuel_balance","action":"Comparar rail desejado x real e correções/balanço disponíveis; investigar retorno/injetores somente se os dados apontarem combustível excessivo ou desequilíbrio.","expected":"Pressão e balanço coerentes","candidate_if_fail":["injetor","controle/pressão de combustível"],"related_terms":["rail","injetor"],"next_on_pass":4,"next_on_fail":5},
  {"key":"mechanical_air","action":"Se gerenciamento estiver coerente, avaliar restrição de escape, compressão e condição mecânica conforme sintomas associados.","expected":"Sem restrição ou falha mecânica relevante"},
  {"key":"confirm_smoke","action":"Repetir aceleração/carga de forma segura após reparo e confirmar redução da fumaça e ausência de DTC recorrente.","expected":"Combustão normalizada"}
 ]'::jsonb,
 '["restrição/fuga de ar","MAF/MAP","turbo/EGR","injeção/rail","restrição de escape/mecânica"]'::jsonb,
 '{"scope":"generic_diesel"}'::jsonb,'reference'
),
(
 'intermittent_fault','Falha intermitente / volta ao reiniciar','electrical',
 array['intermitente','vai e volta','desliga e liga volta','reinicia e volta','às vezes falha','falha aleatória'],
 'Roteiro para falha intermitente priorizando memória de DTC, freeze frame, alimentação e teste de chicote/conector.',
 array[]::text[],
 '[
  {"key":"freeze_frame","action":"Registrar DTCs ativos/pendentes/históricos e freeze frame antes de reiniciar ou apagar falhas.","expected":"Evidência eletrônica registrada","candidate_if_fail":["evento não capturado; priorizar reprodução monitorada"],"next_on_pass":1,"next_on_fail":1},
  {"key":"power_ground","action":"Monitorar tensão de alimentação e aterramentos do sistema afetado, inclusive durante vibração/carga/temperatura em que a falha aparece.","expected":"Sem queda/interrupção de alimentação","candidate_if_fail":["mau contato em alimentação/terra","relé/fusível/conector"],"related_terms":["terra","alimentação","relé","ecu"],"next_on_pass":2,"next_on_fail":4},
  {"key":"wiggle_harness","action":"Inspecionar e movimentar cuidadosamente chicote/conectores do circuito suspeito enquanto monitora o parâmetro no scanner/multímetro/osciloscópio.","expected":"Sinal permanece estável","candidate_if_fail":["fio rompido internamente","terminal frouxo/oxidado","conector"],"next_on_pass":3,"next_on_fail":4},
  {"key":"thermal_repro","action":"Tentar reproduzir com motor frio/quente e registrar exatamente quando o parâmetro sai do normal; evitar trocar peças sem reprodução ou medição.","expected":"Condição delimitada ou falha não reaparece","candidate_if_fail":["falha térmica em sensor/atuador/módulo"]},
  {"key":"confirm_intermittent","action":"Após correção, repetir a condição por tempo suficiente e verificar que a falha/DTC não retorna.","expected":"Falha não retorna"}
 ]'::jsonb,
 '["alimentação/terra","relé/fusível","chicote/conector","falha térmica de componente"]'::jsonb,
 '{"scope":"generic_vehicle"}'::jsonb,'reference'
)
on conflict do nothing;

-- Sprinter EJW6A76: exact vehicle route based on the technical/electrical dataset already curated in Oficina 360.
with v as (
  select v.id,v.company_id,p.chassis_variant,p.engine_code
  from public.v2_vehicles v
  left join public.v2_vehicle_technical_profiles p on p.vehicle_id=v.id
  where upper(v.plate)='EJW6A76'
  limit 1
)
insert into public.v2_vehicle_symptom_playbooks
(company_id,vehicle_id,chassis_variant,engine_code,symptom_key,title,category,aliases,description,related_dtcs,ordered_tests,likely_causes,source_metadata,verification_status)
select v.company_id,v.id,v.chassis_variant,v.engine_code,
 'loss_of_power_limp','Sprinter 313 CDI — perda de força / volta após reiniciar','engine_performance',
 array['perde força','turbo desativa','sem força','desliga e liga volta','modo emergência','limp mode'],
 'Árvore específica da Sprinter 313 CDI cadastrada, priorizando MAP/MAF/IAT, controle do turbo, pressão de rail e integridade elétrica já presentes no Mapa Elétrico.',
 array['P0299','P0234','P0100','P0101','P0105','P0106','P0110','P0190','P0191','P0400'],
 '[
  {"key":"sprinter_capture","action":"Reproduzir a perda de força e registrar DTCs/freeze frame. Anotar se o desempenho volta imediatamente ao desligar e ligar a ignição.","expected":"Condição e DTCs registrados antes de apagar memória","candidate_if_fail":["falha intermitente sem evidência; manter monitoramento"],"next_on_pass":1,"next_on_fail":1},
  {"key":"sprinter_intake_leak","action":"Inspecionar mangueiras do turbo/intercooler/coletor, abraçadeiras e antichama/ventilação por vazamento. Procurar óleo pulverizado e assobio sob carga.","expected":"Sistema de admissão/pressurização estanque","candidate_if_fail":["mangueira/intercooler/abraçadeira","vazamento de pressurização"],"related_terms":["turbo","map","admissão"],"next_on_pass":2,"next_on_fail":8},
  {"key":"sprinter_map_boost","action":"No scanner, comparar MAP/pressão de turbo solicitada x real durante a falha. Se incoerente, usar o procedimento do Mapa Elétrico para testar referência, terra e sinal do MAP.","expected":"MAP real acompanha o comando de sobrealimentação","candidate_if_fail":["MAP/circuito","vazamento de boost","controle do turbo"],"related_terms":["sensor de pressão de admissão","map","turbo"],"next_on_pass":4,"next_on_fail":3},
  {"key":"sprinter_turbo_transducer","action":"Testar o transdutor/controle do turbo, alimentação/comando e mangueiras pneumáticas conforme o Mapa Elétrico; confirmar movimentação do atuador antes de condenar turbina.","expected":"Controle elétrico/pneumático e atuador respondem","candidate_if_fail":["transdutor do turbo","mangueira pneumática","atuador","chicote"],"related_terms":["transdutor","turbo","atuador"],"next_on_pass":4,"next_on_fail":8},
  {"key":"sprinter_maf_iat","action":"Conferir MAF e IAT no scanner. Executar os testes cadastrados no Mapa Elétrico, dando atenção especial a chicote/conector e qualquer reparo recente do IAT.","expected":"MAF/IAT plausíveis e circuitos estáveis","candidate_if_fail":["MAF","IAT","fio/conector/referência/terra"],"related_terms":["massa de ar","maf","temperatura do ar","iat"],"next_on_pass":5,"next_on_fail":8},
  {"key":"sprinter_rail","action":"Comparar pressão do rail solicitada x real durante aceleração e no instante da perda de força. Se houver queda, seguir alimentação/retorno/controle/sensor sem abrir linha pressurizada.","expected":"Pressão real acompanha a solicitada","candidate_if_fail":["alimentação de combustível","sensor/controle do rail","retorno de injetor"],"related_terms":["rail","pressão de combustível"],"next_on_pass":6,"next_on_fail":8},
  {"key":"sprinter_egr","action":"Correlacionar EGR/admissão com massa de ar e DTCs. Verificar travamento/fluxo incoerente somente quando os dados apontarem essa direção.","expected":"EGR/admissão coerentes com a condição","candidate_if_fail":["EGR/admissão"],"related_terms":["egr","admissão"],"next_on_pass":7,"next_on_fail":8},
  {"key":"sprinter_power_ground","action":"Executar queda de tensão e teste de continuidade nos circuitos que apresentaram anomalia, incluindo terras e alimentação da ECU/sensores. Fazer teste de movimentação do chicote quando a falha for intermitente.","expected":"Alimentações, terras e chicotes estáveis","candidate_if_fail":["chicote/conector","aterramento","alimentação/relé"],"related_terms":["terra","alimentação","ecu"],"next_on_pass":8,"next_on_fail":8},
  {"key":"sprinter_confirm","action":"Depois do reparo, repetir o mesmo percurso/carga que provocava a falha, comparar dados ao vivo e confirmar que o modo de emergência e os DTCs não retornam.","expected":"Potência normal e falha não retorna"}
 ]'::jsonb,
 '["vazamento de pressurização","MAP/MAF/IAT ou chicote","transdutor/atuador do turbo","pressão de rail/combustível","EGR/admissão","alimentação/terra"]'::jsonb,
 jsonb_build_object('scope','vehicle_exact_route','plate','EJW6A76','chassis_variant',v.chassis_variant,'engine_code',v.engine_code,'uses_existing_electrical_map',true),
 'reference'
from v
on conflict (vehicle_id,symptom_key) where vehicle_id is not null
do update set
 title=excluded.title,aliases=excluded.aliases,description=excluded.description,related_dtcs=excluded.related_dtcs,
 ordered_tests=excluded.ordered_tests,likely_causes=excluded.likely_causes,source_metadata=excluded.source_metadata,
 verification_status=excluded.verification_status,updated_at=now();

comment on table public.v2_vehicle_symptom_playbooks is 'Data-driven symptom-first diagnostic trees used by Oficina 360.';
