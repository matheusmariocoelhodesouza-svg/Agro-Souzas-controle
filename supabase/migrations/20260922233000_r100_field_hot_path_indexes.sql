-- Comando 360 R100 — índices cirúrgicos para caminhos de campo mais frequentes.
-- Mantém a estratégia de não indexar cegamente todos os avisos do Advisor:
-- cada índice abaixo cobre FK observada sem índice em rotas de equipe, ponto,
-- operação, apanha e frota.

create index if not exists idx_v2_team_members_company_id_r100
  on public.v2_team_members(company_id);

create index if not exists idx_v2_team_messages_team_id_r100
  on public.v2_team_messages(team_id);

create index if not exists idx_v2_teams_branch_id_r100
  on public.v2_teams(branch_id);

create index if not exists idx_v2_teams_supervisor_employee_id_r100
  on public.v2_teams(supervisor_employee_id);

create index if not exists idx_v2_operations_branch_id_r100
  on public.v2_operations(branch_id);

create index if not exists idx_v2_operations_created_by_r100
  on public.v2_operations(created_by);

create index if not exists idx_v2_poultry_driver_vehicles_team_id_r100
  on public.v2_poultry_driver_vehicles(team_id);

create index if not exists idx_v2_poultry_employee_work_operation_id_r100
  on public.v2_poultry_employee_work(operation_id);

create index if not exists idx_v2_poultry_employee_work_team_id_r100
  on public.v2_poultry_employee_work(team_id);

create index if not exists idx_v2_vehicle_documents_file_id_r100
  on public.v2_vehicle_documents(file_id);

create index if not exists idx_v2_vehicles_branch_id_r100
  on public.v2_vehicles(branch_id);

create index if not exists idx_v2_attendance_face_checks_employee_id_r100
  on public.v2_attendance_face_checks(employee_id);

create index if not exists idx_v2_attendance_face_checks_reference_enrollment_id_r100
  on public.v2_attendance_face_checks(reference_enrollment_id);

create index if not exists idx_v2_attendance_treatments_employee_id_r100
  on public.v2_attendance_treatments(employee_id);

create index if not exists idx_v2_attendance_treatments_original_event_id_r100
  on public.v2_attendance_treatments(original_event_id);