# Catálogo técnico completo — Sprinter 313 CDI W903 / 903.662 / OM611.981

## Objetivo

Cobrir no Comando 360 os principais componentes reparáveis da Sprinter 313 CDI brasileira, separando claramente:

- **Confirmado**: referência com evidência forte para a aplicação;
- **Referência cadastrada**: família/código plausível e documentado, mas com variação por eixo, fornecedor, número do motor, carroceria ou revisão;
- **A confirmar**: componente mapeado no sistema, porém o código exato exige conferência por VIN, número do eixo/câmbio ou código físico.

## Cobertura atual da Sprinter cadastrada

Total: **124 componentes** vinculados ao veículo.

- Confirmados: **11**
- Referências cadastradas: **45**
- A confirmar: **68**

### Sistemas cobertos

- Motor
- Admissão e ar do motor
- Turboalimentação
- Injeção e combustível
- Arrefecimento
- Lubrificação e respiro
- Escape e emissões
- Câmbio e embreagem
- Cardã e diferencial
- Freios e ABS
- Suspensão
- Direção
- Elétrica, sensores e módulos
- Carroceria e interior
- Ar-condicionado e ventilação

## Regras de precisão

1. Código OEM só deve aparecer como confirmado quando a evidência é suficientemente forte.
2. Freios, eixos, transmissão e suspensão podem mudar conforme número do eixo, fornecedor da pinça, código do câmbio e pacote de carga.
3. A carroceria FFBM/micro-ônibus pode possuir lanternas, portas, climatização traseira e componentes que não pertencem ao catálogo Mercedes original do chassi.
4. Para itens internos de motor, transmissão e diferencial, usar VIN/código físico antes de compra.
5. Não copiar/republicar imagens protegidas de EPC; manter apenas referências e links de catálogo, salvo conteúdo licenciado.

## Fontes técnicas principais

- Mercedes-Benz / PartSouq — árvore de catálogo W903 903.662 / OM611.981 e variantes latino-americanas.
- Mercedes-Benz Originalteile — componentes genuínos e pacotes de suspensão.
- Delphi — catálogo de ar-condicionado para Sprinter W903 313 CDI.
- Bosch / MANN / Baldwin / Pierburg / Garrett / MTE-Thomson — referências cruzadas de componentes.
- Catálogos brasileiros de aplicação para a continuação da plataforma W903/OM611 até 2011/2012.

## Migrações aplicadas no banco

- `sprinter_full_catalog_engine_v1`
- `sprinter_full_catalog_chassis_v1`
- `sprinter_full_catalog_electrical_body_hvac_v1`

Essas migrações complementam os blocos anteriores do catálogo técnico da Sprinter e vinculam os novos componentes diretamente ao cadastro da condução.
