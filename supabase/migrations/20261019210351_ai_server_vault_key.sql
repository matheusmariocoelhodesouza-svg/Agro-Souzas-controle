-- Server-only lookup of one encrypted Vault entry. No credentials belong in SQL.
-- Native OPENAI_API_KEY remains the preferred configuration when present.
create or replace function public.v2_ai_server_key()
returns text
language sql
stable
security invoker
set search_path = ''
as $$
  select s.decrypted_secret
  from vault.decrypted_secrets as s
  where s.name = 'comando360_openai_api_key'
  limit 1
$$;

revoke all on function public.v2_ai_server_key() from public, anon, authenticated;
grant execute on function public.v2_ai_server_key() to service_role;

comment on function public.v2_ai_server_key() is
  'Server-only OpenAI credential lookup. Never grant to anon or authenticated; callers must check the user and company permission before using the server client.';
