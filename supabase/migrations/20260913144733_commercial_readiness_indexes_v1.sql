create index if not exists v2_legal_acceptances_document_idx on public.v2_legal_acceptances(document_code,document_version);
create index if not exists v2_legal_acceptances_user_idx on public.v2_legal_acceptances(user_id);
create index if not exists v2_platform_incidents_resolved_by_idx on public.v2_platform_incidents(resolved_by) where resolved_by is not null;
create index if not exists v2_subscription_events_actor_idx on public.v2_subscription_events(actor_user_id) where actor_user_id is not null;
