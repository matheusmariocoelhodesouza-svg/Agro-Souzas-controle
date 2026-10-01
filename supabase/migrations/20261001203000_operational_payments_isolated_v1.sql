-- Operational payment ledger. Intentionally independent from v2_employee_payments, payroll, payslips and timeclock.
create table if not exists public.v2_operational_payment_runs(
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.v2_companies(id) on delete cascade,
 team_name text not null, period_start date not null, period_end date not null, status text not null default 'draft' check(status in ('draft','closed','paid','cancelled')),
 gross_total numeric(14,2) not null default 0, discount_total numeric(14,2) not null default 0, net_total numeric(14,2) not null default 0,
 notes text, created_by uuid default auth.uid(), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(company_id,team_name,period_start,period_end));
create table if not exists public.v2_operational_payment_items(
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.v2_companies(id) on delete cascade,
 run_id uuid not null references public.v2_operational_payment_runs(id) on delete cascade,
 worker_profile_id uuid not null references public.v2_operational_worker_profiles(id) on delete restrict,
 operational_name text not null, team_name text not null, days numeric(8,2) not null default 0, daily_total numeric(12,2) not null default 0,
 repass_total numeric(12,2) not null default 0, mud_total numeric(12,2) not null default 0, hours_total numeric(12,2) not null default 0,
 other_additional numeric(12,2) not null default 0, grocery numeric(12,2) not null default 0, valinho numeric(12,2) not null default 0,
 borrowed numeric(12,2) not null default 0, remaining numeric(12,2) not null default 0, rent numeric(12,2) not null default 0,
 pix_advance numeric(12,2) not null default 0, other_discount numeric(12,2) not null default 0, gross_amount numeric(12,2) not null default 0,
 discount_amount numeric(12,2) not null default 0, net_amount numeric(12,2) not null default 0, notes text, pix_key text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(run_id,worker_profile_id));
alter table public.v2_operational_payment_runs enable row level security;alter table public.v2_operational_payment_items enable row level security;
drop policy if exists v2_operational_payment_runs_member on public.v2_operational_payment_runs;create policy v2_operational_payment_runs_member on public.v2_operational_payment_runs for all using(public.v2_is_company_member(company_id)) with check(public.v2_is_company_member(company_id));
drop policy if exists v2_operational_payment_items_member on public.v2_operational_payment_items;create policy v2_operational_payment_items_member on public.v2_operational_payment_items for all using(public.v2_is_company_member(company_id)) with check(public.v2_is_company_member(company_id));
grant select,insert,update,delete on public.v2_operational_payment_runs,public.v2_operational_payment_items to authenticated;