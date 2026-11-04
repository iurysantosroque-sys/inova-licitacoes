-- Etapa 2: somente estruturas aditivas; nenhuma certidão anterior é atualizada/apagada.
alter table public.central_integrations add column daily_checks boolean not null default false,
 add column api_enabled boolean not null default false,add column daily_api_authorized boolean not null default false,
 add column billable_authorized_by uuid references auth.users(id),add column billable_authorized_at timestamptz,
 add column last_attempt_at timestamptz,add column last_official_at timestamptz,add column next_check_at timestamptz,
 add column status text not null default 'configuration_required',add column last_error text,
 add constraint central_api_authority check(not api_enabled or (source_id='rfb' and coalesce(length(trim(authorization_reference)),0)>=12 and billable_authorized_by is not null and billable_authorized_at is not null)),
 add constraint central_daily_api_authority check(not daily_api_authorized or api_enabled);
create table public.central_connector_tasks(
 id uuid primary key default gen_random_uuid(),company_id uuid not null references public.companies(id),source_id text not null references public.central_official_sources(id),
 operation text not null check(operation in('consultar','emitir','validar')),transport text not null check(transport in('assistido','serpro')),
 origin text not null check(origin in('user','daily')),state text not null default 'queued' check(state in('queued','running','finished')),
 profile_hash text not null,profile_confirmed_at timestamptz not null,idempotency_key text not null,
 attempts integer not null default 0 check(attempts between 0 and 3),available_at timestamptz not null default now(),lease_until timestamptz,lease_token uuid,
 actor_id uuid references auth.users(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 unique(company_id,idempotency_key),unique(id,company_id)
);
create unique index central_connector_one_active on public.central_connector_tasks(company_id,source_id) where state in('queued','running');
create index central_connector_due on public.central_connector_tasks(available_at) where state='queued';
create table public.central_connector_attempts(
 id uuid primary key default gen_random_uuid(),company_id uuid not null references public.companies(id),task_id uuid not null,source_id text not null references public.central_official_sources(id),
 operation text not null,outcome text not null check(outcome in('intervention_required','configuration_required','official_found','official_issued','not_issued','failed','profile_changed','uncertain','retry')),
 reason text not null check(length(reason)<=2000),profile_hash text not null,actor_id uuid references auth.users(id),created_at timestamptz not null default now(),
 foreign key(task_id,company_id) references public.central_connector_tasks(id,company_id)
);
create index central_connector_attempts_company_date on public.central_connector_attempts(company_id,created_at desc);
create table public.central_connector_artifacts(
 id uuid primary key default gen_random_uuid(),company_id uuid not null references public.companies(id),task_id uuid not null,source_id text not null references public.central_official_sources(id),
 profile_hash text not null,series_id uuid not null,taxpayer text not null,control_code text not null,issued_on date not null,expires_on date not null check(expires_on>=issued_on),
 sha256 text not null check(sha256~'^[0-9a-f]{64}$'),storage_path text not null,file_size bigint not null check(file_size between 8 and 26214400),
 certificate_type integer not null check(certificate_type in(1,2)),provider_outcome text not null check(provider_outcome in('official_found','official_issued')),
 version_id uuid,confirmed_by uuid references auth.users(id),confirmed_at timestamptz,created_at timestamptz not null default now(),
 unique(company_id,source_id,taxpayer,control_code,sha256),foreign key(task_id,company_id) references public.central_connector_tasks(id,company_id),
 foreign key(version_id,company_id) references public.qualification_documents(id,company_id)
);
create index central_connector_artifacts_company on public.central_connector_artifacts(company_id,created_at desc);
create index central_connector_artifacts_version on public.central_connector_artifacts(version_id);
do $$declare t text;begin foreach t in array array['central_connector_tasks','central_connector_attempts','central_connector_artifacts'] loop
 execute format('alter table public.%I enable row level security',t);execute format('revoke all on public.%I from public,anon,authenticated',t);
 execute format('grant select on public.%I to authenticated',t);execute format('grant all on public.%I to service_role',t);
 execute format('create policy central_connector_read on public.%I for select to authenticated using(private.is_company_member(company_id))',t);
end loop;end$$;
create trigger central_connector_attempts_immutable before update or delete on public.central_connector_attempts for each row execute function private.central_immutable();
create policy central_candidate_download on storage.objects for select to authenticated using(bucket_id='qualification-files' and exists(select 1 from public.central_connector_artifacts a where a.storage_path=storage.objects.name and private.is_company_member(a.company_id)));
create policy central_candidate_retained on storage.objects as restrictive for delete to authenticated using(bucket_id<>'qualification-files' or not exists(select 1 from public.central_connector_artifacts a where a.storage_path=storage.objects.name));
create function private.central_profile_hash(c uuid) returns text language sql stable security definer set search_path='' as $$
 select encode(extensions.digest(convert_to(company_id::text||':'||cnpj||':'||extract(epoch from confirmed_at)::text,'UTF8'),'sha256'),'hex') from public.central_company_profiles where company_id=c
$$;
revoke all on function private.central_profile_hash(uuid) from public,anon,authenticated;
create function public.central_configure_connector(p_company_id uuid,p_source_id text,p_daily_checks boolean,p_api_enabled boolean default false,p_daily_api_authorized boolean default false,p_authorization_reference text default null,p_billable_confirmed boolean default false) returns void language plpgsql security definer set search_path='' as $$begin
 if not private.is_company_admin(p_company_id) or p_source_id not in('rfb','fgts','cndt') then raise exception 'Configuração não autorizada';end if;
 if private.central_profile_hash(p_company_id) is null then raise exception 'Confirme o cadastro real da empresa';end if;
 if p_api_enabled and (p_source_id<>'rfb' or p_billable_confirmed is distinct from true or length(trim(coalesce(p_authorization_reference,'')))<12) then raise exception 'Contrato e autorização expressa de consumo e emissão são obrigatórios';end if;
 if p_daily_api_authorized and not p_api_enabled then raise exception 'API não autorizada';end if;
 insert into public.central_integrations(company_id,source_id,daily_checks,enabled,api_enabled,daily_api_authorized,authorization_reference,billable_authorized_by,billable_authorized_at,next_check_at,status)
 values(p_company_id,p_source_id,p_daily_checks,true,p_api_enabled,p_daily_api_authorized,nullif(trim(p_authorization_reference),''),case when p_api_enabled then auth.uid() end,case when p_api_enabled then now() end,case when p_daily_checks then now() end,'configuration_required')
 on conflict(company_id,source_id) do update set daily_checks=excluded.daily_checks,enabled=true,api_enabled=excluded.api_enabled,daily_api_authorized=excluded.daily_api_authorized,authorization_reference=excluded.authorization_reference,billable_authorized_by=excluded.billable_authorized_by,billable_authorized_at=excluded.billable_authorized_at,next_check_at=excluded.next_check_at,status='configuration_required',verified_at=null;
 perform private.central_audit(p_company_id,'integration',p_source_id,'Conector configurado',jsonb_build_object('daily_checks',p_daily_checks,'api_authorized',p_api_enabled,'daily_api_authorized',p_daily_api_authorized));
end$$;
create function private.central_enqueue_connector(c uuid,s text,op text,tr text,origin text,dedup text,actor uuid) returns uuid language plpgsql security definer set search_path='' as $$declare task public.central_connector_tasks;h text;reason text;begin
 h:=private.central_profile_hash(c);if h is null then raise exception 'Cadastro confirmado obrigatório';end if;
 insert into public.central_connector_tasks(company_id,source_id,operation,transport,origin,profile_hash,profile_confirmed_at,idempotency_key,actor_id)
 select c,s,op,tr,origin,h,confirmed_at,dedup,actor from public.central_company_profiles where company_id=c on conflict do nothing returning * into task;
 if task.id is null then select * into task from public.central_connector_tasks where company_id=c and (idempotency_key=dedup or (source_id=s and state in('queued','running'))) order by created_at desc limit 1;return task.id;end if;
 if tr='assistido' then
  reason:=case s when 'fgts' then 'Consulta/renovação no portal CAIXA; CAPTCHA ou convênio exigem intervenção. Renovação usual somente nos cinco dias anteriores ao vencimento.' when 'cndt' then 'Emissão com desafio visual e validação assistida no portal TST. Nenhuma chamada externa automatizada foi realizada.' else 'Abra o portal RFB/PGFN e confira o resultado. API Serpro depende de contrato, segredos e autorização específica.' end;
  insert into public.central_connector_attempts(company_id,task_id,source_id,operation,outcome,reason,profile_hash,actor_id) values(c,task.id,s,op,'intervention_required',reason,h,actor);
  update public.central_connector_tasks set state='finished',updated_at=now() where id=task.id;
  update public.central_integrations set last_attempt_at=now(),status='intervention_required',last_error=reason where company_id=c and source_id=s;
 end if;
 perform private.central_audit(c,'connector',task.id::text,'Operação documental solicitada',jsonb_build_object('source',s,'operation',op,'transport',tr,'origin',origin));return task.id;
end$$;
revoke all on function private.central_enqueue_connector(uuid,text,text,text,text,text,uuid) from public,anon,authenticated;
create function public.central_request_connector(p_company_id uuid,p_source_id text,p_operation text,p_transport text default 'assistido',p_billable_confirmed boolean default false) returns uuid language plpgsql security definer set search_path='' as $$declare h text;cfg public.central_integrations;begin
 if not private.central_allowed(p_company_id,'write') or p_source_id not in('rfb','fgts','cndt') or p_operation not in('consultar','emitir','validar') or p_transport not in('assistido','serpro') then raise exception 'Operação não autorizada';end if;
 h:=private.central_profile_hash(p_company_id);if h is null then raise exception 'Confirme o cadastro real da empresa';end if;
 insert into public.central_integrations(company_id,source_id) values(p_company_id,p_source_id) on conflict do nothing;
 select * into cfg from public.central_integrations where company_id=p_company_id and source_id=p_source_id for update;
 if p_transport='serpro' and (p_source_id<>'rfb' or p_operation='validar' or not cfg.api_enabled or p_billable_confirmed is distinct from true) then raise exception 'API/consumo/emissão não autorizados';end if;
 return private.central_enqueue_connector(p_company_id,p_source_id,p_operation,p_transport,'user',p_source_id||':'||p_operation||':'||p_transport||':'||h||':'||floor(extract(epoch from now())/300)::text,auth.uid());
end$$;
-- Função interna diária: sem rede para portais assistidos; a API precisa de worker configurado.
create function public.central_connector_daily() returns integer language plpgsql security definer set search_path='' as $$declare cfg record;tr text;n int:=0;begin
 for cfg in select i.* from public.central_integrations i where enabled and daily_checks and coalesce(next_check_at,now())<=now() and source_id in('rfb','fgts','cndt') for update skip locked loop
  if private.central_profile_hash(cfg.company_id) is not null then
   tr:=case when cfg.source_id='rfb' and cfg.api_enabled and cfg.daily_api_authorized and cfg.verified_at is not null then 'serpro' else 'assistido' end;
   perform private.central_enqueue_connector(cfg.company_id,cfg.source_id,'consultar',tr,'daily','daily:'||cfg.source_id||':'||(now() at time zone 'America/Fortaleza')::date::text||':'||private.central_profile_hash(cfg.company_id),null);n:=n+1;
  end if;
  update public.central_integrations set next_check_at=now()+interval '1 day' where id=cfg.id;
 end loop;
 -- Um lease abandonado pode ter consumido API/emitido documento. Não repetir cegamente.
 insert into public.central_connector_attempts(company_id,task_id,source_id,operation,outcome,reason,profile_hash)
 select company_id,id,source_id,operation,'uncertain','Execução interrompida. Confira no órgão antes de autorizar novo consumo.',profile_hash from public.central_connector_tasks where state='running' and lease_until<now();
 update public.central_connector_tasks set state='finished',updated_at=now() where state='running' and lease_until<now();return n;
end$$;
create function public.central_claim_connector(p_task_id uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$declare t public.central_connector_tasks;p public.central_company_profiles;i public.central_integrations;begin
 select * into t from public.central_connector_tasks where state='queued' and available_at<=now() and attempts<3 and (p_task_id is null or id=p_task_id) order by available_at for update skip locked limit 1;
 if t.id is null then return null;end if;
 update public.central_connector_tasks set state='running',attempts=attempts+1,lease_until=now()+interval '90 seconds',lease_token=gen_random_uuid(),updated_at=now() where id=t.id returning * into t;
 select * into p from public.central_company_profiles where company_id=t.company_id;select * into i from public.central_integrations where company_id=t.company_id and source_id=t.source_id;
 return jsonb_build_object('task',to_jsonb(t),'profile',to_jsonb(p),'integration',to_jsonb(i),'profile_current',t.profile_hash=private.central_profile_hash(t.company_id),'authorized',
  i.enabled and i.api_enabled and exists(select 1 from public.company_members m where m.company_id=t.company_id and m.user_id=i.billable_authorized_by and m.role='admin')
  and ((t.origin='daily' and i.daily_checks and i.daily_api_authorized and i.verified_at is not null) or (t.origin='user' and exists(select 1 from public.company_members m left join public.central_permissions cp on cp.company_id=m.company_id and cp.user_id=m.user_id where m.company_id=t.company_id and m.user_id=t.actor_id and (m.role='admin' or cp.role in('editor','reviewer'))))));
end$$;
create function public.central_finish_connector(p_task_id uuid,p_lease_token uuid,p_outcome text,p_reason text,p_artifact jsonb default null) returns uuid language plpgsql security definer set search_path='' as $$declare t public.central_connector_tasks;a uuid;begin
 select * into t from public.central_connector_tasks where id=p_task_id and state='running' and lease_token=p_lease_token and lease_until>=now() for update;
 if t.id is null then raise exception 'Lease indisponível';end if;
 if p_outcome not in('configuration_required','official_found','official_issued','not_issued','failed','profile_changed','uncertain','retry') or length(coalesce(p_reason,''))>2000 then raise exception 'Resultado inválido';end if;
 if t.profile_hash is distinct from private.central_profile_hash(t.company_id) then p_outcome:='profile_changed';p_artifact:=null;p_reason:='Cadastro alterado durante a operação; nenhuma versão foi promovida.';end if;
 if p_outcome in('official_found','official_issued') then
  if p_artifact is null or t.source_id<>'rfb' or p_artifact->>'taxpayer' is distinct from (select cnpj from public.central_company_profiles where company_id=t.company_id) or p_artifact->>'sha256'!~'^[0-9a-f]{64}$' or length(trim(coalesce(p_artifact->>'control_code','')))=0 or not exists(select 1 from storage.objects where bucket_id='qualification-files' and name=p_artifact->>'storage_path') or split_part(p_artifact->>'storage_path','/',1)<>t.company_id::text then raise exception 'PDF oficial e metadados verificáveis obrigatórios';end if;
  if split_part(p_artifact->>'storage_path','/',2) is distinct from p_artifact->>'series_id' then raise exception 'Série do PDF incompatível';end if;
  insert into public.central_connector_artifacts(company_id,task_id,source_id,profile_hash,series_id,taxpayer,control_code,issued_on,expires_on,sha256,storage_path,file_size,certificate_type,provider_outcome)
  values(t.company_id,t.id,t.source_id,t.profile_hash,(p_artifact->>'series_id')::uuid,p_artifact->>'taxpayer',p_artifact->>'control_code',(p_artifact->>'issued_on')::date,(p_artifact->>'expires_on')::date,p_artifact->>'sha256',p_artifact->>'storage_path',(p_artifact->>'file_size')::bigint,(p_artifact->>'certificate_type')::integer,p_outcome)
  on conflict(company_id,source_id,taxpayer,control_code,sha256) do nothing returning id into a;
  update public.central_integrations set last_official_at=now(),verified_at=now() where company_id=t.company_id and source_id=t.source_id;
 end if;
 insert into public.central_connector_attempts(company_id,task_id,source_id,operation,outcome,reason,profile_hash,actor_id) values(t.company_id,t.id,t.source_id,t.operation,p_outcome,coalesce(p_reason,''),t.profile_hash,t.actor_id);
 update public.central_connector_tasks set state=case when p_outcome='retry' and attempts<3 then 'queued' else 'finished' end,available_at=now()+make_interval(secs=>least(3600,60*power(2,attempts)::int)),lease_token=null,lease_until=null,updated_at=now() where id=t.id;
 update public.central_integrations set last_attempt_at=now(),status=p_outcome,last_error=case when p_outcome in('official_found','official_issued') then null else p_reason end where company_id=t.company_id and source_id=t.source_id;
 perform private.central_audit(t.company_id,'connector',t.id::text,'Tentativa documental registrada',jsonb_build_object('source',t.source_id,'outcome',p_outcome,'artifact_id',a));return a;
end$$;
create function public.central_confirm_official_artifact(p_company_id uuid,p_artifact_id uuid,p_series_id uuid,p_expected_version integer,p_confirmed boolean) returns jsonb language plpgsql security definer set search_path='' as $$declare a public.central_connector_artifacts;v jsonb;begin
 if not private.central_allowed(p_company_id,'review') or p_confirmed is distinct from true then raise exception 'Conferência humana de titular, tipo, código e datas obrigatória';end if;
 select * into a from public.central_connector_artifacts where id=p_artifact_id and company_id=p_company_id for update;
 if a.id is null or a.profile_hash is distinct from private.central_profile_hash(p_company_id) then raise exception 'Cadastro/documento mudou. Consulte novamente';end if;
 if p_series_id is distinct from a.series_id then raise exception 'Use a série privada vinculada ao PDF recebido';end if;
 if a.version_id is not null then return (select to_jsonb(q) from public.qualification_documents q where id=a.version_id and company_id=p_company_id);end if;
 if exists(select 1 from public.qualification_documents q where company_id=p_company_id and sha256=a.sha256 and document_number=a.control_code and central_type_id='rfb-pgfn') then raise exception 'Esta certidão oficial já está no acervo';end if;
 if exists(select 1 from public.central_documents d where d.id=p_series_id and (d.company_id<>p_company_id or d.type_id is distinct from 'rfb-pgfn')) then raise exception 'Série incompatível';end if;
 v:=public.central_register_version(p_company_id,p_series_id,p_expected_version,jsonb_build_object('id',gen_random_uuid(),'name','Certidão RFB / PGFN','issuer','Receita Federal / PGFN','central_type_id','rfb-pgfn','document_type','RFB / PGFN','document_number',a.control_code,'issued_on',a.issued_on,'expires_on',a.expires_on,'file_name','certidao-rfb-pgfn.pdf','file_size',a.file_size,'storage_path',a.storage_path,'sha256',a.sha256,'confirmed',true));
 update public.central_connector_artifacts set version_id=(v->>'id')::uuid,confirmed_by=auth.uid(),confirmed_at=now() where id=a.id;
 perform private.central_audit(p_company_id,'certificate',v->>'id','PDF oficial confirmado por responsável',jsonb_build_object('artifact_id',a.id,'provider_outcome',a.provider_outcome));return v;
end$$;
-- Corrige conferência humana por fonte incompatível com o tipo documental.
create or replace function public.central_validate_version(p_company_id uuid,p_version_id uuid,p_source_id text,p_state text,p_proof text) returns void language plpgsql security definer set search_path='' as $$declare expected text;begin
 if not private.central_allowed(p_company_id,'review') or p_state not in('manual_confirmed','inconclusive','rejected') then raise exception 'Conferência humana não autorizada';end if;
 select t.source_id into expected from public.qualification_documents q join public.central_document_types t on t.id=q.central_type_id where q.id=p_version_id and q.company_id=p_company_id;
 if expected is null or expected='regional' or expected is distinct from p_source_id then raise exception 'Fonte incompatível com a versão documental';end if;
 insert into public.central_validations(company_id,version_id,source_id,state,proof,checked_by) values(p_company_id,p_version_id,p_source_id,p_state,p_proof,auth.uid());perform private.central_audit(p_company_id,'validation',p_version_id::text,'Conferência humana registrada');
end$$;
revoke all on function public.central_configure_connector(uuid,text,boolean,boolean,boolean,text,boolean),public.central_request_connector(uuid,text,text,text,boolean),public.central_confirm_official_artifact(uuid,uuid,uuid,integer,boolean) from public,anon;
grant execute on function public.central_configure_connector(uuid,text,boolean,boolean,boolean,text,boolean),public.central_request_connector(uuid,text,text,text,boolean),public.central_confirm_official_artifact(uuid,uuid,uuid,integer,boolean) to authenticated;
revoke all on function public.central_connector_daily(),public.central_claim_connector(uuid),public.central_finish_connector(uuid,uuid,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.central_connector_daily(),public.central_claim_connector(uuid),public.central_finish_connector(uuid,uuid,text,text,jsonb) to service_role;
-- Ativação do cron em script separado, após autorização de migração/publicação.
-- Dispatcher opcional. Sem Vault/pg_net configurados, preserva a fila e explicita o impedimento.
create function private.central_dispatch_official_worker() returns bigint language plpgsql security definer set search_path='' as $$
declare endpoint text;credential text;request_id bigint;begin
 perform public.central_connector_daily();
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
end$$;
revoke all on function private.central_dispatch_official_worker() from public,anon,authenticated;
grant execute on function private.central_dispatch_official_worker() to service_role;
