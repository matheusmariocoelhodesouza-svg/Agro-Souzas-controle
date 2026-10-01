-- Arrival workflow: pending does not count as worked, absence or repass until resolved.
alter table public.v2_daily_team_work_members drop constraint if exists v2_daily_team_work_members_attendance_status_check;
alter table public.v2_daily_team_work_members add constraint v2_daily_team_work_members_attendance_status_check check(attendance_status in ('pending','present','absent'));
alter table public.v2_daily_team_work_members alter column attendance_status set default 'pending';