# Fleet Research Pack V2 — Oficina 360

Data de revisão: 2026-09-27

## Objetivo

Transformar o catálogo estrutural da frota em uma base auditável de oficina, separando claramente:

- **referência verificada em catálogo**;
- **aplicação candidata no modelo/família**;
- **fitment confirmado fisicamente na condução**;
- **item estimado apenas para navegação/diagnóstico**.

Nenhum código, torque, quantidade ou posição é promovido a confirmado só porque aparece em uma família parecida.

## Fontes registradas

### Sprinter EJW6A76 — W903 / 903.662 / OM611.981

- Mercedes-Benz EPC público espelhado no PartSouq para 903.662 / OM611.981.
- Página oficial Mercedes-Benz do Brasil de manuais do condutor/manutenção Sprinter.
- Limitação: páginas EPC públicas usam VINs de exemplo; códigos dependentes de data, opcionais e agregados continuam condicionados ao VIN/aggregate real.

### Comil CPI6C79 — Comil Piá O / VW 9.150 EOD / MWM Acteon 4.12 TCE

- MWM Literatura Técnica: manual exato pode ser solicitado com o número de série D1A001816.
- MWM FAQ: catálogo genuíno é restrito à Rede Autorizada; a lista exata é consultada por número de série.
- MWM ficha técnica Acteon 4.12 TCE.
- Bosch Catálogo Diesel 2019/2020 para VW 9.150 EOD Electronic 4.12 TCE.
- Catálogo de Peças Comil Piá Rodoviário versão 5, com códigos de carroceria, porta VW, frente, limpador e traseira.
- Limitação: o catálogo Comil disponível é revisão 2008 com páginas internas 2005–2008; o veículo é 2005, então a peça precisa de conferência da versão física antes da compra.

### Volare MBJ1166 — Volare A6 / MWM Sprint 4.07 TCA

- MWM Literatura Técnica: solicitar manual exato usando o número de série 40704030141.
- MWM FAQ: lista serial-específica depende da Rede Autorizada.
- Catálogo Técnico de Peças Volare VO A6 2002 — 2ª edição, com vistas, posições e quantidades de chassi/motor.
- Catálogos CIPEC Agrale/Volare para cruzamentos de referências.
- Limitação: o veículo é 2000 e o catálogo público é 2002; revisão/código físico continua obrigatório antes da compra.

### Mercedes-Benz 608 BYH8J61 — LO 608 / OM314

- Timken Catálogo de Aplicações Automotivas: rolamentos e OE por câmbio/eixo para 608 L/LO e OM314.
- Catálogos de cruzamento de tubos de freio 608/708.
- Catálogo público de peças G2/24 com números OEM/cross, condicionado à plaqueta do câmbio.
- Manual de oficina OM314/OM352 identificado externamente, porém não ingerido.
- Catálogo completo LO 608 D de 528 páginas identificado externamente, porém não ingerido.
- Limitação: veículo de 1975 pode ter recebido alterações de eixo, câmbio, freios e carroceria ao longo da vida.

## Política operacional

1. `data_status=verified` significa que **a referência do catálogo foi verificada**.
2. `fitment_status=candidate` significa que **a aplicação naquela condução ainda depende de confirmação física/serial/variante**.
3. Microcomponentes estimados permanecem `orderable=false`.
4. Torque fica `manual_required` até existir manual exato e variante confirmada.
5. Fontes pagas/restritas são registradas como bloqueadores explícitos; nunca são tratadas como conteúdo já ingerido.
6. A tela de peça deve sempre mostrar a origem da informação e o nível de confiança.

## Resultado após V2

- Sprinter: 1.155 componentes vinculados; 104 referências marcadas como verificadas em catálogo; 2 fontes técnicas registradas.
- Comil: 1.312 componentes; 63 referências verificadas; 5 fontes registradas.
- Volare: 1.157 componentes; 43 referências verificadas; 4 fontes registradas.
- 608: 1.157 componentes; 14 referências verificadas; 5 fontes registradas.
- Todos os componentes permanecem ligados a pelo menos uma vista estruturada/micro-EPC.

Os números acima medem cobertura do banco, não significam que 100% das peças físicas de fábrica tenham código OEM serial-específico confirmado.