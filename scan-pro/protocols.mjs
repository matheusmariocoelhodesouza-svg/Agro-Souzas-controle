// Read-only decoders. No bus writes, security access, coding or flash routines.
export const PROTOCOLS = Object.freeze({
  j1939: {name: 'SAE J1939', status: 'Decodificação parcial', detail: 'EEC1 (RPM), ET1 (temperatura), CCVS1 (velocidade) e DM1 de um quadro. TP/BAM e variantes OEM pendentes.'},
  obd2: {name: 'OBD-II', status: 'Decodificação parcial', detail: 'Respostas 01:04/05/0B/0C/0D/0F/10/42 e 03. Disponibilidade de PIDs depende da ECU.'},
  uds: {name: 'UDS / ISO-TP', status: 'Laboratório', detail: 'Remontagem ISO-TP clássico, respostas negativas e leitura de DID F190. DIDs OEM exigem documentação.'},
  kwp2000: {name: 'KWP2000 / K-Line', status: 'Planejado', detail: 'Camada física, inicialização e serviços específicos ainda não implementados.'},
  j1708: {name: 'J1708 / J1587', status: 'Planejado', detail: 'Exige interface elétrica e decodificação próprias; não é CAN.'},
  manual: {name: 'Instrumentação manual', status: 'Disponível', detail: 'Registre medições de instrumentos externos; não pressupõe ECU no motor.'}
});

export const PIDS = Object.freeze({
  engine_rpm: {label: 'Rotação', unit: 'rpm'},
  coolant_temp_c: {label: 'Temperatura do motor', unit: '°C'},
  battery_voltage: {label: 'Tensão elétrica', unit: 'V'},
  vehicle_speed_kmh: {label: 'Velocidade', unit: 'km/h'},
  engine_load_percent: {label: 'Carga do motor', unit: '%'},
  intake_pressure_actual_kpa_abs: {label: 'Admissão absoluta', unit: 'kPa abs'},
  iat_c: {label: 'Temperatura do ar', unit: '°C'},
  maf_g_s: {label: 'Massa de ar', unit: 'g/s'},
  rail_pressure_target_bar: {label: 'Rail alvo (modelo didático)', unit: 'bar'},
  rail_pressure_actual_bar: {label: 'Rail real (modelo didático)', unit: 'bar'}
});

export function bytes(value, {max = 4095, min = 1} = {}) {
  if ((!Array.isArray(value) && !(value instanceof Uint8Array)) || value.length < min || value.length > max || [...value].some(b => !Number.isInteger(b) || b < 0 || b > 255)) throw Error('Bytes inválidos.');
  return [...value];
}
export const hex = value => bytes(value).map(b => b.toString(16).padStart(2, '0')).join(' ').toUpperCase();
const pid = (key, value) => ({[key]: {value, ...PIDS[key], quality: 'decoded'}});
function need(b, n) {if (b.length < n) throw Error('Resposta truncada.');}

export function decodeObd(payload) {
  const b = bytes(payload); need(b, 2);
  if (b[0] === 0x43) {
    const dtcs = []; if ((b.length - 1) % 2) throw Error('DTC truncado.');
    for (let i = 1; i < b.length; i += 2) {
      if (!(b[i] || b[i + 1])) continue;
      dtcs.push({code: 'PCBU'[b[i] >> 6] + ((b[i] >> 4) & 3) + (b[i] & 15).toString(16).toUpperCase() + b[i + 1].toString(16).padStart(2, '0').toUpperCase(), protocol: 'obd2'});
    }
    return {pids: {}, dtcs};
  }
  if (b[0] !== 0x41) throw Error('Serviço OBD não suportado.');
  const one = {
    0x04: ['engine_load_percent', a => a * 100 / 255],
    0x05: ['coolant_temp_c', a => a - 40],
    0x0b: ['intake_pressure_actual_kpa_abs', a => a],
    0x0d: ['vehicle_speed_kmh', a => a],
    0x0f: ['iat_c', a => a - 40]
  }[b[1]];
  if (one) {need(b, 3); return {pids: pid(one[0], one[1](b[2]))};}
  const two = {
    0x0c: ['engine_rpm', n => n / 4],
    0x10: ['maf_g_s', n => n / 100],
    0x42: ['battery_voltage', n => n / 1000]
  }[b[1]];
  if (!two) return {pids: {}, unsupported: true};
  need(b, 4); return {pids: pid(two[0], two[1](b[2] * 256 + b[3]))};
}

