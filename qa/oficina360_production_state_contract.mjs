import fs from 'node:fs';

const sqlPath = 'qa/oficina360_fleet_diagnostic_depth_postdeploy.sql';
const docPath = 'docs/oficina360/production-state-2026-09-29.md';

for (const path of [sqlPath, docPath]) {
  if (!fs.existsSync(path)) throw new Error(`Arquivo obrigatório ausente: ${path}`);
}

const sql = fs.readFileSync(sqlPath, 'utf8');
const doc = fs.readFileSync(docPath, 'utf8');
const all = `${sql}\n${doc}`;

for (const plate of ['CPI6C79', 'MBJ1166', 'BYH8J61', 'QSR7H50']) {
  if (!all.includes(plate)) throw new Error(`Condução ausente da auditoria: ${plate}`);
}

for (const marker of [
  'vw_mwm_8150e_9150e_od_wiring',
  'requires_physical_variant_confirmation',
  'comil_variant_gate',
  'MECH-DIESEL-NO-ECU',
  'volare_ns_injection',
  'OM314-NO-ECU',
  'VOLTAGE-GATE',
  'do_not_assume_12v_or_24v',
  '608_ns_voltage_gate',
  '608_ns_injection',
  'trailer_plug_map',
  'wheel_hub_noise',
  "fleet_depth_version'='v1'",
]) {
  if (!all.includes(marker)) throw new Error(`Gate pós-deploy ausente: ${marker}`);
}

if (!sql.includes('v_count <> 15')) throw new Error('Contrato não protege a contagem de 15 playbooks V1');
if (!doc.includes('Não habilitar ainda um workflow genérico de `supabase db push`')) {
  throw new Error('Aviso de reconciliação do histórico de migrations ausente');
}
if (!doc.includes('RLS está ativo') || !doc.includes('não há grant')) {
  throw new Error('Decisão de segurança do signing material não documentada');
}

console.log('OK — Oficina 360 production state contract');
