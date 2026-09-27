-- Comando 360: catalogo tecnico de veiculos e perfil da Sprinter
-- Estrutura multi-tenant para organizar sistemas, componentes, codigos OEM e aplicabilidade por veiculo.

create table if not exists public.v2_vehicle_technical_profiles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.v2_companies(id) on delete cascade,
  vehicle_id uuid not null references public.v2_vehicles(id) on delete cascade,
  vin text,
  chassis_family text,
  chassis_variant text,
  engine_family text,
  engine_code text,
  engine_serial text,
  production_year integer,
  model_year integer,
  power_cv numeric,
  fuel_type text,
  gross_vehicle_weight_t numeric,
  gross_combination_weight_t numeric,
  axle_count integer,
  seats integer,
  body_type text,
  source text not null default 'manual',
  source_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, vehicle_id)
);

create table if not exists public.v2_vehicle_component_groups (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  parent_code text references public.v2_vehicle_component_groups(code) on delete set null,
  sort_order integer not null default 100,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.v2_vehicle_components (
  id uuid primary key default gen_random_uuid(),
  group_code text not null references public.v2_vehicle_component_groups(code) on delete restrict,
  name text not null,
  generic_name text,
  oem_brand text,
  oem_part_number text,
  superseded_by_part_number text,
  manufacturer_part_number text,
  location_description text,
  function_description text,
  failure_symptoms jsonb not null default '[]'::jsonb,
  diagnostic_notes jsonb not null default '[]'::jsonb,
  required_tools jsonb not null default '[]'::jsonb,
  torque_spec jsonb not null default '{}'::jsonb,
  connector_spec jsonb not null default '{}'::jsonb,
  image_reference text,
  exploded_view_reference text,
  data_status text not null default 'reference_pending'
    check (data_status in ('verified','reference_pending','estimated','deprecated')),
  source_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.v2_vehicle_component_applications (
  id uuid primary key default gen_random_uuid(),
  component_id uuid not null references public.v2_vehicle_components(id) on delete cascade,
  chassis_family text,
  chassis_variant text,
  engine_family text,
  engine_code text,
  model_year_from integer,
  model_year_to integer,
  notes text,
  fitment_status text not null default 'candidate'
    check (fitment_status in ('verified','candidate','not_applicable')),
  source_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.v2_vehicle_component_links (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.v2_companies(id) on delete cascade,
  vehicle_id uuid not null references public.v2_vehicles(id) on delete cascade,
  component_id uuid not null references public.v2_vehicle_components(id) on delete cascade,
  fitment_status text not null default 'candidate'
    check (fitment_status in ('verified','candidate','not_applicable')),
  installed_part_number text,
  installed_brand text,
  installed_at date,
  removed_at date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, vehicle_id, component_id)
);

create index if not exists idx_v2_vehicle_technical_profiles_vehicle on public.v2_vehicle_technical_profiles(vehicle_id);
create index if not exists idx_v2_vehicle_components_group on public.v2_vehicle_components(group_code);
create index if not exists idx_v2_vehicle_components_oem_part on public.v2_vehicle_components(oem_part_number);
create index if not exists idx_v2_vehicle_component_applications_lookup on public.v2_vehicle_component_applications(chassis_family, chassis_variant, engine_code);
create index if not exists idx_v2_vehicle_component_links_vehicle on public.v2_vehicle_component_links(company_id, vehicle_id);

alter table public.v2_vehicle_technical_profiles enable row level security;
alter table public.v2_vehicle_component_groups enable row level security;
alter table public.v2_vehicle_components enable row level security;
alter table public.v2_vehicle_component_applications enable row level security;
alter table public.v2_vehicle_component_links enable row level security;

-- Dados globais de catalogo podem ser lidos por usuarios autenticados; escrita fica restrita a backend/service role.
drop policy if exists "authenticated can read vehicle component groups" on public.v2_vehicle_component_groups;
create policy "authenticated can read vehicle component groups"
  on public.v2_vehicle_component_groups for select
  to authenticated
  using (true);

drop policy if exists "authenticated can read vehicle components" on public.v2_vehicle_components;
create policy "authenticated can read vehicle components"
  on public.v2_vehicle_components for select
  to authenticated
  using (true);

drop policy if exists "authenticated can read vehicle applications" on public.v2_vehicle_component_applications;
create policy "authenticated can read vehicle applications"
  on public.v2_vehicle_component_applications for select
  to authenticated
  using (true);

-- Perfil e vinculos respeitam o tenant do usuario logado.
drop policy if exists "company members can read technical profiles" on public.v2_vehicle_technical_profiles;
create policy "company members can read technical profiles"
  on public.v2_vehicle_technical_profiles for select
  to authenticated
  using (exists (
    select 1 from public.v2_company_members m
    where m.company_id = v2_vehicle_technical_profiles.company_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  ));

drop policy if exists "company members can manage technical profiles" on public.v2_vehicle_technical_profiles;
create policy "company members can manage technical profiles"
  on public.v2_vehicle_technical_profiles for all
  to authenticated
  using (exists (
    select 1 from public.v2_company_members m
    where m.company_id = v2_vehicle_technical_profiles.company_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  ))
  with check (exists (
    select 1 from public.v2_company_members m
    where m.company_id = v2_vehicle_technical_profiles.company_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  ));

drop policy if exists "company members can read vehicle component links" on public.v2_vehicle_component_links;
create policy "company members can read vehicle component links"
  on public.v2_vehicle_component_links for select
  to authenticated
  using (exists (
    select 1 from public.v2_company_members m
    where m.company_id = v2_vehicle_component_links.company_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  ));

drop policy if exists "company members can manage vehicle component links" on public.v2_vehicle_component_links;
create policy "company members can manage vehicle component links"
  on public.v2_vehicle_component_links for all
  to authenticated
  using (exists (
    select 1 from public.v2_company_members m
    where m.company_id = v2_vehicle_component_links.company_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  ))
  with check (exists (
    select 1 from public.v2_company_members m
    where m.company_id = v2_vehicle_component_links.company_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  ));

insert into public.v2_vehicle_component_groups(code,name,parent_code,sort_order) values
 ('engine','Motor',null,10),
 ('engine_air','Admissao e ar do motor','engine',20),
 ('engine_turbo','Turboalimentacao','engine',30),
 ('engine_fuel','Injecao e combustivel','engine',40),
 ('engine_cooling','Arrefecimento','engine',50),
 ('engine_lubrication','Lubrificacao e respiro','engine',60),
 ('exhaust','Escape e emissoes',null,70),
 ('transmission','Cambio e embreagem',null,80),
 ('driveline','Carda e diferencial',null,90),
 ('brakes','Freios e ABS',null,100),
 ('suspension','Suspensao',null,110),
 ('steering','Direcao',null,120),
 ('electrical','Eletrica, sensores e modulos',null,130),
 ('body','Carroceria e interior',null,140),
 ('hvac','Ar-condicionado e ventilacao',null,150)
on conflict (code) do update set name = excluded.name, parent_code = excluded.parent_code, sort_order = excluded.sort_order;
