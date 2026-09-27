-- Oficina 360 — fleet final catalog reconciliation V9
-- 2026-09-27
-- Idempotent reconciliation of the V7/V8/V9 production research pass.
-- IMPORTANT: catalog_reference_verified != physical_fitment_verified.

-- ---------------------------------------------------------------------------
-- 1. Technical sources
-- ---------------------------------------------------------------------------
with src(plate,source_key,source_type,title,publisher,publication_year,source_url,authority_level,applicability_status,access_status,verification_status,notes,source_metadata) as (
 values
 ('CPI6C79','nakata_vw9150eod_chassis_v7','application_catalog','Nakata catalog — Volkswagen 9-150 EOD steering/suspension','Nakata',2026,'https://www.catalogonakata.com.br/busca/volkswagen-9-150-od','oem_supplier','exact_model_family_year_range','public_full','verified','9-150 EOD steering/suspension references; physical variant still required before ordering.',jsonb_build_object('checked_at','2026-09-27')),
 ('CPI6C79','mwm_acteon_d1a_application_v7','parts_catalog','MWM Acteon 4.12/6.12 TCE parts catalog — D1A/application matrix','MWM International',2008,'https://www.scribd.com/document/455566362/MVM-6-12-TCE-93513036-MWM-CATALOGO-DE-PECAS-MOTOR-X12','manufacturer_catalog_reproduction','serial_and_application_match','public_partial','verified','D1A/application evidence supports 4.12 TCE 8/9.150 E OD; physical/build-data confirmation remains preferred.',jsonb_build_object('checked_at','2026-09-27','engine_serial_prefix','D1A','vehicle_engine_serial','D1A001816','catalog_application_code','11.01')),
 ('CPI6C79','mann_vw9150eod_filters_v7','application_catalog','MANN-FILTER heavy catalog — VW 9.150 E OD MWM 4.12 TCAE','MANN+HUMMEL',2023,'https://www.mann-filter.com/content/dam/website/mann-filter/mann-filter-com/br-pt/documents/cat%C3%A1logo/catalogo_mann_filter_PESADA_2022_2023_web.pdf','oem_supplier','exact_model_engine_year_range','public_full','verified','9.150 E OD MWM 4.12 TCAE: C 17 308, W 962, WK 962/13 and CF 1000 among the service references.',jsonb_build_object('checked_at','2026-09-27','year_from','2004-04','year_to','2012-12')),
 ('CPI6C79','masterparts_vw9150eod_application_v9','application_catalog','Master Parts MWM — VW 9.150 EOD / MWM 4.12 TCE Acteon application','MWM / Master Parts',2026,'https://masterpartsmwm.com.br/pt-br/catalogo/detalhes/?cw_pgAtual=97&cw_produtoAtivo=CodigoProduto%3C%212%21%3E3587','manufacturer_brand_catalog','exact_model_engine_year_range','public_full','verified','VW 9.150 EOD, MWM 4.12 TCE Acteon, 4.8 L, 2004-2012.',jsonb_build_object('checked_at','2026-09-27','model','9.150 EOD','engine','MWM 4.12 TCE ACTEON','year_from',2004,'year_to',2012)),
 ('BYH8J61','nakata_mb608_steering_v7','application_catalog','Nakata heavy steering catalog — Mercedes-Benz 608/O608','Nakata',2026,'https://www.catalogonakata.com.br/','oem_supplier','exact_model_year_range','public_full','verified','608/O608 steering references; installed combination still requires physical inspection.',jsonb_build_object('checked_at','2026-09-27')),
 ('BYH8J61','masterparts_608_om314_waterpump_v9','application_catalog','Master Parts MWM — water pump Mercedes-Benz 608 OM314','MWM / Master Parts',2026,'https://masterpartsmwm.com.br/pt-br/catalogo/6/0/','manufacturer_brand_catalog','exact_model_engine_year_range','public_full','verified','MM900070: Mercedes-Benz 608 OM314, 1972-1990.',jsonb_build_object('checked_at','2026-09-27','reference','MM900070')),
 ('BYH8J61','masterparts_608_om314_oilpump_v9','application_catalog','Master Parts MWM — oil pump Mercedes-Benz L 608 D / OM314','MWM / Master Parts',2026,'https://masterpartsmwm.com.br/pt-br/catalogo/detalhes/?cw_filtros=%3C%21TAB%21%3EcodGRUPOPRODUTO%3C%212%21%3E20%3C%211%21%3EGRUPOPRODUTO%3C%212%21%3EBOMBA+DE+OLEO&cw_ie_tp=1&cw_produtoAtivo=CodigoProduto%3C%212%21%3E448&cw_tabAtiva=1','manufacturer_brand_catalog','model_engine_year_range','public_full','verified','MM100291E: L 608 D / OM314, 1972-1987; exact installed revision still requires confirmation.',jsonb_build_object('checked_at','2026-09-27','reference','MM100291E','original_crosses',jsonb_build_array('343.180.01.01','352.180.48.01'))),
 ('MBJ1166','nakata_volare_a6_driveline_v7','application_catalog','Nakata catalog — Volare A6 driveline/differential references','Nakata',2026,'https://www.catalogonakata.com.br/','oem_supplier','exact_model_family','public_full','verified','Volare A6 transmission/cardan/differential references; axle ratio must be physically identified.',jsonb_build_object('checked_at','2026-09-27')),
 ('MBJ1166','masterparts_volare_a6_clutch_v9','application_catalog','Master Parts MWM — clutch kit for Volare A6 4.07 TCA','MWM / Master Parts',2026,'https://masterpartsmwm.com.br/pt-br/produtos/7/mm900001-406-kit-de-embreagem/','manufacturer_brand_catalog','exact_model_engine_family','public_full','verified','MM900001 application includes Volare A6 4.07 TCA.',jsonb_build_object('checked_at','2026-09-27','reference','MM900001')),
 ('MBJ1166','masterparts_volare_a6_fan_bearing_v9','application_catalog','Master Parts MWM — fan support bearing for Volare A6 4.07 TCA','MWM / Master Parts',2026,'https://masterpartsmwm.com.br/pt-br/catalogo/3/0/','manufacturer_brand_catalog','exact_model_engine_family','public_full','verified','903260100008E applies to Volare A6 4.07 TCA.',jsonb_build_object('checked_at','2026-09-27','reference','903260100008E')),
 ('EJW6A76','mann_sprinter_313_om611_service_v8','application_catalog','MANN-FILTER light catalog — Sprinter 313 CDI OM611 service filters','MANN+HUMMEL',2024,'https://www.mann-filter.com/content/dam/website/mann-filter/mann-filter-com/br-pt/documents/cat%C3%A1logo/SAIDA_WEB___catalogo_mann_filter_LEVE_2024_2025.pdf','oem_supplier','engine_family_power_reference','public_full','verified','Sprinter 313 CDI / OM611 family service references; installed filter/housing remains authoritative.',jsonb_build_object('checked_at','2026-09-27','air_filter','C 32 338/1','oil_filter','HU 718/1 k','fuel_filter','WK 842/13','fuel_filter_water_sensor_option','WK 842/18','cabin_filter','CU 3858/1'))
)
insert into public.v2_vehicle_technical_sources(company_id,vehicle_id,source_key,source_type,title,publisher,publication_year,source_url,authority_level,applicability_status,access_status,verification_status,notes,source_metadata)
select v.company_id,v.id,s.source_key,s.source_type,s.title,s.publisher,s.publication_year,s.source_url,s.authority_level,s.applicability_status,s.access_status,s.verification_status,s.notes,s.source_metadata
from src s join public.v2_vehicles v on upper(replace(v.plate,'-',''))=s.plate
on conflict(company_id,vehicle_id,source_key) do update set source_type=excluded.source_type,title=excluded.title,publisher=excluded.publisher,publication_year=excluded.publication_year,source_url=excluded.source_url,authority_level=excluded.authority_level,applicability_status=excluded.applicability_status,access_status=excluded.access_status,verification_status=excluded.verification_status,notes=excluded.notes,source_metadata=excluded.source_metadata,updated_at=now();

