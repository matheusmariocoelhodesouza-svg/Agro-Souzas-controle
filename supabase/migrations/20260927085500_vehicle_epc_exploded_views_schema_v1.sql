-- EPC detalhado: vistas explodidas, itens numerados e relações peça-subpeça.

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
  component_type text not null default 'part' check (component_type in ('assembly','part','fastener','washer','nut','bolt','screw','stud','seal','o_ring','gasket','clip','spring','bearing','bushing','hose','pipe','connector','wire','sensor','actuator','consumable','other')),
  position_note text,
  exactness_status text not null default 'reference_pending' check (exactness_status in ('verified','estimated','reference_pending')),
  source_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(exploded_view_id,component_id,item_number)
);

create table if not exists public.v2_vehicle_component_relations (
  id uuid primary key default gen_random_uuid(),
  parent_component_id uuid not null references public.v2_vehicle_components(id) on delete cascade,
  child_component_id uuid not null references public.v2_vehicle_components(id) on delete cascade,
  relation_type text not null default 'contains' check (relation_type in ('contains','fastened_by','sealed_by','connected_to','part_of','service_with')),
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

create index if not exists idx_v2_vehicle_exploded_views_lookup on public.v2_vehicle_exploded_views(chassis_family,chassis_variant,engine_code,group_code);
create index if not exists idx_v2_vehicle_exploded_view_items_view on public.v2_vehicle_exploded_view_items(exploded_view_id,item_number);
create index if not exists idx_v2_vehicle_exploded_view_items_component on public.v2_vehicle_exploded_view_items(component_id);
create index if not exists idx_v2_vehicle_component_relations_parent on public.v2_vehicle_component_relations(parent_component_id);
create index if not exists idx_v2_vehicle_component_relations_child on public.v2_vehicle_component_relations(child_component_id);

alter table public.v2_vehicle_exploded_views enable row level security;
alter table public.v2_vehicle_exploded_view_items enable row level security;
alter table public.v2_vehicle_component_relations enable row level security;

drop policy if exists v2_vehicle_exploded_views_authenticated_select on public.v2_vehicle_exploded_views;
create policy v2_vehicle_exploded_views_authenticated_select on public.v2_vehicle_exploded_views for select to authenticated using (true);
drop policy if exists v2_vehicle_exploded_view_items_authenticated_select on public.v2_vehicle_exploded_view_items;
create policy v2_vehicle_exploded_view_items_authenticated_select on public.v2_vehicle_exploded_view_items for select to authenticated using (true);
drop policy if exists v2_vehicle_component_relations_authenticated_select on public.v2_vehicle_component_relations;
create policy v2_vehicle_component_relations_authenticated_select on public.v2_vehicle_component_relations for select to authenticated using (true);
