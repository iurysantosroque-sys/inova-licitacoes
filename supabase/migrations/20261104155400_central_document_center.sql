-- Central documental aditiva. Não remove tabelas, arquivos ou registros existentes.
create table public.central_company_profiles (
 company_id uuid primary key references public.companies(id), name text not null,
 cnpj text not null check(cnpj ~ '^[A-Z0-9]{12}[0-9]{2}$'), address text not null, city text not null,
 state text not null check(state ~ '^[A-Z]{2}$'), email text, retention_days integer not null default 1825 check(retention_days>=365),
 confirmed_by uuid not null references auth.users(id), confirmed_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.central_legal_representatives (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id),
 name text not null check(length(trim(name)) between 2 and 180), position text not null, email text,
 confirmed_by uuid not null references auth.users(id), confirmed_at timestamptz not null default now(), created_at timestamptz not null default now(), unique(id,company_id)
);
create table public.central_permissions (
 company_id uuid not null, user_id uuid not null, role text not null check(role in ('viewer','editor','reviewer')),
 created_at timestamptz not null default now(), primary key(company_id,user_id),
 foreign key(company_id,user_id) references public.company_members(company_id,user_id)
);
create function private.central_allowed(c uuid, action text default 'write') returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.company_members m left join public.central_permissions p on p.company_id=m.company_id and p.user_id=m.user_id where m.company_id=c and m.user_id=auth.uid() and (m.role='admin' or (action='read') or (action='write' and p.role in ('editor','reviewer')) or (action='review' and p.role='reviewer')))
$$;
revoke all on function private.central_allowed(uuid,text) from public,anon;
grant execute on function private.central_allowed(uuid,text) to authenticated;
create function public.central_can(p_company_id uuid,p_action text default 'write') returns boolean language sql stable security invoker set search_path='' as $$select private.central_allowed(p_company_id,p_action)$$;
revoke all on function public.central_can(uuid,text) from public,anon;
grant execute on function public.central_can(uuid,text) to authenticated;
create table public.central_document_types(id text primary key,name text not null,source_id text,created_at timestamptz not null default now());
insert into public.central_document_types(id,name,source_id) values ('rfb-pgfn','RFB / PGFN','rfb'),('fgts','FGTS / CRF','fgts'),('cndt','CNDT','cndt'),('estadual','Fazenda estadual','regional'),('municipal','Fazenda municipal','regional'),('falencia','Falência / recuperação judicial','regional'),('tcu','Consultas TCU','tcu'),('outro','Outro documento de habilitação','regional');
create table public.central_official_sources(id text primary key,name text not null,url text not null,documentation_url text,reviewed_at timestamptz not null default now());
insert into public.central_official_sources(id,name,url) values
 ('rfb','RFB / PGFN','https://www.gov.br/pt-br/servicos/emitir-certidao-de-regularidade-fiscal'),
 ('fgts','CAIXA FGTS / CRF','https://consulta-crf.caixa.gov.br/consultacrf/pages/consultaEmpregador.jsf'),
 ('cndt','TST CNDT','https://cndt-certidao.tst.jus.br/'),('tcu','TCU','https://certidoes-apf.apps.tcu.gov.br/');
create table public.central_documents (
 id uuid primary key,company_id uuid not null references public.companies(id),type_id text references public.central_document_types(id),
 responsible_user_id uuid,created_at timestamptz not null default now(),unique(id,company_id),
 foreign key(company_id,responsible_user_id) references public.company_members(company_id,user_id)
);
alter table public.qualification_documents add column sha256 text check(sha256 is null or sha256 ~ '^[0-9a-f]{64}$'),
 add column metadata_confirmed_by uuid references auth.users(id),add column metadata_confirmed_at timestamptz,
 add column central_type_id text references public.central_document_types(id);
