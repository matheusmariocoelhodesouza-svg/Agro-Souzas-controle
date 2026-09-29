# Oficina 360 e Lavador 360 — Android

Dois aplicativos Android independentes, conectados ao mesmo ecossistema e banco do Comando 360.

## Identidades permanentes
- Oficina 360: `br.com.comando360.oficina`
- Lavador 360: `br.com.comando360.lavador`

Cada aplicativo abre diretamente o módulo correspondente em `app.comando360.com.br`, dentro de um WebView próprio. Isso mantém atualizações do sistema online sem exigir novo APK para cada ajuste de tela/regra de negócio.

As sessões de login são independentes entre os apps, mas os dados continuam compartilhados pelo mesmo backend/Supabase.

## Build local
Requer JDK 17, Android SDK 35 e Gradle 8.11.1.

```bash
gradle -p android-360-apps :oficina:assembleDebug :lavador:assembleDebug
```

Os APKs ficam em:
- `android-360-apps/oficina/build/outputs/apk/debug/oficina-debug.apk`
- `android-360-apps/lavador/build/outputs/apk/debug/lavador-debug.apk`

O CI gera versões release assinadas com a identidade estável já usada pelo ecossistema 360.
