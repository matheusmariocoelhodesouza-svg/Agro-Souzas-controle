-- Oficina 360: segunda rodada de verificacao tecnica por catalogos de fabricante/aftermarket.
-- Regra: data_status='verified' confirma a REFERENCIA de catalogo; fitment_status do veiculo
-- permanece candidate enquanto nao houver leitura de plaqueta/codigo fisico da peca instalada.

-- 1) Identidade mecanica refinada por CRLV + catalogos de aplicacao.
update public.v2_vehicle_technical_profiles p
set chassis_variant='VW 9.150 EOD', engine_family='MWM Acteon', engine_code='4.12 TCE',
    source_metadata=coalesce(source_metadata,'{}'::jsonb)||jsonb_build_object(
      'mechanical_identity_status','catalog_verified_physical_plate_pending',
      'mechanical_identity_sources',jsonb_build_array(
        'Bosch Diesel Catalog 2019/2020 - VW 9.150 EOD Electronic 4.12 TCE 4.7 150 cv 02/2004-02/2012',
        'Volkswagen technical data / owner manual cross-reference for 9.150 EOD MWM 4.12 TCE'
      )
    ), updated_at=now()
from public.v2_vehicles v
where p.company_id=v.company_id and p.vehicle_id=v.id and upper(replace(v.plate,'-',''))='CPI6C79';

update public.v2_vehicle_technical_profiles p
set chassis_variant='Volare A6', engine_family='MWM Sprint Euro 2', engine_code='4.07 TCA',
    source_metadata=coalesce(source_metadata,'{}'::jsonb)||jsonb_build_object(
      'mechanical_identity_status','catalog_verified_physical_plate_pending',
      'mechanical_identity_sources',jsonb_build_array(
        'Motorservice application catalog - Volare A6 / Sprint Euro 2 / 4.07 TCA / 1998-2004',
        'CIPEC Agrale/Volare application catalogs - Volare A6 primeira edicao'
      )
    ), updated_at=now()
from public.v2_vehicles v
where p.company_id=v.company_id and p.vehicle_id=v.id and upper(replace(v.plate,'-',''))='MBJ1166';

update public.v2_vehicle_technical_profiles p
set chassis_variant='LO 608', engine_family='Mercedes-Benz OM314', engine_code='OM314',
    source_metadata=coalesce(source_metadata,'{}'::jsonb)||jsonb_build_object(
      'mechanical_identity_status','catalog_verified_physical_plate_pending',
      'mechanical_identity_sources',jsonb_build_array(
        'Motorservice application catalog - Mercedes-Benz LO 608 / OM314 / 3.8 L / 1973-1988'
      )
    ), updated_at=now()
from public.v2_vehicles v
where p.company_id=v.company_id and p.vehicle_id=v.id and upper(replace(v.plate,'-',''))='BYH8J61';

-- 2) CPI6C79: Bosch Common Rail confirmado por aplicacao 9.150 EOD 4.12 TCE.
update public.v2_vehicle_components
set oem_brand='Bosch', manufacturer_part_number='0 445 020 033', data_status='verified',
    source_metadata=coalesce(source_metadata,'{}'::jsonb)||jsonb_build_object(
      'catalog_verification','verified_application_reference','catalog_source','Bosch Diesel Catalog 2019/2020',
      'catalog_application','VW 9.150 EOD Electronic / 4.12 TCE / 4.7 L / 150 cv / 02.2004-02.2012',
      'physical_fitment_verified',false)
where source_metadata->>'seed'='comil_cpi6c79_vw9150_mwm412_v1' and name='Bomba de alta pressao common rail';

update public.v2_vehicle_components
set oem_brand='Bosch', manufacturer_part_number='0 445 224 019', data_status='verified',
    source_metadata=coalesce(source_metadata,'{}'::jsonb)||jsonb_build_object(
      'catalog_verification','verified_application_reference','catalog_source','Bosch Diesel Catalog 2019/2020',
      'catalog_application','VW 9.150 EOD Electronic / 4.12 TCE / 4.7 L / 150 cv / 02.2004-02.2012',
      'physical_fitment_verified',false)
where source_metadata->>'seed'='comil_cpi6c79_vw9150_mwm412_v1' and name='Rail de combustivel';

