-- Sprinter 313 CDI W903 / OM611.981: referências cruzadas técnicas v1
-- Regra: não promover para "verified" quando o código exato ainda depende de conferência pelo VIN/peça física.

update public.v2_vehicle_components
set oem_part_number = 'A0005422818 → A6511530028',
    manufacturer_part_number = 'Delphi TS10459',
    location_description = 'No duto/coletor de admissão, sensor de temperatura do ar com conector de 2 vias.',
    function_description = 'Mede a temperatura do ar admitido para correções de injeção e controle do motor.',
    failure_symptoms = '["perda de força ou modo de emergência","resposta irregular de aceleração","leitura de temperatura do ar implausível no scanner"]'::jsonb,
    diagnostic_notes = '["Conferir chicote e os dois terminais antes de condenar o sensor.","Comparar a temperatura do ar no scanner com a temperatura ambiente com motor frio.","Após reparo do chicote, apagar falhas e repetir teste sob carga."]'::jsonb,
    required_tools = '["scanner com dados ao vivo","multímetro","kit de reparo de conector 2 vias"]'::jsonb,
    connector_spec = connector_spec || '{"pins":2}'::jsonb,
    exploded_view_reference = 'Mercedes-Benz A0005422818 / sucessor A6511530028 — referência de catálogo; diagrama EPC por VIN ainda deve ser conferido.',
    data_status = 'verified',
    source_metadata = source_metadata || jsonb_build_object(
      'oem_code_verified', true,
      'confidence', 'high',
      'oem_equivalents', jsonb_build_array('A0005422818','A0061532028','A0061538028','A6511530028'),
      'manufacturer_equivalents', jsonb_build_array('Delphi TS10459'),
      'connector_pins', 2,
      'verification_note', 'Mercedes-Benz confirma a substituição A0005422818 por A6511530028; configuração de 2 vias também foi conferida na peça/chicote identificados no veículo.',
      'sources', jsonb_build_array(
        jsonb_build_object('label','Mercedes-Benz Originalteile','url','https://originalteile.mercedes-benz.de/temperatursensor-fuer-c-klasse-e-klasse-und-weitere-baureihen/a0005422818'),
        jsonb_build_object('label','Fusão Diesel - equivalências e 2 pinos','url','https://www.fusaodiesel.com.br/produtos/sensor-de-temperatura-do-ar-sprinter-313-415-515-a6511530028/')
      )
    ),
    updated_at = now()
where name = 'Sensor de temperatura do ar de admissão (IAT)'
  and source_metadata->>'seed' = 'sprinter_w903_om611';

update public.v2_vehicle_components
set oem_part_number = 'A0000941048 / A0000941848',
    manufacturer_part_number = 'Pierburg 7.22684.11.0 / Bosch 0280217517',
    location_description = 'Linha de admissão após o filtro de ar.',
    function_description = 'Mede a massa de ar admitida para cálculo de carga, EGR e quantidade de combustível.',
    failure_symptoms = '["perda de potência","fumaça ou resposta irregular","valor de massa de ar incoerente no scanner"]'::jsonb,
    diagnostic_notes = '["Comparar massa de ar medida com a esperada em marcha lenta e sob carga.","Inspecionar filtro, dutos e entrada falsa de ar antes de substituir o MAF."]'::jsonb,
    required_tools = '["scanner com dados ao vivo","multímetro"]'::jsonb,
    exploded_view_reference = 'Pierburg 7.22684.11.0 / Mercedes A0000941048 — referência cruzada de catálogo; confirmar pelo VIN antes da compra.',
    data_status = 'estimated',
    source_metadata = source_metadata || jsonb_build_object(
      'oem_code_verified', false,
      'confidence', 'catalog_cross_reference',
      'oem_equivalents', jsonb_build_array('A0000941048','A0000941848','A1120940048'),
      'manufacturer_equivalents', jsonb_build_array('Pierburg 7.22684.11.0','Bosch 0280217517','Bosch 0280217518'),
      'verification_note', 'Aplicação cruzada para Sprinter 313 / OM611; seleção exata por VIN ainda pendente.',
      'sources', jsonb_build_array(
        jsonb_build_object('label','Motorservice/Pierburg catálogo','url','https://www.ms-motorservice.com/MediaAssets/itens-pierburg_1704881.pdf'),
        jsonb_build_object('label','Motorservice Brasil catálogo online','url','https://www.catweb.ms-motorservice.com.br/detalhes.php?cw_pgAtual=210&cw_produtoAtivo=CodigoProduto%3C%212%21%3E2736')
      )
    ),
    updated_at = now()
