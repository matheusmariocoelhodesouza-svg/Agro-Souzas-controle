create or replace function public.v2_seed_self_service_subscription()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  if coalesce(new.metadata->>'created_from','')='self_service_onboarding'
     and not exists (select 1 from public.v2_subscriptions s where s.company_id=new.id) then
    insert into public.v2_subscriptions(
      company_id, plan_code, status, trial_ends_at,
      current_period_start, current_period_end, limits
    ) values (
      new.id,
      'complete',
      'trial',
      coalesce(new.created_at,now()) + interval '14 days',
      coalesce(new.created_at,now()),
      coalesce(new.created_at,now()) + interval '14 days',
      '{}'::jsonb
    );
  end if;
  return new;
end;
$function$;

drop trigger if exists v2_seed_self_service_subscription_trg on public.v2_companies;
create trigger v2_seed_self_service_subscription_trg
after insert on public.v2_companies
for each row
when ((new.metadata->>'created_from')='self_service_onboarding')
execute function public.v2_seed_self_service_subscription();

insert into public.v2_subscriptions(
  company_id, plan_code, status, trial_ends_at,
  current_period_start, current_period_end, limits
)
select
  c.id,
  'complete',
  'trial',
  c.created_at + interval '14 days',
  c.created_at,
  c.created_at + interval '14 days',
  '{}'::jsonb
from public.v2_companies c
where c.metadata->>'created_from'='self_service_onboarding'
  and not exists (select 1 from public.v2_subscriptions s where s.company_id=c.id);

comment on function public.v2_seed_self_service_subscription()
is 'Cria assinatura real de teste do plano Completo para novas empresas criadas pelo onboarding self-service.';
