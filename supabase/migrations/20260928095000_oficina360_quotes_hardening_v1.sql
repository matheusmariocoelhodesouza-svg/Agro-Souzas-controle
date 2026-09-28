-- Oficina 360 — hardening de Orçamentos v1

alter table public.v2_quotes
  drop constraint if exists v2_quotes_customer_company_fkey;

alter table public.v2_quotes
  add constraint v2_quotes_customer_company_fkey
  foreign key (customer_id,company_id)
  references public.v2_workshop_customers(id,company_id)
  on delete set null (customer_id);

create or replace function private.v2_quote_lock_converted()
returns trigger
language plpgsql
set search_path=public,pg_temp
as $$
begin
  if tg_op='DELETE' then
    if old.status='converted' then
      raise exception 'Orçamento convertido em OS não pode ser excluído';
    end if;
    return old;
  end if;

  if old.status='converted' then
    raise exception 'Orçamento convertido em OS não pode ser alterado';
  end if;
  return new;
end;
$$;

revoke all on function private.v2_quote_lock_converted() from public,anon;

drop trigger if exists trg_v2_quotes_00_lock_converted on public.v2_quotes;
create trigger trg_v2_quotes_00_lock_converted
before update or delete on public.v2_quotes
for each row execute function private.v2_quote_lock_converted();