where name = 'Sensor de massa de ar (MAF)'
  and source_metadata->>'seed' = 'sprinter_w903_om611';

update public.v2_vehicle_components
set oem_part_number = 'A0041533128 / A0041533328 / A0051537228 / A0061531428 / A0061539828',
    manufacturer_part_number = 'MTE-Thomson 7147 / Bosch 0261230141-142',
    location_description = 'Circuito de admissão pressurizada/coletor; sensor MAP de 3 vias.',
    function_description = 'Mede a pressão absoluta de admissão para controle da sobrealimentação e cálculo de carga.',
    failure_symptoms = '["turbo corta ou entra em emergência","perda de força sob carga","pressão de admissão incoerente"]'::jsonb,
    diagnostic_notes = '["Com ignição ligada e motor parado, comparar MAP com pressão barométrica.","Conferir alimentação de referência, terra e sinal sem perfurar o isolamento quando possível.","Inspecionar mangueiras/intercooler se a pressão real ficar abaixo da solicitada."]'::jsonb,
    required_tools = '["scanner com pressão solicitada/real","multímetro","manômetro de pressurização quando necessário"]'::jsonb,
    connector_spec = connector_spec || '{"pins":3}'::jsonb,
    exploded_view_reference = 'Família MAP A0041533128…A0061539828 — referência cruzada; EPC exato por VIN pendente.',
    data_status = 'estimated',
    source_metadata = source_metadata || jsonb_build_object(
      'oem_code_verified', false,
      'confidence', 'catalog_cross_reference',
      'oem_equivalents', jsonb_build_array('A0041533128','A0041533328','A0051537228','A0061531428','A0061539828'),
      'manufacturer_equivalents', jsonb_build_array('MTE-Thomson 7147','Bosch 0261230141','Bosch 0261230142','Bosch 0261230191'),
      'connector_pins', 3,
      'verification_note', 'Família de código bem documentada para Sprinter; confirmar a gravação da peça/VIN porque há supersessões.',
      'sources', jsonb_build_array(
        jsonb_build_object('label','DS catálogo MAP','url','https://www.ds.ind.br/media/downloads/document/95/70/fc/Catalogo_Auto_Exportacao_2024_comp.pdf'),
        jsonb_build_object('label','Catálogo aplicação 3 pinos','url','https://www.autokseft.cz/Nahradni-dily/MERCEDES-BENZ-74/SPRINTER-2-t-Krabice-B901-B902-2039/213-CDI-901.661-901.662-902.661-902.662-95kw-2148ccm-14831/Elektroinstalace/Snimace-a-cidla-Snimace-tlaku-1000341_1000354?page=2')
      )
    ),
    updated_at = now()
where name = 'Sensor de pressão de admissão / MAP'
  and source_metadata->>'seed' = 'sprinter_w903_om611';

