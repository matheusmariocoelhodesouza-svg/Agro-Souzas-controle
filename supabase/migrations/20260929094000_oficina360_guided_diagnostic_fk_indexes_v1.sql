-- Oficina 360 — indexes for guided diagnostic foreign keys flagged by Supabase Advisor.

create index if not exists idx_v2_diag_sessions_fault_id
  on public.v2_diagnostic_sessions(fault_id) where fault_id is not null;
create index if not exists idx_v2_diag_sessions_playbook_id
  on public.v2_diagnostic_sessions(playbook_id) where playbook_id is not null;
create index if not exists idx_v2_diag_sessions_work_order_id
  on public.v2_diagnostic_sessions(work_order_id) where work_order_id is not null;
create index if not exists idx_v2_diag_sessions_created_by
  on public.v2_diagnostic_sessions(created_by) where created_by is not null;

create index if not exists idx_v2_diag_steps_component_id
  on public.v2_diagnostic_session_steps(component_id) where component_id is not null;
create index if not exists idx_v2_diag_steps_electrical_node_id
  on public.v2_diagnostic_session_steps(electrical_node_id) where electrical_node_id is not null;
create index if not exists idx_v2_diag_steps_created_by
  on public.v2_diagnostic_session_steps(created_by) where created_by is not null;
