/* Comando 360 — loader 7.16.0 / professional stabilization 2026-09-25. */
/* 2026-09-25 — cache offline completo para UI vetorial e correções de corrida. */
/* 2026-09-25 — runtime consolidation: shell/campo no precache e módulos administrativos sob demanda. */
/* 2026-09-27 — atualiza regra de conferência da Apanha para caixas mistas, caixas vazias e tempos curtos válidos. */
/* 2026-09-27 — força refresh do cache após correção da ponte Oficina 360. */
/* 2026-09-30 — refresh de runtime para liberar FAX / Programação e IA de leitura do FAX. */
/* 2026-09-30 — Apanhas passa a carregar o FAX diretamente pelo roteador principal. */
/* 2026-09-30 — adiciona recebimento de imagem compartilhada pelo Android/WhatsApp para a IA. */
/* 2026-09-30 — manifesto PWA com ícones PNG 192/512 para instalação WebAPK completa. */
/* 2026-09-30 — hotfix64: manifesto network-first e registro Android de compartilhamento. */
importScripts('./sw-v7-02-core-hotfix64.js');
importScripts('./sw-auth-refresh-guard.js');
importScripts('./sw-share-target.js');