-- Oficina 360 — Orçamentos v1
-- Orçamentos multiempresa, itens, clientes, auditoria e conversão segura em OS.

create schema if not exists private;

create sequence if not exists public.v2_quote_number_seq start with 1 increment by 1;

create table if not exists public.v2_workshop_customers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.v2_companies(id) on delete cascade,
  name text not null,
  person_type text not null default 'individual' check (person_type in ('individual','company')),
  document text,
  phone text,
  whatsapp text,
  email text,
  notes text,
  status text not null default 'active' check (status in ('active','inactive')),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(id,company_id)
);

create table if not exists public.v2_quotes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.v2_companies(id) on delete cascade,
  vehicle_id uuid references public.v2_vehicles(id) on delete set null,
  customer_id uuid,
  quote_number bigint not null default nextval('public.v2_quote_number_seq'),
  quote_tier text not null default 'recommended' check (quote_tier in ('essential','recommended','complete')),
  status text not null default 'draft' check (status in ('draft','sent','approved','rejected','change_requested','converted','expired')),
  maintenance_type text not null default 'corrective' check (maintenance_type in ('preventive','corrective','inspection','tire','electrical','other')),
  title text not null default 'Orçamento de serviço',
  customer_name text,
  customer_document text,
  customer_phone text,
  customer_email text,
  reported_issue text,
  diagnosis text,
  odometer_km numeric,
  valid_until date,
  delivery_estimate text,
  payment_terms text,
  notes text,
  subtotal_parts numeric(14,2) not null default 0 check (subtotal_parts >= 0),
  subtotal_labor numeric(14,2) not null default 0 check (subtotal_labor >= 0),
  subtotal_outsourced numeric(14,2) not null default 0 check (subtotal_outsourced >= 0),
  discount_amount numeric(14,2) not null default 0 check (discount_amount >= 0),
  total_amount numeric(14,2) not null default 0 check (total_amount >= 0),
  total_cost numeric(14,2) not null default 0 check (total_cost >= 0),
  work_order_id uuid references public.v2_work_orders(id) on delete set null,
  sent_at timestamptz,
  approved_at timestamptz,
  rejected_at timestamptz,
  converted_at timestamptz,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id,quote_number),
  unique(id,company_id),
  constraint v2_quotes_customer_company_fkey foreign key (customer_id,company_id)
    references public.v2_workshop_customers(id,company_id) on delete set null
);

create table if not exists public.v2_quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null,
  company_id uuid not null references public.v2_companies(id) on delete cascade,
  item_type text not null check (item_type in ('part','labor','outsourced')),
  component_id uuid references public.v2_vehicle_components(id) on delete set null,
  inventory_item_id uuid references public.v2_inventory_items(id) on delete set null,
  description text not null,
  part_number text,
  quantity numeric(12,3) not null default 1 check (quantity > 0),
  unit_cost numeric(14,2) not null default 0 check (unit_cost >= 0),
  unit_price numeric(14,2) not null default 0 check (unit_price >= 0),
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint v2_quote_items_quote_company_fkey foreign key (quote_id,company_id)
    references public.v2_quotes(id,company_id) on delete cascade
);

