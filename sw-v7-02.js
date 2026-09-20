/* Comando 360 — loader 7.09 / release 9.5. Atualização offline, rollback e runtime de qualidade. */
importScripts('./sw-v7-02-core-hotfix56.js?release=20260920-r95-1');
/* O core registra os eventos durante importScripts; o install roda depois da avaliação deste loader. */
try{
  if(typeof CORE!=='undefined'){
    if(!CORE.includes('./c360-release-core.js'))CORE.push('./c360-release-core.js');
    if(!CORE.includes('./c360-release-core.css'))CORE.push('./c360-release-core.css');
  }
}catch(_){}
