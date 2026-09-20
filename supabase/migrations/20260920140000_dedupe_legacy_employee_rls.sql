-- Remove exact duplicate legacy RLS policies from public.employees.
-- The retained *_v85 policies have identical roles, commands and predicates.

drop policy if exists employees_admin_delete on public.employees;
drop policy if exists employees_admin_insert on public.employees;
drop policy if exists employees_select on public.employees;
drop policy if exists employees_admin_update on public.employees;
