-- Evita recalcular auth.uid() para cada linha avaliada pelas políticas.

drop policy if exists pricing_item_results_select_members
  on public.pricing_item_results;
drop policy if exists pricing_item_results_insert_admins
  on public.pricing_item_results;
drop policy if exists pricing_item_results_update_admins
  on public.pricing_item_results;
drop policy if exists pricing_item_results_delete_admins
  on public.pricing_item_results;

create policy pricing_item_results_select_members
on public.pricing_item_results
for select to authenticated
using (
  (select private.is_company_member(company_id, (select auth.uid())))
  and exists (
    select 1
    from public.tender_items ti
    join public.tenders t on t.id = ti.tender_id
    where ti.id = pricing_item_results.tender_item_id
      and t.company_id = pricing_item_results.company_id
  )
);

create policy pricing_item_results_insert_admins
on public.pricing_item_results
for insert to authenticated
with check (
  updated_by = (select auth.uid())
  and (select private.is_company_admin(company_id, (select auth.uid())))
  and exists (
    select 1
    from public.tender_items ti
    join public.tenders t on t.id = ti.tender_id
    where ti.id = pricing_item_results.tender_item_id
      and t.company_id = pricing_item_results.company_id
  )
);

create policy pricing_item_results_update_admins
on public.pricing_item_results
for update to authenticated
using (
  (select private.is_company_admin(company_id, (select auth.uid())))
  and exists (
    select 1
    from public.tender_items ti
    join public.tenders t on t.id = ti.tender_id
    where ti.id = pricing_item_results.tender_item_id
      and t.company_id = pricing_item_results.company_id
  )
)
with check (
  updated_by = (select auth.uid())
  and (select private.is_company_admin(company_id, (select auth.uid())))
  and exists (
    select 1
    from public.tender_items ti
    join public.tenders t on t.id = ti.tender_id
    where ti.id = pricing_item_results.tender_item_id
      and t.company_id = pricing_item_results.company_id
  )
);

create policy pricing_item_results_delete_admins
on public.pricing_item_results
for delete to authenticated
using (
  (select private.is_company_admin(company_id, (select auth.uid())))
  and exists (
    select 1
    from public.tender_items ti
    join public.tenders t on t.id = ti.tender_id
    where ti.id = pricing_item_results.tender_item_id
      and t.company_id = pricing_item_results.company_id
  )
);

notify pgrst, 'reload schema';
