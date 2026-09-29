import fs from 'node:fs';
import assert from 'node:assert/strict';

const html=fs.readFileSync('oficina360.html','utf8');
const js=fs.readFileSync('oficina360-symptom-diagnostic-v1.js','utf8');
const migration=fs.readFileSync('supabase/migrations/20260929101500_oficina360_symptom_diagnostic_playbooks_v1.sql','utf8');
const fallback=fs.readFileSync('supabase/migrations/20260929102000_oficina360_symptom_general_fallback_v1.sql','utf8');

assert.match(html,/oficina360-symptom-diagnostic-v1\.js/,'Oficina must load symptom diagnostic module');
assert.match(js,/v2_vehicle_symptom_playbooks/,'must query symptom playbooks');
assert.match(js,/protocol:'symptom'/,'sessions must be separated as symptom protocol');
assert.match(js,/next_on_fail/,'tree must branch after failed test');
assert.match(js,/next_on_pass/,'tree must branch after passed test');
assert.match(js,/Ganhou evidência/,'UI must present evidence rather than parts verdicts');
assert.match(js,/Ficou menos provável/,'UI must reduce hypotheses after passing tests');
assert.match(js,/v2_vehicle_fault_resolutions/,'completed symptom investigations must become vehicle memory');
assert.match(js,/v2_create_work_order_from_diagnostic_session/,'completed investigation must be convertible to work order');
assert.match(js,/o360:electrical-open/,'symptom tree must bridge to electrical map');
assert.match(migration,/create table if not exists public\.v2_vehicle_symptom_playbooks/,'playbooks table missing');
assert.match(migration,/loss_of_power_limp/,'loss-of-power route missing');
assert.match(migration,/upper\(v\.plate\)='EJW6A76'/,'Sprinter exact route missing');
assert.match(migration,/sprinter_map_boost/,'Sprinter boost/MAP step missing');
assert.match(migration,/sprinter_maf_iat/,'Sprinter MAF/IAT step missing');
assert.match(migration,/sprinter_rail/,'Sprinter rail step missing');
assert.match(fallback,/general_symptom/,'free-text safe fallback missing');
assert.match(fallback,/measure_before_replace/,'fallback must require measurement before replacement');

console.log('Oficina 360 symptom diagnostic v1 contract: OK');
