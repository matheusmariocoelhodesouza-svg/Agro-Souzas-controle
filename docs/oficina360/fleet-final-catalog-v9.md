# Oficina 360 — fechamento técnico do catálogo da frota V9

Data da revisão: 2026-09-27

## Objetivo

Consolidar a maior rodada de pesquisa pública feita para as quatro conduções principais, registrar fontes rastreáveis e impedir que uma referência encontrada em catálogo seja confundida com peça fisicamente instalada.

## Estado validado em produção

| Veículo | Itens vinculados | Referências de catálogo verificadas | Fitment físico verificado | Candidatos | Não aplicáveis | Fora de vistas |
|---|---:|---:|---:|---:|---:|---:|
| Sprinter | 1.159 | 108 | 103 | 1.056 | 0 | 0 |
| Comil / VW | 1.321 | 76 | 0 | 1.321 | 0 | 0 |
| Volare A6 | 1.172 | 64 | 0 | 1.133 | 39 | 0 |
| Mercedes-Benz 608 | 1.165 | 32 | 0 | 1.165 | 0 | 0 |
| **Total** | **4.817** | **280** | **103** | **4.675** | **39** | **0** |

Há 4.235 itens estruturais `estimated` e 302 `reference_pending`. Eles permanecem no micro-EPC para navegação/diagnóstico, mas não podem ser tratados como código de compra.

## Fontes e achados principais desta rodada

### Sprinter
- Catálogo MANN atual para a família Sprinter 313 CDI / OM611: C 32 338/1, HU 718/1 k, WK 842/13, opção WK 842/18 com sensor de água e CU 3858/1.
- As referências MANN entram como referência de serviço por família de motor/potência; a caixa/filtro físico instalado continua prevalecendo, especialmente no combustível.
- EPCs públicos usados anteriormente continuam marcados como VIN de exemplo quando não correspondem ao VIN real da frota.

### Comil / VW 9.150 EOD
- MWM/Master Parts lista 9.150 EOD com MWM 4.12 TCE Acteon, 4,8 L, 2004–2012.
- MANN confirma 9.150 E OD / MWM 4.12 TCAE com C 17 308, W 962, WK 962/13 e CF 1000.
- Bosch já sustenta o common rail Acteon com bomba 0 445 020 033, rail 0 445 224 019 e injetor 0 445 120 326 para a aplicação pesquisada.
- Nakata adicionou AC 36011/AC 36012, N 734, N 741, N 740, N 775, N 710, N 711 e NKBA06573 como referências de catálogo.
- A família mecânica 9.150 EOD ficou com suporte forte de catálogo, mas a compra de freios/direção continua dependendo da configuração física quando o catálogo traz alternativas.

### Volare A6
- Mantida a correção do freio dianteiro: PD/102 Varga; traseiro FD/72 Bendix.
- Fras-le RC/776 permanece como revestimento da embreagem, não como kit completo.
- Master Parts MWM MM900001 foi adicionado como kit de embreagem de aplicação Volare A6 4.07 TCA.
- MWM 903260100008E foi adicionado como rolamento do mancal do ventilador.
- Direção: Nakata N 703, N 710, N 711.
- Cardan/diferencial: NC14032, NC14048, NC14020, NC14006, ND01003 (37/8) e ND01010 (41/10). Relação do diferencial é obrigatoriamente conferida no veículo antes da compra.

### Mercedes-Benz 608
- Direção aprofundada com Nakata N 515, N 545, N 523, N 526, N 527 e N 593.
- Bomba d'água ganhou também a referência Master Parts MM900070 para 608/OM314.
- Bomba de óleo base foi promovida com Master Parts MM100291E; os números originais de conversão ficam em metadata, sem assumir revisão instalada.
- Permanecem as referências já verificadas de filtros, freios, transmissão, rolamentos, amortecedores e bomba d'água.

## Regra de segurança de compra

`data_status=verified` significa **referência verificada em catálogo**, não que a peça foi vista na condução.

`fitment_status=verified` é reservado para evidência física/VIN/serial/build-data suficientemente específica. Todos os itens candidatos com `orderable=true` foram auditados e corrigidos: a validação final retornou **0 candidatos indevidamente liberados para compra**.

Para itens candidatos, o Oficina 360 deve exigir ao menos um dos seguintes antes de mostrar como compra direta: código gravado/foto da peça, plaqueta do conjunto, consulta exata por VIN/chassi/serial em fonte autorizada ou build-data do fabricante.

## Cobertura de vistas

A validação final retornou **0 componentes fora de vistas** entre as quatro conduções. Itens de pesquisa V7–V9 foram anexados às vistas estruturadas correspondentes.

## Limite real do que a web pública resolve

O cadastro está fechado para a evidência pública atual. Isso não transforma os 4.817 vínculos em 4.817 OEM fisicamente confirmados. Para as milhares de micropeças internas ainda `estimated/reference_pending`, a próxima evidência possível é EPC restrito/licenciado, manual oficial completo/build-data ou identificação física durante desmontagem. O sistema registra esse limite em vez de inventar código, torque ou revisão.