import {PIDS} from './protocols.mjs';

export function snapshotContext(recording) {
  const sample = recording?.samples?.at(-1);
  return {simulated: true, profile: recording?.profile || 'comil', snapshot: sample ? {schema: sample.schema, simulated: true, origin: sample.origin, protocol: sample.protocol, state: sample.state, recorded_at: sample.recorded_at, sequence: sample.sequence, pids: sample.pids, dtcs: sample.dtcs} : null,
    events: (recording?.events || []).slice(-8).map(e => e.description)};
}

// Explicitly a deterministic local guide, never presented as a model response.
export function localGuide(question, context) {
  const s = context.snapshot, p = s?.pids || {};
  if (!s) return 'Ainda não há uma leitura nesta sessão. Inicie o simulador ou registre um exercício manual. Depois podemos comparar os sinais.';
  if (s.state === 'timeout') return 'O cenário está sem comunicação. Não há leituras atuais; valores anteriores não confirmam a condição presente. No laboratório, restaure o cenário regular. Em um veículo real, a investigação começaria por alimentação, conexão e rede, com a aplicação elétrica confirmada.';
  const findings = [];
  if (p.coolant_temp_c?.value > 105) findings.push(`O modelo mostra temperatura de ${p.coolant_temp_c.value} °C. O cenário simula aquecimento; não é uma medição do veículo. Verifique o limite do fabricante antes de interpretar uma leitura física.`);
  const target = p.rail_pressure_target_bar?.value, actual = p.rail_pressure_actual_bar?.value;
  if (Number.isFinite(target) && Number.isFinite(actual) && target > 0) findings.push(`Rail didático: alvo ${target} bar, retorno ${actual} bar, diferença ${((actual-target)/target*100).toFixed(1)}%. Esses sinais vêm do modelo, sem mapeamento OEM validado; a diferença sozinha não identifica bomba ou injetor.`);
  if (s.dtcs?.length) findings.push('Há código(s) no cenário. O código aponta uma condição monitorada, não uma peça condenada. Compare o sinal, o contexto e testes independentes.');
  if (s.origin === 'manual') return 'Estas são entradas do exercício manual. Não vieram de uma ECU. Registre o instrumento usado, a condição do motor e o sintoma que está investigando. Compare medições feitas nas mesmas condições e confira a tensão nominal na identificação do veículo. Os valores deste laboratório não confirmam defeito nem representam uma leitura física verificada.';
  if (!findings.length) findings.push('Há sinais simulados disponíveis, sem uma condição específica destacada pelo roteiro local. Isso não comprova que um veículo esteja em boas condições.');
  if (/pr[oó]xim|teste|compar/i.test(question)) findings.push('Próximo exercício: marque uma evidência, mantenha o mesmo acelerador e compare o cenário regular com o cenário de falha. Use condições equivalentes antes de concluir.');
  else findings.push('Para explorar, altere o cenário e observe o gráfico. A OpenAI pode conversar livremente quando a sessão do Oficina 360 estiver disponível.');
  return findings.join('\n\n');
}

export class ScanAssistantClient {
  constructor({client, apiBase, apiKey, vehicle, user}) {Object.assign(this,{client,apiBase,apiKey,vehicle,user});}
  async request(body, {signal, onEvent} = {}) {
    const {data:{session}} = await this.client.auth.getSession();
    if (!session || session.user.id !== this.user.id) throw Error('Sua sessão mudou. Abra o laboratório novamente pelo Oficina 360.');
    const response = await fetch(this.apiBase + '/functions/v1/oficina360-scan-pro-ai', {method:'POST', signal, headers:{'Content-Type':'application/json', apikey:this.apiKey, Authorization:'Bearer '+session.access_token}, body:JSON.stringify({company_id:this.vehicle.company_id,vehicle_id:this.vehicle.id,...body})});
    if (!response.ok) {const data = await response.json().catch(()=>({})); throw Error(data.message || (response.status === 401 ? 'Entre novamente pelo Oficina 360.' : 'Não foi possível consultar a IA.'));}
    if (!response.headers.get('Content-Type')?.includes('text/event-stream')) return await response.json();
    const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='',doneEvent=null;
    const frame = value => {
      const data=value.split(/\r?\n/).filter(l=>l.startsWith('data:')).map(l=>l.slice(5).trimStart()).join('\n');
      if (!data) return; const e=JSON.parse(data);
      if (e.type === 'error') throw Error(e.message || 'Resposta interrompida.');
      if (e.type === 'done') doneEvent=e;
      onEvent?.(e);
    };
    try {
      while(true) {
        const {done,value}=await reader.read(); buffer+=decoder.decode(value,{stream:!done}); let boundary;
        while((boundary=/\r?\n\r?\n/.exec(buffer))) {frame(buffer.slice(0,boundary.index));buffer=buffer.slice(boundary.index+boundary[0].length);}
        if(buffer.length>100000) throw Error('Resposta acima do limite.');
        if(done) break;
      }
      if(buffer.trim()) frame(buffer);
      if(!doneEvent) throw Error('A resposta foi interrompida antes de ser guardada.');
      return doneEvent;
    } finally {try {await reader.cancel();}catch{}reader.releaseLock();}
  }
}
