# Fleet service-parts research V3 — 2026-09-27

## Regra de qualidade

`data_status=verified` nesta etapa significa que a referência foi encontrada em catálogo de fabricante/fornecedor com aplicação compatível. Isso **não** significa que a peça foi fisicamente confirmada na condução. `v2_vehicle_component_links.fitment_status` permanece `candidate` até foto, plaqueta, código gravado, consulta por VIN/serial ou build-data exatos.

## CPI6C79 — VW 9.150 E OD / MWM 4.12 TCE

MANN-FILTER confirma para 9.150 E OD / MWM 4.12 TCAE, 04/2004–12/2012:
- ar: C 17 308;
- óleo: W 962;
- combustível: WK 962/13.

O WK 962/13 também lista originais MWM 9.0541.15.1.0027, 905411510042 e 905411510028. O C 17 308 lista referências VW 2RD 129 620, 2VC 129 619, 2TA 129 619 e 2R0 129 620 D.

**Correção:** uma hipótese antiga de PU 1046 z para combustível não é usada no banco. A referência documentada para esta aplicação é WK 962/13.

## MBJ1166 — Volare A6 / MWM 4.07 TCA / ano 2000

A tabela Tecfil específica para 01/2000–12/2001 confirma:
- filtro de ar primário: ARS3003;
- elemento de segurança: ASR203;
- filtro de óleo: PSL340;
- filtro de combustível: PSC498;
- sedimentador/separador: PSD970/1, com copo CSD01 na família.

Cross-reference forte:
- PSL340 ↔ MANN W 1323; MWM 905411880018 / 905411880026; Agrale 6008001204004; VW 062115561A.
- combustível: MANN WK 842/3; referência original Volare/Agrale 6008.006.035.00.7.

## BYH8J61 — Mercedes-Benz 608 / OM314

MANN heavy catalog / application pages support:
- filtro de ar: C 13 114/4;
- elemento de segurança: CF 600;
- combustível: PU 707 x;
- pré-filtro: BFU 707;
- óleo: PF 1155 K.

Fras-le clutch-lining catalog supports two **revestimentos**, not full clutch discs:
- RC/716 — 608 OM314 85 cv, Sachs, 250 x 165 x 3.50 mm, 18/12 furos;
- RC/913 — 608 OM314, todos, Sachs, 250 x 165 x 4.20 mm, 20/20 furos.

Both remain vehicle-fitment candidates until the installed clutch is measured/identified.

## EJW6A76 — Sprinter

CRLV/profile data: VIN 8AC903662BE040910, production 2010, model 2011, 903.662 / OM611.981 in the current technical profile. Public EPC structures remain useful for system navigation, but family references from older W903 production ranges are not promoted to exact-vehicle service parts until a VIN/datacard or exact 2010/2011 application source reconciles the build.
