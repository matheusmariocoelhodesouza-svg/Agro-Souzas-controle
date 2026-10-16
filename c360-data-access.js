/* Shared complete reads. Totals must never silently use the first API page. */
async function restAll(table,query='',options={}){
 const params=new URLSearchParams(query),rows=[];
 const pageSize=Math.max(1,Math.min(500,options.pageSize||250));
 const maxRows=options.maxRows||50000;
 const read=options.read||rest;
 const selectedCompany=typeof companyId==='undefined'?null:companyId;
 const scoped=selectedCompany&&params.get('company_id')==='eq.'+selectedCompany;
 params.delete('limit');params.delete('offset');
 if(!params.has('order'))params.set('order',options.order||'id.asc');
 else if(options.uniqueOrder!==false&&!/(^|,)id\./.test(params.get('order')))params.set('order',params.get('order')+',id.asc');
 let previousPage='';
 while(true){
  params.set('offset',String(rows.length));params.set('limit',String(Math.min(pageSize,maxRows-rows.length+1)));
  const page=await read(table,params.toString());
  if(scoped&&companyId!==selectedCompany)throw new Error('A empresa selecionada mudou. Atualize a tela antes de continuar.');
  if(!Array.isArray(page))throw new Error('Resposta incompleta ao carregar o histórico. Atualize a tela.');
  if(!page.length)return rows;
  const marker=JSON.stringify(page);
  if(marker===previousPage)throw new Error('Não foi possível avançar no histórico. Nenhum total parcial será exibido.');
  previousPage=marker;rows.push(...page);
  if(rows.length>maxRows)throw new Error('O histórico excede o limite desta consulta. Selecione um período menor.');
 }
}
function currentMonthBR(){return new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit'}).format(new Date()).slice(0,7)}
