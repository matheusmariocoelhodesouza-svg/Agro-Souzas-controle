-- Oficina 360 — cobertura Premium para toda a frota operacional.
-- Mantém geometria gerada separada de dado OEM e não promove códigos candidatos a verificados.

-- 1) Corrige variantes antigas para que as vistas já cadastradas da 608 e do Volare
-- sejam compatíveis com os perfis técnicos exatos atualmente salvos.
update v2_vehicle_exploded_views
set chassis_variant='LO 608', updated_at=now()
where chassis_family='Mercedes-Benz 608'
  and engine_code='OM314'
  and chassis_variant like 'LO 608 candidato%';

update v2_vehicle_exploded_views
set chassis_variant='Volare A6', updated_at=now()
where chassis_family='Marcopolo Volare'
  and engine_code='4.07 TCA'
  and chassis_variant like 'A6 131 cv%';

-- 2) Carretinha QSR7H50: catálogo técnico estrutural, sem inventar código OEM.
with src(group_code,name,generic_name,component_type,location_description,function_description,service_priority) as (
 values
 ('body','Chassi principal do reboque','Quadro estrutural','assembly','Estrutura longitudinal inferior','Base estrutural que recebe lança, eixo, carroceria e acessórios.','critical'),
 ('body','Lança / timão','Lança do reboque','part','Parte dianteira ligada ao engate','Transmite esforços entre veículo trator e reboque.','critical'),
 ('body','Cabeçote de engate','Acoplador do reboque','part','Extremidade dianteira da lança','Faz o acoplamento mecânico com a esfera/engate do veículo trator.','critical'),
 ('body','Corrente de segurança','Corrente de segurança','part','Entre lança e ponto de segurança do engate','Retenção secundária em caso de desacoplamento.','critical'),
 ('body','Plataforma / carroceria aberta','Carroceria do reboque','assembly','Sobre o chassi','Recebe e contém a carga transportada.','high'),
 ('body','Para-lama esquerdo','Para-lama','part','Sobre a roda esquerda','Protege contra projeção de água e detritos.','medium'),
 ('body','Para-lama direito','Para-lama','part','Sobre a roda direita','Protege contra projeção de água e detritos.','medium'),
 ('body','Pé de apoio / roda jockey','Apoio dianteiro','part','Região dianteira da lança','Sustenta a dianteira quando desacoplada.','medium'),
 ('suspension','Eixo do reboque','Eixo rígido','assembly','Transversal sob o chassi','Suporta as rodas e transfere carga à suspensão.','critical'),
 ('suspension','Feixe de molas esquerdo','Mola semielíptica','spring','Entre eixo e chassi, lado esquerdo','Suporta carga e permite movimento vertical do eixo.','critical'),
 ('suspension','Feixe de molas direito','Mola semielíptica','spring','Entre eixo e chassi, lado direito','Suporta carga e permite movimento vertical do eixo.','critical'),
 ('suspension','Grampos U do eixo','Grampo U','fastener','Fixação do eixo aos feixes','Prende o eixo ao conjunto de molas.','critical'),
 ('suspension','Buchas dos feixes','Bucha de suspensão','bushing','Olhais dos feixes de mola','Permitem articulação controlada e reduzem folga/ruído.','high'),
 ('suspension','Cubo de roda esquerdo','Cubo de roda','part','Ponta esquerda do eixo','Suporta roda e rolamentos.','critical'),
 ('suspension','Cubo de roda direito','Cubo de roda','part','Ponta direita do eixo','Suporta roda e rolamentos.','critical'),
 ('suspension','Rolamentos do cubo','Rolamento de roda','bearing','Dentro dos cubos','Permitem rotação da roda com carga axial/radial.','critical'),
 ('suspension','Roda esquerda','Conjunto roda','assembly','Lado esquerdo do eixo','Suporta pneu e transmite carga ao cubo.','critical'),
 ('suspension','Roda direita','Conjunto roda','assembly','Lado direito do eixo','Suporta pneu e transmite carga ao cubo.','critical'),
 ('electrical','Chicote principal do reboque','Chicote 12 V','wire','Da tomada dianteira às lanternas','Distribui sinais de iluminação do veículo trator.','high'),
 ('electrical','Plugue elétrico do reboque','Conector do reboque','connector','Ponta dianteira da lança','Conecta o circuito elétrico ao veículo trator.','high'),
 ('electrical','Lanterna traseira esquerda','Lanterna combinada','part','Traseira esquerda','Sinalização de posição, freio e direção conforme instalação.','critical'),
 ('electrical','Lanterna traseira direita','Lanterna combinada','part','Traseira direita','Sinalização de posição, freio e direção conforme instalação.','critical'),
 ('electrical','Luz de placa','Iluminação da placa','part','Próxima à placa traseira','Ilumina a placa do reboque.','medium'),
 ('electrical','Refletores laterais/traseiros','Refletores','part','Laterais e traseira','Aumentam visibilidade passiva do reboque.','high')
)
insert into v2_vehicle_components(
 id,group_code,name,generic_name,component_type,location_description,function_description,
 failure_symptoms,diagnostic_notes,required_tools,replacement_notes,data_status,service_priority,source_metadata,created_at,updated_at
)
select gen_random_uuid(),s.group_code,s.name,s.generic_name,s.component_type,s.location_description,s.function_description,
 jsonb_build_array('Folga, ruído, trinca, deformação ou funcionamento irregular conforme o componente.'),
 jsonb_build_array('Inspecionar visualmente, verificar folgas/fixações e comparar com a peça instalada antes de substituir.'),
 jsonb_build_array('Ferramentas manuais adequadas','Torquímetro quando houver especificação confirmada'),
 jsonb_build_array('Fotografar posição e fixações antes de desmontar. Confirmar medida, aplicação e torque antes da montagem.'),
 'reference_pending',s.service_priority,
 jsonb_build_object('fleet_key','QSR7H50','source','CRLV + arquitetura estrutural do reboque','generated_catalog',true,'oem_confirmed',false),
 now(),now()