update public.v2_vehicle_components
set oem_part_number = 'A6110960899 / A6110961599 / A6110961699',
    manufacturer_part_number = 'Garrett GT1852V • 709836-5005S / 726698-0001',
    location_description = 'Lado do escape do motor; turbina de geometria variável comandada por vácuo.',
    function_description = 'Comprime o ar de admissão; a geometria variável regula a pressão de sobrealimentação.',
    failure_symptoms = '["perda súbita de pressão/força","modo de emergência que pode desaparecer ao religar","assobio/vazamento de pressurização","óleo excessivo na admissão"]'::jsonb,
    diagnostic_notes = '["Antes de condenar a turbina, testar mangueiras, intercooler, vácuo e válvula moduladora.","Comparar pressão de turbo solicitada e real no scanner.","Verificar folga, travamento da geometria e alimentação/retorno de óleo conforme procedimento técnico."]'::jsonb,
    required_tools = '["scanner com boost solicitado/real","bomba de vácuo manual","kit para teste de pressurização"]'::jsonb,
    exploded_view_reference = 'Garrett GT1852V 709836 / família 726698; referência visual/catálogo, código final deve ser conferido na plaqueta ou EPC por VIN.',
    data_status = 'estimated',
    source_metadata = source_metadata || jsonb_build_object(
      'oem_code_verified', false,
      'confidence', 'catalog_cross_reference',
      'oem_equivalents', jsonb_build_array('A6110960899','A6110961599','A6110961699'),
      'manufacturer_equivalents', jsonb_build_array('Garrett 709836-5005S','Garrett 709836-5004S','Garrett 726698-0001','Garrett 778794-0001'),
      'turbo_family', 'GT1852V',
      'verification_note', 'Garrett confirma A6110960899 para OM611/Sprinter 313; catálogos brasileiros também cruzam A6110961599/A6110961699. Confirmar plaqueta/VIN antes de comprar.',
      'sources', jsonb_build_array(
        jsonb_build_object('label','Garrett Motion 709836-5005S','url','https://www.garrettmotion.com/turbo-replacement/aftermarket-reman-turbochargers-catalog/turbo/709836-5005S/'),
        jsonb_build_object('label','Catálogo cruzado OM611 GT1852V','url','https://www.rivtron.com/pt/products/a6110960899-turbocharger-om611-mercedes-benz-sprinter-i-2/')
      )
    ),
    updated_at = now()
where name = 'Turbocompressor'
  and source_metadata->>'seed' = 'sprinter_w903_om611';

update public.v2_vehicle_components
set oem_part_number = 'A0005450427 / A0005450527',
    manufacturer_part_number = 'Pierburg 7.02256.11.0 (equivalência)',
    location_description = 'Válvula solenoide/moduladora no circuito de vácuo que comanda a geometria do turbo.',
    function_description = 'Modula o vácuo enviado ao atuador da turbina conforme comando da ECU.',
    failure_symptoms = '["turbo não enche ou corta","perda de força","geometria não se movimenta corretamente"]'::jsonb,
    diagnostic_notes = '["Testar primeiro as mangueiras finas de vácuo.","Com bomba manual, conferir se o atuador mantém vácuo e movimenta a haste.","Com scanner, correlacionar comando de turbo com pressão real."]'::jsonb,
    required_tools = '["bomba de vácuo manual","scanner","multímetro"]'::jsonb,
    connector_spec = connector_spec || '{"pins":2}'::jsonb,
    exploded_view_reference = 'Mercedes A0005450527 / A0005450427 — modulador de vácuo do turbo; referência de catálogo PartSouq disponível.',
    data_status = 'estimated',
    source_metadata = source_metadata || jsonb_build_object(
      'oem_code_verified', false,
      'confidence', 'catalog_cross_reference',
      'oem_equivalents', jsonb_build_array('A0005450427','A0005450527'),
      'manufacturer_equivalents', jsonb_build_array('Pierburg 7.02256.11.0'),
      'connector_pins', 2,
      'verification_note', 'Aplicação brasileira documentada para Sprinter 311/313/413 OM611 até 2011/2012; confirmar pelo VIN.',
      'sources', jsonb_build_array(
        jsonb_build_object('label','PartSouq Mercedes A0005450527','url','https://partsouq.com/shop/product/A0005450527-mercedes-druckwandler/17648850'),
        jsonb_build_object('label','Original Online aplicação OM611 2002-2011','url','https://originalonline.com.br/products/valvula-de-pressao-do-turbo-da-sprinter-313-413-311-a0005450527-original')
      )
    ),
    updated_at = now()
