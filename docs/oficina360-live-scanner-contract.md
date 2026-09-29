# Oficina 360 — contrato da ponte de scanner v1

Objetivo: qualquer ponte Raven, Napro, OBD/J1939 ou software próprio converte os nomes do fabricante para um conjunto canônico de PIDs e faz `upsert` de uma única linha por veículo em `public.v2_vehicle_scanner_current`.

## Segurança

A ponte deve usar uma sessão autenticada com permissão `workshop.manage`. Nunca usar `service_role` no navegador, tablet ou notebook da oficina. RLS valida a empresa e o veículo.

## Pacote atual

Exemplo lógico:

```json
{
  "vehicle_id": "<uuid>",
  "company_id": "<uuid>",
  "source_key": "napro_bridge_01",
  "source_label": "Napro 5000K",
  "source_type": "scanner_bridge",
  "protocol": "obd2",
  "connection_state": "streaming",
  "scanner_recorded_at": "2026-09-29T10:30:00Z",
  "received_at": "2026-09-29T10:30:00Z",
  "pids": {
    "engine_rpm": {"value": 2450, "unit": "rpm", "quality": "valid"},
    "intake_pressure_target_kpa_abs": {"value": 190, "unit": "kPa abs", "quality": "valid"},
    "intake_pressure_actual_kpa_abs": {"value": 171, "unit": "kPa abs", "quality": "valid"},
    "rail_pressure_target_bar": {"value": 900, "unit": "bar", "quality": "valid"},
    "rail_pressure_actual_bar": {"value": 875, "unit": "bar", "quality": "valid"}
  },
  "dtcs": [],
  "raw_data": {}
}
```

## PIDs canônicos iniciais

- `engine_rpm` — rpm
- `vehicle_speed_kmh` — km/h
- `coolant_temp_c` — °C
- `battery_voltage` — V
- `accelerator_percent` — %
- `engine_load_percent` — %
- `fuel_percent` — %
- `intake_pressure_target_kpa_abs` — pressão absoluta alvo da admissão, kPa abs
- `intake_pressure_actual_kpa_abs` — pressão absoluta real da admissão, kPa abs
- `rail_pressure_target_bar` — pressão alvo do rail, bar
- `rail_pressure_actual_bar` — pressão real do rail, bar
- `maf_g_s` — massa de ar, g/s
- `iat_c` — temperatura do ar de admissão, °C
- `egr_command_percent` — comando EGR, %
- `egr_position_percent` — posição EGR, %
- `cam_crank_sync` — estado de sincronismo fase/rotação

## Regra de unidade

A ponte deve converter antes de gravar. Não misturar pressão manométrica e absoluta. Os PIDs `intake_pressure_*_kpa_abs` são sempre pressão **absoluta**. O dado bruto original pode ser preservado em `raw_data`.

## Uso no diagnóstico

O Oficina 360 assina alterações da linha atual em tempo real. Cada passo do roteiro informa quais PIDs são úteis. Ao tocar **Usar leituras deste passo**, o sistema:

1. cria uma evidência imutável em `v2_diagnostic_scanner_snapshots`;
2. grava valor e procedência no passo atual;
3. calcula diferença alvo x real quando o roteiro fornece os dois PIDs;
4. não marca sozinho `pass` ou `fail` e não condena peça automaticamente.

A telemetria existente de frota funciona como fallback para RPM, velocidade, temperatura, tensão, carga, acelerador e combustível.