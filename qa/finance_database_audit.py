"""Emit an isolated SQL transaction exercising the actual reconciliation migration.

All source and financial rows live in temporary copies. No production business
records, audit rows or sequences are written by this test.
"""
from pathlib import Path

source = next(Path('supabase/migrations').glob('*audit_operational_cost_reconciliation.sql')).read_text()
source += next(Path('supabase/migrations').glob('*audit_cost_source_labels.sql')).read_text()
tables = ['v2_fuel_logs', 'v2_maintenance_plans', 'v2_work_orders', 'v2_inventory_movements', 'v2_financial_entries']
setup = "begin;\nset local statement_timeout='15s';\n"
for name in tables:
    setup += f'create temporary table {name} (like public.{name} including defaults including constraints);\n'
setup += """
create temporary table v2_vehicles(id uuid,company_id uuid,description text,plate text);
create temporary table v2_inventory_items(id uuid,company_id uuid,name text);
create function pg_temp.audit_uid() returns uuid language sql stable as $$select nullif(current_setting('audit.user',true),'')::uuid$$;
create function pg_temp.audit_permission(company uuid, permission text) returns boolean language sql stable as $$select company='10000000-0000-4000-8000-000000000001'::uuid and coalesce(current_setting('audit.permission',true),'yes')='yes'$$;
select set_config('audit.user','20000000-0000-4000-8000-000000000001',true);
"""
source = source.replace('create or replace view public.v2_reconcilable_costs', 'create or replace temporary view v2_reconcilable_costs')
for name in tables + ['v2_vehicles','v2_inventory_items','v2_reconcilable_costs', 'v2_reconcile_operational_cost']:
    source = source.replace('public.' + name, 'pg_temp.' + name)
