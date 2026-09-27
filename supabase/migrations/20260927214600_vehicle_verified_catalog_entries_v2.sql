-- Fleet Research Pack V2 — referências de catálogo verificadas.
-- IMPORTANTE: data_status=verified significa referência verificada na fonte.
-- O vínculo com a condução continua candidate enquanto não houver confirmação física/serial/variante.

-- COMIL PIÁ RODOVIÁRIO: catálogo de carroceria versão 5.
with p(group_code,name,oem,ctype,section,pos,qty) as (values
('body','Conjunto fibra frente externa Comil Piá','354747','assembly','frente_externa','1',1),
('body','Para-brisa inteiriço Comil Piá','351473','part','frente_externa','2',1),
('body','Guarnição do para-brisa','049563','seal','frente_externa','3',1),
('body','Suporte espelho esquerdo','089875','part','frente_externa','5',1),
('body','Espelho retrovisor esquerdo plano','001249','part','frente_externa','6',1),
('electrical','Lanterna pisca dianteira 70 mm','347908','part','frente_externa','7',1),
('electrical','Conjunto farol esquerdo','354745','assembly','frente_externa','8',1),
('electrical','Farolete dianteiro','353958','part','frente_externa','9',1),
('body','Conjunto para-choque dianteiro','353959','assembly','frente_externa','10',1),
('electrical','Conjunto farol direito','354744','assembly','frente_externa','11',1),
('body','Conjunto grade/tampa dianteira','353956','assembly','frente_externa','12',1),
('body','Espelho retrovisor direito convexo','053520','part','frente_externa','13',1),
('body','Suporte espelho direito','089874','part','frente_externa','14',1),
('body','Conjunto haste limpador para-brisa','115511','assembly','limpador','1',1),
('body','Palheta limpador 700 mm','293012','part','limpador','1b',1),
('body','Braço comando limpador 300 mm','000973','part','limpador','2',1),
('body','Mancal limpador com estriado cônico','115509','bearing','limpador','3',1),
('body','Mancal auxiliar esguicho','115508','bearing','limpador','4',1),
('electrical','Motor limpador para-brisa 24 V','000971','part','limpador','5',1),
('body','Lavador para-brisa 24 V','000949','assembly','limpador','6',1),
('electrical','Eletrobomba esguicho 24 V','302048','part','limpador','7',1),
('electrical','Farol 5 3/4 luz baixa e posição','341291','part','farol','1',1),
('electrical','Farol 5 3/4 luz alta','119848','part','farol','2',1),
('body','Dobradiça grade dianteira esquerda','349735','part','grade','2',1),
('body','Mola a gás grade dianteira 30 kg','002011','spring','grade','3',1),
('body','Dobradiça grade dianteira direita','349734','part','grade','3',1),
('body','Estrutura porta entrada pantográfica VW','090349','assembly','porta_vw','1',1),
('body','Vidro fixo porta entrada','089213','part','porta_vw','2',1),
('body','Árvore da porta de entrada','046081','assembly','porta_vw','6',1),
('body','Caixa mecanismo da porta','046152','assembly','porta_vw','8',1),
('body','Atuador pneumático porta entrada','047138','actuator','porta_vw','9',1),
('body','Fechadura porta entrada','027819','part','porta_vw','16',1),
('body','Guarnição batente marco porta','042015','seal','porta_vw','19',1),
('body','Borracha batente porta','002158','seal','porta_vw','20',1),
('body','Borracha vedação inferior porta','058119','seal','porta_vw','21',1),
('body','Fibra traseira sem tampa','087855','part','traseira','1',1),
('electrical','Sinaleira delimitadora rubi 24 V','096098','part','traseira','2',1),
('electrical','Luz brake-light 24 V','092226','part','traseira','3',1),
('electrical','Conjunto lanterna traseira de ré','345324','assembly','traseira','4',1),
('electrical','Conjunto lanterna traseira com freio','345322','assembly','traseira','5',1),
('electrical','Conjunto lanterna traseira pisca','345323','assembly','traseira','6',1),
('body','Conjunto para-choque traseiro','355545','assembly','traseira','8',1),
('electrical','Lanterna de placa IAM','034812','part','traseira','10',1),
('body','Conjunto tampa traseira','341052','assembly','traseira','11',1),
('body','Vigia traseiro colado','089115','part','traseira','12',1),
('body','Dobradiça tampa traseira','341021','part','tampa_traseira','4',1),
('body','Mola a gás tampa traseira 42 kg','321743','spring','tampa_traseira','5',1),
('body','Borracha vedação tampa traseira','076036','seal','tampa_traseira','6',1),
('body','Transmissão de movimento tampa traseira','053188','assembly','tampa_traseira','7',1),
('body','Conjunto trinco com fecho tampa traseira','002447','assembly','tampa_traseira','8',1),
('body','Conjunto varão engate tampa traseira','087884','assembly','tampa_traseira','9',1)
)
insert into public.v2_vehicle_components(group_code,name,generic_name,oem_brand,oem_part_number,location_description,function_description,data_status,component_type,torque_spec,source_metadata)
select p.group_code,p.name,p.name,'Comil',p.oem,'Carroceria Comil Piá Rodoviário','Componente identificado no catálogo Comil Piá','verified',p.ctype,jsonb_build_object('status','manual_required'),jsonb_build_object('source_key','comil_pia_parts_v5_2008','catalog_section',p.section,'catalog_position',p.pos,'catalog_quantity',p.qty,'catalog_entry_verified',true,'physical_fitment_verified',false,'orderable',false)
from p where not exists(select 1 from public.v2_vehicle_components c where c.source_metadata->>'source_key'='comil_pia_parts_v5_2008' and c.oem_part_number=p.oem);

