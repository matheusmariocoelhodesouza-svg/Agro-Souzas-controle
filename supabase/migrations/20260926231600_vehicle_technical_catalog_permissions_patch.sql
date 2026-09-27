-- Patch de segurança do catálogo técnico: alinha RLS e grants ao módulo de frota.

alter table public.v2_vehicle_technical_profiles enable row level security;
alter table public.v2_vehicle_component_groups enable row level security;
alter table public.v2_vehicle_components enable row level security;
alter table public.v2_vehicle_component_applications enable row level security;
alter table public.v2_vehicle_component_links enable row level security;

drop policy if exists "company members can read technical profiles" on public.v2_vehicle_technical_profiles;
drop policy if exists "company members can manage technical profiles" on public.v2_vehicle_technical_profiles;
drop policy if exists "company members can read vehicle component links" on public.v2_vehicle_component_links;
drop policy if exists "company members can manage vehicle component links" on public.v2_vehicle_component_links;
drop policy if exists "authenticated can read vehicle component groups" on public.v2_vehicle_component_groups;
drop policy if exists "authenticated can read vehicle components" on public.v2_vehicle_components;
drop policy if exists "authenticated can read vehicle applications" on public.v2_vehicle_component_applications;

drop policy if exists "v2_vehicle_technical_profiles_member_select" on public.v2_vehicle_technical_profiles;
create policy "v2_vehicle_technical_profiles_member_select"
  on public.v2_vehicle_technical_profiles for select
  to authenticated
  using (public.v2_is_company_member(company_id));

drop policy if exists "v2_vehicle_technical_profiles_write_perm" on public.v2_vehicle_technical_profiles;
create policy "v2_vehicle_technical_profiles_write_perm"
  on public.v2_vehicle_technical_profiles for all
  to authenticated
  using (public.v2_has_permission(company_id, 'fleet.manage'))
  with check (public.v2_has_permission(company_id, 'fleet.manage'));

drop policy if exists "v2_vehicle_component_groups_authenticated_select" on public.v2_vehicle_component_groups;
create policy "v2_vehicle_component_groups_authenticated_select"
  on public.v2_vehicle_component_groups for select
  to authenticated
  using (true);

drop policy if exists "v2_vehicle_components_authenticated_select" on public.v2_vehicle_components;
create policy "v2_vehicle_components_authenticated_select"
  on public.v2_vehicle_components for select
  to authenticated
  using (true);

drop policy if exists "v2_vehicle_component_applications_authenticated_select" on public.v2_vehicle_component_applications;
create policy "v2_vehicle_component_applications_authenticated_select"
  on public.v2_vehicle_component_applications for select
  to authenticated
  using (true);

drop policy if exists "v2_vehicle_component_links_member_select" on public.v2_vehicle_component_links;
create policy "v2_vehicle_component_links_member_select"
  on public.v2_vehicle_component_links for select
  to authenticated
  using (public.v2_is_company_member(company_id));

drop policy if exists "v2_vehicle_component_links_write_perm" on public.v2_vehicle_component_links;
create policy "v2_vehicle_component_links_write_perm"
  on public.v2_vehicle_component_links for all
  to authenticated
  using (public.v2_has_permission(company_id, 'fleet.manage'))
  with check (public.v2_has_permission(company_id, 'fleet.manage'));

grant select, insert, update, delete on public.v2_vehicle_technical_profiles to authenticated;
grant select on public.v2_vehicle_component_groups to authenticated;
grant select on public.v2_vehicle_components to authenticated;
grant select on public.v2_vehicle_component_applications to authenticated;
grant select, insert, update, delete on public.v2_vehicle_component_links to authenticated;
