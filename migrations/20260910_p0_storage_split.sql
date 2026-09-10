-- Comando 360 • prepare dedicated V2 storage buckets.

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values
 ('v2-face-references','v2-face-references',false,5242880,array['image/jpeg','image/png','image/webp']),
 ('v2-employee-photos','v2-employee-photos',false,5242880,array['image/jpeg','image/png','image/webp']),
 ('v2-vehicle-photos','v2-vehicle-photos',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
set public=false,
    file_size_limit=excluded.file_size_limit,
    allowed_mime_types=excluded.allowed_mime_types;

-- Face reference images.
drop policy if exists v2_face_refs_select on storage.objects;
drop policy if exists v2_face_refs_insert on storage.objects;
drop policy if exists v2_face_refs_update on storage.objects;
drop policy if exists v2_face_refs_delete on storage.objects;
create policy v2_face_refs_select on storage.objects for select to authenticated
using (bucket_id='v2-face-references' and public.v2_has_permission(((storage.foldername(name))[1])::uuid,'attendance.view'));
create policy v2_face_refs_insert on storage.objects for insert to authenticated
with check (bucket_id='v2-face-references' and public.v2_has_permission(((storage.foldername(name))[1])::uuid,'attendance.biometric.manage'));
create policy v2_face_refs_update on storage.objects for update to authenticated
using (bucket_id='v2-face-references' and public.v2_has_permission(((storage.foldername(name))[1])::uuid,'attendance.biometric.manage'))
with check (bucket_id='v2-face-references' and public.v2_has_permission(((storage.foldername(name))[1])::uuid,'attendance.biometric.manage'));
create policy v2_face_refs_delete on storage.objects for delete to authenticated
using (bucket_id='v2-face-references' and public.v2_has_permission(((storage.foldername(name))[1])::uuid,'attendance.biometric.manage'));

-- Employee profile photos.
drop policy if exists v2_employee_photos_select on storage.objects;
drop policy if exists v2_employee_photos_insert on storage.objects;
drop policy if exists v2_employee_photos_update on storage.objects;
drop policy if exists v2_employee_photos_delete on storage.objects;
create policy v2_employee_photos_select on storage.objects for select to authenticated
using (bucket_id='v2-employee-photos' and public.v2_has_permission(((storage.foldername(name))[1])::uuid,'employees.view'));
create policy v2_employee_photos_insert on storage.objects for insert to authenticated
with check (bucket_id='v2-employee-photos' and public.v2_has_permission(((storage.foldername(name))[1])::uuid,'employees.edit'));
create policy v2_employee_photos_update on storage.objects for update to authenticated
using (bucket_id='v2-employee-photos' and public.v2_has_permission(((storage.foldername(name))[1])::uuid,'employees.edit'))
with check (bucket_id='v2-employee-photos' and public.v2_has_permission(((storage.foldername(name))[1])::uuid,'employees.edit'));
create policy v2_employee_photos_delete on storage.objects for delete to authenticated
using (bucket_id='v2-employee-photos' and public.v2_has_permission(((storage.foldername(name))[1])::uuid,'employees.edit'));

-- Vehicle profile photos.
drop policy if exists v2_vehicle_photos_select on storage.objects;
drop policy if exists v2_vehicle_photos_insert on storage.objects;
drop policy if exists v2_vehicle_photos_update on storage.objects;
drop policy if exists v2_vehicle_photos_delete on storage.objects;
create policy v2_vehicle_photos_select on storage.objects for select to authenticated
using (bucket_id='v2-vehicle-photos' and public.v2_has_permission(((storage.foldername(name))[1])::uuid,'fleet.view'));
create policy v2_vehicle_photos_insert on storage.objects for insert to authenticated
with check (bucket_id='v2-vehicle-photos' and public.v2_has_permission(((storage.foldername(name))[1])::uuid,'fleet.manage'));
create policy v2_vehicle_photos_update on storage.objects for update to authenticated
using (bucket_id='v2-vehicle-photos' and public.v2_has_permission(((storage.foldername(name))[1])::uuid,'fleet.manage'))
with check (bucket_id='v2-vehicle-photos' and public.v2_has_permission(((storage.foldername(name))[1])::uuid,'fleet.manage'));
create policy v2_vehicle_photos_delete on storage.objects for delete to authenticated
using (bucket_id='v2-vehicle-photos' and public.v2_has_permission(((storage.foldername(name))[1])::uuid,'fleet.manage'));
