-- Oficina 360 — convert a guided diagnostic session into a work order.

create or replace function public.v2_create_work_order_from_diagnostic_session(p_session_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  s public.v2_diagnostic_sessions%rowtype;
  next_number bigint;
  wo_id uuid;
begin
  select * into s
  from public.v2_diagnostic_sessions
  where id = p_session_id;

  if not found then
    raise exception 'Diagnostic session not found';
  end if;

  if not public.v2_has_permission(s.company_id,'workshop.manage') then
    raise exception 'Insufficient workshop permission';
  end if;

  if s.work_order_id is not null then
    return s.work_order_id;
  end if;

  -- Serialize numbering per company to avoid duplicated work-order numbers.
  perform pg_advisory_xact_lock(hashtextextended(s.company_id::text,0));

  select coalesce(max(work_order_number),0)+1
    into next_number
  from public.v2_work_orders
  where company_id = s.company_id;

  insert into public.v2_work_orders (
    company_id,vehicle_id,work_order_number,maintenance_type,title,
    reported_issue,diagnosis,service_performed,odometer_km,status,
    metadata,created_by
  ) values (
    s.company_id,
    s.vehicle_id,
    next_number,
    'corrective',
    concat('Diagnóstico ',coalesce(s.code,'sem DTC'),' — ',s.title),
    nullif(s.symptom,''),
    nullif(s.conclusion,''),
    nullif(s.service_performed,''),
    s.odometer_km,
    'open',
    jsonb_build_object(
      'source','oficina360_guided_diagnostic',
      'diagnostic_session_id',s.id,
      'fault_id',s.fault_id,
      'protocol',s.protocol,
      'code',s.code,
      'root_cause',s.root_cause,
      'diagnostic_result',s.result
    ),
    auth.uid()
  ) returning id into wo_id;

  update public.v2_diagnostic_sessions
     set work_order_id=wo_id,updated_at=now(),last_activity_at=now()
   where id=s.id;

  return wo_id;
end;
$$;

grant execute on function public.v2_create_work_order_from_diagnostic_session(uuid) to authenticated;
