-- Sprinter 313 CDI W903 / OM611.981: EGR, respiro, arrefecimento, sincronismo e elétrica v2

update public.v2_vehicle_components
set oem_part_number='A6110900954',
    manufacturer_part_number='Pierburg 7.24809.34.0 / Magneti Marelli EV120C',
    location_description='Conjunto EGR no circuito entre escape e admissão; comandado pelo gerenciamento eletrônico do motor.',
    function_description='Recircula parte dos gases de escape para a admissão conforme comando da ECU.',
    failure_symptoms='["perda de força","modo de emergência","fumaça excessiva","marcha lenta irregular","EGR travada aberta ou fechada"]'::jsonb,
    diagnostic_notes='["Comparar comando da EGR e massa de ar no scanner.","Inspecionar carbonização, mangueiras de vácuo/comando e passagem da admissão.","No OM611 há variações por mercado/ano; não comprar a válvula somente por este código sem confirmar a peça instalada ou EPC por VIN."]'::jsonb,
    required_tools='["scanner com dados ao vivo","bomba de vácuo quando aplicável","multímetro","ferramentas de inspeção/limpeza"]'::jsonb,
    exploded_view_reference='EGR Mercedes 6110900954 / Pierburg 7.24809.34.0; aplicação OM611.981 documentada, mas versão brasileira tardia exige conferência física/VIN.',
    data_status='estimated',
    source_metadata=source_metadata || jsonb_build_object(
      'oem_code_verified',false,'confidence','engine_family_cross_reference',
      'oem_equivalents',jsonb_build_array('A6110900954'),
      'manufacturer_equivalents',jsonb_build_array('Pierburg 7.24809.34.0','Magneti Marelli EV120C'),
      'verification_note','A6110900954 aparece para Sprinter 313/OM611.981 em catálogos europeus; a Sprinter brasileira 2010/2011 prolonga a plataforma W903, então a peça instalada deve ser conferida antes da compra.',
      'sources',jsonb_build_array(
        jsonb_build_object('label','Plenty.Parts 6110900954','url','https://plenty.parts/parts/mercedes-benz/exhaust-gas-recirculation-egr/6110900954'),
        jsonb_build_object('label','Magneti Marelli EGR application catalog','url','https://www.magnetimarelli-parts-and-services.dk/content/dam/mmamps/italy/products/ricambi/electricandelectronics/Parts_EGR_Valves.pdf')
      )
    ),updated_at=now()
where name='Válvula EGR' and source_metadata->>'seed'='sprinter_w903_om611';

update public.v2_vehicle_components
set oem_part_number='A6110160134',
    manufacturer_part_number='Separador de óleo / respiro do cárter',
    location_description='Na tampa de válvulas/cabeçote, ligado ao sistema de ventilação do cárter e à admissão.',
    function_description='Separa óleo dos vapores do cárter e devolve os gases à admissão.',
    failure_symptoms='["vazamento de óleo no respiro","óleo excessivo na admissão","mangueiras meladas","pressão anormal no cárter"]'::jsonb,
    diagnostic_notes='["Inspecionar a carcaça, vedação e mangueiras por trinca/entupimento.","Óleo no circuito de turbo pode vir do respiro, mas também pode indicar problema de turbina; avaliar os dois sistemas.","Se houver muita pressão no cárter, investigar blow-by do motor além do separador."]'::jsonb,
    required_tools='["lanterna","alicate para abraçadeiras","manômetro de cárter quando necessário"]'::jsonb,
    exploded_view_reference='A6110160134 — respiro/antichama original da Sprinter 311/313/413 2002-2012.',
    data_status='verified',
    source_metadata=source_metadata || jsonb_build_object(
      'oem_code_verified',true,'confidence','high',
      'oem_equivalents',jsonb_build_array('A6110160134','6110160134'),
      'verification_note','Fonte de peças para Sprinter lista A6110160134 como respiro tampa de válvula/antichama original para 311/313/413 2002-2012.',
      'sources',jsonb_build_array(
        jsonb_build_object('label','Motors Vans A6110160134','url','https://www.motorsvans.com.br/sprinter/mecanica/respiro/respiro-sprinter-0212-tampa-valvula-cdi'),
        jsonb_build_object('label','Mercado Livre aplicação OM611 313','url','https://lista.mercadolivre.com.br/anti-chama-sprinter-313-cdi')
      )
    ),updated_at=now()
