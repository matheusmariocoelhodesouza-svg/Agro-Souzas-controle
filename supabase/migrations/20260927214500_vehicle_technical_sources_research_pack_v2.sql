-- Fleet Research Pack V2 — registro auditável de manuais, EPCs e catálogos
create table if not exists public.v2_vehicle_technical_sources (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.v2_companies(id) on delete cascade,
  vehicle_id uuid not null references public.v2_vehicles(id) on delete cascade,
  source_key text not null,
  source_type text not null,
  title text not null,
  publisher text,
  publication_year integer,
  source_url text,
  authority_level text not null default 'secondary',
  applicability_status text not null default 'family_reference',
  access_status text not null default 'public',
  verification_status text not null default 'reference_pending',
  notes text,
  source_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, vehicle_id, source_key)
);
create index if not exists idx_v2_vehicle_technical_sources_vehicle on public.v2_vehicle_technical_sources(company_id,vehicle_id);
create index if not exists idx_v2_vehicle_technical_sources_type on public.v2_vehicle_technical_sources(source_type);

with src(plate,source_key,source_type,title,publisher,publication_year,source_url,authority_level,applicability_status,access_status,verification_status,notes,meta) as (values
('CPI6C79','mwm_technical_literature_request','operation_maintenance_manual','Literatura técnica MWM — Manuais de Operação e Manutenção','MWM',2026,'https://mwm.com.br/pt/literatura-tecnica/','manufacturer','serial_specific_request','request_from_manufacturer','verified','Solicitar a via digital à MWM informando o número de série D1A001816.',jsonb_build_object('engine_serial','D1A001816','exact_document_not_ingested',true)),
('CPI6C79','mwm_parts_catalog_restricted','parts_catalog','Catálogo de Peças Genuínas MWM / consulta por número de série','MWM',2026,'https://mwm.com.br/pt/faq/','manufacturer','serial_specific_restricted','authorized_network_only','verified','A MWM informa que o catálogo genuíno é restrito à Rede Autorizada e que a lista correta é consultada pelo número de série.',jsonb_build_object('engine_serial','D1A001816','purchase_block_until_serial_lookup',true)),
('CPI6C79','mwm_acteon_412_brochure','technical_brochure','Série Acteon 4.12 TCE — ficha técnica','MWM',2015,'https://mwm.com.br/Portal/Principal/Arquivos/ProdutoFamilia/Arquivo/291.pdf','manufacturer','engine_family','public_full','verified','Confirma arquitetura 4.12 TCE, 4 cilindros, 4 válvulas/cilindro, 4,8 L, common rail e aftercooler; não misturar fases de emissões.',jsonb_build_object('engine_code','4.12 TCE','do_not_mix_emission_phases',true)),
('CPI6C79','bosch_diesel_2019_2020_9150','application_catalog','Catálogo Diesel Bosch 2019/2020 — VW 9.150 EOD Electronic 4.12 TCE','Bosch',2020,'https://www.boschaftermarket.com/xrm/media/images/country_specific/br/downloads_19/pdf_9/catlogo_diesel_2018_pginas_espelhadas.pdf','oem_supplier','exact_variant_family','public_full','verified','Tabela Bosch lista VW 9.150 EOD Electronic / 4.12 TCE / 4,7 L / 150 cv e referências do common rail.',jsonb_build_object('vehicle','VW 9.150 EOD Electronic','engine','4.12 TCE')),
('CPI6C79','comil_pia_parts_v5_2008','body_parts_catalog','Catálogo de Peças Comil Piá Rodoviário — versão 5','Comil',2008,'https://pt.scribd.com/document/410363481/piarodpecasexterno-1-pdf','manufacturer_document_scan','body_family','public_scan','verified','Catálogo de componentes originais Comil; contém páginas/revisões internas 2005–2008 e porta pantográfica Volkswagen.',jsonb_build_object('catalog_version','5','catalog_date','2008-07-14','user_vehicle_model_year',2005,'fitment_requires_body_version_check',true)),
('MBJ1166','mwm_technical_literature_request','operation_maintenance_manual','Literatura técnica MWM — Manuais de Operação e Manutenção','MWM',2026,'https://mwm.com.br/pt/literatura-tecnica/','manufacturer','serial_specific_request','request_from_manufacturer','verified','Solicitar manual exato usando o número de série 40704030141.',jsonb_build_object('engine_serial','40704030141','exact_document_not_ingested',true)),
('MBJ1166','mwm_parts_catalog_restricted','parts_catalog','Catálogo de Peças Genuínas MWM / consulta por número de série','MWM',2026,'https://mwm.com.br/pt/faq/','manufacturer','serial_specific_restricted','authorized_network_only','verified','Lista exata por número de série depende da Rede Autorizada MWM.',jsonb_build_object('engine_serial','40704030141','purchase_block_until_serial_lookup',true)),
('MBJ1166','volare_a6_2002_parts_catalog','parts_catalog','Catálogo Técnico de Peças VOLARE VO A6 2002 — 2ª edição','Volare',2002,'https://pt.scribd.com/document/629927955/A6-4-07-TCA-EURO-II-2%C2%AA-EDICAO-2002','manufacturer_document_scan','model_family_near_year','public_scan','verified','Catálogo com vistas e quantidades de chassi/motor. O veículo é 2000; revisão 2002 permanece candidata até conferência física.',jsonb_build_object('catalog_model_year',2002,'user_vehicle_model_year',2000,'fitment_requires_revision_check',true)),
('MBJ1166','cipec_agrale_volare_2026','supplier_catalog','Catálogo CIPEC Agrale/Volare — referências e cruzamentos','CIPEC',2026,'https://cipec.com.br/ing/wp-content/uploads/2026/01/CIPEC_16-JAN-2026_13-35-14_MN.pdf','catalog_supplier','model_family','public_full','verified','Cruzamentos para Volare A6 Primeira Edição; não substitui confirmação física.',jsonb_build_object('orderable_only_after_fitment_confirmation',true)),
('BYH8J61','timken_heavy_mercedes_608','application_catalog','Catálogo de Aplicações Automotivas Timken — Mercedes-Benz 608 L/LO','Timken',2016,'https://www.timken.com/wp-content/uploads/2017/07/cat_automotivo_2016.pdf','oem_supplier','model_family','public_full','verified','Rolamentos e números OE condicionados ao câmbio/eixo/freio e OM314.',jsonb_build_object('variant_conditions_must_be_respected',true)),
('BYH8J61','om314_workshop_manual_identified','workshop_manual','Manual de Oficina motor OM314 e OM352 — identificado externamente','Mercedes-Benz document resale/scan',null,'https://1001manuais.com/products/manual-de-oficina-motor-om314-e-om352-mercedes-benz','document_reseller','engine_family','paid_identified_not_ingested','reference_pending','Manual anunciado com desmontagem, montagem, torques e medidas; não ingerido.',jsonb_build_object('paid_source',true,'not_ingested',true)),
('BYH8J61','lo608_parts_catalog_528_identified','parts_catalog','Catálogo de Peças Mercedes-Benz LO 608 D — 528 páginas','Mercedes-Benz document resale/scan',null,'https://catalogoeservico.com.br/products/catalogo-de-pecas-mercedes-benz-lo-608-d','document_reseller','model_family','paid_identified_not_ingested','reference_pending','Catálogo pesquisável anunciado com vistas explodidas e códigos originais; identificado, não ingerido.',jsonb_build_object('pages',528,'paid_source',true,'not_ingested',true)),
('BYH8J61','g2_24_gearbox_catalog_identified','parts_catalog','Catálogo de peças câmbio Mercedes G2/24-5/6,71 e G2/24-5/7,31','Euroricambi / document scan',2003,'https://www.scribd.com/document/967193943/','aftermarket_cross_catalog','gearbox_family_candidate','public_scan','verified','Números OEM/cross para G2/24; só aplicar após confirmar plaqueta do câmbio.',jsonb_build_object('gearbox_candidate','G2/24','physical_plate_required',true)),
('BYH8J61','incodiesel_brake_tubes_608','application_catalog','Catálogo/linhas de tubos de freio Mercedes 608/708 — cruzamentos OE','Incodiesel e distribuidores',null,'https://www.superdiesel.com.br/tubo-traseiro-direito-3094205128','aftermarket_cross_catalog','model_family','public_partial','verified','Confirma números OE; lado/roteamento físico deve ser conferido porque fontes secundárias divergem na nomenclatura.',jsonb_build_object('physical_routing_confirmation_required',true)),
('EJW6A76','partsouq_903662_om611981','epc','Mercedes-Benz EPC público — modelo 903.662 / motor OM611.981','Mercedes-Benz data via PartSouq',null,'https://partsouq.com/en/catalog/genuine/vehicle?c=Mercedes-Benz&cid=13369','epc_mirror','exact_chassis_variant_engine_family','public_full','verified','Confirma a estrutura EPC do 903.662/OM611.981. As páginas usam VINs de exemplo; opcionais e cortes por data dependem do VIN/aggregate real.',jsonb_build_object('chassis_variant','903.662','engine_code','OM611.981','sample_vin_not_user_vin',true)),
('EJW6A76','mercedes_brazil_sprinter_manuals','operation_maintenance_manual','Manuais do condutor e manutenção Sprinter','Mercedes-Benz do Brasil',2026,'https://www2.mercedes-benz.com.br/vans/services/owner-manuals.html','manufacturer','sprinter_family_current','public_full','verified','Página oficial atual; não aplicar automaticamente intervalos atuais à W903 antiga sem edição compatível.',jsonb_build_object('legacy_w903_exact_edition_not_confirmed',true))
)
insert into public.v2_vehicle_technical_sources(company_id,vehicle_id,source_key,source_type,title,publisher,publication_year,source_url,authority_level,applicability_status,access_status,verification_status,notes,source_metadata)
select v.company_id,v.id,s.source_key,s.source_type,s.title,s.publisher,s.publication_year,s.source_url,s.authority_level,s.applicability_status,s.access_status,s.verification_status,s.notes,s.meta
from src s join public.v2_vehicles v on upper(replace(v.plate,'-',''))=s.plate
on conflict(company_id,vehicle_id,source_key) do update set source_type=excluded.source_type,title=excluded.title,publisher=excluded.publisher,publication_year=excluded.publication_year,source_url=excluded.source_url,authority_level=excluded.authority_level,applicability_status=excluded.applicability_status,access_status=excluded.access_status,verification_status=excluded.verification_status,notes=excluded.notes,source_metadata=excluded.source_metadata,updated_at=now();

