-- Permite editais PDF sem remover o suporte existente a DOC e DOCX.

alter table public.tender_documents
  drop constraint if exists tender_documents_mime_type_check;

alter table public.tender_documents
  add constraint tender_documents_mime_type_check
  check(mime_type in (
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values(
  'tender-files',
  'tender-files',
  false,
  26214400,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict(id) do update set
  public=false,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists tender_files_insert_admins on storage.objects;
create policy tender_files_insert_admins
on storage.objects for insert to authenticated
with check(
  bucket_id='tender-files'
  and split_part(name,'/',1) ~ '^[0-9a-f-]{36}$'
  and split_part(name,'/',2) ~ '^[0-9a-f-]{36}$'
  and lower(storage.extension(name)) in ('pdf','doc','docx')
  and private.is_company_admin(split_part(name,'/',1)::uuid,(select auth.uid()))
  and exists(
    select 1
    from public.tenders t
    where t.company_id=split_part(name,'/',1)::uuid
      and t.id=split_part(name,'/',2)::uuid
  )
);

