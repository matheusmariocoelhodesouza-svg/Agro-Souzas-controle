alter table public.v2_device_access
  drop constraint if exists v2_device_access_control_state_check;
alter table public.v2_device_access
  add constraint v2_device_access_control_state_check
  check (control_state in ('active','app_locked','lost'));

alter table public.v2_device_commands
  drop constraint if exists v2_device_commands_command_check;
alter table public.v2_device_commands
  add constraint v2_device_commands_command_check
  check (command in ('ring','stop_ring','locate_now','lost_mode_on','lost_mode_off','lock_app','unlock_app','lock_device'));

alter table public.v2_device_commands
  drop constraint if exists v2_device_commands_status_check;
alter table public.v2_device_commands
  add constraint v2_device_commands_status_check
  check (status in ('pending','delivered','completed','failed','expired'));

-- Device identity is established by the active v2_device_access row itself.
-- Keep authorization independent of editable user metadata claims.
drop policy if exists v2_device_commands_select on public.v2_device_commands;
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
  )
);

drop policy if exists v2_device_commands_admin_insert on public.v2_device_commands;
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

drop policy if exists v2_device_commands_device_update on public.v2_device_commands;
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
  )
)
with check (
  exists (
    select 1 from public.v2_device_access d
    where d.id=device_access_id
      and d.company_id=company_id
      and d.user_id=(select auth.uid())
      and d.active=true
  )
);

drop policy if exists v2_device_location_current_select on public.v2_device_location_current;
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
  )
);

drop policy if exists v2_device_location_current_insert on public.v2_device_location_current;
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
  )
);

drop policy if exists v2_device_location_current_update on public.v2_device_location_current;
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
  )
);

drop policy if exists v2_device_location_history_select on public.v2_device_location_history;
create policy v2_device_location_history_select
on public.v2_device_location_history for select
to authenticated
using (public.v2_has_permission(company_id,'teams.manage'));

drop policy if exists v2_device_location_history_insert on public.v2_device_location_history;
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
  )
);

-- These names were introduced by an overlapping draft migration; keep only the canonical indexes.
drop index if exists public.v2_device_commands_device_status_idx;
drop index if exists public.v2_device_location_history_company_recorded_idx;
drop index if exists public.v2_device_location_history_device_recorded_idx;

drop function if exists private.v2_device_access_id(uuid);