where name = 'Atuador/controle do turbo'
  and source_metadata->>'seed' = 'sprinter_w903_om611';

update public.v2_vehicle_components
set oem_part_number = 'A9015010701 / A9015011001',
    manufacturer_part_number = 'HELLA 8ML 376 700-621 / 8ML 376 700-624',
    location_description = 'Frente do veículo, no circuito entre saída do turbo e coletor de admissão.',
    function_description = 'Resfria o ar comprimido pelo turbo antes de entrar no motor.',
    failure_symptoms = '["perda de pressão do turbo","óleo/vazamento nas colmeias ou bocais","assobio sob carga"]'::jsonb,
    diagnostic_notes = '["Pressurizar o circuito e procurar vazamentos nas colmeias, bocais e mangueiras.","Óleo superficial pode vir do respiro; acúmulo excessivo exige investigar turbo/respiro."]'::jsonb,
    required_tools = '["kit de pressurização com regulador","solução detectora de vazamento"]'::jsonb,
    exploded_view_reference = 'PartSouq A9015010701 — catálogo Mercedes com aplicação 903.662/Latin America e acesso a diagrama.',
    data_status = 'estimated',
    source_metadata = source_metadata || jsonb_build_object(
      'oem_code_verified', false,
      'confidence', 'catalog_cross_reference',
      'oem_equivalents', jsonb_build_array('A9015010701','A9015011001'),
      'manufacturer_equivalents', jsonb_build_array('HELLA 8ML 376 700-621','HELLA 8ML 376 700-624'),
      'verification_note', 'PartSouq lista A9015010701 para 903.662 Latin America; ainda manter conferência por VIN/medidas.',
      'sources', jsonb_build_array(
        jsonb_build_object('label','PartSouq A9015010701','url','https://partsouq.com/shop/product/A9015010701-mercedes-ladeluftkuehler/17848864'),
        jsonb_build_object('label','Aplicação Brasil 2002-2012 OM611LA','url','https://www.autopecashorizonte.com.br/radiador-intercooler-mercedes-sprinter-2-2-cdi-311-313-413-de-2002-a-2012')
      )
    ),
    updated_at = now()
where name = 'Intercooler'
  and source_metadata->>'seed' = 'sprinter_w903_om611';

update public.v2_vehicle_components
set oem_part_number = 'A6110700701',
    manufacturer_part_number = 'Bosch 0445010272 / 0445010024 / 0445010030',
    location_description = 'Bomba mecânica de alta pressão do sistema Common Rail, acionada pelo motor.',
    function_description = 'Eleva a pressão do diesel para alimentação do rail Common Rail.',
    failure_symptoms = '["pressão de rail insuficiente","dificuldade de partida","perda de força","contaminação metálica no sistema"]'::jsonb,
    diagnostic_notes = '["Comparar pressão desejada e real durante partida e aceleração.","Se houver limalha, não trocar somente a bomba: investigar e descontaminar o sistema completo conforme procedimento diesel.","Confirmar código/versão da bomba antes da compra, pois há variações por número de motor."]'::jsonb,
    required_tools = '["scanner diesel com pressão de rail","kit de retorno dos injetores","ferramentas de limpeza apropriadas para common rail"]'::jsonb,
    connector_spec = connector_spec || '{"note":"há versões/atuadores com conector; confirmar código gravado na bomba"}'::jsonb,
    exploded_view_reference = 'Bosch CP1 A6110700701 / 0445010272 — referência de conjunto; conferir variante pelo número do motor/VIN.',
    data_status = 'estimated',
    source_metadata = source_metadata || jsonb_build_object(
      'oem_code_verified', false,
      'confidence', 'catalog_cross_reference',
      'oem_equivalents', jsonb_build_array('A6110700701'),
      'manufacturer_equivalents', jsonb_build_array('Bosch 0445010272','Bosch 0445010024','Bosch 0445010030','Bosch 0986437103'),
      'verification_note', 'Família Bosch CP1 amplamente cruzada com OM611.981; algumas listagens impõem corte por número de motor, portanto o código físico/VIN continua obrigatório.',
      'sources', jsonb_build_array(
        jsonb_build_object('label','Tyrone Diesel Bosch 0445010272','url','https://www.tyronedieselsystems.com/product/0445010272-radial-piston-pump-cr-cp1k3-l60-1/'),
        jsonb_build_object('label','Aplicação Brasil Sprinter 313 até 2012','url','https://www.caminhoneteecia.com.br/bomba-alta-pressao-sprinter-311-313-413-cdi-2-2-2001-2012')
      )
    ),
    updated_at = now()
