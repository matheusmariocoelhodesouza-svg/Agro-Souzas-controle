create table if not exists public.v2_fiscal_periods (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.v2_companies(id) on delete cascade,
  competence_date date not null,
  status text not null default 'open' check (status in ('open','calculating','ready','submitted','closed','reopened')),
  employee_count integer not null default 0 check (employee_count >= 0),
  gross_payroll numeric(14,2),
  fgts_amount numeric(14,2),
  inss_amount numeric(14,2),
  irrf_amount numeric(14,2),
  das_amount numeric(14,2),
  other_taxes_amount numeric(14,2),
  total_taxes_amount numeric(14,2),
  closed_at timestamptz,
  submitted_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint v2_fiscal_periods_company_competence_key unique(company_id, competence_date)
);

create table if not exists public.v2_fiscal_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.v2_companies(id) on delete cascade,
  period_id uuid references public.v2_fiscal_periods(id) on delete cascade,
  employee_id uuid references public.v2_employees(id) on delete set null,
  system_code text not null check (system_code in ('esocial','fgts_digital','dctfweb','pgdas','mit','other')),
  event_code text,
  event_type text not null,
  status text not null default 'draft' check (status in ('draft','ready','queued','submitted','processing','accepted','rejected','cancelled')),
  external_id text,
  receipt_number text,
  response_code text,
  response_message text,
  file_id uuid references public.v2_files(id) on delete set null,
  submitted_at timestamptz,
  processed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.v2_fiscal_guides (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.v2_companies(id) on delete cascade,
  period_id uuid references public.v2_fiscal_periods(id) on delete set null,
  guide_type text not null check (guide_type in ('fgts','fgts_rescisorio','darf_dctfweb','das','mit','other')),
  competence_date date not null,
  due_date date,
  amount numeric(14,2) check (amount is null or amount >= 0),
  status text not null default 'pending' check (status in ('pending','generated','paid','overdue','cancelled')),
  issuer text,
  external_reference text,
  file_id uuid references public.v2_files(id) on delete set null,
  proof_file_id uuid references public.v2_files(id) on delete set null,
  paid_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.v2_fiscal_integrations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.v2_companies(id) on delete cascade,
  provider text not null check (provider in ('esocial','fgts_digital','dctfweb','pgdas','mit','other')),
  environment text not null default 'production_restricted' check (environment in ('production_restricted','production')),
  status text not null default 'not_configured' check (status in ('not_configured','configured','testing','active','error','disabled')),
  certificate_type text,
  certificate_subject text,
  certificate_expires_at timestamptz,
  secret_ref text,
  last_test_at timestamptz,
  last_success_at timestamptz,
  last_error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint v2_fiscal_integrations_company_provider_key unique(company_id, provider)
);

create index if not exists v2_fiscal_periods_company_status_idx on public.v2_fiscal_periods(company_id,status,competence_date desc);
create index if not exists v2_fiscal_events_company_period_idx on public.v2_fiscal_events(company_id,period_id,created_at desc);
create index if not exists v2_fiscal_events_system_status_idx on public.v2_fiscal_events(company_id,system_code,status);
create index if not exists v2_fiscal_guides_company_due_idx on public.v2_fiscal_guides(company_id,status,due_date);
create index if not exists v2_fiscal_integrations_company_idx on public.v2_fiscal_integrations(company_id,provider);

alter table public.v2_fiscal_periods enable row level security;
alter table public.v2_fiscal_events enable row level security;
alter table public.v2_fiscal_guides enable row level security;
alter table public.v2_fiscal_integrations enable row level security;

drop policy if exists v2_fiscal_periods_member_select on public.v2_fiscal_periods;
create policy v2_fiscal_periods_member_select on public.v2_fiscal_periods for select to authenticated using (public.v2_is_company_member(company_id));
drop policy if exists v2_fiscal_periods_write_perm on public.v2_fiscal_periods;
create policy v2_fiscal_periods_write_perm on public.v2_fiscal_periods for all to authenticated using (public.v2_has_permission(company_id,'documents.manage')) with check (public.v2_has_permission(company_id,'documents.manage'));

drop policy if exists v2_fiscal_events_member_select on public.v2_fiscal_events;
create policy v2_fiscal_events_member_select on public.v2_fiscal_events for select to authenticated using (public.v2_is_company_member(company_id));
drop policy if exists v2_fiscal_events_write_perm on public.v2_fiscal_events;
create policy v2_fiscal_events_write_perm on public.v2_fiscal_events for all to authenticated using (public.v2_has_permission(company_id,'documents.manage')) with check (public.v2_has_permission(company_id,'documents.manage'));

drop policy if exists v2_fiscal_guides_member_select on public.v2_fiscal_guides;
create policy v2_fiscal_guides_member_select on public.v2_fiscal_guides for select to authenticated using (public.v2_is_company_member(company_id));
drop policy if exists v2_fiscal_guides_write_perm on public.v2_fiscal_guides;
create policy v2_fiscal_guides_write_perm on public.v2_fiscal_guides for all to authenticated using (public.v2_has_permission(company_id,'documents.manage')) with check (public.v2_has_permission(company_id,'documents.manage'));

drop policy if exists v2_fiscal_integrations_member_select on public.v2_fiscal_integrations;
create policy v2_fiscal_integrations_member_select on public.v2_fiscal_integrations for select to authenticated using (public.v2_is_company_member(company_id));
drop policy if exists v2_fiscal_integrations_write_perm on public.v2_fiscal_integrations;
create policy v2_fiscal_integrations_write_perm on public.v2_fiscal_integrations for all to authenticated using (public.v2_has_permission(company_id,'documents.manage')) with check (public.v2_has_permission(company_id,'documents.manage'));

grant select,insert,update,delete on public.v2_fiscal_periods to authenticated;
grant select,insert,update,delete on public.v2_fiscal_events to authenticated;
grant select,insert,update,delete on public.v2_fiscal_guides to authenticated;
grant select,insert,update,delete on public.v2_fiscal_integrations to authenticated;
