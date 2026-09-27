-- Comando 360 / Oficina 360
-- Catalogo inicial da Mercedes-Benz BYH8J61, ano/modelo 1975/1975.
-- Identidade confirmada por CRLV: chassi 30830311268441, motor serial 34393210035356,
-- diesel, 25 passageiros. Catalogos de aplicacao 1973-1988 suportam fortemente LO 608 + OM314 3.8 L.
-- O conjunto mecanico continua CANDIDATO ate conferencia de plaqueta/codigo fisico.

update public.v2_vehicle_technical_profiles p
set source_metadata=coalesce(p.source_metadata,'{}'::jsonb)||jsonb_build_object(
 'mechanical_variant_status','pending_physical_confirmation',
 'mechanical_variant_candidate','Mercedes-Benz LO 608 / LO 608 D',
 'engine_candidate','Mercedes-Benz OM314 / 3.8 L / L4 / injecao diesel mecanica direta',
 'transmission_candidate','Mercedes-Benz G2/24/5-6.71, 5 marchas + re',
 'rear_axle_candidate','Mercedes-Benz HL 2/5',
 'front_axle_candidate','Mercedes-Benz VL 1/3',
 'brake_system_candidate','Freio hidraulico com reforcador pneumatico (servo freio), circuito simples conforme literatura da epoca',
 'driveline_candidate','4x2 traseiro, cardan em duas secoes com suporte intermediario',
 'clutch_candidate','Monodisco seco, acionamento mecanico nas versoes antigas',
 'catalog_seed','mb608_byh8j61_om314_v1'
),updated_at=now()
from public.v2_vehicles v
where p.company_id=v.company_id and p.vehicle_id=v.id
 and upper(replace(coalesce(v.plate,''),'-',''))='BYH8J61';