update public.v2_vehicle_components
set oem_brand='Bosch', manufacturer_part_number='0 445 120 326', data_status='verified',
    source_metadata=coalesce(source_metadata,'{}'::jsonb)||jsonb_build_object(
      'catalog_verification','verified_application_reference','catalog_source','Bosch Diesel Catalog 2019/2020',
      'catalog_application','VW 9.150 EOD Electronic / 4.12 TCE / 4.7 L / 150 cv / 02.2004-02.2012',
      'physical_fitment_verified',false)
where source_metadata->>'seed'='comil_cpi6c79_vw9150_mwm412_v1' and name='Injetor common rail';

update public.v2_vehicle_components
set oem_brand='Bosch', manufacturer_part_number='0 281 002 568', data_status='verified',
    source_metadata=coalesce(source_metadata,'{}'::jsonb)||jsonb_build_object(
      'catalog_verification','verified_application_reference','catalog_source','Bosch Diesel Catalog 2019/2020',
      'catalog_application','VW 9.150 EOD Electronic / 4.12 TCE / 4.7 L / 150 cv / 02.2004-02.2012',
      'physical_fitment_verified',false)
where source_metadata->>'seed'='comil_cpi6c79_vw9150_mwm412_v1' and name='Sensor de pressao do rail';

-- Bico do injetor separado no catalogo Bosch.
insert into public.v2_vehicle_components(group_code,name,generic_name,oem_brand,manufacturer_part_number,location_description,function_description,data_status,source_metadata,failure_symptoms,diagnostic_notes,required_tools)
select 'engine_fuel','Bico do injetor common rail','nozzle common rail','Bosch','0 433 172 315','Dentro do injetor common rail','Elemento de pulverizacao do injetor','verified',
 jsonb_build_object('seed','comil_cpi6c79_vw9150_mwm412_v1','catalog_verification','verified_application_reference','catalog_source','Bosch Diesel Catalog 2019/2020','catalog_application','VW 9.150 EOD Electronic / 4.12 TCE / 4.7 L / 150 cv / 02.2004-02.2012','physical_fitment_verified',false),
 jsonb_build_array('fumaca','marcha irregular','retorno excessivo','perda de potencia'),
 jsonb_build_array('testar injetor em bancada apropriada','nao desmontar common rail contaminado sem ambiente limpo','confirmar codigo gravado no injetor antes de compra'),
 jsonb_build_array('bancada de injetores common rail','chaves para linha de alta','equipamento de limpeza controlada')
where not exists(select 1 from public.v2_vehicle_components where source_metadata->>'seed'='comil_cpi6c79_vw9150_mwm412_v1' and name='Bico do injetor common rail');

