create schema if not exists private;

create table if not exists public.v2_platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner','admin','support','billing')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.v2_platform_admins enable row level security;
revoke all on table public.v2_platform_admins from anon;
grant select on table public.v2_platform_admins to authenticated;
grant select,insert,update,delete on table public.v2_platform_admins to service_role;
drop policy if exists c360_platform_admin_self_select on public.v2_platform_admins;
create policy c360_platform_admin_self_select on public.v2_platform_admins for select to authenticated using (user_id=(select auth.uid()) and active=true);

insert into public.v2_platform_admins(user_id,role,active)
select distinct m.user_id,'owner',true from public.v2_company_members m join public.v2_roles r on r.id=m.role_id join public.v2_subscriptions s on s.company_id=m.company_id where m.status='active' and r.code='owner' and s.plan_code='client_zero'
on conflict(user_id) do update set active=true,role='owner',updated_at=now();

create or replace function private.c360_is_platform_admin() returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from public.v2_platform_admins a where a.user_id=(select auth.uid()) and a.active=true);
$$;
revoke all on function private.c360_is_platform_admin() from public,anon;
grant execute on function private.c360_is_platform_admin() to authenticated,service_role;

create table if not exists public.v2_billing_accounts (
 company_id uuid primary key references public.v2_companies(id) on delete cascade,
 provider text not null default 'unconfigured', provider_customer_ref text, provider_subscription_ref text, billing_email text,
 status text not null default 'not_configured' check(status in ('not_configured','ready','active','past_due','suspended','cancelled')),
 cancel_at_period_end boolean not null default false, next_billing_at timestamptz, last_payment_at timestamptz, grace_until timestamptz,
 metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.v2_billing_accounts enable row level security;
revoke all on table public.v2_billing_accounts from anon;
grant select,insert,update on table public.v2_billing_accounts to authenticated;
grant select,insert,update,delete on table public.v2_billing_accounts to service_role;
create policy c360_billing_accounts_select on public.v2_billing_accounts for select to authenticated using(v2_is_company_member(company_id) or (select private.c360_is_platform_admin()));
create policy c360_billing_accounts_platform_insert on public.v2_billing_accounts for insert to authenticated with check((select private.c360_is_platform_admin()));
create policy c360_billing_accounts_platform_update on public.v2_billing_accounts for update to authenticated using((select private.c360_is_platform_admin())) with check((select private.c360_is_platform_admin()));
insert into public.v2_billing_accounts(company_id,status,provider)
select c.id,case when s.status='active' then 'active' when s.status='past_due' then 'past_due' when s.status in ('cancelled','suspended') then s.status else 'not_configured' end,'unconfigured' from public.v2_companies c left join public.v2_subscriptions s on s.company_id=c.id on conflict(company_id) do nothing;

create table if not exists public.v2_subscription_events (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.v2_companies(id) on delete cascade,
 event_type text not null, source text not null default 'platform_admin', old_plan_code text,new_plan_code text,old_status text,new_status text,
 effective_at timestamptz not null default now(), actor_user_id uuid references auth.users(id) on delete set null default auth.uid(), metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
alter table public.v2_subscription_events enable row level security;
revoke all on table public.v2_subscription_events from anon;
grant select,insert on table public.v2_subscription_events to authenticated;
grant select,insert,update,delete on table public.v2_subscription_events to service_role;
create index if not exists v2_subscription_events_company_time_idx on public.v2_subscription_events(company_id,created_at desc);
create policy c360_subscription_events_select on public.v2_subscription_events for select to authenticated using(v2_is_company_member(company_id) or (select private.c360_is_platform_admin()));
create policy c360_subscription_events_platform_insert on public.v2_subscription_events for insert to authenticated with check((select private.c360_is_platform_admin()) and actor_user_id=(select auth.uid()));

create table if not exists public.v2_legal_documents (
 document_code text not null,version text not null,title text not null,category text not null default 'legal',effective_at timestamptz not null default now(),document_url text not null,requires_acceptance boolean not null default true,active boolean not null default true,created_at timestamptz not null default now(),primary key(document_code,version)
);
alter table public.v2_legal_documents enable row level security;
revoke all on table public.v2_legal_documents from anon;
grant select on table public.v2_legal_documents to authenticated;
grant select,insert,update,delete on table public.v2_legal_documents to service_role;
create policy c360_legal_documents_select on public.v2_legal_documents for select to authenticated using(active=true);
insert into public.v2_legal_documents(document_code,version,title,category,effective_at,document_url,requires_acceptance,active) values
('terms','2026-09-13.1','Termos de Uso do Comando 360','terms','2026-09-13 00:00:00-03','/legal.html#terms',true,true),
('privacy','2026-09-13.1','Política de Privacidade do Comando 360','privacy','2026-09-13 00:00:00-03','/legal.html#privacy',true,true),
('biometrics','2026-09-13.1','Aviso de Privacidade — Biometria e Reconhecimento Facial','privacy','2026-09-13 00:00:00-03','/legal.html#biometrics',false,true)
on conflict(document_code,version) do update set title=excluded.title,category=excluded.category,effective_at=excluded.effective_at,document_url=excluded.document_url,requires_acceptance=excluded.requires_acceptance,active=excluded.active;

create table if not exists public.v2_legal_acceptances (
 id uuid primary key default gen_random_uuid(),company_id uuid not null references public.v2_companies(id) on delete cascade,user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),document_code text not null,document_version text not null,accepted_at timestamptz not null default now(),acceptance_source text not null default 'web_admin',context jsonb not null default '{}'::jsonb,created_at timestamptz not null default now(),unique(company_id,user_id,document_code,document_version),foreign key(document_code,document_version) references public.v2_legal_documents(document_code,version)
);
alter table public.v2_legal_acceptances enable row level security;
revoke all on table public.v2_legal_acceptances from anon;
grant select,insert on table public.v2_legal_acceptances to authenticated;
grant select,insert,update,delete on table public.v2_legal_acceptances to service_role;
create index if not exists v2_legal_acceptances_company_user_idx on public.v2_legal_acceptances(company_id,user_id,accepted_at desc);
create policy c360_legal_acceptances_select on public.v2_legal_acceptances for select to authenticated using((user_id=(select auth.uid()) and v2_is_company_member(company_id)) or (select private.c360_is_platform_admin()));
create policy c360_legal_acceptances_insert on public.v2_legal_acceptances for insert to authenticated with check(user_id=(select auth.uid()) and v2_is_company_member(company_id));

create table if not exists public.v2_platform_incidents (
 id uuid primary key default gen_random_uuid(),company_id uuid not null references public.v2_companies(id) on delete cascade,fingerprint text not null,severity text not null default 'error' check(severity in ('warning','error','critical')),status text not null default 'open' check(status in ('open','investigating','resolved','ignored')),title text not null,last_message text,last_route text,first_seen_at timestamptz not null default now(),last_seen_at timestamptz not null default now(),occurrence_count integer not null default 1 check(occurrence_count>0),resolved_at timestamptz,resolved_by uuid references auth.users(id) on delete set null,metadata jsonb not null default '{}'::jsonb,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(company_id,fingerprint)
);
alter table public.v2_platform_incidents enable row level security;
revoke all on table public.v2_platform_incidents from anon;
grant select,update on table public.v2_platform_incidents to authenticated;
grant select,insert,update,delete on table public.v2_platform_incidents to service_role;
create index if not exists v2_platform_incidents_status_seen_idx on public.v2_platform_incidents(status,severity,last_seen_at desc);
create index if not exists v2_platform_incidents_company_seen_idx on public.v2_platform_incidents(company_id,last_seen_at desc);
create policy c360_platform_incidents_select on public.v2_platform_incidents for select to authenticated using((select private.c360_is_platform_admin()));
create policy c360_platform_incidents_update on public.v2_platform_incidents for update to authenticated using((select private.c360_is_platform_admin())) with check((select private.c360_is_platform_admin()));

create or replace function private.c360_health_to_incident() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare fp text;sev text;
begin
 sev:=case when new.severity in ('critical','error','warning') then new.severity else 'error' end;if sev not in ('error','critical') then return new;end if;
 fp:=coalesce(nullif(new.fingerprint,''),md5(coalesce(new.kind,'')||'|'||coalesce(new.message,'')||'|'||coalesce(new.route,'')));
 insert into public.v2_platform_incidents(company_id,fingerprint,severity,status,title,last_message,last_route,first_seen_at,last_seen_at,occurrence_count,metadata)
 values(new.company_id,fp,sev,'open',left(coalesce(nullif(new.message,''),new.kind,'Erro no aplicativo'),180),left(new.message,1000),left(new.route,300),coalesce(new.reported_at,new.created_at,now()),coalesce(new.reported_at,new.created_at,now()),1,jsonb_build_object('kind',new.kind,'app_version',new.app_version,'recovery_version',new.recovery_version,'mode',new.mode))
 on conflict(company_id,fingerprint) do update set severity=case when excluded.severity='critical' then 'critical' else public.v2_platform_incidents.severity end,status='open',title=excluded.title,last_message=excluded.last_message,last_route=excluded.last_route,last_seen_at=greatest(public.v2_platform_incidents.last_seen_at,excluded.last_seen_at),occurrence_count=public.v2_platform_incidents.occurrence_count+1,resolved_at=null,resolved_by=null,metadata=public.v2_platform_incidents.metadata||excluded.metadata,updated_at=now();return new;
end;$$;
revoke all on function private.c360_health_to_incident() from public,anon,authenticated;grant execute on function private.c360_health_to_incident() to service_role;
drop trigger if exists c360_health_to_incident on public.v2_client_health_events;create trigger c360_health_to_incident after insert on public.v2_client_health_events for each row execute function private.c360_health_to_incident();
create index if not exists v2_client_health_events_severity_time_idx on public.v2_client_health_events(company_id,severity,created_at desc);

drop policy if exists v2_companies_member_select on public.v2_companies;create policy v2_companies_member_select on public.v2_companies for select to authenticated using(v2_is_company_member(id) or (select private.c360_is_platform_admin()));
drop policy if exists v2_subscriptions_member_select on public.v2_subscriptions;create policy v2_subscriptions_member_select on public.v2_subscriptions for select to authenticated using(v2_is_company_member(company_id) or (select private.c360_is_platform_admin()));
grant update on table public.v2_subscriptions to authenticated;create policy c360_subscriptions_platform_update on public.v2_subscriptions for update to authenticated using((select private.c360_is_platform_admin())) with check((select private.c360_is_platform_admin()));
drop policy if exists v2_client_health_events_select on public.v2_client_health_events;create policy v2_client_health_events_select on public.v2_client_health_events for select to authenticated using(v2_has_permission(company_id,'settings.manage'::text) or v2_has_permission(company_id,'teams.manage'::text) or (select private.c360_is_platform_admin()));
drop policy if exists v2_client_health_events_insert on public.v2_client_health_events;create policy v2_client_health_events_insert on public.v2_client_health_events for insert to authenticated with check(user_id=(select auth.uid()) and (v2_is_company_member(company_id) or (private.v2_is_device_session() and (team_id is null or team_id=private.v2_device_team_id(company_id)))));
