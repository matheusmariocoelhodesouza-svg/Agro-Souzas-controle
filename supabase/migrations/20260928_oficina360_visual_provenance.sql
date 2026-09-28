alter table public.v2_vehicle_exploded_views
  add column if not exists visual_type text,
  add column if not exists can_store_image boolean,
  add column if not exists show_source_button boolean,
  add column if not exists visual_confidence text,
  add column if not exists generated_preview_reference text,
  add column if not exists last_reviewed_at timestamptz,
  add column if not exists reviewed_by text;

update public.v2_vehicle_exploded_views
set visual_type = case
    when nullif(btrim(image_reference),'') is not null
         and lower(coalesce(image_license_status,'')) in ('official_authorized','authorized','official')
      then 'official_authorized'
    when nullif(btrim(image_reference),'') is not null
         and lower(coalesce(image_license_status,'')) in ('licensed','licensed_partner')
      then 'licensed_partner'
    when lower(coalesce(image_license_status,'')) in ('generated','reference_only')
      then 'oficina360_reconstructed'
    else 'validation_pending'
  end,
  can_store_image = case
    when nullif(btrim(image_reference),'') is not null
         and lower(coalesce(image_license_status,'')) in ('official_authorized','authorized','official','licensed','licensed_partner')
      then true
    else false
  end,
  show_source_button = (nullif(btrim(source_url),'') is not null),
  visual_confidence = case
    when nullif(btrim(image_reference),'') is not null
         and lower(coalesce(image_license_status,'')) in ('official_authorized','authorized','official','licensed','licensed_partner')
         and verification_status = 'verified'
      then 'high'
    when lower(coalesce(image_license_status,'')) in ('generated','reference_only')
      then 'medium'
    else 'low'
  end,
  generated_preview_reference = case
    when lower(coalesce(image_license_status,'')) in ('generated','reference_only')
      then 'runtime:oficina360-exploded-browser-v1'
    else generated_preview_reference
  end,
  last_reviewed_at = coalesce(last_reviewed_at, updated_at, created_at, now())
where visual_type is null
   or can_store_image is null
   or show_source_button is null
   or visual_confidence is null;

alter table public.v2_vehicle_exploded_views
  alter column visual_type set default 'validation_pending',
  alter column can_store_image set default false,
  alter column show_source_button set default false,
  alter column visual_confidence set default 'low';

comment on column public.v2_vehicle_exploded_views.visual_type is
  'official_authorized | licensed_partner | oficina360_reconstructed | validation_pending | insufficient_basis';
comment on column public.v2_vehicle_exploded_views.visual_confidence is
  'high | medium | low';
comment on column public.v2_vehicle_exploded_views.generated_preview_reference is
  'Identificador da reconstrução visual própria do Oficina 360 quando não há imagem armazenável autorizada.';
