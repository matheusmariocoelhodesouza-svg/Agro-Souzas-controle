-- Oficina 360: sincronização automática da frota do Comando 360.
-- O CRLV permanece no Comando; a ficha técnica é criada/atualizada no mesmo banco.
-- Compatibilidade não é inferida somente por marca/modelo/ano: links são gerados pelas regras técnicas já cadastradas.

alter table public.v2_vehicle_technical_profiles
  add column if not exists identity_status text not null default 'partial',
  add column if not exists catalog_status text not null default 'pending_identity',
  add column if not exists synced_from_vehicle_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname='v2_vehicle_technical_profiles_identity_status_chk') then
    alter table public.v2_vehicle_technical_profiles
      add constraint v2_vehicle_technical_profiles_identity_status_chk
      check (identity_status in ('partial','vin_received','exact'));
  end if;
  if not exists (select 1 from pg_constraint where conname='v2_vehicle_technical_profiles_catalog_status_chk') then
    alter table public.v2_vehicle_technical_profiles
      add constraint v2_vehicle_technical_profiles_catalog_status_chk
      check (catalog_status in ('pending_identity','matching','ready','needs_review'));
  end if;
end $$;

create index if not exists idx_v2_vehicle_technical_profiles_catalog_status
  on public.v2_vehicle_technical_profiles(company_id,catalog_status);

create or replace function public.v2_refresh_vehicle_component_links(p_vehicle_id uuid)
returns void
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  p public.v2_vehicle_technical_profiles%rowtype;
  matched_count integer:=0;
begin
  select * into p from public.v2_vehicle_technical_profiles where vehicle_id=p_vehicle_id limit 1;
  if p.id is null then return; end if;

  insert into public.v2_vehicle_component_links(company_id,vehicle_id,component_id,fitment_status,notes)
  select p.company_id,p.vehicle_id,a.component_id,a.fitment_status,
    case when a.fitment_status='verified'
      then 'Vinculado automaticamente pelo Oficina 360 a partir de aplicação técnica validada.'
      else 'Vinculado automaticamente pelo Oficina 360 como aplicação candidata; confirmar antes da compra.'
    end
  from public.v2_vehicle_component_applications a
  where (a.chassis_family is null or (p.chassis_family is not null and lower(a.chassis_family)=lower(p.chassis_family)))
    and (a.chassis_variant is null or (p.chassis_variant is not null and lower(a.chassis_variant)=lower(p.chassis_variant)))
    and (a.engine_family is null or (p.engine_family is not null and lower(a.engine_family)=lower(p.engine_family)))
    and (a.engine_code is null or (p.engine_code is not null and lower(a.engine_code)=lower(p.engine_code)))
    and (a.model_year_from is null or (p.model_year is not null and p.model_year>=a.model_year_from))
    and (a.model_year_to is null or (p.model_year is not null and p.model_year<=a.model_year_to))
  on conflict (company_id,vehicle_id,component_id) do update
    set fitment_status=case
      when public.v2_vehicle_component_links.fitment_status='verified' then 'verified'
      when excluded.fitment_status='verified' then 'verified'
      else public.v2_vehicle_component_links.fitment_status end,
      updated_at=now();

  select count(*) into matched_count from public.v2_vehicle_component_links
  where company_id=p.company_id and vehicle_id=p.vehicle_id;

  update public.v2_vehicle_technical_profiles
  set identity_status=case
      when nullif(trim(vin),'') is not null and nullif(trim(chassis_variant),'') is not null and nullif(trim(engine_code),'') is not null then 'exact'
      when nullif(trim(vin),'') is not null then 'vin_received'
      else 'partial' end,
      catalog_status=case
      when nullif(trim(vin),'') is not null and nullif(trim(chassis_variant),'') is not null and nullif(trim(engine_code),'') is not null and matched_count>0 then 'ready'
      when nullif(trim(vin),'') is not null and nullif(trim(chassis_variant),'') is not null and nullif(trim(engine_code),'') is not null then 'needs_review'
      when nullif(trim(vin),'') is not null then 'matching'
      else 'pending_identity' end,
      updated_at=now()
  where id=p.id;
end;
$$;

revoke all on function public.v2_refresh_vehicle_component_links(uuid) from public;

create or replace function public.v2_vehicle_profile_autolink_trigger()
returns trigger
language plpgsql
security definer
set search_path=public,pg_temp
as $$
begin
  perform public.v2_refresh_vehicle_component_links(new.vehicle_id);
  return new;
end;
$$;

revoke all on function public.v2_vehicle_profile_autolink_trigger() from public;

drop trigger if exists trg_v2_vehicle_profile_autolink on public.v2_vehicle_technical_profiles;
create trigger trg_v2_vehicle_profile_autolink
after insert or update of vin,chassis_family,chassis_variant,engine_family,engine_code,model_year
on public.v2_vehicle_technical_profiles
for each row execute function public.v2_vehicle_profile_autolink_trigger();