where name='Separador/respiro do cárter' and source_metadata->>'seed'='sprinter_w903_om611';

update public.v2_vehicle_components
set oem_part_number='A6112000501 / A6112000801 / A6112001101 / A6112001601',
    manufacturer_part_number='SKF VKPC 88850 / Indisa 7000404001',
    location_description='Parte frontal/lateral do motor, acionada pela correia de acessórios.',
    function_description='Faz circular o líquido de arrefecimento pelo bloco, cabeçote e radiador.',
    failure_symptoms='["superaquecimento","vazamento de líquido","ruído de rolamento","folga no eixo da bomba"]'::jsonb,
    diagnostic_notes='["Verificar vazamento pelo dreno e folga no rolamento.","Conferir correia, tensionador e polias junto com a bomba.","Há várias supersessões da bomba OM611; confirmar desenho/código antes da compra."]'::jsonb,
    required_tools='["ferramentas de correia de acessórios","torquímetro","bandeja para fluido"]'::jsonb,
    exploded_view_reference='Família A6112000501/0801/1101/1601 — bomba d’água OM611, Sprinter 311/313/413 2002-2012.',
    data_status='estimated',
    source_metadata=source_metadata || jsonb_build_object(
      'oem_code_verified',false,'confidence','catalog_cross_reference',
      'oem_equivalents',jsonb_build_array('A6112000501','A6112000801','A6112001101','A6112001601'),
      'manufacturer_equivalents',jsonb_build_array('SKF VKPC 88850','Indisa 7000404001'),
      'verification_note','Aplicação OM611 313 2011 confirmada em catálogo brasileiro; existem quatro referências Mercedes relacionadas, então o código físico/VIN deve definir a peça final.',
      'sources',jsonb_build_array(
        jsonb_build_object('label','Regicar bomba OM611 2002-2012','url','https://regicarautopecas.com.br/produto/bomba-agua-mercedes-benz-sprinter-cdi-311-313-413-2-2-16v-tb-diesel-2002-2012-mt-om-611/17760?cat=1054'),
        jsonb_build_object('label','TAGA A6112001101 aplicação 313 2011','url','https://www.tagaautopartes.com.br/produtos/bomba-agua-sprinter-21634-6112001101-108844')
      )
    ),updated_at=now()
where name='Bomba d’água' and source_metadata->>'seed'='sprinter_w903_om611';

update public.v2_vehicle_components
set oem_part_number='A0005426218 / A0051532328 / A0051536328',
    manufacturer_part_number='MTE-Thomson 4251',
    location_description='No circuito de arrefecimento/cabeçote, sensor roscado M14 x 1,5 com 2 vias.',
    function_description='Informa à ECU a temperatura do líquido de arrefecimento.',
    failure_symptoms='["ventoinha/comando térmico irregular","partida fria ruim","consumo aumentado","temperatura implausível no scanner"]'::jsonb,
    diagnostic_notes='["Com motor frio, comparar leitura do sensor com temperatura ambiente.","Conferir resistência/sinal, chicote e conector antes de trocar.","Sensor especificado com 2 terminais e rosca M14 x 1,5."]'::jsonb,
    required_tools='["scanner","multímetro","chave 19 mm"]'::jsonb,
    connector_spec=connector_spec || '{"pins":2,"thread":"M14x1.5","wrench_mm":19}'::jsonb,
    exploded_view_reference='MTE-Thomson 4251 / Mercedes A0005426218-A0051532328-A0051536328; aplicação Sprinter OM611 Brasil.',
    data_status='verified',
    source_metadata=source_metadata || jsonb_build_object(
      'oem_code_verified',true,'confidence','high',
      'oem_equivalents',jsonb_build_array('A0005426218','A0051532328','A0051536328'),
      'manufacturer_equivalents',jsonb_build_array('MTE-Thomson 4251'),
      'connector_pins',2,'thread','M14x1.5',
      'verification_note','MTE-Thomson lista Sprinter 2.2 OM611 Brasil e os três códigos OE; Fusão Diesel confirma aplicação 313/413 OM611 2002-2012.',
      'sources',jsonb_build_array(
        jsonb_build_object('label','MTE-Thomson 4251','url','https://cate.mte-thomson.com.br/en/br/produto/detalhes/4251/engine-coolant-temperature-sensor'),
        jsonb_build_object('label','Fusão Diesel sensor OM611','url','https://www.fusaodiesel.com.br/produtos/sensor-temperatura-sprinter-313-413-cdi-om611-0005426218/')
      )
    ),updated_at=now()