where name = 'Bomba de alta pressão'
  and source_metadata->>'seed' = 'sprinter_w903_om611';

update public.v2_vehicle_components
set oem_part_number = 'A6110700495',
    manufacturer_part_number = 'Bosch 0445214064',
    location_description = 'Rail Common Rail no cabeçote, distribuindo combustível de alta pressão aos quatro injetores.',
    function_description = 'Acumula e distribui diesel pressurizado; recebe sensor e válvula/regulador conforme configuração.',
    failure_symptoms = '["vazamento de alta pressão","pressão de rail instável","problemas associados ao sensor/regulador montados no conjunto"]'::jsonb,
    diagnostic_notes = '["Nunca solte linha de alta com o motor funcionando.","Identificar separadamente falha do rail, sensor, regulador e injetores com dados de pressão e teste de retorno."]'::jsonb,
    required_tools = '["scanner diesel","chaves apropriadas para linhas common rail","EPI"]'::jsonb,
    exploded_view_reference = 'PartSouq A6110700495 — distribuidor de combustível Mercedes; página possui aplicação e diagramas de catálogo.',
    data_status = 'estimated',
    source_metadata = source_metadata || jsonb_build_object(
      'oem_code_verified', false,
      'confidence', 'catalog_cross_reference',
      'oem_equivalents', jsonb_build_array('A6110700495'),
      'manufacturer_equivalents', jsonb_build_array('Bosch 0445214064'),
      'verification_note', 'Referência encontrada para W903 903.662 / OM611.981; confirmar serial/VIN antes de comprar o conjunto completo.',
      'sources', jsonb_build_array(
        jsonb_build_object('label','PartSouq A6110700495','url','https://partsouq.com/shop/product/A6110700495-mercedes-fuel-distributor/17828285'),
        jsonb_build_object('label','B-Parts rail 903.662 OM611.981','url','https://www.b-parts.com/auto-parts/engine-transmission/injection-rail-mercedes-benz-sprinter-3-t-van-b903-a6110700495-0445214064-bosch-1995-1996-1997-1998-1999-2000-2001-2002-2003-2004-2005-2006-2007-2008-2009-2010-2011-2012-7249219')
      )
    ),
    updated_at = now()
where name = 'Rail de combustível'
  and source_metadata->>'seed' = 'sprinter_w903_om611';