-- ---------------------------------------------------------------------------
-- 2. Catalog-verified references added by the final pass
-- ---------------------------------------------------------------------------
with refs(plate,source_key,group_code,name,generic_name,brand,partno,oemno,location_description,function_description,component_type,dimensions_spec,thread_spec,replacement_notes) as (
 values
 -- Mercedes-Benz 608 steering
 ('BYH8J61','nakata_mb608_steering_v7','steering','Barra lateral Nakata N 515','barra lateral de direção','Nakata','N 515','3094603105 / 3094602905 / 3094601205 / 3094600105 / 3084607005','Direção dianteira','Liga caixa/braço ao sistema articulado','part',jsonb_build_object('catalog_length_mm',493,'catalog_ball_mm',62),jsonb_build_object(),jsonb_build_array('Confirmar configuração física')),
 ('BYH8J61','nakata_mb608_steering_v7','steering','Barra de ligação Nakata N 545','barra de ligação de direção','Nakata','N 545',null,'Direção dianteira','Barra transversal de direção','part',jsonb_build_object('catalog_length_mm',1476),jsonb_build_object(),jsonb_build_array('Confirmar configuração física')),
 ('BYH8J61','nakata_mb608_steering_v7','steering','Terminal de direção Nakata N 523','terminal de direção','Nakata','N 523',null,'Direção dianteira','Articulação esférica','part',jsonb_build_object('catalog_length_mm',90,'catalog_pin_mm',18),jsonb_build_object('thread','M24 x 1,5','side','right'),jsonb_build_array('Confirmar posição física')),
 ('BYH8J61','nakata_mb608_steering_v7','steering','Terminal de direção Nakata N 526','terminal de direção','Nakata','N 526',null,'Direção dianteira','Articulação esférica','part',jsonb_build_object('catalog_length_mm',160,'catalog_pin_mm',18),jsonb_build_object('thread','M24 x 1,5','side','right'),jsonb_build_array('Confirmar posição física')),
 ('BYH8J61','nakata_mb608_steering_v7','steering','Terminal de direção Nakata N 527','terminal de direção','Nakata','N 527','3083307435','Direção dianteira','Articulação esférica','part',jsonb_build_object('catalog_length_mm',160,'catalog_pin_mm',18),jsonb_build_object('thread','M24 x 1,5','side','left'),jsonb_build_array('Confirmar posição física')),
 ('BYH8J61','nakata_mb608_steering_v7','steering','Terminal de direção Nakata N 593','terminal de direção','Nakata','N 593',null,'Direção dianteira','Articulação esférica','part',jsonb_build_object('catalog_length_mm',90,'catalog_pin_mm',20),jsonb_build_object('thread','M24 x 1,5','side','left'),jsonb_build_array('Confirmar combinação física')),
 -- VW / Comil 9.150 EOD
 ('CPI6C79','nakata_vw9150eod_chassis_v7','suspension','Amortecedor dianteiro Nakata AC 36011','amortecedor dianteiro','Nakata','AC 36011','54487 / L12477','Suspensão dianteira','Controla oscilações da suspensão','part',jsonb_build_object('position','front'),jsonb_build_object(),jsonb_build_array('Aplicação de catálogo 9-150 EOD; confirmar instalado')),
 ('CPI6C79','nakata_vw9150eod_chassis_v7','suspension','Amortecedor traseiro Nakata AC 36012','amortecedor traseiro','Nakata','AC 36012','54488 / L12476','Suspensão traseira','Controla oscilações da suspensão','part',jsonb_build_object('position','rear'),jsonb_build_object(),jsonb_build_array('Aplicação de catálogo 9-150 EOD; confirmar instalado')),
 ('CPI6C79','nakata_vw9150eod_chassis_v7','steering','Barra lateral Nakata N 734','barra lateral de direção','Nakata','N 734','2TA415701 / 2R0422803D / 2895301 / BLE2415','Direção dianteira','Barra lateral de direção','part',jsonb_build_object(),jsonb_build_object(),jsonb_build_array('Alternativa de catálogo; identificar instalada')),
 ('CPI6C79','nakata_vw9150eod_chassis_v7','steering','Barra lateral Nakata N 741','barra lateral de direção','Nakata','N 741','2RF415701 / LM211 / BDE2408','Direção dianteira','Alternativa de barra lateral','part',jsonb_build_object(),jsonb_build_object(),jsonb_build_array('Alternativa de catálogo; identificar instalada')),
 ('CPI6C79','nakata_vw9150eod_chassis_v7','steering','Barra de ligação Nakata N 740','barra de ligação de direção','Nakata','N 740','6010008065000 / 2RF415801 / 2R0422335D / 2R0415801 / 2FR415801 / 3384501','Direção dianteira','Barra de ligação','part',jsonb_build_object(),jsonb_build_object(),jsonb_build_array('Alternativa de catálogo; confirmar montagem')),
 ('CPI6C79','nakata_vw9150eod_chassis_v7','steering','Barra de ligação Nakata N 775','barra de ligação de direção','Nakata','N 775','2RO415801B / 2R0415801B / BLE4649','Direção dianteira','Alternativa de barra de ligação','part',jsonb_build_object(),jsonb_build_object(),jsonb_build_array('Alternativa de catálogo; confirmar montagem')),
 ('CPI6C79','nakata_vw9150eod_chassis_v7','steering','Terminal de direção direito Nakata N 710','terminal de direção direito','Nakata','N 710','6010000000000 / 6006007132000 / T06415712 / TDI00802 / VKY6226 / 2754501 / TE2410','Direção dianteira direita','Articulação esférica','part',jsonb_build_object('catalog_length_mm',105),jsonb_build_object('thread','M28 x 1,5','side','right'),jsonb_build_array('Aplicação 9-150 EOD; confirmar instalado')),
 ('CPI6C79','nakata_vw9150eod_chassis_v7','steering','Terminal de direção esquerdo Nakata N 711','terminal de direção esquerdo','Nakata','N 711','6006007133000 / T06415711 / TDI00803 / 2754201 / TE2316','Direção dianteira esquerda','Articulação esférica','part',jsonb_build_object('catalog_length_mm',105),jsonb_build_object('thread','M28 x 1,5','side','left'),jsonb_build_array('Aplicação 9-150 EOD; confirmar instalado')),
 ('CPI6C79','nakata_vw9150eod_chassis_v7','engine_cooling','Bomba de água Nakata NKBA06573','bomba de água','Nakata','NKBA06573','20853857 / 2R0121004A / VBD585 / UB0573 / 20162','Sistema de arrefecimento','Circula líquido de arrefecimento','part',jsonb_build_object(),jsonb_build_object(),jsonb_build_array('Aplicação 9-150 EOD; confirmar motor/peça')),
 -- Volare A6 driveline
 ('MBJ1166','nakata_volare_a6_driveline_v7','transmission','Terminal do câmbio Nakata NC14032','terminal do câmbio','Nakata','NC14032','3317608 / 45901','Saída/ligação do câmbio','Elemento de ligação da transmissão','part',jsonb_build_object(),jsonb_build_object(),jsonb_build_array('Confirmar câmbio instalado')),
 ('MBJ1166','nakata_volare_a6_driveline_v7','driveline','Terminal do cardan Nakata NC14048','terminal do cardan','Nakata','NC14048','A0004100230 / 801723 / 34118312','Cardan','Terminal/flange do cardan','part',jsonb_build_object(),jsonb_build_object(),jsonb_build_array('Confirmar cardan instalado')),
 ('MBJ1166','nakata_volare_a6_driveline_v7','driveline','Terminal do diferencial Nakata NC14020','terminal do diferencial','Nakata','NC14020','5004470','Diferencial traseiro','Terminal do conjunto diferencial','part',jsonb_build_object('catalog_ring_teeth_options','37/39/41/43','catalog_pinion_teeth_options','7/8/10/11'),jsonb_build_object(),jsonb_build_array('Confirmar eixo e relação')),
 ('MBJ1166','nakata_volare_a6_driveline_v7','driveline','Terminal do diferencial Nakata NC14006','terminal do diferencial','Nakata','NC14006','BG1X4851AA / 5004468','Diferencial traseiro','Alternativa de terminal do diferencial','part',jsonb_build_object('catalog_ring_teeth_options','37/39/41/43','catalog_pinion_teeth_options','7/8/10/11'),jsonb_build_object(),jsonb_build_array('Confirmar eixo e relação')),
 ('MBJ1166','nakata_volare_a6_driveline_v7','driveline','Coroa e pinhão Nakata ND01003','coroa e pinhão','Nakata','ND01003','803060 / BA402104X / BA402072X / BA402007X','Diferencial traseiro','Conjunto de redução final','part',jsonb_build_object('ring_teeth',37,'pinion_teeth',8),jsonb_build_object(),jsonb_build_array('Confirmar relação instalada')),
 ('MBJ1166','nakata_volare_a6_driveline_v7','driveline','Coroa e pinhão Nakata ND01010','coroa e pinhão','Nakata','ND01010','BG6X4209AA / 93279015 / 803061 / BA402071X','Diferencial traseiro','Conjunto de redução final','part',jsonb_build_object('ring_teeth',41,'pinion_teeth',10),jsonb_build_object(),jsonb_build_array('Confirmar relação instalada')),
 -- Sprinter service alternatives
 ('EJW6A76','mann_sprinter_313_om611_service_v8','engine_air','Filtro de ar MANN C 32 338/1','filtro de ar','MANN-FILTER','C 32 338/1',null,'Caixa do filtro de ar','Filtra ar de admissão','consumable',jsonb_build_object(),jsonb_build_object(),jsonb_build_array('Referência por família OM611; confirmar elemento físico')),
 ('EJW6A76','mann_sprinter_313_om611_service_v8','engine_fuel','Filtro de combustível MANN WK 842/13','filtro de combustível','MANN-FILTER','WK 842/13',null,'Alimentação diesel','Filtra combustível','consumable',jsonb_build_object(),jsonb_build_object(),jsonb_build_array('Pode variar conforme conjunto Racor/filtro; conferir fisicamente')),
 ('EJW6A76','mann_sprinter_313_om611_service_v8','engine_fuel','Filtro de combustível MANN WK 842/18 — opção com sensor de água','filtro de combustível com sensor de água','MANN-FILTER','WK 842/18',null,'Alimentação diesel','Filtra combustível com configuração para sensor de água','consumable',jsonb_build_object(),jsonb_build_object(),jsonb_build_array('Opção de catálogo; não assumir instalada')),
 ('EJW6A76','mann_sprinter_313_om611_service_v8','hvac','Filtro de cabine MANN CU 3858/1','filtro de cabine','MANN-FILTER','CU 3858/1',null,'Caixa de ventilação','Filtra ar do habitáculo','consumable',jsonb_build_object(),jsonb_build_object(),jsonb_build_array('Confirmar alojamento da carroceria')),
 -- Volare manufacturer catalog
 ('MBJ1166','masterparts_volare_a6_clutch_v9','transmission','Kit de embreagem Master Parts MWM MM900001','kit de embreagem','MWM / Master Parts','MM900001',null,'Entre motor e câmbio','Conjunto de serviço da embreagem','part',jsonb_build_object(),jsonb_build_object(),jsonb_build_array('Aplicação Volare A6 4.07 TCA; confirmar conjunto instalado')),
 ('MBJ1166','masterparts_volare_a6_fan_bearing_v9','engine_cooling','Rolamento do mancal do ventilador MWM 903260100008E','rolamento do mancal do ventilador','MWM / Master Parts','903260100008E',null,'Mancal do ventilador','Suporta conjunto girante do ventilador','bearing',jsonb_build_object(),jsonb_build_object(),jsonb_build_array('Aplicação Volare A6 4.07 TCA; confirmar mancal instalado'))
)
insert into public.v2_vehicle_components(group_code,name,generic_name,oem_brand,manufacturer_part_number,oem_part_number,location_description,function_description,data_status,component_type,dimensions_spec,thread_spec,replacement_notes,source_metadata)
select r.group_code,r.name,r.generic_name,r.brand,r.partno,r.oemno,r.location_description,r.function_description,'verified',r.component_type,r.dimensions_spec,r.thread_spec,r.replacement_notes,
 jsonb_build_object('seed','fleet_final_catalog_reconciliation_v9','verification_source_key',r.source_key,'catalog_reference_verified',true,'physical_fitment_verified',false,'orderable',false)