where name='Sensor de temperatura do líquido de arrefecimento' and source_metadata->>'seed'='sprinter_w903_om611';

update public.v2_vehicle_components
set oem_part_number='A6462001215',
    manufacturer_part_number='87 °C • família Mahle/Gates equivalente',
    location_description='Carcaça do termostato no circuito de saída de água do motor.',
    function_description='Controla a passagem do líquido para o radiador, mantendo a temperatura de trabalho.',
    failure_symptoms='["motor demora a aquecer","temperatura baixa em rodovia","superaquecimento se travada fechada"]'::jsonb,
    diagnostic_notes='["Comparar temperatura real no scanner durante aquecimento.","Mangueira principal aquecendo cedo demais pode indicar termostato travado aberto.","A peça genuína A6462001215 é listada para Sprinter 313 2002-2011 com OM611/OM612."]'::jsonb,
    required_tools='["scanner","termômetro infravermelho","torquímetro"]'::jsonb,
    torque_spec=torque_spec || '{"note":"usar torque do procedimento Mercedes para a carcaça; não inferido neste catálogo"}'::jsonb,
    exploded_view_reference='A6462001215 — válvula termostática genuína Mercedes para OM611/OM612; 87 °C em equivalentes do mercado.',
    data_status='verified',
    source_metadata=source_metadata || jsonb_build_object(
      'oem_code_verified',true,'confidence','high',
      'oem_equivalents',jsonb_build_array('A6462001215'),
      'verification_note','Peças Davoli lista peça genuína Mercedes A6462001215 para Sprinter 313 inclusive ano 2011; catálogos de aplicação indicam 87 °C.',
      'sources',jsonb_build_array(
        jsonb_build_object('label','Peças Davoli A6462001215','url','https://pecas.idavoli.com.br/genuino-mercedes-benz/valvula-termostatica-om611-om612-mb-sprinter-311-313-413-genuino-mercedes-benz'),
        jsonb_build_object('label','Regicar termostato OM611','url','https://regicarautopecas.com.br/produto/valvula-termostatica-mercedes-benz-sprinter-cdi-311-313-413-2-2-16v-02-12/17437?cat=8797')
      )
    ),updated_at=now()
where name='Válvula termostática' and source_metadata->>'seed'='sprinter_w903_om611';

update public.v2_vehicle_components
set oem_part_number='A0031532728 / A0031532828',
    manufacturer_part_number='Bosch 0261210170 / Hella 6PU009110851',
    location_description='Próximo ao volante do motor/virabrequim, lendo a roda fônica; conector de 2 vias.',
    function_description='Fornece rotação e posição do virabrequim para sincronismo da injeção.',
    failure_symptoms='["motor não pega","motor apaga quente ou intermitente","conta-giros/rotação ausente no scanner durante partida"]'::jsonb,
    diagnostic_notes='["Durante partida, verificar se o scanner mostra RPM.","Inspecionar folga para roda fônica, chicote e conector.","Sensor indutivo de 2 vias; medir continuidade/resistência conforme especificação do fabricante, sem aplicar alimentação externa."]'::jsonb,
    required_tools='["scanner","multímetro","osciloscópio automotivo quando disponível"]'::jsonb,
    connector_spec=connector_spec || '{"pins":2,"type":"indutivo"}'::jsonb,
    exploded_view_reference='A0031532728/A0031532828 — sensor CKP da Sprinter 311/313/413 OM611 2002-2012.',
    data_status='verified',
    source_metadata=source_metadata || jsonb_build_object(
      'oem_code_verified',true,'confidence','high',
      'oem_equivalents',jsonb_build_array('A0031532728','A0031532828','A6519050000'),
      'manufacturer_equivalents',jsonb_build_array('Bosch 0261210170','Hella 6PU009110851'),
      'connector_pins',2,
      'verification_note','Regicar lista OM611 Sprinter 313 2002-2012; Original Online confirma peça genuína A0031532828 para 311/313/413 OM611 2002-2011.',
      'sources',jsonb_build_array(
        jsonb_build_object('label','Regicar CKP OM611','url','https://regicarautopecas.com.br/produto/sensor-rotacao-mercedes-benz-sprinter-cdi-311-313-413-2-2-16v-tb-diesel-2002-ate-2012-mt-om-611/17196?cat=1045'),
        jsonb_build_object('label','Original Online A0031532828','url','https://originalonline.com.br/products/sensor-rotacao-volante-sprinter-313-311-413-a0031532828-original')
      )
    ),updated_at=now()
