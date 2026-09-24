import { createClient } from 'npm:@supabase/supabase-js@2';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
});

function envJsonKey(name: string): string | null {
  const raw = Deno.env.get(name);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed.default || (Object.values(parsed)[0] as string) || null;
  } catch {
    return raw;
  }
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function bool(v: unknown): boolean | null {
  if (typeof v === 'boolean') return v;
  if (v === 1 || v === '1' || String(v).toLowerCase() === 'true') return true;
  if (v === 0 || v === '0' || String(v).toLowerCase() === 'false') return false;
  return null;
}

function pickNumber(obj: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const v = num(obj?.[key]);
    if (v !== null) return v;
  }
  return null;
}

function toIso(v: unknown): string {
  const d = v ? new Date(String(v)) : new Date();
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function haversineKm(aLat: number | null, aLon: number | null, bLat: number | null, bLon: number | null): number {
  if ([aLat, aLon, bLat, bLon].some((v) => v === null)) return 0;
  const r = 6371;
  const rad = (d: number) => d * Math.PI / 180;
  const dLat = rad((bLat as number) - (aLat as number));
  const dLon = rad((bLon as number) - (aLon as number));
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(rad(aLat as number)) * Math.cos(rad(bLat as number)) * Math.sin(dLon / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(x));
}

Deno.serve(async (req: Request) => {
  if (req.method === 'GET') return json({ ok: true, service: 'comando360-traccar-ingest', version: 1 });
  if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);

  const secretKey = envJsonKey('SUPABASE_SECRET_KEYS') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  if (!secretKey || !supabaseUrl) return json({ error: 'SERVER_CONFIGURATION_ERROR' }, 500);

  const admin = createClient(supabaseUrl, secretKey, { auth: { persistSession: false } });

  const suppliedKey = (req.headers.get('x-comando-key') || '').trim();
  if (!suppliedKey) return json({ error: 'UNAUTHORIZED' }, 401);
  const keyHash = await sha256(suppliedKey);
  const { data: ingestKey, error: ingestKeyError } = await admin
    .from('v2_tracking_ingest_keys')
    .select('id,active,expires_at')
    .eq('key_hash', keyHash)
    .eq('active', true)
    .maybeSingle();
  if (ingestKeyError || !ingestKey || (ingestKey.expires_at && new Date(ingestKey.expires_at).getTime() <= Date.now())) {
    return json({ error: 'UNAUTHORIZED' }, 401);
  }

  let body: any;
  try { body = await req.json(); } catch { return json({ error: 'INVALID_JSON' }, 400); }

  const position = body?.position && typeof body.position === 'object' ? body.position : body;
  const device = body?.device && typeof body.device === 'object' ? body.device : {};
  const attrs: Record<string, unknown> = position?.attributes && typeof position.attributes === 'object' ? position.attributes : {};
  const uniqueId = String(device?.uniqueId ?? body?.uniqueId ?? body?.deviceUniqueId ?? '').trim();
  if (!uniqueId) return json({ error: 'DEVICE_UNIQUE_ID_REQUIRED' }, 400);

  const { data: source, error: sourceError } = await admin
    .from('v2_tracking_sources')
    .select('id,company_id,vehicle_id,provider,external_device_id,metadata,enabled,is_primary')
    .eq('provider', 'comando360')
    .eq('external_device_id', uniqueId)
    .eq('enabled', true)
    .maybeSingle();
  if (sourceError) return json({ error: 'SOURCE_LOOKUP_FAILED', message: sourceError.message }, 500);
  if (!source) return json({ error: 'TRACKER_NOT_LINKED', uniqueId }, 404);

  const latitude = num(position?.latitude);
  const longitude = num(position?.longitude);
  const altitudeM = num(position?.altitude);
  const accuracyM = num(position?.accuracy);
  const headingDeg = num(position?.course ?? position?.bearing);
  const satellites = pickNumber(attrs, ['sat', 'satellites', 'satelliteCount']);
  const speedKmh = num(position?.speedKmh) ?? (num(position?.speed) !== null ? Number(position.speed) * 1.852 : null);
  const ignition = bool(attrs?.ignition ?? position?.ignition);
  const motion = bool(attrs?.motion ?? position?.motion) ?? (speedKmh !== null ? speedKmh > 3 : null);
  const totalDistanceM = pickNumber(attrs, ['totalDistance']);
  const odometerKm = num(position?.odometerKm) ?? num(attrs?.odometerKm) ?? (totalDistanceM !== null ? totalDistanceM / 1000 : null);
  const recordedAt = toIso(position?.fixTime ?? position?.deviceTime ?? position?.serverTime ?? body?.recordedAt);
  const now = new Date().toISOString();

  if (latitude !== null && (latitude < -90 || latitude > 90)) return json({ error: 'INVALID_LATITUDE' }, 422);
  if (longitude !== null && (longitude < -180 || longitude > 180)) return json({ error: 'INVALID_LONGITUDE' }, 422);

  const { data: previous } = await admin
    .from('v2_vehicle_tracking_source_current')
    .select('latitude,longitude,speed_kmh,ignition,motion,odometer_km,recorded_at')
    .eq('source_id', source.id)
    .maybeSingle();

  const currentRow = {
    source_id: source.id,
    company_id: source.company_id,
    vehicle_id: source.vehicle_id,
    provider: source.provider,
    latitude,
    longitude,
    altitude_m: altitudeM,
    accuracy_m: accuracyM,
    speed_kmh: speedKmh,
    heading_deg: headingDeg,
    satellites,
    ignition,
    motion,
    odometer_km: odometerKm,
    recorded_at: recordedAt,
    received_at: now,
    raw_data: { traccar: body },
  };

  const { error: currentError } = await admin.from('v2_vehicle_tracking_source_current').upsert(currentRow, { onConflict: 'source_id' });
  if (currentError) return json({ error: 'TRACKING_CURRENT_WRITE_FAILED', message: currentError.message }, 500);

  const historyRow = {
    company_id: source.company_id,
    vehicle_id: source.vehicle_id,
    provider: source.provider,
    tracking_source_id: source.id,
    odometer_km: odometerKm,
    distance_delta_km: 0,
    latitude,
    longitude,
    speed_kmh: speedKmh,
    ignition,
    heading_deg: headingDeg,
    altitude_m: altitudeM,
    accuracy_m: accuracyM,
    satellites,
    motion,
    recorded_at: recordedAt,
    synced_at: now,
    raw_data: { uniqueId, protocol: position?.protocol ?? null, attributes: attrs },
  };

  let deltaKm = 0;
  let deltaSeconds = 0;
  if (previous?.recorded_at) {
    const prevMs = new Date(previous.recorded_at).getTime();
    const curMs = new Date(recordedAt).getTime();
    if (Number.isFinite(prevMs) && Number.isFinite(curMs) && curMs > prevMs) {
      deltaSeconds = Math.min(3600, Math.floor((curMs - prevMs) / 1000));
      const prevOdo = num(previous.odometer_km);
      if (prevOdo !== null && odometerKm !== null && odometerKm >= prevOdo && odometerKm - prevOdo <= 100) {
        deltaKm = odometerKm - prevOdo;
      } else {
        deltaKm = haversineKm(num(previous.latitude), num(previous.longitude), latitude, longitude);
        if (deltaKm > 10) deltaKm = 0;
      }
    }
  }
  historyRow.distance_delta_km = deltaKm;

  const { error: historyError } = await admin.from('v2_vehicle_tracking_history').upsert(historyRow, {
    onConflict: 'vehicle_id,provider,recorded_at', ignoreDuplicates: true,
  });
  if (historyError) console.warn('TRACKING_HISTORY_WRITE_FAILED', historyError.message);

  const telemetry = {
    engine_rpm: pickNumber(attrs, ['rpm', 'engineRpm', 'engineRPM', 'engineSpeed']),
    can_speed_kmh: pickNumber(attrs, ['canSpeedKmh', 'canSpeed', 'vehicleSpeed']),
    coolant_temp_c: pickNumber(attrs, ['coolantTemp', 'coolantTemperature', 'engineCoolantTemperature']),
    engine_hours: pickNumber(attrs, ['engineHours']),
    fuel_percent: pickNumber(attrs, ['fuelPercent', 'fuelLevel']),
    fuel_liters: pickNumber(attrs, ['fuelLiters']),
    total_fuel_used_l: pickNumber(attrs, ['totalFuelUsed', 'fuelUsed']),
    battery_voltage: pickNumber(attrs, ['batteryVoltage', 'battery']),
    external_voltage: pickNumber(attrs, ['power', 'externalVoltage']),
    accelerator_percent: pickNumber(attrs, ['acceleratorPercent', 'acceleratorPosition']),
    engine_load_percent: pickNumber(attrs, ['engineLoad', 'engineLoadPercent']),
  };
  const hasTelemetry = Object.values(telemetry).some((v) => v !== null);
  if (hasTelemetry) {
    const telemetryRow = {
      company_id: source.company_id,
      vehicle_id: source.vehicle_id,
      source_id: source.id,
      ...telemetry,
      recorded_at: recordedAt,
      updated_at: now,
      raw_data: { attributes: attrs },
    };
    const { error: telemetryCurrentError } = await admin.from('v2_vehicle_telemetry_current').upsert(telemetryRow, { onConflict: 'vehicle_id' });
    if (telemetryCurrentError) console.warn('TELEMETRY_CURRENT_WRITE_FAILED', telemetryCurrentError.message);
    const { updated_at: _updated, ...telemetryHistoryRow } = telemetryRow;
    const { error: telemetryHistoryError } = await admin.from('v2_vehicle_telemetry_history').insert(telemetryHistoryRow);
    if (telemetryHistoryError) console.warn('TELEMETRY_HISTORY_WRITE_FAILED', telemetryHistoryError.message);
  }

  const { data: activeTrip } = await admin
    .from('v2_vehicle_trips')
    .select('id,distance_km,max_speed_kmh,driving_seconds,idle_seconds,start_odometer_km')
    .eq('source_id', source.id)
    .eq('status', 'active')
    .maybeSingle();

  const moving = motion === true || (speedKmh !== null && speedKmh > 3);
  const shouldBeActive = ignition === true || moving;
  if (shouldBeActive && !activeTrip) {
    await admin.from('v2_vehicle_trips').insert({
      company_id: source.company_id,
      vehicle_id: source.vehicle_id,
      source_id: source.id,
      status: 'active',
      started_at: recordedAt,
      start_latitude: latitude,
      start_longitude: longitude,
      start_odometer_km: odometerKm,
      max_speed_kmh: speedKmh ?? 0,
      metadata: { started_by: ignition === true ? 'ignition' : 'movement' },
    });
  } else if (activeTrip) {
    const nextDistance = Number(activeTrip.distance_km || 0) + deltaKm;
    const nextMaxSpeed = Math.max(Number(activeTrip.max_speed_kmh || 0), speedKmh ?? 0);
    const nextDriving = Number(activeTrip.driving_seconds || 0) + (moving ? deltaSeconds : 0);
    const nextIdle = Number(activeTrip.idle_seconds || 0) + (!moving && ignition === true ? deltaSeconds : 0);
    const endTrip = ignition === false && !moving;
    const update: Record<string, unknown> = {
      distance_km: nextDistance,
      max_speed_kmh: nextMaxSpeed,
      driving_seconds: nextDriving,
      idle_seconds: nextIdle,
      updated_at: now,
    };
    if (endTrip) {
      update.status = 'completed';
      update.ended_at = recordedAt;
      update.end_latitude = latitude;
      update.end_longitude = longitude;
      update.end_odometer_km = odometerKm;
    }
    await admin.from('v2_vehicle_trips').update(update).eq('id', activeTrip.id);
  }

  const faults: any[] = Array.isArray(body?.faults) ? body.faults : Array.isArray(attrs?.faults) ? attrs.faults as any[] : [];
  for (const f of faults.slice(0, 50)) {
    const protocol = String(f?.protocol || 'j1939').toLowerCase();
    const spn = num(f?.spn);
    const fmi = num(f?.fmi);
    const code = f?.code ? String(f.code) : null;
    let q = admin.from('v2_vehicle_faults').select('id,occurrence_count').eq('vehicle_id', source.vehicle_id).eq('source_id', source.id).eq('protocol', protocol).eq('status', 'active');
    q = spn === null ? q.is('spn', null) : q.eq('spn', spn);
    q = fmi === null ? q.is('fmi', null) : q.eq('fmi', fmi);
    q = code === null ? q.is('code', null) : q.eq('code', code);
    const { data: existingFault } = await q.maybeSingle();
    if (existingFault) {
      await admin.from('v2_vehicle_faults').update({
        occurrence_count: Number(f?.occurrence_count ?? existingFault.occurrence_count ?? 1),
        description: f?.description ? String(f.description) : null,
        last_seen_at: recordedAt,
        raw_data: f,
      }).eq('id', existingFault.id);
    } else {
      await admin.from('v2_vehicle_faults').insert({
        company_id: source.company_id,
        vehicle_id: source.vehicle_id,
        source_id: source.id,
        protocol,
        spn,
        fmi,
        occurrence_count: num(f?.occurrence_count) ?? 1,
        code,
        description: f?.description ? String(f.description) : null,
        status: 'active',
        first_seen_at: recordedAt,
        last_seen_at: recordedAt,
        raw_data: f,
      });
    }
  }

  await admin.from('v2_tracking_ingest_keys').update({ last_used_at: now }).eq('id', ingestKey.id);

  return json({
    success: true,
    sourceId: source.id,
    vehicleId: source.vehicle_id,
    recordedAt,
    position: { latitude, longitude, speedKmh, ignition, motion, odometerKm },
    telemetryCaptured: hasTelemetry,
    faultsCaptured: faults.length,
  });
});