from refs r
where not exists(select 1 from public.v2_vehicle_components c where c.manufacturer_part_number=r.partno and c.source_metadata->>'verification_source_key'=r.source_key);

-- Vehicle links for all final-pass references.
with refkeys(plate,source_key) as (
 values
 ('BYH8J61','nakata_mb608_steering_v7'),
 ('CPI6C79','nakata_vw9150eod_chassis_v7'),
 ('MBJ1166','nakata_volare_a6_driveline_v7'),
 ('EJW6A76','mann_sprinter_313_om611_service_v8'),
 ('MBJ1166','masterparts_volare_a6_clutch_v9'),
 ('MBJ1166','masterparts_volare_a6_fan_bearing_v9')
)
insert into public.v2_vehicle_component_links(company_id,vehicle_id,component_id,fitment_status,notes)
select v.company_id,v.id,c.id,'candidate','Catalog reference verified; confirm physically before ordering.'
from refkeys r join public.v2_vehicles v on v.plate=r.plate
join public.v2_vehicle_components c on c.source_metadata->>'verification_source_key'=r.source_key
on conflict(company_id,vehicle_id,component_id) do update set fitment_status=case when public.v2_vehicle_component_links.fitment_status='verified' then 'verified' else 'candidate' end,notes=excluded.notes,updated_at=now();