where name='Sensor de rotação do virabrequim' and source_metadata->>'seed'='sprinter_w903_om611';

update public.v2_vehicle_components
set oem_part_number='A0031539728 / A0051531328',
    manufacturer_part_number='Hella 6PU009121501 / Febi 32317',
    location_description='Na região do comando de válvulas/cabeçote; sensor de 3 vias.',
    function_description='Informa a fase do comando para sincronização da injeção e identificação do cilindro.',
    failure_symptoms='["partida prolongada","não pega em algumas condições","falha de sincronismo CKP/CMP"]'::jsonb,
    diagnostic_notes='["Comparar sincronismo CKP/CMP no scanner.","Conferir alimentação, terra e sinal do sensor Hall.","Inspecionar conector e chicote próximo ao cabeçote."]'::jsonb,
    required_tools='["scanner","multímetro","osciloscópio automotivo quando disponível"]'::jsonb,
    connector_spec=connector_spec || '{"pins":3,"type":"Hall"}'::jsonb,
    exploded_view_reference='A0031539728/A0051531328 — sensor CMP aplicado à Sprinter 311/313/413 OM611 2002-2012.',
    data_status='estimated',
    source_metadata=source_metadata || jsonb_build_object(
      'oem_code_verified',false,'confidence','strong_catalog_cross_reference',
      'oem_equivalents',jsonb_build_array('A0031539728','A0051531328'),
      'manufacturer_equivalents',jsonb_build_array('Hella 6PU009121501','Febi 32317'),
      'connector_pins',3,
      'verification_note','Aplicação específica OM611 313 2002-2012 documentada; manter conferência física/VIN porque há referência de fase diferente em outras famílias Mercedes.',
      'sources',jsonb_build_array(
        jsonb_build_object('label','Regicar CMP OM611','url','https://regicarautopecas.com.br/produto/sensor-fase-mercedes-benz-sprinter-cdi-311-313-413-2-2-16v-tb-diesel-2002-ate-2012-mt-om-611/17198?cat=1039'),
        jsonb_build_object('label','RS Peças aplicação Sprinter 313','url','https://www.rspecaseacessorios.com.br/sensor-de-fase-comando-de-valvulas-sprinter-313')
      )
    ),updated_at=now()
where name='Sensor de fase do comando' and source_metadata->>'seed'='sprinter_w903_om611';

