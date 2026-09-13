create table if not exists public.v2_client_health_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  user_id uuid default auth.uid(),
  team_id uuid,
  device_access_id uuid,
  reported_at timestamptz not null default now(),
  app_version text,
  recovery_version text,
  mode text,
  route text,
  kind text not null,
  severity text not null default 'error',
  fingerprint text,
  message text,
  stack text,
  recovery_action text,
  recovered boolean,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint v2_client_health_events_mode_chk check (mode is null or mode in ('entry','admin','field','unknown')),
  constraint v2_client_health_events_severity_chk check (severity in ('info','warning','error','critical'))
);

create index if not exists v2_client_health_events_company_created_idx
  on public.v2_client_health_events(company_id, created_at desc);
create index if not exists v2_client_health_events_fingerprint_idx
  on public.v2_client_health_events(company_id, fingerprint, created_at desc);

alter table public.v2_client_health_events enable row level security;

drop policy if exists v2_client_health_events_insert on public.v2_client_health_events;
create policy v2_client_health_events_insert
on public.v2_client_health_events
for insert
to authenticated
with check (
  user_id = auth.uid()
  and (
    v2_is_company_member(company_id)
    or (
      private.v2_is_device_session()
      and (team_id is null or team_id = private.v2_device_team_id(company_id))
    )
  )
);

drop policy if exists v2_client_health_events_select on public.v2_client_health_events;
create policy v2_client_health_events_select
on public.v2_client_health_events
for select
to authenticated
using (v2_is_company_member(company_id));

comment on table public.v2_client_health_events is
'Diagnósticos técnicos do AutoRecovery 360. Não contém dados operacionais; registros são usados para detectar e recuperar falhas do cliente/PWA.';
