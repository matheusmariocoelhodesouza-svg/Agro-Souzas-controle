// Model the REST page contract so large-history readers are exercised faithfully.
export function paginateMockRows(rows,params){
 const offset=Number(params.get('offset')||0),limit=Number(params.get('limit')||rows.length);
 return rows.slice(offset,offset+limit);
}
