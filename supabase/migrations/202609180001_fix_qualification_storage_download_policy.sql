drop policy if exists qualification_files_select_members on storage.objects;

create policy qualification_files_select_members on storage.objects
for select to authenticated
using (
  storage.objects.bucket_id = 'qualification-files'
  and exists (
    select 1
    from public.qualification_documents qd
    where qd.storage_path = storage.objects.name
      and qd.company_id::text = split_part(storage.objects.name, '/', 1)
      and qd.document_series_id::text = split_part(storage.objects.name, '/', 2)
      and private.is_company_member(qd.company_id)
  )
);
