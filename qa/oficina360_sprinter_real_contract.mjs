import fs from 'node:fs';

const html=fs.readFileSync('oficina360.html','utf8');
const js=fs.readFileSync('oficina360-sprinter-real.js','utf8');
const css=fs.readFileSync('oficina360-sprinter-real.css','utf8');

const must=(ok,msg)=>{if(!ok)throw new Error(msg)};

must(html.includes('oficina360-sprinter-real.css'),'CSS real da Sprinter não carregado no HTML');
must(html.includes('oficina360-sprinter-real.js'),'JS real da Sprinter não carregado no HTML');
must(html.indexOf('oficina360-sprinter-real.js')>html.indexOf('oficina360-visual-premium.js'),'adaptador real deve carregar após o visual Premium');

for(const token of [
  '8AC903662BE040910','903.662','OM611.981','v2_vehicle_component_links','v2_vehicle_components',
  'v2_vehicle_diagnostic_playbooks','related_component_ids','sem geometria visual vinculada','Nenhuma peça será apontada por chute'
]) must(js.includes(token),`contrato ausente: ${token}`);

must(js.includes("fitment_status==='verified'"),'status verified precisa ser respeitado');
must(js.includes("data_status==='verified'"),'data_status verified precisa ser respeitado');
must(css.includes('.spr-real-catalog'),'estilos do catálogo real ausentes');
must((css.match(/{/g)||[]).length===(css.match(/}/g)||[]).length,'CSS da Sprinter com chaves desbalanceadas');

console.log('Oficina 360 Sprinter real contract: OK');
