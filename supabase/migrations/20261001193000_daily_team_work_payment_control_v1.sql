-- Applied to production on 2026-10-01: operational daily attendance/payment bridge.
-- Source of truth for v2_daily_team_work, v2_daily_team_work_members and v2_daily_team_additionals.
create table if not exists public.v2_daily_team_work (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.v2_companies(id) on delete cascade,
 work_date date not null, team_id uuid references public.v2_teams(id) on delete set null, team_name text not null,
 expected_headcount int not null default 14 check(expected_headcount>0), status text not null default 'open' check(status in ('open','closed','cancelled')),
 notes text, created_by uuid default auth.uid(), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(company_id,work_date,team_name));
create table if not exists public.v2_daily_team_work_members (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.v2_companies(id) on delete cascade,
 daily_work_id uuid not null references public.v2_daily_team_work(id) on delete cascade, employee_id uuid not null references public.v2_employees(id) on delete restrict,
 employee_name text not null, home_team text, work_team text not null, role_type text not null default 'floor' check(role_type in ('loader','floor')),
 daily_rate numeric(12,2) not null default 160 check(daily_rate>=0), attendance_status text not null default 'present' check(attendance_status in ('present','absent')),
 borrowed boolean not null default false, counts_for_headcount boolean not null default true, absence_repass_pool numeric(12,2) not null default 0,
 absence_repass_share numeric(12,2) not null default 0, collective_additional_share numeric(12,2) not null default 0,
 hour_additional numeric(12,2) not null default 0, other_additional numeric(12,2) not null default 0, notes text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(daily_work_id,employee_id));
create table if not exists public.v2_daily_team_additionals (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.v2_companies(id) on delete cascade,
 daily_work_id uuid not null references public.v2_daily_team_work(id) on delete cascade, kind text not null check(kind in ('mud','hours','other')),
 description text, amount numeric(12,2) not null default 0 check(amount>=0), hours numeric(8,2) not null default 0 check(hours>=0),
 status text not null default 'pending' check(status in ('pending','approved','rejected')), reported_by uuid default auth.uid(), approved_by uuid,
 reported_at timestamptz not null default now(), approved_at timestamptz, metadata jsonb not null default '{}'::jsonb);
create index if not exists v2_daily_team_work_company_date_idx on public.v2_daily_team_work(company_id,work_date desc,team_name);
create index if not exists v2_daily_team_members_work_idx on public.v2_daily_team_work_members(daily_work_id,attendance_status,work_team);
create index if not exists v2_daily_team_additional_status_idx on public.v2_daily_team_additionals(company_id,status,reported_at desc);
alter table public.v2_daily_team_work enable row level security; alter table public.v2_daily_team_work_members enable row level security; alter table public.v2_daily_team_additionals enable row level security;
drop policy if exists v2_daily_team_work_member on public.v2_daily_team_work; create policy v2_daily_team_work_member on public.v2_daily_team_work for all using(public.v2_is_company_member(company_id)) with check(public.v2_is_company_member(company_id));
drop policy if exists v2_daily_team_members_member on public.v2_daily_team_work_members; create policy v2_daily_team_members_member on public.v2_daily_team_work_members for all using(public.v2_is_company_member(company_id)) with check(public.v2_is_company_member(company_id));
drop policy if exists v2_daily_team_additional_member on public.v2_daily_team_additionals; create policy v2_daily_team_additional_member on public.v2_daily_team_additionals for all using(public.v2_is_company_member(company_id)) with check(public.v2_is_company_member(company_id));
grant select,insert,update,delete on public.v2_daily_team_work,public.v2_daily_team_work_members,public.v2_daily_team_additionals to authenticated;