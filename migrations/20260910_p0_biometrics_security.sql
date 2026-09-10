-- Comando 360 • P0 Security Hardening
-- Harden biometric RPCs and storage policies for multi-company SaaS.

insert into public.v2_permissions(code,module_code,description)
values ('attendance.biometric.manage','rh','Gerenciar biometria facial')
on conflict (code) do update
set module_code=excluded.module_code,
    description=excluded.description;

insert into public.v2_role_permissions(role_id,permission_id,allowed)
select r.id,p.id,true
from public.v2_roles r
join public.v2_permissions p on p.code='attendance.biometric.manage'
where r.code in ('owner','admin')
on conflict (role_id,permission_id) do update set allowed=true;

create or replace function public.v2_save_employee_face_descriptor(
  p_employee_id uuid,
  p_descriptor double precision[]
)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_company_id uuid;
begin
  select e.company_id
    into v_company_id
  from public.v2_employees e
  where e.id = p_employee_id
    and e.status = 'active'
  limit 1;

  if v_company_id is null then
    raise exception 'Funcionário não encontrado ou inativo';
  end if;

  if not public.v2_has_permission(v_company_id,'attendance.biometric.manage') then
    raise exception 'Sem permissão para gerenciar biometria';
  end if;

  if p_descriptor is null or coalesce(array_length(p_descriptor,1),0) < 64 then
    raise exception 'Descritor facial inválido';
  end if;

  update public.v2_employee_face_enrollments f
     set descriptor = p_descriptor,
         enrolled_at = now(),
         status = 'active',
         revoked_at = null,
         enrolled_by = (select auth.uid())
   where f.id = (
     select x.id
     from public.v2_employee_face_enrollments x
     where x.company_id = v_company_id
       and x.employee_id = p_employee_id
       and x.status = 'active'
     order by x.enrolled_at desc
     limit 1
   );

  if not found then
    raise exception 'Biometria V2 não cadastrada para este funcionário';
  end if;
end;
$function$;

create or replace function public.v2_match_employee_face(
  p_company_id uuid,
  p_descriptor double precision[],
  p_threshold double precision default 0.55
)
returns table(employee_id uuid, employee_name text, employee_number text, distance double precision)
language plpgsql
stable
security definer
set search_path to ''
as $function$
begin
  if not (
    public.v2_has_permission(p_company_id,'attendance.create')
    or public.v2_has_permission(p_company_id,'attendance.biometric.manage')
  ) then
    raise exception 'Sem permissão para reconhecimento facial';
  end if;

  if p_descriptor is null or coalesce(array_length(p_descriptor,1),0) < 64 then
    raise exception 'Descritor facial inválido';
  end if;

  return query
  select e.id,
         e.full_name,
         e.employee_number,
         public.face_distance(f.descriptor,p_descriptor) as distance
  from public.v2_employee_face_enrollments f
  join public.v2_employees e
    on e.id=f.employee_id
   and e.company_id=f.company_id
  where f.company_id=p_company_id
    and f.status='active'
    and e.status='active'
    and f.descriptor is not null
    and array_length(f.descriptor,1)=array_length(p_descriptor,1)
    and public.face_distance(f.descriptor,p_descriptor) <= greatest(0.30,least(coalesce(p_threshold,0.55),0.75))
  order by public.face_distance(f.descriptor,p_descriptor)
  limit 1;
end;
$function$;

-- Member policies: viewing requires point access; editing requires biometric permission.
drop policy if exists v2_face_enrollments_select on public.v2_employee_face_enrollments;
drop policy if exists v2_face_enrollments_insert on public.v2_employee_face_enrollments;
drop policy if exists v2_face_enrollments_update on public.v2_employee_face_enrollments;
drop policy if exists v2_face_enrollments_delete on public.v2_employee_face_enrollments;

create policy v2_face_enrollments_select
on public.v2_employee_face_enrollments
for select to authenticated
using (public.v2_has_permission(company_id,'attendance.view'));

create policy v2_face_enrollments_insert
on public.v2_employee_face_enrollments
for insert to authenticated
with check (
  public.v2_has_permission(company_id,'attendance.biometric.manage')
  and exists (
    select 1 from public.v2_employees e
    where e.id=employee_id and e.company_id=company_id
  )
);

create policy v2_face_enrollments_update
on public.v2_employee_face_enrollments
for update to authenticated
using (public.v2_has_permission(company_id,'attendance.biometric.manage'))
with check (
  public.v2_has_permission(company_id,'attendance.biometric.manage')
  and exists (
    select 1 from public.v2_employees e
    where e.id=employee_id and e.company_id=company_id
  )
);

create policy v2_face_enrollments_delete
on public.v2_employee_face_enrollments
for delete to authenticated
using (public.v2_has_permission(company_id,'attendance.biometric.manage'));

-- Reference / legacy biometric bucket: isolate by company folder.
drop policy if exists biometric_selfies_select on storage.objects;
drop policy if exists biometric_selfies_insert on storage.objects;
drop policy if exists biometric_selfies_delete_admin on storage.objects;
drop policy if exists biometric_selfies_update on storage.objects;

create policy biometric_selfies_select
on storage.objects
for select to authenticated
using (
  bucket_id='biometric-selfies'
  and (
    public.v2_has_permission(((storage.foldername(name))[1])::uuid,'attendance.view')
    or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin')
  )
);

