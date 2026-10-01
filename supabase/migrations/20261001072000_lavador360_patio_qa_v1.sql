-- Lavador 360: patio operacional, check-in e controle de qualidade
begin;

alter table public.v2_wash_orders
  add column if not exists operation_stage text not null default 'waiting',
  add column if not exists odometer_km numeric(12,1),
  add column if not exists fuel_level text,
  add column if not exists checkin_notes text,
  add column if not exists qa_status text,
  add column if not exists qa_notes text,
  add column if not exists qa_checked_at timestamptz;

do $$ begin
  alter table public.v2_wash_orders add constraint v2_wash_orders_operation_stage_chk
    check(operation_stage in ('waiting','prewash','washing','finishing','inspection','ready','delivered'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.v2_wash_orders add constraint v2_wash_orders_fuel_level_chk
    check(fuel_level is null or fuel_level in ('reserve','quarter','half','three_quarters','full'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.v2_wash_orders add constraint v2_wash_orders_qa_status_chk
    check(qa_status is null or qa_status in ('pending','approved','rework'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.v2_wash_orders add constraint v2_wash_orders_odometer_chk
    check(odometer_km is null or odometer_km>=0);
exception when duplicate_object then null; end $$;

create index if not exists v2_wash_orders_patio_idx
on public.v2_wash_orders(company_id,operation_stage,created_at desc);

commit;
