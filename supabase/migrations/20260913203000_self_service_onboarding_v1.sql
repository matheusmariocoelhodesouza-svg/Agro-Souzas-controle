-- Comando 360: onboarding self-service de novos clientes.
-- Cria empresa + proprietário + permissões + equipes em uma única transação.

create unique index if not exists v2_companies_tax_id_normalized_uq
on public.v2_companies ((regexp_replace(tax_id, '\D', '', 'g')))
where nullif(regexp_replace(coalesce(tax_id,''), '\D', '', 'g'),'') is not null;

create or replace function public.v2_my_onboarding_status()
returns jsonb
language sql
stable
security definer
set search_path = public
as $function$
  select coalesce(
    (
      select jsonb_build_object(
        'configured', true,
        'company_id', c.id,
        'company_name', coalesce(c.trade_name,c.legal_name),
        'company_status', c.status,
        'member_status', m.status,
        'role_code', r.code
      )
      from public.v2_company_members m
      join public.v2_companies c on c.id=m.company_id
      left join public.v2_roles r on r.id=m.role_id
      where m.user_id=auth.uid()
      order by case when m.status='active' then 0 else 1 end, m.created_at asc
      limit 1
    ),
    jsonb_build_object('configured', false)
  );
$function$;

revoke all on function public.v2_my_onboarding_status() from public, anon;
grant execute on function public.v2_my_onboarding_status() to authenticated;

