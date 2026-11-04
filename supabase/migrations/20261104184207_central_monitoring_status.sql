-- Separa o monitor gratuito de qualquer autorização de consumo pago.
create function public.central_configure_monitoring(p_company_id uuid,p_source_id text,p_daily_checks boolean) returns void
language plpgsql security definer set search_path='' as $$begin
 if not private.is_company_admin(p_company_id) or p_source_id not in('rfb','fgts','cndt') or p_source_id is null or p_daily_checks is null then raise exception 'Configuração de monitoramento não autorizada';end if;
 if private.central_profile_hash(p_company_id) is null then raise exception 'Confirme o cadastro real da empresa';end if;
 insert into public.central_integrations(company_id,source_id,daily_checks,next_check_at)
 values(p_company_id,p_source_id,p_daily_checks,case when p_daily_checks then now() end)
 on conflict(company_id,source_id) do update set daily_checks=excluded.daily_checks,
 next_check_at=case when not excluded.daily_checks then null when central_integrations.daily_checks and central_integrations.next_check_at is not null then central_integrations.next_check_at else now() end;
 perform private.central_audit(p_company_id,'monitoring',p_source_id,'Monitoramento interno configurado',jsonb_build_object('daily_checks',p_daily_checks,'paid_authorization_changed',false));
end$$;
revoke all on function public.central_configure_monitoring(uuid,text,boolean) from public,anon;
grant execute on function public.central_configure_monitoring(uuid,text,boolean) to authenticated;

-- enabled pertence ao transporte oficial; daily_checks controla o monitor gratuito.
create or replace function public.central_connector_daily() returns integer language plpgsql security definer set search_path='' as $$declare cfg record;tr text;n int:=0;begin
 for cfg in select i.* from public.central_integrations i where daily_checks and coalesce(next_check_at,now())<=now() and source_id in('rfb','fgts','cndt') for update skip locked loop
  if private.central_profile_hash(cfg.company_id) is not null then
   tr:=case when cfg.source_id='rfb' and cfg.enabled and cfg.api_enabled and cfg.daily_api_authorized and cfg.verified_at is not null then 'serpro' else 'assistido' end;
   perform private.central_enqueue_connector(cfg.company_id,cfg.source_id,'consultar',tr,'daily','daily:'||cfg.source_id||':'||(now() at time zone 'America/Fortaleza')::date::text||':'||private.central_profile_hash(cfg.company_id),null);n:=n+1;
  end if;
  update public.central_integrations set next_check_at=now()+interval '1 day' where id=cfg.id;
 end loop;
 insert into public.central_connector_attempts(company_id,task_id,source_id,operation,outcome,reason,profile_hash)
 select company_id,id,source_id,operation,'uncertain','Execução interrompida. Confira no órgão antes de autorizar novo consumo.',profile_hash from public.central_connector_tasks where state='running' and lease_until<now();
 update public.central_connector_tasks set state='finished',updated_at=now() where state='running' and lease_until<now();return n;
end$$;
revoke all on function public.central_connector_daily() from public,anon,authenticated;
grant execute on function public.central_connector_daily() to service_role;
create index central_attempts_task_date on public.central_connector_attempts(task_id,company_id,created_at desc);

