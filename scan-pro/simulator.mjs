import {decodeObd, decodeJ1939, PIDS, validateSample} from './protocols.mjs';

export const PROFILES = Object.freeze({
  comil: {name: 'Comil · MWM 4.12 TCE', protocol: 'j1939', electronic: true, note: 'Perfil didático J1939. ECU, conector, tensão e serviços reais precisam de conferência física.'},
  sprinter: {name: 'Sprinter 313 CDI · OM611', protocol: 'obd2', electronic: true, note: 'Perfil didático OBD-II. KWP/K-Line e serviços Mercedes dependem da variante e da ECU.'},
  volare: {name: 'Volare · MWM 4.07 TCA', protocol: 'manual', electronic: false, note: 'Cadastro 4.07 TCA. Não presumir ECU de motor nem rede CAN; confirmar injeção, conector e tensão.'},
  mercedes608: {name: 'Mercedes 608 · OM314', protocol: 'manual', electronic: false, note: 'Motor mecânico. Medições de instrumentos externos; sem ECU de motor para ler ou comandar.'}
});
export const SCENARIOS = Object.freeze({normal: 'Funcionamento regular', boost: 'Baixa pressão de admissão', rail: 'Rail abaixo do alvo', overheat: 'Temperatura elevada', timeout: 'Perda de comunicação'});
const round = (n, d = 1) => Math.round(n * 10 ** d) / 10 ** d;
const be = n => [n >> 8 & 255, n & 255];
function jframe(pgn, data) {return {protocol: 'j1939', id: 0x18000000 + (pgn << 8), data};}
function quality(pids, source) {return Object.fromEntries(Object.entries(pids).map(([k, p]) => [k, {...p, value: round(p.value, 3), quality: 'simulated', source}]));}

export class EcuSimulator {
  constructor(profile = 'comil') {this.sequence = 0; this.timer = null; this.profile = null; this.configure(profile); this.scenario = 'normal'; this.throttle = 20; this.listener = null;}
  configure(profile) {if (!Object.hasOwn(PROFILES, profile)) throw Error('Perfil inválido.'); this.profile = profile; this.sequence = 0;}
  setScenario(scenario) {if (!Object.hasOwn(SCENARIOS, scenario)) throw Error('Cenário inválido.'); this.scenario = scenario;}
  setThrottle(value) {if (!Number.isFinite(value) || value < 0 || value > 100) throw Error('Acelerador inválido.'); this.throttle = value;}
  sample(now = Date.now()) {
    const profile = PROFILES[this.profile], sequence = this.sequence++;
    const base = {schema: 'o360.scan.sample.v1', simulated: true, origin: 'simulation', profile: this.profile, protocol: profile.protocol, sequence, recorded_at: new Date(now).toISOString(), state: 'streaming', pids: {}, dtcs: [], frames: []};
    if (!profile.electronic) return {...base, state: 'manual'};
    if (this.scenario === 'timeout') return {...base, state: 'timeout'};
    const t = sequence, rpm = round(750 + this.throttle * 22 + Math.sin(t * 0.7) * 18, 0), temp = this.scenario === 'overheat' ? 112 + Math.sin(t) : round(82 + Math.sin(t / 12) * 2), voltage = 27.7 + Math.sin(t / 4) * .12;
    if (profile.protocol === 'j1939') {
      const r = Math.round(rpm * 8);
      base.frames.push(jframe(61444, [255,255,255,r & 255,r >> 8,255,255,255]), jframe(65262, [temp + 40,255,255,255,255,255,255,255]));
      base.frames.push(jframe(65226, this.scenario === 'overheat' ? [0,255,110,0,0,1,255,255] : this.scenario === 'boost' ? [0,255,102,0,1,1,255,255] : [0,255,0,0,0,0,255,255]));
      // The wire temperature is quantized to integer before encoding.
      base.frames[1].data[0] = Math.round(temp + 40);
      for (const f of base.frames) {const r = decodeJ1939(f.id, f.data); Object.assign(base.pids, r.pids); if (r.dtcs) base.dtcs = r.dtcs;}
    } else {
      base.frames.push({protocol: 'obd2', id: 0x7e8, data: [0x41,0x0c,...be(rpm * 4)]}, {protocol: 'obd2', id: 0x7e8, data: [0x41,0x05,Math.round(temp + 40)]}, {protocol: 'obd2', id: 0x7e8, data: [0x41,0x42,...be(Math.round(voltage / 2 * 1000))]});
      base.frames.push({protocol: 'obd2', id: 0x7e8, data: this.scenario === 'boost' ? [0x43,0x02,0x99] : this.scenario === 'rail' ? [0x43,0x00,0x87] : this.scenario === 'overheat' ? [0x43,0x02,0x17] : [0x43,0,0]});
      for (const f of base.frames) {const r = decodeObd(f.data); Object.assign(base.pids, r.pids); if (r.dtcs) base.dtcs = r.dtcs;}
    }
    base.pids = quality(base.pids, 'decoder_lab');
    // These are synthetic didactic signals, NOT proprietary OEM PIDs.
    const modeled = {battery_voltage: profile.protocol === 'j1939' ? voltage : voltage / 2, engine_load_percent: this.throttle, intake_pressure_actual_kpa_abs: (this.scenario === 'boost' ? 100 : 102 + this.throttle * 1.3) + Math.sin(t), rail_pressure_target_bar: 300 + this.throttle * 7, rail_pressure_actual_bar: (300 + this.throttle * 7) * (this.scenario === 'rail' ? .63 : .98)};
    for (const [key, value] of Object.entries(modeled)) if (!base.pids[key]) base.pids[key] = {value: round(value), ...PIDS[key], quality: 'simulated', source: 'didactic_model'};
    return validateSample(base);
  }
  start(listener, {intervalMs = 1000} = {}) {
    if (intervalMs < 100 || intervalMs > 10000) throw Error('Intervalo inválido.');
    this.stop(); this.listener = listener; listener(this.sample()); this.timer = setInterval(() => listener(this.sample()), intervalMs);
  }
  stop() {if (this.timer !== null) clearInterval(this.timer); this.timer = null; this.listener = null;}
  capabilities() {return {transport: 'simulator', simulated: true, read: PROFILES[this.profile].electronic, actuatorSimulation: PROFILES[this.profile].electronic, physicalWrites: false};}
  runActuator(name) {
    if (!this.capabilities().actuatorSimulation) throw Error('Este motor não tem ECU de diagnóstico identificada.');
    if (!['fan', 'cylinder_balance'].includes(name)) throw Error('Ensaio não implementado.');
    return {id: name, simulated: true, physical_command_sent: false, description: name === 'fan' ? 'Ventoinha virtual: comando de 0 a 100% e retorno didático.' : 'Equilíbrio virtual: cilindros fictícios, sem determinar defeito real.', result: name === 'fan' ? [0,25,50,75,100,0] : [1.2,-0.6,0.4,-1.0]};
  }
}

// Port contract for future native adapters. Physical I/O is intentionally unavailable.
export class ProfessionalTransport {
  constructor(driver, capabilities = {}) {this.driver = driver; this.features = {read: false, actuator: false, coding: false, flash: false, ...capabilities};}
  async connect() {throw Error(`Driver ${this.driver}: hardware e validação ainda pendentes.`);}
  async disconnect() {}
  async request(operation) {
    if (operation !== 'read') throw Error('Comandos físicos bloqueados nesta versão.');
    throw Error('Conecte um driver profissional validado para leitura.');
  }
}
