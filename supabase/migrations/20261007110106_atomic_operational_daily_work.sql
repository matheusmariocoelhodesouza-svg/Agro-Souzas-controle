-- Operational people remain separate from employees, payroll and timeclock.
alter table public.v2_daily_team_work_members
 add column if not exists worker_profile_id uuid references public.v2_operational_worker_profiles(id) on delete restrict;
alter table public.v2_daily_team_work_members alter column employee_id drop not null;
alter table public.v2_daily_team_work_members add constraint v2_daily_member_identity_check
 check (employee_id is not null or worker_profile_id is not null);
create unique index v2_daily_member_worker_unique on public.v2_daily_team_work_members(daily_work_id,worker_profile_id)
 where worker_profile_id is not null;
create unique index if not exists v2_operational_workers_company_identity on public.v2_operational_worker_profiles(company_id,id);
create unique index if not exists v2_daily_work_company_identity on public.v2_daily_team_work(company_id,id);
create unique index if not exists v2_employees_company_identity on public.v2_employees(company_id,id);
alter table public.v2_daily_team_work_members add constraint v2_daily_member_worker_company_fk foreign key(company_id,worker_profile_id) references public.v2_operational_worker_profiles(company_id,id);
alter table public.v2_daily_team_work_members add constraint v2_daily_member_work_company_fk foreign key(company_id,daily_work_id) references public.v2_daily_team_work(company_id,id);
alter table public.v2_daily_team_work_members add constraint v2_daily_member_employee_company_fk foreign key(company_id,employee_id) references public.v2_employees(company_id,id);

