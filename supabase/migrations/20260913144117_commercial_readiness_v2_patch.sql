grant insert on table public.v2_subscriptions to authenticated;
drop policy if exists c360_subscriptions_platform_insert on public.v2_subscriptions;
create policy c360_subscriptions_platform_insert on public.v2_subscriptions for insert to authenticated with check((select private.c360_is_platform_admin()));

create or replace function private.c360_health_to_incident()
returns trigger
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare fp text;sev text;occ integer;incident_id uuid;
begin
 sev:=case when new.severity in ('critical','error','warning') then new.severity else 'error' end;
 if sev not in ('error','critical') then return new;end if;
 fp:=coalesce(nullif(new.fingerprint,''),md5(coalesce(new.kind,'')||'|'||coalesce(new.message,'')||'|'||coalesce(new.route,'')));
 insert into public.v2_platform_incidents(company_id,fingerprint,severity,status,title,last_message,last_route,first_seen_at,last_seen_at,occurrence_count,metadata)
 values(new.company_id,fp,sev,'open',left(coalesce(nullif(new.message,''),new.kind,'Erro no aplicativo'),180),left(new.message,1000),left(new.route,300),coalesce(new.reported_at,new.created_at,now()),coalesce(new.reported_at,new.created_at,now()),1,jsonb_build_object('kind',new.kind,'app_version',new.app_version,'recovery_version',new.recovery_version,'mode',new.mode))
 on conflict(company_id,fingerprint) do update set severity=case when excluded.severity='critical' then 'critical' else public.v2_platform_incidents.severity end,status='open',title=excluded.title,last_message=excluded.last_message,last_route=excluded.last_route,last_seen_at=greatest(public.v2_platform_incidents.last_seen_at,excluded.last_seen_at),occurrence_count=public.v2_platform_incidents.occurrence_count+1,resolved_at=null,resolved_by=null,metadata=public.v2_platform_incidents.metadata||excluded.metadata,updated_at=now()
 returning id,occurrence_count into incident_id,occ;
 if sev='critical' or occ>=3 then
  insert into public.v2_alerts(company_id,alert_type,severity,title,message,entity_type,entity_id,status,dedupe_key,metadata)
  values(new.company_id,'app_health',case when sev='critical' then 'critical' else 'warning' end,case when sev='critical' then 'Falha crítica detectada pelo Comando 360' else 'Falha recorrente detectada pelo Comando 360' end,left(coalesce(new.message,new.kind,'Erro técnico'),1000),'platform_incident',incident_id,'open','app_health:'||fp,jsonb_build_object('fingerprint',fp,'occurrences',occ,'route',new.route,'app_version',new.app_version))
  on conflict(company_id,dedupe_key) where dedupe_key is not null and status in ('open','seen') do update set severity=excluded.severity,title=excluded.title,message=excluded.message,entity_id=excluded.entity_id,metadata=public.v2_alerts.metadata||excluded.metadata;
 end if;
 return new;
end;$$;
revoke all on function private.c360_health_to_incident() from public,anon,authenticated;
grant execute on function private.c360_health_to_incident() to service_role;
