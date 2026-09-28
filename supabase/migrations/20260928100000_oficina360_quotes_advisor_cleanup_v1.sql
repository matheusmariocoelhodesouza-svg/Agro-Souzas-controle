-- Oficina 360 — limpeza dos advisors do módulo de Orçamentos

-- Evita políticas permissivas sobrepostas no SELECT: leitura por membro,
-- escrita separada por permissão workshop.manage.
drop policy if exists v2_workshop_customers_write_perm on public.v2_workshop_customers;
create policy v2_workshop_customers_insert_perm on public.v2_workshop_customers
  for insert to authenticated with check (public.v2_has_permission(company_id,'workshop.manage'::text));
create policy v2_workshop_customers_update_perm on public.v2_workshop_customers
  for update to authenticated using (public.v2_has_permission(company_id,'workshop.manage'::text))
  with check (public.v2_has_permission(company_id,'workshop.manage'::text));
create policy v2_workshop_customers_delete_perm on public.v2_workshop_customers
  for delete to authenticated using (public.v2_has_permission(company_id,'workshop.manage'::text));

drop policy if exists v2_quotes_write_perm on public.v2_quotes;
create policy v2_quotes_insert_perm on public.v2_quotes
  for insert to authenticated with check (public.v2_has_permission(company_id,'workshop.manage'::text));
create policy v2_quotes_update_perm on public.v2_quotes
  for update to authenticated using (public.v2_has_permission(company_id,'workshop.manage'::text))
  with check (public.v2_has_permission(company_id,'workshop.manage'::text));
create policy v2_quotes_delete_perm on public.v2_quotes
  for delete to authenticated using (public.v2_has_permission(company_id,'workshop.manage'::text));

drop policy if exists v2_quote_items_write_perm on public.v2_quote_items;
create policy v2_quote_items_insert_perm on public.v2_quote_items
  for insert to authenticated with check (public.v2_has_permission(company_id,'workshop.manage'::text));
create policy v2_quote_items_update_perm on public.v2_quote_items
  for update to authenticated using (public.v2_has_permission(company_id,'workshop.manage'::text))
  with check (public.v2_has_permission(company_id,'workshop.manage'::text));
create policy v2_quote_items_delete_perm on public.v2_quote_items
  for delete to authenticated using (public.v2_has_permission(company_id,'workshop.manage'::text));

-- Índices de FKs e caminhos mais usados pelo módulo.
create index if not exists v2_workshop_customers_created_by_idx on public.v2_workshop_customers(created_by);

create index if not exists v2_quotes_created_by_idx on public.v2_quotes(created_by);
create index if not exists v2_quotes_customer_company_idx on public.v2_quotes(customer_id,company_id) where customer_id is not null;
create index if not exists v2_quotes_vehicle_idx on public.v2_quotes(vehicle_id) where vehicle_id is not null;
create index if not exists v2_quotes_work_order_idx on public.v2_quotes(work_order_id) where work_order_id is not null;

create index if not exists v2_quote_items_company_quote_idx on public.v2_quote_items(company_id,quote_id);
create index if not exists v2_quote_items_quote_company_idx on public.v2_quote_items(quote_id,company_id);

create index if not exists v2_quote_events_company_quote_idx on public.v2_quote_events(company_id,quote_id);
create index if not exists v2_quote_events_quote_company_idx on public.v2_quote_events(quote_id,company_id);
create index if not exists v2_quote_events_actor_idx on public.v2_quote_events(actor_user_id) where actor_user_id is not null;
