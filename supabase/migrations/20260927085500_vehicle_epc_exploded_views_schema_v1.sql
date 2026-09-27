-- EPC detalhado: vistas explodidas, itens numerados e relações peça-subpeça.
-- Esta migration documenta a estrutura já aplicada no banco de produção.

create table if not exists public.v2_vehicle_exploded_views (
  id uuid primary key default gen_random_uuid(),
  group_code text not null references public.v2_vehicle_component_groups(code) on update cascade,
  chassis_family text,
  chassis_variant text,
  engine_code text,
  assembly_code text,
  title text not null,
  subtitle text,
  source_name text,
  source_url text,
  source_diagram_key text,
  image_reference text,
  image_license_status text not null default 'reference_only' check (image_license_status in ('reference_only','licensed','generated','public_domain','unknown')),
  verification_status text not null default 'reference_pending' check (verification_status in ('verified','estimated','reference_pending')),
  notes text,
  source_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.v2_vehicle_exploded_view_items (
  id uuid primary key default gen_random_uuid(),
  exploded_view_id uuid not null references public.v2_vehicle_exploded_views(id) on delete cascade,
  component_id uuid not null references public.v2_vehicle_components(id) on delete cascade,
  item_number text,
  parent_item_number text,
  quantity numeric,
  component_type text not null default 'part',
  position_note text,
  exactness_status text not null default 'reference_pending',
  source_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(exploded_view_id,component_id,item_number)
);

create table if not exists public.v2_vehicle_component_relations (
  id uuid primary key default gen_random_uuid(),
  parent_component_id uuid not null references public.v2_vehicle_components(id) on delete cascade,
  child_component_id uuid not null references public.v2_vehicle_components(id) on delete cascade,
  relation_type text not null default 'contains',
  quantity numeric,
  notes text,
  source_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(parent_component_id,child_component_id,relation_type)
);

alter table public.v2_vehicle_components add column if not exists component_type text not null default 'part';
alter table public.v2_vehicle_components add column if not exists service_priority text;
alter table public.v2_vehicle_components add column if not exists dimensions_spec jsonb not null default '{}'::jsonb;
alter table public.v2_vehicle_components add column if not exists material_spec jsonb not null default '{}'::jsonb;
alter table public.v2_vehicle_components add column if not exists thread_spec jsonb not null default '{}'::jsonb;
alter table public.v2_vehicle_components add column if not exists replacement_notes jsonb not null default '[]'::jsonb;
