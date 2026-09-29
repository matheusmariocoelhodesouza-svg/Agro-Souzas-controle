-- Oficina 360 — Guided diagnostic sessions v1
-- Persists each diagnostic run and every measurement/outcome so the workshop
-- can resume later and convert confirmed findings into vehicle history.

create table if not exists public.v2_diagnostic_sessions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.v2_companies(id) on delete restrict,
  vehicle_id uuid not null references public.v2_vehicles(id) on delete cascade,
  fault_id uuid references public.v2_vehicle_faults(id) on delete set null,
  playbook_id uuid references public.v2_vehicle_diagnostic_playbooks(id) on delete set null,
  work_order_id uuid references public.v2_work_orders(id) on delete set null,
  protocol text not null default 'obd2',
  code text,
  title text not null,
  symptom text,
  status text not null default 'active' check (status in ('active','paused','completed','abandoned')),
  current_step_index integer not null default 0 check (current_step_index >= 0),
  odometer_km numeric,
  conclusion text,
  root_cause text,
  service_performed text,
  result text,
  started_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.v2_diagnostic_session_steps (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.v2_diagnostic_sessions(id) on delete cascade,
  company_id uuid not null references public.v2_companies(id) on delete restrict,
  vehicle_id uuid not null references public.v2_vehicles(id) on delete cascade,
  step_index integer not null check (step_index >= 0),
  step_key text,
  action text not null,
  expected text,
  fail_next text,
  component_id uuid references public.v2_vehicle_components(id) on delete set null,
  electrical_node_id uuid references public.v2_vehicle_electrical_nodes(id) on delete set null,
  outcome text not null default 'pending' check (outcome in ('pending','pass','fail','inconclusive','skipped')),
  observed_value text,
  observed_unit text,
  notes text,
  measurement jsonb not null default '{}'::jsonb,
  performed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, step_index)
);

create index if not exists idx_v2_diag_sessions_company on public.v2_diagnostic_sessions(company_id);
create index if not exists idx_v2_diag_sessions_vehicle_status on public.v2_diagnostic_sessions(vehicle_id,status,last_activity_at desc);
create index if not exists idx_v2_diag_sessions_code on public.v2_diagnostic_sessions(vehicle_id,protocol,code);
create index if not exists idx_v2_diag_steps_company on public.v2_diagnostic_session_steps(company_id);
create index if not exists idx_v2_diag_steps_session on public.v2_diagnostic_session_steps(session_id,step_index);
create index if not exists idx_v2_diag_steps_vehicle on public.v2_diagnostic_session_steps(vehicle_id);

alter table public.v2_diagnostic_sessions enable row level security;
alter table public.v2_diagnostic_session_steps enable row level security;

drop policy if exists v2_diag_sessions_member_select on public.v2_diagnostic_sessions;
create policy v2_diag_sessions_member_select on public.v2_diagnostic_sessions
for select using (public.v2_is_company_member(company_id));

drop policy if exists v2_diag_sessions_insert on public.v2_diagnostic_sessions;
create policy v2_diag_sessions_insert on public.v2_diagnostic_sessions
for insert with check (public.v2_has_permission(company_id,'workshop.manage'));

drop policy if exists v2_diag_sessions_update on public.v2_diagnostic_sessions;
create policy v2_diag_sessions_update on public.v2_diagnostic_sessions
for update using (public.v2_has_permission(company_id,'workshop.manage'))
with check (public.v2_has_permission(company_id,'workshop.manage'));

drop policy if exists v2_diag_sessions_delete on public.v2_diagnostic_sessions;
create policy v2_diag_sessions_delete on public.v2_diagnostic_sessions
for delete using (public.v2_has_permission(company_id,'workshop.manage'));

drop policy if exists v2_diag_steps_member_select on public.v2_diagnostic_session_steps;
create policy v2_diag_steps_member_select on public.v2_diagnostic_session_steps
for select using (public.v2_is_company_member(company_id));

drop policy if exists v2_diag_steps_insert on public.v2_diagnostic_session_steps;
create policy v2_diag_steps_insert on public.v2_diagnostic_session_steps
for insert with check (public.v2_has_permission(company_id,'workshop.manage'));

drop policy if exists v2_diag_steps_update on public.v2_diagnostic_session_steps;
create policy v2_diag_steps_update on public.v2_diagnostic_session_steps
for update using (public.v2_has_permission(company_id,'workshop.manage'))
with check (public.v2_has_permission(company_id,'workshop.manage'));

drop policy if exists v2_diag_steps_delete on public.v2_diagnostic_session_steps;
create policy v2_diag_steps_delete on public.v2_diagnostic_session_steps
for delete using (public.v2_has_permission(company_id,'workshop.manage'));

comment on table public.v2_diagnostic_sessions is 'Persistent Oficina 360 guided diagnostic runs by vehicle/fault.';
comment on table public.v2_diagnostic_session_steps is 'Measurements and outcomes for each guided diagnostic step.';
