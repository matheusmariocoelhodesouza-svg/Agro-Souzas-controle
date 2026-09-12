create table if not exists public.v2_team_messages (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.v2_companies(id) on delete cascade,
  team_id uuid not null references public.v2_teams(id) on delete cascade,
  sender_kind text not null check (sender_kind in ('admin','team')),
  sender_user_id uuid not null,
  sender_name text,
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  client_message_id text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint v2_team_messages_company_client_uid unique(company_id, client_message_id)
);

create index if not exists v2_team_messages_company_team_created_idx
  on public.v2_team_messages(company_id, team_id, created_at desc);

alter table public.v2_team_messages enable row level security;

drop policy if exists v2_team_messages_select on public.v2_team_messages;
create policy v2_team_messages_select on public.v2_team_messages
for select to authenticated
using (
  public.v2_has_permission(company_id,'poultry.manage')
  or (
    private.v2_is_device_session()
    and team_id = private.v2_device_team_id(company_id)
  )
);

drop policy if exists v2_team_messages_insert on public.v2_team_messages;
create policy v2_team_messages_insert on public.v2_team_messages
for insert to authenticated
with check (
  sender_user_id = auth.uid()
  and (
    (sender_kind='admin' and public.v2_has_permission(company_id,'poultry.manage'))
    or (
      sender_kind='team'
      and private.v2_is_device_session()
      and team_id = private.v2_device_team_id(company_id)
    )
  )
);

grant select, insert on public.v2_team_messages to authenticated;

create table if not exists public.v2_team_chat_settings (
  company_id uuid primary key references public.v2_companies(id) on delete cascade,
  emergency_phone text,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.v2_team_chat_settings enable row level security;

drop policy if exists v2_team_chat_settings_select on public.v2_team_chat_settings;
create policy v2_team_chat_settings_select on public.v2_team_chat_settings
for select to authenticated
using (
  public.v2_has_permission(company_id,'poultry.manage')
  or (
    private.v2_is_device_session()
    and private.v2_device_team_id(company_id) is not null
  )
);

drop policy if exists v2_team_chat_settings_insert on public.v2_team_chat_settings;
create policy v2_team_chat_settings_insert on public.v2_team_chat_settings
for insert to authenticated
with check (public.v2_has_permission(company_id,'poultry.manage'));

drop policy if exists v2_team_chat_settings_update on public.v2_team_chat_settings;
create policy v2_team_chat_settings_update on public.v2_team_chat_settings
for update to authenticated
using (public.v2_has_permission(company_id,'poultry.manage'))
with check (public.v2_has_permission(company_id,'poultry.manage'));

grant select, insert, update on public.v2_team_chat_settings to authenticated;