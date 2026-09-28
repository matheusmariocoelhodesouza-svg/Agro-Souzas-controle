import fs from 'node:fs';

const html=fs.readFileSync('oficina360.html','utf8');
const js=fs.readFileSync('oficina360-fleet-premium-v1.js','utf8');
const css=fs.readFileSync('oficina360-fleet-premium-v1.css','utf8');
const migration=fs.readFileSync('supabase/migrations/20260928_oficina360_all_fleet_premium.sql','utf8');
const repair=fs.readFileSync('oficina360-repair-assistant-v1.js','utf8');
const must=(t,n,label=n)=>{if(!t.includes(n))throw new Error(`Missing ${label}`)};

must(html,'oficina360-fleet-premium-v1.css?v=20260928-1','fleet premium css loader');
must(html,'oficina360-fleet-premium-v1.js?v=20260928-1','fleet premium js loader');
must(html,'oficina360-repair-assistant-v1.js?v=20260928-1','repair assistant loader');

for(const token of ['FROTA PREMIUM','Diagnosticar','Montado','Explodido','▶ Animar','data-v3-id','v2_vehicle_diagnostic_playbooks','v2_vehicle_component_links','v2_vehicle_exploded_views','NÃO É GEOMETRIA OEM']) must(js,token);
for(const group of ['engine','engine_air','engine_turbo','engine_fuel','engine_cooling','engine_lubrication','transmission','driveline','brakes','suspension','steering','electrical','body','hvac']) must(js,`${group}:`,`layout group ${group}`);
for(const cls of ['.fleet-premium','.fleet-layout','.fleet-node.diagnostic','.fleet-side','.fleet-watermark']) must(css,cls);

must(migration,"v.company_id='bb06c7a1-1bbd-42b6-b481-680a9ef5b597'",'all current company vehicles scope');
must(migration,"v.plate='QSR7H50'",'trailer structural catalog');
must(migration,"chassis_variant='LO 608'",'608 normalized variant');
must(migration,"chassis_variant='Volare A6'",'Volare normalized variant');
must(migration,"'fleet_premium_ready',true",'fleet premium ready marker');
must(migration,"'fleet_premium',true",'generated fleet views marker');
must(migration,"'oem_geometry',false",'generated geometry safety marker');
must(migration,'v2_vehicle_exploded_view_items','fleet view item population');
must(repair,'[data-v3-id','repair assistant integration with universal nodes');

if(/geometria\s+oem\s+(confirmada|exata)/i.test(js))throw new Error('Universal layer must not claim generated geometry is OEM exact');
console.log('Oficina 360 all-fleet Premium contract: OK');