update public.v2_vehicle_technical_profiles p
set source_metadata=coalesce(p.source_metadata,'{}'::jsonb)||jsonb_build_object(
 'research_pack_version','fleet_research_pack_v2',
 'research_reviewed_at','2026-09-27',
 'catalog_policy','catalog_reference_verified != physical_fitment_verified',
 'purchase_policy','candidate/estimated items blocked until physical code, VIN/serial lookup or exact variant confirms fitment',
 'torque_policy','manual_required unless exact manual/source and variant are verified'
),updated_at=now()
from public.v2_vehicles v where p.vehicle_id=v.id and p.company_id=v.company_id and v.plate in ('EJW6A76','CPI6C79','MBJ1166','BYH8J61');

create or replace view public.v2_vehicle_catalog_research_status as
select v.company_id,v.id as vehicle_id,v.plate,v.description,
 count(distinct l.component_id) as linked_components,
 count(distinct l.component_id) filter(where c.data_status='verified') as catalog_verified_components,
 count(distinct l.component_id) filter(where c.data_status='estimated') as estimated_components,
 count(distinct s.id) as registered_sources,
 count(distinct s.id) filter(where s.verification_status='verified') as verified_sources,
 count(distinct s.id) filter(where s.access_status like '%not_ingested%' or s.access_status='authorized_network_only' or s.access_status='request_from_manufacturer') as blocked_or_external_sources,
 count(distinct evi.component_id) as components_in_views
from public.v2_vehicles v
left join public.v2_vehicle_component_links l on l.vehicle_id=v.id and l.company_id=v.company_id
left join public.v2_vehicle_components c on c.id=l.component_id
left join public.v2_vehicle_technical_sources s on s.vehicle_id=v.id and s.company_id=v.company_id
left join public.v2_vehicle_exploded_view_items evi on evi.component_id=l.component_id
group by v.company_id,v.id,v.plate,v.description;