insert into public.v2_vehicle_component_links(company_id,vehicle_id,component_id,fitment_status,notes)
select v.company_id,v.id,c.id,'candidate','Código verificado no catálogo Comil Piá; confirmar revisão/configuração física do ônibus 2005 antes da compra.'
from public.v2_vehicles v join public.v2_vehicle_components c on c.source_metadata->>'source_key'='comil_pia_parts_v5_2008'
where upper(replace(v.plate,'-',''))='CPI6C79'
on conflict(company_id,vehicle_id,component_id) do nothing;

-- VOLARE A6 2002: estrutura e quantidades verificadas. Códigos ocultados no scan público não são inventados.
with p(group_code,name,ctype,section,pos,qty) as (values
('engine_cooling','Conjunto vaso de compensação A6','assembly','L005','1',1),
('engine_cooling','Tampa do radiador A6','part','L005','2',1),
('engine_cooling','Tampa vaso expansão 7 PSI amarela','part','L005','15',1),
('engine_cooling','Sensor nível de água do vaso','sensor','L005','16',1),
('engine_cooling','Anel de vedação do vaso','o_ring','L005','17',1),
('transmission','Platô de embreagem LUK A6','part','L006','2',1),
('transmission','Conjunto garfo de embreagem A6','assembly','L006','5',1),
('transmission','Pino esférico do garfo de embreagem','part','L006','6',1),
('transmission','Rolamento de embreagem A6','bearing','L006','7',1),
('transmission','Cubo do rolamento de embreagem','part','L006','8',1),
('transmission','Trava do cubo do rolamento','clip','L006','9',1),
('transmission','Protetor de pó da embreagem','seal','L006','26',1),
('driveline','Conjunto luva do cardan A6','assembly','L014','7',1),
('driveline','Cardan traseiro A6 3600/3750 EE','assembly','L014','8',1),
('driveline','Graxeira do cardan A6','part','L014','9',4),
('driveline','Grampo do cardan A6','fastener','L014','10',4),
('driveline','Mancal central do cardan A6','bearing','L014','12',1),
('driveline','Cardan dianteiro A6 3350 EE','assembly','L014','13',1),
('driveline','Cruzeta do cardan A6','part','L014','14',3),
('suspension','Amortecedor dianteiro A6','part','L016A','30',2),
('suspension','Bucha barra estabilizadora dianteira A6','bushing','L016A','40',2),
('suspension','Braço barra estabilizadora dianteira A6','assembly','L016A','41',2),
('engine','Carcaça do trem de engrenagens MWM 4.07','part','M003','1',1),
('engine','Engrenagem intermediária com bucha 4.07','part','M003','2',1),
('engine','Engrenagem dupla com bucha 4.07','part','M003','3',1),
('engine','Bucha do trem de engrenagens 4.07','bushing','M003','5',3),
('engine','Mancal da engrenagem 4.07','bearing','M003','6',3),
('engine','Anel de encosto 2,58 mm 4.07','washer','M003','8',3),
('engine_turbo','Turbocompressor MWM 4.07 TCA A6','assembly','M023','1',1),
('engine_turbo','Prisioneiro M10 turbocompressor A6','stud','M023','2',8),
('engine_turbo','Porca Stover M10 turbocompressor A6','nut','M023','3',8),
('engine_turbo','Tubo entrada de óleo do turbo A6','pipe','M023','6',1),
('engine_turbo','Tubo retorno de óleo do turbo A6','pipe','M023','11',1),
('electrical','Motor de partida 12 V A6','assembly','M024','1',1),
('electrical','Solenóide do motor de partida A6','actuator','M024','4',1),
('electrical','Impulsor do motor de partida A6','part','M024','6',1),
('electrical','Jogo de bobina de campo do arranque A6','part','M024','7',1),
('electrical','Induzido do motor de partida A6','part','M024','8',1),
('electrical','Jogo de escovas do motor de partida A6','part','M024','9',1)
)
insert into public.v2_vehicle_components(group_code,name,generic_name,oem_brand,location_description,function_description,data_status,component_type,torque_spec,source_metadata)
select p.group_code,p.name,p.name,'Volare/MWM','Conforme seção '||p.section||' do catálogo A6 2002','Componente/quantidade verificado no catálogo técnico A6 2002','verified',p.ctype,jsonb_build_object('status','manual_required'),jsonb_build_object('source_key','volare_a6_2002_parts_catalog','catalog_section',p.section,'catalog_position',p.pos,'catalog_quantity',p.qty,'catalog_entry_verified',true,'oem_code_obscured_in_public_scan',true,'physical_fitment_verified',false,'orderable',false)
from p where not exists(select 1 from public.v2_vehicle_components c where c.source_metadata->>'source_key'='volare_a6_2002_parts_catalog' and c.source_metadata->>'catalog_section'=p.section and c.source_metadata->>'catalog_position'=p.pos);

