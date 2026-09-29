# Oficina 360 — profundidade diagnóstica da frota V1

Data: 2026-09-29

## Objetivo

Levar Comil, Volare, Mercedes-Benz 608 e reboque ao mesmo **princípio de qualidade** da Sprinter, sem fingir que todas as conduções têm a mesma arquitetura eletrônica.

O catálogo V9 já possui 4.817 vínculos e nenhuma peça fica fora das vistas estruturais. Portanto esta entrega não repete o micro-EPC; ela adiciona a camada que faltava: elétrica aplicável, testes, árvores por sintoma e gates de confirmação física.

| Veículo | Catálogo V9 | Arquitetura diagnóstica V1 | Scanner/PIDs | Regra de confiança |
|---|---:|---|---|---|
| Sprinter EJW6A76 | 1.159 vínculos | eletrônica OM611 profunda | sim | VIN/WIS/peça física promovem confirmação |
| Comil CPI6C79 | 1.321 vínculos | eletrônica/common rail **candidata** VW/MWM | condicional | confirmar variante/plaqueta antes de pinagem exata |
| Volare MBJ1166 | 1.172 vínculos | MWM 4.07 TCA de injeção mecânica | não exigido para motor | serial/manual/peça física |
| Mercedes 608 BYH8J61 | 1.165 vínculos | OM314 de injeção mecânica | não aplicável à ECU de motor | build/plaqueta/peça física; tensão permanece aberta |
| Reboque QSR7H50 | catálogo estrutural | iluminação, chicote, aterramento, cubo/rolamento | não aplicável | mapeamento físico do plugue e componentes |

## Comil CPI6C79

A camada eletrônica passa a conhecer sensor combinado de pressão/temperatura do ar, sensor de pressão do rail, temperatura do líquido, ECU, bateria, partida, alternador, alimentação/fusíveis e conector de diagnóstico de família.

A identidade de trabalho VW 9.150 EOD / MWM 4.12 TCE continua **candidata**. Diagramas da família podem orientar a arquitetura e a sequência de testes, mas pino, tensão ou código não viram informação exata da condução sem confirmação física/documental.

Roteiros específicos: perda de força/modo de emergência, gira e não pega, falha/baixa pressão do freio pneumático e superaquecimento. Os passos eletrônicos podem usar PIDs canônicos do Scanner ao Vivo quando disponíveis.

## Volare MBJ1166

O app passa a tratar o MWM Sprint 4.07 TCA como arquitetura de injeção mecânica, sem exigir pressão de rail, ECU de common rail ou DTCs de motor que não pertencem à aplicação.

A camada funcional inclui bateria, partida, alternador, ignição, temperatura e pressão de óleo. Os roteiros específicos cobrem: gira e não pega, partida difícil, fumaça preta/falta de rendimento e superaquecimento.

## Mercedes-Benz 608 BYH8J61

O OM314 candidato é tratado como diesel de injeção mecânica. O diagnóstico prioriza alimentação de combustível, bomba injetora, bicos, partida/carga, temperatura, pressão de óleo, compressão e sincronismo.

A tensão nominal permanece propositalmente **desconhecida até inspeção física**. Nenhum procedimento pode assumir 12 V, 24 V ou 28 V antes de registrar quantidade/ligação das baterias e plaquetas do alternador/motor de partida.

Roteiros específicos: gira e não pega, partida difícil, fumaça preta/perda de rendimento, assistência de freio e superaquecimento.

## Reboque QSR7H50

A profundidade aplicável é elétrica/mecânica: plugue, chicote, lanternas, aterramento e conjunto roda/cubo/rolamento. A pinagem do plugue deve ser mapeada na própria carretinha; nenhum padrão de 7/13 vias é presumido.

Roteiros específicos: falha de iluminação/funções misturadas e ruído/folga/aquecimento de cubo.

## Política de confiança

1. `verified` — informação documentada e aplicável ao escopo indicado.
2. `reference` — arquitetura/família útil para diagnóstico, sem fitment físico exato.
3. `needs_physical_verification` — exige inspeção, plaqueta, código físico ou medição no veículo.
4. `reference_pending` em fontes — documento/fonte foi identificado, mas ainda não deve ser tratado como aplicação comprovada.

Nenhum roteiro transforma DTC, sintoma ou leitura isolada em condenação automática de peça. A regra continua sendo **medir antes de substituir**.
