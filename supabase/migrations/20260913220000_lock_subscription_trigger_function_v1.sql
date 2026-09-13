revoke all on function public.v2_seed_self_service_subscription() from public, anon, authenticated;

comment on function public.v2_seed_self_service_subscription()
is 'Trigger interno do onboarding self-service. Não é uma RPC pública e não deve ser executado diretamente por clientes.';
