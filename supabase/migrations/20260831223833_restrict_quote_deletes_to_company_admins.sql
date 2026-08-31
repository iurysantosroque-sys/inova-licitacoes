drop policy if exists quotes_delete_company on public.quotes;
drop policy if exists quotes_delete_admin on public.quotes;

create policy quotes_delete_admin
on public.quotes
for delete
to authenticated
using (
  (select private.is_company_admin(company_id, auth.uid()))
);

drop policy if exists quote_files_delete_company on storage.objects;
drop policy if exists quote_files_delete_admin on storage.objects;

create policy quote_files_delete_admin
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'quote-files'
  and case
    when coalesce((storage.foldername(name))[1], '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then (select private.is_company_admin(((storage.foldername(name))[1])::uuid, auth.uid()))
    else false
  end
);
