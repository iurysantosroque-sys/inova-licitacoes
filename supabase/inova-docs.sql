-- INOVA Docs: extensão aditiva do esquema existente. Executar como migration revisada.
begin;
create table public.inova_docs_roles (
 company_id uuid not null references public.companies(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null check(role in ('editor','viewer')), primary key(company_id,user_id),
 foreign key(company_id,user_id) references public.company_members(company_id,user_id) on delete cascade
);
create function public.inova_docs_can_write(p_company_id uuid) returns boolean
 language sql stable security invoker set search_path='' as $$
 select exists(select 1 from public.company_members m where m.company_id=p_company_id and m.user_id=(select auth.uid()) and (m.role='admin' or not exists(select 1 from public.inova_docs_roles r where r.company_id=m.company_id and r.user_id=m.user_id and r.role='viewer')))
$$;
revoke all on function public.inova_docs_can_write(uuid) from public,anon;
grant execute on function public.inova_docs_can_write(uuid) to authenticated;
create table public.inova_docs_documents (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
 tender_id uuid, title text not null check(length(title) between 1 and 200), category text not null check(category in ('disputa','habilitacao','fornecimento','empresariais','mensagens')),
 type text not null check(length(type) between 1 and 160), status text not null default 'rascunho' check(status in ('rascunho','em_revisao','aprovado','enviado','aguardando_resposta','respondido','arquivado')),
 content jsonb not null default '{}' check(jsonb_typeof(content)='object' and octet_length(content::text)<=500000), revision integer not null default 1 check(revision>0), due_at date,
 created_by uuid not null default auth.uid() references auth.users(id), updated_by uuid not null default auth.uid() references auth.users(id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(id,company_id),
 foreign key(tender_id,company_id) references public.tenders(id,company_id) on delete set null (tender_id),
 check(status not in ('enviado','aguardando_resposta') or (coalesce(content#>>'{tracking,channel}','')<>'' and coalesce(content#>>'{tracking,recipient}','')<>'' and coalesce(content#>>'{tracking,sent_at}','')<>''))
);
create table public.inova_docs_versions (
 id uuid primary key default gen_random_uuid(), document_id uuid not null, company_id uuid not null, revision integer not null,
 snapshot jsonb not null, actor_id uuid not null references auth.users(id), created_at timestamptz not null default now(), unique(document_id,revision),
 foreign key(document_id,company_id) references public.inova_docs_documents(id,company_id) on delete cascade
);
create table public.inova_docs_events (
 id uuid primary key default gen_random_uuid(), document_id uuid not null, company_id uuid not null,
 action text not null, actor_id uuid not null references auth.users(id), created_at timestamptz not null default now(),
 foreign key(document_id,company_id) references public.inova_docs_documents(id,company_id) on delete cascade
);
create table public.inova_docs_attachments (
 id uuid primary key default gen_random_uuid(),document_id uuid not null,company_id uuid not null,
 name text not null check(length(name)<=100),storage_path text not null unique,size integer not null check(size>0 and size<=10485760),
 mime text not null check(mime in ('application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','image/png','image/jpeg')),
 extraction jsonb not null default '[]' check(jsonb_typeof(extraction)='array' and octet_length(extraction::text)<=500000),extraction_status text not null default 'pendente',
 created_by uuid not null default auth.uid() references auth.users(id),created_at timestamptz not null default now(),
 foreign key(document_id,company_id) references public.inova_docs_documents(id,company_id) on delete cascade,
 check(storage_path like company_id::text||'/'||document_id::text||'/'||id::text||'/%')
);
create table public.inova_docs_templates (
 id uuid primary key default gen_random_uuid(),company_id uuid not null references public.companies(id) on delete cascade,
 name text not null check(length(name) between 1 and 160),category text not null,body text not null check(length(body) between 1 and 30000),
 favorite boolean not null default false,archived boolean not null default false,created_by uuid not null default auth.uid() references auth.users(id),created_at timestamptz not null default now()
);
create table public.inova_docs_settings (
 company_id uuid primary key references public.companies(id) on delete cascade,data jsonb not null default '{}' check(jsonb_typeof(data)='object' and octet_length(data::text)<=400000),updated_at timestamptz not null default now()
);
create table public.inova_docs_ai_usage (
 company_id uuid not null references public.companies(id) on delete cascade,user_id uuid not null references auth.users(id),
 day date not null default current_date,requests integer not null default 0 check(requests>=0),last_request_at timestamptz,primary key(company_id,user_id,day)
);
create index inova_docs_company_updated on public.inova_docs_documents(company_id,updated_at desc);
create index inova_docs_company_status_due on public.inova_docs_documents(company_id,status,due_at);
create index inova_docs_search on public.inova_docs_documents using gin(to_tsvector('portuguese',title||' '||coalesce(content->>'text','')||' '||coalesce(content->'context'->>'agency','')));
create index inova_docs_attachments_document on public.inova_docs_attachments(document_id);
create index inova_docs_events_document on public.inova_docs_events(document_id,created_at desc);
create index inova_docs_versions_company on public.inova_docs_versions(company_id);
create index inova_docs_templates_company on public.inova_docs_templates(company_id);

-- Autor e revisão são controlados pelo servidor, inclusive em escrita direta na tabela.
create function private.inova_docs_validate() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if TG_OP='INSERT' then
  new.created_by=auth.uid();new.updated_by=auth.uid();new.revision=1;new.created_at=now();
 else
  if new.company_id<>old.company_id or new.id<>old.id or new.created_by<>old.created_by then raise exception 'Identidade do documento não pode ser alterada';end if;
  -- Exclusão do edital pode desvincular apenas a FK, sem alterar o documento.
  if new.tender_id is null and old.tender_id is not null and new.revision=old.revision and new.content=old.content and new.title=old.title and not exists(select 1 from public.tenders t where t.id=old.tender_id) then return new;end if;
  if new.revision<>old.revision+1 then raise exception 'Revisão inválida ou concorrente' using errcode='40001';end if;
  new.created_at=old.created_at;new.updated_by=auth.uid();
 end if;
 new.updated_at=now();return new;
end $$;
create trigger inova_docs_validate before insert or update on public.inova_docs_documents for each row execute function private.inova_docs_validate();
-- Único trecho elevado: trigger privada, sem chamada RPC, grava exclusivamente auditoria imutável.
create function private.inova_docs_snapshot() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if TG_OP='UPDATE' and new.revision=old.revision then return new;end if;
 if auth.uid() is null or not public.inova_docs_can_write(new.company_id) then raise exception 'Sem permissão';end if;
 insert into public.inova_docs_versions(document_id,company_id,revision,snapshot,actor_id) values(new.id,new.company_id,new.revision,to_jsonb(new),auth.uid());
 insert into public.inova_docs_events(document_id,company_id,action,actor_id) values(new.id,new.company_id,'Versão '||new.revision||' · '||new.status,auth.uid());return new;
end $$;
revoke all on function private.inova_docs_snapshot() from public,anon,authenticated;
revoke all on function private.inova_docs_validate() from public,anon,authenticated;
create trigger inova_docs_snapshot after insert or update on public.inova_docs_documents for each row execute function private.inova_docs_snapshot();
create function private.inova_docs_child_guard() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if TG_OP='INSERT' then new.created_by=auth.uid();new.created_at=now();
 else
  if new.id<>old.id or new.company_id<>old.company_id or new.created_by<>old.created_by or new.created_at<>old.created_at then raise exception 'Identidade e autoria são imutáveis';end if;
  if TG_TABLE_NAME='inova_docs_attachments' and (to_jsonb(new)->>'document_id'<>to_jsonb(old)->>'document_id' or to_jsonb(new)->>'storage_path'<>to_jsonb(old)->>'storage_path') then raise exception 'Vínculo do anexo é imutável';end if;
 end if;return new;
end $$;
revoke all on function private.inova_docs_child_guard() from public,anon,authenticated;
create trigger inova_docs_attachments_guard before insert or update on public.inova_docs_attachments for each row execute function private.inova_docs_child_guard();
create trigger inova_docs_templates_guard before insert or update on public.inova_docs_templates for each row execute function private.inova_docs_child_guard();

do $$ declare t text;begin
 foreach t in array array['inova_docs_roles','inova_docs_documents','inova_docs_versions','inova_docs_events','inova_docs_attachments','inova_docs_templates','inova_docs_settings','inova_docs_ai_usage'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon,authenticated',t);
 execute format('grant select on public.%I to authenticated',t);
 execute format('create policy docs_read on public.%I for select to authenticated using (private.is_company_member(company_id))',t);
 end loop;
 foreach t in array array['inova_docs_documents','inova_docs_attachments','inova_docs_templates'] loop
 execute format('grant insert,update on public.%I to authenticated',t);
 execute format('create policy docs_insert on public.%I for insert to authenticated with check (public.inova_docs_can_write(company_id) and created_by=auth.uid())',t);
 execute format('create policy docs_update on public.%I for update to authenticated using (public.inova_docs_can_write(company_id)) with check (public.inova_docs_can_write(company_id))',t);
 end loop;
 foreach t in array array['inova_docs_settings','inova_docs_roles'] loop
 execute format('grant insert,update,delete on public.%I to authenticated',t);
 execute format('create policy docs_admin on public.%I for all to authenticated using (private.is_company_admin(company_id)) with check (private.is_company_admin(company_id))',t);
 end loop;
end $$;

create function public.inova_docs_save(p_id uuid,p_company_id uuid,p_expected_revision integer,p_document jsonb) returns jsonb
 language plpgsql security invoker set search_path='' as $$
declare d public.inova_docs_documents;
begin
 if auth.uid() is null or not public.inova_docs_can_write(p_company_id) then raise exception 'Sem permissão';end if;
 if octet_length(p_document::text)>500000 then raise exception 'Documento acima do limite';end if;
 if p_expected_revision=0 then
  insert into public.inova_docs_documents(id,company_id,tender_id,title,category,type,status,content,revision,due_at)
  values(p_id,p_company_id,nullif(p_document->>'tender_id','')::uuid,p_document->>'title',p_document->>'category',p_document->>'type',p_document->>'status',p_document->'content',1,nullif(p_document->>'due_at','')::date) returning * into d;
 else
  update public.inova_docs_documents set tender_id=nullif(p_document->>'tender_id','')::uuid,title=p_document->>'title',category=p_document->>'category',type=p_document->>'type',status=p_document->>'status',content=p_document->'content',revision=revision+1,due_at=nullif(p_document->>'due_at','')::date
  where id=p_id and company_id=p_company_id and revision=p_expected_revision returning * into d;
  if not found then raise exception 'Outro usuário alterou o documento. Reabra a versão atual.' using errcode='40001';end if;
 end if;
 return to_jsonb(d);
end $$;
revoke all on function public.inova_docs_save(uuid,uuid,integer,jsonb) from public,anon;
grant execute on function public.inova_docs_save(uuid,uuid,integer,jsonb) to authenticated;

-- Atualização atômica (UPSERT) evita corrida entre solicitações de IA.
create function private.inova_docs_ai_usage_guard() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.user_id<>auth.uid() or new.day<>current_date then raise exception 'Identidade de uso inválida';end if;
 if TG_OP='INSERT' then new.requests=1;
 else
  if new.company_id<>old.company_id or new.user_id<>old.user_id or new.day<>old.day or new.requests<>old.requests+1 or old.requests>=30 or old.last_request_at>now()-interval '15 seconds' then raise exception 'Limite de uso atingido';end if;
 end if;
 new.last_request_at=now();return new;
end $$;
revoke all on function private.inova_docs_ai_usage_guard() from public,anon,authenticated;
create trigger inova_docs_ai_usage_guard before insert or update on public.inova_docs_ai_usage for each row execute function private.inova_docs_ai_usage_guard();
create function private.inova_docs_reserve_ai(p_document_id uuid) returns boolean language plpgsql security definer set search_path='' as $$
declare c uuid;allowed boolean;
begin
 select company_id into c from public.inova_docs_documents where id=p_document_id;
 if auth.uid() is null or c is null or not public.inova_docs_can_write(c) then raise exception 'Documento indisponível';end if;
 insert into public.inova_docs_ai_usage(company_id,user_id,day,requests,last_request_at) values(c,auth.uid(),current_date,1,now())
 on conflict(company_id,user_id,day) do update set requests=public.inova_docs_ai_usage.requests+1,last_request_at=now()
 where public.inova_docs_ai_usage.requests<30 and public.inova_docs_ai_usage.last_request_at<now()-interval '15 seconds' returning true into allowed;
 return coalesce(allowed,false);
end $$;
revoke all on function private.inova_docs_reserve_ai(uuid) from public,anon;
grant execute on function private.inova_docs_reserve_ai(uuid) to authenticated;
create function public.inova_docs_reserve_ai(p_document_id uuid) returns boolean language sql security invoker set search_path='' as $$ select private.inova_docs_reserve_ai(p_document_id) $$;
revoke all on function public.inova_docs_reserve_ai(uuid) from public,anon;
grant execute on function public.inova_docs_reserve_ai(uuid) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('docs-files','docs-files',false,10485760,array['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','image/png','image/jpeg']) on conflict(id) do nothing;
create policy docs_files_read on storage.objects for select to authenticated using(bucket_id='docs-files' and exists(select 1 from public.inova_docs_documents d where d.company_id::text=(storage.foldername(name))[1] and d.id::text=(storage.foldername(name))[2] and private.is_company_member(d.company_id)));
create policy docs_files_insert on storage.objects for insert to authenticated with check(bucket_id='docs-files' and exists(select 1 from public.inova_docs_documents d where d.company_id::text=(storage.foldername(name))[1] and d.id::text=(storage.foldername(name))[2] and public.inova_docs_can_write(d.company_id)));
create policy docs_files_delete on storage.objects for delete to authenticated using(bucket_id='docs-files' and exists(select 1 from public.inova_docs_documents d where d.company_id::text=(storage.foldername(name))[1] and d.id::text=(storage.foldername(name))[2] and public.inova_docs_can_write(d.company_id)));
commit;