create policy biometric_selfies_insert
on storage.objects
for insert to authenticated
with check (
  bucket_id='biometric-selfies'
  and (
    public.v2_has_permission(((storage.foldername(name))[1])::uuid,'attendance.create')
    or public.v2_has_permission(((storage.foldername(name))[1])::uuid,'attendance.biometric.manage')
    or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin')
  )
);

create policy biometric_selfies_update
on storage.objects
for update to authenticated
using (
  bucket_id='biometric-selfies'
  and public.v2_has_permission(((storage.foldername(name))[1])::uuid,'attendance.biometric.manage')
)
with check (
  bucket_id='biometric-selfies'
  and public.v2_has_permission(((storage.foldername(name))[1])::uuid,'attendance.biometric.manage')
);

create policy biometric_selfies_delete_admin
on storage.objects
for delete to authenticated
using (
  bucket_id='biometric-selfies'
  and (
    public.v2_has_permission(((storage.foldername(name))[1])::uuid,'attendance.biometric.manage')
    or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin')
  )
);

-- Attendance selfie bucket: normal members use permission engine, devices keep their scoped policy.
drop policy if exists v2_attendance_selfies_select on storage.objects;
drop policy if exists v2_attendance_selfies_insert on storage.objects;
drop policy if exists v2_attendance_selfies_delete on storage.objects;

create policy v2_attendance_selfies_select
on storage.objects
for select to authenticated
using (
  bucket_id='v2-attendance-selfies'
  and public.v2_has_permission(((storage.foldername(name))[1])::uuid,'attendance.view')
);

create policy v2_attendance_selfies_insert
on storage.objects
for insert to authenticated
with check (
  bucket_id='v2-attendance-selfies'
  and public.v2_has_permission(((storage.foldername(name))[1])::uuid,'attendance.create')
);

create policy v2_attendance_selfies_delete
on storage.objects
for delete to authenticated
using (
  bucket_id='v2-attendance-selfies'
  and public.v2_has_permission(((storage.foldername(name))[1])::uuid,'attendance.biometric.manage')
);

-- Current mixed profile/document bucket: keep compatibility, but enforce company scope.
drop policy if exists employee_storage_admin_select on storage.objects;
drop policy if exists employee_storage_admin_insert on storage.objects;
drop policy if exists employee_storage_admin_delete on storage.objects;
drop policy if exists employee_storage_admin_update on storage.objects;

create policy employee_storage_admin_select
on storage.objects
for select to authenticated
using (
  bucket_id='employee-documents'
  and (
    public.v2_is_company_member(((storage.foldername(name))[1])::uuid)
    or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin')
  )
);

create policy employee_storage_admin_insert
on storage.objects
for insert to authenticated
with check (
  bucket_id='employee-documents'
  and (
    public.v2_has_permission(((storage.foldername(name))[1])::uuid,'employees.edit')
    or public.v2_has_permission(((storage.foldername(name))[1])::uuid,'fleet.manage')
    or public.v2_has_permission(((storage.foldername(name))[1])::uuid,'employee.documents.manage')
    or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin')
  )
);

create policy employee_storage_admin_update
on storage.objects
for update to authenticated
using (
  bucket_id='employee-documents'
  and (
    public.v2_has_permission(((storage.foldername(name))[1])::uuid,'employees.edit')
    or public.v2_has_permission(((storage.foldername(name))[1])::uuid,'fleet.manage')
    or public.v2_has_permission(((storage.foldername(name))[1])::uuid,'employee.documents.manage')
  )
)
with check (
  bucket_id='employee-documents'
  and (
    public.v2_has_permission(((storage.foldername(name))[1])::uuid,'employees.edit')
    or public.v2_has_permission(((storage.foldername(name))[1])::uuid,'fleet.manage')
    or public.v2_has_permission(((storage.foldername(name))[1])::uuid,'employee.documents.manage')
  )
);

create policy employee_storage_admin_delete
on storage.objects
for delete to authenticated
using (
  bucket_id='employee-documents'
  and (
    public.v2_has_permission(((storage.foldername(name))[1])::uuid,'employees.edit')
    or public.v2_has_permission(((storage.foldername(name))[1])::uuid,'fleet.manage')
    or public.v2_has_permission(((storage.foldername(name))[1])::uuid,'employee.documents.manage')
    or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin')
  )
);

-- Prevent future users from calling the legacy unscoped face matcher.
create or replace function public.match_employee_face(
  p_descriptor double precision[],
  p_threshold double precision default 0.50
)
returns table(employee_id uuid, employee_name text, registration text, distance double precision)
language plpgsql
stable
security definer
set search_path to ''
as $function$
begin
  if not exists(
    select 1 from public.profiles p
    where p.id=(select auth.uid()) and p.role='admin'
  ) then
    raise exception 'Função legada restrita';
  end if;

  return query
  select e.id,e.name,e.registration,public.face_distance(f.descriptor,p_descriptor) as distance
  from public.employee_face_enrollments f
  join public.employees e on e.id=f.employee_id
  where f.active=true and e.active=true and f.descriptor is not null
    and array_length(f.descriptor,1)=array_length(p_descriptor,1)
    and public.face_distance(f.descriptor,p_descriptor) <= greatest(0.30,least(coalesce(p_threshold,0.50),0.75))
  order by public.face_distance(f.descriptor,p_descriptor)
  limit 1;
end;
$function$;
