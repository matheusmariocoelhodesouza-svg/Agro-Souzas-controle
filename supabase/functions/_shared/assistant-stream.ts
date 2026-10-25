// Only the visible answer is streamed. Structured actions and journal entries
// are validated and committed before the client receives the final receipt.
export function partialAnswer(source:string):string {
  const prefix=/^\s*\{\s*"answer"\s*:\s*"/.exec(source);
  if(!prefix)return "";
  let text="";
  for(let i=prefix[0].length;i<source.length;i++){
    const c=source[i];
    if(c==='"')break;
    if(c!=="\\"){text+=c;continue}
    const next=source[++i];if(next===undefined)break;
    const escapes:Record<string,string>={'"':'"',"\\":"\\","/":"/",b:"\b",f:"\f",n:"\n",r:"\r",t:"\t"};
    if(next==="u"){
      const hex=source.slice(i+1,i+5);if(!/^[0-9a-f]{4}$/i.test(hex))break;
      text+=String.fromCharCode(parseInt(hex,16));i+=4;
    }else if(next in escapes)text+=escapes[next];else break;
  }
  return /[\uD800-\uDBFF]$/.test(text)?text.slice(0,-1):text;
}

export async function readAssistantStream(response:Response,onAnswer:(answer:string)=>void):Promise<any>{
  if(!response.body)throw new Error("empty_stream");
  const reader=response.body.getReader(),decoder=new TextDecoder();
  let buffer="",output="",lastAnswer="",completed:any=null;
  function process(frame:string){
    const data=frame.split(/\r?\n/).filter(line=>line.startsWith("data:")).map(line=>line.slice(5).trimStart()).join("\n");
    if(!data||data==="[DONE]")return;
    const event=JSON.parse(data);
    if(event.type==="response.output_text.delta"){
      output+=String(event.delta||"");if(output.length>2_000_000)throw new Error("stream_too_large");
      const answer=partialAnswer(output);if(answer!==lastAnswer){lastAnswer=answer;onAnswer(answer)}
    }else if(event.type==="response.completed")completed=event.response;
    else if(["error","response.failed","response.incomplete"].includes(event.type))throw new Error("stream_interrupted");
  }
  try{
    while(true){
      const {done,value}=await reader.read();buffer+=decoder.decode(value,{stream:!done});
      let boundary:RegExpExecArray|null;
      while((boundary=/\r?\n\r?\n/.exec(buffer))){const frame=buffer.slice(0,boundary.index);buffer=buffer.slice(boundary.index+boundary[0].length);process(frame)}
      if(buffer.length>262144)throw new Error("stream_frame_too_large");
      if(done)break;
    }
    if(buffer.trim())process(buffer);
    if(!completed||completed.status!=="completed")throw new Error("stream_interrupted");
    return {...completed,output_text:output||completed.output_text};
  }finally{try{await reader.cancel()}catch{}reader.releaseLock()}
}
