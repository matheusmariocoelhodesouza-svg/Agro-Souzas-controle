create or replace function public.v2_sync_trailer_from_tracking_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.vehicle_id is null or new.company_id is null or new.odometer_km is null then
    return new;
  end if;

  update public.v2_trailer_hitches h
     set distance_km=greatest(new.odometer_km-coalesce(h.tow_odometer_start_km,0),0),
         updated_at=now()
   where h.company_id=new.company_id
     and h.tow_vehicle_id=new.vehicle_id
     and h.unhitched_at is null;

  update public.v2_vehicles trailer
     set current_odometer_km=coalesce(h.trailer_odometer_start_km,0)+greatest(new.odometer_km-coalesce(h.tow_odometer_start_km,0),0),
         updated_at=now()
    from public.v2_trailer_hitches h
   where h.company_id=new.company_id
     and h.tow_vehicle_id=new.vehicle_id
     and h.unhitched_at is null
     and trailer.company_id=h.company_id
     and trailer.id=h.trailer_vehicle_id;

  return new;
end
$$;

revoke all on function public.v2_sync_trailer_from_tracking_trigger() from public, anon, authenticated;

drop trigger if exists trg_v2_sync_trailer_from_tracking on public.v2_vehicle_tracking_current;
create trigger trg_v2_sync_trailer_from_tracking
after insert or update of odometer_km on public.v2_vehicle_tracking_current
for each row
when (new.odometer_km is not null)
execute function public.v2_sync_trailer_from_tracking_trigger();