with seed(group_code,name,generic_name,brand,location_description,function_description) as (values
 ('engine','Bloco do motor OM314','bloco do motor','Mercedes-Benz','Conjunto central do motor','Estrutura principal do motor'),
 ('engine','Cabecote OM314','cabecote','Mercedes-Benz','Parte superior do motor','Aloja valvulas, balancins e galerias'),
 ('engine','Junta do cabecote','junta de cabecote','Mercedes-Benz','Entre bloco e cabecote','Veda combustao, oleo e agua'),
 ('engine','Tampa de valvulas','tampa de valvulas','Mercedes-Benz','Topo do motor','Fecha e veda o trem de valvulas'),
 ('engine','Pistao','pistao','Mercedes-Benz','Interior do cilindro','Recebe pressao da combustao'),
 ('engine','Jogo de aneis do pistao','aneis de pistao','Mercedes-Benz','Canaletas do pistao','Veda compressao e controla oleo'),
 ('engine','Biela','biela','Mercedes-Benz','Entre pistao e virabrequim','Transmite esforco ao virabrequim'),
 ('engine','Bronzina de biela','bronzina de biela','Mercedes-Benz','Mancal da biela','Forma mancal de deslizamento'),
 ('engine','Virabrequim','virabrequim','Mercedes-Benz','Parte inferior do bloco','Converte movimento em rotacao'),
 ('engine','Bronzina de mancal','bronzina de mancal','Mercedes-Benz','Mancais principais','Apoia o virabrequim'),
 ('engine','Comando de valvulas','arvore de comando','Mercedes-Benz','Lateral/interna do motor','Comanda valvulas'),
 ('engine','Tucho de valvula','tucho','Mercedes-Benz','Trem de valvulas','Transmite movimento do comando'),
 ('engine','Balancins','balancim','Mercedes-Benz','Topo do cabecote','Acionam valvulas'),
 ('engine','Volante do motor','volante','Mercedes-Benz','Traseira do motor','Transmite torque a embreagem'),
 ('engine','Coxins do motor','coxim','Mercedes-Benz','Suportes motor/chassi','Sustentam e isolam vibracoes'),

 ('engine_air','Filtro de ar seco','filtro de ar','Mercedes-Benz','Admissao do motor','Retem particulas do ar'),
 ('engine_air','Carcaca do filtro de ar','caixa do filtro','Mercedes-Benz','Admissao','Aloja e veda elemento filtrante'),
 ('engine_air','Coletor de admissao','coletor de admissao','Mercedes-Benz','Lado de admissao do cabecote','Distribui ar aos cilindros'),
 ('engine_air','Mangueira/duto de admissao','duto de admissao','Mercedes-Benz','Filtro para coletor','Conduz ar filtrado'),

 ('engine_fuel','Tanque de combustivel','tanque diesel','Mercedes-Benz','Chassi','Armazena diesel'),
 ('engine_fuel','Pescador e boia de combustivel','pescador/boia','Mercedes-Benz','Interior do tanque','Capta diesel e informa nivel'),
 ('engine_fuel','Filtro de combustivel','filtro diesel','Mercedes-Benz','Linha de alimentacao','Retem contaminantes'),
 ('engine_fuel','Pre-filtro de combustivel','pre-filtro diesel','Mercedes-Benz','Antes da bomba alimentadora','Retem contaminantes grossos'),
 ('engine_fuel','Bomba alimentadora','bomba de transferencia','Mercedes-Benz/Bosch','Motor/sistema de combustivel','Alimenta a bomba injetora'),
 ('engine_fuel','Bomba injetora linear Bosch','bomba injetora','Bosch','Lateral do motor','Dosagem e pressurizacao mecanica do diesel; modelo exato a confirmar'),
 ('engine_fuel','Bico injetor mecanico','injetor diesel','Bosch/Mercedes-Benz','Cabecote, um por cilindro','Pulveriza diesel'),
 ('engine_fuel','Tubos de alta pressao','tubos de injecao','Mercedes-Benz','Bomba para injetores','Conduzem diesel em alta pressao'),
 ('engine_fuel','Tubos de retorno dos bicos','retorno diesel','Mercedes-Benz','Injetores para retorno','Retornam excedente de combustivel'),

 ('engine_cooling','Radiador','radiador','Mercedes-Benz','Frente do veiculo','Dissipa calor do liquido'),
 ('engine_cooling','Bomba d agua','bomba centrifuga','Mercedes-Benz','Frente/lateral do motor','Circula liquido de arrefecimento'),
 ('engine_cooling','Valvula termostatica','termostato','Mercedes-Benz','Saida de agua','Regula fluxo conforme temperatura'),
 ('engine_cooling','Ventilador mecanico','ventilador','Mercedes-Benz','Frente do motor','Forca ar pelo radiador'),
 ('engine_cooling','Correia em V do ventilador/bomba','correia V','Mercedes-Benz','Polias dianteiras','Aciona acessorios do arrefecimento'),
 ('engine_cooling','Mangueira superior do radiador','mangueira','Mercedes-Benz','Motor-radiador','Conduz liquido quente'),
 ('engine_cooling','Mangueira inferior do radiador','mangueira','Mercedes-Benz','Radiador-motor','Retorna liquido resfriado'),
 ('engine_cooling','Indicador/sensor de temperatura','sensor de temperatura','Mercedes-Benz','Motor/painel','Informa temperatura ao motorista'),

 ('engine_lubrication','Bomba de oleo','bomba de oleo','Mercedes-Benz','Interior do motor','Pressuriza lubrificacao'),
 ('engine_lubrication','Filtro de oleo','filtro de oleo','Mercedes-Benz','Lateral do motor','Retem contaminantes'),
 ('engine_lubrication','Carter de oleo','carter','Mercedes-Benz','Parte inferior','Armazena oleo'),
 ('engine_lubrication','Pescador da bomba de oleo','pescador de oleo','Mercedes-Benz','Interior do carter','Capta oleo para a bomba'),
 ('engine_lubrication','Interruptor de pressao de oleo','cebolinha de oleo','Mercedes-Benz','Galeria de oleo','Aciona aviso de baixa pressao'),
 ('engine_lubrication','Respiro do carter','respiro do motor','Mercedes-Benz','Motor','Ventila gases do carter'),

 ('exhaust','Coletor de escape','coletor de escape','Mercedes-Benz','Lado de escape','Reune gases dos cilindros'),
 ('exhaust','Tubo dianteiro do escape','tubo de escape','Mercedes-Benz','Coletor para linha de escape','Conduz gases'),
 ('exhaust','Silencioso','muffler','Mercedes-Benz/carroceria','Linha de escape','Reduz ruido'),
 ('exhaust','Tubo traseiro do escape','tubo final','Mercedes-Benz/carroceria','Apos silencioso','Descarga gases para fora da carroceria'),

 ('transmission','Disco de embreagem','disco de embreagem','Mercedes-Benz','Entre motor e cambio','Transmite torque'),
 ('transmission','Plato de embreagem','plato','Mercedes-Benz','Volante do motor','Prensa o disco'),
 ('transmission','Rolamento de embreagem','rolamento de acionamento','Mercedes-Benz','Campana','Aciona o plato'),
 ('transmission','Garfo de embreagem','garfo','Mercedes-Benz','Campana','Transmite movimento ao rolamento'),
 ('transmission','Pedal e varoes/cabos de embreagem','acionamento mecanico','Mercedes-Benz','Cabine para embreagem','Aciona embreagem; literatura indica mecanico nas versoes antigas'),
 ('transmission','Cambio G2/24/5-6.71','caixa de cambio','Mercedes-Benz','Apos a embreagem','5 marchas sincronizadas + re; candidato'),
 ('transmission','Alavanca e trambulador do cambio','mecanismo seletor','Mercedes-Benz','Cabine/cambio','Seleciona marchas'),

 ('driveline','Cardan dianteiro','arvore de transmissao','Mercedes-Benz','Cambio ao mancal central','Primeira secao do cardan'),
 ('driveline','Mancal central do cardan','mancal de apoio','Mercedes-Benz','Travessa do chassi','Apoia cardan em duas secoes'),
 ('driveline','Cardan traseiro','arvore de transmissao','Mercedes-Benz','Mancal ao diferencial','Segunda secao do cardan'),
 ('driveline','Cruzeta do cardan','junta universal','Mercedes-Benz','Articulacoes do cardan','Permite variacao angular'),
 ('driveline','Diferencial HL 2/5','diferencial','Mercedes-Benz','Eixo traseiro','Distribui torque; relacao/configuracao a confirmar'),
 ('driveline','Semi-eixo traseiro','semi-eixo','Mercedes-Benz','Eixo traseiro','Transmite torque do diferencial a roda'),

 ('brakes','Compressor de ar do servo freio','compressor de ar','Mercedes-Benz','Motor','Fornece ar ao reforcador pneumatico'),
 ('brakes','Reservatorio de ar do freio','tanque de ar','Mercedes-Benz','Chassi','Armazena ar para o servo freio'),
 ('brakes','Servo freio pneumatico','reforcador pneumatico','Mercedes-Benz','Sistema de freio','Amplifica esforco hidraulico'),
 ('brakes','Cilindro mestre de freio','cilindro mestre','Mercedes-Benz','Pedal/circuito hidraulico','Gera pressao hidraulica'),
 ('brakes','Tambor de freio dianteiro','tambor de freio','Mercedes-Benz','Cubos dianteiros','Superficie de atrito'),
 ('brakes','Tambor de freio traseiro','tambor de freio','Mercedes-Benz','Cubos traseiros','Superficie de atrito'),
 ('brakes','Sapatas/lonas dianteiras','sapatas de freio','Mercedes-Benz','Freios dianteiros','Geram atrito'),
 ('brakes','Sapatas/lonas traseiras','sapatas de freio','Mercedes-Benz','Freios traseiros','Geram atrito'),
 ('brakes','Cilindro de roda dianteiro','cilindro de roda','Mercedes-Benz','Freios dianteiros','Expande sapatas'),
 ('brakes','Cilindro de roda traseiro','cilindro de roda','Mercedes-Benz','Freios traseiros','Expande sapatas'),
 ('brakes','Freio de estacionamento','freio mecanico','Mercedes-Benz','Transmissao/eixo conforme configuracao','Mantem veiculo parado'),

 ('steering','Caixa de direcao','caixa de direcao','Mercedes-Benz','Longarina dianteira','Converte giro do volante em esterco; tipo exato a confirmar'),
 ('steering','Coluna de direcao','coluna','Mercedes-Benz','Volante para caixa','Transmite movimento'),
 ('steering','Barra de direcao','barra de direcao','Mercedes-Benz','Eixo dianteiro','Transmite movimento as rodas'),
 ('steering','Terminais de direcao','terminal','Mercedes-Benz','Extremidades das barras','Articulam sistema de direcao'),

 ('suspension','Feixe de molas dianteiro','mola longitudinal','Mercedes-Benz','Suspensao dianteira','Suporta carga'),
 ('suspension','Amortecedor dianteiro','amortecedor hidraulico','Mercedes-Benz','Suspensao dianteira','Controla oscilacoes'),
 ('suspension','Barra estabilizadora dianteira','barra estabilizadora','Mercedes-Benz','Eixo dianteiro','Reduz inclinacao lateral'),
 ('suspension','Feixe de molas traseiro','mola longitudinal','Mercedes-Benz','Suspensao traseira','Suporta carga'),
 ('suspension','Amortecedor traseiro','amortecedor hidraulico','Mercedes-Benz','Suspensao traseira','Controla oscilacoes'),

 ('electrical','Alternador','alternador','Bosch/Mercedes-Benz','Acessorio do motor','Gera energia eletrica'),
 ('electrical','Motor de partida','motor de arranque','Bosch/Mercedes-Benz','Motor/campana','Aciona motor na partida'),
 ('electrical','Bateria','bateria','Mercedes-Benz','Compartimento de bateria','Fornece energia'),
 ('electrical','Chave de ignicao','comutador','Mercedes-Benz','Painel','Comanda alimentacao/partida'),
 ('electrical','Painel de instrumentos','painel','Mercedes-Benz/carroceria','Posto do motorista','Exibe instrumentos e avisos'),

 ('body','Farol dianteiro','farol','Mercedes-Benz/carroceria','Frente','Iluminacao'),
 ('body','Lanterna traseira','lanterna','Carroceria','Traseira','Sinalizacao'),
 ('body','Mecanismo da porta de passageiros','porta/mecanismo','Carroceria','Lateral','Abertura e fechamento da porta')
)
insert into public.v2_vehicle_components(group_code,name,generic_name,oem_brand,location_description,function_description,data_status,source_metadata)
select s.group_code,s.name,s.generic_name,s.brand,s.location_description,s.function_description,'reference_pending',jsonb_build_object('seed','mb608_byh8j61_om314_v1','oem_code_verified',false,'physical_fitment_verified',false,'reference_level','family_application')
from seed s where not exists(select 1 from public.v2_vehicle_components c where c.source_metadata->>'seed'='mb608_byh8j61_om314_v1' and c.group_code=s.group_code and c.name=s.name);