create or replace function public.v2_save_operational_daily_work(
 p_company_id uuid,p_work_date date,p_team_name text,p_notes text,p_members jsonb
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare
 v_work public.v2_daily_team_work%rowtype;
 v_member public.v2_daily_team_work_members%rowtype;
 v_item jsonb; v_ids uuid[]='{}'; v_id uuid; v_worker uuid; v_employee uuid;
begin
 if auth.uid() is null or not public.v2_is_company_member(p_company_id) then raise exception 'Acesso negado' using errcode='42501'; end if;
 if p_work_date is null or nullif(btrim(p_team_name),'') is null then raise exception 'Informe a data e a equipe'; end if;
 if jsonb_typeof(p_members) is distinct from 'array' then raise exception 'Lista inválida'; end if;
 if jsonb_array_length(p_members) not between 1 and 200 then raise exception 'Confira as pessoas desta diária'; end if;
 insert into public.v2_daily_team_work(company_id,work_date,team_name,expected_headcount,notes)
 values(p_company_id,p_work_date,p_team_name,14,p_notes)
 on conflict(company_id,work_date,team_name) do update set notes=excluded.notes,updated_at=now()
 where v2_daily_team_work.status='open' returning * into v_work;
 if v_work.id is null then raise exception 'Esta diária está fechada ou cancelada'; end if;
 for v_item in select value from jsonb_array_elements(p_members) loop
  v_worker=nullif(v_item->>'worker_profile_id','')::uuid;
  v_employee=nullif(v_item->>'employee_id','')::uuid;
  if v_worker is not null then
   if not exists(select 1 from public.v2_operational_worker_profiles where id=v_worker and company_id=p_company_id and active) then raise exception 'Pessoa operacional indisponível para esta empresa'; end if;
   -- An operational record never manufactures or links a payroll employee.
   v_employee=null;
  elsif v_employee is null or not exists(select 1 from public.v2_employees where id=v_employee and company_id=p_company_id) then
   raise exception 'Pessoa indisponível para esta empresa';
  end if;
  if exists(select 1 from public.v2_daily_team_work_members where daily_work_id=v_work.id and id=any(v_ids)
    and ((v_worker is not null and worker_profile_id=v_worker) or (v_worker is null and employee_id=v_employee))) then
   raise exception 'Uma pessoa aparece mais de uma vez na diária';
  end if;
  v_member=jsonb_populate_record(null::public.v2_daily_team_work_members,v_item);
  if coalesce(v_member.employee_name,'')='' or coalesce(v_member.role_type,'') not in ('loader','floor')
    or coalesce(v_member.attendance_status,'') not in ('pending','present','absent')
    or v_member.daily_rate is null or v_member.daily_rate<0
    or coalesce(v_member.absence_repass_share,0)<0 or coalesce(v_member.collective_additional_share,0)<0
    or coalesce(v_member.hour_additional,0)<0 or coalesce(v_member.other_additional,0)<0 then
   raise exception 'Confira os dados e valores da pessoa';
  end if;
  if exists(select 1 from unnest(array[v_member.daily_rate,v_member.absence_repass_share,v_member.collective_additional_share,v_member.hour_additional,v_member.other_additional]) n where n::text in ('NaN','Infinity','-Infinity')) then raise exception 'Informe valores finitos'; end if;
  select id into v_id from public.v2_daily_team_work_members where company_id=p_company_id and daily_work_id=v_work.id
   and ((v_worker is not null and worker_profile_id=v_worker) or (v_worker is null and employee_id=v_employee));
  if v_id is null then
   insert into public.v2_daily_team_work_members(company_id,daily_work_id,worker_profile_id,employee_id,employee_name,home_team,work_team,
    role_type,daily_rate,attendance_status,borrowed,counts_for_headcount,absence_repass_share,collective_additional_share,hour_additional,other_additional)
   values(p_company_id,v_work.id,v_worker,v_employee,v_member.employee_name,v_member.home_team,p_team_name,v_member.role_type,v_member.daily_rate,
    v_member.attendance_status,coalesce(v_member.borrowed,false),coalesce(v_member.counts_for_headcount,true),coalesce(v_member.absence_repass_share,0),
    coalesce(v_member.collective_additional_share,0),coalesce(v_member.hour_additional,0),coalesce(v_member.other_additional,0)) returning id into v_id;
  else
   update public.v2_daily_team_work_members set employee_name=v_member.employee_name,home_team=v_member.home_team,work_team=p_team_name,
    role_type=v_member.role_type,daily_rate=v_member.daily_rate,attendance_status=v_member.attendance_status,
    borrowed=coalesce(v_member.borrowed,false),counts_for_headcount=coalesce(v_member.counts_for_headcount,true),
    absence_repass_share=coalesce(v_member.absence_repass_share,0),collective_additional_share=coalesce(v_member.collective_additional_share,0),
    hour_additional=coalesce(v_member.hour_additional,0),other_additional=coalesce(v_member.other_additional,0),updated_at=now()
   where id=v_id and company_id=p_company_id;
  end if;
  v_ids=array_append(v_ids,v_id);
 end loop;
 -- Replacement and validation are one transaction: any error preserves the previous day.
 delete from public.v2_daily_team_work_members where company_id=p_company_id and daily_work_id=v_work.id and not(id=any(v_ids));
 return jsonb_build_object('id',v_work.id,'saved',cardinality(v_ids));
end $$;
revoke all on function public.v2_save_operational_daily_work(uuid,date,text,text,jsonb) from public,anon;
grant execute on function public.v2_save_operational_daily_work(uuid,date,text,text,jsonb) to authenticated;

create or replace function public.v2_prepare_operational_payment_run(p_company_id uuid,p_team_name text,p_start date,p_end date)
 returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_run public.v2_operational_payment_runs%rowtype; v_total numeric; v_count integer; v_ids uuid[]='{}'; v_row record; v_id uuid;
begin
 if auth.uid() is null or not public.v2_is_company_member(p_company_id) then raise exception 'Acesso negado' using errcode='42501'; end if;
 if p_start is null or p_end is null or p_end<p_start or nullif(btrim(p_team_name),'') is null then raise exception 'Confira o período e a equipe'; end if;
 -- Serialize with day saves and reject unresolved attendance instead of freezing a partial payroll.
 perform 1 from public.v2_daily_team_work where company_id=p_company_id and team_name=p_team_name and work_date between p_start and p_end and status<>'cancelled' order by work_date for update;
 if not found then raise exception 'Nenhuma diária salva neste período'; end if;
 if exists(select 1 from public.v2_daily_team_work w join public.v2_daily_team_work_members m on m.daily_work_id=w.id and m.company_id=w.company_id
   where w.company_id=p_company_id and w.team_name=p_team_name and w.work_date between p_start and p_end and w.status<>'cancelled' and m.attendance_status='pending') then
  raise exception 'Há pessoas aguardando confirmação de presença neste período';
 end if;
 if exists(select 1 from public.v2_daily_team_work w join public.v2_daily_team_work_members m on m.daily_work_id=w.id and m.company_id=w.company_id
   where w.company_id=p_company_id and w.team_name=p_team_name and w.work_date between p_start and p_end and w.status<>'cancelled' and m.attendance_status='present' and m.worker_profile_id is null) then
  raise exception 'Confira o cadastro operacional das pessoas deste período';
 end if;
 insert into public.v2_operational_payment_runs(company_id,team_name,period_start,period_end,status) values(p_company_id,p_team_name,p_start,p_end,'draft')
 on conflict(company_id,team_name,period_start,period_end) do update set updated_at=now()
 where v2_operational_payment_runs.status='draft' returning * into v_run;
 if v_run.id is null then raise exception 'O fechamento já está fechado, pago ou cancelado'; end if;
 for v_row in select m.worker_profile_id,max(m.employee_name) name,count(*) days,sum(m.daily_rate) daily,
  sum(m.absence_repass_share) repass,sum(m.collective_additional_share+m.hour_additional+m.other_additional) additional
  from public.v2_daily_team_work w join public.v2_daily_team_work_members m on m.daily_work_id=w.id and m.company_id=w.company_id
  where w.company_id=p_company_id and w.team_name=p_team_name and w.work_date between p_start and p_end and w.status<>'cancelled' and m.attendance_status='present'
  group by m.worker_profile_id loop
  insert into public.v2_operational_payment_items(company_id,run_id,worker_profile_id,operational_name,team_name,days,daily_total,repass_total,other_additional,gross_amount,net_amount)
  values(p_company_id,v_run.id,v_row.worker_profile_id,v_row.name,p_team_name,v_row.days,v_row.daily,v_row.repass,v_row.additional,
   round(v_row.daily+v_row.repass+v_row.additional,2),round(v_row.daily+v_row.repass+v_row.additional,2))
  on conflict(run_id,worker_profile_id) do update set operational_name=excluded.operational_name,team_name=excluded.team_name,days=excluded.days,
   daily_total=excluded.daily_total,repass_total=excluded.repass_total,other_additional=excluded.other_additional,gross_amount=excluded.gross_amount,
   net_amount=excluded.gross_amount-v2_operational_payment_items.discount_amount,updated_at=now() returning id into v_id;
  v_ids=array_append(v_ids,v_id);
 end loop;
 if cardinality(v_ids)=0 then raise exception 'Nenhuma presença confirmada neste período'; end if;
 if exists(select 1 from public.v2_operational_payment_items where company_id=p_company_id and run_id=v_run.id and net_amount<0) then raise exception 'Confira os descontos do fechamento antes de recalcular'; end if;
 delete from public.v2_operational_payment_items where company_id=p_company_id and run_id=v_run.id and not(id=any(v_ids));
 select coalesce(sum(gross_amount),0),count(*) into v_total,v_count from public.v2_operational_payment_items where company_id=p_company_id and run_id=v_run.id;
 update public.v2_operational_payment_runs set gross_total=v_total,discount_total=(select coalesce(sum(discount_amount),0) from public.v2_operational_payment_items where company_id=p_company_id and run_id=v_run.id),
  net_total=(select coalesce(sum(net_amount),0) from public.v2_operational_payment_items where company_id=p_company_id and run_id=v_run.id),updated_at=now() where id=v_run.id and company_id=p_company_id;
 return jsonb_build_object('id',v_run.id,'people',v_count,'gross_total',v_total);
end $$;
revoke all on function public.v2_prepare_operational_payment_run(uuid,text,date,date) from public,anon;
grant execute on function public.v2_prepare_operational_payment_run(uuid,text,date,date) to authenticated;
