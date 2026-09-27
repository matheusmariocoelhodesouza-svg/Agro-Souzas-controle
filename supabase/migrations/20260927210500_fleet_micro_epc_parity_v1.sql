-- Oficina 360: aprofunda Comil, Volare e 608 para granularidade comparavel a Sprinter.
-- IMPORTANTE: os novos microcomponentes sao estruturais/estimados. Nao representam codigo OEM confirmado,
-- quantidade oficial ou fitment fisico. Todos permanecem nao-compraveis ate validacao por EPC/peca instalada.

with cfg as (
  select * from (values
    ('CPI6C79','comil_cpi6c79_vw9150_mwm412_v1','Volkswagen 9.150 EOD','Comil Pia O / chassis 9BWD252R25R527468','MWM Acteon','4.12 TCE',2004,2012),
    ('MBJ1166','volare_mbj1166_a6_407tca_v1','Marcopolo Volare','A6 131 cv / chassis 93PB03A2MYC002968','MWM Sprint','4.07 TCA',1999,2002),
    ('BYH8J61','mb608_byh8j61_om314_v1','Mercedes-Benz 608','LO 608 candidato / chassis 30830311268441','Mercedes-Benz OM314','OM314',1973,1988)
  ) x(plate,parent_seed,chassis_family,chassis_variant,engine_family,engine_code,year_from,year_to)
), patterns as (
  select group_code,suffix,ordinality::int ord
  from (values
    ('engine',array['kit de fixadores do conjunto','junta de interface','suporte de montagem','bucha associada','rolamento associado','arruela ou calco de ajuste','trava ou anel de retencao','tampao ou fecho','protecao ou defletor','pino ou guia de posicionamento','vedacao secundaria','kit de reparo do conjunto']),
    ('engine_air',array['mangueira ou duto de entrada','mangueira ou duto de saida','abracadeira de entrada','abracadeira de saida','suporte de montagem','kit de fixadores','vedacao de interface','conector ou sensor de interface quando aplicavel','presilhas de duto','cotovelo ou acoplamento','protetor do conjunto','kit de reparo']),
    ('engine_turbo',array['junta de entrada','junta de saida','prisioneiros e porcas','suporte de montagem','protecao termica','mangueira de comando','linha de oleo de alimentacao quando aplicavel','linha de retorno de oleo quando aplicavel','abracadeiras','vedacao de pressurizacao','atuador ou interface quando aplicavel','kit de reparo']),
    ('engine_fuel',array['conexao de entrada','conexao de saida','linha de alimentacao','linha de retorno','vedacao ou O-ring','suporte de montagem','kit de fixadores','presilha de linha','conector eletrico quando aplicavel','valvula de retencao quando aplicavel','tampa ou tampao','kit de reparo']),
    ('engine_cooling',array['mangueira de entrada','mangueira de saida','abracadeira de entrada','abracadeira de saida','junta ou vedacao','suporte de montagem','kit de fixadores','dreno ou sangrador','conector de sensor quando aplicavel','tubo auxiliar','protetor ou defletor','kit de reparo']),
    ('engine_lubrication',array['junta de vedacao','O-ring de vedacao','linha de oleo de entrada','linha de oleo de saida','suporte de montagem','kit de fixadores','tampao de servico','mola ou valvula interna quando aplicavel','conector de sensor quando aplicavel','retentor associado','protetor do conjunto','kit de reparo']),
    ('exhaust',array['junta de uniao','abracadeira','suporte de escape','coxim de escape','prisioneiros e porcas','protecao termica','junta flexivel quando aplicavel','anel de vedacao','linha ou mangueira de atuador quando aplicavel','dreno quando aplicavel','bracket de sustentacao','kit de reparo']),
    ('transmission',array['rolamento associado','retentor associado','anel elastico de retencao','espacador ou calco','bucha associada','kit de fixadores','tampa e junta de acesso','tampao de lubrificacao','interface de seletor ou atuador','suporte de montagem','mola ou detente','kit de reparo']),
    ('driveline',array['rolamento associado','retentor associado','flange ou garfo de interface','kit de fixadores','calcos de ajuste','anel de retencao','bucha associada','graxeira quando aplicavel','suporte de montagem','guarda-po ou vedacao','porca e arruela de retencao','kit de reparo']),
    ('brakes',array['mola associada','pino e bucha associados','vedacao ou reparo','mangueira ou linha','conexao ou uniao','ajustador quando aplicavel','kit de fixadores','protetor contra po','mola de retorno','sangrador ou conexao de ar','suporte de montagem','kit de reparo']),
    ('steering',array['bucha associada','retentor ou vedacao','mangueira de alta quando aplicavel','mangueira de retorno quando aplicavel','conexao hidraulica','kit de fixadores','suporte de montagem','coifa ou guarda-po','rolamento associado','calco de ajuste','porca ou trava de retencao','kit de reparo']),
    ('suspension',array['bucha associada','pino associado','grampo ou U-bolt quando aplicavel','porcas de fixacao','arruelas de fixacao','suporte de montagem','batente associado','coifa ou guarda-po','espacador ou calco','presilha ou trava','graxeira quando aplicavel','kit de reparo']),
    ('electrical',array['conector eletrico','terminal de reparo','ramal de chicote','fusivel associado quando aplicavel','rele associado quando aplicavel','suporte de montagem','kit de fixadores','cabo ou ponto de aterramento','conduite de protecao','presilha de chicote','vedacao ou passa-fio','ponto de teste eletrico']),
    ('body',array['parafusos de fixacao','porcas de fixacao','arruelas de fixacao','presilhas ou clips','borracha ou vedacao','suporte de montagem','dobradica ou pivo quando aplicavel','interface de trava ou fechadura quando aplicavel','acabamento associado','conector eletrico quando aplicavel','capa ou protecao','kit de reparo']),
    ('hvac',array['O-ring de vedacao','linha ou mangueira de entrada','linha ou mangueira de saida','suporte de montagem','kit de fixadores','conector eletrico','sensor ou atuador quando aplicavel','abracadeira','mangueira de dreno','isolamento termico','vedacao da caixa ou flange','kit de reparo'])
  ) p(group_code,parts)
  cross join lateral unnest(parts) with ordinality u(suffix,ordinality)
), base as (
  select cfg.*,v.company_id,v.id vehicle_id,c.id parent_component_id,c.group_code,c.name parent_name,c.failure_symptoms,c.diagnostic_notes,c.required_tools
  from cfg join public.v2_vehicles v on upper(replace(coalesce(v.plate,''),'-',''))=cfg.plate
  join public.v2_vehicle_component_links l on l.company_id=v.company_id and l.vehicle_id=v.id
  join public.v2_vehicle_components c on c.id=l.component_id
  where c.source_metadata->>'seed'=cfg.parent_seed
), expanded as (
  select b.*,p.suffix,p.ord,b.parent_name||' — '||p.suffix child_name,
         b.plate||'-MICRO-'||substr(md5(b.parent_component_id::text),1,12) view_code
  from base b join patterns p on p.group_code=b.group_code
)
insert into public.v2_vehicle_components(group_code,name,generic_name,location_description,function_description,failure_symptoms,diagnostic_notes,required_tools,torque_spec,exploded_view_reference,data_status,component_type,service_priority,replacement_notes,source_metadata)
select e.group_code,e.child_name,e.suffix,'Subcomponente do conjunto: '||e.parent_name,
 'Microcomponente estruturado. Confirmar existencia, quantidade e codigo na peca instalada/EPC antes de compra.',
 coalesce(e.failure_symptoms,'[]'::jsonb),coalesce(e.diagnostic_notes,'[]'::jsonb)||jsonb_build_array('Referencia micro-EPC estruturada; nao prova fitment fisico.'),coalesce(e.required_tools,'[]'::jsonb),
 jsonb_build_object('status','manual_required'),e.view_code,'estimated',
 case when lower(e.suffix) like '%parafus%' then 'bolt' when lower(e.suffix) like '%porca%' then 'nut' when lower(e.suffix) like '%arruela%' then 'washer' when lower(e.suffix) like '%o-ring%' then 'o_ring' when lower(e.suffix) like '%junta%' then 'gasket' when lower(e.suffix) like '%retentor%' or lower(e.suffix) like '%vedacao%' then 'seal' when lower(e.suffix) like '%rolamento%' then 'bearing' when lower(e.suffix) like '%bucha%' then 'bushing' when lower(e.suffix) like '%mola%' then 'spring' when lower(e.suffix) like '%mangueira%' then 'hose' when lower(e.suffix) like '%linha%' or lower(e.suffix) like '%tubo%' then 'pipe' when lower(e.suffix) like '%conector%' or lower(e.suffix) like '%terminal%' then 'connector' when lower(e.suffix) like '%chicote%' or lower(e.suffix) like '%cabo%' then 'wire' when lower(e.suffix) like '%sensor%' then 'sensor' when lower(e.suffix) like '%atuador%' then 'actuator' when lower(e.suffix) like '%presilha%' or lower(e.suffix) like '%trava%' then 'clip' else 'part' end,
 case when e.group_code in ('brakes','steering','suspension') then 'high' when e.group_code in ('engine','engine_fuel','transmission','driveline') then 'medium' else 'normal' end,
 jsonb_build_array('Nao comprar por esta descricao isolada. Confirmar codigo OEM/fornecedor, medida e variante instalada.'),
 jsonb_build_object('seed','fleet_micro_epc_parity_v1','plate',e.plate,'parent_seed',e.parent_seed,'parent_component_id',e.parent_component_id::text,'parent_name',e.parent_name,'micro_suffix',e.suffix,'micro_ordinal',e.ord,'micro_depth','sprinter_parity','orderable',false,'exactness','estimated')
