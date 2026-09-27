-- Fleet suspension verification V5 — 2026-09-27
-- Verifies Monroe shock references for Volare A6 and Mercedes-Benz LO 608.
-- Catalog verification does not promote physical fitment: vehicle links remain candidate.

with target as (
  select id, company_id, plate from public.v2_vehicles where plate in ('MBJ1166','BYH8J61')
)
insert into public.v2_vehicle_technical_sources (
  company_id, vehicle_id, source_key, source_type, title, publisher, publication_year,
  source_url, authority_level, applicability_status, access_status, verification_status, notes, source_metadata
)
select company_id, id,
       case plate when 'MBJ1166' then 'monroe_volare_a6_suspension_v5' else 'monroe_lo608_suspension_v5' end,
       'manufacturer_catalog',
       case plate when 'MBJ1166' then 'Monroe — aplicação de amortecedores Volare A6/A8' else 'Monroe — aplicação de amortecedores Mercedes-Benz LO 608' end,
       'Monroe / DRiV', 2013,
       'https://www.monroe.com.br/upload/5259-cat-logo-monroe-2.013.pdf',
       'manufacturer', 'family_reference', 'public', 'catalog_verified',
       case plate
         when 'MBJ1166' then 'Catálogo Monroe lista 54454 e 54455 para Volare A6/A8; página oficial 54454 identifica posição dianteira. 54455 traseiro corroborado por catálogo técnico de reposição. Fitment físico continua candidato.'
         else 'Catálogo Monroe lista 38042 e 38043 para micro-ônibus LO 608/610/708/809/812/814; posição dianteira/traseira corroborada por catálogo técnico de reposição. Fitment físico continua candidato.'
       end,
       case plate
         when 'MBJ1166' then jsonb_build_object(
           'manufacturer_catalog_url','https://www.monroe.com.br/upload/5259-cat-logo-monroe-2.013.pdf',
           'manufacturer_product_54454_url','https://www.monroe.com.br/catalogo/produtos/detalhes/54454',
           'catalog_codes',jsonb_build_array('54454','54455'),
           'position_mapping',jsonb_build_object('front','54454','rear','54455'),
           'physical_fitment_verified',false)
         else jsonb_build_object(
           'manufacturer_catalog_url','https://www.monroe.com.br/upload/5259-cat-logo-monroe-2.013.pdf',
           'catalog_codes',jsonb_build_array('38042','38043'),
           'position_mapping',jsonb_build_object('front','38042','rear','38043'),
           'physical_fitment_verified',false)
       end
from target
on conflict (company_id, vehicle_id, source_key) do update set
  title=excluded.title,publisher=excluded.publisher,publication_year=excluded.publication_year,
  source_url=excluded.source_url,authority_level=excluded.authority_level,
  applicability_status=excluded.applicability_status,access_status=excluded.access_status,
  verification_status=excluded.verification_status,notes=excluded.notes,
  source_metadata=excluded.source_metadata,updated_at=now();

update public.v2_vehicle_components
set oem_brand='Monroe', manufacturer_part_number='54454', data_status='verified',
    dimensions_spec=jsonb_build_object('open_length_mm',609.0,'closed_length_mm',381.0,'position','front'),
    replacement_notes=jsonb_build_array('Aplicação de catálogo Monroe para Volare A6/A8.','Confirmar o código gravado/etiqueta da peça instalada antes da compra quando possível.'),
    source_metadata=coalesce(source_metadata,'{}'::jsonb)||jsonb_build_object('catalog_reference_verified',true,'catalog_source_key','monroe_volare_a6_suspension_v5','manufacturer','Monroe','catalog_position','front','physical_fitment_verified',false,'orderable',true,'verified_at','2026-09-27'),
    updated_at=now()
where source_metadata->>'seed'='volare_mbj1166_a6_407tca_v1' and name='Amortecedor dianteiro';

update public.v2_vehicle_components
set oem_brand='Monroe', manufacturer_part_number='54455', data_status='verified',
    dimensions_spec=jsonb_build_object('open_length_mm',717.0,'closed_length_mm',435.0,'position','rear'),
    replacement_notes=jsonb_build_array('Aplicação de catálogo Monroe para Volare A6/A8.','Confirmar o código gravado/etiqueta da peça instalada antes da compra quando possível.'),
    source_metadata=coalesce(source_metadata,'{}'::jsonb)||jsonb_build_object('catalog_reference_verified',true,'catalog_source_key','monroe_volare_a6_suspension_v5','manufacturer','Monroe','catalog_position','rear','physical_fitment_verified',false,'orderable',true,'verified_at','2026-09-27'),
    updated_at=now()
where source_metadata->>'seed'='volare_mbj1166_a6_407tca_v1' and name='Amortecedor traseiro';

update public.v2_vehicle_components
set oem_brand='Monroe', manufacturer_part_number='38042', data_status='verified',
    dimensions_spec=jsonb_build_object('open_length_mm',632.0,'closed_length_mm',384.0,'position','front'),
    replacement_notes=jsonb_build_array('Aplicação Monroe para micro-ônibus LO 608.','Confirmar código/medidas da peça instalada antes da compra quando possível.'),
    source_metadata=coalesce(source_metadata,'{}'::jsonb)||jsonb_build_object('catalog_reference_verified',true,'catalog_source_key','monroe_lo608_suspension_v5','manufacturer','Monroe','catalog_position','front','physical_fitment_verified',false,'orderable',true,'verified_at','2026-09-27'),
    updated_at=now()
where source_metadata->>'seed'='mb608_byh8j61_om314_v1' and name='Amortecedor dianteiro';

update public.v2_vehicle_components
set oem_brand='Monroe', manufacturer_part_number='38043', data_status='verified',
    dimensions_spec=jsonb_build_object('open_length_mm',626.0,'closed_length_mm',373.0,'position','rear'),
    replacement_notes=jsonb_build_array('Aplicação Monroe para micro-ônibus LO 608.','Confirmar código/medidas da peça instalada antes da compra quando possível.'),
    source_metadata=coalesce(source_metadata,'{}'::jsonb)||jsonb_build_object('catalog_reference_verified',true,'catalog_source_key','monroe_lo608_suspension_v5','manufacturer','Monroe','catalog_position','rear','physical_fitment_verified',false,'orderable',true,'verified_at','2026-09-27'),
    updated_at=now()
where source_metadata->>'seed'='mb608_byh8j61_om314_v1' and name='Amortecedor traseiro';