update public.v2_vehicle_components
set oem_part_number='A0121544602 / A0131543202 / A0131541302',
    manufacturer_part_number='Bosch 0124515114',
    location_description='Acionado pela correia de acessórios; sistema 12 V, nominal 120 A nas aplicações catalogadas.',
    function_description='Gera energia elétrica e recarrega a bateria com o motor em funcionamento.',
    failure_symptoms='["luz da bateria","tensão de carga baixa ou alta","ruído de rolamento/polia","bateria descarregando"]'::jsonb,
    diagnostic_notes='["Medir tensão na bateria em marcha lenta e com consumidores ligados.","Testar queda de tensão nos cabos positivo e terra.","A medição recente deste veículo, em torno de 13,6-13,8 V, indicou carga naquele momento, mas não substitui teste sob carga."]'::jsonb,
    required_tools='["multímetro","alicate amperímetro DC","testador de bateria/carga"]'::jsonb,
    connector_spec=connector_spec || '{"voltage_v":12,"rated_current_a":120}'::jsonb,
    exploded_view_reference='Bosch 0124515114 / família Mercedes A0121544602-A0131543202-A0131541302 para Sprinter 313 OM611.',
    data_status='estimated',
    source_metadata=source_metadata || jsonb_build_object(
      'oem_code_verified',false,'confidence','catalog_cross_reference',
      'oem_equivalents',jsonb_build_array('A0121544602','A0131543202','A0131541302'),
      'manufacturer_equivalents',jsonb_build_array('Bosch 0124515114'),
      'rated_current_a',120,'voltage_v',12,
      'verification_note','Regicar lista Bosch 0124515114 para Sprinter 313 OM611 2002-2012 e versão equivalente de 120 A; confirmar o alternador instalado, pois potência/polia podem variar por equipamentos.',
      'sources',jsonb_build_array(
        jsonb_build_object('label','Regicar Bosch 0124515114','url','https://regicarautopecas.com.br/produto/alternador-sprinter-cdi-311-313-413-2-2-16v-turbo-diesel-2002-ate-2012-om611/57?cat=160'),
        jsonb_build_object('label','Regicar OEM 120 A','url','https://regicarautopecas.com.br/produto/alternador-sprinter-cdi-311-313-413-2-2-16v-turbo-diesel-2002-ate-2012-om611/58?cat=12544')
      )
    ),updated_at=now()
where name='Alternador' and source_metadata->>'seed'='sprinter_w903_om611';

update public.v2_vehicle_components
set oem_part_number='A0051511301 (família inclui A0041516301 e outras supersessões)',
    manufacturer_part_number='Bosch 0001109250 / F042002065 • ZEN 35004',
    location_description='Fixado ao motor/campana, acionando o volante do motor; 12 V, 10 dentes, cerca de 2,2 kW nas referências Bosch/Zen.',
    function_description='Gira o motor durante a partida até que a combustão se sustente.',
    failure_symptoms='["clique e não gira","giro lento","falha intermitente de partida","ruído de engrenamento"]'::jsonb,
    diagnostic_notes='["Testar tensão da bateria durante a partida e queda de tensão nos cabos.","Conferir sinal no terminal de comando do automático.","Se a bateria e cabos estiverem bons, medir corrente de partida antes de condenar o motor de partida."]'::jsonb,
    required_tools='["multímetro","alicate amperímetro DC","testador de bateria"]'::jsonb,
    connector_spec=connector_spec || '{"voltage_v":12,"teeth":10,"power_kw":2.2}'::jsonb,
    exploded_view_reference='A0051511301 / Bosch 0001109250 — família de motor de partida da Sprinter 313 CDI 2001-2012; há várias supersessões equivalentes.',
    data_status='estimated',
    source_metadata=source_metadata || jsonb_build_object(
      'oem_code_verified',false,'confidence','strong_catalog_cross_reference',
      'oem_equivalents',jsonb_build_array('A0051511301','A0041516301','A0041516701','A0041517101','A0051516601'),
      'manufacturer_equivalents',jsonb_build_array('Bosch 0001109250','Bosch F042002065','ZEN 35004'),
      'voltage_v',12,'teeth',10,'power_kw',2.2,
      'verification_note','Múltiplos catálogos brasileiros listam Bosch 0001109250/A0051511301 para Sprinter 313 CDI até 2012; existem muitas supersessões, então conferir fixação e código físico antes da compra.',
      'sources',jsonb_build_array(
        jsonb_build_object('label','AutoNext ZEN 35004','url','https://www.autonext.com.br/motor-de-partida-para-sprinter-311-313-413-2001-ate-2012/p'),
        jsonb_build_object('label','DITA 20181 application','url','https://ditaauto.com.br/product/dita20181-12v-10d/'),
        jsonb_build_object('label','Mercedes-Benz A0051511301','url','https://www.originalteile.mercedes-benz.de/starter/a0051511301')
      )
    ),updated_at=now()
