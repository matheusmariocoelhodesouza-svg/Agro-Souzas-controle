-- Oficina 360 — safe generic fallback for symptom-first diagnosis.
insert into public.v2_vehicle_symptom_playbooks
(symptom_key,title,category,aliases,description,related_dtcs,ordered_tests,likely_causes,source_metadata,verification_status)
values (
 'general_symptom','Diagnóstico por sintoma — investigação geral','general',
 array['outro sintoma'],
 'Fallback seguro para sintomas ainda sem árvore específica. Organiza evidências e medições sem sugerir troca de peça no chute.',
 array[]::text[],
 '[
  {"key":"describe_reproduce","action":"Descrever exatamente o sintoma, quando começou, em quais condições acontece e tentar reproduzi-lo de forma segura. Registrar temperatura, carga, velocidade, rotação e ruídos quando aplicável.","expected":"Sintoma reproduzido ou condições delimitadas","candidate_if_fail":["falha intermitente ainda sem condição definida"],"next_on_pass":1,"next_on_fail":1},
  {"key":"scan_and_history","action":"Ler DTCs ativos, pendentes e históricos sem apagar a memória; comparar com ocorrências e reparos anteriores desta condução.","expected":"Contexto eletrônico e histórico registrados","candidate_if_fail":["falha sem DTC; seguir diagnóstico físico/funcional"],"next_on_pass":2,"next_on_fail":2},
  {"key":"visual_system","action":"Fazer inspeção visual e funcional do sistema relacionado ao sintoma: conectores, chicotes, mangueiras, fixações, vazamentos, folgas, níveis e sinais de aquecimento/desgaste.","expected":"Sem anomalia visual evidente","candidate_if_fail":["anomalia física encontrada na inspeção"],"next_on_pass":3,"next_on_fail":5},
  {"key":"isolate_system","action":"Isolar o sistema mais relacionado ao sintoma usando dados do scanner, catálogo técnico, histórico e comportamento do veículo; evitar substituir componentes apenas por suspeita.","expected":"Sistema/circuito suspeito delimitado por evidência","candidate_if_fail":["necessidade de ampliar coleta de dados"],"next_on_pass":4,"next_on_fail":4},
  {"key":"measure_before_replace","action":"Executar o teste técnico disponível para o componente/circuito suspeito e registrar o valor medido, unidade, condição e fonte de referência antes de condenar a peça.","expected":"Medição comparada com referência técnica aplicável","candidate_if_fail":["componente/circuito fora do esperado"],"next_on_pass":5,"next_on_fail":5},
  {"key":"confirm_general","action":"Após qualquer correção, repetir a condição original e confirmar objetivamente que o sintoma desapareceu e que não surgiu nova falha.","expected":"Sintoma não retorna na condição de confirmação"}
 ]'::jsonb,
 '["causa ainda não delimitada — medir antes de substituir"]'::jsonb,
 '{"scope":"generic_vehicle","fallback":true,"rule":"evidence_before_replacement"}'::jsonb,
 'reference'
)
on conflict do nothing;
