-- Include the actual asset/item when the user reviews the source of a cost.
-- Source-linked reconciliation. Reading and writing retain the caller's RLS.
create or replace view public.v2_reconcilable_costs with (security_invoker=true) as
with costs as (
 select f.company_id,'fuel_log'::text as source_type,f.id as source_id,
   concat_ws(' • ',nullif(v.description,''),nullif(v.plate,''),'Abastecimento',nullif(f.station_name,''),f.liters::text||' L') as description,
   case when coalesce(f.metadata->>'cost_unknown','false')='true' then null else f.total_amount end as amount,
   (f.fueled_at at time zone 'America/Sao_Paulo')::date as incurred_on,
   f.operation_id,f.cost_center_id,f.station_name as counterparty_name,f.file_id,false as review_required
 from public.v2_fuel_logs f left join public.v2_vehicles v on v.id=f.vehicle_id and v.company_id=f.company_id
 union all
 select p.company_id,'maintenance_plan',p.id,concat_ws(' • ',p.name,nullif(p.asset_name,''),nullif(v.description,''),nullif(v.plate,'')),
   case when (p.metadata ? 'parts_cost' or p.metadata ? 'labor_cost')
     and coalesce(p.metadata->>'parts_cost','0') ~ '^[0-9]+([.][0-9]+)?$'
     and coalesce(p.metadata->>'labor_cost','0') ~ '^[0-9]+([.][0-9]+)?$'
   then coalesce((p.metadata->>'parts_cost')::numeric,0)+coalesce((p.metadata->>'labor_cost')::numeric,0) else null end,
   p.last_done_at,null::uuid,null::uuid,nullif(p.metadata->>'workshop',''),null::uuid,
   coalesce(nullif(p.metadata->>'work_order_id',''),nullif(p.metadata->>'inventory_movement_id','')) is not null
 from public.v2_maintenance_plans p left join public.v2_vehicles v on v.id=p.vehicle_id and v.company_id=p.company_id where p.last_done_at is not null
 union all
 select w.company_id,'work_order',w.id,concat_ws(' • ','OS '||w.work_order_number::text,w.title,nullif(v.description,''),nullif(v.plate,'')),w.total_amount,
   (coalesce(w.completed_at,w.opened_at) at time zone 'America/Sao_Paulo')::date,
   w.operation_id,null::uuid,nullif(w.metadata->>'workshop',''),null::uuid,
   w.status<>'completed' or nullif(w.metadata->>'maintenance_plan_id','') is not null
   or exists (select 1 from public.v2_inventory_movements m left join public.v2_inventory_items i on i.id=m.item_id and i.company_id=m.company_id where m.company_id=w.company_id and m.work_order_id=w.id and m.movement_type='in')
 from public.v2_work_orders w left join public.v2_vehicles v on v.id=w.vehicle_id and v.company_id=w.company_id where w.status<>'cancelled' and w.total_amount>0
 union all
 select m.company_id,'inventory_movement',m.id,concat_ws(' • ','Compra de estoque',nullif(i.name,''),nullif(m.notes,'')),
   m.quantity*m.unit_cost,(m.occurred_at at time zone 'America/Sao_Paulo')::date,
   m.operation_id,null::uuid,null::text,null::uuid,
   m.work_order_id is not null or coalesce(m.source_type,'') in ('work_order','maintenance_plan')
 from public.v2_inventory_movements m left join public.v2_inventory_items i on i.id=m.item_id and i.company_id=m.company_id where m.movement_type='in'
)
select costs.*,case when amount is null or amount<0 or amount::text in ('NaN','Infinity','-Infinity') then 'unknown'
 when review_required or incurred_on is null then 'review' when round(amount,2)=0 then 'zero' else 'ready' end as cost_state from costs;
