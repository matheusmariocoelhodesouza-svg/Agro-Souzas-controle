create table if not exists public.v2_trailer_hitches (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.v2_companies(id) on delete cascade,
  trailer_vehicle_id uuid not null references public.v2_vehicles(id) on delete cascade,
  tow_vehicle_id uuid not null references public.v2_vehicles(id) on delete restrict,
  hitched_at timestamptz not null default now(),
  unhitched_at timestamptz,
  tow_odometer_start_km numeric(14,1) not null default 0,
  tow_odometer_end_km numeric(14,1),
  trailer_odometer_start_km numeric(14,1) not null default 0,
  distance_km numeric(14,1) not null default 0,
  notes text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint v2_trailer_hitches_distinct_vehicles check (trailer_vehicle_id <> tow_vehicle_id),
  constraint v2_trailer_hitches_time_order check (unhitched_at is null or unhitched_at >= hitched_at)
);

create unique index if not exists v2_trailer_hitches_one_active_per_trailer on public.v2_trailer_hitches(trailer_vehicle_id) where unhitched_at is null;
create unique index if not exists v2_trailer_hitches_one_active_per_tow on public.v2_trailer_hitches(tow_vehicle_id) where unhitched_at is null;
create index if not exists v2_trailer_hitches_company_date_idx on public.v2_trailer_hitches(company_id, hitched_at desc);
create index if not exists v2_trailer_hitches_company_trailer_idx on public.v2_trailer_hitches(company_id, trailer_vehicle_id, hitched_at desc);
create index if not exists v2_trailer_hitches_company_tow_idx on public.v2_trailer_hitches(company_id, tow_vehicle_id, hitched_at desc);

alter table public.v2_trailer_hitches enable row level security;
drop policy if exists v2_trailer_hitches_member_select on public.v2_trailer_hitches;
create policy v2_trailer_hitches_member_select on public.v2_trailer_hitches for select to authenticated using (public.v2_is_company_member(company_id));
drop policy if exists v2_trailer_hitches_manage on public.v2_trailer_hitches;
create policy v2_trailer_hitches_manage on public.v2_trailer_hitches for all to authenticated using (public.v2_has_permission(company_id, 'fleet.manage')) with check (public.v2_has_permission(company_id, 'fleet.manage'));
revoke all on public.v2_trailer_hitches from anon;
grant select, insert, update, delete on public.v2_trailer_hitches to authenticated;

create or replace function public.v2_effective_vehicle_odometer(p_company_id uuid, p_vehicle_id uuid)
returns numeric language sql stable security definer set search_path = public as $$
  select coalesce(t.odometer_km, v.current_odometer_km, 0)::numeric
  from public.v2_vehicles v
  left join public.v2_vehicle_tracking_current t on t.company_id=v.company_id and t.vehicle_id=v.id
  where v.company_id=p_company_id and v.id=p_vehicle_id
  limit 1
$$;
revoke all on function public.v2_effective_vehicle_odometer(uuid,uuid) from public, anon, authenticated;

create or replace function public.v2_close_trailer_hitch_row(p_hitch_id uuid, p_at timestamptz default now())
returns numeric language plpgsql security definer set search_path = public as $$
declare h public.v2_trailer_hitches%rowtype; end_km numeric; delta_km numeric; trailer_end_km numeric;
begin
  select * into h from public.v2_trailer_hitches where id=p_hitch_id and unhitched_at is null for update;
  if not found then return 0; end if;
  end_km := coalesce(public.v2_effective_vehicle_odometer(h.company_id,h.tow_vehicle_id),h.tow_odometer_start_km);
  delta_km := greatest(coalesce(end_km,0)-coalesce(h.tow_odometer_start_km,0),0);
  trailer_end_km := coalesce(h.trailer_odometer_start_km,0)+delta_km;
  update public.v2_trailer_hitches set unhitched_at=p_at,tow_odometer_end_km=end_km,distance_km=delta_km,updated_at=now() where id=h.id;
  update public.v2_vehicles set current_odometer_km=trailer_end_km,updated_at=now() where company_id=h.company_id and id=h.trailer_vehicle_id;
  return delta_km;
end $$;
revoke all on function public.v2_close_trailer_hitch_row(uuid,timestamptz) from public, anon, authenticated;