from expanded e
where not exists(select 1 from public.v2_vehicle_components x where x.source_metadata->>'seed'='fleet_micro_epc_parity_v1' and x.source_metadata->>'plate'=e.plate and x.source_metadata->>'parent_component_id'=e.parent_component_id::text and x.source_metadata->>'micro_ordinal'=e.ord::text);

with cfg as (select * from (values
 ('CPI6C79','Volkswagen 9.150 EOD','Comil Pia O / chassis 9BWD252R25R527468','MWM Acteon','4.12 TCE',2004,2012),
 ('MBJ1166','Marcopolo Volare','A6 131 cv / chassis 93PB03A2MYC002968','MWM Sprint','4.07 TCA',1999,2002),
 ('BYH8J61','Mercedes-Benz 608','LO 608 candidato / chassis 30830311268441','Mercedes-Benz OM314','OM314',1973,1988)) x(plate,chassis_family,chassis_variant,engine_family,engine_code,year_from,year_to))
insert into public.v2_vehicle_component_applications(component_id,chassis_family,chassis_variant,engine_family,engine_code,model_year_from,model_year_to,notes,fitment_status,source_metadata)
select c.id,cfg.chassis_family,cfg.chassis_variant,cfg.engine_family,cfg.engine_code,cfg.year_from,cfg.year_to,'Micro-EPC estruturado; aplicacao fisica e codigo pendentes.','candidate',jsonb_build_object('seed','fleet_micro_epc_parity_v1','plate',cfg.plate,'physical_confirmation_required',true)
from public.v2_vehicle_components c join cfg on cfg.plate=c.source_metadata->>'plate'
where c.source_metadata->>'seed'='fleet_micro_epc_parity_v1' and not exists(select 1 from public.v2_vehicle_component_applications a where a.component_id=c.id and a.source_metadata->>'seed'='fleet_micro_epc_parity_v1');