create or replace function public.v2_bootstrap_company(
  p_legal_name text,
  p_trade_name text default null,
  p_tax_id text default null,
  p_primary_segment text default 'other',
  p_admin_name text default null,
  p_admin_phone text default null,
  p_teams jsonb default '[{"name":"Equipe 01"}]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_user_id uuid := auth.uid();
  v_legal_name text := trim(coalesce(p_legal_name,''));
  v_trade_name text := nullif(trim(coalesce(p_trade_name,'')),'');
  v_tax_id text := nullif(trim(coalesce(p_tax_id,'')),'');
  v_tax_digits text := regexp_replace(coalesce(p_tax_id,''), '\D', '', 'g');
  v_segment text := lower(trim(coalesce(p_primary_segment,'other')));
  v_admin_name text := nullif(trim(coalesce(p_admin_name,'')),'');
  v_admin_phone text := nullif(trim(coalesce(p_admin_phone,'')),'');
  v_owner_email text := nullif(trim(coalesce(auth.jwt()->>'email','')),'');
  v_teams jsonb := p_teams;
  v_company_id uuid;
  v_role_id uuid;
  v_member_id uuid;
  v_existing record;
  v_team_count integer;
  v_created_teams jsonb;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode='28000';
  end if;

  -- Serializa duas tentativas simultâneas do mesmo usuário.
  perform 1 from auth.users where id=v_user_id for update;
  if not found then
    raise exception 'AUTH_USER_NOT_FOUND' using errcode='28000';
  end if;

  select m.company_id, c.trade_name, c.legal_name, c.status, m.status as member_status, r.code as role_code
    into v_existing
  from public.v2_company_members m
  join public.v2_companies c on c.id=m.company_id
  left join public.v2_roles r on r.id=m.role_id
  where m.user_id=v_user_id
  order by case when m.status='active' then 0 else 1 end, m.created_at asc
  limit 1;

  if found then
    if v_existing.member_status='active' then
      return jsonb_build_object(
        'ok', true,
        'already_configured', true,
        'company_id', v_existing.company_id,
        'company_name', coalesce(v_existing.trade_name,v_existing.legal_name),
        'company_status', v_existing.status,
        'role_code', v_existing.role_code
      );
    end if;
    raise exception 'ACCOUNT_ALREADY_LINKED' using errcode='P0001';
  end if;

  if length(v_legal_name) < 3 or length(v_legal_name) > 180 then
    raise exception 'INVALID_LEGAL_NAME' using errcode='22023';
  end if;
  if v_trade_name is not null and length(v_trade_name) > 120 then
    raise exception 'INVALID_TRADE_NAME' using errcode='22023';
  end if;
  if v_admin_name is not null and length(v_admin_name) > 120 then
    raise exception 'INVALID_ADMIN_NAME' using errcode='22023';
  end if;
  if v_admin_phone is not null and length(v_admin_phone) > 40 then
    raise exception 'INVALID_ADMIN_PHONE' using errcode='22023';
  end if;

  if v_tax_digits <> '' and length(v_tax_digits) not in (11,14) then
    raise exception 'INVALID_TAX_ID' using errcode='22023';
  end if;

  if v_segment not in ('poultry_catching','transport','workshop','agriculture','services','other') then
    raise exception 'INVALID_SEGMENT' using errcode='22023';
  end if;

  if v_teams is null or jsonb_typeof(v_teams)='null' or (jsonb_typeof(v_teams)='array' and jsonb_array_length(v_teams)=0) then
    v_teams := '[{"name":"Equipe 01"}]'::jsonb;
  end if;
  if jsonb_typeof(v_teams) <> 'array' then
    raise exception 'INVALID_TEAMS' using errcode='22023';
  end if;

  v_team_count := jsonb_array_length(v_teams);
  if v_team_count < 1 or v_team_count > 20 then
    raise exception 'INVALID_TEAM_COUNT' using errcode='22023';
  end if;

  if exists (
    select 1 from jsonb_array_elements(v_teams) e
    where length(trim(coalesce(e->>'name',''))) < 2
       or length(trim(coalesce(e->>'name',''))) > 100
  ) then
    raise exception 'INVALID_TEAM_NAME' using errcode='22023';
  end if;

  if (
    select count(*) from (
      select lower(trim(e->>'name')) n
      from jsonb_array_elements(v_teams) e
      group by lower(trim(e->>'name'))
    ) x
  ) <> v_team_count then
    raise exception 'DUPLICATE_TEAM_NAME' using errcode='22023';
  end if;

  if v_tax_digits <> '' and exists (
    select 1 from public.v2_companies c
    where regexp_replace(coalesce(c.tax_id,''), '\D', '', 'g')=v_tax_digits
  ) then
    raise exception 'COMPANY_TAX_ID_ALREADY_EXISTS' using errcode='23505';
  end if;

  begin
    insert into public.v2_companies(
      legal_name, trade_name, tax_id, primary_segment, status,
      country_code, currency_code, timezone, metadata
    ) values (
      v_legal_name,
      coalesce(v_trade_name,v_legal_name),
      v_tax_id,
      v_segment,
      'active',
      'BR','BRL','America/Sao_Paulo',
      jsonb_strip_nulls(jsonb_build_object(
        'created_from','self_service_onboarding',
        'onboarding',jsonb_build_object(
          'version',1,
          'completed_at',now(),
          'owner_name',v_admin_name,
          'owner_email',v_owner_email,
          'owner_phone',v_admin_phone
        ),
        'subscription',jsonb_build_object(
          'plan','trial',
          'status','trial',
          'started_at',now()
        ),
        'employer',jsonb_strip_nulls(jsonb_build_object(
          'legal_name',v_legal_name,
          'tax_id',nullif(v_tax_digits,''),
          'responsible',v_admin_name,
          'phone',v_admin_phone,
          'email',v_owner_email
        ))
      ))
    ) returning id into v_company_id;
  exception when unique_violation then
    raise exception 'COMPANY_TAX_ID_ALREADY_EXISTS' using errcode='23505';
  end;

  insert into public.v2_roles(company_id,code,name,is_system)
  values(v_company_id,'owner','Proprietário',true)
  returning id into v_role_id;

  insert into public.v2_role_permissions(role_id,permission_id,allowed)
  select v_role_id,p.id,true
  from public.v2_permissions p
  on conflict (role_id,permission_id) do update set allowed=excluded.allowed;

  insert into public.v2_company_members(company_id,user_id,role_id,status,joined_at)
  values(v_company_id,v_user_id,v_role_id,'active',now())
  returning id into v_member_id;

  with inserted as (
    insert into public.v2_teams(company_id,name,code,status,metadata)
    select
      v_company_id,
      trim(e.value->>'name'),
      'EQ'||lpad(e.ordinality::text,2,'0'),
      'active',
      jsonb_build_object('created_from','self_service_onboarding')
    from jsonb_array_elements(v_teams) with ordinality as e(value,ordinality)
    order by e.ordinality
    returning id,name,code
  )
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'code',code) order by code),'[]'::jsonb)
    into v_created_teams
  from inserted;

  return jsonb_build_object(
    'ok',true,
    'already_configured',false,
    'company_id',v_company_id,
    'company_name',coalesce(v_trade_name,v_legal_name),
    'member_id',v_member_id,
    'role_id',v_role_id,
    'role_code','owner',
    'permissions_granted',(select count(*) from public.v2_permissions),
    'teams',v_created_teams
  );
end;
$function$;

revoke all on function public.v2_bootstrap_company(text,text,text,text,text,text,jsonb) from public, anon;
grant execute on function public.v2_bootstrap_company(text,text,text,text,text,text,jsonb) to authenticated;

comment on function public.v2_bootstrap_company(text,text,text,text,text,text,jsonb)
is 'Onboarding transacional self-service do Comando 360. Cria empresa, proprietário com todas as permissões e equipes iniciais para o usuário autenticado.';
