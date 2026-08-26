-- Biblioteca privada de documentos para habilitação fiscal.
-- Migration local: não aplicar sem revisão e autorização de publicação.

create table public.qualification_documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  tender_id uuid,
  document_series_id uuid not null default gen_random_uuid(),
  version integer not null default 1 check(version > 0),
  document_type text not null check(length(trim(document_type)) between 1 and 120),
  name text not null check(length(trim(name)) between 1 and 180),
  issuer text not null check(length(trim(issuer)) between 1 and 160),
  document_number text check(document_number is null or length(trim(document_number)) between 1 and 100),
  issued_on date not null,
  expires_on date,
  has_no_expiry boolean not null default false,
  coverage text check(coverage is null or length(trim(coverage)) between 1 and 180),
  notes text check(notes is null or length(notes) <= 1200),
  file_name text not null check(length(trim(file_name)) between 1 and 255),
  mime_type text not null default 'application/pdf' check(mime_type='application/pdf'),
  file_size bigint not null check(file_size between 1 and 26214400),
  storage_path text not null unique,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  constraint qualification_documents_id_company_unique unique(id,company_id),
  constraint qualification_documents_series_version_unique unique(document_series_id,version),
  constraint qualification_documents_tender_company_fk
    foreign key(tender_id,company_id) references public.tenders(id,company_id) on delete restrict,
  constraint qualification_documents_expiry_consistent check(
    (has_no_expiry and expires_on is null) or
    (not has_no_expiry and expires_on is not null and expires_on >= issued_on)
  ),
  constraint qualification_documents_storage_path_matches check(
    split_part(storage_path,'/',1)=company_id::text and
    split_part(storage_path,'/',2)=document_series_id::text and
    split_part(storage_path,'/',3)<>''
  )
);

create index qualification_documents_company_id_idx on public.qualification_documents(company_id);
create index qualification_documents_tender_id_idx on public.qualification_documents(tender_id) where tender_id is not null;
create index qualification_documents_expiry_idx on public.qualification_documents(company_id,expires_on) where expires_on is not null;
create index qualification_documents_series_idx on public.qualification_documents(document_series_id,version desc);

alter table public.qualification_documents enable row level security;

create policy qualification_documents_select_members
on public.qualification_documents for select to authenticated
using(private.is_company_member(company_id));

create policy qualification_documents_insert_admins
on public.qualification_documents for insert to authenticated
with check(private.is_company_admin(company_id,(select auth.uid())) and created_by=(select auth.uid()));

create policy qualification_documents_delete_unlinked_admins
on public.qualification_documents for delete to authenticated
using(private.is_company_admin(company_id,(select auth.uid())));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('qualification-files','qualification-files',false,26214400,array['application/pdf'])
on conflict(id) do update set
  public=false,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists qualification_files_select_members on storage.objects;
create policy qualification_files_select_members
on storage.objects for select to authenticated
using(
  bucket_id='qualification-files' and exists(
    select 1 from public.qualification_documents qd
    where qd.storage_path=name
      and qd.company_id::text=split_part(name,'/',1)
      and qd.document_series_id::text=split_part(name,'/',2)
      and private.is_company_member(qd.company_id)
  )
);

drop policy if exists qualification_files_insert_admins on storage.objects;
create policy qualification_files_insert_admins
on storage.objects for insert to authenticated
with check(
  bucket_id='qualification-files'
  and split_part(name,'/',1) ~ '^[0-9a-f-]{36}$'
  and split_part(name,'/',2) ~ '^[0-9a-f-]{36}$'
  and split_part(name,'/',3) <> ''
  and lower(storage.extension(name))='pdf'
  and private.is_company_admin(split_part(name,'/',1)::uuid,(select auth.uid()))
);

drop policy if exists qualification_files_delete_admins on storage.objects;
create policy qualification_files_delete_admins
on storage.objects for delete to authenticated
using(
  bucket_id='qualification-files'
  and split_part(name,'/',1) ~ '^[0-9a-f-]{36}$'
  and private.is_company_admin(split_part(name,'/',1)::uuid,(select auth.uid()))
);

revoke all on public.qualification_documents from anon,authenticated;
grant select,insert,delete on public.qualification_documents to authenticated;

