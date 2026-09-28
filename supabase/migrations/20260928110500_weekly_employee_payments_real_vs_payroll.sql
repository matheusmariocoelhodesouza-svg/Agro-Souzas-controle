-- Comando 360: pagamento semanal real + conciliacao com holerite

alter table public.v2_employee_payments
  add column if not exists period_start date,
  add column if not exists period_end date,
  add column if not exists gross_amount numeric(14,2) not null default 0,
  add column if not exists discount_amount numeric(14,2) not null default 0,
  add column if not exists payment_method text not null default 'pix',
  add column if not exists receipt_code text,
  add column if not exists breakdown jsonb not null default '[]'::jsonb,
  add column if not exists updated_at timestamptz not null default now();

alter table public.v2_employee_payments drop constraint if exists v2_employee_payments_payment_type_check;
alter table public.v2_employee_payments
  add constraint v2_employee_payments_payment_type_check
  check (payment_type = any (array[
    'daily'::text,'bonus'::text,'allowance'::text,'advance'::text,'discount'::text,
    'reimbursement'::text,'vacation'::text,'other'::text,'weekly_settlement'::text
  ]));

alter table public.v2_employee_payments drop constraint if exists v2_employee_payments_payment_method_check;
alter table public.v2_employee_payments
  add constraint v2_employee_payments_payment_method_check
  check (payment_method = any (array['pix'::text,'cash'::text,'bank_transfer'::text,'other'::text]));

alter table public.v2_employee_payments drop constraint if exists v2_employee_payments_amount_nonnegative_check;
alter table public.v2_employee_payments
  add constraint v2_employee_payments_amount_nonnegative_check check (amount >= 0);

alter table public.v2_employee_payments drop constraint if exists v2_employee_payments_totals_nonnegative_check;
alter table public.v2_employee_payments
  add constraint v2_employee_payments_totals_nonnegative_check check (gross_amount >= 0 and discount_amount >= 0);

alter table public.v2_employee_payments drop constraint if exists v2_employee_payments_period_check;
alter table public.v2_employee_payments
  add constraint v2_employee_payments_period_check check (period_start is null or period_end is null or period_end >= period_start);

create unique index if not exists v2_employee_payments_receipt_code_uq
  on public.v2_employee_payments(company_id, receipt_code)
  where receipt_code is not null;
create index if not exists v2_employee_payments_company_competence_idx
  on public.v2_employee_payments(company_id, competence_date, employee_id, status);
create index if not exists v2_employee_payments_paid_at_idx
  on public.v2_employee_payments(company_id, paid_at desc)
  where status='paid';

create table if not exists public.v2_employee_payroll_reconciliations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.v2_companies(id) on delete restrict,
  employee_id uuid not null references public.v2_employees(id) on delete restrict,
  competence_date date not null,
  official_gross_amount numeric(14,2) not null default 0 check (official_gross_amount >= 0),
  official_net_amount numeric(14,2) not null default 0 check (official_net_amount >= 0),
  official_source text not null default 'holerite' check (official_source in ('holerite','esocial','accounting','manual','integration')),
  status text not null default 'pending' check (status in ('pending','review','reconciled')),
  holerite_file_id uuid references public.v2_files(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, employee_id, competence_date),
  check (competence_date = date_trunc('month', competence_date)::date)
);

create index if not exists v2_employee_payroll_rec_company_comp_idx
  on public.v2_employee_payroll_reconciliations(company_id, competence_date, employee_id);

alter table public.v2_employee_payroll_reconciliations enable row level security;

drop policy if exists v2_emp_payroll_rec_select on public.v2_employee_payroll_reconciliations;
create policy v2_emp_payroll_rec_select on public.v2_employee_payroll_reconciliations
for select using (public.v2_is_company_member(company_id));

drop policy if exists v2_emp_payroll_rec_manage on public.v2_employee_payroll_reconciliations;
create policy v2_emp_payroll_rec_manage on public.v2_employee_payroll_reconciliations
for all using (public.v2_has_permission(company_id,'employee.payments.manage'))
with check (public.v2_has_permission(company_id,'employee.payments.manage'));