source = source.replace('auth.uid()', 'pg_temp.audit_uid()').replace('public.v2_has_permission(', 'pg_temp.audit_permission(')
checks = """
do $$
declare
 company uuid='10000000-0000-4000-8000-000000000001';
 foreign_company uuid='10000000-0000-4000-8000-000000000002';
 fuel uuid='30000000-0000-4000-8000-000000000001';
 fuel2 uuid='30000000-0000-4000-8000-000000000002';
 fuel3 uuid='30000000-0000-4000-8000-000000000003';
 manual uuid='40000000-0000-4000-8000-000000000001';
 result jsonb;retry jsonb;entry uuid;blocked boolean;passed integer=0;
begin
 insert into pg_temp.v2_fuel_logs(id,company_id,vehicle_id,fueled_at,liters,total_amount,metadata)
 values(fuel,company,gen_random_uuid(),'2026-10-01T01:00:00Z',10,100,'{}'),
 (fuel2,company,gen_random_uuid(),'2026-10-02T12:00:00Z',3,30,'{}'),
 (fuel3,company,gen_random_uuid(),'2026-10-02T12:00:00Z',3,30,'{"cost_unknown":true}');
 insert into pg_temp.v2_vehicles select vehicle_id,company_id,'QA Bus','QA00001' from pg_temp.v2_fuel_logs where id=fuel;
 if not exists(select 1 from pg_temp.v2_reconcilable_costs where source_id=fuel and description like '%QA00001%') then raise exception 'Vehicle label missing';end if;passed=passed+1;
 if (select incurred_on from pg_temp.v2_reconcilable_costs where source_id=fuel)<>'2026-09-30'::date then raise exception 'BR competence date failed';end if;passed=passed+1;
 result=pg_temp.v2_reconcile_operational_cost(company,'fuel_log',fuel,100,null);entry=(result->>'entry_id')::uuid;
 if not exists(select 1 from pg_temp.v2_financial_entries where id=entry and amount=100 and status='pending' and paid_at is null and competence_date='2026-09-30') then raise exception 'Pending expense creation failed';end if;passed=passed+1;
 retry=pg_temp.v2_reconcile_operational_cost(company,'fuel_log',fuel,100,null);
 if (retry->>'entry_id')::uuid<>entry or not (retry->>'already_linked')::boolean or (select count(*) from pg_temp.v2_financial_entries)<>1 then raise exception 'Idempotent retry failed';end if;passed=passed+1;
 blocked=false;begin perform pg_temp.v2_reconcile_operational_cost(company,'fuel_log',fuel,101,null);exception when raise_exception then blocked=true;end;if not blocked then raise exception 'Changed cost accepted';end if;passed=passed+1;
 insert into pg_temp.v2_financial_entries(id,company_id,entry_type,description,amount,status,source_type,paid_at) values(manual,company,'expense','Existing paid expense',30,'paid','manual','2026-10-02T12:00:00Z');
 result=pg_temp.v2_reconcile_operational_cost(company,'fuel_log',fuel2,30,manual);
 if (result->>'entry_id')::uuid<>manual or (select count(*) from pg_temp.v2_financial_entries)<>2 or not exists(select 1 from pg_temp.v2_financial_entries where id=manual and status='paid' and paid_at is not null and source_id=fuel2) then raise exception 'Existing paid link was duplicated or altered';end if;passed=passed+1;
 blocked=false;begin perform pg_temp.v2_reconcile_operational_cost(company,'fuel_log',fuel3,30,null);exception when raise_exception then blocked=true;end;if not blocked then raise exception 'Unknown cost accepted';end if;passed=passed+1;
 perform set_config('audit.user','',true);blocked=false;begin perform pg_temp.v2_reconcile_operational_cost(company,'fuel_log',fuel,100,null);exception when insufficient_privilege then blocked=true;end;if not blocked then raise exception 'Unauthenticated request accepted';end if;passed=passed+1;
 perform set_config('audit.user','20000000-0000-4000-8000-000000000001',true);
 blocked=false;begin perform pg_temp.v2_reconcile_operational_cost(foreign_company,'fuel_log',fuel,100,null);exception when insufficient_privilege then blocked=true;end;if not blocked then raise exception 'Foreign company request accepted';end if;passed=passed+1;
 update pg_temp.v2_fuel_logs set metadata='{}' where id=fuel3;
 blocked=false;begin perform pg_temp.v2_reconcile_operational_cost(company,'fuel_log',fuel3,30,entry);exception when raise_exception then blocked=true;end;if not blocked then raise exception 'Reusing an existing source-linked expense accepted';end if;passed=passed+1;
 update pg_temp.v2_financial_entries set status='cancelled' where id=entry;
 result=pg_temp.v2_reconcile_operational_cost(company,'fuel_log',fuel,100,null);
 if (result->>'entry_id')::uuid=entry or (select count(*) from pg_temp.v2_financial_entries)<>3 then raise exception 'Cancelled source relinking failed';end if;passed=passed+1;
 blocked=false;begin insert into pg_temp.v2_financial_entries(company_id,entry_type,description,amount,status,source_type,source_id) values(company,'expense','Duplicate',100,'pending','fuel_log',fuel);exception when unique_violation then blocked=true;end;if not blocked then raise exception 'Duplicate source accepted';end if;passed=passed+1;
 insert into pg_temp.v2_inventory_movements(company_id,item_id,movement_type,quantity,unit_cost,work_order_id) values(company,gen_random_uuid(),'in',2,50,gen_random_uuid());
 if not exists(select 1 from pg_temp.v2_reconcilable_costs where source_type='inventory_movement' and cost_state='review') then raise exception 'Workshop inventory overlap not flagged';end if;passed=passed+1;
 if (select count(*) from pg_temp.v2_financial_entries)<>3 then raise exception 'Rejected requests changed financial rows';end if;passed=passed+1;
 raise notice 'FINANCE_DATABASE_AUDIT_OK: % checks',passed;
end;$$;
select 'FINANCE_DATABASE_AUDIT_OK' as result,14 as checks;
rollback;
"""
print(setup + source + checks)
