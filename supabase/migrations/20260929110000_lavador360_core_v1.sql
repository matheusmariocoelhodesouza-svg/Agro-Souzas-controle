-- Lavador 360 v1
-- App independente, banco compartilhado com Comando 360 e Oficina 360.

begin;

insert into public.v2_permissions(code,module_code,description)
values
  ('wash.view','wash','Visualizar Lavador 360, lavagens, clientes, produtos e indicadores'),
  ('wash.manage','wash','Gerenciar Lavador 360, lavagens, clientes, produtos e inspeções')
on conflict (code) do update set module_code=excluded.module_code, description=excluded.description;

-- Herda o acesso inicial dos mesmos papéis que já administram a Oficina.
insert into public.v2_role_permissions(role_id,permission_id,allowed)
select distinct rp.role_id,pw.id,true
from public.v2_role_permissions rp
join public.v2_permissions pold on pold.id=rp.permission_id and pold.code='workshop.manage' and rp.allowed=true
cross join public.v2_permissions pw
where pw.code='wash.manage'
on conflict (role_id,permission_id) do update set allowed=excluded.allowed;

insert into public.v2_role_permissions(role_id,permission_id,allowed)
select distinct rp.role_id,pw.id,true
from public.v2_role_permissions rp
join public.v2_permissions pold on pold.id=rp.permission_id and pold.code in ('workshop.view','workshop.manage') and rp.allowed=true
cross join public.v2_permissions pw
where pw.code='wash.view'
on conflict (role_id,permission_id) do update set allowed=excluded.allowed;

create table if not exists public.v2_wash_settings(
  company_id uuid primary key references public.v2_companies(id) on delete cascade,
  water_cost_per_liter numeric(12,6) not null default 0 check(water_cost_per_liter>=0),
  energy_cost_per_kwh numeric(12,4) not null default 0 check(energy_cost_per_kwh>=0),
  labor_cost_per_hour numeric(12,2) not null default 0 check(labor_cost_per_hour>=0),
  equipment_cost_per_wash numeric(12,2) not null default 0 check(equipment_cost_per_wash>=0),
  consumables_cost_per_wash numeric(12,2) not null default 0 check(consumables_cost_per_wash>=0),
  currency_code text not null default 'BRL',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.v2_wash_customers(
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.v2_companies(id) on delete cascade,
  name text not null check(length(trim(name))>=2),
  document text,
  phone text,
  email text,
  notes text,
  status text not null default 'active' check(status in ('active','inactive')),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists v2_wash_customers_company_idx on public.v2_wash_customers(company_id,status,name);

create table if not exists public.v2_wash_customer_vehicles(
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.v2_companies(id) on delete cascade,
  customer_id uuid not null references public.v2_wash_customers(id) on delete cascade,
  plate text,
  description text not null,
  make text,
  model text,
  vehicle_class text not null default 'other' check(vehicle_class in ('van','microbus','bus','truck','pickup','car','machine','other')),
  status text not null default 'active' check(status in ('active','inactive')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id,plate)
);
create index if not exists v2_wash_customer_vehicles_customer_idx on public.v2_wash_customer_vehicles(company_id,customer_id,status);

create table if not exists public.v2_wash_service_catalog(
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.v2_companies(id) on delete cascade,
  code text not null,
  name text not null,
  vehicle_class text not null default 'other' check(vehicle_class in ('van','microbus','bus','truck','pickup','car','machine','other','any')),
  sale_price numeric(12,2) not null default 0 check(sale_price>=0),
  outsourced_reference_price numeric(12,2) not null default 0 check(outsourced_reference_price>=0),
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id,code,vehicle_class)
);

create table if not exists public.v2_wash_products(
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.v2_companies(id) on delete cascade,
  name text not null,
  brand text,
  package_size_ml numeric(14,2) not null default 1000 check(package_size_ml>0),
  purchase_price numeric(12,2) not null default 0 check(purchase_price>=0),
  unit_cost_per_ml numeric(14,6) generated always as (round(purchase_price/nullif(package_size_ml,0),6)) stored,
  stock_ml numeric(14,2) not null default 0 check(stock_ml>=0),
  minimum_stock_ml numeric(14,2) not null default 0 check(minimum_stock_ml>=0),
  default_dilution_ratio numeric(10,2) check(default_dilution_ratio is null or default_dilution_ratio>=0),
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id,name,brand)
);
create index if not exists v2_wash_products_company_idx on public.v2_wash_products(company_id,active,name);

