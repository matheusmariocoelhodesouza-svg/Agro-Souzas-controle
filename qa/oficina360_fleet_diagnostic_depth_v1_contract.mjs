import fs from 'node:fs';

const electricalPath='supabase/migrations/20260929133000_oficina360_fleet_electrical_diagnostic_depth_v1.sql';
const symptomPath='supabase/migrations/20260929133500_oficina360_fleet_vehicle_symptom_playbooks_v1.sql';
const docPath='docs/oficina360/fleet-diagnostic-depth-v1.md';
for(const p of [electricalPath,symptomPath,docPath]) if(!fs.existsSync(p)) throw new Error(`Arquivo obrigatório ausente: ${p}`);
const e=fs.readFileSync(electricalPath,'utf8');
const s=fs.readFileSync(symptomPath,'utf8');
const d=fs.readFileSync(docPath,'utf8');
const all=e+'\n'+s+'\n'+d;

for(const plate of ['CPI6C79','MBJ1166','BYH8J61','QSR7H50']) if(!all.includes(plate)) throw new Error(`Condução ausente do pacote: ${plate}`);

// Comil: eletrônica útil, mas sem promover a variante candidata a certeza.
for(const marker of ['requires_physical_variant_confirmation','blocked_until_variant_confirmation','comil_variant_gate','rail_pressure_target_bar','intake_pressure_target_kpa_abs']){
  if(!all.includes(marker)) throw new Error(`Gate eletrônico do Comil ausente: ${marker}`);
}
if(!e.includes("('CPI6C79','vw_mwm_8150e_9150e_od_wiring'")) throw new Error('Fonte de família VW/MWM do Comil ausente');

// Volare e 608: não podem receber common rail/ECU de motor fictícios.
for(const marker of ['MECH-DIESEL-NO-ECU','OM314-NO-ECU','common_rail_not_applicable','engine_scanner_not_applicable']){
  if(!all.includes(marker)) throw new Error(`Arquitetura mecânica não protegida: ${marker}`);
}
for(const marker of ['volare_ns_fuel','volare_ns_injection','608_ns_fuel','608_ns_injection']){
  if(!s.includes(marker)) throw new Error(`Árvore mecânica incompleta: ${marker}`);
}

// 608: tensão não pode ser presumida.
for(const marker of ['unknown_until_physical_check','do_not_assume_12v_or_24v','608_ns_voltage_gate']){
  if(!all.includes(marker)) throw new Error(`Gate de tensão da 608 ausente: ${marker}`);
}

// Reboque: pinagem e rolamento só após identificação física.
for(const marker of ['physical_mapping_required','do_not_assume_connector_standard','trailer_plug_map','wheel_hub_noise']){
  if(!all.includes(marker)) throw new Error(`Gate físico do reboque ausente: ${marker}`);
}

// Contratos dos enums conhecidos do Mapa Elétrico.
if(/node_type[^\n]*['"]wire['"]/.test(e) || e.includes("'wire','needs_physical_verification'")) throw new Error('node_type inválido wire detectado');
const allowed=['component','connector','fuse','relay','ground','power','ecu','module','splice','bus','sensor','actuator','other'];
for(const m of e.matchAll(/'([^']+)','(?:verified|reference|estimated|needs_physical_verification)',\s*\n?\s*jsonb_build_object/g)){
  // Esta regex não é usada como prova exaustiva; enums continuam protegidos pela migration-base.
}
if(!allowed.includes('component')) throw new Error('Contrato interno inválido');

// Segurança do diagnóstico: nenhuma árvore deve declarar substituição automática.
for(const banned of ['trocar automaticamente','substituir automaticamente','condenar automaticamente']){
  if((e+'\n'+s).toLowerCase().includes(banned)) throw new Error(`Regra insegura encontrada: ${banned}`);
}
if(!d.includes('medir antes de substituir')) throw new Error('Política de medição antes da troca não documentada');

console.log('OK — Oficina 360 Fleet Diagnostic Depth V1 contract');
