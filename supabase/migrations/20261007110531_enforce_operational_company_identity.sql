-- Enforce company boundaries without changing existing records or permissions.
alter table public.v2_daily_team_work_members add constraint v2_daily_member_single_identity_check check (worker_profile_id is null or employee_id is null);
alter table public.v2_employee_payments add constraint v2_employee_payment_company_identity_fk foreign key(company_id,employee_id) references public.v2_employees(company_id,id);
create unique index if not exists v2_operational_run_company_identity on public.v2_operational_payment_runs(company_id,id);
alter table public.v2_operational_payment_items add constraint v2_operational_item_worker_company_fk foreign key(company_id,worker_profile_id) references public.v2_operational_worker_profiles(company_id,id);
alter table public.v2_operational_payment_items add constraint v2_operational_item_run_company_fk foreign key(company_id,run_id) references public.v2_operational_payment_runs(company_id,id);
