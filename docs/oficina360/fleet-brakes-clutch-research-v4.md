# Fleet brakes & clutch research V4 — 2026-09-27

## Regra

Catálogo verificado não é o mesmo que peça fisicamente instalada. Os vínculos continuam `candidate` até foto/código/plaqueta/VIN/build-data exatos. Quando um seed antigo entra em conflito com fonte técnica melhor, ele é mantido para auditoria, mas o vínculo daquela condução pode virar `not_applicable`.

## Volare A6 MBJ1166

### Correção importante do freio dianteiro
O catálogo de produtos/aplicações Fras-le lista **VOLARE A6, 1998+** com:
- dianteiro: **PD/102**, sistema **Varga**;
- traseiro: **FD/72**, sistema **Bendix**.

Isso contradiz o seed genérico inicial que tratava o dianteiro como tambor/sapatas/cilindro de roda. Esses três pais e seus microcomponentes gerados foram marcados `not_applicable` no MBJ1166, sem apagar histórico. Entrou uma nova vista de freio dianteiro Varga. A PD/102 é referência de catálogo `verified`; disco e pinça foram cadastrados apenas como estrutura `reference_pending`, sem inventar código/medida.

### Embreagem
O catálogo Fras-le de revestimentos lista **VOLARE A6 MWM Sprint, todos** com **RC/776**, sistema Sachs, 300 x 175 x 3,70 mm e furação 20/20. O RC/776 foi incluído como revestimento de atrito, não como disco/kit completo.

## Mercedes-Benz 608 BYH8J61

O catálogo Lonaflex lista **LO-608 D, 1972–1980** com **L-522** dianteiro e traseiro, sistema MB. Como o veículo é 1975, o intervalo de catálogo coincide. As duas lonas/sapatas base foram atualizadas para L-522 como referência de catálogo; o fitment físico continua candidato.

## Comil/VW CPI6C79

O mesmo catálogo Fras-le revelou uma divergência que impede promoção automática:
- VW 9-150 **OD** ônibus, 2003+: FD/58 dianteiro, FD/59 traseiro, Master;
- VW 9-150 **EOD** ônibus, 2006+: FD/59 dianteiro e traseiro, Master.

O veículo é ano 2005, enquanto a identidade EOD atual ainda é derivada de aplicação técnica e não de plaqueta física. Por isso nenhuma lona foi marcada `verified` para o CPI6C79 nesta etapa. O app guarda as duas possibilidades e bloqueia compra até identificação física/build-data do chassi.

## Fontes
- Fras-le Product and Application Catalog: https://www.fras-le.com/media/1657/fras-le_catalogo_de_productos_y_aplicaciones_.pdf
- Fras-le Clutch Lining Application Catalog: https://www.fras-le.com/media/1490/catalog-revestimiento-embragues.pdf
- Lonaflex Product and Application Catalog: https://fras-le.com/media/1661/lonaflex_catalogo_de_productos_y_aplicaciones_.pdf
