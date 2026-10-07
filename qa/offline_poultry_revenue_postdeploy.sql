-- Somente leitura: verifica cobertura, proteção de receita paga e recuperação.
do $audit$
declare
  definition text;
  n integer;
begin
  definition:=pg_get_functiondef('private.v2_sync_poultry_revenue()'::regprocedure);
  if strpos(definition,'if v_operation_type not in (''poultry_catching'',''poultry_loading'')')=0
     or strpos(definition,'if old.operation_type in (''poultry_catching'',''poultry_loading'')')=0
     or strpos(definition,'if v_has_paid_entry then')=0
     or strpos(definition,'if pg_trigger_depth() > 1 then')=0 then
    raise exception 'Offline revenue trigger contract failed';
  end if;
  definition:=pg_get_functiondef('private.v2_rebalance_poultry_daily_fixed(uuid,uuid,date,numeric,text)'::regprocedure);
  if strpos(definition,'and operation_type in (''poultry_catching'',''poultry_loading'')')=0 then
    raise exception 'Offline daily revenue contract failed';
  end if;
  select count(*) into n
  from public.v2_operations o
  join public.v2_teams t on t.company_id=o.company_id and t.id=o.team_id
  where o.operation_type='poultry_loading' and o.status='completed'
    and t.metadata #>> '{billing,mode}'='per_bird'
    and o.actual_revenue>0 and o.price_per_bird>0 and o.actual_birds>0
    and round(o.actual_birds*o.price_per_bird,2)=round(o.actual_revenue,2)
    and not exists(select 1 from public.v2_financial_entries f
      where f.company_id=o.company_id and (f.operation_id=o.id or
        (f.source_type='poultry_operation_revenue' and f.source_id=o.id)));
  if n<>0 then raise exception 'Offline poultry revenue missing: % operation(s)',n; end if;
  select count(*) into n from public.v2_financial_entries f
  join public.v2_operations o on o.company_id=f.company_id and o.id=f.operation_id
  where f.metadata->>'recovered_by'='20261007_sync_offline_poultry_revenue'
    and (f.amount is distinct from round(o.actual_revenue,2)
      or f.competence_date is distinct from
      (coalesce(o.scheduled_start,o.actual_start,o.actual_end) at time zone 'America/Sao_Paulo')::date);
  if n<>0 then raise exception 'Historical offline revenue changed: % entry(s)',n; end if;
end;
$audit$;
select 'OFFLINE_POULTRY_REVENUE_OK' as result;