-- ---------------------------------------------------------------------------
-- 3. Existing base-component enrichments
-- ---------------------------------------------------------------------------
update public.v2_vehicle_components c set data_status='verified',oem_brand='MANN-FILTER',
 source_metadata=coalesce(c.source_metadata,'{}'::jsonb)||jsonb_build_object('verification_source_key','mann_vw9150eod_filters_v7','catalog_reference_verified',true,'physical_fitment_verified',false),updated_at=now()
where c.id in (select c2.id from public.v2_vehicle_component_links l join public.v2_vehicles v on v.id=l.vehicle_id join public.v2_vehicle_components c2 on c2.id=l.component_id where v.plate='CPI6C79' and replace(upper(coalesce(c2.manufacturer_part_number,'')),' ','')='CF1000');

update public.v2_vehicle_components c set
 manufacturer_part_number=case when coalesce(c.manufacturer_part_number,'')='' then 'MM900070' when c.manufacturer_part_number not ilike '%MM900070%' then c.manufacturer_part_number||' / Master Parts MM900070' else c.manufacturer_part_number end,
 data_status='verified',source_metadata=coalesce(c.source_metadata,'{}'::jsonb)||jsonb_build_object('masterparts_reference','MM900070','manufacturer_source_key','masterparts_608_om314_waterpump_v9','catalog_reference_verified',true,'physical_fitment_verified',false,'orderable',false),updated_at=now()
