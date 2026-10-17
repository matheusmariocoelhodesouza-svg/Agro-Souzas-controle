-- Read-only validation against the deployed functions. No face enrollments or
-- attendance events are created. The transaction restores all claim settings.
begin;
set local statement_timeout='5s';
do $$
declare
 member record;
 descriptor float8[]=array_fill(0.0::float8,array[128]);
 bad float8[];blocked boolean;threshold float8;
begin
 select company_id,user_id into member from public.v2_company_members where status='active' order by created_at limit 1;
 if not found then raise exception 'No membership available to validate the input guard';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',member.user_id,'role','authenticated')::text,true);
 foreach threshold in array array[0.0,-1.0,0.51,100.0,'NaN'::float8,'Infinity'::float8] loop
  blocked=false;
  begin perform public.v2_device_match_employee_face(member.company_id,descriptor,threshold);
  exception when raise_exception then blocked=true;end;
  if not blocked then raise exception 'Invalid threshold accepted';end if;
 end loop;
 bad=array_fill(0.0::float8,array[127]);blocked=false;
 begin perform public.v2_device_match_employee_face(member.company_id,bad,.50);
 exception when raise_exception then blocked=true;end;
 if not blocked then raise exception 'Invalid descriptor length accepted';end if;
 bad=descriptor;bad[12]='NaN'::float8;blocked=false;
 begin perform public.v2_device_match_employee_face(member.company_id,bad,.50);
 exception when raise_exception then blocked=true;end;
 if not blocked then raise exception 'NaN component accepted';end if;
end;$$;
select 'BIOMETRIC_LIVE_INPUT_AUDIT_OK' as result,8 as invalid_inputs_rejected;
rollback;
