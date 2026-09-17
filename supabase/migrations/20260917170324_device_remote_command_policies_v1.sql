create policy v2_device_commands_select
on public.v2_device_commands for select
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

create policy v2_device_commands_admin_insert
on public.v2_device_commands for insert
to authenticated
with check (
  created_by=(select auth.uid())
  and public.v2_has_permission(company_id,'teams.manage')
  and exists (
    select 1 from public.v2_device_access d
    where d.id=device_access_id
      and d.company_id=company_id
      and d.active=true
  )
);

create policy v2_device_commands_device_update
on public.v2_device_commands for update
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
  exists (
    select 1 from public.v2_device_access d
    where d.id=device_access_id
      and d.company_id=company_id
      and d.user_id=(select auth.uid())
      and d.active=true
      and private.v2_is_device_session()
  )
);