update public.v2_vehicle_components
set oem_part_number = 'A0051535828 / A0071530228',
    manufacturer_part_number = 'Bosch 0281002700 / 0281002942',
    location_description = 'Montado no rail Common Rail; sensor elétrico de 3 vias.',
    function_description = 'Informa à ECU a pressão real do combustível no rail.',
    failure_symptoms = '["partida difícil ou não pega","corte/perda de potência","pressão indicada incoerente ou intermitente"]'::jsonb,
    diagnostic_notes = '["Comparar pressão solicitada e medida no scanner.","Conferir 5 V de referência, terra e sinal antes de substituir.","Não aplicar tensão externa diretamente ao pino de sinal."]'::jsonb,
    required_tools = '["scanner diesel","multímetro"]'::jsonb,
    connector_spec = connector_spec || '{"pins":3}'::jsonb,
    exploded_view_reference = 'Rail Bosch 0445214064: sensor Bosch 0281002700; referência de conjunto/diagrama no catálogo do rail.',
    data_status = 'verified',
    source_metadata = source_metadata || jsonb_build_object(
      'oem_code_verified', true,
      'confidence', 'high',
      'oem_equivalents', jsonb_build_array('A0051535828','A0071530228'),
      'manufacturer_equivalents', jsonb_build_array('Bosch 0281002700','Bosch 0281002942'),
      'connector_pins', 3,
      'verification_note', 'Catálogo brasileiro Bosch/DT identifica explicitamente aplicação Sprinter OM611/612; rail A6110700495 também registra Bosch 0281002700.',
      'sources', jsonb_build_array(
        jsonb_build_object('label','Perim/Bosch 0281002700','url','https://perimpecas.com.br/index.php?produto=334362%7CSENSOR-PRESSAO-COMBUSTIVEL-COMMON-RAIL-MERCEDES-BENZ-SPRINTER-OM611%2F612'),
        jsonb_build_object('label','B-Parts rail 0445214064','url','https://www.b-parts.com/auto-parts/engine-transmission/injection-rail-mercedes-benz-sprinter-3-t-van-b903-a6110700495-0445214064-bosch-1995-1996-1997-1998-1999-2000-2001-2002-2003-2004-2005-2006-2007-2008-2009-2010-2011-2012-7249219')
      )
    ),
    updated_at = now()
where name = 'Sensor de pressão do rail'
  and source_metadata->>'seed' = 'sprinter_w903_om611';

update public.v2_vehicle_components
set oem_part_number = 'A6110780149 (família inclui A6110780549)',
    manufacturer_part_number = 'Bosch 0281002241',
    location_description = 'Na extremidade do rail Common Rail, válvula de controle/regulação de pressão.',
    function_description = 'Regula/alivia a pressão do combustível no rail conforme estratégia da ECU.',
    failure_symptoms = '["pressão de rail cai","motor morre ou não pega","perda de força","falha sob aceleração"]'::jsonb,
    diagnostic_notes = '["Comparar pressão solicitada e real antes de desmontar.","Inspecionar microfiltro/tela e contaminação sem introduzir sujeira no sistema.","Conferir retorno dos injetores e bomba antes de atribuir toda queda de pressão à válvula."]'::jsonb,
    required_tools = '["scanner diesel","multímetro","kit de teste de retorno"]'::jsonb,
    connector_spec = connector_spec || '{"pins":2}'::jsonb,
    exploded_view_reference = 'Bosch 0281002241 / Mercedes A6110780149 — regulador do rail; referência visual confirmada na família OM611.',
    data_status = 'verified',
    source_metadata = source_metadata || jsonb_build_object(
      'oem_code_verified', true,
      'confidence', 'high',
      'oem_equivalents', jsonb_build_array('A6110780149','A6110780549'),
      'manufacturer_equivalents', jsonb_build_array('Bosch 0281002241'),
      'connector_pins', 2,
      'verification_note', '0281002241/A6110780149 é documentado para Sprinter 311/313 OM611 e corresponde à família de peça já identificada no veículo; há supersessões/variantes, portanto conferir gravação ao substituir.',
      'sources', jsonb_build_array(
        jsonb_build_object('label','Base Peças 0281002241/A6110780149','url','https://www.basepecas.com.br/linha-pesada/mercedes-benz/valvula-reguladora-pressao-p-sprinter-311-313-0281002241'),
        jsonb_build_object('label','Mec Parts aplicação 2001-2012','url','https://www.mecpartsdiesel.com.br/valvulas-reguladoras/valvula-reguladora-sprinter-313-311-413-2-2-2001-a-2012-0281002241-a6110780149')
      )
    ),
    updated_at = now()
