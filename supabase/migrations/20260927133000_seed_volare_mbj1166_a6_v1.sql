-- Comando 360 / Oficina 360
-- Catalogo inicial do Marcopolo/Volare MBJ1166, ano/modelo 2000/2000.
-- Identidade confirmada por CRLV: chassi 93PB03A2MYC002968, motor serial 40704030141,
-- diesel, 131 cv, 19 passageiros, 2 eixos, CMT 10 t.
-- Pela combinacao ano/potencia e catalogos de aplicacao, Volare A6 + MWM Sprint 4.07 TCA
-- e candidato forte. Cambio/direcao e variantes de A/C permanecem candidatos ate plaqueta.

update public.v2_vehicle_technical_profiles p
set source_metadata = coalesce(p.source_metadata,'{}'::jsonb) || jsonb_build_object(
  'mechanical_variant_status','pending_physical_confirmation',
  'mechanical_variant_candidate','Marcopolo Volare A6 131 cv',
  'engine_candidate','MWM Sprint 4.07 TCA / 2.8 L / L4 / turbo-intercooler',
  'transmission_candidate','Clark CL-2615 C, mecanico, 5 marchas + re',
  'steering_candidate','ZF Servocom 8090 hidraulica',
  'ac_variant_status','pending_confirmation',
  'mwm_application_candidates',jsonb_build_array('36.01','36.02','36.03','36.04','36.07','36.08','36.09','36.10'),
  'reference_evidence',jsonb_build_array(
    'Marcopolo/Volare A6 131 cv technical data',
    'MWM Sprint 4.07 TCA application catalog',
    'Tecfil application catalog Volare A6 2000-2001'
  ),
  'catalog_seed','volare_mbj1166_a6_407tca_v1'
), updated_at=now()
from public.v2_vehicles v
where p.company_id=v.company_id and p.vehicle_id=v.id
  and upper(replace(coalesce(v.plate,''),'-',''))='MBJ1166';