insert into public.v2_vehicle_component_links(company_id,vehicle_id,component_id,fitment_status,notes)
select v.company_id,v.id,c.id,'candidate','Micro-EPC estimado; validar codigo/medida/variante antes de compra.' from public.v2_vehicle_components c join public.v2_vehicles v on upper(replace(coalesce(v.plate,''),'-',''))=c.source_metadata->>'plate' where c.source_metadata->>'seed'='fleet_micro_epc_parity_v1' on conflict(company_id,vehicle_id,component_id) do nothing;

with cfg as (select * from (values
 ('CPI6C79','comil_cpi6c79_vw9150_mwm412_v1','Volkswagen 9.150 EOD','Comil Pia O / chassis 9BWD252R25R527468','4.12 TCE'),
 ('MBJ1166','volare_mbj1166_a6_407tca_v1','Marcopolo Volare','A6 131 cv / chassis 93PB03A2MYC002968','4.07 TCA'),
 ('BYH8J61','mb608_byh8j61_om314_v1','Mercedes-Benz 608','LO 608 candidato / chassis 30830311268441','OM314')) x(plate,parent_seed,chassis_family,chassis_variant,engine_code)), parents as (
 select distinct cfg.*,c.id parent_component_id,c.group_code,c.name parent_name,cfg.plate||'-MICRO-'||substr(md5(c.id::text),1,12) view_code
 from cfg join public.v2_vehicles v on upper(replace(coalesce(v.plate,''),'-',''))=cfg.plate join public.v2_vehicle_component_links l on l.company_id=v.company_id and l.vehicle_id=v.id join public.v2_vehicle_components c on c.id=l.component_id where c.source_metadata->>'seed'=cfg.parent_seed)
