create table if not exists public.v2_vehicle_electrical_nodes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.v2_companies(id) on delete cascade,
  vehicle_id uuid not null references public.v2_vehicles(id) on delete cascade,
  component_id uuid references public.v2_vehicle_components(id) on delete set null,
  circuit_code text not null default 'general',
  system_code text not null default 'electrical',
  node_type text not null check (node_type in ('component','connector','fuse','relay','ground','power','ecu','module','splice','bus','sensor','actuator','other')),
  label text not null,
  reference text,
  location_description text,
  connector_name text,
  pins jsonb not null default '[]'::jsonb,
  electrical_spec jsonb not null default '{}'::jsonb,
  test_procedure jsonb not null default '{}'::jsonb,
  source_metadata jsonb not null default '{}'::jsonb,
  verification_status text not null default 'reference' check (verification_status in ('verified','reference','estimated','needs_physical_verification')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.v2_vehicle_electrical_links (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.v2_companies(id) on delete cascade,
  vehicle_id uuid not null references public.v2_vehicles(id) on delete cascade,
  circuit_code text not null default 'general',
  from_node_id uuid not null references public.v2_vehicle_electrical_nodes(id) on delete cascade,
  to_node_id uuid not null references public.v2_vehicle_electrical_nodes(id) on delete cascade,
  from_pin text,
  to_pin text,
  wire_code text,
  wire_color text,
  wire_gauge text,
  signal_type text,
  direction text not null default 'bidirectional' check (direction in ('forward','reverse','bidirectional')),
  expected_values jsonb not null default '{}'::jsonb,
  test_method jsonb not null default '{}'::jsonb,
  source_metadata jsonb not null default '{}'::jsonb,
  verification_status text not null default 'reference' check (verification_status in ('verified','reference','estimated','needs_physical_verification')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint v2_vehicle_electrical_links_distinct_nodes check (from_node_id <> to_node_id)
);

create index if not exists idx_v2_electrical_nodes_vehicle on public.v2_vehicle_electrical_nodes(vehicle_id);
create index if not exists idx_v2_electrical_nodes_component on public.v2_vehicle_electrical_nodes(component_id);
create index if not exists idx_v2_electrical_nodes_circuit on public.v2_vehicle_electrical_nodes(vehicle_id,circuit_code);
create index if not exists idx_v2_electrical_nodes_type on public.v2_vehicle_electrical_nodes(vehicle_id,node_type);
create index if not exists idx_v2_electrical_links_vehicle on public.v2_vehicle_electrical_links(vehicle_id);
create index if not exists idx_v2_electrical_links_circuit on public.v2_vehicle_electrical_links(vehicle_id,circuit_code);
create index if not exists idx_v2_electrical_links_from on public.v2_vehicle_electrical_links(from_node_id);
create index if not exists idx_v2_electrical_links_to on public.v2_vehicle_electrical_links(to_node_id);

alter table public.v2_vehicle_electrical_nodes enable row level security;
alter table public.v2_vehicle_electrical_links enable row level security;

create policy v2_electrical_nodes_member_select
on public.v2_vehicle_electrical_nodes for select
to authenticated
using (public.v2_is_company_member(company_id));

create policy v2_electrical_nodes_manage
on public.v2_vehicle_electrical_nodes for all
to authenticated
using (public.v2_has_permission(company_id, 'workshop.manage'::text))
with check (public.v2_has_permission(company_id, 'workshop.manage'::text));

create policy v2_electrical_links_member_select
on public.v2_vehicle_electrical_links for select
to authenticated
using (public.v2_is_company_member(company_id));

create policy v2_electrical_links_manage
on public.v2_vehicle_electrical_links for all
to authenticated
using (public.v2_has_permission(company_id, 'workshop.manage'::text))
with check (public.v2_has_permission(company_id, 'workshop.manage'::text));

grant select, insert, update, delete on public.v2_vehicle_electrical_nodes to authenticated;
grant select, insert, update, delete on public.v2_vehicle_electrical_links to authenticated;

create trigger v2_vehicle_electrical_nodes_touch_updated_at
before update on public.v2_vehicle_electrical_nodes
for each row execute function public.v2_touch_updated_at();

create trigger v2_vehicle_electrical_links_touch_updated_at
before update on public.v2_vehicle_electrical_links
for each row execute function public.v2_touch_updated_at();
