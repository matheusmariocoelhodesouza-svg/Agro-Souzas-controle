(()=>{
'use strict';
if(typeof window.restInsert!=='function'){
 window.restInsert=async function(table,payload){
  if(typeof rest!=='function')throw new Error('API REST indisponível.');
  return await rest(table,'','POST',payload);
 };
}
})();