where c.id in (select c2.id from public.v2_vehicle_component_links l join public.v2_vehicles v on v.id=l.vehicle_id join public.v2_vehicle_components c2 on c2.id=l.component_id where v.plate='BYH8J61' and c2.group_code='engine_cooling' and lower(c2.name)='bomba d agua');

update public.v2_vehicle_components c set manufacturer_part_number='MM100291E',data_status='verified',
 source_metadata=coalesce(c.source_metadata,'{}'::jsonb)||jsonb_build_object('verification_source_key','masterparts_608_om314_oilpump_v9','catalog_reference_verified',true,'physical_fitment_verified',false,'orderable',false,'original_crosses',jsonb_build_array('343.180.01.01','352.180.48.01')),updated_at=now()
where c.id in (select c2.id from public.v2_vehicle_component_links l join public.v2_vehicles v on v.id=l.vehicle_id join public.v2_vehicle_components c2 on c2.id=l.component_id where v.plate='BYH8J61' and c2.group_code='engine_lubrication' and lower(c2.name)='bomba de oleo');

-- ---------------------------------------------------------------------------
-- 4. Profile evidence and purchase policy
-- ---------------------------------------------------------------------------
update public.v2_vehicle_technical_profiles p set
 engine_family=case when v.plate='CPI6C79' then coalesce(p.engine_family,'MWM Acteon 4.12 TCE') else p.engine_family end,
 source_metadata=coalesce(p.source_metadata,'{}'::jsonb)||case when v.plate='CPI6C79' then jsonb_build_object(
   'engine_family_catalog_verified',true,
   'engine_verification_source_key','mwm_acteon_d1a_application_v7',
   'engine_serial_match','D1A001816',
   'mechanical_variant_catalog_supported','VW 9.150 EOD',
   'mechanical_variant_catalog_source_key','masterparts_vw9150eod_application_v9',
   'mechanical_variant_physical_or_build_data_verified',false,
   'mechanical_variant_confidence','strong_catalog_support'
 ) else '{}'::jsonb end
 ||jsonb_build_object(
   'final_public_registration_pass','v9',
   'final_public_registration_at','2026-09-27',
   'final_public_registration_status','complete_for_current_public_evidence',
   'catalog_integrity_rule','catalog verified does not equal physically installed',
   'candidate_orderable_policy','false',
   'direct_buy_requires','physical fitment verified OR authoritative exact VIN/serial/build-data confirmation',
   'restricted_source_gap','remaining exact OEM micro-parts require restricted/licensed EPC, build data, official full manual or physical identification'
 ),updated_at=now()
