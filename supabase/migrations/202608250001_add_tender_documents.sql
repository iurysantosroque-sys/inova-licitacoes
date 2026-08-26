-- Documentos Word privados dos editais.
-- Migration local: não aplicar sem revisão e autorização de publicação.

create schema if not exists private;

do $$
begin
  if not exists(
    select 1
    from pg_constraint
    where conrelid='public.tenders'::regclass
      and contype='u'
      and pg_get_constraintdef(oid)='UNIQUE (id, company_id)'
  ) then
    alter table public.tenders
      add constraint tenders_id_company_id_unique unique(id,company_id);
  end if;
end$$;

create table public.tender_documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  tender_id uuid not null,
  file_name text not null check(length(trim(file_name)) between 1 and 255),
  mime_type text not null check(mime_type in (
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  )),
  file_size bigint not null check(file_size between 1 and 26214400),
  storage_path text not null unique,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tender_documents_one_current_per_tender unique(tender_id),
  constraint tender_documents_tender_company_fk
    foreign key(tender_id,company_id) references public.tenders(id,company_id) on delete cascade,
  constraint tender_documents_storage_path_matches_record check(
    split_part(storage_path,'/',1)=company_id::text and
    split_part(storage_path,'/',2)=tender_id::text and
    split_part(storage_path,'/',3)<>''
  )
);

create index tender_documents_company_id_idx on public.tender_documents(company_id);

alter table public.tender_documents enable row level security;

create policy tender_documents_select_members
on public.tender_documents for select to authenticated
using(private.is_company_member(company_id));

create policy tender_documents_insert_admins
on public.tender_documents for insert to authenticated
with check(private.is_company_admin(company_id,(select auth.uid())) and created_by=(select auth.uid()));

create policy tender_documents_update_admins
on public.tender_documents for update to authenticated
using(private.is_company_admin(company_id,(select auth.uid())))
with check(private.is_company_admin(company_id,(select auth.uid())) and created_by=(select auth.uid()));

create policy tender_documents_delete_admins
on public.tender_documents for delete to authenticated
using(private.is_company_admin(company_id,(select auth.uid())));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values(
  'tender-files',
  'tender-files',
  false,
  26214400,
  array[
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict(id) do update set
  public=false,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists tender_files_select_members on storage.objects;
create policy tender_files_select_members
on storage.objects for select to authenticated
using(
  bucket_id='tender-files' and exists(
    select 1
    from public.tender_documents td
    where td.storage_path=name
      and td.company_id::text=split_part(name,'/',1)
      and td.tender_id::text=split_part(name,'/',2)
      and private.is_company_member(td.company_id)
  )
);

drop policy if exists tender_files_insert_admins on storage.objects;
create policy tender_files_insert_admins
on storage.objects for insert to authenticated
with check(
  bucket_id='tender-files'
  and split_part(name,'/',1) ~ '^[0-9a-f-]{36}$'
  and split_part(name,'/',2) ~ '^[0-9a-f-]{36}$'
  and private.is_company_admin(split_part(name,'/',1)::uuid,(select auth.uid()))
  and exists(
    select 1
    from public.tenders t
    where t.company_id=split_part(name,'/',1)::uuid
      and t.id=split_part(name,'/',2)::uuid
  )
);

drop policy if exists tender_files_delete_admins on storage.objects;
create policy tender_files_delete_admins
on storage.objects for delete to authenticated
using(
  bucket_id='tender-files'
  and split_part(name,'/',1) ~ '^[0-9a-f-]{36}$'
  and private.is_company_admin(split_part(name,'/',1)::uuid,(select auth.uid()))
);

revoke all on public.tender_documents from anon,authenticated;
grant select,insert,update,delete on public.tender_documents to authenticated;

