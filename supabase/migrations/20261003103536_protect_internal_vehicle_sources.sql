-- Internal vehicle source records already have no direct client grants.
-- Add RLS without changing the established RPC access path.
alter table public.v2_vehicle_technical_sources enable row level security;
create policy v2_vehicle_technical_sources_internal_deny
on public.v2_vehicle_technical_sources
for all to anon,authenticated
using (false)
with check (false);