export function j1939Id(id) {
  if (!Number.isInteger(id) || id < 0 || id > 0x1fffffff) throw Error('Identificador CAN estendido inválido.');
  const pf = (id >>> 16) & 255;
  return {pgn: (id >>> 8) & (pf < 240 ? 0x3ff00 : 0x3ffff), source: id & 255, destination: pf < 240 ? (id >>> 8) & 255 : null};
}
export function decodeJ1939(id, payload) {
  const b = bytes(payload, {max: 8, min: 8}), {pgn, source} = j1939Id(id);
  if (pgn === 61444) {
    const raw = b[3] + 256 * b[4];
    return {pids: raw >= 0xfa00 ? {} : pid('engine_rpm', raw * 0.125), source, pgn};
  }
  if (pgn === 65262) return {pids: b[0] >= 250 ? {} : pid('coolant_temp_c', b[0] - 40), source, pgn};
  if (pgn === 65265) {
    const raw = b[1] + 256 * b[2];
    return {pids: raw >= 0xfa00 ? {} : pid('vehicle_speed_kmh', raw / 256), source, pgn};
  }
  if (pgn === 65226) {
    const dtcs = [];
    // DM1: lamp bytes + four-byte DTCs. Only modern conversion method (CM=0).
    for (let i = 2; i + 3 < b.length; i += 4) {
      if (b.slice(i, i + 4).every(x => x === 255) || b.slice(i, i + 4).every(x => x === 0)) continue;
      if (b[i + 3] & 128) return {pids: {}, dtcs: [], unsupported: true, reason: 'Conversão DM1 legada pendente.', source, pgn};
      dtcs.push({spn: b[i] + 256 * b[i + 1] + ((b[i + 2] & 224) << 11), fmi: b[i + 2] & 31, occurrence_count: b[i + 3] & 127, protocol: 'j1939'});
    }
    return {pids: {}, dtcs, source, pgn};
  }
  return {pids: {}, unsupported: true, source, pgn};
}

// Receive-only, normal addressing, Classical CAN, 12-bit length (max 4095).
// Real flow control, CAN-FD and addressing modes belong to a validated native driver.
export class IsoTpReceiver {
  constructor({timeoutMs = 1000} = {}) {this.timeoutMs = timeoutMs; this.pending = new Map();}
  reset() {this.pending.clear();}
  accept(channel, payload, now = Date.now()) {
    const b = bytes(payload, {max: 8}), type = b[0] >> 4;
    for (const [key, session] of this.pending) if (now - session.at > this.timeoutMs) this.pending.delete(key);
    if (type === 0) {
      const length = b[0] & 15; this.pending.delete(channel);
      if (!length || length > 7 || length > b.length - 1) throw Error('Single Frame inválido.');
      return b.slice(1, length + 1);
    }
    if (type === 1) {
      need(b, 8); const length = ((b[0] & 15) << 8) + b[1];
      if (length <= 7) throw Error('First Frame inválido.');
      if (!this.pending.has(channel) && this.pending.size >= 32) throw Error('Limite de canais ISO-TP.');
      this.pending.set(channel, {length, data: b.slice(2), seq: 1, at: now}); return null;
    }
    if (type === 2) {
      const s = this.pending.get(channel);
      if (!s) throw Error('Consecutive Frame sem início ou expirado.');
      if ((b[0] & 15) !== s.seq || b.length < 2) {this.pending.delete(channel); throw Error('Sequência ISO-TP inválida.');}
      s.data.push(...b.slice(1)); s.seq = (s.seq + 1) & 15; s.at = now;
      if (s.data.length >= s.length) {this.pending.delete(channel); return s.data.slice(0, s.length);}
      if (b.length !== 8) {this.pending.delete(channel); throw Error('Fragmento ISO-TP truncado.');}
      return null;
    }
    throw Error('Tipo ISO-TP não suportado no receptor de laboratório.');
  }
}
export function decodeUds(payload) {
  const b = bytes(payload);
  if (b[0] === 0x7f) {need(b, 3); return {negative: true, service: b[1], nrc: b[2], pending: b[2] === 0x78};}
  if (b[0] !== 0x62) return {unsupported: true};
  need(b, 3); const did = b[1] * 256 + b[2];
  if (did !== 0xf190) return {did, unsupported: true};
  if (b.length !== 20 || b.slice(3).some(x => !/[A-HJ-NPR-Z0-9]/.test(String.fromCharCode(x)))) throw Error('VIN UDS inválido.');
  return {did, vin: String.fromCharCode(...b.slice(3))};
}