create or replace function public.v2_sync_vehicle_to_oficina_profile_trigger()
returns trigger
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  crlv jsonb:=coalesce(new.metadata->'crlv','{}'::jsonb);
  crlv_vin text:=nullif(trim(coalesce(new.metadata #>> '{crlv,chassis}','')),'');
  crlv_fuel text:=nullif(trim(coalesce(new.metadata #>> '{crlv,fuel}','')),'');
  crlv_year integer:=null;
begin
  if coalesce(new.metadata #>> '{crlv,year_fabrication}','') ~ '^\d{4}$' then
    crlv_year:=(new.metadata #>> '{crlv,year_fabrication}')::integer;
  end if;

  insert into public.v2_vehicle_technical_profiles(
    company_id,vehicle_id,vin,production_year,model_year,fuel_type,source,source_metadata,synced_from_vehicle_at
  ) values (
    new.company_id,new.id,crlv_vin,crlv_year,new.model_year,crlv_fuel,
    case when crlv<>'{}'::jsonb then 'crlv' else 'vehicle_registry' end,
    jsonb_strip_nulls(jsonb_build_object(
      'vehicle_sync',true,
      'vehicle_make',new.make,
      'vehicle_model',new.model,
      'vehicle_description',new.description,
      'crlv_imported_at',new.metadata #>> '{crlv,imported_at}'
    )),
    now()
  )
  on conflict (company_id,vehicle_id) do update set
    vin=coalesce(excluded.vin,public.v2_vehicle_technical_profiles.vin),
    production_year=coalesce(excluded.production_year,public.v2_vehicle_technical_profiles.production_year),
    model_year=coalesce(excluded.model_year,public.v2_vehicle_technical_profiles.model_year),
    fuel_type=coalesce(excluded.fuel_type,public.v2_vehicle_technical_profiles.fuel_type),
    source=case when excluded.vin is not null then 'crlv' else public.v2_vehicle_technical_profiles.source end,
    source_metadata=public.v2_vehicle_technical_profiles.source_metadata||excluded.source_metadata,
    synced_from_vehicle_at=now(),updated_at=now();
  return new;
end;
$$;

revoke all on function public.v2_sync_vehicle_to_oficina_profile_trigger() from public;

drop trigger if exists trg_v2_vehicle_oficina_profile_insert on public.v2_vehicles;
create trigger trg_v2_vehicle_oficina_profile_insert
after insert on public.v2_vehicles
for each row execute function public.v2_sync_vehicle_to_oficina_profile_trigger();

drop trigger if exists trg_v2_vehicle_oficina_profile_update on public.v2_vehicles;
create trigger trg_v2_vehicle_oficina_profile_update
after update of make,model,model_year,description,metadata on public.v2_vehicles
for each row execute function public.v2_sync_vehicle_to_oficina_profile_trigger();

insert into public.v2_vehicle_technical_profiles(
  company_id,vehicle_id,vin,production_year,model_year,fuel_type,source,source_metadata,synced_from_vehicle_at
)
select
  v.company_id,v.id,
  nullif(trim(coalesce(v.metadata #>> '{crlv,chassis}','')),''),
  case when coalesce(v.metadata #>> '{crlv,year_fabrication}','') ~ '^\d{4}$' then (v.metadata #>> '{crlv,year_fabrication}')::integer else null end,
  v.model_year,
  nullif(trim(coalesce(v.metadata #>> '{crlv,fuel}','')),''),
  case when coalesce(v.metadata->'crlv','{}'::jsonb)<>'{}'::jsonb then 'crlv' else 'vehicle_registry' end,
  jsonb_strip_nulls(jsonb_build_object(
    'vehicle_sync',true,
    'vehicle_make',v.make,
    'vehicle_model',v.model,
    'vehicle_description',v.description,
    'crlv_imported_at',v.metadata #>> '{crlv,imported_at}'
  )),
  now()
from public.v2_vehicles v
on conflict (company_id,vehicle_id) do update set
  vin=coalesce(excluded.vin,public.v2_vehicle_technical_profiles.vin),
  production_year=coalesce(excluded.production_year,public.v2_vehicle_technical_profiles.production_year),
  model_year=coalesce(excluded.model_year,public.v2_vehicle_technical_profiles.model_year),
  fuel_type=coalesce(excluded.fuel_type,public.v2_vehicle_technical_profiles.fuel_type),
  source_metadata=public.v2_vehicle_technical_profiles.source_metadata||excluded.source_metadata,
  synced_from_vehicle_at=now(),updated_at=now();

do $$
declare r record;
begin
  for r in select vehicle_id from public.v2_vehicle_technical_profiles loop
    perform public.v2_refresh_vehicle_component_links(r.vehicle_id);
  end loop;
end $$;