from public.v2_vehicles v where p.vehicle_id=v.id and v.plate in ('EJW6A76','CPI6C79','MBJ1166','BYH8J61');

-- ---------------------------------------------------------------------------
-- 5. Integrity: no non-verified candidate may be directly orderable
-- ---------------------------------------------------------------------------
update public.v2_vehicle_components c
set source_metadata=jsonb_set(coalesce(c.source_metadata,'{}'::jsonb),'{orderable}','false'::jsonb,true),updated_at=now()
where c.id in (
 select distinct c2.id
 from public.v2_vehicle_component_links l
 join public.v2_vehicles v on v.id=l.vehicle_id
 join public.v2_vehicle_components c2 on c2.id=l.component_id
 where v.plate in ('EJW6A76','CPI6C79','MBJ1166','BYH8J61')
   and l.fitment_status<>'verified'
   and coalesce(c2.source_metadata->>'orderable','false')='true'
   and not exists(select 1 from public.v2_vehicle_component_links lv where lv.component_id=c2.id and lv.fitment_status='verified')
);

-- ---------------------------------------------------------------------------
-- 6. Exploded-view coverage for final-pass items
-- ---------------------------------------------------------------------------
with research_components as (
 select v.plate,c.id component_id,c.group_code,c.component_type,c.name,c.manufacturer_part_number
 from public.v2_vehicle_component_links l
 join public.v2_vehicles v on v.id=l.vehicle_id
 join public.v2_vehicle_components c on c.id=l.component_id
 where v.plate in ('EJW6A76','CPI6C79','MBJ1166','BYH8J61')
   and c.source_metadata->>'verification_source_key' in (
      'nakata_mb608_steering_v7','nakata_vw9150eod_chassis_v7','nakata_volare_a6_driveline_v7',
      'mann_sprinter_313_om611_service_v8','masterparts_volare_a6_clutch_v9','masterparts_volare_a6_fan_bearing_v9',
      'nakata_volare_a6_steering_v6'
   )
   and not exists(select 1 from public.v2_vehicle_exploded_view_items i where i.component_id=c.id)
), targets as (
 select r.*,ev.id exploded_view_id
 from research_components r
 join lateral (
   select e.id from public.v2_vehicle_exploded_views e
   where e.group_code=r.group_code and (
     e.source_metadata->>'plate'=r.plate
     or (r.plate='EJW6A76' and e.assembly_code=case
       when r.group_code='engine_air' then 'air_cleaner_903662'
       when r.group_code='engine_fuel' then 'fuel_filter_lines_611981'
       when r.group_code='hvac' then 'heating_ventilation_903662'
       else e.assembly_code end)
     or (r.plate='MBJ1166' and e.chassis_variant ilike '%A6%')
   )
   order by case when e.source_metadata->>'plate'=r.plate and e.assembly_code like r.plate||'-%-STRUCT-V1' then 0 else 1 end,
            case when e.source_metadata->>'generated_catalog'='true' then 0 else 1 end,
            e.created_at
   limit 1
 ) ev on true
)
insert into public.v2_vehicle_exploded_view_items(exploded_view_id,component_id,item_number,quantity,component_type,position_note,exactness_status,source_metadata)
select t.exploded_view_id,t.component_id,'FINAL-'||upper(substr(md5(t.component_id::text),1,10)),1,
 case when t.component_type in ('assembly','part','fastener','washer','nut','bolt','screw','stud','seal','o_ring','gasket','clip','spring','bearing','bushing','hose','pipe','connector','wire','sensor','actuator','consumable','other') then t.component_type else 'part' end,
 concat('Referência catalogada: ',coalesce(t.manufacturer_part_number,t.name)),'verified',jsonb_build_object('seed','fleet_final_catalog_reconciliation_v9','catalog_reference_verified',true,'physical_fitment_verified',false)
from targets t;

-- This migration intentionally does NOT fabricate torque values, OEM numbers,
-- axle ratios, gearbox revisions or body options that public evidence does not prove.