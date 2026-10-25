(()=>{
'use strict';
window.C360ChatStream={async read(response,onEvent){
 if(!response.headers.get('content-type')?.includes('text/event-stream'))return response.json();
 if(!response.body)throw new Error('A conexão com a conversa foi interrompida.');
 const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='',result=null,session=null,timedOut=false;
 const timer=setTimeout(()=>{timedOut=true;reader.cancel().catch(()=>{})},70000);
 function frame(text){
  let event='message',data='';for(const line of text.split(/\r?\n/)){if(line.startsWith('event:'))event=line.slice(6).trim();if(line.startsWith('data:'))data+=(data?'\n':'')+line.slice(5).trimStart()}
  if(!data)return;const value=JSON.parse(data);
  if(event==='session')session=value.conversation_id;
  if(event==='error'){const error=new Error(value.message||'A resposta foi interrompida. Tente novamente.');error.conversationId=value.conversation_id||session;throw error}
  if(event==='done')result=value;else if(event==='session'||event==='answer')onEvent?.(event,value);
 }
 try{
  while(true){const {done,value}=await reader.read();buffer+=decoder.decode(value,{stream:!done});let boundary;while((boundary=/\r?\n\r?\n/.exec(buffer))){frame(buffer.slice(0,boundary.index));buffer=buffer.slice(boundary.index+boundary[0].length)}if(buffer.length>2_000_000)throw new Error('A resposta excedeu o limite da conversa.');if(done)break}
  if(buffer.trim())frame(buffer);if(timedOut||!result){const error=new Error('A conexão foi interrompida. Sua mensagem pode ser reenviada.');error.conversationId=session;throw error}return result;
 }finally{clearTimeout(timer);try{await reader.cancel()}catch{}reader.releaseLock()}
}};
})();
