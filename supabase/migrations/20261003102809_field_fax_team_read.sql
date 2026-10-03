-- Field devices can read the FAX assigned to their active team.
-- Creation, completion and cancellation remain administrative operations.
create policy v2_device_poultry_faxes_select
on public.v2_poultry_faxes
for select to authenticated
using (
  (select private.v2_is_device_session())
  and team_id = private.v2_device_team_id(company_id)
  and exists (
    select 1 from public.v2_device_access da
    where da.user_id = (select auth.uid())
      and da.company_id = v2_poultry_faxes.company_id
      and da.team_id = v2_poultry_faxes.team_id
      and da.active = true
      and da.control_state = 'active'
      and da.lost_mode = false
      and coalesce((da.permissions->>'apanha')::boolean, false)
  )
);
