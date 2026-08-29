-- Persistência do valor ganho por item da precificação.
-- A empresa é validada contra a licitação real do item antes de cada gravação.

create table if not exists public.pricing_item_results (
  tender_item_id uuid primary key
    references public.tender_items(id) on delete cascade,
  company_id uuid not null
    references public.companies(id) on delete cascade,
  winning_unit_price numeric(18,6),
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pricing_item_results_winning_price_nonnegative
    check (winning_unit_price is null or winning_unit_price >= 0)
);

create index if not exists pricing_item_results_company_id_idx
  on public.pricing_item_results(company_id);

create index if not exists pricing_item_results_updated_by_idx
  on public.pricing_item_results(updated_by);

create or replace function private.enforce_pricing_item_result_company()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actual_company_id uuid;
begin
  select t.company_id
    into actual_company_id
  from public.tender_items ti
  join public.tenders t on t.id = ti.tender_id
  where ti.id = new.tender_item_id;

  if actual_company_id is null or actual_company_id <> new.company_id then
    raise exception 'Item de precificação não pertence à empresa informada'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_pricing_item_result_company()
  from public, anon, authenticated;

drop trigger if exists enforce_pricing_item_result_company_trigger
  on public.pricing_item_results;

create trigger enforce_pricing_item_result_company_trigger
before insert or update of tender_item_id, company_id
on public.pricing_item_results
for each row execute function private.enforce_pricing_item_result_company();

alter table public.pricing_item_results enable row level security;

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
  (select private.is_company_member(company_id, auth.uid()))
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
  and (select private.is_company_admin(company_id, auth.uid()))
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
  (select private.is_company_admin(company_id, auth.uid()))
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
  and (select private.is_company_admin(company_id, auth.uid()))
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
  (select private.is_company_admin(company_id, auth.uid()))
  and exists (
    select 1
    from public.tender_items ti
    join public.tenders t on t.id = ti.tender_id
    where ti.id = pricing_item_results.tender_item_id
      and t.company_id = pricing_item_results.company_id
  )
);

-- Grants explícitos para a Data API; anon permanece sem acesso.
revoke all on table public.pricing_item_results
  from public, anon, authenticated;

grant select, insert, update, delete
  on table public.pricing_item_results to authenticated;

notify pgrst, 'reload schema';
