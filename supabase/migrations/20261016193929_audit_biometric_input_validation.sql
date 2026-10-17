-- The supported face model emits exactly 128 finite components. A caller must
-- not weaken the server's acceptance threshold by supplying an arbitrary value.
create or replace function public.v2_device_match_employee_face(p_company_id uuid,p_descriptor double precision[],p_threshold double precision default 0.50)
returns table(employee_id uuid,distance double precision)
language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception using errcode='42501',message='Autenticação necessária.';end if;
 if coalesce(array_ndims(p_descriptor),0)<>1 or coalesce(array_lower(p_descriptor,1),0)<>1 or coalesce(cardinality(p_descriptor),0)<>128
  or exists(select 1 from unnest(p_descriptor) d where d is null or d::text in ('NaN','Infinity','-Infinity'))
 then raise exception 'Descritor facial inválido.';end if;
 if p_threshold is not null and (p_threshold<=0 or p_threshold>0.50 or p_threshold::text in ('NaN','Infinity','-Infinity')) then raise exception 'Limite de reconhecimento inválido.';end if;
 return query select f.employee_id,public.face_distance(f.descriptor,p_descriptor)
 from public.v2_employee_face_enrollments f
 join public.v2_employees e on e.id=f.employee_id and e.company_id=f.company_id and e.status='active'
 where f.company_id=p_company_id and f.status='active' and f.revoked_at is null
  and cardinality(f.descriptor)=128
  and private.v2_device_company_employee_allowed(p_company_id,f.employee_id)
  and public.face_distance(f.descriptor,p_descriptor)<=coalesce(p_threshold,0.50)
 order by public.face_distance(f.descriptor,p_descriptor) limit 1;
end;$$;
revoke all on function public.v2_device_match_employee_face(uuid,double precision[],double precision) from public,anon;
grant execute on function public.v2_device_match_employee_face(uuid,double precision[],double precision) to authenticated;

create or replace function public.v2_match_employee_face(p_company_id uuid,p_descriptor double precision[],p_threshold double precision default 0.55)
returns table(employee_id uuid,employee_name text,employee_number text,distance double precision)
language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not (public.v2_has_permission(p_company_id,'attendance.create') or public.v2_has_permission(p_company_id,'attendance.biometric.manage')) then raise exception using errcode='42501',message='Sem permissão para reconhecimento facial';end if;
 if coalesce(array_ndims(p_descriptor),0)<>1 or coalesce(array_lower(p_descriptor,1),0)<>1 or coalesce(cardinality(p_descriptor),0)<>128
  or exists(select 1 from unnest(p_descriptor) d where d is null or d::text in ('NaN','Infinity','-Infinity'))
 then raise exception 'Descritor facial inválido.';end if;
 if p_threshold is not null and (p_threshold<=0 or p_threshold>0.55 or p_threshold::text in ('NaN','Infinity','-Infinity')) then raise exception 'Limite de reconhecimento inválido.';end if;
 return query select e.id,e.full_name,e.employee_number,public.face_distance(f.descriptor,p_descriptor)
 from public.v2_employee_face_enrollments f join public.v2_employees e on e.id=f.employee_id and e.company_id=f.company_id
 where f.company_id=p_company_id and f.status='active' and f.revoked_at is null and e.status='active'
  and cardinality(f.descriptor)=128 and public.face_distance(f.descriptor,p_descriptor)<=coalesce(p_threshold,0.55)
 order by public.face_distance(f.descriptor,p_descriptor) limit 1;
end;$$;
revoke all on function public.v2_match_employee_face(uuid,double precision[],double precision) from public,anon;
grant execute on function public.v2_match_employee_face(uuid,double precision[],double precision) to authenticated;
