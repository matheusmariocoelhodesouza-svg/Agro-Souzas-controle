import fs from 'node:fs';

const js=fs.readFileSync('oficina360-sprinter-exploded-v2.js','utf8');
const css=fs.readFileSync('oficina360-sprinter-exploded-v2.css','utf8');
const html=fs.readFileSync('oficina360.html','utf8');

const must=(ok,msg)=>{if(!ok)throw new Error(msg)};

must(html.includes('oficina360-sprinter-exploded-v2.css?v=20260928-1'),'CSS v2 não carregado');
must(html.includes('oficina360-sprinter-exploded-v2.js?v=20260928-1'),'JS v2 não carregado');
must(js.includes("v2_vehicle_exploded_views"),'viewer não consulta vistas reais');
must(js.includes("v2_vehicle_exploded_view_items"),'viewer não consulta itens reais');
must(js.includes("v2_vehicle_components"),'viewer não consulta componentes reais');
must(js.includes("8AC903662BE040910"),'escopo por VIN da Sprinter ausente');
must(js.includes("903.662")&&js.includes("OM611.981"),'escopo chassi/motor da Sprinter ausente');
must(js.includes('RECONSTRUÇÃO VETORIAL ORIGINAL')||js.includes('RECONSTRUÇÃO VETORIAL'),'aviso de reconstrução original ausente');
must(js.includes('NÃO É IMAGEM OEM')||js.includes('não uma prancha OEM'),'viewer deve distinguir desenho próprio de EPC OEM');
must(js.includes('statusOf(item,c)'),'classificação de confiabilidade ausente');
must(js.includes('exactness_status'),'exactness_status não usado');
must(js.includes('data_status'),'data_status não usado');
must(js.includes('source_metadata?.official_epc'),'sinalização de EPC oficial ausente');
must(js.includes('data-spr-part'),'ponte com catálogo real ausente');
must(js.includes("setMode('structural')"),'vista estrutural não é padrão da Sprinter');
must(js.includes('Modelo 3D ilustrativo'),'fallback ilustrativo não disponível');
must(css.includes('spr-epc2-active'),'classe de substituição do modelo genérico ausente');
must(css.includes('.spr-epc2-node.verified'),'estado visual verificado ausente');
must(css.includes('.spr-epc2-node.estimated'),'estado visual estimado ausente');
must(css.includes('.spr-epc2-node.pending'),'estado visual pendente ausente');

const forbidden=[
  /oem_part_number\s*:\s*['"][A-Z0-9]/,
  /torque_spec\s*:\s*['"][0-9]/,
  /official_epc\s*=\s*true/
];
for(const rx of forbidden)must(!rx.test(js),`dado técnico hardcoded proibido: ${rx}`);

console.log('Oficina 360 Sprinter exploded v2 contract: OK');
