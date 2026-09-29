-- Oficina 360 — validação pós-deploy da profundidade diagnóstica da frota
-- Somente leitura/asserções. Pode ser executado após migrations de produção.

DO $$
DECLARE
  v_count integer;
BEGIN
  -- Comil: fonte eletrônica de família deve permanecer explicitamente condicionada à confirmação física.
  IF NOT EXISTS (
    SELECT 1
    FROM public.v2_vehicle_technical_sources s
    JOIN public.v2_vehicles v ON v.id=s.vehicle_id
    WHERE upper(replace(v.plate,'-',''))='CPI6C79'
      AND s.source_key='vw_mwm_8150e_9150e_od_wiring'
      AND s.source_metadata->>'requires_physical_variant_confirmation'='true'
  ) THEN
    RAISE EXCEPTION 'Oficina 360 postdeploy: gate de variante do Comil ausente';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.v2_vehicle_symptom_playbooks p
    JOIN public.v2_vehicles v ON v.id=p.vehicle_id,
         LATERAL jsonb_array_elements(p.ordered_tests) t
    WHERE upper(replace(v.plate,'-',''))='CPI6C79'
      AND p.symptom_key='loss_of_power_limp'
      AND t->>'key'='comil_variant_gate'
  ) THEN
    RAISE EXCEPTION 'Oficina 360 postdeploy: comil_variant_gate ausente';
  END IF;

  -- Volare: motor mecânico; common rail não pode ser promovido como arquitetura aplicável.
  IF NOT EXISTS (
    SELECT 1
    FROM public.v2_vehicle_electrical_nodes n
    JOIN public.v2_vehicles v ON v.id=n.vehicle_id
    WHERE upper(replace(v.plate,'-',''))='MBJ1166'
      AND n.reference='MECH-DIESEL-NO-ECU'
      AND n.source_metadata->>'no_common_rail'='true'
  ) THEN
    RAISE EXCEPTION 'Oficina 360 postdeploy: gate mecânico do Volare ausente';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.v2_vehicle_symptom_playbooks p
    JOIN public.v2_vehicles v ON v.id=p.vehicle_id,
         LATERAL jsonb_array_elements(p.ordered_tests) t
    WHERE upper(replace(v.plate,'-',''))='MBJ1166'
      AND p.symptom_key='no_start'
      AND t->>'key'='volare_ns_injection'
  ) THEN
    RAISE EXCEPTION 'Oficina 360 postdeploy: árvore mecânica de injeção do Volare ausente';
  END IF;

  -- 608: motor mecânico e tensão nominal nunca presumida.
  IF NOT EXISTS (
    SELECT 1
    FROM public.v2_vehicle_electrical_nodes n
    JOIN public.v2_vehicles v ON v.id=n.vehicle_id
    WHERE upper(replace(v.plate,'-',''))='BYH8J61'
      AND n.reference='OM314-NO-ECU'
      AND n.source_metadata->>'engine_scanner_not_applicable'='true'
  ) THEN
    RAISE EXCEPTION 'Oficina 360 postdeploy: gate mecânico OM314 ausente';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.v2_vehicle_electrical_nodes n
    JOIN public.v2_vehicles v ON v.id=n.vehicle_id
    WHERE upper(replace(v.plate,'-',''))='BYH8J61'
      AND n.reference='VOLTAGE-GATE'
      AND n.source_metadata->>'do_not_assume_12v_or_24v'='true'
  ) THEN
    RAISE EXCEPTION 'Oficina 360 postdeploy: gate de tensão da 608 ausente';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.v2_vehicle_symptom_playbooks p
    JOIN public.v2_vehicles v ON v.id=p.vehicle_id,
         LATERAL jsonb_array_elements(p.ordered_tests) t
    WHERE upper(replace(v.plate,'-',''))='BYH8J61'
      AND p.symptom_key='no_start'
      AND t->>'key'='608_ns_voltage_gate'
  ) THEN
    RAISE EXCEPTION 'Oficina 360 postdeploy: 608_ns_voltage_gate ausente';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.v2_vehicle_symptom_playbooks p
    JOIN public.v2_vehicles v ON v.id=p.vehicle_id,
         LATERAL jsonb_array_elements(p.ordered_tests) t
    WHERE upper(replace(v.plate,'-',''))='BYH8J61'
      AND p.symptom_key='no_start'
      AND t->>'key'='608_ns_injection'
  ) THEN
    RAISE EXCEPTION 'Oficina 360 postdeploy: árvore de injeção mecânica da 608 ausente';
  END IF;

  -- Reboque: plugue e cubo dependem de identificação física.
  IF NOT EXISTS (
    SELECT 1
    FROM public.v2_vehicle_symptom_playbooks p
    JOIN public.v2_vehicles v ON v.id=p.vehicle_id,
         LATERAL jsonb_array_elements(p.ordered_tests) t
    WHERE upper(replace(v.plate,'-',''))='QSR7H50'
      AND p.symptom_key='trailer_lighting_fault'
      AND t->>'key'='trailer_plug_map'
  ) THEN
    RAISE EXCEPTION 'Oficina 360 postdeploy: mapeamento físico do plugue do reboque ausente';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.v2_vehicle_symptom_playbooks p
    JOIN public.v2_vehicles v ON v.id=p.vehicle_id
    WHERE upper(replace(v.plate,'-',''))='QSR7H50'
      AND p.symptom_key='wheel_hub_noise'
      AND p.source_metadata->>'physical_part_identification_required'='true'
  ) THEN
    RAISE EXCEPTION 'Oficina 360 postdeploy: gate físico do cubo/rolamento do reboque ausente';
  END IF;

  SELECT count(*) INTO v_count
  FROM public.v2_vehicle_symptom_playbooks p
  WHERE p.active AND p.source_metadata->>'fleet_depth_version'='v1';

  IF v_count <> 15 THEN
    RAISE EXCEPTION 'Oficina 360 postdeploy: esperados 15 playbooks Fleet Depth V1; encontrados %', v_count;
  END IF;
END $$;

-- Resumo legível para auditoria.
WITH fleet AS (
  SELECT id, upper(replace(plate,'-','')) AS plate
  FROM public.v2_vehicles
  WHERE upper(replace(plate,'-','')) IN ('CPI6C79','MBJ1166','BYH8J61','QSR7H50')
)
SELECT f.plate,
  (SELECT count(*) FROM public.v2_vehicle_technical_sources s WHERE s.vehicle_id=f.id) AS technical_sources,
  (SELECT count(*) FROM public.v2_vehicle_electrical_nodes n WHERE n.vehicle_id=f.id) AS electrical_nodes,
  (SELECT count(*) FROM public.v2_vehicle_electrical_links l WHERE l.vehicle_id=f.id) AS electrical_links,
  (SELECT count(*) FROM public.v2_vehicle_symptom_playbooks p WHERE p.vehicle_id=f.id AND p.active) AS active_playbooks,
  (SELECT count(*) FROM public.v2_vehicle_symptom_playbooks p WHERE p.vehicle_id=f.id AND p.source_metadata->>'fleet_depth_version'='v1') AS fleet_depth_v1_playbooks
FROM fleet f
ORDER BY f.plate;