grant select,insert,update,delete on public.v2_employee_payroll_reconciliations to authenticated;

create or replace function public.v2_employee_payment_defaults()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at := now();
  if new.receipt_code is null or btrim(new.receipt_code) = '' then
    new.receipt_code := 'PG-' || to_char(coalesce(new.paid_at, now()),'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
  end if;
  if new.competence_date is not null then
    new.competence_date := date_trunc('month', new.competence_date)::date;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_v2_employee_payment_defaults on public.v2_employee_payments;
create trigger trg_v2_employee_payment_defaults
before insert or update on public.v2_employee_payments
for each row execute function public.v2_employee_payment_defaults();

create or replace function public.v2_employee_payroll_rec_touch()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at := now();
  new.competence_date := date_trunc('month', new.competence_date)::date;
  return new;
end;
$$;

drop trigger if exists trg_v2_employee_payroll_rec_touch on public.v2_employee_payroll_reconciliations;
create trigger trg_v2_employee_payroll_rec_touch
before insert or update on public.v2_employee_payroll_reconciliations
for each row execute function public.v2_employee_payroll_rec_touch();

create or replace function public.v2_sync_weekly_employee_payment_finance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  p_id uuid;
  p_company uuid;
  p_employee uuid;
  p_status text;
  p_type text;
  p_amount numeric;
  p_paid_at timestamptz;
  p_comp date;
  p_start date;
  p_end date;
  p_receipt text;
  p_method text;
  emp_name text;
  fin_id uuid;
begin
  if tg_op = 'DELETE' then
    p_id := old.id; p_company := old.company_id; p_employee := old.employee_id;
    p_status := 'cancelled'; p_type := old.payment_type; p_amount := old.amount;
    p_paid_at := old.paid_at; p_comp := old.competence_date; p_start := old.period_start; p_end := old.period_end;
    p_receipt := old.receipt_code; p_method := old.payment_method;
  else
    p_id := new.id; p_company := new.company_id; p_employee := new.employee_id;
    p_status := new.status; p_type := new.payment_type; p_amount := new.amount;
    p_paid_at := new.paid_at; p_comp := new.competence_date; p_start := new.period_start; p_end := new.period_end;
    p_receipt := new.receipt_code; p_method := new.payment_method;
  end if;

  -- Somente o fechamento semanal efetivamente pago vira saida de caixa.
  -- O valor de holerite fica na conciliacao e nunca duplica o Financeiro.
  if p_type <> 'weekly_settlement' then
    return coalesce(new, old);
  end if;

  select full_name into emp_name from public.v2_employees where id=p_employee and company_id=p_company;
  select id into fin_id
  from public.v2_financial_entries
  where company_id=p_company and source_type='employee_payment' and source_id=p_id
  order by created_at desc limit 1;

  if tg_op='DELETE' or p_status <> 'paid' or coalesce(p_amount,0) <= 0 then
    if fin_id is not null then
      update public.v2_financial_entries
      set status='cancelled', updated_at=now(),
          metadata=coalesce(metadata,'{}'::jsonb) || jsonb_build_object('cancelled_from_employee_payment',true)
      where id=fin_id;
    end if;
    return coalesce(new, old);
  end if;

  if fin_id is null then
    insert into public.v2_financial_entries(
      company_id,entry_type,description,amount,issue_date,competence_date,paid_at,status,
      counterparty_name,source_type,source_id,metadata,created_by
    ) values (
      p_company,'expense','Pagamento semanal - '||coalesce(emp_name,'Funcionario'),p_amount,
      coalesce(p_paid_at::date,p_end,p_start,p_comp,current_date),p_comp,p_paid_at,'paid',
      emp_name,'employee_payment',p_id,
      jsonb_build_object(
        'employee_id',p_employee,'receipt_code',p_receipt,'payment_method',p_method,
        'period_start',p_start,'period_end',p_end,'real_cash',true,'origin','weekly_employee_payment'
      ),auth.uid()
    );
  else
    update public.v2_financial_entries
    set entry_type='expense', description='Pagamento semanal - '||coalesce(emp_name,'Funcionario'),
        amount=p_amount, issue_date=coalesce(p_paid_at::date,p_end,p_start,p_comp,current_date),
        competence_date=p_comp, paid_at=p_paid_at, status='paid', counterparty_name=emp_name,
        metadata=jsonb_build_object(
          'employee_id',p_employee,'receipt_code',p_receipt,'payment_method',p_method,
          'period_start',p_start,'period_end',p_end,'real_cash',true,'origin','weekly_employee_payment'
        ), updated_at=now()
    where id=fin_id;
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_v2_sync_weekly_employee_payment_finance on public.v2_employee_payments;
create trigger trg_v2_sync_weekly_employee_payment_finance
after insert or update or delete on public.v2_employee_payments
for each row execute function public.v2_sync_weekly_employee_payment_finance();

create or replace view public.v2_employee_real_payments_monthly
with (security_invoker=true)
as
select
  company_id,
  employee_id,
  date_trunc('month',competence_date)::date as competence_date,
  count(*) filter (where status='paid' and payment_type='weekly_settlement') as paid_weeks,
  coalesce(sum(gross_amount) filter (where status='paid' and payment_type='weekly_settlement'),0)::numeric(14,2) as real_gross_amount,
  coalesce(sum(discount_amount) filter (where status='paid' and payment_type='weekly_settlement'),0)::numeric(14,2) as real_discount_amount,
  coalesce(sum(amount) filter (where status='paid' and payment_type='weekly_settlement'),0)::numeric(14,2) as real_paid_amount,
  min(period_start) filter (where status='paid' and payment_type='weekly_settlement') as first_period_start,
  max(period_end) filter (where status='paid' and payment_type='weekly_settlement') as last_period_end,
  max(paid_at) filter (where status='paid' and payment_type='weekly_settlement') as last_paid_at
from public.v2_employee_payments
group by company_id,employee_id,date_trunc('month',competence_date)::date;

grant select on public.v2_employee_real_payments_monthly to authenticated;

create or replace view public.v2_employee_payroll_reconciliation_view
with (security_invoker=true)
as
select
  coalesce(r.company_id,p.company_id) as company_id,
  coalesce(r.employee_id,p.employee_id) as employee_id,
  e.employee_number,
  e.full_name,
  coalesce(r.competence_date,p.competence_date) as competence_date,
  coalesce(r.official_gross_amount,0)::numeric(14,2) as official_gross_amount,
  coalesce(r.official_net_amount,0)::numeric(14,2) as official_net_amount,
  coalesce(p.real_gross_amount,0)::numeric(14,2) as real_gross_amount,
  coalesce(p.real_discount_amount,0)::numeric(14,2) as real_discount_amount,
  coalesce(p.real_paid_amount,0)::numeric(14,2) as real_paid_amount,
  (coalesce(p.real_paid_amount,0)-coalesce(r.official_net_amount,0))::numeric(14,2) as difference_amount,
  coalesce(p.paid_weeks,0)::bigint as paid_weeks,
  r.status as reconciliation_status,
  r.official_source,
  r.notes,
  case
    when r.id is null then 'official_missing'
    when abs(coalesce(p.real_paid_amount,0)-coalesce(r.official_net_amount,0)) <= 0.01 then 'matched'
    when r.status='reconciled' then 'reconciled'
    else 'difference'
  end as comparison_status
from public.v2_employee_payroll_reconciliations r
full join public.v2_employee_real_payments_monthly p
  on p.company_id=r.company_id and p.employee_id=r.employee_id and p.competence_date=r.competence_date
join public.v2_employees e
  on e.id=coalesce(r.employee_id,p.employee_id) and e.company_id=coalesce(r.company_id,p.company_id);

grant select on public.v2_employee_payroll_reconciliation_view to authenticated;
