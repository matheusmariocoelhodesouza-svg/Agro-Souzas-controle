# Verificação OEM por catálogo — frota Oficina 360 v2

## Regra de precisão

Esta rodada separa dois conceitos que não podem ser confundidos:

- **Referência de catálogo verificada (`data_status=verified`)**: o fabricante/catálogo técnico associa aquele código à família/aplicação estudada.
- **Aplicação física na condução (`fitment_status`)**: continua como `candidate` enquanto a peça, plaqueta, eixo, câmbio ou conjunto instalado não for conferido fisicamente.

Portanto, nenhum código desta rodada deve ser tratado como autorização automática de compra quando houver variante de fornecedor/revisão.

## CPI6C79 — VW 9.150 EOD / MWM Acteon 4.12 TCE

Identidade mecânica promovida para **verificada por catálogo / plaqueta física pendente**.

Referências Bosch verificadas para a aplicação 9.150 EOD Electronic / 4.12 TCE / 150 cv:

- bomba de alta common rail: Bosch `0 445 020 033`;
- rail: Bosch `0 445 224 019`;
- injetor: Bosch `0 445 120 326`;
- bico/nozzle do injetor: Bosch `0 433 172 315`;
- sensor de pressão do rail: Bosch `0 281 002 568`.

Referências de vedação/retentores documentadas pela aplicação:

- virabrequim dianteiro: MWM `TAC109215` / Corteco `121V` ou `121S`;
- virabrequim traseiro: MWM `TAE103209` / Corteco `7343V` ou `7673T`;
- ZF S5-420 HD, eixo piloto: Corteco `7544N`;
- ZF S5-420 HD, saída: Corteco `7324N`;
- cubo dianteiro Meritor FC-845: OE `2RD407641` / Corteco `7753N`;
- cubo traseiro Dana 480: OE `2RE501313` / Corteco `7745V`;
- cubo traseiro Meritor MS 13-113 HD: OE `2RE501317` / Corteco `7745V`.

Os dois candidatos de eixo traseiro permanecem simultaneamente cadastrados porque o catálogo mostra mais de uma configuração; é obrigatório identificar o eixo instalado antes da compra.

## MBJ1166 — Volare A6 / MWM Sprint Euro 2 4.07 TCA

Identidade mecânica promovida para **verificada por catálogo / plaqueta física pendente**.

Referências Agrale/Volare/CIPEC verificadas:

- bomba d'água: OE `6008001249009` / CIPEC `022171`;
- retentor traseiro do virabrequim: OE `6008001091005` / CIPEC `022369`;
- retentor do eixo seletor do câmbio: OE `6001004090009` / CIPEC `020152`;
- polia do virabrequim: OE `940703810064` / CIPEC `014034`.

A família A6/4.07 TCA tem revisões durante os anos de produção. O código físico continua obrigatório antes da compra quando houver dúvida de revisão.

## BYH8J61 — Mercedes-Benz LO 608 / OM314

Identidade mecânica promovida para **verificada por catálogo / plaqueta física pendente**.

Referência de bomba d'água verificada para LO 608 / OM314 3,8 L:

- Mercedes-Benz `314.200.06.01`;
- substituição/supersessão `314.200.29.01`;
- Motorservice `20160331400`;
- Schadek `20029`;
- Urba `UB0029` / `UB0608`.

Por ser um veículo de 1975, componentes de câmbio, diferencial, freios, suspensão e elétrica continuam exigindo leitura física antes de qualquer promoção para aplicação confirmada.

## Pendências físicas prioritárias

Para aumentar o número de aplicações realmente confirmadas na frota, registrar foto legível de:

1. plaqueta/código do turbocompressor;
2. plaqueta/código da caixa de câmbio;
3. etiqueta/gravação dos eixos dianteiro e traseiro;
4. código/medidas do conjunto de embreagem;
5. gravações de tambores, câmaras/cilindros e componentes principais de freio;
6. códigos dos amortecedores e medidas das molas;
7. código gravado em bomba/injetores quando acessível.

## Fontes técnicas principais

- Bosch Diesel Catalog 2019/2020 — sistema Common Rail do VW 9.150 EOD 4.12 TCE.
- Corteco Heavy Vehicle Catalog — retentores de motor, transmissão e eixos do VW 9.150 EOD.
- Motorservice application catalog — Volare A6 / MWM Sprint 4.07 TCA e Mercedes-Benz LO 608 / OM314.
- CIPEC Agrale/Volare catalogs 2025/2026 — bomba d'água, retentores e polia do Volare A6.

## Estado após a migração

- CPI6C79: 97 componentes vinculados; 12 referências de catálogo verificadas; aplicação física ainda candidata.
- MBJ1166: 86 componentes vinculados; 4 referências de catálogo verificadas; aplicação física ainda candidata.
- BYH8J61: 88 componentes vinculados; 1 referência de catálogo verificada; aplicação física ainda candidata.

A migração correspondente é `20260927203000_fleet_oem_verification_v2.sql`.
