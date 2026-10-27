import {validateSample} from './protocols.mjs';
export const MAX_SAMPLES = 600, MAX_RECORDINGS = 20, MAX_IMPORT_BYTES = 8 * 1024 * 1024;
export function newRecordingId(api = globalThis.crypto) {
  if (api?.randomUUID) return api.randomUUID();
  if (!api?.getRandomValues) throw Error('Este navegador não oferece geração segura de identificadores.');
  const data = api.getRandomValues(new Uint8Array(16)); data[6] = (data[6] & 15) | 64; data[8] = (data[8] & 63) | 128;
  const h = [...data].map(b => b.toString(16).padStart(2,'0')).join('');
  return [h.slice(0,8),h.slice(8,12),h.slice(12,16),h.slice(16,20),h.slice(20)].join('-');
}
export function validateRecording(input) {
  if (!input || input.schema !== 'o360.scan.recording.v1' || input.simulated !== true || typeof input.id !== 'string' || input.id.length > 80 || typeof input.profile !== 'string' || !Number.isFinite(Date.parse(input.started_at)) || !Array.isArray(input.samples) || input.samples.length > MAX_SAMPLES || !Array.isArray(input.events) || input.events.length > 200) throw Error('Gravação de laboratório inválida.');
  const samples = input.samples.map(validateSample);
  for (let i = 0; i < samples.length; i++) {
    if (samples[i].profile !== input.profile || (i && (samples[i].sequence <= samples[i-1].sequence || Date.parse(samples[i].recorded_at) < Date.parse(samples[i-1].recorded_at)))) throw Error('Gravação fora de ordem ou com perfis misturados.');
  }
  return {schema: input.schema, id: input.id, profile: input.profile, simulated: true, started_at: input.started_at, samples, events: input.events.map(e => ({at: String(e.at || '').slice(0,40), description: String(e.description || '').slice(0,500), simulated: true}))};
}
export function parseRecording(text) {if (new TextEncoder().encode(text).length > MAX_IMPORT_BYTES) throw Error('Arquivo acima de 8 MB.'); return validateRecording(JSON.parse(text));}
const csvCell = value => '"' + String(value ?? '').replace(/^[=+\-@\t\r]/, "'$&").replaceAll('"', '""') + '"';
export function recordingCsv(recording) {
  const r = validateRecording(recording), rows = [['origem','perfil','horario','sequencia','parametro','valor','unidade','qualidade']];
  for (const s of r.samples) for (const [key, p] of Object.entries(s.pids)) rows.push(['SIMULACAO',r.profile,s.recorded_at,s.sequence,key,p.value,p.unit,p.quality]);
  return '\ufeff' + rows.map(row => row.map(csvCell).join(';')).join('\r\n');
}
export class RecordingStore {
  constructor(scope = 'demo') {this.scope = scope; this.db = null; this.memory = new Map(); this.persistent = false;}
  async open() {
    if (!globalThis.indexedDB) return this;
    try {
      this.db = await new Promise((resolve,reject) => {const req = indexedDB.open('o360-scan-pro-lab-v1',1); req.onupgradeneeded = () => req.result.createObjectStore('recordings', {keyPath: 'key'}); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error);});
      this.persistent = true;
    } catch {this.persistent = false;}
    return this;
  }
  async all() {
    if (!this.db) return [...this.memory.values()];
    const tx = this.db.transaction('recordings','readonly');
    const rows = await new Promise((resolve,reject) => {const req = tx.objectStore('recordings').getAll(); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error);});
    return rows.filter(r => r.scope === this.scope).map(r => r.recording).sort((a,b) => b.started_at.localeCompare(a.started_at));
  }
  async save(recording) {
    const valid = validateRecording(recording);
    if (!this.db) {this.memory.set(valid.id,valid); while(this.memory.size > MAX_RECORDINGS) this.memory.delete(this.memory.keys().next().value); return;}
    const existing = await this.all(), tx = this.db.transaction('recordings','readwrite'), store = tx.objectStore('recordings');
    store.put({key: this.scope + ':' + valid.id, scope: this.scope, recording: valid});
    const retained = existing.filter(r => r.id !== valid.id).sort((a,b) => b.started_at.localeCompare(a.started_at));
    for (const old of retained.slice(MAX_RECORDINGS - 1)) store.delete(this.scope + ':' + old.id);
    await new Promise((resolve,reject) => {tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error || Error('Gravação cancelada.'));});
  }
  close() {this.db?.close(); this.db = null;}
}
