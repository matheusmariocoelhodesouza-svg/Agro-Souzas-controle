-- Volare A6 steering verification V6 — 2026-09-27
-- Adds Nakata N 710/N 711 tie-rod ends and N 703 drag link as catalog-verified references.
-- Physical fitment remains candidate.

insert into public.v2_vehicle_technical_sources (
  company_id, vehicle_id, source_key, source_type, title, publisher, publication_year,
  source_url, authority_level, applicability_status, access_status, verification_status, notes, source_metadata
)
select v.company_id,v.id,'nakata_volare_a6_steering_v6','manufacturer_catalog_mirror',
       'Nakata — componentes de direção pesada — Volare A6','Nakata',2018,
       'https://images.canaldapeca.com.br/catalogos/cat/Nakata/31082018/componentes-de-direcao-pesado-2018.pdf',
       'manufacturer_catalog_mirror','exact_model_year_range','public','catalog_verified',
       'Volare A6: N 710 direito, N 711 esquerdo e barra de ligação N 703. Veículo ano 2000 dentro da faixa; fitment físico permanece candidato.',
       jsonb_build_object('checked_at','2026-09-27','model','Volare A6','vehicle_year',2000,'right_tie_rod_end','N 710','left_tie_rod_end','N 711','drag_link','N 703','physical_fitment_verified',false)
from public.v2_vehicles v where v.plate='MBJ1166'
on conflict(company_id,vehicle_id,source_key) do update set
 source_type=excluded.source_type,title=excluded.title,publisher=excluded.publisher,publication_year=excluded.publication_year,
 source_url=excluded.source_url,authority_level=excluded.authority_level,applicability_status=excluded.applicability_status,
 access_status=excluded.access_status,verification_status=excluded.verification_status,notes=excluded.notes,
 source_metadata=excluded.source_metadata,updated_at=now();

with refs(name,generic_name,part_no,location_description,function_description,length_mm,side_name,thread_value,year_from) as (
 values
 ('Terminal de direção direito Nakata N 710','terminal de direção direito','N 710','Direção dianteira — lado direito','Articulação terminal da direção',105,'right','M28 x 1,5',1996),
 ('Terminal de direção esquerdo Nakata N 711','terminal de direção esquerdo','N 711','Direção dianteira — lado esquerdo','Articulação terminal da direção',105,'left','M28 x 1,5',1996),
 ('Barra de ligação Nakata N 703','barra de ligação da direção','N 703','Direção dianteira — ligação entre terminais','Transmite movimento do sistema de direção',1449,null,null,1998)
)
insert into public.v2_vehicle_components(
 group_code,name,generic_name,oem_brand,manufacturer_part_number,location_description,function_description,
 data_status,component_type,dimensions_spec,thread_spec,replacement_notes,source_metadata
)
select 'steering',r.name,r.generic_name,'Nakata',r.part_no,r.location_description,r.function_description,
       'verified','part',
       jsonb_strip_nulls(jsonb_build_object('catalog_length_mm',r.length_mm,'catalog_side',r.side_name)),
       case when r.thread_value is null then '{}'::jsonb else jsonb_build_object('thread',r.thread_value) end,
       jsonb_build_array('Aplicação de catálogo Nakata para Volare A6 dentro da faixa de ano.','Confirmar gravação/código/configuração da peça instalada antes de compra.'),
       jsonb_build_object('seed','volare_a6_steering_nakata_v6','verification_source_key','nakata_volare_a6_steering_v6','catalog_reference_verified',true,'physical_fitment_verified',false,'orderable',true,'model_year_from',r.year_from,'model_year_to',2006)
from refs r
where not exists (
 select 1 from public.v2_vehicle_components c
 where c.manufacturer_part_number=r.part_no and c.source_metadata->>'verification_source_key'='nakata_volare_a6_steering_v6'
);

insert into public.v2_vehicle_component_links(company_id,vehicle_id,component_id,fitment_status,notes)
select v.company_id,v.id,c.id,'candidate','Catálogo Nakata confirma aplicação por modelo/ano; confirmar peça instalada fisicamente.'
from public.v2_vehicles v
join public.v2_vehicle_components c on c.source_metadata->>'verification_source_key'='nakata_volare_a6_steering_v6'
where v.plate='MBJ1166'
on conflict(company_id,vehicle_id,component_id) do update set fitment_status='candidate',notes=excluded.notes,updated_at=now();

insert into public.v2_vehicle_component_applications(component_id,chassis_family,chassis_variant,model_year_from,model_year_to,notes,fitment_status,source_metadata)
select c.id,'Marcopolo Volare','A6 / MBJ1166',
       (c.source_metadata->>'model_year_from')::integer,2006,
       'Aplicação Nakata para Volare A6; veículo 2000 dentro da faixa.','candidate',
       jsonb_build_object('source_key','nakata_volare_a6_steering_v6','physical_confirmation_required',true)
from public.v2_vehicle_components c
where c.source_metadata->>'verification_source_key'='nakata_volare_a6_steering_v6'
  and not exists (select 1 from public.v2_vehicle_component_applications a where a.component_id=c.id and a.source_metadata->>'source_key'='nakata_volare_a6_steering_v6');

insert into public.v2_vehicle_component_relations(parent_component_id,child_component_id,relation_type,quantity,notes,source_metadata)
select p.id,c.id,'contains',1,'Decomposição do conjunto genérico de barras/terminais do Volare A6 usando catálogo Nakata.',jsonb_build_object('source_key','nakata_volare_a6_steering_v6')
from public.v2_vehicle_components p
cross join public.v2_vehicle_components c
where p.source_metadata->>'seed'='volare_mbj1166_a6_407tca_v1'
  and p.name='Barras e terminais de direcao'
  and c.source_metadata->>'verification_source_key'='nakata_volare_a6_steering_v6'
on conflict(parent_component_id,child_component_id,relation_type) do update set notes=excluded.notes,source_metadata=excluded.source_metadata;