create or replace function public.v2_hitch_trailer(p_company_id uuid,p_trailer_vehicle_id uuid,p_tow_vehicle_id uuid,p_notes text default null,p_at timestamptz default now())
returns uuid language plpgsql security definer set search_path = public as $$
declare r record; new_id uuid; tow_start numeric; trailer_start numeric; existing_id uuid;
begin
  if auth.uid() is null or not public.v2_has_permission(p_company_id,'fleet.manage') then raise exception 'Sem permissão para gerenciar engates da frota'; end if;
  if p_trailer_vehicle_id=p_tow_vehicle_id then raise exception 'A carretinha e a condução precisam ser veículos diferentes'; end if;
  if not exists(select 1 from public.v2_vehicles where company_id=p_company_id and id=p_trailer_vehicle_id) then raise exception 'Carretinha não encontrada nesta empresa'; end if;
  if not exists(select 1 from public.v2_vehicles where company_id=p_company_id and id=p_tow_vehicle_id) then raise exception 'Condução não encontrada nesta empresa'; end if;
  select id into existing_id from public.v2_trailer_hitches where company_id=p_company_id and trailer_vehicle_id=p_trailer_vehicle_id and tow_vehicle_id=p_tow_vehicle_id and unhitched_at is null limit 1;
  if existing_id is not null then return existing_id; end if;
  for r in select id from public.v2_trailer_hitches where company_id=p_company_id and unhitched_at is null and (trailer_vehicle_id=p_trailer_vehicle_id or tow_vehicle_id=p_tow_vehicle_id) order by hitched_at for update loop
    perform public.v2_close_trailer_hitch_row(r.id,p_at);
  end loop;
  tow_start := coalesce(public.v2_effective_vehicle_odometer(p_company_id,p_tow_vehicle_id),0);
  select coalesce(current_odometer_km,0) into trailer_start from public.v2_vehicles where company_id=p_company_id and id=p_trailer_vehicle_id for update;
  insert into public.v2_trailer_hitches(company_id,trailer_vehicle_id,tow_vehicle_id,hitched_at,tow_odometer_start_km,trailer_odometer_start_km,notes,created_by)
  values(p_company_id,p_trailer_vehicle_id,p_tow_vehicle_id,p_at,tow_start,coalesce(trailer_start,0),nullif(trim(coalesce(p_notes,'')),''),auth.uid()) returning id into new_id;
  return new_id;
end $$;

create or replace function public.v2_unhitch_trailer(p_company_id uuid,p_trailer_vehicle_id uuid,p_at timestamptz default now())
returns numeric language plpgsql security definer set search_path = public as $$
declare hitch_id uuid;
begin
  if auth.uid() is null or not public.v2_has_permission(p_company_id,'fleet.manage') then raise exception 'Sem permissão para gerenciar engates da frota'; end if;
  select id into hitch_id from public.v2_trailer_hitches where company_id=p_company_id and trailer_vehicle_id=p_trailer_vehicle_id and unhitched_at is null limit 1 for update;
  if hitch_id is null then return 0; end if;
  return public.v2_close_trailer_hitch_row(hitch_id,p_at);
end $$;

create or replace function public.v2_sync_active_trailer_odometer(p_company_id uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare r record; end_km numeric; delta_km numeric; n integer := 0;
begin
  if auth.uid() is null or not public.v2_has_permission(p_company_id,'fleet.manage') then raise exception 'Sem permissão para sincronizar KM das carretinhas'; end if;
  for r in select * from public.v2_trailer_hitches where company_id=p_company_id and unhitched_at is null loop
    end_km := coalesce(public.v2_effective_vehicle_odometer(p_company_id,r.tow_vehicle_id),r.tow_odometer_start_km);
    delta_km := greatest(coalesce(end_km,0)-coalesce(r.tow_odometer_start_km,0),0);
    update public.v2_vehicles set current_odometer_km=coalesce(r.trailer_odometer_start_km,0)+delta_km,updated_at=now() where company_id=p_company_id and id=r.trailer_vehicle_id;
    update public.v2_trailer_hitches set distance_km=delta_km,updated_at=now() where id=r.id;
    n := n+1;
  end loop;
  return n;
end $$;

revoke all on function public.v2_hitch_trailer(uuid,uuid,uuid,text,timestamptz) from public, anon;
revoke all on function public.v2_unhitch_trailer(uuid,uuid,timestamptz) from public, anon;
revoke all on function public.v2_sync_active_trailer_odometer(uuid) from public, anon;
grant execute on function public.v2_hitch_trailer(uuid,uuid,uuid,text,timestamptz) to authenticated;
grant execute on function public.v2_unhitch_trailer(uuid,uuid,timestamptz) to authenticated;
grant execute on function public.v2_sync_active_trailer_odometer(uuid) to authenticated;
