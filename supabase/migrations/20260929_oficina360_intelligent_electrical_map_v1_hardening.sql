create index if not exists idx_v2_electrical_nodes_company on public.v2_vehicle_electrical_nodes(company_id);
create index if not exists idx_v2_electrical_links_company on public.v2_vehicle_electrical_links(company_id);

drop policy if exists v2_electrical_nodes_manage on public.v2_vehicle_electrical_nodes;
drop policy if exists v2_electrical_links_manage on public.v2_vehicle_electrical_links;

create policy v2_electrical_nodes_insert
on public.v2_vehicle_electrical_nodes for insert
to authenticated
with check (public.v2_has_permission(company_id, 'workshop.manage'::text));

create policy v2_electrical_nodes_update
on public.v2_vehicle_electrical_nodes for update
to authenticated
using (public.v2_has_permission(company_id, 'workshop.manage'::text))
with check (public.v2_has_permission(company_id, 'workshop.manage'::text));

create policy v2_electrical_nodes_delete
on public.v2_vehicle_electrical_nodes for delete
to authenticated
using (public.v2_has_permission(company_id, 'workshop.manage'::text));

create policy v2_electrical_links_insert
on public.v2_vehicle_electrical_links for insert
to authenticated
with check (public.v2_has_permission(company_id, 'workshop.manage'::text));

create policy v2_electrical_links_update
on public.v2_vehicle_electrical_links for update
to authenticated
using (public.v2_has_permission(company_id, 'workshop.manage'::text))
with check (public.v2_has_permission(company_id, 'workshop.manage'::text));

create policy v2_electrical_links_delete
on public.v2_vehicle_electrical_links for delete
to authenticated
using (public.v2_has_permission(company_id, 'workshop.manage'::text));
