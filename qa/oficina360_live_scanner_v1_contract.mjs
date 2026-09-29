import fs from 'node:fs';
import assert from 'node:assert/strict';

const js=fs.readFileSync('oficina360-live-scanner-v1.js','utf8');
const html=fs.readFileSync('oficina360.html','utf8');
const sql=fs.readFileSync('supabase/migrations/20260929103000_oficina360_live_scanner_v1.sql','utf8');
const docs=fs.readFileSync('docs/oficina360-live-scanner-contract.md','utf8');

for(const token of ['v2_vehicle_scanner_current','v2_diagnostic_scanner_snapshots','supabase_realtime','live_scanner_capture','scanner_pids','scanner_compare']) assert.ok(sql.includes(token),`migration missing ${token}`);
for(const token of ['intake_pressure_target_kpa_abs','intake_pressure_actual_kpa_abs','rail_pressure_target_bar','rail_pressure_actual_bar','maf_g_s','iat_c']) assert.ok(sql.includes(token),`scanner hint missing ${token}`);
for(const token of ['postgres_changes','v2_vehicle_scanner_current','v2_vehicle_telemetry_current','data-live-capture','v2_diagnostic_scanner_snapshots','target_actual_delta']) assert.ok(js.includes(token),`frontend missing ${token}`);
assert.ok(js.includes("protocol','symptom'"),'live capture must attach to symptom diagnostic session');
assert.ok(js.includes('não condena componente')||js.includes('não condena'), 'UI must not auto-condemn a component');
assert.ok(html.includes('oficina360-live-scanner-v1.js'),'HTML must load live scanner module');
assert.ok(docs.includes('Nunca usar `service_role`'),'bridge docs must prohibit service-role exposure');
assert.ok(docs.includes('pressão **absoluta**'),'bridge docs must distinguish absolute pressure');
console.log('Oficina 360 live scanner v1 contract OK');
