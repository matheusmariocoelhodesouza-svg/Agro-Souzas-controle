-- Comando 360 / Oficina 360
-- Catalogo inicial do VW/Comil Pia O CPI6C79, ano/modelo 2005/2005.
-- Identidade fisica confirmada por CRLV + laudo Detran-SP:
-- VIN/chassi 9BWD252R25R527468, motor serial D1A001816, 150 cv, diesel, 28 lugares.
--
-- A aplicacao mecanica VW 9.150 EOD + MWM Acteon 4.12 TCE e fortemente suportada
-- por catalogos de aplicacao para 2004-2012, mas permanece CANDIDATA ate confirmacao
-- da plaqueta/codigo fisico do conjunto mecanico. O mesmo vale para cambio, eixos,
-- direcao e componentes de freio com variantes por fornecedor.

update public.v2_vehicle_technical_profiles p
set source_metadata = coalesce(p.source_metadata,'{}'::jsonb) || jsonb_build_object(
  'mechanical_variant_status','pending_physical_confirmation',
  'mechanical_variant_candidate','Volkswagen 9.150 EOD / MWM Acteon 4.12 TCE',
  'engine_candidate','MWM Acteon Serie 12 / 4.12 TCE / 4.8 L / 8V / L4 / common rail / turbo-intercooler',
  'transmission_candidate','ZF S5-420 HD, 5 marchas',
  'steering_candidate','ZF Servocom 8090',
  'front_axle_candidates',jsonb_build_array('Meritor MFS7','Meritor FC-845'),
  'rear_axle_candidates',jsonb_build_array('Dana 284','Dana 480','Meritor MS 13-113'),
  'brake_system_candidate','Freio a ar, S-cam, tambor dianteiro e traseiro, circuito duplo',
  'electrical_system_candidate','24 V; alternador 28 V / 80 A; 2 baterias 12 V / 100 Ah',
  'reference_evidence',jsonb_build_array(
    'MWM Serie 12 / 4.12 TCE technical literature',
    'Bosch application bulletin: VW 9.150 EOD 2004-2012 / 4.12 TCE',
    'Motorservice application catalog: VW 9.150 EOD / 4.12 TCE / 150 cv',
    'Volkswagen chassis technical data compiled from manufacturer manual references'
  ),
  'catalog_seed','comil_cpi6c79_vw9150_mwm412_v1'
), updated_at=now()
from public.v2_vehicles v
where p.company_id=v.company_id and p.vehicle_id=v.id
  and upper(replace(coalesce(v.plate,''),'-',''))='CPI6C79';

