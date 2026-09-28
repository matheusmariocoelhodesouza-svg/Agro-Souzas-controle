-- Oficina 360 — correção da conversão Orçamento -> OS
-- v2_work_orders.work_order_number é GENERATED ALWAYS AS IDENTITY;
-- portanto o banco deve gerar o número automaticamente.

create or replace function public.v2_convert_quote_to_work_order(p_quote_id uuid)
returns uuid
language plpgsql
security invoker
set search_path=public,pg_temp
as $$
declare
  q public.v2_quotes%rowtype;
  new_work_order_id uuid;
  item_snapshot jsonb;
begin
  select * into q
  from public.v2_quotes
  where id=p_quote_id
  for update;

  if q.id is null then raise exception 'Orçamento não encontrado'; end if;
  if not public.v2_has_permission(q.company_id,'workshop.manage'::text) then
    raise exception 'Sem permissão para converter este orçamento';
  end if;
  if q.work_order_id is not null then return q.work_order_id; end if;
  if q.status<>'approved' then raise exception 'Apenas orçamento aprovado pode virar OS'; end if;
  if q.vehicle_id is null then raise exception 'Selecione um veículo antes de converter em OS'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',i.id,'type',i.item_type,'description',i.description,'part_number',i.part_number,
    'quantity',i.quantity,'unit_cost',i.unit_cost,'unit_price',i.unit_price,
    'component_id',i.component_id,'inventory_item_id',i.inventory_item_id
  ) order by i.sort_order,i.created_at),'[]'::jsonb)
  into item_snapshot
  from public.v2_quote_items i
  where i.quote_id=q.id;

  insert into public.v2_work_orders(
    company_id,vehicle_id,maintenance_type,title,reported_issue,diagnosis,
    odometer_km,labor_amount,parts_amount,total_amount,status,metadata,created_by
  ) values (
    q.company_id,q.vehicle_id,q.maintenance_type,q.title,q.reported_issue,q.diagnosis,
    q.odometer_km,q.subtotal_labor+q.subtotal_outsourced,q.subtotal_parts,q.total_amount,'approved',
    jsonb_build_object(
      'source','oficina360_quote','quote_id',q.id,'quote_number',q.quote_number,
      'quote_tier',q.quote_tier,'quote_total',q.total_amount,'quote_cost',q.total_cost,
      'discount_amount',q.discount_amount,'customer_name',q.customer_name,
      'customer_phone',q.customer_phone,'payment_terms',q.payment_terms,
      'delivery_estimate',q.delivery_estimate,'quoted_items',item_snapshot,
      'stock_note','Itens orçados não baixam estoque na aprovação; a baixa ocorre quando a peça for efetivamente lançada como utilizada na OS.'
    ),
    coalesce(q.created_by,auth.uid())
  ) returning id into new_work_order_id;

  update public.v2_quotes
  set work_order_id=new_work_order_id,status='converted',converted_at=now(),updated_at=now()
  where id=q.id;

  return new_work_order_id;
end;
$$;

revoke all on function public.v2_convert_quote_to_work_order(uuid) from public,anon;
grant execute on function public.v2_convert_quote_to_work_order(uuid) to authenticated;
