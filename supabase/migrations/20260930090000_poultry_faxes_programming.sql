create table if not exists public.v2_poultry_faxes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.v2_companies(id) on delete cascade,
  team_id uuid references public.v2_teams(id) on delete set null,
  pickup_date date not null,
  scheduled_time time,
  client_name text,
  integrated_name text not null,
  farm_name text,
  city text not null,
  location_text text,
  expected_birds integer check (expected_birds is null or expected_birds >= 0),
  shed_count integer check (shed_count is null or shed_count >= 0),
  notes text,
  storage_bucket text not null default 'v2-poultry-sheets',
  storage_path text,
  original_name text,
  mime_type text,
  status text not null default 'scheduled' check (status in ('scheduled','completed','cancelled')),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists v2_poultry_faxes_company_date_idx on public.v2_poultry_faxes(company_id,pickup_date,status);
create index if not exists v2_poultry_faxes_team_date_idx on public.v2_poultry_faxes(team_id,pickup_date) where team_id is not null;

alter table public.v2_poultry_faxes enable row level security;

drop policy if exists v2_poultry_faxes_select on public.v2_poultry_faxes;
create policy v2_poultry_faxes_select on public.v2_poultry_faxes
for select to authenticated
using (v2_is_company_member(company_id));

drop policy if exists v2_poultry_faxes_write on public.v2_poultry_faxes;
create policy v2_poultry_faxes_write on public.v2_poultry_faxes
for all to authenticated
using (v2_has_permission(company_id,'poultry.manage'))
with check (v2_has_permission(company_id,'poultry.manage'));

grant select,insert,update,delete on public.v2_poultry_faxes to authenticated;
