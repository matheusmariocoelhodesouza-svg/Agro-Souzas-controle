-- Helper administrativo para popular vistas EPC detalhadas.
-- Não é exposto a anon/authenticated; serve apenas para migrations/seed controlado.
create or replace function public.c360_seed_epc_view(
  p_group_code text,p_view_key text,p_title text,p_source_url text,p_status text,
  p_notes text,p_seed text,p_items jsonb
) returns void language plpgsql security invoker set search_path=public as $$
begin
  insert into public.v2_vehicle_exploded_views(
    group_code,chassis_family,chassis_variant,engine_code,assembly_code,title,
    source_name,source_url,source_diagram_key,image_license_status,verification_status,notes,source_metadata)
  select p_group_code,'W903','903.662','OM611.981',p_view_key,p_title,
    'Mercedes-Benz / PartSouq',p_source_url,p_view_key,'reference_only',p_status,p_notes,
    jsonb_build_object('seed',p_seed,'source_kind','public_epc_reference')
  where not exists(select 1 from public.v2_vehicle_exploded_views where source_diagram_key=p_view_key);

  with s as (
    select x->>'n' item_number,x->>'name' part_name,nullif(x->>'oem','') oem_part_number,
      coalesce((x->>'q')::numeric,1) quantity,coalesce(x->>'type','part') component_type
    from jsonb_array_elements(p_items) x
  )
  insert into public.v2_vehicle_components(
    group_code,name,generic_name,oem_brand,oem_part_number,location_description,function_description,
    failure_symptoms,diagnostic_notes,required_tools,connector_spec,exploded_view_reference,data_status,
    source_metadata,component_type,dimensions_spec,material_spec,thread_spec,replacement_notes)
  select p_group_code,s.part_name||' — '||p_title||' • item '||s.item_number,s.part_name,'Mercedes-Benz',s.oem_part_number,
    p_title||' — item '||s.item_number,
    case when s.component_type in ('bolt','screw','nut','stud','washer','clip','spring') then 'Fixação/posicionamento do conjunto conforme vista EPC.'
         when s.component_type in ('seal','o_ring','gasket') then 'Vedação do conjunto conforme vista EPC.'
         when s.component_type in ('bearing','bushing') then 'Apoio, guiamento ou isolamento mecânico do conjunto.'
         when s.component_type='sensor' then 'Medição/monitoramento do sistema relacionado.'
         when s.component_type in ('hose','pipe') then 'Condução de fluido, ar ou combustível no sistema relacionado.'
         else 'Componente do conjunto indicado na vista explodida.' end,
    case when s.component_type in ('bolt','screw','nut','stud','washer','clip','spring') then '["folga no conjunto","ruído ou vibração por fixação solta","rosca/cabeça danificada","desalinhamento ou vazamento quando perde aperto"]'::jsonb
         when s.component_type in ('seal','o_ring','gasket') then '["vazamento no conjunto","entrada de ar ou perda de pressão conforme circuito","contaminação por fluido"]'::jsonb
         when s.component_type in ('bearing','bushing') then '["ronco ou ruído de rolamento","folga excessiva","vibração","aquecimento anormal"]'::jsonb
         when s.component_type='sensor' then '["sinal implausível ou intermitente","luz de avaria/código de falha","funcionamento incorreto do sistema monitorado"]'::jsonb
         when s.component_type in ('hose','pipe') then '["vazamento","entrada de ar ou perda de pressão","trinca, ressecamento ou conexão danificada"]'::jsonb
         else '["desgaste, folga, quebra ou vazamento conforme a função","ruído ou vibração anormal do conjunto","perda de funcionamento do sistema relacionado"]'::jsonb end,
    case when s.component_type in ('bolt','screw','nut','stud','washer','clip','spring') then '["inspeção visual do fixador e da rosca","verificar assentamento e aperto conforme procedimento do conjunto","substituir se houver alongamento, corrosão severa ou rosca danificada"]'::jsonb
         when s.component_type in ('seal','o_ring','gasket') then '["inspeção visual da vedação e superfície de assentamento","teste de estanqueidade/pressão adequado ao circuito","substituir vedação desmontada quando o procedimento exigir"]'::jsonb
         when s.component_type in ('bearing','bushing') then '["verificar folga radial/axial","girar e sentir aspereza quando acessível","medir folga ou preload conforme procedimento"]'::jsonb
         when s.component_type='sensor' then '["ler valor e DTC no scanner quando disponível","conferir alimentação, terra e sinal","inspecionar conector e chicote"]'::jsonb
         when s.component_type in ('hose','pipe') then '["inspeção visual e das conexões","teste de estanqueidade/pressão conforme circuito","verificar abraçadeiras e O-rings associados"]'::jsonb
         else '["inspeção visual e funcional","comparar folgas/medidas com especificação do conjunto","verificar peças associadas antes da substituição"]'::jsonb end,
    case when s.component_type in ('bolt','screw','nut','stud','washer','clip','spring') then '["soquete/chave correspondente","torquímetro","calibrador de rosca quando necessário"]'::jsonb
         when s.component_type in ('seal','o_ring','gasket') then '["gancho/pick plástico para vedação","material de limpeza sem fiapos","torquímetro do conjunto"]'::jsonb
         when s.component_type in ('bearing','bushing') then '["relógio comparador","extrator/prensa quando aplicável","torquímetro"]'::jsonb
         when s.component_type='sensor' then '["scanner","multímetro","pontas de prova adequadas"]'::jsonb
         when s.component_type in ('hose','pipe') then '["alicate de abraçadeiras","kit de teste de pressão/vácuo conforme circuito","lanterna"]'::jsonb
         else '["ferramentas manuais adequadas","torquímetro","instrumento de medição conforme o componente"]'::jsonb end,
    '{}'::jsonb,p_title||' • item '||s.item_number||' • fonte: '||p_source_url,
    case when p_status='verified' and s.oem_part_number is not null then 'verified' else 'estimated' end,
    jsonb_build_object('seed',p_seed,'view_key',p_view_key,'item_number',s.item_number,'quantity',s.quantity,'source_url',p_source_url),
    s.component_type,'{}'::jsonb,'{}'::jsonb,
    case when s.part_name ilike '%M16X1.5%' then '{"thread":"M16x1.5"}'::jsonb
         when s.part_name ilike '%M6X16%' then '{"thread":"M6","length_mm":16}'::jsonb
         when s.part_name ilike '%M8%' then '{"thread":"M8"}'::jsonb else '{}'::jsonb end,'[]'::jsonb
  from s
  where not exists(select 1 from public.v2_vehicle_components c
    where c.source_metadata->>'seed'=p_seed and c.source_metadata->>'view_key'=p_view_key and c.source_metadata->>'item_number'=s.item_number);

  insert into public.v2_vehicle_exploded_view_items(exploded_view_id,component_id,item_number,quantity,component_type,position_note,exactness_status,source_metadata)
  select e.id,c.id,c.source_metadata->>'item_number',nullif(c.source_metadata->>'quantity','')::numeric,c.component_type,c.location_description,
    case when c.data_status='verified' then 'verified' else 'estimated' end,jsonb_build_object('seed',p_seed)
  from public.v2_vehicle_components c join public.v2_vehicle_exploded_views e on e.source_diagram_key=c.source_metadata->>'view_key'
  where c.source_metadata->>'seed'=p_seed and c.source_metadata->>'view_key'=p_view_key
  on conflict(exploded_view_id,component_id,item_number) do nothing;

  insert into public.v2_vehicle_component_applications(component_id,chassis_family,chassis_variant,engine_family,engine_code,model_year_from,model_year_to,fitment_status,notes,source_metadata)
  select c.id,'W903','903.662','OM611','OM611.981',2010,2011,case when c.data_status='verified' then 'verified' else 'candidate' end,
    'Item de EPC microdetalhado. Confirmar variante/corte quando a vista estiver marcada como estimada.',jsonb_build_object('seed',p_seed)
  from public.v2_vehicle_components c where c.source_metadata->>'seed'=p_seed and c.source_metadata->>'view_key'=p_view_key
  and not exists(select 1 from public.v2_vehicle_component_applications a where a.component_id=c.id and a.chassis_variant='903.662' and a.engine_code='OM611.981');

  insert into public.v2_vehicle_component_links(company_id,vehicle_id,component_id,fitment_status,notes)
  select v.company_id,v.id,c.id,case when c.data_status='verified' then 'verified' else 'candidate' end,
    'Item microdetalhado da vista '||p_view_key||', posição '||coalesce(c.source_metadata->>'item_number','')||'.'
  from public.v2_vehicles v cross join public.v2_vehicle_components c
  where v.plate='EJW6A76' and c.source_metadata->>'seed'=p_seed and c.source_metadata->>'view_key'=p_view_key
  on conflict(company_id,vehicle_id,component_id) do nothing;
end $$;
revoke all on function public.c360_seed_epc_view(text,text,text,text,text,text,text,jsonb) from public,anon,authenticated;
