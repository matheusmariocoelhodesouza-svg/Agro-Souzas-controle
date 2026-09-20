-- Targeted indexes for high-frequency field/auth/device paths.
-- Avoid indexing every advisory finding: unnecessary indexes also increase write cost.
create index if not exists idx_v2_company_members_role_id_r95
  on public.v2_company_members(role_id);
create index if not exists idx_v2_attendance_events_created_by_r95
  on public.v2_attendance_events(created_by);
create index if not exists idx_v2_face_enrollments_employee_id_r95
  on public.v2_employee_face_enrollments(employee_id);
create index if not exists idx_v2_face_enrollments_enrolled_by_r95
  on public.v2_employee_face_enrollments(enrolled_by);
create index if not exists idx_v2_device_pairing_codes_team_id_r95
  on public.v2_device_pairing_codes(team_id);
create index if not exists idx_v2_device_pairing_codes_created_by_r95
  on public.v2_device_pairing_codes(created_by);
create index if not exists idx_v2_device_pairing_codes_used_by_r95
  on public.v2_device_pairing_codes(used_by);
create index if not exists idx_v2_native_tracker_pairing_company_id_r95
  on public.v2_native_tracker_pairing_codes(company_id);
