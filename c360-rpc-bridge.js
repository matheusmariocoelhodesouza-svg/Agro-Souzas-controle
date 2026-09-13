(()=>{
'use strict';
if(typeof window.rpc==='function')return;
window.rpc=async function c360Rpc(name,body={}){
  if(typeof v2Rest!=='function')throw new Error('API do Comando 360 ainda não está pronta.');
  const fn=String(name||'').trim();
  if(!/^[a-zA-Z0-9_]+$/.test(fn))throw new Error('Função inválida.');
  return await v2Rest('rpc/'+fn,'','POST',body||{});
};
})();