with seed(group_code, name, generic_name, brand, location_description, function_description) as (
  values
    ('engine','Bloco do motor','bloco do motor','MWM International','Conjunto central do motor','Estrutura principal que aloja cilindros, virabrequim e galerias'),
    ('engine','Cabecote','cabecote','MWM International','Parte superior do motor','Aloja valvulas, balancins e passagens de admissao/escape'),
    ('engine','Junta do cabecote','junta de cabecote','MWM International','Entre bloco e cabecote','Veda combustao, oleo e liquido de arrefecimento'),
    ('engine','Tampa de valvulas','tampa de valvulas','MWM International','Topo do cabecote','Fecha e veda o trem de valvulas'),
    ('engine','Camisa de cilindro','camisa de cilindro','MWM International','Bloco do motor, uma por cilindro','Forma a superficie de trabalho dos cilindros'),
    ('engine','Pistao','pistao','MWM International','Interior de cada cilindro','Converte pressao da combustao em movimento alternado'),
    ('engine','Jogo de aneis do pistao','aneis de pistao','MWM International','Canaletas dos pistoes','Veda compressao e controla oleo na parede do cilindro'),
    ('engine','Biela','biela','MWM International','Entre pistao e virabrequim','Transmite o esforco do pistao ao virabrequim'),
    ('engine','Bronzina de biela','bronzina de biela','MWM International','Mancal da biela no virabrequim','Forma o mancal de deslizamento da biela'),
    ('engine','Virabrequim','virabrequim','MWM International','Parte inferior do bloco','Converte movimento alternado dos pistoes em rotacao'),
    ('engine','Bronzina de mancal','bronzina de mancal','MWM International','Mancais principais do bloco','Apoia o virabrequim no bloco'),
    ('engine','Comando de valvulas','arvore de comando','MWM International','Cabecote/bloco conforme configuracao','Sincroniza abertura e fechamento das valvulas'),
    ('engine','Conjunto de balancins','balancins','MWM International','Topo do cabecote','Transmite movimento do comando para as valvulas'),
    ('engine','Volante do motor','volante do motor','MWM International','Traseira do motor junto ao cambio','Armazena inercia e transmite torque para a embreagem'),

    ('engine_air','Filtro de ar do motor','filtro de ar','Volkswagen','Admissao, antes do turbo','Retem poeira e particulas do ar admitido'),
    ('engine_air','Carcaca do filtro de ar','caixa do filtro de ar','Volkswagen','Compartimento dianteiro do chassi','Aloja e veda o elemento filtrante'),
    ('engine_air','Coletor de admissao','coletor de admissao','MWM International','Lado de admissao do cabecote','Distribui o ar para os quatro cilindros'),
    ('engine_air','Sensor combinado de pressao/temperatura do ar','sensor MAP/IAT','MWM International','Coletor/circuito de admissao','Informa pressao e temperatura do ar a ECU'),
    ('engine_air','Mangote de admissao antes do turbo','mangueira de admissao','Volkswagen','Entre filtro de ar e turbocompressor','Conduz ar filtrado ate o turbo'),

    ('engine_turbo','Turbocompressor','turbo','MWM International','Entre coletor de escape e admissao','Eleva a massa de ar admitida usando energia dos gases de escape'),
    ('engine_turbo','Intercooler','resfriador de ar de carga','Volkswagen','Frente do veiculo, entre turbo e coletor','Reduz a temperatura do ar comprimido'),
    ('engine_turbo','Mangueiras de pressurizacao','mangueiras do intercooler','Volkswagen','Entre turbo, intercooler e coletor','Transportam o ar pressurizado; vazamentos causam perda de potencia'),

    ('engine_fuel','Pre-filtro/separador de agua do diesel','separador de agua','Volkswagen','Linha de baixa pressao do combustivel','Retem agua e contaminantes antes do sistema principal'),
    ('engine_fuel','Filtro principal de combustivel','filtro diesel','MWM International','Linha de alimentacao do motor','Protege bomba de alta e injetores contra contaminacao'),
    ('engine_fuel','Bomba de alimentacao de baixa pressao','bomba de transferencia','MWM International','Circuito de combustivel antes da bomba de alta','Alimenta o sistema common rail em baixa pressao'),
    ('engine_fuel','Bomba de alta pressao common rail','bomba de alta','MWM International','Motor, acionada mecanicamente','Gera a alta pressao do sistema de injecao'),
    ('engine_fuel','Rail de combustivel','flauta common rail','MWM International','Lado do cabecote','Acumula e distribui diesel sob alta pressao'),
    ('engine_fuel','Sensor de pressao do rail','sensor de pressao de combustivel','MWM International','Rail de combustivel','Mede a pressao real do common rail'),
    ('engine_fuel','Valvula reguladora de pressao do combustivel','regulador de pressao','MWM International','Bomba/rail conforme variante','Controla a pressao do sistema common rail'),
    ('engine_fuel','Injetor common rail','bico injetor','MWM International','Cabecote, um por cilindro','Doseia e pulveriza o diesel na camara de combustao'),
    ('engine_fuel','Tubos de alta pressao dos injetores','tubos de alta pressao','MWM International','Entre rail e injetores','Conduzem combustivel em alta pressao'),
    ('engine_fuel','Modulo de controle do motor (ECU)','ECM/ECU do motor','MWM International','Compartimento eletrico do chassi/motor','Controla injecao, pressao do rail e estrategias do motor'),

    ('engine_cooling','Radiador do motor','radiador','Volkswagen','Frente do veiculo','Dissipa calor do liquido de arrefecimento'),
    ('engine_cooling','Bomba d agua','bomba de arrefecimento','MWM International','Parte frontal/lateral do motor','Circula o liquido de arrefecimento'),
    ('engine_cooling','Valvula termostatica','termostato','MWM International','Saida de agua do motor','Regula o fluxo conforme a temperatura'),
    ('engine_cooling','Sensor de temperatura do liquido','sensor ECT','MWM International','Motor/circuito de arrefecimento','Informa temperatura do motor a ECU'),
    ('engine_cooling','Ventilador do radiador','ventoinha mecanica','Volkswagen','Entre motor e radiador','Forca passagem de ar pelo radiador'),
    ('engine_cooling','Reservatorio de expansao','reservatorio de arrefecimento','Volkswagen','Compartimento dianteiro do chassi','Compensa expansao e permite nivel/pressurizacao do sistema'),
    ('engine_cooling','Mangueira superior do radiador','mangueira de arrefecimento','Volkswagen','Entre motor e parte superior do radiador','Conduz liquido quente ao radiador'),
    ('engine_cooling','Mangueira inferior do radiador','mangueira de arrefecimento','Volkswagen','Entre radiador e entrada da bomba d agua','Retorna liquido resfriado ao motor'),

    ('engine_lubrication','Bomba de oleo','bomba de lubrificacao','MWM International','Parte inferior/frontal do motor','Pressuriza o circuito de lubrificacao'),
    ('engine_lubrication','Filtro de oleo do motor','filtro de oleo','MWM International','Lateral do bloco','Remove contaminantes do oleo lubrificante'),
    ('engine_lubrication','Resfriador de oleo','trocador de calor do oleo','MWM International','Bloco/circuito de arrefecimento','Controla a temperatura do oleo'),
    ('engine_lubrication','Sensor/interruptor de pressao do oleo','sensor de pressao do oleo','MWM International','Galeria principal de lubrificacao','Monitora pressao do oleo'),
    ('engine_lubrication','Carter de oleo','carter','MWM International','Parte inferior do motor','Armazena o oleo do motor'),
    ('engine_lubrication','Respiro/separador de oleo do carter','respiro do carter','MWM International','Parte superior/lateral do motor','Controla vapores do carter e retorno de oleo'),

    ('exhaust','Coletor de escape','coletor de escape','MWM International','Lado de escape do cabecote','Reune gases dos cilindros e alimenta o turbo'),
    ('exhaust','Valvula borboleta do freio motor','freio motor de escape','Volkswagen','Tubo de escape proximo ao motor','Cria contrapressao para auxiliar a desaceleracao'),
    ('exhaust','Atuador eletropneumatico do freio motor','atuador do freio motor','Volkswagen','Conjunto da borboleta do escape','Aciona a valvula do freio motor'),
    ('exhaust','Silencioso do escapamento','muffler/silencioso','Volkswagen/Comil','Linha de escape sob a carroceria','Reduz ruido dos gases de escape'),

    ('transmission','Disco de embreagem 330 mm','disco de embreagem','Valeo','Entre motor e cambio','Transmite torque por atrito ao eixo primario'),
    ('transmission','Plato de embreagem','plato/pressao de embreagem','Valeo','Volante do motor','Prensa o disco de embreagem contra o volante'),
    ('transmission','Rolamento de embreagem','rolamento de acionamento','Valeo','Campana do cambio','Transmite o esforco do acionamento ao plato'),
    ('transmission','Cilindro mestre da embreagem','mestre de embreagem','Volkswagen','Pedal da embreagem','Converte movimento do pedal em pressao hidraulica'),
    ('transmission','Cilindro atuador da embreagem','atuador de embreagem','Volkswagen','Campana/acionamento da embreagem','Move o mecanismo de desengate'),
    ('transmission','Cambio manual ZF S5-420 HD','caixa de cambio','ZF','Apos a embreagem','Transmite torque em cinco relacoes a frente e uma re; variante candidata'),
    ('transmission','Trambulador e varoes do cambio','mecanismo seletor de marchas','Volkswagen/Comil','Entre alavanca e caixa de cambio','Transmite selecao de marchas ate a transmissao'),

    ('driveline','Eixo cardan','arvore de transmissao','Volkswagen','Entre cambio e eixo traseiro','Leva torque da transmissao ao diferencial'),
    ('driveline','Cruzeta do cardan','junta universal','Volkswagen','Articulacoes do cardan','Permite variacao angular durante movimento da suspensao'),
    ('driveline','Mancal central do cardan','rolamento de apoio do cardan','Volkswagen','Longarina/travessa do chassi','Apoia cardan multipartido quando aplicado'),
    ('driveline','Conjunto diferencial traseiro','diferencial','Dana/Meritor','Eixo traseiro motriz','Distribui torque as rodas traseiras; fornecedor a confirmar'),

    ('brakes','Compressor de ar Knorr LK38','compressor de ar','Knorr-Bremse','Acessorio acionado pelo motor','Gera ar comprimido para o sistema de freios'),
    ('brakes','Secador de ar / Consep','secador de ar','Volkswagen','Linha entre compressor e reservatorios','Remove umidade e contaminantes; configuracao/opcional a confirmar'),
    ('brakes','Reservatorios de ar','tanques de ar','Volkswagen','Chassi','Armazenam ar comprimido dos circuitos de freio'),
    ('brakes','Valvula do pedal de freio','valvula de servico','Volkswagen','Sob/ao redor do pedal','Modula pressao para os circuitos dianteiro e traseiro'),
    ('brakes','Came S do freio dianteiro','eixo expansor S-cam','Volkswagen/Meritor','Freios dianteiros','Expande as sapatas contra o tambor'),
    ('brakes','Came S do freio traseiro','eixo expansor S-cam','Volkswagen/Meritor','Freios traseiros','Expande as sapatas contra o tambor'),
    ('brakes','Tambor de freio dianteiro','tambor de freio','Volkswagen/Meritor','Cubos dianteiros','Superficie de atrito do freio dianteiro'),
    ('brakes','Tambor de freio traseiro','tambor de freio','Volkswagen/Meritor','Cubos traseiros','Superficie de atrito do freio traseiro'),
    ('brakes','Jogo de sapatas dianteiras','lonas/sapatas de freio','Volkswagen/Meritor','Freios dianteiros','Gera atrito contra o tambor dianteiro'),
    ('brakes','Jogo de sapatas traseiras','lonas/sapatas de freio','Volkswagen/Meritor','Freios traseiros','Gera atrito contra o tambor traseiro'),
    ('brakes','Camara de mola acumuladora traseira','spring brake chamber','Volkswagen','Eixo traseiro','Atua freio de estacionamento e emergencia'),

    ('steering','Caixa de direcao ZF Servocom 8090','caixa de direcao hidraulica','ZF','Longarina dianteira','Converte movimento do volante em esterco assistido; variante candidata'),
    ('steering','Bomba hidraulica da direcao','bomba de direcao','Volkswagen','Acessorio do motor','Fornece pressao para a direcao assistida'),
    ('steering','Reservatorio de fluido da direcao','reservatorio hidraulico','Volkswagen','Compartimento dianteiro','Armazena fluido do sistema de direcao'),
    ('steering','Barra de direcao','barra longitudinal/transversal','Volkswagen/Meritor','Eixo dianteiro','Transmite movimento da caixa de direcao as rodas'),

    ('suspension','Feixe de molas dianteiro','mola semieliptica','Volkswagen','Suspensao dianteira','Suporta carga e permite movimento do eixo dianteiro'),
    ('suspension','Amortecedor dianteiro','amortecedor telescopico','Volkswagen','Suspensao dianteira','Controla oscilacoes das molas'),
    ('suspension','Barra estabilizadora dianteira','barra estabilizadora','Volkswagen','Suspensao dianteira','Reduz inclinacao lateral da carroceria'),
    ('suspension','Feixe de molas traseiro','mola semieliptica','Volkswagen','Suspensao traseira','Suporta carga do eixo traseiro'),
    ('suspension','Mola auxiliar traseira','mola auxiliar/parabolica','Volkswagen','Suspensao traseira','Complementa capacidade de carga progressiva'),
    ('suspension','Amortecedor traseiro','amortecedor telescopico','Volkswagen','Suspensao traseira','Controla oscilacoes do eixo traseiro'),

    ('electrical','Alternador 28 V / 80 A','alternador','Bosch/Volkswagen','Acessorio do motor','Gera energia eletrica para sistema nominal de 24 V'),
    ('electrical','Motor de partida','motor de arranque','Bosch/Volkswagen','Campana do motor/cambio','Aciona o motor durante a partida'),
    ('electrical','Bateria 12 V / 100 Ah - unidade 1','bateria','Volkswagen','Banco de baterias','Primeira bateria do conjunto em serie para 24 V'),
    ('electrical','Bateria 12 V / 100 Ah - unidade 2','bateria','Volkswagen','Banco de baterias','Segunda bateria do conjunto em serie para 24 V'),
    ('electrical','Sensor de rotacao do virabrequim','sensor CKP','MWM International','Motor, referencia de rotacao','Informa velocidade e posicao do virabrequim a ECU'),
    ('electrical','Sensor de fase do comando','sensor CMP','MWM International','Motor/cabecote','Informa fase do comando a ECU')
)
insert into public.v2_vehicle_components (
  group_code, name, generic_name, oem_brand,
  location_description, function_description,
  data_status, source_metadata
)
select
  s.group_code, s.name, s.generic_name, s.brand,
  s.location_description, s.function_description,
  'reference_pending',
  jsonb_build_object(
    'seed','comil_cpi6c79_vw9150_mwm412_v1',
    'oem_code_verified',false,
    'physical_fitment_verified',false,
    'reference_level','family_application'
  )
