-- A sincronização do campo grava poultry_loading; a receita cobria somente
-- poultry_catching. Preserva as regras existentes, os grants e os estornos.
do $migration$
declare
  definition text;
begin
  definition := pg_get_functiondef('private.v2_sync_poultry_revenue()'::regprocedure);
  if strpos(definition, 'if v_operation_type <> ''poultry_catching'' or v_team_id is null then') > 0 then
    definition := replace(definition,
      'if v_operation_type <> ''poultry_catching'' or v_team_id is null then',
      'if v_operation_type not in (''poultry_catching'',''poultry_loading'') or v_team_id is null then');
  elsif strpos(definition, 'if v_operation_type not in (''poultry_catching'',''poultry_loading'') or v_team_id is null then') = 0 then
    raise exception 'Revenue type guard changed; review before migrating';
  end if;
  if strpos(definition, 'if old.operation_type=''poultry_catching''') > 0 then
    definition := replace(definition,
      'if old.operation_type=''poultry_catching''',
      'if old.operation_type in (''poultry_catching'',''poultry_loading'')');
  elsif strpos(definition, 'if old.operation_type in (''poultry_catching'',''poultry_loading'')') = 0 then
    raise exception 'Revenue cleanup guard changed; review before migrating';
  end if;
  execute definition;

  definition := pg_get_functiondef('private.v2_rebalance_poultry_daily_fixed(uuid,uuid,date,numeric,text)'::regprocedure);
  if strpos(definition, 'and operation_type = ''poultry_catching''') > 0 then
    definition := replace(definition,
      'and operation_type = ''poultry_catching''',
      'and operation_type in (''poultry_catching'',''poultry_loading'')');
  elsif strpos(definition, 'and operation_type in (''poultry_catching'',''poultry_loading'')') = 0 then
    raise exception 'Daily revenue type guard changed; review before migrating';
  end if;
  execute definition;
end;
$migration$;

-- Recupera apenas receita ausente cujo valor e tarifa históricos se conferem.
-- Não recalcula apanhas nem toca lançamentos existentes, pagos ou cancelados.
insert into public.v2_financial_entries(
  company_id, operation_id, entry_type, description, amount,
  issue_date, competence_date, status, counterparty_name,
  source_type, source_id, metadata, created_by
)
select
  o.company_id, o.id, 'income',
  'Receita de apanha • ' || coalesce(t.metadata #>> '{billing,counterparty}',t.metadata->>'contractor_name','Contratante') ||
    ' • ' || trim(to_char(o.actual_birds,'FM999G999G999G990')) || ' aves × R$ ' ||
    replace(to_char(o.price_per_bird,'FM999990D00'),'.',','),
  round(o.actual_revenue,2),
  (coalesce(o.scheduled_start,o.actual_start,o.actual_end) at time zone 'America/Sao_Paulo')::date,
  (coalesce(o.scheduled_start,o.actual_start,o.actual_end) at time zone 'America/Sao_Paulo')::date,
  'pending', coalesce(t.metadata #>> '{billing,counterparty}',t.metadata->>'contractor_name','Contratante'),
  'poultry_operation_revenue',o.id,
  jsonb_build_object('automatic',true,'billing_mode','per_bird','team_id',o.team_id,
    'rate',o.price_per_bird,'birds',o.actual_birds,
    'reference_date',(coalesce(o.scheduled_start,o.actual_start,o.actual_end) at time zone 'America/Sao_Paulo')::date,
    'recovered_by','20261007_sync_offline_poultry_revenue','preserved_historical_amount',true),
  o.created_by
from public.v2_operations o
join public.v2_teams t on t.company_id=o.company_id and t.id=o.team_id
where o.operation_type='poultry_loading' and o.status='completed'
  and t.metadata #>> '{billing,mode}'='per_bird'
  and o.actual_revenue>0 and o.price_per_bird>0 and o.actual_birds>0
  and round(o.actual_birds*o.price_per_bird,2)=round(o.actual_revenue,2)
  and coalesce(o.scheduled_start,o.actual_start,o.actual_end) is not null
  and not exists(
    select 1 from public.v2_financial_entries f
    where f.company_id=o.company_id and
      (f.operation_id=o.id or (f.source_type='poultry_operation_revenue' and f.source_id=o.id))
  )
on conflict do nothing;