from src s
where not exists (
 select 1 from v2_vehicle_components c
 where c.source_metadata->>'fleet_key'='QSR7H50' and c.name=s.name
);

insert into v2_vehicle_component_links(id,company_id,vehicle_id,component_id,fitment_status,notes,created_at,updated_at)
select gen_random_uuid(),v.company_id,v.id,c.id,'candidate',
 'Componente estrutural mapeado para o reboque; código/medida exata deve ser conferido na peça instalada.',now(),now()
from v2_vehicles v
join v2_vehicle_components c on c.source_metadata->>'fleet_key'='QSR7H50'
where v.plate='QSR7H50'
  and not exists (
    select 1 from v2_vehicle_component_links l
    where l.company_id=v.company_id and l.vehicle_id=v.id and l.component_id=c.id
  );

update v2_vehicle_technical_profiles p
set identity_status='exact', catalog_status='ready', updated_at=now(),
    source_metadata=coalesce(p.source_metadata,'{}'::jsonb)||jsonb_build_object(
      'fleet_premium_ready',true,
      'non_motorized',true,
      'catalog_scope','estrutura, suspensão e elétrica; códigos OEM continuam pendentes quando não documentados'
    )
from v2_vehicles v
where p.vehicle_id=v.id and v.plate='QSR7H50';

