# Oficina 360 — aprofundamento técnico da frota

Esta etapa aprofunda os cadastros do Comil CPI6C79, Volare MBJ1166 e Mercedes-Benz 608 BYH8J61.

## Cobertura aplicada

- CPI6C79: 89 componentes vinculados; 13 vistas estruturadas; 89 posições.
- MBJ1166: 83 componentes vinculados; 15 vistas estruturadas; 83 posições.
- BYH8J61: 88 componentes vinculados; 13 vistas estruturadas; 88 posições.
- Todos os 260 componentes possuem sintomas, sequência de diagnóstico e ferramentas mínimas cadastradas.
- Torque não confirmado não recebe valor inventado: fica marcado `manual_required` até manual/plaqueta/código físico.
- As vistas desta etapa são `generated/estimated`: mapas estruturados do Oficina 360 e não cópias de EPC protegido.

## Referências com aplicação direta cadastradas

### Comil CPI6C79 / candidato VW 9.150 EOD + MWM 4.12 TCE
- óleo: MANN W 962; referência paralela Tecfil PSL962.
- ar: MANN C 17 308; elemento secundário MANN CF 1000.
- combustível: MANN WK 962/13; referências MWM 9.0541.15.1.0027 / 905411510042 / 905411510028.
- sedimentador: Tecfil PSD960/1.

Fontes principais: MANN-FILTER catálogo de aplicação do 9.150 E OD 4.12 TCAE (2004–2012) e catálogo Tecfil/Peça Aí por aplicação.

### Volare MBJ1166 / candidato A6 + MWM Sprint 4.07 TCA
- ar principal: Tecfil ARS3003; segurança Tecfil ASR203.
- óleo: Tecfil PSL340; referência cruzada MANN W 1323.
- combustível: Tecfil PSC498; referência cruzada MANN WK 842/3; referência original informada no catálogo MANN 6008.006.035.00.7 e MWM 9.0540.01.5.0015.
- sedimentador: Tecfil PSD970/1; copo Tecfil CSD01; cruzamento MANN WK 950/14.

Fontes principais: Tecfil para Volare A6 MWM 4.07 TCA 01/2000–12/2001 e MANN-FILTER para aplicação 4.07 TCA.

### Mercedes-Benz 608 BYH8J61 / candidato LO 608 + OM314
- ar principal: MANN C 13 114/4; segurança MANN CF 600; cruzamento Tecfil AP8528.
- óleo: MANN PF 1155 K; cruzamento Tecfil L4/1.
- combustível: MANN PU 707 x; cruzamento Tecfil PC945.
- pré-filtro: MANN BFU 707; cruzamentos Tecfil PSD530/1, PSD530 e CSD01.

Fontes principais: MANN-FILTER para Mercedes 608 L-D/E/O OM314 1973–1983 e cruzamentos Tecfil publicados em catálogos de aplicação.

## Regra de precisão

Nenhum componente dependente de câmbio, eixo, fornecedor de freio, código de motor ou adaptação de carroceria é promovido automaticamente para `verified`. Código OEM, torque e posição EPC só passam a confirmados após evidência individual da condução.