create table if not exists public.v2_wash_orders(
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.v2_companies(id) on delete cascade,
  wash_number bigint not null,
  ownership text not null default 'internal' check(ownership in ('internal','external')),
  customer_id uuid references public.v2_wash_customers(id) on delete set null,
  vehicle_id uuid references public.v2_vehicles(id) on delete set null,
  customer_vehicle_id uuid references public.v2_wash_customer_vehicles(id) on delete set null,
  plate_snapshot text,
  vehicle_label text not null,
  vehicle_class text not null default 'other' check(vehicle_class in ('van','microbus','bus','truck','pickup','car','machine','other')),
  service_code text,
  service_name text not null,
  status text not null default 'in_progress' check(status in ('scheduled','in_progress','completed','cancelled')),
  scheduled_for timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  responsible_name text,
  sale_price numeric(12,2) not null default 0 check(sale_price>=0),
  outsourced_reference_price numeric(12,2) not null default 0 check(outsourced_reference_price>=0),
  water_liters numeric(12,2) not null default 0 check(water_liters>=0),
  water_cost_per_liter numeric(12,6) not null default 0 check(water_cost_per_liter>=0),
  water_cost numeric(12,2) not null default 0 check(water_cost>=0),
  energy_kwh numeric(12,3) not null default 0 check(energy_kwh>=0),
  energy_cost_per_kwh numeric(12,4) not null default 0 check(energy_cost_per_kwh>=0),
  energy_cost numeric(12,2) not null default 0 check(energy_cost>=0),
  labor_minutes integer not null default 0 check(labor_minutes>=0),
  labor_cost_per_hour numeric(12,2) not null default 0 check(labor_cost_per_hour>=0),
  labor_cost numeric(12,2) not null default 0 check(labor_cost>=0),
  consumables_cost numeric(12,2) not null default 0 check(consumables_cost>=0),
  equipment_cost numeric(12,2) not null default 0 check(equipment_cost>=0),
  products_cost numeric(12,2) not null default 0 check(products_cost>=0),
  total_cost numeric(12,2) not null default 0 check(total_cost>=0),
  margin_value numeric(12,2) not null default 0,
  estimated_savings numeric(12,2) not null default 0,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id,wash_number),
  check((ownership='internal' and vehicle_id is not null) or ownership='external')
);
create index if not exists v2_wash_orders_company_date_idx on public.v2_wash_orders(company_id,created_at desc);
create index if not exists v2_wash_orders_vehicle_idx on public.v2_wash_orders(company_id,vehicle_id,created_at desc);
create index if not exists v2_wash_orders_customer_idx on public.v2_wash_orders(company_id,customer_id,created_at desc);

create table if not exists public.v2_wash_order_products(
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.v2_companies(id) on delete cascade,
  wash_order_id uuid not null references public.v2_wash_orders(id) on delete cascade,
  product_id uuid not null references public.v2_wash_products(id) on delete restrict,
  concentrate_ml numeric(14,2) not null check(concentrate_ml>0),
  solution_ml numeric(14,2) check(solution_ml is null or solution_ml>=concentrate_ml),
  dilution_ratio numeric(10,2) check(dilution_ratio is null or dilution_ratio>=0),
  unit_cost_per_ml numeric(14,6) not null default 0 check(unit_cost_per_ml>=0),
  cost numeric(12,2) not null default 0 check(cost>=0),
  created_at timestamptz not null default now()
);
create index if not exists v2_wash_order_products_order_idx on public.v2_wash_order_products(company_id,wash_order_id);