insert into public.v2_vehicle_component_links(company_id,vehicle_id,component_id,fitment_status,notes)
select v.company_id,v.id,c.id,'candidate','Estrutura e quantidade verificadas no catálogo Volare A6 2002; confirmar revisão/código físico do veículo 2000.'
from public.v2_vehicles v join public.v2_vehicle_components c on c.source_metadata->>'source_key'='volare_a6_2002_parts_catalog'
where upper(replace(v.plate,'-',''))='MBJ1166'
on conflict(company_id,vehicle_id,component_id) do nothing;

-- MERCEDES-BENZ 608: referências OE/cross de Timken, tubos de freio e G2/24.
with p(group_code,name,oem,mfr,brand,ctype,condition_text,source_key) as (values
('transmission','Rolamento eixo intermediário dianteiro câmbio G2/24','0019815705','Timken 30306','Mercedes-Benz/Timken','bearing','Somente câmbio G2/24-5/7,31 ou G2/24-5/6,71','timken_heavy_mercedes_608'),
('transmission','Rolamento eixo intermediário traseiro câmbio G2/24','0019815705','Timken 30306','Mercedes-Benz/Timken','bearing','Somente câmbio G2/24-5/7,31 ou G2/24-5/6,71','timken_heavy_mercedes_608'),
('suspension','Rolamento roda dianteira externo 608 L/LO','6889817005','Timken 33205','Mercedes-Benz/Timken','bearing','Catálogo Timken condiciona a freio pneumático/eixo correspondente','timken_heavy_mercedes_608'),
('suspension','Rolamento roda dianteira interno 608 L/LO','0039811605','Timken 33109','Mercedes-Benz/Timken','bearing','Catálogo Timken condiciona a freio pneumático/eixo correspondente','timken_heavy_mercedes_608'),
('driveline','Rolamento roda traseira 608 L/LO freio hidráulico','0029810505','Timken 33895/33822 Set 272','Mercedes-Benz/Timken','bearing','Aplicação catalogada para 608 L/LO com freio hidráulico','timken_heavy_mercedes_608'),
('engine_fuel','Rolamento dianteiro bomba injetora OM314','000720030203','Timken 30203','Mercedes-Benz/Timken','bearing','Aplicação OM314 I conforme catálogo Timken','timken_heavy_mercedes_608'),
('engine_fuel','Rolamento traseiro bomba injetora OM314','000720030204','Timken 30204','Mercedes-Benz/Timken','bearing','Aplicação OM314 I conforme catálogo Timken','timken_heavy_mercedes_608'),
('brakes','Tubo de freio dianteiro esquerdo 608/708','3094203528','Incodiesel/aftermarket cross','Mercedes-Benz','pipe','Aplicação L/LO608D/708; conferir roteamento físico','incodiesel_brake_tubes_608'),
('brakes','Tubo de freio dianteiro direito 608/708','3094203728','Incodiesel/aftermarket cross','Mercedes-Benz','pipe','Aplicação 608/708; conferir roteamento físico','incodiesel_brake_tubes_608'),
('brakes','Tubo de freio traseiro OE 3094205028','3094205028','Incodiesel/aftermarket cross','Mercedes-Benz','pipe','Aplicação 608/708; fontes secundárias divergem na nomenclatura do lado','incodiesel_brake_tubes_608'),
('brakes','Tubo de freio traseiro OE 3094205128','3094205128','Incodiesel/aftermarket cross','Mercedes-Benz','pipe','Aplicação 608/708; fontes secundárias divergem na nomenclatura do lado','incodiesel_brake_tubes_608'),
('transmission','Engrenagem 3ª marcha câmbio G2/24','3142603644','Euroricambi T08293','Mercedes-Benz cross','part','Somente G2/24-5/6,71 ou G2/24-5/7,31; plaqueta obrigatória','g2_24_gearbox_catalog_identified'),
('transmission','Engrenagem 4ª marcha câmbio G2/24','3142602444','Euroricambi T08289','Mercedes-Benz cross','part','Somente G2/24-5/6,71 ou G2/24-5/7,31; plaqueta obrigatória','g2_24_gearbox_catalog_identified')
)
insert into public.v2_vehicle_components(group_code,name,generic_name,oem_brand,oem_part_number,manufacturer_part_number,location_description,function_description,data_status,component_type,torque_spec,source_metadata)
select p.group_code,p.name,p.name,p.brand,p.oem,p.mfr,'Mercedes-Benz 608 — sistema '||p.group_code,'Referência de catálogo para diagnóstico/identificação','verified',p.ctype,jsonb_build_object('status','manual_required'),jsonb_build_object('source_key',p.source_key,'catalog_entry_verified',true,'variant_condition',p.condition_text,'physical_fitment_verified',false,'orderable',false)
from p where not exists(select 1 from public.v2_vehicle_components c where c.source_metadata->>'source_key'=p.source_key and c.oem_part_number=p.oem and c.name=p.name);

