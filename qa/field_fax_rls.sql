-- All fixtures and privilege changes are rolled back. No production row survives.
begin;
do $test$
declare
  device record;
  other_team uuid;
  own_fax uuid := gen_random_uuid();
  other_fax uuid := gen_random_uuid();
  unassigned_fax uuid := gen_random_uuid();
  visible_count integer;
  changed_count integer;
  denied boolean := false;
begin
  select da.* into strict device from public.v2_device_access da
  where da.active and da.control_state='active' and not da.lost_mode
    and coalesce((da.permissions->>'apanha')::boolean,false)
  order by da.paired_at desc limit 1;
  select id into strict other_team from public.v2_teams
  where company_id=device.company_id and id<>device.team_id limit 1;
  insert into public.v2_poultry_faxes(id,company_id,team_id,pickup_date,integrated_name,city)
  values(own_fax,device.company_id,device.team_id,current_date,'QA rollback own','QA'),
        (other_fax,device.company_id,other_team,current_date,'QA rollback other','QA'),
        (unassigned_fax,device.company_id,null,current_date,'QA rollback unassigned','QA');
  perform set_config('request.jwt.claims',jsonb_build_object('sub',device.user_id,'role','authenticated','is_anonymous',true,'app_metadata',jsonb_build_object('comando360_device',true))::text,true);
  set local role authenticated;
  select count(*) into visible_count from public.v2_poultry_faxes
  where id in(own_fax,other_fax,unassigned_fax);
  if visible_count<>1 then raise exception 'FAX team isolation failed: % visible',visible_count; end if;
  update public.v2_poultry_faxes set status='completed' where id=own_fax;
  get diagnostics changed_count=row_count;
  if changed_count<>0 then raise exception 'Field device must not complete administrative FAX'; end if;
  begin
    insert into public.v2_poultry_faxes(company_id,team_id,pickup_date,integrated_name,city)
    values(device.company_id,device.team_id,current_date,'QA forbidden field insert','QA');
  exception when insufficient_privilege then denied:=true;
  end;
  if not denied then raise exception 'Field FAX insert unexpectedly permitted'; end if;
  reset role;
  update public.v2_device_access set active=false where id=device.id;
  set local role authenticated;
  select count(*) into visible_count from public.v2_poultry_faxes where id=own_fax;
  if visible_count<>0 then raise exception 'Revoked device still reads FAX'; end if;
  reset role;
  perform set_config('c360.qa_fax_rls','own_team_only,unassigned_hidden,write_denied,revoked_device_denied',true);
end;
$test$;
select current_setting('c360.qa_fax_rls') as passed_checks;
rollback;
