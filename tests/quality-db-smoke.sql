-- Comando 360 cross-module database smoke test
-- Expected result: every row must return issues = 0.
with checks as (
select '01_multiple_active_devices_per_team' name,count(*)::bigint issues from (select company_id,team_id from public.v2_device_access where active and team_id is not null group by company_id,team_id having count(*)>1) x
union all select '02_active_device_bad_team',count(*) from public.v2_device_access d left join public.v2_teams t on t.id=d.team_id and t.company_id=d.company_id where d.active and d.team_id is not null and t.id is null
union all select '03_duplicate_active_employee_number',count(*) from (select company_id,employee_number from public.v2_employees where status='active' group by company_id,employee_number having count(*)>1) x
union all select '04_duplicate_active_employee_cpf',count(*) from (select company_id,cpf from public.v2_employees where status='active' and cpf is not null group by company_id,cpf having count(*)>1) x
union all select '05_active_face_bad_employee',count(*) from public.v2_employee_face_enrollments f left join public.v2_employees e on e.id=f.employee_id and e.company_id=f.company_id where f.status='active' and (e.id is null or e.status<>'active')
union all select '06_attendance_bad_employee_company',count(*) from public.v2_attendance_events a left join public.v2_employees e on e.id=a.employee_id and e.company_id=a.company_id where e.id is null
union all select '07_attendance_bad_team_company',count(*) from public.v2_attendance_events a left join public.v2_teams t on t.id=a.work_team_id and t.company_id=a.company_id where a.work_team_id is not null and t.id is null
union all select '08_attendance_bad_device_company',count(*) from public.v2_attendance_events a left join public.v2_device_access d on d.id=a.device_access_id and d.company_id=a.company_id where a.device_access_id is not null and d.id is null
union all select '09_duplicate_active_vehicle_plate',count(*) from (select company_id,upper(regexp_replace(coalesce(plate,''),'[^A-Z0-9]','','g')) p from public.v2_vehicles where status='active' and coalesce(plate,'')<>'' group by company_id,upper(regexp_replace(coalesce(plate,''),'[^A-Z0-9]','','g')) having count(*)>1) x
union all select '10_fuel_bad_vehicle_company',count(*) from public.v2_fuel_logs f left join public.v2_vehicles v on v.id=f.vehicle_id and v.company_id=f.company_id where v.id is null
union all select '11_vehicle_km_behind_fuel',count(*) from public.v2_vehicles v where coalesce(v.current_odometer_km,0) < coalesce((select max(f.odometer_km) from public.v2_fuel_logs f where f.company_id=v.company_id and f.vehicle_id=v.id),0)
union all select '12_vehicle_km_behind_odometer',count(*) from public.v2_vehicles v where coalesce(v.current_odometer_km,0) < coalesce((select max(o.odometer_km) from public.v2_vehicle_odometer_logs o where o.company_id=v.company_id and o.vehicle_id=v.id),0)
union all select '13_work_order_bad_vehicle_company',count(*) from public.v2_work_orders w left join public.v2_vehicles v on v.id=w.vehicle_id and v.company_id=w.company_id where w.vehicle_id is not null and v.id is null
union all select '14_ppe_bad_employee_company',count(*) from public.v2_ppe_deliveries p left join public.v2_employees e on e.id=p.employee_id and e.company_id=p.company_id where e.id is null
union all select '15_employee_document_bad_employee',count(*) from public.v2_employee_documents d left join public.v2_employees e on e.id=d.employee_id and e.company_id=d.company_id where e.id is null
union all select '16_vehicle_document_bad_vehicle',count(*) from public.v2_vehicle_documents d left join public.v2_vehicles v on v.id=d.vehicle_id and v.company_id=d.company_id where v.id is null
union all select '17_operation_bad_team_company',count(*) from public.v2_operations o left join public.v2_teams t on t.id=o.team_id and t.company_id=o.company_id where o.team_id is not null and t.id is null
union all select '18_loading_bad_operation_company',count(*) from public.v2_poultry_loadings l left join public.v2_operations o on o.id=l.operation_id and o.company_id=l.company_id where o.id is null
union all select '19_truck_bad_loading_company',count(*) from public.v2_poultry_truck_loads tr left join public.v2_poultry_loadings l on l.id=tr.loading_id and l.company_id=tr.company_id where l.id is null
union all select '20_finance_bad_operation_company',count(*) from public.v2_financial_entries f left join public.v2_operations o on o.id=f.operation_id and o.company_id=f.company_id where f.operation_id is not null and o.id is null
union all select '21_finance_paid_missing_paid_at',count(*) from public.v2_financial_entries where status='paid' and paid_at is null
union all select '22_finance_unpaid_with_paid_at',count(*) from public.v2_financial_entries where status in ('pending','overdue','planned') and paid_at is not null
union all select '23_finance_negative_amount',count(*) from public.v2_financial_entries where amount<0
union all select '24_dda_duplicate_active',count(*) from (select company_id,source_id from public.v2_financial_entries where source_type='dda_polp' and source_id is not null and status<>'cancelled' group by company_id,source_id having count(*)>1) x
union all select '25_poultry_op_duplicate_revenue',count(*) from (select company_id,source_id from public.v2_financial_entries where source_type='poultry_operation_revenue' and source_id is not null and status<>'cancelled' group by company_id,source_id having count(*)>1) x
union all select '26_completed_perbird_missing_revenue',count(*) from public.v2_operations o join public.v2_teams t on t.id=o.team_id and t.company_id=o.company_id where o.operation_type='poultry_catching' and o.status='completed' and t.metadata#>>'{billing,mode}'='per_bird' and coalesce(o.actual_revenue,0)<=0
union all select '27_perbird_revenue_mismatch',count(*) from public.v2_operations o join public.v2_teams t on t.id=o.team_id and t.company_id=o.company_id left join public.v2_financial_entries f on f.company_id=o.company_id and f.source_type='poultry_operation_revenue' and f.source_id=o.id and f.status<>'cancelled' where o.operation_type='poultry_catching' and o.status='completed' and t.metadata#>>'{billing,mode}'='per_bird' and (f.id is null or abs(coalesce(f.amount,0)-coalesce(o.actual_revenue,0))>0.009)
)
select * from checks order by name;