insert into public.v2_vehicle_exploded_views(group_code,chassis_family,chassis_variant,engine_code,assembly_code,title,subtitle,source_name,image_license_status,verification_status,notes,source_metadata)
select p.group_code,p.chassis_family,p.chassis_variant,p.engine_code,p.view_code,p.parent_name||' — micro-EPC','Decomposicao estruturada em subcomponentes candidatos.','Oficina 360 — micro-EPC estruturado','generated','estimated','Nao e desenho oficial do fabricante; confirmar EPC/peca fisica para codigo, quantidade e geometria.',jsonb_build_object('seed','fleet_micro_epc_parity_v1','plate',p.plate,'parent_component_id',p.parent_component_id::text,'micro_depth','sprinter_parity','official_epc',false) from parents p where not exists(select 1 from public.v2_vehicle_exploded_views ev where ev.assembly_code=p.view_code);

with p as (select ev.id exploded_view_id,(ev.source_metadata->>'parent_component_id')::uuid component_id from public.v2_vehicle_exploded_views ev where ev.source_metadata->>'seed'='fleet_micro_epc_parity_v1')
insert into public.v2_vehicle_exploded_view_items(exploded_view_id,component_id,item_number,parent_item_number,quantity,component_type,position_note,exactness_status,source_metadata)
select p.exploded_view_id,p.component_id,'00',null,1,'assembly','Conjunto pai da micro-vista.','reference_pending',jsonb_build_object('seed','fleet_micro_epc_parity_v1','role','parent') from p where not exists(select 1 from public.v2_vehicle_exploded_view_items i where i.exploded_view_id=p.exploded_view_id and i.component_id=p.component_id and i.item_number='00');

with r as (select ev.id exploded_view_id,c.id component_id,lpad((c.source_metadata->>'micro_ordinal')::text,2,'0') item_number,c.component_type from public.v2_vehicle_components c join public.v2_vehicle_exploded_views ev on ev.assembly_code=c.exploded_view_reference where c.source_metadata->>'seed'='fleet_micro_epc_parity_v1' and ev.source_metadata->>'seed'='fleet_micro_epc_parity_v1')
insert into public.v2_vehicle_exploded_view_items(exploded_view_id,component_id,item_number,parent_item_number,quantity,component_type,position_note,exactness_status,source_metadata)
select r.exploded_view_id,r.component_id,r.item_number,'00',null,r.component_type,'Subcomponente candidato; confirmar presenca, quantidade, medida e codigo.','estimated',jsonb_build_object('seed','fleet_micro_epc_parity_v1','official_item_number',false,'orderable',false) from r where not exists(select 1 from public.v2_vehicle_exploded_view_items i where i.exploded_view_id=r.exploded_view_id and i.component_id=r.component_id and i.item_number=r.item_number);
