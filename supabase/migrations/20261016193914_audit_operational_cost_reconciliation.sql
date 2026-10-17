-- Source-linked reconciliation. Reading and writing retain the caller's RLS.
create or replace view public.v2_reconcilable_costs with (security_invoker=true) as
with costs as (
 select f.company_id,'fuel_log'::text as source_type,f.id as source_id,
   coalesce(nullif(f.station_name,''),'Abastecimento') as description,
   case when coalesce(f.metadata->>'cost_unknown','false')='true' then null else f.total_amount end as amount,
   (f.fueled_at at time zone 'America/Sao_Paulo')::date as incurred_on,
   f.operation_id,f.cost_center_id,f.station_name as counterparty_name,f.file_id,false as review_required
 from public.v2_fuel_logs f
 union all
 select p.company_id,'maintenance_plan',p.id,p.name,
   case when (p.metadata ? 'parts_cost' or p.metadata ? 'labor_cost')
     and coalesce(p.metadata->>'parts_cost','0') ~ '^[0-9]+([.][0-9]+)?$'
     and coalesce(p.metadata->>'labor_cost','0') ~ '^[0-9]+([.][0-9]+)?$'
   then coalesce((p.metadata->>'parts_cost')::numeric,0)+coalesce((p.metadata->>'labor_cost')::numeric,0) else null end,
   p.last_done_at,null::uuid,null::uuid,nullif(p.metadata->>'workshop',''),null::uuid,
   coalesce(nullif(p.metadata->>'work_order_id',''),nullif(p.metadata->>'inventory_movement_id','')) is not null
 from public.v2_maintenance_plans p where p.last_done_at is not null
 union all
 select w.company_id,'work_order',w.id,w.title,w.total_amount,
   (coalesce(w.completed_at,w.opened_at) at time zone 'America/Sao_Paulo')::date,
   w.operation_id,null::uuid,nullif(w.metadata->>'workshop',''),null::uuid,
   w.status<>'completed' or nullif(w.metadata->>'maintenance_plan_id','') is not null
   or exists (select 1 from public.v2_inventory_movements m where m.company_id=w.company_id and m.work_order_id=w.id and m.movement_type='in')
 from public.v2_work_orders w where w.status<>'cancelled' and w.total_amount>0
 union all
 select m.company_id,'inventory_movement',m.id,coalesce(nullif(m.notes,''),'Compra de estoque'),
   m.quantity*m.unit_cost,(m.occurred_at at time zone 'America/Sao_Paulo')::date,
   m.operation_id,null::uuid,null::text,null::uuid,
   m.work_order_id is not null or coalesce(m.source_type,'') in ('work_order','maintenance_plan')
 from public.v2_inventory_movements m where m.movement_type='in'
)
select costs.*,case when amount is null or amount<0 or amount::text in ('NaN','Infinity','-Infinity') then 'unknown'
 when review_required or incurred_on is null then 'review' when round(amount,2)=0 then 'zero' else 'ready' end as cost_state from costs;
revoke all on public.v2_reconcilable_costs from public,anon;
grant select on public.v2_reconcilable_costs to authenticated,service_role;

create unique index if not exists v2_fin_operational_cost_active_unique
on public.v2_financial_entries(company_id,source_type,source_id)
where source_id is not null and status<>'cancelled'
and source_type in ('fuel_log','maintenance_plan','work_order','inventory_movement');

create or replace function public.v2_reconcile_operational_cost(
 p_company_id uuid,p_source_type text,p_source_id uuid,p_expected_amount numeric,p_entry_id uuid default null
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare
 cost public.v2_reconcilable_costs%rowtype;
 entry public.v2_financial_entries%rowtype;
 linked_id uuid;
begin
 if auth.uid() is null or not public.v2_has_permission(p_company_id,'finance.entries.create') then
  raise exception using errcode='42501',message='Sem permissão para conciliar despesas desta empresa.';
 end if;
 if p_source_type is null or p_source_type not in ('fuel_log','maintenance_plan','work_order','inventory_movement') or p_source_id is null then
  raise exception 'Origem de custo inválida.';
 end if;
 if p_expected_amount is null or p_expected_amount<=0 or p_expected_amount::text in ('NaN','Infinity','-Infinity') then raise exception 'Valor de conferência inválido.';end if;
 -- Serializes retries and competing create/link requests for the same source.
 perform pg_advisory_xact_lock(hashtextextended(p_company_id::text||':'||p_source_type||':'||p_source_id::text,0));
 select * into cost from public.v2_reconcilable_costs c
 where c.company_id=p_company_id and c.source_type=p_source_type and c.source_id=p_source_id;
 if not found then raise exception 'Origem não encontrada ou sem acesso.';end if;
 if cost.cost_state<>'ready' then raise exception 'Confirme o custo e confira sobreposições no módulo de origem antes de conciliar.';end if;
 if round(cost.amount,2)<>round(p_expected_amount,2) then raise exception 'O custo mudou. Atualize a tela e confira o novo valor.';end if;
 select * into entry from public.v2_financial_entries f
 where f.company_id=p_company_id and f.source_type=p_source_type and f.source_id=p_source_id and f.status<>'cancelled';
 if found then
  if p_entry_id is not null and p_entry_id<>entry.id then raise exception 'Esta origem já possui outro lançamento financeiro.';end if;
  if entry.entry_type<>'expense' or round(entry.amount,2)<>round(cost.amount,2) then raise exception 'O lançamento vinculado diverge da origem. Confira os dois registros.';end if;
  return jsonb_build_object('entry_id',entry.id,'already_linked',true);
 end if;
 if p_entry_id is not null then
  if not public.v2_has_permission(p_company_id,'finance.entries.edit') then raise exception using errcode='42501',message='Sem permissão para vincular um lançamento existente.';end if;
  select * into entry from public.v2_financial_entries f where f.id=p_entry_id and f.company_id=p_company_id for update;
  if not found then raise exception 'Lançamento não encontrado ou sem acesso.';end if;
  if entry.entry_type<>'expense' or entry.status='cancelled' or entry.source_id is not null
   or coalesce(entry.source_type,'manual')<>'manual' or round(entry.amount,2)<>round(cost.amount,2)
  then raise exception 'Selecione uma despesa manual sem vínculo, ativa e com o mesmo valor.';end if;
  update public.v2_financial_entries set source_type=p_source_type,source_id=p_source_id,
   metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('reconciled_by',auth.uid(),'reconciled_at',now(),'previous_source_type',entry.source_type),updated_at=now()
  where id=entry.id and company_id=p_company_id returning id into linked_id;
  if linked_id is null then raise exception using errcode='42501',message='O vínculo não foi autorizado.';end if;
 else
  insert into public.v2_financial_entries(company_id,operation_id,cost_center_id,entry_type,description,amount,issue_date,competence_date,status,counterparty_name,source_type,source_id,file_id,metadata,created_by)
  values(p_company_id,cost.operation_id,cost.cost_center_id,'expense',cost.description,round(cost.amount,2),cost.incurred_on,cost.incurred_on,'pending',cost.counterparty_name,p_source_type,p_source_id,cost.file_id,
    jsonb_build_object('reconciled_by',auth.uid(),'reconciled_at',now()),auth.uid()) returning id into linked_id;
 end if;
 return jsonb_build_object('entry_id',linked_id,'already_linked',false);
end;$$;
revoke all on function public.v2_reconcile_operational_cost(uuid,text,uuid,numeric,uuid) from public,anon;
grant execute on function public.v2_reconcile_operational_cost(uuid,text,uuid,numeric,uuid) to authenticated;