create table if not exists public.v2_quote_events (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null,
  company_id uuid not null references public.v2_companies(id) on delete cascade,
  event_type text not null,
  from_status text,
  to_status text,
  message text,
  actor_user_id uuid references auth.users(id) on delete set null default auth.uid(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint v2_quote_events_quote_company_fkey foreign key (quote_id,company_id)
    references public.v2_quotes(id,company_id) on delete cascade
);

create index if not exists v2_workshop_customers_company_name_idx
  on public.v2_workshop_customers(company_id,name);
create index if not exists v2_quotes_company_vehicle_created_idx
  on public.v2_quotes(company_id,vehicle_id,created_at desc);
create index if not exists v2_quotes_company_status_created_idx
  on public.v2_quotes(company_id,status,created_at desc);
create index if not exists v2_quotes_customer_idx
  on public.v2_quotes(customer_id,created_at desc);
create index if not exists v2_quote_items_quote_sort_idx
  on public.v2_quote_items(quote_id,sort_order,created_at);
create index if not exists v2_quote_items_inventory_idx
  on public.v2_quote_items(inventory_item_id) where inventory_item_id is not null;
create index if not exists v2_quote_items_component_idx
  on public.v2_quote_items(component_id) where component_id is not null;
create index if not exists v2_quote_events_quote_created_idx
  on public.v2_quote_events(quote_id,created_at desc);

alter table public.v2_workshop_customers enable row level security;
alter table public.v2_quotes enable row level security;
alter table public.v2_quote_items enable row level security;
alter table public.v2_quote_events enable row level security;

revoke all on table public.v2_workshop_customers from anon;
revoke all on table public.v2_quotes from anon;
revoke all on table public.v2_quote_items from anon;
revoke all on table public.v2_quote_events from anon;

grant select,insert,update,delete on table public.v2_workshop_customers to authenticated;
grant select,insert,update,delete on table public.v2_quotes to authenticated;
grant select,insert,update,delete on table public.v2_quote_items to authenticated;
grant select,insert on table public.v2_quote_events to authenticated;
grant usage,select on sequence public.v2_quote_number_seq to authenticated;

drop policy if exists v2_workshop_customers_member_select on public.v2_workshop_customers;
create policy v2_workshop_customers_member_select on public.v2_workshop_customers
  for select to authenticated using (public.v2_is_company_member(company_id));
drop policy if exists v2_workshop_customers_write_perm on public.v2_workshop_customers;
create policy v2_workshop_customers_write_perm on public.v2_workshop_customers
  for all to authenticated
  using (public.v2_has_permission(company_id,'workshop.manage'::text))
  with check (public.v2_has_permission(company_id,'workshop.manage'::text));

drop policy if exists v2_quotes_member_select on public.v2_quotes;
create policy v2_quotes_member_select on public.v2_quotes
  for select to authenticated using (public.v2_is_company_member(company_id));
drop policy if exists v2_quotes_write_perm on public.v2_quotes;
create policy v2_quotes_write_perm on public.v2_quotes
  for all to authenticated
  using (public.v2_has_permission(company_id,'workshop.manage'::text))
  with check (public.v2_has_permission(company_id,'workshop.manage'::text));

drop policy if exists v2_quote_items_member_select on public.v2_quote_items;
create policy v2_quote_items_member_select on public.v2_quote_items
  for select to authenticated using (public.v2_is_company_member(company_id));
drop policy if exists v2_quote_items_write_perm on public.v2_quote_items;
create policy v2_quote_items_write_perm on public.v2_quote_items
  for all to authenticated
  using (public.v2_has_permission(company_id,'workshop.manage'::text))
  with check (public.v2_has_permission(company_id,'workshop.manage'::text));

drop policy if exists v2_quote_events_member_select on public.v2_quote_events;
create policy v2_quote_events_member_select on public.v2_quote_events
  for select to authenticated using (public.v2_is_company_member(company_id));
drop policy if exists v2_quote_events_insert_perm on public.v2_quote_events;
create policy v2_quote_events_insert_perm on public.v2_quote_events
  for insert to authenticated
  with check (public.v2_has_permission(company_id,'workshop.manage'::text));

create or replace function private.v2_quote_touch_updated_at()
returns trigger
language plpgsql
set search_path=public,pg_temp
as $$
begin
  new.updated_at=now();
  return new;
end;
$$;

create or replace function private.v2_quote_validate_scope()
returns trigger
language plpgsql
set search_path=public,pg_temp
as $$
begin
  if new.vehicle_id is not null and not exists(
    select 1 from public.v2_vehicles v where v.id=new.vehicle_id and v.company_id=new.company_id
  ) then
    raise exception 'Veículo não pertence à empresa do orçamento';
  end if;
  return new;
end;
$$;

create or replace function private.v2_quote_item_validate_scope()
returns trigger
language plpgsql
set search_path=public,pg_temp
as $$
begin
  if new.inventory_item_id is not null and not exists(
    select 1 from public.v2_inventory_items i where i.id=new.inventory_item_id and i.company_id=new.company_id
  ) then
    raise exception 'Item de estoque não pertence à empresa do orçamento';
  end if;
  return new;
end;
$$;

create or replace function private.v2_quote_recalculate(p_quote_id uuid)
returns void
language plpgsql
set search_path=public,pg_temp
as $$
declare
  p numeric(14,2):=0;
  l numeric(14,2):=0;
  o numeric(14,2):=0;
  c numeric(14,2):=0;
begin
  select
    coalesce(sum(case when item_type='part' then quantity*unit_price else 0 end),0),
    coalesce(sum(case when item_type='labor' then quantity*unit_price else 0 end),0),
    coalesce(sum(case when item_type='outsourced' then quantity*unit_price else 0 end),0),
    coalesce(sum(quantity*unit_cost),0)
  into p,l,o,c
  from public.v2_quote_items where quote_id=p_quote_id;

  update public.v2_quotes q
  set subtotal_parts=p,
      subtotal_labor=l,
      subtotal_outsourced=o,
      total_cost=c,
      total_amount=greatest(0,p+l+o-coalesce(q.discount_amount,0)),
      updated_at=now()
  where q.id=p_quote_id;
end;
$$;

create or replace function private.v2_quote_item_recalculate_trigger()
returns trigger
language plpgsql
set search_path=public,pg_temp
as $$
begin
  perform private.v2_quote_recalculate(coalesce(new.quote_id,old.quote_id));
  return coalesce(new,old);
end;
$$;

create or replace function private.v2_quote_discount_recalculate_trigger()
returns trigger
language plpgsql
set search_path=public,pg_temp
as $$
begin
  perform private.v2_quote_recalculate(new.id);
  return new;
end;
$$;

create or replace function private.v2_quote_status_timestamps()
returns trigger
language plpgsql
set search_path=public,pg_temp
as $$
begin
  if new.status is distinct from old.status then
    if new.status='sent' and new.sent_at is null then new.sent_at=now(); end if;
    if new.status='approved' and new.approved_at is null then new.approved_at=now(); end if;
    if new.status='rejected' and new.rejected_at is null then new.rejected_at=now(); end if;
    if new.status='converted' and new.converted_at is null then new.converted_at=now(); end if;
  end if;
  return new;
end;
$$;

create or replace function private.v2_quote_status_event()
returns trigger
language plpgsql
set search_path=public,pg_temp
as $$
begin
  if tg_op='INSERT' then
    insert into public.v2_quote_events(quote_id,company_id,event_type,to_status,message)
    values(new.id,new.company_id,'created',new.status,'Orçamento criado');
  elsif new.status is distinct from old.status then
    insert into public.v2_quote_events(quote_id,company_id,event_type,from_status,to_status,message)
    values(new.id,new.company_id,'status_changed',old.status,new.status,'Status do orçamento alterado');
  end if;
  return new;
end;
$$;

revoke all on function private.v2_quote_touch_updated_at() from public,anon;
revoke all on function private.v2_quote_validate_scope() from public,anon;
revoke all on function private.v2_quote_item_validate_scope() from public,anon;
revoke all on function private.v2_quote_recalculate(uuid) from public,anon;
revoke all on function private.v2_quote_item_recalculate_trigger() from public,anon;
revoke all on function private.v2_quote_discount_recalculate_trigger() from public,anon;
revoke all on function private.v2_quote_status_timestamps() from public,anon;
revoke all on function private.v2_quote_status_event() from public,anon;

drop trigger if exists trg_v2_workshop_customers_touch on public.v2_workshop_customers;
create trigger trg_v2_workshop_customers_touch before update on public.v2_workshop_customers
for each row execute function private.v2_quote_touch_updated_at();

drop trigger if exists trg_v2_quotes_touch on public.v2_quotes;
create trigger trg_v2_quotes_touch before update on public.v2_quotes
for each row execute function private.v2_quote_touch_updated_at();

drop trigger if exists trg_v2_quotes_scope on public.v2_quotes;
create trigger trg_v2_quotes_scope before insert or update of company_id,vehicle_id on public.v2_quotes
for each row execute function private.v2_quote_validate_scope();

drop trigger if exists trg_v2_quotes_status_timestamps on public.v2_quotes;
create trigger trg_v2_quotes_status_timestamps before update of status on public.v2_quotes
for each row execute function private.v2_quote_status_timestamps();

drop trigger if exists trg_v2_quotes_status_event on public.v2_quotes;
create trigger trg_v2_quotes_status_event after insert or update of status on public.v2_quotes
for each row execute function private.v2_quote_status_event();

drop trigger if exists trg_v2_quotes_discount_recalc on public.v2_quotes;
create trigger trg_v2_quotes_discount_recalc after update of discount_amount on public.v2_quotes
for each row when (new.discount_amount is distinct from old.discount_amount)
execute function private.v2_quote_discount_recalculate_trigger();

drop trigger if exists trg_v2_quote_items_touch on public.v2_quote_items;
create trigger trg_v2_quote_items_touch before update on public.v2_quote_items
for each row execute function private.v2_quote_touch_updated_at();

drop trigger if exists trg_v2_quote_items_scope on public.v2_quote_items;
create trigger trg_v2_quote_items_scope before insert or update of company_id,inventory_item_id on public.v2_quote_items
for each row execute function private.v2_quote_item_validate_scope();

drop trigger if exists trg_v2_quote_items_recalc on public.v2_quote_items;
create trigger trg_v2_quote_items_recalc after insert or update or delete on public.v2_quote_items
for each row execute function private.v2_quote_item_recalculate_trigger();

create or replace function public.v2_convert_quote_to_work_order(p_quote_id uuid)
returns uuid
language plpgsql
security invoker
set search_path=public,pg_temp
as $$
declare
  q public.v2_quotes%rowtype;
  next_number bigint;
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

  perform pg_advisory_xact_lock(hashtext(q.company_id::text));
  select coalesce(max(work_order_number),0)+1
    into next_number
  from public.v2_work_orders
  where company_id=q.company_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',i.id,'type',i.item_type,'description',i.description,'part_number',i.part_number,
    'quantity',i.quantity,'unit_cost',i.unit_cost,'unit_price',i.unit_price,
    'component_id',i.component_id,'inventory_item_id',i.inventory_item_id
  ) order by i.sort_order,i.created_at),'[]'::jsonb)
  into item_snapshot
  from public.v2_quote_items i
  where i.quote_id=q.id;

  insert into public.v2_work_orders(
    company_id,vehicle_id,work_order_number,maintenance_type,title,reported_issue,diagnosis,
    odometer_km,labor_amount,parts_amount,total_amount,status,metadata,created_by
  ) values (
    q.company_id,q.vehicle_id,next_number,q.maintenance_type,q.title,q.reported_issue,q.diagnosis,
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
