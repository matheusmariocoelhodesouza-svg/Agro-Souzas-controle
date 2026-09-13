drop policy if exists v2_trailer_hitches_manage on public.v2_trailer_hitches;
drop policy if exists v2_trailer_hitches_manage_insert on public.v2_trailer_hitches;
drop policy if exists v2_trailer_hitches_manage_update on public.v2_trailer_hitches;
drop policy if exists v2_trailer_hitches_manage_delete on public.v2_trailer_hitches;

create policy v2_trailer_hitches_manage_insert
  on public.v2_trailer_hitches for insert to authenticated
  with check (public.v2_has_permission(company_id, 'fleet.manage'));

create policy v2_trailer_hitches_manage_update
  on public.v2_trailer_hitches for update to authenticated
  using (public.v2_has_permission(company_id, 'fleet.manage'))
  with check (public.v2_has_permission(company_id, 'fleet.manage'));

create policy v2_trailer_hitches_manage_delete
  on public.v2_trailer_hitches for delete to authenticated
  using (public.v2_has_permission(company_id, 'fleet.manage'));