insert into public.central_documents(id,company_id) select distinct document_series_id,company_id from public.qualification_documents on conflict(id) do nothing;
create table public.central_validations (
 id uuid primary key default gen_random_uuid(),company_id uuid not null references public.companies(id), version_id uuid not null,
 source_id text not null references public.central_official_sources(id),state text not null check(state in ('manual_confirmed','inconclusive','rejected')),
 proof text not null check(length(trim(proof)) between 12 and 4000),checked_by uuid not null references auth.users(id),checked_at timestamptz not null default now(),
 foreign key(version_id,company_id) references public.qualification_documents(id,company_id)
);
create table public.central_integrations (
 id uuid primary key default gen_random_uuid(),company_id uuid not null references public.companies(id),source_id text not null references public.central_official_sources(id),
 mode text not null default 'ASSISTIDO' check(mode in ('MANUAL','ASSISTIDO','AUTOMATICO_AUTORIZADO')),
 enabled boolean not null default false,authorization_reference text,verified_at timestamptz,created_at timestamptz not null default now(),
 check(mode<>'AUTOMATICO_AUTORIZADO' or (enabled=false)),unique(company_id,source_id)
);
create table public.central_issuance_attempts (
 id uuid primary key default gen_random_uuid(),company_id uuid not null references public.companies(id),document_id uuid not null,
 state text not null check(state in ('intervention','failed','completed')),reason text not null,actor_id uuid not null references auth.users(id),created_at timestamptz not null default now(),
 foreign key(document_id,company_id) references public.central_documents(id,company_id)
);
create table public.central_declaration_templates (
 id uuid primary key default gen_random_uuid(),company_id uuid not null references public.companies(id),name text not null,
 body text not null check(length(body) between 10 and 50000),version integer not null default 1 check(version>0),
 previous_id uuid,created_by uuid not null references auth.users(id),created_at timestamptz not null default now(),unique(id,company_id),
 foreign key(previous_id,company_id) references public.central_declaration_templates(id,company_id)
);
create table public.central_generated_declarations (
 id uuid primary key default gen_random_uuid(),company_id uuid not null references public.companies(id),tender_id uuid,
 title text not null,text text not null check(length(text) between 1 and 100000),model_id text not null,model_version integer not null default 1,
 revision integer not null default 1,sha256 text not null check(sha256 ~ '^[0-9a-f]{64}$'),state text not null default 'draft' check(state in ('draft','approved')),
 representative_id uuid not null,created_by uuid not null references auth.users(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(id,company_id),
 foreign key(tender_id,company_id) references public.tenders(id,company_id),foreign key(representative_id,company_id) references public.central_legal_representatives(id,company_id)
);
create table public.central_reviews (
 id uuid primary key default gen_random_uuid(),company_id uuid not null references public.companies(id),declaration_id uuid not null,
 revision integer not null,sha256 text not null,responsible_name text not null,approved_by uuid not null references auth.users(id),approved_at timestamptz not null default now(),
 foreign key(declaration_id,company_id) references public.central_generated_declarations(id,company_id),unique(declaration_id,revision)
);
create table public.central_declaration_versions (
 id uuid primary key default gen_random_uuid(),company_id uuid not null references public.companies(id),declaration_id uuid not null,
 revision integer not null,snapshot jsonb not null,created_at timestamptz not null default now(),created_by uuid not null references auth.users(id),
 foreign key(declaration_id,company_id) references public.central_generated_declarations(id,company_id),unique(declaration_id,revision)
);
create table public.central_signature_requests (
 id uuid primary key default gen_random_uuid(),company_id uuid not null references public.companies(id),declaration_id uuid not null,
 revision integer not null,state text not null default 'configuration_required' check(state='configuration_required'),
 created_by uuid not null references auth.users(id),created_at timestamptz not null default now(),
 foreign key(declaration_id,company_id) references public.central_generated_declarations(id,company_id)
);
create table public.central_tender_requirements (
 id uuid primary key default gen_random_uuid(),company_id uuid not null references public.companies(id),tender_id uuid not null,
 title text not null,type_id text references public.central_document_types(id),relevant_date date not null,page integer not null check(page>0),clause text not null,
 quote text not null check(length(trim(quote))>=12),source_sha256 text check(source_sha256 is null or source_sha256 ~ '^[0-9a-f]{64}$'),
 confidence numeric check(confidence between 0 and 1),review_state text not null default 'pending' check(review_state in ('pending','confirmed','rejected')),
 responsible_user_id uuid,reviewed_by uuid references auth.users(id),reviewed_at timestamptz,created_by uuid not null references auth.users(id),created_at timestamptz not null default now(),unique(id,company_id),
 foreign key(tender_id,company_id) references public.tenders(id,company_id),foreign key(company_id,responsible_user_id) references public.company_members(company_id,user_id)
);
create table public.central_tender_documents (
 id uuid primary key default gen_random_uuid(),company_id uuid not null references public.companies(id),requirement_id uuid not null,version_id uuid not null,
 selected_by uuid not null references auth.users(id),created_at timestamptz not null default now(),unique(requirement_id),
 foreign key(requirement_id,company_id) references public.central_tender_requirements(id,company_id),foreign key(version_id,company_id) references public.qualification_documents(id,company_id)
);
create table public.central_packages (
 id uuid primary key default gen_random_uuid(),company_id uuid not null references public.companies(id),tender_id uuid not null,
 manifest jsonb not null,created_by uuid not null references auth.users(id),created_at timestamptz not null default now(),foreign key(tender_id,company_id) references public.tenders(id,company_id)
);
create table public.central_automation_rules (
 id uuid primary key default gen_random_uuid(),company_id uuid not null references public.companies(id),type_id text references public.central_document_types(id),
 name text not null,renew_before_days integer not null default 30 check(renew_before_days between 0 and 365),
 enabled boolean not null default true,created_by uuid not null references auth.users(id),created_at timestamptz not null default now(),unique(company_id,type_id)
);
create table public.central_automation_runs (
 id uuid primary key default gen_random_uuid(),company_id uuid not null references public.companies(id),kind text not null check(kind in ('expiry_scan','email')),
 idempotency_key text not null,state text not null default 'queued' check(state in ('queued','running','completed','failed','configuration_required')),
 attempts integer not null default 0 check(attempts between 0 and 8),available_at timestamptz not null default now(),lease_until timestamptz,
 lease_token uuid,payload jsonb not null default '{}',last_error text,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(company_id,idempotency_key)
);
create table public.central_notifications (
 id uuid primary key default gen_random_uuid(),company_id uuid not null references public.companies(id),version_id uuid not null,
 threshold integer not null check(threshold between 0 and 365),channel text not null default 'internal' check(channel in ('internal','email')),
 message text not null,read_at timestamptz,created_at timestamptz not null default now(),
 foreign key(version_id,company_id) references public.qualification_documents(id,company_id),unique(company_id,version_id,threshold,channel)
);
create table public.central_audit_log (
 id bigint generated always as identity primary key,company_id uuid not null references public.companies(id),entity text not null,
 entity_id text not null,action text not null,actor_id uuid references auth.users(id),details jsonb not null default '{}',created_at timestamptz not null default now()
);
-- Índices por empresa, consultas de fila e todas as chaves estrangeiras de uso frequente.
do $$declare t text;begin foreach t in array array['central_legal_representatives','central_documents','central_validations','central_integrations','central_issuance_attempts','central_declaration_templates','central_generated_declarations','central_declaration_versions','central_reviews','central_signature_requests','central_tender_requirements','central_tender_documents','central_packages','central_automation_rules','central_automation_runs','central_notifications','central_audit_log'] loop execute format('create index %I on public.%I(company_id)',t||'_company_idx',t);end loop;end$$;
create index central_validations_version_idx on public.central_validations(version_id,checked_at desc);
create index central_issuance_document_idx on public.central_issuance_attempts(document_id);
create index central_declarations_tender_idx on public.central_generated_declarations(tender_id);
create index central_declarations_representative_idx on public.central_generated_declarations(representative_id);
create index central_reviews_declaration_idx on public.central_reviews(declaration_id);
create index central_signatures_declaration_idx on public.central_signature_requests(declaration_id);
create index central_requirements_tender_idx on public.central_tender_requirements(tender_id);
create index central_links_version_idx on public.central_tender_documents(version_id);
create index central_packages_tender_idx on public.central_packages(tender_id);
create index central_queue_due_idx on public.central_automation_runs(available_at) where state in ('queued','running');
create index central_audit_company_date_idx on public.central_audit_log(company_id,created_at desc);
-- Clientes leem sob RLS; operações sensíveis passam por RPCs tipadas.
do $$declare t text;begin foreach t in array array['central_company_profiles','central_legal_representatives','central_permissions','central_documents','central_validations','central_integrations','central_issuance_attempts','central_declaration_templates','central_generated_declarations','central_declaration_versions','central_reviews','central_signature_requests','central_tender_requirements','central_tender_documents','central_packages','central_automation_rules','central_automation_runs','central_notifications','central_audit_log'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon, authenticated',t);
 execute format('grant select on public.%I to authenticated',t);
 execute format('create policy central_read on public.%I for select to authenticated using (private.is_company_member(company_id))',t);
end loop;
foreach t in array array['central_document_types','central_official_sources'] loop execute format('alter table public.%I enable row level security',t);execute format('revoke all on public.%I from anon, authenticated',t);execute format('grant select on public.%I to authenticated',t);execute format('create policy central_catalog_read on public.%I for select to authenticated using (true)',t);end loop;end$$;
create function private.central_audit(c uuid,entity text,id text,action text,details jsonb default '{}') returns void language sql security definer set search_path='' as $$insert into public.central_audit_log(company_id,entity,entity_id,action,actor_id,details) values(c,entity,id,action,auth.uid(),details)$$;
revoke all on function private.central_audit(uuid,text,text,text,jsonb) from public,anon,authenticated;
create function private.central_cnpj_valid(value text) returns boolean language plpgsql immutable set search_path='' as $$declare d text:=regexp_replace(upper(value),'[./\s-]','','g'); s int;w int;r int;i int;j int;begin if d is null or d!~'^[A-Z0-9]{12}[0-9]{2}$' or d~'^(.)\1+$' then return false;end if;for j in 12..13 loop s:=0;w:=j-7;for i in 1..j loop s:=s+(ascii(substr(d,i,1))-48)*w;w:=w-1;if w=1 then w:=9;end if;end loop;r:=s%11;if r<2 then r:=0;else r:=11-r;end if;if r<>substr(d,j+1,1)::int then return false;end if;end loop;return true;end$$;
revoke all on function private.central_cnpj_valid(text) from public,anon,authenticated;
create function public.central_save_profile(p_company_id uuid,p_data jsonb) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.is_company_admin(p_company_id) then raise exception 'Apenas administradores confirmam o cadastro';end if;
 if not private.central_cnpj_valid(p_data->>'cnpj') or length(trim(coalesce(p_data->>'name','')))<2 or length(trim(coalesce(p_data->>'address','')))<3 or length(trim(coalesce(p_data->>'city','')))<2 or coalesce(p_data->>'state','')!~'^[A-Z]{2}$' then raise exception 'Cadastro inválido';end if;
 insert into public.central_company_profiles(company_id,name,cnpj,address,city,state,email,confirmed_by)
 values(p_company_id,p_data->>'name',regexp_replace(upper(p_data->>'cnpj'),'[./\s-]','','g'),p_data->>'address',p_data->>'city',p_data->>'state',p_data->>'email',auth.uid())
 on conflict(company_id) do update set name=excluded.name,cnpj=excluded.cnpj,address=excluded.address,city=excluded.city,state=excluded.state,email=excluded.email,confirmed_by=auth.uid(),confirmed_at=now(),updated_at=now();
 if length(trim(coalesce(p_data->>'representative_name','')))<2 or length(trim(coalesce(p_data->>'representative_position','')))<2 then raise exception 'Confirme nome e cargo do representante';end if;
 insert into public.central_legal_representatives(company_id,name,position,email,confirmed_by) values(p_company_id,p_data->>'representative_name',p_data->>'representative_position',p_data->>'representative_email',auth.uid());
 perform private.central_audit(p_company_id,'profile',p_company_id::text,'Cadastro confirmado');
end$$;
create function public.central_register_version(p_company_id uuid,p_series_id uuid,p_expected_version integer,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare v public.qualification_documents;last_version int;begin
 if not private.central_allowed(p_company_id,'write') then raise exception 'Sem permissão';end if;
 insert into public.central_documents(id,company_id,type_id) values(p_series_id,p_company_id,p_data->>'central_type_id') on conflict(id) do nothing;
 perform 1 from public.central_documents where id=p_series_id and company_id=p_company_id for update;if not found then raise exception 'Série indisponível';end if;
 select coalesce(max(version),0) into last_version from public.qualification_documents where document_series_id=p_series_id and company_id=p_company_id;
 if last_version is distinct from p_expected_version then raise exception 'Outra versão foi cadastrada. Atualize a lista.' using errcode='40001';end if;
 if coalesce(p_data->>'confirmed','false')<>'true' or coalesce(p_data->>'sha256','')!~'^[0-9a-f]{64}$' then raise exception 'Confirme os metadados e hash do PDF';end if;
 if not exists(select 1 from storage.objects where bucket_id='qualification-files' and name=p_data->>'storage_path') then raise exception 'PDF privado ainda não foi recebido';end if;
 insert into public.qualification_documents(id,company_id,tender_id,document_series_id,version,document_type,name,issuer,document_number,issued_on,expires_on,has_no_expiry,coverage,notes,file_name,mime_type,file_size,storage_path,created_by,sha256,metadata_confirmed_by,metadata_confirmed_at,central_type_id)
 values((p_data->>'id')::uuid,p_company_id,nullif(p_data->>'tender_id','')::uuid,p_series_id,last_version+1,p_data->>'document_type',p_data->>'name',p_data->>'issuer',nullif(p_data->>'document_number',''),(p_data->>'issued_on')::date,nullif(p_data->>'expires_on','')::date,coalesce((p_data->>'has_no_expiry')::boolean,false),p_data->>'coverage',p_data->>'notes',p_data->>'file_name','application/pdf',(p_data->>'file_size')::bigint,p_data->>'storage_path',auth.uid(),p_data->>'sha256',auth.uid(),now(),p_data->>'central_type_id') returning * into v;
 perform private.central_audit(p_company_id,'certificate',v.id::text,'Versão cadastrada',jsonb_build_object('version',v.version,'sha256',v.sha256));return to_jsonb(v);
end$$;
create function public.central_validate_version(p_company_id uuid,p_version_id uuid,p_source_id text,p_state text,p_proof text) returns void language plpgsql security definer set search_path='' as $$begin
 if not private.central_allowed(p_company_id,'review') then raise exception 'Apenas revisores podem registrar a conferência';end if;
 insert into public.central_validations(company_id,version_id,source_id,state,proof,checked_by) values(p_company_id,p_version_id,p_source_id,p_state,p_proof,auth.uid());perform private.central_audit(p_company_id,'validation',p_version_id::text,'Conferência humana registrada');end$$;
create function public.central_save_declaration(p_company_id uuid,p_id uuid,p_expected_revision integer,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare d public.central_generated_declarations;h text;begin
 if not private.central_allowed(p_company_id,'write') then raise exception 'Sem permissão';end if;
 h:=encode(extensions.digest(convert_to(p_data->>'text','UTF8'),'sha256'),'hex');
 if p_expected_revision=0 then insert into public.central_generated_declarations(id,company_id,tender_id,title,text,model_id,model_version,sha256,representative_id,created_by)
 values(p_id,p_company_id,nullif(p_data->>'tender_id','')::uuid,p_data->>'title',p_data->>'text',p_data->>'model_id',coalesce((p_data->>'model_version')::int,1),h,(p_data->>'representative_id')::uuid,auth.uid()) returning * into d;
 else update public.central_generated_declarations set title=p_data->>'title',text=p_data->>'text',model_id=p_data->>'model_id',model_version=coalesce((p_data->>'model_version')::int,1),tender_id=nullif(p_data->>'tender_id','')::uuid,representative_id=(p_data->>'representative_id')::uuid,revision=revision+1,sha256=h,state='draft',updated_at=now() where id=p_id and company_id=p_company_id and revision=p_expected_revision returning * into d;if not found then raise exception 'Declaração alterada por outro usuário' using errcode='40001';end if;end if;
 insert into public.central_declaration_versions(company_id,declaration_id,revision,snapshot,created_by) values(p_company_id,d.id,d.revision,to_jsonb(d),auth.uid());
 perform private.central_audit(p_company_id,'declaration',d.id::text,'Minuta salva',jsonb_build_object('revision',d.revision,'sha256',h));return to_jsonb(d);
end$$;
create function public.central_approve_declaration(p_company_id uuid,p_id uuid,p_revision integer,p_sha256 text,p_responsible_name text,p_confirmed boolean) returns void language plpgsql security definer set search_path='' as $$
declare d public.central_generated_declarations;begin
 if not private.central_allowed(p_company_id,'review') or p_confirmed is distinct from true or length(trim(coalesce(p_responsible_name,'')))<2 then raise exception 'Revisão e identificação do responsável obrigatórias';end if;
 select * into d from public.central_generated_declarations where id=p_id and company_id=p_company_id for update;
 if d.id is null or d.revision is distinct from p_revision or d.sha256 is distinct from p_sha256 then raise exception 'Revise a versão atual da declaração';end if;
 if d.text like '%[PREENCHER]%' or d.text like '%{{%' then raise exception 'Há campos pendentes';end if;
 if not exists(select 1 from public.central_company_profiles where company_id=p_company_id) then raise exception 'Cadastro confirmado obrigatório';end if;
 insert into public.central_reviews(company_id,declaration_id,revision,sha256,responsible_name,approved_by) values(p_company_id,d.id,d.revision,d.sha256,p_responsible_name,auth.uid());
 update public.central_generated_declarations set state='approved',updated_at=now() where id=d.id;
 perform private.central_audit(p_company_id,'declaration',d.id::text,'Revisão humana aprovada',jsonb_build_object('revision',d.revision));end$$;
create function public.central_save_requirement(p_company_id uuid,p_data jsonb) returns void language plpgsql security definer set search_path='' as $$begin
 if not private.central_allowed(p_company_id,'write') then raise exception 'Sem permissão';end if;
 insert into public.central_tender_requirements(company_id,tender_id,title,type_id,relevant_date,page,clause,quote,source_sha256,confidence,created_by)
 values(p_company_id,(p_data->>'tender_id')::uuid,p_data->>'title',p_data->>'type_id',(p_data->>'relevant_date')::date,(p_data->>'page')::int,p_data->>'clause',p_data->>'quote',nullif(p_data->>'source_sha256',''),nullif(p_data->>'confidence','')::numeric,auth.uid());
 perform private.central_audit(p_company_id,'requirement',p_data->>'tender_id','Exigência pendente registrada');end$$;
create function public.central_review_requirement(p_company_id uuid,p_id uuid,p_state text) returns void language plpgsql security definer set search_path='' as $$begin
 if not private.central_allowed(p_company_id,'review') or p_state not in ('confirmed','rejected') then raise exception 'Revisão não autorizada';end if;
 update public.central_tender_requirements set review_state=p_state,reviewed_by=auth.uid(),reviewed_at=now() where id=p_id and company_id=p_company_id;if not found then raise exception 'Exigência indisponível';end if;
 perform private.central_audit(p_company_id,'requirement',p_id::text,'Exigência revisada');end$$;
create function public.central_link_version(p_company_id uuid,p_requirement_id uuid,p_version_id uuid) returns void language plpgsql security definer set search_path='' as $$begin
 if not private.central_allowed(p_company_id,'write') then raise exception 'Sem permissão';end if;
 if not exists(select 1 from public.central_tender_requirements where id=p_requirement_id and company_id=p_company_id) then raise exception 'Exigência de outra empresa';end if;
 if p_version_id is null then delete from public.central_tender_documents where requirement_id=p_requirement_id and company_id=p_company_id;perform private.central_audit(p_company_id,'requirement',p_requirement_id::text,'Vínculo documental removido; arquivo preservado');return;end if;
 if not exists(select 1 from public.qualification_documents where id=p_version_id and company_id=p_company_id) then raise exception 'Vínculo documental de outra empresa';end if;
 insert into public.central_tender_documents(company_id,requirement_id,version_id,selected_by) values(p_company_id,p_requirement_id,p_version_id,auth.uid()) on conflict(requirement_id) do update set version_id=excluded.version_id,selected_by=auth.uid() where central_tender_documents.company_id=p_company_id;
 if not found then raise exception 'Exigência indisponível';end if;perform private.central_audit(p_company_id,'requirement',p_requirement_id::text,'Versão selecionada');end$$;
create function public.central_save_rule(p_company_id uuid,p_data jsonb) returns void language plpgsql security definer set search_path='' as $$begin
 if not private.is_company_admin(p_company_id) then raise exception 'Apenas administradores configuram regras';end if;
 insert into public.central_automation_rules(company_id,type_id,name,renew_before_days,enabled,created_by) values(p_company_id,p_data->>'type_id',p_data->>'name',(p_data->>'renew_before_days')::int,coalesce((p_data->>'enabled')::boolean,true),auth.uid()) on conflict(company_id,type_id) do update set name=excluded.name,renew_before_days=excluded.renew_before_days,enabled=excluded.enabled;
 perform private.central_audit(p_company_id,'automation',p_data->>'type_id','Regra configurada');end$$;
create function public.central_set_permission(p_company_id uuid,p_user_id uuid,p_role text) returns void language plpgsql security definer set search_path='' as $$begin
 if not private.is_company_admin(p_company_id) then raise exception 'Apenas administradores configuram permissões';end if;
 insert into public.central_permissions(company_id,user_id,role) values(p_company_id,p_user_id,p_role) on conflict(company_id,user_id) do update set role=excluded.role;perform private.central_audit(p_company_id,'permission',p_user_id::text,'Permissão configurada');end$$;
create function public.central_record_attempt(p_company_id uuid,p_document_id uuid,p_reason text) returns void language plpgsql security definer set search_path='' as $$begin
 if not private.central_allowed(p_company_id,'write') then raise exception 'Sem permissão';end if;
 insert into public.central_documents(id,company_id) select document_series_id,company_id from public.qualification_documents where document_series_id=p_document_id and company_id=p_company_id limit 1 on conflict(id) do nothing;
 insert into public.central_issuance_attempts(company_id,document_id,state,reason,actor_id) values(p_company_id,p_document_id,'intervention',p_reason,auth.uid());perform private.central_audit(p_company_id,'certificate',p_document_id::text,'Intervenção necessária');end$$;
create function public.central_save_template(p_company_id uuid,p_data jsonb) returns void language plpgsql security definer set search_path='' as $$begin
 if not private.central_allowed(p_company_id,'write') then raise exception 'Sem permissão';end if;
 insert into public.central_declaration_templates(company_id,name,body,version,previous_id,created_by) values(p_company_id,p_data->>'name',p_data->>'body',coalesce((p_data->>'version')::int,1),nullif(p_data->>'previous_id','')::uuid,auth.uid());perform private.central_audit(p_company_id,'template',p_data->>'name','Versão de modelo cadastrada');end$$;
create function public.central_record_package(p_company_id uuid,p_tender_id uuid,p_manifest jsonb) returns void language plpgsql security definer set search_path='' as $$declare item jsonb;d public.central_generated_declarations;begin
 if not private.central_allowed(p_company_id,'write') or pg_column_size(p_manifest)>250000 then raise exception 'Pacote indisponível';end if;
 if not exists(select 1 from public.tenders where id=p_tender_id and company_id=p_company_id) then raise exception 'Edital indisponível';end if;
 for item in select value from jsonb_array_elements(coalesce(p_manifest->'declarations','[]'::jsonb)) loop
  select * into d from public.central_generated_declarations where id=(item->>'id')::uuid and company_id=p_company_id and tender_id=p_tender_id for share;
  if not found or d.state<>'approved' or d.revision is distinct from (item->>'revision')::integer or d.sha256 is distinct from item->>'text_sha256' or not exists(select 1 from public.central_reviews r where r.company_id=p_company_id and r.declaration_id=d.id and r.revision=d.revision and r.sha256=d.sha256) then raise exception 'Declaração alterada ou sem aprovação da revisão exata. Atualize a biblioteca.';end if;
 end loop;
 for item in select value from jsonb_array_elements(coalesce(p_manifest->'files','[]'::jsonb)) loop
  if not exists(select 1 from public.qualification_documents q where q.id=(item->>'id')::uuid and q.company_id=p_company_id and q.version=(item->>'version')::integer) then raise exception 'Versão documental indisponível';end if;
 end loop;
 insert into public.central_packages(company_id,tender_id,manifest,created_by) values(p_company_id,p_tender_id,p_manifest,auth.uid());perform private.central_audit(p_company_id,'package',p_tender_id::text,'Manifesto registrado');end$$;
-- Alertas persistentes e deduplicados, sem envio externo implícito.
create function private.central_scan(c uuid,as_of date) returns integer language plpgsql security definer set search_path='' as $$declare n int;m int;begin
 insert into public.central_notifications(company_id,version_id,threshold,message)
 select q.company_id,q.id,case when q.expires_on<as_of then 0 else x.days end,case when q.expires_on<as_of then 'Documento vencido: ' else 'Vencimento próximo: ' end||q.name||' — '||q.expires_on::text
 from public.qualification_documents q cross join (values(30),(15),(5),(1)) x(days)
 where q.company_id=c and not q.has_no_expiry and q.expires_on is not null and q.expires_on-as_of<=x.days
 and not exists(select 1 from public.qualification_documents newer where newer.company_id=q.company_id and newer.document_series_id=q.document_series_id and newer.version>q.version)
 on conflict(company_id,version_id,threshold,channel) do nothing;
 get diagnostics n=row_count;
 insert into public.central_notifications(company_id,version_id,threshold,message)
 select q.company_id,q.id,r.renew_before_days,'Planejar renovação: '||q.name||' — antecedência configurada de '||r.renew_before_days::text||' dia(s)'
 from public.qualification_documents q join public.central_automation_rules r on r.company_id=q.company_id and r.type_id=q.central_type_id and r.enabled
 where q.company_id=c and not q.has_no_expiry and q.expires_on-as_of between 0 and r.renew_before_days
 and not exists(select 1 from public.qualification_documents newer where newer.company_id=q.company_id and newer.document_series_id=q.document_series_id and newer.version>q.version)
 on conflict(company_id,version_id,threshold,channel) do nothing;
 get diagnostics m=row_count;return n+m;end$$;
revoke all on function private.central_scan(uuid,date) from public,anon,authenticated;
create function public.central_request_scan(p_company_id uuid) returns uuid language plpgsql security definer set search_path='' as $$declare v_run_id uuid;begin
 if not private.central_allowed(p_company_id,'write') then raise exception 'Sem permissão';end if;
 insert into public.central_automation_runs(company_id,kind,idempotency_key) values(p_company_id,'expiry_scan','manual:'||gen_random_uuid()::text) returning central_automation_runs.id into v_run_id;
 perform private.central_scan(p_company_id,(now() at time zone 'America/Fortaleza')::date);
 update public.central_automation_runs set state='completed',attempts=1,updated_at=now() where central_automation_runs.id=v_run_id;
 perform private.central_audit(p_company_id,'automation',v_run_id::text,'Vencimentos verificados');return v_run_id;end$$;
create function public.central_daily_enqueue() returns integer language plpgsql security definer set search_path='' as $$declare n int;begin
 insert into public.central_automation_runs(company_id,kind,idempotency_key) select distinct company_id,'expiry_scan','daily:'||(now() at time zone 'America/Fortaleza')::date::text from public.qualification_documents on conflict(company_id,idempotency_key) do nothing;get diagnostics n=row_count;return n;end$$;
create function public.central_process_queue() returns integer language plpgsql security definer set search_path='' as $$declare j public.central_automation_runs;n int:=0;begin
 update public.central_automation_runs set state='failed',lease_until=null,last_error='Limite de tentativas alcançado',updated_at=now() where attempts>=8 and (state='queued' or state='running' and lease_until<now());
 for j in select * from public.central_automation_runs where attempts<8 and ((state='queued' and available_at<=now()) or (state='running' and lease_until<now())) order by available_at limit 10 for update skip locked loop
  update public.central_automation_runs set state='running',lease_until=now()+interval '2 minutes',lease_token=gen_random_uuid(),attempts=attempts+1 where id=j.id;
  begin
   if j.kind='expiry_scan' then perform private.central_scan(j.company_id,(now() at time zone 'America/Fortaleza')::date);update public.central_automation_runs set state='completed',updated_at=now(),lease_until=null where id=j.id;
   else update public.central_automation_runs set state='configuration_required',last_error='Provedor de e-mail não configurado ou autorizado',lease_until=null,updated_at=now() where id=j.id;end if;n:=n+1;
  exception when others then update public.central_automation_runs set state=case when attempts>=8 then 'failed' else 'queued' end,last_error=left(sqlerrm,300),available_at=now()+make_interval(secs=>least(86400,60*(2^least(attempts,10))::int)),lease_until=null,updated_at=now() where id=j.id;end;
 end loop;return n;end$$;
revoke all on function public.central_daily_enqueue(),public.central_process_queue() from public,anon,authenticated;
grant execute on function public.central_daily_enqueue(),public.central_process_queue() to service_role;
-- Upload somente em pasta da empresa, sem sobrescrita. Download já exige metadata + membro.
create policy central_qualification_upload on storage.objects for insert to authenticated with check(bucket_id='qualification-files' and split_part(name,'/',1)~'^[0-9a-f-]{36}$' and split_part(name,'/',2)~'^[0-9a-f-]{36}$' and lower(storage.extension(name))='pdf' and private.central_allowed(split_part(name,'/',1)::uuid,'write'));
create policy central_retained_files on storage.objects as restrictive for delete to authenticated using(bucket_id<>'qualification-files' or not exists(select 1 from public.qualification_documents q where q.storage_path=storage.objects.name));
create function private.central_legacy_version() returns trigger language plpgsql security definer set search_path='' as $$begin
 if new.metadata_confirmed_at is not null then
  if auth.uid() is null then raise exception 'A confirmação de metadados exige responsável autenticado';end if;
  new.metadata_confirmed_by:=auth.uid();new.metadata_confirmed_at:=now();
 else new.metadata_confirmed_by:=null;end if;
 insert into public.central_documents(id,company_id,type_id) values(new.document_series_id,new.company_id,new.central_type_id) on conflict(id) do nothing;
 if not exists(select 1 from public.central_documents where id=new.document_series_id and company_id=new.company_id) then raise exception 'Série documental de outra empresa';end if;
 perform private.central_audit(new.company_id,'certificate',new.id::text,'Arquivo documental recebido',jsonb_build_object('version',new.version,'metadata_confirmed',new.metadata_confirmed_at is not null));return new;end$$;
revoke all on function private.central_legacy_version() from public,anon,authenticated;
create trigger central_legacy_version before insert on public.qualification_documents for each row execute function private.central_legacy_version();
alter table public.qualification_documents add constraint qualification_central_series_company_fk foreign key(document_series_id,company_id) references public.central_documents(id,company_id);
-- Nenhuma versão documental pode ser apagada pela Central nem pelo fluxo legado.
revoke delete on public.qualification_documents from authenticated;
create function private.central_immutable() returns trigger language plpgsql security invoker set search_path='' as $$begin raise exception 'Registro de histórico imutável';end$$;
revoke all on function private.central_immutable() from public,anon,authenticated;
do $$declare t text;begin foreach t in array array['central_reviews','central_declaration_versions','central_audit_log','central_validations','central_issuance_attempts','central_declaration_templates','central_packages'] loop execute format('create trigger central_history_immutable before update or delete on public.%I for each row execute function private.central_immutable()',t);end loop;end$$;
-- Permissões explícitas para RPCs públicas de usuário. Nenhuma concessão automática ao PUBLIC.
create table private.central_analysis_usage(company_id uuid not null references public.companies(id),user_id uuid not null references auth.users(id),day date not null,requests integer not null,last_request_at timestamptz not null,primary key(company_id,user_id,day));
alter table private.central_analysis_usage enable row level security;
revoke all on private.central_analysis_usage from public,anon,authenticated;
create function public.central_reserve_analysis(p_company_id uuid) returns boolean language plpgsql security definer set search_path='' as $$declare accepted boolean;begin
 if not private.central_allowed(p_company_id,'write') then raise exception 'Sem permissão';end if;
 insert into private.central_analysis_usage(company_id,user_id,day,requests,last_request_at) values(p_company_id,auth.uid(),(now() at time zone 'America/Fortaleza')::date,1,now())
 on conflict(company_id,user_id,day) do update set requests=private.central_analysis_usage.requests+1,last_request_at=now()
 where private.central_analysis_usage.requests<20 and private.central_analysis_usage.last_request_at<now()-interval '30 seconds' returning true into accepted;return coalesce(accepted,false);end$$;
do $$declare r record;begin for r in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'central_%' and p.proname not in ('central_daily_enqueue','central_process_queue') loop execute format('revoke all on function %s from public,anon',r.signature);execute format('grant execute on function %s to authenticated',r.signature);end loop;end$$;
