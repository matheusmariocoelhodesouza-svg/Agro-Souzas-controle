-- Oficina 360 — Sprinter electrical cleanup/completion v1
-- De-emphasize EPC duplicates/unidentified repair items and finish the few remaining functional nodes.

with v as (select id from public.v2_vehicles where upper(plate)='EJW6A76' limit 1)
update public.v2_vehicle_electrical_nodes n set
 source_metadata=coalesce(n.source_metadata,'{}'::jsonb)||jsonb_build_object(
   'diagnostic_applicability','epc_reference_only',
   'diagnostic_note','Item EPC duplicado, família genérica ou item de reparo sem função elétrica única. A função diagnosticável equivalente permanece em outro nó do mapa ou depende de identificação física.'
 ),updated_at=now()
from v where n.vehicle_id=v.id and n.label in (
 'CAM/PHASE SENDER UNIT — OM611.981 — Velas, sensores, anéis e fixações elétricas • item 11',
 'COOLANT TEMP SENSOR — OM611.981 — Velas, sensores, anéis e fixações elétricas • item 83',
 'CRANK POSITION SENSOR — OM611.981 — Velas, sensores, anéis e fixações elétricas • item 32',
 'DIAGNOSTIC SOCKET — Sprinter 903.662 — Caixa de fusíveis, diagnóstico e módulos do painel • item 40',
 'ENGINE CONTROL/OPERATING UNIT FAMILY — Sprinter 903.662 — Caixa de fusíveis, diagnóstico e módulos do painel • item 75',
 'CLUTCH/CONNECTOR — Sprinter 903.662 — Caixa de fusíveis, diagnóstico e módulos do painel • item 100',
 'CLUTCH/CONNECTOR — Sprinter 903.662 — Chicote do motor e conectores de reparo • item 135',
 'CLUTCH/CONNECTOR — Sprinter 903.662 — Módulos e conectores no compartimento do motor • item 10',
 'ELECTRICAL CABLE — Sprinter 903.662 — Chicote do motor e conectores de reparo • item 133',
 'LINE/WIRE — Sprinter 903.662 — Chicote do motor e conectores de reparo • item 136',
 'PLUG — Sprinter 903.662 — Chicote do motor e conectores de reparo • item 132',
 'SENDER UNIT — OM611.981 — Velas, sensores, anéis e fixações elétricas • item 47',
 'CONTROL UNIT / SAM FAMILY — Sprinter 903.662 — Módulos e conectores no compartimento do motor • item 5',
 'RELAY — Sprinter 903.662 — Caixa de fusíveis, diagnóstico e módulos do painel • item 7',
 'RELAY FAMILY — Sprinter 903.662 — Relés e porta-fusíveis no banco/assento • item 100',
 'RELAY FAMILY — Sprinter 903.662 — Relés e porta-fusíveis no banco/assento • item 105'
);

with v as (select id from public.v2_vehicles where upper(plate)='EJW6A76' limit 1)
update public.v2_vehicle_electrical_nodes n set
 test_procedure=jsonb_build_object(
   'ferramenta','multímetro + scanner quando houver teste de atuadores',
   'passo_1','confirmar se o buzzer é comandado diretamente ou pelo painel/módulo antes de energizar qualquer pino',
   'passo_2','usar teste de atuadores do scanner quando disponível; se houver comando e não houver som, verificar alimentação, massa e saída do módulo pelo diagrama',
   'passo_3','não aplicar 12 V diretamente até confirmar arquitetura e pinagem',
   'nivel','item EPC identificado, mas arquitetura elétrica específica depende do WIS') ,
 source_metadata=coalesce(n.source_metadata,'{}'::jsonb)||jsonb_build_object('diagnostic_confidence','functional_test_wis_pinout_required'),updated_at=now()
from v where n.vehicle_id=v.id and n.label='BUZZER — Sprinter 903.662 — Caixa de fusíveis, diagnóstico e módulos do painel • item 125';

with v as (select id from public.v2_vehicles where upper(plate)='EJW6A76' limit 1)
update public.v2_vehicle_electrical_nodes n set
 test_procedure=jsonb_build_object(
   'ferramenta','multímetro + scanner quando disponível',
   'primeiro','testar o sistema de carga completo: bateria em repouso, tensão de carga, queda de tensão no B+ e massa do alternador',
   'referencia_carga','rede 12 V em carga deve ser avaliada com referência HELLA 13,7–15,0 V; especificação Mercedes prevalece',
   'regulador','se B+ e massa estão bons e tensão permanece baixa/alta/instável, investigar regulador/porta-escovas, rotor/estator e sinal de excitação conforme modelo instalado',
   'nao_condenar','não trocar regulador apenas pela tensão sem excluir correia/polia, bateria, cabos, massa e alternador',
   'nivel','roteiro de sistema; teste interno exato do regulador depende do alternador Bosch/Mercedes instalado') ,
 source_metadata=coalesce(n.source_metadata,'{}'::jsonb)||jsonb_build_object('diagnostic_source_name','HELLA — charging system','diagnostic_source_url','https://www.hella.com/techworld/br/tecnica/eletrica-eletronica/sistema-de-arranque-e-de-carregamento/trabalhos-de-servico-no-sistema-de-carregamento/','diagnostic_confidence','system_level_reference_exact_regulator_pending'),updated_at=now()
from v where n.vehicle_id=v.id and n.label='Regulador/porta-escovas do alternador';

with v as (select id from public.v2_vehicles where upper(plate)='EJW6A76' limit 1)
update public.v2_vehicle_electrical_nodes n set
 test_procedure=jsonb_build_object(
   'ferramenta','multímetro + scanner/controle remoto conforme sistema',
   'passo_1','verificar se todas as portas falham ou apenas uma; isso separa falha de comando/alimentação de falha local',
   'passo_2','acionar trava/destrava e ouvir/observar o atuador; verificar travamento mecânico da fechadura',
   'passo_3','medir alimentação no atuador durante o comando somente após identificar no diagrama se o sistema usa reversão de polaridade ou módulo dedicado',
   'passo_4','se há comando elétrico mas não há movimento, verificar atuador/mecanismo; se não há comando, seguir chicote, módulo, fusível e interruptores',
   'nao_fazer','não alimentar diretamente o atuador sem confirmar arquitetura/polaridade',
   'nivel','roteiro funcional; pinagem da conversão/carroceria precisa ser confirmada fisicamente/WIS') ,
 source_metadata=coalesce(n.source_metadata,'{}'::jsonb)||jsonb_build_object('diagnostic_confidence','functional_body_actuator_test_exact_conversion_pinout_pending'),updated_at=now()
from v where n.vehicle_id=v.id and n.label='Travas elétricas/atuadores das portas';
