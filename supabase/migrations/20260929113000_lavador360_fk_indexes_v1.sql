begin;

create index if not exists v2_wash_customer_vehicles_customer_fk_idx on public.v2_wash_customer_vehicles(customer_id);
create index if not exists v2_wash_customers_created_by_fk_idx on public.v2_wash_customers(created_by);

create index if not exists v2_wash_order_products_order_fk_idx on public.v2_wash_order_products(wash_order_id);
create index if not exists v2_wash_order_products_product_fk_idx on public.v2_wash_order_products(product_id);

create index if not exists v2_wash_orders_customer_fk_idx on public.v2_wash_orders(customer_id);
create index if not exists v2_wash_orders_vehicle_fk_idx on public.v2_wash_orders(vehicle_id);
create index if not exists v2_wash_orders_customer_vehicle_fk_idx on public.v2_wash_orders(customer_vehicle_id);
create index if not exists v2_wash_orders_created_by_fk_idx on public.v2_wash_orders(created_by);

create index if not exists v2_wash_findings_order_fk_idx on public.v2_wash_findings(wash_order_id);
create index if not exists v2_wash_findings_vehicle_fk_idx on public.v2_wash_findings(vehicle_id);
create index if not exists v2_wash_findings_workshop_order_fk_idx on public.v2_wash_findings(workshop_order_id);
create index if not exists v2_wash_findings_created_by_fk_idx on public.v2_wash_findings(created_by);

commit;
