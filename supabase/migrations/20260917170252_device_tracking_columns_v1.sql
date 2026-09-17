alter table public.v2_device_access
  add column if not exists control_state text not null default 'active',
  add column if not exists control_message text,
  add column if not exists lost_mode boolean not null default false;
