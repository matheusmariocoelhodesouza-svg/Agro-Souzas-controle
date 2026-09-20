# Comando 360 Rastreador 24h

Aplicativo Android complementar ao Comando 360 para manter a localização dos celulares corporativos das equipes mesmo com o PWA fechado e com a tela apagada.

## Funcionamento

- vínculo por código de 10 caracteres gerado no administrador do Comando 360;
- sessão nativa separada, ligada ao mesmo `v2_device_access` do celular de campo;
- `ForegroundService` do tipo `location` com notificação permanente;
- atualização aproximada a cada 60 segundos / 20 metros;
- heartbeat do serviço a cada 5 minutos;
- watchdog de recuperação a cada 10 minutos para religar o serviço se o Android matar o processo;
- fila local de até 200 posições quando ficar sem internet;
- retomada após reiniciar o Android e após atualização do APK quando `ACCESS_BACKGROUND_LOCATION` estiver concedida;
- tokens salvos criptografados com Android Keystore;
- suporte opcional a Device Owner para celulares corporativos gerenciados.

## Versão 1.0.3

A versão 1.0.3 reforça a persistência em segundo plano, especialmente em aparelhos que encerram serviços agressivamente:

- watchdog por `AlarmManager`;
- recuperação após remoção da tela de recentes;
- nova tentativa após destruição inesperada do serviço;
- recuperação após boot e atualização do pacote;
- mantém o vínculo e a sessão existentes ao instalar por cima da versão 1.0.2.

## Configuração no aparelho

1. Instalar o APK.
2. No admin do Comando 360, abrir o celular da equipe e gerar o código de **Rastreamento 24h**.
3. Digitar o código no aplicativo Android.
4. Permitir localização precisa.
5. Em Android 10+, liberar **Localização o tempo todo**.
6. Remover a restrição de bateria.

Depois disso a tela do rastreador pode ser fechada. O serviço continua com notificação permanente.

## Modo corporativo gerenciado

Quando o aparelho for preparado como Device Owner, o app consegue aplicar permissões corporativas e impedir desinstalação do rastreador. Esse modo deve ser provisionado conscientemente no aparelho da empresa e é opcional para o rastreamento básico.
