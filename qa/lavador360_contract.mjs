import fs from 'node:fs';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=read('lavador360.html');
const js=read('lavador360.js');
const auth=read('lavador360-auth-bridge.js');
const css=read('lavador360.css');
const manifest=JSON.parse(read('lavador360.webmanifest'));
const migration=read('supabase/migrations/20260929110000_lavador360_core_v1.sql');
const sequence=read('supabase/migrations/20260929111500_lavador360_order_sequence_v1.sql');

const must=(value,message)=>{if(!value)throw new Error(message)};

new Function(js);

must(html.includes('id="tab-patio"'),'Tela de pátio ausente');
must(html.includes('id="patioBoard"'),'Board do pátio ausente');
must(js.includes('function renderPatio'),'Render do pátio ausente');
must(js.includes("action==='advance-stage'"),'Avanço de etapa ausente');
must(js.includes('qaDecision'),'Controle de qualidade ausente');
must(html.includes('id="tab-wash-detail"'),'Detalhes da lavagem ausente');
must(html.includes('id="washPhotoInput"'),'Captura fotográfica ausente');
must(js.includes('washChecklistTemplate'),'Checklist operacional ausente');
must(js.includes("storage.from('v2-wash-photos')"),'Storage de fotos ausente');
must(js.includes('renderVehicleHistory'),'Histórico por condução ausente');
new Function(auth);

for(const id of ['sessionGate','appShell','dashboardKpis','washForm','washList','customerForm','productForm','findingForm','settingsForm','servicePriceList']){
  must(html.includes(`id="${id}"`),`HTML sem #${id}`);
}
for(const table of ['v2_wash_settings','v2_wash_customers','v2_wash_customer_vehicles','v2_wash_service_catalog','v2_wash_products','v2_wash_orders','v2_wash_order_products','v2_wash_findings']){
  must(migration.includes(table),`Migration sem ${table}`);
}
must(migration.includes("'wash.view'"),'Permissão wash.view ausente');
must(migration.includes("'wash.manage'"),'Permissão wash.manage ausente');
must(migration.includes('enable row level security'),'RLS ausente');
must(migration.includes('revoke all on table public.%I from anon'),'Revoke anon ausente');
must(migration.includes('security invoker'),'Funções devem operar como invoker');
must(!migration.toLowerCase().includes('service_role'),'Migration não deve expor service_role');
must(sequence.includes('v2_wash_number_seq'),'Sequence de lavagem ausente');
must(js.includes("from('v2_vehicles')"),'Integração com frota ausente');
must(js.includes("rpc('v2_wash_send_finding_to_workshop'"),'Integração Oficina ausente');
must(js.includes("from('v2_wash_order_products')"),'Baixa de produto ausente');
must(auth.includes('SUPABASE_PUBLISHABLE_KEY'),'Login deve usar publishable key');
must(!auth.toLowerCase().includes('service_role'),'Auth não pode conter service_role');
must(['./lavador360.html','/lavador360'].includes(manifest.start_url),'Manifest start_url incorreto');
must(manifest.display==='standalone','Manifest precisa ser standalone');
must(css.includes('@media(max-width:760px)'),'Layout mobile ausente');

console.log('Lavador 360 contract: OK');