create table if not exists public.v2_wash_findings(
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.v2_companies(id) on delete cascade,
  wash_order_id uuid not null references public.v2_wash_orders(id) on delete cascade,
  vehicle_id uuid references public.v2_vehicles(id) on delete set null,
  category text not null default 'inspection',
  severity text not null default 'attention' check(severity in ('info','attention','urgent')),
  description text not null check(length(trim(description))>=3),
  photo_url text,
  status text not null default 'open' check(status in ('open','sent_to_workshop','resolved','dismissed')),
  sent_to_workshop boolean not null default false,
  workshop_order_id uuid references public.v2_work_orders(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists v2_wash_findings_company_idx on public.v2_wash_findings(company_id,status,created_at desc);

create or replace function public.v2_wash_compute_order()
returns trigger
language plpgsql
security invoker
set search_path=public
as $$
begin
  new.water_cost := round(coalesce(new.water_liters,0)*coalesce(new.water_cost_per_liter,0),2);
  new.energy_cost := round(coalesce(new.energy_kwh,0)*coalesce(new.energy_cost_per_kwh,0),2);
  new.labor_cost := round((coalesce(new.labor_minutes,0)::numeric/60)*coalesce(new.labor_cost_per_hour,0),2);
  new.total_cost := round(coalesce(new.products_cost,0)+coalesce(new.water_cost,0)+coalesce(new.energy_cost,0)+coalesce(new.labor_cost,0)+coalesce(new.consumables_cost,0)+coalesce(new.equipment_cost,0),2);
  if new.ownership='external' then
    new.margin_value := round(coalesce(new.sale_price,0)-new.total_cost,2);
    new.estimated_savings := 0;
  else
    new.margin_value := 0;
    new.estimated_savings := round(greatest(coalesce(new.outsourced_reference_price,0)-new.total_cost,0),2);
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_v2_wash_compute_order on public.v2_wash_orders;
create trigger trg_v2_wash_compute_order
before insert or update on public.v2_wash_orders
for each row execute function public.v2_wash_compute_order();

create or replace function public.v2_wash_usage_before_change()
returns trigger
language plpgsql
security invoker
set search_path=public
as $$
declare
  v_unit numeric;
  v_stock numeric;
begin
  if tg_op='DELETE' then
    update public.v2_wash_products set stock_ml=stock_ml+old.concentrate_ml,updated_at=now()
      where id=old.product_id and company_id=old.company_id;
    return old;
  end if;

  select unit_cost_per_ml,stock_ml into v_unit,v_stock
  from public.v2_wash_products
  where id=new.product_id and company_id=new.company_id and active=true
  for update;
  if not found then raise exception 'Produto não encontrado ou inativo'; end if;

  if tg_op='INSERT' then
    if v_stock<new.concentrate_ml then raise exception 'Estoque insuficiente para este produto'; end if;
    update public.v2_wash_products set stock_ml=stock_ml-new.concentrate_ml,updated_at=now() where id=new.product_id;
  else
    if old.product_id=new.product_id then
      if v_stock+old.concentrate_ml<new.concentrate_ml then raise exception 'Estoque insuficiente para este produto'; end if;
      update public.v2_wash_products set stock_ml=stock_ml+old.concentrate_ml-new.concentrate_ml,updated_at=now() where id=new.product_id;
    else
      update public.v2_wash_products set stock_ml=stock_ml+old.concentrate_ml,updated_at=now() where id=old.product_id and company_id=old.company_id;
      if v_stock<new.concentrate_ml then raise exception 'Estoque insuficiente para este produto'; end if;
      update public.v2_wash_products set stock_ml=stock_ml-new.concentrate_ml,updated_at=now() where id=new.product_id;
    end if;
  end if;

  new.unit_cost_per_ml := coalesce(v_unit,0);
  new.cost := round(new.concentrate_ml*coalesce(v_unit,0),2);
  return new;
end;
$$;

create or replace function public.v2_wash_usage_recalculate_order()
returns trigger
language plpgsql
security invoker
set search_path=public
as $$
declare v_order uuid;
begin
  v_order := case when tg_op='DELETE' then old.wash_order_id else new.wash_order_id end;
  update public.v2_wash_orders o
  set products_cost=(select coalesce(sum(x.cost),0) from public.v2_wash_order_products x where x.wash_order_id=v_order)
  where o.id=v_order;
  return coalesce(new,old);
end;
$$;

drop trigger if exists trg_v2_wash_usage_before_change on public.v2_wash_order_products;
create trigger trg_v2_wash_usage_before_change
before insert or update or delete on public.v2_wash_order_products
for each row execute function public.v2_wash_usage_before_change();

drop trigger if exists trg_v2_wash_usage_recalculate_order on public.v2_wash_order_products;
create trigger trg_v2_wash_usage_recalculate_order
after insert or update or delete on public.v2_wash_order_products
for each row execute function public.v2_wash_usage_recalculate_order();

create or replace function public.v2_wash_send_finding_to_workshop(p_finding_id uuid)
returns uuid
language plpgsql
security invoker
set search_path=public
as $$
declare
  f public.v2_wash_findings%rowtype;
  n bigint;
  new_id uuid;
begin
  select * into f from public.v2_wash_findings where id=p_finding_id;
  if not found then raise exception 'Inspeção não encontrada'; end if;
  if f.vehicle_id is null then raise exception 'Somente veículos da frota própria podem ser enviados ao Oficina 360'; end if;
  if not public.v2_has_permission(f.company_id,'wash.manage') then raise exception 'Sem permissão para gerenciar o Lavador 360'; end if;
  if not public.v2_has_permission(f.company_id,'workshop.manage') then raise exception 'Sem permissão para criar OS no Oficina 360'; end if;
  if f.workshop_order_id is not null then return f.workshop_order_id; end if;

  select coalesce(max(work_order_number),0)+1 into n from public.v2_work_orders where company_id=f.company_id;
  insert into public.v2_work_orders(company_id,vehicle_id,work_order_number,maintenance_type,title,reported_issue,status,metadata,created_by)
  values(f.company_id,f.vehicle_id,n,'inspection','Achado do Lavador 360',f.description,'open',jsonb_build_object('source','lavador360','wash_finding_id',f.id,'severity',f.severity,'category',f.category),auth.uid())
  returning id into new_id;

  update public.v2_wash_findings set sent_to_workshop=true,status='sent_to_workshop',workshop_order_id=new_id,updated_at=now() where id=f.id;
  return new_id;
end;
$$;

-- Seed de configuração e tabela de preços iniciais. Tudo é editável no app.
insert into public.v2_wash_settings(company_id)
select id from public.v2_companies
on conflict (company_id) do nothing;

insert into public.v2_wash_service_catalog(company_id,code,name,vehicle_class,sale_price,outsourced_reference_price)
select c.id,x.code,x.name,x.vehicle_class,x.sale_price,x.reference_price
from public.v2_companies c
cross join (values
 ('external','Lavagem externa','van',150::numeric,150::numeric),
 ('complete','Lavagem completa','van',220::numeric,220::numeric),
 ('external','Lavagem externa','microbus',200::numeric,200::numeric),
 ('complete','Lavagem completa','microbus',300::numeric,300::numeric),
 ('external','Lavagem externa','bus',250::numeric,250::numeric),
 ('complete','Lavagem completa','bus',380::numeric,380::numeric),
 ('external','Lavagem externa','truck',270::numeric,270::numeric),
 ('complete','Lavagem completa','truck',400::numeric,400::numeric),
 ('chassis','Lavagem de chassi','any',100::numeric,100::numeric),
 ('engine','Lavagem de motor','any',100::numeric,100::numeric)
) as x(code,name,vehicle_class,sale_price,reference_price)
on conflict (company_id,code,vehicle_class) do nothing;

-- RLS e grants: app público usa apenas publishable key + sessão autenticada.
do $$
declare t text;
begin
  foreach t in array array['v2_wash_settings','v2_wash_customers','v2_wash_customer_vehicles','v2_wash_service_catalog','v2_wash_products','v2_wash_orders','v2_wash_order_products','v2_wash_findings'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on table public.%I from anon',t);
    execute format('grant select,insert,update,delete on table public.%I to authenticated',t);
  end loop;
end $$;

-- políticas explícitas por operação
do $$
declare t text;
begin
  foreach t in array array['v2_wash_settings','v2_wash_customers','v2_wash_customer_vehicles','v2_wash_service_catalog','v2_wash_products','v2_wash_orders','v2_wash_order_products','v2_wash_findings'] loop
    execute format('drop policy if exists %I on public.%I','wash_select_'||t,t);
    execute format('drop policy if exists %I on public.%I','wash_insert_'||t,t);
    execute format('drop policy if exists %I on public.%I','wash_update_'||t,t);
    execute format('drop policy if exists %I on public.%I','wash_delete_'||t,t);
    execute format('create policy %I on public.%I for select to authenticated using (public.v2_has_permission(company_id,''wash.view'') or public.v2_has_permission(company_id,''wash.manage''))','wash_select_'||t,t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.v2_has_permission(company_id,''wash.manage''))','wash_insert_'||t,t);
    execute format('create policy %I on public.%I for update to authenticated using (public.v2_has_permission(company_id,''wash.manage'')) with check (public.v2_has_permission(company_id,''wash.manage''))','wash_update_'||t,t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.v2_has_permission(company_id,''wash.manage''))','wash_delete_'||t,t);
  end loop;
end $$;

revoke all on function public.v2_wash_send_finding_to_workshop(uuid) from public,anon;
grant execute on function public.v2_wash_send_finding_to_workshop(uuid) to authenticated;

commit;