where name='Motor de partida' and source_metadata->>'seed'='sprinter_w903_om611';

update public.v2_vehicle_component_applications a
set fitment_status='verified', notes=case c.name
  when 'Separador/respiro do cárter' then 'A6110160134 confirmado para Sprinter 311/313/413 2002-2012.'
  when 'Sensor de temperatura do líquido de arrefecimento' then 'MTE 4251 / MB A0005426218-A0051532328-A0051536328, 2 vias, aplicação OM611 Brasil.'
  when 'Válvula termostática' then 'A6462001215 genuína Mercedes, aplicação Sprinter 313 inclusive 2011.'
  when 'Sensor de rotação do virabrequim' then 'A0031532728/A0031532828, 2 vias, aplicação OM611 313 2002-2012.'
  else a.notes end
from public.v2_vehicle_components c
where a.component_id=c.id and c.source_metadata->>'seed'='sprinter_w903_om611'
  and c.name in ('Separador/respiro do cárter','Sensor de temperatura do líquido de arrefecimento','Válvula termostática','Sensor de rotação do virabrequim')
  and a.chassis_variant='903.662' and a.engine_code='OM611.981';

update public.v2_vehicle_component_links l
set fitment_status='verified', notes=case c.name
  when 'Separador/respiro do cárter' then 'CONFIRMADO: antichama/respiro A6110160134 para Sprinter 313 OM611 2002-2012. Prioridade de inspeção porque este veículo apresentou vazamento nessa região.'
  when 'Sensor de temperatura do líquido de arrefecimento' then 'CONFIRMADO: MTE 4251 / MB A0005426218-A0051532328-A0051536328, conector 2 vias.'
  when 'Válvula termostática' then 'CONFIRMADO: A6462001215 genuína Mercedes para Sprinter 313/OM611; abertura nominal de mercado 87 °C.'
  when 'Sensor de rotação do virabrequim' then 'CONFIRMADO por aplicação: A0031532728/A0031532828, sensor indutivo 2 vias para Sprinter 313 OM611.'
  else l.notes end, updated_at=now()
from public.v2_vehicle_components c, public.v2_vehicles v
where l.component_id=c.id and l.vehicle_id=v.id and v.plate='EJW6A76'
  and c.source_metadata->>'seed'='sprinter_w903_om611'
  and c.name in ('Separador/respiro do cárter','Sensor de temperatura do líquido de arrefecimento','Válvula termostática','Sensor de rotação do virabrequim');

update public.v2_vehicle_component_links l
set notes=case c.name
  when 'Válvula EGR' then 'CATÁLOGO CRUZADO: A6110900954/Pierburg 7.24809.34.0 para OM611.981. A versão brasileira 2010/2011 deve ter o código físico confirmado antes da compra.'
  when 'Bomba d’água' then 'CATÁLOGO CRUZADO: família A6112000501/0801/1101/1601. Aplicação 313 OM611 2011 confirmada, mas escolher pela peça/VIN.'
  when 'Sensor de fase do comando' then 'CATÁLOGO CRUZADO forte: A0031539728/A0051531328, sensor Hall 3 vias para Sprinter 313 OM611 2002-2012.'
  when 'Alternador' then 'CATÁLOGO CRUZADO: Bosch 0124515114, 12 V/120 A; MB A0121544602/A0131543202/A0131541302. Conferir polia e código instalado.'
  when 'Motor de partida' then 'CATÁLOGO CRUZADO forte: A0051511301 / Bosch 0001109250, 12 V, 10 dentes, ~2,2 kW. Conferir código/fixação instalada.'
  else l.notes end, updated_at=now()
from public.v2_vehicle_components c, public.v2_vehicles v
where l.component_id=c.id and l.vehicle_id=v.id and v.plate='EJW6A76'
  and c.source_metadata->>'seed'='sprinter_w903_om611'
  and c.name in ('Válvula EGR','Bomba d’água','Sensor de fase do comando','Alternador','Motor de partida');