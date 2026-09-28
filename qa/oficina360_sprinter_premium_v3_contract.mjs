import fs from 'node:fs';

const js=fs.readFileSync('oficina360-sprinter-premium-v3.js','utf8');
const css=fs.readFileSync('oficina360-sprinter-premium-v3.css','utf8');
const html=fs.readFileSync('oficina360.html','utf8');

const must=(text,needle,label=needle)=>{if(!text.includes(needle))throw new Error(`Missing ${label}`)};

must(html,'oficina360-sprinter-premium-v3.css?v=20260928-1','premium v3 css loader');
must(html,'oficina360-sprinter-premium-v3.js?v=20260928-1','premium v3 js loader');

for(const code of [
 'turbocharger_611981','charge_air_903662','common_rail_611981','engine_cylinder_head_cover_611981',
 'engine_cooling_water_pump_611981','radiator_diesel_903662','cooling_fan_expansion_903662',
 'front_disc_brake_903662_late','rear_disc_brake_903662','abs_hydraulic_unit_903','brake_booster_lines_903662',
 'front_knuckle_strut_control_arm_903662','wheel_hubs_bearings_903662','front_axle_903662','rear_suspension_903662'
]) must(js,code,`priority assembly ${code}`);

for(const token of ['PREMIUM V3','Montado','Explodido','▶ Animar','spr-part-card.diagnostic','posição funcional reconstruída','NÃO É GEOMETRIA OEM']) must(js,token);
for(const role of ['turbo','intercooler','rail','injector','breather','waterPump','radiator','disc','caliper','absUnit','strut','controlArm','ballJoint','stabilizer']) must(js,`'${role}'`,`shape/role ${role}`);
for(const cls of ['.spr-v3-toolbar','.spr-v3-scene','.spr-v3-node.diagnostic','.spr-v3-flow','.spr-v3-watermark']) must(css,cls);

if(/oem.*geometria.*confirmada/i.test(js))throw new Error('Premium v3 must not claim estimated geometry is OEM-confirmed');
console.log('Oficina 360 Sprinter Premium v3 contract: OK');
