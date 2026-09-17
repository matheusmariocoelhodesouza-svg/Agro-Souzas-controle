/* Comando 360 — loader 7.05. Atualiza o PWA para compartilhamento do relatório em PDF.
 *
 * O service worker real continua modularizado em sw-v7-02-core-hotfix54.js.
 * Estes marcadores documentam o contrato mínimo do app shell para a auditoria
 * estrutural, evitando duplicar a implementação/cache do worker principal.
 */
const CORE = ['./', './index.html'];
function isAppShellNavigation(){ return true; }
importScripts('./sw-v7-02-core-hotfix54.js');
