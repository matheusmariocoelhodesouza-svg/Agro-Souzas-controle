# Sprinter 313 CDI — EPC microdetalhado

Aplicação de trabalho: **W903 / 903.662 / OM611.981**, ano/modelo 2010/2011.

## Estrutura

O catálogo agora suporta hierarquia de EPC:

`Sistema → vista explodida → item numerado → peça/fixador/vedação`

Cada item pode armazenar:
- número da posição na vista;
- quantidade;
- código OEM / referência;
- tipo (`part`, `assembly`, `bolt`, `screw`, `nut`, `washer`, `o_ring`, `gasket`, `seal`, `clip`, `bearing`, `bushing`, `hose`, `pipe`, `sensor`, `connector` etc.);
- localização;
- sintomas associados;
- testes sugeridos;
- ferramentas necessárias;
- dimensões/rosca/material quando conhecidos;
- status de exatidão;
- fonte da vista.

## Cobertura microdetalhada carregada nesta etapa

Foram cadastradas **18 vistas explodidas** com **271 posições EPC individualizadas**. A lista já contém peças grandes e itens pequenos como parafusos, porcas, arruelas, O-rings, juntas, anéis de vedação, anéis elásticos, buchas, rolamentos, mangueiras, tubos, presilhas e conectores.

Vistas carregadas:
1. Cárter de óleo OM611.981
2. Tampa do cabeçote e respiro
3. Bielas, pistões, pinos e anéis
4. Virabrequim e mancais
5. Filtro, linhas, O-rings e termostato de combustível
6. Eixo/suspensão dianteira
7. Cilindro mestre de freio e reservatório
8. Carcaça do eixo traseiro e diferencial
9. Diferencial — família de eixo pesado
10. Diferencial — família de eixo compacto
11. Semi-eixos traseiros
12. Coluna de direção
13. Bomba d’água, termostato e sensores
14. Conexões do sistema de vácuo
15. Coletor de admissão e fixações
16. Bomba de injeção, válvulas, O-rings e fixações
17. Bicos, linhas de alta e fixações
18. Velas, sensores, anéis e fixações elétricas

## Regra de exatidão

Uma peça só fica `verified` quando a aplicação é forte o suficiente para o conjunto/versão. Quando o catálogo possui corte por número do motor, eixo, transmissão, fornecedor, pacote de carga ou transformação de carroceria, o item permanece `estimated/candidate` até conferência física ou EPC específico.

Os desenhos originais de EPC de terceiros **não são republicados** sem licença. O Comando 360 guarda a referência da vista, a posição numerada e os dados de cada item, e abre a fonte original quando necessário.

## Fontes públicas de referência

A base usa referências Mercedes-Benz/PartSouq para W903 903.662 e OM611.981, incluindo catálogos de mercado latino-americano quando disponíveis. Também são usadas referências técnicas já cadastradas de Mercedes Originalteile, Bosch, Pierburg, Garrett, MTE-Thomson, Delphi, MANN e outros fabricantes.

## Próxima expansão

O schema já comporta o restante do EPC no mesmo nível: distribuição, cabeçote completo, turbo, coletor de escape, lubrificação, alternador/partida, ar-condicionado, transmissão interna, cardã, cubos, pinças/ABS, direção hidráulica, carroceria, portas, iluminação e acabamento. Componentes de carroceria transformada/FFBM precisam ser identificados fisicamente quando não pertencem ao catálogo Mercedes do chassi.