-- 3) Para cada condução da empresa, garante ao menos uma vista estrutural por sistema
-- que tenha peças vinculadas e ainda não possua vista compatível com o perfil atual.
with target as (
 select distinct v.id vehicle_id,v.company_id,v.plate,p.chassis_family,p.chassis_variant,p.engine_code,c.group_code
 from v2_vehicles v
 join v2_vehicle_technical_profiles p on p.vehicle_id=v.id
 join v2_vehicle_component_links l on l.vehicle_id=v.id and l.company_id=v.company_id
 join v2_vehicle_components c on c.id=l.component_id
 where v.company_id='bb06c7a1-1bbd-42b6-b481-680a9ef5b597'
), missing as (
 select t.*
 from target t
 where not exists (
   select 1 from v2_vehicle_exploded_views ev
   where ev.group_code=t.group_code
     and (ev.chassis_family is null or ev.chassis_family=t.chassis_family)
     and (ev.chassis_variant is null or ev.chassis_variant=t.chassis_variant)
     and (ev.engine_code is null or ev.engine_code=t.engine_code)
 )
)
insert into v2_vehicle_exploded_views(
 id,group_code,chassis_family,chassis_variant,engine_code,assembly_code,title,subtitle,
 source_name,image_license_status,verification_status,notes,source_metadata,created_at,updated_at
)
select gen_random_uuid(),m.group_code,m.chassis_family,m.chassis_variant,m.engine_code,
 'FLEET-'||replace(m.plate,'-','')||'-'||upper(m.group_code)||'-V1',
 coalesce(g.name,m.group_code)||' — '||m.plate,
 'Vista estrutural funcional gerada a partir do catálogo vinculado à condução.',
 'Oficina 360 Fleet Premium','generated','estimated',
 'Relação funcional e componentes reais do catálogo. Posição visual não é geometria OEM.',
 jsonb_build_object('generated_catalog',true,'fleet_premium',true,'vehicle_id',m.vehicle_id,'plate',m.plate,'oem_geometry',false),
 now(),now()
from missing m
left join v2_vehicle_component_groups g on g.code=m.group_code
where not exists (
 select 1 from v2_vehicle_exploded_views x
 where x.assembly_code='FLEET-'||replace(m.plate,'-','')||'-'||upper(m.group_code)||'-V1'
);

-- 4) Popula as vistas Fleet com os componentes mais úteis de cada grupo (até 20).
with fleet_views as (
 select ev.id view_id,ev.group_code,ev.source_metadata->>'vehicle_id' vehicle_id
 from v2_vehicle_exploded_views ev
 where ev.source_metadata->>'fleet_premium'='true'
), ranked as (
 select fv.view_id,c.id component_id,c.component_type,c.name,c.data_status,l.fitment_status,
        row_number() over(partition by fv.view_id order by
          case c.service_priority when 'critical' then 0 when 'high' then 1 when 'medium' then 2 else 3 end,
          case c.data_status when 'verified' then 0 when 'reference_pending' then 1 when 'estimated' then 2 else 3 end,
          case c.component_type when 'assembly' then 0 when 'sensor' then 1 when 'actuator' then 2 when 'part' then 3 else 4 end,
          c.name) rn
 from fleet_views fv
 join v2_vehicle_component_links l on l.vehicle_id=fv.vehicle_id::uuid
 join v2_vehicle_components c on c.id=l.component_id and c.group_code=fv.group_code
 where l.fitment_status<>'not_applicable'
)
insert into v2_vehicle_exploded_view_items(
 id,exploded_view_id,component_id,item_number,parent_item_number,quantity,component_type,position_note,exactness_status,source_metadata,created_at,updated_at
)
select gen_random_uuid(),r.view_id,r.component_id,lpad(r.rn::text,2,'0'),null,1,
 case when r.component_type in ('assembly','part','fastener','washer','nut','bolt','screw','stud','seal','o_ring','gasket','clip','spring','bearing','bushing','hose','pipe','connector','wire','sensor','actuator','consumable','other') then r.component_type else 'part' end,
 'Posição funcional reconstruída no Oficina 360; confirmar orientação/fixação na peça instalada ou fonte técnica antes da desmontagem.',
 case when r.fitment_status='verified' and r.data_status='verified' then 'verified'
      when r.data_status='estimated' then 'estimated' else 'reference_pending' end,
 jsonb_build_object('generated_catalog',true,'fleet_premium',true,'oem_geometry',false),now(),now()
from ranked r
where r.rn<=20
  and not exists (
    select 1 from v2_vehicle_exploded_view_items i
    where i.exploded_view_id=r.view_id and i.component_id=r.component_id and i.item_number=lpad(r.rn::text,2,'0')
  );

-- 5) Marca perfis já catalogados da frota como preparados para o modo Premium universal.
update v2_vehicle_technical_profiles p
set source_metadata=coalesce(p.source_metadata,'{}'::jsonb)||jsonb_build_object('fleet_premium_ready',true),
    updated_at=now()
from v2_vehicles v
where p.vehicle_id=v.id and v.company_id='bb06c7a1-1bbd-42b6-b481-680a9ef5b597';
