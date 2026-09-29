begin;
create sequence if not exists public.v2_wash_number_seq;
alter table public.v2_wash_orders alter column wash_number set default nextval('public.v2_wash_number_seq');
grant usage,select on sequence public.v2_wash_number_seq to authenticated;
revoke all on sequence public.v2_wash_number_seq from anon;
commit;
