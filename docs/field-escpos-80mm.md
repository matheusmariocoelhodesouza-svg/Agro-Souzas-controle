# Comando 360 — impressão térmica 80 mm

## Alvo inicial

- Goldensky GS-POS-80D / MP80M
- Bluetooth Classic / SPP
- ESC/POS
- Papel 80 mm (largura útil anunciada: 78 mm / 384 dots)

## Estratégia segura

A impressão nativa é adicional ao fluxo web atual. O botão web de impressão 80 mm continua disponível como fallback; esta branch não remove `window.print()`.

O transporte Android usa somente impressoras já pareadas nas Configurações do Android. O usuário concede `BLUETOOTH_CONNECT` em Android 12+ e seleciona uma impressora pareada uma única vez. O endereço fica armazenado localmente no aparelho.

## Contrato de integração

`EscPosPrinter` oferece:
- `pairedPrinters()`
- `bind(device)`
- `boundDevice()`
- `unbind()`
- `printText(text)`

A próxima camada deve expor esse transporte ao app de campo (intent/deep link ou shell Android dedicado), transformar o relatório de apanha em texto ESC/POS e, em qualquer erro de conexão, manter a impressão Android/web atual disponível.

## Critério de liberação para campo

Não substituir o fallback até validar em aparelho real:
1. pareamento GS-POS-80D;
2. primeira impressão;
3. reconexão após desligar/ligar a impressora;
4. acentos em CP850;
5. relatório longo;
6. impressora sem papel/desligada;
7. Android 12+ com permissão negada/concedida;
8. três impressões consecutivas sem nova seleção.
