# Comando 360 Rastreador 24h

Aplicativo Android complementar ao Comando 360 para manter a localização dos celulares corporativos das equipes mesmo com o PWA fechado e com a tela apagada.

## Funcionamento

- vínculo por código de 10 caracteres gerado no administrador do Comando 360;
- sessão nativa separada, ligada ao mesmo `v2_device_access` do celular de campo;
- `ForegroundService` do tipo `location` com notificação permanente;
- posição/velocidade em alta precisão aproximadamente a cada 30 segundos, com intervalo mínimo de 15 segundos / 5 metros;
- heartbeat do serviço e bateria aproximadamente a cada 1 minuto;
- watchdog de recuperação a cada 10 minutos para religar o serviço se o Android matar o processo;
- fila local de até 200 posições quando ficar sem internet;
- retomada após reiniciar o Android e após atualização do APK quando `ACCESS_BACKGROUND_LOCATION` estiver concedida;
- tokens salvos criptografados com Android Keystore;
- suporte opcional a Device Owner para celulares corporativos gerenciados.

## Versão 1.0.4

A versão 1.0.4 adiciona telemetria para o painel ao vivo do administrador:

- bateria e status do serviço via heartbeat v2;
- localização e velocidade com atualização mais frequente;
- painel do admin com mapa, bateria, velocidade, precisão GPS e última atualização;
- mantém o watchdog e a sessão/vínculo existente ao atualizar por cima da versão 1.0.3.

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