insert into public.v2_vehicle_component_links(company_id,vehicle_id,component_id,fitment_status,notes)
select v.company_id,v.id,c.id,'candidate','Referência verificada em catálogo; confirmar configuração física/plaqueta antes da compra.'
from public.v2_vehicles v join public.v2_vehicle_components c on c.source_metadata->>'source_key' in ('timken_heavy_mercedes_608','incodiesel_brake_tubes_608','g2_24_gearbox_catalog_identified')
where upper(replace(v.plate,'-',''))='BYH8J61'
on conflict(company_id,vehicle_id,component_id) do nothing;

-- Enriquecimento de referências já existentes.
update public.v2_vehicle_components set source_metadata=source_metadata||jsonb_build_object('research_pack','fleet_research_pack_v2','legacy_bosch_reference','0 445 120 043','current/interchange_reference','0 445 120 326','purchase_requires_physical_code_check',true),updated_at=now() where manufacturer_part_number='0 445 120 326';
update public.v2_vehicle_components set source_metadata=source_metadata||jsonb_build_object('research_pack','fleet_research_pack_v2','source_key','cipec_agrale_volare_2026','purchase_requires_physical_code_check',true),updated_at=now() where oem_part_number in ('6008001249009','940703810064','6008001091005','6001004090009');

-- Vistas de auditoria para todas as referências do research pack.
insert into public.v2_vehicle_exploded_views(group_code,chassis_family,chassis_variant,engine_code,assembly_code,title,subtitle,source_name,source_url,image_license_status,verification_status,notes,source_metadata)
select distinct c.group_code,p.chassis_family,p.chassis_variant,p.engine_code,'RESEARCH-'||v.plate||'-'||upper(c.group_code)||'-V2',v.description||' — '||c.group_code||' — referências catalogadas V2','Vista de auditoria: catálogo verificado e fitment físico separados.','Oficina 360 research pack V2',null,'reference_only','verified','Um item verificado em catálogo não é automaticamente confirmado como instalado.',jsonb_build_object('research_pack','fleet_research_pack_v2','plate',v.plate,'catalog_audit_view',true)
from public.v2_vehicle_component_links l join public.v2_vehicles v on v.id=l.vehicle_id join public.v2_vehicle_technical_profiles p on p.vehicle_id=v.id and p.company_id=v.company_id join public.v2_vehicle_components c on c.id=l.component_id
where v.plate in ('CPI6C79','MBJ1166','BYH8J61') and c.source_metadata->>'source_key' in ('comil_pia_parts_v5_2008','volare_a6_2002_parts_catalog','timken_heavy_mercedes_608','incodiesel_brake_tubes_608','g2_24_gearbox_catalog_identified') and not exists(select 1 from public.v2_vehicle_exploded_views ev where ev.assembly_code='RESEARCH-'||v.plate||'-'||upper(c.group_code)||'-V2');