-- Somente leitura: nunca retorna comandos cron, documentos, CNPJ ou segredos.
create function public.central_monitoring_health(p_company_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare jobs jsonb:='{}';runs jsonb;homologated boolean:=false;net_ready boolean;vault_ready boolean:=false;j record;begin
 if not private.central_allowed(p_company_id,'read') then raise exception 'Sem acesso ao monitoramento desta empresa';end if;
 if to_regclass('cron.job') is not null and to_regclass('cron.job_run_details') is not null then
  for j in select jobid,jobname,active from cron.job where jobname in('inova-central-official-daily','inova-central-official-dispatch') loop
   jobs:=jobs||jsonb_build_object(case when j.jobname='inova-central-official-dispatch' then 'dispatcher' else 'daily' end,
    jsonb_build_object('enabled',j.active,'last_status',(select status from cron.job_run_details where jobid=j.jobid order by start_time desc nulls last,runid desc limit 1),
     'last_started_at',(select start_time from cron.job_run_details where jobid=j.jobid order by start_time desc nulls last,runid desc limit 1),
     'last_finished_at',(select end_time from cron.job_run_details where jobid=j.jobid order by start_time desc nulls last,runid desc limit 1)));
  end loop;
 end if;
 select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) into runs from(
  select distinct on(t.source_id) t.source_id,t.id task_id,a.id attempt_id,t.updated_at finished_at,a.outcome
  from public.central_connector_tasks t join public.central_connector_attempts a on a.task_id=t.id and a.company_id=t.company_id and a.source_id=t.source_id
  where t.company_id=p_company_id and t.origin='daily' and t.state='finished'
  order by t.source_id,t.updated_at desc,a.created_at desc,a.id desc
 )r;
 select exists(select 1 from public.central_integrations i join public.central_connector_artifacts a on a.company_id=i.company_id and a.source_id=i.source_id
  join public.central_connector_attempts att on att.company_id=a.company_id and att.task_id=a.task_id and att.source_id=a.source_id and att.outcome in('official_found','official_issued')
  where i.company_id=p_company_id and i.source_id='rfb' and i.verified_at is not null and i.last_official_at is not null
   and a.profile_hash=private.central_profile_hash(p_company_id) and exists(select 1 from storage.objects o where o.bucket_id='qualification-files' and o.name=a.storage_path)) into homologated;
 select exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='net' and p.proname='http_post') into net_ready;
 if to_regclass('vault.secrets') is not null then
  execute 'select count(distinct name)=2 from vault.secrets where name in ($1,$2)' into vault_ready using 'inova_central_official_worker_url','inova_central_official_worker_jwt';
 end if;
 return jsonb_build_object('available',true,'checked_at',now(),'jobs',jobs,'last_internal_runs',runs,'serpro',jsonb_build_object('homologated',homologated),
  'automatic_transport_ready',net_ready and vault_ready and coalesce((jobs->'dispatcher'->>'enabled')::boolean,false));
end$$;
revoke all on function public.central_monitoring_health(uuid) from public,anon;
grant execute on function public.central_monitoring_health(uuid) to authenticated;

-- Falha do scanner interno deve falhar o job; erros do transporte continuam sanitizados.
create or replace function private.central_dispatch_official_worker() returns bigint language plpgsql security definer set search_path='' as $$
declare endpoint text;credential text;request_id bigint;begin
 perform public.central_connector_daily();
 begin
 if not exists(select 1 from public.central_connector_tasks where state='queued' and transport='serpro' and available_at<=now() and attempts<3) then return null;end if;
 if to_regclass('vault.decrypted_secrets') is not null and to_regnamespace('net') is not null then
  execute 'select decrypted_secret from vault.decrypted_secrets where name=$1 limit 1' into endpoint using 'inova_central_official_worker_url';
  execute 'select decrypted_secret from vault.decrypted_secrets where name=$1 limit 1' into credential using 'inova_central_official_worker_jwt';
 end if;
 if endpoint is null or endpoint!~'^https://[a-z0-9]+\.supabase\.co/functions/v1/document-center-official$' or coalesce(length(credential),0)<32 then
  update public.central_integrations i set status='configuration_required',last_error='Worker agendado não configurado: configure Vault e pg_net no servidor. Nenhuma consulta oficial foi executada.'
   where exists(select 1 from public.central_connector_tasks t where t.company_id=i.company_id and t.source_id=i.source_id and t.transport='serpro' and t.state='queued');
  return null;
 end if;
 -- Cabeçalhos nunca vão para cron.job nem para tabelas públicas. Vault é administrado fora do frontend.
 execute 'select net.http_post(url:=$1,headers:=$2,body:=$3,timeout_milliseconds:=55000)'
  into request_id using endpoint,jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||credential),jsonb_build_object('worker',true);
 return request_id;
exception when others then
 update public.central_integrations i set status='configuration_required',last_error='Dispatcher indisponível. Revise a configuração do servidor; nenhum resultado oficial foi confirmado.'
  where exists(select 1 from public.central_connector_tasks t where t.company_id=i.company_id and t.source_id=i.source_id and t.transport='serpro' and t.state='queued');
 return null;
 end;
end$$;
revoke all on function private.central_dispatch_official_worker() from public,anon,authenticated;
grant execute on function private.central_dispatch_official_worker() to service_role;
