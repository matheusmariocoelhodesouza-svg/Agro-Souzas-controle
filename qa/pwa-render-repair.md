# PWA render regression guard

Em 2026-09-11 foi corrigida uma regressão em que o Service Worker transformava o HTML do app em tempo de execução e, em alguns aparelhos Android/PWA, trechos do JavaScript podiam aparecer como texto visível na interface.

A regra atual é deliberada:
- `index.html` referencia diretamente `c360-ui-polish.css`, `c360-field-offline-hotfix.js` e `c360-quality-hotfix.js`;
- o app shell usa `c360NetOnline()` diretamente onde precisa do estado de rede;
- o Service Worker não reescreve mais o corpo do HTML;
- `qa/reference_ui.mjs` recarrega a página sob controle do Service Worker e falha se detectar tokens de código-fonte visíveis no DOM.

Não reintroduzir transformação global de HTML no Service Worker sem teste PWA controlado em navegador e dispositivo real.