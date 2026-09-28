# Oficina 360 — camada visual real da Sprinter 313 CDI

## Escopo

A camada `oficina360-sprinter-real.js` conecta a interface Premium ao cadastro técnico real da Sprinter 313 CDI W903 / 903.662 / OM611.981. Ela só é ativada quando o perfil técnico corresponde ao VIN conhecido `8AC903662BE040910` ou à combinação exata `903.662 + OM611.981`.

## Fonte dos dados

A interface não mantém um segundo catálogo hardcoded. Ela lê em tempo real:

- `v2_vehicle_technical_profiles`;
- `v2_vehicle_component_links`;
- `v2_vehicle_components`;
- `v2_vehicle_component_groups`;
- `v2_vehicle_exploded_views`;
- `v2_vehicle_diagnostic_playbooks`;
- `v2_diagnostic_code_library`.

Assim, correções de OEM, aplicação, ferramentas, notas de diagnóstico e status feitas no banco aparecem na camada visual sem duplicação de dados.

## Regra de visualização

O modelo gráfico Premium continua sendo uma representação interativa. Uma peça do catálogo real só é ligada a uma região do desenho quando há uma correspondência semântica segura com um conjunto já desenhado, por exemplo turbo, rail/injeção, sensor MAP, bomba/filtro/cárter de óleo, cabeçote, junta, virabrequim, pistão/biela e sincronismo.

Se não houver geometria segura, a peça continua disponível no catálogo real, mas a interface mostra explicitamente **“sem geometria visual vinculada”** e não inventa uma posição.

## Diagnóstico

Quando um DTC é informado, a camada consulta primeiro o playbook técnico. Se o playbook tiver `related_component_ids` compatíveis com a condução, esses componentes são destacados no catálogo real. O destaque representa **direção de investigação**, não confirmação de defeito.

Sem vínculo de componentes, a biblioteca de DTC pode direcionar apenas para um sistema (turbo, injeção, lubrificação, arrefecimento, freios, direção ou transmissão). Nenhuma peça individual é condenada por heurística.

## Status de confiabilidade

- `fitment_status = verified` + `data_status = verified`: aplicação confirmada na interface;
- `fitment_status = candidate`: aplicação a confirmar;
- `data_status = estimated`: referência técnica;
- demais casos: dado/referência pendente.

OEM, torque, sequência de aperto e itens de uso único não são promovidos a “confirmados” quando o banco não os marca como verificados.

## Guia técnico

O guia da peça usa apenas notas de diagnóstico e substituição já cadastradas no componente. Quando não existe procedimento verificado, o sistema informa que a sequência técnica deve ser consultada na fonte correta em vez de gerar um passo a passo fictício.

## Compatibilidade

Para qualquer veículo que não seja a Sprinter exata acima, a camada é ocultada e o Oficina 360 Premium continua funcionando como antes. Isso permite adicionar posteriormente adaptadores equivalentes para Volare, Comil e Mercedes 608 sem misturar dados entre veículos.