-- Retentores de motor/cambio/eixos por catalogo Corteco para 9.150 EOD MWM 4.12 TCE.
with seed(group_code,name,generic_name,oem_brand,oem_part_number,manufacturer_part_number,location_description,function_description,metadata) as (values
 ('engine','Retentor dianteiro do virabrequim','retentor virabrequim','MWM','TAC109215','Corteco 121V / 121S','Dianteira do virabrequim','Veda oleo no nariz do virabrequim',jsonb_build_object('dimensions','78x100x13/11 mm')),
 ('engine','Retentor traseiro do virabrequim','retentor virabrequim','MWM','TAE103209','Corteco 7343V / 7673T','Traseira do virabrequim','Veda oleo entre motor e volante',jsonb_build_object('dimensions','130x160x15 ou 130x160x13 mm; conferir revisao instalada')),
 ('transmission','Retentor eixo piloto cambio ZF S5-420 HD','retentor eixo piloto','ZF',null,'Corteco 7544N','Entrada da caixa ZF S5-420 HD','Veda eixo piloto da transmissao',jsonb_build_object('dimensions','48x65x10 mm')),
 ('transmission','Retentor saida cambio ZF S5-420 HD','retentor saida cambio','ZF',null,'Corteco 7324N','Saida traseira da caixa ZF S5-420 HD','Veda eixo de saida da transmissao',jsonb_build_object('dimensions','50x65x8 mm')),
 ('driveline','Retentor cubo dianteiro Meritor FC-845','retentor cubo roda','Meritor','2RD407641','Corteco 7753N','Cubo dianteiro','Veda lubrificante/contaminacao no cubo',jsonb_build_object('dimensions','56x84x8 mm','variant','Meritor FC-845')),
 ('driveline','Retentor cubo traseiro Dana 480','retentor cubo roda','Dana','2RE501313','Corteco 7745V','Cubo traseiro','Veda cubo traseiro',jsonb_build_object('dimensions','82.5x114.3x12.7 mm','variant','Dana 480 tambor')),
 ('driveline','Retentor cubo traseiro Meritor MS 13-113 HD','retentor cubo roda','Meritor','2RE501317','Corteco 7745V','Cubo traseiro','Veda cubo traseiro',jsonb_build_object('dimensions','82.5x114.3x12.7 mm','variant','Meritor MS 13-113 HD'))
)
insert into public.v2_vehicle_components(group_code,name,generic_name,oem_brand,oem_part_number,manufacturer_part_number,location_description,function_description,data_status,source_metadata,dimensions_spec,replacement_notes)
select s.group_code,s.name,s.generic_name,s.oem_brand,s.oem_part_number,s.manufacturer_part_number,s.location_description,s.function_description,'verified',
 jsonb_build_object('seed','comil_cpi6c79_vw9150_mwm412_v1','catalog_verification','verified_application_reference','catalog_source','Corteco heavy vehicle catalog - VW 9.150 EOD / MWM 4.12 TCE / ZF S5-420 HD','physical_fitment_verified',false),s.metadata,
 jsonb_build_array('Conferir eixo/cambio fisicamente antes de compra quando houver mais de uma variante de fornecedor.')
from seed s where not exists(select 1 from public.v2_vehicle_components c where c.source_metadata->>'seed'='comil_cpi6c79_vw9150_mwm412_v1' and c.name=s.name);

-- 3) MBJ1166: referencias CIPEC para Volare A6 primeira edicao / MWM Sprint.
update public.v2_vehicle_components
set oem_brand='Agrale/Volare', oem_part_number='6008001249009', manufacturer_part_number='CIPEC 022171', data_status='verified',
    source_metadata=coalesce(source_metadata,'{}'::jsonb)||jsonb_build_object(
      'catalog_verification','verified_application_reference','catalog_source','CIPEC Water Pumps catalog 2025/2026',
      'catalog_application','Volare A6 primeira edicao / bomba d agua MWM 4.0 TCA 4 cil','physical_fitment_verified',false)
where source_metadata->>'seed'='volare_mbj1166_a6_407tca_v1' and name='Bomba d agua';

with seed(group_code,name,generic_name,oem_brand,oem_part_number,manufacturer_part_number,location_description,function_description) as (values
 ('engine','Retentor traseiro do virabrequim','retentor virabrequim','Agrale/Volare','6008001091005','CIPEC 022369','Traseira do motor','Veda oleo na traseira do virabrequim'),
 ('transmission','Retentor eixo seletor do cambio','retentor seletor','Agrale/Volare','6001004090009','CIPEC 020152','Eixo seletor da transmissao','Veda o eixo seletor do cambio'),
 ('engine','Polia do virabrequim','polia virabrequim','Agrale/Volare','940703810064','CIPEC 014034','Dianteira do motor','Transmite movimento do virabrequim aos acessorios')
)
insert into public.v2_vehicle_components(group_code,name,generic_name,oem_brand,oem_part_number,manufacturer_part_number,location_description,function_description,data_status,source_metadata,replacement_notes)
select s.group_code,s.name,s.generic_name,s.oem_brand,s.oem_part_number,s.manufacturer_part_number,s.location_description,s.function_description,'verified',
 jsonb_build_object('seed','volare_mbj1166_a6_407tca_v1','catalog_verification','verified_application_reference','catalog_source','CIPEC Agrale/Volare catalog 2026','catalog_application','Volare A6 primeira edicao','physical_fitment_verified',false),
 jsonb_build_array('Confirmar codigo fisico no MBJ1166 antes da compra porque catalogos do A6 tiveram revisoes durante a producao.')
from seed s where not exists(select 1 from public.v2_vehicle_components c where c.source_metadata->>'seed'='volare_mbj1166_a6_407tca_v1' and c.name=s.name);