from seed s
where not exists (
  select 1 from public.v2_vehicle_components c
  where c.source_metadata->>'seed'='comil_cpi6c79_vw9150_mwm412_v1'
    and c.group_code=s.group_code and c.name=s.name
);

insert into public.v2_vehicle_component_applications (
  component_id, chassis_family, chassis_variant, engine_family, engine_code,
  model_year_from, model_year_to, notes, fitment_status, source_metadata
)
select
  c.id,
  'Volkswagen 9.150 EOD',
  'Comil Pia O / chassis 9BWD252R25R527468',
  'MWM Acteon Serie 12',
  '4.12 TCE',
  2004,
  2012,
  'Aplicacao tecnica candidata para a familia VW 9.150 EOD/MWM 4.12 TCE. Confirmar plaqueta/codigo fisico e fornecedor antes da compra.',
  'candidate',
  jsonb_build_object(
    'vehicle_plate_reference','CPI6C79',
    'vehicle_engine_serial','D1A001816',
    'vehicle_vin','9BWD252R25R527468',
    'application_evidence','cross-catalog',
    'physical_confirmation_required',true
  )
from public.v2_vehicle_components c
where c.source_metadata->>'seed'='comil_cpi6c79_vw9150_mwm412_v1'
  and not exists (
    select 1 from public.v2_vehicle_component_applications a
    where a.component_id=c.id
      and a.chassis_variant='Comil Pia O / chassis 9BWD252R25R527468'
  );

insert into public.v2_vehicle_component_links (
  company_id, vehicle_id, component_id, fitment_status, notes
)
select
  v.company_id, v.id, c.id, 'candidate',
  'Catalogo inicial do CPI6C79. Identidade do veiculo confirmada; referencia mecanica/fornecedor da peca requer validacao fisica antes da compra.'
from public.v2_vehicles v
join public.v2_vehicle_components c
  on c.source_metadata->>'seed'='comil_cpi6c79_vw9150_mwm412_v1'
where upper(replace(coalesce(v.plate,''),'-',''))='CPI6C79'
on conflict (company_id, vehicle_id, component_id) do nothing;