export function validateSample(sample) {
  if (!sample || sample.schema !== 'o360.scan.sample.v1' || !['simulation', 'manual'].includes(sample.origin) || sample.simulated !== true) throw Error('Somente registros do laboratório podem ser importados.');
  if (!Number.isFinite(Date.parse(sample.recorded_at)) || !Number.isInteger(sample.sequence) || sample.sequence < 0) throw Error('Sequência ou horário inválido.');
  if (!Object.hasOwn(PROTOCOLS, sample.protocol) || !['streaming', 'timeout', 'manual'].includes(sample.state)) throw Error('Estado ou protocolo inválido.');
  const profileProtocols = {comil:'j1939',sprinter:'obd2',volare:'manual',mercedes608:'manual'};
  if (!Object.hasOwn(profileProtocols,sample.profile) || sample.protocol !== profileProtocols[sample.profile]) throw Error('Protocolo incompatível com o perfil do laboratório.');
  if (!sample.pids || Array.isArray(sample.pids) || typeof sample.pids !== 'object' || Object.keys(sample.pids).length > 32 || !Array.isArray(sample.dtcs) || sample.dtcs.length > 32 || !Array.isArray(sample.frames) || sample.frames.length > 32) throw Error('Pacote inválido.');
  const clean = {...sample, pids: {}, dtcs: [], frames: []};
  for (const [key, p] of Object.entries(sample.pids)) {
    if (!Object.hasOwn(PIDS, key) || !p || !Number.isFinite(p.value) || Math.abs(p.value) > 1e7) throw Error('Leitura inválida.');
    if (!['simulated', 'manual'].includes(p.quality)) throw Error('Procedência inválida.');
    clean.pids[key] = {value: p.value, ...PIDS[key], quality: p.quality, source: String(p.source || '').slice(0,80)};
  }
  for (const d of sample.dtcs) {
    if (!d || (d.code !== undefined && !/^[PCBU][0-3][0-9A-F]{3}$/.test(d.code)) || (d.spn !== undefined && (!Number.isInteger(d.spn) || d.spn < 0 || d.spn > 524287)) || (d.fmi !== undefined && (!Number.isInteger(d.fmi) || d.fmi < 0 || d.fmi > 31)) || (!d.code && d.spn === undefined)) throw Error('DTC inválido.');
    clean.dtcs.push({...(d.code ? {code: d.code} : {spn: d.spn, fmi: d.fmi}), protocol: sample.protocol});
  }
  for (const f of sample.frames) {
    if (!f || !['obd2','j1939','uds'].includes(f.protocol) || f.id !== null && (!Number.isInteger(f.id) || f.id < 0 || f.id > 0x1fffffff)) throw Error('Quadro inválido.');
    clean.frames.push({protocol: f.protocol, id: f.id, data: bytes(f.data, {max: 64})});
  }
  if (sample.state === 'timeout' && (Object.keys(clean.pids).length || clean.dtcs.length || clean.frames.length)) throw Error('Timeout não pode conter leitura atual.');
  if (sample.protocol === 'manual' && (sample.state !== 'manual' || clean.dtcs.length || clean.frames.length || Object.keys(clean.pids).length && sample.origin !== 'manual')) throw Error('Este perfil não tem ECU identificada.');
  return clean;
}