insert into public.v2_vehicle_exploded_view_items(exploded_view_id,component_id,item_number,quantity,component_type,position_note,exactness_status,source_metadata)
select ev.id,c.id,coalesce(c.source_metadata->>'catalog_position','REF-'||substr(c.id::text,1,8)),case when (c.source_metadata->>'catalog_quantity') ~ '^[0-9]+(\.[0-9]+)?$' then (c.source_metadata->>'catalog_quantity')::numeric else 1 end,c.component_type,coalesce(c.source_metadata->>'catalog_section',c.source_metadata->>'variant_condition','Referência de catálogo'),'verified',jsonb_build_object('research_pack','fleet_research_pack_v2','source_key',c.source_metadata->>'source_key','physical_fitment_verified',false)
from public.v2_vehicle_component_links l join public.v2_vehicles v on v.id=l.vehicle_id join public.v2_vehicle_components c on c.id=l.component_id join public.v2_vehicle_exploded_views ev on ev.assembly_code='RESEARCH-'||v.plate||'-'||upper(c.group_code)||'-V2'
where v.plate in ('CPI6C79','MBJ1166','BYH8J61') and c.source_metadata->>'source_key' in ('comil_pia_parts_v5_2008','volare_a6_2002_parts_catalog','timken_heavy_mercedes_608','incodiesel_brake_tubes_608','g2_24_gearbox_catalog_identified') and not exists(select 1 from public.v2_vehicle_exploded_view_items evi where evi.exploded_view_id=ev.id and evi.component_id=c.id and evi.item_number=coalesce(c.source_metadata->>'catalog_position','REF-'||substr(c.id::text,1,8)));

-- EPC público da Sprinter: adiciona origem às vistas existentes sem promover fitment.
update public.v2_vehicle_exploded_views ev set source_name=case when ev.source_name is null or ev.source_name='Oficina 360' then 'Mercedes-Benz data via PartSouq' else ev.source_name end,source_url=coalesce(ev.source_url,'https://partsouq.com/en/catalog/genuine/vehicle?c=Mercedes-Benz&cid=13369'),source_metadata=ev.source_metadata||jsonb_build_object('research_pack','fleet_research_pack_v2','source_key','partsouq_903662_om611981','sample_vin_not_user_vin',true),updated_at=now() where ev.chassis_variant='903.662' and (ev.engine_code='OM611.981' or ev.engine_code is null);