-- Comando 360 • P0 device activation hardening.
-- Stores only a one-way fingerprint of the requester; raw IP is never persisted.

create table if not exists public.v2_device_activation_attempts (
  attempt_key text primary key,
  window_started_at timestamptz not null default now(),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  blocked_until timestamptz,
  last_attempt_at timestamptz not null default now()
);

alter table public.v2_device_activation_attempts enable row level security;

create or replace function public.v2_device_activation_precheck(
  p_code_hash text,
  p_attempt_key text
)
returns table(allowed boolean, code_valid boolean, retry_after_seconds integer)
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_now timestamptz := now();
  v_row public.v2_device_activation_attempts%rowtype;
  v_valid boolean := false;
  v_count integer := 0;
  v_retry integer := 0;
begin
  if nullif(trim(p_attempt_key),'') is null or length(p_attempt_key) > 128 then
    raise exception 'Identificador de tentativa inválido';
  end if;
  if nullif(trim(p_code_hash),'') is null or length(p_code_hash) <> 64 then
    raise exception 'Hash do código inválido';
  end if;

  select * into v_row
  from public.v2_device_activation_attempts a
  where a.attempt_key=p_attempt_key
  for update;

  if found and v_row.blocked_until is not null and v_row.blocked_until > v_now then
    v_retry := greatest(1,ceil(extract(epoch from (v_row.blocked_until-v_now)))::integer);
    return query select false,false,v_retry;
    return;
  end if;

  select exists(
    select 1
    from public.v2_device_pairing_codes pc
    join public.v2_teams t on t.id=pc.team_id and t.company_id=pc.company_id
    join public.v2_companies c on c.id=pc.company_id
    where pc.code_hash=lower(trim(p_code_hash))
      and pc.used_at is null
      and pc.expires_at > v_now
      and t.status='active'
      and c.status='active'
  ) into v_valid;

  if v_valid then
    insert into public.v2_device_activation_attempts(attempt_key,window_started_at,attempt_count,blocked_until,last_attempt_at)
    values(p_attempt_key,v_now,0,null,v_now)
    on conflict(attempt_key) do update
      set attempt_count=0,window_started_at=v_now,blocked_until=null,last_attempt_at=v_now;
    return query select true,true,0;
    return;
  end if;

  if not found or v_row.window_started_at < v_now - interval '10 minutes' then
    v_count := 1;
    insert into public.v2_device_activation_attempts(attempt_key,window_started_at,attempt_count,blocked_until,last_attempt_at)
    values(p_attempt_key,v_now,v_count,null,v_now)
    on conflict(attempt_key) do update
      set window_started_at=v_now,attempt_count=v_count,blocked_until=null,last_attempt_at=v_now;
  else
    v_count := v_row.attempt_count + 1;
    update public.v2_device_activation_attempts
       set attempt_count=v_count,
           last_attempt_at=v_now,
           blocked_until=case when v_count >= 12 then v_now + interval '15 minutes' else null end
     where attempt_key=p_attempt_key;
  end if;

  if v_count >= 12 then v_retry := 900; end if;
  return query select (v_count < 12),false,v_retry;
end;
$function$;

revoke all on table public.v2_device_activation_attempts from public,anon,authenticated;
revoke execute on function public.v2_device_activation_precheck(text,text) from public,anon,authenticated;
grant execute on function public.v2_device_activation_precheck(text,text) to service_role;

create index if not exists v2_device_activation_attempts_last_idx
  on public.v2_device_activation_attempts(last_attempt_at);