insert into public.v2_vehicle_component_applications(component_id,chassis_family,chassis_variant,engine_family,engine_code,model_year_from,model_year_to,notes,fitment_status,source_metadata)
select c.id,'Mercedes-Benz 608','LO 608 candidato / chassis 30830311268441','Mercedes-Benz','OM314',1973,1988,'Aplicacao candidata conforme catalogos LO 608/OM314. Confirmar plaqueta, codigo fisico e modificacoes acumuladas desde 1975 antes da compra.','candidate',jsonb_build_object('vehicle_plate_reference','BYH8J61','vehicle_engine_serial','34393210035356','vehicle_vin','30830311268441','physical_confirmation_required',true)
from public.v2_vehicle_components c where c.source_metadata->>'seed'='mb608_byh8j61_om314_v1'
 and not exists(select 1 from public.v2_vehicle_component_applications a where a.component_id=c.id and a.chassis_variant='LO 608 candidato / chassis 30830311268441');

insert into public.v2_vehicle_component_links(company_id,vehicle_id,component_id,fitment_status,notes)
select v.company_id,v.id,c.id,'candidate','Catalogo inicial da BYH8J61; devido a idade do veiculo, conferir conjunto instalado/codigo fisico antes de compra.' from public.v2_vehicles v join public.v2_vehicle_components c on c.source_metadata->>'seed'='mb608_byh8j61_om314_v1'
where upper(replace(coalesce(v.plate,''),'-',''))='BYH8J61'
on conflict(company_id,vehicle_id,component_id) do nothing;