where name = 'Válvula reguladora de pressão do rail'
  and source_metadata->>'seed' = 'sprinter_w903_om611';

update public.v2_vehicle_components
set oem_part_number = 'A6110701687 / A6110701487',
    manufacturer_part_number = 'Bosch 0445110189 / 0445110190',
    location_description = 'Quatro injetores Common Rail montados no cabeçote.',
    function_description = 'Dosam e pulverizam o diesel em cada cilindro sob comando eletrônico.',
    failure_symptoms = '["retorno excessivo","partida difícil","marcha lenta irregular","fumaça/perda de potência"]'::jsonb,
    diagnostic_notes = '["Fazer teste comparativo de retorno dos quatro injetores.","Conferir correções no scanner quando disponíveis.","O OM611 teve mais de uma referência de injetor: conferir obrigatoriamente o código gravado no bico ou EPC por VIN antes de comprar."]'::jsonb,
    required_tools = '["scanner diesel","kit de teste de retorno de injetores","ferramentas de extração/limpeza próprias"]'::jsonb,
    exploded_view_reference = 'PartSouq A6110701687 — injetor Common Rail genuíno; referência de catálogo, confirmação do bico instalado ainda necessária.',
    data_status = 'estimated',
    source_metadata = source_metadata || jsonb_build_object(
      'oem_code_verified', false,
      'confidence', 'catalog_cross_reference_late_brazil',
      'oem_equivalents', jsonb_build_array('A6110701687','A6110701487'),
      'manufacturer_equivalents', jsonb_build_array('Bosch 0445110189','Bosch 0445110190'),
      'other_known_om611_families', jsonb_build_array('A6110700687 / Bosch 0445110025','A6110700887 or A6110701287 / Bosch 0445110181'),
      'verification_note', 'Fontes brasileiras listam 0445110189/A6110701687 para Sprinter 313 OM611 até 2012; confirmar o código gravado no injetor do veículo, pois há famílias anteriores.',
      'sources', jsonb_build_array(
        jsonb_build_object('label','PartSouq A6110701687','url','https://partsouq.com/shop/product/A6110701687-mercedes-injector-for-common-rail/19172227'),
        jsonb_build_object('label','Müller Diesel aplicação 2002-2012','url','https://mullerdiesel.com.br/injetor-common-rail-bosch-0445110189-para-mercedes-benz-sprinter-2002-a-2012-p79'),
        jsonb_build_object('label','Anchieta/DAP 0445110189','url','https://www.anchietapecas.com.br/bico-injetor-bosch-para-mercedes-benz-sprinter-pickup-313-2006-08-p1028505')
      )
    ),
    updated_at = now()
where name = 'Injetor diesel'
  and source_metadata->>'seed' = 'sprinter_w903_om611';

-- Promove somente itens com confirmação mais forte. Os demais permanecem candidatos com referência técnica cadastrada.
update public.v2_vehicle_component_applications a
set fitment_status = 'verified',
    notes = case c.name
      when 'Sensor de temperatura do ar de admissão (IAT)' then 'Referência A0005422818 substituída por A6511530028; 2 vias; identificação física/catálogo conferidas.'
      when 'Sensor de pressão do rail' then 'Bosch 0281002700 / Mercedes A0051535828-A0071530228, aplicação OM611 documentada.'
      when 'Válvula reguladora de pressão do rail' then 'Bosch 0281002241 / Mercedes A6110780149, família OM611 documentada e peça identificada no veículo.'
      else a.notes end
from public.v2_vehicle_components c
where a.component_id = c.id
  and c.source_metadata->>'seed' = 'sprinter_w903_om611'
  and c.name in ('Sensor de temperatura do ar de admissão (IAT)','Sensor de pressão do rail','Válvula reguladora de pressão do rail')
  and a.chassis_variant = '903.662'
  and a.engine_code = 'OM611.981';