with seed(group_code,name,generic_name,brand,location_description,function_description) as (
 values
 ('engine','Bloco do motor','bloco do motor','MWM','Conjunto central do motor','Estrutura principal do motor'),
 ('engine','Cabecote','cabecote','MWM','Parte superior do motor','Aloja valvulas, balancins e galerias'),
 ('engine','Junta do cabecote','junta do cabecote','MWM','Entre bloco e cabecote','Veda combustao, oleo e arrefecimento'),
 ('engine','Tampa de valvulas','tampa de valvulas','MWM','Topo do cabecote','Fecha e veda o trem de valvulas'),
 ('engine','Pistao','pistao','MWM','Interior do cilindro','Recebe pressao da combustao'),
 ('engine','Jogo de aneis','aneis de pistao','MWM','Canaletas dos pistoes','Veda compressao e controla oleo'),
 ('engine','Biela','biela','MWM','Entre pistao e virabrequim','Transmite esforco ao virabrequim'),
 ('engine','Bronzina de biela','bronzina','MWM','Mancal da biela','Mancal de deslizamento'),
 ('engine','Virabrequim','virabrequim','MWM','Parte inferior do motor','Converte movimento alternado em rotacao'),
 ('engine','Bronzina de mancal','bronzina de mancal','MWM','Mancais principais','Apoia o virabrequim'),
 ('engine','Comando de valvulas','comando de valvulas','MWM','Motor/cabecote','Sincroniza abertura das valvulas'),
 ('engine','Balancins de admissao','balancim','MWM','Trem de valvulas','Transmite movimento para valvulas de admissao'),
 ('engine','Balancins de escape','balancim','MWM','Trem de valvulas','Transmite movimento para valvulas de escape'),
 ('engine','Volante do motor','volante','MWM','Traseira do motor','Transmite torque para a embreagem'),
 ('engine','Coxins do motor','coxim','Marcopolo/Volare','Suportes do motor no chassi','Isolam vibracao e sustentam o conjunto'),

 ('engine_air','Filtro de ar','filtro de ar','Volare/MWM','Antes do turbo','Retem particulas do ar admitido'),
 ('engine_air','Carcaca do filtro de ar','caixa do filtro','Volare','Compartimento dianteiro','Aloja e veda o elemento filtrante'),
 ('engine_air','Coletor de admissao','coletor de admissao','MWM','Lado de admissao do motor','Distribui ar aos cilindros'),
 ('engine_air','Mangueira de admissao','mangote de admissao','Volare','Filtro para turbo','Conduz ar filtrado'),

 ('engine_turbo','Turbocompressor','turbo','MWM','Escape/admissao','Eleva a massa de ar admitida'),
 ('engine_turbo','Intercooler','resfriador de ar','Volare','Frente do veiculo','Resfria o ar comprimido'),
 ('engine_turbo','Mangueiras do intercooler','mangueiras de pressurizacao','Volare','Turbo-intercooler-coletor','Conduzem ar pressurizado'),

 ('engine_fuel','Tanque de combustivel','tanque diesel','Volare','Chassi','Armazena diesel'),
 ('engine_fuel','Pescador e boia do tanque','pescador/boia','Volare','Interior do tanque','Capta combustivel e informa nivel'),
 ('engine_fuel','Filtro de combustivel','filtro diesel','MWM','Linha de combustivel','Retem contaminantes'),
 ('engine_fuel','Separador de agua','pre-filtro diesel','Volare/MWM','Linha de alimentacao','Retem agua antes da bomba'),
 ('engine_fuel','Bomba alimentadora','bomba de transferencia','MWM','Sistema de injecao','Alimenta a bomba injetora'),
 ('engine_fuel','Bomba injetora mecanica','bomba de injecao','MWM/Bosch','Motor','Dosagem e pressurizacao do diesel; modelo exato a confirmar'),
 ('engine_fuel','Bico injetor','injetor diesel mecanico','MWM/Bosch','Cabecote','Pulveriza diesel na camara'),
 ('engine_fuel','Tubos de alta dos bicos','tubos de injecao','MWM','Bomba para injetores','Conduzem diesel em alta pressao'),

 ('engine_cooling','Radiador','radiador','Volare','Frente do veiculo','Dissipa calor do arrefecimento'),
 ('engine_cooling','Bomba d agua','bomba de arrefecimento','MWM','Motor','Circula liquido de arrefecimento'),
 ('engine_cooling','Valvula termostatica','termostato','MWM','Saida de agua','Regula temperatura do motor'),
 ('engine_cooling','Ventilador do radiador','ventilador','Volare/MWM','Entre motor e radiador','Forca fluxo de ar'),
 ('engine_cooling','Reservatorio de expansao','reservatorio','Volare','Compartimento dianteiro','Compensa expansao do liquido'),
 ('engine_cooling','Mangueira superior do radiador','mangueira','Volare','Motor para radiador','Conduz liquido quente'),
 ('engine_cooling','Mangueira inferior do radiador','mangueira','Volare','Radiador para motor','Retorna liquido resfriado'),
 ('engine_cooling','Sensor/interruptor de temperatura','sensor de temperatura','MWM/Volare','Circuito de arrefecimento','Informa temperatura ao painel/sistema'),

 ('engine_lubrication','Bomba de oleo','bomba de oleo','MWM','Motor','Pressuriza circuito de lubrificacao'),
 ('engine_lubrication','Filtro de oleo','filtro de oleo','MWM','Lateral do motor','Retem contaminantes do oleo'),
 ('engine_lubrication','Carter de oleo','carter','MWM','Parte inferior','Armazena oleo lubrificante'),
 ('engine_lubrication','Interruptor de pressao do oleo','cebolinha do oleo','MWM','Galeria de oleo','Monitora pressao minima'),
 ('engine_lubrication','Respiro do carter','respiro/antichama','MWM','Parte superior do motor','Ventila o carter e separa vapores de oleo'),

 ('exhaust','Coletor de escape','coletor de escape','MWM','Cabecote para turbo','Reune gases dos cilindros'),
 ('exhaust','Tubo de escape','tubulacao de escape','Volare','Sob o veiculo','Conduz gases para o silencioso'),
 ('exhaust','Silencioso','muffler','Volare','Linha de escape','Reduz ruido'),

 ('transmission','Disco de embreagem','disco de embreagem','Volare','Entre motor e cambio','Transmite torque por atrito'),
 ('transmission','Plato de embreagem','plato','Volare','Volante do motor','Prensa o disco'),
 ('transmission','Rolamento de embreagem','rolamento de acionamento','Volare','Campana do cambio','Aciona o plato'),
 ('transmission','Cambio Clark CL-2615 C','caixa de cambio','Clark','Apos a embreagem','Cambio mecanico 5+re; candidato'),
 ('transmission','Trambulador do cambio','mecanismo seletor','Volare/Clark','Entre alavanca e cambio','Transmite selecao de marchas'),

 ('driveline','Cardan','arvore de transmissao','Volare','Cambio para diferencial','Transmite torque ao eixo traseiro'),
 ('driveline','Cruzeta do cardan','junta universal','Volare','Articulacoes do cardan','Permite variacao angular'),
 ('driveline','Mancal central do cardan','mancal de apoio','Volare','Travessa do chassi','Apoia cardan quando multipartido'),
 ('driveline','Diferencial traseiro','diferencial','Volare','Eixo traseiro','Distribui torque as rodas; modelo a confirmar'),

 ('brakes','Servo-freio/hidrovacuo','servo do freio','Volare','Sistema de freio','Auxilia o acionamento; configuracao exata a confirmar'),
 ('brakes','Cilindro mestre de freio','cilindro mestre','Volare','Pedal/sistema hidraulico','Gera pressao hidraulica'),
 ('brakes','Tambor de freio dianteiro','tambor','Volare','Cubos dianteiros','Superficie de atrito'),
 ('brakes','Tambor de freio traseiro','tambor','Volare','Cubos traseiros','Superficie de atrito'),
 ('brakes','Sapatas/lonas dianteiras','sapatas de freio','Volare','Freios dianteiros','Geram atrito no tambor'),
 ('brakes','Sapatas/lonas traseiras','sapatas de freio','Volare','Freios traseiros','Geram atrito no tambor'),
 ('brakes','Cilindro de roda dianteiro','cilindro de roda','Volare','Freios dianteiros','Expande sapatas'),
 ('brakes','Cilindro de roda traseiro','cilindro de roda','Volare','Freios traseiros','Expande sapatas'),

 ('steering','Caixa de direcao ZF Servocom 8090','caixa de direcao hidraulica','ZF','Dianteira/chassi','Assistencia hidraulica; candidata'),
 ('steering','Bomba hidraulica tandem','bomba de direcao/vacuo','Volare/MWM','Acessorio do motor','Fornece pressao para direcao e vacuo conforme variante'),
 ('steering','Reservatorio da direcao','reservatorio hidraulico','Volare','Compartimento dianteiro','Armazena fluido da direcao'),
 ('steering','Barras e terminais de direcao','barra/terminal','Volare','Eixo dianteiro','Transmitem esterco as rodas'),

 ('suspension','Feixe de molas dianteiro','mola parabolica','Volare','Suspensao dianteira','Suporta carga do eixo dianteiro'),
 ('suspension','Amortecedor dianteiro','amortecedor','Volare','Suspensao dianteira','Controla oscilacoes'),
 ('suspension','Feixe de molas traseiro','feixe de molas','Volare','Suspensao traseira','Suporta carga traseira'),
 ('suspension','Amortecedor traseiro','amortecedor','Volare','Suspensao traseira','Controla oscilacoes'),

 ('electrical','Alternador','alternador','Volare/MWM','Acessorio do motor','Gera energia e recarrega bateria'),
 ('electrical','Motor de partida','motor de arranque','Volare/MWM','Campana do motor/cambio','Aciona motor na partida'),
 ('electrical','Bateria','bateria','Volare','Compartimento de bateria','Fornece energia de partida'),
 ('electrical','Chave de ignicao','comutador de ignicao','Volare','Painel/coluna','Comanda alimentacao e partida'),
 ('electrical','Painel de instrumentos','cluster','Volare','Posto do motorista','Exibe parametros do veiculo'),

 ('body','Farol dianteiro','farol','Volare','Frente da carroceria','Iluminacao de rodagem'),
 ('body','Lanterna traseira','lanterna','Volare','Traseira da carroceria','Sinalizacao traseira'),
 ('body','Mecanismo da porta de passageiros','porta/mecanismo','Volare','Lateral da carroceria','Abertura e fechamento da porta'),

 ('hvac','Compressor do ar-condicionado','compressor A/C','Volare','Motor/suporte de acessorios','Comprime fluido refrigerante; somente se equipado'),
 ('hvac','Condensador do ar-condicionado','condensador','Volare','Frente/teto conforme versao','Rejeita calor do refrigerante; somente se equipado'),
 ('hvac','Evaporador do ar-condicionado','evaporador','Volare','Interior/teto conforme versao','Resfria o ar da cabine/salao; somente se equipado')
)
insert into public.v2_vehicle_components(group_code,name,generic_name,oem_brand,location_description,function_description,data_status,source_metadata)
select s.group_code,s.name,s.generic_name,s.brand,s.location_description,s.function_description,'reference_pending',
 jsonb_build_object('seed','volare_mbj1166_a6_407tca_v1','oem_code_verified',false,'physical_fitment_verified',false,'reference_level','family_application')
