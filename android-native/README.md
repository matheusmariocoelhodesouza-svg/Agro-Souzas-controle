# Comando 360 — Android Bluetooth ESC/POS

Camada Android planejada para impressão direta em impressoras térmicas Bluetooth, inicialmente RPP02N, sem depender do RawBT.

## Objetivo

Fluxo: Comando 360 -> bridge Android -> Bluetooth Classic/SPP -> ESC/POS -> RPP02N.

## Interface esperada pela PWA

A WebView poderá detectar `window.Comando360Printer` e chamar:

- `listPairedPrinters()` — lista dispositivos Bluetooth já pareados no Android.
- `connect(address)` — vincula/conecta a impressora escolhida.
- `getStatus()` — retorna estado e impressora salva.
- `printText(text)` — imprime texto ESC/POS em 80 mm.
- `testPrint()` — imprime comprovante de teste.
- `disconnect()` — encerra a conexão atual.

A impressora escolhida deverá ser persistida no aparelho para reconexão automática.

## Segurança da implantação

Esta implementação fica isolada na branch `feature/android-bluetooth-rpp02n`. A versão principal do Comando 360 não deve ser alterada até o teste em aparelho Android com a RPP02N real.

## Próximas peças nativas

1. Projeto Android/WebView apontando para o Comando 360.
2. Permissões Bluetooth compatíveis com Android 12+ e versões anteriores.
3. Cliente Bluetooth Classic SPP usando UUID serial padrão.
4. Encoder ESC/POS (alinhamento, negrito, tamanho, corte/avanço quando suportado).
5. Bridge Javascript `Comando360Printer`.
6. Tela no app para Vincular impressora, Teste de impressão e status.

> Observação: navegadores/PWA não oferecem uma solução universal e confiável para Bluetooth Classic SPP/ESC-POS. A bridge Android é intencional para retirar a dependência do RawBT.