update public.v2_vehicle_component_applications a
set notes = 'Referência cruzada cadastrada por aplicação W903/OM611 e mercado Brasil; confirmar código físico/EPC por VIN antes da compra.'
from public.v2_vehicle_components c
where a.component_id = c.id
  and c.source_metadata->>'seed' = 'sprinter_w903_om611'
  and c.name in ('Sensor de massa de ar (MAF)','Sensor de pressão de admissão / MAP','Turbocompressor','Atuador/controle do turbo','Intercooler','Bomba de alta pressão','Rail de combustível','Injetor diesel')
  and a.chassis_variant = '903.662'
  and a.engine_code = 'OM611.981';

update public.v2_vehicle_component_links l
set fitment_status = 'verified',
    notes = case c.name
      when 'Sensor de temperatura do ar de admissão (IAT)' then 'CONFIRMADO: A0005422818 → A6511530028; conector 2 vias. O chicote danificado desta condução deve ser reparado/substituído junto com o sensor quando necessário.'
      when 'Sensor de pressão do rail' then 'CONFIRMADO por aplicação OM611: Bosch 0281002700; MB A0051535828/A0071530228.'
      when 'Válvula reguladora de pressão do rail' then 'CONFIRMADO por família/peça identificada: Bosch 0281002241; MB A6110780149. Conferir gravação em eventual substituição.'
      else l.notes end,
    updated_at = now()
from public.v2_vehicle_components c, public.v2_vehicles v
where l.component_id = c.id
  and l.vehicle_id = v.id
  and v.plate = 'EJW6A76'
  and c.source_metadata->>'seed' = 'sprinter_w903_om611'
  and c.name in ('Sensor de temperatura do ar de admissão (IAT)','Sensor de pressão do rail','Válvula reguladora de pressão do rail');

update public.v2_vehicle_component_links l
set notes = case c.name
      when 'Sensor de massa de ar (MAF)' then 'CATÁLOGO CRUZADO: MB A0000941048/A0000941848; Pierburg 7.22684.11.0; conferir código físico/VIN.'
      when 'Sensor de pressão de admissão / MAP' then 'CATÁLOGO CRUZADO: família MB A0041533128…A0061539828; MTE 7147/Bosch 0261230141-142; 3 vias; confirmar gravação.'
      when 'Turbocompressor' then 'CATÁLOGO CRUZADO: Garrett GT1852V; MB A6110960899/A6110961599/A6110961699. Conferir plaqueta da turbina ou VIN.'
      when 'Atuador/controle do turbo' then 'CATÁLOGO CRUZADO: válvula moduladora A0005450427/A0005450527; 2 vias; aplicação OM611 Brasil documentada.'
      when 'Intercooler' then 'CATÁLOGO CRUZADO: A9015010701/A9015011001; PartSouq lista aplicação 903.662 Latin America; confirmar dimensões/VIN.'
      when 'Bomba de alta pressão' then 'CATÁLOGO CRUZADO: A6110700701; Bosch 0445010272/0024/0030. Confirmar código e número do motor antes da compra.'
      when 'Rail de combustível' then 'CATÁLOGO CRUZADO: A6110700495 / Bosch 0445214064 para 903.662 OM611.981; confirmar VIN.'
      when 'Injetor diesel' then 'CATÁLOGO CRUZADO tardio Brasil: A6110701687/A6110701487; Bosch 0445110189/0190. NÃO comprar sem conferir o código gravado no bico.'
      else l.notes end,
    updated_at = now()
from public.v2_vehicle_components c, public.v2_vehicles v
where l.component_id = c.id
  and l.vehicle_id = v.id
  and v.plate = 'EJW6A76'
  and c.source_metadata->>'seed' = 'sprinter_w903_om611'
  and c.name in ('Sensor de massa de ar (MAF)','Sensor de pressão de admissão / MAP','Turbocompressor','Atuador/controle do turbo','Intercooler','Bomba de alta pressão','Rail de combustível','Injetor diesel');