from seed s
where not exists(select 1 from public.v2_vehicle_components c where c.source_metadata->>'seed'='volare_mbj1166_a6_407tca_v1' and c.group_code=s.group_code and c.name=s.name);

insert into public.v2_vehicle_component_applications(component_id,chassis_family,chassis_variant,engine_family,engine_code,model_year_from,model_year_to,notes,fitment_status,source_metadata)
select c.id,'Marcopolo Volare','A6 131 cv / chassis 93PB03A2MYC002968','MWM Sprint','4.07 TCA',1999,2002,
 'Aplicacao candidata pela combinacao ano/potencia/chassi. Confirmar plaqueta, variante MWM e codigo fisico antes da compra.','candidate',
 jsonb_build_object('vehicle_plate_reference','MBJ1166','vehicle_engine_serial','40704030141','vehicle_vin','93PB03A2MYC002968','physical_confirmation_required',true)
from public.v2_vehicle_components c
where c.source_metadata->>'seed'='volare_mbj1166_a6_407tca_v1'
 and not exists(select 1 from public.v2_vehicle_component_applications a where a.component_id=c.id and a.chassis_variant='A6 131 cv / chassis 93PB03A2MYC002968');

insert into public.v2_vehicle_component_links(company_id,vehicle_id,component_id,fitment_status,notes)
select v.company_id,v.id,c.id,'candidate','Catalogo inicial do MBJ1166; confirmar aplicacao e codigo fisico antes de compra.'
from public.v2_vehicles v join public.v2_vehicle_components c on c.source_metadata->>'seed'='volare_mbj1166_a6_407tca_v1'
where upper(replace(coalesce(v.plate,''),'-',''))='MBJ1166'
on conflict(company_id,vehicle_id,component_id) do nothing;