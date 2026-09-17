create policy v2_device_location_current_select
on public.v2_device_location_current for select
to authenticated
using (
  public.v2_has_permission(company_id,'teams.manage')
  or exists (
    select 1 from public.v2_device_access d
    where d.id=device_access_id
      and d.company_id=company_id
      and d.user_id=(select auth.uid())
      and d.active=true
      and private.v2_is_device_session()
  )
);

create policy v2_device_location_current_insert
on public.v2_device_location_current for insert
to authenticated
with check (
  latitude between -90 and 90
  and longitude between -180 and 180
  and (battery_percent is null or battery_percent between 0 and 100)
  and exists (
    select 1 from public.v2_device_access d
    where d.id=device_access_id
      and d.company_id=company_id
      and d.team_id=team_id
      and d.user_id=(select auth.uid())
      and d.active=true
      and private.v2_is_device_session()
  )
);

create policy v2_device_location_current_update
on public.v2_device_location_current for update
to authenticated
using (
  exists (
    select 1 from public.v2_device_access d
    where d.id=device_access_id
      and d.company_id=company_id
      and d.user_id=(select auth.uid())
      and d.active=true
      and private.v2_is_device_session()
  )
)
with check (
  latitude between -90 and 90
  and longitude between -180 and 180
  and (battery_percent is null or battery_percent between 0 and 100)
  and exists (
    select 1 from public.v2_device_access d
    where d.id=device_access_id
      and d.company_id=company_id
      and d.team_id=team_id
      and d.user_id=(select auth.uid())
      and d.active=true
      and private.v2_is_device_session()
  )
);

create policy v2_device_location_history_select
on public.v2_device_location_history for select
to authenticated
using (public.v2_has_permission(company_id,'teams.manage'));

create policy v2_device_location_history_insert
on public.v2_device_location_history for insert
to authenticated
with check (
  latitude between -90 and 90
  and longitude between -180 and 180
  and (battery_percent is null or battery_percent between 0 and 100)
  and exists (
    select 1 from public.v2_device_access d
    where d.id=device_access_id
      and d.company_id=company_id
      and d.team_id=team_id
      and d.user_id=(select auth.uid())
      and d.active=true
      and private.v2_is_device_session()
  )
);