-- 4) BYH8J61: bomba d'agua OM314/LO608 com OE Mercedes confirmado em Motorservice.
update public.v2_vehicle_components
set oem_brand='Mercedes-Benz', oem_part_number='314.200.06.01', superseded_by_part_number='314.200.29.01',
    manufacturer_part_number='Motorservice 20160331400 / Schadek 20029 / Urba UB0029-UB0608', data_status='verified',
    source_metadata=coalesce(source_metadata,'{}'::jsonb)||jsonb_build_object(
      'catalog_verification','verified_application_reference','catalog_source','Motorservice catalog',
      'catalog_application','Mercedes-Benz LO 608 / OM314 / 3.8 L / 85 cv / 1973-1988','physical_fitment_verified',false)
where source_metadata->>'seed'='mb608_byh8j61_om314_v1' and name='Bomba d agua';

-- 5) Aplicacoes e vinculos para componentes novos; nunca promover o veiculo para verified sem evidencia fisica.
insert into public.v2_vehicle_component_applications(component_id,chassis_family,chassis_variant,engine_family,engine_code,model_year_from,model_year_to,notes,fitment_status,source_metadata)
select c.id,
 case when c.source_metadata->>'seed'='comil_cpi6c79_vw9150_mwm412_v1' then 'Volkswagen 9.150 EOD'
      when c.source_metadata->>'seed'='volare_mbj1166_a6_407tca_v1' then 'Marcopolo Volare'
      else 'Mercedes-Benz 608' end,
 case when c.source_metadata->>'seed'='comil_cpi6c79_vw9150_mwm412_v1' then 'CPI6C79 / 9BWD252R25R527468'
      when c.source_metadata->>'seed'='volare_mbj1166_a6_407tca_v1' then 'MBJ1166 / 93PB03A2MYC002968'
      else 'BYH8J61 / 30830311268441' end,
 case when c.source_metadata->>'seed'='comil_cpi6c79_vw9150_mwm412_v1' then 'MWM Acteon'
      when c.source_metadata->>'seed'='volare_mbj1166_a6_407tca_v1' then 'MWM Sprint Euro 2'
      else 'Mercedes-Benz OM314' end,
 case when c.source_metadata->>'seed'='comil_cpi6c79_vw9150_mwm412_v1' then '4.12 TCE'
      when c.source_metadata->>'seed'='volare_mbj1166_a6_407tca_v1' then '4.07 TCA'
      else 'OM314' end,
 case when c.source_metadata->>'seed'='comil_cpi6c79_vw9150_mwm412_v1' then 2004 when c.source_metadata->>'seed'='volare_mbj1166_a6_407tca_v1' then 1998 else 1973 end,
 case when c.source_metadata->>'seed'='comil_cpi6c79_vw9150_mwm412_v1' then 2012 when c.source_metadata->>'seed'='volare_mbj1166_a6_407tca_v1' then 2004 else 1988 end,
 'Referencia confirmada por catalogo de aplicacao; confirmar codigo fisico/variante instalada antes de compra.', 'candidate',
 jsonb_build_object('catalog_reference_verified',true,'physical_fitment_verified',false)
from public.v2_vehicle_components c
where c.source_metadata->>'catalog_verification'='verified_application_reference'
  and not exists(select 1 from public.v2_vehicle_component_applications a where a.component_id=c.id);

insert into public.v2_vehicle_component_links(company_id,vehicle_id,component_id,fitment_status,notes)
select v.company_id,v.id,c.id,'candidate','Referencia de catalogo confirmada; aplicacao fisica no veiculo ainda requer conferencia de codigo/plaqueta.'
from public.v2_vehicle_components c
join public.v2_vehicles v on upper(replace(v.plate,'-',''))=case c.source_metadata->>'seed'
  when 'comil_cpi6c79_vw9150_mwm412_v1' then 'CPI6C79'
  when 'volare_mbj1166_a6_407tca_v1' then 'MBJ1166'
  when 'mb608_byh8j61_om314_v1' then 'BYH8J61' end
where c.source_metadata->>'catalog_verification'='verified_application_reference'
on conflict(company_id,vehicle_id,component_id) do update set notes=excluded.notes;
